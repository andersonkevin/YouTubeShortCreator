#!/usr/bin/env python3
"""Audit or package an allowlisted public source tree. Never uploads anything."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import zipfile

HOME = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HOME))
from safety import require

DIRECTORIES = {'templates', 'tests', 'tools', 'docs', 'examples'}
PRIVATE = {'workspace', 'workspaces', 'node_modules', '.venv', '.git', 'dist', '__pycache__'}
EXTENSIONS = {'.py', '.mjs', '.swift', '.json', '.md', '.css', '.js', '.txt', '.png', '.jpg'}
ROOT_FILES = {'LICENSE', '.gitignore', '.gitattributes', 'requirements.txt', 'package.json', 'package-lock.json', 'lock.json',
              'ysc.py', 'workflow.py', 'branding.py', 'safety.py', 'runtime.py', 'audio_qa.py', 'capture.mjs',
              'decode-audio.swift', 'encode.swift', 'mux.swift', 'media-qa.swift', 'transcribe.swift',
              'README.md', 'START-HERE.md', 'CLAUDE.md', 'THIRD_PARTY_NOTICES.md', 'SECURITY.md', 'AGENTS.md', 'CONTRIBUTING.md', 'CHANGELOG.md'}
FORBIDDEN = [re.compile(r'/(?:Users|home)/[A-Za-z0-9_.-]+/'),
             re.compile(r'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----'),
             re.compile(r'\b(?:sk-[A-Za-z0-9_-]{24,}|ghp_[A-Za-z0-9]{30,})\b')]


def files(home=HOME):
    output = []
    for path in sorted(home.rglob('*')):
        relative = path.relative_to(home)
        if any(part in PRIVATE for part in relative.parts) or path.name in ('.DS_Store',) or path.suffix == '.pyc':
            continue
        require(not path.is_symlink(), f'Symlink in release tree: {relative}')
        if path.is_dir():
            require(relative.parts[0] in DIRECTORIES, f'Unknown public directory: {relative}; move private data outside the source tree')
            continue
        require((len(relative.parts) == 1 and path.name in ROOT_FILES) or
                (len(relative.parts) > 1 and relative.parts[0] in DIRECTORIES and path.suffix in EXTENSIONS), f'Not on public allowlist: {relative}')
        require(path.stat().st_size <= 4_000_000, f'Unexpectedly large source file: {relative}')
        if path.suffix not in ('.png', '.jpg'):
            content = path.read_text(encoding='utf-8')
            require(not any(pattern.search(content) for pattern in FORBIDDEN), f'Private path or credential pattern: {relative}')
        output.append(path)
    require(output, 'Empty source tree')
    return output


def package(destination, home=HOME):
    selected = files(home)
    require(not destination.exists(), 'Archive exists; choose a new output name')
    require(destination.suffix == '.zip' and destination.parent.is_dir(), 'New ZIP in an existing directory required')
    with zipfile.ZipFile(destination, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
        for path in selected:
            archive.write(path, 'YouTubeShortCreator/' + str(path.relative_to(home)))
    return len(selected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('audit')
    command = sub.add_parser('zip')
    command.add_argument('output', type=Path)
    command.add_argument('--approve-write', action='store_true')
    args = parser.parse_args()
    try:
        if args.command == 'zip':
            require(args.approve_write, 'Packaging requires --approve-write')
            count = package(args.output.expanduser().absolute())
        else:
            count = len(files())
        print(json.dumps({'status': 'PASS', 'public_files': count, 'upload_performed': False}))
        return 0
    except (ValueError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
