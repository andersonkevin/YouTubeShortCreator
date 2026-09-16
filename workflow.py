#!/usr/bin/env python3
"""Local Shorts production. Writers require explicit approval and new paths."""
from __future__ import annotations

import html
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from contextlib import nullcontext

from safety import digest, identifier, inside, keys, number, read_json, require, text, write_json
from media_contract import MAX_AUDIO_BYTES, duration_seconds

HOME = Path(__file__).resolve().parent
ROOT = HOME / 'workspace'
TEMPLATE = HOME / 'templates/v1'
RUNS = ROOT / 'runs'


def verify_lock():
    lock = read_json(HOME / 'lock.json')
    for name, expected in lock['files'].items():
        require(digest(inside(HOME, name)) == expected, f'Locked implementation changed: {name}')
    return digest(HOME / 'lock.json')


def doctor():
    import runtime
    import branding
    lock = verify_lock()
    branding.verified(ROOT, lock)
    return runtime.doctor(ROOT, lock)


def words(value):
    return re.findall(r'[^\W_]+', value.casefold(), flags=re.UNICODE)


def validate_captions(captions, transcript, duration, adjustments):
    duration = duration_seconds(duration)
    require(captions['status'] in ['local_asr_aligned_review', 'word_timed_review'], 'Estimated captions are not accepted')
    require(abs(number(captions['duration']) - duration) < 1e-6, 'Caption duration mismatch')
    timed = transcript['words']
    require(isinstance(timed, list) and len(timed) > 0, 'Empty transcript')
    previous = 0
    for word in timed:
        text(word['text'], 100)
        require(0 <= number(word['start']) < number(word['end']) <= duration, 'Invalid word interval')
        require(word['start'] >= previous - .061, 'Transcript is not ordered')
        previous = word['end']
    position, end = 0, 0
    require(isinstance(adjustments, dict), 'Timing adjustments must be an object')
    used_adjustments = set()
    for i, cue in enumerate(captions['cues']):
        text(cue['text'], 100)
        require(type(cue['firstWord']) is int and type(cue['lastWord']) is int, 'Integer word indexes required')
        require(cue['firstWord'] == position and position <= cue['lastWord'] < len(timed), 'Caption word gap or overlap')
        segment = timed[position:cue['lastWord'] + 1]
        require(words(cue['text']) == words(' '.join(w['text'] for w in segment)), 'Caption contains missing or unspoken words')
        require(end <= number(cue['start']) < number(cue['end']) <= duration, 'Caption overlap or invalid interval')
        require(abs(cue['end'] - segment[-1]['end']) <= .061, 'Caption ending does not match speech')
        delta = cue['start'] - segment[0]['start']
        if abs(delta) > .12:
            require(str(i) in adjustments and text(adjustments[str(i)], 400), 'Measured timing refinement needs an evidence note')
            # The retained measured-pause audit differs from ASR boundaries by up to two frames.
            require(0 <= delta <= 1.1 and cue['start'] <= segment[0]['end'] + .061, 'Timing refinement exceeds first spoken segment tolerance')
            used_adjustments.add(str(i))
        position, end = cue['lastWord'] + 1, cue['end']
    require(position == len(timed), 'Transcript words omitted')
    require(used_adjustments == set(adjustments), 'Unused timing adjustment')


