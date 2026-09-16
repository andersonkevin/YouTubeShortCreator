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
import runtime
import workflow
from safety import digest, identifier, inside, read_json, require, write_json
from media_contract import MAX_AUDIO_BYTES

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
    fonts = {role: ask(f'{role.title()} font path (.ttf/.otf; must be licensed for your use)', branding.font_path(role)) for role in ('display', 'body', 'mono')}
    brand = {'version': 1, 'channel': name, 'language': language, 'audience': audience, 'tone': tone,
             'scene_count': count, 'colors': colors, 'logo_style': style}
    branding.validate_brand(brand)
    print(json.dumps(brand, indent=2))
    require(approved or ask('Type CREATE to create this private workspace') == 'CREATE', 'Cancelled; no files written')
    result = branding.create(root, brand, fonts, logo or None)
    print(f'Brand preview: {result}\nReview the image, then run brand-approve --approve-write. No brand has been approved yet.')
    return result


def import_file(root, source, name):
    require(re.fullmatch(r'[a-z0-9][a-z0-9._-]{0,79}', name), 'Use a simple lowercase intake filename')
    maximum = MAX_AUDIO_BYTES if Path(source).suffix.lower() in ('.mp3', '.wav', '.m4a', '.opus') else 30_000_000
    source = branding.external_file(source, ('.mp3', '.wav', '.m4a', '.opus', '.png', '.jpg', '.jpeg', '.json'), maximum)
    require(Path(name).suffix.lower() == source.suffix.lower(), 'Keep the source extension')
    dest = inside(root, 'intake/' + name, exists=False)
    require(dest.parent.is_dir(), 'Initialize a workspace first')
    before = digest(source)
    with source.open('rb') as reader, dest.open('xb') as writer:
        shutil.copyfileobj(reader, writer)
    require(digest(dest) == before and digest(source) == before, 'Input changed during import')
    return dest


def new_episode(root, episode_id, audio, transcript, graphic, captions):
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
    layouts = ['prompt-tools', 'code-policy', 'approval-gate']
    if count == 4:
        layouts.insert(2, 'code-pipeline')
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
    sub.add_parser('palettes')
    command = sub.add_parser('import')
    command.add_argument('source')
    command.add_argument('--name', required=True)
    command.add_argument('--approve-write', action='store_true')
    for name, source in [('transcribe', 'audio'), ('caption-draft', 'transcript')]:
        command = sub.add_parser(name)
        command.add_argument(source)
        command.add_argument('output')
        command.add_argument('--approve-write', action='store_true')
    command = sub.add_parser('new')
    command.add_argument('id')
    for value in ('audio', 'transcript', 'graphic', 'captions'):
        command.add_argument('--' + value, required=True)
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
                print('Workspace exists. Commands: doctor, layouts, palettes, import, transcribe, caption-draft, new, validate, build, render.\nUse --help or COMMAND --help for arguments. For another brand, start with --workspace PATH init.')
            return 0
        if args.command == 'init':
            onboarding(root, args.approve_write)
            return 0
        if args.command == 'layouts':
            print('\n'.join(path.stem for path in sorted(workflow.TEMPLATE.joinpath('scenes').glob('*.json'))))
            return 0
        if args.command == 'palettes':
            for row in branding.palette_table():
                print(f"{row['name']:14} background {row['background']}  accent {row['accent']} ({row['accent_contrast']}:1)  secondary {row['secondary']} ({row['secondary_contrast']}:1)")
            return 0
        if args.command not in ('doctor', 'validate', 'palettes'):
            require(args.approve_write, 'Writer requires --approve-write')
        if args.command == 'brand-approve':
            branding.approve(root, workflow.verify_lock())
            result = 'Brand approved and hash-locked.'
        elif args.command == 'configure':
            result = runtime.configure(root, vars(args))
        elif args.command == 'doctor':
            result = workflow.doctor()[1]
        elif args.command == 'import':
            result = import_file(root, args.source, args.name)
        elif args.command == 'transcribe':
            result = workflow.transcribe(args.audio, args.output)
        elif args.command == 'caption-draft':
            result = workflow.caption_draft(args.transcript, args.output)
        elif args.command == 'new':
            result = new_episode(root, args.id, args.audio, args.transcript, args.graphic, args.captions)
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
