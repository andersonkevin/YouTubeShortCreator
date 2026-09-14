#!/usr/bin/env python3
"""Print a new implementation lock candidate. Does not approve or overwrite locks."""
import hashlib
import json
from pathlib import Path

HOME = Path(__file__).resolve().parents[1]


def record():
    paths = sorted([*HOME.glob('*.py'), *HOME.glob('*.mjs'), *HOME.glob('*.swift'),
                    *HOME.joinpath('templates').rglob('*.css'), *HOME.joinpath('templates').rglob('*.js'),
                    *HOME.joinpath('templates').rglob('*.json')])
    return {'version': 1, 'files': {str(p.relative_to(HOME)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}}


if __name__ == '__main__':
    print(json.dumps(record(), indent=2))
