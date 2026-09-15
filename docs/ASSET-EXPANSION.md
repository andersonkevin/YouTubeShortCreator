# Visual Asset Expansion

[Visual library](VISUAL-LIBRARY.md) | [Visual director](assistant/VISUAL-DIRECTOR.md) | [Docs index](README.md)

A design_review asset pack for AI-assisted programming and AI Shorts, built on
the offline visual library. Everything here is an asset study: it reuses the
library's validators, pinned vendor files, gallery template and ECharts bundle,
and adds nothing to the v1 episode contract. No production renderer, capture path,
media backend, template CSS or vendor manifest was changed.

Base commit `6ffd3cb` (the committed
HEAD; the main checkout's uncommitted adapter work is a read-only reference).
The implementation lives under `tools/visual_library/expansion/`, with dedicated
tests and this document. The documentation refresh also updates entry pages,
image provenance and documentation tests. Previews and review media are written
to the ignored `workspaces/` directory.

| Agent loop | Retrieval | Validation gate | Request trace |
| :---: | :---: | :---: | :---: |
| <a href="images/expansion-agent-loop.png"><img src="images/expansion-agent-loop.png" alt="Agent loop component with four steps around an exit condition" width="200"></a> | <a href="images/expansion-retrieval.png"><img src="images/expansion-retrieval.png" alt="Retrieval component with a query, ranked chunks and a cited answer" width="200"></a> | <a href="images/expansion-gate.png"><img src="images/expansion-gate.png" alt="Validation gate component with pass and fail branches" width="200"></a> | <a href="images/expansion-trace.png"><img src="images/expansion-trace.png" alt="Nested request trace component drawn as a waterfall" width="200"></a> |

*Unmodified 824x820 raster exports from the final examples QA run, study palette.
Provenance for these four images is recorded in [the image manifest](images/manifest.json).*

## Gap Audit

The committed baseline ships 40 Lucide icons, 6 two-icon compositions, 8 chart
forms, 3 widgets (flow, metric, comparison) and 12 v1 layouts. Mapped against the
topics an AI-programming channel explains, the gaps were structural, not
cosmetic: nothing showed a cycle, a branch with two outcomes, a ranked list with
a consequence, a nested trace, a typed contract, a bounded budget or a state
machine. The 12 layouts cover code, policy, approval and evidence well; they do
not cover retries, caches, routing, deployment stages or before/after deltas.

| Capability | Baseline | Expansion |
| --- | --- | --- |
| Linear process | visual:flow, code-pipeline layout | unchanged |
| Cycle with an exit | none | expansion:agent-loop (ring, ladder) |
| Ranked retrieval with citation | retrieval-checks layout (fixed copy) | expansion:retrieval (scored, plain) |
| One check, two outcomes | approval-gate layout (single path) | expansion:gate (vertical, horizontal) |
| Retries, backoff, dead letter | none | expansion:retry-queue |
| Cache and memory tiers | none | expansion:tiers (stack, row) |
| Model routing and escalation | none | expansion:router (fan, list) |
| Typed API or tool contract | code-policy layout (YAML text) | expansion:contract (request, response) |
| Deployment stages with gates | none | expansion:stages (rail, column) |
| Architecture layers | none | expansion:stack (bands, blocks) |
| Annotated code | code-* layouts (active line) | expansion:annotated-code (footnotes, inline) |
| Token or time budget | visual:metric (one value) | expansion:budget (bar, ring) |
| State transitions | none | expansion:states (linear, ring) |
| Before/after technical delta | visual:comparison (two lists) | expansion:delta |
| Nested request trace | visual:timeline (flat) | expansion:trace |

Two designs that only differ by color or label from an existing asset were
rejected during the audit: a "checklist" (visual:comparison with one column) and
a "metric pair" (two visual:metric tiles).

## Inventory

- 14 components with 14 example fixtures and 19 stress fixtures, all `design_review`.
- 8 new two-icon compositions from the pinned Lucide vocabulary (no new SVGs):
  gated-tool, retrieved-context, rejected-input, routed-model, queued-task,
  flagged-output, deployed-service, budgeted-run.
- 5 presentation-variant proposals for existing charts (horizontal bar, step
  line, threshold heatmap, donut with total, nested timeline). They are catalog
  proposals with integration notes, not a second chart engine; the nested
  timeline is implemented as expansion:trace.
- Machine-readable metadata for every asset in
  `tools/visual_library/expansion/catalog.json`: id, purpose, keywords,
  use_when, misuse, bounded parameters, variants, states, example and
  integration requirement.

No new icons were vendored. Symbols that would improve two components
(`repeat` for the loop, `route` for the router, `inbox` for the dead-letter
panel) exist in Lucide 0.468.0 but adding them requires a vendor manifest
change, which requires the maintainer's approval.

## Design Rules Applied

- Every component draws into the production visual slot, 824x820 at 1080x1920
  (`.visual` in `templates/v1/assets/motion.css`), and reserves the bottom 74 px
  for a provenance line inside the graphic, so the isolated export keeps its
  source declaration. Content blocks center vertically inside the remaining area.
- Minimum text size is 20 px at 1080 width; body labels are 24-28 px. Label
  ceilings in `schema.py` were measured against these sizes, and browser QA fails
  on any rendered ellipsis, text collision, clipped text or text hidden behind a
  later shape. Labels are never auto-shrunk.
- Colors and fonts come from a token set (`tokens.json`: background, surface,
  line, ink, muted, accent, accent2, warn, extra, font, mono). Two neutral study
  palettes ship for testing; production substitutes the approved brand tokens.
  No customer name, logo or product mark appears in any fixture.
- Motion reuses the study's deterministic `renderAt(seconds)` clip reveal. States
  (`active_step`, `outcome`, `hit`, `selected`, `current`, `highlight`,
  `active_line`, `active_span`, `active_chunk`, `active_attempt`) are editorial
  highlight indexes, never data, and are static in the study. Numbers render
  exactly as supplied; nothing interpolates.
- De-emphasized items keep 60 percent opacity so they stay legible on a phone.

## Commands

Validation and previews run offline with the existing local runtime. Use a
private workspace; writers refuse the public tree, symlinks, traversal and
existing run IDs.

```sh
python3 -B tools/visual_library/expansion/build.py catalog
python3 -B tools/visual_library/expansion/build.py validate examples.json --example
python3 -B tools/visual_library/expansion/build.py validate stress.json --example
mkdir -p workspaces/expansion-review
python3 -B tools/visual_library/expansion/build.py build examples.json --example --workspace workspaces/expansion-review --run-id pack-01 --approve-write
python3 -B tools/visual_library/expansion/build.py build stress.json --example --workspace workspaces/expansion-review --run-id stress-01 --approve-write --palette graphite
node tools/visual_library/expansion/qa.mjs workspaces/expansion-review pack-01 PLAYWRIGHT_MODULE_PATH CHROME_EXECUTABLE_PATH --approve-write
python3 -B -m unittest tests.test_visual_expansion -v
```

`build` writes `index.html`, `build.json` (input, vendor, implementation and
library hashes) and the third-party notices. `qa.mjs` writes a new `qa/`
directory with: per-component `<id>.png` study screenshots, `<id>.svg` and
`<id>-asset.png` at 824x820 for every palette, JSON sidecars with source data
and hashes, `gallery-desktop.png`, `gallery-mobile.png`, `contact-sheet.png` and
`report.json`. For your own component documents, place the JSON in the selected
workspace and omit `--example`.

## Observed Validation

Run on 2026-09-15 with the locally installed Node 24.19.0, Playwright 1.62.1 and
Google Chrome, from this worktree. All numbers below were observed, not projected.

- Fresh worktree baseline: 91 tests, documentation check and release audit passed
  before any change.
- Examples run: 14 components, study and graphite palettes, viewports 1440x1200,
  390x844 and 375x667, deterministic reveal and seek, 28 SVG/PNG exports and a
  contact sheet; no browser errors and no attempted network requests.
- Stress run: 19 fixtures covering every variant, minimum and maximum item
  counts and labels at their ceilings, same checks, 38 exports.
- Browser QA additions beyond the library's: text-collision detection, ellipsis
  detection, minimum font size, occlusion of text by later shapes, palette sweep
  and slot-size check. During development these checks and the human review caught more than a
  dozen real readability defects (truncated loop labels, a rule label colliding with its
  text, a chip painted off-center, a five-attempt ladder overrunning the
  provenance line, transition labels hidden under state boxes, and others). Each
  was fixed in the design, never by weakening the check.
- Human review: every exported asset was inspected on the contact sheet and at
  full size; the study gallery was inspected at desktop and 390 px width.

Exit codes were not the evidence. Inspect `contact-sheet.png` and the per-asset
PNGs in the run's `qa/` directory.

## Integration Review Corrections

The 2026-09-15 integration review reproduced two defects not covered by the initial
Python tests. Budget series colors were captured before palette switching, and
the browser font-size check incorrectly divided an unscaled SVG font size by the
page scale. Budget colors now resolve from the active tokens on each draw. The
font check reads the actual SVG font size; annotation markers were increased from
18 to 20 px, without changing production captions.

The corrected QA checks both palettes on all three viewports, rejects an injected
18 px label at each size, restores the label, and verifies budget series colors.
New private runs `examples-01` and `stress-01` passed: 14/19 components,
84/114 viewport-palette samples, 28/38 raster/SVG exports, six negative font-size
probes per run and no page errors or network attempts. Contact sheets were
inspected by the implementation reviewer; this is not operator approval or MP4
qualification. The four published images remain the unchanged earlier c-10
exports with their original provenance, not replacements from these new runs.

The revised source passed 106 Python tests. Private assistant settings are now
excluded from both Git and the source archive; a regression test verifies the
exclusion while unknown public directories still fail. Public-facing prose is
provider-neutral; compatibility filenames are retained. No dependencies or
production-scene availability changed.

## Combined Pipeline Check

The reviewed asset revision `589948a` was reconciled with local pipeline checkpoint
`b1d922f`. Only README needed manual conflict resolution; the result retains
locked npm installation, the optional media backend, approved earlier visual
adapters, the expansion readiness boundary and the B07 approval scope.

The combined source passed 197 Python tests, nine Node tests, documentation QA
(43 documents, 18 images) and a 207-file source audit. New private examples and
stress runs under `workspaces/pr1-integration-01/` passed the same 198
component/palette/viewport cases, 66 SVG/PNG exports and 12 negative font probes
as the corrected standalone pack. Production engine files still match the
existing implementation lock. No production video was rerendered or reapproved.
The source merge does not enable the expansion as production scenes or close
the remaining operator and release gates.

## Licenses and Provenance

The pack adds no third-party files. It reads the pinned Lucide 0.468.0 icons,
ECharts 6.0.0 and the existing notices through `kit.verify_assets`, so vendor
hash drift blocks a build. Every preview run carries the same
`THIRD-PARTY-NOTICES.txt` as library runs. Fixture data is invented and labeled
illustrative; one stress fixture uses the `measured` source kind only to exercise
the `SOURCE REVIEW REQUIRED` rendering. No fonts, recordings, private branding
or customer content are included; the study palettes are neutral samples.

## Limitations

- Nothing here is an accepted scene type. `production_scene_available` is false
  for every asset; `design_review` remains until integration and qualification.
- The renderer is a study renderer for the gallery template; it is not the
  production adapter and does not know about scene timing, captions or brand
  font loading.
- The nested trace and the budget ring reimplement small pieces of chart drawing
  with ECharts graphics because the shared options builder is not in this
  baseline. Fold them into that builder during integration rather than keeping
  two paths.
- Chart presentation variants are proposals with option-level integration notes;
  they were not rendered by this pack.
- Label ceilings were tuned against Arial. Brand fonts with wider metrics may
  need lower ceilings; the QA checks will say so.
- No claims are made about retention, reach or SEO effect.

## Integration Checklist

1. Register the fourteen kinds in the production adapter behind the same
   `visuals` record envelope (`id kind title insight source icon data`) plus the
   optional exact `variant` and `state` keys defined in `schema.py`. Reuse
   `schema.validate_component`; do not fork the bounds.
2. Mount the graphic in the central 824x820 zone using the brand's resolved
   tokens for the eleven token names. Keep the in-graphic provenance line or
   move it to the adapter's existing provenance slot, but never drop it.
3. Decide whether state indexes may derive from the scene fill interval (as flow
   highlights do) or stay static per scene. Displayed data must not change.
4. Merge `expansion/recipes.json` into `tools/visual_library/recipes.json`
   (14 total, under the 16-recipe ceiling) so `export-svg` and the catalog list
   the new compositions; update `test_six_compositions` accordingly.
5. Add the expansion catalog to `tools/visuals.py catalog` output, or point the
   assistant at `build.py catalog`, so discovery shows readiness honestly.
6. Extend the implementation lock (`tools/freeze.py`) to hash
   `expansion/schema.py`, `expansion.js`, `expansion.css`, `tokens.json`,
   `recipes.json` and `catalog.json` once the adapter consumes them.
7. Optional vendor additions (`repeat`, `route`, `inbox`) need a manifest change,
   notices update and a fresh vendor hash check.
8. Requalify with real brand fonts on all four production viewports and with the
   MP4 path before changing any asset's status from `design_review`.
