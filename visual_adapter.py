"""Bounded, opt-in visual scene contracts and local production payloads."""
import base64
import copy
import html
import json
import math
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
EFFECTS = {'cascade-v1': ('flow', 'steps'), 'outline-v1': ('metric', 'metric-panel'),
           'highlight-v1': ('comparison', 'comparison-right-title')}
STORIES = {'flow-trace': ('flow',), 'chart-build': ('line', 'bar'),
           'metric-count': ('metric',), 'compare-swap': ('comparison',)}
STORY_FRAMES = 24
CINEMA_TRANSITIONS = ('cut-left', 'zoom-through')


def validate_composition(scene, record):
    presentation = scene.get('presentation', {})
    if 'composition' not in presentation:
        require('transition' not in presentation, 'Scene transitions require a cinematic composition')
        return
    require(presentation['composition'] == 'cinematic-v1', 'Unknown visual composition')
    require(presentation.get('transition') in CINEMA_TRANSITIONS, 'Unknown cinematic transition')
    require(record['kind'] in ('flow', 'bar', 'comparison'), 'Unsupported cinematic visual')
    require(presentation.get('story') is not None, 'Cinematic composition requires story cues')
    require(presentation['reveal'] == 'fade' and presentation['exit'] == 'fade'
            and presentation['exit_duration'] == .4, 'Cinematic seams require the fixed 0.4 second envelope')
    if record['kind'] == 'bar':
        require(len(record['data']['categories']) <= 4, 'Cinematic bars support at most four categories')


def validate_composition_sequence(scenes):
    cinematic = [s.get('presentation', {}).get('composition') == 'cinematic-v1' for s in scenes]
    require(not any(cinematic) or all(cinematic), 'Use a complete cinematic sequence; do not mix frame contracts')


def validate_story(scene, record):
    presentation = scene.get('presentation', {})
    if 'story' not in presentation:
        return
    story = presentation['story']
    keys(story, ['preset', 'cues'], 'visual story')
    preset = story['preset']
    require(isinstance(preset, str) and preset in STORIES, 'Unknown visual story preset')
    require(record['kind'] in STORIES[preset], 'Story is incompatible with visual kind')
    require(not presentation.get('effects'), 'Use a story or decorative effects, not both')
    require(presentation['chart_style'] == 'standard', 'Story charts require standard data')
    data = record['data']
    if preset == 'chart-build':
        require(len(data['series']) == 1 and 2 <= len(data['categories']) <= 6,
                'Chart story requires one series and two to six categories')
    expected = (len(data['steps']) if preset == 'flow-trace' else
                len(data['categories']) if preset == 'chart-build' else
                2 if preset == 'compare-swap' else 1)
    cues = story['cues']
    require(isinstance(cues, list) and len(cues) == expected, 'Story needs one cue per semantic beat')
    require(all(type(cue) is int and cue >= 0 for cue in cues), 'Story cues must be nonnegative integers')
    require(all(a < b for a, b in zip(cues, cues[1:])), 'Story cues must strictly increase')


def validate_story_timing(scene, cues, start, end):
    story = scene.get('presentation', {}).get('story')
    if story is None:
        return
    indices = story['cues']
    require(all(index < len(cues) for index in indices), 'Story cue is outside the transcript')
    times = [math.ceil(cues[index]['start'] * 30) / 30 for index in indices]
    limit = end - scene['presentation']['exit_duration']
    require(times[0] >= start and times[-1] + STORY_FRAMES / 30 <= limit + .00001,
            'Story exceeds its scene or overlaps the exit')
    require(all(b - a >= STORY_FRAMES / 30 - .00001 for a, b in zip(times, times[1:])),
            'Story beats overlap')


def validate_effects(scene, record):
    effects = scene.get('presentation', {}).get('effects', [])
    require(isinstance(effects, list) and len(effects) <= 2, 'Use at most two visual effects')
    targets = set()
    for effect in effects:
        keys(effect, ['preset', 'target', 'cue', 'duration_frames'], 'visual effect')
        preset = effect['preset']
        require(isinstance(preset, str) and preset in EFFECTS, 'Unknown visual effect preset')
        kind, target = EFFECTS[preset]
        require(record['kind'] == kind and effect['target'] == target, 'Effect target is incompatible with visual kind')
        require(target not in targets, 'Duplicate visual effect target')
        targets.add(target)
        require(type(effect['cue']) is int and effect['cue'] >= 0, 'Effect cue must be a nonnegative integer')
        frames = effect['duration_frames']
        require(type(frames) is int and 12 <= frames <= 60, 'Effect duration must be 12-60 frames')


