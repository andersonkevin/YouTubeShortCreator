import copy
import hashlib
from pathlib import Path
import tempfile
import unittest

import branding
import production_visuals as production
from tools import vendor_devices, vendor_device_motion


class DeviceContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'spatial-stage', 'name': 'Device review', 'first_cue': 0, 'cues': [0, 1],
                'transition': 'cut-left', 'content': {'style': 'device-review', 'heading': 'Two screens',
                'caption': 'One product', 'source': 'Internal test', 'phone': 'mobile', 'laptop': 'desktop'}}

    def validate(self, scene, assets=None, gap=15):
        return production.validate_scenes([scene], assets if assets is not None else {'mobile': {}, 'desktop': {}},
            [{'start': .1, 'end': 1}, {'start': .1 + gap, 'end': 1 + gap}], 19)

    def test_two_distinct_verified_screens_and_fifteen_seconds_of_motion(self):
        scene = self.scene();before = copy.deepcopy(scene)
        self.assertEqual(self.validate(scene), [(0, 19)]);self.assertEqual(scene, before)
        for assets in [{}, {'mobile': {}}, {'mobile': {}, 'desktop': {}, 'unused': {}}]:
            with self.assertRaises(ValueError):self.validate(scene, assets)
        with self.assertRaises(ValueError):self.validate(scene, gap=14.99)
        scene['content']['laptop'] = 'mobile'
        with self.assertRaises(ValueError):self.validate(scene)

    def test_device_inputs_are_closed_and_do_not_accept_models_or_urls(self):
        for field, value in [('phone', '../mobile'), ('laptop', 'https://example.invalid/image'),
                             ('model', 'other.glb'), ('font', 'Other'), ('camera', {}), ('shader', 'void main(){}')]:
            scene = self.scene();scene['content'][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):self.validate(scene)

    def test_native_compiler_loads_one_selected_bundle_and_verified_texture_inputs(self):
        brand = {'colors': branding.PALETTES['violet']}
        for profile in production.COMPOSITION_FORMATS:
            data = {'format': profile, 'scenes': [self.scene(), self.scene()],
                    'assets': {'mobile': {'path': 'a.png'}, 'desktop': {'path': 'b.png'}}}
            html = production.scripts(data, brand)
            for name in ['iphone-data', 'macbook-data', 'models', 'motion', 'review']:
                self.assertEqual(html.count('src="assets/production-device-' + name + '.js"'), 1)
            self.assertEqual(production.raster_images(data), {'mobile', 'desktop'})
            self.assertNotIn('src="https:', html)
        data['scenes'] = [];self.assertNotIn('production-device-', production.scripts(data, brand))

    def test_read_only_converters_reject_unknown_changed_missing_and_symlinked_sources(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp);bad = root / 'model.glb'
            with self.assertRaises(ValueError):vendor_devices.packet(bad, 'iphone')
            bad.write_bytes(b'changed source')
            for name in ['iphone', 'macbook', '../other']:
                with self.assertRaises(ValueError):vendor_devices.packet(bad, name)
            alias = root / 'alias';alias.symlink_to(bad)
            with self.assertRaises(ValueError):vendor_devices.packet(alias, 'iphone')
            with self.assertRaises(ValueError):vendor_device_motion.bundle(bad)
            with self.assertRaises(ValueError):vendor_device_motion.bundle(alias)
            self.assertEqual(bad.read_bytes(), b'changed source')

    def test_optional_upstream_rebuild_keeps_models_and_choreography_exact(self):
        root = Path(__file__).resolve().parents[1];source = root.parents[1] / 'registry/blocks/vfx-iphone-device'
        if not source.is_dir():self.skipTest('Upstream checkout is optional for consumers')
        paths = [source / 'models' / (name + '.glb') for name in vendor_devices.PINS]
        paths.append(source / 'vfx-iphone-device.html')
        before = [hashlib.sha256(p.read_bytes()).hexdigest() for p in paths]
        for name in vendor_devices.PINS:
            self.assertEqual(vendor_devices.bundle(source / 'models' / (name + '.glb'), name),
                (root / 'templates/v1/assets' / ('production-device-' + name + '-data.js')).read_text())
        self.assertEqual(vendor_device_motion.bundle(paths[-1]), (root / 'templates/v1/assets/production-device-motion.js').read_text())
        self.assertEqual(before, [hashlib.sha256(p.read_bytes()).hexdigest() for p in paths])
