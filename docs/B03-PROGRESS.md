# B03 Charts and Motion Evidence

[Roadmap](PIPELINE-ROADMAP.md) | [Selection guide](VISUAL-PRESENTATION.md)

Recorded 2026-09-15. Implementation and representative media tests passed.
**B03 is complete:** [density and palette/count checks](B03-DENSITY.md), native
requalification and operator technical review passed. This is batch qualification,
not final release or publication approval.

## Implemented

Eight analytical forms now render in v2 scenes: line, bar, donut, scatter, heatmap,
correlation, timeline and geography. Bar scenes can select additive stacked data.
Six entrance presets and an optional bounded fade exit use the existing clock.
The catalog exposes presets, defaults, chart styles and separate qualification
state. A search for `stacked` returns the bar capability.

Data remains unchanged while the chart moves or fades. Provenance, totals,
sample counts and analytical caveats remain visible. No arbitrary scene CSS,
rendering callbacks, map files or new runtime dependencies are accepted.

## First Representative Renders

Each private workspace below contains `runs/widget-fixture/qualification/` with
MP4, scene PNGs, hashes, visual checks, transition checks and media/audio reports.

| Workspace | Palette | Analytical scenes | Automated result |
| --- | --- | --- | --- |
| `b03-charts-a-02` | Violet | Line, bar, donut | PASS |
| `b03-charts-b-02` | Graphite | Scatter, heatmap, correlation | PASS |
| `b03-charts-c-02` | Violet | Timeline, map, stacked bars | PASS |

All use the same implementation lock:
`cc072d1c6c20e64abd1b79cee1c49035206849abb7a3ddd364f9a5ec8fdfe71d`.
Each includes one classic fourth scene and twelve seconds of synthetic audio.
These are illustrative test media, not real narration, benchmarks or channel data.

- Three 1080x1920, 30 fps MP4s, 360 frames each; one video/audio track per export.
- 48 scene/viewport checks across 1080x1920, 1440x900, 390x844 and 375x667.
- All six entrances represented; nine chart entrances/exits checked at mid-motion
  for exact repeated/backward seek parity, in addition to settled screenshots.
- Nine hash-verified chart screenshots pass a coarse nonblank pixel check. Final
  representative captures were inspected; an awkward heatmap word break was fixed
  by widening the label slot without shrinking the font or hiding the label.
- Each native media report passed with 15 decoded samples. Audio lag was 0 ms in
  every checked window; the lowest correlation was 0.9996508447721871.
- Original `review_required` and pending listening fields remain intact. No new
  operator review or publication approval is inferred from B02's earlier approval.

Earlier `-01` renders are retained as iteration evidence, not substituted for this
current-candidate matrix. Their engine hashes differ. No old run was overwritten.

## Compatibility and Tests

### Current Native Requalification

The three replacement samples use the density-correction lock
`0d86b38efe17e9494a406957bfe7ecd7dc049fc521ecedc37e91e12f98ff0e12`.
Earlier exports remain intact as historical evidence.

| Private workspace | Palette | Analytical scenes | Automated result |
| --- | --- | --- | --- |
| `b03-media-a-03` | Violet | Line, bar, donut | PASS |
| `b03-media-b-03` | Graphite | Scatter, heatmap, correlation | PASS |
| `b03-media-c-03` | Violet | Timeline, map, stacked bars | PASS |

Each retains `runs/widget-fixture/qualification/video.mp4`, scene captures and
media/audio reports. All three exports have 360 frames at 1080x1920/30 fps with
twelve seconds of synthetic audio and a classic fourth scene. Output hashes,
current-lock identity and nonblank chart captures were rechecked. Media sampling
passed; measured lag was zero in all checked audio windows, with minimum
correlation 0.999650844766327. This does not replace operator listening review.

The current Python suite passes 123 tests and the chart-specific Node suite passes
six tests. The new classic regression `b03-density-classic-01` matches
`b03-classic-reference-01` with zero changed pixels in all 24 captures.

### Earlier Compatibility Evidence

`b03-classic-reference-01` contains seven classic runs and the negative fixtures.
Comparison with `b02-classic-reference-02` passed: zero changed pixels in all 24
classic screenshots, without tolerance or a mask. Invalid caption anchors and
overflowing headings still fail. The public template geometry remains fixed.

The shared study gallery `visual-review-20260915/visuals/b03-shared-02` passed
eleven visuals across three viewports, deterministic seeking, SVG/PNG exports,
selection/playback and no page network requests. This is functional gallery
regression evidence, not a pixel-parity claim for the study gallery.

The earlier 118-test suite passed. Added coverage includes every chart's invalid data,
source/data preservation, all six presets, invalid exits, overlapping intervals,
3/4-scene fixture construction, stacked-bar restrictions and pinned-map inclusion.
The visual-library subset (38 tests) also passed after the final discovery change.
Node syntax checks passed for the adapter renderer, shared options and capture.
Documentation checks and the source audit passed; packaging is source-only.

## Changed Implementation Files

- `visual_adapter.py`: bounded presentation fields, chart kinds, map payload and evidence.
- `workflow.py`: scene-relative entrance/exit duration validation.
- `templates/v1/assets/visual-scenes.js`: timestamp-derived presets and chart context.
- `templates/v1/assets/visual-scenes.css`: two-line detail/caveat space in the existing region.
- `tools/visual_library/options.js`: production chart geometry, legends and stacking.
- `tools/visual_library/catalog.py`: discoverable styles, presets and qualification state.
- `capture.mjs`: settled and mid-transition capture checks.
- `tools/widget_smoke.py`: three selectable chart fixture sets.
- `tests/test_visual_adapter.py`, `tests/test_visual_library.py`: contracts and discovery.
- `lock.json`: reviewed engine candidate; prior workspace approvals not migrated.
- README, changelog and relevant workflow/contract/selection docs: actual capabilities and limits.

## Operator Technical Approval

On 2026-09-15 the operator explicitly approved all three current samples in
response to the technical review question covering legibility, charts, slides,
fades and sound without cuts. The approved samples are `b03-media-a-03`,
`b03-media-b-03` and `b03-media-c-03`, under the lock recorded above.

| Sample | Approved MP4 SHA-256 |
| --- | --- |
| A | `7d41f835737490fef67dd88d2bb86442d261d7108a466c8d00ae38c1447cc94a` |
| B | `e5f881c4d55462826375a460800cf2adccc4390f7c82902347e893f11787dd3d` |
| C | `75d51c464e780866ba831873e19d38016a59d144d3659680bf7adc8c78c545b0` |

This records the human decision without rewriting original run reports or
granting publication approval. New engine corrections need fresh qualification.

The density, long-label rejection and palette/scene-count gates are complete in
the linked matrix report, covering 432 positive scene/viewport cases and eight
expected geometry rejections. Approval was supplied by the operator, not inferred
from automated checks or B02's earlier review.

Full-page scene crossfades, arbitrary architecture-stack layouts and autonomous
art direction are not implemented. The new slides/fades affect the central chart.
FFmpeg backend work and marketing remain separate roadmap batches. No commit,
push, deletion, provider call or publishing occurred in this implementation pass.
