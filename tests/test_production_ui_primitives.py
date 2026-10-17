import copy
import unittest

import production_visuals as production
from tools.visual_library import kit


class UIPrimitiveTests(unittest.TestCase):
    def scene(self, variant, count=4):
        items = [{'label': 'Step ' + str(i), 'body': 'Exact supplied content.'} for i in range(count)]
        for i, item in enumerate(items):
            if variant == 'micro-badge': item['badge'] = 'New'
            if variant == 'micro-check': item['checked'] = i % 2 == 0
            if variant == 'profile-count':
                item.update(context='Internal example', action={'before': 'Read', 'after': 'Read'},
                            stat={'value': '42', 'label': 'Example records'})
        return {'kind': 'interface', 'name': 'Internal example', 'first_cue': 0,
                'cues': list(range(count)), 'transition': 'cut-left', 'content': {
                    'heading': 'Explicit steps', 'source': 'Internal test fixture',
                    'style': 'social' if variant == 'profile-count' else 'steps',
                    'variant': variant, 'items': items}}

    def validate(self, scene):
        cues = [{'start': .1 + i * 3, 'end': 1 + i * 3} for i in range(4)]
        return production.validate_scenes([scene], {}, cues, 12)

    def test_all_options_remain_native_caption_driven_and_closed(self):
        for variant in production.UI_PRIMITIVES:
            for count in (2, 3, 4):
                scene = self.scene(variant, count)
                self.assertEqual(self.validate(scene), [(0, 12)])
                for key, value in [('html', '<button>'), ('url', 'https://example.invalid'),
                                   ('font', 'Other'), ('onClick', 'send'), ('duration', 2)]:
                    bad = copy.deepcopy(scene); bad['content'][key] = value
                    with self.assertRaises(ValueError): self.validate(bad)
                bad = copy.deepcopy(scene); bad['cues'].pop()
                with self.assertRaises(ValueError): self.validate(bad)

    def test_badges_checks_and_statistics_are_required_explicit_inputs(self):
        for variant, key in [('micro-badge', 'badge'), ('micro-check', 'checked'), ('profile-count', 'stat')]:
            scene = self.scene(variant); scene['content']['items'][0].pop(key)
            with self.assertRaises(ValueError): self.validate(scene)
        for value in (0, 1, 'true', None):
            scene = self.scene('micro-check'); scene['content']['items'][0]['checked'] = value
            with self.assertRaises(ValueError): self.validate(scene)
        for value in ({}, {'value': '42'}, {'label': 'Count', 'value': '123456789'},
                      {'label': 'Count', 'value': '42', 'automatic': True}):
            scene = self.scene('profile-count'); scene['content']['items'][0]['stat'] = value
            with self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('micro-badge'); scene['content']['items'][0]['badge'] = 'Nine chars'
        with self.assertRaises(ValueError): self.validate(scene)

    def test_stacked_copy_and_tab_width_keep_fixed_font_budgets(self):
        for variant in ('signup-flow', 'beat-sequence'):
            scene = self.scene(variant); scene['content']['items'][0]['body'] = 'A' * 64
            self.validate(scene); scene['content']['items'][0]['body'] += 'A'
            with self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('micro-tabs'); scene['content']['items'][0]['label'] = 'A' * 15
        with self.assertRaises(ValueError): self.validate(scene)

    def test_path_options_have_no_arbitrary_svg_timing_or_coordinate_inputs(self):
        icon = next(iter(kit.verify_assets()['icons']))
        for style in production.DIAGRAM_STYLES:
            scene = {'kind': 'diagram', 'name': 'Internal paths', 'first_cue': 0,
                     'cues': [0, 1], 'transition': 'cut-left', 'content': {
                         'heading': 'Native route', 'source': 'Internal test fixture', 'style': style,
                         'steps': [{'label': label, 'body': 'Exact content', 'icon': icon} for label in ('A', 'B')]}}
            self.validate(scene)
            for key, value in [('path', 'M0 0L100 100'), ('speed', 3), ('vertices', [0, 1]), ('color', 'red')]:
                bad = copy.deepcopy(scene); bad['content'][key] = value
                with self.assertRaises(ValueError): self.validate(bad)


if __name__ == '__main__':
    unittest.main()
