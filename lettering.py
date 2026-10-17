"""Opt-in drawn lettering and controlled difference blending."""
from pathlib import Path
import re
from safety import digest, inside, keys, read_json, require, text

STYLES = ('write-on', 'stitch-fine', 'stitch-coarse', 'difference')
CAVEAT_SHA = '891951df5e8b5b0f0bc760d31375405e795c666b5add70437de12d4a6482b33f'


def validate(content):
    keys(content, ('style', 'phrases', 'label'), 'drawn lettering')
    require(content['style'] in STYLES, 'Unknown lettering style')
    require(isinstance(content['phrases'], list) and len(content['phrases']) == 2,
            'Lettering needs two explicit phrases')
    for phrase in content['phrases']:
        text(phrase, 12)
        pattern = r'[A-Z0-9 ]+' if content['style'].startswith('stitch') else r'[A-Za-z0-9 ]+'
        require(re.fullmatch(pattern, phrase) and phrase.strip(),
                'Lettering requires supported glyphs; never replace or silently omit characters')
    text(content['label'], 48)
    require('\n' not in content['label'], 'Lettering label must be single-line')
    return 2


def install(output, scenes, brand_root, template_hash):
    if not any(s['kind'] == 'lettering' and s['content']['style'] == 'write-on' for s in scenes):
        return
    import branding
    require(isinstance(brand_root, Path), 'Handwritten lettering requires an approved brand')
    branding.verified(brand_root, template_hash)
    font = branding.fonts_in(brand_root/'brand/assets')['display']
    expected = read_json(inside(brand_root, 'brand/approval.json'))['files']['assets/'+font.name]
    require(expected == CAVEAT_SHA and digest(inside(output, 'assets/'+font.name)) == expected,
            'Write-on glyphs require the matching approved local Caveat variable display font')
