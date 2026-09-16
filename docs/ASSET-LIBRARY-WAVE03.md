# Asset Library Wave 03

[Asset library wave 02](ASSET-LIBRARY-WAVE02.md) | [Asset expansion (wave 01)](ASSET-EXPANSION.md) | [Docs index](README.md)

Wave 03 adds the three axes that make a batch of Shorts look different from
one another before any new component is drawn: palettes, motion and layout. A
batch of ten episodes that share one palette, one reveal and one frame
arrangement reads as one piece; the same components across 26 palettes, 10
reveals and 18 layouts do not. Everything here is a
design_review study for the offline visual library; nothing is wired into
production scenes, templates or captions, and `production_scene_available`
stays `false`.

Additions live under `tools/visual_library/expansion/wave03/`, in
`tests/test_visual_wave03.py`, this document and one line in the documentation
map. The wave 02 renderer gained recipe support (a recipe bar, `setRecipe`, and
a `renderAt` that draws the active recipe's frame); its behavior without a
recipe file is unchanged. Review builds and QA evidence are written to the
ignored `workspaces/` directory and are not published.

## Palettes

Twelve families, each generated in a dark and a light mode, for 24 token sets
with the same nine roles the wave 01 tokens use (background, surface, line,
ink, muted, accent, accent2, warn, extra) plus the font roles. Together with
the two wave 01 palettes the study offers 26.

| Family | Lead hue | Companions | Warning |
| --- | --- | --- | --- |
| mint | green | cyan, violet | pink |
| sky | blue | indigo, magenta | red |
| amber | yellow | orange, blue | magenta |
| violet | purple | magenta, teal | amber |
| coral | coral | amber, blue | magenta |
| teal | teal | green, amber | pink |
| rose | rose | orange, indigo | yellow |
| olive | olive | amber, blue | magenta |
| indigo | indigo | purple, green | orange |
| sand | sand | lime, blue | magenta |
| cobalt | cobalt | cyan, gold | red |
| magenta | magenta | violet, teal | amber |

`palettes.py` composes each set from four series hues and a tint hue, then
nudges lightness until every rule passes. `palettes.json` is the committed
output; `palettes.py check` fails when the file and the generator disagree, so
a hand edit to the JSON cannot silently survive.

Rules (WCAG 2 contrast ratios and CIE76 color difference):

| Pair | Minimum |
| --- | --- |
| ink over background and over surface | 7.0 |
| muted over background and over surface | 4.5 |
| each series color over background | 4.5 |
| each series color over surface | 3.0 |
| line over background | between 1.25 and 3.5 |
| surface over background | between 1.08 and 2.2 |
| series colors from each other | delta E 18 |
| series colors from ink | delta E 18 |
| series colors from muted | delta E 12 |

The series-over-background minimum of 4.5 covers the components that draw
background-colored text on accent fills (chips, the context window bar, the
confusion cells, the pyramid). Observed minimums across the 24 sets: ink 15.9,
muted 5.5, series 4.5, series delta E 18.1.

To add palettes from an exported set, append a family to `FAMILIES` with its
four hues and tint, run `palettes.py generate` into `palettes.json`, and run
`palettes.py check`. Palettes that cannot satisfy the rules fail generation
instead of shipping dim.

## Motion recipes

Ten recipes in `motion.js`, described in `motion.json`. A recipe is a pure
function of `(items, t, ctx)` over the freshly drawn component graphics. It
never changes data, text or color, and it returns the untouched items once its
duration has elapsed, so the end state of every recipe is the static component.

| Recipe | Duration (s) | What moves |
| --- | --- | --- |
| clip | 1.6 | Left-to-right clip reveal (the wave 02 baseline, now in the SVG) |
| wipe-down | 1.6 | Top-to-bottom clip |
| rise | 2.0 | Elements lift 24 px into place in drawing order |
| stagger | 2.0 | Elements fade in one after another |
| draw-on | 2.2 | Strokes clip in first, fills and text fade after |
| scale-settle | 1.2 | Whole graphic settles from 94% to 100% |
| slide-in | 1.4 | Whole graphic slides in 48 px from the left |
| bands | 1.8 | Four horizontal bands, top first, by element position |
| focus | 2.4 | Everything appears, then non-highlighted elements dim to their final opacity |
| accent-pulse | 2.4 | One-second clip, then one pulse on accent-colored elements |

Count-up numbers were left out on purpose: intermediate frames would show
values that are not the data.

## Layout studies

Eighteen zone maps for the 1080x1920 frame in `layouts.json`, validated by
`layouts.py`. A layout is a list of zones (role, x, y, w, h). Exactly one zone
holds the 824x820 visual, scaled between 1.0 and 1.35 and never down, so the
component's real type sizes survive. Text zones carry the production type
sizes as placeholders (eyebrow 27 px, title 68 px, caption 29 px), which is how
the study proves that each zone height fits its text. Decorative zones (panel,
band, rail, frame, header, progress) draw with the palette tokens. No template,
scene or caption file is touched; nothing here is a logo or a brand element.

Study assumption for the vertical player: content zones stay inside a safe box
of 960x1600 at (60, 180), so the status bar, the caption area and the bottom
controls never cover text or data.

| Layout | Arrangement | Visual scale |
| --- | --- | --- |
| classic | eyebrow, title, visual, caption, progress (the production order) | 1.0 |
| visual-first | visual on top, eyebrow and title below it | 1.0 |
| title-band | full-width surface band behind the title | 1.0 |
| card | bordered card with a header strip around an enlarged visual | 1.1 |
| terminal-chrome | window title bar with three dots above the visual | 1.0 |
| wide | visual scaled to the safe width | 1.165 |
| bottom-visual | title and short caption first, visual low | 1.0 |
| left-rail | vertical accent rail beside the classic zones | 1.0 |
| framed | thin inset border around the classic zones | 1.0 |
| caption-first | setup line, visual, title as the takeaway | 1.0 |
| big-title | three-line title, no eyebrow | 1.0 |
| quote-panel | visual and caption inside one panel | 1.0 |
| tag-row | three tag chips between title and visual | 1.0 |
| numbered | large index number beside the title | 1.0 |
| dual-caption | two caption columns under the visual | 1.0 |
| offset-visual | visual against the right safe edge, vertical label at the left | 1.0 |
| stack-notes | three note lines instead of one caption | 1.0 |
| hero-number | large metric above the title and visual | 1.0 |

Validator rules: every zone inside the frame; text and visual zones inside the
safe box; no two text or visual zones overlap; a title and a caption zone are
required; minimum heights per role (a two-line title needs 155 px); the visual
keeps the slot aspect; no two layouts share a zone map. Placeholder copy
exists only to size the zones and must never ship.

## Study build and QA

```bash
python3 tools/visual_library/expansion/wave03/build.py validate
python3 tools/visual_library/expansion/wave03/build.py build --workspace workspaces/<workspace> --run <run> --approve-write
node tools/visual_library/expansion/wave03/qa.mjs workspaces/<workspace> <run> <playwright/index.mjs> "<chrome binary>" --approve-write
node tools/visual_library/expansion/wave03/layouts-qa.mjs workspaces/<workspace> <run> <playwright/index.mjs> "<chrome binary>" --approve-write
```

The build renders the 55 wave 02 example components with a palette bar of 26
entries and a recipe bar of 10, plus `palettes.html`, a swatch sheet with the
contrast figures per palette, and `layouts.html`, every layout as an unscaled
1080x1920 frame with placeholder zones in the build's palette and no scripts. It refuses an existing run, a public tree or a
missing approval flag, and records the hashes of every implementation file.

QA checks, over a fixed sample of eight components (terminal, histogram,
queue, sequence, dag, bullet, claims, tree):

- every palette: every fill and stroke in the rendered SVG belongs to that
  palette's token set, text is present, the background rectangle is the
  palette background, and the rendered color set differs from every other
  palette's for the same component;
- every recipe: the frame at the end of the timeline is identical to the
  static component, an early frame differs from it, the same time renders
  identically twice with other renders in between, and at 0.8 s every recipe
  differs from every other recipe;
- no page errors and no network requests; exports only under the private run.

Layout QA (`layouts-qa.mjs`) takes three component exports from the study page
(table, sequence, bullet), injects each into every layout's visual zone and
checks the frame as rendered: placeholders at production type sizes do not
overflow their zones, the visual image is the 824x820 export and fills its zone
exactly, no text or visual zones overlap, every content zone stays inside the
safe box, and no page error or network request occurs. It writes one PNG per
layout and component plus a contact sheet under `qa-layouts/`.

Comparisons strip the per-render class and clip-path counters that zrender
adds to its SVG output; rasters use the raw SVG.

## Observed results

| Run | Check | Result |
| --- | --- | --- |
| `l-06` | palettes and motion: 26 palettes, 10 recipes, 8 sample components | PASS, 52 palette exports, 80 motion frames, 0 errors, 0 network |
| `l-06` | layouts: 18 layouts x 3 components at 1080x1920 | PASS, 54 frames, 0 errors, 0 network |

Browser: Chrome 153.0.8010.48 via Playwright 1.62.1, Node 24.19.0. Earlier
runs (`m-01` to `m-03`, `l-01` to `l-05`) are the iteration history: SVG
counters in comparisons, an accent-pulse entrance identical to clip, a visual
zone border that shrank the image box, a tag chip one line too tall, a rotated
label measured unrotated, and a two-line title in a 150 px zone; all fixed and
covered by rules or checks. The palette sheet, palette contact sheet, motion
filmstrip and layout sheet were inspected by the implementation reviewer; that
is not operator approval.

## Counts

| Category | Count |
| --- | --- |
| Palettes generated and validated | 24 (12 families, dark and light) |
| Motion recipes implemented and validated | 10 |
| Layout studies validated | 18 |
| Components available in the study | 55 (wave 02) |
| Combinations of component, palette, recipe and layout | 257,400 |
| Approved by a human reviewer | 0 |

## Limitations

- Palettes are generated in HSL with WCAG and CIE76 checks; they are not
  brand approvals. A production brand substitutes its resolved tokens.
- Light-mode series colors sit near the 4.5 contrast floor by design; on a
  light background they read as deep, saturated colors.
- `draw-on` treats filled polygons as content, not strokes; ribbons in
  `split-flow` fade in rather than draw.
- `focus` only changes what already has a reduced final opacity; components
  with no highlight state fade in and then hold.
- `bands` orders elements by an approximate top edge; text anchored by its
  middle may land one band early.
- Recipes run in the study through ECharts `setOption` per frame; production
  playback needs the integration owner to decide whether to keep that or to
  pre-render frames.
- The safe box is a study assumption, not a measurement of any player.
- `wide` scales the visual to the safe width; a component whose right edge
  carries data can still sit under player controls on some devices.
- Layout placeholders use the palette font, not the production brand font;
  zone heights were verified with Arial at the production sizes.

## Integration checklist (not executed)

1. Decide which palettes the brand approves; map the nine roles onto the
   production token file rather than copying hex values into scenes.
2. Wire a recipe selector into the production renderer with the same
   `(items, t, ctx)` contract, or pre-render the frames with the QA raster
   path.
3. Add a batch diversity rule in the episode picker: no two episodes in a
   batch share the same palette, recipe, layout and component family.
4. Port the layout zone maps into template scenes only after the brand font
   is measured in the same zones; the safe box must be confirmed against the
   target player.
5. Extend production QA with the end-state identity, determinism and
   layout-overflow checks above.
6. Record human approval in the production catalog; nothing in wave 03
   records it.
