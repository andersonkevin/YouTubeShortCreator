import copy
import unittest
import production_visuals as production


class ProductionReadingTests(unittest.TestCase):
    def test_reading_treatments_keep_closed_title_contract(self):
        captions = [{'start': .1, 'end': 1.5}]
        for reveal in ('marker-sweep', 'gradient-read', 'neon-read', 'kinetic-words', 'editorial-words', 'pill-read', 'text-stagger'):
            scene = {'kind': 'title', 'name': reveal, 'first_cue': 0, 'cues': [0], 'transition': 'cut-left',
                     'content': {'kicker': 'Internal test', 'title': 'Read the exact supplied words.',
                                 'subtitle': 'The caption rail remains unchanged.', 'reveal': reveal}}
            self.assertEqual(production.validate_scenes([scene], {}, captions, 3), [(0, 3)])
            for field, value in [('font', 'RemoteFont'), ('duration', 4), ('colors', ['red']),
                                 ('title', 'x' * 53), ('layout', 'speech-cloud'),
                                 ('marker', {'text': 'Read', 'style': 'underline'})]:
                bad = copy.deepcopy(scene)
                bad['content'][field] = value
                with self.subTest(reveal=reveal, field=field), self.assertRaises(ValueError):
                    production.validate_scenes([bad], {}, captions, 3)

    def test_timing_gate_still_rejects_an_incomplete_title_entrance(self):
        scene = {'kind': 'title', 'name': 'Read', 'first_cue': 0, 'cues': [0], 'transition': 'cut-left',
                 'content': {'kicker': 'Test', 'title': 'Exact words', 'subtitle': 'Exact subtitle', 'reveal': 'neon-read'}}
        with self.assertRaises(ValueError):
            production.validate_scenes([scene], {}, [{'start': .8, 'end': 1.0}], 1.5)


if __name__ == '__main__':
    unittest.main()
