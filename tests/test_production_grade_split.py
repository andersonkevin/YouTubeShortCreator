import copy
from pathlib import Path
import tempfile
import unittest

from PIL import Image
import branding
import production_visuals as production
from safety import digest


class GradeSplitContracts(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        Image.new('RGB', (64, 64), '#345678').save(self.root/'still.png')
        self.assets = {'still': self.root/'still.png'}
        self.cues = [{'start': .1, 'end': 1}, {'start': 6.1, 'end': 7}]
        self.scene = {'kind': 'media-grid', 'name': 'Grade comparison', 'first_cue': 0,
            'cues': [0, 1], 'transition': 'cut-left', 'content': {
                'heading': 'Compare the treatment', 'source': 'Internal test',
                'layout': 'solo', 'treatment': 'grade-split',
                'items': [{'image': 'still', 'label': 'Verified local image'}],
                'grade': {'look': 'warm-cinematic', 'split': 62, 'edge': 'hairline', 'labels': True}}}

    def validate(self, scene, cues=None, duration=9):
        return production.validate_scenes([scene], self.assets, self.cues if cues is None else cues, duration)

    def test_all_three_looks_and_bounded_options_preserve_input(self):
        for look in production.GRADE_LOOKS:
            for split in (25, 62, 85):
                for edge in ('hairline', 'bold', 'hidden'):
                    for labels in (True, False):
                        scene = copy.deepcopy(self.scene)
                        scene['content']['grade'] = dict(look=look, split=split, edge=edge, labels=labels)
                        original = copy.deepcopy(scene)
                        self.assertEqual(self.validate(scene), [(0, 9)])
                        self.assertEqual(scene, original)

    def test_closed_record_rejects_exec_controls_and_incompatible_media(self):
        for key, value in [('look', 'neutral'), ('look', {}), ('split', 24), ('split', 86),
                           ('split', True), ('split', 62.5), ('edge', 'custom'), ('labels', 'on'),
                           ('lut', 'file.cube'), ('shader', '<script>'), ('temperature', 2)]:
            scene = copy.deepcopy(self.scene);scene['content']['grade'][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):self.validate(scene)
        for key, value in [('grade', {}), ('grade', None), ('layout', '2up'), ('camera', {}),
                           ('surface', {}), ('hud', {}), ('region', {}), ('font', 'other')]:
            scene = copy.deepcopy(self.scene);scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):self.validate(scene)
        scene = copy.deepcopy(self.scene);scene['content']['treatment'] = 'box';scene['cues'] = [0]
        with self.assertRaises(ValueError):self.validate(scene)
        for image in ('../still', 'unknown'):
            scene = copy.deepcopy(self.scene);scene['content']['items'][0]['image'] = image
            with self.assertRaises(ValueError):self.validate(scene)

    def test_two_anchors_and_settle_margin_are_enforced(self):
        scene = copy.deepcopy(self.scene);scene['cues'] = [0]
        with self.assertRaises(ValueError):self.validate(scene)
        with self.assertRaises(ValueError):self.validate(self.scene, [{'start': .1, 'end': 1}, {'start': 6.09, 'end': 7}])
        with self.assertRaises(ValueError):self.validate(self.scene, duration=7.5)

    def test_selective_local_shader_and_hash_locked_image_installation(self):
        records = {'still': {'path': 'still.png', 'sha256': digest(self.root/'still.png')}}
        data = {'scenes': [self.scene], 'assets': records}
        self.assertEqual(production.raster_images(data), {'still'})
        for profile in production.COMPOSITION_FORMATS:
            scripts = production.scripts({**data, 'format': profile}, {'colors': branding.PALETTES['violet']})
            self.assertIn('assets/production-grade-split.js', scripts)
            self.assertIn('assets/production-grade-split-shader.js', scripts)
            self.assertIn('assets/production-shader-images.js', scripts)
            self.assertNotIn('assets/production-three-runtime.js', scripts)
            self.assertNotIn('https://', scripts)
        output = self.root/'output';(output/'assets').mkdir(parents=True)
        production.install_assets(output, data, self.root)
        self.assertEqual(digest(output/'assets/still-still.png'), records['still']['sha256'])
        self.assertIn('data:image/png;base64,', (output/'assets/production-shader-images.js').read_text())
        with self.assertRaises(ValueError):production.install_assets(output, data, self.root)
        records['still']['sha256'] = '0'*64
        with self.assertRaises(ValueError):production.validate_assets(records, self.root)


if __name__ == '__main__':
    unittest.main()
