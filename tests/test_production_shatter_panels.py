import copy
from pathlib import Path
import tempfile
import unittest

from PIL import Image
import branding
import production_visuals as production
from safety import digest


class ShatterPanelContracts(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name, color in [('first', '#140b30'), ('second', '#211344')]:
            Image.new('RGB', (64, 64), color).save(self.root/(name+'.png'))
        self.assets = {name: self.root/(name+'.png') for name in ('first', 'second')}
        self.cues = [{'start': .1, 'end': 1}, {'start': 12.1, 'end': 13}]
        self.scene = {'kind': 'interface', 'name': 'Shatter panels', 'first_cue': 0, 'cues': [0, 1],
            'transition': 'cut-left', 'content': {'heading': 'A transition', 'source': 'Internal test',
                'style': 'steps', 'variant': 'shatter-panels', 'images': ['first', 'second']}}

    def validate(self, scene):
        return production.validate_scenes([scene], self.assets, self.cues, 14)

    def test_closed_contract_and_explicit_local_stills(self):
        before = copy.deepcopy(self.scene)
        self.assertEqual(self.validate(self.scene), [(0, 14)])
        self.assertEqual(self.scene, before)
        for key, value in [('style', 'chat'), ('images', ['first']), ('images', ['first', 'first']),
                           ('images', ['first', '../second']), ('images', ['first', 'unknown']), ('heading', 'x'*29)]:
            bad = copy.deepcopy(self.scene);bad['content'][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):self.validate(bad)
        for key in ('shader', 'url', 'font', 'camera', 'wave', 'intensity', 'html', 'items'):
            bad = copy.deepcopy(self.scene);bad['content'][key] = 'unsupported'
            with self.subTest(key=key), self.assertRaises(ValueError):self.validate(bad)

    def test_two_cues_require_transition_and_settling_windows(self):
        for starts, duration in [([.1, 12.09], 14), ([.1, 12.1], 13.5)]:
            cues = [{'start': a, 'end': a+.5} for a in starts]
            with self.subTest(starts=starts), self.assertRaises(ValueError):
                production.validate_scenes([self.scene], self.assets, cues, duration)
        self.scene['cues'] = [0]
        with self.assertRaises(ValueError):self.validate(self.scene)

    def test_selective_runtime_and_verified_texture_bundle(self):
        records = {name: {'path': path.name, 'sha256': digest(path)} for name, path in self.assets.items()}
        data = {'scenes': [self.scene], 'assets': records}
        self.assertEqual(production.raster_images(data), {'first', 'second'})
        for profile in production.COMPOSITION_FORMATS:
            scripts = production.scripts({**data, 'format': profile}, {'colors': branding.PALETTES['violet']})
            for name in ('production-three-runtime.js', 'production-shatter-panels.js', 'production-shatter-shader.js', 'production-shatter-motion.js', 'production-shader-images.js'):
                self.assertIn('assets/'+name, scripts)
            self.assertNotIn('https://', scripts);self.assertNotIn('production-gpu-runtime.js', scripts)
        output = self.root/'output';(output/'assets').mkdir(parents=True)
        production.install_assets(output, data, self.root)
        bundle = (output/'assets/production-shader-images.js').read_text()
        for name in records:
            self.assertIn('assets/still-'+name+'.png', bundle)
            self.assertEqual(digest(output/'assets'/('still-'+name+'.png')), records[name]['sha256'])
        with self.assertRaises(ValueError):production.install_assets(output, data, self.root)
        records['first']['sha256'] = '0'*64
        with self.assertRaises(ValueError):production.validate_assets(records, self.root)


if __name__ == '__main__':
    unittest.main()
