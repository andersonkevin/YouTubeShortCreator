import contextlib
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import wave

from PIL import Image
import numpy as np

import branding
import runtime
import workflow
import ysc
from safety import digest, inside, read_json, write_json
from tools import release


def brand_record():
    return {'version': 1, 'channel': 'Signal Lab', 'language': 'en-US', 'audience': 'Developers',
            'tone': 'Clear and practical', 'scene_count': 3, 'colors': dict(branding.PALETTES['violet']), 'logo_style': 'wordmark'}


def make_brand(root, style='wordmark', logo=None):
    record = brand_record()
    record['logo_style'] = style
    fonts = {role: branding.font_path(role) for role in ('display', 'body', 'mono')}
    if not all(fonts.values()):
        raise unittest.SkipTest('Tests require local TTF fonts; no fonts are downloaded')
    branding.create(root, record, fonts, logo)
    branding.approve(root, workflow.verify_lock())


def fixture(root, duration=12):
    workflow.duration_seconds(duration)
    make_brand(root)
    intake = root / 'intake'
    signal = .1 * np.sin(2 * np.pi * 330 * np.arange(round(duration * 16000)) / 16000)
    with wave.open(str(intake / 'voice.wav'), 'wb') as output:
        output.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
        output.writeframes((signal * 32767).astype('<i2').tobytes())
    # Deliberately synthetic timing fixture, not a real transcript or publishable episode.
    step = duration / 6
    timed = [{'text': 'Test signal.', 'start': i * step + .1, 'end': (i + 1) * step - .5} for i in range(6)]
    write_json(intake / 'transcript.json', {'duration': duration, 'audio_sha256': digest(intake / 'voice.wav'), 'words': timed})
    Image.new('RGB', (1080, 1920), '#090909').save(intake / 'graphic.png')
    workflow.caption_draft('intake/transcript.json', 'intake/captions.json')
    return ysc.new_episode(root, 'test-episode', 'intake/voice.wav', 'intake/transcript.json', 'intake/graphic.png', 'intake/captions.json')


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / 'channel'
        self.old = workflow.ROOT, workflow.RUNS
        workflow.ROOT, workflow.RUNS = self.root, self.root / 'runs'
        self.addCleanup(self.restore)
        self.episode = fixture(self.root)
        self.data = read_json(self.episode)

    def restore(self):
        workflow.ROOT, workflow.RUNS = self.old

    def mutate(self, data):
        self.episode.write_text(json.dumps(data))
        return workflow.validate(self.episode)

    def test_valid_episode(self):
        self.assertEqual(len(workflow.validate(self.episode)[3]), 3)

    def test_long_episode_captions_and_scene_bounds(self):
        for duration in (91, 156.7, 180):
            root = self.root / ('long-' + str(duration))
            workflow.ROOT, workflow.RUNS = root, root / 'runs'
            episode = fixture(root, duration)
            data, _, captions, scenes = workflow.validate(episode)
            self.assertEqual(data['duration'], duration)
            self.assertEqual(captions['duration'], duration)
            self.assertEqual(scenes[-1][1], duration)
            self.assertGreater(captions['cues'][-1]['end'], 90)
            self.assertIn(f'data-duration="{duration}', workflow.build_html(data, captions, scenes))

    def test_audio_import_has_separate_bounded_size(self):
        for extension, expected in (('.wav', 75_000_000), ('.png', 30_000_000)):
            source = self.root / ('source' + extension)
            source.write_bytes(b'fixture')
            with patch.object(branding, 'external_file', return_value=source) as checked:
                ysc.import_file(self.root, str(source), 'size-test' + extension)
                self.assertEqual(checked.call_args.args[2], expected)

    def test_all_layouts_render_escaped_slots(self):
        layouts = list(workflow.TEMPLATE.joinpath('scenes').glob('*.json'))
        self.assertEqual(len(layouts), 18)
        for file in layouts:
            layout = read_json(file)
            sample = copy.deepcopy(layout['example'])
            for key in sample['content']:
                sample['content'][key] = '<script>alert(1)</script>'
            result = workflow.scene_html(layout['tree'], sample['content'], sample['motion'])
            self.assertNotIn('<script>', result)
            self.assertIn('&lt;script&gt;', result)

    def test_path_traversal(self):
        for path in ('../outside', '/etc/passwd', 'intake/../../x', 'intake\\x'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                inside(self.root, path, exists=False)

    def test_symlink_input(self):
        (self.root / 'intake/link').symlink_to(self.episode)
        with self.assertRaises(ValueError):
            inside(self.root, 'intake/link')

    def test_input_hash_change(self):
        (self.episode.parent / 'audio.wav').write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'changed'):
            workflow.validate(self.episode)

    def test_brand_drift(self):
        (self.root / 'brand/assets/brand.css').write_text('body{}')
        with self.assertRaisesRegex(ValueError, 'Brand changed'):
            workflow.validate(self.episode)

    def test_no_approval(self):
        (self.root / 'brand/approval.json').unlink()
        with self.assertRaises(ValueError):
            workflow.validate(self.episode)

    def test_no_brand_overwrite(self):
        with self.assertRaises(ValueError):
            branding.approve(self.root, workflow.verify_lock())

    def test_exact_content_keys(self):
        self.data['scenes'][0]['content']['raw_html'] = '<b>oops</b>'
        with self.assertRaises(ValueError):
            self.mutate(self.data)

    def test_no_style_override(self):
        self.data['style'] = {'background': 'red'}
        with self.assertRaises(ValueError):
            self.mutate(self.data)

    def test_scene_count(self):
        self.data['scenes'] = self.data['scenes'][:2]
        with self.assertRaises(ValueError):
            self.mutate(self.data)

    def test_scene_anchor_order(self):
        self.data['scenes'][1]['first_cue'] = 0
        with self.assertRaises(ValueError):
            self.mutate(self.data)

    def test_motion_bounds(self):
        self.data['scenes'][0]['motion']['m01']['enter'] = 100
        with self.assertRaisesRegex(ValueError, 'Motion exceeds'):
            self.mutate(self.data)

    def test_unknown_layout(self):
        self.data['scenes'][0]['layout'] = 'missing'
        with self.assertRaises(ValueError):
            self.mutate(self.data)

    def test_thumbnail_overflow(self):
        self.data['thumbnail']['headline'][0] = 'W' * 24
        with self.assertRaises(ValueError):
            self.mutate(self.data)

    def test_hashtags(self):
        self.data['youtube']['hashtags'][0] = '#AI'
        with self.assertRaises(ValueError):
            self.mutate(self.data)

    def test_language_binding(self):
        self.data['language'] = 'es-ES'
        with self.assertRaises(ValueError):
            self.mutate(self.data)

    def test_deterministic_html(self):
        data, _, captions, bounds = workflow.validate(self.episode)
        self.assertEqual(workflow.build_html(data, captions, bounds), workflow.build_html(data, captions, bounds))

    def test_import_no_overwrite(self):
        source = self.root / 'intake/voice.wav'
        before = digest(source)
        with self.assertRaises(FileExistsError):
            ysc.import_file(self.root, str(source), 'voice.wav')
        self.assertEqual(before, digest(source))

    def test_new_episode_no_overwrite(self):
        with self.assertRaises(ValueError):
            ysc.new_episode(self.root, 'test-episode', '', '', '', '')

    def test_caption_draft_no_overwrite(self):
        with self.assertRaises(ValueError):
            workflow.caption_draft('intake/transcript.json', 'intake/captions.json')

    def test_writer_requires_approval(self):
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(ysc.main(['--workspace', str(self.root), 'brand-approve']), 1)

    def test_runtime_drift(self):
        write_json(self.root / 'runtime.json', {'paths': {}, 'versions': {'node': 'old'}})
        with patch.object(runtime, 'versions', return_value={'node': 'new'}), self.assertRaises(ValueError):
            runtime.doctor(self.root, 'hash')

    def test_caption_word_mismatch(self):
        captions = read_json(self.episode.parent / 'captions.json')
        transcript = read_json(self.episode.parent / 'transcript.json')
        captions['cues'][0]['text'] = 'Different words.'
        with self.assertRaises(ValueError):
            workflow.validate_captions(captions, transcript, 12, {})

    def test_caption_offset_needs_evidence(self):
        captions = read_json(self.episode.parent / 'captions.json')
        transcript = read_json(self.episode.parent / 'transcript.json')
        captions['cues'][0]['start'] += .3
        with self.assertRaises(ValueError):
            workflow.validate_captions(captions, transcript, 12, {})

    def test_estimated_timing_blocked(self):
        captions = read_json(self.episode.parent / 'captions.json')
        transcript = read_json(self.episode.parent / 'transcript.json')
        captions['status'] = 'estimated'
        with self.assertRaises(ValueError):
            workflow.validate_captions(captions, transcript, 12, {})


