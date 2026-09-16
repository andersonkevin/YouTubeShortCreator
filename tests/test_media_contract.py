import unittest

from media_contract import MAX_AUDIO_BYTES, MAX_FRAMES, duration_seconds


class DurationTests(unittest.TestCase):
    def test_audio_driven_duration_up_to_three_minutes(self):
        for value in (12, 90, 91, 156.7, 180):
            self.assertEqual(duration_seconds(value), value)
        self.assertEqual(MAX_FRAMES, 5400)

    def test_invalid_or_non_short_duration_rejected(self):
        for value in (True, None, '180', 0, 1, -1, 180 + 1 / 30, 156.682438, float('nan'), float('inf')):
            with self.subTest(value=value), self.assertRaises(ValueError):
                duration_seconds(value)

    def test_audio_bound_fits_three_minute_stereo_pcm(self):
        self.assertGreater(MAX_AUDIO_BYTES, 180 * 48000 * 2 * 4 + 4096)
