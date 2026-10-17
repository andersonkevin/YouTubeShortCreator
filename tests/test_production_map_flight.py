import copy
import unittest

import branding
import production_visuals as production


class FlightContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'map-story', 'name': 'A journey', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                'content': {'heading': 'Across the map', 'insight': 'Internal route test', 'style': 'flight',
                            'source': {'kind': 'illustrative', 'label': 'Internal test', 'reference': 'Supplied coordinates', 'as_of': '2026-10-16'},
                            'image': 'base', 'arrival': 'Arrived',
                            'points': [{'label': 'Origin', 'x': .2, 'y': .6}, {'label': 'Destination', 'x': .8, 'y': .35}]}}

    def validate(self, scene, captions=None, assets=None):
        return production.validate_scenes([scene], {'base': {}} if assets is None else assets,
                                          captions or [{'start': .1, 'end': 1}, {'start': 6.1, 'end': 7}], 9)

    def test_two_explicit_endpoints_and_two_cues_use_the_normal_contract(self):
        scene = self.scene();before = copy.deepcopy(scene)
        self.assertEqual(self.validate(scene), [(0, 9)])
        self.assertEqual(scene, before)
        self.validate(scene, [{'start': .115, 'end': 1}, {'start': 6.115, 'end': 7}])
        for end in (6.06, 6.09, 6.114):
            with self.assertRaises(ValueError):self.validate(scene, [{'start': .115, 'end': 1}, {'start': end, 'end': 7}])
        for cues in ([0], [0, 1, 2], [0, True]):
            scene = self.scene();scene['cues'] = cues
            with self.assertRaises(ValueError):self.validate(scene)

    def test_unknown_paths_free_controls_and_implicit_claims_are_rejected(self):
        for key, value in [('maximum', 6000), ('unit', 'km'), ('distance', 5837), ('url', 'https://example.test/map'),
                           ('path', 'M0 0'), ('color', 'red'), ('speed', 3), ('sound', 'audio.wav'),
                           ('arrival', 'a' * 17), ('image', '../base'), ('image', 'unknown'), ('points', [None, None])]:
            scene = self.scene();scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):self.validate(scene)
        with self.assertRaises(ValueError):self.validate(self.scene(), assets={})
        with self.assertRaises(ValueError):self.validate(self.scene(), assets={'base': {}, 'unused': {}})

    def test_point_count_separation_and_coordinates_are_bounded(self):
        changes = [lambda c: c['points'].pop(), lambda c: c['points'].append({'label': 'Third', 'x': .5, 'y': .5}),
                   lambda c: c['points'][1].update(label='origin'), lambda c: c['points'][1].update(x=.21, y=.61),
                   lambda c: c['points'][0].update(x=.149), lambda c: c['points'][1].update(y=.851),
                   lambda c: c['points'][0].update(y=float('nan')), lambda c: c['points'][0].update(x=True),
                   lambda c: c['points'][1].update(value=100)]
        for change in changes:
            scene = self.scene();change(scene['content'])
            with self.assertRaises(ValueError):self.validate(scene)

    def test_flight_is_opt_in_and_uses_existing_local_runtime_in_every_format(self):
        for profile in production.COMPOSITION_FORMATS:
            data = {'format': profile, 'scenes': [self.scene()], 'assets': {'base': {'path': 'base.png', 'sha256': '0' * 64}}}
            before = copy.deepcopy(data)
            scripts = production.scripts(data, {'colors': branding.PALETTES['violet']})
            self.assertIn('assets/production-map-flight.js', scripts)
            self.assertIn('assets/production-maps.js', scripts)
            self.assertIn('assets/production-carousels.js', scripts)
            for external in ('gsap.min.js', 'https://', 'production-three-runtime', 'production-gpu-runtime'):
                self.assertNotIn(external, scripts)
            self.assertEqual(data, before)
        data['scenes'] = [];scripts = production.scripts(data, {'colors': branding.PALETTES['violet']})
        self.assertNotIn('production-map-flight.js', scripts)


if __name__ == '__main__':
    unittest.main()
