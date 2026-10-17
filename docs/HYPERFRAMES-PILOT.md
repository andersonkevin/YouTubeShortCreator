# HyperFrames visual integration

Current development engine: eighteen composition families in four explicit profiles,
up to 600 seconds. The sections below retain the evidence for each successive
extension; early qualification limits describe their original run, not the full
current catalog. The operator's full resource integration objective remains active.
The current [cinematic v2 requalification](#cinematic-v2-stability-requalification)
supersedes the earlier open flow-trace raster qualification below.

## Landscape production integration

The development engine now accepts version-3 landscape episodes through normal
`ysc.py new --format landscape --storyboard ...`, `validate`, `build` and `render`.
The closed profile is 1920x1080, 30 fps, up to 600 seconds / 18,000 frames and
1-120 scenes. `ysc.py compositions` lists the eight reusable families: title,
kinetic phrase, grid, attributed quotation, local screen, camera walkthrough,
lower third and CTA. Every visual beat follows a validated caption anchor.
See [authoring commands](CLI.md#landscape-episodes) and [field contracts](DATA-CONTRACTS.md#landscape-version-3).

The shared clock, original recording, captions, brand file hashes, metadata,
manual review and no-overwrite gates still own production. The new module
`production_visuals.py` validates bounded data; `production-scenes.js` and CSS
compose it on the landscape canvas. `production-qa.mjs` checks four preview
viewports, fitting, caption separation, exact reverse seeks and eleven samples
around each seam. Cut-left and zoom-through reuse the prior cinematic curve.
Local stills are hashed, bounded PNG/JPEG files. Content cannot inject HTML,
CSS, scripts, remote files or encoder flags.

The implementation uses explicitly configured FFmpeg. Landscape capture selects
Chrome software rasterization because filtered GPU layers failed exact reverse
seeking in development. The exact-pixel assertion and encoded-media thresholds
were retained. Classic portrait uses its existing capture configuration. Native
landscape, square/4:5, variable fonts and extra transition families remain deferred.
The [production provenance](hyperframes-production-provenance.json) identifies
the selected HyperFrames source files, hashes, license and adaptations; each output
includes that provenance and the Apache-2.0 license. No dependency was added.

The eight-family, 48-second example passed the complete normal render path on
2026-10-15. A full ten-minute, 80-scene export also passed all automated gates. The brand is the
previously authorized synthetic Signal Lab example: the exact logo, palette and
font files were retained. This is not qualification of Cognativ's actual assets.
All exports remain `review_required`; episode listening/editorial approval is separate
from acceptance of the reusable visual assets.

### Operator asset acceptance, 2026-10-15

The operator accepted the visual assets added to the development engine and
identified the rendered video as an internal progress test. This includes the
eight composition families and the integrated cut-left/zoom-through transitions.
The reusable assets are accepted; the test video is not a publication deliverable.
This records the operator's decision without changing brand approval files,
render manifests, implementation locks or validation thresholds. The known
cinematic portrait reverse-seek failure below remains open.

### Qualification results, 2026-10-15

The following table records the original eight-family qualification. The subsequent
focus/data/headline extension has a separate record below.

| Current-lock check | Observed result |
| --- | --- |
| `python3 -B -m unittest discover -s tests -v` | 286 passed |
| `node --test tests/*.test.mjs` | 21 passed; final change affects only Python media selection |
| Normal `ysc.py render`, 48-second landscape showcase | PASS: 1,440 frames, eight families, 15 beats, seven seams, 75 decoded pixel samples |
| Normal `ysc.py render`, ten-minute landscape fixture | PASS: 18,000 decoded timestamps, 80 scenes, 150 beats, 79 seams, 750 decoded pixel samples, source/export audio |
| Classic 12-second portrait export | PASS: 1080x1920, 360 frames, browser/media/pixel/audio checks |
| Original portrait artifacts and brand | All 42 retained output hashes match; seven brand files unchanged; original approval still matches its original lock |
| Docs, release audit and whitespace | PASS; no upload |

The ten-minute input repeats eight synthetic composition families ten times with
measured local narration segments. It proves full-length execution on this host,
not a finished ten-minute editorial story or universal text-density coverage.
Capture used approximately 1.11 GB of temporary PNGs. All failed runs remain
available privately. The final verifier groups and balances frame selections,
fixing the initial 750-term FFmpeg parsing failure without dropping samples.

A separate attempt to requalify the earlier cinematic portrait example failed
its exact reverse-seek assertion at flow-trace frame 20. That mode is not newly
qualified by this task. Its renderer and threshold were retained; classic portrait
and the new landscape path passed. Other brands, maximum-density content and
human visual/listening approval remain separate qualification work.

### Changed implementation files

| Area | Files and purpose |
| --- | --- |
| Authoring and profile | `ysc.py`, `production_visuals.py`, `media_contract.py`, `workflow.py`: closed v3 authoring, local assets and 600-second bounds in the normal engine |
| Composition and timing | `production-scenes.js`, `production-scenes.css`, `motion.js`: eight landscape families, existing brand roles and shared clock |
| Browser validation | `capture.mjs`, `production-qa.mjs`: fitting, exact seeking, seams, software rasterization and disk-budget evidence |
| Media and cover | `media_backend.py`, `ffmpeg_backend.py`, `frame_qa.py`, `branding.py`: profile geometry, full timing/pixel/audio validation and landscape thumbnail |
| Tests and distribution | `tests/test_production_visuals.py`, `tests/production-scenes.test.mjs`, `.github/workflows/tests.yml`, `tools/freeze.py`, `tools/release.py`, `lock.json`: regression, integrity and explicit public-source inclusion |
| Documentation and provenance | CLI/data/media contracts, README/roadmap/inventory updates, `hyperframes-production-provenance.json` and third-party notices |

Only the development copy and new private qualification workspaces were written.
No production edits, dependency installation, external service, hooks, server,
commit or push occurred. The existing pipeline cleans only its own temporary
capture/codec scratch. New development qualifications do not replace old approvals.

Recommended commit message: `feat: add validated landscape compositions and ten-minute exports`.

### Focus, data and headline extension

The normal version-3 engine now includes three reusable additions:

- `screen.content.focus`: one contained local image, 1-3 narrated regions, clamped
  zoom/pan, region outline and active label. Existing image-swap behavior is retained.
- `chart.content.record`: the existing visual-library source/data contract for
  animated bar, line, metric and comparison compositions on the landscape canvas.
  Source attribution stays visible; the existing numeric clock preserves endpoints.
- `transition: "text-match"`: non-overlapping pairs of adjacent title scenes share
  a measured headline carrier and one HyperFrames cubic-bezier motion curve.
  Titles remain at approved font size and must fit a single line.

Use `ysc.py compositions` to discover the options and the
[landscape data contract](DATA-CONTRACTS.md#landscape-version-3) to author them.
All three use the normal `new`, `validate`, `build` and `render` commands.
No alternate demo renderer, package, network call or brand substitution is added.
The existing 600-second profile and other composition families remain available.

Implementation changes: `production_visuals.py`, `production-scenes.js` and CSS,
`production-qa.mjs`, `ysc.py`, two production test files, production provenance and
the development implementation lock. The new browser checks preserve exact
reverse-seek equality and add focus containment, data endpoints, label collisions,
visible source text and headline carrier continuity. This work does not modify
the earlier cinematic portrait mode or qualify its unresolved raster issue.

Extension qualification on 2026-10-15: 289 Python tests and 23 Node tests passed.
A 50-second normal-engine export passed browser, media, decoded-pixel and audio QA:
1,500 frames, eight scenes, 15 visual beats, seven seams, four viewports and 75
decoded pixel samples. Source/export audio correlation was at least 0.999480 with
zero measured lag. All 46 output hashes were verified against the final lock.
The eight earlier composition screenshots were byte-identical in a fresh browser
regression; only malformed-content rejection changed afterward, with no renderer
change. The final video is byte-identical to the pre-validator export.

The existing example-brand files and retained output files are unchanged. The
50-second video is an internal progress test with illustrative data and measured
local narration segments. This extension does not claim a new ten-minute render;
the prior full-length evidence is retained. Documentation and release checks
passed. No dependencies, external services, production writes, commits or pushes
were added. Full development evidence is retained privately under
`workspaces/visual-upgrade-2026-10-15/implementation-results.json`.

Recommended commit message: `feat: add landscape focus, data and headline motion`.



Development candidate only. The operator requested an example brand. The example does not approve a real channel, benchmark, or publishable episode.

## Cinematic composition

The explicitly requested composition redesign is opt-in: add `"composition":"cinematic-v1"` and `"transition":"cut-left"` or `"zoom-through"` to every scene's presentation. Keep `reveal:"fade"`, `exit:"fade"`, `exit_duration:0.4` and its existing story cues. Supported records are flow, bar (up to four categories) and comparison. Mixed classic/cinematic sequences are rejected.

This mode replaces the fixed chart-card arrangement with masked oversized step typography and icons, a hero number above a tall chart, and a full-stage comparison wipe. The composition uses an 880x900 chart inside a clipped 1080x1230 motion viewport. Titles, insights and source lines remain bounded. The actual logo, colors, fonts, top progress bar, original narration and caption safe zone remain unchanged. The classic frame contract is unaffected when this mode is omitted.

Seams port the HyperFrames mirrored power curves and matching scale direction onto the existing frame clock. The opaque brand ground and clipped motion viewport prevent flashes and intrusion into the logo/captions. Browser QA retains the existing gates and additionally checks both seams at 11 frame offsets, reverse-seek pixel equality, exclusive scene visibility, movement direction, velocity ratio, caption bounds and stable logo bounds. These checks adapt the upstream seam doctrine to Short Creator; its original preview-player-only seam tool is not applicable to this runtime. All implementation and provenance changes require a new development qualification.

## Narrative motion

The reusable `presentation.story` mode builds the content over narration cues, rather than revealing a finished static chart. It uses the existing records, scene geometry, approved brand tokens, caption clock and output gates. The final values come directly from the input; source records never change.

| Preset | Existing visual | Required cues | Result |
| --- | --- | --- | --- |
| flow-trace | flow | One per step | Nodes appear after their connecting path draws; a traveling point shows the handoff. |
| chart-build | bar or line | One per category | Bars grow from zero; line segments draw to each data point; the current value counts to its exact target. |
| metric-count | metric | One | A large contextualized value counts to its exact target, with a progress arc for the animation. |
| compare-swap | comparison | Two | The first panel starts centered, then moves aside as the second state arrives. |

Example, added to an otherwise complete presentation object:

```json
{"story":{"preset":"flow-trace","cues":[0,1,2,3]}}
```

Each cue starts a fixed 24-frame beat. Beats must be ordered, non-overlapping and wholly inside their scene. Charts support one series and two to six categories with the standard chart style. Existing richer static charts remain available. Story mode and decorative effects are mutually exclusive. Unknown fields, selectors, executable content and external resources stay rejected. Omit `story` to keep the original rendering path.

Use `python3 -B tools/visuals.py describe visual:flow` (or bar, line, metric, comparison) to discover compatible story presets. Browser QA checks all narration beats with forward/backward seeks in addition to the original layout, caption, font, network and media gates.

The new renderer ports the SVG stroke-length reveal from `flowchart-vertical` and `chart-story`, geometry-based chart growth and exact count endpoints from `chart-story`/`count-up`, and shared state progress from `comparison-split`. GSAP timelines are replaced by the existing frame clock. All original license notices and source hashes are retained.

## Earlier decorative pilot

Three optional effects extend the existing version 2 visual-library scene. They use the existing 30 fps seek clock, checked chart data, and brand accent. The logo, typography, captions, layout geometry, scene boundaries, native audio path, and publication gate remain owned by Short Creator. Omitting `effects` retains the existing rendering path.

| Preset | Visual kind | Target | Behavior |
| --- | --- | --- | --- |
| cascade-v1 | flow | steps | Semantic cards enter in order and then hold still. |
| outline-v1 | metric | metric-panel | A hollow accent outline draws around the existing panel. |
| highlight-v1 | comparison | comparison-right-title | An accent underline grows below the right column heading. |

Add `effects` to the existing `presentation` object. Each effect has exactly these fields:

```json
{"preset":"outline-v1","target":"metric-panel","cue":3,"duration_frames":24}
```

`cue` is a zero-based index into the existing caption cues. Start time rounds up to the next 30 fps frame; durations are 12-60 integer frames. Each effect must fit within its scene before the exit. Outline and highlight must follow the existing entrance. Unknown presets, mismatched targets, duplicate targets, arbitrary selectors, CSS, markup, and URL fields are rejected. At most two entries are permitted; this pilot supports one target per visual kind.

The browser gate samples effect onset, intermediate progress, completion and adjacent frames, and checks backward seeking. Existing overflow, caption, font, network, scene, and media checks still apply. Effect assets and provenance are covered by the development implementation lock; outputs carry licenses and source provenance and remain `review_required`.

## Local synthetic comparison

Use a clean baseline checkout for the before render, and this development checkout for the candidate. Existing runtime dependencies must already be available; these commands install nothing. Create new workspace/run names rather than overwriting outputs.

```bash
python3 -B tools/hyperframes_pilot.py --workspace workspaces/pilot --effects --approve-write
python3 -B ysc.py --workspace workspaces/pilot configure --approve-write
python3 -B ysc.py --workspace workspaces/pilot render episodes/test-episode/episode.json --run-id pilot --approve-write
python3 -B -m unittest discover -s tests -v
node --test tests/*.test.mjs
python3 -B tools/check_docs.py
git diff --check
```

Supply explicit runtime paths using the existing configure options or `YSC_NODE` and `YSC_PLAYWRIGHT`. The fixture deliberately generates a tone, synthetic timing and a test brand approval only in a new private workspace. Do not apply this helper to a real brand. The fixture episode without effects can be rendered by the baseline implementation using its own synthetic approval; real approvals are tied to their original implementation hash and must not be transplanted to this candidate.

## Source and modifications

HyperFrames is Apache-2.0 at the inspected revision. Source paths and content hashes are in [the provenance manifest](hyperframes-provenance.json). Earlier entries were verified against the pinned remote commit; the additional cinematic entries identify the user-supplied local snapshot and are not claimed as remotely verified. The [Apache license](licenses/hyperframes-apache-2.0.txt) accompanies the adapted code and enabled output. Outline mask/gradient and highlight scaling are adapted from its components; the cascade pattern is reimplemented on existing ECharts graphics. Cinematic mode also ports masked kinetic type, curtain wipes and mirrored seam curves. Styles stay scoped to the selected composition, colors come from the brand, and native seeking replaces the upstream GSAP timeline. No GSAP, CDN, HyperFrames runtime, independent timers, new package dependencies, hooks, or online services are introduced.

Studio, additional transition families, shaders, 3D, sound effects, audio mixing, backend replacement, production promotion and publication are deferred. Full HyperFrames composition lint/check does not apply: this is a Short Creator adapter using its existing browser and media gates, not a HyperFrames HTML composition.


## Multiformat composition qualification

Version-3 production compositions now use explicit `portrait` (1080x1920),
`square` (1080x1080), and `portrait-4x5` (1080x1350) profiles as well as landscape.
All use the normal author/build/render path, 30 fps, and the shared 600-second
contract. Fixed geometry belongs to the engine; episode input cannot supply CSS,
JavaScript, fonts or frame dimensions. Portrait uses stacked cards, compact formats
wrap measured kinetic phrases, screenshots sit below copy, and charts derive their
plot from the selected canvas. Typography recipes preserve the approved font files,
palette and logo. Covers use the corresponding aspect ratio.

Current local qualification (2026-10-15):

- Three 80-second MP4s, one per added format, each 2,400 frames and 13 scenes:
  all nine families, all four data variants, two screenshot focus targets, and
  matched-headline/directional/zoom transitions.
- Four browser viewports, exact reverse-seek pixels, per-beat motion, seam continuity,
  fixed logo/caption geometry, numeric endpoints and provenance checks pass.
- Media timestamps, all 131 decoded frame samples per video, and waveform checks
  pass without changing regional/tile or audio thresholds. Output remains
  `review_required`; internal generated narration is not publication approval.
- Existing landscape qualification rebuilt: all eight original-family captures and
  all eight later focus/chart/title captures remain byte-identical.
- 293 Python tests and 24 Node tests pass. The 600-second boundary is covered in
  tests for each profile; the new profile exports are 80 seconds, not full ten-minute
  soak tests. The earlier 600-second landscape run remains separate evidence.

A first portrait export failed its progress-region pixel check: odd Y alignment
blurred both thin-line edges under H.264 4:2:0 at two sampled frames. Moving the
portrait progress bar from Y=45 to Y=44 resolved this while retaining every quality
threshold. Earlier failed runs and the pre-change lock remain in private development
workspaces. No original brand approval or delivered artifact was overwritten.

The full [asset census](HYPERFRAMES-INVENTORY.md#full-local-asset-census-2026-10-15)
is a source inventory, not bulk feature adoption. Variable-font substitution,
WebGL/shader loading, and arbitrary upstream content remain outside this engine.


## Production resource expansion, wave 01

The normal version-3 engine now includes eight more bounded source adaptations:

| Source mechanic | Authoring surface | Boundaries |
| --- | --- | --- |
| Per-word rise, blur-in, typewriter, seeded scramble | `title.content.reveal` | Four additional entrances; exact final text, fixed approved fonts, no idle loops |
| Iris reveal | `screen.content.swap: "iris"` | Local stills only; one radius owns image clipping and the accent rim |
| Screen-flow carousel | `kind: "carousel"` | 2-5 hashed local stills; one caption cue per screen |
| Code highlight | `kind: "code"` | 2-12 display-only lines; 1-6 caption-anchored highlights; no execution or syntax plugins |
| SVG stroke trace | `kind: "diagram"` | 2-4 steps using pinned icons and measured engine-generated connectors |

The total is twelve composition families. The new `production-resources.js/.css`
module is loaded by the existing production renderer, not a separate demonstration
application. `production_visuals.py` owns the closed input schema; `workflow.py`
and `ysc.py` retain normal author/build/render behavior. Additional title entrances
cannot participate in a text-match pair because that transition owns the headline.
Image focus and image swaps are separate modes. New records cannot supply code,
selectors, arbitrary SVG paths, remote assets, font substitutions or CSS.

Qualification on 2026-10-15:

- 297 Python tests and 27 Node tests pass, including count limits, malformed content,
  local image boundaries, deterministic scramble and exact animation endpoints.
- Four normal-engine 52-second exports pass: 1920x1080, 1080x1920, 1080x1080 and
  1080x1350, each with 1,560 frames, nine scenes, 16 beats and eight seams.
- Browser fitting at four viewports, exact reverse seeks, beat/seam motion,
  caption/logo geometry, source text and measured highlight/carousel/iris checks pass.
- Each export passes 80 decoded pixel samples, timestamps and source/export audio
  checks at the unchanged thresholds. Output remains `review_required`.
- The maximum-count fixtures (12 code lines, six highlights, five screens and four
  diagram steps) pass browser QA in all four profiles using representative copy.
  Input character bounds are not a guarantee that every longest string will fit;
  fitting failures remain hard errors rather than automatic font reduction.
- All 39 captures from the prior three compact-format fixtures remain byte-identical
  under the final implementation. Prior brand and output hashes remain unchanged.

The five-screen landscape fixture initially caught accumulated positioning error
from rounded card widths. The renderer now uses fractional computed widths; the
original strict center check passes without a tolerance change. The failed run is
retained privately. Earlier test-fixture construction errors are retained as well.

Source paths, hashes, changes and notices are recorded in production provenance.
The full census now identifies 29 source definitions with adapted mechanics and
426 without a port (347 non-GPU candidates and 79 GPU/spatial candidates). These
are partial mechanic adaptations, not 29 complete upstream imports. The broader
integration objective remains active. Fonts, demo media, shaders and engineering
packages retain individual review requirements; the approved example brand is
unchanged. No production change, installation, new external call, server, commit
or push occurred. Private evidence and videos are under
`workspaces/integration-wave-01-2026-10-15/implementation-results.json`.

Recommended commit message: `feat: add validated multiformat production resources`.


## Attribution and checklist expansion, wave 02

The version-3 engine now exposes thirteen composition families. Lower-third
records retain their existing fields and default side-rule layout, with ten
additional closed variants: accent underline, bold block, clean bar, color block,
dark card, kicker/name, mask reveal, neon border, soft pill and stacked bars.
These port the remaining ten `lt-*` source blocks. Names and roles remain exact;
font files, palette tokens, logo, captions and transition ownership stay unchanged.

The `checklist` family adapts `marker-checklist-card`: two to five cue-driven
label/value rows, an optional ellipse around one exact heading substring, and
checks drawn only for explicitly true input states. False states never become
complete because the animation finishes. The paper theme, source fonts and
example claims are not imported. No status is inferred from copy.

Implementation is in `production_visuals.py`, `production-resources.js/.css`, the
existing production dispatch, `production-qa.mjs` and `ysc.py compositions`.
Relevant renderer functions are `lowerThird`, `lowerThirdState`, `roundedRail`,
`cornerHead` and the checklist branch of `mount`. Neon uses the source's rounded
perimeter, measured path correction and paired tapered segments for one entrance
lap, then holds. Original indefinite laps and arbitrary style/timing controls are
not enabled. Global scene seams still own every exit.

Qualification on 2026-10-15:

- 299 Python and 29 Node tests pass. Input checks cover explicit booleans, supported
  variants, unknown style/code fields, item count, cue count and exact emphasis.
- Four normal-engine 58-second exports pass at 16:9, 9:16, 1:1 and 4:5: 1,740 frames,
  thirteen scenes, eighteen beats, twelve seams and 91 decoded pixel samples each.
  The fixture includes every lower-third variant and both checklist count bounds.
- All browser viewports, exact reverse seeks, deterministic holds, source/caption
  text, check states, clipping bounds, media timestamps and source/export audio
  pass at unchanged thresholds. Outputs remain `review_required`.
- All 75 retained captures from the first resource wave and original compact-format
  fixtures are byte-identical under the new implementation lock.
- No dependency, upstream font/media import, external call, server, production
  change, commit or push occurred. Old output and approval records are retained.

The targeted authoring test caught an icon collector that assumed every `items`
record contained an icon. It now collects only present, already validated icon
fields; the temporary checklist fixture and all existing icon compositions pass.
The first portrait test cover was too long. Its example headline was shortened
instead of changing type size or weakening the fitting gate. Failed diagnostics
remain in the private workspace.

The complete census still covers 9,375 unchanged upstream files and 455 catalog
entries. Forty source definitions now have bounded adaptations; 415 remain without
a port (336 non-GPU and 79 GPU/spatial candidates). Metadata classification now
prioritizes explicit families and matches `graph` as a token, correcting 53 entries
without changing source hashes or total counts. Adaptation counts are partial
mechanic coverage, not complete imports. The full resource integration objective
remains active. Evidence and generated videos are recorded privately in
`workspaces/integration-wave-02-2026-10-15/implementation-results.json`.

Recommended commit message: `feat: add branded attribution variants and animated checklists`.

## Numeric resource expansion (2026-10-15)

Five additional source mechanics are reusable metric styles in the normal
version-3 engine: `number-wheel`, `slot-machine-roll`, `number-pop-in`,
`mk-usage-arc`, and `mk-progress-stat`. The renderer keeps exact final numeric
strings, including signs, fractions and scientific notation. Arcs and bars
require an explicit positive maximum and encode value divided by that maximum.
The maximum, unit, source type, label, reference and date remain visible.
The existing `count` style, brand files, caption clock and scene seams are retained.

Changed implementation: `production_visuals.py` closes the optional metric fields;
`production-resources.js` implements measured masked digit rows, a bounded pop
entrance and synchronized gauge fills; `production-scenes.js` dispatches the
opt-in styles. `ysc.py compositions` lists them. `production-qa.mjs` checks actual
digit row transforms, clipping, final glyphs, numeric values and gauge geometry.
Source hashes and adaptations are in the existing production provenance manifest.
No upstream GSAP runtime, font, palette or example claims were copied.

Qualification:

- 301 Python and 31 Node tests pass, covering numeric/provenance validation,
  explicit maxima, signed/fractional/scientific values, zero/full gauges,
  unexpected options, and history-independent column phases.
- Four normal-engine 46-second videos pass at 16:9, 9:16, 1:1 and 4:5. Each has
  1,380 frames, eleven scenes, eleven beats, ten seams and 56 decoded pixel samples.
  Browser fitting at four viewports, exact reverse seeks, media timestamps and
  source/export audio pass. Pixel thresholds remain region RMSE 10 and tile 24.
- All 39 retained original compact-format scene captures are byte-identical.
  The 589 retained input, brand and output hashes checked before editing are unchanged.
- The first reel diagnostic exposed that a nested SVG bounding box includes
  off-mask children. QA now measures its explicit viewport rectangle and asserts
  clipping and final glyph containment. The rendered glyphs were already correct;
  the failed diagnostic remains retained. No collision tolerance was increased.
- The new local review page plays all four videos, filters 455 source entries,
  and issues no HTTP requests. No server, dependency installation, production
  modification, commit or push occurred. Outputs remain `review_required`.

The source census still covers 9,375 unchanged upstream files. Forty-five catalog
definitions have bounded adaptations; 410 remain without a port or final
disposition (331 non-GPU, 79 GPU/spatial). Media/fonts, shader algorithms, workflow
references and engineering packages remain separately inventoried. No complete
integration or rights-clearance claim is made. The older v2 cinematic flow-trace
reverse-seek issue remains unqualified; these results qualify v3 numeric resources.
Private evidence: `workspaces/integration-wave-03-2026-10-15/implementation-results.json`.

Recommended commit message: `feat: add branded metric reels and explicit-scale gauges`.

## Evidence resource expansion (2026-10-15)

Five more source mechanics are available through the normal version-3 engine:
`star-rating-fill`, `trust-strip`, `testimonial-card`, `social-proof-card`, and
`badge-pop`. The optional `star-rating` metric requires the `stars` unit, an
explicit integer maximum from one to ten, and a value within that scale. Three
new composition families require supplied text and structured source records:
`trust` reveals three to seven distinct marks; `testimonial` pairs a supplied
quotation and rating with its author and role; `proof` arranges a supplied claim,
rating, three icon features, optional short badges, and an action label. Ratings
are never defaulted, and no example endorsement or avatar is imported.

The engine now exposes sixteen composition families and seven metric styles.
`production-evidence.js/.css` implement brand-controlled layouts and pure,
cue-driven animation. `production_visuals.py` validates the bounded records;
the shared source validator preserves its existing contract. `workflow.py`,
`production-scenes.js` and `production-resources.js` load and dispatch the new
resources. `production-qa.mjs` checks source text, exact values, star masks,
cue phases, fitting and collisions. Source paths and hashes are retained in
the production provenance manifest.

Qualification:

- 304 Python and 34 Node tests pass, including fractional and zero ratings,
  explicit maxima, rejected unexpected fields, source records, icon and badge
  limits, bounded initials, and history-independent animation phases.
- Four normal-engine 76-second videos pass at 16:9, 9:16, 1:1 and 4:5. Each has
  2,280 frames, twelve scenes, 26 beats, eleven seams and 130 decoded pixel samples.
  Browser checks at four viewports, reverse seeking, media timestamps, exact
  caption timing, and source/export audio pass. Frame thresholds remain region
  RMSE 10 and tile RMSE 24. Outputs remain `review_required`.
- All 44 prior numeric-composition reference captures are byte-identical under
  the new lock. All 284 retained input, brand and output hashes are unchanged.
- Initial diagnostics caught clipped quotation glyphs and a real landscape
  rating/value collision. Quote line-height and fixed layout space were corrected;
  the landscape value now sits beside the stars. Font sizes and QA tolerances
  were preserved. Failed builds and renders remain in the private workspace.
- The local review page contains four playable videos and 455 searchable catalog
  entries, with no HTTP requests. No dependency installation, new server,
  production modification, commit or push occurred.

The unchanged source census covers 9,375 upstream files. Fifty catalog definitions
now have bounded adaptations; 405 remain without a port or final disposition
(326 non-GPU and 79 GPU/spatial). These counts describe partial mechanic coverage.
The full integration goal remains active. Media/font clearance, remaining source
coverage, the older v2 flow-trace reverse-seek issue, and human editorial review
are not resolved by this qualification. Private evidence and the changed-file
list are retained in
`workspaces/integration-wave-04-2026-10-15/implementation-results.json`.

Recommended commit message: `feat: add sourced ratings and evidence compositions`.

## Local-screen transition expansion (2026-10-15)

Five more source mechanics are integrated as optional version-3 screen swaps:
`curtain-reveal`, `grid-pixelate-wipe`, `halftone-dissolve`, `fade-through`, and
`whip-pan-cut`. The `screen` record now accepts `curtain`, `grid`, `halftone`,
`fade-through`, or `whip-pan` alongside its existing `wipe` and `iris` modes.
All use verified local stills, the approved palette, contain-fit image geometry,
and the existing 24-frame cue envelope. Browser, window and phone frames remain
reusable in all four formats. These effects stay inside the device viewport;
the brand, captions, scene seams and narration are unchanged.

`production-transitions.js/.css` contain the fixed algorithms. The normal
`production_visuals.py`, `workflow.py` and `production-scenes.js` path validates,
loads and dispatches them. `production-qa.mjs` checks actual mask/overlay states,
full coverage at image switches, image endpoints, horizontal blur and rendered
strip displacement, with additional reverse-seek samples. No GSAP runtime,
remote slot, palette override, default media or sound-event integration was added.
Source paths and hashes are recorded in the production provenance manifest.

Qualification:

- 305 Python and 38 Node tests pass. Tests cover normal authoring, rejected image
  paths and unsupported options, seeded thresholds, complete viewport coverage,
  centered grid ordering, curtain closure and history-independent motion.
- Four normal-engine videos pass at 16:9, 9:16, 1:1 and 4:5. Each lasts 59 seconds:
  1,770 frames, ten scenes, 26 beats, nine seams and 131 decoded pixel samples.
  Browser fitting, reverse seeking, media timestamps, source/export audio and
  caption timing pass. Pixel limits remain region RMSE 10 and tile RMSE 24.
- All 84 previous evidence and resource captures are byte-identical across eight
  fresh regression builds. All 296 retained input, brand and output hashes are
  unchanged. Outputs remain `review_required`.
- A coverage test found an upstream-style halftone edge gap. An outside ring of
  seeded dots closes the viewport corners; no radius tolerance was relaxed.
- Portrait QA exposed CSS matrix text rounding: `-1771.88` versus the painted
  position `-1771.875`. The verifier now measures rendered displacement directly
  with the same 0.001-pixel tolerance. All twenty diagnostic positions were exact.
- The interrupted final 16:9 and 4:5 workers were confirmed stopped. Only their
  two orphaned private headless browsers were closed. New `final-02` runs preserve
  the partial `final-01` artifacts. No original approvals or outputs were changed.
- The local review page plays all four videos, filters 455 catalog entries, and
  makes no HTTP requests. There were no new dependencies, services, production
  changes, commits or pushes.

The unchanged source census covers 9,375 upstream files. Fifty-five definitions
now have bounded adaptations; 400 remain without a port or final disposition
(321 non-GPU and 79 GPU/spatial). Coverage remains partial and the full integration
objective stays active. The older v2 flow-trace issue, remaining source coverage,
media/font qualification and per-feature long-duration soak remain separate work.
Private evidence and changed files are recorded in
`workspaces/integration-wave-05-2026-10-15/implementation-results.json`.

Recommended commit message: `feat: add deterministic local-screen transitions`.


## Resource expansion 06: brand-preserving title treatments

Nine additional title reveals are integrated into the normal version-3
`new/build/render` path in all four profiles. `production-type.js/.css` adapts
`bottom-up-letters`, `top-down-letters`, `caption-clip-wipe`, `line-by-line-slide`,
`char-slam-explode`, `headline-slam`, `text-shimmer`, `tracking-in` and
`streaming-text`. These are bounded source-mechanic adaptations, not full upstream
component imports. The production provenance retains exact source hashes and the
Apache-2.0 notice.

Letter cascades preserve grapheme clusters. Word wipes and measured line slides
keep the source text intact. The character impact uses the source scatter table;
the whole-title impact uses a bounded scale arrival. Both settle after a fixed
three-frame title-only shake. Shimmer makes one pass and returns to plain type.
Tracking uses transforms around each measured row; word bursts preserve order and
simultaneous groups. All finish within the existing 24-frame cue envelope.
The approved font files, type roles, final sizes, caption text/timing and brand
geometry remain authoritative. Upstream auto-fit, font/weight overrides, idle
loops, remote media and runtime packages were not imported. Text-match still
owns paired headline motion and requires the default `rise` reveal.

Qualification on the current development lock:

- 305 Python tests and 43 Node tests pass, including all fourteen accepted title modes,
  unknown-mode rejection, Unicode grapheme boundaries, fixed impact frames and exact endpoints.
- Four normal-engine MP4s pass in 1920x1080, 1080x1920, 1080x1080 and 1080x1350.
  Each is 47 seconds / 1,410 frames, with eleven scenes, eleven beats, ten seams
  and 56 decoded-pixel samples. Nine new entries have thirteen exact forward/backward
  seek samples apiece, including both impact landings. Thresholds are unchanged.
- Browser checks confirm exact supplied title text, approved font role, no inline
  type overrides, final opacity/visibility, identity transforms, removed blur/wipes,
  streaming order and the shared clock. Four preview viewport sizes pass.
- Twenty-seven captured entry/detail frames and all four final layouts were
  visually inspected. Long text remains subject to fitting checks; no automatic
  type shrink or arbitrary styling was added.
- Eight fresh builds of previous screen-transition and resource fixtures preserve
  all 76 reference scene captures byte for byte across four formats.
- All 416 retained prior input/brand/output hashes and all 9,375 upstream source
  file hashes match. The first new fixture correctly rejected unused image records;
  its inputs and error log remain retained. No validation was relaxed.
- The local review page plays all four videos, filters 455 catalog entries and
  makes no HTTP requests. The census now records 64 source definitions with
  bounded adaptations and 391 remaining (312 non-GPU, 79 GPU/spatial).

The full resource objective remains active. Older v2 cinematic reverse-seek
qualification, per-feature long-duration soak, actual Cognativ production-brand
qualification and human editorial/listening approval remain separate. The existing
ten-minute qualification is retained; this wave does not claim another full-length
render. All new videos remain internal tests with `review_required`.

Evidence and changed files are retained under
`workspaces/integration-wave-06-2026-10-15/implementation-results.json`.
Only the development copy and new private workspaces were written. No production
edits, Git mutations, dependencies, services, uploads or servers were added.
Recommended commit message: `feat: add brand-preserving title animation resources`.


## Resource expansion 07: media layouts and card treatments

The normal version-3 engine now exposes seventeen composition families. The new
`media-grid` family adapts four HyperFrames sources: `mk-placeholder-grid`,
`gloss-sweep`, `spotlight-card` and `split-tilt-cards`. It has six fixed layouts
(solo, two, three, four, six and a 58% hero panel) and four compatible treatments
(box entry, one-pass gloss, one-pass spotlight and mirrored book-open cards).
Tall profiles rotate/stack the recipes. Every image uses contain-fit, an explicit
label, one caption cue and the existing local PNG/JPEG path/hash contract.
The source string stays visible outside the animated card. No source demo imagery,
font replacement, automatic crop, arbitrary slots, idle loops, sound events,
external libraries or publication behavior was imported.

`production-media.js/.css` provides the bounded recipes and card motion.
`production_visuals.py`, `production-scenes.js`, `workflow.py` and `ysc.py` connect
these records to normal discovery, validation, authoring, build and rendering.
Browser QA checks actual card bounds, disjoint layouts, image/label separation,
contain-fit, source paths, cue opacity, static tilt and completed light sweeps.
Projected labels and images share one card plane; their local boxes establish
separation without confusing overlapping perspective bounding rectangles.
Gloss/spotlight entries have extra samples at frames 14, 16 and 18.

The first square and portrait exports exposed a separate FFmpeg verifier defect:
its flat-expression shortcut accepted up to 128 frame indices, but this fixture's
121-term expression failed in the installed parser. Selections larger than eight
frames now use the existing balanced range builder. All indices are preserved;
timestamp, pixel, audio and failure gates are unchanged. Reading the retained
failed export with the corrected selector passes all 121 requested samples.
The final square/portrait videos are byte-identical to those earlier exports;
the old failure records and artifacts remain intact.

Qualification on the current development lock:

- 308 Python and 47 Node tests pass. Coverage includes every layout/treatment
  combination, cue cardinality, unknown controls, local asset paths/hashes,
  escaped text, recipe containment, source ratio and deterministic entry states.
  Frame-selection tests cover the previous shortcut boundary and 18,000 indices.
- Four normal-engine videos pass at 1920x1080, 1080x1920, 1080x1080 and 1080x1350.
  Each is 59 seconds / 1,770 frames, with ten scenes, 24 beats, nine seams and
  121 decoded-pixel samples. All remain internal tests with `review_required`.
- Twelve additional light frames prove that gloss/spotlight change painted pixels,
  reproduce exactly after reverse seeking and match the encoded MP4 under the
  unchanged region-10/tile-24 pixel thresholds.
- Sixteen intermediate/final detail captures and the four final layouts were
  visually inspected. Eight prior typography/resource builds retain all 80 scene
  captures byte for byte. All 360 retained prior input/brand/output hashes match.
- The local review page has four playable videos and 455 searchable source entries,
  with no HTTP requests. All 9,375 upstream file hashes are unchanged. The census
  records 68 entries with bounded adaptations and 387 still pending (308 non-GPU,
  79 GPU/spatial). This is partial source coverage, not a complete repository port.

The older v2 cinematic reverse-seek issue, actual Cognativ production-brand
qualification, per-feature long-duration soak and human editorial/listening review
remain separate. The existing ten-minute qualification is retained; this wave
qualifies the new 59-second fixture, not another ten-minute export.

Evidence, exact commands and changed files are retained under
`workspaces/integration-wave-07-2026-10-15/implementation-results.json`.
Only the development copy and new private workspaces were written. No production
edits, Git mutations, dependency installation, services, uploads or servers were added.
Recommended commit message: `feat: add cue-driven media galleries and card treatments`.

## Fourteen shader screen transitions (eighth integration expansion)

The v3 screen composition exposes the fourteen retained algorithms from
`packages/shader-transitions` through closed `shader-*` swap names. Local still
hashes, brand tokens, fixed 24-frame timing, exact captions and the normal
`ysc.py new/build/render` path remain authoritative. This package work is counted
separately from the 68 partially adapted registry entries.

Original GLSL bodies are retained. The adapter makes descending smoothsteps
well-defined, sizes iris coverage to the viewport, tapers into original-image
endpoints and antialiases three RGB-separation effects by at most 1.2 pixels.
The normal H.264 4:2:0 encoder and pixel/audio quality thresholds are unchanged.
A single shared context owns two textures and at most fourteen programs; no
DOM snapshot runtime, GSAP, html2canvas, cache service or network is introduced.
Local-file texture restrictions are handled by encoding verified PNG/JPEG bytes
in a private run asset, without disabling origin checks or starting a server.

The package README says MIT while the archive root says Apache-2.0; package.json
has no license field. Exact declarations and hashes are retained in production
provenance. This development integration does not establish public redistribution
clearance. Existing source media, font and trademark rights remain independent.

Qualification records and all failed diagnostics are retained under
`workspaces/integration-wave-08-2026-10-15/`. A passing automated run remains
`review_required`; actual Cognativ branding and editorial/publication review are
separate. The complete integration objective remains open.

## Cinematic v2 stability requalification

The original `flow-trace frame 20` failure was reproduced through the normal
engine with the same two PNG hashes retained in the historical log. The new
mismatch artifacts locate the discrepancy to 30 icon pixels; effect timing and
brand input bytes match. Initial viewport-resize probes also exposed compositor
history artifacts, but those are separate from the reproduced post-reload failure.
The existing compositor reload remains intact.

Opt-in v2 `cinematic-v1` capture now uses the same software raster configuration
as v3. Classic v1 and non-cinematic v2 retain their prior configuration. No scene
geometry, typography, input contracts, encoder or pixel/audio threshold changed.
The v2 effect gate now compares every effect frame and preserves exact failure
images and metadata. Original failed runs and diagnostics remain unchanged.

Evidence for this qualification is under
`workspaces/integration-wave-09-2026-10-15/`; successful exports remain
`review_required`. This closes the reproduced case on the recorded local runtime,
not a claim of universal pixel identity across other browsers, hosts or brands.

## Headline and marker resource expansion

The normal v3 engine adds the eighteenth family, `headline`, with `line`,
`state`, and `caret` swaps. Phrases and their cue indices are episode data.
The source mechanics are the upward mask/underline of `line-swap`, paired
opacity/blur of `text-state-swap`, and measured cover plus accelerating grapheme
prefixes of `caret-swap`. The final text holds still; the caret stops blinking.

Title reveals also add `matrix` and `focus-resolve`. The upstream matrix source
creates zero cells without completing the declared final-text resolution. The
adaptation retains its staggered cells and implements deterministic binary
cycling with exact final graphemes. Focus retains the 16px blur and 1.08 scale
word sequence. Both preserve approved type and the existing 24-frame envelope.

A title marker requires an explicit text match and second cue. All four source
paths from `marker-highlight` are retained: highlight, circle, underline and
scribble. Dash lengths are measured; the initial round cap remains invisible.
The small settle pop is translated inside the original title bounds when its
word starts or ends a wrapped line. No font shrinking or QA relaxation is used.
Markers reject unmatched/repeated targets, alternate entrances and text-match
seams. Arbitrary SVG paths, timing, fonts, colors and scripts are not inputs.

Qualification on the recorded local runtime:

- Four normal-engine 61-second exports, 1,830 frames each, with visual, frame,
  media and source/export audio gates passing. Each has 11 scenes, 21 cue beats,
  10 seams and 106 decoded pixel samples. Exports remain `review_required`.
- New headline, marker, matrix and focus beats check every frame and both
  neighboring boundaries for exact reverse-seek equality.
- 36 native intermediate frames inspected; 12 alternate-copy fits across four
  profiles and four oversized-caret rejection checks pass.
- Python unit discovery: 311 passed. Final Node suite: 60 passed.
- Retained source paths, hashes and changes are recorded in production provenance.
  No new fonts, dependency, remote runtime or publishing behavior is added.

The first square build correctly rejected a marker pop outside its title at
a line start. Its failed run remains retained. The correction constrains the
pop translation; the original containment assertion is unchanged. These are
internal Signal Lab qualification fixtures, not Cognativ editorial approval or
a per-feature ten-minute soak. The inventory now records 74 bounded catalog
adaptations and 381 entries without a port or final disposition.

## Combined integration batch in progress (2026-10-15)

Following the operator's requested batching change, implementation now proceeds
across resource groups with quick contract/math checks. Full unit, browser,
regression and encoded-video qualification runs once on the combined candidate,
with a new run ID only when a failed check requires a correction. Existing gates
and tolerances remain authoritative. No intermediate addition is called qualified
merely because its unit tests pass.

Current additions: 13 static font faces in optional new-brand onboarding; seven
cue-built background styles; six additional scene seams; and five illustrative
interface layouts; data rankings and two-series line plots; hub/branch networks;
and three local screenshot annotation styles. Sources and distinctions are in the production provenance and
asset census. The new font manifest, engine helper and payloads participate in
implementation drift detection; only listed font binaries may pass the release
allowlist. Original notices accompany brand and run copies.

The accepted lock and previous videos remain retained. Source has intentionally
moved beyond that lock, so normal production writes remain blocked by drift
detection until combined qualification and lock acceptance. No prior brand or
approval is edited to bypass this boundary. These additions do not yet have new
qualified video exports. The complete repository integration objective is open.

Data, network and annotation modules are wired into `production_visuals.py`,
`production-scenes.js`, the normal build stylesheet/script list, and
`ysc.py compositions`. They are reusable episode records rather than standalone
demonstration HTML. New targeted tests cover explicit sources/values, cue counts,
rooted graphs, normalized image regions, rank crossings, contain-fit mapping and
cursor tip/stroke synchronization. Browser gates additionally check final data,
graph edges, annotation completion, label collisions and dense reverse seeks.
Those browser gates are implemented but have not yet run on this batch. Existing
validation tolerances and the accepted lock are unchanged.

The next grouped addition adapts fourteen typography source definitions into nine
title treatments and three headline swaps. Three source entry recipes share one
word-crossfade implementation. Pure timing/contract tests and the existing type/
headline unit tests pass; browser/export qualification remains pending. Reverse
seeks rebuild split-flap leaves, text masks, blur and color layers from the cue
clock. Approved fonts, exact phrases, caption timing and fixed type sizes remain
authoritative. No package, network call or alternate renderer was added.

The catalog also contains fourteen shader demo wrappers whose transition bodies
are already covered by the retained shader adapter. A separate comparison found
seven exact main-function matches; the other seven differ only in brand-palette
substitution and the already-present lens horizon envelope. Shared noise helpers
and three inline helper bodies match. This is coverage of their transition
algorithms, not an import of demo layouts, fonts or media. The census records this
separately from new unqualified ports, avoiding duplicate integration work.
