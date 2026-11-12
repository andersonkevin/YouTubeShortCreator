"""Narration for one Short with the optional local Kokoro voice (tools/voice.py, docs/VOICE.md).

Reads <short>/script/script.txt (paragraphs separated by a blank line) and writes a new take, never overwriting one:
<short>/takes/<take>/narration.wav (24 kHz mono PCM) and audio.json (paragraph times, duration, listening_review: pending).
Paragraphs are joined by 450 ms pauses and the take ends with a closing silence rounded up to whole frames, so the
closing scene has room. The script keeps the written forms (they become the captions); only the spoken text is changed:
built-in rules for %, Nx and $NM/$NB, a small glossary of acronyms, and an optional script/say.json:
    {"phrases": {"SOC 2": "sock two"}, "say": {"ERP": "E R P"}}
`phrases` replace text anywhere; `say` replaces a word prefix ("ERP," -> "E R P,"). No network, no downloads."""
import json, re, sys, time, wave
from pathlib import Path

HOME = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HOME)); sys.path.insert(0, str(HOME / 'tools'))
import voice  # noqa: E402

RATE, FPS, GAP, TAIL = 24000, 30, .45, 1.5
SAY = {'NotebookLM': 'Notebook L M', 'LLMs': 'L L Ms', 'LLM': 'L L M', 'GPUs': 'G P Us', 'GPU': 'G P U', 'AI': 'A I', 'API': 'A P I',
       'SaaS': 'sass', 'CISO': 'see-so', 'HIPAA': 'hippa', 'EHR': 'E H R'}
SCALE = {'K': 'thousand', 'M': 'million', 'B': 'billion'}


def spoken(text, phrases=None, say=None):
    """Spoken form of one paragraph."""
    for k, v in (phrases or {}).items():
        text = text.replace(k, v)
    text = re.sub(r'\$(\d+(?:\.\d+)?)\s?([KMB])\b', lambda m: f'{m.group(1)} {SCALE[m.group(2)]} dollars', text)
    text = re.sub(r'(\d+(?:\.\d+)?)%', r'\1 percent', text)
    text = re.sub(r'\b(\d+(?:\.\d+)?)x\b', r'\1 times', text)
    table = {**SAY, **(say or {})}
    keys = sorted(table, key=len, reverse=True)
    return ' '.join(next((table[k] + w[len(k):] for k in keys if w.startswith(k)), w) for w in text.split())


def paragraphs(short):
    return [p.strip() for p in (short / 'script/script.txt').read_text().split('\n\n') if p.strip()]


def main(short, voice_name, speed=1.0, take='take01', models=None, workspace=None):
    short = Path(short).resolve()
    target = short / 'takes' / take
    if target.exists():
        raise SystemExit(f'{take} exists; choose a new take name')
    extra = json.loads((short / 'script/say.json').read_text()) if (short / 'script/say.json').exists() else {}
    root = Path(workspace).resolve() if workspace else short
    paths, _ = voice.verify_models(voice.models_dir(root, models))
    engine, info = voice.load_engine(paths)
    if voice_name not in engine.get_voices():
        raise SystemExit(f'Unknown voice {voice_name}')
    pcm, sections, cursor, started = [], [], 0, time.perf_counter()
    texts = paragraphs(short)
    for i, text in enumerate(texts):
        chunk, _ = voice.render(engine, spoken(text, extra.get('phrases'), extra.get('say')), voice_name, speed)
        sections.append({'index': i, 'start': cursor / RATE, 'speech_end': (cursor + len(chunk)) / RATE, 'text': text})
        pcm.append(chunk.tobytes()); cursor += len(chunk)
        if i < len(texts) - 1:
            pcm.append(b'\0\0' * round(GAP * RATE)); cursor += round(GAP * RATE)
    speech = cursor
    frame = RATE // FPS
    total = -(-(speech + round(TAIL * RATE)) // frame) * frame
    pcm.append(b'\0\0' * (total - speech))
    target.mkdir(parents=True)
    with wave.open(str(target / 'narration.wav'), 'wb') as out:
        out.setnchannels(1); out.setsampwidth(2); out.setframerate(RATE); out.writeframes(b''.join(pcm))
    (target / 'audio.json').write_text(json.dumps({'voice': voice_name, 'speed': speed, 'sections': sections, 'speech_end': speech / RATE,
        'duration': total / RATE, 'generation_seconds': round(time.perf_counter() - started, 1), 'engine': info,
        'listening_review': 'pending'}, indent=1))
    print(f'{take}: speech {speech / RATE:.2f}s, total {total / RATE:.3f}s ({total // frame} frames)')
