import copy
import unittest
import production_visuals as production


class CursorSceneContracts(unittest.TestCase):
    captions = [{'start': .1 + i * 2, 'end': 1 + i * 2} for i in range(4)]

    def text(self):
        return {'kind': 'interface', 'name': 'Internal text action', 'first_cue': 0, 'cues': [0, 1],
                'transition': 'cut-left', 'content': {'style': 'notes', 'variant': 'text-select',
                'heading': 'An explicit edit', 'source': 'Internal illustrated example',
                'items': [{'label': 'Document', 'body': 'Keep the approved brand.', 'selection': 'approved brand'},
                          {'label': 'Review', 'body': 'Check the final result.', 'selection': 'final result'}]}}

    def collaboration(self, count=3):
        return {'kind': 'media-grid', 'name': 'Internal collaborator illustration', 'first_cue': 0, 'cues': [0, 1],
                'transition': 'cut-left', 'content': {'heading': 'Illustrated presence', 'source': 'Local example',
                'layout': 'solo', 'treatment': 'collaborators', 'items': [{'image': 'still', 'label': 'Supplied image'}],
                'actors': [f'Name{i}' for i in range(count)]}}

    def validate(self, scene):
        return production.validate_scenes([scene], {'still': {}} if scene['kind'] == 'media-grid' else {}, self.captions, 10)

    def test_text_selection_keeps_exact_copy_and_rejects_missing_or_ambiguous_phrases(self):
        scene = self.text(); before = copy.deepcopy(scene)
        self.assertEqual(self.validate(scene), [(0, 10)]); self.assertEqual(scene, before)
        for phrase in ['', 'missing', ' approved brand', 'approved brand ']:
            bad = self.text(); bad['content']['items'][0]['selection'] = phrase
            with self.subTest(phrase=phrase), self.assertRaises(ValueError): self.validate(bad)
        bad = self.text(); bad['content']['items'][0].update(body='aaa', selection='aa')
        with self.assertRaises(ValueError): self.validate(bad)
        bad = self.text(); bad['content']['items'][0].pop('selection')
        with self.assertRaises(ValueError): self.validate(bad)

    def test_new_selection_field_and_variant_cannot_escape_the_notes_contract(self):
        for field, value in [('style', 'chat'), ('variant', 'tabs'), ('html', '<script>'), ('font', 'Other'), ('callback', 'send')]:
            bad = self.text(); bad['content'][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError): self.validate(bad)
        bad = self.text(); bad['cues'] = [0]
        with self.assertRaises(ValueError): self.validate(bad)

    def test_collaborators_require_explicit_unique_names_and_two_cues(self):
        for count in range(2, 7): self.assertEqual(self.validate(self.collaboration(count)), [(0, 10)])
        for count in [0, 1, 7]:
            with self.subTest(count=count), self.assertRaises(ValueError): self.validate(self.collaboration(count))
        for names in [['Ana', 'ana'], ['Ana', ''], ['Ana', True], ['Ana', 'Toolongname'], [' Ana', 'Ken']]:
            bad = self.collaboration(); bad['content']['actors'] = names
            with self.subTest(names=names), self.assertRaises(ValueError): self.validate(bad)
        bad = self.collaboration(); bad['cues'] = [0]
        with self.assertRaises(ValueError): self.validate(bad)

    def test_collaborators_retain_asset_and_presentation_boundaries(self):
        for field, value in [('treatment', 'box'), ('layout', '2up'), ('camera', 'push-in'), ('surface', {}), ('hud', {}), ('region', {}), ('url', 'remote'), ('font', 'Other')]:
            bad = self.collaboration(); bad['content'][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError): self.validate(bad)
        bad = self.collaboration(); bad['content']['items'][0]['image'] = '../still'
        with self.assertRaises(ValueError): self.validate(bad)


if __name__ == '__main__':
    unittest.main()