def validate(path):
    import branding
    brand = branding.verified(ROOT, verify_lock())
    path = inside(ROOT, os.path.relpath(Path(path).absolute(), ROOT))
    data = read_json(path)
    require(type(data.get('version')) is int and data['version'] in (1, 2), 'Unsupported episode version')
    fields = ['version', 'id', 'template', 'language', 'duration', 'inputs', 'thumbnail', 'youtube', 'scenes', 'timing_adjustments']
    keys(data, fields + (['visuals'] if data['version'] == 2 else []), 'episode')
    identifier(data['id'])
    require(data['template'] == 'v1' and data['language'] == brand['language'], 'Unsupported contract or language differs from brand')
    visual_records = {}
    if data['version'] == 2:
        import visual_adapter
        visual_records = visual_adapter.validate_records(data['visuals'])
    duration = duration_seconds(data['duration'])
    keys(data['inputs'], ['audio', 'graphic', 'transcript', 'captions'], 'inputs')
    inputs = {}
    for name, item in data['inputs'].items():
        keys(item, ['path', 'sha256'], name)
        file = inside(path.parent, item['path'])
        limit = MAX_AUDIO_BYTES if name == 'audio' else 30_000_000
        require(0 < file.stat().st_size <= limit, 'Input file size is outside the contract')
        require(digest(file) == item['sha256'], f'Input changed: {name}')
        inputs[name] = file
    require(inputs['audio'].suffix.lower() in ['.mp3', '.wav', '.m4a', '.opus'], 'Unsupported audio file')
    from PIL import Image, ImageFont
    with Image.open(inputs['graphic']) as graphic:
        require(graphic.format in ['PNG', 'JPEG'] and max(graphic.size) <= 4096, 'Graphic must be bounded PNG/JPG')
        require(abs(graphic.width / graphic.height - 9 / 16) < .01, 'Graphic must be vertical 9:16')
        graphic.verify()
    captions, transcript = read_json(inputs['captions']), read_json(inputs['transcript'])
    require(transcript.get('audio_sha256') == data['inputs']['audio']['sha256'], 'Transcript is not bound to this recording')
    validate_captions(captions, transcript, duration, data['timing_adjustments'])
    keys(data['thumbnail'], ['headline', 'label'], 'thumbnail')
    branding.thumbnail(ROOT, inputs['graphic'], data['thumbnail']['headline'], data['thumbnail']['label'])
    meta = data['youtube']
    keys(meta, ['title', 'description', 'hashtags', 'tags', 'pinned_comment'], 'YouTube')
    text(meta['title'], 100)
    text(meta['description'], 5000)
    text(meta['pinned_comment'], 1000)
    hashtags = meta['hashtags']
    require(5 <= len(hashtags) <= 8 and len(set(hashtags)) == len(hashtags), 'Use 5-8 unique hashtags')
    require(all(re.fullmatch(r'#[a-z0-9]+', h) for h in hashtags), 'Hashtags must be lowercase')
    require(re.findall(r'#[A-Za-z0-9]+', meta['description']) == hashtags, 'Description hashtags differ')
    require(isinstance(meta['tags'], list) and all(isinstance(t, str) for t in meta['tags']) and len(', '.join(meta['tags'])) <= 450, 'Invalid tags')
    require(3 <= len(data['scenes']) <= 4, 'Use 3-4 scenes')
    previous = -1
    used_visuals = []
    for scene in data['scenes']:
        require(isinstance(scene, dict), 'Scene must be an object')
        is_visual = scene.get('layout') == 'visual-library'
        if is_visual:
            require(data['version'] == 2, 'Visual scenes require episode version 2')
            visual_adapter.validate_scene(scene, visual_records)
            used_visuals.append(scene['visual_id'])
        else:
            keys(scene, ['layout', 'name', 'first_cue', 'content', 'motion'], 'scene')
        identifier(scene['layout'])
        layout = None if is_visual else read_json(inside(TEMPLATE / 'scenes', scene['layout'] + '.json'))
        text(scene['name'], 100)
        cue = scene['first_cue']
        require(type(cue) is int and previous < cue < len(captions['cues']), 'Scene cue anchors must increase')
        require(previous != -1 or cue == 0, 'First scene must start at the first cue')
        previous = cue
        if is_visual:
            continue
        keys(scene['content'], layout['content_keys'], 'scene content')
        for value in scene['content'].values():
            text(value)
        keys(scene['motion'], layout['motion_keys'], 'scene motion')
        for name, values in scene['motion'].items():
            keys(values, layout['motion_keys'][name], 'motion entry')
            for kind, value in values.items():
                if kind == 'enter':
                    require(number(value) >= 0, 'Negative reveal')
                else:
                    require(isinstance(value, list) and len(value) == 2, 'Motion interval must have two numbers')
                    require(number(value[0]) >= 0 and number(value[1]) > 0, 'Invalid motion interval')
                    if kind == 'active':
                        require(value[1] > value[0], 'Reversed active interval')
    require(len(used_visuals) == len(set(used_visuals)) and set(used_visuals) == set(visual_records), 'Visual records must be used exactly once')
    starts = [0] + [captions['cues'][s['first_cue']]['start'] for s in data['scenes'][1:]]
    ends = starts[1:] + [duration]
    for scene, start, end in zip(data['scenes'], starts, ends):
        require(end > start, 'Empty scene')
        if scene['layout'] == 'visual-library':
            visual_adapter.validate_duration(scene, end - start)
        for values in scene['motion'].values():
            for kind, value in values.items():
                limit = value if kind == 'enter' else value[1] if kind == 'active' else sum(value)
                require(limit <= end - start + .00001, 'Motion exceeds its scene')
    return data, inputs, captions, list(zip(starts, ends))


