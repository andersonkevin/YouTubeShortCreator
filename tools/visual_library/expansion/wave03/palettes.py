#!/usr/bin/env python3
"""Wave 03 palette families: deterministic token sets with contrast checks.

Each family names four series hues (accent, accent2, extra, warn) and a tint
hue for the neutral roles. `compose` derives a dark and a light token set from
those hues with the same nine roles the wave 01 tokens use, then nudges
lightness until every contrast rule passes. `palettes.json` is the committed
output of `generate`; `check` verifies the file against the rules and against
the generator so the two cannot drift.

No network, no writes outside stdout.
"""
import argparse
import colorsys
import itertools
import json
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
from tools.visual_library import kit  # noqa: E402

HOME = Path(__file__).resolve().parent
ROLES = ('background', 'surface', 'line', 'ink', 'muted', 'accent', 'accent2', 'warn', 'extra')
SERIES = ('accent', 'accent2', 'extra', 'warn')
FONT, MONO = 'Arial', 'Menlo, monospace'

# name, tint hue for neutrals, series hues (accent, accent2, extra, warn), note
FAMILIES = (
    ('mint', 160, (150, 195, 275, 350), 'Green lead with cyan and violet; pink warning.'),
    ('sky', 210, (205, 245, 300, 355), 'Blue lead with indigo and magenta; red warning.'),
    ('amber', 40, (45, 20, 200, 330), 'Warm yellow lead with orange and blue; magenta warning.'),
    ('violet', 275, (270, 320, 185, 40), 'Purple lead with magenta and teal; amber warning.'),
    ('coral', 15, (15, 45, 200, 320), 'Coral lead with amber and blue; magenta warning.'),
    ('teal', 180, (175, 135, 40, 350), 'Teal lead with green and amber; pink warning.'),
    ('rose', 340, (335, 20, 250, 65), 'Rose lead with orange and indigo; yellow warning.'),
    ('olive', 85, (80, 40, 200, 340), 'Olive lead with amber and blue; magenta warning.'),
    ('indigo', 240, (240, 285, 165, 25), 'Indigo lead with purple and green; orange warning.'),
    ('sand', 35, (35, 85, 220, 330), 'Sand lead with lime and blue; magenta warning.'),
    ('cobalt', 220, (220, 190, 45, 345), 'Cobalt lead with cyan and gold; red warning.'),
    ('magenta', 305, (300, 260, 180, 45), 'Magenta lead with violet and teal; amber warning.'),
)

# Lightness and saturation targets per mode; lightness is nudged by `compose`.
TARGETS = {
    'dark': {'background': (0.05, 0.28), 'surface': (0.11, 0.18), 'line': (0.24, 0.14), 'ink': (0.96, 0.10),
             'muted': (0.76, 0.10), 'series': (0.80, 0.62)},
    'light': {'background': (0.985, 0.35), 'surface': (0.94, 0.20), 'line': (0.80, 0.14), 'ink': (0.10, 0.20),
              'muted': (0.36, 0.14), 'series': (0.36, 0.64)},
}

# Contrast rules (WCAG 2 ratios) and perceptual separation (CIE76 delta E).
RULES = {
    'ink_background': 7.0, 'ink_surface': 7.0, 'muted_background': 4.5, 'muted_surface': 4.5,
    'series_background': 4.5, 'series_surface': 3.0,
    'line_background': (1.25, 3.5), 'surface_background': (1.08, 2.2),
    'series_delta_e': 18.0, 'series_ink_delta_e': 18.0, 'series_muted_delta_e': 12.0,
}


def hsl_hex(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, l, s)
    return '#%02x%02x%02x' % tuple(round(max(0, min(1, v)) * 255) for v in (r, g, b))


def rgb(hex_color):
    return tuple(int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5))


def luminance(hex_color):
    def channel(v):
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(v) for v in rgb(hex_color))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def lab(hex_color):
    def channel(v):
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(v) for v in rgb(hex_color))
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 1.0
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def delta_e(a, b):
    return math.sqrt(sum((p - q) ** 2 for p, q in zip(lab(a), lab(b))))


def check(palette):
    """Return the list of rule failures for one token set (empty when it passes)."""
    failures = []
    kit.fields(palette, ' '.join(ROLES) + ' font mono')
    for role in ROLES:
        value = palette[role]
        if not (isinstance(value, str) and len(value) == 7 and value[0] == '#' and all(c in '0123456789abcdef' for c in value[1:])):
            failures.append(f'{role}: not a lowercase hex color')
    if failures:
        return failures
    bg, sf = palette['background'], palette['surface']

    def need(label, value, minimum):
        if value < minimum:
            failures.append(f'{label}: {value:.2f} below {minimum}')

    def between(label, value, low, high):
        if not low <= value <= high:
            failures.append(f'{label}: {value:.2f} outside {low}-{high}')
    need('ink/background', contrast(palette['ink'], bg), RULES['ink_background'])
    need('ink/surface', contrast(palette['ink'], sf), RULES['ink_surface'])
    need('muted/background', contrast(palette['muted'], bg), RULES['muted_background'])
    need('muted/surface', contrast(palette['muted'], sf), RULES['muted_surface'])
    between('line/background', contrast(palette['line'], bg), *RULES['line_background'])
    between('surface/background', contrast(sf, bg), *RULES['surface_background'])
    for role in SERIES:
        need(f'{role}/background', contrast(palette[role], bg), RULES['series_background'])
        need(f'{role}/surface', contrast(palette[role], sf), RULES['series_surface'])
        need(f'{role} vs ink delta E', delta_e(palette[role], palette['ink']), RULES['series_ink_delta_e'])
        need(f'{role} vs muted delta E', delta_e(palette[role], palette['muted']), RULES['series_muted_delta_e'])
    for a, b in itertools.combinations(SERIES, 2):
        need(f'{a} vs {b} delta E', delta_e(palette[a], palette[b]), RULES['series_delta_e'])
    if len({palette[role] for role in ROLES}) != len(ROLES):
        failures.append('roles share a color')
    return failures


