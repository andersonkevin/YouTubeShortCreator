#!/usr/bin/env python3
"""Print a classic bundle of four hash-pinned Three.js r185 postprocessing modules.

No downloads, execution or writes. Supply reviewed local source files and redirect
stdout to a new output path. The existing Three.js runtime supplies all imports.
"""
import argparse
import hashlib
from pathlib import Path
import re

PINS = {
    'postprocessing/Pass.js': '444b409c235ead986893c472e720da1b779a56985c7d10b279c7944b52bd61c5',
    'shaders/CopyShader.js': 'a33057d5ac91c43304c186ac0e8816e62bb2ed471d3a00ff3018dfd5c0389718',
    'shaders/LuminosityHighPassShader.js': '5044f780b6e6cf863947f64c36fe1587132f7fbe395ada863cd1e5f0388dcf1e',
    'postprocessing/UnrealBloomPass.js': '1158bb02f6467889aba19c1a788b9107054d7f6a558498b5e2152db5873bb859',
}
IMPORT = re.compile(r"^import\s*\{([^{}]+)\}\s*from\s*'([^']+)';", re.M)
EXPORT = re.compile(r'^export\s*\{([^{}]+)\};', re.M)
IDENTIFIER = re.compile(r'[A-Za-z_$][\w$]*', re.ASCII)


def names(text):
    result = [part.strip() for part in text.strip().rstrip(',').split(',')]
    if not result or not all(IDENTIFIER.fullmatch(name) for name in result):
        raise ValueError('Unexpected pinned module binding')
    return result


def bundle(source):
    if source.is_symlink() or not source.is_dir():
        raise ValueError('Source must be a regular directory')
    chunks = ["// Three.js r185, MIT. See production-three-notices.txt and postprocess provenance.\n"
              "(()=>{'use strict';const T=window.ShortCreatorThree;\n"
              "if(T?.REVISION!=='185')throw new Error('Pinned Three.js r185 required');\nconst modules={};\n"]
    available = set()
    for filename, expected in PINS.items():
        path = source / filename
        if path.is_symlink() or path.parent.is_symlink() or not path.is_file():
            raise ValueError('Pinned module must be a regular file: ' + filename)
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected:
            raise ValueError('Pinned module hash mismatch: ' + filename)
        text = raw.decode('utf-8')
        imported = []
        for match in IMPORT.finditer(text):
            binding = names(match[1])
            if match[2] == 'three':
                imported.append('const {' + ','.join(binding) + '}=T;')
            else:
                if not set(binding) <= available:
                    raise ValueError('Unexpected pinned local import')
                imported.append('const {' + ','.join(binding) + '}=modules;')
        exported = list(EXPORT.finditer(text))
        if len(exported) != 1:
            raise ValueError('Expected one pinned export declaration')
        exports = names(exported[0][1])
        body = EXPORT.sub('', IMPORT.sub('', text))
        chunks.append('Object.assign(modules,(()=>{\n' + '\n'.join(imported) + '\n' + body +
                      '\nreturn {' + ','.join(exports) + '};\n})());\n')
        available.update(exports)
    chunks.append('window.ShortCreatorThreePostprocess=Object.freeze(modules);\n})();\n')
    return ''.join(chunks)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    print(bundle(parser.parse_args().source), end='')
