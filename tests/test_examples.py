import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

import branding
from safety import digest, read_json
from tools import examples
import workflow


class ExampleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()

    def workspace(self, name='channel', approve=True, body='font:geist-regular'):
        root = self.base / name
        branding.create(root, dict(version=1, channel='Example Lab', language='en-US',
            audience='People learning the generator', tone='Clear and practical', scene_count=3,
            logo_style='wordmark', colors=dict(background='#142232', accent='#78dfc4', secondary='#f1c98b')),
            dict(display='font:geist-bold', body=body, mono='font:jetbrains-mono-regular'))
        if approve:
            branding.approve(root, workflow.verify_lock())
        return root

    def bundle_copy(self):
        home = self.base / 'source'
        shutil.copytree(examples.HOME / 'examples/v0.5.0', home / 'examples/v0.5.0')
        return home

    def mutate_manifest(self, home, mutate):
        path = home / 'examples/v0.5.0/manifest.json'
        record = read_json(path)
        mutate(record)
        path.write_text(json.dumps(record))

    def test_all_four_episodes_use_normal_authoring_and_validation(self):
        original_root, original_runs = workflow.ROOT, workflow.RUNS
        self.addCleanup(lambda: setattr(workflow, 'ROOT', original_root))
        self.addCleanup(lambda: setattr(workflow, 'RUNS', original_runs))
        manifest = examples.verify_bundle()
        self.assertEqual({r['format'] for r in manifest['examples'].values()},
                         {'landscape', 'portrait', 'square', 'portrait-4x5'})
        for name, row in manifest['examples'].items():
            with self.subTest(name=name):
                root = self.workspace(name, body='font:archivo-semibold' if name == 'data-story' else 'font:geist-regular')
                workflow.ROOT, workflow.RUNS = root, root / 'runs'
                brand_before = branding.brand_files(root)
                episode = examples.create(root, name, True)
                data, _, captions, bounds = workflow.validate(episode)
                self.assertEqual(data['format'], row['format'])
                self.assertEqual(data['version'], 3)
                self.assertGreater(data['duration'], 10)
                self.assertIn('production-', workflow.build_html(data, captions, bounds))
                self.assertEqual(digest(episode.parent / 'audio.wav'),
                    manifest['files'][name + '/narration.wav'])
                self.assertEqual(read_json(episode.parent / 'transcript.json')['audio_sha256'],
                    manifest['files'][name + '/narration.wav'])
                self.assertEqual(branding.brand_files(root), brand_before)

    def test_explicit_write_gate_has_no_side_effects(self):
        root = self.workspace()
        with self.assertRaisesRegex(ValueError, 'approve-write'):
            examples.create(root, 'data-story')
        self.assertEqual(list((root / 'intake').iterdir()), [])

    def test_existing_episode_and_intake_are_not_overwritten(self):
        root = self.workspace()
        episode = examples.create(root, 'data-story', True)
        before = episode.read_bytes()
        with self.assertRaisesRegex(ValueError, 'exists'):
            examples.create(root, 'data-story', True)
        self.assertEqual(episode.read_bytes(), before)

    def test_unapproved_brand_cannot_import_examples(self):
        root = self.workspace(approve=False)
        with self.assertRaises(ValueError):
            examples.create(root, 'data-story', True)
        self.assertEqual(list((root / 'intake').iterdir()), [])

    def test_unknown_example_and_traversal_do_not_write(self):
        root = self.workspace()
        for name in ('unknown', '../data-story', '/tmp/data-story'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                examples.create(root, name, True)
        self.assertEqual(list((root / 'intake').iterdir()), [])

    def test_symlink_workspace_is_rejected(self):
        root = self.workspace()
        alias = self.base / 'alias'
        alias.symlink_to(root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'symlink'):
            examples.create(alias, 'data-story', True)

    def test_source_directory_is_not_an_output_workspace(self):
        with self.assertRaisesRegex(ValueError, 'private workspace'):
            examples.create(examples.HOME / 'examples', 'data-story', True)

    def test_corrupt_bundled_input_is_rejected_before_import(self):
        home = self.bundle_copy()
        path = home / 'examples/v0.5.0/data-story/narration.wav'
        with path.open('ab') as stream:
            stream.write(b'corrupt')
        root = self.workspace()
        with self.assertRaisesRegex(ValueError, 'hash mismatch'):
            examples.create(root, 'data-story', True, home)
        self.assertEqual(list((root / 'intake').iterdir()), [])

    def test_manifest_paths_cannot_include_private_files(self):
        home = self.bundle_copy()
        original = read_json(home / 'examples/v0.5.0/manifest.json')
        for name in ('../private.wav', '/tmp/private.wav', 'data-story/../../private.wav',
                     'data-story/extra.wav', 'data-story/secret.env'):
            (home / 'examples/v0.5.0/manifest.json').write_text(json.dumps(original))
            self.mutate_manifest(home, lambda m: m['files'].update({name: '0' * 64}))
            with self.subTest(name=name), self.assertRaises(ValueError):
                examples.verify_bundle(home)

    def test_bundled_symlink_is_rejected(self):
        home = self.bundle_copy()
        source = home / 'examples/v0.5.0/data-story/script.txt'
        real = self.base / 'script.txt'
        source.rename(real)
        source.symlink_to(real)
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            examples.verify_bundle(home)

    def test_missing_input_and_unknown_fields_are_rejected(self):
        home = self.bundle_copy()
        self.mutate_manifest(home, lambda m: m['files'].pop('data-story/transcript.json'))
        with self.assertRaisesRegex(ValueError, 'Incomplete'):
            examples.verify_bundle(home)

    def test_release_includes_only_verified_example_audio(self):
        from tools.release import files
        home = self.bundle_copy()
        (home / 'workspaces/private').mkdir(parents=True)
        (home / 'workspaces/private/narration.wav').write_bytes(b'private')
        selected = {str(p.relative_to(home)) for p in files(home)}
        self.assertEqual(len([p for p in selected if p.endswith('.wav')]), 4)
        self.assertFalse(any(p.startswith('workspaces/') for p in selected))
        (home / 'examples/unlisted.wav').write_bytes(b'private')
        with self.assertRaisesRegex(ValueError, 'allowlist'):
            files(home)

    def test_cli_list_is_read_only_and_create_needs_approval(self):
        command = [sys.executable, '-B', str(examples.HOME / 'tools/examples.py')]
        listed = subprocess.run(command + ['list'], capture_output=True, text=True)
        self.assertEqual(listed.returncode, 0, listed.stderr)
        self.assertEqual(len(listed.stdout.splitlines()), 4)
        root = self.base / 'not-created'
        denied = subprocess.run(command + ['create', 'data-story', '--workspace', str(root)],
                                capture_output=True, text=True)
        self.assertEqual(denied.returncode, 1)
        self.assertIn('approve-write', denied.stderr)
        self.assertFalse(root.exists())


if __name__ == '__main__':
    unittest.main()
