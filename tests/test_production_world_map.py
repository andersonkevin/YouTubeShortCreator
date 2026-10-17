import copy
import unittest
from math import ceil

import branding
import production_visuals as production


class WorldMapContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'map-story', 'name': 'World data', 'first_cue': 0, 'cues': [0, 1, 2], 'transition': 'cut-left',
                'content': {'heading': 'Supplied regional values', 'insight': 'Internal illustrative data', 'style': 'world',
                            'source': {'kind': 'illustrative', 'label': 'Internal test', 'reference': 'Supplied records', 'as_of': '2026-10-16'},
                            'unit': 'items', 'maximum': 100,
                            'values': [{'region': 'France', 'value': 0}, {'region': 'Canada', 'value': 100}], 'focus': ['France', 'Canada']}}

    def validate(self, scene, captions=None, duration=9, assets=None):
        return production.validate_scenes([scene], assets or {}, captions or [
            {'start': .1, 'end': 1}, {'start': 5.1, 'end': 5.9}, {'start': 6.4, 'end': 7.2}], duration)

    def test_explicit_values_preserve_zero_missing_and_all177_region_names(self):
        self.assertEqual(len(production.WORLD_REGIONS), 177)
        scene = self.scene();before = copy.deepcopy(scene)
        self.assertEqual(self.validate(scene), [(0, 9)]);self.assertEqual(scene, before)
        scene['content']['values'] = [{'region': name, 'value': 0} for name in production.WORLD_REGIONS]
        self.validate(scene)

    def test_rejects_unknown_regions_implicit_scales_extra_data_and_missing_focus(self):
        edits = [lambda c: c['values'][0].update(region='Atlantis'), lambda c: c['values'][0].update(region='FR'),
                 lambda c: c['values'][0].update(value=True), lambda c: c['values'][0].update(value=-1),
                 lambda c: c['values'][0].update(value=101), lambda c: c['values'].append(c['values'][0]),
                 lambda c: c.update(maximum=0), lambda c: c.update(maximum=float('nan')),
                 lambda c: c.update(focus=['Brazil', 'Canada']), lambda c: c.update(focus=['France', 'France']),
                 lambda c: c.update(image='base'), lambda c: c.update(url='https://example.test/map'),
                 lambda c: c.update(projection='mercator'), lambda c: c.update(colors=['red'])]
        for edit in edits:
            scene = self.scene();edit(scene['content'])
            with self.assertRaises(ValueError):self.validate(scene)
        with self.assertRaises(ValueError):self.validate(self.scene(), assets={'unused': {}})

    def test_long_intro_and_individual_pulses_fit_before_scene_exit(self):
        for captions in [[{'start': .1, 'end': 1}, {'start': 5.06, 'end': 5.9}, {'start': 6.4, 'end': 7.2}],
                         [{'start': .1, 'end': 1}, {'start': 5.1, 'end': 5.9}, {'start': 6.26, 'end': 7.2}]]:
            with self.assertRaises(ValueError):self.validate(self.scene(), captions=captions)
        with self.assertRaises(ValueError):self.validate(self.scene(), duration=8.16)
        # The existing renderer ceilings the floating-point caption onset to a native frame.
        boundary = (ceil((6.4 + production.BEAT_DELAY) * 30) + 30 + 12) / 30
        with self.assertRaises(ValueError):self.validate(self.scene(), duration=boundary - 1 / 30)
        self.validate(self.scene(), duration=boundary)
        self.validate(self.scene(), captions=[{'start': .115, 'end': 1}, {'start': 5.115, 'end': 5.9}, {'start': 6.315, 'end': 7.2}])

    def test_geometry_is_opt_in_and_does_not_ship_a_geographic_runtime(self):
        for profile in production.COMPOSITION_FORMATS:
            data = {'format': profile, 'scenes': [self.scene()], 'assets': {}}
            scripts = production.scripts(data, {'colors': branding.PALETTES['violet']})
            self.assertIn('assets/production-world-geometry.js', scripts)
            self.assertIn('assets/production-world-map.js', scripts)
            self.assertLess(scripts.index('production-world-geometry.js'), scripts.index('production-world-map.js'))
            for token in ('d3.min.js', 'topojson', 'gsap.min.js', 'https://'):
                self.assertNotIn(token, scripts)
        data['scenes'] = [];scripts = production.scripts(data, {'colors': branding.PALETTES['violet']})
        self.assertNotIn('production-world-geometry.js', scripts)


if __name__ == '__main__':
    unittest.main()
