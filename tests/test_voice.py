"""Optional local voice tool: path rules, script rules, records and no-overwrite, with a stub engine."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import wave

import numpy as np

HOME = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('voice', HOME / 'tools' / 'voice.py')
voice = importlib.util.module_from_spec(spec)
spec.loader.exec_module(voice)


class StubEngine:
    """Deterministic stand-in for Kokoro: a short tone whose length follows the text."""
    def __init__(self, voices=('af_heart', 'af_bella', 'am_michael', 'bf_emma')):
        self.voices = list(voices)
        self.calls = []

    def get_voices(self):
        return list(self.voices)

    def create(self, text, voice, speed, lang):
        self.calls.append((text, voice, speed, lang))
        seconds = max(0.5, len(text.split()) * 0.3 / speed)
        t = np.arange(int(seconds * voice_module_rate())) / voice_module_rate()
        return (0.5 * np.sin(2 * np.pi * 220 * t)).astype(np.float32), voice_module_rate()


def voice_module_rate():
    return voice.SAMPLE_RATE


class VoiceToolTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='shortcreator-voice-test-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        (self.root / 'intake').mkdir()
        (self.root / 'intake' / 'script.txt').write_text('An AI agent needs more than a prompt.\n\nIt needs tools, clear permissions, and a way to check results.\n')
        self.models = self.root / 'voice' / 'models'
        self.models.mkdir(parents=True)
        # Fake model files with the manifest's sizes and hashes are impossible to forge; tests patch the manifest instead.
        self.manifest = {'version': 1, 'engine': {'name': 'Kokoro (test)'}, 'files': [], 'sources': [], 'licenses': {}, 'note': 'test'}
        for name, role, content in (('kokoro-v1.0.onnx', 'model', b'model-bytes'), ('voices-v1.0.bin', 'voices', b'voice-bytes')):
            (self.models / name).write_bytes(content)
            import hashlib
            self.manifest['files'].append({'name': name, 'role': role, 'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()})
        self.manifest_path = self.root / 'manifest.json'
        self.manifest_path.write_text(json.dumps(self.manifest))
        self.patcher = unittest.mock.patch.object(voice, 'MANIFEST', self.manifest_path)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        self.engine = StubEngine()

    def test_manifest_pins_two_files_with_hashes(self):
        real = json.loads((HOME / 'tools' / 'voice-models.json').read_text())
        self.assertEqual({e['role'] for e in real['files']}, {'model', 'voices'})
        for entry in real['files']:
            self.assertRegex(entry['sha256'], r'^[0-9a-f]{64}$')
            self.assertGreater(entry['bytes'], 1_000_000)
        self.assertIn('Apache-2.0', json.dumps(real['licenses']))
        self.assertIn('GPL-3.0', json.dumps(real['licenses']))

    def test_synthesize_writes_wav_and_record(self):
        target, record = voice.synthesize(self.root, 'intake/script.txt', 'intake/voice.wav', 'af_heart', 1.0, True, engine=self.engine)
        self.assertTrue(target.is_file())
        with wave.open(str(target), 'rb') as data:
            self.assertEqual((data.getnchannels(), data.getsampwidth(), data.getframerate()), (1, 2, voice.SAMPLE_RATE))
            self.assertGreater(data.getnframes(), voice.SAMPLE_RATE)
        sidecar = json.loads((self.root / 'intake' / 'voice.voice.json').read_text())
        self.assertEqual(sidecar['status'], 'review_required')
        self.assertEqual(sidecar['listening_approval'], 'pending')
        self.assertFalse(sidecar['publication_performed'])
        self.assertEqual(sidecar['language'], 'en-us')
        self.assertEqual(sidecar['output']['sha256'], voice.digest(target))
        self.assertEqual(sidecar['script']['words'], 19)
        self.assertEqual(self.engine.calls[0][0], 'An AI agent needs more than a prompt. It needs tools, clear permissions, and a way to check results.')
        self.assertEqual(self.engine.calls[0][3], 'en-us')
        with self.assertRaisesRegex(ValueError, 'already exists'):
            voice.synthesize(self.root, 'intake/script.txt', 'intake/voice.wav', 'af_heart', 1.0, True, engine=self.engine)

    def test_rules(self):
        with self.assertRaisesRegex(ValueError, 'approve-write'):
            voice.synthesize(self.root, 'intake/script.txt', 'intake/voice.wav', 'af_heart', 1.0, False, engine=self.engine)
        with self.assertRaisesRegex(ValueError, 'American English'):
            voice.synthesize(self.root, 'intake/script.txt', 'intake/voice.wav', 'bf_emma', 1.0, True, engine=self.engine)
        with self.assertRaisesRegex(ValueError, 'Speed'):
            voice.synthesize(self.root, 'intake/script.txt', 'intake/voice.wav', 'af_heart', 1.5, True, engine=self.engine)
        with self.assertRaisesRegex(ValueError, 'under intake/'):
            voice.synthesize(self.root, 'intake/script.txt', 'voice.wav', 'af_heart', 1.0, True, engine=self.engine)
        with self.assertRaisesRegex(ValueError, 'under intake/'):
            voice.synthesize(self.root, 'intake/script.txt', 'intake/voice.mp3', 'af_heart', 1.0, True, engine=self.engine)
        with self.assertRaises(ValueError):
            voice.synthesize(self.root, '../script.txt', 'intake/voice.wav', 'af_heart', 1.0, True, engine=self.engine)
        with self.assertRaisesRegex(ValueError, 'not in the voices file'):
            voice.synthesize(self.root, 'intake/script.txt', 'intake/voice.wav', 'am_puck', 1.0, True, engine=self.engine)
        (self.root / 'intake' / 'markup.txt').write_text('Hello <b>world</b>')
        with self.assertRaisesRegex(ValueError, 'markup'):
            voice.synthesize(self.root, 'intake/markup.txt', 'intake/voice.wav', 'af_heart', 1.0, True, engine=self.engine)
        (self.root / 'intake' / 'long.txt').write_text('word ' * 1000)
        with self.assertRaises(ValueError):
            voice.synthesize(self.root, 'intake/long.txt', 'intake/voice.wav', 'af_heart', 1.0, True, engine=self.engine)
        self.assertEqual(sorted(self.root.rglob('*.wav')), [])

    def test_model_verification(self):
        (self.models / 'voices-v1.0.bin').write_bytes(b'tampered!!!')
        with self.assertRaisesRegex(ValueError, 'Unexpected size|Hash mismatch'):
            voice.synthesize(self.root, 'intake/script.txt', 'intake/voice.wav', 'af_heart', 1.0, True, engine=self.engine)
        (self.models / 'voices-v1.0.bin').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing model file'):
            voice.verify_models(self.models)

    def test_audition_writes_one_file_per_voice(self):
        output = voice.audition(self.root, 'intake/script.txt', ['af_heart', 'am_michael'], 'pick-01', True, engine=self.engine)
        self.assertEqual(sorted(p.name for p in output.iterdir()), ['af_heart.wav', 'am_michael.wav', 'audition.json'])
        report = json.loads((output / 'audition.json').read_text())
        self.assertEqual([v['voice'] for v in report['voices']], ['af_heart', 'am_michael'])
        self.assertEqual(report['listening_approval'], 'pending')
        with self.assertRaisesRegex(ValueError, 'New audition run'):
            voice.audition(self.root, 'intake/script.txt', ['af_heart'], 'pick-01', True, engine=self.engine)
        with self.assertRaises(ValueError):
            voice.audition(self.root, 'intake/script.txt', ['af_heart', 'af_heart'], 'pick-02', True, engine=self.engine)
        with self.assertRaises(ValueError):
            voice.audition(self.root, 'intake/script.txt', ['af_heart'], 'Bad ID', True, engine=self.engine)

    def test_render_rejects_bad_audio(self):
        class Silent(StubEngine):
            def create(self, text, voice, speed, lang):
                return np.zeros(voice_module_rate(), dtype=np.float32), voice_module_rate()
        with self.assertRaisesRegex(ValueError, 'PCM range'):
            voice.render(Silent(), 'hello', 'af_heart', 1.0)

        class Loud(StubEngine):
            def create(self, text, voice, speed, lang):
                return np.ones(voice_module_rate(), dtype=np.float32) * 1.5, voice_module_rate()
        with self.assertRaisesRegex(ValueError, 'PCM range'):
            voice.render(Loud(), 'hello', 'af_heart', 1.0)

    def test_doctor_reports_instead_of_raising(self):
        report = voice.doctor(self.root)
        self.assertIn(report['status'], ('PASS', 'FAIL'))
        self.assertFalse(report['installation_performed'])
        self.assertEqual(report['network'], 'none')
        self.assertIsInstance(report['problems'], list)
        self.assertEqual(report['models']['files'], {'model': 'kokoro-v1.0.onnx', 'voices': 'voices-v1.0.bin'})

    def test_release_audit_includes_tool_and_excludes_models(self):
        import sys
        sys.path.insert(0, str(HOME))
        from tools import release
        names = {str(p.relative_to(release.HOME)) for p in release.files()}
        self.assertIn('tools/voice.py', names)
        self.assertIn('tools/voice-models.json', names)
        self.assertFalse(any(name.endswith(('.onnx', '.bin', '.wav')) for name in names))


import unittest.mock  # noqa: E402

if __name__ == '__main__':
    unittest.main()
