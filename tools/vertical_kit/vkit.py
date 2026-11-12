#!/usr/bin/env python3
"""Vertical kit: hand-built, narration-timed HTML Shorts (9:16) and square videos (1:1). See docs/VERTICAL-KIT.md.

A batch is a folder with brand.json (optional), img/ (licensed photos) and one folder per Short:
    <short>/script/script.txt   paragraphs separated by blank lines (+ optional say.json)
    <short>/takes/<take>/       narration.wav + audio.json            (narrate)
    <short>/intake/             transcript-raw.json, timing.json      (transcribe, align)
    <short>/web/                build.py + <short>.css -> stage.html  (build)
    <short>/cover/              cover.html, cover.png, cover.jpg      (cover)
    <short>/final/, upload/     MP4s, SRT, contact sheet              (render, finish)
Every step is local. Nothing is installed, downloaded, uploaded or published; outputs are reviewed by a person."""
import argparse, json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

KIT = Path(__file__).resolve().parent
HOME = KIT.parents[1]
sys.path.insert(0, str(KIT))
FPS = 30
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
INTRO_DELAY, INTRO_LEN, FADE_AT, FADE_LEN = .3, 1.6, .8, .8
LOUDNESS = {'I': -14, 'TP': -1.5, 'LRA': 11}  # YouTube turns loud uploads down but never turns quiet ones up


def tool(name, default=None):
    path = os.environ.get('YSC_' + name.upper()) or default or shutil.which(name)
    if not path or not Path(path).exists():
        raise SystemExit(f'Missing {name}: set YSC_{name.upper()} to its path')
    return path


def run(cmd, **kw):
    result = subprocess.run([str(c) for c in cmd], text=True, capture_output=True, **kw)
    if result.returncode:
        raise SystemExit(f'Failed: {Path(str(cmd[0])).name} {" ".join(map(str, cmd[1:4]))} ...\n{result.stdout[-2000:]}{result.stderr[-2000:]}')
    return result.stdout


def latest_take(short, take=None):
    takes = sorted(p.name for p in (short / 'takes').iterdir() if p.is_dir()) if (short / 'takes').is_dir() else []
    if take:
        if take not in takes:
            raise SystemExit(f'No take {take}')
        return take
    if not takes:
        raise SystemExit('No takes yet; run narrate first')
    return takes[-1]


def page_size(page):
    return (1080, 1080) if 'vsquare.css' in Path(page).read_text() else (1080, 1920)


def shoot(page, out, mode, *args):
    w, h = page_size(page)
    env = {**os.environ, 'YSC_PLAYWRIGHT': tool('playwright', str(HOME / 'node_modules/playwright/index.mjs')), 'YSC_CHROME': tool('chrome', CHROME)}
    run([tool('node'), KIT / 'shoot.mjs', page, out, f'{w}x{h}', mode, *args], env=env)


def encode(frames, audio, output, extra=()):
    run([tool('ffmpeg'), '-loglevel', 'error', '-y', '-framerate', FPS, '-i', Path(frames) / 'f%05d.jpg', *audio,
         '-c:v', 'libx264', '-preset', 'slow', '-crf', 18, '-pix_fmt', 'yuv420p', '-tune', 'animation',
         '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', *extra, output])


