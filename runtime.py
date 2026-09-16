"""Explicit local runtime configuration; never installs software or downloads models."""
from pathlib import Path
import os
import platform
import shutil
import subprocess

import PIL
import numpy
import media_backend
from safety import digest, inside, keys, read_json, require, write_json

HOME = Path(__file__).resolve().parent


def versions(config, backend='native'):
    media_backend.validate_backend(backend)
    expected = ['node', 'playwright', 'chrome', 'swift']
    if backend == 'ffmpeg':
        expected += ['ffmpeg', 'ffprobe']
    keys(config, expected, 'runtime paths')
    for key, value in config.items():
        require(isinstance(value, str) and Path(value).is_absolute() and Path(value).is_file(), f'Missing {key}; run configure with its explicit path')
        if key != 'playwright':
            require(os.access(value, os.X_OK), f'Runtime is not executable: {key}')
    def output(command):
        return subprocess.check_output(command, text=True, timeout=30, stderr=subprocess.STDOUT).strip()
    measured = {
        'python': platform.python_version(), 'pillow': PIL.__version__, 'numpy': numpy.__version__,
        'os': platform.system(), 'os_version': platform.release(),
        'node': output([config['node'], '--version']),
        'chrome': output([config['chrome'], '--version']),
        'swift': output([config['swift'], '--version']),
        'playwright': read_json(Path(config['playwright']).parent / 'package.json')['version'],
    }
    if backend == 'ffmpeg':
        measured.update({name: output([config[name], '-version']) for name in ('ffmpeg', 'ffprobe')})
    return measured


def configure(root, supplied):
    require(platform.system() == 'Darwin', 'Full capture/render v1 requires macOS. Branding and validation are portable.')
    backend = media_backend.validate_backend(supplied.get('backend', 'native'))
    target = inside(root, 'runtime.json', exists=False)
    require(not target.exists(), 'Runtime profile already exists; use a new workspace')
    defaults = {
        'node': shutil.which('node'),
        'playwright': str(HOME / 'node_modules/playwright/index.mjs'),
        'chrome': '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        'swift': shutil.which('swift'),
    }
    if backend == 'ffmpeg':
        defaults.update(ffmpeg=shutil.which('ffmpeg'), ffprobe=shutil.which('ffprobe'))
    else:
        require(not supplied.get('ffmpeg') and not supplied.get('ffprobe'), 'FFmpeg paths require --backend ffmpeg')
    config = {key: supplied.get(key) or os.environ.get('YSC_' + key.upper()) or value for key, value in defaults.items()}
    require(all(config.values()), 'Missing runtime; supply explicit tool paths for the selected backend')
    config = {key: str(Path(value).expanduser().resolve()) for key, value in config.items()}
    measured = versions(config, backend)
    capabilities = media_backend.preflight(backend, config)
    # Executable paths are trusted operator configuration, not episode input.
    write_json(target, {'backend': backend, 'paths': config, 'versions': measured, 'capabilities': capabilities})
    return measured


def doctor(root, lock_sha256):
    require(platform.system() == 'Darwin', 'Full capture/render requires macOS')
    target = inside(root, 'runtime.json')
    profile_hash = digest(target)
    record = read_json(target)
    legacy = set(record) == {'paths', 'versions'}
    if not legacy:
        keys(record, ['backend', 'paths', 'versions', 'capabilities'], 'runtime profile')
    backend = media_backend.validate_backend(record.get('backend', 'native'))
    actual = versions(record['paths'], backend)
    require(actual == record['versions'], 'Runtime drift: create and qualify a new workspace/runtime profile; previous renders stay unchanged')
    capabilities = media_backend.preflight(backend, record['paths'])
    if not legacy:
        require(capabilities == record['capabilities'], 'Media capability drift; qualify a new runtime profile')
    require(digest(target) == profile_hash, 'Runtime profile changed during preflight')
    return record['paths'], {'status': 'PASS', 'lock_sha256': lock_sha256, 'versions': actual,
                            'backend': backend, 'capabilities': capabilities, 'runtime_sha256': profile_hash}
