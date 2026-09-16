"""Shared local-file boundaries. No shell commands, uploads, or overwrites."""
import hashlib
import json
import math
import os
from pathlib import Path
import re
import tempfile
import warnings


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    require(path.stat().st_size <= 2_000_000, 'JSON exceeds 2 MB')
    def reject(value):
        raise ValueError(f'Non-finite JSON number: {value}')
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, f'Duplicate JSON key: {key}')
            result[key] = value
        return result
    def finite_float(value):
        result = float(value)
        require(math.isfinite(result), 'Non-finite JSON number')
        return result
    return json.loads(path.read_text(encoding='utf-8'), parse_constant=reject,
                      parse_float=finite_float, object_pairs_hook=unique)


def write_json(path, value):
    payload = json.dumps(value, indent=2, ensure_ascii=True, allow_nan=False) + '\n'
    if path.exists() or path.is_symlink():
        raise FileExistsError(path)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent,
                                         prefix='.' + path.name + '.', suffix='.tmp', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        # A same-directory hard link publishes complete bytes without replacing a target.
        os.link(temporary, path)
    finally:
        if temporary is not None:
            try:
                temporary.unlink(missing_ok=True)
            except OSError:
                warnings.warn('Could not remove invocation-owned JSON temporary file; inspect the destination directory', RuntimeWarning)


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def inside(base, value, exists=True):
    require(isinstance(value, str) and value and '\\' not in value, 'Relative path required')
    relative = Path(value)
    require(not relative.is_absolute() and '..' not in relative.parts, 'Relative contained path required')
    candidate = base / relative
    for node in [candidate, *candidate.parents]:
        require(not node.is_symlink(), 'Symlink paths are not allowed')
        if node == base:
            break
    candidate.resolve().relative_to(base.resolve())
    if exists:
        require(candidate.is_file(), f'Missing input: {value}')
    return candidate


def identifier(value):
    require(isinstance(value, str) and len(value) <= 64 and re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', value), 'Use a lowercase hyphenated identifier, max 64 characters')
    return value


def keys(value, expected, name):
    require(isinstance(value, dict) and set(value) == set(expected), f'Unexpected fields in {name}')


def number(value):
    require(type(value) in (int, float) and math.isfinite(value), 'Finite numeric value required')
    return value


def text(value, maximum=300):
    require(isinstance(value, str) and value.strip() and len(value) <= maximum, 'Invalid or oversized text')
    require(not any(ord(c) < 32 and c not in '\n\t' for c in value), 'Control characters blocked')
    return value
