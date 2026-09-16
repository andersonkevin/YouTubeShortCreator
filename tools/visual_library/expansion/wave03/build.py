#!/usr/bin/env python3
"""Wave 03 study builder: wave 02 components rendered with the wave 03 palettes
and motion recipes in a private, offline gallery page.

Commands: validate | build | palettes | recipes. The build writes only under
an existing private workspace and never overwrites a run.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
from tools.visual_library import kit  # noqa: E402
from tools.visual_library.expansion.wave02 import build as wave02  # noqa: E402
from tools.visual_library.expansion.wave02 import schema  # noqa: E402
from tools.visual_library.expansion.wave03 import layouts as layout_module  # noqa: E402
from tools.visual_library.expansion.wave03 import palettes as palette_module  # noqa: E402

HOME = Path(__file__).resolve().parent
LIBRARY = kit.HOME
WAVE = 3
IMPLEMENTATION = ('motion.js', 'motion.json', 'palettes.json', 'palettes.py', 'layouts.json', 'layouts.py', 'wave03.css', 'build.py')


def recipes():
    data = kit.read_json(kit.safe_file(HOME, 'motion.json'))
    kit.fields(data, 'version wave design_status note timeline_seconds recipes')
    kit.require(data['version'] == 1 and data['wave'] == WAVE and data['design_status'] == schema.STATUS, 'Unexpected motion file header')
    kit.items(data['recipes'], 1, 40)
    names = []
    for recipe in data['recipes']:
        kit.fields(recipe, 'name label duration purpose use_when not_when')
        kit.require(re.fullmatch(r'[a-z][a-z0-9-]{1,23}', recipe['name']), 'Invalid recipe name')
        kit.label(recipe['label'], 60)
        kit.number(recipe['duration'], 0.1, data['timeline_seconds'])
        for key in ('purpose', 'use_when', 'not_when'):
            kit.label(recipe[key], 120)
        names.append(recipe['name'])
    kit.require(len(set(names)) == len(names), 'Duplicate recipe names')
    source = kit.safe_file(HOME, 'motion.js').read_text()
    defined = re.findall(r"define\('([a-z0-9-]+)', '[^']*', ([0-9.]+),", source)
    kit.require([name for name, _ in defined] == names, 'motion.js recipes differ from motion.json')
    for (name, duration), recipe in zip(defined, data['recipes']):
        kit.require(float(duration) == recipe['duration'], f'Duration of {name} differs between motion.js and motion.json')
    kit.require(re.findall(r'#[0-9a-fA-F]{6}\b', source) == [], 'motion.js must not contain color literals')
    return data


def merged_tokens():
    tokens = wave02.load_tokens()
    extra = palette_module.load()
    merged = dict(tokens['palettes'])
    for name, palette in extra['palettes'].items():
        kit.require(name not in merged, f'Palette name collides with the first expansion: {name}')
        merged[name] = palette_module.tokens(palette)
    return {'version': tokens['version'], 'note': tokens['note'], 'palettes': merged}, extra


def swatch_page(extra):
    rows = []
    for name, palette in extra['palettes'].items():
        p = palette_module.tokens(palette)
        cells = ''.join(f'<div class="cell" style="background:{p[role]}"><span style="color:{p["ink"] if role in ("background", "surface", "line") else p["background"]}">{role}<br>{p[role]}</span></div>'
                        for role in palette_module.ROLES)
        figures = ' · '.join(f'{label} {palette_module.contrast(p[a], p[b]):.1f}' for label, a, b in (('ink', 'ink', 'background'), ('muted', 'muted', 'background'), ('accent', 'accent', 'background'), ('warn', 'warn', 'background')))
        rows.append(f'<section style="background:{p["background"]};color:{p["ink"]}"><h2>{name} <small>{palette["note"]}</small></h2><div class="row">{cells}</div><p>{figures}</p></section>')
    style = ('body{margin:0;background:#101214;color:#e7ecef;font:13px Arial,sans-serif;padding:24px}h1{font-size:16px;font-weight:normal;margin:0 0 16px}'
             'section{padding:14px 16px;border-radius:8px;margin:0 0 12px}h2{font-size:14px;margin:0 0 8px}h2 small{font-weight:normal;opacity:.8;margin-left:8px}'
             '.row{display:grid;grid-template-columns:repeat(9,1fr);gap:6px}.cell{height:56px;border-radius:6px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:11px;font-family:Menlo,monospace}'
             'p{margin:8px 0 0;font-size:12px;opacity:.85}')
    return (f'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">'
            f'<title>Wave 03 palettes</title><style>{style}</style></head><body><h1>Wave 03 palettes · {len(extra["palettes"])} token sets · DESIGN REVIEW</h1>{"".join(rows)}</body></html>')


PLACEHOLDERS = {
    'eyebrow': 'EYEBROW · SERIES LABEL', 'title': 'A title placeholder that runs to two lines', 'caption': 'Caption placeholder: one or two sentences that say what the visual shows and why it matters.',
    'note': 'Note placeholder: one takeaway per line', 'metric': '42.5%', 'tag': 'tag placeholder', 'number': '01', 'label': 'CHAPTER',
}


def layout_page(data, tokens):
    """Every layout as an unscaled 1080x1920 frame with placeholder zones. No scripts; QA injects the visual."""
    frames = []
    for layout in data['layouts']:
        zones = []
        for i, zone in enumerate(layout['zones']):
            role, box = zone['role'], f"left:{zone['x']}px;top:{zone['y']}px;width:{zone['w']}px;height:{zone['h']}px"
            if role == 'visual':
                zones.append(f'<div class="zone visual" data-role="visual" style="{box}"><img alt="" data-role="visual-image" width="{zone["w"]}" height="{zone["h"]}" hidden><span>visual 824x820 × {layout["scale"]}</span></div>')
            elif role == 'header':
                zones.append(f'<div class="zone header" data-role="{role}" style="{box}"><i></i><i></i><i></i></div>')
            elif role == 'progress':
                zones.append(f'<div class="zone progress" data-role="{role}" style="{box}"><span></span></div>')
            elif role in PLACEHOLDERS:
                text = PLACEHOLDERS[role]
                if role == 'title' and zone['h'] >= 300:
                    text = 'A title placeholder that runs to three full lines of text'
                if role == 'label':
                    zones.append(f'<div class="zone text label" data-role="{role}" style="{box}"><span>{text}</span></div>')
                else:
                    zones.append(f'<div class="zone text {role}" data-role="{role}" style="{box}">{text}</div>')
            else:
                zones.append(f'<div class="zone {role}" data-role="{role}" style="{box}"></div>')
        frames.append(f'<section class="frame" data-layout="{layout["id"]}" data-scale="{layout["scale"]}"><h2>{layout["id"]} · {layout["label"]}</h2>{"".join(zones)}</section>')
    T = tokens
    style = (
        f"body{{margin:0;background:{T['background']};color:{T['ink']};font-family:{T['font']}}}"
        ".frame{position:relative;width:1080px;height:1920px;overflow:hidden;margin:0 0 40px;background:" + T['background'] + "}"
        f".frame h2{{position:absolute;left:0;top:0;margin:0;padding:8px 16px;font:600 22px {T['mono']};color:{T['muted']};z-index:3}}"
        ".zone{position:absolute;box-sizing:border-box;margin:0}"
        f".text{{overflow:hidden;font-weight:800;line-height:1.12;color:{T['ink']}}}"
        f".eyebrow{{font-size:27px;line-height:1.3;color:{T['accent']}}}.title{{font-size:68px}}.caption{{font-size:29px;line-height:1.35;font-weight:400;color:{T['muted']}}}"
        f".note{{font-size:27px;line-height:1.3;font-weight:600;color:{T['muted']};border-left:6px solid {T['accent2']};padding-left:16px}}"
        f".metric{{font-size:96px;line-height:1.1;font-family:{T['mono']};color:{T['accent']}}}.number{{font-size:120px;line-height:1;font-family:{T['mono']};color:{T['accent2']}}}"
        f".tag{{font-size:24px;line-height:40px;text-align:center;border:2px solid {T['line']};border-radius:22px;color:{T['muted']};font-weight:600}}"
        f".label{{display:flex;align-items:center;justify-content:center}}.label span{{display:block;writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;font-size:27px;letter-spacing:4px;color:{T['muted']}}}"
        f".visual{{outline:2px dashed {T['line']};outline-offset:-2px;display:flex;align-items:center;justify-content:center;font:600 24px {T['mono']};color:{T['muted']}}}.visual img{{position:absolute;inset:0;display:block}}.visual img:not([hidden])+span{{display:none}}"
        f".panel{{background:{T['surface']};border:2px solid {T['line']};border-radius:16px}}.band{{background:{T['surface']}}}.rail{{background:{T['accent']};border-radius:5px}}.frame-zone{{}}"
        f".zone.frame{{border:2px solid {T['line']};border-radius:8px;width:auto;height:auto;margin:0;background:none}}"
        f".header{{border-bottom:2px solid {T['line']};display:flex;align-items:center;gap:12px;padding:0 24px}}.header i{{width:18px;height:18px;border-radius:50%;background:{T['muted']};display:block}}"
        f".progress{{background:{T['line']};overflow:hidden}}.progress span{{display:block;height:100%;width:35%;background:{T['accent']}}}"
    )
    # The frame decor zone shares the class name with the outer section; scope it by data-role instead.
    style = style.replace(".zone.frame{", "[data-role=frame]{").replace(".frame-zone{}", "")
    head = ('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'">'
            f'<title>Wave 03 layouts</title><style>{style}</style></head><body>')
    return head + ''.join(frames) + '</body></html>'


def build(run_id, approved, workspace, palette='study', components='examples.json'):
    kit.require(approved, 'Explicit --approve-write required')
    kit.require(isinstance(run_id, str) and re.fullmatch(r'[a-z][a-z0-9-]{0,47}', run_id or ''), 'Invalid run ID')
    root = kit.workspace_path(workspace)
    validated, source, manifest = wave02.validate(components, example=True)
    tokens, extra = merged_tokens()
    motion = recipes()
    layouts = layout_module.load()
    kit.require(palette in tokens['palettes'], 'Unknown palette')
    previews = root / 'visuals'
    kit.require(not previews.is_symlink(), 'Symlink output blocked')
    output = previews / run_id
    kit.require(not output.exists() and not output.is_symlink(), 'Run already exists')
    icons = {name: 'data:image/svg+xml;base64,' + base64.b64encode(kit.safe_file(kit.HOME / 'vendor', f'lucide-static/icons/{name}.svg').read_bytes()).decode() for name in manifest['icons']}
    content = {'components': validated, 'icons': icons, 'tokens': tokens, 'palette': palette, 'wave': WAVE, 'recipes': motion['recipes']}
    payload = json.dumps(content, ensure_ascii=True).replace('<', '\\u003c')
    template = kit.safe_file(LIBRARY, 'gallery.html').read_text()
    template = template.replace('YouTubeShortCreator Visual Library', 'YouTubeShortCreator Asset Library Wave 03')
    template = template.replace('<span class="status">ASSET REVIEW</span>', '<span class="status">DESIGN REVIEW · WAVE 03</span>')
    template = template.replace('<h2>Chart studies</h2>', '<h2>Components (wave 02)</h2>').replace('<h2>Icon collection</h2>', '<h2>Families</h2>')
    page = template.replace('/*LIBRARY_DATA*/', 'window.visualLibraryData=' + payload + ';')
    page = page.replace('/*ECHARTS*/', kit.safe_file(kit.HOME / 'vendor', 'echarts/dist/echarts.min.js').read_text().replace('</script', '<\\/script'))
    page = page.replace('/*RENDERER*/', kit.safe_file(HOME, 'motion.js').read_text() + '\n' + kit.safe_file(wave02.HOME, 'wave02.js').read_text())
    page = page.replace('/*STYLES*/', '\n'.join(kit.safe_file(base, name).read_text() for base, name in ((LIBRARY, 'gallery.css'), (wave02.HOME, 'wave02.css'), (HOME, 'wave03.css'))))
    notices = '\n\n'.join(kit.safe_file(kit.HOME / 'vendor', name).read_text() for name in ('echarts/LICENSE', 'echarts/NOTICE', 'lucide-static/LICENSE'))
    previews.mkdir(exist_ok=True)
    output.mkdir()
    with (output / 'index.html').open('x') as stream:
        stream.write(page)
    with (output / 'palettes.html').open('x') as stream:
        stream.write(swatch_page(extra))
    with (output / 'layouts.html').open('x') as stream:
        stream.write(layout_page(layouts, tokens['palettes'][palette]))
    hashes = {name: hashlib.sha256(kit.safe_file(HOME, name).read_bytes()).hexdigest() for name in IMPLEMENTATION}
    hashes['wave02.js'] = hashlib.sha256(kit.safe_file(wave02.HOME, 'wave02.js').read_bytes()).hexdigest()
    report = {'status': 'preview_built', 'wave': WAVE, 'design_status': schema.STATUS, 'production_integration': False, 'publication_performed': False,
              'palette': palette, 'palettes': sorted(tokens['palettes']), 'wave03_palettes': sorted(extra['palettes']), 'recipes': [r['name'] for r in motion['recipes']], 'layouts': [l['id'] for l in layouts['layouts']],
              'slot': list(schema.SLOT), 'input_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'vendor_manifest_sha256': hashlib.sha256((kit.HOME / 'vendor/manifest.json').read_bytes()).hexdigest(),
              'components': len(validated), 'index_sha256': hashlib.sha256(page.encode()).hexdigest(), 'implementation_hashes': hashes}
    with (output / 'build.json').open('x') as stream:
        json.dump(report, stream, indent=2)
    with (output / 'THIRD-PARTY-NOTICES.txt').open('x') as stream:
        stream.write(notices)
    return output / 'index.html'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('validate', 'build', 'palettes', 'recipes', 'layouts'))
    parser.add_argument('--workspace')
    parser.add_argument('--run', dest='run_id')
    parser.add_argument('--palette', default='study')
    parser.add_argument('--components', default='examples.json')
    parser.add_argument('--approve-write', action='store_true')
    args = parser.parse_args(argv)
    try:
        if args.command == 'validate':
            tokens, extra = merged_tokens()
            motion = recipes()
            layouts = layout_module.load()
            print(json.dumps({'status': 'PASS', 'palettes': len(tokens['palettes']), 'wave03_palettes': len(extra['palettes']), 'recipes': len(motion['recipes']), 'layouts': len(layouts['layouts'])}, indent=2))
        elif args.command == 'palettes':
            print(json.dumps(palette_module.report(palette_module.load()), indent=2))
        elif args.command == 'recipes':
            print(json.dumps(recipes()['recipes'], indent=2))
        elif args.command == 'layouts':
            print(json.dumps([{k: l[k] for k in ('id', 'label', 'purpose', 'use_when', 'not_when', 'scale')} for l in layout_module.load()['layouts']], indent=2))
        else:
            kit.require(args.workspace, 'build needs --workspace')
            result = {'output': str(build(args.run_id, args.approve_write, args.workspace, args.palette, args.components)), 'production_integration': False}
            print(json.dumps(result, indent=2))
        return 0
    except (ValueError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
