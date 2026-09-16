import importlib.util
from pathlib import Path
import tempfile
import unittest
import numpy as np

spec = importlib.util.spec_from_file_location('audio_qa', Path(__file__).resolve().parents[1] / 'audio_qa.py')
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)


class AudioTests(unittest.TestCase):
    def compare(self, a, b):
        with tempfile.TemporaryDirectory(prefix='shortcreator-audio-test-') as folder:
            source, export = Path(folder) / 'source.f32', Path(folder) / 'export.f32'
            np.asarray(a, dtype='<f4').tofile(source)
            np.asarray(b, dtype='<f4').tofile(export)
            return audio.compare_files(source, export)

    def test_matching_audio(self):
        signal = np.random.default_rng(5).normal(0, .1, 64000)
        self.assertEqual(self.compare(signal, signal)['status'], 'PASS')

    def test_shifted_audio(self):
        signal = np.random.default_rng(5).normal(0, .1, 64000)
        with self.assertRaises(ValueError):
            self.compare(signal, np.roll(signal, 1600))

    def test_wrong_recording(self):
        rng = np.random.default_rng(5)
        with self.assertRaises(ValueError):
            self.compare(rng.normal(0, .1, 64000), rng.normal(0, .1, 64000))

    def test_silent_audio(self):
        with self.assertRaises(ValueError):
            self.compare(np.zeros(64000), np.zeros(64000))

    def test_truncated_audio(self):
        with self.assertRaises(ValueError):
            self.compare(np.ones(64000), np.ones(40000))

    def test_short_last_window_is_checked(self):
        signal = np.random.default_rng(8).normal(0, .1, 49600)
        self.assertEqual(len(self.compare(signal, signal)['windows']), 2)
        changed = signal.copy()
        changed[48000:] *= -1
        with self.assertRaisesRegex(ValueError, 'identity/sync'):
            self.compare(signal, changed)

    def test_one_sample_tail_has_no_aliased_lag(self):
        signal = np.random.default_rng(8).normal(0, .1, 48001)
        self.assertEqual(self.compare(signal, signal)['windows'][-1]['lag_ms'], 0)

    def test_added_voice_in_silence_is_rejected(self):
        voiced = np.random.default_rng(8).normal(0, .1, 48000)
        with self.assertRaisesRegex(ValueError, 'source silence'):
            self.compare(np.r_[voiced, np.zeros(48000)], np.r_[voiced, voiced])
        self.assertEqual(self.compare(np.r_[voiced, np.zeros(48000)],
                                      np.r_[voiced, np.zeros(48000)])['silent_windows_checked'], 1)

    def test_short_unmatched_voice_rejected_but_padding_allowed(self):
        voiced = np.random.default_rng(8).normal(0, .1, 48000)
        for a, b in ((voiced, np.r_[voiced, np.ones(100)]),
                     (np.r_[voiced, np.ones(100)], voiced)):
            with self.assertRaisesRegex(ValueError, 'unmatched audio tail'):
                self.compare(a, b)
        self.assertEqual(self.compare(voiced, np.r_[voiced, np.zeros(100)])['unmatched_samples'], 100)

    def test_nonfinite_samples_are_rejected(self):
        for value in (float('inf'), float('-inf'), float('nan')):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, 'Non-finite'):
                self.compare(np.r_[np.ones(48000), value], np.ones(48001))


if __name__ == '__main__':
    unittest.main()
