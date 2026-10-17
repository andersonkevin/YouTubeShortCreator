import copy
import json
from pathlib import Path
import tempfile
import unittest

import visual_adapter
import workflow
from safety import read_json
from test_workflow import fixture
from tools.hyperframes_pilot import episode, prepare


class EffectTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / 'channel'
        old = workflow.ROOT, workflow.RUNS
        self.addCleanup(lambda: (setattr(workflow, 'ROOT', old[0]), setattr(workflow, 'RUNS', old[1])))
        workflow.ROOT, workflow.RUNS = self.root, self.root / 'runs'
        self.path = fixture(self.root)
        self.data = episode(read_json(self.path), True)

    def validate(self, data):
        self.path.write_text(json.dumps(data))
        return workflow.validate(self.path)

    def test_all_presets_and_no_effects_keep_input_data(self):
        original = copy.deepcopy(self.data)
        self.validate(self.data)
        self.assertEqual(self.data, original)
        for scene in self.data['scenes']:
            del scene['presentation']['effects']
        data, _, captions, bounds = self.validate(self.data)
        self.assertNotIn('visual-effects', workflow.build_html(data, captions, bounds))

    def test_invalid_shape_and_executable_fields_are_rejected(self):
        for value in (None, {}, 'cascade-v1', [{}], [{'selector': '.logo'}]):
            data = copy.deepcopy(self.data)
            data['scenes'][0]['presentation']['effects'] = value
            with self.subTest(value=value), self.assertRaises(ValueError): self.validate(data)
        for key, value in [('preset', '../outline'), ('preset', []), ('target', '.logo'),
                           ('cue', True), ('cue', -1), ('cue', 1.5), ('cue', 6),
                           ('duration_frames', True), ('duration_frames', 11),
                           ('duration_frames', 61), ('duration_frames', 24.5),
                           ('url', 'https://example.invalid/script.js'), ('css', 'color:red')]:
            data = copy.deepcopy(self.data)
            data['scenes'][0]['presentation']['effects'][0][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): self.validate(data)

    def test_mismatched_duplicate_and_excess_effects_are_rejected(self):
        for mode in ('wrong-kind', 'duplicate', 'excess'):
            data = copy.deepcopy(self.data)
            effect = data['scenes'][0]['presentation']['effects'][0]
            data['scenes'][0]['presentation']['effects'] = (
                copy.deepcopy(data['scenes'][1]['presentation']['effects']) if mode == 'wrong-kind'
                else [effect] * (2 if mode == 'duplicate' else 3))
            with self.subTest(mode=mode), self.assertRaises(ValueError): self.validate(data)

    def test_cue_must_belong_to_scene_and_follow_entrance(self):
        for index, cue in ((0, 4), (1, 0), (1, 2), (2, 3)):
            data = copy.deepcopy(self.data)
            data['scenes'][index]['presentation']['effects'][0]['cue'] = cue
            with self.subTest(index=index, cue=cue), self.assertRaises(ValueError): self.validate(data)

    def test_effect_must_finish_before_exit(self):
        data = copy.deepcopy(self.data)
        data['scenes'][2]['presentation']['effects'][0]['duration_frames'] = 60
        with self.assertRaisesRegex(ValueError, 'overlaps the exit'): self.validate(data)

    def test_timing_rounds_up_to_video_frame(self):
        scene = self.data['scenes'][0]
        scene['presentation']['effects'][0]['duration_frames'] = 12
        with self.assertRaises(ValueError):
            visual_adapter.validate_effect_timing(scene, [{'start': .101}], 0, .52)
        visual_adapter.validate_effect_timing(scene, [{'start': .101}], 0, .54)

    def test_lock_includes_motion_and_source_provenance(self):
        from tools.freeze import record
        files = record()['files']
        for name in ('templates/v1/assets/visual-effects.css', 'templates/v1/assets/visual-effects.js',
                     'docs/hyperframes-provenance.json', 'docs/licenses/hyperframes-apache-2.0.txt'):
            self.assertIn(name, files)

    def test_fixture_requires_new_workspace_and_write_approval(self):
        with self.assertRaisesRegex(ValueError, 'approve-write'): prepare(self.root, False)
        before = self.path.read_bytes()
        with self.assertRaises(ValueError): prepare(self.root, True)
        with self.assertRaises(ValueError): prepare(self.root / '..' / 'escape', True)
        self.assertEqual(self.path.read_bytes(), before)

    def test_old_brand_approval_cannot_approve_new_implementation(self):
        approval = self.root / 'brand/approval.json'
        record = read_json(approval)
        record['template_sha256'] = '0' * 64
        approval.write_text(json.dumps(record))
        with self.assertRaises(ValueError): self.validate(self.data)
