import copy
import hashlib
import json
from pathlib import Path
import unittest

import branding
import production_visuals as production
from tools.freeze import record


class GpuBackdropTests(unittest.TestCase):
    def setUp(self):
        self.scene = {'kind': 'backdrop', 'name': 'GPU', 'first_cue': 0, 'cues': [0, 1],
                      'transition': 'cut-left', 'content': {'heading': 'A bounded field',
                      'caption': 'An internal shader test.', 'style': 'gpu-aurora'}}
        self.cues = [{'start': .1, 'end': 1}, {'start': 2.1, 'end': 3}]

    def validate(self, scene, cues=None):
        return production.validate_scenes([scene], {}, cues or self.cues, 5)

    def test_all_36_shaders_require_two_explicit_caption_anchors(self):
        self.assertEqual(len(set(production.GPU_BACKDROP_STYLES)), 36)
        for name in production.GPU_BACKDROP_STYLES:
            scene = copy.deepcopy(self.scene); scene['content']['style'] = name
            self.assertEqual(self.validate(scene), [(0, 5)])
            scene['cues'] = [0]
            with self.assertRaises(ValueError): self.validate(scene)
        for gap in (.8, 1.9, 1.999):
            cues = [{'start': .1, 'end': .2}, {'start': .1 + gap, 'end': 3}]
            with self.assertRaises(ValueError): self.validate(self.scene, cues)

    def test_no_shader_properties_external_shapes_colors_or_timing_overrides(self):
        for key, value in [('props', {}), ('shapeSdfUrl', 'https://example.invalid/a'),
                           ('duration', 2), ('seed', 100), ('colorA', '#ffffff'),
                           ('shader', 'Aurora'), ('onReady', 'callback')]:
            scene = copy.deepcopy(self.scene); scene['content'][key] = value
            with self.assertRaises(ValueError): self.validate(scene)
        for style in ('gpu-custom', 'gpu-constructor', 'gpu-__proto__', 'javascript:alert(1)'):
            scene = copy.deepcopy(self.scene); scene['content']['style'] = style
            with self.assertRaises(ValueError): self.validate(scene)

    def test_bundle_is_loaded_only_for_an_explicit_gpu_scene(self):
        data = {'format': 'landscape', 'scenes': [self.scene], 'assets': {}}
        brand = {'colors': branding.PALETTES['violet']}
        gpu = production.scripts(data, brand)
        self.assertIn('assets/production-gpu-runtime.js', gpu)
        self.assertIn('assets/production-gpu-backdrops.js', gpu)
        data['scenes'][0]['content']['style'] = 'mesh'; data['scenes'][0]['cues'] = [0]
        normal = production.scripts(data, brand)
        self.assertNotIn('assets/production-gpu-runtime.js', normal)
        self.assertNotIn('assets/production-gpu-backdrops.js', normal)

    def test_pinned_runtime_and_all_notices_are_covered_by_the_engine_lock(self):
        root = Path(__file__).resolve().parents[1]
        assets = root / 'templates/v1/assets'
        provenance = json.loads((assets / 'production-gpu-provenance.json').read_text())
        candidate = record()['files']
        for name, key in [('production-gpu-runtime.js', 'runtime_sha256'), ('production-gpu-notices.txt', 'notices_sha256')]:
            digest = hashlib.sha256((assets / name).read_bytes()).hexdigest()
            self.assertEqual(digest, provenance[key])
            self.assertEqual(candidate['templates/v1/assets/' + name], digest)
        notices = (assets / 'production-gpu-notices.txt').read_text()
        for package in ('shaders 4.0.0', 'typegpu 0.12.3', 'tinyest 0.3.4', 'typed-binary 4.3.3', 'tsover-runtime 0.0.7'):
            self.assertIn(package, notices)


if __name__ == '__main__':
    unittest.main()
