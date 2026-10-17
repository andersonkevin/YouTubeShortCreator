import copy
import unittest

import production_visuals as production


class ImageInspectionTests(unittest.TestCase):
    def setUp(self):
        self.cues = [{'start': .107 + i * 2, 'end': 1.5 + i * 2} for i in range(5)]

    def scene(self, hud):
        count = 1 + len(hud.get('readouts', []))
        return {'kind': 'media-grid', 'name': 'Internal HUD', 'first_cue': 0, 'cues': list(range(count)),
                'transition': 'cut-left', 'content': {'heading': 'Supplied capture', 'source': 'Internal fixture',
                'layout': 'solo', 'items': [{'image': 'still', 'label': 'Capture'}], 'hud': hud}}

    def hud(self, style='telemetry'):
        return {'style': style, 'readouts': [{'label': 'A', 'value': '12 ms'}, {'label': 'B', 'value': 'Review'}],
                'emphasis': None} if style == 'telemetry' else {
                'style': style, 'date': '2026-10-16 / supplied', 'mode': 'TEST',
                'recording': False, 'battery': 73, 'counter_start': 12}

    def validate(self, scene):
        return production.validate_scenes([scene], {'still': {}}, self.cues, 12)

    def test_telemetry_requires_supplied_values_and_a_caption_for_each_readout(self):
        for count in range(1, 5):
            hud = self.hud();hud['readouts'] = [{'label': f'Item {i}', 'value': str(i)} for i in range(count)]
            for emphasis in [None, 0, count - 1]:
                hud['emphasis'] = emphasis;scene = self.scene(hud)
                self.assertEqual(self.validate(scene), [(0, 12)])
                scene['cues'] = [0]
                with self.assertRaises(ValueError): self.validate(scene)
        for edit in [{'emphasis': True}, {'emphasis': 2}, {'emphasis': -1}, {'emphasis': '0'},
                     {'readouts': []}, {'readouts': [{'label': 'A', 'value': 12}]},
                     {'readouts': [{'label': 'A', 'value': 'yes'}, {'label': 'a', 'value': 'no'}]}]:
            hud = self.hud();hud.update(edit)
            with self.subTest(edit=edit), self.assertRaises(ValueError): self.validate(self.scene(hud))

    def test_camcorder_does_not_invent_a_date_battery_or_recording_state(self):
        for recording in [False, True]:
            for battery in [0, 73, 100]:
                hud = self.hud('camcorder');hud.update(recording=recording, battery=battery)
                self.assertEqual(self.validate(self.scene(hud)), [(0, 12)])
        for edit in [{'recording': 1}, {'battery': True}, {'battery': -1}, {'battery': 101},
                     {'counter_start': True}, {'counter_start': .5}, {'counter_start': 86400},
                     {'date': ''}, {'date': 'x' * 33}, {'mode': 'x' * 13}, {'now': True}]:
            hud = self.hud('camcorder');hud.update(edit)
            with self.subTest(edit=edit), self.assertRaises(ValueError): self.validate(self.scene(hud))
        for field in ['date', 'recording', 'battery', 'counter_start', 'mode']:
            hud = self.hud('camcorder');del hud[field]
            with self.assertRaises(ValueError): self.validate(self.scene(hud))

    def test_hud_cannot_add_remote_inputs_or_bypass_existing_media_combinations(self):
        for style in production.MEDIA_HUDS:
            for edit in [{'layout': '2up', 'items': [{'image': 'still', 'label': 'A'}, {'image': 'still', 'label': 'B'}]},
                         {'treatment': 'gloss'}, {'surface': {'style': 'grain'}}, {'camera': {'style': 'tilt'}}]:
                scene = self.scene(self.hud(style));scene['content'].update(edit)
                with self.subTest(style=style, edit=edit), self.assertRaises(ValueError): self.validate(scene)
            for key, value in [('style', 'custom'), ('url', 'https://example.com'), ('font', 'Other'), ('seed', 12), ('color', 'red')]:
                hud = self.hud(style);hud[key] = value
                with self.assertRaises(ValueError): self.validate(self.scene(hud))

    def test_inspection_regions_reuse_existing_bounds_and_reject_fake_detector_inputs(self):
        for style in production.INSPECTION_STYLES:
            scene = {'kind': 'annotation', 'name': 'Region', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                     'content': {'heading': 'Supplied region', 'source': 'Internal fixture', 'image': 'still',
                     'marks': [{'x': .2, 'y': .1, 'width': .4, 'height': .5, 'style': style, 'label': 'Review area'}]}}
            self.assertEqual(self.validate(scene), [(0, 12)])
            for edit in [{'x': .8}, {'width': 0}, {'height': True}, {'detector': 'auto'}, {'confidence': .99},
                         {'pointer': 'cursor'}, {'stroke': 'plain'}, {'seed': 1}, {'path': 'M 0 0'}]:
                bad = copy.deepcopy(scene);bad['content']['marks'][0].update(edit)
                with self.subTest(style=style, edit=edit), self.assertRaises(ValueError): self.validate(bad)


if __name__ == '__main__':
    unittest.main()
