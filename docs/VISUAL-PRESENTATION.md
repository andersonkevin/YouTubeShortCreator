# Chart and Motion Selection

The development engine also provides seventeen bounded composition families in 16:9, 9:16, 1:1 and 4:5
through version-3 episodes. See [the landscape contract](DATA-CONTRACTS.md#landscape-version-3)
and [CLI authoring](CLI.md#landscape-episodes). They use the existing frame clock,
approved brand and shared media/audio gates. The v2 fields below are unchanged.
Variable-font substitution and native rendering of v3 compositions are not enabled.
Version-3 title reveals offer letter cascades, per-word clips, measured line slides,
character/whole-title impacts, one shimmer sweep, tracking contraction and word
bursts alongside the original five modes. Choose them through `title.content.reveal`;
all fourteen choices share the fixed cue clock and approved type. Impacts affect
the title only, and every entrance settles before the normal scene transition.
Version-3 `media-grid` provides solo, two-, three-, four- and six-image layouts
and a 58% hero panel. Select box entry, a single gloss/spotlight pass on a solo
image, or mirrored book-open cards for a pair. Every item has a caption cue, local
image ID and label. Fixed recipes reflow across profiles and preserve the whole
image; visible source attribution stays outside the card treatment.
Version-3 screen swaps include `wipe`, `iris`, `curtain`, `grid`, `halftone`,
`fade-through` and `whip-pan`. These operate inside the approved device viewport
on supplied local images. They keep the image fit, fixed caption clock, brand
ground and normal scene transitions; they do not move the logo or subtitles.
Version-3 metrics can use digit wheels, one-row reels, character pop-in, circular
usage arcs or progress bars. Gauges show the explicit maximum and source; their
fill and count share one clock. Use these to explain a supplied value, with
`count` retaining the existing presentation. See the metric fields in the contract.
Evidence layouts provide text trust marks, testimonials and proof cards. Use the
explicit source record and supplied rating/claim; the renderer does not manufacture
credibility. Fractional star fills and bounded feature badges use the caption clock.

[Visual director](assistant/VISUAL-DIRECTOR.md) | [Adapter contract](VISUAL-ADAPTER-CONTRACT.md)

The development tree implements eight chart forms plus the three B02 widgets in
v2 scenes. B03 chart/motion technical qualification is complete; implementation does not
imply final technical review or approval to publish. Existing v1 scenes retain
their contracts. No new provider, dependency download or alternate recorder is used.

## Choose the Explanation First

| Question | Visual | Suggested entrance |
| --- | --- | --- |
| How did comparable values change? | Line | Wipe right or slide left |
| Which category is larger? | Grouped bar | Slide up |
| What contributes to each total? | Stacked bar | Slide up; additive same-unit components only |
| What makes up one whole? | Donut | Fade |
| Are paired observations related? | Scatter | Fade; show sample count and non-causation caveat |
| Where do percentages differ? | Heatmap | Slide right; fixed 0-100 scale |
| How do variables relate? | Correlation matrix | Wipe right; coefficients derived from observations |
| Which stages overlap in time? | Timeline | Slide left; explicit interval endpoints |
| Where are the locations? | Map | Fade; equal marker sizes, no audience ranking |
| What is the process or decision? | Flow or comparison | Slide down or fade |
| Rows that read top to bottom | Timeline, heatmap, stacked bar | Wipe down |
| One panel that should arrive as a whole | Metric, donut, map | Scale-settle |

Use variety to clarify the story, not to cycle through effects. Keep the approved
three/four-scene limit and one primary teaching point per scene. Do not use charts
without relevant data. Architecture-layer illustrations are not a new arbitrary
layout editor; the stacked option here means additive bar-chart components.

## Presentation Contract

This development copy also offers [narrative story presets](HYPERFRAMES-PILOT.md#narrative-motion) for flow, bar, line, metric and comparison. They animate semantic data elements on caption cues inside the existing chart slot. The default presentation below remains unchanged.

The optional [cinematic composition](HYPERFRAMES-PILOT.md#cinematic-composition)
changes the arrangement of flow, bar and comparison scenes and adds directional
scene transitions. It retains the existing brand assets, caption clock and gates.

A `visual-library` scene can optionally include this complete `presentation`
object alongside its existing fields:

```json
{
  "reveal": "slide-up",
  "exit": "fade",
  "exit_duration": 0.3,
  "chart_style": "stacked"
}
```

- `reveal`: `wipe-right`, `wipe-left`, `wipe-down`, `wipe-up`, `fade`, `slide-left`,
  `slide-right`, `slide-up`, `slide-down` or `scale-settle`. Wipes clip the settled
  chart in from one edge without fading. Slides name the direction of movement, and
  also fade in. `scale-settle` fades in while settling from 94% to full size around
  the chart center. The four wipes and the settle come from the wave 03 motion
  study, reduced to container-level entrances that never touch the data.
- `exit`: `none` or `fade`. Fade duration is 0.15-0.6 seconds; `none` requires 0.
- `chart_style`: `standard` or, only for bar data, `stacked`.
- Omission keeps B02's wipe-right entrance, no exit, and standard chart style.

The existing `motion.visual.fill` interval sets entrance start and duration.
`enter` cannot follow that start. Entrance must finish before the optional exit
begins. Exit ends at the scene's caption-derived boundary. There is no change to
the source recording, spoken captions, logo or progress clock.

Motion derives directly from the requested timestamp, with smoothstep easing for
slides/fades. Values, axes and data geometry do not interpolate during a reveal.
There are no caller-supplied CSS transforms, JS callbacks, keyframes or timers.
These default entrances affect the central chart. Cinematic mode instead moves
the scene content within its clipped viewport while the logo and captions stay fixed.

## Assistant Discovery and Review

Use `tools/visuals.py describe visual:bar` (and other catalog IDs) to inspect data
examples, `chart_styles`, `reveals`, `presentation_default`, production dimensions
and qualification state. Operators and assistants select the same exact fields;
there is no autonomous model-selection service or hidden prompt API.

Production axis/timeline labels use compact scientific notation for very large
or small magnitudes; raw data stays exact. The [density report](B03-DENSITY.md)
defines precision and shows the tested limits. Overlapping or out-of-bounds text
fails capture with an edit-the-label/split-the-data message; no labels are silently
hidden to satisfy a fitting check.

Check units, category comparability, additive/overlapping components, visible
source kind/date, sample count, totals and caveats. Review both still captures and
the MP4. The technical validator cannot prove that a dataset is truthful or that
a chart is the right editorial choice. Long/dense labels may fail fitting even
when their JSON is within the data contract; simplify labels, not the checks.

## Local Qualification Fixtures

Set documented `YSC_*` variables to already installed runtimes. Each command needs
a new private workspace and the explicit write flag:

```sh
python3 -B tools/widget_smoke.py --workspace workspaces/chart-review-a --set charts-a --render --approve-write
python3 -B tools/widget_smoke.py --workspace workspaces/chart-review-b --set charts-b --render --approve-write
python3 -B tools/widget_smoke.py --workspace workspaces/chart-review-c --set charts-c --render --approve-write
```

Set A contains line/bar/donut; B contains scatter/heatmap/correlation; C contains
timeline/map/stacked bars; D and E repeat charts with the wipe-down, wipe-up,
wipe-left and scale-settle entrances. Sets `wave02-a` to `wave02-d` build three
wave 02 components each (terminal, confusion and steps; quote, ranking and
heatmap; sequence, dag and stat; timeline, pros-cons and checklist) through the
same scene contract. Each includes a classic fourth scene and synthetic
audio, not a publishable voiceover. `--scenes 3` uses only the first two charts and
a classic scene. `--palette graphite` exercises a second approved test palette.
Browser QA checks fitting and deterministic mid-entrance/exit seeks as well as
settled views. Human review remains necessary for readability and pacing.

### Shader transitions inside captured screens

The v3 `screen` composition offers fourteen explicit `shader-*` swaps in all four
profiles. Choose them with `ysc.py compositions`; use existing image and cue fields.
They adapt the retained HyperFrames GLSL algorithms using the approved palette
and the shared 24-frame clock. Only the local still viewport is processed; data
labels and captions outside it remain readable. These are optional expressive
transitions, including a bright white flash and distortion effects; they are not
automatically selected for ordinary editorial scenes.

Shader endpoints return to the original image. Intermediate motion is frame
addressed and must pass exact reverse-seek and encoded-pixel gates. Software
WebGL performance and noise are qualified on the recorded local runtime, not
claimed identical across arbitrary GPU/driver combinations. Whole-page snapshots,
upstream caches, shader scene seams, interactive shader controls and 3D are deferred.

RGB-separation effects (`gravitational-lens`, `chromatic-split`, `glitch`) use a
1.2-pixel maximum antialias filter during the transition, tapered to zero at each
endpoint. This preserves the existing H.264 4:2:0 output without one-pixel color
fringes; encoding quality and pixel thresholds remain unchanged. The filter does
not affect the logo, heading, captions, toolbar, other shaders or settled images.
