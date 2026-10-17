import copy
import unittest

import branding
import production_visuals as production


class CodeStoryContracts(unittest.TestCase):
    def setUp(self):
        self.captions = [{'start': i * 2 + .1, 'end': i * 2 + 1} for i in range(8)]

    def scene(self, style='typing'):
        content = {'heading': 'Exact code', 'filename': 'example.py', 'source': 'Internal fixture',
                   'style': style, 'documents': [['value = 1', '', 'print(value)']]}
        if style in ('diff', 'morph') + production.SPATIAL_CODE_STYLES:
            content['documents'].append(['value = 2', 'print(value)'])
            count = 2
        elif style == 'scroll':
            content['focus'] = [0, 2]
            count = 2
        else:
            count = 3
        return {'kind': 'code-story', 'name': 'Code story', 'first_cue': 0,
                'cues': list(range(count)), 'transition': 'cut-left', 'content': content}

    def validate(self, scene):
        return production.validate_scenes([scene], {}, self.captions, 18)

    def test_all_styles_and_document_limits(self):
        self.assertEqual(len(production.CODE_STYLES), 9)
        for style in production.CODE_STYLES:
            scene = self.scene(style)
            self.assertEqual(self.validate(scene), [(0, 18)])
        scene = self.scene('scroll')
        scene['content']['documents'] = [[str(i) for i in range(32)]]
        scene['content']['focus'] = [0, 31]
        self.validate(scene)
        scene['content']['documents'][0].append('33')
        with self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('typing')
        scene['content']['documents'] = [['x' * 44] * 8]
        scene['cues'] = list(range(8))
        self.validate(scene)
        scene['content']['documents'][0].append('ninth')
        with self.assertRaises(ValueError): self.validate(scene)

    def test_rejects_unbounded_or_executable_fields_and_invalid_text(self):
        for key, value in [('style', 'html'), ('style', []), ('html', '<script>'), ('command', 'run'),
                           ('font', 'unknown'), ('duration', 9), ('focus', [0]), ('documents', []),
                           ('documents', 'text'), ('documents', [['']]), ('documents', [['a' * 45]]),
                           ('documents', [['a\tb']]), ('documents', [['a\nb']]), ('documents', [['a\x00b']]),
                           ('documents', [['\u202espoof']]), ('documents', [[True]]), ('documents', [['a'], ['b']])]:
            scene = self.scene()
            scene['content'][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene()
        scene['content']['documents'][0][0] = '<script>notExecuted()</script>'
        self.validate(scene)
        scene['content']['documents'][0][0] = 'cafe\u0301 = 2'
        self.validate(scene)

    def test_versions_focus_and_caption_boundaries(self):
        for style in ('diff', 'morph') + production.SPATIAL_CODE_STYLES:
            scene = self.scene(style)
            scene['content']['documents'].append(copy.deepcopy(scene['content']['documents'][-1]))
            scene['cues'] = [0, 1, 2]
            with self.assertRaises(ValueError): self.validate(scene)
        for focus in ([0, 3], [0, 0], [0, True], [-1, 2], [], list(range(9))):
            scene = self.scene('scroll')
            scene['content']['focus'] = focus
            with self.subTest(focus=focus), self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('diff')
        for cues in ([0], [1, 0], [0, 0], [0, True]):
            scene['cues'] = cues
            with self.subTest(cues=cues), self.assertRaises(ValueError): self.validate(scene)
        scene['cues'] = [0, 1]
        with self.assertRaises(ValueError): production.validate_scenes([scene], {}, self.captions, 3)

    def test_spatial_code_reuses_one_local_three_bundle_and_keeps_closed_records(self):
        brand = {'colors': branding.PALETTES['violet']}
        for style in production.SPATIAL_CODE_STYLES:
            scene = self.scene(style)
            for key, value in [('seed', 23), ('tokens', []), ('shader', 'void main(){}'),
                               ('model', 'remote.glb'), ('color', '#ff0000'), ('html', '<b>custom</b>')]:
                bad = copy.deepcopy(scene); bad['content'][key] = value
                with self.assertRaises(ValueError): self.validate(bad)
            for profile in ('landscape', 'portrait', 'square', 'portrait-4x5'):
                data = {'format': profile, 'scenes': [scene], 'assets': {}}
                html = production.scripts(data, brand)
                self.assertEqual(html.count('src="assets/production-three-runtime.js"'), 1)
                self.assertIn('production-code-spatial.js', html)
                self.assertNotIn('production-three-backdrops.js', html)
                data['scenes'].append({'kind': 'backdrop', 'content': {'style': 'three-rack-focus'}})
                self.assertEqual(production.scripts(data, brand).count('src="assets/production-three-runtime.js"'), 1)
        html = production.scripts({'scenes': [self.scene()], 'assets': {}}, brand)
        self.assertNotIn('production-code-spatial.js', html)
        self.assertNotIn('production-three-runtime.js', html)


if __name__ == '__main__':
    unittest.main()
