"""Closed production scene records, local assets and normal-CLI authoring."""
import base64
import copy
import html
import hashlib
import io
import json
from decimal import Decimal
from math import ceil, floor
from pathlib import Path
import shutil

from PIL import Image
import editorial
import cinema
import font_motion
import lettering
from safety import digest, identifier, inside, keys, number, read_json, require, text, write_json
from tools.visual_library import kit
from media_contract import COMPOSITION_FORMATS, composition_geometry, output_profile

KINDS = ('title', 'kinetic', 'grid', 'quote', 'screen', 'walkthrough', 'lower-third', 'cta', 'chart', 'code', 'carousel', 'diagram', 'checklist', 'trust', 'testimonial', 'proof', 'media-grid', 'headline', 'backdrop', 'interface', 'data-story', 'network', 'annotation', 'media-carousel', 'code-story', 'map-story', 'combo-chart', 'specs', 'interaction', 'spatial-stage')
SPATIAL_OBJECT_STYLES = ('exploded-stack', 'product-turntable', 'orbit-card', 'extruded-logo', 'wireframe-portal-title', 'canopy-part-title', 'cuboid-carousel', 'device-review', 'phone-glass', 'desktop-glass')
SOURCE_STAGE_DURATIONS = {'glass-shard': 9, 'frost-orbit': 22.5}
KINDS += ('source-stage', 'editorial', 'cinema', 'variable-type', 'lettering')
LOWER_VARIANTS = ('side-rule', 'accent-underline', 'bold-block', 'clean-bar', 'color-block', 'dark-card',
                  'kicker-name', 'mask-reveal', 'neon-border', 'soft-pill', 'stack-bars', 'news-plate', 'channel-card', 'news-ticker')
BRAND_LOCKUPS = ('logo-intro', 'logo-assemble', 'badge-pair', 'logo-collide')
CTA_STYLES = ('standard', 'capsule', 'brand-close', 'sting', 'character-walk', 'creator-intro', 'cursor-rays') + BRAND_LOCKUPS
TRANSITIONS = ('cut-left', 'zoom-through', 'text-match', 'cut-right', 'cut-up', 'cut-down', 'inverse-zoom', 'rack-focus', 'fade-through')
GPU_BACKDROP_STYLES = tuple('gpu-' + name for name in (
    'aurora', 'blob', 'chrome-orb', 'color-wheel', 'falling-lines', 'flowing-gradient',
    'fractal-noise', 'frost', 'gabor-noise', 'godrays', 'goo', 'heatmap', 'hologram',
    'holographic', 'lens-flare', 'light-edge', 'liquid-metal', 'marble', 'mesh-gradient',
    'nebula', 'obsidian', 'plasma', 'plastic', 'prism', 'ripples', 'sine-wave', 'spiral',
    'strands', 'stripes', 'sun-burst', 'swirl', 'thin-film', 'voronoi', 'water', 'waveform', 'worley-noise'))
THREE_BACKDROP_STYLES = ('three-orbiting-cards', 'three-glass-lens', 'three-glass-ring', 'three-galaxy', 'three-gallery-tunnel', 'three-cosmic-orb', 'three-rack-focus')
CANVAS_BACKDROP_STYLES = ('anamorphic-flare', 'mesh-card', 'stop-motion-8', 'stop-motion-10', 'stop-motion-12', 'facet-morph', 'soft-blob-touch', 'scope-sine', 'scope-square', 'scope-triangle')
VECTOR_BACKDROP_STYLES = ('gooey-split',)
WEBGL_BACKDROP_STYLES = ('halftone-field',)
BACKDROP_STYLES = ('grid', 'grain', 'mesh', 'aurora', 'beat-pulse', 'starfield', 'snow', 'stagger-lattice', 'line-trace', 'confetti') + GPU_BACKDROP_STYLES + THREE_BACKDROP_STYLES + CANVAS_BACKDROP_STYLES + VECTOR_BACKDROP_STYLES + WEBGL_BACKDROP_STYLES
TRUST_STYLES = ('standard', 'logo-wall', 'spring-pop', 'avatar-lift')
CHECKLIST_STYLES = ('standard', 'success-ring', 'icon-swap', 'icon-morph')
DIAGRAM_STYLES = ('standard', 'hand-drawn', 'separated', 'arc-route', 'offset-traveler', 'tracing-beam')
UI_PRIMITIVES = ('micro-badge', 'micro-dropdown', 'micro-modal', 'micro-tabs', 'micro-tooltip',
                 'micro-check', 'signup-flow', 'beat-sequence', 'profile-count')
LIQUID_GLASS_VARIANTS = ('liquid-glass', 'liquid-widgets')
EDITOR_VARIANTS = ('vector-editor', 'sticky-mock')
ANSWER_VARIANTS = ('answer-rank',)
CHAT_EXCHANGE_VARIANTS = ('answer-stream', 'research-stream', 'message-thread')
INTERFACE_STYLES = ('chat', 'terminal', 'steps', 'settings', 'notifications', 'notes', 'feedback', 'social')
INTERFACE_VARIANTS = {
    'notes': ('text-select', 'note-scroll'),
    'chat': ('bottom-stack', 'side-stack', 'token-stream') + CHAT_EXCHANGE_VARIANTS,
    'notifications': ('spring', 'pileup', 'cascade', 'slide', 'peek-stack', 'liquid-glass'),
    'social': ('post', 'discussion', 'comment', 'follow', 'profile-count'),
    'steps': ('tabs', 'sheet', 'skeleton', 'menu', 'swipe-rail', 'velocity-throw-snap',
              'spring-stack-shuffle', 'scroll-feed', 'state-chip-rail', 'card-resize',
              'modal-morph', 'modal-morph-snappy', 'pull-to-refresh', 'product-canvas', 'app-install', 'ui-3d-reveal', 'liquid-panels', 'portal-panels', 'shatter-panels', 'glass-parallax',
              'pull-to-refresh-arrow', 'pull-to-refresh-dots', 'pan-stations', 'panel-reveal', 'liquid-widgets') + UI_PRIMITIVES[:-1] + EDITOR_VARIANTS + ANSWER_VARIANTS,
    'settings': ('toggle-flip',),
}
DATA_STYLES = ('ranking', 'lines', 'value-lanes', 'decline')
NETWORK_STYLES = ('hub', 'branch', 'avatar-cloud', 'radial-surround', 'nucleus-orbit', 'pressure-surround')
HAND_ANNOTATION_STYLES = ('hand-circle', 'hand-box', 'hand-arrow', 'hand-underline', 'hand-strike', 'hand-bracket', 'hand-scribble')
INSPECTION_STYLES = ('scan-gate', 'segmentation-flood')
ANNOTATION_STYLES = ('circle', 'underline', 'box') + HAND_ANNOTATION_STYLES + INSPECTION_STYLES
ANNOTATION_STROKES = ('plain', 'soft', 'sharp', 'spray')
ANNOTATION_CURVES = ('straight', 'gentle', 'swoop')
ANNOTATION_POINTERS = ('cursor', 'pen')
INTERACTION_STYLES = ('click', 'drag', 'marquee', 'menu', 'tap', 'swipe')
POINTER_STYLES = ('arrow', 'dart', 'echo', 'glyph-trail', 'magnetic', 'agent')
SPATIAL_CODE_STYLES = ('particles', 'dissolve', 'extrude')
CODE_STYLES = ('typing', 'diff', 'morph', 'scroll', 'workbench', 'terminal') + SPATIAL_CODE_STYLES
MAP_STYLES = ('us-hex', 'bubbles', 'flows', 'flight', 'world', 'spotlight', 'spain', 'us')
SPAIN_REGIONS = tuple('AND ARA AST BAL CAN CNT CYL CLM CAT VAL EXT GAL MAD MUR NAV PVA RIO CEU MEL'.split())
MAP_REGIONS = tuple('AK AL AR AZ CA CO CT DC DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT NC ND NE NH NJ NM NV NY OH OK OR PA RI SC SD TN TX UT VA VT WA WI WV WY'.split())
WORLD_REGIONS = tuple(feature['properties']['name'] for feature in read_json(
    kit.safe_file(kit.HOME / 'vendor', 'natural-earth/world.json'))['features'])
CAROUSEL_PRESETS = tuple(f'{family}-{index}' for family in ('circle', 'path', 'orbit', 'text-circle', 'vision') for index in range(1, 6)) + ('promo-belt',)
CHART_KINDS = ('bar', 'line', 'metric', 'comparison')
STAT_CARD_STYLES = ('grid-stat', 'soft-stat', 'sticker-stat', 'rail-stat')
METRIC_STYLES = ('count', 'wheel', 'slot', 'pop', 'usage-arc', 'progress-bar', 'star-rating', 'conic-ring', 'count-burst') + STAT_CARD_STYLES
ADVANCED_TITLE_REVEALS = ('glitch-read', 'decode-read', 'neon-accent', 'particle-burst', 'tile-resolve',
                         'ascii-trail', 'cadenced-type', 'particle-assemble', 'texture-read', 'prism-bow')
TITLE_REVEALS = ('rise', 'per-word-rise', 'blur-in', 'typewriter', 'scramble', 'bottom-up', 'top-down',
                 'clip-wipe', 'line-slide', 'char-slam', 'headline-slam', 'text-shimmer', 'tracking-in', 'streaming', 'matrix', 'focus-resolve',
                 'word-crossfade', 'shared-axis-y', 'shared-axis-z', 'soft-blur', 'scan-band', 'accent-glitch', 'shimmer-sweep', 'mask-reveal', 'calm', 'word-highlight',
                 'marker-sweep', 'gradient-read', 'neon-read', 'kinetic-words', 'editorial-words', 'pill-read', 'text-stagger', 'colorama-wipe') + ADVANCED_TITLE_REVEALS
PROMO_TITLE_LAYOUTS = ('promo-hook', 'promo-grid', 'promo-offset', 'promo-pair', 'promo-close')
TITLE_LAYOUTS = ('standard', 'speech-cloud', 'path-wave', 'emphasis', 'layered-emphasis') + PROMO_TITLE_LAYOUTS
HEADLINE_SWAPS = ('line', 'state', 'caret', 'morph', 'strike', 'flap', 'split-panel', 'circle-match', 'slice-sweep')
KINETIC_STYLES = ('standard', 'perspective-marquee', 'ticker-takeover', 'shutter-slam', 'camera-follow', 'glyph-build')
MARKER_STYLES = ('highlight', 'circle', 'underline', 'scribble', 'rough-underline')
SHADER_SWAPS = ('domain-warp', 'ridged-burn', 'whip-pan', 'sdf-iris', 'ripple-waves',
                'gravitational-lens', 'cinematic-zoom', 'chromatic-split', 'glitch',
                'swirl-vortex', 'thermal-distortion', 'flash-through-white',
                'cross-warp-morph', 'light-leak', 'magnetic-pull', 'magnetic-repel')
CATALOG_SWAPS = tuple('catalog-' + name for name in (
    'push-slide', 'vertical-push', 'elastic-push', 'squeeze', 'staggered-blocks', 'horizontal-blinds', 'vertical-blinds',
    'circle-iris', 'diamond-iris', 'diagonal-split', 'grid-dissolve', 'card-flip', 'shutter', 'clock-wipe', 'page-burn',
    'glitch', 'chromatic', 'ripple', 'light-leak', 'overexposure', 'film-burn', 'flash-cut', 'gravity-drop', 'morph-circle',
    'blur-through', 'directional-blur', 'calm-blur', 'crossfade', 'blur-crossfade', 'focus-pull', 'color-dip', 'zoom-through', 'zoom-out',
    'physical-toss', 'physical-drop', 'physical-slide', 'rubber-left', 'rubber-up', 'condense', 'reshape', 'page-slide',
    'spectral-left', 'spectral-right', 'spectral-up', 'spectral-down'))
SCREEN_SWAPS = ('wipe', 'iris', 'curtain', 'grid', 'halftone', 'fade-through', 'whip-pan', 'scribble', 'paper-collage', 'paper-rip', 'clone-wall', 'beat-freeze') + tuple(
    'shader-' + name for name in SHADER_SWAPS) + CATALOG_SWAPS
MEDIA_LAYOUTS = {'solo': 1, '2up': 2, '3up': 3, '4up': 4, '3x2': 6, 'hero': 3}
SPATIAL_TREATMENTS = ('depth-card', 'scrub-stack', 'device-splay', 'dolly-depth-in', 'dolly-depth-out', 'phone-trio')
MEDIA_PRESENTATIONS = ('album-card', 'preview-sheet', 'steam-window', 'grade-split')
GRADE_LOOKS = ('warm-cinematic', 'cool-teal', 'bleach-bypass')
MEDIA_TREATMENTS = ('box', 'gloss', 'spotlight', 'book-open', 'hand-frame', 'collaborators') + SPATIAL_TREATMENTS + MEDIA_PRESENTATIONS
MEDIA_CAMERAS = ('push-in', 'pull-back', 'punch-in', 'punch-reset', 'tilt', 'focus-rack', 'parallax-zoom', 'parallax-unzoom',
                 'handheld-normal-mild', 'handheld-normal-strong', 'handheld-normal-extreme',
                 'handheld-wideangle-mild', 'handheld-wideangle-strong', 'handheld-tele-mild', 'handheld-tele-strong',
                 'rig-6d-shake', 'rig-6d-wobble', 'pendulum-left', 'pendulum-right',
                 'extended-left', 'extended-right', 'extended-up', 'extended-down')
MEDIA_RASTER_SURFACES = ('ascii-coarse', 'ascii-medium', 'ascii-fine', 'dither-2', 'dither-4', 'dither-8',
                         'particle-left', 'particle-center', 'ink-bleed', 'slit-rows', 'slit-columns')
MEDIA_SURFACES = ('blur-fill', 'mirror-fill', 'copy-fill', 'screen', 'grain', 'vignette', 'light-sweep',
                  'light-leak', 'editorial-flash', 'beat-accent', 'feather-focus', 'lcd', 'phone', 'tablet', 'freeze-paper', 'phone-dive', 'drift-accent') + MEDIA_RASTER_SURFACES
MEDIA_HUDS = ('telemetry', 'camcorder')
MAX_SCENES = 120
BEAT_DELAY = .4
BEAT_SECONDS = .8


def label(value, maximum):
    text(value, maximum)
    require('\n' not in value and '\t' not in value, 'Production labels must be single-line input')


def validate_assets(records, base):
    require(isinstance(records, dict) and len(records) <= 32, 'At most 32 local still images')
    files = {}
    for name, record in records.items():
        identifier(name)
        keys(record, ('path', 'sha256'), 'visual asset')
        file = inside(base, record['path'])
        require(file.suffix.lower() in ('.png', '.jpg', '.jpeg') and 0 < file.stat().st_size <= 20_000_000,
                'Visual assets must be bounded local PNG/JPEG files')
        require(digest(file) == record['sha256'], 'Visual asset changed: ' + name)
        with Image.open(file) as image:
            require(image.format in ('PNG', 'JPEG') and 32 <= min(image.size) and max(image.size) <= 4096,
                    'Visual image dimensions outside contract')
            image.verify()
        files[name] = file
    return files


