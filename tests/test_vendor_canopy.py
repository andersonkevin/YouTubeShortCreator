import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from tools.vendor_canopy import bundle


class CanopyPreparationTests(unittest.TestCase):
    def test_converter_rejects_missing_modified_and_symlinked_sources(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'source.html'
            with self.assertRaises(ValueError): bundle(path)
            path.write_text('<script>unreviewed()</script>')
            with self.assertRaises(ValueError): bundle(path)
            alias = path.with_name('alias.html');alias.symlink_to(path)
            with self.assertRaises(ValueError): bundle(alias)

    def test_generated_source_is_pinned_and_is_not_misreported_as_integrated(self):
        assets = Path(__file__).resolve().parents[1] / 'templates/v1/assets'
        record = json.loads((assets / 'production-canopy-provenance.json').read_text())
        for name, expected in record['files'].items():
            self.assertEqual(hashlib.sha256((assets / name).read_bytes()).hexdigest(), expected)
        self.assertIsInstance(record['native_integrated'], bool)
        self.assertIsInstance(record['export_qualified'], bool)

    def test_read_only_rebuild_with_the_retained_upstream_archive(self):
        root = Path(__file__).resolve().parents[1]
        source = root.parents[1] / 'registry/blocks/canopy-part-title/canopy-part-title.html'
        if not source.is_file(): self.skipTest('Upstream checkout is optional for consumers')
        before = source.read_bytes()
        self.assertEqual(bundle(source), (root / 'templates/v1/assets/production-canopy-motion.js').read_text())
        self.assertEqual(source.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
