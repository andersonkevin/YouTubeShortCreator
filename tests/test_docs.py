import json
from pathlib import Path
import shutil
import tempfile
import unittest

from tools.check_docs import check

HOME = Path(__file__).resolve().parents[1]


class DocumentationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        for source in [*HOME.glob('*.md'), *HOME.joinpath('docs').rglob('*'), *HOME.joinpath('examples').rglob('*')]:
            if source.is_file():
                target = self.root / source.relative_to(HOME)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
        # Local source links resolve, but no code is executed from the fixture.
        for source in [*HOME.glob('*.py'), *HOME.joinpath('templates').rglob('*.json'), HOME / 'LICENSE']:
            target = self.root / source.relative_to(HOME)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)

    def append(self, content):
        path = self.root / 'docs/README.md'
        with path.open('a') as stream:
            stream.write('\n' + content + '\n')

    def test_public_docs_pass(self):
        result = check(HOME)
        self.assertEqual(result['errors'], [])
        self.assertEqual(result['manifest_images'], 24)

    def test_assistant_entrypoints_share_workflow(self):
        for name in ('AGENTS.md', 'START-HERE.md'):
            content = (HOME / name).read_text()
            self.assertIn('docs/ASSISTANT-WORKFLOW.md', content)

    def test_assistant_entrypoints_packaged(self):
        from tools.release import files
        selected = {str(path.relative_to(HOME)) for path in files()}
        self.assertTrue({'START-HERE.md', 'AGENTS.md',
                         'docs/assistant/BRIEF.md', 'docs/assistant/SESSION.md'} <= selected)

    def test_missing_local_link(self):
        self.append('[Broken](not-here.md)')
        self.assertTrue(any('missing local target' in e for e in check(self.root)['errors']))

    def test_hidden_settings_directories_excluded_from_release(self):
        from tools.release import files
        private = self.root / '.local-settings'
        private.mkdir()
        (private / 'settings.local.json').write_text('{"private_fixture": true}')
        selected = {str(p.relative_to(self.root)) for p in files(self.root)}
        self.assertFalse(any(name.startswith('.local-settings/') for name in selected))
        (self.root / 'unknown-dir').mkdir()
        with self.assertRaisesRegex(ValueError, 'Unknown public directory'):
            files(self.root)

    def test_missing_heading_anchor(self):
        self.append('[Broken](README.md#not-a-real-heading)')
        self.assertTrue(any('missing heading anchor' in e for e in check(self.root)['errors']))

    def test_external_images_rejected(self):
        self.append('![Remote](https://example.com/private.png)')
        self.assertTrue(any('images must be local' in e for e in check(self.root)['errors']))

    def test_image_hash_drift(self):
        path = self.root / 'docs/images/manifest.json'
        record = json.loads(path.read_text())
        record['assets'][0]['sha256'] = '0' * 64
        path.write_text(json.dumps(record))
        self.assertTrue(any('image hash mismatch' in e for e in check(self.root)['errors']))

    def test_manifest_path_escape(self):
        path = self.root / 'docs/images/manifest.json'
        record = json.loads(path.read_text())
        record['assets'][0]['path'] = '../escape.png'
        path.write_text(json.dumps(record))
        self.assertTrue(any('Image manifest' in e for e in check(self.root)['errors']))

    def test_invalid_json_example(self):
        self.append('```json\n{invalid}\n```')
        self.assertTrue(any('invalid JSON example' in e for e in check(self.root)['errors']))


if __name__ == '__main__':
    unittest.main()
