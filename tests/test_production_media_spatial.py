import copy
import unittest
import production_visuals as production


class SpatialMediaTests(unittest.TestCase):
    def scene(self, style):
        count = 3 if style in ('scrub-stack', 'device-splay', 'phone-trio') else 1
        return {'kind': 'media-grid', 'name': 'Spatial internal fixture', 'first_cue': 0,
                'cues': [0, 1], 'transition': 'cut-left', 'content': {
                    'heading': 'Supplied images', 'source': 'Internal test', 'treatment': style,
                    'layout': '3up' if count == 3 else 'solo',
                    'items': [{'image': 'still', 'label': 'Exact label'} for _ in range(count)]}}

    def validate(self, scene):
        return production.validate_scenes([scene], {'still': {}},
                                          [{'start': 0, 'end': 1}, {'start': 2, 'end': 3}], 5)

    def test_six_treatments_share_two_native_cues_and_verified_stills(self):
        self.assertEqual(len(production.SPATIAL_TREATMENTS), 6)
        for style in production.SPATIAL_TREATMENTS:
            scene = self.scene(style)
            self.assertEqual(self.validate(scene), [(0, 5)])
            scene['content']['items'][0]['image'] = 'unknown'
            with self.assertRaises(ValueError): self.validate(scene)

    def test_closed_counts_cues_and_no_arbitrary_camera_or_brand_controls(self):
        for style in production.SPATIAL_TREATMENTS:
            for change in [{'font': 'Other'}, {'color': 'red'}, {'model': 'a.glb'}, {'surface': {'style': 'phone'}},
                           {'camera': {'style': 'push-in'}}, {'hud': {}}, {'depth': 200}, {'html': '<script>'},
                           {'layout': '2up'}, {'items': []}]:
                scene = self.scene(style); scene['content'].update(change)
                with self.subTest(style=style, change=change), self.assertRaises(ValueError): self.validate(scene)
            for cues in [[0], [1, 0], [0, 0], [0, 1, 2]]:
                scene = self.scene(style); scene['cues'] = cues
                with self.assertRaises(ValueError): self.validate(scene)

    def test_input_record_is_not_mutated(self):
        scene = self.scene('device-splay'); before = copy.deepcopy(scene)
        self.validate(scene); self.assertEqual(scene, before)


if __name__ == '__main__':
    unittest.main()
