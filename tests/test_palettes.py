"""Brand palette presets: every preset satisfies the brand rules and the generated families match the study."""
import contextlib
import io
import json
from pathlib import Path
import unittest

import branding
import ysc

HOME = Path(__file__).resolve().parents[1]


class PaletteTests(unittest.TestCase):
    def brand(self, colors):
        return {'version': 1, 'channel': 'Signal Lab', 'language': 'en-US', 'audience': 'Anyone', 'tone': 'Clear', 'scene_count': 3, 'colors': dict(colors), 'logo_style': 'wordmark'}

    def test_every_preset_passes_the_brand_rules(self):
        self.assertGreaterEqual(len(branding.PALETTES), 15)
        for name, colors in branding.PALETTES.items():
            branding.validate_brand(self.brand(colors))
            self.assertGreaterEqual(branding.contrast(colors['accent'], colors['background']), 4.5, name)
            self.assertGreaterEqual(branding.contrast(colors['secondary'], colors['background']), 4.5, name)

    def test_generated_families_match_the_palette_study(self):
        study = json.loads((HOME / 'tools/visual_library/expansion/wave03/palettes.json').read_text())['palettes']
        dark = {name: p for name, p in study.items() if p['mode'] == 'dark'}
        self.assertEqual(len(dark), 12)
        for name, p in dark.items():
            self.assertEqual(branding.PALETTES[name], {'background': p['background'], 'accent': p['accent'], 'secondary': p['accent2']}, name)
        for name, p in study.items():
            if p['mode'] == 'light':
                self.assertNotIn(name, branding.PALETTES)

    def test_palette_table_and_command(self):
        rows = branding.palette_table()
        self.assertEqual([r['name'] for r in rows], list(branding.PALETTES))
        for row in rows:
            self.assertGreaterEqual(row['white_contrast'], 7)
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = ysc.main(['--workspace', str(HOME / 'workspaces' / 'no-such-workspace'), 'palettes'])
        self.assertEqual(code, 0)
        text = output.getvalue()
        for name in branding.PALETTES:
            self.assertIn(name, text)
        self.assertNotIn('Traceback', text)


if __name__ == '__main__':
    unittest.main()
