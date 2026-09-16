#!/usr/bin/env python3
"""Optional local narration synthesis with Kokoro. Writes only into a private workspace.

This tool runs the Kokoro text-to-speech model on this machine through
kokoro-onnx and ONNX Runtime. It installs nothing, downloads nothing and calls
no service: the operator prepares an isolated Python environment and places the
model files locally, and `doctor` verifies both against the pinned manifest.

The output is a plain 24 kHz mono PCM WAV plus a JSON record. It enters the
pipeline like any recording (import, transcribe, caption-draft) and needs the
same listening review; a generated voice is never approved by this tool.
"""
import argparse
import hashlib
import importlib
import importlib.metadata
import json
import math
from pathlib import Path
import platform
import re
import sys
import time
import wave

HOME = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HOME))
from safety import digest, identifier, inside, read_json, require, text, write_json  # noqa: E402

MANIFEST = HOME / 'tools' / 'voice-models.json'
LANGUAGE = 'en-us'
SAMPLE_RATE = 24000
VOICE_PATTERN = re.compile(r'a[fm]_[a-z]+')  # American English voices only
SPEED_RANGE = (0.8, 1.2)
MAX_CHARS = 3000
THREADS = 4
PACKAGES = ('kokoro-onnx', 'onnxruntime', 'numpy', 'phonemizer', 'espeakng-loader')


def workspace_root(workspace):
    root = Path(workspace).expanduser()
    require(root.is_dir() and not root.is_symlink(), 'Existing private workspace directory required')
    return root.resolve()


def manifest():
    data = read_json(MANIFEST)
    require(set(data) == {'version', 'engine', 'files', 'sources', 'licenses', 'note'}, 'Unexpected manifest fields')
    require(isinstance(data['files'], list) and len(data['files']) == 2, 'Manifest must pin the model and the voices file')
    for entry in data['files']:
        require(set(entry) == {'name', 'role', 'bytes', 'sha256'} and re.fullmatch(r'[0-9a-f]{64}', entry['sha256']), 'Invalid manifest entry')
    return data


def models_dir(root, supplied=None):
    if supplied:
        # Like runtime executables, a model directory outside the workspace is trusted operator configuration.
        directory = Path(supplied).expanduser().resolve()
    else:
        directory = inside(root, 'voice/models', exists=False)
    require(directory.is_dir() and not directory.is_symlink(), 'Model directory missing; place the pinned model files there (see docs/VOICE.md)')
    return directory


def verify_models(directory):
    """Every pinned file must exist with the exact size and SHA-256. Nothing is downloaded."""
    data = manifest()
    paths = {}
    for entry in data['files']:
        path = directory / entry['name']
        require(path.is_file() and not path.is_symlink(), f'Missing model file: {entry["name"]}')
        require(path.stat().st_size == entry['bytes'], f'Unexpected size for {entry["name"]}')
        require(digest(path) == entry['sha256'], f'Hash mismatch for {entry["name"]}; only the pinned release is accepted')
        paths[entry['role']] = path
    return paths, data


