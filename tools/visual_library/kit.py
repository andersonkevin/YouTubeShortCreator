"""Offline, bounded visual preparation. Does not modify the production renderer."""
import argparse
import base64
from datetime import date
import hashlib
import json
import math
from pathlib import Path
import re
import statistics

HOME = Path(__file__).resolve().parent
KINDS = ('line', 'bar', 'pie', 'scatter', 'heatmap', 'correlation', 'timeline', 'geo', 'flow', 'metric', 'comparison')


def read_json(path):
    require(path.stat().st_size <= 100_000, 'JSON is too large')
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, 'Duplicate JSON key')
            result[key] = value
        return result
    def reject(value):
        raise ValueError('Non-finite JSON number: ' + value)
    return json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=unique, parse_constant=reject)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def fields(value, names):
    require(isinstance(value, dict) and set(value) == set(names.split()), 'Unexpected fields')


def label(value, maximum=30):
    require(isinstance(value, str) and 0 < len(value.strip()) <= maximum, 'Invalid label length')
    require(not any(ord(c) < 32 or c in '<>' for c in value), 'Label contains markup or controls')


def number(value, minimum=-1e6, maximum=1e6):
    require(type(value) in (float, int) and math.isfinite(value) and minimum <= value <= maximum, 'Invalid finite numeric value')


def items(value, low=1, high=6):
    require(isinstance(value, list) and low <= len(value) <= high, 'Invalid item count')


def labels(value, high=6):
    items(value, high=high)
    for text in value:
        label(text, 18)
    require(len(set(value)) == len(value), 'Duplicate labels')


def safe_file(root, relative):
    require(isinstance(relative, str) and relative and '\\' not in relative and not Path(relative).is_absolute(), 'Relative path required')
    parts = Path(relative).parts
    require(all(part not in ('.', '..') for part in parts), 'Traversal blocked')
    current = root
    require(not current.is_symlink(), 'Symlinks blocked')
    for part in parts:
        current = current / part
        require(not current.is_symlink(), 'Symlinks blocked')
    require(current.is_file() and current.resolve().is_relative_to(root.resolve()), 'Contained file required')
    return current


def verify_assets():
    vendor = HOME / 'vendor'
    manifest = read_json(safe_file(vendor, 'manifest.json'))
    for path, digest in manifest['files'].items():
        require(hashlib.sha256(safe_file(vendor, path).read_bytes()).hexdigest() == digest, 'Vendor hash drift: ' + path)
    return manifest


def validate_recipes(recipes, icons):
    require(isinstance(recipes, dict) and 1 <= len(recipes) <= 16, 'Invalid recipe collection')
    for name, recipe in recipes.items():
        require(re.fullmatch(r'[a-z][a-z0-9-]{0,39}', name) is not None, 'Invalid recipe ID')
        fields(recipe, 'label base badge tone')
        label(recipe['label'], 30)
        require(recipe['base'] in icons and recipe['badge'] in icons, 'Recipe needs known icons')
        require(recipe['tone'] in ('lime', 'cyan', 'rose'), 'Recipe color outside palette')
    return recipes


