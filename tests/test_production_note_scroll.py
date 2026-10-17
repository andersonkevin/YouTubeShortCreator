import copy
import unittest
import branding
import production_visuals as production


class NoteScrollContracts(unittest.TestCase):
    def scene(self, count=7):
        return {'kind': 'interface', 'name': 'Illustrated document', 'first_cue': 0,
                'cues': list(range(count)), 'transition': 'cut-left', 'content': {
                    'style': 'notes', 'variant': 'note-scroll', 'heading': 'A supplied sequence',
                    'source': 'Internal document example', 'title': 'Working notes',
                    'items': [f'Literal paragraph {i}.' for i in range(count)]}}

    def validate(self, scene, gap=2):
        captions = [{'start': .1 + gap*i, 'end': .5 + gap*i} for i in range(8)]
        return production.validate_scenes([scene], {}, captions, 18)

    def test_two_to_seven_literal_lines_keep_their_text(self):
        for count in range(2, 8):
            scene = self.scene(count);original = copy.deepcopy(scene)
            self.assertEqual(self.validate(scene), [(0, 18)]);self.assertEqual(scene, original)
        for count in (0, 1, 8):
            with self.assertRaises(ValueError):self.validate(self.scene(count))

    def test_complete_fields_and_two_second_cues_are_required(self):
        for gap in (.8, 1.4, 1.99, 1.999999999):
            with self.assertRaises(ValueError):self.validate(self.scene(), gap)
        scene = self.scene();scene['cues'] = [0, 1]
        with self.assertRaises(ValueError):self.validate(scene)
        scene = self.scene();del scene['content']['title']
        with self.assertRaises(ValueError):self.validate(scene)

    def test_new_shape_does_not_relax_existing_interface_contracts(self):
        for value in ('', True, {}, 'A'*53):
            scene = self.scene();scene['content']['items'][0] = value
            with self.subTest(value=value), self.assertRaises(ValueError):self.validate(scene)
        for key, value in [('style', 'steps'), ('title', 'A'*53), ('font', 'Other'), ('html', '<script>'), ('speed', 2), ('keyboard', True)]:
            scene = self.scene();scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):self.validate(scene)
        scene = self.scene();scene['content'].pop('variant');scene['content'].pop('title')
        scene['content']['items'] = [{'label': 'Line', 'body': line} for line in scene['content']['items']]
        with self.assertRaises(ValueError):self.validate(scene)

    def test_all_formats_use_the_normal_interface_router(self):
        for profile in production.COMPOSITION_FORMATS:
            output = production.scripts({'format': profile, 'scenes': [self.scene()], 'assets': {}},
                                        {'colors': branding.PALETTES['violet']})
            self.assertLess(output.index('assets/production-note-scroll.js'), output.index('assets/production-interface.js'))


if __name__ == '__main__':
    unittest.main()
