"""Fixed local FFmpeg operations. No shell, downloads, protocols or user options."""
from fractions import Fraction
import json
import math
from pathlib import Path
import subprocess
import wave

from PIL import Image
from safety import number, read_json, require, write_json
from media_contract import duration_seconds
from frame_qa import sample_indices

FORMATS = 'wav,mp3,mov,ogg'


def run(command):
    result = subprocess.run(list(map(str, command)), capture_output=True, timeout=600)
    require(result.returncode == 0,
            'FFmpeg operation failed (no fallback): ' + result.stderr.decode('utf-8', errors='replace')[-2000:])
    return result.stdout.decode('utf-8')


def fresh(path):
    require(path.is_absolute() and path.parent.is_dir(), 'Absolute output with existing parent required')
    require(not path.exists() and not path.is_symlink(), 'Output already exists')


def local_input(path):
    require(isinstance(path, Path) and path.is_absolute() and path.is_file() and not path.is_symlink(),
            'Existing local media file required')
    return ['-protocol_whitelist', 'file', '-format_whitelist', FORMATS, '-i', str(path)]


def command(paths):
    return [paths['ffmpeg'], '-hide_banner', '-v', 'error', '-nostdin', '-n', '-xerror']


def probe(paths, source, count_frames=False):
    args = [paths['ffprobe'], '-v', 'error', *local_input(source),
            '-show_entries', 'format=duration,format_name:stream=index,codec_type,codec_name,width,height,avg_frame_rate,r_frame_rate,nb_read_frames,sample_rate,channels,duration,start_time',
            '-of', 'json']
    if count_frames:
        args.append('-count_frames')
    record = json.loads(run(args))
    require(isinstance(record, dict) and isinstance(record.get('streams'), list), 'Invalid media probe')
    return record


def seconds(value):
    try:
        result = float(value)
    except (ValueError, TypeError):
        raise ValueError('Missing or invalid media duration') from None
    require(math.isfinite(result) and result > 0, 'Invalid media duration')
    return result


def audio_stream(record):
    tracks = [s for s in record['streams'] if s.get('codec_type') == 'audio']
    require(len(tracks) == 1, 'Expected one source audio track')
    require(int(tracks[0].get('channels', 0)) in (1, 2), 'Only mono/stereo audio is supported')
    return tracks[0]


