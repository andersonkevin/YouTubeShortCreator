import copy
import unittest

import branding
import production_visuals as production


class CanopyContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'spatial-stage', 'name': 'Canopy title', 'first_cue': 0, 'cues': [0, 1],
                'transition': 'cut-left', 'content': {'style': 'canopy-part-title', 'heading': 'NEW GROWTH',
                'caption': 'IDEAS TAKE ROOT', 'source': 'Supplied local textures', 'surface': 'color', 'normal': 'normal'}}

    def validate(self, scene, assets=None, second=12.1):
        return production.validate_scenes([scene], assets if assets is not None else {'color': {}, 'normal': {}},
                                         [{'start': .1, 'end': 1}, {'start': second, 'end': second + .8}], 16)

    def test_two_distinct_headlines_and_two_verified_texture_roles(self):
        scene = self.scene();before = copy.deepcopy(scene)
        self.assertEqual(self.validate(scene), [(0, 16)]);self.assertEqual(scene, before)
        for assets in [{}, {'color': {}}, {'normal': {}}, {'color': {}, 'normal': {}, 'unused': {}}]:
            with self.assertRaises(ValueError): self.validate(scene, assets)
        for field, value in [('normal', 'color'), ('surface', '../color'), ('normal', 'https://example.invalid/a.png'),
                             ('normal', []), ('caption', 'NEW GROWTH'), ('heading', 'A' * 25),
                             ('caption', 'A  B'), ('heading', 'e\u0301'), ('caption', '\u4e2d')]:
            bad = copy.deepcopy(scene);bad['content'][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError): self.validate(bad)

    def test_native_timing_and_input_controls_remain_closed(self):
        with self.assertRaises(ValueError): self.validate(self.scene(), second=12)
        for key, value in [('font', 'Other font'), ('leafCount', 1000), ('breeze', 2), ('shader', 'code'),
                           ('camera', {}), ('background', '#fff'), ('image', 'remote.png')]:
            scene = self.scene();scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.validate(scene)

    def test_canopy_loads_one_local_runtime_and_shared_approved_outline_bundle(self):
        scene = self.scene();brand = {'colors': branding.PALETTES['violet']}
        for profile in production.COMPOSITION_FORMATS:
            data = {'format': profile, 'scenes': [scene, copy.deepcopy(scene)],
                    'assets': {'color': {'path': 'color.png'}, 'normal': {'path': 'normal.png'}}}
            html = production.scripts(data, brand)
            for name in ['production-canopy', 'production-canopy-motion', 'production-canopy-bokeh',
                         'production-three-runtime', 'production-extruded-logo', 'production-portal-outlines',
                         'production-shader-images', 'production-spatial-objects']:
                self.assertEqual(html.count('src="assets/' + name + '.js"'), 1)
            self.assertNotIn('src="https:', html)
            self.assertEqual(production.raster_images(data), {'color', 'normal'})
        data['scenes'] = [];data['assets'] = {}
        self.assertNotIn('production-canopy', production.scripts(data, brand))
        self.assertNotIn('production-portal-outlines', production.scripts(data, brand))

    def test_portal_and_canopy_share_only_one_normalized_font_payload(self):
        canopy = self.scene()
        portal = copy.deepcopy(canopy);portal['content'] = {'style': 'wireframe-portal-title', 'heading': 'New ideas',
            'caption': 'Approved type', 'source': 'Internal test', 'word': 'SIGNAL', 'phrase': 'New perspective'}
        html = production.scripts({'format': 'square', 'scenes': [canopy, portal], 'assets': {}}, {'colors': branding.PALETTES['violet']})
        self.assertEqual(html.count('src="assets/production-portal-outlines.js"'), 1)
        self.assertEqual(html.count('src="assets/production-extruded-logo.js"'), 1)


if __name__ == '__main__':
    unittest.main()
