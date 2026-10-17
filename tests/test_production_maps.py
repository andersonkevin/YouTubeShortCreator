import copy
import unittest

import production_visuals as production


SOURCE = {'kind': 'illustrative', 'label': 'Internal test', 'reference': 'Supplied test records', 'as_of': '2026-10-15'}


class MapAndChartContracts(unittest.TestCase):
    def setUp(self):
        self.captions = [{'start': i * 2 + .1, 'end': i * 2 + 1} for i in range(16)]

    def scene(self, style='us-hex'):
        c = {'heading': 'Supplied values', 'insight': 'Internal fixture', 'source': copy.deepcopy(SOURCE),
             'style': style, 'unit': 'items', 'maximum': 100}
        if style == 'us-hex':
            c.update(values=[{'region': 'CA', 'value': 25}, {'region': 'NY', 'value': 100}], focus=['CA', 'NY'])
        else:
            c.update(image='base', points=[{'label': 'West', 'x': .2, 'y': .5}, {'label': 'East', 'x': .8, 'y': .6}])
            if style == 'bubbles':
                for i, point in enumerate(c['points']): point['value'] = i * 100
            else:
                c['flows'] = [{'from': 0, 'to': 1, 'value': 50}, {'from': 1, 'to': 0, 'value': 25}]
        return {'kind': 'map-story', 'name': 'Map', 'first_cue': 0, 'cues': [0, 1, 2], 'transition': 'cut-left', 'content': c}

    def validate(self, scene):
        return production.validate_scenes([scene], {'base': {}} if 'image' in scene['content'] else {}, self.captions, 34)

    def test_map_styles_preserve_explicit_data_and_asset_contract(self):
        self.assertEqual(len(production.MAP_REGIONS), 51)
        for style in ('us-hex', 'bubbles', 'flows'):
            scene = self.scene(style)
            before = copy.deepcopy(scene)
            self.assertEqual(self.validate(scene), [(0, 34)])
            self.assertEqual(scene, before)
        scene = self.scene()
        scene['content']['values'] = [{'region': region, 'value': 0} for region in production.MAP_REGIONS]
        self.validate(scene)
        # A second scene catches accidental shadowing of the shared scene-name set.
        second = copy.deepcopy(scene)
        second.update(name='Second map', first_cue=4, cues=[4, 5, 6])
        production.validate_scenes([scene, second], {}, self.captions, 34)

    def test_rejects_unknown_regions_unverified_assets_and_implicit_scales(self):
        for key, value in [('maximum', 0), ('maximum', True), ('maximum', float('nan')), ('maximum', 1_000_001),
                           ('style', 'world'), ('style', []), ('html', '<svg>'), ('url', 'https://example.test/map'),
                           ('focus', ['CA', 'CA']), ('focus', ['XX']), ('focus', [True]),
                           ('values', [{'region': 'CA', 'value': 101}]),
                           ('values', [{'region': 'CA', 'value': 1}, {'region': 'CA', 'value': 2}])]:
            scene = self.scene()
            scene['content'][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): self.validate(scene)
        for image in ('../base', 'https://example.test/base.png', 'unknown', True):
            scene = self.scene('bubbles')
            scene['content']['image'] = image
            with self.subTest(image=image), self.assertRaises(ValueError): self.validate(scene)

    def test_flow_and_point_bounds_and_caption_counts(self):
        edits = [lambda c: c['points'][0].update(x=.1), lambda c: c['points'][0].update(y=float('inf')),
                 lambda c: c['points'][1].update(x=.2, y=.5), lambda c: c['points'][1].update(label='West'),
                 lambda c: c['flows'][0].update(value=0), lambda c: c['flows'][0].update(to=True),
                 lambda c: c['flows'][0].update(to=2), lambda c: c['flows'][0].update(to=0),
                 lambda c: c['flows'][1].update(**c['flows'][0]),
                 lambda c: c['points'].append({'label': 'Unused', 'x': .5, 'y': .5})]
        for edit in edits:
            scene = self.scene('flows')
            edit(scene['content'])
            with self.assertRaises(ValueError): self.validate(scene)
        for cues in ([0], [0, 2, 1], [0, 1, True]):
            scene = self.scene()
            scene['cues'] = cues
            with self.assertRaises(ValueError): self.validate(scene)

    def test_combo_chart_requires_independent_units_and_axes(self):
        scene = {'kind': 'combo-chart', 'name': 'Two axes', 'first_cue': 0, 'cues': [0, 1, 2, 3], 'transition': 'cut-left',
                 'content': {'heading': 'A comparison', 'insight': 'Internal fixture', 'source': copy.deepcopy(SOURCE), 'categories': ['A', 'B'],
                             'bars': {'label': 'Volume', 'unit': 'items', 'maximum': 100, 'values': [25, 75]},
                             'line': {'label': 'Rate', 'unit': '%', 'maximum': 5, 'values': [2, 4]}}}
        self.validate(scene)
        for change in [lambda c: c['line'].pop('maximum'), lambda c: c['bars'].update(maximum=50),
                       lambda c: c['line'].update(values=[1]), lambda c: c['bars'].update(values=[False, 4]),
                       lambda c: c.update(categories=['A', 'A']), lambda c: c['line'].update(label='Volume')]:
            bad = copy.deepcopy(scene)
            change(bad['content'])
            with self.assertRaises(ValueError): self.validate(bad)

    def test_specifications_remain_literal_and_bounded(self):
        scene = {'kind': 'specs', 'name': 'Specs', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                 'content': {'heading': 'Specifications', 'source': 'Internal fixture', 'rows': [
                     {'label': 'Format', 'value': '16:9'}, {'label': 'Duration', 'value': '10 minutes'}]}}
        self.validate(scene)
        scene['content']['rows'][0]['url'] = 'https://example.test'
        with self.assertRaises(ValueError): self.validate(scene)

    def test_conic_metric_requires_explicit_valid_denominator(self):
        record = {'id': 'metric', 'kind': 'metric', 'title': 'A number', 'insight': 'Internal fixture',
                  'icon': next(iter(production.kit.verify_assets()['icons'])), 'source': copy.deepcopy(SOURCE),
                  'data': {'label': 'Items', 'value': 12.5, 'unit': 'items', 'context': 'Internal fixture'}}
        scene = {'kind': 'chart', 'name': 'Ring', 'first_cue': 0, 'cues': [0], 'transition': 'cut-left',
                 'content': {'record': record, 'metric_style': 'conic-ring', 'maximum': 100}}
        self.validate(scene)
        for maximum in (0, True, 10, float('inf')):
            bad = copy.deepcopy(scene)
            bad['content']['maximum'] = maximum
            with self.assertRaises(ValueError): self.validate(bad)
        scene['content'].pop('maximum')
        with self.assertRaises(ValueError): self.validate(scene)


if __name__ == '__main__':
    unittest.main()
