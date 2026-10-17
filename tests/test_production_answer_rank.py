import copy
import unittest
import branding
import production_visuals as production


class AnswerRankContracts(unittest.TestCase):
    captions = [{'start': .1 + 2*i, 'end': 1 + 2*i} for i in range(4)]

    def scene(self):
        return {'kind': 'interface', 'name': 'Illustrated ranking', 'first_cue': 0,
                'cues': [0, 1, 2, 3], 'transition': 'cut-left', 'content': {
                    'style': 'steps', 'variant': 'answer-rank', 'heading': 'Compare supplied options',
                    'source': 'Internal illustration', 'prompt': 'Which option fits?', 'lead': 'Supplied choices',
                    'rank': 2, 'items': [{'label': f'Option {i}', 'body': 'Supplied description.'} for i in range(4)]}}

    def validate(self, scene):
        return production.validate_scenes([scene], {}, self.captions, 9)

    def test_three_explicit_ranks_preserve_exact_content(self):
        for rank in (1, 2, 3):
            scene = self.scene();scene['content']['rank'] = rank; before = copy.deepcopy(scene)
            self.assertEqual(self.validate(scene), [(0, 9)]);self.assertEqual(scene, before)
        for rank in (0, 4, True, '2', 1.5, None):
            scene = self.scene();scene['content']['rank'] = rank
            with self.subTest(rank=rank), self.assertRaises(ValueError):self.validate(scene)

    def test_four_unique_picks_and_four_cues_are_required(self):
        for count in (2, 3):
            scene = self.scene();scene['content']['items'] = scene['content']['items'][:count]
            with self.assertRaises(ValueError):self.validate(scene)
        for value in ('Option 0', 'option 0', ' Option 3'):
            scene = self.scene();scene['content']['items'][3]['label'] = value
            with self.assertRaises(ValueError):self.validate(scene)
        for cues in ([0], [0, 1, 2], [0, 1, 1, 3]):
            scene = self.scene();scene['cues'] = cues
            with self.assertRaises(ValueError):self.validate(scene)

    def test_missing_copy_free_controls_and_excessive_text_fail(self):
        for key in ('prompt', 'lead', 'rank'):
            scene = self.scene();del scene['content'][key]
            with self.assertRaises(ValueError):self.validate(scene)
        for key, value in [('prompt', 'A'*65), ('lead', 'A'*37), ('style', 'chat'), ('font', 'Other'),
                           ('url', 'remote'), ('html', '<script>'), ('duration', 10), ('typing_indicator', True)]:
            scene = self.scene();scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):self.validate(scene)
        scene = self.scene();scene['content']['items'][0]['body'] = 'A'*41
        with self.assertRaises(ValueError):self.validate(scene)

    def test_runtime_is_loaded_before_the_interface_router_in_all_formats(self):
        for profile in production.COMPOSITION_FORMATS:
            output = production.scripts({'format': profile, 'scenes': [self.scene()], 'assets': {}},
                                        {'colors': branding.PALETTES['violet']})
            self.assertLess(output.index('assets/production-answer-rank.js'), output.index('assets/production-interface.js'))


if __name__ == '__main__':
    unittest.main()