class BoundaryTests(unittest.TestCase):
    def test_brand_contrast(self):
        record = brand_record()
        record['colors']['background'] = '#ffffff'
        with self.assertRaises(ValueError):
            branding.validate_brand(record)

    def test_brand_css_injection(self):
        record = brand_record()
        record['colors']['accent'] = '#ffffff;url(https://example.com)'
        with self.assertRaises(ValueError):
            branding.validate_brand(record)

    def test_unicode_words(self):
        self.assertNotEqual(workflow.words('cafe'), workflow.words('caf\u00e9'))

    def test_duplicate_and_nonfinite_json(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'data.json'
            for content in ('{"key":1,"key":2}', '{"key":NaN}'):
                path.write_text(content)
                with self.assertRaises(ValueError):
                    read_json(path)

    def test_onboarding_cancel_is_read_only(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'brand'
            answers = iter(['Signal Lab', '', '', '', '', '', '', '', '', '', '', 'NO'])
            with patch('builtins.input', side_effect=lambda _: next(answers)), contextlib.redirect_stdout(io.StringIO()), self.assertRaises(ValueError):
                ysc.onboarding(root)
            self.assertFalse(root.exists())

    def test_monogram_generation(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'brand'
            make_brand(root, 'monogram')
            with Image.open(root / 'brand/assets/logo.png') as image:
                self.assertIsNotNone(image.getbbox())

    def test_onboarding_creates_unapproved_brand(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'brand'
            answers = iter(['Signal Lab', '', '', '', '', 'graphite', '', 'monogram', '', '', '', 'CREATE'])
            with patch('builtins.input', side_effect=lambda _: next(answers)), contextlib.redirect_stdout(io.StringIO()):
                ysc.onboarding(root)
            self.assertTrue((root / 'brand/preview.png').is_file())
            self.assertFalse((root / 'brand/approval.json').exists())
            self.assertEqual(read_json(root / 'brand/brand.json')['colors'], branding.PALETTES['graphite'])

    def test_all_palettes_meet_contrast(self):
        for colors in branding.PALETTES.values():
            record = brand_record()
            record['colors'] = colors
            branding.validate_brand(record)

    def test_release_rejects_private_path(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'README.md').write_text('/' + 'Users' + '/private-person/secret')
            with self.assertRaises(ValueError):
                release.files(root)

    def test_existing_logo(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'mark.png'
            Image.new('RGBA', (300, 100), 'white').save(source)
            make_brand(Path(temp) / 'brand', 'provided', str(source))

    def test_release_excludes_private_media(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'README.md').write_text('Public')
            (root / 'workspace').mkdir()
            (root / 'workspace/private.mp3').write_bytes(b'private')
            self.assertEqual([p.name for p in release.files(root)], ['README.md'])

    def test_release_rejects_unknown_file(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'secret.mp3').write_bytes(b'private')
            with self.assertRaises(ValueError):
                release.files(root)

    def test_release_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            root = base / 'public'
            root.mkdir()
            (root / 'README.md').write_text('Public')
            target = base / 'release.zip'
            release.package(target, root)
            with self.assertRaises(ValueError):
                release.package(target, root)


if __name__ == '__main__':
    unittest.main()
