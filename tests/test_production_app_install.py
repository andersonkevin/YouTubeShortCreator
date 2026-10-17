import copy
from math import ceil
import unittest

import branding
import production_visuals as production


class AppInstallContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'interface', 'name': 'Illustrated installation', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                'content': {'style': 'steps', 'variant': 'app-install', 'heading': 'Find your app', 'source': 'Internal app installation illustration',
                            'items': [{'label': 'App '+str(i+1), 'body': 'Supplied description', 'icon': 'code'} for i in range(8)],
                            'selected': 5, 'ui': {'title': 'Search', 'query': 'Tools for work', 'get': 'GET', 'open': 'OPEN', 'ready': 'Ready to explore'},
                            'detail': {'body': 'An illustrated workflow', 'facts': [{'label': 'Type', 'value': 'Tool'}, {'label': 'Mode', 'value': 'Local'}, {'label': 'Input', 'value': 'Files'}]}}}

    def validate(self, scene, captions=None, duration=10):
        return production.validate_scenes([scene], {}, captions or [{'start': .115, 'end': 1.115}, {'start': 7.115, 'end': 8.115}], duration)

    def test_eight_explicit_catalog_entries_and_any_target_are_reusable(self):
        for selected in range(8):
            scene = self.scene();scene['content']['selected'] = selected
            self.assertEqual(self.validate(scene), [(0, 10)])
        for count in [0, 2, 7, 9]:
            scene = self.scene();scene['content']['items'] = [scene['content']['items'][0]]*count
            with self.assertRaises(ValueError):self.validate(scene)
        for selected in [-1, 8, True, '5', None]:
            scene = self.scene();scene['content']['selected'] = selected
            with self.assertRaises(ValueError):self.validate(scene)

    def test_ui_facts_and_copy_must_be_supplied_within_the_closed_limits(self):
        for key in ['ui', 'detail', 'selected']:
            scene = self.scene();del scene['content'][key]
            with self.assertRaises(ValueError):self.validate(scene)
        for path, value in [(('items', 0, 'label'), 'x'*13), (('items', 0, 'body'), 'x'*23),
                            (('ui', 'query'), 'x'*23), (('ui', 'get'), 'x'*9), (('detail', 'body'), 'x'*49),
                            (('detail', 'facts'), []), (('detail', 'facts', 0, 'value'), 'x'*9),
                            (('items', 0, 'icon'), '../icon.svg')]:
            scene = self.scene();node = scene['content']
            for key in path[:-1]:node = node[key]
            node[path[-1]] = value
            with self.subTest(path=path), self.assertRaises(ValueError):self.validate(scene)

    def test_no_live_store_actions_remote_media_or_brand_overrides(self):
        for edit in [{'style': 'chat'}, {'font': 'Inter'}, {'url': 'https://example.invalid'}, {'onClick': 'download'},
                     {'typing_indicator': True}, {'duration': 7}, {'colors': ['red']}]:
            scene = self.scene();scene['content'].update(edit)
            with self.assertRaises(ValueError):self.validate(scene)
        scene = self.scene();scene['content']['detail']['facts'][0]['source_url'] = 'https://example.invalid'
        with self.assertRaises(ValueError):self.validate(scene)

    def test_start_settle_and_exit_margins_cannot_be_shortened(self):
        for cues in [[0], [0, 1, 2]]:
            scene = self.scene();scene['cues'] = cues
            with self.assertRaises(ValueError):self.validate(scene)
        with self.assertRaises(ValueError):self.validate(self.scene(), [{'start': .115, 'end': 1}, {'start': 7.08, 'end': 8}])
        boundary = (ceil((7.115+production.BEAT_DELAY)*30)+24+12)/30
        self.validate(self.scene(), duration=boundary)
        with self.assertRaises(ValueError):self.validate(self.scene(), duration=boundary-1/30)

    def test_pinned_icon_compiler_and_opt_in_loader_cover_all_four_formats(self):
        for profile in production.COMPOSITION_FORMATS:
            data = {'format': profile, 'scenes': [self.scene()], 'assets': {}}
            script = production.scripts(data, {'colors': branding.PALETTES['violet']})
            self.assertEqual(script.count('src="assets/production-app-install.js"'), 1)
            self.assertLess(script.index('production-app-install.js'), script.index('production-interface.js'))
            self.assertIn('data:image/svg+xml;base64,', script);self.assertNotIn('https://', script)
            data['scenes'] = []
            self.assertNotIn('production-app-install.js', production.scripts(data, {'colors': branding.PALETTES['violet']}))


if __name__ == '__main__':
    unittest.main()
