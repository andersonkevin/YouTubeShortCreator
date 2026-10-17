import copy
import unittest
import branding
import production_visuals as production


class SliceSweepContracts(unittest.TestCase):
    def setUp(self):
        self.captions = [{'start': .1+i*2, 'end': 1+i*2} for i in range(6)]
        self.scene = {'kind': 'headline', 'name': 'An explicit change', 'first_cue': 0,
                      'cues': [0, 1], 'transition': 'cut-left',
                      'content': {'kicker': 'Internal test', 'phrases': ['Plan', 'Build'], 'swap': 'slice-sweep'}}

    def test_two_to_six_bounded_phrases_use_the_native_cues(self):
        for count in range(2, 7):
            scene = copy.deepcopy(self.scene); scene['cues'] = list(range(count))
            scene['content']['phrases'] = ['Word '+str(i) for i in range(count)]
            self.assertEqual(production.validate_scenes([scene], {}, self.captions, 13), [(0, 13)])
        for phrase in ['x'*33, '', []]:
            scene = copy.deepcopy(self.scene); scene['content']['phrases'][0] = phrase
            with self.assertRaises(ValueError): production.validate_scenes([scene], {}, self.captions, 13)

    def test_markup_is_literal_copy_and_cannot_close_the_compiled_data_script(self):
        scene = copy.deepcopy(self.scene); scene['content']['phrases'][0] = '</script><script>'
        production.validate_scenes([scene], {}, self.captions, 13)
        compiled = production.scripts({'format': 'landscape', 'scenes': [scene], 'assets': {}},
                                      {'colors': branding.PALETTES['violet']})
        self.assertNotIn('"</script><script>"', compiled)
        self.assertIn('\\u003c/script', compiled)

    def test_free_shader_font_cursor_and_remote_inputs_remain_closed(self):
        for key in ['shader', 'font', 'cursorRadius', 'direction', 'url', 'background']:
            scene = copy.deepcopy(self.scene); scene['content'][key] = 'custom'
            with self.assertRaises(ValueError): production.validate_scenes([scene], {}, self.captions, 13)

    def test_compiler_loads_only_the_selected_local_shader_and_mount(self):
        brand = {'colors': branding.PALETTES['violet']}
        for profile in ['landscape', 'portrait', 'square', 'portrait-4x5']:
            data = {'format': profile, 'scenes': [self.scene], 'assets': {}}
            result = production.scripts(data, brand)
            for name in ['production-slice-surface', 'production-slice-sweep']:
                self.assertEqual(result.count('src="assets/'+name+'.js"'), 1)
            self.assertNotIn('src="assets/production-three-runtime.js"', result)
            self.assertNotIn('src="assets/production-gpu-runtime.js"', result)
        data['scenes'] = []
        self.assertNotIn('src="assets/production-slice-surface.js"', production.scripts(data, brand))


if __name__ == '__main__':
    unittest.main()
