import copy
import unittest

import production_visuals as production


SOURCE = {'kind': 'illustrative', 'label': 'Internal fixture', 'reference': 'Synthetic example', 'as_of': '2026-10-15'}


class ProductionDataTests(unittest.TestCase):
    def setUp(self):
        self.captions = [{'start': .1 + 2 * i, 'end': 1.5 + 2 * i} for i in range(8)]

    def scene(self, kind, content, count):
        return {'kind': kind, 'name': 'Internal data test', 'first_cue': 0,
                'cues': list(range(count)), 'transition': 'cut-left', 'content': content}

    def data(self, style='ranking'):
        return {'heading': 'Explicit data', 'insight': 'Synthetic values for testing.', 'source': copy.deepcopy(SOURCE),
                'style': style, 'unit': 'units', 'categories': ['Jan', 'Feb', 'Mar'],
                'series': [{'label': 'Alpha', 'values': [25, 15, 5]}] if style == 'decline' else
                          [{'label': 'Alpha', 'values': [0, 20, 5]}, {'label': 'Beta', 'values': [10, 15, 25]}]}

    def test_decline_requires_a_single_actual_decreasing_series(self):
        for values in ([20, 25, 5], [5, 5, 5], [5, 15, 25], [25, -1, 0]):
            content = self.data('decline')
            content['series'][0]['values'] = values
            with self.subTest(values=values), self.assertRaises(ValueError): self.validate(self.scene('data-story', content, 3))
        content = self.data('decline')
        content['series'][0]['values'] = [25.5, 25.5, .125]
        self.assertEqual(self.validate(self.scene('data-story', content, 3)), [(0, 18)])
        content['series'].append({'label': 'Other', 'values': [25, 15, 5]})
        with self.assertRaises(ValueError): self.validate(self.scene('data-story', content, 3))

    def network(self, style='branch'):
        return {'heading': 'Explicit relationships', 'source': copy.deepcopy(SOURCE), 'style': style,
                'nodes': [{'label': 'Root', 'parent': None}, {'label': 'First', 'parent': 0},
                          {'label': 'Second', 'parent': 0}, {'label': 'Leaf', 'parent': 1 if style == 'branch' else 0}]}

    def validate(self, scene, assets=None):
        return production.validate_scenes([scene], assets or {}, self.captions, 18)

    def test_data_styles_keep_exact_values_sources_and_period_cues(self):
        for style in production.DATA_STYLES:
            scene = self.scene('data-story', self.data(style), 3)
            self.assertEqual(self.validate(scene), [(0, 18)])
            bad = copy.deepcopy(scene)
            bad['cues'] = [0, 1]
            with self.assertRaises(ValueError): self.validate(bad)
        content = self.data()
        content['series'] *= 2
        with self.assertRaises(ValueError): self.validate(self.scene('data-story', content, 3))

    def test_data_refuses_invented_or_unsafe_inputs(self):
        edits = [lambda c: c['series'][0].update(values=[1, 2]),
                 lambda c: c['series'][0].update(values=[1, float('nan'), 2]),
                 lambda c: c['series'][0].update(values=[1, True, 2]),
                 lambda c: c['series'][0].update(values=[1, -2, 3]),
                 lambda c: c['series'][0].update(values=[1, 1_000_001, 3]),
                 lambda c: c.update(categories=['Jan', 'Jan', 'Mar']),
                 lambda c: c.update(html='<script>'), lambda c: c.update(style='external'),
                 lambda c: c['source'].update(as_of='yesterday')]
        for edit in edits:
            content = self.data()
            edit(content)
            with self.subTest(content=content), self.assertRaises(ValueError): self.validate(self.scene('data-story', content, 3))

    def test_network_requires_forward_reveal_of_a_rooted_tree(self):
        for style in production.NETWORK_STYLES:
            self.assertEqual(self.validate(self.scene('network', self.network(style), 4)), [(0, 18)])
        for parent in (True, 4, -1, None, '0'):
            content = self.network()
            content['nodes'][2]['parent'] = parent
            with self.subTest(parent=parent), self.assertRaises(ValueError): self.validate(self.scene('network', content, 4))
        content = self.network('hub')
        content['nodes'][3]['parent'] = 1
        with self.assertRaises(ValueError): self.validate(self.scene('network', content, 4))
        content = self.network()
        content['nodes'].append({'label': 'Too deep', 'parent': 3})
        with self.assertRaises(ValueError): self.validate(self.scene('network', content, 5))

    def test_annotations_use_one_local_image_and_one_cue_per_mark(self):
        for style in production.ANNOTATION_STYLES:
            content = {'heading': 'Local capture', 'source': 'Internal example', 'image': 'capture',
                       'marks': [{'x': .2, 'y': .3, 'width': .4, 'height': .2, 'label': 'Target', 'style': style}]}
            scene = self.scene('annotation', content, 2)
            self.assertEqual(self.validate(scene, {'capture': {}}), [(0, 18)])
            for key, value in [('x', .9), ('height', 0), ('width', float('inf')), ('style', 'html'), ('url', 'remote')]:
                bad = copy.deepcopy(scene)
                bad['content']['marks'][0][key] = value
                with self.subTest(key=key), self.assertRaises(ValueError): self.validate(bad, {'capture': {}})
            with self.assertRaises(ValueError): self.validate(scene)
            scene['cues'] = [0]
            with self.assertRaises(ValueError): self.validate(scene, {'capture': {}})

    def test_radial_presentations_require_supplied_root_links_and_reject_source_overrides(self):
        for style in production.NETWORK_STYLES[2:]:
            for count in (3, 4, 5, 6, 7):
                content = self.network(style)
                content['nodes'] = [{'label': 'Root', 'parent': None}] + [
                    {'label': 'Node ' + str(i), 'parent': 0} for i in range(1, count)]
                self.assertEqual(self.validate(self.scene('network', content, count)), [(0, 18)])
            for edit in [lambda c: c['nodes'][2].update(parent=1), lambda c: c.update(count=16),
                         lambda c: c.update(intensity=2), lambda c: c.update(avatar='remote.png'),
                         lambda c: c.update(font='Other'), lambda c: c.update(cues=[0, 1])]:
                content = self.network(style); edit(content)
                with self.assertRaises(ValueError): self.validate(self.scene('network', content, 4))


if __name__ == '__main__':
    unittest.main()