def _nudge(hue, sat, light, passes, direction, limit=40):
    """Move lightness in `direction` (+1 lighter, -1 darker) until `passes(hex)`."""
    for step in range(limit):
        value = hsl_hex(hue, sat, light + direction * 0.01 * step)
        if passes(value):
            return value
    raise ValueError(f'No lightness satisfies the rule for hue {hue}')


def compose(name, tint, hues, mode, shade=0):
    t = TARGETS[mode]
    up = 1 if mode == 'dark' else -1  # direction that raises contrast against the background
    # Families with nearby tints get a slightly different neutral depth so no two backgrounds share a hex.
    bg = hsl_hex(tint, t['background'][1], t['background'][0] + up * 0.006 * (shade % 4))
    sf = _nudge(tint, t['surface'][1], t['surface'][0], lambda v: RULES['surface_background'][0] <= contrast(v, bg) <= RULES['surface_background'][1], up)
    line = _nudge(tint, t['line'][1], t['line'][0], lambda v: RULES['line_background'][0] <= contrast(v, bg) <= RULES['line_background'][1], up)
    ink = _nudge(tint, t['ink'][1], t['ink'][0], lambda v: contrast(v, bg) >= RULES['ink_background'] and contrast(v, sf) >= RULES['ink_surface'], up)
    muted = _nudge(tint, t['muted'][1], t['muted'][0], lambda v: contrast(v, bg) >= RULES['muted_background'] and contrast(v, sf) >= RULES['muted_surface'], up)
    palette = {'background': bg, 'surface': sf, 'line': line, 'ink': ink, 'muted': muted}
    chosen = []
    for role, hue in zip(SERIES, hues):
        def passes(v):
            return (contrast(v, bg) >= RULES['series_background'] and contrast(v, sf) >= RULES['series_surface']
                    and delta_e(v, ink) >= RULES['series_ink_delta_e'] and delta_e(v, muted) >= RULES['series_muted_delta_e']
                    and all(delta_e(v, other) >= RULES['series_delta_e'] for other in chosen))
        # Series colors move away from the background first; if separation from
        # ink fails, they move the other way (toward the background) instead.
        try:
            value = _nudge(hue, t['series'][1], t['series'][0], passes, up, 30)
        except ValueError:
            value = _nudge(hue, t['series'][1], t['series'][0], passes, -up, 30)
        chosen.append(value)
        palette[role] = value
    palette['font'], palette['mono'] = FONT, MONO
    return palette


def generate():
    palettes = {}
    for shade, (name, tint, hues, note) in enumerate(FAMILIES):
        for mode in ('dark', 'light'):
            key = f'{name}-{mode}'
            palettes[key] = {**compose(name, tint, hues, mode, shade), 'mode': mode, 'family': name, 'note': note}
    return {'version': 1, 'wave': 3, 'design_status': 'design_review',
            'note': 'Generated study palettes with the wave 01 token roles. Not a brand approval; production substitutes approved tokens.',
            'rules': RULES, 'palettes': palettes}


def tokens(palette):
    """The token subset the renderer consumes (roles plus fonts)."""
    return {key: palette[key] for key in (*ROLES, 'font', 'mono')}


def load():
    data = kit.read_json(kit.safe_file(HOME, 'palettes.json'))
    kit.fields(data, 'version wave design_status note rules palettes')
    kit.require(data['version'] == 1 and data['wave'] == 3 and data['design_status'] == 'design_review', 'Unexpected palette file header')
    kit.items(list(data['palettes']), 2, 200)
    for name, palette in data['palettes'].items():
        kit.label(name, 24)
        kit.fields(palette, ' '.join(ROLES) + ' font mono mode family note')
        kit.require(palette['mode'] in ('dark', 'light') and name.endswith('-' + palette['mode']), 'Palette name must end with its mode')
        failures = check(tokens(palette))
        kit.require(not failures, f'{name}: ' + '; '.join(failures))
    return data


def report(data):
    rows = []
    for name, palette in data['palettes'].items():
        p = tokens(palette)
        rows.append({'name': name, 'mode': palette['mode'], 'ink': round(contrast(p['ink'], p['background']), 1),
                     'muted': round(contrast(p['muted'], p['background']), 1),
                     'series_min': round(min(contrast(p[r], p['background']) for r in SERIES), 1),
                     'series_delta_e_min': round(min(delta_e(p[a], p[b]) for a, b in itertools.combinations(SERIES, 2)), 1)})
    return rows


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('generate', help='print the generated palette file to stdout')
    sub.add_parser('check', help='validate palettes.json against the rules and the generator')
    sub.add_parser('report', help='print contrast figures per palette')
    args = parser.parse_args(argv)
    try:
        if args.command == 'generate':
            print(json.dumps(generate(), indent=2))
        elif args.command == 'check':
            data = load()
            kit.require(data == json.loads(json.dumps(generate())), 'palettes.json differs from the generator output; regenerate it')
            print(json.dumps({'status': 'PASS', 'palettes': len(data['palettes']), 'rules': RULES}, indent=2))
        else:
            print(json.dumps(report(load()), indent=2))
        return 0
    except (ValueError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
