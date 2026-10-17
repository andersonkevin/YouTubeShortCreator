import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from tools import vendor_three_postprocess as vendor


class PinnedPostprocessing(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root/'source';self.source.mkdir()
        self.file = self.source/'module.js'
        self.code = "import { Vector2 } from 'three';\nconst value = new Vector2();\nexport { value };\n"
        self.file.write_text(self.code)
        self.pins = {'module.js': hashlib.sha256(self.file.read_bytes()).hexdigest()}

    def test_converter_is_read_only_and_rejects_changed_bytes(self):
        with patch.dict(vendor.PINS, self.pins, clear=True):
            result = vendor.bundle(self.source)
            self.assertIn('const {Vector2}=T;', result)
            self.assertNotIn("from 'three'", result)
            self.assertEqual(self.file.read_text(), self.code)
            self.assertEqual(len(list(self.source.iterdir())), 1)
            self.file.write_text(self.code+'// Changed\n')
            with self.assertRaises(ValueError):vendor.bundle(self.source)

    def test_symlinked_source_and_payload_are_rejected(self):
        link = self.root/'link';link.symlink_to(self.source, target_is_directory=True)
        with self.assertRaises(ValueError):vendor.bundle(link)
        payload = self.source/'linked.js';payload.symlink_to(self.file)
        with patch.dict(vendor.PINS, {'linked.js': self.pins['module.js']}, clear=True):
            with self.assertRaises(ValueError):vendor.bundle(self.source)

    def test_unexpected_local_import_is_rejected(self):
        self.file.write_text("import { missing } from '../unknown.js';\nexport { missing };\n")
        with patch.dict(vendor.PINS, {'module.js': hashlib.sha256(self.file.read_bytes()).hexdigest()}, clear=True):
            with self.assertRaises(ValueError):vendor.bundle(self.source)

    def test_public_bundle_matches_pinned_provenance(self):
        assets = Path(__file__).resolve().parents[1]/'templates/v1/assets'
        provenance = json.loads((assets/'production-three-postprocess-provenance.json').read_text())
        self.assertEqual({r['path']: r['sha256'] for r in provenance['sources']}, vendor.PINS)
        self.assertEqual(hashlib.sha256((assets/'production-three-postprocess.js').read_bytes()).hexdigest(), provenance['bundle_sha256'])
        self.assertTrue((assets/provenance['notice']).is_file())


if __name__ == '__main__':
    unittest.main()
