import copy
import unittest

import branding
import production_visuals as production


class EditorScenesTests(unittest.TestCase):
    def setUp(self):
        self.cues = [{'start': .1, 'end': 1}, {'start': 2.1, 'end': 3}]
        self.scene = {'kind': 'interface', 'name': 'Editor', 'first_cue': 0,
                      'cues': [0, 1], 'transition': 'cut-left',
                      'content': {'heading': 'Illustrated workflow', 'source': 'Internal test',
                                  'style': 'steps', 'variant': 'vector-editor', 'items': [
                                      {'label': 'Trace', 'body': 'An explicit path.', 'tool': 'pen'},
                                      {'label': 'Select', 'body': 'Review the shape.', 'tool': 'shape'}]}}

    def validate(self, scene=None, cues=None):
        return production.validate_scenes([scene or self.scene], {}, cues or self.cues, 5)

    def test_explicit_tool_closed_contract(self):
        for tool in ('pen', 'shape', 'type'):
            self.scene['content']['items'][0]['tool'] = tool
            self.assertEqual(self.validate(), [(0, 5)])
        for tool in ('url', '', None, [], True):
            self.scene['content']['items'][0]['tool'] = tool
            with self.assertRaises(ValueError): self.validate()
        del self.scene['content']['items'][0]['tool']
        with self.assertRaises(ValueError): self.validate()

    def test_pinned_copy_needs_stillness_and_bounded_text(self):
        self.scene['content']['variant'] = 'sticky-mock'
        for item in self.scene['content']['items']: del item['tool']
        self.assertEqual(self.validate(), [(0, 5)])
        for gap in (.8, 1.8, 1.999):
            cues = copy.deepcopy(self.cues); cues[1]['start'] = .1 + gap
            with self.assertRaises(ValueError): self.validate(cues=cues)
        self.scene['content']['items'][0]['body'] = 'A' * 65
        with self.assertRaises(ValueError): self.validate()

    def test_no_episode_html_fonts_paths_or_timing_controls(self):
        for key in ('html', 'font', 'image', 'duration', 'path', 'script'):
            scene = copy.deepcopy(self.scene); scene['content'][key] = 'custom'
            with self.assertRaises(ValueError): self.validate(scene)
        scene = copy.deepcopy(self.scene); scene['content']['items'][0]['body'] = 'A' * 73
        with self.assertRaises(ValueError): self.validate(scene)
        for style in ('chat', 'notifications', 'settings'):
            scene = copy.deepcopy(self.scene); scene['content']['style'] = style
            with self.assertRaises(ValueError): self.validate(scene)

    def test_native_script_order_all_profiles(self):
        for profile in ('landscape', 'portrait', 'square', 'portrait-4x5'):
            output = production.scripts({'format': profile, 'scenes': [self.scene], 'assets': {}},
                                        {'colors': branding.PALETTES['violet']})
            self.assertLess(output.index('assets/production-editor-scenes.js'), output.index('assets/production-interface.js'))
            self.assertLess(output.index('assets/production-headline-panels.js'), output.index('assets/production-headlines.js'))
        self.assertIn('split-panel', production.HEADLINE_SWAPS)


if __name__ == '__main__':
    unittest.main()
