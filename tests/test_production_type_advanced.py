import base64
import copy
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image

import branding
import production_visuals as production
from safety import digest


class AdvancedTitleTests(unittest.TestCase):
    def scene(self, reveal):
        content = {'kicker': 'Internal fixture', 'title': 'Exact supplied words.',
                   'subtitle': 'The approved narration remains unchanged.', 'reveal': reveal}
        if reveal in ('neon-accent', 'particle-burst'):
            content['accent_word'] = 'supplied'
        if reveal == 'texture-read':
            content['texture'] = 'mask'
        return {'kind': 'title', 'name': 'Title', 'first_cue': 0, 'cues': [0],
                'transition': 'cut-left', 'content': content}

    def validate(self, scene, assets=None):
        return production.validate_scenes([scene], assets or {}, [{'start': .1, 'end': 1.5}], 3)

    def test_all_treatments_use_the_native_closed_contract(self):
        self.assertEqual(len(production.ADVANCED_TITLE_REVEALS), 10)
        for reveal in production.ADVANCED_TITLE_REVEALS:
            scene = self.scene(reveal)
            assets = {'mask': {}} if reveal == 'texture-read' else {}
            self.assertEqual(self.validate(scene, assets), [(0, 3)])
            for field, value in [('font', 'Other'), ('color', 'red'), ('seed', 9),
                                 ('duration', 6), ('html', '<script>'), ('columns', 12),
                                 ('marker', {'text': 'Exact', 'style': 'underline'}),
                                 ('layout', 'speech-cloud')]:
                bad = copy.deepcopy(scene); bad['content'][field] = value
                with self.subTest(reveal=reveal, field=field), self.assertRaises(ValueError):
                    self.validate(bad, assets)

    def test_accent_is_explicit_unique_and_keeps_punctuation(self):
        for reveal in ('neon-accent', 'particle-burst'):
            scene = self.scene(reveal)
            for value in ('sup', 'Supplied', 'two words', '', None):
                bad = copy.deepcopy(scene); bad['content']['accent_word'] = value
                with self.assertRaises(ValueError): self.validate(bad)
            del scene['content']['accent_word']
            with self.assertRaises(ValueError): self.validate(scene)
            scene['content'].update(title='same same', accent_word='same')
            with self.assertRaises(ValueError): self.validate(scene)
            scene['content'].update(title='Exact, supplied words.', accent_word='Exact,')
            self.validate(scene)
        scene = self.scene('tile-resolve'); scene['content']['accent_word'] = 'Exact'
        with self.assertRaises(ValueError): self.validate(scene)

    def test_texture_uses_only_referenced_local_asset_ids(self):
        scene = self.scene('texture-read')
        for value in ('https://example.invalid/mask.png', '../mask.png', 'data:image/png;base64,AA==', '', None):
            bad = copy.deepcopy(scene); bad['content']['texture'] = value
            with self.assertRaises(ValueError): self.validate(bad, {'mask': {}})
        with self.assertRaises(ValueError): self.validate(scene)
        with self.assertRaises(ValueError): self.validate(scene, {'mask': {}, 'unused': {}})
        plain = self.scene('tile-resolve'); plain['content']['texture'] = 'mask'
        with self.assertRaises(ValueError): self.validate(plain, {'mask': {}})

    def test_mask_installation_preserves_verified_bytes_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); source = root / 'mask.png'
            Image.new('RGB', (80, 60), '#808080').save(source)
            data = {'format': 'square', 'scenes': [self.scene('texture-read')],
                    'assets': {'mask': {'path': 'mask.png', 'sha256': digest(source)}}}
            self.validate(data['scenes'][0], production.validate_assets(data['assets'], root))
            self.assertEqual(production.raster_images(data), {'mask'})
            output = root / 'output'; (output / 'assets').mkdir(parents=True)
            production.install_assets(output, data, root)
            raw = (output / 'assets/production-shader-images.js').read_text()
            encoded = json.loads(raw.removeprefix('window.ShortCreatorShaderImages=Object.freeze(').removesuffix(');\n'))
            self.assertEqual(base64.b64decode(encoded['assets/still-mask.png'].split(',')[1]), source.read_bytes())
            self.assertEqual((output / 'assets/still-mask.png').read_bytes(), source.read_bytes())
            with self.assertRaises(ValueError): production.install_assets(output, data, root)
            html = production.scripts(data, {'colors': branding.PALETTES['violet']})
            self.assertLess(html.index('production-type-advanced.js'), html.index('production-type.js'))
            self.assertIn('production-shader-images.js', html)
            source.write_bytes(b'changed test fixture')
            with self.assertRaises(ValueError): production.validate_assets(data['assets'], root)

    def test_layered_layout_and_timing_keep_existing_constraints(self):
        scene = self.scene('rise'); scene['content'].update(layout='layered-emphasis', backdrop_word='CLEAR')
        self.validate(scene)
        for value in ('two words', '', 'x' * 17, None):
            bad = copy.deepcopy(scene); bad['content']['backdrop_word'] = value
            with self.assertRaises(ValueError): self.validate(bad)
        with self.assertRaises(ValueError):
            production.validate_scenes([self.scene('tile-resolve')], {}, [{'start': .8, 'end': 1}], 1.5)


if __name__ == '__main__':
    unittest.main()