def validate_scenes(scenes, assets, captions, duration):
    require(isinstance(scenes, list) and 1 <= len(scenes) <= MAX_SCENES, 'Use 1-120 production scenes')
    require(len(json.dumps(scenes, ensure_ascii=True)) <= 512_000, 'Production scene payload too large')
    icons = kit.verify_assets()['icons']
    previous = -1
    names = set()
    used_assets = set()
    for scene in scenes:
        keys(scene, ('kind', 'name', 'first_cue', 'cues', 'transition', 'content'), 'production scene')
        kind = scene['kind']
        require(kind in KINDS and scene['transition'] in TRANSITIONS, 'Unknown composition or transition')
        label(scene['name'], 100)
        require(scene['name'] not in names, 'Scene names must be unique')
        names.add(scene['name'])
        first = scene['first_cue']
        require(type(first) is int and previous < first < len(captions) and (previous != -1 or first == 0),
                'Scene anchors must increase from the first caption')
        previous = first
        c = scene['content']
        require(isinstance(c, dict), 'Composition content must be an object')
        beats = 1
        if kind == 'lettering':
            beats = lettering.validate(c)
        elif kind == 'variable-type':
            beats = font_motion.validate(c)
        elif kind == 'cinema':
            beats = cinema.validate(c, assets)
            if c['layout'] == 'photographic':
                used_assets.update(shot['image'] for shot in c['shots'])
        elif kind == 'editorial':
            beats = editorial.validate(c)
        elif kind == 'title':
            optional = tuple(key for key in ('reveal', 'marker', 'layout', 'tail', 'backdrop_word', 'accent_word', 'texture') if key in c)
            keys(c, ('kicker', 'title', 'subtitle') + optional, kind)
            layout = c.get('layout', 'standard')
            require(isinstance(layout, str) and layout in TITLE_LAYOUTS, 'Unknown title layout')
            require(c.get('reveal', 'rise') in TITLE_REVEALS, 'Unknown title reveal')
            for key, limit in (('kicker', 40), ('title', 52), ('subtitle', 90)):
                label(c[key], limit)
            if layout != 'standard':
                require(c.get('reveal', 'rise') == 'rise' and 'marker' not in c, 'Designed title layouts own their entrance and emphasis')
            if layout in ('speech-cloud', 'path-wave'):
                label(c['title'], 28 if layout == 'speech-cloud' else 18)
            if layout in PROMO_TITLE_LAYOUTS:
                label(c['title'], 32)
                label(c['subtitle'], 60)
            if 'tail' in c:
                require(layout == 'speech-cloud' and c['tail'] in ('left', 'right'), 'Tail requires a speech cloud and a declared side')
            if layout in ('emphasis', 'layered-emphasis'):
                require('backdrop_word' in c, 'Emphasis layout requires a supplied backdrop word')
                label(c['backdrop_word'], 16)
                require(not any(char.isspace() for char in c['backdrop_word']), 'Backdrop must be one word')
            else:
                require('backdrop_word' not in c, 'Backdrop word requires the emphasis layout')
            if c.get('reveal') in ('neon-accent', 'particle-burst'):
                require('accent_word' in c, 'This title treatment requires an explicit accent word')
                label(c['accent_word'], 24)
                require(c['title'].split().count(c['accent_word']) == 1,
                        'Accent word must match exactly one whole title word, including punctuation')
            else:
                require('accent_word' not in c, 'Accent word requires neon-accent or particle-burst')
            if c.get('reveal') == 'texture-read':
                require('texture' in c and isinstance(c['texture'], str) and c['texture'] in assets,
                        'Texture title requires one verified local still identifier')
                used_assets.add(c['texture'])
            else:
                require('texture' not in c, 'Texture requires texture-read')
            if 'marker' in c:
                require(isinstance(c['marker'], dict), 'Title marker must be an object')
                keys(c['marker'], ('text', 'style') + (('note',) if 'note' in c['marker'] else ()), 'title marker')
                label(c['marker']['text'], 24)
                require(c['title'].count(c['marker']['text']) == 1, 'Marker text must match exactly once in the title')
                require(c['marker']['style'] in MARKER_STYLES, 'Unknown title marker style')
                require(c.get('reveal', 'rise') == 'rise', 'Marker uses the standard title entrance')
                if 'note' in c['marker']:
                    label(c['marker']['note'], 28)
                    label(c['title'], 38)
                    label(c['subtitle'], 72)
                beats = 2
        elif kind == 'headline':
            keys(c, ('kicker', 'phrases', 'swap'), kind)
            label(c['kicker'], 48)
            require(c['swap'] in HEADLINE_SWAPS, 'Unknown headline swap')
            require(isinstance(c['phrases'], list) and 2 <= len(c['phrases']) <= 6, 'Use 2-6 headline phrases')
            if c['swap'] == 'circle-match':
                require(len(c['phrases']) == 2, 'Circle match requires one pair of explicit headlines')
            for phrase in c['phrases']:
                label(phrase, 32 if c['swap'] == 'slice-sweep' else 52)
            require(all(a != b for a, b in zip(c['phrases'], c['phrases'][1:])), 'Adjacent headline phrases must differ')
            beats = len(c['phrases'])
        elif kind == 'kinetic':
            keys(c, ('kicker', 'words') + (('style',) if 'style' in c else ()), kind)
            require(c.get('style', 'standard') in KINETIC_STYLES, 'Unknown kinetic style')
            label(c['kicker'], 48)
            require(isinstance(c['words'], list) and 2 <= len(c['words']) <= 6, 'Use 2-6 kinetic words')
            for word in c['words']:
                label(word, 16)
                require(' ' not in word, 'Each kinetic item must be one word')
            if c.get('style') == 'glyph-build':
                require(len(c['words']) == 3, 'Glyph build requires three explicit labels')
                for word in c['words']:
                    label(word, 12)
            beats = len(c['words'])
        elif kind in ('grid', 'walkthrough'):
            key = 'items' if kind == 'grid' else 'sections'
            keys(c, ('heading', key), kind)
            label(c['heading'], 52)
            require(isinstance(c[key], list) and 2 <= len(c[key]) <= (6 if kind == 'grid' else 4), 'Invalid panel count')
            for item in c[key]:
                keys(item, ('label', 'body', 'icon'), 'panel')
                label(item['label'], 24)
                label(item['body'], 90)
                require(item['icon'] in icons, 'Unknown pinned icon')
            beats = len(c[key])
        elif kind == 'quote':
            keys(c, ('quote', 'attribution', 'source'), kind)
            label(c['quote'], 150)
            label(c['attribution'], 70)
            label(c['source'], 90)
        elif kind == 'source-stage':
            require(isinstance(c.get('style'), str) and c['style'] in SOURCE_STAGE_DURATIONS, 'Unknown source composition')
            frost = c['style'] == 'frost-orbit'
            keys(c, ('style', 'heading', 'caption', 'source') + (('word',) if frost else ()), kind)
            label(c['heading'], 18);label(c['caption'], 24);label(c['source'], 90)
            if frost:
                from font_outlines import validate_word
                validate_word(c['word'])
            beats = 2
        elif kind == 'spatial-stage':
            require(isinstance(c.get('style'), str) and c['style'] in SPATIAL_OBJECT_STYLES, 'Unknown spatial object style')
            stack = c['style'] == 'exploded-stack'
            extruded = c['style'] == 'extruded-logo'
            portal = c['style'] == 'wireframe-portal-title'
            canopy = c['style'] == 'canopy-part-title'
            cuboid = c['style'] == 'cuboid-carousel'
            device = c['style'] == 'device-review'
            glass = c['style'] in ('phone-glass', 'desktop-glass')
            fields = ('image', 'notifications') if c['style'] == 'phone-glass' else ('image', 'notification', 'desktop')
            keys(c, ('heading', 'caption', 'source', 'style') + (fields if glass else ('phone', 'laptop') if device else ('cards', 'hero') if cuboid else ('surface', 'normal') if canopy else ('word', 'phrase') if portal else ('word', 'finish') if extruded else ('layers' if stack else 'image',)), kind)
            label(c['heading'], 52)
            label(c['caption'], 90)
            label(c['source'], 90)
            if glass:
                identifier(c['image']);require(c['image'] in assets, 'Device glass requires a verified local background screen')
                used_assets.add(c['image'])
                notifications = c['notifications'] if c['style'] == 'phone-glass' else [c['notification']]
                require(isinstance(notifications, list) and len(notifications) == (3 if c['style'] == 'phone-glass' else 1), 'Use exactly three phone notifications or one desktop notification')
                for item in notifications:
                    keys(item, ('icon', 'title', 'time', 'body'), 'device notification')
                    require(isinstance(item['icon'], str) and item['icon'] in icons, 'Unknown pinned notification icon')
                    for field, maximum in (('title', 20), ('time', 8), ('body', 60)):label(item[field], maximum)
                if c['style'] == 'desktop-glass':
                    import calendar
                    desktop = c['desktop'];keys(desktop, ('menu', 'window', 'calendar', 'status', 'media', 'dock'), 'device desktop')
                    menu = desktop['menu'];keys(menu, ('app', 'items', 'status'), 'desktop menu')
                    label(menu['app'], 16);label(menu['status'], 42)
                    require(isinstance(menu['items'], list) and len(menu['items']) == 6, 'Desktop menu needs six explicit items')
                    for item in menu['items']:label(item, 8)
                    window = desktop['window'];keys(window, ('title', 'sidebar', 'files'), 'desktop window');label(window['title'], 30)
                    require(isinstance(window['sidebar'], list) and len(window['sidebar']) == 6, 'Desktop sidebar needs six entries')
                    for item in window['sidebar']:
                        keys(item, ('label', 'icon'), 'desktop sidebar item');label(item['label'], 12)
                        require(isinstance(item['icon'], str) and item['icon'] in icons, 'Unknown pinned sidebar icon')
                    require(isinstance(window['files'], list) and len(window['files']) == 8, 'Desktop window needs eight explicit files')
                    for item in window['files']:
                        keys(item, ('label', 'kind'), 'desktop file');label(item['label'], 14)
                        require(item['kind'] in ('folder', 'document'), 'Unknown desktop file kind')
                    date = desktop['calendar'];keys(date, ('year', 'month', 'day'), 'desktop calendar')
                    require(all(type(date[k]) is int for k in date), 'Calendar fields must be integers')
                    require(1900 <= date['year'] <= 2100 and 1 <= date['month'] <= 12, 'Unsupported calendar year or month')
                    require(1 <= date['day'] <= calendar.monthrange(date['year'], date['month'])[1], 'Invalid selected calendar day')
                    status = desktop['status'];keys(status, ('label', 'value', 'detail', 'note'), 'desktop status')
                    for field, maximum in (('label', 18), ('value', 5), ('detail', 22), ('note', 22)):label(status[field], maximum)
                    media = desktop['media'];keys(media, ('title', 'detail'), 'desktop media')
                    label(media['title'], 16);label(media['detail'], 20)
                    require(isinstance(desktop['dock'], list) and len(desktop['dock']) == 9, 'Desktop dock needs nine explicit icons')
                    require(all(isinstance(icon, str) and icon in icons for icon in desktop['dock']), 'Unknown pinned dock icon')
                beats = 2
            elif device:
                for field in ('phone', 'laptop'):
                    identifier(c[field]);require(c[field] in assets, 'Device review requires two verified local screens')
                    used_assets.add(c[field])
                require(c['phone'] != c['laptop'], 'Phone and laptop screens must be distinct assets')
                beats = 2
            elif cuboid:
                from font_outlines import validate_copy
                require(isinstance(c['cards'], list) and 1 <= len(c['cards']) <= 12, 'Use 1-12 explicit cuboid cards')
                require(type(c['hero']) is int and 1 <= c['hero'] <= len(c['cards']), 'Cuboid hero must select a supplied card, starting at one')
                for card in c['cards']:
                    keys(card, ('category', 'title', 'pills'), 'cuboid card')
                    for field, maximum in (('category', 18), ('title', 48)):
                        label(card[field], maximum);validate_copy(card[field], maximum)
                        require('  ' not in card[field], 'Cuboid copy requires single spaces')
                    require(isinstance(card['pills'], list) and 1 <= len(card['pills']) <= 2, 'Use one or two explicit cuboid pills')
                    for pill in card['pills']:
                        label(pill, 12);validate_copy(pill, 18)
                        require('  ' not in pill, 'Cuboid pills require single spaces')
                beats = 2
            elif canopy:
                from font_outlines import validate_copy
                for field in ('heading', 'caption'):
                    validate_copy(c[field], 36);label(c[field], 24)
                    require('  ' not in c[field], 'Canopy headlines require single spaces')
                require(c['heading'] != c['caption'], 'Canopy requires two distinct supplied headlines')
                for field in ('surface', 'normal'):
                    identifier(c[field]);require(c[field] in assets, 'Canopy requires two verified local texture images')
                    used_assets.add(c[field])
                require(c['surface'] != c['normal'], 'Canopy color and normal textures must be distinct assets')
                beats = 2
            elif portal:
                from font_outlines import validate_copy
                for field, maximum in (('word', 18), ('phrase', 48), ('heading', 36), ('caption', 48)):
                    validate_copy(c[field], maximum)
                    require('  ' not in c[field], 'Portal copy requires single spaces; preserve exact supplied text')
                beats = 2
            elif extruded:
                from font_outlines import validate_word
                validate_word(c['word'])
                require(c['finish'] in ('chrome', 'accent-metal', 'matte'), 'Unknown extruded finish')
                beats = 2
            elif stack:
                require(isinstance(c['layers'], list) and len(c['layers']) == 4, 'Exploded stack requires exactly four explicit layers')
                for layer in c['layers']:
                    keys(layer, ('label', 'icon'), 'spatial layer')
                    label(layer['label'], 22)
                    require(isinstance(layer['icon'], str) and layer['icon'] in icons, 'Unknown pinned layer icon')
                require(len({layer['label'].casefold() for layer in c['layers']}) == 4, 'Layer labels must be distinct')
                require(isinstance(scene['cues'], list) and len(scene['cues']) in (4, 5), 'Stack uses four layer cues and an optional fifth closing cue')
                beats = len(scene['cues'])
            else:
                identifier(c['image'])
                require(c['image'] in assets, 'Spatial card or product label requires a verified local still')
                used_assets.add(c['image'])
                beats = 2
        elif kind == 'data-story':
            keys(c, ('heading', 'insight', 'source', 'style', 'unit', 'categories', 'series'), kind)
            label(c['heading'], 52)
            label(c['insight'], 90)
            kit.validate_source(c['source'])
            require(isinstance(c['style'], str) and c['style'] in DATA_STYLES, 'Unknown data story style')
            label(c['unit'], 12)
            require(isinstance(c['categories'], list) and 2 <= len(c['categories']) <= 6, 'Use 2-6 data periods')
            for category in c['categories']: label(category, 12)
            require(len(set(c['categories'])) == len(c['categories']), 'Data periods must be unique')
            require(isinstance(c['series'], list) and
                    (len(c['series']) == 1 if c['style'] == 'decline' else 2 <= len(c['series']) <= (2 if c['style'] == 'lines' else 6)),
                    'Decline uses one series; comparison lines use two; rankings and lanes use 2-6')
            for series in c['series']:
                keys(series, ('label', 'values'), 'data series')
                label(series['label'], 16)
                require(isinstance(series['values'], list) and len(series['values']) == len(c['categories']),
                        'Every series must contain one explicit value per period')
                for value in series['values']: require(0 <= number(value) <= 1_000_000, 'Data value outside bounds')
            require(len({series['label'].casefold() for series in c['series']}) == len(c['series']), 'Series labels must be distinct')
            if c['style'] == 'decline':
                values = c['series'][0]['values']
                require(all(a >= b for a, b in zip(values, values[1:])) and values[0] > values[-1],
                        'Decline requires nonincreasing supplied values with a lower final value')
            beats = len(c['categories'])
        elif kind == 'combo-chart':
            keys(c, ('heading', 'insight', 'source', 'categories', 'bars', 'line'), kind)
            label(c['heading'], 52)
            label(c['insight'], 90)
            kit.validate_source(c['source'])
            require(isinstance(c['categories'], list) and 2 <= len(c['categories']) <= 6, 'Use 2-6 chart periods')
            for category in c['categories']: label(category, 12)
            require(len(set(c['categories'])) == len(c['categories']), 'Chart periods must be unique')
            for name in ('bars', 'line'):
                record = c[name]
                keys(record, ('label', 'unit', 'maximum', 'values'), 'combo series')
                label(record['label'], 16)
                label(record['unit'], 12)
                maximum = number(record['maximum'])
                require(0 < maximum <= 1_000_000, 'Each axis needs an explicit positive maximum')
                require(isinstance(record['values'], list) and len(record['values']) == len(c['categories']),
                        'Every chart series needs one value per period')
                for value in record['values']: require(0 <= number(value) <= maximum, 'Chart value outside its explicit axis')
            require(c['bars']['label'].casefold() != c['line']['label'].casefold(), 'Chart series labels must differ')
            beats = len(c['categories']) * 2
        elif kind == 'specs':
            keys(c, ('heading', 'source', 'rows'), kind)
            label(c['heading'], 52)
            label(c['source'], 90)
            require(isinstance(c['rows'], list) and 2 <= len(c['rows']) <= 5, 'Use 2-5 specification rows')
            for row in c['rows']:
                keys(row, ('label', 'value'), 'specification row')
                label(row['label'], 24)
                label(row['value'], 50)
            beats = len(c['rows'])
        elif kind == 'map-story':
            require(isinstance(c.get('style'), str) and c['style'] in MAP_STYLES, 'Unknown map style')
            flight = c['style'] == 'flight'
            spotlight = c['style'] == 'spotlight'
            extra = (('values', 'focus') if c['style'] in ('us-hex', 'world', 'spain', 'us') else ('image', 'region') if spotlight else
                     ('image', 'points') + (('flows',) if c['style'] == 'flows' else ()))
            keys(c, ('heading', 'insight', 'source', 'style') + (('arrival',) if flight else ('label',) if spotlight else ('unit', 'maximum')) + extra, kind)
            label(c['heading'], 52)
            label(c['insight'], 90)
            kit.validate_source(c['source'])
            if flight:
                label(c['arrival'], 16)
            elif spotlight:
                label(c['label'], 24)
            else:
                label(c['unit'], 12)
                maximum = number(c['maximum'])
                require(0 < maximum <= 1_000_000, 'Map scale needs an explicit positive maximum')
            if c['style'] in ('us-hex', 'world', 'spain', 'us'):
                allowed_regions = (WORLD_REGIONS if c['style'] == 'world' else SPAIN_REGIONS if c['style'] == 'spain'
                                   else tuple(region for region in MAP_REGIONS if region != 'DC') if c['style'] == 'us' else MAP_REGIONS)
                require(isinstance(c['values'], list) and 1 <= len(c['values']) <= len(allowed_regions), 'Use explicit values for the selected map regions')
                regions = []
                for item in c['values']:
                    keys(item, ('region', 'value'), 'state value')
                    require(isinstance(item['region'], str) and item['region'] in allowed_regions, 'Unknown region in the selected map')
                    require(0 <= number(item['value']) <= maximum, 'State value outside its scale')
                    regions.append(item['region'])
                require(len(set(regions)) == len(regions), 'State values must be unique')
                require(isinstance(c['focus'], list) and 1 <= len(c['focus']) <= 8 and
                        all(isinstance(region, str) and region in regions for region in c['focus']) and
                        all(a != b for a, b in zip(c['focus'], c['focus'][1:])), 'Focus must name supplied, changing state values')
                beats = 1 + len(c['focus'])
            elif spotlight:
                identifier(c['image'])
                require(c['image'] in assets, 'Spotlight requires a verified local base image')
                used_assets.add(c['image'])
                keys(c['region'], ('x', 'y', 'width', 'height'), 'spotlight region')
                region = c['region']
                for coordinate in ('x', 'y'):require(.05 <= number(region[coordinate]) <= .85, 'Spotlight needs a 5% image margin')
                for dimension in ('width', 'height'):require(.1 <= number(region[dimension]) <= .3, 'Spotlight dimensions must be 10-30% of the image')
                require(region['x'] + region['width'] <= .95 and region['y'] + region['height'] <= .95, 'Spotlight exceeds its image margin')
                beats = 2
            else:
                identifier(c['image'])
                require(c['image'] in assets, 'Map requires a verified local base image')
                used_assets.add(c['image'])
                require(isinstance(c['points'], list) and (2 if c['style'] in ('flows', 'flight') else 1) <= len(c['points']) <= (2 if flight else 8),
                        'Use 1-8 bubble points, 2-8 flow endpoints, or exactly two flight endpoints')
                for point in c['points']:
                    require(isinstance(point, dict), 'Map point must be an object')
                    keys(point, ('label', 'x', 'y') + (('value',) if c['style'] == 'bubbles' else ()), 'map point')
                    label(point['label'], 24)
                    for coordinate in ('x', 'y'): require(.15 <= number(point[coordinate]) <= .85, 'Map points need a 15% image margin')
                    if c['style'] == 'bubbles': require(0 <= number(point['value']) <= maximum, 'Bubble value outside its scale')
                require(len({point['label'].casefold() for point in c['points']}) == len(c['points']), 'Map labels must be unique')
                require(len({(point['x'], point['y']) for point in c['points']}) == len(c['points']), 'Map points must have distinct coordinates')
                beats = 1 + len(c['points'])
                if flight:
                    a, b = c['points']
                    require((a['x'] - b['x']) ** 2 + (a['y'] - b['y']) ** 2 >= .25 ** 2,
                            'Flight endpoints need at least 25% normalized image separation')
                    beats = 2
                if c['style'] == 'flows':
                    require(isinstance(c['flows'], list) and 1 <= len(c['flows']) <= 8, 'Use 1-8 explicit map flows')
                    for flow in c['flows']:
                        keys(flow, ('from', 'to', 'value'), 'map flow')
                        require(all(type(flow[key]) is int and 0 <= flow[key] < len(c['points']) for key in ('from', 'to')) and
                                flow['from'] != flow['to'], 'Flow endpoints must be different known point indices')
                        require(0 < number(flow['value']) <= maximum, 'Flow value must be positive and within its scale')
                    require(len({(flow['from'], flow['to']) for flow in c['flows']}) == len(c['flows']), 'Duplicate flow direction')
                    require({i for flow in c['flows'] for i in (flow['from'], flow['to'])} == set(range(len(c['points']))),
                            'Every flow point must be referenced')
                    beats = 1 + len(c['flows'])
        elif kind == 'network':
            keys(c, ('heading', 'source', 'style', 'nodes'), kind)
            label(c['heading'], 52)
            kit.validate_source(c['source'])
            require(isinstance(c['style'], str) and c['style'] in NETWORK_STYLES, 'Unknown network layout')
            require(isinstance(c['nodes'], list) and 3 <= len(c['nodes']) <= 7, 'Use 3-7 network nodes')
            depths = []
            for index, node in enumerate(c['nodes']):
                keys(node, ('label', 'parent'), 'network node')
                label(node['label'], 16)
                parent = node['parent']
                require(parent is None if index == 0 else type(parent) is int and 0 <= parent < index,
                        'Network parents must precede children, with one explicit root')
                depth = 0 if index == 0 else depths[parent] + 1
                require(depth <= 2, 'Network is limited to three readable levels')
                depths.append(depth)
                if c['style'] != 'branch': require(parent == 0 if index else parent is None, 'Radial network nodes must connect to the root')
            require(all(depths.count(level) <= 4 for level in (1, 2)) if c['style'] == 'branch' else True,
                    'Use at most four nodes per tree level')
            require(len({node['label'].casefold() for node in c['nodes']}) == len(c['nodes']), 'Network labels must be distinct')
            beats = len(c['nodes'])
        elif kind == 'annotation':
            keys(c, ('heading', 'source', 'image', 'marks'), kind)
            label(c['heading'], 52)
            label(c['source'], 70)
            identifier(c['image'])
            require(c['image'] in assets, 'Unknown annotation still')
            used_assets.add(c['image'])
            require(isinstance(c['marks'], list) and 1 <= len(c['marks']) <= 4, 'Use 1-4 image annotations')
            for mark in c['marks']:
                require(isinstance(mark, dict), 'Annotation must be an object')
                options = tuple(key for key in ('stroke', 'curve', 'pointer') if key in mark)
                keys(mark, ('x', 'y', 'width', 'height', 'label', 'style') + options, 'annotation')
                label(mark['label'], 40)
                require(isinstance(mark['style'], str) and mark['style'] in ANNOTATION_STYLES, 'Unknown annotation style')
                if mark['style'] in INSPECTION_STYLES:
                    require(not options, 'Inspection marks own their scan and do not use pointer or ink overrides')
                if 'pointer' in mark:
                    require(isinstance(mark['pointer'], str) and mark['pointer'] in ANNOTATION_POINTERS, 'Unknown annotation pointer')
                if 'stroke' in mark:
                    require(mark['style'] in HAND_ANNOTATION_STYLES, 'Stroke texture requires a handwritten annotation')
                    require(isinstance(mark['stroke'], str) and mark['stroke'] in ANNOTATION_STROKES, 'Unknown annotation stroke')
                if 'curve' in mark:
                    require(mark['style'] == 'hand-arrow', 'Curve requires a handwritten arrow')
                    require(isinstance(mark['curve'], str) and mark['curve'] in ANNOTATION_CURVES, 'Unknown annotation curve')
                for key in ('x', 'y', 'width', 'height'): require(0 <= number(mark[key]) <= 1, 'Annotation coordinates must be normalized')
                require(mark['width'] >= .04 and mark['height'] >= .04 and mark['x'] + mark['width'] <= 1 and mark['y'] + mark['height'] <= 1,
                        'Annotation region must fit inside the complete image')
            beats = len(c['marks']) + 1
        elif kind == 'interaction':
            style = c.get('style')
            require(isinstance(style, str) and style in INTERACTION_STYLES, 'Unknown interaction style')
            extra = () if style == 'marquee' else ('result',)
            extra += ('drop',) if style == 'drag' else ('items', 'pick') if style == 'menu' else ('to_y',) if style == 'swipe' else ()
            extra += tuple(key for key in ('pointer', 'camera') if key in c)
            pointer = c.get('pointer', 'arrow')
            require(isinstance(pointer, str) and pointer in POINTER_STYLES, 'Unknown interaction pointer')
            if 'pointer' in c:
                require(style in ('click', 'drag', 'marquee', 'menu'), 'Touch actions do not use an arrow pointer')
            if pointer == 'magnetic': require(style == 'click', 'Magnetic pointer requires a click target')
            if pointer == 'agent': extra += ('actor',)
            if 'camera' in c:
                require(c['camera'] == 'follow' and style in ('click', 'drag') and pointer == 'arrow',
                        'Camera follow requires click or drag with the standard pointer')
            keys(c, ('heading', 'source', 'image', 'style', 'target', 'label') + extra, kind)
            label(c['heading'], 52)
            label(c['source'], 70)
            label(c['label'], 40)
            if pointer == 'agent': label(c['actor'], 18)
            for key in ('image',) if style == 'marquee' else ('image', 'result'):
                identifier(c[key])
                require(c[key] in assets, 'Unknown interaction still')
                used_assets.add(c[key])
            if style != 'marquee':
                require(c['image'] != c['result'], 'Interaction requires an explicit different result still')
                require(digest(assets[c['image']]) != digest(assets[c['result']]),
                        'Interaction result must differ from the original image bytes')
            target = c['target']
            keys(target, ('x', 'y', 'width', 'height'), 'interaction target')
            for key in ('x', 'y', 'width', 'height'):
                require(0 <= number(target[key]) <= 1, 'Interaction coordinates must be normalized')
            require(target['width'] >= .04 and target['height'] >= .04 and
                    target['x'] + target['width'] <= 1 and target['y'] + target['height'] <= 1,
                    'Interaction target must fit inside the image')
            if style == 'drag':
                keys(c['drop'], ('x', 'y'), 'drop position')
                for key, extent in (('x', 'width'), ('y', 'height')):
                    require(0 <= number(c['drop'][key]) <= 1 - target[extent], 'Dropped region must fit inside the image')
                require(abs(c['drop']['x'] - target['x']) + abs(c['drop']['y'] - target['y']) >= .08,
                        'Drag needs a distinct destination')
            if style == 'swipe':
                end = number(c['to_y'])
                require(.04 <= end <= .96 and .2 <= abs(end - target['y'] - target['height'] / 2) <= .65,
                        'Vertical swipe must travel 20-65 percent of image height and remain inside the image')
            if style == 'menu':
                require(isinstance(c['items'], list) and 2 <= len(c['items']) <= 4, 'Use 2-4 explicit menu labels')
                for item in c['items']: label(item, 24)
                require(len({item.casefold() for item in c['items']}) == len(c['items']), 'Menu labels must be distinct')
                require(type(c['pick']) is int and 0 <= c['pick'] < len(c['items']), 'Menu selection must name an existing row')
            beats = 5 if style == 'menu' else 4
        elif kind == 'media-carousel':
            require(isinstance(c.get('preset'), str) and c['preset'] in CAROUSEL_PRESETS, 'Unknown media carousel preset')
            with_text = c['preset'].startswith('text-circle-')
            keys(c, ('heading', 'source', 'preset', 'images') + (('center_text',) if with_text else ()), kind)
            label(c['heading'], 52)
            label(c['source'], 70)
            if with_text:
                label(c['center_text'], 24)
                require(c['center_text'] == c['center_text'].strip() and 1 <= len(c['center_text'].split()) <= 4,
                        'Carousel center text needs 1-4 words without surrounding whitespace')
            slots = 24 if c['preset'].startswith('orbit-') or c['preset'] in ('path-1', 'path-4', 'path-5') else 12
            require(isinstance(c['images'], list) and 3 <= len(c['images']) <= slots, 'Use 3-12 or 3-24 local still references for this carousel')
            for image in c['images']:
                identifier(image)
                require(image in assets, 'Unknown carousel still')
                used_assets.add(image)
            beats = 2
        elif kind == 'interface' and c.get('variant') == 'glass-parallax':
            keys(c, ('heading', 'source', 'style', 'variant', 'image'), kind)
            require(c['style'] == 'steps', 'Glass parallax requires the steps style')
            label(c['heading'], 28)
            label(c['source'], 64)
            identifier(c['image'])
            require(c['image'] in assets, 'Glass parallax requires a verified local still')
            used_assets.add(c['image'])
            beats = 2
        elif kind == 'interface' and c.get('variant') in ('liquid-panels', 'portal-panels', 'shatter-panels'):
            keys(c, ('heading', 'source', 'style', 'variant', 'images'), kind)
            require(c['style'] == 'steps', 'Panel transitions require the steps style')
            label(c['heading'], 28)
            label(c['source'], 64)
            require(isinstance(c['images'], list) and len(c['images']) == 2, 'Panel transitions require two local stills')
            for image in c['images']:
                identifier(image)
                require(image in assets, 'Panel transitions require verified local stills')
                used_assets.add(image)
            require(c['images'][0] != c['images'][1], 'Panel transitions require distinct still references')
            beats = 3 if c['variant'] == 'liquid-panels' else 2
        elif kind == 'interface' and c.get('variant') == 'ui-3d-reveal':
            keys(c, ('heading', 'source', 'style', 'variant', 'image', 'layers', 'selected',
                     'properties', 'selection', 'tagline', 'action'), kind)
            require(c['style'] == 'steps', 'UI reveal requires the steps style')
            for field, limit in (('heading', 28), ('source', 64), ('tagline', 32), ('action', 22)):
                label(c[field], limit)
            identifier(c['image'])
            require(c['image'] in assets, 'UI reveal requires a verified local screenshot')
            used_assets.add(c['image'])
            require(isinstance(c['layers'], list) and 3 <= len(c['layers']) <= 9, 'UI reveal needs 3-9 layer labels')
            for item in c['layers']: label(item, 16)
            require(type(c['selected']) is int and 0 <= c['selected'] < len(c['layers']), 'UI reveal selection must name a layer')
            require(isinstance(c['properties'], list) and len(c['properties']) == 3, 'UI reveal needs three explicit properties')
            for item in c['properties']:
                keys(item, ('label', 'value'), 'UI reveal property')
                label(item['label'], 12)
                label(item['value'], 14)
            region = c['selection']
            keys(region, ('x', 'y', 'width', 'height'), 'UI reveal selection')
            for field in region:
                require(0 <= number(region[field]) <= 1, 'UI reveal coordinates must be normalized')
            require(region['width'] >= .08 and region['height'] >= .08 and
                    region['x'] + region['width'] <= 1 and region['y'] + region['height'] <= 1,
                    'UI reveal selection must fit inside the screenshot')
            beats = 2
        elif kind == 'interface':
            glass = c.get('variant') in LIQUID_GLASS_VARIANTS
            ranked = c.get('variant') == 'answer-rank'
            scrolling_note = c.get('variant') == 'note-scroll'
            exchange = c.get('variant') in CHAT_EXCHANGE_VARIANTS
            answer_table = c.get('variant') == 'answer-stream'
            research = c.get('variant') == 'research-stream'
            message_thread = c.get('variant') == 'message-thread'
            product_canvas = c.get('variant') == 'product-canvas'
            app_install = c.get('variant') == 'app-install'
            keys(c, ('heading', 'source', 'style', 'items') + tuple(key for key in ('typing_indicator', 'variant') if key in c) + (('image',) if glass else ()) + (('prompt', 'lead', 'rank') if ranked else ()) + (('title',) if scrolling_note else ()) + (('table',) if answer_table else ()) + (('activity',) if research else ()) + (('hero', 'actors', 'comment') if product_canvas else ()) + (('selected', 'ui', 'detail') if app_install else ()), kind)
            if exchange:
                require('typing_indicator' not in c, 'Exchange variants own their finite typing indicators')
            if glass:
                identifier(c['image'])
                require(c['image'] in assets, 'Liquid glass requires a verified local background still')
                used_assets.add(c['image'])
            if 'typing_indicator' in c:
                require(c.get('style') == 'chat' and type(c['typing_indicator']) is bool,
                        'Typing indicator is an explicit boolean for chat only')
            label(c['heading'], 52)
            label(c['source'], 70)
            require(isinstance(c['style'], str) and c['style'] in INTERFACE_STYLES, 'Unknown interface style')
            if 'variant' in c:
                require(isinstance(c['variant'], str) and c['variant'] in INTERFACE_VARIANTS.get(c['style'], ()),
                        'Unknown or incompatible interface variant')
            maximum_items = 12 if message_thread else 8 if app_install else 7 if scrolling_note else 4
            require(isinstance(c['items'], list) and 2 <= len(c['items']) <= maximum_items, f'Use 2-{maximum_items} interface items')
            if scrolling_note: label(c['title'], 52)
            if app_install:
                require(len(c['items']) == 8, 'App installation needs eight supplied catalog entries')
                require(type(c['selected']) is int and 0 <= c['selected'] < 8, 'Selected app must be an explicit index from 0 to 7')
                keys(c['ui'], ('title', 'query', 'get', 'open', 'ready'), 'illustrated app UI')
                for key, limit in (('title', 14), ('query', 22), ('get', 8), ('open', 8), ('ready', 18)): label(c['ui'][key], limit)
                keys(c['detail'], ('body', 'facts'), 'illustrated app details')
                label(c['detail']['body'], 48)
                require(isinstance(c['detail']['facts'], list) and len(c['detail']['facts']) == 3, 'Supply three explicit app facts')
                for fact in c['detail']['facts']:
                    keys(fact, ('label', 'value'), 'app fact')
                    label(fact['label'], 8);label(fact['value'], 8)
            if product_canvas:
                require(len(c['items']) == 3, 'Product canvas needs three supplied cards')
                keys(c['hero'], ('title', 'body', 'action'), 'product canvas hero')
                for key, limit in (('title', 24), ('body', 44), ('action', 18)): label(c['hero'][key], limit)
                require(isinstance(c['actors'], list) and len(c['actors']) == 3, 'Product canvas needs three supplied collaborators')
                for actor in c['actors']: label(actor, 18)
                require(len({actor.casefold() for actor in c['actors']}) == 3, 'Collaborator labels must be distinct')
                keys(c['comment'], ('text', 'resolved'), 'product canvas comment')
                label(c['comment']['text'], 60)
                require(type(c['comment']['resolved']) is bool, 'Comment resolution must be explicitly true or false')
            if ranked:
                require(len(c['items']) == 4, 'Rank insertion requires three initial picks and one incoming pick')
                label(c['prompt'], 64);label(c['lead'], 36)
                require(type(c['rank']) is int and 1 <= c['rank'] <= 3, 'Incoming rank must be an explicit slot from 1 to 3')
            if c['style'] == 'social':
                require('variant' in c, 'Social cards require an explicit presentation')
            for item in c['items']:
                if scrolling_note:
                    label(item, 52)
                    continue
                require(isinstance(item, dict), 'Interface item must be an object')
                extra = ('side',) if c['style'] == 'chat' else ('enabled',) if c['style'] == 'settings' else ('state',) if c['style'] == 'feedback' else ('context', 'action') if c['style'] == 'social' else ()
                if app_install: extra += ('icon',)
                if c.get('variant') == 'micro-badge': extra += ('badge',)
                if c.get('variant') == 'micro-check': extra += ('checked',)
                if c.get('variant') == 'profile-count': extra += ('stat',)
                if c.get('variant') == 'vector-editor': extra += ('tool',)
                if c.get('variant') == 'text-select': extra += ('selection',)
                if message_thread and 'image' in item:
                    extra += ('image',)
                    identifier(item['image'])
                    require(item['image'] in assets, 'Message card requires a verified local still')
                    used_assets.add(item['image'])
                keys(item, ('label', 'body') + extra, 'interface item')
                label(item['label'], 58 if c['style'] == 'terminal' else 24)
                label(item['body'], 160 if exchange and not message_thread and item.get('side') == 'received' else 100 if c['style'] == 'steps' else 58 if c['style'] == 'terminal' else 72)
                if c.get('variant') in ('tabs', 'menu', 'state-chip-rail', 'micro-tabs'):
                    label(item['label'], 14)
                if c.get('variant') in ('signup-flow', 'beat-sequence'):
                    label(item['body'], 64)
                if glass:
                    label(item['label'], 24)
                    label(item['body'], 64)
                if c.get('variant') == 'micro-badge': label(item['badge'], 8)
                if c.get('variant') == 'vector-editor':
                    require(isinstance(item['tool'], str) and item['tool'] in ('pen', 'shape', 'type'), 'Vector tool must be pen, shape or type')
                    label(item['body'], 72)
                if c.get('variant') == 'sticky-mock':
                    label(item['label'], 24)
                    label(item['body'], 64)
                if app_install:
                    label(item['label'], 12);label(item['body'], 22)
                    require(isinstance(item['icon'], str) and item['icon'] in icons, 'App icon must be a verified local icon ID')
                if product_canvas:
                    label(item['label'], 14)
                    label(item['body'], 28)
                if ranked:
                    label(item['body'], 40)
                    require(item['label'] == item['label'].strip(), 'Ranked labels cannot have surrounding whitespace')
                if c.get('variant') == 'text-select':
                    label(item['selection'], 40)
                    require(item['selection'] == item['selection'].strip() and item['body'].find(item['selection']) >= 0 and
                            item['body'].find(item['selection']) == item['body'].rfind(item['selection']),
                            'Selected phrase must occur exactly once without surrounding whitespace')
                if c.get('variant') == 'micro-check':
                    require(type(item['checked']) is bool, 'Micro check requires an explicit boolean')
                if c.get('variant') == 'profile-count':
                    keys(item['stat'], ('label', 'value'), 'profile statistic')
                    label(item['stat']['label'], 24)
                    label(item['stat']['value'], 8)
                if c['style'] == 'chat':
                    require(item['side'] in ('sent', 'received'), 'Chat side must be explicit')
                if c['style'] == 'settings':
                    require(type(item['enabled']) is bool, 'Setting state must be an explicit boolean')
                if c['style'] == 'feedback':
                    require(isinstance(item['state'], str) and item['state'] in ('valid', 'error'),
                            'Feedback state must be explicitly valid or error')
                if c['style'] == 'social':
                    label(item['context'], 32)
                    require(isinstance(item['action'], dict), 'Social action must be an explicit record')
                    keys(item['action'], ('before', 'after'), 'illustrated social action')
                    for state in ('before', 'after'):
                        label(item['action'][state], 18)
                    if c['variant'] == 'comment':
                        require(item['action']['before'] == item['action']['after'],
                                'Comment footer is supplied context, not an animated engagement action')
            beats = len(c['items'])
            if product_canvas or app_install: beats = 2
            if exchange and not message_thread:
                require(c['items'][0]['side'] == 'sent' and all(item['side'] == 'received' for item in c['items'][1:]),
                        'Answer exchanges require one supplied prompt followed by supplied answer paragraphs')
            if answer_table:
                keys(c['table'], ('headers', 'rows'), 'answer table')
                require(isinstance(c['table']['headers'], list) and len(c['table']['headers']) == 3,
                        'Answer table needs three explicit column headers')
                for header in c['table']['headers']: label(header, 18)
                require(isinstance(c['table']['rows'], list) and 2 <= len(c['table']['rows']) <= 4,
                        'Answer table needs 2-4 explicit rows')
                for row in c['table']['rows']:
                    require(isinstance(row, list) and len(row) == 3, 'Each answer row needs three cells')
                    for cell in row: label(cell, 32)
                beats += len(c['table']['rows'])
            if research:
                keys(c['activity'], ('steps', 'summary'), 'illustrated activity')
                require(isinstance(c['activity']['steps'], list) and len(c['activity']['steps']) == 2,
                        'Illustrated activity requires two supplied step labels')
                for step in c['activity']['steps']: label(step, 32)
                label(c['activity']['summary'], 32)
                beats += 1
            if ranked:
                require(len({item['label'].casefold() for item in c['items']}) == 4, 'Ranked picks require distinct labels')
        elif kind == 'backdrop':
            keys(c, ('heading', 'caption', 'style'), kind)
            label(c['heading'], 52)
            label(c['caption'], 100)
            require(isinstance(c['style'], str) and c['style'] in BACKDROP_STYLES, 'Unknown backdrop style')
            if c['style'] in GPU_BACKDROP_STYLES + THREE_BACKDROP_STYLES + CANVAS_BACKDROP_STYLES + VECTOR_BACKDROP_STYLES + WEBGL_BACKDROP_STYLES:
                beats = 2
            if c['style'] in ('three-glass-lens', 'three-glass-ring'):
                label(c['heading'], 12)
        elif kind == 'screen':
            keys(c, ('heading', 'caption', 'images', 'chrome') + tuple(key for key in ('focus', 'swap', 'lens') if key in c) + (('word',) if c.get('swap') == 'clone-wall' else ()), kind)
            require(c.get('swap', 'wipe') in SCREEN_SWAPS, 'Unknown screen swap')
            require('focus' not in c or 'swap' not in c, 'Focus and screen swaps are separate modes')
            if 'lens' in c:
                require(c['lens'] == 'filmed' and 'focus' in c and 'swap' not in c,
                        'Filmed lens requires explicit focus regions and no screen swap')
            label(c['heading'], 52)
            label(c['caption'], 100)
            require(c['chrome'] in ('browser', 'window', 'phone'), 'Unknown screen frame')
            require(isinstance(c['images'], list) and 1 <= len(c['images']) <= 3, 'Use 1-3 local stills')
            if c.get('swap') == 'beat-freeze':
                require(len(c['images']) >= 2, 'Freeze cut requires outgoing and incoming stills')
            if c.get('swap') == 'clone-wall':
                label(c['word'], 18)
                require(not any(char.isspace() for char in c['word']), 'Clone wall requires one explicit word')
                require(len(c['images']) >= 2, 'Clone wall requires an outgoing and incoming still')
            for name in c['images']:
                identifier(name)
                require(name in assets, 'Unknown local still')
                used_assets.add(name)
            beats = len(c['images'])
            if 'focus' in c:
                require(len(c['images']) == 1, 'Focus uses one local still; screen swaps remain separate')
                require(isinstance(c['focus'], list) and 1 <= len(c['focus']) <= 3, 'Use 1-3 focus regions')
                for region in c['focus']:
                    keys(region, ('x', 'y', 'width', 'height', 'zoom', 'label'), 'focus region')
                    label(region['label'], 40)
                    for key in ('x', 'y', 'width', 'height', 'zoom'):
                        value = number(region[key])
                        require(1 < value <= 3 if key == 'zoom' else 0 <= value <= 1, 'Focus value outside bounds')
                    require(region['width'] > 0 and region['height'] > 0 and
                            region['x'] + region['width'] <= 1 and region['y'] + region['height'] <= 1,
                            'Focus region must be inside the image')
                    require(max(region['width'], region['height']) * region['zoom'] <= .8,
                            'Focus region must fit the zoomed viewport with margin')
                beats += len(c['focus'])
        elif kind == 'code-story':
            require(isinstance(c.get('style'), str) and c['style'] in CODE_STYLES, 'Unknown code story style')
            keys(c, ('heading', 'filename', 'source', 'style', 'documents') + (('focus',) if c['style'] == 'scroll' else ()), kind)
            for key, limit in (('heading', 52), ('filename', 40), ('source', 90)):
                label(c[key], limit)
            documents = c['documents']
            versions = c['style'] in ('diff', 'morph') + SPATIAL_CODE_STYLES
            require(isinstance(documents, list) and (2 <= len(documents) <= 4 if versions else len(documents) == 1),
                    'Diff, morph and spatial effects use 2-4 explicit documents; other code styles use one')
            for lines in documents:
                require(isinstance(lines, list) and 1 <= len(lines) <= (32 if c['style'] == 'scroll' else 8),
                        'Use 1-8 display lines, or up to 32 scrolling lines')
                for line in lines:
                    require(isinstance(line, str) and len(line) <= 44 and all(char.isprintable() for char in line),
                            'Code story lines allow at most 44 printable characters; no tabs or control characters')
                require(any(line.strip() for line in lines), 'Code document cannot be empty')
            require(all(a != b for a, b in zip(documents, documents[1:])), 'Adjacent code documents must differ')
            if c['style'] == 'scroll':
                require(isinstance(c['focus'], list) and 1 <= len(c['focus']) <= 8, 'Use 1-8 code focus cues')
                require(all(type(line) is int and 0 <= line < len(documents[0]) for line in c['focus']) and
                        all(a != b for a, b in zip(c['focus'], c['focus'][1:])), 'Code focus indices must exist and change')
                beats = len(c['focus'])
            else:
                beats = len(documents) if versions else len(documents[0])
        elif kind == 'code':
            keys(c, ('heading', 'filename', 'lines', 'highlights', 'source'), kind)
            label(c['heading'], 52)
            label(c['filename'], 40)
            label(c['source'], 90)
            require(isinstance(c['lines'], list) and 2 <= len(c['lines']) <= 12, 'Use 2-12 code lines')
            for line in c['lines']:
                require(isinstance(line, str) and len(line) <= 72 and '\n' not in line and '\t' not in line and
                        all(char.isprintable() for char in line), 'Code lines are bounded display text only')
            require(any(line.strip() for line in c['lines']), 'Code cannot be empty')
            require(isinstance(c['highlights'], list) and 1 <= len(c['highlights']) <= 6, 'Use 1-6 code highlights')
            previous_line = None
            for line in c['highlights']:
                require(type(line) is int and 0 <= line < len(c['lines']) and line != previous_line,
                        'Code highlights require valid distinct consecutive line indices')
                previous_line = line
            beats = len(c['highlights'])
        elif kind == 'carousel':
            keys(c, ('heading', 'screens', 'source'), kind)
            label(c['heading'], 52)
            label(c['source'], 90)
            require(isinstance(c['screens'], list) and 2 <= len(c['screens']) <= 5, 'Use 2-5 carousel screens')
            for screen in c['screens']:
                keys(screen, ('image', 'label'), 'carousel screen')
                identifier(screen['image'])
                require(screen['image'] in assets, 'Unknown carousel still')
                label(screen['label'], 40)
                used_assets.add(screen['image'])
            beats = len(c['screens'])
        elif kind == 'media-grid':
            keys(c, ('heading', 'layout', 'items', 'source') + tuple(key for key in ('treatment', 'camera', 'surface', 'hud', 'region', 'actors', 'grade') if key in c), kind)
            label(c['heading'], 52)
            label(c['source'], 90)
            require(isinstance(c['layout'], str) and c['layout'] in MEDIA_LAYOUTS, 'Unknown media layout')
            treatment = c.get('treatment', 'box')
            require(treatment in MEDIA_TREATMENTS, 'Unknown media treatment')
            require(treatment not in ('gloss', 'spotlight', 'hand-frame') or c['layout'] == 'solo', 'Light and hand-frame treatments require a solo card')
            require(treatment != 'book-open' or c['layout'] == '2up', 'Book-open requires two cards')
            if treatment in MEDIA_PRESENTATIONS:
                require(c['layout'] == ('4up' if treatment == 'preview-sheet' else 'solo'), 'Media presentation has a fixed image count')
                require(not any(key in c for key in ('camera', 'surface', 'hud')), 'Media presentation owns its frame and motion')
            if treatment == 'grade-split':
                label(c['heading'], 28)
                require(isinstance(c.get('grade'), dict), 'Grade split requires explicit options')
                grade = c['grade']
                keys(grade, ('look', 'split', 'edge', 'labels'), 'grade split')
                require(isinstance(grade['look'], str) and grade['look'] in GRADE_LOOKS, 'Unknown grade split look')
                require(type(grade['split']) is int and 25 <= grade['split'] <= 85, 'Grade split must be an integer percentage from 25 to 85')
                require(isinstance(grade['edge'], str) and grade['edge'] in ('hairline', 'bold', 'hidden'), 'Unknown grade split edge')
                require(type(grade['labels']) is bool, 'Grade split labels must be an explicit boolean')
            else:
                require('grade' not in c, 'Grade options require the grade-split presentation')
            if treatment == 'steam-window':
                require(isinstance(c.get('region'), dict), 'Steam window requires an explicit image region')
                r = c['region'];keys(r, ('x', 'y', 'width', 'height'), 'steam window region')
                for key in ('x', 'y'): require(0 <= number(r[key]) <= 1, 'Window position must be normalized')
                for key in ('width', 'height'): require(.05 <= number(r[key]) <= .6, 'Window extent must be between .05 and .6')
                require(r['x'] + r['width'] <= 1 and r['y'] + r['height'] <= 1, 'Window must stay inside the verified image')
            else:
                require('region' not in c, 'Motion region requires steam-window')
            if treatment == 'collaborators':
                require(c['layout'] == 'solo' and not any(key in c for key in ('camera', 'surface', 'hud')),
                        'Collaborators require one still without another camera or surface')
                require(isinstance(c.get('actors'), list) and 2 <= len(c['actors']) <= 6, 'Supply 2-6 explicit collaborator labels')
                for actor in c['actors']:
                    label(actor, 8)
                    require(actor == actor.strip(), 'Collaborator labels cannot have surrounding whitespace')
                require(len({actor.casefold() for actor in c['actors']}) == len(c['actors']), 'Collaborator labels must be distinct')
            else:
                require('actors' not in c, 'Actor labels require the collaborator presentation')
            require(isinstance(c['items'], list) and len(c['items']) == MEDIA_LAYOUTS[c['layout']], 'Media item count must match its layout')
            for item in c['items']:
                keys(item, ('image', 'label') + (('detail',) if treatment == 'album-card' else ()), 'media item')
                identifier(item['image'])
                require(item['image'] in assets, 'Unknown media still')
                label(item['label'], 22)
                if treatment == 'album-card': label(item['detail'], 56)
                used_assets.add(item['image'])
            beats = len(c['items'])
            if treatment in ('preview-sheet', 'steam-window', 'collaborators', 'grade-split'): beats = 2
            if treatment in SPATIAL_TREATMENTS:
                required_layout = '3up' if treatment in ('scrub-stack', 'device-splay', 'phone-trio') else 'solo'
                require(c['layout'] == required_layout, 'Spatial treatment has a fixed image count')
                require(not any(key in c for key in ('camera', 'surface', 'hud')), 'Spatial treatment cannot combine with other media effects')
                beats = 2
            if 'hud' in c:
                hud = c['hud']
                require(isinstance(hud, dict), 'HUD must be a bounded record')
                style = hud.get('style')
                require(isinstance(style, str) and style in MEDIA_HUDS, 'Unknown media HUD')
                require(c['layout'] == 'solo' and treatment == 'box' and 'camera' not in c and 'surface' not in c,
                        'HUD requires one standard still without another camera or surface')
                if style == 'telemetry':
                    keys(hud, ('style', 'readouts', 'emphasis'), 'telemetry HUD')
                    require(isinstance(hud['readouts'], list) and 1 <= len(hud['readouts']) <= 4, 'Use 1-4 explicit readouts')
                    for readout in hud['readouts']:
                        keys(readout, ('label', 'value'), 'HUD readout')
                        label(readout['label'], 16);label(readout['value'], 16)
                    require(len({r['label'].casefold() for r in hud['readouts']}) == len(hud['readouts']), 'Readout labels must be distinct')
                    require(hud['emphasis'] is None or type(hud['emphasis']) is int and 0 <= hud['emphasis'] < len(hud['readouts']),
                            'HUD emphasis must be null or an explicit readout index')
                    beats += len(hud['readouts'])
                else:
                    keys(hud, ('style', 'date', 'mode', 'recording', 'battery', 'counter_start'), 'camcorder HUD')
                    label(hud['date'], 32);label(hud['mode'], 12)
                    require(type(hud['recording']) is bool, 'Recording state must be explicit')
                    require(type(hud['battery']) is int and 0 <= hud['battery'] <= 100, 'Battery must be an explicit percentage')
                    require(type(hud['counter_start']) is int and 0 <= hud['counter_start'] <= 86399,
                            'Counter start must be whole seconds from 0 to 86399')
            if 'surface' in c:
                surface = c['surface']
                require(isinstance(surface, dict), 'Surface must be a bounded record')
                style = surface.get('style')
                require(isinstance(style, str) and style in MEDIA_SURFACES, 'Unknown media surface')
                require(c['layout'] == 'solo' and treatment == 'box' and 'camera' not in c,
                        'Media surfaces require a solo standard card without another camera')
                optional = ('target',) if style == 'feather-focus' else (('cutout',) if style == 'phone' and 'cutout' in surface else ())
                keys(surface, ('style',) + optional, 'media surface')
                if style == 'feather-focus':
                    target = surface['target']
                    keys(target, ('x', 'y', 'width', 'height'), 'surface focus region')
                    x, y, width, height = (number(target[key]) for key in ('x', 'y', 'width', 'height'))
                    require(0 <= x < 1 and 0 <= y < 1 and .1 <= width <= 1 and .1 <= height <= 1 and
                            x + width <= 1 and y + height <= 1, 'Focus ellipse must stay within the source image')
                if 'cutout' in surface:
                    require(isinstance(surface['cutout'], str) and surface['cutout'] in ('none', 'island', 'notch'),
                            'Unknown phone cutout')
            if 'camera' in c:
                camera = c['camera']
                require(isinstance(camera, dict), 'Camera must be a bounded record')
                keys(camera, ('style',) + tuple(key for key in ('intensity', 'glow') if key in camera), 'media camera')
                style = camera['style']
                require(isinstance(style, str) and style in MEDIA_CAMERAS, 'Unknown media camera')
                require(treatment == 'box', 'Camera uses the standard card treatment')
                layout = '2up' if style == 'focus-rack' else '3up' if style.startswith('parallax-') else 'solo'
                require(c['layout'] == layout, 'Camera layout does not match its required card count')
                if 'intensity' in camera:
                    require(style == 'push-in' and isinstance(camera['intensity'], str) and camera['intensity'] in ('subtle', 'standard', 'bold'),
                            'Only push-in accepts a fixed intensity')
                if 'glow' in camera:
                    require(style == 'tilt' and isinstance(camera['glow'], str) and camera['glow'] in ('tight', 'standard', 'wide'),
                            'Only tilt accepts a fixed glow spread')
                beats = 3 if style == 'punch-reset' else 2
        elif kind == 'diagram':
            keys(c, ('heading', 'steps', 'source') + (('style',) if 'style' in c else ()), kind)
            require(c.get('style', 'standard') in DIAGRAM_STYLES, 'Unknown diagram style')
            label(c['heading'], 52)
            label(c['source'], 90)
            require(isinstance(c['steps'], list) and 2 <= len(c['steps']) <= 4, 'Use 2-4 diagram steps')
            for step in c['steps']:
                keys(step, ('label', 'body', 'icon'), 'diagram step')
                label(step['label'], 24)
                label(step['body'], 64)
                require(step['icon'] in icons, 'Unknown pinned diagram icon')
            beats = len(c['steps'])
        elif kind == 'chart':
            keys(c, ('record',) + (('metric_style',) if 'metric_style' in c else ()) +
                 (('maximum',) if 'maximum' in c else ()), kind)
            record = kit.validate_chart(c['record'], icons)
            require(record['kind'] in CHART_KINDS, 'Unsupported production data visual')
            style = c.get('metric_style', 'count')
            require(style in METRIC_STYLES, 'Unknown metric style')
            require(record['kind'] == 'metric' or ('metric_style' not in c and 'maximum' not in c),
                    'Metric options require a metric record')
            if style in STAT_CARD_STYLES:
                label(record['data']['label'], 24)
                label(record['data']['context'], 52)
                label(record['data']['unit'], 8 if style == 'soft-stat' else 12)
                require(len(str(record['data']['value'])) <= (4 if style == 'soft-stat' else 7),
                        'Statistic cards require a short value at fixed brand type size')
            if style in ('usage-arc', 'progress-bar', 'star-rating', 'conic-ring'):
                require('maximum' in c, 'Gauges need an explicit maximum in the same unit')
                maximum = number(c['maximum'])
                require(0 < maximum <= 1_000_000 and 0 <= record['data']['value'] <= maximum,
                        'Gauge value must be between zero and its positive maximum')
                if style == 'star-rating':
                    require(type(c['maximum']) is int and 1 <= maximum <= 10 and record['data']['unit'] == 'stars',
                            'Star ratings require 1-10 whole stars and the stars unit')
            else:
                require('maximum' not in c, 'Maximum is only valid for a gauge')
            if record['kind'] in ('bar', 'line'):
                require(len(record['data']['series']) == 1 and 2 <= len(record['data']['categories']) <= 6,
                        'Animated production charts use one series and 2-6 categories')
                beats = len(record['data']['categories'])
            else:
                beats = 2 if record['kind'] == 'comparison' or style == 'count-burst' else 1
        elif kind in ('trust', 'testimonial', 'proof'):
            fields = {'trust': ('heading', 'marks', 'source'),
                      'testimonial': ('heading', 'quote', 'author', 'role', 'rating', 'source'),
                      'proof': ('heading', 'claim', 'features', 'action', 'rating', 'source')}[kind]
            keys(c, fields + (('style',) if kind == 'trust' and 'style' in c else ()), kind)
            label(c['heading'], 52)
            kit.validate_source(c['source'])
            if kind == 'trust':
                require(c.get('style', 'standard') in TRUST_STYLES, 'Unknown trust presentation')
                require(isinstance(c['marks'], list) and 3 <= len(c['marks']) <= 7, 'Use 3-7 explicit trust marks')
                for mark in c['marks']: label(mark, 24)
                require(len({mark.casefold() for mark in c['marks']}) == len(c['marks']), 'Trust marks must be distinct')
                beats = len(c['marks'])
            else:
                require(0 <= number(c['rating']) <= 5, 'Rating must be an explicit value from zero to five')
                if kind == 'testimonial':
                    for key, limit in (('quote', 150), ('author', 40), ('role', 64)): label(c[key], limit)
                    beats = 2
                else:
                    label(c['claim'], 90)
                    label(c['action'], 40)
                    require(isinstance(c['features'], list) and len(c['features']) == 3, 'Use three proof features')
                    for feature in c['features']:
                        keys(feature, ('label', 'icon') + (('badge',) if 'badge' in feature else ()), 'proof feature')
                        label(feature['label'], 24)
                        require(feature['icon'] in icons, 'Unknown proof icon')
                        if 'badge' in feature: label(feature['badge'], 4)
                    beats = 3
        elif kind == 'lower-third':
            keys(c, ('heading', 'name', 'role', 'context') + tuple(key for key in ('variant', 'button', 'items') if key in c), kind)
            require(c.get('variant', 'side-rule') in LOWER_VARIANTS, 'Unknown lower-third variant')
            for key, limit in (('heading', 52), ('name', 40), ('role', 64), ('context', 100)):
                label(c[key], limit)
            if c.get('variant') == 'channel-card':
                require(isinstance(c.get('button'), dict), 'Channel card requires explicit before/after button text')
                keys(c['button'], ('before', 'after'), 'channel button')
                for text in c['button'].values(): label(text, 18)
                require(c['button']['before'] != c['button']['after'], 'Button states must differ')
                label(c['name'], 24);label(c['role'], 38)
                beats = 2
            else:
                require('button' not in c, 'Button states require channel-card')
            if c.get('variant') == 'news-ticker':
                label(c['name'], 18);label(c['role'], 56)
                require(isinstance(c.get('items'), list) and 2 <= len(c['items']) <= 6, 'Ticker requires 2-6 explicit items')
                for item in c['items']: label(item, 40)
                require(sum(len(item) for item in c['items']) <= 180, 'Ticker copy exceeds the bounded reading window')
                beats = 2
            else:
                require('items' not in c, 'Ticker items require news-ticker')
        elif kind == 'checklist':
            keys(c, ('heading', 'items', 'source') + tuple(key for key in ('emphasis', 'style') if key in c), kind)
            require(c.get('style', 'standard') in CHECKLIST_STYLES, 'Unknown checklist presentation')
            label(c['heading'], 52)
            label(c['source'], 90)
            if 'emphasis' in c:
                label(c['emphasis'], 20)
                require(c['heading'].count(c['emphasis']) == 1, 'Emphasis must occur exactly once in the heading')
            require(isinstance(c['items'], list) and 2 <= len(c['items']) <= 5, 'Use 2-5 checklist items')
            for item in c['items']:
                keys(item, ('label', 'value', 'checked'), 'checklist item')
                label(item['label'], 24)
                label(item['value'], 40)
                require(type(item['checked']) is bool, 'Checklist status must be an explicit boolean')
            beats = len(c['items'])
        else:
            extras = ('prompt', 'profile') if c.get('style') == 'creator-intro' else ('support', 'finale') if c.get('style') == 'cursor-rays' else ()
            keys(c, ('heading', 'action', 'label') + extras + tuple(key for key in ('style', 'badges') if key in c), kind)
            require(c.get('style', 'standard') in CTA_STYLES, 'Unknown closing style')
            for key, limit in (('heading', 52), ('action', 40), ('label', 90)):
                label(c[key], limit)
            if c.get('style') in ('brand-close', 'sting'): label(c['heading'], 24)
            if c.get('style') == 'character-walk':
                label(c['heading'], 28);label(c['label'], 64);beats = 2
            if c.get('style') == 'cursor-rays':
                label(c['heading'], 8);label(c['action'], 12);label(c['support'], 16);label(c['label'], 64);beats = 2
                require(isinstance(c['finale'], list) and len(c['finale']) == 2, 'Ray title requires two supplied final lines')
                for line in c['finale']: label(line, 20)
            if c.get('style') == 'creator-intro':
                label(c['heading'], 28);label(c['label'], 64);beats = 2
                keys(c['prompt'], ('placeholder', 'text', 'model', 'thinking'), 'creator prompt')
                for key, limit in (('placeholder', 64), ('text', 180), ('model', 24), ('thinking', 32)):
                    label(c['prompt'][key], limit)
                keys(c['profile'], ('image', 'name', 'handle', 'bio', 'before', 'after'), 'creator profile')
                for key, limit in (('name', 24), ('handle', 32), ('bio', 90), ('before', 14), ('after', 14)):
                    label(c['profile'][key], limit)
                image = c['profile']['image']
                require(isinstance(image, str) and image in assets, 'Creator profile needs a verified local still')
                used_assets.add(image)
                require(c['profile']['before'] != c['profile']['after'], 'Supply distinct illustrated profile action states')
            if c.get('style') in BRAND_LOCKUPS:
                label(c['heading'], 32);label(c['action'], 32);label(c['label'], 36 if c['style'] == 'logo-intro' else 64)
                if c['style'] != 'badge-pair': beats = 2
            if c.get('style') == 'badge-pair':
                require(isinstance(c.get('badges'), list) and 1 <= len(c['badges']) <= 2, 'Use one or two explicit destination badges')
                for badge in c['badges']:
                    keys(badge, ('icon', 'eyebrow', 'label'), 'destination badge')
                    require(isinstance(badge['icon'], str) and badge['icon'] in icons, 'Unknown destination icon')
                    label(badge['eyebrow'], 24);label(badge['label'], 22)
            else:
                require('badges' not in c, 'Destination badges require badge-pair')
        cues = scene['cues']
        require(isinstance(cues, list) and len(cues) == beats and
                all(type(cue) is int and first <= cue < len(captions) for cue in cues) and
                cues == sorted(set(cues)), 'Each visual beat needs an ordered caption anchor')
    for index, scene in enumerate(scenes):
        if scene['transition'] == 'text-match':
            require(index + 1 < len(scenes) and scene['kind'] == scenes[index + 1]['kind'] == 'title',
                    'Text-match connects two adjacent title scenes')
            require((index == 0 or scenes[index - 1]['transition'] != 'text-match') and
                    scenes[index + 1]['transition'] != 'text-match', 'Text-match uses non-overlapping title pairs')
            for title in (scene, scenes[index + 1]):
                label(title['content']['title'], 32)
                require(title['content'].get('reveal', 'rise') == 'rise', 'Text-match owns its headline motion')
                require('marker' not in title['content'], 'Text-match and markers are separate title modes')
                require(title['content'].get('layout', 'standard') == 'standard', 'Text-match requires the standard title layout')
    require(used_assets == set(assets), 'Every local still must be used; no unknown or unused assets')
    starts = [0] + [number(captions[s['first_cue']]['start']) for s in scenes[1:]]
    bounds = list(zip(starts, starts[1:] + [duration]))
    for scene, (start, end) in zip(scenes, bounds):
        require(end - start >= 2, 'Production scenes need at least two seconds')
        if scene['kind'] == 'cinema' and scene['content']['layout'] == 'photographic':
            require(scene['cues'][0] == scene['first_cue'], 'Photographic sequence must begin at its first cue')
            anchors = [number(captions[cue]['start']) + BEAT_DELAY for cue in scene['cues']]
            require(all(b - a >= 1.5 for a, b in zip(anchors, anchors[1:] + [end - .4])),
                    'Photographic shots need at least 1.5 seconds before the next cut or scene exit')
        if scene['kind'] == 'source-stage':
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            gap = Decimal(str(number(captions[scene['cues'][1]]['start']))) - Decimal(str(number(captions[scene['cues'][0]]['start'])))
            minimum = SOURCE_STAGE_DURATIONS[scene['content']['style']]
            require(gap >= Decimal(str(minimum)) and frames[1] - frames[0] >= minimum * 30,
                    'Source stage cues must preserve the original choreography duration')
        if scene['kind'] == 'map-story' and scene['content']['style'] in ('flight', 'spotlight'):
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            gap = Decimal(str(number(captions[scene['cues'][1]]['start']))) - Decimal(str(number(captions[scene['cues'][0]]['start'])))
            minimum = 7 if scene['content']['style'] == 'spotlight' else 6
            require(frames[1] - frames[0] >= minimum * 30 and gap >= minimum, f'Map motion start and settle cues need {minimum} seconds and {minimum * 30} native frames')
        if scene['kind'] == 'map-story' and scene['content']['style'] == 'world':
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            require(frames[1] - frames[0] >= 150, 'World map reveal needs 150 frames before the first highlight')
            require(all(b - a >= 36 for a, b in zip(frames[1:], frames[2:])), 'World highlights need at least 36 frames between cues')
            require(frames[-1] + 30 <= floor((end - .4) * 30 + 1e-7), 'Final world highlight needs 30 frames before the scene transition')
        if scene['kind'] == 'map-story' and scene['content']['style'] in ('spain', 'us'):
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            require(frames[1] - frames[0] >= 195, 'Regional map reveal needs 195 frames before the first highlight')
            require(all(b - a >= 36 for a, b in zip(frames[1:], frames[2:])), 'Regional highlights need at least 36 frames between cues')
            require(frames[-1] + 30 <= floor((end - .4) * 30 + 1e-7), 'Final regional highlight needs 30 frames before the scene transition')
        if scene['kind'] == 'screen' and scene['content'].get('swap') == 'beat-freeze':
            # Count actual capture frames, including the existing caption delay and exit margin.
            transitions = scene['cues'][1:]
            for index, cue in enumerate(transitions):
                finish = ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) + 69
                boundary = (ceil((number(captions[transitions[index + 1]]['start']) + BEAT_DELAY) * 30)
                            if index + 1 < len(transitions) else floor((end - .4) * 30 + 1e-7))
                require(finish <= boundary, 'Freeze cut needs 69 frames before the next cut or scene transition')
        if scene['kind'] == 'lower-third' and scene['content'].get('variant') == 'news-ticker':
            require(number(captions[scene['cues'][1]]['start']) - number(captions[scene['cues'][0]]['start']) >= 6 - 1e-8,
                    'Ticker start and settle cues must be at least six seconds apart')
        if scene['kind'] == 'spatial-stage' and scene['content']['style'] in ('product-turntable', 'orbit-card', 'extruded-logo', 'wireframe-portal-title', 'canopy-part-title', 'device-review', 'phone-glass', 'desktop-glass'):
            minimum = {'orbit-card': 4, 'product-turntable': 6, 'extruded-logo': 5, 'wireframe-portal-title': 8, 'canopy-part-title': 12, 'device-review': 15, 'phone-glass': 15, 'desktop-glass': 15}[scene['content']['style']]
            require(number(captions[scene['cues'][1]]['start']) - number(captions[scene['cues'][0]]['start']) >= minimum - 1e-8,
                    f'Spatial object start and settle cues must be at least {minimum} seconds apart')
        if scene['kind'] == 'spatial-stage' and scene['content']['style'] == 'cuboid-carousel':
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            require(frames[1] - frames[0] >= 150, 'Cuboid arrival requires 150 frames before the departure cue')
            require(frames[1] + 50 <= floor((end - .4) * 30 + 1e-7), 'Cuboid departure needs 50 frames before the scene transition')
        if scene['kind'] == 'media-carousel':
            require(number(captions[scene['cues'][1]]['start']) - number(captions[scene['cues'][0]]['start']) >= 6,
                    'Carousel start and settle cues must be at least six seconds apart')
        if scene['kind'] == 'cta' and scene['content'].get('style') == 'character-walk':
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            require(number(captions[scene['cues'][1]]['start']) - number(captions[scene['cues'][0]]['start']) >= 8 - 1e-8 and
                    frames[1] - frames[0] >= 240, 'Character walk requires eight seconds and 240 frames between start and settle cues')
            require(frames[1] + 24 <= floor((end - .4) * 30 + 1e-7), 'Character walk needs 24 settling frames before the scene transition')
        if scene['kind'] == 'cta' and scene['content'].get('style') == 'cursor-rays':
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            gap = Decimal(str(number(captions[scene['cues'][1]]['start']))) - Decimal(str(number(captions[scene['cues'][0]]['start'])))
            require(gap >= 8 and frames[1] - frames[0] >= 240, 'Ray title requires eight seconds and 240 frames between anchors')
            require(frames[1] + 24 <= floor((end - .4) * 30 + 1e-7), 'Ray title needs 24 settling frames before the scene transition')
        if scene['kind'] == 'cta' and scene['content'].get('style') == 'creator-intro':
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            gap = Decimal(str(number(captions[scene['cues'][1]]['start']))) - Decimal(str(number(captions[scene['cues'][0]]['start'])))
            require(gap >= 12 and frames[1] - frames[0] >= 360,
                    'Creator intro requires twelve seconds and 360 frames between start and settle cues')
            require(frames[1] + 24 <= floor((end - .4) * 30 + 1e-7), 'Creator intro needs 24 settling frames before the scene transition')
        if scene['kind'] == 'interface' and scene['content'].get('variant') == 'app-install':
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            require(number(captions[scene['cues'][1]]['start']) - number(captions[scene['cues'][0]]['start']) >= 7 - 1e-8 and
                    frames[1] - frames[0] >= 210, 'App installation needs seven seconds and 210 frames between start and settle cues')
            require(frames[1] + 24 <= floor((end - .4) * 30 + 1e-7), 'App installation needs 24 settling frames before the scene transition')
        if scene['kind'] == 'interface' and scene['content'].get('variant') == 'glass-parallax':
            values = [number(captions[cue]['start']) for cue in scene['cues']]
            frames = [ceil((value + BEAT_DELAY) * 30) for value in values]
            require(Decimal(str(values[1])) - Decimal(str(values[0])) >= 20 and frames[1] - frames[0] >= 600,
                    'Glass parallax panels need twenty seconds and 600 frames between the start and settle cues')
            require(frames[-1] + 24 <= floor((end - .4) * 30 + 1e-7), 'Glass parallax panels need 24 settling frames before the scene transition')
        if scene['kind'] == 'interface' and scene['content'].get('variant') == 'shatter-panels':
            values = [number(captions[cue]['start']) for cue in scene['cues']]
            frames = [ceil((value + BEAT_DELAY) * 30) for value in values]
            require(Decimal(str(values[1])) - Decimal(str(values[0])) >= 12 and frames[1] - frames[0] >= 360,
                    'Shatter panels need twelve seconds and 360 frames between the start and settle cues')
            require(frames[-1] + 24 <= floor((end - .4) * 30 + 1e-7), 'Shatter panels need 24 settling frames before the scene transition')
        if scene['kind'] == 'interface' and scene['content'].get('variant') == 'portal-panels':
            values = [number(captions[cue]['start']) for cue in scene['cues']]
            frames = [ceil((value + BEAT_DELAY) * 30) for value in values]
            require(Decimal(str(values[1])) - Decimal(str(values[0])) >= 10 and frames[1] - frames[0] >= 300,
                    'Portal panels need ten seconds and 300 frames between the start and settle cues')
            require(frames[-1] + 24 <= floor((end - .4) * 30 + 1e-7), 'Portal panels need 24 settling frames before the scene transition')
        if scene['kind'] == 'interface' and scene['content'].get('variant') == 'liquid-panels':
            values = [number(captions[cue]['start']) for cue in scene['cues']]
            frames = [ceil((value + BEAT_DELAY) * 30) for value in values]
            for i, minimum in enumerate((5, 7)):
                gap = Decimal(str(values[i + 1])) - Decimal(str(values[i]))
                require(gap >= minimum and frames[i + 1] - frames[i] >= minimum * 30,
                        'Liquid panels need five seconds before the mix cue and seven seconds before the settle cue')
            require(frames[-1] + 24 <= floor((end - .4) * 30 + 1e-7), 'Liquid panels need 24 settling frames before the scene transition')
        if scene['kind'] == 'interface' and scene['content'].get('variant') == 'ui-3d-reveal':
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            gap = Decimal(str(number(captions[scene['cues'][1]]['start']))) - Decimal(str(number(captions[scene['cues'][0]]['start'])))
            require(gap >= 13 and frames[1] - frames[0] >= 390,
                    'UI reveal requires thirteen seconds and 390 frames between start and settle cues')
            require(frames[1] + 24 <= floor((end - .4) * 30 + 1e-7), 'UI reveal needs 24 settling frames before the scene transition')
        if scene['kind'] == 'interface' and scene['content'].get('variant') == 'product-canvas':
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            require(number(captions[scene['cues'][1]]['start']) - number(captions[scene['cues'][0]]['start']) >= 12 - 1e-8 and
                    frames[1] - frames[0] >= 360, 'Product canvas requires twelve seconds and 360 frames between start and settle cues')
            require(frames[1] + 24 <= floor((end - .4) * 30 + 1e-7), 'Product canvas needs 24 native settling frames before the scene transition')
        if scene['kind'] == 'media-grid' and scene['content'].get('treatment') == 'grade-split':
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            gap = Decimal(str(number(captions[scene['cues'][1]]['start']))) - Decimal(str(number(captions[scene['cues'][0]]['start'])))
            require(gap >= 6 and frames[1] - frames[0] >= 180, 'Grade split requires six seconds and 180 frames between cues')
            require(frames[1] + 24 <= floor((end - .4) * 30 + 1e-7), 'Grade split needs 24 settling frames before the scene transition')
        if scene['kind'] == 'media-grid' and scene['content'].get('treatment') in ('preview-sheet', 'steam-window'):
            require(number(captions[scene['cues'][1]]['start']) - number(captions[scene['cues'][0]]['start']) >= 6 - 1e-8,
                    'Media motion start and settle cues must be at least six seconds apart')
        if scene['kind'] == 'interface' and scene['content'].get('variant') == 'sticky-mock':
            require(all(number(captions[b]['start']) - number(captions[a]['start']) >= 2
                        for a, b in zip(scene['cues'], scene['cues'][1:])),
                    'Pinned mock captions need two seconds between cues for entry, stillness and exit')
        if scene['kind'] == 'interface' and scene['content'].get('variant') == 'note-scroll':
            require(all(Decimal(str(number(captions[b]['start']))) - Decimal(str(number(captions[a]['start']))) >= 2
                        for a, b in zip(scene['cues'], scene['cues'][1:])),
                    'Scrolling notes need two seconds between cues for typing, reading and scrolling')
        if scene['kind'] == 'interface' and scene['content'].get('variant') in CHAT_EXCHANGE_VARIANTS:
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            boundaries = frames[1:] + [floor((end - .4) * 30 + 1e-7)]
            require(all(frame + 60 <= boundary for frame, boundary in zip(frames, boundaries)),
                    'Conversation beats need 60 frames before the next beat or scene transition')
        if scene['kind'] == 'backdrop' and scene['content']['style'] in GPU_BACKDROP_STYLES + THREE_BACKDROP_STYLES + CANVAS_BACKDROP_STYLES:
            gap = 3 if scene['content']['style'].startswith('stop-motion-') else 2
            require(number(captions[scene['cues'][1]]['start']) - number(captions[scene['cues'][0]]['start']) >= gap,
                    f'Animated backdrop start and settle cues must be at least {gap} seconds apart')
        if scene['kind'] == 'backdrop' and scene['content']['style'] in VECTOR_BACKDROP_STYLES:
            frames = [ceil((number(captions[cue]['start']) + BEAT_DELAY) * 30) for cue in scene['cues']]
            require(frames[1] - frames[0] >= 150, 'Gooey choreography needs 150 frames between start and settle cues')
        if scene['kind'] == 'backdrop' and scene['content']['style'] in WEBGL_BACKDROP_STYLES:
            a, b = [number(captions[cue]['start']) for cue in scene['cues']]
            frames = [ceil((value + BEAT_DELAY) * 30) for value in (a, b)]
            require(Decimal(str(b)) - Decimal(str(a)) >= 2 and frames[1] - frames[0] >= 60,
                    'Halftone start and settle cues need two seconds and 60 frames between them')
        last = -1
        if scene['kind'] == 'lettering':
            anchors = [number(captions[cue]['start']) + BEAT_DELAY for cue in scene['cues']]
            require(anchors[1] - anchors[0] >= 3.3 and anchors[1] + 3.3 <= end - .4 + 1e-6,
                    'Lettering needs 3.3 seconds for each complete draw before the next cue or transition')
        for cue in scene['cues']:
            onset = number(captions[cue]['start'])
            require(start <= onset and onset + BEAT_DELAY + BEAT_SECONDS <= end - .4 + 1e-6,
                    'Visual beat does not fit before its scene transition')
            require(last < 0 or onset - last >= BEAT_SECONDS, 'Visual beats overlap')
            last = onset
    return bounds