def scene_html(node, content, motion, boundary=None):
    if 'text' in node:
        return html.escape(node['text'])
    if 'slot' in node:
        return html.escape(content[node['slot']])
    attrs = dict(node['attrs'])
    if 'motion' in node:
        for name, value in motion[node['motion']].items():
            attrs['data-' + name] = ','.join(map(str, value)) if isinstance(value, list) else str(value)
    if boundary:
        attrs.update(boundary)
    attr = ''.join(f' {k}="{html.escape(str(v), quote=True)}"' for k, v in attrs.items())
    tag = node['tag']
    children = ''.join(scene_html(child, content, motion) for child in node['children'])
    return f'<{tag}{attr}>' + ('' if tag in ['br', 'img', 'hr'] else children + f'</{tag}>')


def build_html(data, captions, bounds):
    scenes = []
    for scene, (start, end) in zip(data['scenes'], bounds):
        if scene['layout'] == 'visual-library':
            import visual_adapter
            scenes.append(visual_adapter.scene_html(scene, start, end))
            continue
        tree = read_json(TEMPLATE / 'scenes' / (scene['layout'] + '.json'))['tree']
        scenes.append(scene_html(tree, scene['content'], scene['motion'], {'data-start': start, 'data-end': end, 'data-name': scene['name']}))
    styles = ['motion.css', 'technology.css', 'code-graphics-scenes.css', 'general-scenes.css', 'spoken-captions.css', 'scene-extras.css', 'brand.css']
    if data['version'] == 2:
        styles.append('visual-scenes.css')
    links = ''.join(f'<link rel="stylesheet" href="assets/{name}">' for name in styles)
    payload = json.dumps(captions, ensure_ascii=True).replace('<', '\\u003c')
    brand = read_json(ROOT / 'brand/brand.json')
    visual_scripts = ''
    if data['version'] == 2:
        import visual_adapter
        visual_scripts = visual_adapter.scripts(data, brand)
    return (f'<!doctype html><html lang="{html.escape(data["language"], quote=True)}"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src \'self\' data:; font-src \'self\'; style-src \'self\' \'unsafe-inline\'; script-src \'self\'; connect-src \'none\'">'
            f'<title>{html.escape(data["youtube"]["title"])}</title>{links}</head><body>'
            f'<main id="film" data-duration="{data["duration"]}" data-scene-count="{len(scenes)}">'
            f'<img class="logo" src="assets/logo.png" alt="{html.escape(brand["channel"], quote=True)}">' + ''.join(scenes) +
            '<div class="progress"><span data-progress></span></div><p class="spoken-caption" aria-label="Narration captions"><span></span></p></main>'
            f'<script type="application/json" id="spoken-captions-data">{payload}</script>'
            '<script src="assets/motion.js"></script><script src="assets/spoken-captions.js"></script>' + visual_scripts + '</body></html>')


def srt(captions):
    def stamp(seconds):
        total = round(seconds * 1000)
        return f'{total // 3600000:02}:{total // 60000 % 60:02}:{total // 1000 % 60:02},{total % 1000:03}'
    return '\n\n'.join(f'{i + 1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n{c["text"]}' for i, c in enumerate(captions['cues'])) + '\n'


def execute(command, **kwargs):
    subprocess.run(command, check=True, **kwargs)


