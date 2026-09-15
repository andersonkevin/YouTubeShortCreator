"""Failure injection for orchestration; these mocks do not qualify encoded media."""
from contextlib import ExitStack
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import media_backend
import workflow
from safety import digest, read_json, write_json
from test_workflow import fixture


class RunFailureTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        temporary = self.stack.enter_context(tempfile.TemporaryDirectory())
        self.root = Path(temporary).resolve() / 'channel'
        self.stack.enter_context(patch.object(workflow, 'ROOT', self.root))
        self.stack.enter_context(patch.object(workflow, 'RUNS', self.root / 'runs'))
        seed = fixture(self.root)
        record = read_json(seed)
        for key in ('title', 'description', 'pinned_comment'):
            record['youtube'][key] = record['youtube'][key].replace('DRAFT:', 'Test:')
        self.episode = seed.parent / 'ready.json'
        write_json(self.episode, record)
        write_json(self.root / 'runtime.json', {'test': 'orchestration only'})
        self.environment = {'backend': 'native', 'lock_sha256': workflow.verify_lock(),
                            'runtime_sha256': digest(self.root / 'runtime.json')}
        self.stack.enter_context(patch.object(workflow, 'doctor', return_value=(
            {'node': '/fixture/node'}, self.environment)))
        self.audio = seed.parent / 'audio.wav'
        self.before = digest(self.audio)
        self.scratch = []

    def capture(self, command):
        output = Path(command[3])
        if command[4] == 'render':
            self.scratch.append(Path(command[-1]).parent)
        write_json(output / 'visual-qa.json', {'frames': 360})

    def test_capture_interrupt_and_child_termination_are_failure_not_success(self):
        execute = workflow.execute
        for name in ('interrupt', 'terminated-child'):
            def fail(command):
                self.scratch.append(Path(command[-1]).parent)
                if name == 'interrupt':
                    raise KeyboardInterrupt()
                execute([sys.executable, '-c', 'import os,signal; os.kill(os.getpid(), signal.SIGTERM)'])
            with patch.object(workflow, 'execute', side_effect=fail), \
                 self.assertRaises((KeyboardInterrupt, subprocess.CalledProcessError)):
                workflow.build(self.episode, name, render=True)
            self.assert_failure(name)

    def assert_failure(self, name):
        output = self.root / 'runs/test-episode' / name
        self.assertEqual(read_json(output / 'failure.json')['status'], 'FAILED')
        self.assertFalse((output / 'run.json').exists())
        self.assertTrue((output / 'episode.json').exists())
        self.assertTrue(all(not path.exists() for path in self.scratch))
        self.assertEqual(digest(self.audio), self.before)
        before = {str(p.relative_to(output)): digest(p) for p in output.rglob('*') if p.is_file()}
        with self.assertRaisesRegex(ValueError, 'Run already exists'):
            workflow.build(self.episode, name, render=True)
        after = {str(p.relative_to(output)): digest(p) for p in output.rglob('*') if p.is_file()}
        self.assertEqual(before, after)

    def test_encoder_mux_qa_and_postflight_failures_preserve_evidence(self):
        for name in ('encoder', 'mux', 'frame-qa', 'audio-qa', 'postflight'):
            with self.subTest(stage=name), ExitStack() as stack:
                stack.enter_context(patch.object(workflow, 'execute', side_effect=self.capture))
                stack.enter_context(patch.object(media_backend, 'encode',
                    side_effect=RuntimeError(name) if name == 'encoder' else None))
                stack.enter_context(patch.object(media_backend, 'finish',
                    side_effect=RuntimeError(name) if name in ('mux', 'frame-qa', 'audio-qa') else None,
                    return_value={'status': 'PASS'}))
                if name == 'postflight':
                    stack.enter_context(patch.object(workflow, 'verify_lock',
                        side_effect=[self.environment['lock_sha256'], self.environment['lock_sha256'], 'drift']))
                with self.assertRaises((RuntimeError, ValueError)):
                    workflow.build(self.episode, name, render=True)
            self.assert_failure(name)

    def test_retry_new_id_succeeds_and_manifest_hashes_nested_assets(self):
        with patch.object(workflow, 'execute', side_effect=RuntimeError('failed preview')), \
             self.assertRaises(RuntimeError):
            workflow.build(self.episode, 'attempt-one')
        self.assert_failure('attempt-one')
        with patch.object(workflow, 'execute', side_effect=self.capture):
            output = workflow.build(self.episode, 'attempt-two')
        report = read_json(output / 'run.json')
        self.assertEqual(report['status'], 'review_required')
        self.assertFalse(report['publication_performed'])
        self.assertIn('assets/logo.png', report['outputs'])
        self.assertIn('assets/motion.js', report['outputs'])
        for name, value in report['outputs'].items():
            self.assertEqual(digest(output / name), value)
        self.assertEqual(digest(self.audio), self.before)
        self.assertFalse((output / 'failure.json').exists())
