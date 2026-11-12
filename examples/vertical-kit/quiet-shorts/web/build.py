"""Demo Short for the vertical kit: why quiet Shorts stay quiet (about 23 s, five scenes).
Run with `python3 tools/vertical_kit/vkit.py build examples/vertical-kit/quiet-shorts` (word indices from intake/timing.json)."""
import os, sys
from pathlib import Path
sys.path.insert(0, os.environ['VKIT_HOME'])
from common import Stage, at, card, connector, count, icon

S = Stage(Path(__file__).resolve().parents[1])
w = S.w


def wave(n, amp, t, tone):
    """A live waveform: n bars whose heights follow the --t clock in CSS; amp scales the level."""
    bars = ''.join(f'<i style="--k:{k};--a:{amp}"></i>' for k in range(n))
    return f'<div class="qs-wave qs-{tone}"{at(t, "fade", .4)}>{bars}</div>'


# 1. Hook: the feed next to a quiet Short.
S.scene(0, 'qs-1', f'<h1 class="vh">{S.kin(0, 5, grad={5})}</h1>'
        + card(0, 330, 880, 380, f'<span class="qs-lab">{icon("audio-lines")} Feed</span>{wave(26, 1, w(1), "brand")}', w(1))
        + card(0, 760, 880, 380, f'<span class="qs-lab">{icon("smartphone")} Your Short</span>{wave(26, .4, w(4), "soft")}'
               f'<span class="qs-tag"{at(w(5), "pop", .5)}>quieter</span>', w(3)))

# 2. The rule: loud uploads come down to the target, quiet ones stay where they are.
y = lambda db: (-6 - db) / 24 * 900 + 200
ticks = ''.join(f'<span class="qs-tick" style="top:{y(v) - 18:.0f}px">{v}</span>' for v in (-6, -10, -14, -18, -22, -26, -30))
S.scene(2, 'qs-2', f'<h2 class="vh qs-h2"{at(S.c(2) + .05, "rise")}>The feed target</h2>'
        f'<div class="qs-scale"{at(S.c(2) + .15, "fade", .4)}>{ticks}<i class="qs-rail"></i></div>'
        f'<div class="qs-target" style="top:{y(-14):.0f}px"{at(w(17), "grow", .6)}><b>-14 LUFS</b></div>'
        f'<div class="qs-dot qs-loud" style="top:{y(-8) - 50:.0f}px" data-ty="0:0,{w(15):.3f}:{y(-14) - y(-8):.0f}" data-tyd=".9"{at(w(13), "spring", .6)}>'
        f'{icon("trending-down")}<span>Loud upload</span></div>'
        f'<div class="qs-dot qs-quiet" style="top:{y(-22) - 50:.0f}px"{at(w(23), "spring", .6)}>{icon("audio-lines")}<span>Quiet upload</span>'
        f'<em{at(w(21), "pop", .5)}>{icon("ban")} never raised</em></div>')

# 3. The measurement and what 8 dB means in level.
S.scene(5, 'qs-3', card(0, 0, 880, 470, f'<span class="qs-k">Test Short</span><b class="qs-big"{count(w(29), -22, suf=" LUFS", dur=.8)}>0</b>', S.c(5), cls='glass-dark')
        + card(0, 530, 880, 620,
               f'<span class="qs-k qs-k2">Level next to the feed</span>'
               f'<div class="qs-row" style="top:150px"><span>Feed</span><i class="qs-fill qs-full"{at(w(31), "grow", .8)}></i></div>'
               f'<div class="qs-row" style="top:300px"><span>Test Short</span><i class="qs-fill qs-part"{at(w(34), "grow", .8)}></i></div>'
               f'<div class="qs-gap"{at(w(35), "rise", .5)}><b>8 dB</b> quieter, about 40% of the level</div>', S.c(6)))

# 4. The fix: measure, normalise, ready.
nodes = [('activity', 'Measure', 'first pass', w(40)), ('audio-lines', 'Normalise', 'linear, -1.5 dB peak', w(42)), ('circle-check', '-14 LUFS', 'ready to upload', w(46))]
flow = ''.join(card(80, 40 + 400 * k, 720, 250, f'<span class="tile-ic">{icon(ic)}</span><div><b>{a}</b><span>{b}</span></div>', t, cls='glass' + (' glow' if k == 2 else ''))
               for k, (ic, a, b, t) in enumerate(nodes))
S.scene(7, 'qs-4', flow + '<svg class="full" width="880" height="1180" viewBox="0 0 880 1180">'
        + connector('M440 290 L440 440', w(41), 'qs-c1', cls='k-conn') + connector('M440 690 L440 840', w(45), 'qs-c2', cls='k-conn') + '</svg>')

S.close(9)
S.write('quiet-shorts.css', 'Why quiet Shorts stay quiet')
