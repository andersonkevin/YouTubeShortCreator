# HyperFrames adoption inventory

[Current engineering closeout and validation scope](HYPERFRAMES-CLOSEOUT.md).

[Integration contract](HYPERFRAMES-PILOT.md) | [Integration inventory JSON](hyperframes-adoption-inventory.json) |
[Visual production inventory JSON](visual-production-inventory.json)

Original inventory verified on 2026-10-15; current source hashes and the final
typography extensions verified on 2026-10-17. The cinematic renderer is integrated into the development
engine and accepts different episode records. The exported example uses the normal
`ysc.py render` path. It is not a separate video application.

At the inventory check on 2026-10-15, GitHub `andersonkevin/YouTubeShortCreator` pointed to
`c11eb247b54b03a68553228845b1de764b094cee` on `main`, matching the development
checkout's base. The local integration is uncommitted and unpublished.

## Full local asset census (2026-10-15)

[Complete catalog, media, source hashes and file manifest](hyperframes-asset-census.json)

The census reads and hashes all 9,375 retained files in the local archive across
15 packages. It excludes dependencies, build output, the development copy, private
settings, secrets by filename, and symlinks. This is complete file/metadata coverage,
not a claim of a manual line-by-line security or design review.

| Source group | Count | Meaning |
| --- | ---: | --- |
| Catalog definitions | 455 | 210 blocks, 237 components, 8 starter examples |
| Catalog definitions with every declared file present | 427 | 28 have missing declared payloads, mostly demo media |
| Source definitions with mechanics already adapted | 74 | Across v2 and v3; only bounded subsets, not every upstream option |
| Implemented in the qualified engine | 366 | 359 baseline adaptations plus seven variable-type and lettering resources; both extensions passed four-format browser QA and combined landscape exports |
| Catalog shader definitions covered by the existing adapter | 14 | Verified algorithm correspondence; demo HTML and branding are excluded |
| Further native candidates | 0 | Glyph write-on, stitched lettering and controlled difference blending are integrated and qualified |
| GPU/spatial candidates deferred | 0 | Glass Shard and Frost are wired through the native source-stage family; four-format delivery passed |
| Explicit non-adoption under current operator instructions | 1 | Emoji is not enabled; the current operator rule prohibits it unless explicitly requested |
| Unique media binaries | 418 | 895 physical files deduplicated by SHA-256 |
| Shader-transition algorithms | 14 | All 14 adapted as opt-in local-still swaps; separate from catalog counts |
| Workflow skill documents | 34 | Distinct contents among 40 copies; reference workflows, not video assets |

The 418 media binaries comprise 170 raster images, 33 vectors, 96 videos, 30 audio
files, 86 font binaries, two 3D models and one HDR texture. Fonts include weights
and subsets; 39 readable metadata family names are present, sometimes with weight
suffixes. One WOFF2 has unreadable family metadata; its filename identifies it
as TT Norms Pro Mono. Its retained TypeType EULA excludes it from the public font catalog. These media include documentation and test
fixtures. They are not all suitable or cleared for publishing. Catalog payloads,
media, shaders and skills overlap: do not add their counts into a larger asset total.

| Primary metadata grouping | Catalog entries |
| --- | ---: |
| Backgrounds, textures and spatial effects | 101 |
| Transitions and cameras | 77 |
| Data, charts and diagrams | 28 |
| Other motion and compositing primitives | 64 |
| Typography, titles and brand lockups | 95 |
| Screens, interface and product demonstrations | 67 |
| Cards, layouts and editorial modules | 19 |
| Remaining complete starter compositions | 4 |

Grouping prioritizes explicit families, then name/tag patterns, not a quality score; four other starter examples
are grouped by their primary visual use. Each entry records its exact paths,
hashes, declared-file completeness, category, lexical dependency indicators,
license evidence and development adaptation status. The graph keyword matches a token, so typography is not misclassified as data.
Remote URL strings in source
are indicators, not network requests performed by this inventory.

The table above and the machine-readable census are the current totals. The
expansion records below retain historical counts and qualification evidence;
they must not be read as additional assets or current completion claims.

The font catalog now exposes 80 exact local files: 64 static and 16 variable,
including measured weight/slant axes. Six separately licensed files remain
excluded. The variable-font browser check proves real glyph changes for all 16;
the normal engine validated all four new treatments in four formats. See
[variable typography](VARIABLE-TYPOGRAPHY.md) and [drawn lettering](LETTERING.md).
All reopened native candidates are now implemented. This closes reusable asset
integration with the explicit exclusions above; publication and independent
operator acceptance remain separate.

The repository code license is Apache-2.0. The census retains item-specific
license declarations and local notices. Third-party fonts, marks, demo imagery and
libraries require separate evidence; the engine's approved fonts remain unchanged.
The first resource expansion adapts `iris-reveal`, `svg-stroke-trace`,
`code-highlight`, `screen-flow-carousel`, `per-word-rise`, `blur-in`, `typewriter`
and `scramble-reveal`. Their schemas, renderer and QA belong to the normal engine.
This does not claim all options from any source definition have been imported.

The second resource expansion adds all ten remaining `lt-*` attribution styles
and the explicit-state `marker-checklist-card` mechanic. These use the existing
brand and cue clock, with source hashes and changes in production provenance.

The third resource expansion adapts `number-wheel`, `slot-machine-roll`,
`number-pop-in`, `mk-usage-arc` and `mk-progress-stat` as five metric styles.
The existing numeric and source contract remains authoritative. Gauge maxima are
explicit; no upstream example claims, fonts or style controls are imported.
The fourth expansion adapts `star-rating-fill`, `trust-strip`, `testimonial-card`,
`social-proof-card` and `badge-pop`. It requires explicit ratings, identities,
claims and structured source records; no upstream example endorsements are imported.
The fifth expansion adapts `curtain-reveal`, `grid-pixelate-wipe`,
`halftone-dissolve`, `fade-through` and `whip-pan-cut` as local-screen swaps.
Closed records keep their timing, palette and asset access bounded by the engine.
The sixth expansion adapts `bottom-up-letters`, `top-down-letters`,
`caption-clip-wipe`, `line-by-line-slide`, `char-slam-explode`, `headline-slam`,
`text-shimmer`, `tracking-in` and `streaming-text` as nine title reveals.
Upstream font/size overrides, idle loops and auto-fit behavior are excluded.
The seventh expansion adapts `mk-placeholder-grid`, `gloss-sweep`, `spotlight-card`
and `split-tilt-cards` as six media layouts and four compatible treatments.
All use verified local stills, complete-image fitting, labels and source attribution.
The latest typography expansion adds `caret-swap`, `line-swap`, `text-state-swap`,
`matrix-decode`, `focus-blur-resolve` and all four `marker-highlight` strokes.
These are closed engine records with exact supplied text and caption-cue timing.
At that earlier expansion there were 185 definitions without a bounded port or
final disposition, plus 182 awaiting combined qualification. The 74 qualified partial
adaptations and 14 verified shader-wrapper correspondences remain separate counts;
source inventory does not imply integration. The fourteen correspondences reuse
the same shader algorithms already counted in the shader row, not additional effects.

### Cumulative closeout work

The full `canopy-part-title` source is now connected to the normal compiler and
shared spatial renderer. It retains both seeded 170-leaf batches, five species,
ten retained-leaf handoffs, curved geometry, procedural textures, camera/focus
motion, alpha-aware wind/shadows/depth, source bokeh and two sharp title wipes.
The approved display font and two verified local texture inputs replace remote
loading. Native checking passes four formats, 16 viewport checks and 380 event
samples with strict reverse pixels. The source final hold is aligned with the
last native cue; the original static tail is not stretched into another beat.
The two source photographs still lack item-specific provenance and remain outside
public source. This brings the catalog to 353 implemented definitions awaiting
cumulative qualification, with six spatial/GPU ports remaining.
See the [source record](../templates/v1/assets/production-canopy-provenance.json).

The `wireframe-portal-title` port is now connected to the normal episode compiler:
actual approved-font meshes, screen-space outlines, source camera and glyph
handoff, whole-word layout, warp geometry and six ordered shaders. CoreGraphics
nonzero normalization replaces the source clipping dependency. Original-source
parity covers 499 instants and five handoffs. Native checking passes three handoffs
in four formats, 16 viewports and 1,296 event samples, including strict reverse
pixels and existing caption/geometry/seam gates. It is one of the 353 implemented
definitions awaiting cumulative export qualification; six spatial/GPU definitions
remain. See the [source provenance](../templates/v1/assets/production-wireframe-provenance.json).

Further compatible source changes accumulate in one development tree before a
combined browser/export qualification. The source set stays fixed at the 455
inventoried definitions. Equivalent implementations are not counted as additional
effects, and an excluded reference is not counted as an integration. The accepted
main lock remains unchanged until qualification and acceptance.

The current addition ports twelve source definitions into seventeen native choices:
four social-card presentations, a two-peek notification stack, three physical
exits, two rubber-band directions, two shape morphs, a page slide and four spectral
wipes. Instagram/TikTok motion shares one follow implementation; the zoom-through
component shares its spectral timeline with chromatic-aberration-wipe. Supplied
identity/context/action states replace demo accounts and engagement counts.
These source changes have tests prepared; combined visual qualification is pending.

The combined batch adds `data-story/ranking` from `bar-chart-race`,
`data-story/lines` from `mk-line-graph`, `network/hub` from `constellation-hub`,
`network/branch` from `flowchart`, and three screenshot annotation styles from
`cursor-annotate`, `press-ripple`, and `yt-circle-pointer`. These are connected
to the regular engine and its input/browser gates. They have targeted contract
and math checks; their four-format browser/export qualification remains pending.
The source does not yet replace the accepted implementation lock.

