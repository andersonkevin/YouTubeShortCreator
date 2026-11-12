"""Scene builder for the vertical kit: 9:16 Shorts (1080x1920) and, with square=True, 1:1 videos (1080x1080).

A Short's `web/build.py` imports this module, adds scenes timed to the narration and calls `S.write(...)`, which writes
`web/stage.html`. The page is driven frame by frame by stage.js (window.setTime) and captured by shoot.mjs.
Branding comes from the batch's `brand.json` (see docs/VERTICAL-KIT.md); nothing brand-specific lives in this file."""
import html, json, math, re
from pathlib import Path

KIT = Path(__file__).resolve().parent
HOME = KIT.parents[1]
ICONS = json.loads((KIT / 'icons.json').read_text())
DEFAULT_FONT = HOME / 'tools/font_library/vendor/fonts/geist-variable-19f9c925.woff2'  # Geist, OFL-1.1, from the pinned catalog


def load_brand(batch):
    """brand.json in the batch folder. Paths inside it are relative to the batch. Every key is optional."""
    batch = Path(batch)
    data = json.loads((batch / 'brand.json').read_text()) if (batch / 'brand.json').exists() else {}
    brand = {'name': 'Your Channel', 'logo': None, 'logo_white': None, 'font': None, 'font_family': None, 'theme': None,
             'cta': 'Follow for more', 'url': '', 'tag': 'NEWS', 'cover_font': None, **data}
    for key in ('logo', 'logo_white', 'font', 'theme', 'cover_font'):
        if brand[key]:
            path = (batch / brand[key]).resolve()
            if not path.is_file():
                raise SystemExit(f'brand.json: missing file for {key}: {brand[key]}')
            brand[key] = path
    return brand


def font_face(brand, weights='100 900'):
    """@font-face for the brand font (or the default Geist) under the family name the theme uses."""
    path = brand['font'] or DEFAULT_FONT
    family = brand['font_family'] or ('Geist' if not brand['font'] else 'Brand')
    fmt = {'.woff2': 'woff2', '.woff': 'woff', '.otf': 'opentype'}.get(path.suffix, 'truetype')
    css = f'@font-face{{font-family:"{family}";src:url("{path.as_uri()}") format("{fmt}");font-weight:{weights}}}'
    return css + (f':root{{--font:"{family}",system-ui,sans-serif}}' if brand['font'] else '')


def wordmark(brand, cls):
    """The brand logo image, or the channel name set as a wordmark when brand.json has no logo."""
    if brand['logo']:
        return f'<img class="{cls}" src="{brand["logo"].as_uri()}" alt="{html.escape(brand["name"])}">'
    return f'<span class="{cls} v-wordmark">{html.escape(brand["name"])}</span>'


# Shared SVG paint servers (theme colours): fill="url(#vg-brand)", stroke="url(#vg-flow)", filter="url(#vf-glow)".
SVG_DEFS = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
            '<linearGradient id="vg-brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--brand-2)"/><stop offset=".55" stop-color="var(--brand)"/><stop offset="1" stop-color="var(--brand-deep)"/></linearGradient>'
            '<linearGradient id="vg-soft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--soft-2)"/><stop offset="1" stop-color="var(--soft-3)"/></linearGradient>'
            '<linearGradient id="vg-accent" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent-2)"/><stop offset="1" stop-color="var(--accent-3)"/></linearGradient>'
            '<linearGradient id="vg-flow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--soft)"/><stop offset="1" stop-color="var(--brand)"/></linearGradient>'
            '<linearGradient id="vg-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--soft)" stop-opacity=".45"/><stop offset="1" stop-color="var(--soft)" stop-opacity="0"/></linearGradient>'
            '<filter id="vf-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            '<filter id="vf-soft" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="var(--brand)" flood-opacity=".28"/></filter>'
            '</defs></svg>')


