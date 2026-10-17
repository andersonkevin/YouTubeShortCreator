import copy
import unittest

import branding
import production_visuals as production


class SpotlightContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'map-story', 'name': 'Local focus', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                'content': {'heading': 'A selected region', 'insight': 'Internal visual fixture', 'style': 'spotlight',
                            'source': {'kind': 'illustrative', 'label': 'Internal test', 'reference': 'Supplied region', 'as_of': '2026-10-16'},
                            'image': 'base', 'label': 'Selected region', 'region': {'x': .35, 'y': .3, 'width': .2, 'height': .25}}}

    def validate(self, scene, gap=7, assets=None):
        return production.validate_scenes([scene], {'base': {}} if assets is None else assets,
                                          [{'start': .115, 'end': 1}, {'start': .115 + gap, 'end': gap + 1}], gap + 3)

    def test_region_and_caption_clock_are_explicit_and_do_not_mutate_input(self):
        scene = self.scene();before = copy.deepcopy(scene)
        self.assertEqual(self.validate(scene), [(0, 10)]);self.assertEqual(scene, before)
        with self.assertRaises(ValueError):self.validate(scene, gap=6.99)
        scene['cues'] = [0]
        with self.assertRaises(ValueError):self.validate(scene)

    def test_region_margins_dimensions_labels_and_assets_fail_closed(self):
        for key, value in [('x', .04), ('y', True), ('width', .09), ('width', .31), ('height', float('nan')), ('x', .8)]:
            scene = self.scene();scene['content']['region'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):self.validate(scene)
        for key, value in [('label', 'a' * 25), ('image', '../base'), ('unit', 'km'), ('latitude', 40), ('zoom', 10),
                           ('color', 'red'), ('path', 'M0 0'), ('url', 'https://example.test'), ('region', None)]:
            scene = self.scene();scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):self.validate(scene)
        with self.assertRaises(ValueError):self.validate(self.scene(), assets={})
        with self.assertRaises(ValueError):self.validate(self.scene(), assets={'base': {}, 'unused': {}})

    def test_native_recipe_is_selected_for_every_format_without_source_media_or_libraries(self):
        for profile in production.COMPOSITION_FORMATS:
            data = {'format': profile, 'scenes': [self.scene()], 'assets': {'base': {'path': 'base.png', 'sha256': '0' * 64}}}
            scripts = production.scripts(data, {'colors': branding.PALETTES['violet']})
            self.assertIn('assets/production-map-spotlight.js', scripts)
            for token in ('korea-map.png', 'LOCKED', 'gsap.min.js', 'https://', 'production-gpu-runtime'):
                self.assertNotIn(token, scripts)
        data['scenes'] = [];scripts = production.scripts(data, {'colors': branding.PALETTES['violet']})
        self.assertNotIn('production-map-spotlight.js', scripts)


if __name__ == '__main__':
    unittest.main()
