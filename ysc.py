#!/usr/bin/env python3
"""YouTubeShortCreator: brand once, validate every episode, publish manually."""
import argparse
import copy
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

import branding
import diversity
import runtime
import workflow
from safety import digest, identifier, inside, read_json, require, write_json
from media_contract import COMPOSITION_FORMATS, output_profile

HOME = Path(__file__).resolve().parent


def ask(label, default=''):
    return input(f'{label}' + (f' [{default}]' if default else '') + ': ').strip() or default


def onboarding(root, approved=False):
    require(not root.exists(), 'Workspace exists. Use --workspace with a new name for another channel or brand version.')
    print('YouTubeShortCreator / Brand setup\nNo uploads, model calls, or software installation will occur.')
    name = ask('Channel name')
    language = ask('Narration language', 'en-US')
    audience = ask('Audience', 'Developers and AI builders')
    tone = ask('Editorial tone', 'Clear, practical, technically accurate')
    count = int(ask('Scenes per Short: 3 or 4', '3'))
    palette = ask('Palette preset (run: python3 ysc.py palettes) or custom', 'violet')
    require(palette in (*branding.PALETTES, 'custom'), 'Unknown palette')
    colors = dict(branding.PALETTES.get(palette, branding.PALETTES['violet']))
    if palette == 'custom':
        colors = {role: ask(f'{role} hex color', value) for role, value in colors.items()}
    logo = ask('Existing PNG/JPG logo path (leave blank to create one)')
    style = 'provided' if logo else ask('Generated logo: wordmark or monogram', 'wordmark')
    fonts = {role: ask(f'{role.title()} font path (.ttf/.otf/.woff2) or font:ID (list: python3 ysc.py fonts)', branding.font_path(role)) for role in ('display', 'body', 'mono')}
    brand = {'version': 1, 'channel': name, 'language': language, 'audience': audience, 'tone': tone,
             'scene_count': count, 'colors': colors, 'logo_style': style}
    branding.validate_brand(brand)
    print(json.dumps(brand, indent=2))
    require(approved or ask('Type CREATE to create this private workspace') == 'CREATE', 'Cancelled; no files written')
    result = branding.create(root, brand, fonts, logo or None)
    print(f'Brand preview: {result}\nReview the image, then run brand-approve --approve-write. No brand has been approved yet.')
    return result


def import_file(root, source, name, profile='shorts'):
    require(re.fullmatch(r'[a-z0-9][a-z0-9._-]{0,79}', name), 'Use a simple lowercase intake filename')
    maximum = output_profile(profile)['max_audio_bytes'] if Path(source).suffix.lower() in ('.mp3', '.wav', '.m4a', '.opus') else 30_000_000
    source = branding.external_file(source, ('.mp3', '.wav', '.m4a', '.opus', '.png', '.jpg', '.jpeg', '.json'), maximum)
    require(Path(name).suffix.lower() == source.suffix.lower(), 'Keep the source extension')
    dest = inside(root, 'intake/' + name, exists=False)
    require(dest.parent.is_dir(), 'Initialize a workspace first')
    before = digest(source)
    with source.open('rb') as reader, dest.open('xb') as writer:
        shutil.copyfileobj(reader, writer)
    require(digest(dest) == before and digest(source) == before, 'Input changed during import')
    return dest


