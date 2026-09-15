from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import media_backend as media
import runtime
import workflow
from safety import digest, read_json, write_json
from test_workflow import fixture


class BackendTests(unittest.TestCase):
    def test_unknown_backend_never_dispatches(self):
        with patch.object(media, 'swift') as execute:
            for name in ('unknown', '', None, {}, '../native'):
                with self.subTest(name=name), self.assertRaises(ValueError):
                    media.preflight(name, {})
            execute.assert_not_called()

    def test_scratch_is_removed_on_failure_only(self):
        with tempfile.TemporaryDirectory() as other:
            marker = Path(other) / 'source'
            marker.write_bytes(b'original')
            with self.assertRaises(RuntimeError):
                with media.scratch() as root:
                    (root / 'frames/frame-00000.png').write_bytes(b'partial')
                    raise RuntimeError('capture failed')
            self.assertFalse(root.exists())
            self.assertEqual(marker.read_bytes(), b'original')

    def test_frame_sequence_and_no_overwrite(self):
        with media.scratch() as root, patch.object(media, 'swift') as execute:
            output = root / 'silent.mp4'
            with self.assertRaisesRegex(ValueError, 'sequence'):
                media.encode('native', {}, root, 1, output)
            frame = root / 'frames/frame-00000.png'
            frame.write_bytes(b'fixture')
            media.encode('native', {}, root, 1, output)
            self.assertEqual(execute.call_args.args[2], 'encode.swift')
            execute.reset_mock()
            for count in (True, 0, 5401, 1.5):
                with self.assertRaisesRegex(ValueError, 'count'):
                    media.encode('native', {}, root, count, output)
            output.write_bytes(b'keep')
            with self.assertRaisesRegex(ValueError, 'exists'):
                media.encode('native', {}, root, 1, output)
            execute.assert_not_called()
            self.assertEqual(output.read_bytes(), b'keep')

    def test_symlink_frame_and_extra_files_fail(self):
        with media.scratch() as root, patch.object(media, 'swift') as execute:
            source = root / 'original.png'
            source.write_bytes(b'keep')
            (root / 'frames/frame-00000.png').symlink_to(source)
            with self.assertRaisesRegex(ValueError, 'Symlink'):
                media.encode('native', {}, root, 1, root / 'silent.mp4')
            execute.assert_not_called()

    def test_finish_preserves_existing_outputs(self):
        with media.scratch() as root, patch.object(media, 'swift') as execute:
            output = root / 'run'
            output.mkdir()
            (output / 'video.mp4').write_bytes(b'keep')
            with self.assertRaisesRegex(ValueError, 'exists'):
                media.finish('native', {}, root, output, root / 'voice.wav', 12)
            execute.assert_not_called()

    def test_native_compressed_preparation_is_hashed_and_original_preserved(self):
        with media.scratch() as root:
            output = root / 'run'
            output.mkdir()
            source = root / 'source.opus'
            source.write_bytes(b'original')
            write_json(output / 'captions.json', {'cues': []})
            def operation(paths, temporary, script, *arguments):
                if script == 'mux.swift':
                    self.assertEqual(arguments[-1], temporary / 'decoded-audio.caf')
                    arguments[-1].write_bytes(b'lossless-pcm-fixture')
            with patch.object(media, 'swift', side_effect=operation), \
                 patch('frame_qa.verify', return_value={'status': 'PASS'}), \
                 patch('audio_qa.compare_files', return_value={'status': 'PASS'}):
                media.finish('native', {}, root, output, source, 12)
            record = read_json(output / 'audio-preparation.json')
            self.assertEqual(record['source_sha256'], digest(source))
            self.assertEqual(record['temporary_pcm_sha256'], digest(root / 'decoded-audio.caf'))
            self.assertFalse(record['ffmpeg_used'])
            self.assertEqual(source.read_bytes(), b'original')

    def test_dispatch_is_fixed_argv_without_shell(self):
        with patch.object(media.subprocess, 'run') as execute:
            media.swift({'swift': '/tool with spaces/swift'}, Path('/scratch'), 'encode.swift', 'frames', 360, 'output.mp4')
            args, kwargs = execute.call_args
            self.assertEqual(args[0][0], '/tool with spaces/swift')
            self.assertEqual(args[0][-3:], ['frames', '360', 'output.mp4'])
            self.assertTrue(kwargs['check'])
            self.assertNotIn('shell', kwargs)
            with self.assertRaises(ValueError):
                media.swift({}, Path('/scratch'), '../encode.swift')


class RuntimeBackendTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.capabilities = {'backend': 'native', 'h264_1080x1920': True, 'mp4_export': True}
        self.version = {'swift': 'fixture'}

    def test_new_profile_selection_capability_and_no_overwrite(self):
        with patch.object(runtime.platform, 'system', return_value='Darwin'), \
             patch.object(runtime, 'versions', return_value=self.version), \
             patch.object(media, 'preflight', return_value=self.capabilities) as probe:
            supplied = dict.fromkeys(('node', 'playwright', 'chrome', 'swift'), '/fixture/tool')
            runtime.configure(self.root, supplied)
            before = (self.root / 'runtime.json').read_bytes()
            record = read_json(self.root / 'runtime.json')
            self.assertEqual(record['backend'], 'native')
            self.assertEqual(record['capabilities'], self.capabilities)
            _, report = runtime.doctor(self.root, 'lock')
            self.assertEqual(report['runtime_sha256'], digest(self.root / 'runtime.json'))
            self.assertEqual(report['backend'], 'native')
            probe.reset_mock()
            with self.assertRaisesRegex(ValueError, 'already exists'):
                runtime.configure(self.root, supplied)
            probe.assert_not_called()
            self.assertEqual((self.root / 'runtime.json').read_bytes(), before)

    def test_legacy_profile_stays_unchanged(self):
        write_json(self.root / 'runtime.json', {'paths': {}, 'versions': self.version})
        before = (self.root / 'runtime.json').read_bytes()
        with patch.object(runtime.platform, 'system', return_value='Darwin'), \
             patch.object(runtime, 'versions', return_value=self.version), \
             patch.object(media, 'preflight', return_value=self.capabilities):
            _, report = runtime.doctor(self.root, 'lock')
        self.assertEqual(report['backend'], 'native')
        self.assertEqual((self.root / 'runtime.json').read_bytes(), before)

    def test_invalid_selection_and_failed_probe_do_not_write(self):
        supplied = dict.fromkeys(('node', 'playwright', 'chrome', 'swift'), '/fixture/tool')
        with patch.object(runtime.platform, 'system', return_value='Darwin'), \
             patch.object(runtime, 'versions', return_value=self.version), \
             patch.object(media, 'preflight', side_effect=RuntimeError('missing codec')):
            with self.assertRaises(ValueError):
                runtime.configure(self.root, {**supplied, 'backend': 'unknown'})
            with self.assertRaises(RuntimeError):
                runtime.configure(self.root, supplied)
        self.assertFalse((self.root / 'runtime.json').exists())

    def test_capability_drift_fails(self):
        write_json(self.root / 'runtime.json', {'paths': {}, 'versions': self.version,
                                               'backend': 'native', 'capabilities': {}})
        with patch.object(runtime.platform, 'system', return_value='Darwin'), \
             patch.object(runtime, 'versions', return_value=self.version), \
             patch.object(media, 'preflight', return_value=self.capabilities), \
             self.assertRaisesRegex(ValueError, 'capability drift'):
            runtime.doctor(self.root, 'lock')

    def test_profile_mutation_during_probe_fails(self):
        target = self.root / 'runtime.json'
        write_json(target, {'paths': {}, 'versions': self.version})
        def mutate(*args):
            target.write_text('{"paths":{},"versions":{}}')
            return self.capabilities
        with patch.object(runtime.platform, 'system', return_value='Darwin'), \
             patch.object(runtime, 'versions', return_value=self.version), \
             patch.object(media, 'preflight', side_effect=mutate), \
             self.assertRaisesRegex(ValueError, 'changed during preflight'):
            runtime.doctor(self.root, 'lock')


class CaptureFailureTests(unittest.TestCase):
    def test_capture_failure_preserves_run_and_sources_cleans_scratch(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve() / 'channel'
            with patch.object(workflow, 'ROOT', root), patch.object(workflow, 'RUNS', root / 'runs'):
                episode = fixture(root)
                data = read_json(episode)
                for field in ('title', 'description', 'pinned_comment'):
                    data['youtube'][field] = data['youtube'][field].replace('DRAFT:', 'Test:')
                target = episode.parent / 'ready.json'
                write_json(target, data)
                before = digest(episode.parent / 'audio.wav')
                captured = []
                def fail(command):
                    captured.append(Path(command[-1]).parent)
                    raise subprocess.CalledProcessError(1, command)
                environment = {'backend': 'native', 'lock_sha256': workflow.verify_lock()}
                with patch.object(workflow, 'doctor', return_value=({'node': '/fixture/node'}, environment)), \
                     patch.object(workflow, 'execute', side_effect=fail), \
                     self.assertRaises(subprocess.CalledProcessError):
                    workflow.build(target, 'failed-capture', render=True)
                output = root / 'runs/test-episode/failed-capture'
                self.assertEqual(read_json(output / 'failure.json')['status'], 'FAILED')
                self.assertFalse((output / 'run.json').exists())
                self.assertTrue((output / 'episode.json').exists())
                self.assertFalse(captured[0].exists())
                self.assertEqual(before, digest(episode.parent / 'audio.wav'))
