#!/usr/bin/env python3
"""Print the pinned HyperFrames liquid-glass GPU core without its DOM capture layer."""
import argparse
import hashlib
from pathlib import Path

SOURCE_SHA256 = 'e960fc4e523aa639d37ebe80bebbd8da6dcb805488a77e45585e80aa9ab98e4c'


def bundle(source):
    if source.is_symlink() or not source.is_file():
        raise ValueError('Liquid-glass source must be a regular file')
    raw = source.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise ValueError('Pinned liquid-glass source hash mismatch')
    text = raw.decode('utf-8')
    marker = '  var R = class {'
    if text.count(marker) != 1 or text.count('    LiquidGlassCanvas: () => R,\n') != 1:
        raise ValueError('Unexpected pinned liquid-glass module structure')
    core = text.split(marker)[0].replace('    LiquidGlassCanvas: () => R,\n', '')
    core = core.replace('var LiquidGlass = (() => {', 'window.ShortCreatorLiquidGlassRuntime = (() => {', 1)
    replacements = {
        'smoothstep(maxD * 0.35, 0.0, inside)': '(1.0 - smoothstep(0.0, maxD * 0.35, inside))',
        'smoothstep(5.0, 0.0, -sdf)': '(1.0 - smoothstep(0.0, 5.0, -sdf))',
        'd = document.createElement("canvas");': 'd = this.nativeUploadCanvas || (this.nativeUploadCanvas = document.createElement("canvas"));',
    }
    for before, after in replacements.items():
        if core.count(before) != 1:
            raise ValueError('Unexpected pinned liquid-glass adaptation site')
        core = core.replace(before, after)
    return ('// HyperFrames liquid-glass GPU core, Apache-2.0. See THIRD_PARTY_NOTICES.md.\n'
            '// Pinned source and modifications: production-liquid-glass-provenance.json.\n' +
            core + '  return I(Y);\n})();\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='Pinned local liquid-glass.iife.js')
    print(bundle(parser.parse_args().source), end='')
