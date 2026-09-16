# Visual Adapter Design

[Execution plan](PIPELINE-ROADMAP.md) | [Current episode contract](DATA-CONTRACTS.md)

Status: flow, metric and comparison passed [B02 qualification](B02-QUALIFICATION.md),
including technical human review. B03 now implements the eight chart forms and
[selectable motion presets](VISUAL-PRESENTATION.md), with qualification in progress.
This capability is not release, editorial or publication approval for future episodes.

## Version Boundary

Keep `templates/v1` as the fixed visual system. Episode `version: 1` keeps its exact
existing fields and its classic layout contracts. Opt-in episode `version: 2` retains
`template: "v1"`, the existing audio/timing/thumbnail/metadata rules, and adds an
exact `visuals` object. Do not migrate old JSON or brand approvals automatically.
Use a new qualification workspace when the implementation lock changes.

The template identifier names geometry; the episode version names accepted input
structure. Version 2 is not a new brand or permission to override CSS. Unknown
versions, extra fields and v2-only records in v1 must fail before output creation.

## Visual Records

`visuals` maps one to four lowercase IDs to the existing library's exact chart
record: `id`, `kind`, `title`, `insight`, `source`, `icon`, `data`. Map key and record
ID must match. Reuse `kit.validate_chart`, including its finite/bounded numbers,
sources, paired observations and derived values. Do not maintain a second chart
data validator. All visual records together are limited to 100 KB serialized as
ASCII JSON; the episode's existing 2 MB parsing ceiling still applies.

No external visual file paths: numeric and labeled data are inline, bound by the
episode hash. Source references remain inert provenance text, never fetch targets.
Reject caller-supplied `derived`, options, styles, callbacks, SVG or HTML. Compute
derived statistics inside the adapter from validated raw observations.

The development tree accepts all eleven library kinds. B02 qualifies the three
widgets; B03 tracks the chart and motion matrix before final technical sign-off.
Unknown kinds fail with an explicit unsupported-production-kind error, not a fallback.

## Scene Records

Classic scenes in a v2 episode retain their existing five exact fields. A visual
scene uses `layout: "visual-library"` and exactly the following seven fields:

| Field | Contract |
| --- | --- |
| `layout` | Literal `visual-library` |
| `name` | Existing bounded scene-name rules |
| `first_cue` | Existing increasing caption-index anchor rules |
| `content` | Exactly `eyebrow`, `heading_1`, `heading_2`, `note`; escaped text |
| `motion` | Exactly `visual`, containing `enter` and `fill` |
| `visual_id` | ID in the episode's `visuals` object |
| `symbol` | Allowlisted `icon:<id>` or `composition:<id>` from pinned assets |

B03 additionally permits one optional `presentation` field with exact keys and
allowlisted presets, documented in [Chart and Motion Selection](VISUAL-PRESENTATION.md).
No other fields are allowed; omitting it preserves the B02 presentation defaults.

Text ceilings: eyebrow 40 characters, each heading line 32, note 110; browser
fitting still decides whether text actually fits. Never auto-shrink to illegible
text. Provide a clear edit-the-label error when a slot does not fit.

Every visual ID must be used exactly once by a scene; reject unused or missing
records. Three/four total scenes and the 180-second Shorts duration limit remain enforced.
At least one visual scene is required for v2; use v1 for all-classic episodes.

`enter` is scene-relative seconds. `fill` is `[start, duration]`, starting no earlier
than `enter` and finishing within the scene. For the visual adapter only, fill
sets the selected entrance interval (a clipping reveal by default), not
interpolating the data or scaling chart coordinates.
Classic fill semantics are unchanged. Do not attach the generic scaleX fill
behavior to the chart container. Flow step highlights may derive from this same
bounded interval; displayed metrics and underlying data stay constant.

## Renderer Boundary

Separate a small reusable chart-options builder from `gallery.js`. Both the study
gallery and production adapter use it; navigation and playback controls remain in
the study. Reuse bundled ECharts SVG rendering, Lucide and Natural Earth. Do not
introduce another renderer, UI framework, server or dependency download.

