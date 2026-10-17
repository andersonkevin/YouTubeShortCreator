import copy
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import branding
import font_outlines as outlines
import production_visuals as production
from safety import digest


class ApprovedOutlines(unittest.TestCase):
    def geometry(self):
        return {'version': 1, 'units': 1000, 'postscript_name': 'UnitFixture', 'glyphs': {
            'A': {'advance': 700, 'commands': [['M', 0, 0], ['L', 350, 700], ['L', 700, 0], ['Z']]}}}

    def fixture(self, root):
        brand = root / 'channel'
        record = {'version': 1, 'channel': 'Outline Fixture', 'language': 'en-US', 'audience': 'Internal tests',
                  'tone': 'Clear', 'scene_count': 3, 'colors': dict(branding.PALETTES['violet']), 'logo_style': 'wordmark'}
        branding.create(brand, record, {'display': 'font:geist-bold', 'body': 'font:inter-regular', 'mono': 'font:jetbrains-mono-regular'})
        branding.approve(brand, 'unit-test-template')
        output = root / 'run';(output / 'assets').mkdir(parents=True)
        display = branding.fonts_in(brand / 'brand/assets')['display']
        shutil.copyfile(display, output / 'assets' / display.name)
        return brand, output, output / 'assets' / display.name

    def install(self, output, brand, runtime=None):
        outlines.install(output, ['A'], brand, 'unit-test-template', runtime or {'swift': __file__})

    def test_exact_copy_and_unicode_contract(self):
        for word in ['B8O', 'Café', 'Ab C', 'COGNATIV', '12.5%']:
            self.assertEqual(outlines.validate_word(word), word)
        for word in ['', ' A', 'A ', 'e\u0301', 'x' * 9, '\nA', 'A\tB', '\u200bA', '字', None, []]:
            with self.subTest(word=word), self.assertRaises(ValueError): outlines.validate_word(word)

    def test_geometry_rejects_unbounded_malformed_and_missing_contours(self):
        self.assertEqual(outlines.validate_geometry(self.geometry(), 'A'), self.geometry())
        for commands in [[], [['L', 0, 0]], [['M', 0, 0]], [['M', 0, 0], ['M', 1, 1]],
                         [['M', 0, 0], ['Z', 1]], [['M', 0, 0], ['X']],
                         [['M', float('nan'), 0], ['Z']], [['M', 10001, 0], ['Z']]]:
            data = self.geometry();data['glyphs']['A']['commands'] = commands
            with self.assertRaises(ValueError): outlines.validate_geometry(data, 'A')
        with self.assertRaises(ValueError): outlines.validate_geometry(self.geometry(), 'B')
        data = self.geometry();data['glyphs']['A']['advance'] = True
        with self.assertRaises(ValueError): outlines.validate_geometry(data, 'A')

    def test_writer_pins_copied_font_uses_owned_snapshot_and_never_overwrites(self):
        with tempfile.TemporaryDirectory() as folder:
            brand, output, display = self.fixture(Path(folder));before = digest(brand / 'brand/approval.json')
            def run(command, **kwargs):
                self.assertEqual(digest(Path(command[-2])), digest(display))
                self.assertNotEqual(Path(command[-2]), display)
                self.assertEqual(command[-1], 'A');self.assertNotIn('shell', kwargs)
                return subprocess.CompletedProcess(command, 0, json.dumps(self.geometry()).encode(), b'')
            with patch('font_outlines.subprocess.run', side_effect=run) as process:
                self.install(output, brand)
                saved = (output / 'assets/production-font-outlines.js').read_bytes()
                with self.assertRaisesRegex(ValueError, 'already exists'): self.install(output, brand)
                self.assertEqual(process.call_count, 1)
            self.assertIn(digest(display).encode(), saved)
            self.assertEqual(before, digest(brand / 'brand/approval.json'))
            self.assertEqual(saved, (output / 'assets/production-font-outlines.js').read_bytes())

    def test_writer_rejects_copy_drift_symlink_and_missing_approval_before_invocation(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);brand, output, display = self.fixture(root)
            with patch('font_outlines.subprocess.run') as process:
                with self.assertRaises(ValueError): outlines.install(output, ['A'], brand, 'wrong-template', {'swift': __file__})
                with self.assertRaises(ValueError): self.install(output, brand, {'swift': '../runtime'})
                display.write_bytes(b'changed')
                with self.assertRaisesRegex(ValueError, 'differs from approved'): self.install(output, brand)
                link_output = root / 'linked';(link_output / 'assets').mkdir(parents=True)
                (link_output / 'assets'/display.name).symlink_to(brand/'brand/assets'/display.name)
                with self.assertRaisesRegex(ValueError, 'Symlink'): self.install(link_output, brand)
                process.assert_not_called()

    def test_failed_decoder_and_malformed_output_never_publish_bundle(self):
        for result in [subprocess.CompletedProcess([], 1, b'', b'Missing glyph'),
                       subprocess.CompletedProcess([], 0, b'{"version":1,"version":1}', b''),
                       subprocess.CompletedProcess([], 0, b'{}', b'')]:
            with tempfile.TemporaryDirectory() as folder:
                brand, output, _ = self.fixture(Path(folder))
                with patch('font_outlines.subprocess.run', return_value=result), self.assertRaises(ValueError): self.install(output, brand)
                self.assertFalse((output/'assets/production-font-outlines.js').exists())

    def test_nonzero_mode_keeps_a_separate_private_bundle_and_qualified_font(self):
        with tempfile.TemporaryDirectory() as folder:
            brand, output, display = self.fixture(Path(folder))
            def run(command, **kwargs):
                self.assertEqual(command[-1], '--nonzero')
                self.assertEqual(command[-2], 'A'); self.assertEqual(digest(Path(command[-3])), digest(display))
                return subprocess.CompletedProcess(command, 0, json.dumps(self.geometry()).encode(), b'')
            with patch('font_outlines.subprocess.run', side_effect=run):
                outlines.install(output, ['A'], brand, 'unit-test-template', {'swift': __file__}, nonzero=True)
                with self.assertRaisesRegex(ValueError, 'already exists'):
                    outlines.install(output, ['A'], brand, 'unit-test-template', {'swift': __file__}, nonzero=True)
            bundle = (output/'assets/production-portal-outlines.js').read_text()
            self.assertIn('ShortCreatorPortalOutlines', bundle); self.assertIn('"normalization":"nonzero"', bundle)
            self.assertFalse((output/'assets/production-font-outlines.js').exists())

    def test_portal_copy_limits_do_not_expand_the_existing_extrusion_contract(self):
        self.assertEqual(outlines.validate_copy('A longer portal phrase', 48), 'A longer portal phrase')
        with self.assertRaises(ValueError): outlines.validate_word('A longer portal phrase')
        for limit in [9, 1000, None]:
            with self.assertRaises(ValueError): outlines.validate_copy('A', limit)