class Stage:
    """One Short. `ep` is the Short folder (with intake/timing.json); its parent is the batch (with brand.json)."""
    def __init__(self, ep):
        self.ep = Path(ep).resolve()
        self.brand = load_brand(self.ep.parent)
        T = json.loads((self.ep / 'intake/timing.json').read_text())
        self.words, self.cues, self.duration = T['words'], T['cues'], T['duration']
        self.scenes = []
    def c(self, i): return self.cues[i]['start']
    def w(self, i): return self.words[i]['start']
    def scene(self, first_cue, cls, body):
        """Add a scene that starts with caption cue `first_cue` and lasts until the next scene starts."""
        self.scenes.append((first_cue, cls, body))
    def kin(self, a, b, lead=.08, grad=None):
        """Kinetic heading from narration words a..b, each word rising as it is spoken; `grad` = word indices in the gradient."""
        def txt(k):
            t = self.words[k]['text'].rstrip(':,') if k == b else self.words[k]['text']
            return t[:1].upper() + t[1:] if k == a else t
        return ' '.join(f'<span class="w"><i{at(self.w(k) - lead, "word", .45)}{" class=\"grad-text\"" if grad and k in grad else ""}>{html.escape(txt(k))}</i></span>' for k in range(a, b + 1))
    def close(self, first_cue, cta=None, url=None):
        """Closing scene: logo (or wordmark) and the call to action from brand.json."""
        b = self.brand; cta = cta or b['cta']; url = b['url'] if url is None else url
        self.scene(first_cue, 's-close', f'<div class="close-mark"{at(self.c(first_cue) + .1, "blur", .8)}>{wordmark(b, "close-logo")}</div>'
                   f'<div class="close-cta"{at(self.c(first_cue) + .6, "rise", .5)}><span class="btn shine">{html.escape(cta)} {icon("arrow-right")}</span>'
                   + (f'<span class="url">{html.escape(url)}</span>' if url else '') + '</div>')
    def write(self, css, title, news=False, square=False):
        """Write web/stage.html. `css` is the Short's own stylesheet (relative to web/); news=True shows the brand tag."""
        starts = [0.] + [self.c(f) for f, _, _ in self.scenes[1:]]
        bounds = list(zip(starts, starts[1:] + [self.duration]))
        cap = [{'start': q['start'], 'end': q['end'], 'words': [{'t': x['text'], 's': x['start'], 'e': x['end']} for x in self.words[q['firstWord']:q['lastWord'] + 1]]} for q in self.cues]
        b = self.brand
        links = [KIT / 'vbase.css'] + ([KIT / 'vsquare.css'] if square else []) + ([b['theme']] if b['theme'] else [])
        page = [f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{html.escape(title)}</title>',
                f'<style>{font_face(b)}</style>',
                ''.join(f'<link rel="stylesheet" href="{p.as_uri()}">' for p in links) + f'<link rel="stylesheet" href="{css}"></head><body><main id="main">{SVG_DEFS}',
                '<div class="v-amb"><i></i><i></i><i></i></div>',
                wordmark(b, 'v-logo') + (f'<span class="v-news">{html.escape(b["tag"])}</span>' if news else '') + '<div class="v-progress"><span></span></div>']
        for (first, cls, body), (a, z) in zip(self.scenes, bounds):
            page.append(f'<div class="v-scene {cls}" data-start="{a:.3f}" data-end="{z:.3f}"><div class="v-cam">{skeleton(body, a)}</div></div>')
        page += ['<div class="v-caption" aria-hidden="true"></div></main>',
                 f'<script>window.STAGE={json.dumps({"duration": self.duration, "captions": cap})};</script><script src="{(KIT / "stage.js").as_uri()}"></script></body></html>']
        (self.ep / 'web/stage.html').write_text('\n'.join(page))
        print('stage.html', len(self.scenes), 'scenes', [f'{a:.2f}-{z:.2f}' for a, z in bounds])


def skeleton(body, start, step=.15):
    """No empty screen: every card and photo box of a scene enters in a quick cascade from the scene start
    (start + .1, + .25, ...) unless it is timed earlier; what is inside each card keeps its word timing."""
    hits = [(float(m.group(1)), m.start(1), m.end(1)) for m in re.finditer(r'<div class="k-(?:card|photo)[^"]*" style="[^"]*" data-at="([\d.]+)"', body)]
    order = sorted(range(len(hits)), key=lambda i: hits[i][0])
    new = {i: min(hits[i][0], start + .1 + step * n) for n, i in enumerate(order)}
    for i in sorted(new, key=lambda i: -hits[i][1]):
        body = body[:hits[i][1]] + f'{new[i]:.3f}' + body[hits[i][2]:]
    return body


def icon(name, cls='ic'):
    """Inline Lucide icon from icons.json (ISC), coloured by currentColor."""
    return ICONS['svg'].replace('<svg ', f'<svg class="{cls}" aria-hidden="true" ', 1) + ICONS['icons'][name] + '</svg>'
def at(t, fx='rise', dur=None):
    """Entrance attributes: the element appears at t seconds with effect fx (rise, word, pop, spring, blur, slide-l, slide-r,
    mask, zoom, draw, grow, growy, type, flip, fade)."""
    return f' data-at="{t:.3f}" data-fx="{fx}"' + (f' data-dur="{dur}"' if dur else '')
def on(t0, t1=None):
    """Highlight window: the element gets .is-on (and --on 0..1) from t0 until t1."""
    return f' data-on="{t0:.3f}"' + (f' data-off="{t1:.3f}"' if t1 is not None else '')
