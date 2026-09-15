from pathlib import Path
import unittest
import tempfile
from unittest.mock import patch

import numpy as np
from tools import media_matrix as matrix


class MatrixTests(unittest.TestCase):
    def test_fixture_coverage(self):
        self.assertEqual({c[1] for c in matrix.CASES}, {'wav', 'mp3', 'm4a', 'opus'})
        self.assertEqual({c[2] for c in matrix.CASES}, {44100, 48000})
        self.assertEqual({c[3] for c in matrix.CASES}, {1, 2})
        self.assertEqual(max(c[4] for c in matrix.CASES), 179.983)

    def test_full_recording_preserves_bytes_without_conversion(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            source = root / 'source.mp3'
            source.write_bytes(b'authorized-original')
            target = root / 'private'
            target.mkdir()
            with patch.object(matrix.ff, 'run') as execute:
                result, provenance = matrix.prepare_real_source(target, source, {}, None)
                execute.assert_not_called()
            self.assertEqual(result.read_bytes(), source.read_bytes())
            self.assertEqual(provenance['mode'], 'full-recording')
            self.assertEqual(provenance['source_sha256'], provenance['original_sha256'])
            self.assertNotIn('requested_seconds', provenance)
            with self.assertRaises(FileExistsError):
                matrix.prepare_real_source(target, source, {}, None)
            self.assertEqual(result.read_bytes(), b'authorized-original')

    def test_symlink_source_rejected_before_workspace_write(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            source = root / 'source.mp3'
            source.write_bytes(b'private')
            alias = root / 'alias.mp3'
            alias.symlink_to(source)
            with patch.object(matrix, 'new_root') as new, self.assertRaises(ValueError):
                matrix.execute(root / 'not-created', {}, True, real_source=alias)
            new.assert_not_called()

    def test_signal_is_deterministic_with_silence_and_channels(self):
        a = matrix.signal(48000, 2, 4.017)
        self.assertEqual(a, matrix.signal(48000, 2, 4.017))
        values = np.frombuffer(a, dtype='<i2').reshape(-1, 2)
        self.assertEqual(len(values), round(48000 * 4.017))
        self.assertFalse(values[:16000].any())
        self.assertTrue(values[20000:40000].any())
        self.assertFalse(values[-18000:].any())
        self.assertFalse(np.frombuffer(matrix.signal(48000, 1, 4.017, True), dtype='<i2').any())

    def test_write_gate_before_path_access(self):
        with patch.object(matrix, 'new_root') as root, self.assertRaisesRegex(ValueError, 'approve-write'):
            matrix.execute(Path('/not-created'), {}, False)
        root.assert_not_called()

    def test_excerpt_requires_source(self):
        with patch.object(matrix, 'new_root') as root, self.assertRaisesRegex(ValueError, 'Excerpt requires'):
            matrix.execute(Path('/not-created'), {}, True, excerpt_seconds=60)
        root.assert_not_called()

    def test_real_only_requires_source_before_writes(self):
        with patch.object(matrix, 'new_root') as root, self.assertRaisesRegex(ValueError, 'Real-only'):
            matrix.execute(Path('/not-created'), {}, True, real_only=True)
        root.assert_not_called()
