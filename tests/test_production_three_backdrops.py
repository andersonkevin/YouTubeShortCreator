import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

import branding
import production_visuals as production
from tools.freeze import record
from tools.vendor_three import bindings, bundle


class SpatialBackdropTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parents[1]
        self.scene = {'kind': 'backdrop', 'name': 'Spatial', 'first_cue': 0, 'cues': [0, 1],
                      'transition': 'cut-left', 'content': {'heading': 'Clarity',
                      'caption': 'Internal rendering test.', 'style': 'three-glass-lens'}}
        self.cues = [{'start': .1, 'end': 1}, {'start': 2.1, 'end': 3}]

    def validate(self, scene, cues=None):
        return production.validate_scenes([scene], {}, self.cues if cues is None else cues, 5)

    def test_all_styles_keep_closed_inputs_and_two_anchors(self):
        for style in production.THREE_BACKDROP_STYLES:
            scene = copy.deepcopy(self.scene); scene['content']['style'] = style
            self.assertEqual(self.validate(scene), [(0, 5)])
            for key in ('seed', 'font', 'color', 'url', 'model', 'shader', 'duration'):
                invalid = copy.deepcopy(scene); invalid['content'][key] = 'custom'
                with self.assertRaises(ValueError): self.validate(invalid)
            scene['cues'] = [0]
            with self.assertRaises(ValueError): self.validate(scene)
        with self.assertRaises(ValueError): self.validate(self.scene, [{'start': .1, 'end': 1}, {'start': 2, 'end': 3}])
        self.scene['content']['heading'] = 'This is too long'
        with self.assertRaises(ValueError): self.validate(self.scene)

    def test_compiler_loads_only_selected_runtimes_without_duplicate_helpers(self):
        data = {'format': 'landscape', 'scenes': [self.scene], 'assets': {}}
        brand = {'colors': branding.PALETTES['violet']}
        for profile in ('landscape', 'portrait', 'square', 'portrait-4x5'):
            data['format'] = profile
            html = production.scripts(data, brand)
            self.assertEqual(html.count('src="assets/production-three-runtime.js"'), 1)
            self.assertNotIn('src="assets/production-gpu-runtime.js"', html)
        gpu = copy.deepcopy(self.scene); gpu['content']['style'] = 'gpu-aurora'; data['scenes'].append(gpu)
        html = production.scripts(data, brand)
        self.assertEqual(html.count('src="assets/production-gpu-backdrops.js"'), 1)
        self.assertIn('src="assets/production-gpu-runtime.js"', html)
        data['scenes'] = [gpu]
        self.assertNotIn('production-three-runtime.js', production.scripts(data, brand))

    def test_pinned_runtime_and_notice_are_in_candidate_lock(self):
        assets = self.root / 'templates/v1/assets'
        provenance = json.loads((assets / 'production-three-provenance.json').read_text())
        candidate = record()['files']
        for filename, key in [('production-three-runtime.js', 'runtime_sha256'), ('production-three-notices.txt', 'notices_sha256')]:
            digest = hashlib.sha256((assets / filename).read_bytes()).hexdigest()
            self.assertEqual(digest, provenance[key]); self.assertEqual(candidate['templates/v1/assets/' + filename], digest)
        self.assertIn('Copyright © 2010-2026 three.js authors', (assets / 'production-three-notices.txt').read_text())

    def test_converter_rejects_unpinned_code_and_unsafe_bindings(self):
        self.assertEqual(bindings('a as A,b,'), [('a', 'A'), ('b', 'b')])
        for text in ('', 'a as x,b as x', 'a;execute()', '* as a', 'a from "remote"'):
            with self.assertRaises(ValueError): bindings(text)
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory)
            with self.assertRaises(ValueError): bundle(source)
            (source / 'three.core.min.js').write_text('export { arbitrary };')
            with self.assertRaises(ValueError): bundle(source)
            (source / 'alias').mkdir()
            (source / 'alias/three.core.min.js').symlink_to(source / 'three.core.min.js')
            with self.assertRaises(ValueError): bundle(source / 'alias')

    def test_local_source_rebuild_when_source_checkout_is_available(self):
        source = self.root.parents[1] / 'registry/blocks/orbit-card/assets'
        if not source.is_dir(): self.skipTest('Upstream source checkout is optional for consumers')
        self.assertEqual(bundle(source), (self.root / 'templates/v1/assets/production-three-runtime.js').read_text())


if __name__ == '__main__':
    unittest.main()
