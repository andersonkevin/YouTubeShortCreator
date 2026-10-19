"""Opt-in editorial authoring must not migrate existing brands or episode modes."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import branding
from media_contract import COMPOSITION_FORMATS
from safety import read_json
from test_visual_adapter import visual_episode
from test_workflow import fixture
import visual_adapter
import workflow
import ysc


class EditorialCompatibilityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / 'channel'
        previous = workflow.ROOT, workflow.RUNS
        self.addCleanup(lambda: (setattr(workflow, 'ROOT', previous[0]),
                                 setattr(workflow, 'RUNS', previous[1])))
        workflow.ROOT, workflow.RUNS = self.root, self.root / 'runs'
        self.episode = fixture(self.root)

    def snapshot(self):
        return {str(path.relative_to(self.root)): path.read_bytes()
                for path in self.root.rglob('*') if path.is_file()}

    def author(self, name, **options):
        return ysc.new_episode(self.root, name, 'intake/voice.wav', 'intake/transcript.json',
                               'intake/graphic.png', 'intake/captions.json', **options)

    def test_default_dark_episode_keeps_phrase_payload_even_with_measured_words(self):
        before = self.snapshot()
        data, inputs, captions, bounds = workflow.validate(self.episode)
        words = read_json(inputs['transcript'])['words']
        ordinary = workflow.build_html(data, captions, bounds)
        supplied_words = workflow.build_html(data, captions, bounds, words)
        self.assertEqual(ordinary, supplied_words)
        self.assertIn(json.dumps(captions, ensure_ascii=True).replace('<', '\\u003c'), ordinary)
        for hook in ('editorial-visuals.js', 'news-media.js', 'measured-segment'):
            self.assertNotIn(hook, ordinary)
        self.assertEqual(data['version'], 1)
        self.assertNotIn('visuals', data)
        self.assertNotIn('editorial', data)
        self.assertEqual(self.snapshot(), before)

    def test_dark_brand_keeps_existing_caption_case_review_contract(self):
        data = read_json(self.episode)
        path = self.episode.parent / data['inputs']['captions']['path']
        captions = read_json(path)
        captions['cues'][0]['text'] = captions['cues'][0]['text'].upper()
        path.write_text(json.dumps(captions))
        from safety import digest
        data['inputs']['captions']['sha256'] = digest(path)
        self.episode.write_text(json.dumps(data))
        before = self.snapshot()
        checked, _, cues, bounds = workflow.validate(self.episode)
        html = workflow.build_html(checked, cues, bounds)
        self.assertIn(captions['cues'][0]['text'], html)
        self.assertNotIn('measured-segment', html)
        self.assertEqual(self.snapshot(), before)

    def test_existing_v2_charts_do_not_receive_editorial_hooks_or_mutate_records(self):
        selected = visual_episode(read_json(self.episode), count=3)
        self.episode.write_text(json.dumps(selected))
        data, _, captions, bounds = workflow.validate(self.episode)
        original = copy.deepcopy(data)
        brand = read_json(self.root / 'brand/brand.json')
        payload = visual_adapter.payload(data, brand)
        self.assertEqual(set(payload), {'records', 'scenes', 'colors', 'icons', 'symbols'})
        self.assertEqual(payload['records'], visual_adapter.validate_records(data['visuals']))
        html = workflow.build_html(data, captions, bounds)
        self.assertIn('visual-scenes.js', html)
        for hook in ('editorial-visuals.js', 'news-media.js', 'measured-segment'):
            self.assertNotIn(hook, html)
        self.assertEqual(data, original)

    def test_all_four_v3_profiles_keep_the_existing_authoring_dispatch(self):
        before = self.snapshot()
        sources = {'audio': 'intake/voice.wav', 'transcript': 'intake/transcript.json',
                   'graphic': 'intake/graphic.png', 'captions': 'intake/captions.json'}
        self.assertEqual(set(COMPOSITION_FORMATS), {'landscape', 'portrait', 'square', 'portrait-4x5'})
        for profile in COMPOSITION_FORMATS:
            with self.subTest(profile=profile), patch('production_visuals.new_episode') as author:
                result = self.author('composition', output_format=profile,
                                     storyboard='intake/composition.json')
                self.assertIs(result, author.return_value)
                author.assert_called_once_with(self.root, 'composition', sources,
                                               'intake/composition.json', profile=profile)
        self.assertEqual(self.snapshot(), before)

    def test_storyboard_does_not_silently_override_batch_or_manual_layouts(self):
        before = self.snapshot()
        for options in ({'batch': 'series'}, {'layouts': 'prompt-tools,code-policy,approval-gate'}):
            with self.subTest(options=options), self.assertRaisesRegex(ValueError, 'cannot be mixed'):
                self.author('mixed', storyboard='intake/not-read.json', **options)
        self.assertEqual(self.snapshot(), before)

    def test_engine_upgrade_rejects_old_approval_without_rewriting_it(self):
        before = self.snapshot()
        with patch.object(workflow, 'verify_lock', return_value='0' * 64):
            with self.assertRaisesRegex(ValueError, 'approved together'):
                self.author('not-migrated')
            with self.assertRaisesRegex(ValueError, 'approved together'):
                workflow.validate(self.episode)
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(read_json(self.root / 'brand/brand.json')['version'], 1)


if __name__ == '__main__':
    unittest.main()
