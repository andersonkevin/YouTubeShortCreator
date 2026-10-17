import copy
import unittest

import production_visuals as production


class MediaCameraTests(unittest.TestCase):
    def scene(self, style):
        layout = '2up' if style == 'focus-rack' else '3up' if style.startswith('parallax-') else 'solo'
        items = [{'image': f'image-{i}', 'label': f'View {i + 1}'} for i in range(production.MEDIA_LAYOUTS[layout])]
        return {'kind': 'media-grid', 'name': 'Internal camera', 'first_cue': 0,
                'cues': [0, 1, 2] if style == 'punch-reset' else [0, 1], 'transition': 'cut-left',
                'content': {'heading': 'Explicit supplied images', 'source': 'Internal fixture',
                            'layout': layout, 'items': items, 'camera': {'style': style}}}

    def validate(self, scene):
        assets = {item['image']: {} for item in scene['content']['items']}
        return production.validate_scenes([scene], assets, [{'start': .107 + 3 * i, 'end': 1.5 + 3 * i} for i in range(3)], 10)

    def test_all_camera_recipes_require_their_fixed_layout_and_cues(self):
        for style in production.MEDIA_CAMERAS:
            scene = self.scene(style)
            self.assertEqual(self.validate(scene), [(0, 10)])
            for change in [{'cues': [0]}, {'cues': [0, 1] if style == 'punch-reset' else [0, 1, 2]}]:
                bad = copy.deepcopy(scene);bad.update(change)
                with self.assertRaises(ValueError): self.validate(bad)
            bad = copy.deepcopy(scene);bad['content']['treatment'] = 'gloss'
            with self.assertRaises(ValueError): self.validate(bad)

    def test_only_source_defined_options_are_accepted(self):
        for style, key, choices in [('push-in', 'intensity', ('subtle', 'standard', 'bold')),
                                    ('tilt', 'glow', ('tight', 'standard', 'wide'))]:
            for value in choices:
                scene = self.scene(style);scene['content']['camera'][key] = value;self.validate(scene)
        for edit in [{'style': 'custom'}, {'style': None}, {'intensity': 3}, {'glow': 'custom'},
                     {'duration': 60}, {'zoom': 10}, {'color': '#fff'}, {'font': 'external'}, {'html': '<script>'}]:
            scene = self.scene('push-in');scene['content']['camera'].update(edit)
            with self.subTest(edit=edit), self.assertRaises(ValueError): self.validate(scene)
        for camera in (None, [], 'push-in'):
            scene = self.scene('push-in');scene['content']['camera'] = camera
            with self.assertRaises(ValueError): self.validate(scene)

    def test_camera_does_not_bypass_asset_or_record_validation(self):
        scene = self.scene('focus-rack');scene['content']['layout'] = 'solo'
        with self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('push-in');scene['content']['items'][0]['url'] = 'https://example.com'
        with self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('push-in')
        with self.assertRaises(ValueError): production.validate_scenes([scene], {}, [{'start': .1, 'end': 1.5}, {'start': 3, 'end': 4}], 6)

    def test_impact_and_arrival_recipes_do_not_accept_unbounded_source_controls(self):
        names = production.MEDIA_CAMERAS[8:]
        self.assertEqual(len(names), 15)
        for style in names:
            for key, value in [('intensity', 'bold'), ('frequency', 60), ('seed', 1), ('duration', 30),
                               ('rotation', False), ('pivot', 'top-left'), ('ease', {'reach': .99})]:
                scene = self.scene(style); scene['content']['camera'][key] = value
                with self.assertRaises(ValueError): self.validate(scene)
            scene = self.scene(style); scene['content']['surface'] = {'style': 'grain'}
            with self.assertRaises(ValueError): self.validate(scene)


if __name__ == '__main__':
    unittest.main()
