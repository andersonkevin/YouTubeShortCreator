"""Cover and cover intro for one Short.

cover_page(): a feed-safe 9:16 cover (dark background, licensed artwork in the lower two thirds, a two-line uppercase
headline, an accent rule and a subtitle, the white logo or wordmark, an optional tag). Frame 0 of the delivered video is
this cover exactly, so it can also be picked as the Shorts thumbnail.
intro_page(): the same cover as a 1.6 s layer. 0-0.3 s it holds still; from 0.3 s the items leave with blur while the art
pushes in. vkit.py lays it over the Short, which starts at 0.3 s with its narration, and fades the layer out 0.8-1.6 s.
Colours come from brand.json "cover": {"bg", "glow", "accent", "ink"}; fonts from "cover_font" (else the brand font)."""
import html
from common import DEFAULT_FONT

COVER = {'bg': '#070a10', 'glow': '#12355b', 'accent': '#f4b740', 'ink': '#0b1220'}


def cover_page(brand, art, line1, line2, sub, tag=None):
    c = {**COVER, **brand.get('cover', {})}
    font = brand['cover_font'] or brand['font'] or DEFAULT_FONT
    if brand['logo_white']:
        logo = f'<img class="logo" src="{brand["logo_white"].as_uri()}" alt="">'
    else:
        logo = f'<span class="logo wordmark">{html.escape(brand["name"])}</span>'
    tag_html = f'<span class="news">{html.escape(tag)}</span>' if tag else ''
    e = html.escape
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:CoverFont;src:url("{font.as_uri()}");font-weight:100 900}}
html,body{{margin:0;width:1080px;height:1920px;overflow:hidden;background:{c['bg']}}}
main{{position:relative;width:1080px;height:1920px;overflow:hidden;background:radial-gradient(120% 60% at 50% 78%,{c['glow']} 0%,color-mix(in srgb,{c['glow']} 35%,{c['bg']}) 45%,{c['bg']} 75%)}}
.art{{position:absolute;left:0;right:0;bottom:0;height:1240px;background:url("{art.as_uri()}") center/cover no-repeat;filter:saturate(1.15) brightness(.82)}}
.tint{{position:absolute;left:0;right:0;bottom:0;height:1240px;background:linear-gradient({c['bg']} 0%,color-mix(in srgb,{c['bg']} 55%,transparent) 22%,color-mix(in srgb,{c['glow']} 18%,transparent) 55%,color-mix(in srgb,{c['bg']} 35%,transparent) 100%)}}
.logo{{position:absolute;left:100px;top:230px;width:284px}}
.wordmark{{width:auto;font:800 52px/56px CoverFont;color:#fff;letter-spacing:-.01em;white-space:nowrap}}
.news{{position:absolute;right:100px;top:232px;height:56px;padding:0 22px;border-radius:8px;background:{c['accent']};color:{c['ink']};font:700 30px/56px CoverFont;letter-spacing:.08em}}
h1{{position:absolute;left:100px;right:100px;top:370px;margin:0;font:700 88px/1.02 CoverFont;color:#fff;text-transform:uppercase;letter-spacing:-.01em}}
h1 span{{display:block;white-space:nowrap}}
.rule{{position:absolute;left:100px;top:584px;width:96px;height:10px;border-radius:5px;background:{c['accent']}}}
.sub{{position:absolute;left:100px;right:100px;top:624px;font:600 36px/1.25 CoverFont;color:#fff;text-transform:uppercase;letter-spacing:.02em}}
</style></head><body><main><div class="art"></div><div class="tint"></div>{logo}{tag_html}
<h1><span>{e(line1)}</span><span>{e(line2)}</span></h1><i class="rule"></i><div class="sub">{e(sub)}</div>
</main><script>window.setTime=()=>true;</script></body></html>'''


INTRO_CSS = '<style>.logo,.news,h1 span,.rule,.sub{will-change:transform,opacity,filter}.logo{z-index:30}.news{z-index:31}</style>'
INTRO_JS = '''<script>
const HOLD=.3,EXIT=1.0,cl=v=>Math.max(0,Math.min(1,v)),eio=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2,Q=s=>[...document.querySelectorAll(s)];
const art=document.querySelector('.art'),tint=document.querySelector('.tint'),logo=document.querySelector('.logo'),news=document.querySelector('.news'),
 lines=Q('h1 span'),rule=document.querySelector('.rule'),sub=document.querySelector('.sub');
const out=(e,t,a,d,dy)=>{const p=eio(cl((t-a)/d));e.style.opacity=1-p;e.style.transform=`translateY(${(dy*p).toFixed(1)}px)`;e.style.filter=p>0?`blur(${(12*p).toFixed(2)}px)`:'none';};
window.setTime=t0=>{
 const t=t0<HOLD?0:EXIT+(t0-HOLD);
 if(news)out(news,t,1.0,.45,-30);
 lines.forEach((l,k)=>out(l,t,1.1+.14*k,.55,-70));
 {const p=eio(cl((t-1.3)/.45));rule.style.transform=`scaleX(${1-p})`;rule.style.transformOrigin='left';rule.style.opacity=1-p;}
 out(sub,t,1.35,.5,40);
 {const p=eio(cl((t-1.0)/1.6));art.style.transform=`scale(${(1+.16*p).toFixed(4)})`;art.style.transformOrigin='50% 100%';art.style.filter=`saturate(1.15) brightness(${(.82+.4*p).toFixed(3)})`;
  tint.style.transform=art.style.transform;tint.style.transformOrigin='50% 100%';}
 out(logo,t,1.2,.5,-30);
 return true;};
window.setTime(0);</script>'''


def intro_page(cover_html):
    return cover_html.replace('<script>window.setTime=()=>true;</script>', '').replace('</head>', INTRO_CSS + '</head>').replace('</body>', INTRO_JS + '</body>')