def scene_html(scene, index, start, end):
    return (f'<section class="scene production-scene" data-start="{start}" data-end="{end}" '
            f'data-name="{html.escape(scene["name"], quote=True)}" data-production-index="{index}">'
            '<div class="production-stage"></div></section>')


def scripts(data, brand):
    icons = {name: 'data:image/svg+xml;base64,' + base64.b64encode(
        kit.symbol_svg('icon:' + name, brand['colors']['accent'])).decode()
        for scene in data['scenes'] for item in scene['content'].get('items', scene['content'].get('sections', scene['content'].get('steps', scene['content'].get('features', scene['content'].get('layers', scene['content'].get('badges', []))))))
        if isinstance(item, dict) and 'icon' in item for name in [item['icon']]}
    for scene in data['scenes']:
        c = scene['content']
        if scene['kind'] != 'spatial-stage' or c['style'] not in ('phone-glass', 'desktop-glass'):
            continue
        names = ([item['icon'] for item in c['notifications']] if c['style'] == 'phone-glass' else
                 [c['notification']['icon'], *[item['icon'] for item in c['desktop']['window']['sidebar']], *c['desktop']['dock']])
        for name in names:
            icons[name] = 'data:image/svg+xml;base64,' + base64.b64encode(kit.symbol_svg('icon:' + name, brand['colors']['accent'])).decode()
    profile = data.get('format', 'landscape')
    payload = {'profile': output_profile(profile), 'geometry': editorial.geometry(data['scenes'], profile),
               'scenes': data['scenes'], 'icons': icons, 'assets': {
        name: 'assets/still-' + name + Path(record['path']).suffix.lower() for name, record in data['assets'].items()}}
    safe = json.dumps(payload, ensure_ascii=True).replace('<', '\\u003c')
    texture_script = '<script src="assets/production-shader-images.js"></script>' if shader_images(data) | raster_images(data) or logo_texture_required(data) else ''
    backdrop_styles = {scene['content']['style'] for scene in data['scenes'] if scene['kind'] == 'backdrop'}
    gpu = bool(backdrop_styles.intersection(GPU_BACKDROP_STYLES))
    three = bool(backdrop_styles.intersection(THREE_BACKDROP_STYLES))
    spatial_code = any(scene['kind'] == 'code-story' and scene['content']['style'] in SPATIAL_CODE_STYLES for scene in data['scenes'])
    spatial_objects = any(scene['kind'] == 'spatial-stage' for scene in data['scenes'])
    source_styles = {scene['content']['style'] for scene in data['scenes'] if scene['kind'] == 'source-stage'}
    liquid_panels = any(scene['kind'] == 'interface' and scene['content'].get('variant') == 'liquid-panels' for scene in data['scenes'])
    portal_panels = any(scene['kind'] == 'interface' and scene['content'].get('variant') == 'portal-panels' for scene in data['scenes'])
    shatter_panels = any(scene['kind'] == 'interface' and scene['content'].get('variant') == 'shatter-panels' for scene in data['scenes'])
    glass_parallax = any(scene['kind'] == 'interface' and scene['content'].get('variant') == 'glass-parallax' for scene in data['scenes'])
    canvas = bool(backdrop_styles.intersection(CANVAS_BACKDROP_STYLES))
    vector = bool(backdrop_styles.intersection(VECTOR_BACKDROP_STYLES))
    webgl = bool(backdrop_styles.intersection(WEBGL_BACKDROP_STYLES))
    gpu_scripts = '<script src="assets/production-gpu-backdrops.js"></script>' if gpu or three or canvas or spatial_objects or vector or webgl else ''
    if any(scene['kind'] == 'editorial' for scene in data['scenes']):
        gpu_scripts += '<link rel="stylesheet" href="assets/production-editorial.css"><script src="assets/production-editorial.js"></script>'
    if cinema.selected(data['scenes']):
        gpu_scripts += '<link rel="stylesheet" href="assets/production-cinema.css"><script src="assets/production-cinema-shots.js"></script><script src="assets/production-cinema.js"></script>'
    if any(scene['kind'] == 'variable-type' for scene in data['scenes']):
        gpu_scripts += ('<link rel="stylesheet" href="assets/production-variable-type.css">'
                        '<script src="assets/production-variable-font.js"></script>'
                        '<script src="assets/production-variable-type.js"></script>')
    if any(scene['kind'] == 'lettering' for scene in data['scenes']):
        gpu_scripts += ('<link rel="stylesheet" href="assets/production-lettering.css">'
                        '<script src="assets/production-caveat-pen.js"></script>'
                        '<script src="assets/production-lettering-source.js"></script>'
                        '<script src="assets/production-lettering.js"></script>')
    if webgl:
        gpu_scripts += ('<script src="assets/production-halftone-shader.js"></script>'
                        '<script src="assets/production-halftone.js"></script>')
    if vector:
        gpu_scripts += '<script src="assets/production-gooey-split.js"></script>'
    if any(style.startswith('scope-') or style in ('three-cosmic-orb', 'three-rack-focus') for style in backdrop_styles):
        gpu_scripts += '<script src="assets/production-optical-fields.js"></script>'
    if backdrop_styles.intersection(('three-cosmic-orb', 'three-rack-focus')):
        gpu_scripts += '<script src="assets/production-optical-shaders.js"></script>'
    if canvas:
        gpu_scripts += '<script src="assets/production-organic-fields.js"></script>'
        gpu_scripts += '<script src="assets/production-canvas-backdrops.js"></script>'
    if gpu:
        gpu_scripts += '<script src="assets/production-gpu-runtime.js"></script>'
    if three or spatial_code or spatial_objects or liquid_panels or portal_panels or shatter_panels or glass_parallax or source_styles:
        gpu_scripts += '<script src="assets/production-three-runtime.js"></script>'
    if source_styles:
        gpu_scripts += ('<link rel="stylesheet" href="assets/production-source-stages.css">'
                        '<script src="assets/production-source-fonts.js"></script>')
        if 'glass-shard' in source_styles:
            gpu_scripts += '<script src="assets/production-source-matcap.js"></script><script src="assets/production-source-hdr.js"></script>'
        if 'frost-orbit' in source_styles:
            gpu_scripts += ('<script src="assets/production-source-ice.js"></script><script src="assets/production-source-atlas.js"></script>'
                            '<script src="assets/production-source-noise.js"></script><script src="assets/production-source-templates.js"></script>')
            if not any(scene['kind'] == 'spatial-stage' and scene['content']['style'] == 'extruded-logo' for scene in data['scenes']):
                gpu_scripts += '<script src="assets/production-font-outlines.js"></script>'
        gpu_scripts += '<script src="assets/production-source-stages.js"></script>'
    if glass_parallax:
        gpu_scripts += ('<script src="assets/production-three-postprocess.js"></script>'
                        '<script src="assets/production-glass-parallax-motion.js"></script>'
                        '<script src="assets/production-glass-parallax.js"></script>')
    if shatter_panels:
        gpu_scripts += ('<script src="assets/production-shatter-shader.js"></script>'
                        '<script src="assets/production-shatter-motion.js"></script>'
                        '<script src="assets/production-shatter-panels.js"></script>')
    if portal_panels:
        gpu_scripts += '<script src="assets/production-portal-panels-shader.js"></script><script src="assets/production-portal-panels.js"></script>'
    if liquid_panels:
        gpu_scripts += '<script src="assets/production-liquid-panels-shader.js"></script><script src="assets/production-liquid-panels.js"></script>'
    if any(scene['kind'] == 'media-grid' and scene['content'].get('treatment') == 'grade-split' for scene in data['scenes']):
        gpu_scripts += '<script src="assets/production-grade-split-shader.js"></script><script src="assets/production-grade-split.js"></script>'
    if three:
        gpu_scripts += '<script src="assets/production-three-backdrops.js"></script>'
    if spatial_code:
        gpu_scripts += '<script src="assets/production-code-spatial.js"></script>'
    if spatial_objects:
        device_styles = {scene['content']['style'] for scene in data['scenes'] if scene['kind'] == 'spatial-stage'}
        if device_styles & {'device-review', 'phone-glass', 'desktop-glass'}:
            if device_styles & {'device-review', 'phone-glass'}:gpu_scripts += '<script src="assets/production-device-iphone-data.js"></script>'
            if device_styles & {'device-review', 'desktop-glass'}:gpu_scripts += '<script src="assets/production-device-macbook-data.js"></script>'
            gpu_scripts += '<script src="assets/production-device-models.js"></script>'
            if 'device-review' in device_styles:
                gpu_scripts += '<script src="assets/production-device-motion.js"></script><script src="assets/production-device-review.js"></script>'
            if device_styles & {'phone-glass', 'desktop-glass'}:
                gpu_scripts += '<script src="assets/production-device-glass-motion.js"></script><script src="assets/production-device-glass.js"></script>'
        if any(scene['kind'] == 'spatial-stage' and scene['content']['style'] == 'cuboid-carousel' for scene in data['scenes']):
            gpu_scripts += ('<script src="assets/production-cuboid-data.js"></script>'
                            '<script src="assets/production-cuboid-motion.js"></script>'
                            '<script src="assets/production-cuboid.js"></script>')
        if any(scene['kind'] == 'spatial-stage' and scene['content']['style'] in ('wireframe-portal-title', 'canopy-part-title') for scene in data['scenes']):
            gpu_scripts += '<script src="assets/production-portal-outlines.js"></script>'
        if any(scene['kind'] == 'spatial-stage' and scene['content']['style'] == 'wireframe-portal-title' for scene in data['scenes']):
            gpu_scripts += ('<script src="assets/production-wireframe-motion.js"></script>'
                            '<script src="assets/production-wireframe-shaders.js"></script>'
                            '<script src="assets/production-wireframe-portal.js"></script>')
        if any(scene['kind'] == 'spatial-stage' and scene['content']['style'] == 'extruded-logo' for scene in data['scenes']):
            gpu_scripts += '<script src="assets/production-font-outlines.js"></script>'
        if any(scene['kind'] == 'spatial-stage' and scene['content']['style'] in ('extruded-logo', 'wireframe-portal-title', 'canopy-part-title') for scene in data['scenes']):
            gpu_scripts += '<script src="assets/production-extruded-logo.js"></script>'
        if any(scene['kind'] == 'spatial-stage' and scene['content']['style'] == 'canopy-part-title' for scene in data['scenes']):
            gpu_scripts += ('<script src="assets/production-canopy-motion.js"></script>'
                            '<script src="assets/production-canopy-bokeh.js"></script>'
                            '<script src="assets/production-canopy.js"></script>')
        if any(scene['kind'] == 'spatial-stage' and scene['content']['style'] == 'orbit-card' for scene in data['scenes']):
            gpu_scripts += '<script src="assets/production-orbit-card.js"></script>'
        gpu_scripts += '<script src="assets/production-spatial-objects.js"></script>'
    if any(scene['kind'] == 'headline' and scene['content']['swap'] == 'slice-sweep' for scene in data['scenes']):
        gpu_scripts += ('<script src="assets/production-slice-surface.js"></script>'
                        '<script src="assets/production-slice-sweep.js"></script>')
    if any(scene['kind'] == 'screen' and scene['content'].get('lens') == 'filmed' for scene in data['scenes']):
        gpu_scripts += ('<script src="assets/production-filmed-screen-shader.js"></script>'
                        '<script src="assets/production-filmed-screen.js"></script>')
    if any(scene['kind'] == 'map-story' and scene['content']['style'] == 'flight' for scene in data['scenes']):
        gpu_scripts += '<script src="assets/production-map-flight.js"></script>'
    if any(scene['kind'] == 'map-story' and scene['content']['style'] == 'world' for scene in data['scenes']):
        gpu_scripts += ('<script src="assets/production-world-geometry.js"></script>'
                        '<script src="assets/production-world-map.js"></script>')
    if any(scene['kind'] == 'map-story' and scene['content']['style'] in ('spain', 'us') for scene in data['scenes']):
        gpu_scripts += ('<script src="assets/production-regional-geometry.js"></script>'
                        '<script src="assets/production-regional-map.js"></script>')
    if any(scene['kind'] == 'map-story' and scene['content']['style'] == 'spotlight' for scene in data['scenes']):
        gpu_scripts += '<script src="assets/production-map-spotlight.js"></script>'
    if any(scene['kind'] == 'cta' and scene['content'].get('style') == 'character-walk' for scene in data['scenes']):
        gpu_scripts += '<script src="assets/production-character-data.js"></script><script src="assets/production-character-walk.js"></script>'
    if any(scene['kind'] == 'cta' and scene['content'].get('style') == 'creator-intro' for scene in data['scenes']):
        gpu_scripts += '<script src="assets/production-creator-intro.js"></script>'
    if logo_texture_required(data):
        gpu_scripts += '<script src="assets/production-cursor-rays-shader.js"></script><script src="assets/production-cursor-rays.js"></script>'
    if any(scene['kind'] == 'interface' and scene['content'].get('variant') == 'app-install' for scene in data['scenes']):
        gpu_scripts += '<script src="assets/production-app-install.js"></script>'
    if any(scene['kind'] == 'interface' and scene['content'].get('variant') == 'product-canvas' for scene in data['scenes']):
        gpu_scripts += '<script src="assets/production-product-canvas.js"></script>'
    if any(scene['kind'] == 'interface' and scene['content'].get('variant') == 'ui-3d-reveal' for scene in data['scenes']):
        gpu_scripts += '<script src="assets/production-ui-reveal.js"></script>'
    if any((scene['kind'] == 'title' and scene['content'].get('layout') in PROMO_TITLE_LAYOUTS) or
           (scene['kind'] == 'kinetic' and scene['content'].get('style') == 'glyph-build') for scene in data['scenes']):
        gpu_scripts += '<script src="assets/production-promo-type.js"></script>'
    if any(scene['kind'] == 'interface' and scene['content'].get('variant') in LIQUID_GLASS_VARIANTS for scene in data['scenes']):
        gpu_scripts += ('<script src="assets/production-liquid-glass-runtime.js"></script>'
                        '<script src="assets/production-liquid-glass.js"></script>')
    return (f'<script type="application/json" id="production-scene-data">{safe}</script>' + texture_script + gpu_scripts +
            '<script src="assets/visual-cinema.js"></script><script src="assets/visual-story.js"></script>'
            '<script src="assets/production-evidence.js"></script>'
            '<script src="assets/production-transitions.js"></script>'
            '<script src="assets/production-swap-catalog.js"></script>'
            '<script src="assets/production-beat-freeze.js"></script>'
            '<script src="assets/production-motion.js"></script>'
            '<script src="assets/production-backdrops.js"></script>'
            '<script src="assets/production-interface-presets.js"></script>'
            '<script src="assets/production-interface-motion.js"></script>'
            '<script src="assets/production-interface-social.js"></script>'
            '<script src="assets/production-ui-primitives.js"></script>'
            '<script src="assets/production-editor-scenes.js"></script>'
            '<script src="assets/production-cursor-scenes.js"></script>'
            '<script src="assets/production-answer-rank.js"></script>'
            '<script src="assets/production-note-scroll.js"></script>'
            '<script src="assets/production-chat-exchange.js"></script>'
            '<script src="assets/production-kinetic-camera.js"></script>'
            '<script src="assets/production-kinetic-presets.js"></script>'
            '<script src="assets/production-interface.js"></script>'
            '<script src="assets/production-network-layouts.js"></script>'
            '<script src="assets/production-data.js"></script>'
            '<script src="assets/production-annotation-ink.js"></script>'
            '<script src="assets/production-annotations.js"></script>'
            '<script src="assets/production-image-inspection.js"></script>'
            '<script src="assets/production-title-designs.js"></script>'
            '<script src="assets/production-pointer-styles.js"></script>'
            '<script src="assets/production-interactions.js"></script>'
            '<script src="assets/production-carousel-rig.js"></script>'
            '<script src="assets/production-carousel-presets.js"></script>'
            '<script src="assets/production-carousels.js"></script>'
            '<script src="assets/production-code.js"></script>'
            '<script src="assets/production-maps.js"></script>'
            '<script src="assets/production-chart-extras.js"></script>'
            '<script src="assets/production-stat-cards.js"></script>'
            '<script src="assets/production-shader-sources.js"></script>'
            '<script src="assets/production-shaders.js"></script>'
            '<script src="assets/production-type-advanced.js"></script>'
            '<script src="assets/production-colorama.js"></script>'
            '<script src="assets/production-type.js"></script>'
            '<script src="assets/production-headline-panels.js"></script>'
            '<script src="assets/production-headlines.js"></script>'
            '<script src="assets/production-media-camera.js"></script>'
            '<script src="assets/production-hand-layouts.js"></script>'
            '<script src="assets/production-closings.js"></script>'
            '<script src="assets/production-media-surfaces.js"></script>'
            '<script src="assets/production-media-raster.js"></script>'
            '<script src="assets/production-media-spatial.js"></script>'
            '<script src="assets/production-media-presentations.js"></script>'
            '<script src="assets/production-brand-lockups.js"></script>'
            '<script src="assets/production-news-ticker.js"></script>'
            '<script src="assets/production-paper-transitions.js"></script>'
            '<script src="assets/production-screen-cuts.js"></script>'
            '<script src="assets/production-media.js"></script>'
            '<script src="assets/production-path-motion.js"></script>'
            '<script src="assets/production-resources.js"></script><script src="assets/production-scenes.js"></script>')


