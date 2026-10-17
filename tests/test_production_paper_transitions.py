import unittest
import production_visuals as production


class PaperTransitionTests(unittest.TestCase):
    def test_closed_swaps_keep_the_screen_asset_and_timing_contract(self):
        for style in ('scribble', 'paper-collage', 'paper-rip'):
            scene = {'kind': 'screen', 'name': 'Internal paper fixture', 'first_cue': 0,
                     'cues': [0, 1], 'transition': 'cut-left', 'content': {
                         'heading': 'Two states', 'caption': 'Internal test', 'chrome': 'browser',
                         'images': ['first', 'second'], 'swap': style}}
            captions = [{'start': 0, 'end': 1}, {'start': 2, 'end': 3}]
            self.assertEqual(production.validate_scenes([scene], {'first': {}, 'second': {}}, captions, 5), [(0, 5)])
            for field, value in [('seed', 1), ('color', 'red'), ('roughness', 20), ('path', '../other')]:
                scene['content'][field] = value
                with self.assertRaises(ValueError): production.validate_scenes([scene], {'first': {}, 'second': {}}, captions, 5)
                del scene['content'][field]
            scene['content']['images'][1] = 'unverified'
            with self.assertRaises(ValueError): production.validate_scenes([scene], {'first': {}, 'second': {}}, captions, 5)


if __name__ == '__main__':
    unittest.main()
