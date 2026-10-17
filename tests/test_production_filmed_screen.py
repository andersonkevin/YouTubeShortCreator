import base64
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image

import branding
import production_visuals as production


class FilmedScreenContracts(unittest.TestCase):
    def setUp(self):
        self.scene = {'kind': 'screen', 'name': 'Filmed detail', 'first_cue': 0, 'cues': [0, 1, 2],
                      'transition': 'cut-left', 'content': {'heading': 'Two details', 'caption': 'Internal lens test',
                      'chrome': 'browser', 'images': ['screen'], 'lens': 'filmed', 'focus': [
                          {'x': .1, 'y': .1, 'width': .2, 'height': .2, 'zoom': 2, 'label': 'First detail'},
                          {'x': .6, 'y': .6, 'width': .2, 'height': .2, 'zoom': 3, 'label': 'Second detail'}]}}
        self.cues = [{'start': .1, 'end': 1}, {'start': 2.1, 'end': 3}, {'start': 4.1, 'end': 5}]

    def validate(self, scene, assets=None):
        return production.validate_scenes([scene], assets or {'screen': {}}, self.cues, 6)

    def test_only_explicit_focused_screens_can_select_the_lens(self):
        self.assertEqual(self.validate(self.scene), [(0, 6)])
        for key, value in [('lens', 'custom'), ('lens', None), ('swap', 'wipe'), ('focus', []),
                           ('images', ['screen', 'second']), ('tilt', [0, 1, 0]), ('blur', .8),
                           ('palette', []), ('shader', 'void main(){}'), ('html', '<script>')]:
            bad = copy.deepcopy(self.scene); bad['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.validate(bad)
        bad = copy.deepcopy(self.scene); del bad['content']['focus']
        with self.assertRaises(ValueError): self.validate(bad)

    def test_existing_focus_bounds_and_caption_gates_remain_enforced(self):
        for key, value in [('x', -.1), ('height', 0), ('width', .5), ('zoom', 4), ('zoom', float('nan')), ('label', '')]:
            bad = copy.deepcopy(self.scene); bad['content']['focus'][1][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.validate(bad)
        bad = copy.deepcopy(self.scene); bad['cues'] = [0, 1]
        with self.assertRaises(ValueError): self.validate(bad)
        bad = copy.deepcopy(self.scene); bad['content'].pop('lens')
        self.assertEqual(self.validate(bad), [(0, 6)])

    def test_verified_texture_install_keeps_exact_bytes_and_never_overwrites(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); image = root / 'screen.png'
            Image.new('RGB', (96, 64), '#201040').save(image)
            asset = {'path': 'screen.png', 'sha256': hashlib.sha256(image.read_bytes()).hexdigest()}
            self.validate(self.scene, production.validate_assets({'screen': asset}, root))
            data = {'format': 'landscape', 'scenes': [self.scene], 'assets': {'screen': asset}}
            self.assertEqual(production.shader_images(data), {'screen'})
            out = root / 'out'; (out / 'assets').mkdir(parents=True)
            production.install_assets(out, data, root)
            payload = (out / 'assets/production-shader-images.js').read_text()
            table = json.loads(payload.removeprefix('window.ShortCreatorShaderImages=Object.freeze(').removesuffix(');\n'))
            self.assertEqual(base64.b64decode(table['assets/still-screen.png'].split(',')[1]), image.read_bytes())
            with self.assertRaises(ValueError): production.install_assets(out, data, root)
            bad = dict(asset, path='../screen.png')
            with self.assertRaises(ValueError): production.validate_assets({'screen': bad}, root)
            image.write_bytes(b'changed fixture')
            with self.assertRaises(ValueError): production.validate_assets({'screen': asset}, root)

    def test_all_formats_select_the_optical_runtime_only_when_requested(self):
        brand = {'colors': branding.PALETTES['violet']}
        for profile in ('landscape', 'portrait', 'square', 'portrait-4x5'):
            data = {'format': profile, 'scenes': [self.scene], 'assets': {'screen': {'path': 'screen.png'}}}
            html = production.scripts(data, brand)
            self.assertIn('production-shader-images.js', html)
            self.assertLess(html.index('production-filmed-screen-shader.js'), html.index('production-filmed-screen.js'))
            self.assertLess(html.index('production-filmed-screen.js'), html.index('production-scenes.js'))
            self.assertNotIn('https://', html)
        data = copy.deepcopy(data); data['scenes'][0]['content'].pop('lens')
        html = production.scripts(data, brand)
        self.assertNotIn('production-filmed-screen', html)
        self.assertEqual(production.shader_images(data), set())


if __name__ == '__main__':
    unittest.main()
