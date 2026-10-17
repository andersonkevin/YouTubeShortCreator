import copy
from pathlib import Path
import tempfile
import unittest
from PIL import Image
import branding
import production_visuals as production
from safety import digest


class GlassParallaxContracts(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.image = self.root/'still.png'
        Image.new('RGB', (64, 64), '#140b30').save(self.image)
        self.assets = {'still': self.image}
        self.cues = [{'start': .1, 'end': 1}, {'start': 20.1, 'end': 21}]
        self.scene = {'kind': 'interface', 'name': 'Glass parallax', 'first_cue': 0, 'cues': [0, 1],
            'transition': 'cut-left', 'content': {'heading': 'Depth through glass', 'source': 'Internal test',
                'style': 'steps', 'variant': 'glass-parallax', 'image': 'still'}}

    def validate(self, scene):
        return production.validate_scenes([scene], self.assets, self.cues, 22)

    def test_closed_contract_and_verified_image(self):
        before = copy.deepcopy(self.scene)
        self.assertEqual(self.validate(self.scene), [(0, 22)])
        self.assertEqual(before, self.scene)
        for key, value in [('style', 'chat'), ('image', '../still'), ('image', 'missing'), ('heading', 'x'*29)]:
            bad = copy.deepcopy(self.scene);bad['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):self.validate(bad)
        for key in ('shader', 'url', 'font', 'camera', 'intensity', 'html', 'items', 'images'):
            bad = copy.deepcopy(self.scene);bad['content'][key] = 'unsupported'
            with self.subTest(key=key), self.assertRaises(ValueError):self.validate(bad)

    def test_source_interval_and_settling_are_required(self):
        for starts, duration in [([.1, 20.09], 22), ([.1, 20.1], 21.5)]:
            with self.subTest(starts=starts), self.assertRaises(ValueError):
                production.validate_scenes([self.scene], self.assets, [{'start': s, 'end': s+.5} for s in starts], duration)
        self.scene['cues'] = [0]
        with self.assertRaises(ValueError):self.validate(self.scene)

    def test_selective_offline_runtime_and_exclusive_asset_installation(self):
        records = {'still': {'path': 'still.png', 'sha256': digest(self.image)}}
        data = {'scenes': [self.scene], 'assets': records}
        self.assertEqual(production.raster_images(data), {'still'})
        for profile in production.COMPOSITION_FORMATS:
            scripts = production.scripts({**data, 'format': profile}, {'colors': branding.PALETTES['violet']})
            for name in ('production-three-runtime.js', 'production-three-postprocess.js', 'production-glass-parallax-motion.js', 'production-glass-parallax.js', 'production-shader-images.js'):
                self.assertIn('assets/'+name, scripts)
            self.assertNotIn('https://', scripts)
        output = self.root/'output';(output/'assets').mkdir(parents=True)
        production.install_assets(output, data, self.root)
        self.assertEqual(digest(output/'assets/still-still.png'), records['still']['sha256'])
        with self.assertRaises(ValueError):production.install_assets(output, data, self.root)
        records['still']['sha256'] = '0'*64
        with self.assertRaises(ValueError):production.validate_assets(records, self.root)


if __name__ == '__main__':
    unittest.main()
