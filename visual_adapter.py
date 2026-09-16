"""Bounded, opt-in visual scene contracts and local production payloads."""
import base64
import copy
import html
import json
from pathlib import Path
import shutil

from safety import digest, identifier, keys, number, require, text, write_json
from tools.visual_library import kit
from tools.visual_library.expansion.wave02 import schema as wave02_schema

HOME = Path(__file__).resolve().parent
PRODUCTION_KINDS = kit.KINDS
WAVE02_PREFIX = 'wave02:'
WAVE02_KINDS = tuple(WAVE02_PREFIX + kind for kind in wave02_schema.KINDS)
REVEALS = ('wipe-right', 'wipe-left', 'wipe-down', 'wipe-up', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale-settle')
DEFAULT_PRESENTATION = {'reveal': 'wipe-right', 'exit': 'none', 'exit_duration': 0, 'chart_style': 'standard'}
CONTENT_LIMITS = {'eyebrow': 40, 'heading_1': 32, 'heading_2': 32, 'note': 110}


def validate_records(records):
    require(isinstance(records, dict) and 1 <= len(records) <= 4, 'Use one to four visual records')
    require(len(json.dumps(records, ensure_ascii=True, allow_nan=False).encode()) <= 100_000, 'Visual data exceeds 100 KB')
    icons = kit.verify_assets()['icons']
    result = {}
    for name, source in records.items():
        identifier(name)
        require(isinstance(source, dict) and source.get('id') == name, 'Visual ID differs from its key')
        kind = source.get('kind')
        if isinstance(kind, str) and kind.startswith(WAVE02_PREFIX):
            # Wave 02 components share the record envelope; the prefix keeps their kinds apart from the chart kinds.
            require(kind in WAVE02_KINDS, 'Unknown wave 02 component kind')
            base = copy.deepcopy(source)
            base['kind'] = kind[len(WAVE02_PREFIX):]
            validated = wave02_schema.validate_component(base, icons)
            validated['kind'] = kind
            validated['library'] = 'wave02'
            result[name] = validated
            continue
        require(kind in PRODUCTION_KINDS, 'Visual kind is not qualified for production yet')
        result[name] = kit.validate_chart(copy.deepcopy(source), icons)
    return result


def validate_scene(scene, records):
    keys(scene, ['layout', 'name', 'first_cue', 'content', 'motion', 'visual_id', 'symbol'] +
         (['presentation'] if 'presentation' in scene else []), 'visual scene')
    require(isinstance(scene['visual_id'], str) and scene['visual_id'] in records, 'Unknown visual ID')
    keys(scene['content'], CONTENT_LIMITS, 'visual content')
    for name, limit in CONTENT_LIMITS.items():
        text(scene['content'][name], limit)
        require('\n' not in scene['content'][name] and '\t' not in scene['content'][name], 'Visual slots must be single-line text')
    keys(scene['motion'], ['visual'], 'visual motion')
    values = scene['motion']['visual']
    keys(values, ['enter', 'fill'], 'visual reveal')
    enter = number(values['enter'])
    fill = values['fill']
    require(isinstance(fill, list) and len(fill) == 2, 'Visual fill needs [start, duration]')
    require(0 <= enter <= number(fill[0]) and number(fill[1]) > 0, 'Invalid visual reveal interval')
    kit.symbol_svg(scene['symbol'])
    presentation = scene.get('presentation', DEFAULT_PRESENTATION)
    keys(presentation, DEFAULT_PRESENTATION, 'visual presentation')
    require(presentation['reveal'] in REVEALS, 'Unknown reveal preset')
    require(presentation['exit'] in ('none', 'fade'), 'Unknown exit preset')
    duration = number(presentation['exit_duration'])
    require((presentation['exit'] == 'none' and duration == 0) or
            (presentation['exit'] == 'fade' and .15 <= duration <= .6), 'Invalid exit duration')
    require(presentation['chart_style'] in ('standard', 'stacked'), 'Unknown chart style')
    require(presentation['chart_style'] != 'stacked' or
            records[scene['visual_id']]['kind'] == 'bar', 'Stacked style requires bar data')


def validate_duration(scene, seconds):
    presentation = scene.get('presentation', DEFAULT_PRESENTATION)
    require(sum(scene['motion']['visual']['fill']) + presentation['exit_duration'] <= seconds + .00001,
            'Visual entrance and exit overlap or exceed the scene')


def scene_html(scene, start, end):
    escape = lambda value: html.escape(str(value), quote=True)
    content = scene['content']
    return (f'<section class="scene visual-library-scene" data-start="{start}" data-end="{end}" '
            f'data-name="{escape(scene["name"])}" data-visual-id="{escape(scene["visual_id"])}">'
            f'<p class="eyebrow">{escape(content["eyebrow"])}</p>'
            f'<h2>{escape(content["heading_1"])}<br>{escape(content["heading_2"])}</h2>'
            '<div class="visual library-visual"><p class="visual-title"></p><img class="visual-symbol" alt="">'
            '<div class="visual-chart" role="img"></div><p class="visual-detail"></p>'
            '<p class="visual-insight"></p><p class="visual-source"></p></div>'
            f'<p class="caption">{escape(content["note"])}</p></section>')


def payload(data, brand):
    records = validate_records(data['visuals'])
    manifest = kit.verify_assets()
    icons = {name: 'data:image/svg+xml;base64,' + base64.b64encode(
        kit.safe_file(kit.HOME / 'vendor', f'lucide-static/icons/{name}.svg').read_bytes()).decode()
             for name in manifest['icons']}
    symbols = {}
    scenes = []
    for scene in data['scenes']:
        if scene['layout'] != 'visual-library':
            continue
        symbols[scene['symbol']] = 'data:image/svg+xml;base64,' + base64.b64encode(
            kit.symbol_svg(scene['symbol'], brand['colors']['accent'], brand['colors']['background'])).decode()
        scenes.append({'id': scene['visual_id'], 'motion': scene['motion']['visual'], 'symbol': scene['symbol'],
                       'presentation': scene.get('presentation', DEFAULT_PRESENTATION)})
    result = {'records': records, 'scenes': scenes, 'colors': brand['colors'], 'icons': icons, 'symbols': symbols}
    if any(record['kind'] == 'geo' for record in records.values()):
        result['world'] = json.loads(kit.safe_file(kit.HOME / 'vendor', 'natural-earth/world.json').read_text())
    return result


def install_assets(output, data, brand):
    content = payload(data, brand)
    selected = {'visual-options.js': kit.HOME / 'options.js',
                'wave02.js': kit.HOME / 'expansion/wave02/wave02.js',
                'echarts.min.js': kit.HOME / 'vendor/echarts/dist/echarts.min.js'}
    for name, source in selected.items():
        target = output / 'assets' / name
        require(not target.exists(), 'Visual asset collision')
        shutil.copyfile(source, target)
    notices = '\n\n'.join(kit.safe_file(kit.HOME / 'vendor', path).read_text()
                            for path in ('echarts/LICENSE', 'echarts/NOTICE', 'lucide-static/LICENSE'))
    if 'world' in content:
        notices += '\n\nMade with Natural Earth 5.1.2. Public domain basemap.\n'
    with (output / 'visual-NOTICES.txt').open('x') as stream:
        stream.write(notices)
    write_json(output / 'visual-evidence.json', {'version': 1, 'status': 'review_required',
               'records': content['records'], 'symbols': sorted(content['symbols']), 'scenes': content['scenes'],
               'adapter_sha256': digest(Path(__file__)),
               'vendor_manifest_sha256': digest(kit.HOME / 'vendor/manifest.json'),
               'asset_hashes': {name: digest(output / 'assets' / name)
                                for name in (*selected, 'visual-scenes.css', 'visual-scenes.js')}})


def scripts(data, brand):
    content = json.dumps(payload(data, brand), ensure_ascii=True, allow_nan=False).replace('<', '\\u003c')
    return (f'<script type="application/json" id="visual-scene-data">{content}</script>'
            '<script src="assets/echarts.min.js"></script><script src="assets/visual-options.js"></script>'
            '<script src="assets/wave02.js"></script><script src="assets/visual-scenes.js"></script>')
