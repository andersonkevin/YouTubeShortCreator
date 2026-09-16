"""Wave 03 asset library: palettes, motion recipes and the private study build."""
import json
from pathlib import Path
import re
import tempfile
import unittest

from tools.visual_library import kit
from tools.visual_library.expansion.wave02 import build as wave02
from tools.visual_library.expansion.wave03 import build, layouts, palettes

HOME = build.HOME


class Wave03PaletteTests(unittest.TestCase):
    def test_palette_file_matches_generator_and_rules(self):
        data = palettes.load()
        self.assertEqual(data, json.loads(json.dumps(palettes.generate())))
        self.assertEqual(len(data['palettes']), 2 * len(palettes.FAMILIES))
        for name, palette in data['palettes'].items():
            self.assertEqual(palettes.check(palettes.tokens(palette)), [], name)
            self.assertEqual(set(palettes.tokens(palette)), set(wave02.load_tokens()['palettes']['study']))

    def test_every_family_has_both_modes_and_distinct_colors(self):
        data = palettes.load()
        for name, _, _, _ in palettes.FAMILIES:
            self.assertIn(f'{name}-dark', data['palettes'])
            self.assertIn(f'{name}-light', data['palettes'])
        backgrounds = [p['background'] for p in data['palettes'].values()]
        self.assertEqual(len(set(backgrounds)), len(backgrounds))

    def test_rules_reject_low_contrast(self):
        study = dict(wave02.load_tokens()['palettes']['study'])
        self.assertEqual(palettes.check(study), [])
        study['muted'] = '#303a40'
        self.assertTrue(any('muted/background' in f for f in palettes.check(study)))
        study['accent'] = study['ink']
        self.assertTrue(any('accent vs ink' in f for f in palettes.check(study)))

    def test_contrast_math(self):
        self.assertAlmostEqual(palettes.contrast('#000000', '#ffffff'), 21.0, places=2)
        self.assertAlmostEqual(palettes.contrast('#777777', '#777777'), 1.0, places=6)
        self.assertGreater(palettes.delta_e('#ff0000', '#0000ff'), 50)
        self.assertLess(palettes.delta_e('#ff0000', '#fe0000'), 1)

    def test_merged_tokens_keep_first_expansion_names(self):
        tokens, extra = build.merged_tokens()
        self.assertIn('study', tokens['palettes'])
        self.assertEqual(len(tokens['palettes']), 2 + len(extra['palettes']))
        self.assertNotIn('mode', tokens['palettes']['mint-dark'])


class Wave03MotionTests(unittest.TestCase):
    def test_recipes_match_between_json_and_script(self):
        data = build.recipes()
        names = [r['name'] for r in data['recipes']]
        self.assertEqual(len(names), 10)
        source = (HOME / 'motion.js').read_text()
        self.assertEqual(re.findall(r"define\('([a-z0-9-]+)'", source), names)
        self.assertNotIn('#', re.sub(r'//.*', '', source).replace("'#'", ''))
        for recipe in data['recipes']:
            self.assertLessEqual(recipe['duration'], 4)
            self.assertIn(f"if (t >= {recipe['duration']}) return done(items);", source, recipe['name'])

    def test_recipe_drift_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name in ('motion.js', 'motion.json'):
                (root / name).write_text((HOME / name).read_text())
            data = json.loads((root / 'motion.json').read_text())
            data['recipes'][0]['duration'] = 9.9
            (root / 'motion.json').write_text(json.dumps(data))
            with unittest.mock.patch.object(build, 'HOME', root):
                with self.assertRaises(ValueError):
                    build.recipes()