def shader_images(data):
    return {name for scene in data['scenes'] if scene['kind'] == 'screen' and
            (scene['content'].get('swap', '').startswith('shader-') or scene['content'].get('lens') == 'filmed')
            for name in scene['content']['images']}


def raster_images(data):
    return {item['image'] for scene in data['scenes'] if scene['kind'] == 'media-grid' and
            (scene['content'].get('surface', {}).get('style') in MEDIA_RASTER_SURFACES or
             scene['content'].get('treatment') == 'grade-split')
            for item in scene['content']['items']} | {
                scene['content']['texture'] for scene in data['scenes'] if scene['kind'] == 'title' and
                scene['content'].get('reveal') == 'texture-read'} | {
           name for scene in data['scenes'] if scene['kind'] == 'interface' and
           scene['content'].get('variant') in ('liquid-panels', 'portal-panels', 'shatter-panels') for name in scene['content']['images']} | {
               scene['content']['image'] for scene in data['scenes'] if scene['kind'] == 'interface' and
               scene['content'].get('variant') == 'glass-parallax'} | {
                   scene['content'][field] for scene in data['scenes'] if scene['kind'] == 'spatial-stage' and
                   scene['content']['style'] == 'canopy-part-title' for field in ('surface', 'normal')} | {
                   scene['content'][field] for scene in data['scenes'] if scene['kind'] == 'spatial-stage' and
                   scene['content']['style'] == 'device-review' for field in ('phone', 'laptop')} | {
                   scene['content']['image'] for scene in data['scenes'] if scene['kind'] == 'spatial-stage' and
                   scene['content']['style'] in ('phone-glass', 'desktop-glass')}


