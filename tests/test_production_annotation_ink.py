import copy
import unittest

import production_visuals as production


class AnnotationInkTests(unittest.TestCase):
    def scene(self, style='hand-circle'):
        return {'kind': 'annotation', 'name': 'Internal annotation', 'first_cue': 0,
                'cues': [0, 1], 'transition': 'cut-left', 'content': {
                    'heading': 'Explicit annotation', 'source': 'Internal fixture', 'image': 'capture',
                    'marks': [{'x': .2, 'y': .2, 'width': .6, 'height': .5, 'style': style, 'label': 'Supplied label'}]}}

    def validate(self, scene):
        return production.validate_scenes([scene], {'capture': {}},
            [{'start': .1, 'end': 1.4}, {'start': 3.107, 'end': 4.5}], 7)

    def test_every_handwritten_style_and_texture_uses_the_existing_contract(self):
        for style in production.HAND_ANNOTATION_STYLES:
            for stroke in production.ANNOTATION_STROKES:
                scene = self.scene(style)
                scene['content']['marks'][0]['stroke'] = stroke
                with self.subTest(style=style, stroke=stroke):
                    self.assertEqual(self.validate(scene), [(0, 7)])
        for curve in production.ANNOTATION_CURVES:
            scene = self.scene('hand-arrow')
            scene['content']['marks'][0]['curve'] = curve
            self.validate(scene)
        for style in production.ANNOTATION_STYLES:
            for pointer in production.ANNOTATION_POINTERS:
                scene = self.scene(style)
                scene['content']['marks'][0]['pointer'] = pointer
                if style in production.INSPECTION_STYLES:
                    with self.assertRaises(ValueError): self.validate(scene)
                else:
                    self.validate(scene)

    def test_unknown_options_and_arbitrary_geometry_are_rejected(self):
        edits = [{'stroke': None}, {'stroke': True}, {'stroke': 'remote'}, {'curve': 'swoop'},
                 {'path': 'M 0 0'}, {'seed': 9}, {'color': 'red'}, {'font': 'Caveat'},
                 {'svg': '<svg/>'}, {'boil': True}, {'width': float('nan')}, {'pointer': 'remote'}, {'pointer': True}]
        for edit in edits:
            scene = self.scene()
            scene['content']['marks'][0].update(edit)
            with self.subTest(edit=edit), self.assertRaises(ValueError): self.validate(scene)
        for value in [None, [], 'circle']:
            scene = self.scene()
            scene['content']['marks'][0] = value
            with self.subTest(value=value), self.assertRaises(ValueError): self.validate(scene)

    def test_legacy_styles_do_not_accept_unimplemented_texture_or_curve(self):
        for style in ('circle', 'underline', 'box'):
            scene = self.scene(style)
            self.validate(scene)
            for option in [{'stroke': 'plain'}, {'curve': 'gentle'}]:
                bad = copy.deepcopy(scene)
                bad['content']['marks'][0].update(option)
                with self.assertRaises(ValueError): self.validate(bad)
        scene = self.scene('hand-arrow')
        scene['content']['marks'][0]['curve'] = True
        with self.assertRaises(ValueError): self.validate(scene)


if __name__ == '__main__':
    unittest.main()