def duration(path):
    return float(run([tool('ffprobe'), '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).strip())


# ---------- pure helpers (unit tested) ----------
def srt_time(t):
    ms = round(t * 1000)
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


def srt(timing, shift=0.):
    W = timing['words']
    return '\n'.join(f"{i}\n{srt_time(c['start'] + shift)} --> {srt_time(c['end'] + shift)}\n{' '.join(w['text'] for w in W[c['firstWord']:c['lastWord'] + 1])}\n"
                     for i, c in enumerate(timing['cues'], 1))


def loudnorm_filter(measured):
    """Second-pass loudnorm filter from the first pass's JSON measurement (linear mode keeps the dynamics)."""
    m = {k: measured[k] for k in ('input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset')}
    return (f"loudnorm=I={LOUDNESS['I']}:TP={LOUDNESS['TP']}:LRA={LOUDNESS['LRA']}:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
            f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")


def intro_filter():
    d = INTRO_DELAY
    return (f'[1:v]tpad=start_duration={d}:start_mode=clone,format=yuv420p[b];[0:v]format=yuva420p,fade=t=out:st={FADE_AT}:d={FADE_LEN}:alpha=1[a];'
            f'[b][a]overlay=eof_action=pass,format=yuv420p[v];[1:a]adelay={round(d * 1000)}:all=1[au]')


def sheet_times(length, n=12):
    marks = [0.004, .06, .14, .24, .34, .44, .54, .64, .74, .84, .92, .97][:n]
    return [max(.2, length * p) for p in marks]


# ---------- steps ----------
def loudnorm(path):
    ffmpeg = tool('ffmpeg'); path = Path(path)
    probe = subprocess.run([ffmpeg, '-hide_banner', '-nostats', '-i', path, '-af', f"loudnorm=I={LOUDNESS['I']}:TP={LOUDNESS['TP']}:LRA={LOUDNESS['LRA']}:print_format=json",
                            '-f', 'null', '-'], text=True, capture_output=True).stderr
    measured = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
    tmp = path.with_suffix('.loudnorm.mp4')
    run([ffmpeg, '-loglevel', 'error', '-y', '-i', path, '-map', '0', '-c:v', 'copy', '-af', loudnorm_filter(measured),
         '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', tmp])
    tmp.replace(path)
    after = subprocess.run([ffmpeg, '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], text=True, capture_output=True).stderr
    i = re.findall(r'I:\s+(-?[\d.]+) LUFS', after); peak = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', after)
    print(f"loudnorm {path.name}: {measured['input_i']} -> {i[-1] if i else '?'} LUFS, peak {peak[-1] if peak else '?'} dBFS")


def contact_sheet(images, output, cols=6, tile=(270, 480)):
    from PIL import Image
    W, H = tile; rows = -(-len(images) // cols)
    sheet = Image.new('RGB', (W * min(cols, len(images)), H * rows), 'white')
    for i, f in enumerate(images):
        sheet.paste(Image.open(f).convert('RGB').resize((W, H)), ((i % cols) * W, (i // cols) * H))
    sheet.save(output, quality=88)


def cmd_new(a):
    batch = Path(a.batch).resolve(); short = batch / a.short
    if short.exists():
        raise SystemExit(f'{short} exists')
    for d in ('script', 'takes', 'intake', 'web', 'cover', 'final', 'upload'):
        (short / d).mkdir(parents=True)
    (batch / 'img').mkdir(exist_ok=True)
    if not (batch / 'brand.json').exists():
        shutil.copy(KIT / 'brand.example.json', batch / 'brand.json')
    (short / 'script/script.txt').write_text('First paragraph: the hook, one sentence.\n\nSecond paragraph.\n\nClosing line with the call to action.\n')
    (short / 'web/build.py').write_text((KIT / 'build_template.py').read_text().replace('SHORT', a.short))
    (short / f'web/{a.short}.css').write_text(f'/* {a.short}: scene styles. Prefix classes with the Short name to keep batches tidy. */\n')
    print('new', short)


def cmd_narrate(a):
    import narrate
    narrate.main(a.short, a.voice, a.speed, a.take or 'take01', a.models, a.workspace)


def cmd_transcribe(a):
    short = Path(a.short).resolve(); take = latest_take(short, a.take)
    out = short / 'intake/transcript-raw.json'
    if out.exists():
        raise SystemExit(f'{out.name} exists; move it away to transcribe again')
    print(run([tool('swift'), HOME / 'transcribe.swift', short / 'takes' / take / 'narration.wav', out, a.locale]).strip())


def cmd_align(a):
    import align
    short = Path(a.short).resolve(); align.main(short, latest_take(short, a.take))


def cmd_build(a):
    short = Path(a.short).resolve()
    print(run([sys.executable, short / 'web/build.py'], cwd=short / 'web', env={**os.environ, 'VKIT_HOME': str(KIT)}).strip())


def cmd_stills(a):
    short = Path(a.short).resolve(); out = short / 'stills'
    shutil.rmtree(out, ignore_errors=True)
    times = a.times or [c['start'] + .9 for c in json.loads((short / 'intake/timing.json').read_text())['cues']]
    shoot(short / 'web/stage.html', out, 'stills', *[f'{t:.3f}' for t in map(float, times)])
    contact_sheet(sorted(out.glob('still-*.png')), short / 'stills.jpg', cols=a.cols)
    print('stills', len(times), '->', short / 'stills.jpg')


def cmd_render(a):
    short = Path(a.short).resolve(); name = short.name
    (short / 'final').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='vkit-') as tmp:
        if a.silent:
            length = json.loads((short / 'intake/timing.json').read_text())['duration']
            shoot(short / 'web/stage.html', tmp, 'frames', FPS, f'{length:.3f}')
            encode(tmp, ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono'], short / 'final' / f'{name}.mp4', ['-shortest'])
        else:
            take = latest_take(short, a.take)
            length = json.loads((short / 'takes' / take / 'audio.json').read_text())['duration']
            shoot(short / 'web/stage.html', tmp, 'frames', FPS, f'{length:.3f}')
            encode(tmp, ['-i', short / 'takes' / take / 'narration.wav'], short / 'final' / f'{name}.mp4', ['-shortest'])
    print(f'{name}: {length:.3f}s -> final/{name}.mp4')


def cmd_cover(a):
    import common, cover
    short = Path(a.short).resolve(); brand = common.load_brand(short.parent)
    art = Path(a.art).resolve()
    if not art.is_file():
        raise SystemExit(f'Missing artwork {art}')
    (short / 'cover').mkdir(exist_ok=True)
    page = short / 'cover/cover.html'
    page.write_text(cover.cover_page(brand, art, a.line1, a.line2, a.sub, a.tag))
    with tempfile.TemporaryDirectory(prefix='vkit-') as tmp:
        shoot(page, tmp, 'stills', '0')
        from PIL import Image
        img = Image.open(Path(tmp) / 'still-01.png').convert('RGB')
        img.save(short / 'cover/cover.png'); img.save(short / 'cover/cover.jpg', quality=92)
    print('cover ->', short / 'cover/cover.png')


def cmd_finish(a):
    """SRT, cover intro over the Short (9:16), loudness pass, contact sheet."""
    import cover
    short = Path(a.short).resolve(); name = short.name
    timing = json.loads((short / 'intake/timing.json').read_text())
    base = short / 'final' / f'{name}.mp4'; out = short / 'final' / f'{name}-final.mp4'
    (short / 'upload').mkdir(exist_ok=True)
    square = page_size(short / 'web/stage.html')[1] == 1080
    if square or a.no_intro:
        shutil.copy(base, out); shift = 0.
    else:
        cover_html = short / 'cover/cover.html'
        if not cover_html.exists():
            raise SystemExit('No cover yet; run cover first (or pass --no-intro)')
        with tempfile.TemporaryDirectory(prefix='vkit-') as tmp:
            page = Path(tmp) / 'intro.html'; page.write_text(cover.intro_page(cover_html.read_text()))
            shoot(page, Path(tmp) / 'frames', 'frames', FPS, INTRO_LEN)
            run([tool('ffmpeg'), '-loglevel', 'error', '-y', '-framerate', FPS, '-i', Path(tmp) / 'frames/f%05d.jpg', '-i', base,
                 '-filter_complex', intro_filter(), '-map', '[v]', '-map', '[au]', '-c:v', 'libx264', '-preset', 'slow', '-crf', 18,
                 '-pix_fmt', 'yuv420p', '-tune', 'animation', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out])
        shift = INTRO_DELAY
    (short / 'upload' / f'{name}.en.srt').write_text(srt(timing, shift))
    loudnorm(out)
    length = duration(out)
    with tempfile.TemporaryDirectory(prefix='vkit-') as tmp:
        shots = []
        for k, t in enumerate(sheet_times(length), 1):
            shots.append(Path(tmp) / f'{k:02d}.png')
            run([tool('ffmpeg'), '-loglevel', 'error', '-y', '-ss', f'{t:.3f}', '-i', out, '-frames:v', 1, shots[-1]])
        contact_sheet(shots, short / 'sheet.jpg', tile=(270, 270) if square else (270, 480))
    print(f'{name}: {length:.3f}s -> {out.relative_to(short)}, upload/{name}.en.srt, sheet.jpg')


def cmd_loudnorm(a):
    for f in a.files:
        loudnorm(f)


def cmd_deliver(a):
    short = Path(a.short).resolve(); name = short.name; dest = Path(a.dest).expanduser().resolve()
    dest.mkdir(parents=True, exist_ok=True)
    files = [(short / 'final' / f'{name}-final.mp4', f'{name}.mp4'), (short / 'upload' / f'{name}.en.srt', f'{name}.en.srt'),
             (short / 'cover/cover.png', 'cover.png'), (short / 'cover/cover.jpg', 'cover.jpg'), (short / 'sheet.jpg', 'contact-sheet.jpg'),
             (short / 'upload/youtube.md', 'youtube.md')]
    for src, target in files:
        if src.exists():
            if (dest / target).exists() and not a.overwrite:
                raise SystemExit(f'{dest / target} exists (pass --overwrite)')
            shutil.copy(src, dest / target); print('copied', target)


def parser():
    p = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    sub = p.add_subparsers(dest='command', required=True)
    s = sub.add_parser('new', help='create a Short folder in a batch'); s.add_argument('batch'); s.add_argument('short'); s.set_defaults(fn=cmd_new)
    s = sub.add_parser('narrate', help='local Kokoro narration take'); s.add_argument('short'); s.add_argument('--voice', required=True)
    s.add_argument('--speed', type=float, default=1.0); s.add_argument('--take'); s.add_argument('--models', help='directory with the pinned Kokoro files')
    s.add_argument('--workspace', help='private workspace with voice/models'); s.set_defaults(fn=cmd_narrate)
    s = sub.add_parser('transcribe', help='macOS on-device word timestamps'); s.add_argument('short'); s.add_argument('--take'); s.add_argument('--locale', default='en-US'); s.set_defaults(fn=cmd_transcribe)
    s = sub.add_parser('align', help='script words on transcript times -> timing.json'); s.add_argument('short'); s.add_argument('--take'); s.set_defaults(fn=cmd_align)
    s = sub.add_parser('build', help='run web/build.py -> stage.html'); s.add_argument('short'); s.set_defaults(fn=cmd_build)
    s = sub.add_parser('stills', help='review stills + contact sheet'); s.add_argument('short'); s.add_argument('times', nargs='*'); s.add_argument('--cols', type=int, default=6); s.set_defaults(fn=cmd_stills)
    s = sub.add_parser('render', help='frames + narration -> final/<short>.mp4'); s.add_argument('short'); s.add_argument('--take'); s.add_argument('--silent', action='store_true'); s.set_defaults(fn=cmd_render)
    s = sub.add_parser('cover', help='feed-safe cover'); s.add_argument('short'); s.add_argument('--art', required=True)
    s.add_argument('line1'); s.add_argument('line2'); s.add_argument('sub'); s.add_argument('--tag'); s.set_defaults(fn=cmd_cover)
    s = sub.add_parser('finish', help='cover intro, SRT, loudness, contact sheet'); s.add_argument('short'); s.add_argument('--no-intro', action='store_true'); s.set_defaults(fn=cmd_finish)
    s = sub.add_parser('loudnorm', help='two-pass -14 LUFS in place'); s.add_argument('files', nargs='+'); s.set_defaults(fn=cmd_loudnorm)
    s = sub.add_parser('deliver', help='copy the reviewed files to a folder'); s.add_argument('short'); s.add_argument('dest'); s.add_argument('--overwrite', action='store_true'); s.set_defaults(fn=cmd_deliver)
    return p


if __name__ == '__main__':
    args = parser().parse_args()
    args.fn(args)
