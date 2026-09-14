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


if __name__ == '__main__':
    unittest.main()
