import copy
import unittest
import production_visuals as production


class KineticPresetTests(unittest.TestCase):
    def scene(self, style, count=6):
        return {'kind': 'kinetic', 'name': 'Explicit words', 'first_cue': 0,
                'cues': list(range(count)), 'transition': 'cut-left',
                'content': {'kicker': 'Internal test', 'style': style,
                            'words': ['Read', 'Build', 'Test', 'Review', 'Refine', 'Finish'][:count]}}

    def validate(self, scene):
        cues = [{'start': .1 + i*3, 'end': 1+i*3} for i in range(6)]
        return production.validate_scenes([scene], {}, cues, 18)

    def test_all_styles_keep_native_cues_and_existing_word_limits(self):
        for style in production.KINETIC_STYLES:
            for count in ((3,) if style == 'glyph-build' else (2, 3, 6)):
                scene = self.scene(style, count);self.assertEqual(self.validate(scene), [(0, 18)])
                scene['cues'].pop()
                with self.assertRaises(ValueError): self.validate(scene)
            for word in ('A'*17, 'Two words', 'Line\nbreak', 'Tab\tstop'):
                scene = self.scene(style);scene['content']['words'][0] = word
                with self.assertRaises(ValueError): self.validate(scene)

    def test_source_controls_cannot_override_brand_clock_or_shutter_cost(self):
        for style in production.KINETIC_STYLES[1:]:
            for key, value in [('font', 'Other'), ('duration', 9), ('samplesPerFrame', 10000),
                               ('shutterAngle', 9000), ('fps', 15), ('tilt', 80),
                               ('words_html', '<script>'), ('palette', ['red'])]:
                scene = self.scene(style);scene['content'][key] = value
                with self.assertRaises(ValueError): self.validate(scene)
        for style in (None, 'custom', '../shutter-slam', ['ticker-takeover']):
            scene = self.scene('standard');scene['content']['style'] = style
            with self.assertRaises(ValueError): self.validate(scene)

    def test_legacy_record_remains_valid_without_new_fields(self):
        old = self.scene('standard');old['content'].pop('style')
        self.assertEqual(self.validate(old), self.validate(self.scene('standard')))
        bad = copy.deepcopy(old);bad['content']['words'] = ['One'];bad['cues'] = [0]
        with self.assertRaises(ValueError): self.validate(bad)


if __name__ == '__main__':
    unittest.main()
