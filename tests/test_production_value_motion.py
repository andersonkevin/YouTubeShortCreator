import copy
import unittest

import production_visuals as production

SOURCE = {'kind': 'illustrative', 'label': 'Internal fixture', 'reference': 'Synthetic values', 'as_of': '2026-10-16'}


class ValueMotionContracts(unittest.TestCase):
    def setUp(self):
        self.captions = [{'start': .1 + 2 * i, 'end': 1 + 2 * i} for i in range(6)]

    def scene(self, kind, content, count=2):
        return {'kind': kind, 'name': 'Value motion', 'first_cue': 0, 'cues': list(range(count)),
                'transition': 'cut-left', 'content': content}

    def validate(self, scene):
        return production.validate_scenes([scene], {}, self.captions, 13)

    def metric(self):
        return self.scene('chart', {'metric_style': 'count-burst', 'record': {
            'id': 'result', 'kind': 'metric', 'title': 'Supplied result', 'insight': 'Internal test.',
            'icon': next(iter(production.kit.verify_assets()['icons'])), 'source': copy.deepcopy(SOURCE),
            'data': {'label': 'Result', 'value': 12.5, 'unit': 'units', 'context': 'No inferred currency'}}})

    def test_burst_uses_two_cues_and_preserves_exact_supplied_values(self):
        for value in [0, 12.5, 1000000, -99.125, .0000001]:
            scene = self.metric(); scene['content']['record']['data']['value'] = value
            before = copy.deepcopy(scene)
            self.assertEqual(self.validate(scene), [(0, 13)])
            self.assertEqual(scene, before)
        for count in [1, 3]:
            scene = self.metric(); scene['cues'] = list(range(count))
            with self.assertRaises(ValueError): self.validate(scene)

    def test_burst_rejects_free_controls_and_non_metric_records(self):
        for key, value in [('maximum', 100), ('seed', 42), ('particles', 10000), ('color', '#fff'), ('font', 'Inter'), ('audio', 'remote.wav')]:
            scene = self.metric(); scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.validate(scene)
        scene = self.metric(); scene['content']['record']['data']['value'] = float('nan')
        with self.assertRaises(ValueError): self.validate(scene)

    def lanes(self, count):
        return self.scene('data-story', {'style': 'value-lanes', 'heading': 'Relative values',
            'insight': 'Marker speed represents the supplied value.', 'source': copy.deepcopy(SOURCE),
            'unit': 'units', 'categories': ['Before', 'After'],
            'series': [{'label': f'Series {i}', 'values': [i, i + 1]} for i in range(count)]})

    def test_lanes_accept_two_to_six_complete_series_and_one_cue_per_period(self):
        for count in range(2, 7):
            self.assertEqual(self.validate(self.lanes(count)), [(0, 13)])
        for count in [1, 7]:
            with self.assertRaises(ValueError): self.validate(self.lanes(count))
        scene = self.lanes(2); scene['cues'] = [0]
        with self.assertRaises(ValueError): self.validate(scene)

    def test_lanes_reject_guessed_values_remote_avatars_and_unbounded_motion(self):
        for key, value in [('speed', 100), ('duration', 600), ('avatar', 'remote.png'), ('floor', 10)]:
            scene = self.lanes(2); scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.validate(scene)
        for values in [[1], [1, None], [-1, 2], [True, 2], [float('inf'), 2]]:
            scene = self.lanes(2); scene['content']['series'][0]['values'] = values
            with self.subTest(values=values), self.assertRaises(ValueError): self.validate(scene)


if __name__ == '__main__':
    unittest.main()