The typography batch adds nine title treatments and three headline swaps from
fourteen definitions. `per-word-crossfade`, `staggered-fade-up`, and the entry
snippet in `blur-out-up` share one implementation. Other sources are
`shared-axis-y`, `shared-axis-z`, `soft-blur-in`, `scan-band`, `rgb-glitch-text`,
`shimmer-sweep`, `svg-mask-reveal`, `titlecard-calm`, `morph-text`,
`strikethrough-replace`, and `split-flap-board`. There are now 25 closed title
reveal choices and six headline swaps in source. New choices remain unqualified
until the combined browser/export gate runs.

The carousel batch adapts all 25 circle, path, orbit, text-circle and vision
presets. Their shared math module and renderer were verified identical across
the source files. One native adapter reuses their paths, keyframe curves, depth
geometry and perspective; no GSAP, remote media or 3D package is imported.
Local image references cycle across fixed 12/24-slot compositions. The engine
provides approved copy/typography, a caption-driven clock and a final deceleration.
Demo outros and source font/color/copy overrides are excluded. These are actual
distinct trajectories, with targeted numerical and contract tests; visual and
encoded-video qualification remains pending with the combined batch.

All 33 individual demonstrations across the 13 `transitions-*` blocks now have
closed `screen.swap` options prefixed `catalog-`. One native adapter preserves
their internal easing, masks, optical layers and motion sequences while using
local images, the brand palette and the normal 24-frame cue envelope. Coverage
fixes remove premature image cuts, incomplete corner masks and an unfinished
clock sector. These are screen-image effects; they do not change scene-seam or
caption behavior. Ten catalog definitions are newly ported; three already had
pending seam adaptations, so they are expanded without double-counting them.
There are 54 screen-swap choices including the previous 21. The new 33 remain
pending combined browser/export qualification.

The code batch adds six `code-story` modes from eight source definitions:
character typing, LCS line diffs, measured token morphs, centered code scrolling,
a workbench and supplied terminal output. The two dark-workbench source runtimes
are identical and share one mode. Exact text and blank lines are retained;
commands are never executed. Native adapters replace source callbacks, colors,
fonts and demonstration data, with caption-frame timing and approved BrandMono.
These additions have targeted contract/math checks; combined visual qualification
is pending. The original `code` composition remains unchanged.

The data-resource batch adapts seven definitions as three map modes, a combined
bar/line chart, specification rows and a conic metric ring. US hex positions are
retained; point-up geometry fixes overlapping cells in the original. Bubble/flow
math works over verified supplied images with explicit point/value records.
No remote topology, D3 or example statistics are imported. Geographic-boundary
map variants remain pending; a topology found in a producer test fixture is not
yet a qualified shipping asset. New charts require both units and numeric maxima.
The source now exposes 28 scene families and eight metric styles; these additions
await combined qualification. The last qualified videos still cover 18 families.

## Current multiformat engine

The paired-device addition integrates the exact supplied phone and laptop models,
six-act camera choreography, screen UV repair, glass lens and paired turntable.
Operators supply two verified local screenshots; source demo UI and claims are
excluded. The native camera keeps the source lens and fits the closing orbit in
all formats. Native/reverse and negative gates pass; cumulative encoded export
remains pending. The two model binaries are explicitly recorded as integrated
with repository-level license evidence and unresolved item-specific rights review.


The approved-font extrusion adds `spatial-stage/extruded-logo`: real curves,
counters and advances from the approved display face, beveled letter meshes,
source flip stagger and word swing, reflected studio lighting and three finishes.
CoreText uses the existing qualified Swift runtime; generated outline data stays
inside each private run. The original Geist face and gold palette are not imported.
Native checking covers all three finishes in four formats; thirteen catalog faces
pass actual outline extraction. A one-pixel fixed-header raster discrepancy is
retained separately from the new glyph geometry. Extruded captures now select CPU
page rasterization with WebGL enabled; the isolated 4:5 gate passes. Cumulative audio/video export
qualification and repeated-run raster stability remain pending.


The regional-map addition ports `spain-map` and `us-map` into native quantitative
records with actual boundaries, original projections, value-sorted region and
label staggers, piecewise brand gradients and narrated focus pulses. Spain has
19 communities/cities; the US has 50 states with the source Alaska/Hawaii insets.
Four-format native QA passes with fixed geographic attribution, separate metric
sources, nonoverlapping labels, layout bounds and exact reverse seeks. The Spanish
atlas does not state its original geometry edition; the renderer discloses this,
and publisher review of that provenance limitation remains open. This is source
integration and native qualification, not cumulative encoded-video qualification.

Version 3 uses `production_visuals.py`, `production-scenes.js/.css`, the bounded
`production-resources.js/.css`, `production-evidence.js/.css`,
`production-transitions.js/.css`, `production-type.js/.css` and
`production-media.js/.css`, `production-headlines.js/.css` and `production-shaders.js/.css` modules, and
`production-qa.mjs` through the ordinary
`ysc.py new/build/render` path. All eighteen
families support `landscape`, `portrait`, `square` and `portrait-4x5` at 30 fps,
up to 600 seconds. `media_contract.composition_geometry` supplies the frame,
content, caption, logo and chart slots. Compact formats reflow measured text,
stack screenshots under copy, and adapt chart geometry; they do not crop a 16:9
movie. Classic v1 and non-cinematic v2 keep their existing raster path. Opt-in
v2 `cinematic-v1` now shares the software raster policy of v3, with dense
effect-frame checks and retained mismatch diagnostics. The v2 inventory below is historical
integration evidence, not the entire current composition catalog.

## What works for other episodes

The actual call chain is:

```text
ysc.py build/render
  workflow.validate
    visual_adapter.validate_scene / validate_composition_sequence
    validate_story_timing / validate_effect_timing
  workflow.build / build_html
    visual_adapter.scene_html / payload / scripts / install_assets
  visual-scenes.js: ShortCreatorVisualReady
    ShortCreatorCinema.mount(record, presentation, cues, brand)
  motion.js: ShortCreatorRenderAt(seconds)
    ShortCreatorVisualRenderAt(seconds)
      cinema.renderAt(seconds)
  capture.mjs -> existing media, frame, audio and output-hash gates
```

| Capability | Current reusable input | Current limit |
| --- | --- | --- |
| Cinematic flow | Step labels, existing icons, source, insight, cue indices | Two to four steps |
| Cinematic bar | Categories, values, series label, unit, source, cue indices | One series; two to four nonnegative categories |
| Cinematic comparison | Two labels and item lists, source, two cue indices | Existing bounded comparison schema |
| Scene transitions | `cut-left` or `zoom-through` | Fixed 0.4-second envelope; all scenes must use cinematic mode |
| Narrative motion in the original slot | Flow, bar, line, metric, comparison | Preset-specific limits in the integration contract |
| Decorative emphasis | Cascade, outline, highlight | Earlier optional effects, separate from story mode |

Episode text and numbers are not hardcoded in the renderer. Data comes from the
validated v2 records, colors and fonts from the brand, timing from caption cues.
Presentation constants such as geometry, animation duration and the English
comparison labels are intentionally fixed in this candidate. This is a bounded
composition family, not a universal layout designer or a localization system.

To opt in, each compatible scene needs its ordinary `visual-library` fields and
the complete presentation record below; adjust the preset and cue list for its data:

```json
{
  "reveal": "fade",
  "exit": "fade",
  "exit_duration": 0.4,
  "chart_style": "standard",
  "story": {"preset": "flow-trace", "cues": [0, 1]},
  "composition": "cinematic-v1",
  "transition": "cut-left"
}
```

The engine still requires a qualified workspace and exact input hashes. Existing
production brand approvals cannot simply be copied onto a changed engine lock.

## Functions and files to retain for GitHub

| Destination file | Function or entry point | Purpose |
| --- | --- | --- |
| `visual_adapter.py` | `validate_composition`, `validate_composition_sequence` | Closed composition/transition contract; reject mixed frame contracts |
| `visual_adapter.py` | `validate_story`, `validate_story_timing`, `validate_effects`, `validate_effect_timing` | Semantic targets and measured cue boundaries |
| `visual_adapter.py` | `scene_html`, `payload`, `scripts`, `install_assets` | Escaped scene markup, brand/data injection, conditional scripts and provenance |
| `workflow.py` | `validate`, `build_html`, `build` | Normal engine integration; retain the original orchestration and gates |
| `templates/v1/assets/visual-scenes.js` | `ShortCreatorVisualReady`, `ShortCreatorVisualRenderAt` | Mount and dispatch classic, story and cinematic renderers |
| `templates/v1/assets/visual-cinema.js` | `mount`, `seam`, returned `renderAt` | Three composition families and two directional seams |
| `templates/v1/assets/visual-cinema.css` | Scoped cinematic selectors | Bounded stage; preserve logo and caption geometry |
| `templates/v1/assets/visual-story.js` | `progress`, `count`, `mount`, internal `drawnPath` | Cue-driven data animation and exact count endpoints |
| `templates/v1/assets/visual-effects.js`, `visual-effects.css` | `mount`, `progress` and scoped decoration | Earlier optional emphasis; existing tests depend on this integration |
| `tools/visual_library/options.js` | `ShortCreatorVisualOptions` / semantic motion targets | Existing chart construction with explicit effect targets |
| `tools/visual_library/catalog.py` | `entries`, `describe` | Discover supported stories and compositions |
| `capture.mjs` | Story sampling and cinematic seam checks | Preserve old checks; verify reverse seeks, motion direction and fixed protected regions |
| `tools/freeze.py`, `lock.json` | `record` and implementation hashes | Include adapted assets and provenance in drift detection |

Carry the six effect/story/cinema Python and Node test files with those changes.
`tools/hyperframes_pilot.py` is a synthetic test-fixture utility used by tests; it
does not render production episodes. Carry the Apache license, third-party notices,
source provenance and updated contracts. The JSON inventory records all 28
pre-inventory changed files with hashes, plus source and destination line locators.
This inventory and its index/review documentation are additional audit files.

Keep `workspaces/create_cinema_demo.py`, all `workspaces/` content, recordings,
fonts, brand approvals, runtime profiles and rendered outputs out of GitHub.
The private demo helper depends on an earlier workspace; the engine does not.

