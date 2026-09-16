#!/usr/bin/env python3
"""Validate, preview and discover wave-02 components.

Discovery is split so an agent never loads the whole catalog to pick one asset:
``index`` prints one compact line per asset, ``card <id>`` prints the full
contract, ``search`` filters the index by literal terms and family.
Previews are written only under ``<workspace>/visuals/<run-id>/``.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import re
import sys

HOME = Path(__file__).resolve().parent
EXPANSION = HOME.parent
LIBRARY = EXPANSION.parent
sys.path.insert(0, str(LIBRARY.parents[1]))
from tools.visual_library import kit  # noqa: E402
from tools.visual_library.expansion.wave02 import schema  # noqa: E402

EXAMPLES = ('examples.json', 'stress.json')
CARD_FIELDS = ('id kind family status purpose use_when not_when parameters defaults limits variants states example stress '
               'provenance licenses renderer qa production_scene_available human_review')


def load_tokens():
    """Palettes come from the first expansion's verified token file, read-only."""
    tokens = kit.read_json(kit.safe_file(EXPANSION, 'tokens.json'))
    kit.fields(tokens, 'version note palettes')
    for name, palette in tokens['palettes'].items():
        kit.require(re.fullmatch(r'[a-z][a-z0-9-]{0,19}', name), 'Invalid palette name')
        kit.fields(palette, 'background surface line ink muted accent accent2 warn extra font mono')
    return tokens


def fixtures(icons):
    result = {}
    for name in EXAMPLES:
        for component in schema.validate_document(kit.read_json(kit.safe_file(HOME, name)), icons):
            kit.require(component['id'] not in result, 'Fixture ID reused across files')
            result[component['id']] = {**component, 'file': name}
    return result


def index():
    data = kit.read_json(kit.safe_file(HOME / 'catalog', 'index.json'))
    kit.fields(data, 'version base_commit status assets')
    kit.require(data['status'] == schema.STATUS, 'Index status must be design_review')
    icons = kit.verify_assets()['icons']
    known = fixtures(icons)
    ids = set()
    for asset in data['assets']:
        kit.fields(asset, 'id kind family status purpose tags variants states')
        kit.require(asset['id'] not in ids, 'Duplicate index ID')
        ids.add(asset['id'])
        kind = asset['id'].split(':', 1)[1]
        kit.require(asset['id'].startswith('wave02:') and kind == asset['kind'], 'Index ID must be wave02:<kind>')
        kit.require(asset['status'] in ('proposed', 'implemented'), 'Index status must be proposed or implemented')
        kit.require(asset['family'] in schema.FAMILIES, 'Unknown family')
        kit.require(isinstance(asset['tags'], list) and 1 <= len(asset['tags']) <= 10, 'Tags required')
        if asset['status'] == 'implemented':
            kit.require(kind in schema.KINDS, 'Implemented asset has no validator')
            kit.require(asset['family'] == schema.family(kind), 'Index family differs from schema')
            kit.require(tuple(asset['variants']) == schema.KINDS[kind][1] and tuple(asset['states']) == schema.KINDS[kind][2], 'Index variants/states differ from schema')
            card_file = kit.safe_file(HOME / 'catalog' / 'cards', kind + '.json')
            card = kit.read_json(card_file)
            kit.fields(card, CARD_FIELDS)
            kit.require(card['id'] == asset['id'] and card['kind'] == kind and card['family'] == asset['family'], 'Card identity mismatch')
            kit.require(card['status'] == 'implemented' and card['production_scene_available'] is False, 'Card must be implemented and not production')
            kit.require(card['human_review'] == 'pending', 'Human review is never recorded by the agent')
            for ref in (card['example'], card['stress']):
                kit.require(ref in known and known[ref]['kind'] == kind, 'Card fixture must exist with the same kind')
            kit.require(card['renderer'] == 'tools/visual_library/expansion/wave02/wave02.js', 'Card renderer path')
            kit.fields(card['qa'], 'script evidence checks')
        else:
            kit.require(kind not in schema.KINDS, 'Proposed asset must not have a validator yet')
    kit.require(set(schema.KINDS) <= {a['kind'] for a in data['assets'] if a['status'] == 'implemented'}, 'Every implemented kind needs an index entry')
    return data


def card(identifier):
    kit.label(identifier, 50)
    kind = identifier.split(':', 1)[1] if identifier.startswith('wave02:') else identifier
    kit.require(kind in schema.KINDS, 'Unknown implemented asset')
    return kit.read_json(kit.safe_file(HOME / 'catalog' / 'cards', kind + '.json'))


