import copy
import unittest
import production_visuals as production


class SurfaceTests(unittest.TestCase):
    def scene(self, style='grain'):
        surface = {'style': style}
        if style == 'feather-focus':
            surface['target'] = {'x': .2, 'y': .25, 'width': .4, 'height': .5}
        return {'kind': 'media-grid', 'name': 'Internal surface test', 'first_cue': 0, 'cues': [0], 'transition': 'cut-left',
                'content': {'heading': 'A supplied still', 'source': 'Internal fixture', 'layout': 'solo',
                            'items': [{'image': 'still', 'label': 'Exact label'}], 'surface': surface}}

    def validate(self, scene):
        return production.validate_scenes([scene], {'still': {}}, [{'start': .107, 'end': 1.5}], 4)

    def test_all_surfaces_use_one_cue_and_the_existing_local_image_contract(self):
        self.assertEqual(len(production.MEDIA_SURFACES), 28)
        for style in production.MEDIA_SURFACES:
            with self.subTest(style=style):
                scene = self.scene(style)
                self.assertEqual(self.validate(scene), [(0, 4)])
                scene['content']['items'][0]['image'] = 'missing'
                with self.assertRaises(ValueError): self.validate(scene)

    def test_surface_records_reject_scripts_remote_inputs_and_free_style_controls(self):
        for surface in [None, [], True, 'grain', {}, {'style': 'unknown'}, {'style': []},
                        {'style': 'grain', 'seed': 42}, {'style': 'screen', 'html': '<script>'},
                        {'style': 'light-leak', 'color': 'red'}, {'style': 'grain', 'image': 'https://example.com/a.png'},
                        {'style': 'grain', 'duration': 12}, {'style': 'grain', 'target': {}}]:
            scene = self.scene();scene['content']['surface'] = surface
            with self.subTest(surface=surface), self.assertRaises(ValueError): self.validate(scene)

    def test_surface_combinations_cannot_bypass_layout_treatment_or_camera_rules(self):
        for edit in [{'treatment': 'gloss'}, {'treatment': 'hand-frame'}, {'camera': {'style': 'push-in'}},
                     {'layout': '2up', 'items': [{'image': 'still', 'label': 'A'}, {'image': 'still', 'label': 'B'}]}]:
            scene = self.scene();scene['content'].update(edit)
            with self.subTest(edit=edit), self.assertRaises(ValueError): self.validate(scene)

    def test_focus_region_is_explicit_finite_and_inside_the_source_image(self):
        scene = self.scene('feather-focus');self.validate(scene)
        for target in [{}, None, [], {'x': 0, 'y': 0, 'width': True, 'height': .5},
                       {'x': .8, 'y': .2, 'width': .5, 'height': .5},
                       {'x': 0, 'y': 0, 'width': float('nan'), 'height': .5},
                       {'x': 0, 'y': 0, 'width': .5, 'height': float('inf')},
                       {'x': -.1, 'y': 0, 'width': .5, 'height': .5}]:
            bad = copy.deepcopy(scene);bad['content']['surface']['target'] = target
            with self.subTest(target=target), self.assertRaises(ValueError): self.validate(bad)
        scene['content']['surface']['target'] = {'x': 0, 'y': 0, 'width': 1, 'height': 1}
        self.validate(scene)

    def test_phone_has_three_closed_cutouts_and_tablet_keeps_its_own_geometry(self):
        for cutout in ('none', 'island', 'notch'):
            scene = self.scene('phone');scene['content']['surface']['cutout'] = cutout;self.validate(scene)
        for style, cutout in [('tablet', 'none'), ('phone', 'custom'), ('phone', None), ('phone', [])]:
            scene = self.scene(style);scene['content']['surface']['cutout'] = cutout
            with self.subTest(style=style, cutout=cutout), self.assertRaises(ValueError): self.validate(scene)


if __name__ == '__main__':
    unittest.main()
