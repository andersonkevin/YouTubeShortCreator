#!/usr/bin/env python3
"""Wave 03 layout studies: zone maps for the 1080x1920 frame.

A layout is a list of zones (role, x, y, w, h) inside the production frame.
Exactly one zone holds the 824x820 visual, scaled up but never down, so the
component's real type sizes are preserved. Text zones use the production type
sizes as placeholders so the study proves the zone heights fit. Studies only:
no template, scene or caption file is changed.
"""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
from tools.visual_library import kit  # noqa: E402

HOME = Path(__file__).resolve().parent
FRAME = (1080, 1920)
SLOT = (824, 820)
# Study assumption for the vertical player: keep content inside this box so the
# status bar, the caption area and the bottom controls never cover it.
SAFE = {'x': 60, 'y': 180, 'w': 960, 'h': 1600}
ROLES = {
    # role: (kind, minimum height)
    'eyebrow': ('text', 40), 'title': ('text', 155), 'caption': ('text', 90), 'note': ('text', 40),
    'metric': ('text', 120), 'tag': ('text', 40), 'number': ('text', 100), 'label': ('text', 40),
    'visual': ('visual', SLOT[1]), 'progress': ('bar', 4), 'rail': ('decor', 4), 'frame': ('decor', 4),
    'panel': ('decor', 4), 'band': ('decor', 4), 'header': ('decor', 40),
}
TEXT_SIZES = {'eyebrow': 27, 'title': 68, 'caption': 29, 'note': 27, 'metric': 96, 'tag': 24, 'number': 120, 'label': 27}
MAX_SCALE = 1.35


def validate_layout(layout):
    kit.fields(layout, 'id label purpose use_when not_when zones')
    kit.require(isinstance(layout['id'], str) and layout['id'].replace('-', '').isalnum() and layout['id'].islower(), 'Invalid layout id')
    kit.label(layout['label'], 40)
    for key in ('purpose', 'use_when', 'not_when'):
        kit.label(layout[key], 140)
    kit.items(layout['zones'], 2, 12)
    visuals, content = [], []
    for zone in layout['zones']:
        kit.fields(zone, 'role x y w h')
        kit.require(zone['role'] in ROLES, f'Unknown zone role {zone["role"]}')
        for key in ('x', 'y', 'w', 'h'):
            kit.require(type(zone[key]) is int, 'Zone geometry must be integer pixels')
        kit.require(zone['w'] > 0 and zone['h'] > 0, 'Zone needs a positive size')
        kit.require(0 <= zone['x'] and 0 <= zone['y'] and zone['x'] + zone['w'] <= FRAME[0] and zone['y'] + zone['h'] <= FRAME[1], 'Zone leaves the frame')
        kind, minimum = ROLES[zone['role']]
        kit.require(zone['h'] >= minimum, f'{zone["role"]} zone shorter than {minimum}')
        if kind == 'visual':
            visuals.append(zone)
        if kind in ('text', 'visual'):
            content.append(zone)
            kit.require(SAFE['x'] <= zone['x'] and SAFE['y'] <= zone['y'] and zone['x'] + zone['w'] <= SAFE['x'] + SAFE['w'] and zone['y'] + zone['h'] <= SAFE['y'] + SAFE['h'],
                        f'{zone["role"]} zone leaves the safe box')
    kit.require(len(visuals) == 1, 'Exactly one visual zone')
    visual = visuals[0]
    scale = visual['w'] / SLOT[0]
    kit.require(1.0 <= scale <= MAX_SCALE, 'Visual scale must stay between 1.0 and 1.35 (never shrink type)')
    kit.require(abs(visual['h'] - round(SLOT[1] * scale)) <= 2, 'Visual zone must keep the slot aspect')
    roles = [z['role'] for z in layout['zones']]
    kit.require('title' in roles and 'caption' in roles, 'A layout needs a title and a caption zone')
    for i, a in enumerate(content):
        for b in content[i + 1:]:
            overlap = a['x'] < b['x'] + b['w'] and b['x'] < a['x'] + a['w'] and a['y'] < b['y'] + b['h'] and b['y'] < a['y'] + a['h']
            kit.require(not overlap, f'{a["role"]} and {b["role"]} zones overlap')
    return {**layout, 'scale': round(scale, 3), 'status': 'design_review', 'production_scene_available': False}


def load():
    data = kit.read_json(kit.safe_file(HOME, 'layouts.json'))
    kit.fields(data, 'version wave design_status frame slot safe note layouts')
    kit.require(data['version'] == 1 and data['wave'] == 3 and data['design_status'] == 'design_review', 'Unexpected layout file header')
    kit.require(data['frame'] == list(FRAME) and data['slot'] == list(SLOT) and data['safe'] == SAFE, 'Frame, slot or safe box differs from the validator')
    kit.items(data['layouts'], 1, 60)
    layouts = [validate_layout(layout) for layout in data['layouts']]
    ids = [layout['id'] for layout in layouts]
    kit.require(len(set(ids)) == len(ids), 'Duplicate layout ids')
    signatures = {json.dumps(sorted((z['role'], z['x'], z['y'], z['w'], z['h']) for z in layout['zones'])) for layout in layouts}
    kit.require(len(signatures) == len(layouts), 'Two layouts share the same zone map')
    return {**data, 'layouts': layouts}


if __name__ == '__main__':
    try:
        data = load()
        print(json.dumps({'status': 'PASS', 'layouts': len(data['layouts']), 'ids': [l['id'] for l in data['layouts']]}, indent=2))
    except (ValueError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        raise SystemExit(1)
