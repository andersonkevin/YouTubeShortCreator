import contextlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

from PIL import ImageFont

import branding
import ysc
from safety import digest, read_json
from tools import freeze, release
from tools.font_library import kit


class FontLibraryTests(unittest.TestCase):
    def test_catalog_contains_readable_static_and_real_variable_faces_with_notices(self):
        manifest = kit.verify_assets()
        self.assertEqual(len(manifest['fonts']), 80)
        self.assertEqual(sum('axes' in row for row in manifest['fonts'].values()), 16)
        self.assertEqual(len({row['family'] for row in manifest['fonts'].values()}), 36)
        for row in kit.entries():
            path, metadata = kit.resolve(row['id'])
            face = ImageFont.truetype(str(path), 32)
            self.assertEqual(face.getname(), (row['family'], row['style']))
            self.assertGreater(face.getlength('Brand 0123456789'), 10)
            if row['axes']:
                values = face.get_variation_axes()
                self.assertEqual(len(values), len(row['axes']))
                face.set_variation_by_axes([a['minimum'] for a in values])
                light = bytes(face.getmask('Hamburgefonstiv'))
                face.set_variation_by_axes([a['maximum'] for a in values])
                self.assertNotEqual(light, bytes(face.getmask('Hamburgefonstiv')))
            else:
                with self.assertRaises(OSError):
                    face.get_variation_axes()
            self.assertEqual(digest(path), metadata['source_sha256'])

    def test_catalog_cli_is_read_only(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'not-created'
            with patch('workflow.ROOT'), patch('workflow.RUNS'), contextlib.redirect_stdout(io.StringIO()) as output:
                self.assertEqual(ysc.main(['--workspace', str(root), 'fonts']), 0)
            self.assertEqual(len(json.loads(output.getvalue())), 80)
            self.assertFalse(root.exists())

    def test_unknown_ids_and_path_traversal_fail(self):
        for value in ('font:../inter-regular', 'font:/tmp/font.ttf', 'font:inter-regular/other',
                      'font:missing', 'font:', 'https://example.com/font.ttf', None):
            with self.subTest(value=value), self.assertRaises(ValueError):
                kit.resolve(value)

    def test_license_labels_must_match_the_retained_notice(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            shutil.copytree(kit.HOME / 'vendor', root / 'vendor')
            path = root / 'vendor/manifest.json'
            original = read_json(path)
            for license_id, replacement in [('OFL-1.1', 'Apache-2.0'),
                                             ('Apache-2.0', 'OFL-1.1'),
                                             ('OFL-1.1', 'unverified')]:
                manifest = read_json(kit.HOME / 'vendor/manifest.json')
                record = next(row for row in manifest['fonts'].values()
                              if row['license_id'] == license_id)
                record['license_id'] = replacement
                path.write_text(json.dumps(manifest))
                with self.subTest(license_id=license_id, replacement=replacement), self.assertRaisesRegex(ValueError, 'license'):
                    kit.verify_assets(root)
            self.assertEqual(read_json(kit.HOME / 'vendor/manifest.json'), original)

    def test_drift_and_symlinks_fail_in_temporary_catalog(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            shutil.copytree(kit.HOME / 'vendor', root / 'vendor')
            path = root / 'vendor/fonts/archivo-regular.ttf'
            path.write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'drift'):
                kit.verify_assets(root)
            path.unlink()
            path.symlink_to(kit.HOME / 'vendor/fonts/archivo-regular.ttf')
            with self.assertRaisesRegex(ValueError, 'Symlink'):
                kit.verify_assets(root)

    def test_manifest_cannot_allowlist_arbitrary_binary(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            shutil.copytree(kit.HOME / 'vendor', root / 'vendor')
            path = root / 'vendor/manifest.json'
            manifest = read_json(path)
            manifest['files']['extra.bin'] = '0' * 64
            path.write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError, 'Undeclared'):
                kit.verify_assets(root)

    def test_onboarding_copies_font_and_notice_without_approval_or_source_changes(self):
        brand = {'version': 1, 'channel': 'Font Test', 'language': 'en-US', 'audience': 'Internal test',
                 'tone': 'Clear', 'scene_count': 3, 'colors': dict(branding.PALETTES['violet']),
                 'logo_style': 'wordmark'}
        fonts = {'display': 'font:geist-bold', 'body': 'font:inter-regular', 'mono': 'font:jetbrains-mono-regular'}
        before = {key: digest(kit.resolve(value)[0]) for key, value in fonts.items()}
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'brand'
            branding.create(root, brand, fonts)
            self.assertFalse((root / 'brand/approval.json').exists())
            self.assertTrue((root / 'brand/preview.png').is_file())
            records = read_json(root / 'brand/font-provenance.json')['fonts']
            for role, path in branding.fonts_in(root / 'brand/assets').items():
                self.assertEqual(digest(path), before[role])
                self.assertEqual(records[role]['sha256'], before[role])
                self.assertEqual(digest(root / 'brand' / records[role]['license']), records[role]['license_sha256'])
            branding.approve(root, 'unit-test-template')
            self.assertEqual(branding.verified(root, 'unit-test-template'), brand)
            output = Path(temp) / 'run'
            output.mkdir()
            branding.install_font_notices(root, output)
            self.assertEqual(read_json(output / 'font-provenance.json')['fonts'], records)
            for record in records.values():
                self.assertEqual(digest(output / record['license']), record['license_sha256'])
            with self.assertRaisesRegex(ValueError, 'already exists'):
                branding.install_font_notices(root, output)
            (root / 'brand/font-licenses/geist-OFL.txt').write_text('changed')
            with self.assertRaisesRegex(ValueError, 'Brand changed'):
                branding.verified(root, 'unit-test-template')
            with self.assertRaisesRegex(ValueError, 'already exists'):
                branding.create(root, brand, fonts)
        self.assertEqual(before, {key: digest(kit.resolve(value)[0]) for key, value in fonts.items()})

    def test_duplicate_role_fonts_fail_explicitly(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for role in ('display', 'body', 'mono'):
                (root / (role + '.ttf')).write_bytes(b'fixture')
            (root / 'display.woff2').write_bytes(b'duplicate')
            with self.assertRaisesRegex(ValueError, 'Exactly one'):
                branding.fonts_in(root)

    def test_release_includes_only_catalog_font_binaries(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            library = root / 'tools/font_library'
            shutil.copytree(kit.HOME, library)
            selected = release.files(root)
            self.assertEqual(sum(path.suffix in kit.EXTENSIONS for path in selected), 80)
            (library / 'vendor/fonts/unlisted.ttf').write_bytes(b'not allowed')
            with self.assertRaisesRegex(ValueError, 'allowlist'):
                release.files(root)

    def test_font_payloads_are_part_of_engine_drift_detection(self):
        paths = freeze.record()['files']
        self.assertIn('tools/font_library/kit.py', paths)
        for name in kit.verify_assets()['files']:
            self.assertIn('tools/font_library/vendor/' + name, paths)


if __name__ == '__main__':
    unittest.main()
