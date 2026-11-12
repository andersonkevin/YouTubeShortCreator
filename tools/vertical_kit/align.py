"""Word timing for one Short: the script's written words on the transcript's timestamps, then caption cues.

Input: <short>/script/script.txt, the take's audio.json (paragraph starts) and <short>/intake/transcript-raw.json from
transcribe.swift ({"words": [{"text", "start", "end"}, ...]}). The script spelling always wins on screen; the transcript
only supplies times. Words are matched with difflib on normalised tokens; a mismatched block (the recogniser merged,
split or misheard words) shares its time span evenly across the script words and is printed for review.
Optional script/say.json {"asr": {"heard": "written"}} teaches the matcher recurring mishearings (e.g. a brand name).
Cues: at most ~6 words or 2.8 s, split at . ! ? and paragraph ends, no one- or two-word orphan before a sentence end.
Output: <short>/intake/timing.json {"duration", "words", "cues"}, the input of common.Stage."""
import difflib, json
from pathlib import Path

NUMBERS = {'1st': 'first', '2': 'two', '3': 'three', '5': 'five', '6': 'six', '9': 'nine', '30': 'thirty'}


def core(x):
    return ''.join(c for c in x.lower() if c.isalnum())


def match_times(script_words, asr, aliases=None, report=print):
    table = {**NUMBERS, **{core(k): core(v) for k, v in (aliases or {}).items()}}
    norm = lambda x: table.get(core(x), core(x))
    sm = difflib.SequenceMatcher(None, [norm(x) for x in script_words], [norm(x['text']) for x in asr], autojunk=False)
    times = [None] * len(script_words)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1):
                times[i1 + k] = (asr[j1 + k]['start'], asr[j1 + k]['end'])
        elif i2 > i1:
            t0 = asr[j1]['start'] if j2 > j1 else (asr[j1 - 1]['end'] if j1 else 0.)
            t1 = asr[j2 - 1]['end'] if j2 > j1 else (asr[j1]['start'] if j1 < len(asr) else t0 + .3)
            n = i2 - i1
            for k in range(n):
                times[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
            report(f'block {tag}: {script_words[i1:i2]} ~ {[x["text"] for x in asr[j1:j2]]}')
    return times


def cue_split(words, max_words=5, max_seconds=2.8):
    cues, st = [], 0
    for i, w in enumerate(words):
        last = i == len(words) - 1
        end_here = last or w['text'][-1] in '.!?' or (w['text'][-1] == ':' and i - st >= 2) or words[i + 1]['para'] != w['para']
        tail = next((j for j in range(i + 1, min(i + 3, len(words))) if words[j]['text'][-1] in '.!?:'), None)
        long = i - st >= max_words or w['end'] - words[st]['start'] >= max_seconds
        if end_here or (long and not (tail is not None and tail - st <= 8)) or (w['text'][-1] == ',' and i - st >= 3):
            cues.append({'text': ' '.join(x['text'] for x in words[st:i + 1]), 'start': words[st]['start'], 'end': w['end'], 'firstWord': st, 'lastWord': i})
            st = i + 1
    return cues


def build(paras, sections, asr, duration, aliases=None, report=print):
    script_words, owner = [], []
    for i, p in enumerate(paras):
        for w in p.split():
            script_words.append(w); owner.append(i)
    times = match_times(script_words, asr, aliases, report)
    words = []
    for i, text in enumerate(script_words):
        start, end = times[i]
        begin = sections[owner[i]]['start']
        # A paragraph's first word never starts inside the previous pause.
        if i and owner[i] != owner[i - 1] and start < begin < end and begin - start > .25:
            start = begin
        words.append({'text': text, 'start': round(start, 3), 'end': round(end, 3), 'para': owner[i]})
    return {'duration': duration, 'words': words, 'cues': cue_split(words)}


def main(short, take):
    short = Path(short).resolve()
    audio = json.loads((short / 'takes' / take / 'audio.json').read_text())
    raw = json.loads((short / 'intake/transcript-raw.json').read_text())
    extra = json.loads((short / 'script/say.json').read_text()) if (short / 'script/say.json').exists() else {}
    paras = [p for p in (short / 'script/script.txt').read_text().split('\n\n') if p.strip()]
    timing = build(paras, audio['sections'], raw['words'], audio['duration'], extra.get('asr'))
    (short / 'intake/timing.json').write_text(json.dumps(timing, indent=1))
    for i, c in enumerate(timing['cues']):
        print(i, f"{c['start']:.2f}-{c['end']:.2f}", c['firstWord'], c['text'])