def new_episode(root, episode_id, audio, transcript, graphic, captions, batch=None, layouts=None,
                output_format='shorts', storyboard=None):
    output_profile(output_format)
    if output_format in COMPOSITION_FORMATS:
        require(storyboard and not batch and not layouts, 'Composition formats need --storyboard; --batch/--layouts apply to legacy Shorts')
        import production_visuals
        return production_visuals.new_episode(root, episode_id,
            {'audio': audio, 'transcript': transcript, 'graphic': graphic, 'captions': captions}, storyboard, profile=output_format)
    require(storyboard is None, '--storyboard requires a composition format')
    brand = branding.verified(root, workflow.verify_lock())
    target = inside(root, 'episodes/' + identifier(episode_id), exists=False)
    require(not target.exists(), 'Episode exists; use a new ID')
    sources = {name: inside(root, value) for name, value in {'audio': audio, 'transcript': transcript, 'graphic': graphic, 'captions': captions}.items()}
    transcript_data = read_json(sources['transcript'])
    caption_data = read_json(sources['captions'])
    require(transcript_data.get('audio_sha256') == digest(sources['audio']), 'Transcript does not match this audio recording')
    duration = caption_data['duration']
    workflow.validate_captions(caption_data, transcript_data, duration, {})
    count = brand['scene_count']
    require(len(caption_data['cues']) >= count, 'Not enough timed caption cues for the selected scene count')
    # Layouts rotate through the batch's unused families; without a batch every draft starts the same way.
    earlier = diversity.history(root, batch) if batch else []
    if layouts:
        layouts = [identifier(name) for name in layouts.split(',')]
        require(len(layouts) == count and all(name in diversity.FAMILY_OF for name in layouts), f'Provide {count} production layouts (run: python3 ysc.py layouts)')
    else:
        layouts = diversity.pick_layouts(count, earlier)
    anchors = [i * len(caption_data['cues']) // count for i in range(count)]
    starts = [0] + [caption_data['cues'][i]['start'] for i in anchors[1:]]
    ends = starts[1:] + [duration]
    scenes = []
    for layout, cue, start, end in zip(layouts, anchors, starts, ends):
        require(end - start >= 2, 'Each scene needs at least two seconds; revise the cue anchors')
        sample = copy.deepcopy(read_json(workflow.TEMPLATE / 'scenes' / (layout + '.json'))['example'])
        maximum = max((value if kind == 'enter' else value[1] if kind == 'active' else sum(value)) for values in sample['motion'].values() for kind, value in values.items())
        factor = (end - start) * .8 / max(maximum, 1)
        for values in sample['motion'].values():
            for kind, value in values.items():
                values[kind] = round(value * factor, 6) if isinstance(value, (float, int)) else [round(v * factor, 6) for v in value]
        scenes.append({'layout': layout, 'name': layout, 'first_cue': cue, **sample})
    target.mkdir()
    inputs = {}
    for role, source in sources.items():
        name = role + source.suffix.lower()
        shutil.copyfile(source, target / name)
        inputs[role] = {'path': name, 'sha256': digest(target / name)}
    hashtags = ['#ai', '#programming', '#technology', '#coding', '#shorts']
    data = {'version': 1, 'id': episode_id, 'template': 'v1', 'language': brand['language'], 'duration': duration,
            'inputs': inputs, 'thumbnail': {'headline': ['AI AGENTS', 'EXPLAINED'], 'label': 'TOOLS NEED BOUNDARIES'},
            'youtube': {'title': 'DRAFT: Replace with your episode title',
                        'description': 'DRAFT: Replace the example copy with content that matches the recording.\n\n' + ' '.join(hashtags),
                        'hashtags': hashtags, 'tags': ['ai', 'programming', 'technology'],
                        'pinned_comment': 'DRAFT: Add a relevant question for viewers.'},
            'scenes': scenes, 'timing_adjustments': {}}
    write_json(target / 'episode.json', data)
    if batch:
        write_json(target / 'batch.json', {'batch': batch, 'episode': episode_id, 'sequence': len(earlier) + 1, 'picked_layouts': layouts})
    (target / 'REVIEW.txt').write_text('DRAFT ONLY. Replace example scene content, thumbnail copy and YouTube data.\nListen to the recording and review caption words/timestamps before rendering.\nAutomatic checks do not verify factual correctness or editorial quality.\n', encoding='utf-8')
    return target / 'episode.json'


def parser():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--workspace', type=Path, default=HOME / 'workspace', help='Private channel workspace (default: ./workspace beside ysc.py)')
    sub = cli.add_subparsers(dest='command')
    sub.add_parser('init').add_argument('--approve-write', action='store_true', help='Skip CREATE confirmation, not the branding questions')
    for name in ('brand-approve', 'configure'):
        command = sub.add_parser(name)
        command.add_argument('--approve-write', action='store_true')
        if name == 'configure':
            command.add_argument('--backend', choices=('native', 'ffmpeg'), default='native')
            for key in ('node', 'playwright', 'chrome', 'swift', 'ffmpeg', 'ffprobe'):
                command.add_argument('--' + key)
    sub.add_parser('doctor')
    sub.add_parser('layouts')
    sub.add_parser('compositions', help='List reusable composition contracts and output formats')
    sub.add_parser('palettes')
    sub.add_parser('fonts', help='List pinned local fonts for new-brand onboarding')
    sub.add_parser('batch').add_argument('name', help='Batch name given to new --batch')
    command = sub.add_parser('import')
    command.add_argument('source')
    command.add_argument('--name', required=True)
    command.add_argument('--format', choices=('shorts',) + COMPOSITION_FORMATS, default='shorts')
    command.add_argument('--approve-write', action='store_true')
    for name, source in [('transcribe', 'audio'), ('caption-draft', 'transcript')]:
        command = sub.add_parser(name)
        command.add_argument(source)
        command.add_argument('output')
        command.add_argument('--approve-write', action='store_true')
        if name == 'caption-draft':
            command.add_argument('--format', choices=('shorts',) + COMPOSITION_FORMATS, default='shorts')
    command = sub.add_parser('new')
    command.add_argument('id')
    for value in ('audio', 'transcript', 'graphic', 'captions'):
        command.add_argument('--' + value, required=True)
    command.add_argument('--batch', help='Batch name; layouts avoid the families this batch already used')
    command.add_argument('--layouts', help='Comma-separated layouts, one per scene, instead of the picker')
    command.add_argument('--format', choices=('shorts',) + COMPOSITION_FORMATS, default='shorts')
    command.add_argument('--storyboard', help='Workspace-relative closed production storyboard JSON')
    command.add_argument('--approve-write', action='store_true')
    for name in ('validate', 'build', 'render'):
        command = sub.add_parser(name)
        command.add_argument('episode', help='Workspace-relative episode JSON')
        if name != 'validate':
            command.add_argument('--run-id', required=True)
            command.add_argument('--approve-write', action='store_true')
    return cli


def main(argv=None):
    args = parser().parse_args(argv)
    root = args.workspace.expanduser().resolve()
    workflow.ROOT, workflow.RUNS = root, root / 'runs'
    try:
        if args.command is None:
            if not root.exists():
                onboarding(root)
            else:
                print('Workspace exists. Commands: doctor, layouts, palettes, batch, import, transcribe, caption-draft, new, validate, build, render.\nUse --help or COMMAND --help for arguments. For another brand, start with --workspace PATH init.')
            return 0
        if args.command == 'init':
            onboarding(root, args.approve_write)
            return 0
        if args.command == 'layouts':
            print('\n'.join(path.stem for path in sorted(workflow.TEMPLATE.joinpath('scenes').glob('*.json'))))
            return 0
        if args.command == 'compositions':
            import production_visuals
            print(json.dumps({'profile': output_profile('landscape'), 'backend': 'ffmpeg',
                'profiles': [output_profile(name) for name in COMPOSITION_FORMATS],
                'episode_version': 3, 'maximum_scenes': production_visuals.MAX_SCENES,
                'compositions': list(production_visuals.KINDS),
                'editorial': {'designs': list(production_visuals.editorial.DESIGNS), 'layouts': list(production_visuals.editorial.LAYOUTS), 'format': 'landscape', 'visual_beats': 2, 'human_review': 'required'},
                'cinema': {'layouts': list(production_visuals.cinema.LAYOUTS), 'format': 'landscape', 'visual_beats': 2,
                           'photographic': {'formats': list(production_visuals.cinema.PHOTOGRAPHIC_FORMATS), 'shots': [2, 24], 'visual_beats': 'one per shot'},
                           'human_review': 'required'},
                'variable_type': {'styles': list(production_visuals.font_motion.STYLES), 'visual_beats': 2,
                    'font': 'Approved variable display font; weight-wave also requires a slant axis'},
                'lettering': {'styles': list(production_visuals.lettering.STYLES), 'visual_beats': 2,
                    'draw_seconds': 3.3, 'write_on_font': 'Approved local Caveat variable display face'},
                'chart_kinds': list(production_visuals.CHART_KINDS),
                'metric_styles': list(production_visuals.METRIC_STYLES),
                'metric_inputs': {'count-burst': 'Two cues: supplied value count, then a finite decorative burst',
                    'stat_cards': {'styles': list(production_visuals.STAT_CARD_STYLES),
                        'contract': 'One cue, exact supplied value and unit; fixed brand type, no sample statistics'}},
                'source_stages': {'styles': production_visuals.SOURCE_STAGE_DURATIONS,
                    'contract': 'Two cues preserve source duration; approved local fonts and exact supplied copy; Frost also needs a 1-8 character word and WebGPU'},
                'spatial_objects': {'styles': list(production_visuals.SPATIAL_OBJECT_STYLES),
                                    'extruded_finishes': ['chrome', 'accent-metal', 'matte'],
                    'exploded_stack': 'Four explicit label/icon layers and four cues; optional fifth cue closes the stack',
                    'product_turntable': 'Verified label image on a fixed can mockup; two cues at least six seconds apart',
                    'extruded_logo': '1-8 exact Latin characters from the approved display font; three finishes, two cues at least five seconds apart',
                    'wireframe_portal': '1-18 character title to a 1-48 character phrase; approved normalized font outlines, two cues at least eight seconds apart',
                    'canopy_title': 'Two distinct titles of up to 24 Latin characters, two verified local color/normal textures; approved font outlines, two cues at least twelve seconds apart',
                    'cuboid_carousel': '1-12 cards with category, title and pills; one-based hero selection, two cues at least 150 frames apart and a full 50-frame departure',
                    'device_review': 'Two distinct verified local screen images, phone and laptop; two cues at least fifteen seconds apart, source camera and adaptive closing orbit',
                    'phone_glass': 'Verified screen, three explicit icon/title/time/body notifications; approved fonts, two cues at least fifteen seconds apart',
                    'desktop_glass': 'Verified screen, explicit menu/window/calendar/status/media/dock and notification; approved fonts, two cues at least fifteen seconds apart',
                    'orbit_card': 'Verified image on an apertured card; saved camera and one card revolution, two cues at least four seconds apart',
                    'runtime': 'Pinned local Three.js r185; no model, font, URL, camera or free shader inputs'},
                'evidence': {'source': 'illustrative or measured, label, reference, as_of',
                    'trust_styles': list(production_visuals.TRUST_STYLES),
                    'trust_marks': '3-7, one cue each', 'testimonial': 'two cues, rating 0-5',
                    'proof': 'three cues, three pinned-icon features, optional 1-4 character badges'},
                'title_reveals': list(production_visuals.TITLE_REVEALS),
                'advanced_title_inputs': {'accent_word': 'required exact whole word for neon-accent and particle-burst',
                    'texture': 'required verified local still ID for texture-read'},
                'headline_swaps': list(production_visuals.HEADLINE_SWAPS),
                'kinetic_styles': list(production_visuals.KINETIC_STYLES),
                'title_markers': list(production_visuals.MARKER_STYLES),
                'title_layouts': list(production_visuals.TITLE_LAYOUTS),
                'promo_typography': {'title_layouts': list(production_visuals.PROMO_TITLE_LAYOUTS),
                                     'title_max_characters': 32, 'subtitle_max_characters': 60,
                                     'kinetic_style': 'glyph-build', 'glyph_labels': 3,
                                     'glyph_label_max_characters': 12,
                                     'qualification': 'Pending combined browser/export qualification'},
                'title_notes': 'optional explicit marker note, up to 28 characters',
                'backdrop_styles': list(production_visuals.BACKDROP_STYLES),
                'halftone_field': {'style': 'halftone-field', 'renderer': 'local WebGL',
                    'cues': 'two anchors at least two seconds and 60 frames apart, then 24 settling frames',
                    'palette': 'approved secondary, accent and background',
                    'parameters': 'fixed source frequency, speed, cell size, gamma and bias; no shader input'},
                'gpu_backdrops': {'styles': list(production_visuals.GPU_BACKDROP_STYLES),
                    'cues': 'start and settle, at least two seconds apart',
                    'timing': 'absolute source time, then 24 native frames to rest',
                    'runtime': 'local WebGPU; unsupported devices fail without fallback'},
                'spatial_backdrops': {'styles': list(production_visuals.THREE_BACKDROP_STYLES),
                    'cues': 'start and settle, at least two seconds apart',
                    'glass_heading': 'up to 12 characters; fixed approved font, shorten if it does not fit',
                    'runtime': 'pinned local Three.js r185, one WebGL context; no loaders or free-running animation'},
                'liquid_glass': {'variants': {'notifications': 'liquid-glass', 'steps': 'liquid-widgets'},
                    'image': 'required verified local still ID', 'items': '2-4 explicit label/body records; one cue per item',
                    'runtime': 'pinned local WebGPU core; no experimental DOM capture API'},
                'data_story': {'styles': list(production_visuals.DATA_STYLES), 'periods': '2-6',
                               'series': 'one declining series, two comparison lines, or 2-6 ranking/value-lane series', 'source': 'explicit structured record',
                               'decline': 'Nonincreasing supplied values with a lower final value; actual points, no decorative data curve',
                               'value_lanes': 'Speed encodes value / global maximum; true zero is stationary; no remote avatars'},
                'cursor_scenes': {'text_select': 'interface/notes with variant text-select; each item supplies one exact unique selection; one cue per item',
                    'collaborators': 'media-grid/solo with treatment collaborators; one verified still, 2-6 explicit actor labels and two cues; illustrated presence only'},
                'ranked_answer': {'variant': 'interface/steps/answer-rank', 'items': 'three initial picks and one incoming pick',
                    'rank': 'explicit slot 1-3', 'copy': 'explicit prompt, lead and label/body for each pick',
                    'cues': 'four: prompt, lead, original ranking, insertion', 'claims': 'supplied illustration; no model call or inferred endorsement'},
                'scrolling_note': {'variant': 'interface/notes/note-scroll', 'title': 'up to 52 characters',
                    'items': '2-7 literal lines, up to 52 characters each', 'cues': 'one per line, at least two seconds apart',
                    'motion': 'source measured scroll tables; caret follows approved-font grapheme widths'},
                'chat_exchanges': {'variants': list(production_visuals.CHAT_EXCHANGE_VARIANTS),
                    'answer_stream': 'one prompt, 1-3 answer paragraphs and a three-column table with 2-4 rows',
                    'research_stream': 'one prompt, two illustrated activity steps that collapse to supplied summary, 1-3 answer paragraphs',
                    'message_thread': '2-12 supplied sent/received messages; optional verified local image per message',
                    'cues': 'one per message, activity group and table row; 60 frames per beat',
                    'claims': 'illustrated content only; no model call, search, inferred answer or live messaging'},
                'combo_chart': {'periods': '2-6', 'series': 'one bar series and one line series',
                                'axes': 'explicit unit and positive maximum per series', 'cues': 'bars first, then line points'},
                'specs': {'rows': '2-5 explicit label/value pairs', 'cues': 'one per row'},
                'map_story': {'styles': list(production_visuals.MAP_STYLES), 'regions': list(production_visuals.MAP_REGIONS),
                              'world_regions': list(production_visuals.WORLD_REGIONS),
                              'spain_regions': list(production_visuals.SPAIN_REGIONS),
                              'us_states': [region for region in production_visuals.MAP_REGIONS if region != 'DC'],
                              'regional': 'spain:19 communities/cities; us:50 states; 195-frame introduction, 36-frame focus spacing; offline geometry attribution retained',
                              'world': '177 local geographic regions; explicit values/focus; 150-frame introduction and 36-frame focus spacing',
                              'base_image': 'verified local image for bubbles/flows/flight', 'data': 'explicit values and maximum for quantitative maps',
                              'flight': 'two labeled endpoints, supplied arrival label, start/settle cues at least six seconds apart',
                              'spotlight': 'verified image, normalized region and supplied label; start/settle cues at least seven seconds apart',
                              'coordinates': 'normalized positions inside the supplied image', 'remote_geocoding': False},
                'network': {'styles': list(production_visuals.NETWORK_STYLES), 'nodes': '3-7',
                            'parents': 'explicit earlier indices; maximum three levels'},
                'annotation': {'styles': list(production_visuals.ANNOTATION_STYLES), 'marks': '1-4',
                               'handwritten_strokes': list(production_visuals.ANNOTATION_STROKES),
                               'hand_arrow_curves': list(production_visuals.ANNOTATION_CURVES),
                               'pointers': list(production_visuals.ANNOTATION_POINTERS),
                               'image': 'one verified local still', 'coordinates': 'normalized image regions'},
                'interaction': {'styles': list(production_visuals.INTERACTION_STYLES),
                                'pointer_styles': list(production_visuals.POINTER_STYLES),
                                'pointer_limits': 'touch excluded; magnetic is click-only; agent requires an explicit actor label',
                                'camera': 'optional follow for click/drag with the standard pointer',
                                'cues': 'four: image, approach, action, exit; menu adds selection before exit',
                                'result': 'separate verified local still, required except for marquee',
                                'coordinates': 'normalized image region; explicit drag destination or vertical swipe endpoint',
                                'menu': '2-4 explicit labels and selected row', 'execution': False},
                'interface': {'styles': list(production_visuals.INTERFACE_STYLES), 'items': '2-4',
                              'variants': {style: list(variants) for style, variants in production_visuals.INTERFACE_VARIANTS.items()},
                              'feedback': 'explicit valid/error state per item; no live validation',
                              'primitive_inputs': {'micro-badge': 'explicit badge, at most 8 characters',
                                  'micro-check': 'explicit checked boolean', 'profile-count': 'explicit stat.value (8) and stat.label (24)',
                                  'signup-flow / beat-sequence': 'body at most 64 characters; all rows persist'},
                              'timing': 'one caption cue per item', 'typing_indicator': 'optional boolean for chat only', 'execution': False},
                'app_install': {'kind': 'interface', 'style': 'steps', 'variant': 'app-install',
                                'items': 'eight supplied label/body/local-icon records', 'selected': 'explicit index 0-7',
                                'ui': 'title/query/get/open/ready text', 'detail': 'body and three supplied label/value facts',
                                'timing': 'two cues at least seven seconds and 210 frames apart'},
                'ui_reveal': {'kind': 'interface', 'style': 'steps', 'variant': 'ui-3d-reveal',
                              'image': 'one verified local screenshot', 'layers': '3-9 explicit labels, maximum16 each',
                              'selected': 'zero-based layer index', 'properties': 'three label12/value14 records',
                              'selection': 'normalized x/y/width/height within the contained screenshot',
                              'copy': 'heading28/source64/tagline32/action22',
                              'timing': 'two cues at least13 seconds/390 frames apart, then24 settling frames',
                              'execution': False, 'qualification': 'Pending combined browser/export qualification'},
                'glass_parallax': {'kind': 'interface', 'style': 'steps', 'variant': 'glass-parallax',
                                   'image': 'one verified local still ID',
                                   'heading': '28 characters maximum', 'source': '64 characters maximum',
                                   'cues': 'two anchors at least twenty seconds / 600 frames apart, then 24 settling frames',
                                   'effect': '54 beveled glass cells, physical refraction, pointer parallax, bloom and grain',
                                   'fit': 'padded complete still; approved palette and native aspect',
                                   'qualification': 'native four-format checks passed; combined workflow and export qualification pending'},
                'shatter_panels': {'kind': 'interface', 'style': 'steps', 'variant': 'shatter-panels',
                                   'images': 'exactly two distinct verified local still IDs',
                                   'heading': '28 characters maximum', 'source': '64 characters maximum',
                                   'cues': 'two anchors at least twelve seconds / 360 frames apart, then 24 settling frames',
                                   'effect': 'source Voronoi cracks, 200 seeded shards, fixed-step gravity and second-image reveal',
                                   'fit': 'contain; approved background and crack palette',
                                   'qualification': 'pending combined workflow and export qualification'},
                'portal_panels': {'kind': 'interface', 'style': 'steps', 'variant': 'portal-panels',
                                  'images': 'exactly two distinct verified local still IDs',
                                  'heading': '28 characters maximum', 'source': '64 characters maximum',
                                  'cues': 'two anchors at least ten seconds / 300 frames apart, then 24 settling frames',
                                  'effect': 'source organic portal, ring distortion, chromatic edge and finite camera path',
                                  'fit': 'contain; approved background and ring palette',
                                  'qualification': 'pending combined workflow and export qualification'},
                'liquid_panels': {'kind': 'interface', 'style': 'steps', 'variant': 'liquid-panels',
                                  'images': 'exactly two distinct verified local still IDs',
                                  'copy': 'heading28/source64',
                                  'timing': 'three cues: start, mix after at least five seconds/150 frames, settle after seven more seconds/210 frames; then24 settling frames',
                                  'renderer': 'existing pinned local Three.js r185; fixed subdivided plane and source shaders',
                                  'execution': False, 'qualification': 'Pending combined browser/export qualification'},
                'product_canvas': {'kind': 'interface', 'style': 'steps', 'variant': 'product-canvas',
                                   'items': 'exactly 3 cards: label14/body28', 'actors': '3 distinct supplied names, maximum18 each',
                                   'hero': 'title24/body44/action18', 'comment': 'text60 and explicit resolved boolean',
                                   'timing': '2 cues, minimum12 seconds/360 frames apart, followed by24 settling frames',
                                   'execution': False, 'qualification': 'Pending combined browser/export qualification'},
                'screen_swaps': list(production_visuals.SCREEN_SWAPS),
                'screen_lenses': {'filmed': {'images': 1, 'focus_regions': '1-3 explicit regions',
                                            'renderer': 'local WebGL2', 'timing': 'existing caption cues'}},
                'vector_backdrops': {'styles': list(production_visuals.VECTOR_BACKDROP_STYLES),
                    'gooey_split': 'authored split, spin and merge; SVG blur/threshold and 17-sample directional shutter',
                    'cues': 'start and settle, at least 150 capture frames apart', 'identity': 'decorative geometry; approved channel logo unchanged'},
                'freeze_cut': {'swap': 'beat-freeze', 'images': '2-3 verified local stills',
                               'transition_frames': 69, 'clock': 'caption cue plus existing delay'},
                'screen_swap_inputs': {'clone-wall': '2-3 verified stills and one explicit word, at most 18 characters'},
                'headline_swap_inputs': {'circle-match': 'exactly two explicit phrases; fixed approved typography'},
                'catalog_swaps': {'styles': list(production_visuals.CATALOG_SWAPS), 'timing': '24 frames per image cue',
                                  'local_stills_only': True, 'palette': 'approved brand', 'scope': 'screen content only'},
                'lower_third_variants': list(production_visuals.LOWER_VARIANTS),
                'channel_card': 'two cues; explicit button.before and button.after, 18 characters each',
                'news_ticker': 'two cues at least six seconds apart; 2-6 explicit items, 40 characters each and 180 total; name 18 and role 56 characters',
                'closing_styles': list(production_visuals.CTA_STYLES),
                'cursor_rays': {'kind': 'cta', 'style': 'cursor-rays', 'heading_max': 8, 'action_max': 12, 'support_max': 16,
                                'finale': 'two supplied lines, 20 characters each', 'label_max': 64,
                                'cues': 'two anchors at least eight seconds and 240 frames apart',
                                'assets': 'exact approved logo PNG; existing brand approval and template lock required',
                                'renderer': '112-sample WebGL light sweep; native text; no silent fallback'},
                'creator_intro': {'kind': 'cta', 'style': 'creator-intro', 'heading_max': 28, 'action_max': 40, 'label_max': 64,
                                  'prompt': 'placeholder 64, text 180, model 24, thinking 32 characters; supplied display copy',
                                  'profile': 'verified local image; name 24, handle 32, bio 90, before/after 14 characters',
                                  'cues': 'start and settle; at least twelve seconds and 360 frames apart',
                                  'behavior': 'illustration only; no model, social-account or network actions'},
                'character_walk': {'kind': 'cta', 'style': 'character-walk', 'heading_max': 28, 'action_max': 40, 'label_max': 64,
                                   'cues': 'start and settle, at least eight seconds and 240 frames apart',
                                   'asset': 'pinned local vector character; approved color roles; no custom Lottie input'},
                'brand_lockups': {'logo-intro / logo-assemble': 'two cues; uses the approved logo, heading/action at most 32 characters',
                                  'badge-pair': 'one cue; 1-2 explicit badges with pinned icon, eyebrow (24) and label (22)'},
                'checklist': {'items': '2-5', 'checked': 'explicit boolean', 'emphasis': 'one heading substring',
                    'styles': list(production_visuals.CHECKLIST_STYLES)},
                'code': {'lines': '2-12', 'highlights': '1-6', 'execution': False},
                'code_story': {'styles': list(production_visuals.CODE_STYLES), 'documents': '1, or 2-4 for diff/morph/particles/dissolve/extrude',
                               'lines': '1-8, or up to 32 for scroll; 44 printable characters per line',
                               'timing': 'one cue per line, document version or focus index',
                               'spatial_runtime': 'particles/dissolve/extrude use pinned local Three.js r185; native text at rest',
                               'execution': False},
                'carousel': {'screens': '2-5', 'local_stills_only': True},
                'media_carousel': {'presets': list(production_visuals.CAROUSEL_PRESETS), 'images': '3-12 or 3-24 references by preset',
                    'timing': 'two caption cues at least six seconds apart; 24-frame settle',
                    'local_stills_only': True, 'fit': 'contain', 'center_text': 'text-circle only, 1-4 words, 24 characters',
                    'repetition': 'references cycle across the fixed 12 or 24 preset slots'},
                'media_grid': {'layouts': production_visuals.MEDIA_LAYOUTS,
                    'treatments': list(production_visuals.MEDIA_TREATMENTS),
                    'spatial_treatments': list(production_visuals.SPATIAL_TREATMENTS),
                    'spatial_contract': 'Two cues: establish, move. Solo for depth-card/dolly; 3up for scrub-stack/device-splay/phone-trio. No camera/surface/HUD. Layered images may overlap; labels stay outside the camera.',
                    'presentations': {'album-card': 'solo, one cue; item.detail required, at most 56 characters',
                                      'preview-sheet': '4up, two cues at least six seconds apart; spring entry, explicit image labels and counter',
                                      'steam-window': 'solo, two cues at least six seconds apart; explicit normalized region, one procedural steam window',
                                      'grade-split': 'solo, two cues at least six seconds/180 frames apart, then 24 settling frames; local WebGL comparison'},
                    'grade_split': {'looks': list(production_visuals.GRADE_LOOKS), 'split': 'integer 25-85 percent',
                                    'edge': ['hairline', 'bold', 'hidden'], 'labels': 'explicit boolean',
                                    'fields': 'grade requires look/split/edge/labels; heading at most28 characters',
                                    'before': 'Flat preview is a treatment, not untouched original pixels',
                                    'fit': 'complete verified still; no CSS/LUT/shader/font/color overrides',
                                    'qualification': 'Pending combined browser/export qualification'},
                    'cameras': list(production_visuals.MEDIA_CAMERAS),
                    'hud_styles': list(production_visuals.MEDIA_HUDS),
                    'surfaces': list(production_visuals.MEDIA_SURFACES),
                    'surface_contract': 'Solo standard card; no camera. Feather focus needs an image-relative target. Phone optionally accepts none/island/notch cutout.',
                    'camera_layouts': 'solo; focus-rack 2up; parallax 3up',
                    'camera_cues': 'establish, move; punch-reset adds return',
                    'camera_options': 'push-in intensity: subtle/standard/bold; tilt glow: tight/standard/wide',
                    'light_treatments': 'solo only', 'hand_frame': 'solo only', 'book_open': '2up only',
                    'local_stills_only': True, 'fit': 'contain', 'cues': 'one per item'},
                'diagram': {'steps': '2-4', 'styles': list(production_visuals.DIAGRAM_STYLES), 'paths': 'engine-generated'},
                'screen_focus': {'regions': '1-3', 'zoom': 'greater than 1, at most 3', 'images': 1},
                'transitions': list(production_visuals.TRANSITIONS), 'human_review': 'required'}, indent=2))
            return 0
        if args.command == 'palettes':
            for row in branding.palette_table():
                print(f"{row['name']:14} background {row['background']}  accent {row['accent']} ({row['accent_contrast']}:1)  secondary {row['secondary']} ({row['secondary_contrast']}:1)")
            return 0
        if args.command == 'fonts':
            from tools.font_library.kit import entries
            print(json.dumps(entries(), indent=2))
            return 0
        if args.command == 'batch':
            print(json.dumps(diversity.report(root, args.name), indent=2))
            return 0
        if args.command not in ('doctor', 'validate'):
            require(args.approve_write, 'Writer requires --approve-write')
        if args.command == 'brand-approve':
            branding.approve(root, workflow.verify_lock())
            result = 'Brand approved and hash-locked.'
        elif args.command == 'configure':
            result = runtime.configure(root, vars(args))
        elif args.command == 'doctor':
            result = workflow.doctor()[1]
        elif args.command == 'import':
            result = import_file(root, args.source, args.name, args.format)
        elif args.command == 'transcribe':
            result = workflow.transcribe(args.audio, args.output)
        elif args.command == 'caption-draft':
            result = workflow.caption_draft(args.transcript, args.output, args.format)
        elif args.command == 'new':
            result = new_episode(root, args.id, args.audio, args.transcript, args.graphic, args.captions,
                                 args.batch, args.layouts, args.format, args.storyboard)
        else:
            episode = inside(root, args.episode)
            if args.command == 'validate':
                data, _, captions, _ = workflow.validate(episode)
                result = {'status': 'PASS', 'scenes': len(data['scenes']), 'cues': len(captions['cues']), 'human_review': 'required'}
            else:
                result = workflow.build(episode, args.run_id, args.command == 'render')
        print(json.dumps(result, indent=2) if isinstance(result, dict) else result)
        return 0
    except (ValueError, KeyError, TypeError, OSError, StopIteration, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        return 1
    except (KeyboardInterrupt, EOFError):
        print('\nCancelled. Existing files were not deleted.', file=sys.stderr)
        return 130


if __name__ == '__main__':
    raise SystemExit(main())
