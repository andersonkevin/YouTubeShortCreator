"""Closed variable-font compositions bound to an approved display font."""
import json
from pathlib import Path

from PIL import ImageFont

from safety import digest, inside, keys, read_json, require, text

STYLES = ('axis-weight', 'weight-wave', 'font-flex', 'weight-shift')
TAGS = {'Weight': 'wght', 'Width': 'wdth', 'Slant': 'slnt', 'Optical Size': 'opsz'}


def axes_for(path):
    face = ImageFont.truetype(str(path), 32)
    try:
        axes = face.get_variation_axes()
    except OSError as error:
        raise ValueError('Variable typography requires a real variable display font') from error
    result = []
    for axis in axes:
        name = axis['name'].decode('utf-8')
        require(name in TAGS, 'Unsupported variable-font axis: ' + name)
        result.append({'tag': TAGS[name], **{key: axis[key] for key in ('minimum', 'default', 'maximum')}})
    require(result and len({a['tag'] for a in result}) == len(result), 'Invalid font axes')
    return result


def validate(content):
    keys(content, ('style', 'phrases', 'label'), 'variable typography')
    require(content['style'] in STYLES, 'Unknown variable typography style')
    require(isinstance(content['phrases'], list) and len(content['phrases']) == 2,
            'Variable typography needs two explicit phrases')
    for value in content['phrases']:
        text(value, 18)
        require('\n' not in value, 'Variable typography phrases must be single-line')
    text(content['label'], 48)
    require('\n' not in content['label'], 'Variable typography label must be single-line')
    return 2


def install(output, scenes, brand_root, template_hash):
    selected = [s for s in scenes if s['kind'] == 'variable-type']
    if not selected:
        return
    import branding
    require(isinstance(brand_root, Path), 'Variable typography requires an approved brand')
    branding.verified(brand_root, template_hash)
    font = branding.fonts_in(brand_root / 'brand/assets')['display']
    expected = read_json(inside(brand_root, 'brand/approval.json'))['files']['assets/' + font.name]
    copied = inside(output, 'assets/' + font.name)
    require(digest(copied) == expected, 'Variable display font differs from approved brand')
    axes = axes_for(copied)
    by_tag = {row['tag']: row for row in axes}
    require('wght' in by_tag and by_tag['wght']['maximum'] - by_tag['wght']['minimum'] >= 100,
            'Variable typography needs a measured weight range of at least 100')
    if any(s['content']['style'] == 'weight-wave' for s in selected):
        require('slnt' in by_tag and by_tag['slnt']['minimum'] < 0,
                'Weight wave requires a real slant axis, such as the local Recursive font')
    packet = {'url': 'assets/' + font.name, 'sha256': expected, 'axes': axes}
    target = inside(output, 'assets/production-variable-font.js', exists=False)
    with target.open('x', encoding='utf-8') as stream:
        stream.write('window.ShortCreatorVariableFont=Object.freeze(' + json.dumps(packet) + ');\n')
