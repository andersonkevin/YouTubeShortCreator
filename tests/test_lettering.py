import tempfile
import unittest
from pathlib import Path
import shutil

import branding
import lettering
import production_visuals
from tools import vendor_lettering


class LetteringTests(unittest.TestCase):
    def test_complete_draw_must_fit_both_caption_intervals(self):
        scene = {'kind': 'lettering', 'name': 'Drawn title', 'first_cue': 0,
                 'cues': [0, 1], 'transition': 'cut-right',
                 'content': {'style': 'write-on', 'phrases': ['IDEA', 'SOURCE'], 'label': 'Internal QA'}}
        cues = [{'start': 0.1, 'end': 1}, {'start': 3.5, 'end': 4.5}]
        self.assertEqual(production_visuals.validate_scenes([scene], {}, cues, 8), [(0, 8)])
        with self.assertRaisesRegex(ValueError, 'complete draw'):
            production_visuals.validate_scenes([scene], {}, cues, 7.5)
        cues[1]['start'] = 3.3
        with self.assertRaisesRegex(ValueError, 'complete draw'):
            production_visuals.validate_scenes([scene], {}, cues, 8)

    def test_exact_supported_copy_and_closed_styles(self):
        c={'style':'stitch-coarse','phrases':['ABC 123','SOURCE'],'label':'Internal QA'}
        self.assertEqual(lettering.validate(c),2)
        for key,value in [('phrases',['CAFÉ','SOURCE']),('phrases',['abc','SOURCE']),('phrases',['x'*13,'SOURCE']),
                          ('phrases',['   ','SOURCE']),('style','arbitrary'),('svg','<svg/>'),('label','one\ntwo')]:
            with self.subTest(key=key),self.assertRaises(ValueError):lettering.validate({**c,key:value})
        self.assertEqual(lettering.validate({**c,'style':'write-on','phrases':['Idea','Source']}),2)

    def test_source_painters_are_reproducible_when_archive_is_present(self):
        up=Path(__file__).resolve().parents[3]
        if not (up/'registry/blocks/hw-write-title').exists():self.skipTest('Optional retained archive')
        for name,body in vendor_lettering.build(up).items():
            self.assertEqual((vendor_lettering.ROOT/'templates/v1/assets'/name).read_text(),body)

    def test_handwriting_rejects_a_different_approved_display_font(self):
        for font,success in [('font:caveat-variable-891951df',True),('font:geist-bold',False)]:
            with self.subTest(font=font),tempfile.TemporaryDirectory() as temp:
                root=Path(temp)/'channel';out=Path(temp)/'run'
                b={'version':1,'channel':'Letter QA','language':'en-US','audience':'Internal','tone':'Clear',
                   'scene_count':3,'colors':dict(branding.PALETTES['graphite']),'logo_style':'wordmark'}
                branding.create(root,b,{'display':font,'body':'font:geist-regular','mono':'font:jetbrains-mono-regular'})
                branding.approve(root,'letter-lock');shutil.copytree(root/'brand/assets',out/'assets')
                rows=[{'kind':'lettering','content':{'style':'write-on'}}]
                if success:lettering.install(out,rows,root,'letter-lock')
                else:
                    with self.assertRaisesRegex(ValueError,'matching approved'):lettering.install(out,rows,root,'letter-lock')
