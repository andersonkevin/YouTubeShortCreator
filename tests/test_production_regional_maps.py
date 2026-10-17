import copy
import unittest
from math import ceil

import branding
import production_visuals as production


class RegionalMapContracts(unittest.TestCase):
    def scene(self, style='spain'):
        codes = ('MAD', 'MEL') if style == 'spain' else ('CA', 'RI')
        return {'kind': 'map-story', 'name': 'Regional data', 'first_cue': 0, 'cues': [0, 1, 2], 'transition': 'cut-left',
                'content': {'heading': 'Supplied regional values', 'insight': 'Internal illustrative data', 'style': style,
                            'source': {'kind': 'illustrative', 'label': 'Internal test', 'reference': 'Supplied records', 'as_of': '2026-10-16'},
                            'unit': 'items', 'maximum': 100,
                            'values': [{'region': codes[0], 'value': 0}, {'region': codes[1], 'value': 100}], 'focus': list(codes)}}

    def validate(self, scene, captions=None, duration=11, assets=None):
        return production.validate_scenes([scene], assets or {}, captions or [
            {'start': .1, 'end': 1}, {'start': 6.6, 'end': 7.1}, {'start': 8, 'end': 8.8}], duration)

    def test_two_closed_regional_sets_and_all_explicit_values(self):
        self.assertEqual(len(production.SPAIN_REGIONS), 19)
        for style in ('spain', 'us'):
            scene = self.scene(style);before = copy.deepcopy(scene)
            self.assertEqual(self.validate(scene), [(0, 11)]);self.assertEqual(scene, before)
            codes = production.SPAIN_REGIONS if style == 'spain' else tuple(r for r in production.MAP_REGIONS if r != 'DC')
            self.assertEqual(len(codes), 19 if style == 'spain' else 50)
            scene['content']['values'] = [{'region': code, 'value': 0} for code in codes]
            self.validate(scene)

    def test_rejects_unknown_regions_extra_data_bad_scales_and_implicit_focus(self):
        for style in ('spain', 'us'):
            edits = [lambda c: c['values'][0].update(region='DC'), lambda c: c['values'][0].update(region='../CA'),
                     lambda c: c['values'][0].update(region='ES'), lambda c: c['values'][0].update(value=True),
                     lambda c: c['values'][0].update(value=-1), lambda c: c['values'][0].update(value=101),
                     lambda c: c['values'].append(c['values'][0]), lambda c: c.update(maximum=0),
                     lambda c: c.update(maximum=float('nan')), lambda c: c.update(focus=['unknown']),
                     lambda c: c.update(focus=[c['focus'][0], c['focus'][0]]), lambda c: c.update(image='base'),
                     lambda c: c.update(url='https://example.test/map'), lambda c: c.update(projection='mercator'),
                     lambda c: c.update(colors=['red']), lambda c: c.update(attribution='Hidden')]
            for edit in edits:
                scene = self.scene(style);edit(scene['content'])
                with self.subTest(style=style, content=scene['content']), self.assertRaises(ValueError):self.validate(scene)
            with self.assertRaises(ValueError):self.validate(self.scene(style), assets={'unused': {}})

    def test_source_reveal_and_focus_pulses_fit_before_exit(self):
        for style in ('spain', 'us'):
            for captions in [[{'start': .1, 'end': 1}, {'start': 6.56, 'end': 7.1}, {'start': 8, 'end': 8.8}],
                             [{'start': .1, 'end': 1}, {'start': 6.6, 'end': 7.1}, {'start': 7.76, 'end': 8.8}]]:
                with self.assertRaises(ValueError):self.validate(self.scene(style), captions=captions)
            boundary = (ceil((8 + production.BEAT_DELAY) * 30) + 30 + 12) / 30
            with self.assertRaises(ValueError):self.validate(self.scene(style), duration=boundary - 1/30)
            self.validate(self.scene(style), duration=boundary)

    def test_geometry_and_renderer_load_only_for_regional_maps(self):
        for style in ('spain', 'us'):
            for profile in production.COMPOSITION_FORMATS:
                data = {'format': profile, 'scenes': [self.scene(style)], 'assets': {}}
                scripts = production.scripts(data, {'colors': branding.PALETTES['violet']})
                self.assertLess(scripts.index('production-regional-geometry.js'), scripts.index('production-regional-map.js'))
                for token in ('d3.min.js', 'topojson', 'gsap.min.js', 'https://', 'production-world-geometry.js'):
                    self.assertNotIn(token, scripts)
        data['scenes'] = [];scripts = production.scripts(data, {'colors': branding.PALETTES['violet']})
        self.assertNotIn('production-regional-geometry.js', scripts)


if __name__ == '__main__':
    unittest.main()
