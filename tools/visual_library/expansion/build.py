#!/usr/bin/env python3
"""Validate and preview expansion components in a private workspace.

Reuses the library's writers, vendor verification, gallery template and
ECharts bundle. Output goes under ``<workspace>/visuals/<run-id>/`` and is
never written into the public source tree. Nothing is downloaded or published.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import re
import sys

HOME = Path(__file__).resolve().parent
LIBRARY = HOME.parent
sys.path.insert(0, str(LIBRARY.parents[1]))
from tools.visual_library import kit  # noqa: E402
from tools.visual_library.expansion import schema  # noqa: E402

EXAMPLES = ('examples.json', 'stress.json')


def load_recipes(icons):
    """Base recipes plus expansion recipes; IDs must not collide."""
    base = kit.validate_recipes(kit.read_json(kit.safe_file(LIBRARY, 'recipes.json')), icons)
    extra = kit.validate_recipes(kit.read_json(kit.safe_file(HOME, 'recipes.json')), icons)
    kit.require(not set(base) & set(extra), 'Expansion recipe collides with a library recipe')
    return base, extra


def load_tokens():
    tokens = kit.read_json(kit.safe_file(HOME, 'tokens.json'))
    kit.fields(tokens, 'version note palettes')
    kit.require(isinstance(tokens['palettes'], dict) and 1 <= len(tokens['palettes']) <= 6, 'Invalid palette collection')
    for name, palette in tokens['palettes'].items():
        kit.require(re.fullmatch(r'[a-z][a-z0-9-]{0,19}', name), 'Invalid palette name')
        kit.fields(palette, 'background surface line ink muted accent accent2 warn extra font mono')
        for key, value in palette.items():
            if key in ('font', 'mono'):
                kit.require(isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9 ,-]{1,40}', value), 'Invalid font token')
            else:
                kit.require(isinstance(value, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', value), 'Palette colors must be six-digit hex')
    return tokens


def catalog():
    """Machine-readable metadata for every expansion asset."""
    data = kit.read_json(kit.safe_file(HOME, 'catalog.json'))
    kit.fields(data, 'version base_commit status assets')
    kit.require(data['status'] == schema.STATUS, 'Catalog status must be design_review')
    manifest = kit.verify_assets()
    icons = manifest['icons']
    _, recipes = load_recipes(icons)
    examples = {c['id']: c for c in schema.validate_document(kit.read_json(kit.safe_file(HOME, 'examples.json')), icons)}
    ids = set()
    for asset in data['assets']:
        kit.fields(asset, 'id kind status purpose keywords use_when misuse parameters variants states example integration')
        kit.require(asset['id'] not in ids, 'Duplicate catalog ID')
        ids.add(asset['id'])
        kit.require(asset['status'] == schema.STATUS, 'Every expansion asset stays design_review')
        kit.require(isinstance(asset['keywords'], list) and 1 <= len(asset['keywords']) <= 12, 'Keywords required')
        if asset['kind'] == 'component':
            name = asset['id'].split(':', 1)[1]
            kit.require(name in schema.KINDS, 'Catalog component kind is not implemented')
            kit.require(asset['example'] in examples and examples[asset['example']]['kind'] == name, 'Catalog example must exist in examples.json')
            kit.require(tuple(asset['variants']) == schema.KINDS[name][0], 'Catalog variants must match the schema')
            kit.require(tuple(asset['states']) == schema.KINDS[name][1], 'Catalog states must match the schema')
        elif asset['kind'] == 'composition':
            kit.require(asset['id'].split(':', 1)[1] in recipes, 'Catalog composition is not in expansion recipes')
        else:
            kit.require(asset['kind'] == 'chart-variant', 'Unknown catalog asset kind')
            kit.require(asset['example'].split(':', 1)[0] in kit.KINDS, 'Chart variant must name a library chart kind')
    kit.require(all(name in {a['id'].split(':', 1)[1] for a in data['assets'] if a['kind'] == 'component'} for name in schema.KINDS), 'Every implemented kind needs catalog metadata')
    kit.require(all(name in {a['id'].split(':', 1)[1] for a in data['assets'] if a['kind'] == 'composition'} for name in recipes), 'Every expansion recipe needs catalog metadata')
    return data


def validate(input_path, workspace=None, example=False):
    manifest = kit.verify_assets()
    if example:
        kit.require(input_path in EXAMPLES, 'Unknown built-in example')
        source = kit.safe_file(HOME, input_path)
    else:
        source = kit.safe_file(kit.workspace_path(workspace), input_path)
    kit.require(source.stat().st_size <= 100_000, 'Input is too large')
    return schema.validate_document(kit.read_json(source), manifest['icons']), source, manifest


def build(input_path, run_id, approved, workspace, example=False, palette='study'):
    kit.require(approved, 'Explicit --approve-write required')
    kit.require(isinstance(run_id, str) and re.fullmatch(r'[a-z][a-z0-9-]{0,47}', run_id or ''), 'Invalid run ID')
    root = kit.workspace_path(workspace)
    components, source, manifest = validate(input_path, workspace, example)
    tokens = load_tokens()
    kit.require(palette in tokens['palettes'], 'Unknown palette')
    base_recipes, recipes = load_recipes(manifest['icons'])
    previews = root / 'visuals'
    kit.require(not previews.is_symlink(), 'Symlink output blocked')
    output = previews / run_id
    kit.require(not output.exists() and not output.is_symlink(), 'Run already exists')
    icons = {name: 'data:image/svg+xml;base64,' + base64.b64encode(kit.safe_file(kit.HOME / 'vendor', f'lucide-static/icons/{name}.svg').read_bytes()).decode() for name in manifest['icons']}
    content = {'components': components, 'icons': icons, 'recipes': {**base_recipes, **recipes}, 'tokens': tokens, 'palette': palette}
    payload = json.dumps(content, ensure_ascii=True).replace('<', '\\u003c')
    template = kit.safe_file(LIBRARY, 'gallery.html').read_text()
    template = template.replace('YouTubeShortCreator Visual Library', 'YouTubeShortCreator Visual Library Expansion')
    template = template.replace('<span class="status">ASSET REVIEW</span>', '<span class="status">DESIGN REVIEW · EXPANSION</span>')
    template = template.replace('<h2>Chart studies</h2>', '<h2>Expansion components</h2>').replace('<h2>Icon collection</h2>', '<h2>New compositions</h2>')
    page = template.replace('/*LIBRARY_DATA*/', 'window.visualLibraryData=' + payload + ';')
    page = page.replace('/*ECHARTS*/', kit.safe_file(kit.HOME / 'vendor', 'echarts/dist/echarts.min.js').read_text().replace('</script', '<\\/script'))
    page = page.replace('/*RENDERER*/', kit.safe_file(HOME, 'expansion.js').read_text())
    page = page.replace('/*STYLES*/', kit.safe_file(LIBRARY, 'gallery.css').read_text() + '\n' + kit.safe_file(HOME, 'expansion.css').read_text())
    notices = '\n\n'.join(kit.safe_file(kit.HOME / 'vendor', name).read_text() for name in ('echarts/LICENSE', 'echarts/NOTICE', 'lucide-static/LICENSE'))
    previews.mkdir(exist_ok=True)
    output.mkdir()
    with (output / 'index.html').open('x') as stream:
        stream.write(page)
    implementation = ('expansion.js', 'expansion.css', 'schema.py', 'build.py', 'tokens.json', 'recipes.json', 'catalog.json')
    report = {'status': 'preview_built', 'design_status': schema.STATUS, 'production_integration': False, 'publication_performed': False,
              'palette': palette, 'slot': list(schema.SLOT), 'input_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'vendor_manifest_sha256': hashlib.sha256((kit.HOME / 'vendor/manifest.json').read_bytes()).hexdigest(),
              'components': len(components), 'kinds': sorted({c['kind'] for c in components}), 'icons': len(icons), 'recipes': len(recipes),
              'index_sha256': hashlib.sha256(page.encode()).hexdigest(),
              'implementation_hashes': {name: hashlib.sha256(kit.safe_file(HOME, name).read_bytes()).hexdigest() for name in implementation},
              'library_hashes': {name: hashlib.sha256(kit.safe_file(LIBRARY, name).read_bytes()).hexdigest() for name in ('gallery.html', 'gallery.css', 'kit.py', 'recipes.json')}}
    with (output / 'build.json').open('x') as stream:
        json.dump(report, stream, indent=2)
    with (output / 'THIRD-PARTY-NOTICES.txt').open('x') as stream:
        stream.write(notices)
    return output / 'index.html'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['validate', 'build', 'catalog'])
    parser.add_argument('input', nargs='?', help='JSON path relative to the selected private workspace')
    parser.add_argument('--workspace')
    parser.add_argument('--example', action='store_true')
    parser.add_argument('--run-id')
    parser.add_argument('--palette', default='study')
    parser.add_argument('--approve-write', action='store_true')
    args = parser.parse_args(argv)
    try:
        if args.command == 'catalog':
            result = catalog()
        elif args.command == 'build':
            kit.require(args.workspace and args.input, 'build needs --workspace and an input')
            result = {'output': str(build(args.input, args.run_id, args.approve_write, args.workspace, args.example, args.palette)), 'production_integration': False}
        else:
            kit.require(args.input and (args.example or args.workspace), 'validate needs an input and --workspace or --example')
            components, _, _ = validate(args.input, args.workspace, args.example)
            result = {'status': 'PASS', 'components': len(components), 'kinds': sorted({c['kind'] for c in components}), 'design_status': schema.STATUS}
        print(json.dumps(result, indent=2, ensure_ascii=True))
        return 0
    except (ValueError, OSError, KeyError, TypeError) as error:
        print('ERROR: ' + str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