def logo_texture_required(data):
    return any(scene['kind'] == 'cta' and scene['content'].get('style') == 'cursor-rays' for scene in data['scenes'])


def approved_logo_texture(output, brand_root, template_hash):
    import branding
    require(isinstance(brand_root, Path) and isinstance(template_hash, str), 'Approved brand workspace and template hash required for logo rays')
    branding.verified(brand_root, template_hash)
    approval = read_json(inside(brand_root, 'brand/approval.json'))
    expected = approval['files'].get('assets/logo.png')
    logo = inside(output, 'assets/logo.png')
    require(0 < logo.stat().st_size <= 20_000_000, 'Approved logo texture exceeds size limit')
    content = logo.read_bytes()
    require(hashlib.sha256(content).hexdigest() == expected, 'Copied logo differs from approved brand')
    with Image.open(io.BytesIO(content)) as image:
        require(image.format == 'PNG' and all(0 < n <= 4096 for n in image.size), 'Approved logo needs a bounded PNG texture')
        image.verify()
    return 'data:image/png;base64,' + base64.b64encode(content).decode('ascii')


def install_assets(output, data, base, *, brand_root=None, template_hash=None, runtime_paths=None):
    font_motion.install(output, data['scenes'], brand_root, template_hash)
    lettering.install(output, data['scenes'], brand_root, template_hash)
    source_styles = {scene['content']['style'] for scene in data['scenes'] if scene['kind'] == 'source-stage'}
    if source_styles:
        import branding
        require(isinstance(brand_root, Path) and isinstance(template_hash, str), 'Source stages require an approved brand')
        branding.verified(brand_root, template_hash)
        approval = read_json(inside(brand_root, 'brand/approval.json'))
        fonts = branding.fonts_in(brand_root / 'brand/assets')
        packet = {}
        for role in ('display', 'body'):
            copied = inside(output, 'assets/' + fonts[role].name)
            expected = approval['files'].get('assets/' + fonts[role].name)
            require(0 < copied.stat().st_size <= 20_000_000 and digest(copied) == expected, 'Source stage font differs from approved brand')
            if role == 'display' and 'frost-orbit' in source_styles:
                require(copied.suffix.lower() in ('.ttf', '.otf'), 'Frost requires an approved TTF or OTF display font')
            packet[role] = 'data:application/octet-stream;base64,' + base64.b64encode(copied.read_bytes()).decode('ascii')
            packet[role + '_sha256'] = expected
        target = inside(output, 'assets/production-source-fonts.js', exists=False)
        with target.open('x', encoding='utf-8') as stream:
            stream.write('window.ShortCreatorSourceFonts=Object.freeze(' + json.dumps(packet) + ');\n')
    portal_copy = [scene['content'][field] for scene in data['scenes']
                   if scene['kind'] == 'spatial-stage' and scene['content']['style'] == 'wireframe-portal-title'
                   for field in ('word', 'phrase', 'heading', 'caption')]
    portal_copy += [scene['content'][field] for scene in data['scenes']
                    if scene['kind'] == 'spatial-stage' and scene['content']['style'] == 'canopy-part-title'
                    for field in ('heading', 'caption')]
    if portal_copy:
        from font_outlines import install
        install(output, portal_copy, brand_root, template_hash, runtime_paths, nonzero=True)
    words = [scene['content']['word'] for scene in data['scenes']
             if scene['kind'] == 'spatial-stage' and scene['content']['style'] == 'extruded-logo']
    words += [scene['content']['word'] for scene in data['scenes']
              if scene['kind'] == 'source-stage' and scene['content']['style'] == 'frost-orbit']
    if words:
        from font_outlines import install
        install(output, words, brand_root, template_hash, runtime_paths)
    textures = {}
    if logo_texture_required(data):
        target = inside(output, 'assets/production-shader-images.js', exists=False)
        require(not target.exists(), 'Visual texture bundle already exists')
        textures['assets/logo.png'] = approved_logo_texture(output, brand_root, template_hash)
    texture_names = shader_images(data) | raster_images(data)
    for name, file in validate_assets(data['assets'], base).items():
        target = output / 'assets' / ('still-' + name + file.suffix.lower())
        require(not target.exists(), 'Visual asset output already exists')
        shutil.copyfile(file, target)
        require(digest(target) == data['assets'][name]['sha256'], 'Visual asset changed while copying')
        if name in texture_names:
            # Local file origins cannot enter readable canvas textures. Encode only verified
            # still bytes, without weakening Chrome origins or starting a server.
            mime = 'image/png' if file.suffix.lower() == '.png' else 'image/jpeg'
            textures['assets/' + target.name] = 'data:' + mime + ';base64,' + base64.b64encode(target.read_bytes()).decode('ascii')
    if textures:
        with (output / 'assets/production-shader-images.js').open('x', encoding='utf-8') as stream:
            stream.write('window.ShortCreatorShaderImages=Object.freeze(' + json.dumps(textures) + ');\n')
    provenance = Path(__file__).resolve().parent / 'docs/hyperframes-production-provenance.json'
    shutil.copyfile(provenance, output / 'production-provenance.json')
    license_file = provenance.parent / 'licenses/hyperframes-apache-2.0.txt'
    shutil.copyfile(license_file, output / 'hyperframes-apache-2.0.txt')