class PortalContract(unittest.TestCase):
    def scene(self):
        return {'kind': 'spatial-stage', 'name': 'Portal', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                'content': {'style': 'wireframe-portal-title', 'heading': 'A new perspective', 'caption': 'Exact approved letterforms',
                            'source': 'Internal visual test', 'word': 'Signal', 'phrase': 'Beyond the frame'}}

    def validate(self, scene, gap=8):
        return production.validate_scenes([scene], {}, [{'start': .115, 'end': 1}, {'start': .115+gap, 'end': 1+gap}], 12)

    def test_portal_closed_copy_and_eight_second_source_interval(self):
        scene = self.scene(); before = copy.deepcopy(scene)
        self.assertEqual(self.validate(scene), [(0, 12)]); self.assertEqual(scene, before)
        for key, value in [('word', 'A'*19), ('phrase', 'A'*49), ('heading', 'A'*37), ('caption', 'A'*49),
                           ('word', 'Two  spaces'), ('phrase', '字'), ('font', 'Geist'), ('shader', 'arbitrary'),
                           ('camera', {}), ('color', '#ffffff'), ('image', '../outside.png')]:
            bad = self.scene(); bad['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.validate(bad)
        with self.assertRaises(ValueError): self.validate(scene, 7.999)

    def test_portal_compiler_selects_exact_local_dependencies_in_every_profile(self):
        for profile in production.COMPOSITION_FORMATS:
            data = {'scenes': [self.scene()], 'assets': {}, 'format': profile}
            scripts = production.scripts(data, {'colors': branding.PALETTES['violet']})
            for name in ['production-portal-outlines','production-wireframe-motion','production-wireframe-shaders',
                         'production-wireframe-portal','production-extruded-logo','production-spatial-objects','production-three-runtime']:
                self.assertEqual(scripts.count('src="assets/'+name+'.js"'), 1)
            self.assertNotIn('src="assets/production-font-outlines.js"', scripts)
            self.assertNotIn('https://', scripts)
            data['scenes'].append(ExtrudedContract().scene())
            scripts = production.scripts(data, {'colors': branding.PALETTES['violet']})
            self.assertEqual(scripts.count('src="assets/production-extruded-logo.js"'), 1)
            self.assertEqual(scripts.count('src="assets/production-font-outlines.js"'), 1)


class ExtrudedContract(unittest.TestCase):
    def scene(self):
        return {'kind': 'spatial-stage', 'name': 'Real type', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                'content': {'style': 'extruded-logo', 'heading': 'Type in space', 'caption': 'Internal test',
                            'source': 'Approved display font', 'word': 'B8O Café', 'finish': 'chrome'}}

    def validate(self, scene, gap=5):
        return production.validate_scenes([scene], {}, [{'start': .115, 'end': 1}, {'start': .115+gap, 'end': 1+gap}], 9)

    def test_three_finishes_keep_exact_copy_and_four_format_loading(self):
        for finish in ['chrome', 'accent-metal', 'matte']:
            scene = self.scene();scene['content']['finish'] = finish;before = copy.deepcopy(scene)
            self.assertEqual(self.validate(scene), [(0, 9)]);self.assertEqual(scene, before)
            for profile in production.COMPOSITION_FORMATS:
                scripts = production.scripts({'scenes': [scene], 'assets': {}, 'format': profile}, {'colors': branding.PALETTES['violet']})
                for name in ['production-font-outlines', 'production-extruded-logo', 'production-spatial-objects', 'production-three-runtime']:
                    self.assertEqual(scripts.count('src="assets/'+name+'.js"'), 1)

    def test_closed_inputs_and_minimum_source_motion_time(self):
        for key, value in [('word', 'TOO LONG WORD'), ('word', '字'), ('finish', 'gold'), ('finish', []),
                           ('font', 'Geist'), ('image', '../display.ttf'), ('color', '#123456'), ('duration', 600)]:
            scene = self.scene();scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.validate(scene)
        with self.assertRaises(ValueError): self.validate(self.scene(), 4.999)


if __name__ == '__main__':
    unittest.main()
