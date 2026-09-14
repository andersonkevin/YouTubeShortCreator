"""Explicit local runtime configuration; never installs software or downloads models."""
from pathlib import Path
import os
import platform
import shutil
import subprocess

import PIL
import numpy
from safety import digest, inside, keys, read_json, require, write_json

HOME = Path(__file__).resolve().parent


def versions(config):
    keys(config, ['node', 'playwright', 'chrome', 'swift'], 'runtime paths')
    for key, value in config.items():
        require(isinstance(value, str) and Path(value).is_absolute() and Path(value).is_file(), f'Missing {key}; run configure with its explicit path')
    def output(command):
        return subprocess.check_output(command, text=True, timeout=30, stderr=subprocess.STDOUT).strip()
    return {
        'python': platform.python_version(), 'pillow': PIL.__version__, 'numpy': numpy.__version__,
        'os': platform.system(), 'os_version': platform.release(),
        'node': output([config['node'], '--version']),
        'chrome': output([config['chrome'], '--version']),
        'swift': output([config['swift'], '--version']),
        'playwright': read_json(Path(config['playwright']).parent / 'package.json')['version'],
    }


def configure(root, supplied):
    require(platform.system() == 'Darwin', 'Full capture/render v1 requires macOS. Branding and validation are portable.')
    defaults = {
        'node': shutil.which('node'),
        'playwright': str(HOME / 'node_modules/playwright/index.mjs'),
        'chrome': '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        'swift': shutil.which('swift'),
    }
    config = {key: supplied.get(key) or os.environ.get('YSC_' + key.upper()) or value for key, value in defaults.items()}
    require(all(config.values()), 'Missing runtime; pass --node, --playwright, --chrome and/or --swift')
    config = {key: str(Path(value).expanduser().resolve()) for key, value in config.items()}
    measured = versions(config)
    # Executable paths are trusted operator configuration, not episode input.
    write_json(inside(root, 'runtime.json', exists=False), {'paths': config, 'versions': measured})
    return measured


def doctor(root, lock_sha256):
    record = read_json(inside(root, 'runtime.json'))
    actual = versions(record['paths'])
    require(actual == record['versions'], 'Runtime drift: create and qualify a new workspace/runtime profile; previous renders stay unchanged')
    return record['paths'], {'status': 'PASS', 'lock_sha256': lock_sha256, 'versions': actual}