class Wave03BuildTests(unittest.TestCase):
    def test_build_is_private_offline_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            output = build.build('review', True, root)
            page = output.read_text()
            self.assertIn('window.VisualMotion', page)
            self.assertIn("default-src 'none'", page)
            self.assertNotIn('/Users/', page)
            record = json.loads((output.parent / 'build.json').read_text())
            self.assertEqual(record['wave'], 3)
            self.assertEqual(len(record['recipes']), 10)
            self.assertGreaterEqual(len(record['layouts']), 18)
            self.assertIn('<section class="frame"', (output.parent / 'layouts.html').read_text())
            self.assertEqual(len(record['wave03_palettes']), 2 * len(palettes.FAMILIES))
            self.assertFalse(record['production_integration'])
            self.assertIn('wave02.js', record['implementation_hashes'])
            sheet = (output.parent / 'palettes.html').read_text()
            self.assertIn("default-src 'none'", sheet)
            self.assertNotIn('<script', sheet)
            with self.assertRaisesRegex(ValueError, 'already exists'):
                build.build('review', True, root)
            with self.assertRaisesRegex(ValueError, 'Unknown palette'):
                build.build('other', True, root, palette='neon')
            self.assertFalse((root / 'visuals' / 'other').exists())

    def test_writer_preflight(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            for run_id, approved in (('review', False), ('../bad', True), (None, True)):
                with self.assertRaises(ValueError):
                    build.build(run_id, approved, root)
            with self.assertRaises(ValueError):
                build.build('review', True, kit.HOME)
            self.assertEqual(list(root.iterdir()), [])

    def test_release_audit_includes_wave03(self):
        from tools import release
        names = {str(p.relative_to(release.HOME)) for p in release.files()}
        for name in ('tools/visual_library/expansion/wave03/palettes.py', 'tools/visual_library/expansion/wave03/palettes.json',
                     'tools/visual_library/expansion/wave03/motion.js', 'tools/visual_library/expansion/wave03/motion.json',
                     'tools/visual_library/expansion/wave03/qa.mjs', 'tools/visual_library/expansion/wave03/layouts.json',
                     'tools/visual_library/expansion/wave03/layouts.py', 'tools/visual_library/expansion/wave03/layouts-qa.mjs', 'tests/test_visual_wave03.py'):
            self.assertIn(name, names)

    def test_qa_script_boundaries(self):
        qa = (HOME / 'qa.mjs').read_text()
        for needle in ("route(/^https?:/", "'--approve-write'", 'end state differs', 'non-deterministic', 'Color outside the token set', 'same frame at 0.8 s', 'render ${id} with the same colors'):
            self.assertIn(needle, qa)
        self.assertNotIn('fetch(', qa)
        lq = (HOME / 'layouts-qa.mjs').read_text()
        for needle in ("route(/^https?:/", "'--approve-write'", 'overflows its zone', 'leaves the safe box', 'overlap as rendered', 'does not fill the visual zone'):
            self.assertIn(needle, lq)
        self.assertNotIn('fetch(', lq)


class Wave03LayoutTests(unittest.TestCase):
    def setUp(self):
        self.data = layouts.load()

    def layout(self, id='classic'):
        return json.loads(json.dumps(next(l for l in json.loads((HOME / 'layouts.json').read_text())['layouts'] if l['id'] == id)))

    def reject(self, layout, message):
        with self.assertRaisesRegex(ValueError, message):
            layouts.validate_layout(layout)

    def test_layout_file_passes_and_is_diverse(self):
        self.assertGreaterEqual(len(self.data['layouts']), 18)
        for layout in self.data['layouts']:
            self.assertEqual(layout['status'], 'design_review')
            self.assertFalse(layout['production_scene_available'])
            self.assertGreaterEqual(layout['scale'], 1.0)
        self.assertEqual(len({l['id'] for l in self.data['layouts']}), len(self.data['layouts']))

    def test_layout_rejections(self):
        layout = self.layout(); layout['zones'].append({'role': 'visual', 'x': 100, 'y': 200, 'w': 824, 'h': 820}); self.reject(layout, 'Exactly one visual')
        layout = self.layout(); visual = next(z for z in layout['zones'] if z['role'] == 'visual'); visual['w'], visual['h'] = 700, 697; self.reject(layout, 'shorter than 820|never shrink')
        layout = self.layout(); visual = next(z for z in layout['zones'] if z['role'] == 'visual'); visual['h'] = 900; self.reject(layout, 'slot aspect')
        layout = self.layout(); caption = next(z for z in layout['zones'] if z['role'] == 'caption'); caption['y'] = 1750; self.reject(layout, 'safe box')
        layout = self.layout(); title = next(z for z in layout['zones'] if z['role'] == 'title'); title['y'] = 600; self.reject(layout, 'overlap')
        layout = self.layout(); layout['zones'] = [z for z in layout['zones'] if z['role'] != 'caption']; self.reject(layout, 'caption zone')
        layout = self.layout(); layout['zones'][0]['role'] = 'logo'; self.reject(layout, 'Unknown zone role')
        layout = self.layout(); layout['zones'][0]['x'] = 1.5; self.reject(layout, 'integer')

    def test_layout_page_has_no_scripts_and_every_frame(self):
        tokens, _ = build.merged_tokens()
        page = build.layout_page(self.data, tokens['palettes']['study'])
        self.assertNotIn('<script', page)
        self.assertIn("default-src 'none'", page)
        for layout in self.data['layouts']:
            self.assertIn(f'data-layout="{layout["id"]}"', page)
        self.assertEqual(page.count('data-role="visual-image"'), len(self.data['layouts']))


import unittest.mock  # noqa: E402

if __name__ == '__main__':
    unittest.main()
