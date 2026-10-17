import copy
import json
from pathlib import Path
import tempfile
import unittest

import visual_adapter
import workflow
from safety import read_json
from test_workflow import fixture
from tools.hyperframes_pilot import episode
from tools.visual_library import catalog, kit


class StoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / 'channel'
        old = workflow.ROOT, workflow.RUNS
        self.addCleanup(lambda: (setattr(workflow, 'ROOT', old[0]), setattr(workflow, 'RUNS', old[1])))
        workflow.ROOT, workflow.RUNS = self.root, self.root / 'runs'
        self.path = fixture(self.root)
        self.data = episode(read_json(self.path))
        self.data['visuals']['flow']['data']['steps'] = self.data['visuals']['flow']['data']['steps'][:2]
        for scene, preset, cues in zip(self.data['scenes'], ['flow-trace', 'metric-count', 'compare-swap'], [[0, 1], [2], [4, 5]]):
            scene['presentation']['story'] = {'preset': preset, 'cues': cues}

    def validate(self, data=None):
        self.path.write_text(json.dumps(self.data if data is None else data))
        return workflow.validate(self.path)

    def test_stories_preserve_data_and_use_local_asset_only(self):
        before = copy.deepcopy(self.data)
        data, _, captions, bounds = self.validate()
        self.assertEqual(data, before)
        html = workflow.build_html(data, captions, bounds)
        self.assertIn('assets/visual-story.js', html)
        self.assertNotIn('visual-effects.js', html)
        self.assertNotIn('cdn.', html)

    def test_discovery_lists_only_compatible_presets(self):
        self.assertEqual(catalog.describe('visual:bar')['stories'], ['chart-build'])
        self.assertEqual(catalog.describe('visual:pie')['stories'], [])

    def test_invalid_contract_is_rejected(self):
        bads = [None, {}, {'preset': 'custom', 'cues': [0, 1]},
                {'preset': 'flow-trace', 'cues': [True, 1]},
                {'preset': 'flow-trace', 'cues': [1, 0]},
                {'preset': 'flow-trace', 'cues': [0, 0]},
                {'preset': 'flow-trace', 'cues': [0]},
                {'preset': 'flow-trace', 'cues': [0, 1], 'html': '<script/>'},
                {'preset': 'chart-build', 'cues': [0, 1]}]
        for story in bads:
            data = copy.deepcopy(self.data)
            data['scenes'][0]['presentation']['story'] = story
            with self.subTest(story=story), self.assertRaises(ValueError): self.validate(data)

    def test_story_rejects_outside_and_overlapping_cues(self):
        for cues in ([0, 6], [0, 2]):
            data = copy.deepcopy(self.data)
            data['scenes'][0]['presentation']['story']['cues'] = cues
            with self.assertRaises(ValueError): self.validate(data)
        scene = self.data['scenes'][0]
        with self.assertRaisesRegex(ValueError, 'overlap'):
            visual_adapter.validate_story_timing(scene, [{'start': .1}, {'start': .3}], 0, 4)
        with self.assertRaisesRegex(ValueError, 'exceeds'):
            visual_adapter.validate_story_timing(scene, [{'start': .1}, {'start': 3.3}], 0, 4)

    def test_story_and_decorative_effects_cannot_collide(self):
        self.data['scenes'][0]['presentation']['effects'] = [
            {'preset': 'cascade-v1', 'target': 'steps', 'cue': 0, 'duration_frames': 24}]
        with self.assertRaisesRegex(ValueError, 'decorative'): self.validate()

    def test_chart_story_limits_are_explicit(self):
        record = copy.deepcopy(read_json(kit.HOME / 'demo.json')['charts'][0])
        record['data']['series'] = record['data']['series'][:1]
        scene = self.data['scenes'][0]
        scene['presentation']['story'] = {'preset': 'chart-build', 'cues': list(range(len(record['data']['categories'])))}
        for kind in ('bar', 'line'):
            record['kind'] = kind
            visual_adapter.validate_story(scene, record)
        record['data']['series'].append(copy.deepcopy(record['data']['series'][0]))
        with self.assertRaisesRegex(ValueError, 'one series'): visual_adapter.validate_story(scene, record)
        record['data']['series'] = record['data']['series'][:1]
        scene['presentation']['chart_style'] = 'stacked'
        with self.assertRaisesRegex(ValueError, 'standard'): visual_adapter.validate_story(scene, record)

    def test_old_scenes_keep_the_original_script_path(self):
        for scene in self.data['scenes']: del scene['presentation']['story']
        data, _, captions, bounds = self.validate()
        self.assertNotIn('visual-story.js', workflow.build_html(data, captions, bounds))

    def test_story_source_is_implementation_locked(self):
        from tools.freeze import record
        self.assertIn('templates/v1/assets/visual-story.js', record()['files'])
