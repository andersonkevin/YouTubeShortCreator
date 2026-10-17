import copy
import unittest

import production_visuals as production


class ScreenCutContracts(unittest.TestCase):
    def setUp(self):
        self.scene = {'kind': 'screen', 'name': 'Word wall', 'first_cue': 0, 'cues': [0, 1],
                      'transition': 'cut-left', 'content': {'heading': 'Two states', 'caption': 'Internal test',
                      'images': ['first', 'second'], 'chrome': 'browser', 'swap': 'clone-wall', 'word': 'CREATE'}}
        self.cues = [{'start': .1, 'end': 1}, {'start': 2.1, 'end': 3}, {'start': 4.1, 'end': 5}]

    def validate(self, scene):
        assets = {'first': {}, 'second': {}} if scene['kind'] == 'screen' else {}
        return production.validate_scenes([scene], assets, self.cues, 6)

    def test_word_wall_requires_explicit_text_and_verified_images(self):
        self.assertEqual(self.validate(self.scene), [(0, 6)])
        for key, value in [('word', ''), ('word', 'two words'), ('word', 'x' * 19), ('word', 'a\nb'),
                           ('word', []), ('images', ['first']), ('images', ['first', 'missing']),
                           ('font', 'Inter'), ('duration', 10), ('drift', -46), ('color', '#000000')]:
            scene = copy.deepcopy(self.scene); scene['content'][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): self.validate(scene)
        scene = copy.deepcopy(self.scene); del scene['content']['word']
        with self.assertRaises(ValueError): self.validate(scene)
        scene = copy.deepcopy(self.scene); scene['content']['swap'] = 'wipe'
        with self.assertRaises(ValueError): self.validate(scene)

    def test_circle_match_requires_exactly_one_supplied_pair(self):
        scene = {'kind': 'headline', 'name': 'Matched circle', 'first_cue': 0, 'cues': [0, 1],
                 'transition': 'cut-left', 'content': {'kicker': 'Internal test', 'phrases': ['One idea', 'Clear result'], 'swap': 'circle-match'}}
        self.assertEqual(self.validate(scene), [(0, 6)])
        scene['content']['phrases'].append('Third state'); scene['cues'] = [0, 1, 2]
        with self.assertRaises(ValueError): self.validate(scene)
        scene['content']['swap'] = 'line'
        self.assertEqual(self.validate(scene), [(0, 6)])


if __name__ == '__main__':
    unittest.main()
