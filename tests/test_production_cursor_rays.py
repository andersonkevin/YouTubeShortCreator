import base64
import copy
import json
from math import ceil
from pathlib import Path
import shutil
import tempfile
import unittest

from PIL import Image
import branding
import production_visuals as production
from safety import digest


class CursorRayContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'cta', 'name': 'Branded ray title', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                'content': {'style': 'cursor-rays', 'heading': 'IDEAS', 'action': 'in', 'support': 'motion',
                            'finale': ['Make it clear', 'Keep it moving'], 'label': 'Internal motion illustration'}}

    def validate(self, scene=None, captions=None, duration=11):
        return production.validate_scenes([scene or self.scene()], {}, captions or [{'start': .115, 'end': 1.115}, {'start': 8.115, 'end': 9.115}], duration)

    def brand(self, root, oversized=False):
        record = {'version': 1, 'channel': 'Ray Fixture', 'language': 'en-US', 'audience': 'Internal tests',
                  'tone': 'Clear', 'scene_count': 3, 'colors': dict(branding.PALETTES['violet']), 'logo_style': 'wordmark'}
        branding.create(root, record, {'display': 'font:geist-bold', 'body': 'font:inter-regular', 'mono': 'font:jetbrains-mono-regular'})
        if oversized: Image.new('RGBA', (4097, 4), 'white').save(root / 'brand/assets/logo.png')
        branding.approve(root, 'unit-test-template')

    def output(self, root, brand, name):
        out = root / name;(out / 'assets').mkdir(parents=True)
        shutil.copyfile(brand / 'brand/assets/logo.png', out / 'assets/logo.png')
        return out

    def test_native_contract_and_selective_loading_in_all_formats(self):
        self.assertEqual(self.validate(), [(0, 11)])
        for profile in production.COMPOSITION_FORMATS:
            data = {'scenes': [self.scene()], 'assets': {}, 'format': profile}
            script = production.scripts(data, {'colors': branding.PALETTES['violet']})
            for file in ['production-shader-images.js', 'production-cursor-rays-shader.js', 'production-cursor-rays.js']:
                self.assertEqual(script.count('src="assets/' + file + '"'), 1)
            self.assertNotIn('https://', script)
            data['scenes'] = []
            self.assertNotIn('production-cursor-rays', production.scripts(data, {'colors': branding.PALETTES['violet']}))

    def test_bounded_copy_and_no_custom_logo_palette_shaders_or_font(self):
        for key, value in [('heading', 'x'*9), ('action', 'x'*13), ('support', 'x'*17), ('label', 'x'*65),
                           ('finale', ['one']), ('finale', ['x'*21, 'two']), ('finale', ['one', 'two', 'three']),
                           ('logo', '../logo.png'), ('font', 'Inter'), ('shader', 'source'), ('samples', 4), ('badges', [])]:
            scene = self.scene();scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):self.validate(scene)
        for key in ['support', 'finale']:
            scene = self.scene();del scene['content'][key]
            with self.assertRaises(ValueError):self.validate(scene)
        scene = self.scene();scene['content']['style'] = 'standard'
        with self.assertRaises(ValueError):self.validate(scene)

    def test_frame_separation_settling_and_input_immutability(self):
        scene = self.scene();before = copy.deepcopy(scene);self.validate(scene);self.assertEqual(scene, before)
        with self.assertRaises(ValueError):self.validate(captions=[{'start': .115, 'end': 1}, {'start': 8.114999, 'end': 9}])
        boundary = (ceil((8.115+production.BEAT_DELAY)*30)+24+12)/30
        self.validate(duration=boundary)
        with self.assertRaises(ValueError):self.validate(duration=boundary-1/30)
        for cues in [[0], [0, 1, 2], [True, 1]]:
            scene = self.scene();scene['cues'] = cues
            with self.assertRaises(ValueError):self.validate(scene)

    def test_writer_embeds_exact_approved_copy_and_preserves_previous_output(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);brand = root / 'channel';self.brand(brand);out = self.output(root, brand, 'run')
            source = brand / 'brand/assets/logo.png';original = source.read_bytes();approval = digest(brand / 'brand/approval.json')
            data = {'scenes': [self.scene()], 'assets': {}}
            production.install_assets(out, data, root, brand_root=brand, template_hash='unit-test-template')
            bundle = out / 'assets/production-shader-images.js';before = bundle.read_bytes()
            mapping = json.loads(bundle.read_text().removeprefix('window.ShortCreatorShaderImages=Object.freeze(').removesuffix(');\n'))
            self.assertEqual(set(mapping), {'assets/logo.png'})
            self.assertEqual(base64.b64decode(mapping['assets/logo.png'].split(',', 1)[1]), original)
            self.assertEqual(source.read_bytes(), original);self.assertEqual(digest(brand / 'brand/approval.json'), approval)
            with self.assertRaisesRegex(ValueError, 'already exists'):
                production.install_assets(out, data, root, brand_root=brand, template_hash='unit-test-template')
            self.assertEqual(bundle.read_bytes(), before)

    def test_writer_rejects_missing_approval_template_drift_copied_drift_and_symlinks(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);brand = root / 'channel';self.brand(brand);out = self.output(root, brand, 'run')
            data = {'scenes': [self.scene()], 'assets': {}}
            for options in [{}, {'brand_root': brand, 'template_hash': 'different-template'}]:
                with self.assertRaises(ValueError):production.install_assets(out, data, root, **options)
                self.assertFalse((out / 'assets/production-shader-images.js').exists())
            (out / 'assets/logo.png').write_bytes(b'copied bytes changed')
            with self.assertRaisesRegex(ValueError, 'differs from approved'):
                production.install_assets(out, data, root, brand_root=brand, template_hash='unit-test-template')
            symlink = root / 'symlink-run';(symlink / 'assets').mkdir(parents=True)
            (symlink / 'assets/logo.png').symlink_to(brand / 'brand/assets/logo.png')
            with self.assertRaisesRegex(ValueError, 'Symlink'):
                production.install_assets(symlink, data, root, brand_root=brand, template_hash='unit-test-template')
            oversized = self.output(root, brand, 'oversized-bytes')
            (oversized / 'assets/logo.png').write_bytes(b'x' * 20_000_001)
            with self.assertRaisesRegex(ValueError, 'size limit'):
                production.install_assets(oversized, data, root, brand_root=brand, template_hash='unit-test-template')
            self.assertFalse((oversized / 'assets/production-shader-images.js').exists())
            (brand / 'brand/assets/logo.png').write_bytes(b'brand changed')
            with self.assertRaisesRegex(ValueError, 'Brand changed'):
                production.install_assets(out, data, root, brand_root=brand, template_hash='unit-test-template')

    def test_oversized_approved_texture_fails_before_bundle_write(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);brand = root / 'channel';self.brand(brand, oversized=True);out = self.output(root, brand, 'run')
            with self.assertRaisesRegex(ValueError, 'bounded PNG'):
                production.install_assets(out, {'scenes': [self.scene()], 'assets': {}}, root, brand_root=brand, template_hash='unit-test-template')
            self.assertFalse((out / 'assets/production-shader-images.js').exists())

    def test_brand_texture_coexists_with_existing_verified_still_bundle(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);brand = root / 'channel';self.brand(brand);out = self.output(root, brand, 'run')
            still = root / 'still.png';Image.new('RGB', (64, 64), '#140b30').save(still)
            data = {'scenes': [self.scene(), {'kind': 'screen', 'content': {'swap': 'shader-glitch', 'images': ['still']}}],
                    'assets': {'still': {'path': 'still.png', 'sha256': digest(still)}}}
            production.install_assets(out, data, root, brand_root=brand, template_hash='unit-test-template')
            mapping = json.loads((out / 'assets/production-shader-images.js').read_text().removeprefix('window.ShortCreatorShaderImages=Object.freeze(').removesuffix(');\n'))
            self.assertEqual(set(mapping), {'assets/logo.png', 'assets/still-still.png'})
            self.assertEqual(base64.b64decode(mapping['assets/still-still.png'].split(',', 1)[1]), still.read_bytes())
            data['assets']['still']['sha256'] = '0'*64;bad = self.output(root, brand, 'bad-still')
            with self.assertRaises(ValueError):production.install_assets(bad, data, root, brand_root=brand, template_hash='unit-test-template')
            self.assertFalse((bad / 'assets/production-shader-images.js').exists())


if __name__ == '__main__':
    unittest.main()
