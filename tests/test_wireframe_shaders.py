import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from tools.vendor_wireframe_shaders import bundle


class WireframeShaderTests(unittest.TestCase):
    def test_converter_rejects_unpinned_source_and_symlink(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / 'source.html'
            with self.assertRaises(ValueError): bundle(path)
            path.write_text('<script>unreviewed()</script>')
            with self.assertRaises(ValueError): bundle(path)
            alias = root / 'alias.html'; alias.symlink_to(path)
            with self.assertRaises(ValueError): bundle(alias)

    def test_provenance_pins_the_actual_shader_and_motion_payloads(self):
        root = Path(__file__).resolve().parents[1] / 'templates/v1/assets'
        record = json.loads((root / 'production-wireframe-provenance.json').read_text())
        for name, expected in record['files'].items():
            self.assertEqual(hashlib.sha256((root / name).read_bytes()).hexdigest(), expected)
        self.assertIsInstance(record['native_integrated'], bool)
        self.assertIsInstance(record['export_qualified'], bool)

    def test_source_rebuild_when_the_hyperframes_checkout_is_available(self):
        root = Path(__file__).resolve().parents[1]
        source = root.parents[1] / 'registry/blocks/wireframe-portal-title/wireframe-portal-title.html'
        if not source.is_file(): self.skipTest('Upstream checkout is optional for consumers')
        self.assertEqual(bundle(source), (root / 'templates/v1/assets/production-wireframe-shaders.js').read_text())


if __name__ == '__main__':
    unittest.main()