def encode(paths, frames, count, destination):
    fresh(destination)
    run(command(paths) + ['-protocol_whitelist', 'file', '-f', 'image2', '-framerate', '30',
                         '-start_number', '0', '-i', str(frames / 'frame-%05d.png'),
                         '-frames:v', str(count), '-an', '-c:v', 'libx264', '-preset', 'medium',
                         '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(destination)])


def mux(paths, picture, source, destination):
    fresh(destination)
    video = probe(paths, picture)
    audio = probe(paths, source)
    audio_stream(audio)
    video_seconds = seconds(video['format']['duration'])
    audio_seconds = seconds(audio['format']['duration'])
    require(abs(video_seconds - audio_seconds) < 1 / 15, 'Video/audio durations differ too much')
    run(command(paths) + local_input(picture) + local_input(source) +
        ['-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
         '-t', str(min(video_seconds, audio_seconds)), '-map_metadata', '-1',
         '-movflags', '+faststart', str(destination)])


def inspect_record(record, expected):
    expected = duration_seconds(expected)
    duration = seconds(record['format']['duration'])
    require(abs(duration - number(expected)) <= .067, 'Invalid exported duration')
    tracks = record['streams']
    videos = [s for s in tracks if s.get('codec_type') == 'video']
    audios = [s for s in tracks if s.get('codec_type') == 'audio']
    require(len(tracks) == 2 and len(videos) == len(audios) == 1, 'Expected one video and one audio track only')
    video = videos[0]
    require(video.get('codec_name') == 'h264' and audios[0].get('codec_name') == 'aac', 'Expected H.264/AAC export')
    require((video.get('width'), video.get('height')) == (1080, 1920), 'Invalid exported dimensions')
    try:
        rate = Fraction(video['r_frame_rate'])
        count = int(video['nb_read_frames'])
    except (KeyError, ValueError, ZeroDivisionError, TypeError):
        raise ValueError('Missing or invalid frame evidence') from None
    require(rate == 30 and count == round(expected * 30), 'Invalid frame rate or decoded frame count')
    audio_stream(record)
    return {'status': 'PASS', 'duration': duration, 'video_tracks': 1, 'audio_tracks': 1,
            'dimensions': [1080, 1920], 'frame_count': count, 'fps': 30,
            'backend': 'ffmpeg', 'listening_approval': 'pending'}


def validate_timestamps(values, count):
    require(len(values) == count, 'Incomplete decoded timestamp sequence')
    for index, value in enumerate(values):
        require(abs(number(value) - index / 30) <= 1e-5, 'Decoded presentation timestamps are not 30 fps from zero')
    return {'frames_checked': count, 'first_seconds': values[0], 'last_seconds': values[-1],
            'maximum_error_seconds': max(abs(v - i / 30) for i, v in enumerate(values))}


def frame_timing(paths, video, count):
    record = json.loads(run([paths['ffprobe'], '-v', 'error', *local_input(video),
                             '-select_streams', 'v:0', '-show_entries',
                             'frame=best_effort_timestamp_time', '-of', 'json']))
    values = [float(frame['best_effort_timestamp_time']) for frame in record['frames']]
    return validate_timestamps(values, count)


def inspect(paths, video, expected, captions, destination):
    fresh(destination)
    result = inspect_record(probe(paths, video, count_frames=True), expected)
    result['frame_timing'] = frame_timing(paths, video, result['frame_count'])
    indices = sample_indices(read_json(captions), expected)
    select = '+'.join(f'eq(n\\,{index})' for index in indices)
    output = run(command(paths) + local_input(video) +
                 ['-map', '0:v:0', '-an', '-vf', 'select=' + select, '-fps_mode', 'passthrough',
                  '-frames:v', str(len(indices)), '-f', 'framemd5', '-'])
    decoded = [line for line in output.splitlines() if line and not line.startswith('#')]
    require(len(decoded) == len(indices), 'Missing decoded samples')
    result.update(decoded_samples=len(decoded), decoded_frame_indices=indices, decoded_frame_md5=decoded)
    write_json(destination, result)


def export_frames(paths, video, indices, destination):
    require(destination.is_dir() and not destination.is_symlink() and not any(destination.iterdir()),
            'Empty decoded-frame directory required')
    select = '+'.join(f'eq(n\\,{index})' for index in indices)
    run(command(paths) + local_input(video) +
        ['-map', '0:v:0', '-an', '-vf', 'select=' + select, '-fps_mode', 'passthrough',
         '-frames:v', str(len(indices)), '-start_number', '0', str(destination / 'decoded-%05d.png')])


def decode(paths, source, destination):
    fresh(destination)
    audio_stream(probe(paths, source))
    run(command(paths) + local_input(source) +
        ['-map', '0:a:0', '-vn', '-sn', '-dn', '-ac', '1', '-ar', '16000',
         '-c:a', 'pcm_f32le', '-f', 'f32le', str(destination)])


def preflight(paths, temporary):
    frame = temporary / 'frames/frame-00000.png'
    Image.new('RGB', (1080, 1920), '#101010').save(frame)
    (temporary / 'frames/frame-00001.png').write_bytes(frame.read_bytes())
    silent = temporary / 'silent.mp4'
    encode(paths, temporary / 'frames', 2, silent)
    source = temporary / 'probe.wav'
    with wave.open(str(source), 'wb') as stream:
        stream.setparams((1, 2, 48000, 0, 'NONE', 'not compressed'))
        stream.writeframes(bytes(3200 * 2))
    destination = temporary / 'probe.mp4'
    mux(paths, silent, source, destination)
    record = probe(paths, destination, count_frames=True)
    tracks = record['streams']
    require(len(tracks) == 2 and {t.get('codec_name') for t in tracks} == {'h264', 'aac'}, 'FFmpeg codec probe failed')
    require(next(t for t in tracks if t.get('codec_type') == 'video').get('nb_read_frames') == '2', 'FFprobe frame counting unavailable')
    decode(paths, destination, temporary / 'probe.f32')
    require((temporary / 'probe.f32').stat().st_size > 0, 'FFmpeg PCM decoder unavailable')
    return {'backend': 'ffmpeg', 'encoder': 'libx264', 'preset': 'medium', 'crf': 18,
            'pixel_format': 'yuv420p', 'audio_encoder': 'aac', 'audio_bitrate': 192000,
            'container': 'mp4', 'decoded_probe_frames': 2}
