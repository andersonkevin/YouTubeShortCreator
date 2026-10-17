#!/usr/bin/env python3
"""Print the reproducible classic bundle of the two pinned local Three.js modules.

This is a converter for these exact files, not a general JavaScript bundler.
It never downloads, executes, or writes source. Redirect stdout to a new file.
"""
import argparse
import hashlib
from pathlib import Path
import re

PINS = {
    'three.core.min.js': '5881a55b70ae9082f2f8253138c9f484b024a1f6ab2cfadc87af4673481efa13',
    'three.module.min.js': '1897d797c460a9c2d53468f5ccc92473182d81de7d186ac22ed24d36a9b3f3c7',
}
STATEMENT = re.compile(r'''^(import|export)\s*\{([^{}]+)\}(?:\s*from\s*["']([^"']+)["'])?\s*;''', re.M)
BINDING = re.compile(r'([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?', re.ASCII)


def bindings(text):
    result = []
    for item in text.strip().rstrip(',').split(','):
        match = BINDING.fullmatch(item.strip())
        if not match:
            raise ValueError('Unexpected pinned module binding')
        local, alias = match.groups()
        result.append((local, alias or local))
    if len({alias for _, alias in result}) != len(result):
        raise ValueError('Duplicate pinned module binding')
    return result


def bundle(source):
    bodies = {}
    statements = {}
    for name, expected in PINS.items():
        path = source / name
        if path.is_symlink() or not path.is_file():
            raise ValueError('Pinned module must be a regular file: ' + name)
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected:
            raise ValueError('Pinned module hash mismatch: ' + name)
        text = raw.decode('utf-8')
        statements[name] = list(STATEMENT.finditer(text))
        bodies[name] = STATEMENT.sub('', text)
    core = statements['three.core.min.js']
    module = statements['three.module.min.js']
    if [(m[1], m[3]) for m in core] != [('export', None)] or [
            (m[1], m[3]) for m in module] != [
                ('import', './three.core.min.js'), ('export', './three.core.min.js'), ('export', None)]:
        raise ValueError('Unexpected pinned module structure')
    exports = lambda pairs: ','.join(f'{alias}:{local}' for local, alias in pairs)
    imports = ','.join(f'{local}:{alias}' for local, alias in bindings(module[0][2]))
    reexports = ','.join(f'{alias}:core.{local}' for local, alias in bindings(module[1][2]))
    return (
        '// Pinned Three.js r185. See production-three-notices.txt and provenance JSON.\n'
        "(() => { 'use strict';\nconst core=(() => {\n" + bodies['three.core.min.js'] +
        '\nreturn {' + exports(bindings(core[0][2])) + '};\n})();\nconst api=(() => {\nconst {' +
        imports + '}=core;\n' + bodies['three.module.min.js'] + '\nreturn {' + reexports + ',' +
        exports(bindings(module[2][2])) + '};\n})();\nwindow.ShortCreatorThree=Object.freeze(api);\n})();\n'
    )


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='Directory containing the two pinned local modules')
    print(bundle(parser.parse_args().source), end='')
