import copy
import unittest

import branding
import production_visuals as production


class HalftoneContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'backdrop', 'name': 'Halftone field', 'first_cue': 0,
                'cues': [0, 1], 'transition': 'cut-left', 'content': {
                    'heading': 'Signals in motion', 'caption': 'Internal visual test.',
                    'style': 'halftone-field'}}

    def test_two_cue_closed_contract_and_settle_window(self):
        cues = [{'start': .1, 'end': 1}, {'start': 2.1, 'end': 3}]
        scene = self.scene();before = copy.deepcopy(scene)
        self.assertEqual(production.validate_scenes([scene], {}, cues, 4), [(0, 4)])
        self.assertEqual(scene, before)
        for a, b, duration in [(0.1, 2.09, 4), (0.1, 2.1, 3.5), (0.615, 2.6, 5)]:
            with self.subTest(a=a, b=b), self.assertRaises(ValueError):
                production.validate_scenes([scene], {}, [{'start': a, 'end': a+.5},
                    {'start': b, 'end': b+.5}], duration)
        scene['cues'] = [0]
        with self.assertRaises(ValueError):production.validate_scenes([scene], {}, cues, 4)

    def test_no_source_dials_palette_or_executable_input(self):
        cues = [{'start': .1, 'end': 1}, {'start': 2.1, 'end': 3}]
        for key, value in [('frequency', 6), ('speed', 1), ('cellSize', 60), ('gamma', 2),
                           ('palette', ['#000000']), ('shader', 'void main() {}'), ('quantize', True),
                           ('url', 'https://example.invalid/shader'), ('seed', 2)]:
            scene = self.scene();scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                production.validate_scenes([scene], {}, cues, 4)
        for key, size in [('heading', 53), ('caption', 101)]:
            scene = self.scene();scene['content'][key] = 'x'*size
            with self.assertRaises(ValueError):production.validate_scenes([scene], {}, cues, 4)

    def test_selective_renderer_in_all_four_profiles(self):
        for profile in production.COMPOSITION_FORMATS:
            scene = self.scene();before = copy.deepcopy(scene)
            scripts = production.scripts({'format': profile, 'scenes': [scene], 'assets': {}},
                                         {'colors': branding.PALETTES['violet']})
            for name in ('production-halftone-shader.js', 'production-halftone.js', 'production-gpu-backdrops.js'):
                self.assertIn('assets/'+name, scripts)
            for name in ('production-gpu-runtime', 'production-three-runtime', 'production-shader-images', 'https://'):
                self.assertNotIn(name, scripts)
            self.assertEqual(scene, before)
        scene = self.scene();scene['content']['style'] = 'grid';scene['cues'] = [0]
        scripts = production.scripts({'scenes': [scene], 'assets': {}}, {'colors': branding.PALETTES['violet']})
        self.assertNotIn('production-halftone', scripts)


if __name__ == '__main__':
    unittest.main()
