import copy
import unittest

import production_visuals as production


class ProductionTypographyBatchTests(unittest.TestCase):
    def setUp(self):
        self.captions = [{'start': .1, 'end': 1.5}, {'start': 3, 'end': 5}]
        self.title = {'kind': 'title', 'name': 'Title', 'first_cue': 0, 'cues': [0], 'transition': 'cut-left',
                      'content': {'kicker': 'Internal example', 'title': 'Exact supplied words', 'subtitle': 'Brand remains approved.'}}

    def test_new_reveals_use_existing_text_limits_and_timing(self):
        for style in ('word-crossfade', 'shared-axis-y', 'shared-axis-z', 'soft-blur', 'scan-band',
                      'accent-glitch', 'shimmer-sweep', 'mask-reveal', 'calm'):
            scene = copy.deepcopy(self.title)
            scene['content']['reveal'] = style
            self.assertEqual(production.validate_scenes([scene], {}, self.captions, 6), [(0, 6)])
            for field, value in [('font', 'OtherFont'), ('duration', 7), ('colors', ['red']), ('title', 'x' * 53)]:
                bad = copy.deepcopy(scene)
                bad['content'][field] = value
                with self.subTest(style=style, field=field), self.assertRaises(ValueError):
                    production.validate_scenes([bad], {}, self.captions, 6)

    def test_new_swaps_keep_explicit_phrase_count_and_no_implicit_copy(self):
        for style in ('morph', 'strike', 'flap'):
            scene = {'kind': 'headline', 'name': 'State change', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                     'content': {'kicker': 'Internal example', 'phrases': ['Before review', 'After review'], 'swap': style}}
            self.assertEqual(production.validate_scenes([scene], {}, self.captions, 6), [(0, 6)])
            bad = copy.deepcopy(scene)
            bad['content']['phrases'] = ['Duplicate', 'Duplicate']
            with self.assertRaises(ValueError): production.validate_scenes([bad], {}, self.captions, 6)
            bad = copy.deepcopy(scene)
            bad['cues'] = [0]
            with self.assertRaises(ValueError): production.validate_scenes([bad], {}, self.captions, 6)


if __name__ == '__main__':
    unittest.main()
