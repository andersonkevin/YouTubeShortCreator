"""Local media dispatch. Backend selection belongs to runtime configuration only."""
from contextlib import contextmanager
from pathlib import Path
import subprocess
import tempfile

from safety import digest, inside, read_json, require, write_json
from media_contract import MAX_FRAMES

HOME = Path(__file__).resolve().parent


def validate_backend(name):
    require(isinstance(name, str) and name in ('native', 'ffmpeg'), 'Unsupported media backend. No fallback is performed.')
    return name


@contextmanager
def scratch():
    """Own only this invocation's temporary frames and compiler/audio cache."""
    with tempfile.TemporaryDirectory(prefix='shortcreator-media-') as temporary:
        root = Path(temporary).resolve()
        (root / 'frames').mkdir()
        yield root


def swift(paths, temporary, script, *arguments):
    require(script in {'encode.swift', 'mux.swift', 'media-qa.swift', 'decode-audio.swift',
                       'native-capabilities.swift'}, 'Unknown native operation')
    subprocess.run([paths['swift'], '-module-cache-path', str(temporary / 'swift-cache'),
                    str(HOME / script), *map(str, arguments)], check=True)


def preflight(name, paths):
    validate_backend(name)
    with scratch() as temporary:
        if name == 'ffmpeg':
            import ffmpeg_backend
            return ffmpeg_backend.preflight(paths, temporary)
        # Probe local frameworks/codec support without touching a production run.
        swift(paths, temporary, 'native-capabilities.swift', temporary / 'probe.mp4')
    return {'backend': 'native', 'h264_1080x1920': True, 'mp4_export': True}


def encode(name, paths, temporary, count, destination):
    validate_backend(name)
    require(type(count) is int and 0 < count <= MAX_FRAMES, 'Invalid frame count')
    require(not destination.exists() and not destination.is_symlink(), 'Encoder output already exists')
    frames = temporary / 'frames'
    expected = {f'frame-{index:05d}.png' for index in range(count)}
    require({p.name for p in frames.iterdir()} == expected, 'Incomplete or unexpected frame sequence')
    for filename in expected:
        inside(frames, filename)
    if name == 'native':
        swift(paths, temporary, 'encode.swift', frames, count, destination)
    else:
        import ffmpeg_backend
        ffmpeg_backend.encode(paths, frames, count, destination)


def finish(name, paths, temporary, output, source, duration):
    validate_backend(name)
    for filename in ('video.mp4', 'media-qa.json', 'frame-qa.json', 'audio-qa.json', 'audio-preparation.json'):
        path = inside(output, filename, exists=False)
        require(not path.exists(), 'Media output already exists')
    for filename in ('source.f32', 'export.f32', 'decoded-audio.caf', 'frame-samples.json', 'decoded-frames'):
        require(not (temporary / filename).exists(), 'Audio scratch already exists')
    import frame_qa
    indices = frame_qa.sample_indices(read_json(output / 'captions.json'), duration)
    write_json(temporary / 'frame-samples.json', {'indices': indices})
    decoded = temporary / 'decoded-frames'
    decoded.mkdir()
    if name == 'native':
        swift(paths, temporary, 'mux.swift', output / 'silent.mp4', source, output / 'video.mp4', temporary / 'decoded-audio.caf')
        if (temporary / 'decoded-audio.caf').exists():
            write_json(output / 'audio-preparation.json', {'operation': 'native-compressed-to-float-pcm',
                       'source_sha256': digest(source), 'temporary_pcm_sha256': digest(temporary / 'decoded-audio.caf'),
                       'scope': 'invocation-owned scratch; original retained', 'ffmpeg_used': False})
        swift(paths, temporary, 'media-qa.swift', output / 'video.mp4', duration,
              temporary / 'frame-samples.json', output / 'media-qa.json', decoded)
        swift(paths, temporary, 'decode-audio.swift', source, temporary / 'source.f32')
        swift(paths, temporary, 'decode-audio.swift', output / 'video.mp4', temporary / 'export.f32')
    else:
        import ffmpeg_backend
        ffmpeg_backend.mux(paths, output / 'silent.mp4', source, output / 'video.mp4')
        ffmpeg_backend.inspect(paths, output / 'video.mp4', duration, output / 'captions.json', output / 'media-qa.json')
        ffmpeg_backend.export_frames(paths, output / 'video.mp4', indices, decoded)
        ffmpeg_backend.decode(paths, source, temporary / 'source.f32')
        ffmpeg_backend.decode(paths, output / 'video.mp4', temporary / 'export.f32')
    write_json(output / 'frame-qa.json', frame_qa.verify(temporary / 'frames', decoded, indices))
    from audio_qa import compare_files
    return compare_files(temporary / 'source.f32', temporary / 'export.f32')
