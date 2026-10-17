import copy
import json
import unittest

import branding
import production_visuals as production


class ProductionBatchTests(unittest.TestCase):
    def setUp(self):
        self.cues = [{'start': .1, 'end': 1.5}, {'start': 3, 'end': 5}]
        self.scene = {'kind': 'backdrop', 'name': 'Opening', 'first_cue': 0, 'cues': [0],
                      'transition': 'cut-left', 'content': {'heading': 'New space', 'caption': 'An internal visual test.', 'style': 'mesh'}}

    def test_every_backdrop_uses_closed_content_and_caption_timing(self):
        for style in production.BACKDROP_STYLES:
            scene = copy.deepcopy(self.scene)
            scene['content']['style'] = style
            if style in production.GPU_BACKDROP_STYLES + production.THREE_BACKDROP_STYLES + production.CANVAS_BACKDROP_STYLES + production.VECTOR_BACKDROP_STYLES + production.WEBGL_BACKDROP_STYLES:
                scene['cues'] = [0, 1]
            gap = 5 if style in production.VECTOR_BACKDROP_STYLES else 3 if style.startswith('stop-motion-') else 2
            cues = [{'start': .1, 'end': 1.5}, {'start': .1 + gap, 'end': 1 + gap}]
            self.assertEqual(production.validate_scenes([scene], {}, cues, 7), [(0, 7)])
        for field, value in [('style', 'remote'), ('font', 'arbitrary'), ('html', '<script>'), ('colors', ['#fff'])]:
            scene = copy.deepcopy(self.scene)
            scene['content'][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                production.validate_scenes([scene], {}, self.cues, 6)
        scene = copy.deepcopy(self.scene)
        scene['cues'] = [0, 1]
        with self.assertRaises(ValueError):
            production.validate_scenes([scene], {}, self.cues, 6)

    def test_every_new_seam_is_available_without_changing_scene_contract(self):
        for kind in production.TRANSITIONS:
            if kind == 'text-match':
                continue
            scene = copy.deepcopy(self.scene)
            scene['transition'] = kind
            self.assertEqual(production.validate_scenes([scene], {}, self.cues, 6), [(0, 6)])
        scene = copy.deepcopy(self.scene)
        scene['transition'] = 'javascript:alert(1)'
        with self.assertRaises(ValueError):
            production.validate_scenes([scene], {}, self.cues, 6)

    def test_engine_script_payload_uses_the_modules_and_escapes_copy(self):
        data = {'format': 'landscape', 'scenes': [copy.deepcopy(self.scene)], 'assets': {}}
        data['scenes'][0]['content']['heading'] = '</script>'
        output = production.scripts(data, {'colors': branding.PALETTES['violet']})
        self.assertIn('assets/production-backdrops.js', output)
        self.assertIn('assets/production-motion.js', output)
        self.assertIn('\\u003c/script>', output)

    def test_interface_variants_retain_explicit_values_and_one_cue_per_item(self):
        for style in production.INTERFACE_STYLES:
            scene = copy.deepcopy(self.scene)
            scene['kind'] = 'interface'
            scene['cues'] = [0, 1]
            items = [{'label': 'First', 'body': 'Display only.'}, {'label': 'Second', 'body': 'Still local.'}]
            if style == 'settings':
                for i, item in enumerate(items): item['enabled'] = bool(i)
            if style == 'chat':
                for i, item in enumerate(items): item['side'] = 'sent' if i else 'received'
            if style == 'feedback':
                for i, item in enumerate(items): item['state'] = 'valid' if i else 'error'
            scene['content'] = {'heading': 'Internal example', 'source': 'Illustrative interface', 'style': style, 'items': items}
            if style == 'social':
                scene['content']['variant'] = 'post'
                for item in items:
                    item.update(context='Internal example', action={'before': 'Read', 'after': 'Read'})
            self.assertEqual(production.validate_scenes([scene], {}, self.cues, 6), [(0, 6)])
            bad = copy.deepcopy(scene)
            bad['content']['items'][0]['html'] = '<button>Run</button>'
            with self.assertRaises(ValueError): production.validate_scenes([bad], {}, self.cues, 6)
            bad = copy.deepcopy(scene)
            bad['cues'] = [0]
            with self.assertRaises(ValueError): production.validate_scenes([bad], {}, self.cues, 6)
            if style in ('settings', 'chat'):
                bad = copy.deepcopy(scene)
                bad['content']['items'][0]['enabled' if style == 'settings' else 'side'] = 1
                with self.assertRaises(ValueError): production.validate_scenes([bad], {}, self.cues, 6)

    def test_chat_indicator_is_opt_in_and_boolean(self):
        scene = copy.deepcopy(self.scene)
        scene.update(kind='interface', cues=[0, 1], content={'heading': 'A conversation', 'source': 'Internal fixture',
            'style': 'chat', 'items': [{'label': 'Question', 'body': 'One.', 'side': 'sent'},
                                     {'label': 'Answer', 'body': 'Two.', 'side': 'received'}]})
        for value in (False, True):
            scene['content']['typing_indicator'] = value
            self.assertEqual(production.validate_scenes([scene], {}, self.cues, 6), [(0, 6)])
        for value in (1, 'yes', [], None):
            scene['content']['typing_indicator'] = value
            with self.assertRaises(ValueError): production.validate_scenes([scene], {}, self.cues, 6)
        scene['content'].update(style='terminal', typing_indicator=True)
        with self.assertRaises(ValueError): production.validate_scenes([scene], {}, self.cues, 6)


if __name__ == '__main__':
    unittest.main()
