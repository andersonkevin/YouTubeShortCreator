import base64
import copy
import json
from pathlib import Path
import tempfile
from PIL import Image
from safety import digest
import unittest
import production_visuals as production


class RasterSurfaceTests(unittest.TestCase):
    def test_eleven_raster_options_keep_closed_records_and_local_still_contract(self):
        styles = ('ascii-coarse', 'ascii-medium', 'ascii-fine', 'dither-2', 'dither-4', 'dither-8',
                  'particle-left', 'particle-center', 'ink-bleed', 'slit-rows', 'slit-columns')
        for style in styles:
            scene = {'kind': 'media-grid', 'name': style, 'first_cue': 0, 'cues': [0], 'transition': 'cut-left',
                     'content': {'heading': 'A supplied still', 'source': 'Internal fixture', 'layout': 'solo',
                                 'items': [{'image': 'still', 'label': 'Exact label'}], 'surface': {'style': style}}}
            def validate(row):
                return production.validate_scenes([row], {'still': {}}, [{'start': .107, 'end': 1.5}], 3)
            self.assertEqual(validate(scene), [(0, 3)])
            for key, value in [('seed', 42), ('font', 'Custom'), ('density', 10000), ('url', 'https://example.com'),
                               ('matrix', 64), ('charset', '<script>'), ('duration', 15), ('target', {}), ('cutout', 'none')]:
                bad = copy.deepcopy(scene);bad['content']['surface'][key] = value
                with self.subTest(style=style, field=key), self.assertRaises(ValueError): validate(bad)
            bad = copy.deepcopy(scene);bad['content']['items'][0]['image'] = 'missing'
            with self.assertRaises(ValueError): validate(bad)


    def test_native_asset_writer_embeds_only_verified_raster_sources(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name in ('still', 'other'):
                Image.new('RGB', (64, 64), '#140b30').save(root / (name + '.png'))
            records = {name: {'path': name + '.png', 'sha256': digest(root / (name + '.png'))} for name in ('still', 'other')}
            for style in production.MEDIA_RASTER_SURFACES:
                data = {'assets': records, 'scenes': [{'kind': 'media-grid', 'content': {'surface': {'style': style}, 'items': [{'image': 'still'}]}}]}
                output = root / style;(output / 'assets').mkdir(parents=True)
                production.install_assets(output, data, root)
                encoded = (output / 'assets/production-shader-images.js').read_text()
                mapping = json.loads(encoded.removeprefix('window.ShortCreatorShaderImages=Object.freeze(').removesuffix(');\n'))
                self.assertEqual(set(mapping), {'assets/still-still.png'})
                self.assertEqual(base64.b64decode(mapping['assets/still-still.png'].split(',', 1)[1]), (root / 'still.png').read_bytes())
                with self.assertRaises(ValueError): production.install_assets(output, data, root)

    def test_raster_asset_encoding_does_not_bypass_hash_or_path_checks(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);Image.new('RGB', (64, 64), '#140b30').save(root / 'still.png')
            for index, record in enumerate([{'path': 'still.png', 'sha256': '0' * 64}, {'path': '../still.png', 'sha256': digest(root / 'still.png')}]):
                output = root / str(index);(output / 'assets').mkdir(parents=True)
                data = {'assets': {'still': record}, 'scenes': [{'kind': 'media-grid', 'content': {'surface': {'style': 'ascii-fine'}, 'items': [{'image': 'still'}]}}]}
                with self.assertRaises(ValueError): production.install_assets(output, data, root)
                self.assertFalse((output / 'assets/production-shader-images.js').exists())


if __name__ == '__main__':
    unittest.main()
