import copy
import unittest

import production_visuals as production


class CarouselContracts(unittest.TestCase):
    def setUp(self):
        self.captions = [{'start': .1, 'end': 1.5}, {'start': 6.5, 'end': 7.4}]
        self.assets = {'first': {}, 'second': {}, 'third': {}}

    def scene(self, preset='circle-1'):
        content = {'heading': 'Local stills', 'source': 'Internal test', 'preset': preset,
                   'images': ['first', 'second', 'third']}
        if preset.startswith('text-circle-'): content['center_text'] = 'Exact supplied copy'
        return {'kind': 'media-carousel', 'name': 'Carousel test', 'first_cue': 0,
                'cues': [0, 1], 'transition': 'cut-left', 'content': content}

    def validate(self, scene):
        return production.validate_scenes([scene], self.assets, self.captions, 9)

    def test_every_preset_uses_the_normal_scene_and_asset_contract(self):
        self.assertEqual(len(production.CAROUSEL_PRESETS), 26)
        for preset in production.CAROUSEL_PRESETS:
            self.assertEqual(self.validate(self.scene(preset)), [(0, 9)])
        scene = self.scene('path-1')
        scene['content']['images'] *= 8
        self.validate(scene)
        scene['content']['preset'] = 'circle-1'
        with self.assertRaises(ValueError): self.validate(scene)

    def test_closed_fields_and_local_identifiers_reject_untrusted_input(self):
        edits = [('preset', 'arbitrary'), ('preset', []), ('images', ['first', 'second']),
                 ('images', ['first', 'second', '../third']), ('images', ['first', 'second', 'https://example.test/a.png']),
                 ('images', ['first', 'second', 'unknown']), ('images', ['first', 'second', True]),
                 ('html', '<script>'), ('speed', 3), ('center_text', 'Not a text preset')]
        for key, value in edits:
            scene = self.scene()
            scene['content'][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): self.validate(scene)
        for text in ('', ' padded ', 'a b c d e', 'a' * 25):
            scene = self.scene('text-circle-1')
            scene['content']['center_text'] = text
            with self.subTest(text=text), self.assertRaises(ValueError): self.validate(scene)

    def test_two_ordered_cues_allow_the_full_trajectory_and_settle(self):
        scene = self.scene()
        for cues in ([0], [1, 0], [0, 0], [0, True]):
            bad = copy.deepcopy(scene)
            bad['cues'] = cues
            with self.subTest(cues=cues), self.assertRaises(ValueError): self.validate(bad)
        self.captions[1]['start'] = 6.09
        with self.assertRaises(ValueError): self.validate(scene)
        self.captions[1]['start'] = 6.1
        self.validate(scene)
        with self.assertRaises(ValueError): production.validate_scenes([scene], self.assets, self.captions, 7)


if __name__ == '__main__':
    unittest.main()
