#!/usr/bin/env python3
"""Private media-only comparison fixtures. No transcripts, branding or publication."""
import argparse
import math
from pathlib import Path
import shutil
import sys
import time
import wave

import numpy as np
from PIL import Image, ImageDraw

HOME = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HOME))
import ffmpeg_backend as ff
import media_backend as media
import workflow
from safety import digest, read_json, require, write_json
from media_contract import MAX_FRAMES, MAX_SECONDS
from tools.regression import new_root

CASES = (
    ('wav-mono-44100', 'wav', 44100, 1, 4.017),
    ('wav-stereo-48000', 'wav', 48000, 2, 4.017),
    ('mp3-stereo-44100', 'mp3', 44100, 2, 4.017),
    ('mp3-mono-48000', 'mp3', 48000, 1, 4.017),
    ('m4a-mono-44100', 'm4a', 44100, 1, 4.017),
    ('m4a-stereo-48000', 'm4a', 48000, 2, 4.017),
    ('opus-mono-48000', 'opus', 48000, 1, 4.017),
    ('opus-stereo-48000', 'opus', 48000, 2, 4.017),
    ('near-limit-wav', 'wav', 48000, 2, 179.983),
    ('silent-wav', 'wav', 48000, 1, 4.017),
)


def signal(rate, channels, duration, silent=False):
    t = np.arange(round(rate * duration)) / rate
    x = .17 * np.sin(2 * np.pi * (173 * t + 37 * t * t)) + .09 * np.sin(2 * np.pi * 731 * t)
    x *= .7 + .3 * np.sin(2 * np.pi * .83 * t)
    x[(t < .35) | (t > duration - .4)] = 0
    if silent:
        x[:] = 0
    values = np.column_stack((x, .8 * x)) if channels == 2 else x
    return (values * 32767).astype('<i2').tobytes()


def write_wave(path, rate, channels, data):
    require(not path.exists(), 'Fixture audio already exists')
    with wave.open(str(path), 'wb') as output:
        output.setparams((channels, 2, rate, 0, 'NONE', 'not compressed'))
        output.writeframes(data)


def prepare_real_source(source_dir, real_source, paths, excerpt_seconds):
    """Preserve authorized bytes; make an excerpt only when explicitly requested."""
    ff.local_input(real_source)
    before = digest(real_source)
    original = source_dir / ('authorized-original' + real_source.suffix)
    with real_source.open('rb') as reader, original.open('xb') as writer:
        shutil.copyfileobj(reader, writer)
    require(digest(original) == before and digest(real_source) == before, 'Authorized source changed during copy')
    source = original
    provenance = {'original_sha256': before, 'source_sha256': before,
                  'original_preserved': True, 'mode': 'full-recording',
                  'scope': 'operator-authorized private media-only QA'}
    if excerpt_seconds is not None:
        source = source_dir / 'authorized-excerpt.wav'
        ff.run(ff.command(paths) + ff.local_input(original) +
               ['-t', str(excerpt_seconds), '-map', '0:a:0', '-c:a', 'pcm_s16le', str(source)])
        provenance.update(mode='explicit-excerpt', start_seconds=0, requested_seconds=excerpt_seconds,
                          source_sha256=digest(source))
    return source, provenance