## HyperFrames code already adapted

| Source | Mechanic retained | Destination |
| --- | --- | --- |
| `flowchart-vertical` | Connectors lead the next node | `visual-story.js` |
| `chart-story` | Measured SVG strokes and geometry-driven charts | `visual-story.js`, cinematic bar branch |
| `count-up` | Frame-derived value progression | `visual-story.js` `count` / `progress`, reused by cinema |
| `comparison-split` | Shared state progress | Story comparison branch |
| `kinetic-type-swap` | Masked word exchange | Cinematic flow branch |
| `before-after-wipe`, `directional-wipe` | One cover/progression owns the state reveal | Cinematic comparison curtain |
| `cut-the-curve` implementation examples | Mirrored travel curves and matching zoom direction | `seam` and capture checks |
| `stagger-cascade`, `outline-draw`, `inline-highlight` | Bounded semantic emphasis | Effect adapter |

These are adapted mechanics, not unmodified imports of complete HyperFrames
components. For example, the upstream flowchart uses a fixed stroke dash length;
the adaptation measures paths using the chart-story technique. The comparison
curtain also differs from the upstream split-slider presentation. Do not describe
this as installing or embedding the whole HyperFrames engine.

## Selected adaptations and current status

| Source file under `registry/components/` | Function or code section | Intended use and destination |
| --- | --- | --- |
| `text-match-cut/text-match-cut.html` | `apply` and its shared curve | Implemented as paired landscape title handoff in `production-scenes.js` |
| `iris-reveal/iris-reveal.html` | `writeIris` | Implemented with one radius owner for local stills in `production-resources.js` |
| `focus-swap/focus-swap.html` | `targetIsB` and paired focus tweens | Implemented as narrated emphasis in landscape screenshot labels and comparisons |
| `ui-focus-zoom/ui-focus-zoom.html` | `applyCamera`, clamped target coordinates | Implemented in the landscape screen contract with bounded image-space regions |
| `svg-stroke-trace/svg-stroke-trace.html` | Path-length and dash setup | Implemented as measured engine-generated process connectors in `production-resources.js` |

Text-match, focus-swap, ui-focus-zoom, iris reveal and process connector tracing
are adapted to the multiformat engine. The original
adoption JSON is a historical selection snapshot; current adapted source hashes
and changes are in [production provenance](hyperframes-production-provenance.json).
The ports use the existing clock and brand tokens and omit arbitrary HTML slots,
remote assets, SFX events and idle animations. Landscape data scenes also reuse
the existing bar/line/metric/comparison validators and numeric animation clock.

## Full integration tracking

The operator's active objective is to integrate the useful resources from the full
archive. The census retains all 455 catalog entries, 418 unique media binaries,
14 shader algorithms, 34 distinct workflow documents and 15 package manifests.
An adapted mechanic is partial coverage of a source item, not full catalog closure.
Each remaining entry must receive a source-based disposition and, where useful,
a bounded engine adaptation with brand, timing, provenance and render evidence.
Existing GPU flags are pending engineering review, not permanent exclusions.
Fonts and media remain individually inventoried; changing the approved font files
or importing example marks is not automatic adoption. No item is considered done
only because it has been counted or overlaps an existing feature.

## Package decisions and review coverage

The source census read and hashed 9,375 local HyperFrames files: 3,436 code-classified
files, 2,368 tests, 2,593 data/documentation files and 978 other assets. It covers
all 15 package manifests and all 455 registered items: 210 blocks, 237 components
and eight examples. Counts include mirrored skills and generated catalog copies;
they are not counts of unique features. The target source census covered 323 files.

Every retained file was indexed. Manual review focused on package APIs, the
complete Short Creator integration path, adapted sources, selected candidates and
timing/readiness/text/hash boundaries. This is not a line-by-line manual review of
1.9 million lines, a security certification or a successful HyperFrames full build.
JS/TS function indexing is lexical, not a complete AST/call graph. Raw indexes and
the reproducible scanner are private audit artifacts.

| Package group | Decision |
| --- | --- |
| Core, engine, producer, parsers, lint | Read as references; keep existing Short Creator clock, contracts, fonts, capture and media gates |
| Player, inspector, Studio, studio-server, SDK, SDK playground | Do not import for this renderer integration |
| CLI, AWS Lambda, GCP Cloud Run | Do not import installers, hooks, services or cloud infrastructure |
| Shader transitions | Fourteen bounded local-still swaps integrated; full DOM/scene runtime remains deferred |

Eight reference functions have separate decisions in the JSON. Two examples:
`fitTextFontSize` would introduce automatic shrinking, which conflicts with the
current fitting policy; `resolveTimings` explicitly says its intended consumers
are not both wired yet, so its existence is not evidence of end-to-end parity.
All 455 registry items have a disposition, including `indexed_not_selected` for
items that have not justified a port in this pass.

## Inventory-stage gaps before promotion

1. `ysc.py:new_episode` still creates v1 fixed-layout episodes. A v2 cinematic
   authoring option and suitable cue mapping are missing; manual JSON works today.
2. The catalog lists `cinematic-v1` but exposes the default 824x560 dimensions and
   B02/B03 qualification fields without separate cinematic limits/status.
3. `.github/workflows/tests.yml` does not run Node tests. Add those checks before
   relying on GitHub CI for effects, story progression or seam regression coverage.
4. Committed cinematic tests cover contracts and pure seam math. Browser/media
   qualification currently covers one three-scene example; four-scene, alternate
   brand, dense-label and broader value/geometry fixtures remain pending.
5. The private cinematic fixture helper is not portable public authoring tooling.
6. Some general operation documentation still describes only fixed v2 geometry;
   align it with the explicit cinematic exception before promotion.

