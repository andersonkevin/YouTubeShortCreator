import copy
from pathlib import Path
import tempfile
import unittest

from PIL import Image
import branding
import production_visuals as production
from safety import digest


class UIRevealContracts(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.image = self.root/'screen.png'
        Image.new('RGB', (80, 64), '#140b30').save(self.image)
        self.assets = {'screen': self.image}
        self.cues = [{'start': .1, 'end': 1}, {'start': 13.1, 'end': 14}]
        self.scene = {'kind': 'interface', 'name': 'UI reveal', 'first_cue': 0, 'cues': [0, 1],
            'transition': 'cut-left', 'content': {'heading': 'Supplied workspace', 'source': 'Internal test',
                'style': 'steps', 'variant': 'ui-3d-reveal', 'image': 'screen',
                'layers': ['Page', 'Hero', 'Details'], 'selected': 1,
                'properties': [{'label': 'Mode', 'value': 'Local'}, {'label': 'Frame', 'value': 'Wide'}, {'label': 'Status', 'value': 'Draft'}],
                'selection': {'x': .1, 'y': .1, 'width': .6, 'height': .5},
                'tagline': 'Review the details', 'action': 'Explore'}}

    def validate(self, scene):
        return production.validate_scenes([scene], self.assets, self.cues, 15)

    def test_closed_reusable_contract_does_not_mutate_input(self):
        before = copy.deepcopy(self.scene)
        self.assertEqual(self.validate(self.scene), [(0, 15)])
        self.assertEqual(self.scene, before)
        for field, value in [('style', 'chat'), ('selected', True), ('selected', 3),
                             ('layers', ['One', 'Two']), ('layers', ['x']*10),
                             ('properties', []), ('image', 'missing'), ('image', '../screen'),
                             ('tagline', 'x'*33), ('action', 'x'*23)]:
            bad = copy.deepcopy(self.scene);bad['content'][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                self.validate(bad)
        for field in ('html', 'font', 'url', 'rotation', 'camera', 'logo', 'speed', 'items'):
            bad = copy.deepcopy(self.scene);bad['content'][field] = 'operator input'
            with self.subTest(field=field), self.assertRaises(ValueError):self.validate(bad)

    def test_selection_is_bounded_and_properties_are_literal_records(self):
        for field, value in [('x', -.01), ('y', .9), ('width', .07), ('height', True), ('width', float('nan'))]:
            bad = copy.deepcopy(self.scene);bad['content']['selection'][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):self.validate(bad)
        for change in ({'label': 'x'*13}, {'value': 'x'*15}, {'url': 'https://example.invalid'}):
            bad = copy.deepcopy(self.scene);bad['content']['properties'][0].update(change)
            with self.assertRaises(ValueError):self.validate(bad)
        self.scene['content']['layers'][0] = '<script>'
        self.assertEqual(self.validate(self.scene), [(0, 15)])

    def test_thirteen_seconds_and_native_settling_window(self):
        for start, end, duration in [(.1, 13.099, 15), (.615, 13.6, 16), (.1, 13.1, 14.5)]:
            cues = [{'start': start, 'end': start+.5}, {'start': end, 'end': end+.5}]
            with self.subTest(start=start, end=end), self.assertRaises(ValueError):
                production.validate_scenes([self.scene], self.assets, cues, duration)
        self.scene['cues'] = [0]
        with self.assertRaises(ValueError):self.validate(self.scene)

    def test_stills_use_existing_hash_and_containment_boundary(self):
        record = {'screen': {'path': 'screen.png', 'sha256': digest(self.image)}}
        self.assertEqual(production.validate_assets(record, self.root), self.assets)
        for path in ('../screen.png', 'https://example.invalid/screen.png'):
            bad = copy.deepcopy(record);bad['screen']['path'] = path
            with self.assertRaises(ValueError):production.validate_assets(bad, self.root)
        record['screen']['sha256'] = '0'*64
        with self.assertRaises(ValueError):production.validate_assets(record, self.root)

    def test_selective_script_loader_in_all_formats(self):
        for profile in production.COMPOSITION_FORMATS:
            scripts = production.scripts({'format': profile, 'scenes': [self.scene],
                'assets': {'screen': {'path': 'screen.png'}}}, {'colors': branding.PALETTES['violet']})
            self.assertIn('assets/production-ui-reveal.js', scripts)
            for absent in ('https://', 'gsap', 'production-three-runtime', 'production-gpu-runtime'):
                self.assertNotIn(absent, scripts)
        self.scene['content'] = {'heading': 'Other', 'source': 'Test', 'style': 'steps',
            'items': [{'label': 'One', 'body': 'First'}, {'label': 'Two', 'body': 'Second'}]}
        self.assertNotIn('production-ui-reveal.js',
            production.scripts({'scenes': [self.scene], 'assets': {}}, {'colors': branding.PALETTES['violet']}))


if __name__ == '__main__':
    unittest.main()