def execute(root, paths, approved, real_source=None, excerpt_seconds=None, real_only=False):
    require(approved, 'Media fixtures require --approve-write')
    require(not real_only or real_source is not None, 'Real-only comparison requires an authorized source')
    if real_source is not None:
        ff.local_input(real_source)
        require(excerpt_seconds is None or (type(excerpt_seconds) is int and 2 <= excerpt_seconds <= MAX_SECONDS),
                'Explicit excerpt duration must be between 2 and 180 seconds')
    else:
        require(excerpt_seconds is None, 'Excerpt requires an authorized source')
    root = new_root(root)
    root.mkdir()
    source_dir = root / 'sources'
    source_dir.mkdir()
    provenance = None
    cases = []
    for name, extension, rate, channels, duration in (() if real_only else CASES):
        wav = source_dir / (name + '-source.wav')
        write_wave(wav, rate, channels, signal(rate, channels, duration, name == 'silent-wav'))
        source = wav
        if extension != 'wav':
            source = source_dir / (name + '.' + extension)
            codec = {'mp3': 'libmp3lame', 'm4a': 'aac', 'opus': 'libopus'}[extension]
            ff.run(ff.command(paths) + ff.local_input(wav) + ['-c:a', codec, '-b:a', '192k', str(source)])
        cases.append((name, source, name == 'silent-wav'))
    if real_source is not None:
        source, provenance = prepare_real_source(source_dir, real_source, paths, excerpt_seconds)
        cases.append(('authorized-voice', source, False))
    report = {'status': 'RUNNING', 'scope': 'media-only; not a production episode or a transcript',
              'lock_sha256': workflow.verify_lock(), 'tool_sha256': digest(Path(__file__)),
              'versions': {name: ff.run([paths[name], '-version']) for name in ('ffmpeg', 'ffprobe')},
              'synthetic_cases_requested': [] if real_only else [case[0] for case in CASES],
              'real_voice': provenance, 'results': [], 'publication_performed': False}
    report['capabilities'] = {name: media.preflight(name, paths) for name in ('native', 'ffmpeg')}
    with media.scratch() as temporary:
        pattern = temporary / 'pattern.png'
        canvas = Image.new('RGB', (1080, 1920), '#101018')
        drawing = ImageDraw.Draw(canvas)
        for i, color in enumerate(('#ffffff', '#c5dc68', '#75cbd3', '#835ad0')):
            drawing.rectangle((100 + i * 210, 500, 260 + i * 210, 1350), fill=color)
        drawing.text((100, 350), 'PRIVATE MEDIA QA - NOT A SHORT', fill='white', font_size=34)
        canvas.save(pattern)
        report['pattern_sha256'] = digest(pattern)
        for name, source, silence in cases:
            duration_pcm = temporary / 'duration.f32'
            ff.decode(paths, source, duration_pcm)
            duration = duration_pcm.stat().st_size / 4 / 16000
            duration_pcm.unlink()
            count = math.ceil(duration * 30 - 1e-7)
            require(30 < count <= MAX_FRAMES, 'Fixture duration exceeds the 180-second Shorts limit; no automatic trimming')
            for index in range(count):
                (temporary / 'frames' / f'frame-{index:05d}.png').hardlink_to(pattern)
            for backend in ('native', 'ffmpeg'):
                output = root / name / backend
                output.mkdir(parents=True)
                write_json(output / 'captions.json', {'cues': []})
                started = time.perf_counter()
                result = {'case': name, 'backend': backend, 'source': str(source.relative_to(root)),
                          'source_sha256': digest(source), 'source_probe': ff.probe(paths, source),
                          'decoded_source_seconds': duration, 'frames': count, 'expected_seconds': count / 30}
                try:
                    media.encode(backend, paths, temporary, count, output / 'silent.mp4')
                    audio = media.finish(backend, paths, temporary, output, source, count / 30)
                    write_json(output / 'audio-qa.json', audio)
                    metadata = ff.inspect_record(ff.probe(paths, output / 'video.mp4', count_frames=True), count / 30)
                    result['frame_timing'] = ff.frame_timing(paths, output / 'video.mp4', metadata['frame_count'])
                    require(not silence, 'Silence unexpectedly passed waveform QA')
                    result['status'] = 'PASS'
                except Exception as error:
                    expected = silence and 'No voiced audio windows' in str(error)
                    result.update(status='EXPECTED_REJECTION' if expected else 'FAIL',
                                  error=type(error).__name__, message=str(error)[-1000:])
                result['seconds'] = round(time.perf_counter() - started, 3)
                require(digest(source) == result['source_sha256'], 'Comparison source changed')
                result['outputs'] = {p.name: {'sha256': digest(p), 'bytes': p.stat().st_size}
                                     for p in output.iterdir() if p.is_file()}
                write_json(output / 'result.json', result)
                report['results'].append(result)
                print(name, backend, result['status'], flush=True)
                for filename in ('source.f32', 'export.f32', 'decoded-audio.caf', 'frame-samples.json'):
                    path = temporary / filename
                    if path.exists():
                        path.unlink()
                decoded = temporary / 'decoded-frames'
                if decoded.exists():
                    shutil.rmtree(decoded)
            for path in (temporary / 'frames').iterdir():
                path.unlink()
    report['status'] = 'PASS' if all(r['status'] != 'FAIL' for r in report['results']) else 'FAIL'
    require(workflow.verify_lock() == report['lock_sha256'], 'Engine changed during comparison')
    write_json(root / 'matrix-report.json', report)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace', type=Path, required=True)
    parser.add_argument('--ffmpeg', required=True)
    parser.add_argument('--ffprobe', required=True)
    parser.add_argument('--swift', required=True)
    parser.add_argument('--real-source', type=Path)
    parser.add_argument('--excerpt-seconds', type=int, help='Optional explicitly authorized excerpt; omitted means full original recording')
    parser.add_argument('--real-only', action='store_true', help='Only the authorized recording; does not qualify the synthetic matrix')
    parser.add_argument('--approve-write', action='store_true')
    args = parser.parse_args()
    paths = {name: str(Path(getattr(args, name)).expanduser().resolve()) for name in ('ffmpeg', 'ffprobe', 'swift')}
    report = execute(args.workspace, paths, args.approve_write, args.real_source, args.excerpt_seconds, args.real_only)
    print(report['status'], len(report['results']), 'media comparisons')
    return 0 if report['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