That list describes the inventory-only pass. The subsequent implementation adds
landscape CLI authoring and Node checks in the existing CI workflow. The v2
cinematic authoring/catalog gaps remain separate. See the
[current integration record](HYPERFRAMES-PILOT.md#landscape-production-integration).

## Expanded production scope: visuals, formats and ten minutes

Operator scope update, 2026-10-15: prioritize animation, aesthetics, layouts and
typography for reusable content production before continuing Cognativ production.
The operator selected **ten minutes** as the first long-video ceiling. Expand to
16:9 first, with square and 4:5 profiles also inventoried; preserve existing 9:16.
The subsequent authorized implementation adds a separate v3 landscape contract:
1920x1080, 30 fps, up to 600 seconds and 1-120 scenes. Legacy v1/v2 retain their
1080x1920, 180-second and three/four-scene limits. The eight first selections below
are implemented in `production_visuals.py` and `production-scenes.js`/CSS through
the normal engine; other entries remain candidates. Source/line hashes in the
expanded JSON describe the earlier inventory snapshot. The Signal Lab examples
do not qualify Cognativ's actual branding.

The expanded JSON records 21 additional visual candidates, ten font families and
23 code touchpoints in 21 destination files. Source hashes and line locators make
each choice traceable. These extend the five transition candidates above rather
than replacing or counting them again.

### Visual material worth adapting

Paths below are relative to the HyperFrames source, under `registry/`. Destinations
are in Short Creator. Shared composition families should have recipes, not a new
renderer for every upstream HTML file.

| Content outcome | Source files and useful code | Adaptation decision |
| --- | --- | --- |
| Openers and chapter cards | `components/titlecard-lockup/titlecard-lockup.html`: kicker/title/rule/label timeline; `components/kinetic-center-build/kinetic-center-build.html`: `positionsAt` | Select both. Feed approved font metrics and cue anchors into the cinematic renderer. Replace system-font measurement and automatic shrinking. |
| More varied explanations | `components/grid-card-assemble/grid-card-assemble.html`: column/row layout, cue starts, measured icon strokes | Select. Grid for wide output, list/stack for portrait; reuse existing icon IDs and source data. |
| Quotations and evidence | `components/testimonial-proof-card/testimonial-proof-card.html`: `pushWords`, rendered-row grouping and per-line masks | Select. Require exact quote, attribution and source. Omit sample claims and avatars. |
| Product demonstrations | `components/browser-device-stage/browser-device-stage.html`: chrome layout and screen-swap timeline | Select. Accept hashed local stills through a closed asset contract. Upstream arbitrary HTML slots and unsynchronized slot videos are unsuitable. |
| Guided product/process walkthroughs | `components/scroll-camera-story/scroll-camera-story.html`: `applyCamera` and arrival scheduling | Select. Use bounded sections and cue-driven movement; remove decorative drift and demo content. |
| Names, sources and section labels | `blocks/lt-side-rule/lt-side-rule.html`: rule/name/role sequence | Select; `lt-mask-reveal` is an alternative recipe. Replace fixed 1920x1080 placement and upstream fonts/colors. |
| Consistent closings | `components/cta-lockup/cta-lockup.html`: CTA entrance hierarchy | Select. Reuse the actual approved logo and bounded copy. `cta-close` supplies an alternative recipe; `logo-brand-close` is spacing/timing reference only. |
| Typographic emphasis | `components/variable-axis-type/variable-axis-type.html`: complete axis endpoints/font readiness; `components/variable-font-flex/variable-font-flex.html`: `applyTime` | Conditional. Requires an approved local variable font with verified axes. Do not import Google Fonts loading or assume every font supports width animation. |
| Alternative title/product recipes | `titlecard-calm`, `headline-slam`, `text-state-swap`, `pan-stations`, `screen-flow-carousel` | Cataloged alternatives for the shared title/product families. Avoid duplicate clocks, idle motion and automatic font shrink. |
| Secondary references | `device-frame-stage`, `social-proof-card` | Reuse pose/hierarchy ideas only. Omit repeating float, SFX dispatch and default stars/ratings. |
| Cinematic GPU treatment | `components/filmed-screen/filmed-screen.html`: `mount`, camera and WebGL pass | Deferred. Its HTML-in-Canvas/seek hooks, GPU path and secondary provenance require separate qualification. |

The JSON distinguishes eight first selections, seven alternatives, two conditional
typography candidates, three references and one deferred component.

The implementation retains `visual_adapter.py` for v2 and adds the bounded
`production_visuals.py` family module for v3. Both use the existing frame clock
and normal production orchestration; the landscape CSS is scoped separately.
Do not import all of HyperFrames or add a second recorder.

### Brand and font decisions

`themes/CONTRACT.md` supplies 18 useful palette, font-role, spacing, shape and motion
tokens. Map those concepts to approved channel values; the bundled neutral,
editorial and bold palettes and system-font stacks are not Cognativ brand assets.
Typography can improve through hierarchy, line breaks, spacing and timing while
retaining the exact approved font files.

| Local family candidates | Observed files and license evidence | Readiness |
| --- | --- | --- |
| Geist | Regular, SemiBold, Bold TTF; adjacent `Geist-OFL.txt` | All three load in the existing Pillow runtime and report the expected family/style. Still need language/weight/visual qualification and brand selection. |
| Archivo | Regular, SemiBold TTF; adjacent `Archivo-LICENSE.txt` | Both load and report the expected family/style. Same brand/coverage qualification remains. |
| Inter, EB Garamond, Cormorant Garamond, Recursive | Local WOFF2 files with adjacent OFL text | Current onboarding accepts TTF/OTF only. These are not drop-in fonts; Recursive's actual axis ranges also need inspection. |
| Caveat, Courier Prime, Permanent Marker, Barlow Condensed | Local WOFF2 files | Complete license evidence was not located in the reviewed adjacent assets; format and provenance work remain. |

The JSON contains all font/notice paths and hashes. An adjacent license file is
evidence to retain, not proof that every subset, weight or glyph has been qualified.
No font was copied, installed, converted or selected for Cognativ. New font choices
belong in a separately reviewed brand revision; current approved fonts remain the
default. Private brand assets remain outside the public source release.

### Formats and longer episodes: exact change surface

| Output profile | Intended layout | Status |
| --- | --- | --- |
| 9:16, 1080x1920 | Existing portrait layout retained | Existing limit: 180 seconds; ten-minute mode pending |
| 16:9, 1920x1080 | Eight landscape families, local screens and landscape cover | Implemented through FFmpeg; qualification in the integration record |
| 1:1, 1080x1080 | Compact grid/central composition and reflowed captions | Target, not implemented |
| 4:5, 1080x1350 | Stacked title and visual with its own density rules | Target, not implemented |

Landscape has its own geometry and actual-size browser/media checks. Square
and 4:5 still require separate layouts and qualification; preview scaling is not
support for another export profile.

| Engine boundary | Files to change | Required behavior |
| --- | --- | --- |
| Episode authoring and limits | `ysc.py`, `media_contract.py`, `workflow.py`, `visual_adapter.py` | Explicit opt-in profile/version; preserve old defaults; bounded cue-driven scenes and local assets; ten-minute limit is 18,000 frames at 30 fps. |
| Brand/type/cover | `branding.py` | Separate channel identity from episode scene count/output layout; approved font roles and profile-specific preview/cover. Existing approvals must remain immutable. |
| Layout and clock | `motion.css`, `motion.js`, `spoken-captions.css`, `visual-cinema.css` under `templates/v1/assets/` | Recompose for each profile; use its logical canvas dimensions and readable caption bounds. Preserve clock and paint-cache reset. |
| Discovery and actual qualification | `tools/visual_library/catalog.py`, `capture.mjs` | Expose supported input/mode/profile combinations and real status; fitting, protected regions and seams checked at actual output dimensions. |
| Export and capabilities | `media_backend.py`, `ffmpeg_backend.py`, `encode.swift`, `media-qa.swift`, `native-capabilities.swift` | Pass the validated profile through capture/encode/decode checks and backend preflight; keep explicit backend selection. |
| Longer-run quality and resources | `frame_qa.py`, `audio_qa.py`, `safety.py` | Profile-aware shapes/regions; preserve timestamp, pixel, cue, voice and tail gates; measure memory, input-size and scratch-storage budgets. |
| Regression and release | `tools/freeze.py`, `.github/workflows/tests.yml`, targeted tests/docs | New lock candidate and qualification; Node coverage in existing CI; old v1/v2 behavior remains covered. |

The implementation still saves every PNG until encoding. Legacy source audio
stays capped at 75 MB; landscape permits 250 MB. JSON stays capped at 2 MB.
Landscape encoding has a 1,800-second timeout; other FFmpeg operations retain
600 seconds. Landscape capture checks scratch space using observed PNG sizes. Audio QA reads
the full source/export PCM arrays before comparing every three-second window.
These are measured-budget questions for a ten-minute run, not reasons to remove
limits or add cloud/distributed infrastructure. At ten minutes, meaningful scene
and chapter boundaries must follow narration; stretching three cards is inadequate.

### Definition of ready for Cognativ

1. Ordinary CLI authoring creates two unrelated episodes with different content,
   scene order and selected formats; neither needs the private demo helper.
2. New composition families pass input, brand, fitting and repeat/reverse-seek
   checks. Every exposed profile produces a real correctly sized MP4 and cover.
3. A full ten-minute narrated export passes 18,000-frame/timestamp, cue, encoded
   frame and audio identity/tail checks, with recorded runtime and storage use.
   Exact 600-second acceptance and one-frame-over rejection are tested. Backend
   support claims are qualified separately.
4. Existing portrait episodes retain their contract and regression coverage.
   Production inputs/approvals are not migrated automatically to a changed lock.
5. Actual Cognativ assets are used in reviewed type/layout previews, followed by
   human visual/listening review. Automated PASS still ends at `review_required`.

None of these new readiness gates has been marked complete by this inventory.

## Validation and safety

The reuse audit exercised three new synthetic record orders through
`workflow.validate`, `build_html` and `payload`, with unrelated labels/IDs and
bar values 3 and 19: all passed. It did not export three new videos or establish
browser fitting for every allowed input.

The retained cinematic export passed browser, media, frame and audio QA and
remains `review_required`. Inventory checks reverify the current lock and source
and output hashes; retained media qualification is not a new render.

| Check run in this inventory task | Result |
| --- | --- |
| `python3 -B -m unittest discover -s tests -v` | 270 passed |
| `node --test tests/*.test.mjs` using the installed Node runtime | 19 passed |
| `python3 -B tools/check_docs.py` | PASS: 49 documents, 384 local references |
| `python3 -B tools/release.py audit` | PASS: 324 public files, no upload |
| `git diff --check` | PASS |
| Inventory integrity checks | 35 source/target locators and hashes, 455 unique registry entries |
| Retained export integrity checks | Current implementation lock and all 42 output hashes match |

Created public files: this document and `hyperframes-adoption-inventory.json`.
Updated public files: `docs/README.md` and `docs/HYPERFRAMES-REVIEW.md`.
Raw file/function indexes, the scanner, reuse checks and test logs remain private
under `workspaces/hyperframes-inventory-2026-10-15/`.

This task changes inventory/documentation only and creates private audit records.
GitHub access was read-only. No production writes, installs, server startup,
hooks, commits, pushes or publication were performed. Synthetic test files use
temporary workspaces. HyperFrames source carries Apache-2.0 notices; no licenses
or brand approvals are changed.

Recommended commit message for this inventory: `docs: inventory HyperFrames adoption and integration gaps`.

The subsequent visual-production extension updated this document, `docs/README.md`
and the roadmap's scope note, and added `visual-production-inventory.json`.
Its separate verification record is retained in the private
`workspaces/visual-production-inventory-2026-10-15/` audit directory. This extension
adds no runtime support, font assets or new video qualification.

Extension validation: `python3 -B -m unittest discover -s tests -v` passed all 270
tests; `node --test tests/*.test.mjs` passed all 19 using the installed runtime.
`python3 -B tools/check_docs.py` passed (49 documents, 387 local references),
`python3 -B tools/release.py audit` passed (325 public files, no upload), and
`git diff --check` passed. The private `check_inventory.py` verified 47 source
hashes, 23 destination locators/hashes, the current implementation lock and all
42 retained export hashes. Five local TTF files loaded with expected family/style
metadata; this does not qualify glyph coverage or approve a font change.

No external calls, dependency changes, installs, hooks, server startup, production
edits, commits or pushes occurred in the extension pass. The generated inventory
and private audit records are the only new artifacts; no video was generated.
Recommended commit message for this extension: `docs: inventory visual production and ten-minute format targets`.

### Package integration: shader-transitions

All fourteen retained GLSL algorithms are exposed as closed `shader-*` choices
inside v3 screen compositions. This adds package resources, not fourteen new
registry definitions: registry coverage remains 68 partial adaptations of 455.
The adapter uses one context, two textures and the original cue/validation path.
Local brand tokens replace the package colors. Exact source hashes, endpoint and
smoothstep changes, omitted runtime features and conflicting license declarations
are recorded in production provenance. Original files remain unchanged.

The source inventory still has 308 non-GPU candidates and 79 spatial/GPU catalog
entries without a bounded port. A compatible shader package does not qualify all
79 effects, 3D scenes, upstream fonts or source media for production use.

### Integration batch 18: current catalog status

At the end of batch 18, the 455-definition census
contains 74 earlier partial adaptations, 93 implementations awaiting complete
batch qualification, 14 definitions covered by the existing shader adapter,
209 candidates requiring a bounded port, and 65 deferred GPU/spatial entries.
Batch 18 adds six native screen-interaction styles from six retained sources:
click, drag, marquee, menu, tap, and swipe. These are wired into v3 authoring and
rendering, use explicit local-image outcomes, and preserve the approved brand.
Their four-format native browser checks passed; new MP4/audio qualification is
pending. The accepted development lock is unchanged. Source-specific adoption
and omissions remain in the census and production provenance; total integration
is not complete.

### Integration batch 19: pointer and waiting-state resources

Seven more source definitions are adapted: dart-cursor, echo-trail,
cursor-glyph-trail, magnetic-cursor, agent-cursor, cursor-zoom-follow, and
typing-indicator. Five pointer choices, a bounded follow camera and an optional
chat waiting state are part of normal v3 authoring/rendering. They keep explicit
local-image outcomes, supplied actor/message text and the existing brand.
At the end of batch 19, the census had 74 earlier partial adaptations, 100 implementations
awaiting complete batch qualification, 14 shader-covered definitions, 202
candidates requiring a bounded port, and 65 deferred GPU/spatial definitions.
Native browser evidence is separate from catalog-wide export qualification.
The accepted development lock remains unchanged; the integration is incomplete.

### Integration batch 20: interface family

Thirteen additional source definitions now feed native v3 interfaces: three chat
presentations, four notification presentations, four step/panel presentations,
measured note typing and explicit-state input feedback. Every item remains
caption-driven and supplied by the episode. The default five interface styles
retain their original paths. Source-specific mechanics and omitted demo behavior
are recorded per file in the census and production provenance.

Batch-20 totals: 74 earlier partial adaptations, 113 implementations awaiting
complete option-level qualification, 14 shader-covered definitions, 189 candidates
requiring a bounded port, and 65 deferred GPU/spatial definitions. The block has
targeted input/math and four-format browser evidence, not a new complete catalog
export. The accepted development lock and previously retained videos are unchanged.

### Integration batch 21: handwritten annotation family

Six source definitions contribute seven new annotation shapes, four stroke
textures, three arrow curves and a path-following pen. The handwritten helper
is shared by the existing annotation renderer; no separate video application or
free-form SVG input is added. The `hw-boil` source contributes seeded math, pen
timing and textures only, not its idle motion. Per-source omissions are retained
in the provenance and census. Existing typography, source images, captions and
review gates remain unchanged.

Batch-21 totals were 74 earlier partial adaptations, 119 implementations awaiting
complete qualification, 14 shader-covered definitions, 183 remaining candidates,
and 65 deferred GPU/spatial definitions, totaling 455. Targeted input/math and
four-format browser evidence are recorded privately. Full combined export and
the ten-minute soak remain pending; the accepted main lock is unchanged.

### Integration batch 22: title designs and editorial emphasis

Six additional definitions contribute three designed title layouts, a scalar
word highlight, a rough underline and explicit connector notes. Speech clouds
support both tail sides; the curved title uses the retained source wave. All
options are wired into the ordinary v3 schema, renderer and QA. Their fonts,
colors, supplied copy and cue clock remain governed by the existing brand and
episode contracts. Source-specific omissions remain in the census/provenance.

Batch-22 totals were 74 earlier partial adaptations, 125 implementations awaiting full
qualification, 14 shader-covered definitions, 177 remaining candidates, and 65
deferred GPU/spatial definitions, totaling 455. Targeted checks and combined
four-format native-browser evidence are separate from final catalog export,
ten-minute qualification and acceptance of a new implementation lock.

### Integration batch 23: media cameras and focal composition

Seven source definitions contribute eight camera modes. Push-in retains three
intensities; tilt retains three glow spreads using the approved accent. The
native adapter includes a tight-to-wide pull-back, punch-in with optional reset,
a two-image focus transfer, and three-card parallax in both directions. Each
uses explicit caption cues, verified local stills and the existing brand frame.
Source demos, arbitrary transforms, source fonts/colors and idle hold loops are
omitted. Fixed layouts rotate the card arrangement for tall formats.

Batch-23 totals were 74 earlier partial adaptations, 132 implementations awaiting full
qualification, 14 shader-covered definitions, 170 remaining candidates, and 65
deferred GPU/spatial definitions, totaling 455. Combined export, the ten-minute
soak and acceptance of the implementation lock remain pending.

### Integration batch 24: editorial frames and closing lockups

Seven source definitions add a sketched media frame, a drawn pipeline, two
lower-third presentations and three closing styles. Shared seeded rectangle
geometry is reused by annotations, frames and diagrams. All options are normal
engine inputs. The channel card uses the approved local logo and explicit
before/after labels; closing copy is preserved verbatim with approved fonts.

Batch-24 totals: 74 earlier partial adaptations, 139 implementations awaiting full
qualification, 14 shader-covered definitions, 163 remaining candidates, and 65
GPU/spatial definitions deferred, totaling 455. Source-specific omissions and
qualification boundaries remain explicit in the census and provenance records.

### Integration batch 25: image surfaces and devices

Eleven source definitions provide fourteen bounded `media-grid.surface` styles:
three aspect-ratio fills, screen texture, grain, vignette, moving light, light
leak, editorial flash, beat accent, feathered focus, LCD texture, phone and tablet.
The device adapter retains three phone cutout choices. Local stills, approved
fonts, caption cues, source labels and fixed brand layers remain the input boundary.
Source-specific omissions are recorded in production provenance; these are partial
native adaptations, not full imports of arbitrary source compositions.

Batch-25 totals: 74 earlier partial adaptations, 150 implementations awaiting full
catalog qualification, 14 shader-covered definitions, 152 remaining candidates,
and 65 deferred GPU/spatial definitions, totaling 455. The separate retained
four-format delivery and 600-second landscape soak passed before this batch.
They do not qualify every new surface or replace the accepted main lock.

### Integration batch 26: gesture and panel interfaces

Nine source definitions add twelve normal interface variants: swipe/throw rails,
a throwing card stack, a scrolling feed, state chips, toggle flips, card resize,
two panel-morph registers and three refresh indicators. All use explicit episode
items and caption cues. The adapter ports source geometry, resistance, braking,
landing and inverse-scale mechanics without a new runtime dependency.

Current totals: 74 earlier partial adaptations, 159 implementations awaiting full
catalog qualification, 14 shader-covered definitions, 143 remaining candidates,
and 65 deferred GPU/spatial definitions, totaling 455. Source-specific omissions
and qualification scope remain in the census and production provenance. The main
accepted lock and previously exported media are unchanged.


The title-reading group adapts six caption typography sources as native title
options: `marker-sweep`, `gradient-read`, `neon-read`, `kinetic-words`,
`editorial-words`, and `pill-read`. Their rendering and input checks use the
existing engine. This is not a replacement caption system: speech timing and
caption geometry stay unchanged. The partial adaptations reuse the approved
fonts/palette and document omitted source behaviors. The census now records 165
implemented definitions pending combined qualification, 137 further non-GPU
candidates and 65 deferred GPU/spatial definitions. Earlier qualification and
known carousel raster differences are not superseded by this group.


The raster group adapts five source definitions into eleven media surface
variants: three ASCII densities, three Bayer matrices, two particle reveal
directions, an ink bleed and two slit-scan axes. The native local image contract
and shared verified texture decoder remain authoritative. These are reusable
options in ordinary media-grid scenes, not separate demo pages. Source records
state which arbitrary source options and demo content remain omitted. Current
census totals are 170 implemented definitions pending combined qualification,
132 further non-GPU candidates and 65 deferred GPU/spatial definitions.

### Cumulative source integration

The working development tree now accumulates changes before one combined
qualification. The previous social/swap additions covered 12 source definitions;
the camera/network/status additions cover 13 more, adding 25 native choices:
15 image camera recipes, four radial network layouts, two trust presentations,
one checklist presentation, two backdrops and one title treatment. Seven further
definitions add telemetry and camcorder overlays, two supplied-region scan
styles, station pans, expanding panels and a deterministic confetti backdrop.

The current 455-definition census contains 74 earlier partial adaptations,
256 source implementations awaiting combined qualification, 14 definitions
covered by the shader adapter, 76 remaining non-GPU candidates, 29 deferred
GPU/spatial definitions and six typography-incompatible source references.
Deferred entries still require an engineering disposition;
they are not silently excluded. Native choices and source definitions are different
counts. Several source definitions can share one implementation.

The 36 newly integrated GPU entries share the identical 1,444,793-byte shader bundle
with SHA-256 `6ad60b5fe00c6f092ddc9ccc6138743d89401e2886d550b275fc8ce0d0345f2d`.
This is WebGPU, not the existing WebGL transition implementation. The local
Chrome capability check returned no adapter under the current software capture
configuration and an adapter under default hardware rendering. Their definitions,
default properties, clock/registration paths and shipped MIT/Apache notices were
reviewed. A pinned, modified copy now provides 36 native `gpu-*` backdrop choices.
It is a new vendored runtime dependency with all shipped MIT/Apache notices.
Explicit GPU episodes use default hardware Chrome; other capture settings remain
unchanged. Validation thresholds and CSP are unchanged. The native adapter closes
inputs, blocks SDF loads, disables autonomous time and remaps colors to the brand.

Focused native compiler checks passed all 36 backgrounds in four formats, including
exact reverse seeks, approved palette pixels, approved fonts and text geometry.
The first check exposed a first-seek uniform initialization error; the retained
diagnostic and subsequent check record the correction. These compiler fixtures
do not qualify encoded video or replace the combined final engine validation.

Use `ysc.py compositions` to discover the closed native options. Source hashes,
ported mechanics and omitted source behavior remain in production provenance.
These additions do not replace the accepted implementation lock or qualify a new
video. Final browser, seek, geometry, media and audio checks remain required after
the cumulative source integration. The recorded 4:5 carousel raster mismatch is
still retained for that qualification.

Eleven further typography sources now provide nine title reveals and the
`layered-emphasis` layout. The new choices retain seeded channel displacement,
two-stage decoding, a selected-word glow and particle burst, ranked mosaic tiles,
an ASCII trail, irregular typing, glyph-sampled particle assembly, and a moving
luminance mask. The two texture sources share one native implementation. A local
still ID supplies the mask; this step does not import the source texture pack.
The layered backdrop uses the supplied decorative word and the existing font role.
All foreground text settles on the exact supplied title. Spoken captions and
approved font files stay unchanged. Source integration and focused compiler checks
do not stand in for the remaining combined qualification or final videos.

Seven further source definitions provide five spatial image treatments and
three paper/scribble screen swaps. The reusable native modules are
`production-media-spatial.js` and `production-paper-transitions.js`. CSS depth,
seeded torn edges, stagger tables and source easing are driven by the existing
caption clock. Geometry and exact-seek checks are added to the normal production
QA path. Focused math/contract tests are narrower than the pending combined
four-format browser and export checks; no new video is claimed for this step.

Six typography sources have an explicit non-adoption decision under the current
brand: `variable-axis-type`, `variable-font-flex`, `weight-wave`,
`caption-weight-shift`, `hw-write-title` and `stitched-text-draw`. The approved
test brand's three font files are static. The first three require real variable
font axes; the fourth changes weights and the caption rail; the last two use
Caveat-specific or custom stroke alphabets. These remain inventoried source
references, not native options, imported fonts or completed ports. Reconsidering
them requires a separately approved typography contract. Other unresolved source
definitions remain visible in the census rather than being reclassified by default.

Eleven additional source definitions provide 16 native choices through
`production-ui-primitives.js` and `production-path-motion.js`: six micro
transitions, signup and beat sequences, an explicit statistic card, avatar lift,
two status icon presentations and four diagram connectors. Source control points,
tangent sampling, easing, dash motion and point morphs are reused with native
caption timing. The adapters omit live interaction, automatic values, sample
brands, source audio cues and idle loops. Focused math/contract checks passed;
combined qualification and final video delivery remain pending. Counts describe
source dispositions, not independently qualified assets or finished videos.

Four further definitions provide three native kinetic styles: perspective
marquee, ticker takeover and shutter slam. The last combines the six authored
slam trajectories with the source physical shutter sampler. It is not a generic
CSS blur. The styles extend the ordinary `kinetic` record and keep explicit
caption cues, exact words and approved fonts. Native browser/export qualification
is pending; the original kinetic layout is retained.

Two caption effects have explicit non-adoption decisions under the current
contract. `caption-blend-difference` changes approved foreground colors according
to background pixels; its screen variant has no effect on white text.
`caption-emoji-pop` infers symbols from keywords, uses platform color-emoji fonts,
regroups captions and substitutes Gabarito with automatic size fitting. They
remain inventoried source references, not native choices or completed ports.
Reconsidering them requires a separately approved caption/typography contract.

Four spatial source definitions now provide five closed native backdrop choices:
nine orbiting cards, a transmissive lens, a transmissive ring, a seeded spiral
galaxy and the color-panel gallery tunnel. They share one local WebGL renderer
with resource disposal between scenes. The real Three.js geometry/material/shader
code is reused, with native cue timing, approved palette mapping and camera fitting.
The pinned bundled runtime is r185; older version imports in the source examples
are recorded rather than silently treated as identical. Source hashes and MIT
notices are retained. Focused checks pass; combined browser/export qualification
and unresolved catalog dispositions are still pending.

Two liquid-glass source definitions now provide native notification and widget
presentations over a verified local still. The actual shared GPU core supplies
refraction, blur and glass edges; its experimental DOM-capture layer is omitted.
One reusable context/target set and separate blur-direction uniforms replace
the source's open resource behavior. Explicit native copy replaces demo metrics,
brands and statuses. A third source, `caption-camera-follow`, now supplies a
kinetic composition-word camera while leaving spoken captions unchanged.
After those additions, the unresolved catalog count was 81; cumulative native browser/export
qualification and the final videos remain pending.

Four further source definitions now provide seven native choices: the anamorphic
emitter field, a mesh background that contracts into a rounded card and expands,
three stop-motion cadences, and two magnetic image swaps. Actual source trajectory,
mask, cadence and shader calculations are retained with individual provenance.
Canvas backdrops need no new GPU runtime; magnetic swaps reuse the existing
single-context local-still adapter. After that addition, the unresolved count was 77.
These additions have focused checks only; combined browser/export qualification
and final videos remain outstanding.

Five further source definitions now provide a vector-editor illustration, a
pinned mock/copy sequence, a split-panel headline handoff, a 36-facet silhouette
morph and a seeded granular contact/recovery field. They are normal closed v3
records, with exact source geometry/curves and recorded modifications. No new
runtime dependency, source branding, caption changes or live controls are added.
The finite census remains 455 definitions: 287 source-integrated definitions await
combined qualification; 72 definitions remain unresolved (51 non-GPU, 21 spatial).
These counts are source dispositions, not a claim of 455 production-ready assets.

Further review found a local `countries-110m.json` in an upstream producer test
fixture. World topology is therefore not wholly absent from the repository.
That discovery does not qualify its provenance, the D3/TopoJSON runtime, demo
statistics or the source choropleth as a native option. The three map definitions
remain unresolved; they are not equated with the current local-still map scenes.

### Optical and spatial-code integration

Six further source definitions are connected to the same v3 engine:

- `cosmic-orb` and `rack-focus`: two fixed WebGL backdrop recipes using their
  actual GLSL, seeded lighting and the approved output palette.
- `oscilloscope-trace`: sine, square and triangle synthetic traces with source
  phosphor persistence, velocity weighting and flyback blanking.
- `code-particle-assemble`, `code-shader-dissolve`, and `code-3d-extrude`: native
  code-story choices using explicit documents, approved fonts and fixed source
  math/geometry; native text becomes fully readable at rest.

The finite census remains 455 definitions: 293 are source-integrated pending
combined qualification, 74 previously adapted, 14 mapped to the existing shader
adapter and eight individually excluded. The remaining 66 are unresolved
(48 non-GPU and 18 spatial). These additions do not constitute a completed
combined qualification or a new encoded-video delivery. No lock is accepted here.

### Image handoffs and finite surface motion

Five more source definitions now have normal native choices: clone-wall screen
handoff, circle-match headline pair, freeze-paper overlay, phone-dive surface
and drift-accent surface. The actual source geometry and motion curves are
adapted to verified images, explicit copy, approved fonts/palette and native
cues. No example dashboard metrics or source product identity are copied.

Two data resources are also connected: `apple-money-count` supplies the fixed
62-shape `count-burst` metric, and `week-in-merges` supplies `value-lanes` with
proportional travel and reflected lane ends. Both require explicit native data
and structured provenance. Decorative shapes carry no currency claim; true zero
has zero speed, and period changes preserve accumulated distance.

`exploded-stack` and `product-turntable` now feed a closed `spatial-stage`
family. The former retains source separation, focus, projected leaders and an
optional collapse; the latter retains the can profile, studio lighting, plinth
and one turn. Both use local Three.js r185. Layer icons and the product label
come from verified native inputs. Remote model loaders and example branding
are omitted; a core beveled extrusion replaces the missing rounded-box addon.

Three further definitions now have reusable native selections:

| Source | Native selection | Retained code |
| --- | --- | --- |
| `orbit-card` | `spatial-stage/orbit-card` | Saved Blender camera/channels, aperture geometry, card revolution and point sphere |
| `code-slice-hero` | `headline/slice-sweep` | Ink-cell partition, field-driven flips, instanced GPU faces and projected shadows |
| `heygen-avatar-promo-card` | `media-carousel/promo-belt` | Measured entry offsets, two-row layout and finite conveyor travel |

These choices use the existing image/text contracts and approved visual system.
Example media, source copy, external fonts and free animation controls are not
imported. The slice renderer keeps one context and one active atlas pair for
long films. Source hashes, retained mechanics and deliberate adaptations are
recorded individually in the production provenance.

At the orbit/tile/belt addition the census contained 305 source-integrated pending combined
qualification, 74 previously adapted, 14 existing shader correspondences, eight
individual non-adoptions and 54 unresolved entries (40 non-GPU, 14 spatial).
Native pixel checks and the final four-format engine exports remain pending.

### Media presentations and ticker: cumulative source integration

Five more definitions now use existing native scene records:

| Source | Engine option | Retained mechanism |
| --- | --- | --- |
| `app-showcase` | `media-grid/phone-trio` | Three phone frames, staggered back-eased entry and exponential fan |
| `spotify-card` | `media-grid/album-card` | Layered cover card, staggered title/detail/source |
| `share-sheet-carousel` | `media-grid/preview-sheet` | Measured spring steps and all thirteen hard image cuts |
| `news-ticker` | `lower-third/news-ticker` | Panel/headline entrance, two specular passes and finite ticker travel |
| `yt-prism-title` | `title/prism-bow` | Perspective bow, paired color offsets and focus entrance; clear native rest |

Inputs remain explicit, local and hash-verified. The approved typography/palette
replace the demo fonts/colors; fabricated UI metrics, platform marks, action
buttons, live indicators and sample timestamps are excluded. These are source
integrations awaiting the single combined browser/export qualification.
At that addition the total was 310 pending qualification, 74 earlier partial adaptations,
14 shader correspondences, eight individual non-adoptions and 49 unresolved
definitions (35 non-GPU, 14 spatial), within the same fixed census of 455.

### Brand and localized-motion source additions

| Source | Native choice | Retained code mechanism |
| --- | --- | --- |
| `yt-logo-intro` | `cta/logo-intro` | Logo spring, kicker-to-title handoff, arrow and seeded line positions |
| `logo-outro` | `cta/logo-assemble` | Five-part slide stagger, overlapping scale pulse, glow and copy arrival |
| `store-badge-lockup` | `cta/badge-pair` | Equal-size cards, heading lead, badge stagger and rise |
| `cinemagraph` | `media-grid/steam-window` | Fourteen seeded wisps and one feathered region over a verified still |

These choices use approved logo bytes, native typography/colors, pinned icons
and explicit local content. Figma/store marks, sample claims and source idle
animation are omitted. The cinematic field uses the source loop once and holds;
it does not add video decoding. All four remain pending combined qualification.
The census now contains 314 pending qualification, 74 earlier partial adaptations,
14 shader correspondences, eight individual non-adoptions and 45 unresolved
definitions (31 non-GPU, 14 spatial). The fixed total remains 455.

### Statistic composition subsets

Five new native choices come from selected graphics in four starter examples
and the decline component: `chart/grid-stat`, `chart/soft-stat`,
`chart/sticker-stat`, `chart/rail-stat` and `data-story/decline`. These are
source adaptations, not imports of the complete starter films. Existing native
`combo-chart` and `network/branch` also cover reviewed subsets of `nyt-graph`
and `decision-tree`; those correspondences add no new effect or renderer.

The source-specific inventory records retained mechanics and omitted intro,
caption, A-roll, alternate-moment and demo-data behavior individually. There
are 38 unresolved definitions (24 non-GPU and 14 spatial). The current additions
still need combined native and encoded-video qualification in all four formats.

### Cursor-driven compositions

`cursor-text-select` now maps to `interface/notes/text-select`, with exact
caller-selected text, arrow/I-beam movement, selection, formatting toolbar and
Bold response. `multiplayer-cursors` maps to `media-grid/collaborators`, with
two to six supplied names, authored convergence paths and a verified local
still. Both physically enter and leave, use the normal caption frame clock and
retain approved typography/colors. Source idle loops, fallback content and
claims of real collaborator activity are omitted. Compact layouts separate the
name tags without changing the authored pointer paths.

These two source adaptations bring the cumulative count to 323 awaiting combined
qualification; 36 definitions remain unresolved (22 non-GPU, 14 spatial).
Targeted source tests and independent DOM checks cover the new contracts and
mechanics; native fitting, reverse-seek pixels and export qualification remain
part of the final combined run. No new video or approved implementation lock is
claimed at this checkpoint.

### Ranked answer composition

The complete `ai-answer-rank.html` source was reviewed. Its question typing,
finite thinking/lead reveal, three fixed rank slots, staggered pick entrances
and delayed insertion are now adapted as `interface/steps/answer-rank`. Four
supplied picks and an explicit destination rank replace the demonstration
brands. The first three are the initial list; the fourth enters at rank 1-3.
Rows below the insertion move down, the third initial row leaves, and the new
row receives the accent/check animation. Actual descriptions replace skeletons.

The normal engine owns content validation, four caption cues, approved brand
fonts/colors and deterministic frame seeking. This is an illustrated ranking,
not a model query or an inferred endorsement. The source notice and exact hash
are retained. The cumulative count is 324 adaptations awaiting combined
qualification; 35 definitions remain unresolved (21 non-GPU, 14 spatial).

### Measured document scrolling

All 1,661 lines of `notes-reveal.html` were reviewed. Its seven typing tables,
five measured scroll curves, paragraph jumps and font-measured caret now power
`interface/notes/note-scroll`. Two to seven supplied lines use the ordinary
caption clock and approved fonts. Long lines wrap within two lines instead of
shrinking the type. The copied timing tables retain authored plateaus and exact
settles; layout measurements are taken after the existing font-ready gate.

The static phone keyboard/chrome, demo story, extra sign-off logo/domain and
alternate closing card are omitted individually in the source record. Existing
scene transitions and approved branding remain in charge. There are now 325
source adaptations pending combined qualification and 34 unresolved definitions
(20 non-GPU, 14 spatial). No new browser/export qualification is claimed here.

### Compound title wipe and held-image cut

The complete `colorama-wipe` and `beat-freeze-cut` sources now contribute two
reusable choices: `title/colorama-wipe` and `screen/beat-freeze`. The former
retains the tilted mask, five-level compound blur and per-pixel color treatment
before returning to exact approved typography. The latter retains the ramp,
held image, exposure and hard-cut connector over verified local stills. It uses
a validated 69-frame window instead of squeezing the freeze into the usual
24-frame swap. Source omissions and timing adaptations are recorded individually.

There are 327 adaptations awaiting combined qualification and 32 unresolved
definitions (18 non-GPU, 14 spatial). No new render or accepted lock is claimed.

### Filmed local-screen lens

The complete `filmed-screen.html` component contributes `screen/focus/lens=filmed`.
The original optical shader provides perspective, curved glass, depth of field,
fringing, LED cells, glow and vignette over one verified local still. Camera glides
and the source Hann-weighted focus rack follow explicit focus regions. Exact
source pixels remain the input; titles, labels, branding and captions remain
outside the lens. The adapter uses ordinary WebGL2 and the existing local texture
decoder, with no experimental HTML-in-Canvas capture or engine-hook polling.

Source scope, omitted free parameters and retained shader hashes are recorded in
provenance. There are now 328 adaptations awaiting combined qualification and
31 unresolved definitions (17 non-GPU, 14 spatial). Source/math tests do not
qualify the GPU shader, appearance, reverse raster or encoded output.

### Conversation composition expansion

Three native `interface/chat` variants now adapt `chatgpt-exchange`,
`claude-exchange` and `message-thread-reveal`: `answer-stream`, `research-stream`
and `message-thread`. They retain composer-to-message motion, line-measured word
streaming, progressive table rows, collapsing illustrated activity and scrolling
message/image cards. Each action uses one caption cue and 60 capture frames.

All conversation text, table values, activity labels and local image references
are explicit inputs. No model, search or messaging service is connected. Native
fonts and colors replace the source product identities. The fixed census now
contains 331 adaptations awaiting combined qualification, 14 other candidates
and 14 GPU/spatial candidates. Focused checks pass; combined browser/export
qualification and the four final videos remain pending.

### Organic vector composition

`gooey-split` adds a native vector backdrop with the authored dot split, three-blade
spin and remerge sequence. The SVG blur/threshold and 17-sample shutter preserve
organic necks and directional smear. Approved colors replace the source palette;
the channel logo is unchanged. Two cues must be at least 150 frames apart.
Source/math/contract checks pass; SVG pixels and encoded video remain pending
combined qualification. Current totals are 332 pending adaptations and 27
unresolved definitions. The halftone-field simplex-noise attribution still needs
a complete corresponding notice before its source can be packaged.

### Native flight route

`nyc-paris-flight` now supplies `map-story/flight`: three route strokes, a
path-oriented aircraft, six staggered markers, two arrival doodles and a finite
landing accent. One verified local basemap and two explicit labeled endpoints
replace the source example. The existing cue clock and approved palette/type
remain authoritative. Source sample media and sound are not copied. This addition
has focused numerical/contract tests; combined native and encoded-video
qualification is pending. The fixed census now has 333 newly implemented entries
awaiting combined qualification and 26 unresolved entries.

### Native geographic map and local spotlight

`world-map` now supplies `map-story/world`: 177 countries from the existing
Natural Earth dataset, the source Natural Earth projection, center-out reveal,
four-stop fill scale and caption-driven region pulses. All numbers and focus
regions come from the episode; zero and absent values stay distinct. Projection
is baked offline with pinned local D3 bytes; no geographic runtime is added.

`north-korea-locked-down` supplies `map-story/spotlight`: the camera approach,
two original drawn circles, supplied region label, accent wash and finite
pullback. The source location claim and map are not imported. A verified local
image and normalized region make the composition reusable. Both choices are
connected to normal engine contracts, routing and QA; combined browser/export
qualification remains pending. Current totals are 335 newly implemented entries
awaiting that qualification and 24 unresolved definitions.

### Kinetic example composition integration

The complete `kinetic-type` example now supplies five `title` layouts and one
three-label `kinetic/glyph-build` composition. The source hook, grid, offset,
paired-rule and close entrances are independently reusable in ordinary episodes.
The glyph scene retains its ring/diamond rotation, tile wipe and triangular line
cascade. Shared native cues and approved brand roles replace source timeline,
fonts and remote media. This is one source definition with six choices; it is
not six additional catalog definitions. The fixed total remains 455, with 336
new adaptations pending combined qualification and 23 unresolved definitions.

The product-promo canvas source has also been read in full. Its collaborator
cursors, comment typing, component drag and three-card stamping remain pending;
the previously adapted logo pieces do not qualify that entire starter example.

### Product-promo source disposition

The starter example now maps to `interface/steps/product-canvas` and
`cta/logo-collide`; its outro corresponds to existing `cta/logo-assemble`.
This adds two native choices from one source definition, without double-counting
the reused outro. The original standalone SVGs have individual dispositions:
collaborator mechanics adapted, original cursor binary omitted; both source brand
graphics replaced by the approved logo. Fonts, claims, master captions and source
branding are not imported. The earlier product-canvas pending note is superseded.

Current fixed totals:337 new adaptations pending combined qualification,
22 unresolved definitions (eight non-GPU, 14 GPU/spatial). All three compositions,
the host, registry metadata and three standalone SVGs were inspected. The source
license is Apache-2.0; demo graphics are not implicitly adopted as publication assets.

### Cumulative character-walk integration (2026-10-16)

The complete `lottie-character-walk` composition and its pinned local mascot
animation now drive `cta/character-walk` in the normal engine. The native SVG
adapter preserves all 15 layers, 16 shapes, 18 animated properties and 1,265
linear keyframes, including parent transforms, painter order, planted steps,
deceleration, pointing and the staggered card. Approved color/font roles and
supplied copy replace the example style. The finite source sequence holds its
last visible frame; no general Lottie runtime or arbitrary animation input is
introduced. Its JSON is source data, outside the separate 418-media-binary census.

The fixed census now has 338 implementations pending combined qualification and
21 unresolved definitions (seven non-GPU, 14 GPU/spatial). Native browser/export
qualification remains pending; source tests do not replace it.

### Cumulative illustrated app installation (2026-10-16)

`vpn-youtube-spot` now supplies `interface/steps/app-install` in the normal engine.
It retains the phone entrance, staggered catalog, scrolling, selection/tap,
detail sheet, animated rings and impacts, ready state and snap-down exit. Any
of eight supplied apps can be selected; measured scrolling replaces the source
fixed offset. Approved fonts/colors, supplied text and local icon IDs replace
example identities and ratings. The percentage follows its drawn ring. It is
an illustrated workflow, without live app-store actions. Source idle breathing
and audio are omitted; the source wipe uses the approved background inside the
composition. Its sound file has an individual non-adoption reason in the census.

Current totals are 339 implementations pending combined qualification and
20 unresolved definitions (six non-GPU and 14 GPU/spatial). Four-format native
browser/export qualification remains pending; no accepted lock was replaced.

### Cumulative creator introduction (2026-10-16)

The complete `blue-sweater-intro-video` source now supplies `cta/creator-intro`
through ordinary episode authoring and rendering. The adapter retains the warm
entry, title breakup, five asymmetric burst paths, dragged selection, brand
fragment assembly, prompt panel/zoom/typing, thinking/result and profile/action
sequence. Approved logo strips replace creator/provider marks, and explicit
local profile content replaces the upstream identity. Unicode typing respects
graphemes; camera fitting preserves base font sizes. Physical cursor arrivals
replace source fades, a bounded release replaces elastic motion, and the final
profile holds instead of exposing the source's blank tail. Source avatar and
soundtrack have individual non-adoption records in the fixed media census.

Current totals: 340 implementations pending combined qualification, 74 earlier
mechanic adaptations, 14 covered shader definitions, 8 excluded definitions and
19 unresolved definitions (5 non-GPU, 14 GPU/spatial). This is source integration,
not a claim that the complete catalog has passed native browser/export QA.

### Cumulative cursor-ray composition (2026-10-16)

`vfx-text-cursor` now supplies `cta/cursor-rays` in the normal engine. The complete
112-sample WebGL ray pass, moving light cursor, mask/color accumulation, logo
entrance/withdrawal and typed-card/headline sequence are retained. Four explicit
shader substitutions map colors to the approved brand. The exact approved logo
PNG replaces upstream logo paths through an approval/hash/path/size checked
texture writer; no source identity, font import or partial fallback is adopted.
Supplied text, measured docking and compact-format stacking replace fixed demo
copy. The first title exits inside a bounded card before the second enters.

Fixed totals now contain 341 implementations pending combined qualification,
74 earlier mechanic adaptations, 14 covered shader definitions, 8 excluded
definitions and 18 unresolved definitions (4 non-GPU, 14 GPU/spatial). The media
census remains418 unique binaries; this source contributes no standalone binary.
Native browser/encoded-video qualification and accepted-lock review are pending.

### Halftone field source integration

`blocks/halftone-field` now supplies native `backdrop/halftone-field`. Its original
analytic noise, gamma crush, dot sizes and four-stop ramp remain in the shader;
source defaults are fixed and palette uniforms use the approved brand. Native
caption timing replaces GSAP and the remote script. The original MIT simplex
notice accompanies the Apache-2.0 composition provenance. This adds one option
to the normal engine, bringing the backdrop catalog to 65. Final combined
workflow/export qualification remains pending.

Four-format native Chrome software-raster checks passed for this addition,
including normal geometry/caption gates, actual uniforms and exact reverse
seeks. The new shader has not yet been qualified in an encoded video or the
final combined catalog run.

### Native UI depth reveal

`blocks/ui-3d-reveal` now maps to `interface/steps/ui-3d-reveal` in the normal
engine. The adapter retains the staged panel/layer reveal, camera push and
perspective inspection, depth exit and logo/tagline/pill close. It accepts a
verified local screenshot, explicit layers/properties and a normalized selection.
Approved PNG strips replace source logo geometry; narrow frames reflow properties
below the image. The engine owns the final scene seam and holds complete copy.

The addition passed 27 focused tests and native Chrome checks in all four formats:
16 viewports and 868 beat samples, actual CSS3D matrices, local-image selection,
text/caption geometry and exact reverse seeks. Four perspective previews and
landscape/square closing frames were visually inspected. This does not qualify
the complete catalog, encoded exports, new audio or scene seams. The accepted
implementation lock and retained 4:5 carousel discrepancy remain unchanged.
Sixteen source definitions remain unresolved: two map data ports and fourteen
GPU/spatial compositions. Font/media dispositions also remain pending.

### Native grade comparison integration

`components/grade-split-reveal` now supplies the normal engine's
`media-grid/solo/grade-split` presentation. Its flat layer, three treatment looks,
primary/grain/vignette shader operations, comparison pause and final commit are
retained. Bounded options control the split, edge and label visibility; verified
local stills replace sample media. Approved brand elements remain ungraded.

The addition passed 26 focused tests, three-look native browser checks in all
four formats and 72 independent pixel cases with analytic grain bounds. Exact
reverse seeks and renderer disposal passed. Combined workflow, scene seams and
encoded-video qualification remain pending.

Fixed catalog totals: 345 implementations pending combined qualification, 74
mechanic adaptations, 14 covered shader definitions, 8 exclusions and 14
unresolved definitions (12 GPU/spatial compositions and two regional maps).
The 418 unique media binaries and 86 font binaries remain separately classified;
this integration does not approve their adoption.

### Native portal panel integration

`blocks/vfx-portal` now supplies `interface/steps/portal-panels` through the normal
engine. Original organic edge noise, distortion, chromatic split, energy ring and
finite camera/radius curves act on two verified local stills. Native aspect,
approved palette and source attribution replace demo website content. The second
cue reveals the attribution; no idle motion or weakened beat gate is introduced.

The addition passed 22 focused tests and native browser checks for two consecutive
scenes in all four formats. Eight full-frame endpoint comparisons reproduced the
expected second still exactly (maximum byte error and RMSE both zero), with exact
reverse seeks and renderer disposal. Combined catalog workflow/export qualification
remains pending. The source fixed radius is preserved, so the ring reaches frame
edges at different times across aspect ratios.

Current totals are 346 implementations pending combined qualification, 74 mechanic
adaptations, 14 covered shader definitions, 8 exclusions and 13 unresolved source
definitions (11 GPU/spatial and two regional maps). Fonts and media retain their
separate adoption/license statuses. The complete shatter source has been reviewed
for the next port but is not counted as integrated.

### Native shatter panels

The closed interface/steps/shatter-panels composition retains source cracking,
200 seeded cells and fixed-step fragment physics on two verified local stills.
The original radial approximation and actual panel-origin rotation are retained.
Approved colors/fonts, native contain-fit and two real caption anchors replace
source demo content, remote scripts and experimental HTML capture.

Source parity, contract tests and native two-scene checks passed in all four
formats. Sixteen initial/final pixel comparisons are exact; reverse seeking and
resource disposal passed. This moves one source definition into the pending
combined-qualification group: 347 implemented, ten GPU/spatial and two map
definitions still unresolved. This does not qualify the accumulated workflow or
encoded exports and does not change the accepted implementation lock.

### Native glass parallax

`blocks/vfx-liquid-glass` now supplies `interface/steps/glass-parallax` in the
normal engine: 54 beveled Voronoi panes, physical refraction, source pointer and
camera choreography, procedural reflections, bloom and grain. One verified still
replaces the source's experimental HTML capture. Approved brand tokens, padded
image fit and two caption anchors keep the composition bounded and reusable.

The source geometry and all pane transforms/material values match an independent
source extraction. Final native checks passed in all four formats with landscape
and portrait inputs, across 16 viewports and 1,128 beat samples. A separate
24-render probe verified stable allocations, exact backward/replacement pixels,
disposal and recreation. The initial retained diagnostic found an extra
transmission texture on replacement; sharing the scene/camera fixed it. Reusing
the input texture also resolved a repeatable 234-byte, one-level raster mismatch
caused by rebuilding resources. Neither assertion was relaxed.

The cumulative isolated Python candidate passed 563 tests; all 452 JavaScript
tests passed. This is unit and glass browser qualification, not final combined
workflow/audio/export approval. The accepted development lock remains unchanged.
Catalog totals are now 348 implementations pending combined qualification,
74 mechanic adaptations, 14 covered shader entries, 8 exclusions and 11 unresolved
definitions: nine GPU/spatial compositions and two regional maps. The latter's
exact versioned geometries have been obtained for offline review, but their native
ports remain pending. Font/media adoption statuses are unchanged.

## Native cuboid carousel integration (2026-10-16)

The ordinary version-3 compiler now exposes `spatial-stage/cuboid-carousel`.
Saved Blender channels for 18 beveled tiles, 201 camera poses, travelling chain, corrected hero handoff, stable readable hero and full 50-frame departure, source PMREM studio and front-only printed faces.

Approved display/body fonts and colors replace source demo identity. Closed 1-12 card records with one-based hero selection; exact whole-word copy and readable bounds are enforced. Source metadata defaults and actual camera transforms are retained with a fixed .72 lens fit. Handheld motion is disabled during the readable hold. Two native cues drive source frames 0-150 then the original 150-200 departure. The shared local renderer owns resources; no GSAP, network, model or font download is introduced.

Native compiler/browser checks pass four formats, 16 viewport checks and 380 event samples, caption/geometry gates and exact reverse pixels. The maximum twelve-card case passes separately. Independent original-module parity matches 890800 scalar comparisons and 2989456 geometry entries across four card/hero configurations. Cumulative workflow, cross-scene seams, audio and encoded exports remain pending.

The catalog now records 354 implemented definitions pending cumulative
qualification, 74 partial adaptations, 14 existing shader correspondences,
eight explicit non-adoptions and five remaining native ports. These counts
do not imply a completed catalog or a qualified final video delivery.

### Native device glass compositions

The iOS/macOS glass sources now supply `spatial-stage/phone-glass` and
`spatial-stage/desktop-glass` in the ordinary compiler. They share the pinned
models, preserve source camera/notification motion and draw caller-supplied
content with approved fonts and local icons. Eight format/style cases pass
32 viewport checks and 680 event samples. Original timeline parity covers
99,110 state values; strict font loading preserves the qualified pixels.
The paired-device camera handoff regression is also repaired and passes all
four formats. Source paths, hashes and limits are in the
[device glass record](../templates/v1/assets/production-device-glass-provenance.json).

The current census contains 357 implemented definitions awaiting cumulative
qualification and two remaining advanced ports: `frost-sequence-camera-orbit`
and `glass-shard-title`. The 74 partial adaptations and media/font rights
dispositions still need closeout. No final encoded-export qualification is implied.
