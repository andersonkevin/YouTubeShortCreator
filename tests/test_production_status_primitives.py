import copy
import unittest

import production_visuals as production


class StatusPrimitiveTests(unittest.TestCase):
    def setUp(self):
        self.captions = [{'start': .1 + i * 2, 'end': 1.5 + i * 2} for i in range(7)]

    def validate(self, kind, content, count):
        scene = {'kind': kind, 'name': 'Internal test', 'first_cue': 0,
                 'cues': list(range(count)), 'transition': 'cut-left', 'content': content}
        return production.validate_scenes([scene], {}, self.captions, 16)

    def test_trust_presentations_preserve_explicit_marks_sources_and_cues(self):
        source = {'kind': 'illustrative', 'label': 'Internal fixture',
                  'reference': 'Synthetic example', 'as_of': '2026-10-16'}
        for style in production.TRUST_STYLES:
            for count in range(3, 8):
                content = {'heading': 'Explicit marks', 'style': style, 'source': source,
                           'marks': [f'Source {i}' for i in range(count)]}
                self.assertEqual(self.validate('trust', content, count), [(0, 16)])
                for key, value in [('stagger', 20), ('columns', 5), ('scale', .1), ('html', '<img>'),
                                   ('style', 'custom'), ('font', 'remote')]:
                    bad = copy.deepcopy(content);bad[key] = value
                    with self.subTest(style=style, key=key), self.assertRaises(ValueError):
                        self.validate('trust', bad, count)
                with self.assertRaises(ValueError): self.validate('trust', content, count - 1)

    def test_success_ring_needs_an_explicit_boolean_and_rejects_source_overrides(self):
        for style in production.CHECKLIST_STYLES:
            content = {'heading': 'Check the result', 'style': style, 'source': 'Internal fixture',
                       'items': [{'label': 'A', 'value': 'Reviewed', 'checked': True},
                                 {'label': 'B', 'value': 'Pending', 'checked': False}]}
            self.assertEqual(self.validate('checklist', content, 2), [(0, 16)])
            for value in [1, 'yes', None]:
                bad = copy.deepcopy(content);bad['items'][0]['checked'] = value
                with self.assertRaises(ValueError): self.validate('checklist', bad, 2)
            for key, value in [('spin', 2), ('tint', 'green'), ('size', 'large'), ('style', 'custom')]:
                bad = copy.deepcopy(content);bad[key] = value
                with self.assertRaises(ValueError): self.validate('checklist', bad, 2)


if __name__ == '__main__':
    unittest.main()
