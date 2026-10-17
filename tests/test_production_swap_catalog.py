import unittest

import production_visuals as production


class CatalogSwapContracts(unittest.TestCase):
    def setUp(self):
        self.captions = [{'start': .1 + 2 * i, 'end': 1.5 + 2 * i} for i in range(3)]
        self.assets = {'first': {}, 'second': {}, 'third': {}}

    def scene(self, kind):
        return {'kind': 'screen', 'name': 'Internal swap fixture', 'first_cue': 0,
                'cues': [0, 1, 2], 'transition': 'cut-left', 'content': {
                    'heading': 'Local images', 'caption': 'Internal test', 'chrome': 'browser',
                    'images': list(self.assets), 'swap': kind}}

    def validate(self, scene):
        return production.validate_scenes([scene], self.assets, self.captions, 7)

    def test_all_catalog_swaps_use_existing_screen_schema(self):
        self.assertEqual(len(production.CATALOG_SWAPS), 45)
        self.assertEqual(len(set(production.SCREEN_SWAPS)), len(production.SCREEN_SWAPS))
        for kind in production.CATALOG_SWAPS:
            self.assertEqual(self.validate(self.scene(kind)), [(0, 7)])

    def test_catalog_does_not_open_paths_scripts_colors_or_timings(self):
        for key, value in [('swap', 'catalog-custom'), ('html', '<div>'), ('color', '#ff0000'),
                           ('duration', 3), ('images', ['first', 'second', '../third']),
                           ('images', ['first', 'second', 'https://example.test/image.png'])]:
            scene = self.scene(production.CATALOG_SWAPS[0]);scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.validate(scene)
        for cues in ([0], [0, 1], [0, 0, 1]):
            scene = self.scene(production.CATALOG_SWAPS[0]);scene['cues'] = cues
            with self.subTest(cues=cues), self.assertRaises(ValueError): self.validate(scene)

    def test_scripts_escape_episode_copy_and_keep_catalog_runtime_local(self):
        scene = self.scene(production.CATALOG_SWAPS[0]);scene['content']['heading'] = '</script> supplied copy'
        data = {'format': 'square', 'scenes': [scene], 'assets': {name: {'path': name+'.png'} for name in self.assets}}
        script = production.scripts(data, {'colors': {'accent': '#aabbcc'}})
        self.assertNotIn('</script> supplied copy', script)
        self.assertIn('\\u003c/script> supplied copy', script)
        self.assertEqual(script.count('src="assets/production-swap-catalog.js"'), 1)
        self.assertNotIn('https://', script)


if __name__ == '__main__':
    unittest.main()