def count(t, value, dec=0, pre='', suf='', start=0, dur=.9):
    """Animated number: <b{count(...)}>...</b>. Counts from `start` to `value` over `dur` seconds beginning at t."""
    return f' data-count="0:{start},{t:.3f}:{value}" data-cd="{dur}" data-dec="{dec}" data-pre="{html.escape(pre)}" data-suf="{html.escape(suf)}"'

# Components. Coordinates are scene pixels inside the 880x1180 camera; every component animates itself from t.
def card(x, y, w, h, inner, t, cls='glass', fx='spring', style=''):
    """A positioned surface (.glass, .glass-dark, .grad-accent ...) that enters with `fx` at t."""
    return f'<div class="k-card {cls}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;{style}"{at(t, fx, .6)}>{inner}</div>'

def bars(x, y, w, h, items, t, step=.18, unit='', dec=0, vmax=None):
    """Vertical bar chart. items = [(label, value, 'brand'|'soft'|'accent')]; bars spring up and their values count."""
    vmax = vmax or max(v for _, v, _ in items); n = len(items); gap = 34; bw = (w - gap * (n - 1)) / n
    out = f'<div class="k-bars" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px">'
    for k, (lab, v, tone) in enumerate(items):
        bh = (h - 120) * v / vmax; tk = t + step * k
        out += (f'<div class="k-bar" style="left:{k * (bw + gap):.0f}px;width:{bw:.0f}px;height:{bh:.0f}px"><i class="k-{tone}"{at(tk, "growy", .9)}></i>'
                f'<b{count(tk, v, dec, suf=unit)}{at(tk + .2, "rise", .4)}>0</b></div><span class="k-blab" style="left:{k * (bw + gap):.0f}px;width:{bw:.0f}px">{lab}</span>')
    return out + '</div>'

def line_chart(x, y, w, h, pts, t, dur=1.4, area=True, pid='k-line'):
    """Line with a gradient area and a glowing head that rides the line. pts = values 0..1 (bottom..top)."""
    xs = [w * k / (len(pts) - 1) for k in range(len(pts))]; ys = [h - h * p for p in pts]
    d = 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in zip(xs, ys))
    fill = f'<path d="{d} L{w} {h} L0 {h} Z" fill="url(#vg-area)"{at(t + dur * .6, "fade", .6)}/>' if area else ''
    return (f'<svg class="full" style="left:{x}px;top:{y}px" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{fill}'
            f'<path id="{pid}" d="{d}" class="k-line" pathLength="1"{at(t, "draw", dur)}/>'
            f'<circle r="14" class="k-head" filter="url(#vf-glow)" data-flow="#{pid}" data-at="{t:.3f}" data-period="{dur:.3f}" data-once="1" data-trail="5"/></svg>')

def donut(cx, cy, r, pct, t, label='', dur=1.2, stroke=64):
    """Ring that fills to pct (0..100) with a counting centre value."""
    c = 2 * math.pi * r
    return (f'<svg class="full" width="880" height="1180" viewBox="0 0 880 1180"><circle cx="{cx}" cy="{cy}" r="{r}" class="k-ring0" style="stroke-width:{stroke}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" class="k-ring" style="stroke-width:{stroke};stroke-dasharray:{pct:.2f} 100" pathLength="100" transform="rotate(-90 {cx} {cy})"{at(t, "draw", dur)}/></svg>'
            f'<div class="k-donut" style="left:{cx - r}px;top:{cy - 70}px;width:{2 * r}px"><b{count(t, pct, 0, suf="%")}>0%</b><span>{label}</span></div>')

def connector(d, t, pid, dur=.6, tokens=2, period=1.6, cls='k-conn'):
    """A drawn path with comet tokens flowing along it after it appears."""
    toks = ''.join(f'<circle r="11" class="k-tok" data-flow="#{pid}" data-at="{t + dur:.3f}" data-period="{period}" data-phase="{k / tokens:.2f}" data-trail="4"/>' for k in range(tokens))
    return f'<path id="{pid}" d="{d}" class="{cls}" pathLength="1"{at(t, "draw", dur)}/>{toks}'

def photo(x, y, w, h, src, t, fx='zoom', pos='50% 50%', tag='', drift=1.0):
    """Image box: a framed photo that enters with `fx`, then drifts slowly (Ken Burns) for the rest of the scene.
    `src` is relative to the batch `img/` folder; `tag` is an optional accent label inside the frame."""
    lab = f'<span class="k-ptag"{at(t + .5, "rise", .4)}>{tag}</span>' if tag else ''
    return (f'<div class="k-photo" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;--dr:{drift}"{at(t, fx, .7)}>'
            f'<img src="../../img/{src}" style="object-position:{pos}" alt="">{lab}</div>')
