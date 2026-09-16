# Asset Library Wave 03

[Asset library wave 02](ASSET-LIBRARY-WAVE02.md) | [Asset expansion (wave 01)](ASSET-EXPANSION.md) | [Docs index](README.md)

Wave 03 adds the two axes that make a batch of Shorts look different from one
another before any new component is drawn: palettes and motion. A batch of ten
episodes that share one palette and one reveal reads as one piece; the same
components across 26 palettes and 10 reveals do not. Everything here is a
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

## Study build and QA

```bash
python3 tools/visual_library/expansion/wave03/build.py validate
python3 tools/visual_library/expansion/wave03/build.py build --workspace workspaces/<workspace> --run <run> --approve-write
node tools/visual_library/expansion/wave03/qa.mjs workspaces/<workspace> <run> <playwright/index.mjs> "<chrome binary>" --approve-write
```

The build renders the 35 wave 02 example components with a palette bar of 26
entries and a recipe bar of 10, plus `palettes.html`, a swatch sheet with the
contrast figures per palette. It refuses an existing run, a public tree or a
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

Comparisons strip the per-render class and clip-path counters that zrender
adds to its SVG output; rasters use the raw SVG.

## Observed results

| Run | Palettes | Recipes | Sample | Palette exports | Motion frames | Errors | Network | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `m-03` | 26 | 10 | 8 | 52 | 80 | 0 | 0 | PASS |

Browser: Chrome 153.0.8010.48 via Playwright 1.62.1, Node 24.19.0. Earlier
runs `m-01` and `m-02` are the iteration history (SVG counters and an
accent-pulse entrance identical to clip, both fixed). The palette sheet,
palette contact sheet and motion filmstrip were inspected by the
implementation reviewer; that is not operator approval.

## Counts

| Category | Count |
| --- | --- |
| Palettes generated and validated | 24 (12 families, dark and light) |
| Motion recipes implemented and validated | 10 |
| Components available in the study | 35 (wave 02) |
| Combinations of component, palette and recipe in the study | 9,100 |
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

## Integration checklist (not executed)

1. Decide which palettes the brand approves; map the nine roles onto the
   production token file rather than copying hex values into scenes.
2. Wire a recipe selector into the production renderer with the same
   `(items, t, ctx)` contract, or pre-render the frames with the QA raster
   path.
3. Add a batch diversity rule in the episode picker: no two episodes in a
   batch share the same palette, recipe and component family.
4. Extend production QA with the end-state identity and determinism checks
   above.
5. Record human approval in the production catalog; nothing in wave 03
   records it.
