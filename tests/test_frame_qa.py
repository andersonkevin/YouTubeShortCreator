from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image

import frame_qa
from safety import digest


class FrameTests(unittest.TestCase):
    def reference(self):
        data = np.zeros((1920, 1080, 3), dtype=np.float32)
        data[100:1900:100, 100:900] = 200
        data[1600:1630, 100:800] = 240
        data[78:92, 98:926] = 220
        return data

    def test_boundary_gap_midpoint_and_final_frame_sampling(self):
        indices = frame_qa.sample_indices({'cues': [{'start': .1, 'end': .3},
                                                   {'start': 1.5, 'end': 1.9}]}, 2)
        self.assertEqual(indices, [0, 2, 3, 6, 8, 9, 30, 44, 45, 51, 56, 57, 59])
        self.assertEqual(frame_qa.sample_indices({'cues': []}, 180), [0, 2700, 5399])
        for cue in ({'start': 2, 'end': 1}, {'start': 0, 'end': 3}):
            with self.assertRaises(ValueError):
                frame_qa.sample_indices({'cues': [cue]}, 2)

    def test_exact_and_small_lossy_difference_pass(self):
        reference = self.reference()
        self.assertEqual(frame_qa.compare(reference, reference)['maximum_tile_rmse'], 0)
        frame_qa.compare(reference, np.clip(reference + 2, 0, 255))

    def test_chroma_reconstruction_is_not_geometry_drift(self):
        reference = self.reference()
        reference[78:92, 98:926] = [17, 19, 21]
        reference[82:88, 100:924] = [182, 238, 100]
        decoded = reference.copy()
        decoded[81, 100:924] = [1, 30, 0]
        decoded[87, 100:924] = [197, 227, 158]
        frame_qa.compare(reference, decoded)

    def test_large_color_error_or_one_row_displacement_fails(self):
        reference = self.reference()
        shifted = np.roll(reference, 1, axis=0)
        tinted = reference.copy()
        tinted[650:1450, 100:920] = [120, 0, 120]
        for decoded in (shifted, tinted):
            with self.assertRaises(ValueError):
                frame_qa.compare(reference, decoded)

    def test_blank_missing_caption_progress_and_local_damage_rejected(self):
        reference = self.reference()
        damaged = []
        for box in ((100, 1600, 800, 1630), (98, 78, 926, 92), (200, 900, 232, 932)):
            copy = reference.copy()
            left, top, right, bottom = box
            copy[top:bottom, left:right] = 255 - copy[top:bottom, left:right]
            damaged.append(copy)
        for copy in [np.zeros_like(reference), *damaged]:
            with self.assertRaisesRegex(ValueError, 'mismatch'):
                frame_qa.compare(reference, copy)
        with self.assertRaisesRegex(ValueError, 'Blank'):
            frame_qa.compare(np.zeros_like(reference), np.zeros_like(reference))
        with self.assertRaisesRegex(ValueError, 'geometry'):
            frame_qa.compare(reference, reference[:100])

    def test_files_hashes_missing_samples_and_symlink(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            refs, decoded = root / 'refs', root / 'decoded'
            refs.mkdir()
            decoded.mkdir()
            source, target = refs / 'frame-00059.png', decoded / 'decoded-00000.png'
            Image.fromarray(self.reference().astype(np.uint8)).save(source)
            target.write_bytes(source.read_bytes())
            before = digest(source)
            report = frame_qa.verify(refs, decoded, [59])
            self.assertEqual(report['samples'][0]['reference_sha256'], before)
            self.assertTrue(report['review_required'])
            for indices in ([], [True], [-1], [5400], [59, 59]):
                with self.assertRaises(ValueError):
                    frame_qa.verify(refs, decoded, indices)
            target.unlink()
            with self.assertRaisesRegex(ValueError, 'Incomplete'):
                frame_qa.verify(refs, decoded, [59])
            target.symlink_to(source)
            with self.assertRaisesRegex(ValueError, 'Symlink'):
                frame_qa.verify(refs, decoded, [59])
            self.assertEqual(digest(source), before)