def new_episode(root, episode_id, inputs, storyboard, profile='landscape'):
    import branding
    import workflow
    from media_contract import duration_seconds, output_profile
    require(profile in COMPOSITION_FORMATS, 'Explicit composition profile required')
    spec = output_profile(profile)
    brand = branding.verified(root, workflow.verify_lock())
    keys(inputs, ('audio', 'graphic', 'transcript', 'captions'), 'episode inputs')
    target = inside(root, 'episodes/' + identifier(episode_id), exists=False)
    require(not target.exists(), 'Episode exists; use a new ID')
    board_path = inside(root, storyboard)
    board = read_json(board_path)
    keys(board, ('version', 'scenes', 'assets', 'thumbnail', 'youtube'), 'storyboard')
    require(type(board['version']) is int and board['version'] == 1, 'Unsupported storyboard')
    sources = {name: inside(root, path) for name, path in inputs.items()}
    captions, transcript = read_json(sources['captions']), read_json(sources['transcript'])
    duration = duration_seconds(captions['duration'], profile)
    require(transcript.get('audio_sha256') == digest(sources['audio']), 'Transcript does not match audio')
    workflow.validate_captions(captions, transcript, duration, {}, profile=profile)
    assets = validate_assets(board['assets'], board_path.parent)
    editorial.validate_profile(board['scenes'], profile)
    validate_scenes(board['scenes'], assets, captions['cues'], duration)
    for name, file in sources.items():
        maximum = spec['max_audio_bytes'] if name == 'audio' else 30_000_000
        require(0 < file.stat().st_size <= maximum, 'Input exceeds the profile size budget')
    require(sources['audio'].suffix.lower() in ('.wav', '.mp3', '.m4a', '.opus'), 'Unsupported audio file')
    with Image.open(sources['graphic']) as image:
        require(image.format in ('PNG', 'JPEG') and max(image.size) <= 4096 and
                abs(image.width / image.height - spec['width'] / spec['height']) < .01, 'Graphic must match the selected output aspect ratio')
        image.verify()
    keys(board['thumbnail'], ('headline', 'label'), 'thumbnail')
    branding.thumbnail(root, sources['graphic'], **board['thumbnail'], profile=profile)
    workflow.validate_metadata(board['youtube'])
    data = {'version': 3, 'format': profile, 'id': episode_id, 'template': 'v1',
            'language': brand['language'], 'duration': duration, 'inputs': {},
            'thumbnail': copy.deepcopy(board['thumbnail']), 'youtube': copy.deepcopy(board['youtube']),
            'scenes': copy.deepcopy(board['scenes']), 'assets': {}, 'timing_adjustments': {}}
    target.mkdir()
    for role, source in sources.items():
        filename = role + source.suffix.lower()
        before = digest(source)
        with source.open('rb') as reader, (target / filename).open('xb') as writer:
            shutil.copyfileobj(reader, writer)
        require(digest(target / filename) == before == digest(source), 'Input changed during episode creation')
        data['inputs'][role] = {'path': filename, 'sha256': before}
    for name, source in assets.items():
        filename = 'still-' + name + source.suffix.lower()
        with source.open('rb') as reader, (target / filename).open('xb') as writer:
            shutil.copyfileobj(reader, writer)
        require(digest(target / filename) == board['assets'][name]['sha256'] == digest(source), 'Still changed while copying')
        data['assets'][name] = {'path': filename, 'sha256': digest(source)}
    write_json(target / 'episode.json', data)
    return target / 'episode.json'