def packages():
    found = {}
    for name in PACKAGES:
        try:
            found[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            found[name] = None
    return found


def load_engine(paths):
    started = time.perf_counter()
    onnxruntime = importlib.import_module('onnxruntime')
    kokoro = importlib.import_module('kokoro_onnx')
    options = onnxruntime.SessionOptions()
    options.intra_op_num_threads = THREADS
    session = onnxruntime.InferenceSession(str(paths['model']), sess_options=options, providers=['CPUExecutionProvider'])
    engine = kokoro.Kokoro.from_session(session, str(paths['voices']))
    return engine, {'providers': list(session.get_providers()), 'load_seconds': round(time.perf_counter() - started, 3), 'threads': THREADS}


def doctor(root, models=None):
    """Read-only environment check. Collects every problem instead of stopping at the first."""
    problems, report = [], {'python': platform.python_version(), 'os': platform.system(), 'packages': packages(), 'network': 'none', 'installation_performed': False}
    for name, version in report['packages'].items():
        if version is None:
            problems.append(f'Package not installed in this Python: {name}')
    try:
        directory = models_dir(root, models)
        paths, data = verify_models(directory)
        report['models'] = {'directory': str(directory), 'files': {k: v.name for k, v in paths.items()}, 'engine': data['engine']}
    except (ValueError, OSError) as error:
        problems.append(str(error))
        paths = None
    try:
        loader = importlib.import_module('espeakng_loader')
        library = Path(loader.get_library_path())
        require(library.is_file(), 'espeak-ng library missing from espeakng-loader')
        report['espeak'] = 'bundled library present'
    except Exception as error:  # noqa: BLE001 - reported, not raised
        problems.append(f'espeak-ng phonemizer unavailable: {error}')
    if paths and not problems:
        try:
            engine, info = load_engine(paths)
            voices = [v for v in engine.get_voices() if VOICE_PATTERN.fullmatch(v)]
            report['engine'] = {**info, 'american_voices': len(voices)}
        except Exception as error:  # noqa: BLE001 - reported, not raised
            problems.append(f'Engine failed to load: {error}')
    report['status'] = 'FAIL' if problems else 'PASS'
    report['problems'] = problems
    return report


def script_text(root, script):
    source = inside(root, script)
    require(source.suffix in ('.txt', '.md') and source.stat().st_size <= 20_000, 'Script must be a small .txt or .md file')
    raw = source.read_text(encoding='utf-8')
    value = ' '.join(line.strip() for line in raw.splitlines() if line.strip())
    value = re.sub(r'[ \t]+', ' ', value)
    text(value, MAX_CHARS)
    require(not re.search(r'[<>]', value), 'Scripts must not contain markup')
    return source, value


def render(engine, script, voice, speed):
    numpy = importlib.import_module('numpy')
    started = time.perf_counter()
    samples, rate = engine.create(script, voice=voice, speed=speed, lang=LANGUAGE)
    elapsed = time.perf_counter() - started
    samples = numpy.asarray(samples, dtype=numpy.float32)
    require(rate == SAMPLE_RATE, f'Unexpected sample rate {rate}')
    require(samples.ndim == 1 and samples.size > rate // 10, 'Synthesis produced no audio')
    require(bool(numpy.isfinite(samples).all()), 'Synthesis produced non-finite samples')
    peak = float(numpy.max(numpy.abs(samples)))
    require(0 < peak < 1, 'Peak outside the PCM range; review before export')
    pcm = numpy.clip(numpy.round(samples * 32767), -32768, 32767).astype('<i2')
    duration = len(samples) / rate
    return pcm, {'sample_rate': rate, 'channels': 1, 'bit_depth': 16, 'duration_seconds': round(duration, 3), 'generation_seconds': round(elapsed, 3),
                 'real_time_factor': round(elapsed / duration, 4), 'peak_dbfs': round(20 * math.log10(peak), 2)}


def write_wav(path, pcm, rate):
    require(not path.exists() and not path.is_symlink(), 'Output exists; use a new name')
    with path.open('xb') as stream:
        with wave.open(stream, 'wb') as out:
            out.setnchannels(1)
            out.setsampwidth(2)
            out.setframerate(rate)
            out.writeframes(pcm.tobytes())
    with wave.open(str(path), 'rb') as check:
        require(check.getnframes() == len(pcm) and check.getframerate() == rate and check.getnchannels() == 1, 'WAV readback mismatch')


def _record(source, script, voice, speed, metrics, info, paths, data, output):
    return {
        'status': 'review_required', 'listening_approval': 'pending', 'publication_performed': False,
        'engine': data['engine'], 'language': LANGUAGE, 'voice': voice, 'speed': speed, 'threads': info.get('threads', THREADS), 'providers': info.get('providers', []),
        'script': {'path': source.name, 'sha256': hashlib.sha256(script.encode('utf-8')).hexdigest(), 'characters': len(script), 'words': len(script.split())},
        'output': {'path': output.name, 'sha256': digest(output), **metrics},
        'load_seconds': info.get('load_seconds'),
        'models': {role: {'name': path.name, 'sha256': next(e['sha256'] for e in data['files'] if e['role'] == role)} for role, path in paths.items()},
        'packages': packages(), 'python': platform.python_version(),
        'word_alignment': 'not measured; run transcribe on the WAV', 'postprocessing': 'none; 16-bit PCM export only', 'network': 'none',
    }


def synthesize(root, script, output, voice, speed, approved, models=None, engine=None):
    require(approved, 'Writer requires --approve-write')
    require(VOICE_PATTERN.fullmatch(voice or ''), 'Use an American English Kokoro voice (af_* or am_*)')
    require(type(speed) in (int, float) and SPEED_RANGE[0] <= speed <= SPEED_RANGE[1], 'Speed must stay between 0.8 and 1.2')
    source, value = script_text(root, script)
    target = inside(root, output, exists=False)
    require(Path(output).parts[0] == 'intake' and target.suffix == '.wav' and target.parent.is_dir(), 'New .wav output under intake/ required')
    sidecar = target.with_name(target.stem + '.voice.json')
    require(not target.exists() and not sidecar.exists(), 'Output or its record already exists; use a new name')
    paths, data = verify_models(models_dir(root, models))
    info = {}
    if engine is None:
        engine, info = load_engine(paths)
    require(voice in engine.get_voices(), f'Voice not in the voices file: {voice}')
    pcm, metrics = render(engine, value, voice, speed)
    write_wav(target, pcm, metrics['sample_rate'])
    record = _record(source, value, voice, speed, metrics, info, paths, data, target)
    write_json(sidecar, record)
    return target, record


def audition(root, script, voices, run_id, approved, speed=1.0, models=None, engine=None):
    """One WAV per voice for the same short script, to choose a voice by listening."""
    require(approved, 'Writer requires --approve-write')
    identifier(run_id)
    require(isinstance(voices, list) and 1 <= len(voices) <= 12 and len(set(voices)) == len(voices), 'Give 1-12 distinct voices')
    for voice in voices:
        require(VOICE_PATTERN.fullmatch(voice or ''), f'Use American English Kokoro voices (af_* or am_*): {voice}')
    require(type(speed) in (int, float) and SPEED_RANGE[0] <= speed <= SPEED_RANGE[1], 'Speed must stay between 0.8 and 1.2')
    source, value = script_text(root, script)
    require(len(value) <= 600, 'Audition scripts stay under 600 characters')
    parent = inside(root, 'voice/auditions', exists=False)
    output = parent / run_id
    require(not parent.is_symlink() and not output.exists() and not output.is_symlink(), 'New audition run required')
    paths, data = verify_models(models_dir(root, models))
    info = {}
    if engine is None:
        engine, info = load_engine(paths)
    available = set(engine.get_voices())
    missing = [v for v in voices if v not in available]
    require(not missing, f'Voices not in the voices file: {", ".join(missing)}')
    parent.mkdir(parents=True, exist_ok=True)
    output.mkdir()
    results = []
    for voice in voices:
        pcm, metrics = render(engine, value, voice, speed)
        target = output / f'{voice}.wav'
        write_wav(target, pcm, metrics['sample_rate'])
        results.append({'voice': voice, 'file': target.name, 'sha256': digest(target), **metrics})
    write_json(output / 'audition.json', {
        'status': 'review_required', 'listening_approval': 'pending', 'publication_performed': False, 'engine': data['engine'], 'language': LANGUAGE, 'speed': speed,
        'script': {'path': source.name, 'sha256': hashlib.sha256(value.encode('utf-8')).hexdigest(), 'text': value},
        'voices': results, 'load_seconds': info.get('load_seconds'), 'providers': info.get('providers', []), 'packages': packages(), 'python': platform.python_version(),
        'note': 'Compare by listening. Metrics describe timing and level only, not naturalness or pronunciation.',
    })
    return output


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--workspace', default=str(HOME / 'workspace'), help='Private workspace (default: ./workspace beside ysc.py)')
    parser.add_argument('--models', help='Directory holding the pinned model files (default: <workspace>/voice/models)')
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('doctor', help='Verify the Python environment and the model files; read-only')
    sub.add_parser('voices', help='List the American English voices in the voices file; read-only')
    command = sub.add_parser('synthesize', help='Write a new intake WAV and its record from a script file')
    command.add_argument('script', help='Workspace-relative .txt or .md script')
    command.add_argument('output', help='New .wav under intake/')
    command.add_argument('--voice', default='af_heart')
    command.add_argument('--speed', type=float, default=1.0)
    command.add_argument('--approve-write', action='store_true')
    command = sub.add_parser('audition', help='Write one WAV per voice for a short script under voice/auditions/<run-id>/')
    command.add_argument('script')
    command.add_argument('--voices', default='af_heart,af_bella,af_sky,am_michael,am_adam', help='Comma-separated Kokoro voices')
    command.add_argument('--run-id', required=True)
    command.add_argument('--speed', type=float, default=1.0)
    command.add_argument('--approve-write', action='store_true')
    args = parser.parse_args(argv)
    try:
        root = workspace_root(args.workspace)
        if args.command == 'doctor':
            report = doctor(root, args.models)
            print(json.dumps(report, indent=2))
            return 0 if report['status'] == 'PASS' else 1
        if args.command == 'voices':
            paths, _ = verify_models(models_dir(root, args.models))
            engine, _ = load_engine(paths)
            print(json.dumps({'language': LANGUAGE, 'voices': sorted(v for v in engine.get_voices() if VOICE_PATTERN.fullmatch(v))}, indent=2))
            return 0
        if args.command == 'synthesize':
            target, record = synthesize(root, args.script, args.output, args.voice, args.speed, args.approve_write, args.models)
            print(json.dumps({'output': str(target), 'record': str(target.with_name(target.stem + '.voice.json')), **{k: record[k] for k in ('status', 'listening_approval', 'voice')}, 'duration_seconds': record['output']['duration_seconds']}, indent=2))
            return 0
        output = audition(root, args.script, [v.strip() for v in args.voices.split(',') if v.strip()], args.run_id, args.approve_write, args.speed, args.models)
        print(json.dumps({'output': str(output), 'status': 'review_required', 'listening_approval': 'pending'}, indent=2))
        return 0
    except (ValueError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
