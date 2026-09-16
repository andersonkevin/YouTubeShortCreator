# Chart and Motion Selection

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
Transitions currently affect the central chart, not full-page scene crossfades.

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
wipe-left and scale-settle entrances. Each includes a classic fourth scene and synthetic
audio, not a publishable voiceover. `--scenes 3` uses only the first two charts and
a classic scene. `--palette graphite` exercises a second approved test palette.
Browser QA checks fitting and deterministic mid-entrance/exit seeks as well as
settled views. Human review remains necessary for readability and pacing.
