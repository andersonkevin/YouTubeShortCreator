from pathlib import Path
import tempfile
import unittest
import numpy as np

import workflow
from safety import read_json
from tools import regression
from tools.compare_references import pixel_difference


class RegressionTests(unittest.TestCase):
    def test_matrix_covers_every_layout_at_both_scene_counts(self):
        with tempfile.TemporaryDirectory() as temp:
            root = regression.prepare(Path(temp).resolve() / 'reference', True)
            manifest = read_json(root / 'regression-fixture.json')
            self.assertFalse(manifest['production_approval'])
            self.assertEqual(len(manifest['cases']), 13)
            old = workflow.ROOT, workflow.RUNS
            workflow.ROOT, workflow.RUNS = root, root / 'runs'
            try:
                for count in (3, 4):
                    valid = [case for case in manifest['cases'] if case['scene_count'] == count and case['expected'] == 'PASS']
                    self.assertEqual(len({name for case in valid for name in case['layouts']}), 18)
                    for case in valid:
                        workflow.validate(root / case['episode'])
                invalid = next(case for case in manifest['cases'] if 'invalid-anchor' in case['episode'])
                with self.assertRaisesRegex(ValueError, 'First scene must start'):
                    workflow.validate(root / invalid['episode'])
            finally:
                workflow.ROOT, workflow.RUNS = old
            with self.assertRaises(ValueError):
                regression.prepare(root, True)

    def test_preflight_rejects_unapproved_and_unsafe_writes(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp).resolve()
            with self.assertRaises(ValueError):
                regression.prepare(base / 'new', False)
            with self.assertRaises(ValueError):
                regression.prepare(base / '../escape', True)
            alias = base / 'alias'
            alias.symlink_to(base, target_is_directory=True)
            with self.assertRaises(ValueError):
                regression.prepare(alias / 'new', True)
            self.assertFalse((base / 'new').exists())
        with self.assertRaises(ValueError):
            regression.new_root(regression.HOME / 'tools/new-fixture')

    def test_capture_approval_before_workspace_access(self):
        with self.assertRaisesRegex(ValueError, 'approve-write'):
            regression.capture(Path('/missing'), False)

    def test_pixel_comparison_rejects_unapproved_or_unrelated_changes(self):
        before = np.zeros((1920, 1080, 3), dtype=np.uint8)
        after = before.copy()
        self.assertEqual(pixel_difference(before, after), 0)
        after[700, 1014] = 255
        with self.assertRaisesRegex(ValueError, 'outside'):
            pixel_difference(before, after)
        self.assertEqual(pixel_difference(before, after, True), 1)
        after[100, 100] = 255
        with self.assertRaisesRegex(ValueError, 'outside'):
            pixel_difference(before, after, True)


if __name__ == '__main__':
    unittest.main()
