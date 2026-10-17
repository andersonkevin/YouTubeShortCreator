import copy
import unittest

import branding
import production_visuals as production


class ColoramaFreezeContracts(unittest.TestCase):
    def setUp(self):
        self.title = {'kind': 'title', 'name': 'Title', 'first_cue': 0, 'cues': [0], 'transition': 'cut-left',
                      'content': {'kicker': 'Internal test', 'title': 'Exact supplied words',
                                  'subtitle': 'Keep approved typography', 'reveal': 'colorama-wipe'}}
        self.screen = {'kind': 'screen', 'name': 'Screen', 'first_cue': 0, 'cues': [0, 1, 2], 'transition': 'cut-left',
                       'content': {'heading': 'Two cuts', 'caption': 'Internal timing test', 'images': ['a', 'b', 'c'],
                                   'chrome': 'browser', 'swap': 'beat-freeze'}}
        self.cues = [{'start': .1, 'end': 1}, {'start': 2.2, 'end': 3}, {'start': 4.5, 'end': 5}]

    def validate(self, scene, cues=None, duration=8):
        assets = {'a': {}, 'b': {}, 'c': {}} if scene['kind'] == 'screen' else {}
        return production.validate_scenes([scene], assets, cues or self.cues, duration)

    def test_title_uses_the_existing_closed_brand_and_copy_contract(self):
        self.assertEqual(self.validate(self.title), [(0, 8)])
        for key, value in [('font', 'Other'), ('cycle', []), ('scale', 2), ('blur', 5), ('html', '<b>copy</b>'),
                           ('marker', {'text': 'Exact', 'style': 'circle'}), ('layout', 'speech-cloud')]:
            bad = copy.deepcopy(self.title); bad['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.validate(bad)

    def test_freeze_requires_multiple_verified_stills_and_no_open_effect_parameters(self):
        self.assertEqual(self.validate(self.screen), [(0, 8)])
        for key, value in [('images', ['a']), ('images', ['a', 'b', 'unknown']), ('intensity', 1.4),
                           ('beat', 3), ('focus', []), ('word', 'DROP'), ('color', '#00ffff')]:
            bad = copy.deepcopy(self.screen); bad['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.validate(bad)

    def test_each_cut_has_69_frames_and_cannot_overrun_the_exit_margin(self):
        self.validate(self.screen)
        early = copy.deepcopy(self.cues); early[2]['start'] = 4.4
        with self.assertRaisesRegex(ValueError, '69 frames'): self.validate(self.screen, early)
        with self.assertRaisesRegex(ValueError, '69 frames'): self.validate(self.screen, duration=7.5)
        self.validate(self.screen, duration=7.6)
        ordinary = copy.deepcopy(self.screen); ordinary['content']['swap'] = 'wipe'
        self.validate(ordinary, early, duration=7)

    def test_normal_engine_loads_both_modules_before_their_routers_in_all_formats(self):
        for profile in ('landscape', 'portrait', 'square', 'portrait-4x5'):
            data = {'format': profile, 'scenes': [self.title, self.screen], 'assets': {
                name: {'path': name + '.png'} for name in ('a', 'b', 'c')}}
            html = production.scripts(data, {'colors': branding.PALETTES['violet']})
            self.assertLess(html.index('production-colorama.js'), html.index('production-type.js'))
            self.assertLess(html.index('production-beat-freeze.js'), html.index('production-scenes.js'))
            self.assertNotIn('https://', html)


if __name__ == '__main__':
    unittest.main()
