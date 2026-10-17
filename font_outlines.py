"""Private, bounded outlines from the approved display font; no font substitution."""
import json
from pathlib import Path
import subprocess
import tempfile
import unicodedata

import branding
from safety import digest, inside, keys, number, read_json, require, text

HOME = Path(__file__).resolve().parent


def validate_word(value):
    return validate_copy(value, 8)


def validate_copy(value, maximum):
    require(maximum in (8, 18, 36, 48), 'Unknown approved-font text limit')
    text(value, maximum)
    require(value == value.strip() and unicodedata.normalize('NFC', value) == value,
            'Extruded text requires NFC without outer spaces')
    require(all(32 <= ord(c) <= 126 or (0xA0 <= ord(c) <= 0x024F and unicodedata.category(c).startswith('L')) for c in value),
            'Extruded text supports basic Latin and accented Latin letters')
    return value


def validate_geometry(data, characters):
    keys(data, ('version', 'units', 'postscript_name', 'glyphs'), 'font outlines')
    require(data['version'] == 1 and data['units'] == 1000, 'Unknown outline schema')
    text(data['postscript_name'], 200)
    require(isinstance(data['glyphs'], dict) and set(data['glyphs']) == set(characters), 'Outline repertoire mismatch')
    count = 0
    for character, row in data['glyphs'].items():
        keys(row, ('advance', 'commands'), 'glyph')
        require(0 < number(row['advance']) <= 5000, 'Invalid glyph advance')
        commands = row['commands']
        require(isinstance(commands, list) and len(commands) <= 8192, 'Invalid glyph command list')
        require(bool(commands) == (character != ' '), 'Missing glyph outline')
        opened = False
        for command in commands:
            require(isinstance(command, list) and command and isinstance(command[0], str), 'Invalid glyph command')
            kind = command[0]
            require(kind in ('M', 'L', 'Q', 'C', 'Z') and len(command) == {'M': 3, 'L': 3, 'Q': 5, 'C': 7, 'Z': 1}[kind],
                    'Invalid glyph command arity')
            require((kind == 'M' and not opened) or (kind != 'M' and opened), 'Unclosed glyph contour')
            opened = kind != 'Z'
            for coordinate in command[1:]: require(abs(number(coordinate)) <= 10000, 'Unbounded glyph coordinate')
        require(not opened, 'Open glyph contour')
        count += len(commands)
    require(count <= 100000, 'Font outline complexity exceeds limit')
    return data


def install(output, words, brand_root, template_hash, runtime_paths, *, nonzero=False):
    require(isinstance(nonzero, bool), 'Explicit outline normalization mode required')
    require(isinstance(brand_root, Path) and isinstance(template_hash, str), 'Approved brand and template hash required for font outlines')
    name = 'production-portal-outlines' if nonzero else 'production-font-outlines'
    target = inside(output, 'assets/' + name + '.js', exists=False)
    require(not target.exists(), 'Font outline bundle already exists')
    for word in words: validate_copy(word, 48 if nonzero else 8)
    characters = ''.join(sorted(set(''.join(words))))
    require(0 < len(characters) <= 256, 'Outline repertoire exceeds limit')
    branding.verified(brand_root, template_hash)
    approval = read_json(inside(brand_root, 'brand/approval.json'))
    display = branding.fonts_in(brand_root / 'brand/assets')['display']
    copied = inside(output, 'assets/' + display.name)
    expected = approval['files'].get('assets/' + display.name)
    require(0 < copied.stat().st_size <= 20_000_000 and digest(copied) == expected, 'Copied display font differs from approved brand')
    require(isinstance(runtime_paths, dict) and isinstance(runtime_paths.get('swift'), str), 'Qualified Swift runtime required for font outlines')
    executable = Path(runtime_paths['swift'])
    require(executable.is_absolute() and executable.is_file(), 'Qualified absolute Swift executable required')
    with tempfile.TemporaryDirectory(prefix='shortcreator-font-outlines-') as directory:
        scratch = Path(directory)
        snapshot = scratch / ('display' + display.suffix)
        snapshot.write_bytes(copied.read_bytes())
        require(digest(snapshot) == expected, 'Display font changed during outline preparation')
        try:
            command = [str(executable), '-module-cache-path', str(scratch / 'swift-cache'),
                       str(HOME / 'font-outlines.swift'), str(snapshot), characters]
            if nonzero: command.append('--nonzero')
            result = subprocess.run(command,
                                    capture_output=True, timeout=180, check=False)
        except (OSError, subprocess.TimeoutExpired) as error:
            raise ValueError('Approved-font outline extraction failed') from error
        require(result.returncode == 0, 'Approved-font outline extraction failed: ' + result.stderr.decode('utf-8', errors='replace')[:400])
        require(0 < len(result.stdout) <= 2_000_000, 'Font outline output exceeds limit')
        raw = scratch / 'outlines.json'
        raw.write_bytes(result.stdout)
        geometry = validate_geometry(read_json(raw), characters)
    require(digest(copied) == expected, 'Copied display font changed during outline extraction')
    geometry['font_sha256'] = expected
    if nonzero: geometry['normalization'] = 'nonzero'
    binding = 'ShortCreatorPortalOutlines' if nonzero else 'ShortCreatorFontOutlines'
    with target.open('x', encoding='utf-8') as stream:
        stream.write('window.' + binding + '=Object.freeze(' + json.dumps(geometry, ensure_ascii=True, allow_nan=False, separators=(',', ':')) + ');\n')
