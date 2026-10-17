import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest

import branding
import font_motion
from tools.font_library import kit


class VariableTypeTests(unittest.TestCase):
    def test_closed_content(self):
        c = {'style': 'weight-wave', 'phrases': ['LIGHT', 'HEAVY'], 'label': 'Explicit words'}
        self.assertEqual(font_motion.validate(c), 2)
        for key, value in [('style', 'arbitrary'), ('phrases', ['one']), ('phrases', ['x'*19, 'ok']),
                           ('font', '../other.ttf'), ('axes', {'wght': 9999}), ('label', 'line\nbreak')]:
            row = {**c, key: value}
            with self.subTest(key=key), self.assertRaises(ValueError): font_motion.validate(row)

    def test_axis_metadata_cannot_disagree_with_pinned_binary(self):
        with tempfile.TemporaryDirectory() as temp:
            home=Path(temp);shutil.copytree(kit.HOME/'vendor',home/'vendor')
            target=home/'vendor/manifest.json'
            data=json.loads(target.read_text())
            row=next(v for v in data['fonts'].values() if 'axes' in v)
            row['axes'][0]['maximum']+=1
            target.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError,'axes disagree'):kit.verify_assets(home)

    def test_approved_real_variable_font_is_required_and_copied_bytes_are_checked(self):
        for display, success in [('font:recursive-sans-linear-light-variable-7623ffd5',True),('font:geist-bold',False)]:
            with self.subTest(display=display), tempfile.TemporaryDirectory() as temp:
                root=Path(temp)/'channel';out=Path(temp)/'run'
                brand={'version':1,'channel':'Type QA','language':'en-US','audience':'Internal',
                       'tone':'Clear','scene_count':3,'colors':dict(branding.PALETTES['graphite']),'logo_style':'wordmark'}
                branding.create(root,brand,{'display':display,'body':'font:inter-regular','mono':'font:jetbrains-mono-regular'})
                branding.approve(root,'test-lock')
                shutil.copytree(root/'brand/assets',out/'assets')
                rows=[{'kind':'variable-type','content':{'style':'weight-wave'}}]
                if not success:
                    with self.assertRaisesRegex(ValueError,'real variable'):font_motion.install(out,rows,root,'test-lock')
                    self.assertFalse((out/'assets/production-variable-font.js').exists())
                    continue
                font_motion.install(out,rows,root,'test-lock')
                config=(out/'assets/production-variable-font.js').read_text()
                self.assertIn('"slnt"',config)
                with self.assertRaises(FileExistsError):font_motion.install(out,rows,root,'test-lock')
                font=branding.fonts_in(out/'assets')['display'];font.write_bytes(b'changed')
                with self.assertRaisesRegex(ValueError,'differs from approved'):font_motion.install(out,rows,root,'test-lock')
