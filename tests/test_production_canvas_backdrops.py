import copy
import unittest

import branding
import production_visuals as production


class CanvasBackdropTests(unittest.TestCase):
    def scene(self, style):
        return {'kind': 'backdrop', 'name': 'Canvas field', 'first_cue': 0, 'cues': [0, 1],
                'transition': 'cut-left', 'content': {'heading': 'A bounded field',
                'caption': 'Internal visual test', 'style': style}}

    def test_cues_bound_motion_and_reject_source_overrides(self):
        for style in production.CANVAS_BACKDROP_STYLES:
            scene = self.scene(style)
            cues = [{'start': .1, 'end': 1}, {'start': 3.1, 'end': 4}]
            self.assertEqual(production.validate_scenes([scene], {}, cues, 5), [(0, 5)])
            for key, value in [('fps', 100), ('boil', True), ('seed', 42), ('emitters', 10000),
                               ('url', 'https://example.invalid'), ('tint', '#ff0000'), ('duration', 600)]:
                bad = copy.deepcopy(scene); bad['content'][key] = value
                with self.subTest(style=style, key=key), self.assertRaises(ValueError):
                    production.validate_scenes([bad], {}, cues, 5)
            bad = copy.deepcopy(scene); bad['cues'] = [0]
            with self.assertRaises(ValueError): production.validate_scenes([bad], {}, cues, 5)
            cues[1]['start'] = 3 if style.startswith('stop-motion-') else 2
            with self.assertRaises(ValueError): production.validate_scenes([scene], {}, cues, 5)

    def test_canvas_recipes_do_not_load_gpu_or_experimental_runtimes(self):
        brand = {'colors': branding.PALETTES['violet']}
        for style in production.CANVAS_BACKDROP_STYLES:
            script = production.scripts({'format': 'landscape', 'scenes': [self.scene(style)], 'assets': {}}, brand)
            self.assertIn('production-canvas-backdrops.js', script)
            self.assertIn('production-gpu-backdrops.js', script)  # Shared frame clock only.
            for payload in ('production-gpu-runtime.js', 'production-three-runtime.js', 'production-liquid-glass-runtime.js'):
                self.assertNotIn(payload, script)
        scene = self.scene('mesh'); scene['cues'] = [0]
        script = production.scripts({'scenes': [scene], 'assets': {}}, brand)
        self.assertNotIn('production-canvas-backdrops.js', script)

    def test_magnetic_swaps_reuse_verified_still_contract(self):
        for style in ('shader-magnetic-pull', 'shader-magnetic-repel'):
            scene = {'kind': 'screen', 'name': 'Magnetic handoff', 'first_cue': 0, 'cues': [0, 1],
                     'transition': 'cut-left', 'content': {'heading': 'Verified captures', 'caption': 'Internal test',
                     'images': ['a', 'b'], 'chrome': 'browser', 'swap': style}}
            cues = [{'start': .1, 'end': 1}, {'start': 2.1, 'end': 3}]
            self.assertEqual(production.validate_scenes([scene], {'a': {}, 'b': {}}, cues, 5), [(0, 5)])
            self.assertEqual(production.shader_images({'scenes': [scene]}), {'a', 'b'})
            for key, value in [('strength', 100), ('mouse', [0, 1]), ('repel', True), ('html', '<b>unsafe</b>')]:
                bad = copy.deepcopy(scene); bad['content'][key] = value
                with self.assertRaises(ValueError): production.validate_scenes([bad], {'a': {}, 'b': {}}, cues, 5)


if __name__ == '__main__':
    unittest.main()
