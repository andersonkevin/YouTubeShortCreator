#!/usr/bin/env python3
"""Print six reviewed HyperFrames portal shaders from an exact local source.

No downloads, source execution or file writes. The only GLSL changes replace two
undefined descending smoothstep calls with their defined inverse equivalents.
"""
import argparse
import hashlib
from pathlib import Path

SOURCE_SHA256 = '75a830c267bf298c5bb8a6695c462e45238f58e774ea33e797b4c7bd43c86866'


def bundle(path):
    if path.is_symlink() or not path.is_file():
        raise ValueError('Portal source must be a regular file')
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise ValueError('Portal source hash mismatch')
    source = raw.decode('utf-8')
    body = source.split('      // ---------- shaders (ported verbatim from the experiment) ----------\n', 1)[1].split(
        '      // ---------- font: local Geist Bold TTF', 1)[0]
    for before, after in (
        ('smoothstep(starShape + feather, starShape - feather, dist)',
         '(1.0 - smoothstep(starShape - feather, starShape + feather, dist))'),
        ('smoothstep(feather * 3.0, 0.0, edgeDist)',
         '(1.0 - smoothstep(0.0, feather * 3.0, edgeDist))'),
    ):
        if body.count(before) != 1:
            raise ValueError('Unexpected portal shader source')
        body = body.replace(before, after)
    return '''/* HyperFrames wireframe-portal-title, Apache-2.0. Six original shader bodies;
   defined inverse smoothstep replaces two undefined descending calls.
   See production-wireframe-provenance.json. */
(() => {
  'use strict';
  function create(THREE,W,H,colors) {
    if(THREE?.REVISION!=='185'||![W,H].every(v=>Number.isInteger(v)&&v>0&&v<=4096))
      throw new Error('Pinned portal shader runtime and bounded dimensions required');
    if(!colors||!['surface','foreground'].every(k=>typeof colors[k]==='string'&&/^#[0-9a-f]{6}$/i.test(colors[k])))
      throw new Error('Approved portal palette required');
    const P={...window.ShortCreatorWireframeMotion.parameters,gridLineColor:colors.foreground,portalStartColor:colors.surface};
''' + body + '''
    return {PortalCompositeShader,TransitionFXShader,GlitchShader,EdgeBlurShader,PostFXShader,GridLineShader};
  }
  window.ShortCreatorWireframeShaders=Object.freeze({create});
})();
'''


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    print(bundle(parser.parse_args().source), end='')
