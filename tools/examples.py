#!/usr/bin/env python3
"""Import complete public examples through the normal episode authoring API."""
import argparse
from pathlib import Path
import re
import shutil
import sys
import wave

HOME = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HOME))

import branding
from media_contract import COMPOSITION_FORMATS
from safety import digest, identifier, inside, keys, read_json, require
import workflow
import ysc


def verify_bundle(home=HOME):
    """Verify only explicitly manifested public inputs, never workspace media."""
    folder = home / 'examples/v0.5.0'
    manifest = read_json(inside(folder, 'manifest.json'))
    keys(manifest, ('version', 'examples', 'files'), 'example manifest')
    require(type(manifest['version']) is int and manifest['version'] == 1, 'Unsupported example manifest')
    examples, files = manifest['examples'], manifest['files']
    require(isinstance(examples, dict) and 1 <= len(examples) <= 8, 'Invalid example catalog')
    require(isinstance(files, dict) and 1 <= len(files) <= 80, 'Invalid example files')
    for name, row in examples.items():
        identifier(name)
        keys(row, ('format', 'title', 'description'), 'example entry')
        require(row['format'] in COMPOSITION_FORMATS, 'Invalid example format')
        for field in ('title', 'description'):
            require(isinstance(row[field], str) and 0 < len(row[field]) <= 300, 'Invalid example copy')
        for filename in ('narration.wav', 'transcript.json', 'captions.json', 'cover.png', 'storyboard.json', 'script.txt'):
            require(name + '/' + filename in files, 'Incomplete example inputs')
    for name, expected in files.items():
        relative = Path(name)
        require(len(relative.parts) == 2 and relative.parts[0] in examples and
                re.fullmatch(r'[a-z0-9][a-z0-9-]*\.(wav|png|json|txt)', relative.name), 'Invalid public example path')
        require(isinstance(expected, str) and re.fullmatch(r'[a-f0-9]{64}', expected), 'Invalid example hash')
        source = inside(folder, name)
        require(0 < source.stat().st_size <= 4_000_000, 'Example file exceeds public size bound')
        require(digest(source) == expected, 'Example hash mismatch: ' + name)
        if source.suffix == '.wav':
            require(source.name == 'narration.wav', 'Only the example narration may be packaged')
            with wave.open(str(source), 'rb') as audio:
                require(audio.getnchannels() == 1 and audio.getsampwidth() == 2 and
                        audio.getframerate() == 24000 and 1 < audio.getnframes() / 24000 <= 60,
                        'Expected a short mono PCM example recording')
    return manifest


def create(root, name, approved=False, home=HOME):
    require(approved, 'Example import writes files; pass --approve-write')
    identifier(name)
    root = Path(root).expanduser().absolute()
    require(root.is_dir() and all(not p.is_symlink() for p in (root, *root.parents)),
            'An existing workspace without symlink components is required')
    root = root.resolve()
    if root.is_relative_to(home.resolve()):
        relative = root.relative_to(home.resolve())
        require(relative.parts and relative.parts[0] in ('workspace', 'workspaces'),
                'Example outputs must stay in a private workspace')
    manifest = verify_bundle(home)
    require(name in manifest['examples'], 'Unknown example; run list')
    brand = branding.verified(root, workflow.verify_lock())
    require(brand['language'] == 'en-US', 'These recordings need an en-US example workspace')
    destination = inside(root, 'intake/example-' + name, exists=False)
    episode = inside(root, 'episodes/' + name, exists=False)
    require(destination.parent.is_dir() and episode.parent.is_dir(), 'Initialize the workspace first')
    require(not destination.exists() and not episode.exists(), 'Example exists; use a new workspace')
    destination.mkdir()
    for relative, expected in manifest['files'].items():
        if Path(relative).parts[0] != name:
            continue
        source = inside(home / 'examples/v0.5.0', relative)
        target = destination / source.name
        with source.open('rb') as reader, target.open('xb') as writer:
            shutil.copyfileobj(reader, writer)
        require(digest(target) == expected == digest(source), 'Example changed while copying')
    prefix = 'intake/example-' + name + '/'
    return ysc.new_episode(root, name, prefix + 'narration.wav', prefix + 'transcript.json',
                           prefix + 'cover.png', prefix + 'captions.json',
                           output_format=manifest['examples'][name]['format'],
                           storyboard=prefix + 'storyboard.json')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('list', help='Verify and list the bundled examples')
    command = commands.add_parser('create', help='Import one example into an approved private workspace')
    command.add_argument('example')
    command.add_argument('--workspace', type=Path, required=True)
    command.add_argument('--approve-write', action='store_true')
    args = parser.parse_args(argv)
    try:
        if args.command == 'list':
            for name, row in verify_bundle()['examples'].items():
                print(f'{name}: {row["format"]} - {row["title"]}')
        else:
            print(create(args.workspace, args.example, args.approve_write))
        return 0
    except (ValueError, OSError, wave.Error) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
