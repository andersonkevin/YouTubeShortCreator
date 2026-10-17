import copy
from math import ceil
import unittest

import branding
import production_visuals as production


class CreatorIntroContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'cta', 'name': 'Creator introduction', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                'content': {'style': 'creator-intro', 'heading': 'Meet the creator', 'action': 'View this profile',
                            'label': 'Internal illustrated workflow',
                            'prompt': {'placeholder': 'What would you like to explore?', 'text': 'Show the profile supplied for this episode.',
                                       'model': 'Research workspace', 'thinking': 'Preparing the profile'},
                            'profile': {'image': 'portrait', 'name': 'Alex Rivera', 'handle': '@example',
                                        'bio': 'Practical ideas, explained with care.', 'before': 'Follow', 'after': 'Following'}}}

    def validate(self, scene=None, assets=None, captions=None, duration=15):
        return production.validate_scenes([scene or self.scene()], {'portrait': 'verified'} if assets is None else assets,
                                         captions or [{'start': .115, 'end': 1.115}, {'start': 12.115, 'end': 13.115}], duration)

    def test_normal_engine_selective_module_and_four_native_profiles(self):
        self.assertEqual(self.validate(), [(0, 15)])
        for profile in production.COMPOSITION_FORMATS:
            data = {'format': profile, 'assets': {}, 'scenes': [self.scene()]}
            scripts = production.scripts(data, {'colors': branding.PALETTES['violet']})
            self.assertEqual(scripts.count('src="assets/production-creator-intro.js"'), 1)
            self.assertNotIn('https://', scripts)
            data['scenes'] = []
            self.assertNotIn('production-creator-intro', production.scripts(data, {'colors': branding.PALETTES['violet']}))

    def test_strict_nested_records_and_supplied_copy_limits(self):
        for group, fields in [('prompt', {'placeholder': 64, 'text': 180, 'model': 24, 'thinking': 32}),
                              ('profile', {'name': 24, 'handle': 32, 'bio': 90, 'before': 14, 'after': 14})]:
            for key, limit in fields.items():
                scene = self.scene();scene['content'][group][key] = 'x' * limit
                self.validate(scene)
                scene['content'][group][key] += 'x'
                with self.subTest(group=group, key=key), self.assertRaises(ValueError):self.validate(scene)
            scene = self.scene();scene['content'][group]['url'] = 'https://example.invalid'
            with self.assertRaises(ValueError):self.validate(scene)
        for key, value in [('heading', 'x'*29), ('action', 'x'*41), ('label', 'x'*65), ('font', 'Arial'), ('badges', []), ('script', 'code')]:
            scene = self.scene();scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):self.validate(scene)

    def test_verified_asset_membership_and_no_silent_action_state(self):
        for name in ['../portrait.png', 'https://example.invalid/a.png', 'unknown', [], None]:
            scene = self.scene();scene['content']['profile']['image'] = name
            with self.assertRaises(ValueError):self.validate(scene)
        with self.assertRaises(ValueError):self.validate(assets={})
        with self.assertRaises(ValueError):self.validate(assets={'portrait': 'verified', 'unused': 'verified'})
        scene = self.scene();scene['content']['profile']['after'] = scene['content']['profile']['before']
        with self.assertRaises(ValueError):self.validate(scene)
        for group in ['prompt', 'profile']:
            scene = self.scene();del scene['content'][group]
            with self.assertRaises(ValueError):self.validate(scene)
        scene = self.scene();scene['content']['style'] = 'standard'
        with self.assertRaises(ValueError):self.validate(scene)

    def test_two_cues_have_real_time_frame_and_settling_bounds(self):
        for cues in [[0], [0, 1, 2], [1, 0], [True, 1]]:
            scene = self.scene();scene['cues'] = cues
            with self.assertRaises(ValueError):self.validate(scene)
        with self.assertRaises(ValueError):self.validate(captions=[{'start': .115, 'end': 1}, {'start': 12.114999, 'end': 13}])
        boundary = (ceil((12.115+production.BEAT_DELAY)*30)+24+12)/30
        self.validate(duration=boundary)
        with self.assertRaises(ValueError):self.validate(duration=boundary-1/30)

    def test_input_is_not_mutated_by_validation(self):
        scene = self.scene();before = copy.deepcopy(scene);self.validate(scene);self.assertEqual(scene, before)


if __name__ == '__main__':
    unittest.main()
