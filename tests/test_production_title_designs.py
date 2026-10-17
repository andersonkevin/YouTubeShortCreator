import copy
import unittest

import production_visuals as production


class TitleDesignTests(unittest.TestCase):
    def scene(self):
        return {'kind': 'title', 'name': 'Internal title', 'first_cue': 0, 'cues': [0], 'transition': 'cut-left',
                'content': {'kicker': 'Internal fixture', 'title': 'Clear ideas', 'subtitle': 'The approved brand remains.'}}

    def validate(self, scene):
        return production.validate_scenes([scene], {}, [{'start': .1, 'end': 1.4}, {'start': 3.107, 'end': 4.5}], 7)

    def test_designs_keep_original_title_fields_and_one_cue(self):
        for layout in production.TITLE_LAYOUTS:
            scene = self.scene()
            scene['content']['layout'] = layout
            if layout in ('emphasis', 'layered-emphasis'): scene['content']['backdrop_word'] = 'CLEAR'
            self.assertEqual(self.validate(scene), [(0, 7)])
        for tail in ('left', 'right'):
            scene = self.scene()
            scene['content'].update(layout='speech-cloud', tail=tail)
            self.validate(scene)
        scene = self.scene()
        scene['content']['reveal'] = 'word-highlight'
        self.validate(scene)

    def test_designs_reject_arbitrary_geometry_and_incompatible_fields(self):
        for edit in [{'layout': 'custom'}, {'layout': None}, {'layout': 'emphasis'},
                     {'layout': 'emphasis', 'backdrop_word': 'Two words'}, {'layout': 'speech-cloud', 'tail': 'top'},
                     {'layout': 'speech-cloud', 'reveal': 'matrix'}, {'layout': 'path-wave', 'title': 'x' * 19},
                     {'layout': 'speech-cloud', 'title': 'x' * 29}, {'path': 'M 0 0'}, {'font': 'Caveat'},
                     {'color': 'red'}, {'tail': 'left'}, {'backdrop_word': 'OTHER'}]:
            scene = self.scene()
            scene['content'].update(edit)
            with self.subTest(edit=edit), self.assertRaises(ValueError): self.validate(scene)

    def test_notes_require_unique_marker_text_two_cues_and_bounded_copy(self):
        for style in production.MARKER_STYLES:
            scene = self.scene()
            scene['cues'] = [0, 1]
            scene['content']['marker'] = {'text': 'ideas', 'style': style, 'note': 'Supplied explanation'}
            self.validate(scene)
            for edit in [{'note': 'x' * 29}, {'note': None}, {'x': 10}, {'text': 'missing'}]:
                bad = copy.deepcopy(scene)
                bad['content']['marker'].update(edit)
                with self.assertRaises(ValueError): self.validate(bad)
            bad = copy.deepcopy(scene)
            bad['content']['layout'] = 'speech-cloud'
            with self.assertRaises(ValueError): self.validate(bad)
            scene['cues'] = [0]
            with self.assertRaises(ValueError): self.validate(scene)


if __name__ == '__main__':
    unittest.main()
