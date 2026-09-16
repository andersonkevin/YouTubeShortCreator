from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import safety


class JsonBoundaryTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.path = self.root / 'record.json'

    def test_nonfinite_duplicate_and_malformed_json(self):
        for content in ('{"x":1e999}', '{"x":-1e999}', '{"x":NaN}',
                        '{"x":Infinity}', '{"x":1,"x":2}', '{"x":'):
            with self.subTest(content=content):
                self.path.write_text(content)
                with self.assertRaises(ValueError):
                    safety.read_json(self.path)
        self.path.write_text('{"x":1.25e2}')
        self.assertEqual(safety.read_json(self.path), {'x': 125})

    def test_serialization_failure_leaves_no_file(self):
        for value in ({'x': float('nan')}, {'x': object()}):
            with self.assertRaises((ValueError, TypeError)):
                safety.write_json(self.path, value)
            self.assertEqual(list(self.root.iterdir()), [])

    def test_interrupted_flush_and_link_leave_no_partial_target(self):
        for operation in ('fsync', 'link'):
            for error in (OSError('disk failure'), KeyboardInterrupt()):
                with self.subTest(operation=operation, error=type(error)), \
                     patch.object(safety.os, operation, side_effect=error), \
                     self.assertRaises(type(error)):
                    safety.write_json(self.path, {'complete': True})
                self.assertEqual(list(self.root.iterdir()), [])

    def test_existing_file_and_dangling_symlink_are_preserved(self):
        self.path.write_bytes(b'original')
        with self.assertRaises(FileExistsError):
            safety.write_json(self.path, {})
        self.assertEqual(self.path.read_bytes(), b'original')
        link = self.root / 'link.json'
        link.symlink_to(self.root / 'absent')
        with self.assertRaises(FileExistsError):
            safety.write_json(link, {})
        self.assertTrue(link.is_symlink())
        self.assertFalse((self.root / 'absent').exists())

    def test_concurrent_target_wins_without_overwrite(self):
        original = safety.os.link
        def race(source, destination):
            destination.write_bytes(b'other writer')
            original(source, destination)
        with patch.object(safety.os, 'link', side_effect=race), self.assertRaises(FileExistsError):
            safety.write_json(self.path, {})
        self.assertEqual(self.path.read_bytes(), b'other writer')
        self.assertEqual(list(self.root.iterdir()), [self.path])

    def test_success_is_complete_and_cleanup_warning_is_explicit(self):
        with patch.object(Path, 'unlink', side_effect=OSError('cleanup denied')), \
             self.assertWarnsRegex(RuntimeWarning, 'temporary file'):
            safety.write_json(self.path, {'complete': True})
        self.assertEqual(safety.read_json(self.path), {'complete': True})
        self.assertEqual(len(list(self.root.glob('.*.tmp'))), 1)

    def test_traversal_and_symlink_parent_rejected(self):
        target = self.root / 'real'
        target.mkdir()
        (target / 'item').write_text('keep')
        (self.root / 'alias').symlink_to(target, target_is_directory=True)
        for name in ('../escape', '/absolute', 'alias/item', 'a\\b'):
            with self.subTest(name=name), self.assertRaises(ValueError):
                safety.inside(self.root, name, exists=False)
