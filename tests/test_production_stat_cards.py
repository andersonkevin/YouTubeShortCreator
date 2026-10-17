import unittest

import production_visuals as production


class StatCardContracts(unittest.TestCase):
    def scene(self, style):
        return {'kind': 'chart', 'name': 'Internal statistic', 'first_cue': 0, 'cues': [0],
                'transition': 'cut-left', 'content': {'metric_style': style, 'record': {
                    'id': 'value', 'kind': 'metric', 'title': 'Supplied value', 'insight': 'Internal test.',
                    'icon': 'chart-no-axes-combined',
                    'source': {'kind': 'illustrative', 'label': 'Internal fixture', 'reference': 'Synthetic value', 'as_of': '2026-10-16'},
                    'data': {'label': 'Result', 'value': 47, 'unit': 'units', 'context': 'Supplied context'}}}}

    def validate(self, scene):
        scene['content']['record']['icon'] = next(iter(production.kit.verify_assets()['icons']))
        return production.validate_scenes([scene], {}, [{'start': .1, 'end': 1}, {'start': 2.1, 'end': 3}], 5)

    def test_statistic_presentations_keep_one_cue_and_exact_values(self):
        for style in production.STAT_CARD_STYLES:
            for value in (0, 47, -12, 12.5):
                scene = self.scene(style)
                scene['content']['record']['data']['value'] = value
                self.assertEqual(self.validate(scene), [(0, 5)])
                self.assertEqual(scene['content']['record']['data']['value'], value)
            scene = self.scene(style)
            scene['cues'] = [0, 1]
            with self.assertRaises(ValueError): self.validate(scene)

    def test_statistic_presentations_preserve_source_and_style_boundaries(self):
        for style in production.STAT_CARD_STYLES:
            for key, value in [('color', 'red'), ('font', 'Helvetica'), ('scale', .5), ('maximum', 100), ('html', '<b>')]:
                scene = self.scene(style)
                scene['content'][key] = value
                with self.subTest(style=style, key=key), self.assertRaises(ValueError): self.validate(scene)
            scene = self.scene(style)
            del scene['content']['record']['source']
            with self.assertRaises(ValueError): self.validate(scene)
        for field, value in [('value', 12345), ('unit', 'long unit name'), ('context', 'x' * 53), ('label', 'x' * 25)]:
            scene = self.scene('soft-stat')
            scene['content']['record']['data'][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError): self.validate(scene)


if __name__ == '__main__':
    unittest.main()
