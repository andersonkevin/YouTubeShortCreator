import copy
import unittest
import branding
import production_visuals as production


class GooeySplitContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'backdrop', 'name': 'Organic geometry', 'first_cue': 0,
                'cues': [0, 1], 'transition': 'cut-left', 'content': {'heading': 'A shape in motion',
                    'caption': 'Internal composition test.', 'style': 'gooey-split'}}

    def test_five_second_choreography_requires_two_caption_anchors(self):
        scene = self.scene();cues = [{'start': .1, 'end': 1}, {'start': 5.1, 'end': 6}]
        self.assertEqual(production.validate_scenes([scene], {}, cues, 7), [(0, 7)])
        cues[1]['start'] = 5.06
        with self.assertRaises(ValueError):production.validate_scenes([scene], {}, cues, 7)
        scene['cues'] = [0]
        with self.assertRaises(ValueError):production.validate_scenes([scene], {}, cues, 7)

    def test_approved_geometry_has_no_free_source_controls(self):
        cues = [{'start': .1, 'end': 1}, {'start': 5.1, 'end': 6}]
        for key, value in [('color', '#ffaa00'), ('blur', 500), ('path', 'M0 0'), ('fps', 60),
                           ('duration', 60), ('shutter', 999), ('samples', 1000), ('url', 'remote')]:
            scene = self.scene();scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):production.validate_scenes([scene], {}, cues, 7)
        scene = self.scene();scene['content']['style'] = 'gooey-split-script'
        with self.assertRaises(ValueError):production.validate_scenes([scene], {}, cues, 7)

    def test_selected_vector_recipe_loads_without_gpu_or_animation_libraries(self):
        for profile in production.COMPOSITION_FORMATS:
            scene = self.scene();before = copy.deepcopy(scene)
            scripts = production.scripts({'format': profile, 'scenes': [scene], 'assets': {}}, {'colors': branding.PALETTES['violet']})
            self.assertIn('assets/production-gooey-split.js', scripts)
            self.assertIn('assets/production-gpu-backdrops.js', scripts)  # Shared cue clock only.
            for token in ('production-gpu-runtime', 'production-three-runtime', 'gsap.min.js', 'https://'):
                self.assertNotIn(token, scripts)
            self.assertEqual(scene, before)
        scene = self.scene();scene['content']['style'] = 'mesh';scene['cues'] = [0]
        scripts = production.scripts({'scenes': [scene], 'assets': {}}, {'colors': branding.PALETTES['violet']})
        self.assertNotIn('production-gooey-split.js', scripts)


if __name__ == '__main__':
    unittest.main()
