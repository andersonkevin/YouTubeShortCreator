"""Reproduce the bounded lettering helpers from the retained HyperFrames files."""
import argparse
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'registry/blocks/hw-write-title/hw-write-title.html': 'da7375c1acedf86f3cf5839f6bc75ef3817d674752aaf462a9e0d0e471ac7e90',
    'registry/blocks/hw-write-title/assets/baked/caveat-pen.js': 'd7fff8f92e60c6901b3db8b9c0e0f5e1ea4df81f1ea5075b4b8224bbf12b5b0a',
    'registry/components/stitched-text-draw/stitched-text-draw.html': '69b7a8525037d2edd32d57ac08099775816fd4f4eb72393e25dec7627769d1cb',
    'registry/components/caption-blend-difference/caption-blend-difference.html': '82dddc30094cfe03195485f0bf5bad686855732fdadc5a975e4da33eb6447e26',
}


def build(upstream):
    source = {}
    for name, expected in SOURCES.items():
        path = upstream / name
        if path.is_symlink() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError('Retained lettering source changed: ' + name)
        source[name] = path.read_text()
    handwritten = source[next(iter(SOURCES))]
    ease = handwritten.split('window.hwPenEase = function', 1)[1].split('/* ---- word assembly', 1)[0]
    ease = 'const penEase = function' + ease
    stitch = source['registry/components/stitched-text-draw/stitched-text-draw.html']
    painter = stitch[stitch.index('function arcPts'):stitch.index('gsap.set(stage,')]
    painter = painter.replace('var duration = Math.max(0.001, parseFloat(root.dataset.duration || "4"));', 'var duration = 3.2;')
    if 'root.' in painter or 'gsap.' in painter or 'Math.random' in painter:
        raise ValueError('Unexpected source dependency in bounded stitch painter')
    prefix = '/* Retained HyperFrames source, Apache-2.0. Reproduced by tools/vendor_lettering.py. */\n'
    payload = prefix + "(() => { 'use strict';\n" + ease + '''
function stitch(svg,text,coarse) {
 const SVG_NS='http://www.w3.org/2000/svg',exit='none';
 const reg=coarse?{dash:10,gap:7,width:4.2,jitter:2.3}:{dash:6.5,gap:4.5,width:2.6,jitter:1.5};
''' + painter + '''
 return applyTime;
}
window.ShortCreatorLetteringSource={penEase,stitch};
})();
'''
    return {'production-lettering-source.js': payload,
            'production-caveat-pen.js': source['registry/blocks/hw-write-title/assets/baked/caveat-pen.js']}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('upstream',type=Path)
    parser.add_argument('--approve-write',action='store_true')
    args=parser.parse_args()
    for name,content in build(args.upstream.resolve()).items():
        target=ROOT/'templates/v1/assets'/name
        if args.approve_write:
            with target.open('x',encoding='utf-8') as stream:stream.write(content)
        elif not target.is_file() or target.read_text()!=content:
            raise ValueError('Generated lettering payload differs: '+name)
    print('PASS: lettering payloads written' if args.approve_write else 'PASS: lettering source parity')


if __name__=='__main__':main()
