import copy
import unittest
from types import SimpleNamespace
import cinema
import editorial
from tools.neural_timing import words_from_phonemes
from tools.voice import language_for_voice


class CinemaTests(unittest.TestCase):
    def setUp(self):
        self.content = dict(layout='opening', kicker='AI / 01',
                            headline=['Sounds real.', 'Is it true?'], note='Verify the source.',
                            labels=['Author', 'Date', 'Evidence'])

    def test_closed_content_and_asset_reference(self):
        self.assertEqual(cinema.validate(self.content), 2)
        for key, value in [('layout', 'custom'), ('image', 'https://example.org/x.png'), ('headline', ['x'] * 3), ('html', '<b>x</b>')]:
            row = copy.deepcopy(self.content); row[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                cinema.validate(row)

    def test_shared_frame_and_unqualified_formats_are_rejected(self):
        rows = [{'kind': 'cinema'}]
        g = editorial.geometry(rows, 'landscape')
        self.assertLess(g['content'][1] + g['content'][3], g['caption'][1])
        self.assertEqual(g['logo'], [48, 36, 140, 22])
        with self.assertRaises(ValueError): cinema.validate_profile(rows, 'square')
        with self.assertRaises(ValueError): cinema.validate_profile(rows + [{'kind':'title'}], 'landscape')

    def test_photographic_shots_preserve_closed_assets_and_camera_bounds(self):
        shot = dict(image='stone', **{'from': [1, .5, .5], 'to': [1.4, .8, .5]}, seam='cut', title='Look closer')
        content = dict(layout='photographic', shots=[shot, copy.deepcopy(shot)])
        self.assertEqual(cinema.validate(content, {'stone': {}}), 2)
        for key, value in [('image', '../private.png'), ('image', 'unknown'), ('from', [float('nan'), .5, .5]),
                           ('to', [3, .5, .5]), ('to', [1, -1, .5]), ('to', [True, .5, .5]),
                           ('seam', 'custom'), ('html', '<img>'), ('title', 'x\ny')]:
            bad=copy.deepcopy(content);bad['shots'][0][key]=value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): cinema.validate(bad, {'stone': {}})
        with self.assertRaises(ValueError): cinema.validate(content, {})

    def test_portrait_is_limited_to_photographic_cinema(self):
        rows = [dict(kind='cinema', content=dict(layout='photographic'))]
        for profile in ('landscape', 'portrait'):
            cinema.validate_profile(rows, profile)
        for profile in ('square', 'feed', 'shorts'):
            with self.subTest(profile=profile), self.assertRaises(ValueError):
                cinema.validate_profile(rows, profile)
        for extra in (dict(kind='cinema', content=self.content), dict(kind='title')):
            with self.assertRaises(ValueError): cinema.validate_profile(rows + [extra], 'portrait')

    def test_portrait_copy_boxes_fit_without_changing_landscape(self):
        rows = [dict(kind='cinema', content=dict(layout='photographic'))]
        portrait = editorial.geometry(rows, 'portrait')
        for field in ('content', 'caption', 'logo', 'progress'):
            x, y, w, h = portrait[field]
            self.assertGreaterEqual(x, 0); self.assertGreaterEqual(y, 0)
            self.assertLessEqual(x + w, 1080); self.assertLessEqual(y + h, 1920)
        self.assertLess(portrait['content'][1] + portrait['content'][3], portrait['caption'][1])
        landscape = editorial.geometry(rows, 'landscape')
        self.assertEqual(landscape['content'], [80, 110, 1760, 780])
        self.assertEqual(landscape['caption'], [330, 972, 1260, 58])

    def test_photographic_sequence_rejects_unusable_edit_timing_and_unused_assets(self):
        import production_visuals as production
        shot = dict(image='stone', **{'from': [1, .5, .5], 'to': [1.4, .8, .5]}, seam='focus', title='')
        scene=dict(kind='cinema', name='Film', first_cue=0, cues=[0, 1], transition='cut-left',
                   content=dict(layout='photographic', shots=[shot, copy.deepcopy(shot)]))
        cues=[{'start':0, 'end':1}, {'start':3, 'end':4}]
        self.assertEqual(production.validate_scenes([scene], {'stone':{}}, cues, 8), [(0, 8)])
        with self.assertRaises(ValueError): production.validate_scenes([scene], {'stone':{}, 'unused':{}}, cues, 8)
        with self.assertRaises(ValueError): production.validate_scenes([scene], {'stone':{}}, [{'start':0}, {'start':.8}], 8)
        with self.assertRaises(ValueError): production.validate_scenes([scene], {'stone':{}}, cues, 4)

    def test_measured_phonemes_and_ambiguous_mapping(self):
        timing = [SimpleNamespace(phoneme=c, start=i*.1, end=(i+1)*.1) for i,c in enumerate('si no')]
        words = words_from_phonemes('Sí no', timing, .5)
        self.assertEqual([w['text'] for w in words], ['Sí', 'no'])
        self.assertAlmostEqual(words[1]['start'], .3)
        with self.assertRaises(ValueError): words_from_phonemes('Too many words', timing, .5)
        with self.assertRaises(ValueError): words_from_phonemes('Sí no', list(reversed(timing)), .5)

    def test_voice_language_is_explicit(self):
        self.assertEqual(language_for_voice('af_heart'), 'en-us')
        self.assertEqual(language_for_voice('ef_dora'), 'es')
        with self.assertRaises(ValueError): language_for_voice('ef_unknown')

    def test_spanish_render_uses_existing_local_engine(self):
        from tests.test_voice import StubEngine
        from tools.voice import render
        engine=StubEngine(voices=('ef_dora',))
        pcm,metrics=render(engine,'Una respuesta necesita evidencia.', 'ef_dora',1.0)
        self.assertGreater(len(pcm),0)
        self.assertEqual(metrics['sample_rate'],24000)
        self.assertEqual(engine.calls[0][3],'es')
