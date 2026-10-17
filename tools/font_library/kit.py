"""Pinned local font choices for new brands; no downloads or approval changes."""
from pathlib import Path
import re

from safety import digest, identifier, inside, keys, read_json, require, text

HOME = Path(__file__).resolve().parent
EXTENSIONS = ('.ttf', '.otf', '.woff2')


def verify_assets(home=None):
    vendor = (HOME if home is None else Path(home)) / 'vendor'
    manifest = read_json(inside(vendor, 'manifest.json'))
    keys(manifest, ('version', 'source', 'fonts', 'files'), 'font manifest')
    require(type(manifest['version']) is int and manifest['version'] == 1, 'Unknown font manifest version')
    require(isinstance(manifest['fonts'], dict) and 1 <= len(manifest['fonts']) <= 100, 'Invalid font catalog')
    require(isinstance(manifest['files'], dict), 'Invalid font file manifest')
    expected = set()
    for name, record in manifest['fonts'].items():
        identifier(name)
        keys(record, ('family', 'style', 'font', 'license', 'license_id', 'source', 'source_sha256',
                      'source_license', 'source_license_sha256', 'selection', 'qualification') +
                     (('axes',) if 'axes' in record else ()), 'font record')
        for field in ('family', 'style'):
            text(record[field], 100)
        require(record['license_id'] in ('OFL-1.1', 'Apache-2.0'), 'Font needs a supported retained license notice')
        for field, folder, extensions in [('font', 'fonts', EXTENSIONS), ('license', 'licenses', ('.txt',))]:
            relative = record[field]
            require(isinstance(relative, str), 'Font payload path must be text')
            path = inside(vendor, relative)
            require(Path(relative).parts[0] == folder and len(Path(relative).parts) == 2 and
                    path.suffix in extensions, 'Unexpected font payload path')
            require(0 < path.stat().st_size <= 4_000_000, 'Font payload exceeds bounds')
            value = manifest['files'].get(relative)
            require(isinstance(value, str) and re.fullmatch(r'[a-f0-9]{64}', value), 'Invalid font hash')
            require(digest(path) == value, 'Font library drift: ' + relative)
            source_hash = record['source_sha256' if field == 'font' else 'source_license_sha256']
            require(value == source_hash, 'Font source hash mismatch')
            expected.add(relative)
        if 'axes' in record:
            from font_motion import axes_for
            require(record['axes'] == axes_for(inside(vendor, record['font'])), 'Variable font axes disagree with the binary')
        notice = inside(vendor, record['license']).read_text(encoding='utf-8')
        if record['license_id'] == 'OFL-1.1':
            require('SIL OPEN FONT LICENSE Version 1.1' in notice and 'Copyright' in notice,
                    'Missing retained font license notice')
        else:
            require('Apache License' in notice and 'Version 2.0' in notice and 'Copyright' in notice,
                    'Missing retained Apache font license notice')
    require(set(manifest['files']) == expected, 'Undeclared font payload in manifest')
    return manifest


def entries():
    manifest = verify_assets()
    return [{'id': 'font:' + name, 'family': row['family'], 'style': row['style'],
             'license': row['license_id'], 'axes': row.get('axes', []),
             'scope': 'New brand onboarding; preview and approval required'}
            for name, row in sorted(manifest['fonts'].items())]


def resolve(value):
    require(isinstance(value, str) and value.startswith('font:'), 'Font catalog ID required')
    name = value[5:]
    identifier(name)
    manifest = verify_assets()
    require(name in manifest['fonts'], 'Unknown font catalog ID')
    row = manifest['fonts'][name]
    return inside(HOME / 'vendor', row['font']), row
