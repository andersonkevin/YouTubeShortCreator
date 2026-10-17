import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image

import branding
import production_visuals as production
from tools.freeze import record
from tools.vendor_liquid_glass import bundle


class LiquidGlassTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parents[1]
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        path = self.base / 'background.png'
        Image.new('RGB', (96, 64), '#140b30').save(path)
        self.asset = {'path': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        self.assets = production.validate_assets({'background': self.asset}, self.base)
        self.scene = {'kind': 'interface', 'name': 'Glass', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                      'content': {'heading': 'Explicit content', 'source': 'Internal test', 'style': 'notifications',
                      'variant': 'liquid-glass', 'image': 'background',
                      'items': [{'label': 'First', 'body': 'Supplied copy.'}, {'label': 'Second', 'body': 'Exact text.'}]}}
        self.cues = [{'start': .1, 'end': 1}, {'start': 3.1, 'end': 4}]

    def validate(self, scene):
        return production.validate_scenes([scene], self.assets, self.cues, 6)

    def test_both_variants_require_verified_images_and_explicit_copy(self):
        for style, variant in [('notifications', 'liquid-glass'), ('steps', 'liquid-widgets')]:
            scene = copy.deepcopy(self.scene); scene['content'].update(style=style, variant=variant)
            self.assertEqual(self.validate(scene), [(0, 6)])
            for key in ('image', 'items', 'source'):
                invalid = copy.deepcopy(scene); del invalid['content'][key]
                with self.assertRaises(ValueError): self.validate(invalid)
            for image in ('missing', '../outside', 'https://example.invalid/a.png'):
                invalid = copy.deepcopy(scene); invalid['content']['image'] = image
                with self.assertRaises(ValueError): self.validate(invalid)
            for key in ('refraction', 'blur', 'font', 'html', 'url', 'onReady'):
                invalid = copy.deepcopy(scene); invalid['content'][key] = 'custom'
                with self.assertRaises(ValueError): self.validate(invalid)
        self.scene['content']['style'] = 'chat'
        with self.assertRaises(ValueError): self.validate(self.scene)

    def test_image_contract_keeps_hash_and_path_checks(self):
        invalid = copy.deepcopy(self.asset); invalid['sha256'] = '0' * 64
        with self.assertRaises(ValueError): production.validate_assets({'background': invalid}, self.base)
        invalid['path'] = '../background.png'
        with self.assertRaises(ValueError): production.validate_assets({'background': invalid}, self.base)

    def test_normal_compiler_selects_only_the_needed_runtime(self):
        data = {'format': 'landscape', 'scenes': [self.scene], 'assets': {'background': self.asset}}
        brand = {'colors': branding.PALETTES['violet']}
        for profile in ('landscape', 'portrait', 'square', 'portrait-4x5'):
            data['format'] = profile; output = production.scripts(data, brand)
            self.assertEqual(output.count('src="assets/production-liquid-glass-runtime.js"'), 1)
            self.assertIn('assets/still-background.png', output)
            self.assertNotIn('src="assets/production-gpu-runtime.js"', output)
            self.assertNotIn('src="assets/production-three-runtime.js"', output)
        self.scene['content'].pop('variant'); self.scene['content'].pop('image')
        self.assertNotIn('production-liquid-glass-runtime.js', production.scripts(data, brand))

    def test_pinned_core_and_provenance_are_in_the_implementation_lock(self):
        assets = self.root / 'templates/v1/assets'
        provenance = json.loads((assets / 'production-liquid-glass-provenance.json').read_text())
        digest = hashlib.sha256((assets / 'production-liquid-glass-runtime.js').read_bytes()).hexdigest()
        self.assertEqual(digest, provenance['runtime_sha256'])
        self.assertEqual(record()['files']['templates/v1/assets/production-liquid-glass-runtime.js'], digest)
        source = self.root.parents[1] / provenance['source']
        if source.is_file(): self.assertEqual(bundle(source), (assets / 'production-liquid-glass-runtime.js').read_text())

    def test_converter_rejects_unpinned_or_linked_input(self):
        source = self.base / 'source.js'; source.write_text('arbitrary code')
        with self.assertRaises(ValueError): bundle(source)
        link = self.base / 'linked.js'; link.symlink_to(source)
        with self.assertRaises(ValueError): bundle(link)


if __name__ == '__main__':
    unittest.main()
