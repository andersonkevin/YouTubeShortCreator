import copy
import unittest
import editorial
import production_visuals as production


def content():
    return {'design':'dossier','layout':'hero','kicker':'A source, not a score',
            'headline':['Evidence','before confidence'], 'deck':'A qualitative explanation without invented metrics.',
            'labels':['Claim','Source','Evidence'], 'details':['Read it','Open it','Compare it']}


class EditorialTests(unittest.TestCase):
    def test_closed_designs_and_real_caption_beats(self):
        for design in editorial.DESIGNS:
            for layout in editorial.LAYOUTS:
                c=content();c.update(design=design,layout=layout)
                scene={'kind':'editorial','name':'Opening','first_cue':0,'cues':[0,1],'transition':'cut-left','content':c}
                self.assertEqual(production.validate_scenes([scene],{},[{'start':0},{'start':3}],7),[(0,7)])
                scene['cues']=[0]
                with self.assertRaises(ValueError):production.validate_scenes([scene],{},[{'start':0},{'start':3}],7)

    def test_payload_cannot_supply_css_svg_code_or_unbounded_text(self):
        for key,value in [('design','unknown'),('layout','unknown'),('headline',['A']*3),('headline',['x'*22,'B']),('labels',['A']),('deck','a\nb')]:
            c=content();c[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):editorial.validate(c)
        for key in ('html','svg','css','url','script'):
            c=content();c[key]='untrusted'
            with self.assertRaises(ValueError):editorial.validate(c)

    def test_new_design_does_not_silently_scale_into_unqualified_formats(self):
        editorial.validate_profile([{'kind':'editorial'}],'landscape')
        for profile in ('portrait','square','portrait-4x5'):
            with self.assertRaises(ValueError):editorial.validate_profile([{'kind':'editorial'}],profile)
            editorial.validate_profile([{'kind':'title'}],profile)

    def test_legacy_kinds_remain_available(self):
        self.assertTrue({'title','grid','source-stage','chart','diagram','media-grid'}.issubset(production.KINDS))

    def test_editorial_geometry_is_shared_and_does_not_mutate_legacy(self):
        from media_contract import composition_geometry
        legacy=composition_geometry('landscape')
        self.assertEqual(editorial.geometry([{'kind':'title'}],'landscape'),legacy)
        actual=editorial.geometry([{'kind':'editorial'}],'landscape')
        self.assertEqual(actual['logo'],[100,76,230,48])
        self.assertEqual(actual['progress'],[100,40,1720,10])
        for key in ('content','caption','plot'):
            self.assertEqual(actual[key],legacy[key])
        self.assertEqual(composition_geometry('landscape'),legacy)
