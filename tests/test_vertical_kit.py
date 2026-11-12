"""Vertical kit: pure helpers, scene page generation and public-tree hygiene. No browser, FFmpeg or voice needed."""
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile
import unittest

HOME = Path(__file__).resolve().parents[1]
KIT = HOME / 'tools/vertical_kit'
EXAMPLE = HOME / 'examples/vertical-kit'
sys.path.insert(0, str(KIT))

import align  # noqa: E402
import common  # noqa: E402
import cover  # noqa: E402
import vkit  # noqa: E402


class HelperTests(unittest.TestCase):
    def test_srt_shift_and_format(self):
        timing = {'words': [{'text': 'Hello'}, {'text': 'world.'}], 'cues': [{'start': 0.0, 'end': 1.25, 'firstWord': 0, 'lastWord': 1}]}
        self.assertEqual(vkit.srt(timing, .3), '1\n00:00:00,300 --> 00:00:01,550\nHello world.\n')
        self.assertEqual(vkit.srt_time(3723.456), '01:02:03,456')

    def test_loudnorm_second_pass_uses_measurement(self):
        f = vkit.loudnorm_filter({'input_i': '-22.4', 'input_tp': '-6.1', 'input_lra': '3.2', 'input_thresh': '-32.9', 'target_offset': '0.3'})
        self.assertIn('I=-14:TP=-1.5', f)
        self.assertIn('measured_I=-22.4', f)
        self.assertIn('offset=0.3:linear=true', f)

    def test_intro_filter_delays_audio_with_video(self):
        f = vkit.intro_filter()
        self.assertIn('tpad=start_duration=0.3', f)
        self.assertIn('adelay=300', f)

    def test_sheet_times_bounded(self):
        times = vkit.sheet_times(20)
        self.assertEqual(len(times), 12)
        self.assertTrue(all(.2 <= t < 20 for t in times))

    def test_spoken_forms_keep_script(self):
        import narrate
        self.assertEqual(narrate.spoken('AI cut costs 50% and runs 4x faster for $3M.'),
                         'A I cut costs 50 percent and runs 4 times faster for 3 million dollars.')
        self.assertEqual(narrate.spoken('Our ERP, today.', say={'ERP': 'E R P'}), 'Our E R P, today.')


class AlignTests(unittest.TestCase):
    def test_script_spelling_wins_and_cues_split(self):
        paras = ['YouTube targets -14 LUFS.', 'Quiet ones stay quiet.']
        sections = [{'start': 0.0}, {'start': 2.5}]
        asr = [{'text': w, 'start': i * .4, 'end': i * .4 + .35} for i, w in enumerate(['YouTube', 'targets', 'minus', 'fourteen', 'loofs.'])]
        asr += [{'text': w, 'start': 2.5 + i * .4, 'end': 2.85 + i * .4} for i, w in enumerate(['Quiet', 'ones', 'stay', 'quiet.'])]
        timing = align.build(paras, sections, asr, 5.0, report=lambda _: None)
        self.assertEqual([w['text'] for w in timing['words']][:4], ['YouTube', 'targets', '-14', 'LUFS.'])
        self.assertEqual(len(timing['cues']), 2)
        self.assertEqual(timing['cues'][1]['text'], 'Quiet ones stay quiet.')
        starts = [w['start'] for w in timing['words']]
        self.assertEqual(starts, sorted(starts))


class StageTests(unittest.TestCase):
    def test_example_builds_with_kit_assets(self):
        with tempfile.TemporaryDirectory() as tmp:
            batch = Path(tmp) / 'batch'
            shutil.copytree(EXAMPLE, batch)
            short = batch / 'quiet-shorts'
            sys.path.insert(0, str(short / 'web'))
            import os
            os.environ['VKIT_HOME'] = str(KIT)
            source = (short / 'web/build.py').read_text()
            exec(compile(source, str(short / 'web/build.py'), 'exec'), {'__file__': str(short / 'web/build.py'), '__name__': 'build'})
            page = (short / 'web/stage.html').read_text()
            self.assertEqual(page.count('class="v-scene'), 5)
            self.assertIn('vbase.css', page)
            self.assertIn('Example Studio', page)
            self.assertNotIn('http://', page.replace('http://www.w3.org', ''))
            self.assertIn('"captions"', page)

    def test_icons_and_components(self):
        self.assertEqual(len(common.ICONS['icons']), 112)
        self.assertTrue(common.icon('zap').startswith('<svg class="ic"'))
        self.assertIn('data-fx="spring"', common.card(0, 0, 10, 10, '', 1.0))
        self.assertIn('data-count="0:0,1.000:42"', common.count(1.0, 42))

    def test_skeleton_cascades_late_cards(self):
        body = common.card(0, 0, 10, 10, '', 5.0) + common.card(0, 0, 10, 10, '', 6.0)
        times = [float(x) for x in re.findall(r'data-at="([\d.]+)"', common.skeleton(body, 2.0))]
        self.assertEqual(times, [2.1, 2.25])

    def test_cover_and_intro_pages(self):
        brand = common.load_brand(EXAMPLE)
        html = cover.cover_page(brand, EXAMPLE / 'img/waveform.jpg', 'Line one', 'Line two', 'Sub', 'TIP')
        self.assertIn('Example Studio', html)
        self.assertIn('window.setTime=()=>true', html)
        intro = cover.intro_page(html)
        self.assertNotIn('window.setTime=()=>true', intro)
        self.assertIn('const HOLD=.3', intro)


class HygieneTests(unittest.TestCase):
    def test_no_private_paths_or_brand_hardcoding(self):
        for path in [*KIT.rglob('*'), *EXAMPLE.rglob('*')]:
            if path.is_file() and path.suffix in ('.py', '.css', '.js', '.mjs', '.json', '.md'):
                text = path.read_text()
                self.assertIsNone(re.search(r'/(?:Users|home)/[A-Za-z0-9_.-]+/', text), path)

    def test_theme_has_no_literal_brand_rgba(self):
        css = (KIT / 'vbase.css').read_text().split(':root{', 1)[1].split('}', 1)[1]
        self.assertEqual(set(re.findall(r'rgba\((\d+,\d+,\d+),', css)) - {'255,255,255', '0,0,0'}, set())

    def test_example_timing_consistent(self):
        timing = json.loads((EXAMPLE / 'quiet-shorts/intake/timing.json').read_text())
        self.assertEqual(timing['cues'][-1]['lastWord'], len(timing['words']) - 1)
        self.assertLessEqual(timing['words'][-1]['end'], timing['duration'])


if __name__ == '__main__':
    unittest.main()