def build(episode, run_id, render=False):
    import branding
    import media_backend
    runtime, environment = doctor()
    data, inputs, captions, bounds = validate(episode)
    if render:
        require(not any('DRAFT:' in value for value in (data['youtube']['title'], data['youtube']['description'], data['youtube']['pinned_comment'])), 'Replace draft metadata before rendering; build remains available for preview')
    episode_hash = digest(Path(episode))
    output = inside(RUNS, data['id'] + '/' + identifier(run_id), exists=False)
    require(not output.exists(), 'Run already exists; choose a new run ID')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.mkdir()
    try:
        shutil.copytree(TEMPLATE / 'assets', output / 'assets')
        for asset in (ROOT / 'brand/assets').iterdir():
            shutil.copyfile(asset, output / 'assets' / asset.name)
        if data['version'] == 2:
            import visual_adapter
            visual_adapter.install_assets(output, data, read_json(ROOT / 'brand/brand.json'))
        (output / 'video.html').write_text(build_html(data, captions, bounds), encoding='utf-8')
        (output / 'captions.srt').write_text(srt(captions), encoding='utf-8')
        write_json(output / 'captions.json', captions)
        write_json(output / 'episode.json', data)
        branding.thumbnail(ROOT, inputs['graphic'], data['thumbnail']['headline'], data['thumbnail']['label'], output / 'thumbnail.jpg')
        metadata = {**data['youtube'], 'language': data['language'], 'thumbnail': 'thumbnail.jpg', 'video': 'video.mp4' if render else None, 'status': 'review_required', 'published_url': None, 'published_at': None}
        write_json(output / 'youtube.json', metadata)
        (output / 'youtube.md').write_text('\n\n'.join(['# Title', metadata['title'], '# Description', metadata['description'], '# Tags', ', '.join(metadata['tags']), '# Pinned Comment', metadata['pinned_comment']]) + '\n', encoding='utf-8')
        with media_backend.scratch() if render else nullcontext(None) as temporary:
            command = [runtime['node'], str(HOME / 'capture.mjs'), str(ROOT), str(output), 'render' if render else 'qa']
            if render:
                command.append(str(temporary / 'frames'))
            execute(command)
            if render:
                count = round(data['duration'] * 30)
                require(read_json(output / 'visual-qa.json')['frames'] == count, 'Captured frame count differs')
                media_backend.encode(environment['backend'], runtime, temporary, count, output / 'silent.mp4')
                audio_report = media_backend.finish(environment['backend'], runtime, temporary, output, inputs['audio'], data['duration'])
                write_json(output / 'audio-qa.json', audio_report)
        validate(episode)
        require(digest(Path(episode)) == episode_hash, 'Episode changed during production')
        require(verify_lock() == environment['lock_sha256'], 'Implementation changed during render')
        require(digest(inside(ROOT, 'runtime.json')) == environment['runtime_sha256'], 'Runtime profile changed during production')
        hashes = {}
        for file in sorted(output.rglob('*')):
            require(not file.is_symlink(), 'Symlink in run output')
            if file.is_file():
                name = str(file.relative_to(output))
                hashes[name] = digest(inside(output, name))
        report = {'status': 'review_required', 'automated_checks': 'PASS', 'mode': 'render' if render else 'build', 'episode_id': data['id'], 'episode_sha256': episode_hash, 'environment': environment, 'input_hashes': {name: digest(file) for name, file in inputs.items()}, 'outputs': hashes, 'publication_performed': False}
        write_json(output / 'run.json', report)
        return output
    except (Exception, KeyboardInterrupt) as error:
        write_json(output / 'failure.json', {'status': 'FAILED', 'error': type(error).__name__, 'message': str(error), 'retry': 'Use a new run ID. Partial files preserved for diagnosis.'})
        raise


def transcribe(audio, output):
    runtime, _ = doctor()
    source = inside(ROOT, audio)
    source_hash = digest(source)
    target = inside(ROOT, output, exists=False)
    require(Path(output).parts[0] == 'intake', 'Transcripts must be written under intake/')
    require(not target.exists() and target.suffix == '.json' and target.parent.is_dir(), 'New JSON output with existing parent required')
    with tempfile.TemporaryDirectory(prefix='shortcreator-transcript-') as temporary:
        raw = Path(temporary) / 'transcript.json'
        locale = read_json(ROOT / 'brand/brand.json')['language']
        execute([runtime['swift'], '-module-cache-path', str(Path(temporary) / 'cache'), str(HOME / 'transcribe.swift'), str(source), str(raw), locale])
        transcript = read_json(raw)
        require(len(transcript['words']) > 0, 'No transcript words')
        require(digest(source) == source_hash, 'Audio changed during transcription')
        transcript['audio_sha256'] = source_hash
        write_json(target, transcript)
    return target


def caption_draft(transcript_path, output):
    verify_lock()
    transcript = read_json(inside(ROOT, transcript_path))
    target = inside(ROOT, output, exists=False)
    require(Path(output).parts[0] == 'intake' and target.suffix == '.json' and target.parent.is_dir() and not target.exists(), 'New intake JSON output required')
    require(re.fullmatch(r'[0-9a-f]{64}', transcript.get('audio_sha256', '')), 'Transcript must identify source audio')
    duration = math.ceil(number(transcript['duration']) * 30) / 30
    timed = transcript['words']
    cues, start = [], 0
    for i, word in enumerate(timed):
        last = i == len(timed) - 1
        split = last or i - start >= 5 or word['end'] - timed[start]['start'] >= 2.8
        split = split or bool(re.search(r'[.!?:]$', word['text'].strip()))
        if split:
            cues.append({'text': ' '.join(w['text'].strip() for w in timed[start:i + 1]), 'start': timed[start]['start'], 'end': word['end'], 'firstWord': start, 'lastWord': i})
            start = i + 1
    record = {'duration': duration, 'status': 'word_timed_review', 'source': 'Local timed transcript; automatic phrase grouping requires listening review.', 'cues': cues}
    validate_captions(record, transcript, duration, {})
    write_json(target, record)
    return target