def validate_chart(chart, icons):
    fields(chart, 'id kind title insight source icon data')
    require(isinstance(chart['id'], str) and re.fullmatch(r'[a-z][a-z0-9-]{0,39}', chart['id']), 'Invalid chart ID')
    require(chart['kind'] in KINDS, 'Unsupported chart kind')
    require(chart['icon'] in icons, 'Unknown icon')
    label(chart['title'], 54)
    label(chart['insight'], 110)
    source = chart['source']
    fields(source, 'kind label reference as_of')
    require(source['kind'] in ('illustrative', 'measured'), 'Declare data provenance')
    label(source['label'], 70)
    label(source['reference'], 180)
    try:
        date.fromisoformat(source['as_of'])
    except (TypeError, ValueError):
        raise ValueError('Source date must be YYYY-MM-DD') from None
    data = chart['data']
    kind = chart['kind']
    derived = {}
    if kind in ('line', 'bar'):
        fields(data, 'categories series unit')
        labels(data['categories'])
        items(data['series'], high=2)
        label(data['unit'], 12)
        names = []
        for series in data['series']:
            fields(series, 'label values')
            label(series['label'], 18)
            names.append(series['label'])
            require(isinstance(series['values'], list) and len(series['values']) == len(data['categories']), 'Series length mismatch')
            for value in series['values']:
                number(value, 0)
        require(len(set(names)) == len(names), 'Duplicate series')
    elif kind == 'pie':
        fields(data, 'categories values unit')
        labels(data['categories'], high=4)
        label(data['unit'], 12)
        require(isinstance(data['values'], list) and len(data['values']) == len(data['categories']), 'Slice length mismatch')
        for value in data['values']:
            number(value, 0)
        require(sum(data['values']) > 0, 'Pie needs a positive total')
    elif kind == 'scatter':
        fields(data, 'x_label y_label x_unit y_unit points')
        for key in ('x_label', 'y_label', 'x_unit', 'y_unit'):
            label(data[key], 20)
        items(data['points'], 3, 40)
        for point in data['points']:
            items(point, 2, 2)
            for value in point:
                number(value)
        xs, ys = zip(*data['points'])
        require(len(set(xs)) > 1 and len(set(ys)) > 1, 'Correlation is undefined for constant data')
        derived = {'r': statistics.correlation(xs, ys), 'n': len(xs)}
    elif kind in ('heatmap', 'correlation'):
        if kind == 'heatmap':
            fields(data, 'columns rows values')
            labels(data['columns'])
            labels(data['rows'])
            require(isinstance(data['values'], list) and len(data['values']) == len(data['rows']), 'Matrix row mismatch')
            for row in data['values']:
                require(isinstance(row, list) and len(row) == len(data['columns']), 'Matrix column mismatch')
                for value in row:
                    number(value, 0, 100)
        else:
            fields(data, 'labels observations')
            labels(data['labels'], high=4)
            require(len(data['labels']) >= 2, 'Need at least two variables')
            items(data['observations'], 3, 40)
            for row in data['observations']:
                require(isinstance(row, list) and len(row) == len(data['labels']), 'Observation width mismatch')
                for value in row:
                    number(value)
            columns = list(zip(*data['observations']))
            require(all(len(set(column)) > 1 for column in columns), 'Constant variable')
            derived = {'matrix': [[statistics.correlation(x, y) for x in columns] for y in columns], 'n': len(data['observations'])}
    elif kind == 'timeline':
        fields(data, 'unit stages')
        label(data['unit'], 12)
        items(data['stages'], high=6)
        names = []
        for stage in data['stages']:
            fields(stage, 'label start end')
            label(stage['label'], 18)
            names.append(stage['label'])
            number(stage['start'], 0)
            number(stage['end'], 0)
            require(stage['end'] > stage['start'], 'Invalid interval')
        require(len(set(names)) == len(names), 'Duplicate stage labels')
    elif kind == 'flow':
        fields(data, 'steps')
        items(data['steps'], 2, 4)
        for step in data['steps']:
            fields(step, 'label icon')
            label(step['label'], 24)
            require(step['icon'] in icons, 'Unknown step icon')
    elif kind == 'metric':
        fields(data, 'label value unit context')
        label(data['label'], 24)
        number(data['value'])
        label(data['unit'], 12)
        label(data['context'], 32)
    elif kind == 'comparison':
        fields(data, 'left right')
        for column in data.values():
            fields(column, 'label items')
            label(column['label'], 18)
            labels(column['items'], high=3)
    else:
        fields(data, 'unit points')
        require(data['unit'] == 'location', 'Geo v1 encodes location only')
        items(data['points'], high=8)
        for point in data['points']:
            fields(point, 'label lat lon value')
            label(point['label'], 18)
            number(point['lat'], -90, 90)
            number(point['lon'], -180, 180)
            number(point['value'], 1, 1)
    return {**chart, 'derived': derived}


def validate_document(document, icons):
    fields(document, 'version charts')
    require(type(document['version']) is int and document['version'] == 1, 'Unsupported library version')
    items(document['charts'], high=16)
    result = [validate_chart(chart, icons) for chart in document['charts']]
    require(len({chart['id'] for chart in result}) == len(result), 'Duplicate chart IDs')
    return result


def workspace_path(workspace):
    root = Path(workspace).expanduser().absolute()
    require(not any(p.is_symlink() for p in [root, *root.parents]), 'Symlink workspace blocked')
    require('..' not in root.parts, 'Traversal in workspace path blocked')
    require(root.is_dir(), 'Existing workspace directory required')
    repo = HOME.parents[1]
    if root.is_relative_to(repo):
        relative = root.relative_to(repo)
        require(relative.parts and relative.parts[0] in ('workspace', 'workspaces'), 'Use a private workspace, not the public source tree')
    return root