def search(query='', family=None):
    if query:
        kit.label(query, 100)
    if family:
        kit.require(family in schema.FAMILIES, 'Unknown family')
    terms = query.casefold().split()
    result = []
    for asset in index()['assets']:
        if family and asset['family'] != family:
            continue
        haystack = ' '.join([asset['id'], asset['purpose'], *asset['tags']]).casefold()
        if all(term in haystack for term in terms):
            result.append(asset)
    return result


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
    previews = root / 'visuals'
    kit.require(not previews.is_symlink(), 'Symlink output blocked')
    output = previews / run_id
    kit.require(not output.exists() and not output.is_symlink(), 'Run already exists')
    icons = {name: 'data:image/svg+xml;base64,' + base64.b64encode(kit.safe_file(kit.HOME / 'vendor', f'lucide-static/icons/{name}.svg').read_bytes()).decode() for name in manifest['icons']}
    content = {'components': components, 'icons': icons, 'tokens': tokens, 'palette': palette, 'wave': 2}
    payload = json.dumps(content, ensure_ascii=True).replace('<', '\\u003c')
    template = kit.safe_file(LIBRARY, 'gallery.html').read_text()
    template = template.replace('YouTubeShortCreator Visual Library', 'YouTubeShortCreator Asset Library Wave 02')
    template = template.replace('<span class="status">ASSET REVIEW</span>', '<span class="status">DESIGN REVIEW · WAVE 02</span>')
    template = template.replace('<h2>Chart studies</h2>', '<h2>Wave 02 components</h2>').replace('<h2>Icon collection</h2>', '<h2>Families</h2>')
    page = template.replace('/*LIBRARY_DATA*/', 'window.visualLibraryData=' + payload + ';')
    page = page.replace('/*ECHARTS*/', kit.safe_file(kit.HOME / 'vendor', 'echarts/dist/echarts.min.js').read_text().replace('</script', '<\\/script'))
    page = page.replace('/*RENDERER*/', kit.safe_file(HOME, 'wave02.js').read_text())
    page = page.replace('/*STYLES*/', kit.safe_file(LIBRARY, 'gallery.css').read_text() + '\n' + kit.safe_file(HOME, 'wave02.css').read_text())
    notices = '\n\n'.join(kit.safe_file(kit.HOME / 'vendor', name).read_text() for name in ('echarts/LICENSE', 'echarts/NOTICE', 'lucide-static/LICENSE'))
    previews.mkdir(exist_ok=True)
    output.mkdir()
    with (output / 'index.html').open('x') as stream:
        stream.write(page)
    implementation = ('wave02.js', 'wave02.css', 'schema.py', 'build.py')
    report = {'status': 'preview_built', 'wave': 2, 'design_status': schema.STATUS, 'production_integration': False, 'publication_performed': False,
              'palette': palette, 'palettes': sorted(tokens['palettes']), 'slot': list(schema.SLOT), 'input_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'vendor_manifest_sha256': hashlib.sha256((kit.HOME / 'vendor/manifest.json').read_bytes()).hexdigest(),
              'components': len(components), 'kinds': sorted({c['kind'] for c in components}), 'index_sha256': hashlib.sha256(page.encode()).hexdigest(),
              'implementation_hashes': {name: hashlib.sha256(kit.safe_file(HOME, name).read_bytes()).hexdigest() for name in implementation},
              'token_sha256': hashlib.sha256((EXPANSION / 'tokens.json').read_bytes()).hexdigest()}
    with (output / 'build.json').open('x') as stream:
        json.dump(report, stream, indent=2)
    with (output / 'THIRD-PARTY-NOTICES.txt').open('x') as stream:
        stream.write(notices)
    return output / 'index.html'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['validate', 'build', 'index', 'card', 'search'])
    parser.add_argument('input', nargs='?', help='JSON path, or an asset ID for card')
    parser.add_argument('--workspace')
    parser.add_argument('--example', action='store_true')
    parser.add_argument('--run-id')
    parser.add_argument('--palette', default='study')
    parser.add_argument('--query', default='')
    parser.add_argument('--family')
    parser.add_argument('--approve-write', action='store_true')
    args = parser.parse_args(argv)
    try:
        if args.command == 'index':
            data = index()
            result = {'version': data['version'], 'base_commit': data['base_commit'], 'count': len(data['assets']),
                      'assets': [{k: a[k] for k in ('id', 'family', 'status', 'purpose')} for a in data['assets']]}
        elif args.command == 'card':
            kit.require(args.input, 'card needs an asset ID')
            result = card(args.input)
        elif args.command == 'search':
            result = {'ranking': 'literal term filter, not an AI relevance score', 'assets': search(args.query, args.family)}
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
