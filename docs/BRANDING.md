# Branding

[Docs index](README.md) · [Layout gallery](GALLERY.md)

## The First Conversation

Onboarding asks the following before creating files:

| Preference | Purpose | Default |
| --- | --- | --- |
| Channel name | Logo/wordmark and image alternative text | Required |
| Narration language | Episode contract and speech locale | `en-US` |
| Audience | Editorial context for the operator or assistant | Developers and AI builders |
| Tone | Editorial context, not automated rewriting | Clear, practical, technically accurate |
| Scene count | Initial episode scene selection | 3; choose 3 or 4 |
| Palette | Background and primary/secondary accent colors; 15 presets or custom | Violet |
| Logo | Imported PNG/JPEG or local generated mark | Generated wordmark |
| Display/body/mono fonts | Typography for text, code and covers | Available local font suggestions |

Enter `CREATE` to authorize workspace creation. `init --approve-write` skips that
last confirmation, **not** the questions or the later brand approval.

## Palettes

| Preset | Background | Primary accent | Secondary accent |
| --- | --- | --- | --- |
| Violet | `#140b30` | `#beda61` | `#7acbd7` |
| Graphite | `#111315` | `#b6ee64` | `#70d7e5` |
| Forest | `#0b2019` | `#f2ce69` | `#96d6f3` |
| mint-dark | `#09100e` | `#aceccc` | `#acdcec` |
| sky-dark | `#0a0e12` | `#acd1ec` | `#b2acec` |
| amber-dark | `#14110b` | `#ecdcac` | `#ecc1ac` |
| violet-dark | `#120c16` | `#ccacec` | `#efb9dd` |
| coral-dark | `#100b09` | `#ecbcac` | `#ecdcac` |
| teal-dark | `#0a1212` | `#acece6` | `#acecbc` |
| rose-dark | `#140b0e` | `#ecacc7` | `#ecc1ac` |
| olive-dark | `#12160c` | `#d7ecac` | `#ecd7ac` |
| indigo-dark | `#090910` | `#acacec` | `#e5c1f0` |
| sand-dark | `#120f0a` | `#ecd1ac` | `#d1ecac` |
| cobalt-dark | `#0b0e14` | `#acc1ec` | `#ace1ec` |
| magenta-dark | `#160c15` | `#ecacec` | `#cebdef` |
| Custom | Three operator-supplied hex values | Six-digit hex only | Six-digit hex only |

These are dark themes. The twelve `-dark` presets are the dark families generated
by the [wave 03 palette study](ASSET-LIBRARY-WAVE03.md), mapped onto the three
brand roles (background, accent, second accent); a test keeps them equal to the
study file. `python3 ysc.py palettes` prints every preset with its measured
contrast ratios. White/background contrast must be at least 7:1; both accent
colors need at least 4.5:1 against the background. The checks prevent obviously
unreadable choices; they do not certify the accessibility of a finished video.
Thumbnails retain a black type zone and use your brand's primary accent.

## Logo Preparation

Use a high-contrast logo suitable for a dark background. Transparent PNG is the
most predictable format. JPEG is accepted but retains its opaque background.
Onboarding does not remove backgrounds or redraw an imported logo.

- Accepted dimensions: both at least 32 px, neither above 4096 px.
- Accepted size: up to 30 MB, subject to decoder validity.
- Imported marks are contained without stretching and normalized to a PNG.
- Video logo zone: 284×90 px, positioned at x=100, y=145 on a 1080×1920 canvas.
- Thumbnail logo zone: up to 300×90 px, positioned at x=80, y=90.

Generated marks use the chosen font: a wordmark, or a two-initial monogram beside
the name. These are simple local graphics, not AI illustrations or trademark searches.
Names are limited to 40 characters and a single line. Shorter names read better.

## Fonts and Rights

Provide three valid `.ttf` or `.otf` files. Font collections (`.ttc`) are not accepted.
The display font is used for headings/captions, the body font for supporting copy,
and the mono font for code. Fonts must contain glyphs for your language.

**Being installed on a computer does not establish permission for every use.**
The workflow copies fonts into private assets and loads them through CSS `@font-face`
for local capture. Check permission for that use, not just desktop text editing.
Openly licensed, self-supplied fonts may simplify the rights review; no font is
downloaded or bundled automatically. See [Licensing](LICENSING.md).

## Preview and Approval

Open `workspace/brand/preview.png` locally. Review name, logo recognition, palette,
font legibility and spelling. It is a brand swatch/layout preview, not a complete
episode: the preview includes illustrative three-scene copy even if your default
scene count is four. The generated episode uses the saved scene-count preference.

```bash
python3 ysc.py brand-approve --approve-write
```

Approval binds the brand, generated CSS, font/logo assets, preview and implementation
lock. The preview is included in the brand hash; do not replace it after approval.

To revise even an unapproved brand, the simplest supported path is a new onboarding
workspace. Editing `brand.json` alone does not regenerate its CSS or preview.
For another channel or brand version:

```bash
python3 ysc.py --workspace workspaces/channel-v2 init
python3 ysc.py --workspace workspaces/channel-v2 brand-approve --approve-write
python3 ysc.py --workspace workspaces/channel-v2 configure --approve-write
```

Do not copy another channel's approval record. Keep approved workspaces unchanged
while production is running. Brand approval does not approve an episode or its publication.
