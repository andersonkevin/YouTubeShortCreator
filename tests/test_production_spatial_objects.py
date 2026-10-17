import copy
import unittest

import branding
import production_visuals as production


class SpatialObjectContracts(unittest.TestCase):
    def setUp(self):
        self.cues = [{'start': .1 + i * 2, 'end': 1 + i * 2} for i in range(6)]
        self.icon = next(iter(production.kit.verify_assets()['icons']))

    def stack(self, count=4):
        return {'kind': 'spatial-stage', 'name': 'Layered system', 'first_cue': 0, 'cues': list(range(count)),
                'transition': 'cut-left', 'content': {'style': 'exploded-stack', 'heading': 'Four layers',
                'caption': 'An internal diagram.', 'source': 'Supplied architecture',
                'layers': [{'label': name, 'icon': self.icon} for name in ['Interface', 'Gateway', 'Services', 'Data']]}}

    def product(self):
        return {'kind': 'spatial-stage', 'name': 'Product mockup', 'first_cue': 0, 'cues': [0, 3],
                'transition': 'cut-left', 'content': {'style': 'product-turntable', 'heading': 'A label mockup',
                'caption': 'Internal design test.', 'source': 'Supplied label image', 'image': 'label'}}

    def validate(self, scene, assets=None):
        return production.validate_scenes([scene], assets or {}, self.cues, 13)

    def test_orbit_card_requires_verified_still_and_four_second_cue_gap(self):
        scene = self.product(); scene['content']['style'] = 'orbit-card'; scene['cues'] = [0, 2]
        self.assertEqual(self.validate(scene, {'label': {}}), [(0, 13)])
        with self.assertRaises(ValueError): self.validate(scene)
        for value in ['../label', 'https://example.invalid/image.png', []]:
            bad = copy.deepcopy(scene); bad['content']['image'] = value
            with self.assertRaises(ValueError): self.validate(bad, {'label': {}})
        scene['cues'] = [0, 1]
        with self.assertRaises(ValueError): self.validate(scene, {'label': {}})

    def test_orbit_source_is_loaded_only_when_selected_before_shared_objects(self):
        scene = self.product(); scene['content']['style'] = 'orbit-card'
        brand = {'colors': branding.PALETTES['violet']}
        for profile in ('landscape', 'portrait', 'square', 'portrait-4x5'):
            data = {'format': profile, 'scenes': [scene, copy.deepcopy(scene)], 'assets': {'label': {'path': 'label.png'}}}
            html = production.scripts(data, brand)
            self.assertEqual(html.count('src="assets/production-orbit-card.js"'), 1)
            self.assertLess(html.index('src="assets/production-orbit-card.js"'), html.index('src="assets/production-spatial-objects.js"'))
        data['scenes'] = [self.product()]
        self.assertNotIn('src="assets/production-orbit-card.js"', production.scripts(data, brand))

    def test_stack_requires_four_explicit_layers_and_optional_closing_cue(self):
        for count in (4, 5):
            scene = self.stack(count); before = copy.deepcopy(scene)
            self.assertEqual(self.validate(scene), [(0, 13)]); self.assertEqual(scene, before)
        for count in (1, 3, 6):
            with self.assertRaises(ValueError): self.validate(self.stack(count))
        for edit in [lambda s: s.update(cues=None), lambda s: s['content']['layers'].pop(),
                     lambda s: s['content']['layers'][0].update(label='Data'),
                     lambda s: s['content']['layers'][0].update(icon=[]),
                     lambda s: s['content']['layers'][0].update(label='x' * 23)]:
            scene = self.stack(); edit(scene)
            with self.assertRaises(ValueError): self.validate(scene)

    def test_product_uses_verified_asset_and_at_least_six_seconds_of_travel(self):
        scene = self.product(); self.assertEqual(self.validate(scene, {'label': {}}), [(0, 13)])
        with self.assertRaises(ValueError): self.validate(scene)
        with self.assertRaises(ValueError): self.validate(scene, {'label': {}, 'unused': {}})
        scene['cues'] = [0, 2]
        with self.assertRaises(ValueError): self.validate(scene, {'label': {}})
        scene['cues'] = [0, 3]; scene['content']['image'] = '../label'
        with self.assertRaises(ValueError): self.validate(scene, {'label': {}})

    def test_objects_reject_source_urls_models_fonts_and_unbounded_controls(self):
        for factory in (self.stack, self.product):
            for key, value in [('model_url', 'remote.glb'), ('model', 'local.glb'), ('font', 'Inter'), ('turns', 4),
                               ('camera', {}), ('shader', 'void main(){}'), ('background', '#fff'), ('duration', 600)]:
                scene = factory(); scene['content'][key] = value
                assets = {'label': {}} if factory == self.product else {}
                with self.subTest(key=key), self.assertRaises(ValueError): self.validate(scene, assets)

    def test_compiler_connects_native_styles_and_only_one_shared_runtime(self):
        brand = {'colors': branding.PALETTES['violet']}
        for profile in ('landscape', 'portrait', 'square', 'portrait-4x5'):
            data = {'format': profile, 'scenes': [self.stack(), self.product()], 'assets': {'label': {'path': 'label.png'}}}
            html = production.scripts(data, brand)
            self.assertEqual(html.count('src="assets/production-spatial-objects.js"'), 1)
            self.assertEqual(html.count('src="assets/production-three-runtime.js"'), 1)
            self.assertEqual(html.count('src="assets/production-gpu-backdrops.js"'), 1)
            self.assertNotIn('src="assets/production-gpu-runtime.js"', html)
            self.assertIn('data:image/svg+xml;base64,', html)
        data['scenes'] = []; data['assets'] = {}
        self.assertNotIn('production-three-runtime.js', production.scripts(data, brand))
        self.assertNotIn('production-spatial-objects.js', production.scripts(data, brand))


if __name__ == '__main__':
    unittest.main()