Production receives validated records, fixed dimensions and the approved brand's
resolved color/font tokens. It mounts one visual in the existing central zone.
No study UI, independent requestAnimationFrame playback, tooltip or hover-dependent
meaning is imported into video. Decode all nested images and await fonts before
capturing. Only local pinned assets and private approved fonts are used.

The shared `ShortCreatorRenderAt(seconds)` remains the clock. Call the adapter
after scene visibility is resolved, using `seconds - scene.start`. Repeated,
backward and out-of-order seeks must produce the same captured state. Preserve
the existing compositor reset. Do not alter classic scene markup or scripts when
there are no visual scenes, apart from an explicitly reviewed shared change.

No invisible overflow workaround: test chart/SVG text bounds, actual pixels,
source labels, symbols, insight and caveats against the available visual region.
Chart space must reserve provenance and analytical caveats; it cannot consume
the scene-note or spoken-caption zones to fit additional data.

## Provenance and Meaning

- Illustrative sources remain visibly labeled as illustrative.
- Measured source labels/dates remain visible; full references are preserved in
  the run record without becoming links or executable content.
- Scatter/correlation keep sample count and the non-causation caveat.
- Pie/donut keeps total/unit context; category totals cannot silently change.
- Geo uses fixed-size markers and the library's no-volume/no-ranking caveat.
- Use original validated observations, not generated numbers that look plausible.

Choose a bounded source/details line inside the central visual region. If the
required context will not fit, reject the scene and simplify the content. Do not
hide caveats merely because the production canvas is smaller than the study.

## Drift and Run Evidence

Extend lock generation deliberately to include production adapter source, shared
visual renderer, recipes, vendor manifest and all referenced vendor bytes. Review
the candidate; do not blindly hash arbitrary `tools/` outputs or private runs.
Tests must prove that adapter, manifest, recipe and vendor tampering blocks a run.
The catalog/CLI must distinguish an implemented scene capability from an asset
that is only available for study/export; neither implies human approval.

Record visual IDs, source/derived data, adapter/vendor hashes and per-run rendered
asset hashes in output evidence. Recheck inputs and implementation after capture.
Preserve original narration bytes and word-timed cues; do not create new timing
from script length. Keep successful exports at `review_required`.

## Approved Decoration Change

On 2026-09-15 the operator explicitly approved removing the right-hand decorative
bracket from the public template as well as from new scenes. Capture the old v1
reference first. Change only the `#film::after` decorative border painting, not its
geometry or other panels, in a separately reviewed patch with a new lock candidate.
Compare images and computed bounds; differences must stay inside the old border
region. This is an intentional visual change, not a zero-diff legacy pass.

## Acceptance Matrix

| Surface | Positive evidence | Required rejection/regression |
| --- | --- | --- |
| v1 | All twelve layouts with three/four scenes | Extra visual fields rejected; prior inputs unchanged |
| v2 | Mixed classic/visual episodes with three/four scenes | Missing, unused or duplicated IDs; wrong version; wrong exact keys |
| Assets | All 40 icons and six compositions resolve | Paths, unknown IDs, injected markup, changed vendor bytes |
| Data | Three widgets, then eight chart forms | Nonfinite values, duplicate JSON, excessive input, invalid correlations |
| Typography | Approved brand fonts, two dark palettes, all four viewports | Long heading/labels, caption/visual collision, missing images/fonts |
| Clock | Early/middle/end, forward/backward/repeated seek | Reveal exceeding scene, negative/reversed timing, changed numeric data |
| Media | Native MP4, source hash/waveform checks and listening | Wrong recording, duplicate audio or stretched narration |
| Writes | New private runs and qualified evidence | Traversal, symlinks, existing output, source changes during run |

Synthetic fixtures exercise mechanics only. Their generated test-brand approval
is not an operator's approval of a production channel or publishable content.
