import contextlib
import io
import json
import os
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch

import media_backend
import storage
import workflow
import ysc
from safety import digest, read_json, write_json


class StorageTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve() / 'channel'
        for name in ('brand', 'episodes', 'intake', 'runs'):
            (self.root / name).mkdir(parents=True)
        write_json(self.root / 'brand/brand.json', {'fixture': True})
        self.original = self.root / 'intake/original.wav'
        self.original.write_bytes(b'original-recording')

    def run_fixture(self, name, mode='build', days=10, failed=False):
        run = self.root / 'runs/example' / name
        (run / 'assets').mkdir(parents=True)
        (run / 'assets/copied-font.ttf').write_bytes(b'generated-copy')
        (run / 'video.html').write_text('<main>preview</main>')
        write_json(run / 'episode.json', {'id': 'example'})
        write_json(run / 'visual-qa.json', {'status': 'PASS'})
        if mode == 'render':
            (run / 'video.mp4').write_bytes(b'completed-video')
        if failed:
            report = run / 'failure.json'
            write_json(report, {'status': 'FAILED'})
        else:
            report = run / 'run.json'
            outputs = {str(p.relative_to(run)): digest(p) for p in run.rglob('*') if p.is_file()}
            write_json(report, {'mode': mode, 'automated_checks': 'PASS', 'outputs': outputs})
        timestamp = time.time() - days * 86400
        os.utime(report, (timestamp, timestamp))
        return run

    def prepared(self):
        old = self.run_fixture('old', days=20)
        self.run_fixture('recent-one', days=10)
        self.run_fixture('recent-two', days=9)
        return old

    def test_preview_has_no_writes_and_preserves_final_and_originals(self):
        old = self.prepared()
        final = self.run_fixture('final', mode='render', days=30)
        before = {str(p.relative_to(self.root)): digest(p) for p in self.root.rglob('*') if p.is_file()}
        result = storage.inventory(self.root)
        self.assertFalse(result['writes'])
        self.assertEqual(len(result['candidates']), 2)
        self.assertIn(str(final.relative_to(self.root)), result['protected'])
        self.assertEqual(before, {str(p.relative_to(self.root)): digest(p) for p in self.root.rglob('*') if p.is_file()})
        self.assertTrue((old / 'run.json').exists())

    def test_approved_cleanup_retains_reports_and_inputs(self):
        old = self.prepared()
        old_hash = digest(old / 'run.json')
        plan = storage.inventory(self.root)
        result = storage.cleanup(self.root, plan['plan_id'], approved=True)
        self.assertEqual(result['deleted_files'], 2)
        self.assertFalse((old / 'video.html').exists())
        self.assertEqual(digest(old / 'run.json'), old_hash)
        self.assertTrue((old / 'visual-qa.json').exists())
        self.assertEqual(self.original.read_bytes(), b'original-recording')
        self.assertEqual(storage.inventory(self.root)['candidates'], [])

    def test_no_approval_or_changed_plan_never_deletes(self):
        old = self.prepared()
        plan = storage.inventory(self.root)
        with self.assertRaises(ValueError):
            storage.cleanup(self.root, plan['plan_id'])
        with self.assertRaisesRegex(ValueError, 'plan changed'):
            storage.cleanup(self.root, 'wrong', approved=True)
        self.assertTrue((old / 'video.html').exists())
        with (old / 'video.html').open('a') as stream:
            stream.write('changed')
        with self.assertRaisesRegex(ValueError, 'Changed build output'):
            storage.cleanup(self.root, plan['plan_id'], approved=True)

    def test_recent_failed_and_unrecognized_runs_are_retained(self):
        self.run_fixture('failed', failed=True, days=0)
        self.run_fixture('recent', days=0)
        unknown = self.root / 'runs/example/incomplete'
        unknown.mkdir()
        (unknown / 'private.txt').write_text('retain')
        result = storage.inventory(self.root)
        self.assertFalse(result['candidates'])
        self.assertIn('runs/example/incomplete', result['unrecognized'])

    def test_old_failure_media_pruned_but_failure_record_retained(self):
        old = self.run_fixture('failed', failed=True, days=30)
        self.run_fixture('recent-one', days=10)
        self.run_fixture('recent-two', days=9)
        result = storage.cleanup(self.root, storage.inventory(self.root)['plan_id'], approved=True)
        self.assertEqual(result['deleted_files'], 2)
        self.assertTrue((old / 'failure.json').exists())

    def test_completed_render_without_video_still_protected(self):
        final = self.run_fixture('final', mode='render', days=30)
        (final / 'video.mp4').unlink()
        self.assertIn('runs/example/final', storage.inventory(self.root)['protected'])

    def test_unknown_file_inside_old_build_is_not_deleted(self):
        old = self.prepared()
        (old / 'original.png').write_bytes(b'user-data')
        plan = storage.inventory(self.root)
        storage.cleanup(self.root, plan['plan_id'], approved=True)
        self.assertEqual((old / 'original.png').read_bytes(), b'user-data')

    def test_protect_preview_and_traversal_guard(self):
        self.prepared()
        storage.keep(self.root, 'example/old', approved=True)
        self.assertEqual(storage.inventory(self.root)['candidates'], [])
        for value in ('../old', '/example/old', 'example/../old'):
            with self.assertRaises(ValueError):
                storage.keep(self.root, value, approved=True)

    def test_symlink_workspace_run_and_policy_refused(self):
        alias = self.root.parent / 'alias'
        alias.symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            storage.inventory(alias)
        run = self.run_fixture('linked')
        (run / 'assets/outside').symlink_to(self.original)
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            storage.inventory(self.root)
        (run / 'assets/outside').unlink()
        (self.root / 'storage-policy.json').symlink_to(self.original)
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            storage.policy(self.root)
        self.assertEqual(self.original.read_bytes(), b'original-recording')

    def test_wrong_root_and_invalid_policy_refused(self):
        with self.assertRaises(ValueError):
            storage.inventory(self.root.parent)
        for field, value in [('max_generated_bytes', True), ('min_free_bytes', 0), ('keep_builds', 0), ('older_than_days', -1)]:
            target = self.root / 'storage-policy.json'
            target.write_text(json.dumps({**storage.DEFAULTS, field: value}))
            with self.assertRaises(ValueError):
                storage.policy(self.root)

    def test_workspace_lock_prevents_cleanup_and_second_writer(self):
        with storage.activity(self.root):
            with self.assertRaisesRegex(ValueError, 'busy'):
                with storage.activity(self.root):
                    self.fail('Concurrent writer')
            with self.assertRaisesRegex(ValueError, 'busy'):
                storage.cleanup(self.root, 'unused', approved=True)

    def test_budget_and_disk_reserve_stop_before_work(self):
        for used in ({'generated_bytes': 10 * storage.GIB, 'scratch_bytes': 0},
                     {'generated_bytes': 0, 'scratch_bytes': 32 * storage.GIB}):
            with patch.object(storage, 'usage', return_value=used), self.assertRaisesRegex(ValueError, 'budget'):
                storage.preflight(self.root)
        with patch.object(storage.shutil, 'disk_usage', return_value=type('Disk', (), {'free': 1})()), \
             self.assertRaisesRegex(ValueError, 'reserve'):
            storage.preflight(self.root)
        with patch.object(workflow, 'ROOT', self.root), patch.object(workflow, '_build') as build, \
             patch.object(storage, 'preflight', side_effect=ValueError('budget')), self.assertRaises(ValueError):
            workflow.build('unused', 'unused')
        build.assert_not_called()

    def test_scratch_cleanup_success_error_and_interrupt(self):
        for exception in (None, RuntimeError, KeyboardInterrupt):
            temporary = None
            try:
                with media_backend.scratch(self.root) as temporary:
                    self.assertTrue(temporary.is_relative_to(self.root / '.scratch'))
                    (temporary / 'frames/frame-00000.png').write_bytes(b'frame')
                    self.assertIn('max_scratch_bytes', read_json(temporary / 'budget.json'))
                    if exception:
                        raise exception()
            except (RuntimeError, KeyboardInterrupt):
                pass
            self.assertFalse(temporary.exists())
        self.assertEqual(self.original.read_bytes(), b'original-recording')

    def test_stale_scratch_requires_dead_owners_and_age(self):
        directory = self.root / '.scratch/ysc-test'
        (directory / 'frames').mkdir(parents=True)
        write_json(directory / 'owner.json', {'version': 1, 'kind': 'ysc-media-scratch',
                                             'pid': os.getpid(), 'created_at': time.time() - 172800})
        (directory / 'frames/frame-00000.png').write_bytes(b'old-frame')
        self.assertEqual(storage.inventory(self.root)['candidates'], [])
        with patch.object(storage, 'alive', return_value=False), patch.object(storage, 'has_open_files', return_value=False):
            plan = storage.inventory(self.root)
            self.assertEqual(len(plan['candidates']), 2)
            storage.cleanup(self.root, plan['plan_id'], approved=True)
        self.assertFalse(directory.exists())

    def test_open_file_inspection_failure_keeps_scratch(self):
        directory = self.root / '.scratch/ysc-test'
        directory.mkdir(parents=True)
        write_json(directory / 'owner.json', {'version': 1, 'kind': 'ysc-media-scratch', 'pid': 1, 'created_at': time.time() - 172800})
        with patch.object(storage, 'alive', return_value=False), patch.object(storage.shutil, 'which', return_value=None):
            self.assertEqual(storage.inventory(self.root)['candidates'], [])

    def test_partial_cleanup_keeps_a_receipt(self):
        self.prepared()
        plan = storage.inventory(self.root)
        original = Path.unlink
        def interrupt(path, *args, **kwargs):
            if path.name == 'video.html':
                raise KeyboardInterrupt()
            return original(path, *args, **kwargs)
        with patch.object(Path, 'unlink', interrupt), self.assertRaises(KeyboardInterrupt):
            storage.cleanup(self.root, plan['plan_id'], approved=True)
        receipt = next((self.root / '.storage').glob('*.result.json'))
        result = read_json(receipt)
        self.assertFalse(result['completed'])
        self.assertEqual(len(result['deleted']), 1)

    def test_live_capture_child_protects_stale_scratch(self):
        directory = self.root / '.scratch/ysc-test'
        directory.mkdir(parents=True)
        write_json(directory / 'owner.json', {'version': 1, 'kind': 'ysc-media-scratch', 'pid': 1, 'created_at': time.time() - 172800})
        write_json(directory / 'capture-owner.json', {'pid': os.getpid()})
        with patch.object(storage, 'alive', side_effect=[False, True]):
            self.assertEqual(storage.inventory(self.root)['candidates'], [])

    def test_cli_preview_and_writer_gate(self):
        old = self.prepared()
        with contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(ysc.main(['--workspace', str(self.root), 'storage']), 0)
        plan = json.loads(output.getvalue())
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(ysc.main(['--workspace', str(self.root), 'storage-clean', '--plan-id', plan['plan_id']]), 1)
        self.assertTrue((old / 'video.html').exists())


if __name__ == '__main__':
    unittest.main()