def build(input_path, run_id, approved, workspace, example=False):
    require(approved, 'Explicit --approve-write required')
    require(isinstance(run_id, str) and re.fullmatch(r'[a-z][a-z0-9-]{0,47}', run_id), 'Invalid run ID')
    root = workspace_path(workspace)
    if example:
        require(input_path in ('demo.json', 'widgets.json'), 'Unknown built-in example')
    source = safe_file(HOME if example else root, input_path)
    require(source.stat().st_size <= 100_000, 'Input is too large')
    manifest = verify_assets()
    charts = validate_document(read_json(source), manifest['icons'])
    previews = root / 'visuals'
    require(not previews.is_symlink(), 'Symlink output blocked')
    output = previews / run_id
    require(not output.exists() and not output.is_symlink(), 'Run already exists')
    icons = {name: 'data:image/svg+xml;base64,' + base64.b64encode(safe_file(HOME / 'vendor', f'lucide-static/icons/{name}.svg').read_bytes()).decode() for name in manifest['icons']}
    world = json.loads(safe_file(HOME / 'vendor', 'natural-earth/world.json').read_text())
    recipes = validate_recipes(read_json(safe_file(HOME, 'recipes.json')), manifest['icons'])
    content = {'charts': charts, 'icons': icons, 'world': world, 'recipes': recipes}
    payload = json.dumps(content, ensure_ascii=True).replace('<', '\\u003c')
    template = safe_file(HOME, 'gallery.html').read_text()
    page = template.replace('/*LIBRARY_DATA*/', 'window.visualLibraryData=' + payload + ';')
    page = page.replace('/*ECHARTS*/', safe_file(HOME / 'vendor', 'echarts/dist/echarts.min.js').read_text().replace('</script', '<\\/script'))
    page = page.replace('/*RENDERER*/', safe_file(HOME, 'gallery.js').read_text())
    page = page.replace('/*STYLES*/', safe_file(HOME, 'gallery.css').read_text())
    notices = '\n\n'.join(safe_file(HOME / 'vendor', name).read_text() for name in ('echarts/LICENSE', 'echarts/NOTICE', 'lucide-static/LICENSE'))
    notices += '\n\nNatural Earth 5.1.2: public domain. https://www.naturalearthdata.com/about/terms-of-use/\n'
    previews.mkdir(exist_ok=True)
    output.mkdir()
    with (output / 'index.html').open('x') as stream:
        stream.write(page)
    report = {'status': 'preview_built', 'production_integration': False, 'publication_performed': False, 'input_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'vendor_manifest_sha256': hashlib.sha256((HOME / 'vendor/manifest.json').read_bytes()).hexdigest(), 'charts': len(charts), 'icons': len(icons), 'recipes': len(recipes), 'index_sha256': hashlib.sha256(page.encode()).hexdigest(), 'implementation_hashes': {name: hashlib.sha256(safe_file(HOME, name).read_bytes()).hexdigest() for name in ('kit.py', 'gallery.html', 'gallery.css', 'gallery.js', 'recipes.json')}}
    with (output / 'build.json').open('x') as stream:
        json.dump(report, stream, indent=2)
    with (output / 'THIRD-PARTY-NOTICES.txt').open('x') as stream:
        stream.write(notices)
    return output / 'index.html'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['validate', 'build'])
    parser.add_argument('input', help='JSON path relative to the selected private workspace')
    parser.add_argument('--workspace', required=True)
    parser.add_argument('--example', action='store_true')
    parser.add_argument('--run-id')
    parser.add_argument('--approve-write', action='store_true')
    args = parser.parse_args()
    if args.command == 'build':
        print(build(args.input, args.run_id, args.approve_write, args.workspace, args.example))
    else:
        root = workspace_path(args.workspace)
        if args.example:
            require(args.input in ('demo.json', 'widgets.json'), 'Unknown built-in example')
        source = safe_file(HOME if args.example else root, args.input)
        require(source.stat().st_size <= 100_000, 'Input is too large')
        print('PASS:', len(validate_document(read_json(source), verify_assets()['icons'])), 'charts')


if __name__ == '__main__':
    main()
