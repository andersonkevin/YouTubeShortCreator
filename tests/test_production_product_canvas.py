import copy
from math import ceil
import unittest

import branding
import production_visuals as production


class ProductCanvasContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'interface', 'name': 'Illustrated collaboration', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                'content': {'heading': 'Design together', 'source': 'Internal illustrative example', 'style': 'steps', 'variant': 'product-canvas',
                            'hero': {'title': 'A shared workspace', 'body': 'Build a clear experience', 'action': 'Explore'},
                            'actors': ['Designer', 'Engineer', 'Reviewer'], 'comment': {'text': 'Use the supplied cards here', 'resolved': True},
                            'items': [{'label': label, 'body': 'Supplied content'} for label in ['Overview', 'Features', 'Details']]}}

    def validate(self, scene, captions=None, duration=15):
        return production.validate_scenes([scene], {}, captions or [{'start': .115, 'end': 1.1}, {'start': 12.115, 'end': 13.1}], duration)

    def test_supplied_card_content_and_both_comment_states_are_valid(self):
        for resolved in (True, False):
            scene = self.scene();scene['content']['comment']['resolved'] = resolved
            self.assertEqual(self.validate(scene), [(0, 15)])
        for key in ('hero', 'actors', 'comment'):
            scene = self.scene();del scene['content'][key]
            with self.assertRaises(ValueError):self.validate(scene)

    def test_exact_counts_and_copy_limits_are_enforced(self):
        for count in (2, 4):
            for key in ('items', 'actors'):
                scene = self.scene();scene['content'][key] = [scene['content'][key][0]]*count
                with self.assertRaises(ValueError):self.validate(scene)
        for path, value in [(('hero', 'title'), 'x'*25), (('hero', 'body'), 'x'*45), (('hero', 'action'), 'x'*19),
                            (('comment', 'text'), 'x'*61), (('items', 0, 'label'), 'x'*15), (('items', 0, 'body'), 'x'*29),
                            (('actors', 0), 'x'*19), (('actors', 1), 'designer')]:
            scene = self.scene();node = scene['content']
            for key in path[:-1]:node = node[key]
            node[path[-1]] = value
            with self.subTest(path=path),self.assertRaises(ValueError):self.validate(scene)

    def test_no_implicit_resolution_custom_styles_or_executable_controls(self):
        for value in (None, 0, 1, 'true', [], {}):
            scene = self.scene();scene['content']['comment']['resolved'] = value
            with self.assertRaises(ValueError):self.validate(scene)
        for edit in [{'style': 'chat'}, {'typing_indicator': True}, {'font': 'Inter'}, {'duration': 12.5},
                     {'url': 'https://example.invalid'}, {'onClick': 'run'}, {'colors': ['red']}]:
            scene = self.scene();scene['content'].update(edit)
            with self.assertRaises(ValueError):self.validate(scene)
        scene = self.scene();scene['content']['hero']['html'] = '<script>'
        with self.assertRaises(ValueError):self.validate(scene)

    def test_native_start_settle_and_exit_margins_are_preserved(self):
        scene = self.scene()
        with self.assertRaises(ValueError):self.validate(scene, captions=[{'start': .115, 'end': 1}, {'start': 12.08, 'end': 13}])
        boundary = (ceil((12.115+production.BEAT_DELAY)*30)+24+12)/30
        with self.assertRaises(ValueError):self.validate(scene, duration=boundary-1/30)
        self.validate(scene, duration=boundary)
        for cues in ([0], [0, 1, 2]):
            bad = copy.deepcopy(scene);bad['cues'] = cues
            with self.assertRaises(ValueError):self.validate(bad)

    def test_script_is_opt_in_and_all_four_profiles_keep_local_engine_dispatch(self):
        for profile in production.COMPOSITION_FORMATS:
            data = {'format': profile, 'scenes': [self.scene()], 'assets': {}}
            script = production.scripts(data, {'colors': branding.PALETTES['violet']})
            self.assertEqual(script.count('src="assets/production-product-canvas.js"'), 1)
            self.assertLess(script.index('production-product-canvas.js'), script.index('production-interface.js'))
            self.assertNotIn('https://', script);self.assertNotIn('gsap', script)
            data['scenes'] = []
            self.assertNotIn('production-product-canvas.js', production.scripts(data, {'colors': branding.PALETTES['violet']}))


if __name__ == '__main__':
    unittest.main()
