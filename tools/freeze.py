#!/usr/bin/env python3
"""Print a new implementation lock candidate. Does not approve or overwrite locks."""
import hashlib
import json
from pathlib import Path
import sys

HOME = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HOME))


def record():
    paths = sorted([*HOME.glob('*.py'), *HOME.glob('*.mjs'), *HOME.glob('*.swift'),
                    *HOME.joinpath('templates').rglob('*.css'), *HOME.joinpath('templates').rglob('*.js'),
                    *HOME.joinpath('templates').rglob('*.json')])
    library = HOME / 'tools/visual_library'
    paths += [library / name for name in ('kit.py', 'options.js', 'recipes.json', 'vendor/manifest.json')]
    manifest = json.loads((library / 'vendor/manifest.json').read_text())
    from safety import inside
    paths += [inside(library / 'vendor', name) for name in manifest['files']]
    paths = sorted(set(paths))
    return {'version': 1, 'files': {str(p.relative_to(HOME)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}}


if __name__ == '__main__':
    print(json.dumps(record(), indent=2))