def validate_effect_timing(scene, cues, start, end):
    for effect in scene.get('presentation', {}).get('effects', []):
        cue = effect['cue']
        require(cue < len(cues), 'Effect cue is outside the transcript')
        at = math.ceil(cues[cue]['start'] * 30) / 30
        exit_duration = scene.get('presentation', {}).get('exit_duration', 0)
        require(start <= at and at + effect['duration_frames'] / 30 <= end - exit_duration + .00001,
                'Effect exceeds its scene or overlaps the exit')
        if effect['preset'] != 'cascade-v1':
            require(at >= start + sum(scene['motion']['visual']['fill']) - .00001,
                    'Emphasis must follow the visual entrance')


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
    keys(presentation, [*DEFAULT_PRESENTATION, *(name for name in ('effects', 'story', 'composition', 'transition') if name in presentation)], 'visual presentation')
    require(presentation['reveal'] in REVEALS, 'Unknown reveal preset')
    require(presentation['exit'] in ('none', 'fade'), 'Unknown exit preset')
    duration = number(presentation['exit_duration'])
    require((presentation['exit'] == 'none' and duration == 0) or
            (presentation['exit'] == 'fade' and .15 <= duration <= .6), 'Invalid exit duration')
    require(presentation['chart_style'] in ('standard', 'stacked'), 'Unknown chart style')
    require(presentation['chart_style'] != 'stacked' or
            records[scene['visual_id']]['kind'] == 'bar', 'Stacked style requires bar data')
    validate_effects(scene, records[scene['visual_id']])
    validate_story(scene, records[scene['visual_id']])
    validate_composition(scene, records[scene['visual_id']])


def validate_duration(scene, seconds):
    presentation = scene.get('presentation', DEFAULT_PRESENTATION)
    require(sum(scene['motion']['visual']['fill']) + presentation['exit_duration'] <= seconds + .00001,
            'Visual entrance and exit overlap or exceed the scene')


def scene_html(scene, start, end):
    escape = lambda value: html.escape(str(value), quote=True)
    content = scene['content']
    cinematic = scene.get('presentation', {}).get('composition') == 'cinematic-v1'
    opening = '<div class="cinema-viewport"><div class="cinema-stage">' if cinematic else ''
    closing = '</div></div>' if cinematic else ''
    return (f'<section class="scene visual-library-scene{" cinematic-scene" if cinematic else ""}" data-start="{start}" data-end="{end}" '
            f'data-name="{escape(scene["name"])}" data-visual-id="{escape(scene["visual_id"])}">'
            + opening +
            f'<p class="eyebrow">{escape(content["eyebrow"])}</p>'
            f'<h2>{escape(content["heading_1"])}<br>{escape(content["heading_2"])}</h2>'
            '<div class="visual library-visual"><p class="visual-title"></p><img class="visual-symbol" alt="">'
            '<div class="visual-chart" role="img"></div><p class="visual-detail"></p>'
            '<p class="visual-insight"></p><p class="visual-source"></p></div>' + closing +
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
    has_effects = any(s.get('presentation', {}).get('effects') for s in data['scenes'])
    has_story = any(s.get('presentation', {}).get('story') for s in data['scenes'])
    has_cinema = any(s.get('presentation', {}).get('composition') for s in data['scenes'])
    if has_effects or has_story:
        notices += '\n\n' + (HOME / 'docs/licenses/hyperframes-apache-2.0.txt').read_text()
        shutil.copyfile(HOME / 'docs/hyperframes-provenance.json', output / 'effects-provenance.json')
    if 'world' in content:
        notices += '\n\nMade with Natural Earth 5.1.2. Public domain basemap.\n'
    with (output / 'visual-NOTICES.txt').open('x') as stream:
        stream.write(notices)
    write_json(output / 'visual-evidence.json', {'version': 1, 'status': 'review_required',
               'records': content['records'], 'symbols': sorted(content['symbols']), 'scenes': content['scenes'],
               'adapter_sha256': digest(Path(__file__)),
               'vendor_manifest_sha256': digest(kit.HOME / 'vendor/manifest.json'),
               'asset_hashes': {name: digest(output / 'assets' / name)
                            for name in (*selected, 'visual-scenes.css', 'visual-scenes.js',
                                         *(('visual-effects.css', 'visual-effects.js') if has_effects else ()),
                                         *(('visual-story.js',) if has_story else ()),
                                         *(('visual-cinema.js', 'visual-cinema.css') if has_cinema else ()))}})


def scripts(data, brand):
    content = json.dumps(payload(data, brand), ensure_ascii=True, allow_nan=False).replace('<', '\\u003c')
    effects = ('<link rel="stylesheet" href="assets/visual-effects.css">'
               '<script src="assets/visual-effects.js"></script>') if any(
                   s.get('presentation', {}).get('effects') for s in data['scenes']) else ''
    story = '<script src="assets/visual-story.js"></script>' if any(
        s.get('presentation', {}).get('story') for s in data['scenes']) else ''
    cinema = ('<link rel="stylesheet" href="assets/visual-cinema.css">'
              '<script src="assets/visual-cinema.js"></script>') if any(
                  s.get('presentation', {}).get('composition') for s in data['scenes']) else ''
    return (f'<script type="application/json" id="visual-scene-data">{content}</script>' + effects + story + cinema +
            '<script src="assets/echarts.min.js"></script><script src="assets/visual-options.js"></script>'
            '<script src="assets/wave02.js"></script><script src="assets/visual-scenes.js"></script>')
