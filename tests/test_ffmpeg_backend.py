import copy
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import ffmpeg_backend as ff
import media_backend as media
import runtime
from safety import read_json, write_json


def exported():
    return {'format': {'duration': '12', 'format_name': 'mov,mp4,m4a,3gp,3g2,mj2'},
            'streams': [{'codec_type': 'video', 'codec_name': 'h264', 'width': 1080,
                         'height': 1920, 'avg_frame_rate': '30/1', 'r_frame_rate': '30/1', 'nb_read_frames': '360'},
                        {'codec_type': 'audio', 'codec_name': 'aac', 'channels': 1, 'sample_rate': '48000'}]}


class FFmpegTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.paths = {'ffmpeg': '/fixed ffmpeg', 'ffprobe': '/fixed ffprobe'}
        self.source = self.root / 'voice with spaces.wav'
        self.source.write_bytes(b'fixture')

    def test_valid_export_and_unchanged_record(self):
        record = exported()
        original = copy.deepcopy(record)
        report = ff.inspect_record(record, 12)
        self.assertEqual(report['frame_count'], 360)
        self.assertEqual(record, original)

    def test_wrong_streams_codecs_geometry_and_frames(self):
        variants = []
        for key, value in [('width', 1920), ('height', 1080), ('r_frame_rate', '30000/1001'),
                           ('r_frame_rate', '0/0'), ('nb_read_frames', '359'),
                           ('nb_read_frames', 'N/A'), ('codec_name', 'hevc')]:
            record = exported()
            record['streams'][0][key] = value
            variants.append(record)
        for key, value in [('codec_name', 'mp3'), ('channels', 6)]:
            record = exported()
            record['streams'][1][key] = value
            variants.append(record)
        for streams in [[], exported()['streams'][:1], exported()['streams'] * 2,
                        exported()['streams'] + [{'codec_type': 'subtitle'}]]:
            record = exported()
            record['streams'] = streams
            variants.append(record)
        for record in variants:
            with self.subTest(record=record), self.assertRaises(ValueError):
                ff.inspect_record(record, 12)

    def test_duration_bounds_not_relaxed(self):
        for duration in ('NaN', 'inf', '-1', '12.1', 'N/A'):
            record = exported()
            record['format']['duration'] = duration
            with self.subTest(duration=duration), self.assertRaises(ValueError):
                ff.inspect_record(record, 12)
        with self.assertRaises(ValueError):
            ff.inspect_record(exported(), 181)

    def test_full_three_minute_frame_and_timestamp_evidence(self):
        for duration in (91, 156.7, 180):
            record = exported()
            record['format']['duration'] = str(duration)
            count = round(duration * 30)
            record['streams'][0]['nb_read_frames'] = str(count)
            self.assertEqual(ff.inspect_record(record, duration)['frame_count'], count)
            timing = ff.validate_timestamps([round(i / 30, 6) for i in range(count)], count)
            self.assertEqual(timing['frames_checked'], count)

    def test_local_demux_restriction_and_symlink(self):
        args = ff.local_input(self.source)
        self.assertIn('file', args)
        self.assertIn('wav,mp3,mov,ogg', args)
        self.assertNotIn('http', args)
        for bad in ('https://example.invalid/audio.wav', Path('relative.wav')):
            with self.assertRaises(ValueError):
                ff.local_input(bad)
        alias = self.root / 'alias.wav'
        alias.symlink_to(self.source)
        with self.assertRaises(ValueError):
            ff.local_input(alias)

    def test_fixed_encode_argv_no_audio_and_no_overwrite(self):
        with patch.object(ff, 'run') as execute:
            target = self.root / 'silent.mp4'
            ff.encode(self.paths, self.root, 360, target)
            args = execute.call_args.args[0]
            self.assertEqual(args[0], '/fixed ffmpeg')
            self.assertIn('-nostdin', args)
            self.assertIn('-n', args)
            self.assertIn('libx264', args)
            self.assertIn('-an', args)
            self.assertEqual(args[-1], str(target))
            target.write_bytes(b'keep')
            execute.reset_mock()
            with self.assertRaises(ValueError):
                ff.encode(self.paths, self.root, 360, target)
            execute.assert_not_called()

    def test_mux_explicit_tracks_no_speed_filters(self):
        picture = self.root / 'silent.mp4'
        picture.write_bytes(b'fixture')
        with patch.object(ff, 'probe', return_value=exported()), patch.object(ff, 'run') as execute:
            ff.mux(self.paths, picture, self.source, self.root / 'video.mp4')
            args = execute.call_args.args[0]
            self.assertIn('0:v:0', args)
            self.assertIn('1:a:0', args)
            self.assertEqual(args[args.index('-c:v') + 1], 'copy')
            self.assertNotIn('-filter_complex', args)
            self.assertNotIn('-af', args)

    def test_decode_fixed_pcm_format(self):
        with patch.object(ff, 'probe', return_value=exported()), patch.object(ff, 'run') as execute:
            ff.decode(self.paths, self.source, self.root / 'source.f32')
            args = execute.call_args.args[0]
            for key, value in [('-ar', '16000'), ('-ac', '1'), ('-c:a', 'pcm_f32le')]:
                self.assertEqual(args[args.index(key) + 1], value)

    def test_selected_failure_does_not_call_native(self):
        with patch.object(ff, 'preflight', side_effect=ValueError('missing codec')), \
             patch.object(media, 'swift') as native, self.assertRaises(ValueError):
            media.preflight('ffmpeg', self.paths)
        native.assert_not_called()

    def test_frame_export_uses_fixed_sample_numbers_and_empty_directory(self):
        target = self.root / 'decoded'
        target.mkdir()
        with patch.object(ff, 'run') as execute:
            ff.export_frames(self.paths, self.source, [0, 180, 359], target)
            args = execute.call_args.args[0]
            self.assertEqual(args[args.index('-vf') + 1], 'select=eq(n\\,0)+eq(n\\,180)+eq(n\\,359)')
            self.assertEqual(args[args.index('-frames:v') + 1], '3')
            self.assertIn('-n', args)
            self.assertIn('-an', args)
            (target / 'keep').write_bytes(b'original')
            execute.reset_mock()
            with self.assertRaises(ValueError):
                ff.export_frames(self.paths, self.source, [0], target)
            execute.assert_not_called()
        self.assertEqual((target / 'keep').read_bytes(), b'original')

    def test_decode_samples_need_complete_evidence(self):
        captions = self.root / 'captions.json'
        write_json(captions, {'cues': []})
        with patch.object(ff, 'probe', return_value=exported()), \
             patch.object(ff, 'frame_timing', return_value={}), \
             patch.object(ff, 'run', return_value='# header\n'), self.assertRaises(ValueError):
            ff.inspect(self.paths, self.source, 12, captions, self.root / 'qa.json')
        self.assertFalse((self.root / 'qa.json').exists())

    def test_actual_timestamps_not_container_average(self):
        record = exported()
        record['streams'][0]['avg_frame_rate'] = '1452/49'
        self.assertEqual(ff.inspect_record(record, 12)['frame_count'], 360)
        times = [round(i / 30, 6) for i in range(360)]
        self.assertEqual(ff.validate_timestamps(times, 360)['frames_checked'], 360)
        for values in (times[:-1], [t + .01 for t in times], times[:20] + [times[19]] + times[21:]):
            with self.assertRaises(ValueError):
                ff.validate_timestamps(values, 360)

    def test_runtime_ffmpeg_paths_are_opt_in(self):
        supplied = dict.fromkeys(('node', 'playwright', 'chrome', 'swift', 'ffmpeg', 'ffprobe'), '/fixture/tool')
        with patch.object(runtime.platform, 'system', return_value='Darwin'), \
             patch.object(runtime, 'versions', return_value={'fixture': '1'}) as versions, \
             patch.object(media, 'preflight', return_value={'backend': 'ffmpeg'}):
            with self.assertRaises(ValueError):
                runtime.configure(self.root, supplied)
            runtime.configure(self.root, {**supplied, 'backend': 'ffmpeg'})
            record = read_json(self.root / 'runtime.json')
            self.assertEqual(record['backend'], 'ffmpeg')
            self.assertIn('ffprobe', record['paths'])
            self.assertEqual(versions.call_args.args[1], 'ffmpeg')
