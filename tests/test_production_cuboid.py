import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

import branding
import production_visuals as production
from tools.vendor_cuboid import bundle


class CuboidContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'spatial-stage', 'name': 'Cuboid', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                'content': {'style': 'cuboid-carousel', 'heading': 'Ideas', 'caption': 'Choose the next step',
                            'source': 'Internal test', 'hero': 1,
                            'cards': [{'category': 'Process', 'title': 'Build the next step', 'pills': ['Draft']}]}}

    def validate(self, scene, second=5.1, duration=9):
        return production.validate_scenes([scene], {}, [{'start': .1, 'end': 1}, {'start': second, 'end': second + .5}], duration)

    def test_explicit_card_count_and_one_based_hero_selection(self):
        for count in [1, 4, 8, 12]:
            for hero in [1, count]:
                scene = self.scene();scene['content']['cards'] *= count;scene['content']['hero'] = hero
                before = copy.deepcopy(scene);self.assertEqual(self.validate(scene), [(0, 9)]);self.assertEqual(scene, before)
        for key, value in [('hero', 0), ('hero', 2), ('hero', True), ('hero', 1.0), ('cards', []), ('cards', [{}] * 13)]:
            scene = self.scene();scene['content'][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):self.validate(scene)

    def test_card_copy_is_exact_bounded_and_not_a_shader_or_remote_input(self):
        for field, value in [('font', 'Other'), ('image', 'https://example.invalid/a.png'), ('camera', {}),
                             ('title', 'A' * 49), ('category', 'A' * 19), ('title', 'A  B'),
                             ('title', 'e\u0301'), ('pills', []), ('pills', ['A'] * 3), ('pills', ['A' * 13])]:
            scene = self.scene();scene['content']['cards'][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):self.validate(scene)
        for field in ['shader', 'font', 'roughness', 'count']:
            scene = self.scene();scene['content'][field] = 'untrusted'
            with self.assertRaises(ValueError):self.validate(scene)

    def test_departure_preserves_fifty_frames_and_the_scene_exit_margin(self):
        with self.assertRaises(ValueError):self.validate(self.scene(), second=5.066)
        with self.assertRaises(ValueError):self.validate(self.scene(), duration=7.5)
        self.assertEqual(self.validate(self.scene(), duration=8), [(0, 8)])

    def test_compiler_conditionally_loads_one_local_bundle_without_font_or_media_override(self):
        scene = self.scene();brand = {'colors': branding.PALETTES['violet']}
        for profile in production.COMPOSITION_FORMATS:
            data = {'format': profile, 'scenes': [scene, copy.deepcopy(scene)], 'assets': {}}
            html = production.scripts(data, brand)
            for name in ['production-cuboid-data', 'production-cuboid-motion', 'production-cuboid', 'production-three-runtime', 'production-spatial-objects']:
                self.assertEqual(html.count('src="assets/' + name + '.js"'), 1)
            self.assertNotIn('production-portal-outlines', html);self.assertNotIn('src="https:', html)
            self.assertEqual(production.raster_images(data), set())
        data['scenes'] = [];self.assertNotIn('production-cuboid', production.scripts(data, brand))

    def test_converter_rejects_unpinned_missing_and_symlinked_sources(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(ValueError):bundle(root)
            (root / 'cuboid-carousel.html').write_text('unreviewed')
            with self.assertRaises(ValueError):bundle(root)
            alias = root / 'alias';alias.symlink_to(root, target_is_directory=True)
            with self.assertRaises(ValueError):bundle(alias)

    def test_optional_source_rebuild_preserves_all_original_inputs(self):
        root = Path(__file__).resolve().parents[1]
        source = root.parents[1] / 'registry/blocks/cuboid-carousel'
        if not source.is_dir():self.skipTest('Upstream checkout is optional for consumers')
        before = {str(p.relative_to(source)): hashlib.sha256(p.read_bytes()).hexdigest() for p in source.rglob('*') if p.is_file()}
        for name, output in bundle(source).items():self.assertEqual(output, (root / 'templates/v1/assets' / name).read_text())
        self.assertEqual(before, {str(p.relative_to(source)): hashlib.sha256(p.read_bytes()).hexdigest() for p in source.rglob('*') if p.is_file()})


if __name__ == '__main__':
    unittest.main()
