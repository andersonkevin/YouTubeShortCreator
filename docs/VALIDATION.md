# Validation

[Docs index](README.md) · [Qualification evidence](RELEASE-QA.md)

## Automated Gates

- Input containment, symlink rejection, bounded files, input SHA-256, duplicate
  JSON fields, finite numbers, exact episode fields and template/brand drift.
- Caption words and source-audio binding, ordered coverage, cue timing and measured
  adjustment notes. No duration-only or estimated caption alignment is accepted.
- Legacy v1/v2: three/four ordered scenes, known layouts, at most 180 seconds.
  Explicit v3: 1-120 scenes, at most 600 seconds, closed family-specific content,
  format, local-asset, cue and transition contracts. Text is escaped in both paths.
- Headline and label fitting; metadata lengths; 5-8 unique lowercase hashtags.
- Four browser viewports: the selected profile's native canvas, 1440x900,
  390x844 and 375x667; legacy native canvas is 1080x1920. Check frame containment,
  text overflow and the selected family's text/graphic/caption geometry.
- Actual loaded logo and fonts, every caption at its cue midpoint, central graphic
  motion, deterministic backward seeking, page errors and attempted page network.
- MP4 codecs, dimensions, track counts, duration and every 30 fps presentation
  timestamp. Decoded samples cover both sides of cue starts/ends, cue midpoints,
  the first/middle/final frame and caption gaps.
- Sampled encoded pixels compared with the exact browser capture: fixed regions
  and local tiles, bounded lossy tolerance, source/decoded hashes in `frame-qa.json`.
- Source/export waveform comparison in voiced windows: at most 10 ms best lag,
  correlation at least 0.97, and duration difference at most 80 ms.
- Short final voiced windows are included. Nonfinite PCM, added sound during a
  source-silent window and non-silent unmatched tails fail. Silence classification
  uses RMS 0.001; unexpected sound/tails use RMS 0.003. These are engineering
  thresholds, not claims about human audibility.

## Human Review Still Required

The optional paired-device composition checks both pinned model hashes, node and
geometry counts, screen identities and UV ranges, source motion state, camera
position, fixed lens, closing-orbit containment and nonempty raster output.
Closing framing derives camera distance from actual mesh bounds at each absolute
pose with an additional margin; unit coverage probes 601 poses per aspect ratio.
Browser gates sample scene events
and reverse seeks in all four formats. These checks do not establish asset rights
or qualify cumulative encoded exports by themselves.

Listen to the exported MP4 against its captions, including first/last words and
scene transitions. Check the story, factual claims, code correctness, spelling,
logo recognition, layout at phone size, graphic relevance and asset rights.
ASR confidence is not editorial approval. Waveform correlation verifies that
muxing preserved the source voice/timing, not that ASR transcribed it correctly.

Visual QA samples scene states, not every possible overlapping box at every frame.
Encoded-frame checks verify sampled pixel correspondence, not semantic image quality. Runtime
versions are recorded; deterministic captures do not guarantee byte-identical
MP4 containers across machines. Full rendering is currently macOS-only.

## Commands

```bash
python3 -B -m unittest discover -s tests -v
node --test tests/*.test.mjs
python3 -B tools/check_docs.py
python3 ysc.py doctor
python3 ysc.py validate episodes/my-short/episode.json
python3 ysc.py build episodes/my-short/episode.json --run-id qa-01 --approve-write
python3 tools/smoke.py --workspace workspaces/smoke-01 --render --approve-write
python3 tools/release.py audit
```

Unit tests use temporary fixtures; no production data is changed. The smoke test
creates its explicitly selected new workspace, using a synthetic tone and synthetic
caption intervals to exercise the pipeline. It is not a transcription test and
must not be published. Real narration transcription needs a separate local test.

## Operator Sign-Off Checklist

- [ ] The video uses the intended approved brand and correct episode recording.
- [ ] Spoken words match captions, including first/last words and sentence boundaries.
- [ ] Scene changes and animated code explain the current narration, not another topic.
- [ ] Headings, code, logo and captions remain readable at phone size.
- [ ] The cover is readable, relevant and free of placeholder copy.
- [ ] Code, factual statements and any numerical claims have been reviewed.
- [ ] Voice, font, image and logo rights have been checked for the intended use.
- [ ] The run has its final `run.json`, and the applicable QA reports pass.
- [ ] Any changes made outside this tool have been reviewed again for sync and layout.
- [ ] Publishing is deliberately approved through the operator's separate workflow.

This checklist is a review aid, not an application-generated signed approval record.
Do not change a run's `review_required` status merely to make a report look complete.

## Cinematic effect-frame coverage

For opt-in v2 `cinematic-v1`, browser QA checks every integer frame from each
caption-triggered effect's onset through its end, plus the adjacent boundary
frames that belong to the scene. Each comparison jumps into the following scene
and returns to the original time. Equality is exact full-frame PNG equality.
Non-cinematic effects retain their original boundary/midpoint coverage.

`seek-qa.mjs` builds these frame sets and preserves the first failed pair as
`seek-effect-before.png`, `seek-effect-after.png` and `seek-effect-failure.json`
in the failed run. The JSON records times, label and both hashes. A mismatch
fails immediately: there is no tolerance, retry, pixel normalization or overwrite.
The existing geometry, caption, seam, encoded-frame and audio gates still run.
Dense effect checks do not claim exhaustive coverage of every possible episode;
separate full-timeline fixtures exercise sequential, reverse and shuffled orders.

New v3 headline swaps, title markers, matrix cells and focus-resolution beats
are sampled on every frame of the 24-frame envelope plus boundary neighbors.
Exact reverse-seek pixels, final supplied text, retained BrandSans family,
absence of future phrases, final hidden caret/cover, measured marker dash
endpoints and marker containment are checked. The usual four-viewports,
caption, seam, decoded-frame and audio gates still apply. Oversized caret
phrases fail at the approved type size instead of triggering font fitting.

The pending v3 `media-carousel` gate samples the full travel every 15 frames,
with exact reverse-seek comparisons, plus every frame around the two cue
envelopes. It checks finite perspective transforms, exact local asset mapping,
decoded contain-fit images, center text/font identity and the final clock hold.
The existing composition/caption bounds and pixel/audio tolerances are unchanged.
Intentional moving-card overlap is confined to the artwork window; it does not
relax the separate `media-grid` card-overlap gate. These checks are implemented
but await the combined browser/export qualification.

The pending catalog screen-swap gate checks every frame of its 24-frame cue
envelope and both adjacent frames using the existing exact reverse-seek check.
It also checks clipping, original image IDs/decoding, contain-fit, finite
transforms, bounded alpha, fixed palette roles and absence of unrelated images.
At both endpoints it requires one complete unfiltered still and no temporary
overlay. Numerical tests separately cover all 33 recipes, covering geometry at
image cuts, the completed clock polygon and deterministic noise. These tests do
not replace the pending browser, encoded-frame, audio and human-review gates.

Catalog image selection uses the same integer frame boundary as effect progress.
Late fractional cue timestamps are tested before, at and after their quantized
onset, including reverse evaluation. Comparing raw seconds could select the next
image one frame before its effect starts. Portrait interface labels use a 1.35
line height so the approved font's glyph bounds fit; font size and overflow
checks remain unchanged. Both corrections came from the combined browser fixture.

Browser console errors and attempted network requests also stop capture during
initialization, after visual validation and at each captured frame. The final
checks remain in place. This avoids completing an expensive frame sequence after
a known failure. Annotation cursor coordinates are copied explicitly from SVG
DOMPoint values; their prototype-backed properties cannot be object-spread.
Data, map, annotation, specification, interface and code-story headings are also
checked against their artwork bounds. Data explanations must clear both the
heading and chart. A label can satisfy the character limit and still be rejected
at the approved font size; shorten the supplied copy rather than shrinking type.

The pending `code-story` gate checks every cue frame and its neighbors using the
same exact reverse-seek comparison. It verifies literal document text, filename,
approved font, finite transforms, visible version, complete typed endpoints,
hidden settled caret, contained focus line and fixed viewport bounds. Unit tests
exercise LCS reconstruction with duplicate/blank lines, deletion-before-insertion
height bounds, grapheme-safe typing, scroll clamps and closed document/cue inputs.
These checks do not execute the displayed text or establish its factual accuracy.

Pending map/combo/specification gates verify explicit values, independent axes,
source text, local image identity/contain-fit, missing-data distinction, label
bounds, bubble-area ratios, route widths, final dash/particle state and exact
specification copy. Every cue frame receives the existing reverse-seek check.
Map labels must fit without overlap; inputs can be rejected even within numeric
limits. Tests verify all 51 retained grid positions, non-overlapping hex geometry,
four slot sizes, image-coordinate mapping and bounded curves. The conic metric
gate uses its cubic fill/count curve and retains all existing metric checks.

Interaction validation rejects missing or identical result stills, out-of-image
targets/destinations, non-finite coordinates, ambiguous menu rows, invalid cue
counts and unknown fields. Literal menu labels use text nodes, including labels
containing markup-like text or `icon`. The browser gate checks menu bounds,
heading separation, finite pointer state, final supplied image identity,
completed selection, physical cursor exit and hidden released touch contact.
Every interaction cue uses the existing 27-sample exact reverse-seek gate.

The six interaction styles passed a separate native-renderer browser test in all
four formats: 800 sampled frames and 800 exact reverse comparisons. The first
test harness mistakenly left the live preview clock enabled; its failed run is
retained. The corrected harness uses the engine's existing capture mode. This
is runtime/layout evidence, not a new MP4/audio qualification or acceptance of
the development lock. Export qualification remains part of the combined batch.

Pointer extensions reject unsupported action/style combinations, missing actor
labels and arbitrary camera controls. Runtime gates check finite state, bounded
actor labels, menu occlusion, final echo disappearance and exact camera identity
on exit. Camera translation must cover the board without exposing outside edges.
Chat waiting dots must be hidden after the final message. Interface cue selection
and indicator dismissal share the integer frame clock, including fractional cues.

The private batch-19 fixture covers eight cases in four formats. An initial run
passed its numerical checks but visual review found an actor tag obscuring a menu.
The added overlap gate rejects that retained fixture; the corrected actor hides
while the menu is visible. Default interaction captures are compared byte-for-byte
against the preceding block. This evidence does not establish catalog-wide MP4
qualification or universal cross-run raster stability.

The interface preset block adds closed style/variant compatibility, short
navigation labels and explicit feedback-state checks. Runtime gates verify
finite presentation state, text containment within cards, exact final message
copy, finite-caret dismissal, final tab position and completed skeleton/feedback
phases. Existing default interface code paths remain unchanged.
The private batch-20 browser check covers all thirteen presentations in four
formats and compares the five default interface styles against their retained
source snapshot. Input/math tests cover spring endpoints, measured sheet
overshoot, stack reservation, literal/grapheme-preserving typing, explicit error
motion and reverse sampling near ten minutes. This block does not rerender the
whole catalog or qualify a ten-minute export; combined qualification remains open.

Handwritten annotations preserve the original region/image and cue-count gates.
The contract rejects unknown stroke/curve/pointer enums, incompatible options,
custom paths, fonts and colors. Math tests cover seeded geometry, monotone pen
timing, region fitting, fractional cue activation, unique mask IDs across all
120 scene slots and full pen exit. Runtime gates inspect exact final stroke
progress, source-region containment, document-wide mask identity and pen bounds.
The private batch-21 check samples all seven shapes with four textures in each
format and compares the three original styles against retained pixels. An early
fixture image alias error is retained. Initial numerical checks missed duplicate
mask IDs across scenes and a partly visible exiting pen; visual inspection found
both. Corrected code uses the engine scene index and glyph-aware exit distance.
The retained defective fixture fails the new exit gate. These checks do not
replace combined MP4/audio qualification or the pending ten-minute export soak.

Title designs keep the existing caption, brand, text-fit and exact reverse-seek
gates. Additional contract checks reject arbitrary paths, unbounded copy, unknown
layouts/tails, missing backdrop words and conflicting title modes. Native checks
verify complete glyph reveals, unique text-path IDs, board containment, exact
supplied text, approved fonts, note bounds and absence of note/content overlap.
The private batch-22 fixture covers both cloud tails, curved text, decorative
emphasis, word highlighting, rough underlining and notes on all marker styles.
Original title/marker captures are compared against the retained source snapshot.
Initial diagnostics are retained: the wave needed font-ascent clearance and the
emphasis layer needed to clear inherited legacy positioning. Gates were preserved;
new layout geometry/CSS was corrected. No new full-catalog MP4 is implied.

Advanced title checks retain these gates and add exact word/accent references,
verified local mask bytes, clean effect canvases at rest, native raster dimensions
and unchanged font roles. The decoder is checked against an independent seeded
reference during every entry frame; final text must always equal the supplied
title. Dense frame sampling covers all nine new effects. Focused tests cover
Unicode graphemes, preserved whitespace, seeded schedules, real glyph sampling,
mask installation/hash checks and no-overwrite behavior. The cumulative source
tree deliberately retains the accepted implementation lock; workflow tests
requiring a new lock run against the final frozen development candidate.

### Media camera validation

Media camera inputs have fixed style/layout/option compatibility and two caption
anchors (three for punch/reset). Tests cover source endpoints, reset continuity,
seek independence, focal containment, invalid controls and verified-image rules.
Native browser QA samples the camera around every action frame, checks finite
states, exact supplied labels, loaded contain-fit images, clipped image windows
and contained focal cards. The two parallax sibling image layers intentionally
travel outside their clipped board; their labels are hidden during travel.
Existing ordinary media-grid non-overlap and containment gates remain unchanged.
Full combined MP4/audio qualification is required before accepting a new lock.

### Editorial layout validation

Targeted tests cover the seeded frame/pipeline geometry, drawing order, exact
closing endpoints, a single sting impact frame, press/release continuity, closed
input records, image requirements and explicit button states. Native QA checks
text fitting, image binding, finite states, frame-ink containment, card content
containment, cue timing and exact terminal states. Original media/diagram/lower
third/CTA renders remain subject to exact baseline-pixel comparisons. A green
family test does not replace combined export, audio or ten-minute qualification.

### Spatial and paper validation

Spatial treatment tests cover the solved dolly focal length, fixed subject scale,
source stagger/overshoot, finite reverse-seek states, viewport fitting, two-cue
contracts, verified stills and rejected arbitrary controls. Native production QA
checks the actual projected image bounds, untransformed exact labels, approved
font role, independent source equations and cue timing on every sampled frame.
Layered image overlap is intentional; ordinary grid checks are unchanged.

Paper tests cover deterministic edge tables, fully opaque scribble midpoint,
complete tear clearance, monotonic stagger and seek independence. Native QA
checks source image bindings, decoded copies, expected visible image, dash
progress and a removed overlay at rest. Combined browser and export results for
these cumulative additions are pending; unit tests alone do not qualify them.

### UI and path primitive validation

Focused tests cover source easing, delayed entries, badge and statistic input
requirements, matched SVG point morphs, false completion states, path endpoints,
tangent sampling and seek-independent states. Native QA samples all 24 motion
frames plus boundary frames, checks exact copy and supplied values, rejects live
controls, measures card text containment/overlap, and verifies finite transforms,
clean terminal states and unchanged completion semantics. Existing geometry,
caption, source, brand, reverse-seek and export checks remain enabled. These
checks are integrated but await the final combined browser/export run.

Kinetic preset tests cover measured-center strip interpolation, ticker phase
boundaries, all six shutter trajectories, inclusive 17-sample shutter windows,
finite reverse-seek states and rejected source overrides. Native QA measures the
current marquee word, exact supplied strings, approved font roles, reel position,
clean terminal text, ghost count/opacity and a paint-contained motion viewport.
It samples all 24 animation frames and boundaries using the existing exact
reverse-seek checks. Transient shutter text is intentionally clipped inside this
viewport; the resting word must fit fully. No caption or global geometry gate is
relaxed. Browser and encoded exports remain pending for the cumulative source set.

Spatial backdrop tests cover actual vendored Three.js exports, source poses,
seeded point attributes, deterministic tunnel recycling, reverse-order evaluation,
exact rest, closed inputs, conditional runtime loading and a reproducible pinned
module conversion. Native production QA extends the existing dense backdrop
samples with WebGL revision, resource limits, absolute source clock and approved
palette checks. Existing geometry, font, caption and exact screenshot-seek gates
remain enabled. Source examples request Three.js 0.147/0.184; the shipped local
modules identify themselves as r185. This compatibility difference is recorded
for the combined browser/export qualification, which has not yet run.

Liquid-glass checks cover closed image/copy contracts, existing path/hash checks,
conditional loading, source parameter sets, four-profile final card geometry,
entry/settle poses and the actual source Gaussian pass bindings. The latter
guards against all queued passes reading the last vertical uniform value.
Native QA checks image identity/dimensions, one context/target set, GPU failure
state, exact supplied copy, approved fonts and fully contained readable text.
The shared normal capture path still checks reverse-seek pixel identity and export.

Camera-follow math checks cover measured prefix growth, aspect-dependent
placement, fitted bounds, source easing, distance-weighted blur, final resolve
continuity and reverse evaluation. Native QA checks the actual world matrix,
exact words, approved font, prefix visibility, resting containment and zero blur.
These integrations await the combined native browser and encoded-video run;
focused unit checks do not establish GPU compatibility or final visual quality.

Canvas backdrop checks cover the pinned emitter seed, high-pass gain, normalized
positions, three cadence grids, integer landing/squash/sparkle schedules, exact
still holds and source mesh-card geometry. Recorded draw commands are compared
after reverse evaluation; this is not a bitmap determinism claim. Native QA adds
samples throughout the moving interval and at cadence boundaries, verifies the
approved palette inputs, source clock and settled geometry, and retains normal
reverse-seek pixel checks.

The two magnetic swaps retain closed inputs, verified textures, compilation/link
failure handling, original endpoints and the existing bounded chromatic filter.
The shader-program resource gate now checks against the number of distinct shader
swaps actually selected by the episode. These additions still require the combined
browser and encoded-video qualification before acceptance.

Editor checks retain closed fields, explicit tool choices, fixed typography,
source vector draw/selection landmarks and cue spacing for pinned copy. Native
QA inspects actual SVG dash lengths, node opacity, selected tools, exact copy,
pinned mock geometry, crossfade opacity and text containment, including the
24 exit frames preceding each pinned-copy handoff. Split-panel QA checks actual
layer matrices, whole-word copy, mirrored halves and exact settled endpoints.

Organic-field tests cover all 36 facets, authored silhouette endpoints, seeded
grain tables, spring cut continuity, still holds and reverse evaluation. Native
QA samples the entire bounded clock and retains normal pixel reverse-seek gates.
Math and draw-command checks do not qualify actual browser pixels or exports;
these additions remain part of the pending combined qualification.

Optical checks cover exact source GLSL extraction with six defined-edge
`smoothstep` corrections, seeded light geometry, diopter interpolation, synthetic
wave bounds, flyback blanking, phosphor decay, aspect-preserving grid placement
and reverse draw-command evaluation. Native QA checks the two-cue clock, approved
palette, finite focus/traces, bounded shared renderer resources and samples across
the full moving interval. These are pending native pixel/export qualification.

Spatial-code checks cover source arrival curves, glyph-only seeded sampling,
particle-budget rejection, closed document contracts and conditional loading of
the existing pinned Three.js bundle. Native QA checks exact supplied documents,
approved fonts, finite state, one code-renderer context, bounded geometry/texture
counts, settled native text and normal reverse-seek pixels. Unit checks do not
prove shader compilation, DOM-to-canvas alignment or rendered visual quality.

Image-handoff checks cover word-wall tile coverage using measured glyph widths,
opaque coverage of the image switch, source card dimensions and exact reverse
evaluation. Native QA verifies the approved word font, original/copy image IDs,
contain-fit decoding, card geometry, visibility and actual overlay opacity.

Circle-match checks cover exact cut geometry, continuing scale direction,
boundary speed ratio and settled supplied text. Surface checks cover flash/tape
landmarks, finite source phase, phone entry/dive/depth settling and the one-cycle
drift endpoint. Native QA additionally checks rendered matrices, copied image
identity, masks, cutout opacity and layer recombination. These additions retain
normal frame-reversal, geometry and publication gates; unit results are not
a claim of native pixel or encoded-video qualification.

Value-motion unit checks cover all 62 indexed burst paths, overlapping source
exit interpolation, cleared endpoints and exact supplied numbers. Lane checks
cover global value ratios, true zeros, quantized period boundaries, continuous
distance and reverse evaluation over 600 seconds. Native QA additionally checks
rendered marker positions, explicit labels/values, period clocks, approved fonts
and burst layers. It samples lane holds as well as cue entries. These new native
checks are implemented but have not yet run in the combined qualification.

Spatial-object checks cover four explicit layer records, optional collapse,
verified label images, six-second turn spacing and rejection of model/URL/font
overrides. Unit tests instantiate the actual local Three.js geometry and camera
to verify plate dimensions, lathe bounds and projected anchors in all profiles.
Native QA checks decoded input identity, visible canvas pixels, label copy/type,
projected leader positions, source clocks and bounded renderer allocations. A
turntable receives samples throughout the rotation as well as at its cues.
These native checks remain pending combined qualification; geometry unit tests
do not establish rendered GPU correctness or cross-run pixel stability.

The orbit-card tests exercise the pinned Blender channels, open aperture,
complete orbit, finite holds and actual Three.js projection through every native
board. Native QA additionally inspects the actual camera and object transforms,
projected bounds, input image and visible pixels. Slice tests cover exhaustive
ink-cell coverage, source cursor/field equations, independent seek evaluation,
closed inputs and literal escaped text. Native QA checks shader output, finite
instance data, the two-draw ceiling, approved font and absence of duplicate DOM
text during the flip. Belt tests retain every 25fps entry sample and both row
positions; native checks compare measured translations at the 30fps output clock.
These are additions to the final combined qualification, not a new export claim.

Media-presentation checks cover the measured spring steps and every image-cut
boundary, the phone fan's projected corners, disjoint image/copy areas in all four
profiles, native caption anchoring on both short and long scenes, and a finite
ticker traversal. Browser QA independently checks input identity, complete-image
fitting, exact labels/counters, panel clipping, fonts, source clocks and rendered
transforms. Event sampling stays bounded for ten-minute scenes. The normal
reverse-seek, caption, brand and encoded-pixel gates remain in place. These new
browser checks are prepared for the combined run, not yet qualified.

Prism-title checks verify the source entry values, exact native rest, arbitrary
reverse evaluation, closed input fields and unchanged approved typography.
Browser checks additionally inspect the applied filter, transform, color shadow
and exact supplied text. The final combined run must qualify those pixels.

Brand-lockup tests cover the actual source stagger, overlapping scale return,
logo/kicker/title handoff, equal badge geometry, pinned icons and closed schemas.
Browser QA checks approved logo identity/contain-fit, exhaustive five-strip masks,
original-image restoration, source timing, applied matrices, text and bounds.
Steam tests cover all fourteen seeded particles, an exact periodic endpoint,
independent seeks, contain-image region mapping and invalid input rejection.
Browser QA additionally inspects real canvas pixels, the feather mask and actual
window position while verifying that the primary still has no transform/filter.
These gates are implemented for the combined run; unit results alone do not
qualify the new browser compositions or final exports.

### Statistic presentation qualification

Statistic-card contract tests cover exact supplied values, one-cue timing and
rejection of style overrides. Curve tests cover cubic, back, elastic and
exponential entries, reverse evaluation and the four native plot sizes. Native
QA additionally checks rendered SVG transforms, exact value/unit text, approved
font use and settled containment. Decline contracts reject increasing or flat
series; native QA checks actual path draw, endpoint scale, count and background
dimming against supplied values. These source additions await the combined
browser/export qualification; test definitions are not render evidence.

### Cursor-scene checks

Targeted checks cover unique literal selections, Unicode grapheme boundaries,
source action ordering, physical cursor entry/exit, six authored collaborator
paths, canonical held endpoints and reverse evaluation. Contract tests reject
missing or ambiguous selections, implicit/duplicate names, unverified image
references, unsupported layout/effect combinations and free-form controls.
Native QA independently checks actual DOM matrices, font weights, selection
state, toolbar placement, pointer morph, image identity, and settled name
containment/non-overlap in each format. Its assertions run on every sampled cue
frame and the final state. That native suite is prepared, not yet executed for
these additions; no claim of encoded-video or combined qualification is made.

### Ranked-answer checks

Targeted tests cover all three insertion positions, original row identity,
entry clearance, literal Unicode typing, finite thinking dots, staggered row
arrivals, held endpoints and reverse evaluation. Four native board geometries
retain readable row heights and a masked exit runway. Contracts reject missing
copy, invalid/implicit ranks, duplicate labels, wrong item/cue counts and free
style or executable controls.

Native QA independently reconstructs the source timing and observes real DOM
matrices, row alpha, fixed slot numbers, prompt/caret, word reveal, fonts, copy
fit, check-path drawing and final row ordering/containment/non-overlap. These
assertions are prepared for the combined run; source test passes do not qualify
the rendered result or the final four-format videos.

### Scrolling-note checks

Focused tests cover all seven typing cadences, replacement lengths from 1-52
graphemes, measured scroll plateaus, cumulative settles, reverse evaluation and
two to seven lines across the four native viewport geometries. Contracts reject
wrong shapes, missing titles, unsupported controls and sub-two-second cue gaps;
exact decimal arithmetic avoids rejecting a valid boundary because of float
subtraction. Unicode tests preserve combined and joined graphemes.

Native QA independently reconstructs event counts and all five scroll curves,
including the 18 frames before each cue. It checks actual DOM translation, text,
font sizes, visible bounds, glyph-edge caret placement and clipping decisions.
These assertions and the three prepared document cases await the combined
native run; pure geometry/state tests do not establish browser or export fit.

### Colorama and freeze-cut batch checks

Focused source tests cover the five blur levels, source front landmarks, palette
interpolation, alpha coverage, deterministic jitter, held crop, exposure pulse,
connector switch, 69-frame timing and reverse evaluation. Contract tests reject
open effect parameters, missing stills and overlapping or truncated cut windows.

Prepared native checks inspect approved font geometry, real colored canvas ink,
clear endpoint canvases, decoded image identity, actual transform matrices and
freeze layers. They sample every frame of each 69-frame cut and the title entry.
These additions await the combined browser, raster and encoded-video run; the
focused tests do not qualify their appearance or replace the accepted lock.

### Filmed-screen lens checks

Focused tests cover source optical constants, contain geometry, quintic camera
landmarks, the 12-tap focus rack, projected focus corners, deterministic frame
seeking and frozen hold clocks. Contract tests retain closed fields, one verified
still, focus bounds, caption anchors, input hashes, path containment and no-overwrite
installation. Only selected lens scenes load its two local modules and request
hardware capture. Missing WebGL2 fails explicitly.

Prepared native checks inspect actual canvas readback, single renderer resource
counts, source image identity, focus-label fonts, independent rack/camera math
and optical destination containment at every cue frame. These checks and the
GPU shader itself still await the combined native/export run.
# Conversation composition checks

The `answer-stream`, `research-stream` and `message-thread` adapters have focused
coverage in `tests/test_production_chat_exchange.py` and
`tests/production-chat-exchange.test.mjs`. Contract checks cover literal content,
message/table/activity shapes, exact 60-frame fit, scene cue counts, bounded
copy, image references and rejection of free controls. Animation checks cover
grapheme boundaries, source timing curves, measured line growth, collapsed
activity, final stillness, native viewport stacking and reverse-order seeking.

`production-qa.mjs` samples every frame of their 60-frame actions. It checks
rendered text and word opacity against supplied content and independent timing,
local image identity/contain fitting, font sizes, actual stack positions and
scrolling, caret clearance, table cells and activity collapse. The dedicated
checks replace the generic fixed-row interface assertions for these variants;
all existing brand, caption, scene, reverse-raster and media gates remain.

Run the targeted checks with:

```bash
node --test tests/production-chat-exchange.test.mjs tests/production-interface.test.mjs tests/production-interface-presets.test.mjs
python3 -B -m unittest discover -s tests -p test_production_chat_exchange.py -v
python3 -B -m unittest discover -s tests -p test_production_interface_presets.py -v
```

These source checks passed. The current additions have not yet passed the
combined browser/export qualification, and no current all-assets video or new
accepted implementation lock is claimed.
## Organic vector backdrop checks

`tests/production-gooey-split.test.mjs` checks source split/rest/spin/remerge
positions, directional scaling, blade contours, finite transformed bounds,
both ends of the 17-sample shutter, filter switches, settling and reverse-order
evaluation. `tests/test_production_gooey_split.py` checks exact cue spacing,
closed inputs and opt-in script loading in all four profiles. The full-backdrop
catalog fixture now supplies the already-required two cues to canvas/spatial
styles and sufficient spacing for each motion recipe.

Prepared native QA checks the approved filter colors, SVG viewport, threshold,
source clock, sample times, seven original shapes and 119 shutter copies, rendered
matrices, deadband visibility and final stillness. Every native frame of the
sequence is scheduled for inspection during combined qualification. These DOM
checks and the existing reverse-pixel/export gates have not yet run for this
addition. No accepted lock was replaced.

## Native flight-route qualification

`map-story/flight` retains source cubic geometry, three separate draw tracks,
arc-length travel and tangent orientation, six interrupted marker entrances,
arrival doodles and finite camera/landing motion. Focused Node checks cover
source control-point identity, bounded curves across four native slots and
reversed routes, source event times, marker continuity and arbitrary seeks.
Python checks cover explicit endpoint/asset/source fields, rejected extra
controls, six-second/180-frame cue spacing and normal script selection.

Combined native QA additionally inspects actual SVG route lengths/dash offsets,
rendered aircraft position/orientation/scale, pin/tick transforms, camera matrix,
callout text and exact settled state. Event-adjacent frames across the full flight
are included, with the existing geometry, reverse-pixel and export gates. These
browser/export checks are prepared, not yet executed for the cumulative engine.

## Geographic choropleth and spotlight qualification

Regional-map contract tests cover the exact 19-region and 50-state sets, explicit
zero versus missing data, source records, scale bounds, focus sequencing, rejected
arbitrary topology/style/attribution inputs and the 195/36/30-frame timing limits.
Geometry tests pin the generated paths and check islands, closed rings, centroids,
source easing, color breakpoints and collision-free labels. The offline compiler
rejects changed input hashes, unpinned scripts and symbolic file/parent paths.

The regional addition passed two-scene native checks in all four formats and
16 viewports, including path identity, value fills, reveal and pulse sampling,
literal labels, geographic/metric attribution, pairwise layout separation and
byte-exact reverse seeks. CSSOM opacity comparisons allow only its six-digit
serialization precision; SVG numeric checks and exact pixel assertions retain
their existing thresholds. The first opacity-precision failure and subsequent
layout failures are retained in private evidence. These checks do not qualify
the entire cumulative catalog, encoded output, audio or Spain's unspecified
original geometry edition.

World-map tests verify the generated geometry against pinned source/output
hashes, all 177 names, closed polygons, retained holes/islands, four native
slots, center-out reveal endpoints, finite highlight pulses and the explicit
four-stop data scale. Contract tests reject unknown regions, extra controls,
invalid values and cues that leave insufficient native frames. The source
D3 script is used only during offline geometry generation; composition scripts
are never executed by that step. The reproduction script and source hashes
are retained in private integration evidence and geometry provenance.

Spotlight tests cover source camera/drawing/label/corner events, image-relative
region tracking, visible ink bounds in all four slots, caption clocks and
reverse-time mathematical state. Contracts reject unverified images, escaped
paths, invalid regions and arbitrary controls. Combined native QA inspects
actual path identities/dash offsets, region fills/strokes, camera matrices,
image registration, popup geometry and source-event frames. Native browser,
reverse-pixel and encoded-video checks remain pending for this cumulative code.
## Promotional typography qualification

`tests/production-promo-type.test.mjs` checks source event boundaries, back/expo
curves, source stagger, finite endpoints and reverse-order state reconstruction.
`tests/test_production_promo_type.py` checks text limits, exact glyph counts,
cue counts, forbidden overrides and selective script loading in all four profiles.
Run these with the existing title-design and kinetic-preset tests when changing
the shared dispatch or contracts.

The production browser gate checks actual promotional text, fonts, opacity,
transforms, settled geometry, glyph rotation/wipe/line endpoints and native cue
alignment. Every entrance frame is included in its reverse-pixel sampling.
Prepared cases do not constitute a browser pass: combined qualification of the
cumulative source, the existing 4:5 raster discrepancy and final video exports
remain outstanding.

## Product-promo adaptations

`tests/production-product-canvas.test.mjs` checks source event ordering, complete
grapheme typing, explicit resolution, geometry in four native slots, interrupted
cursor continuity, action targeting and frame-clock reverse reconstruction.
`tests/test_production_product_canvas.py` checks exact inputs, text/count limits,
boolean state, rejection of executable/branding overrides, native start/settle
margins and selective module loading. The brand-lockup tests additionally cover
five-vector convergence, ring/pulse, the finite logo exit and unchanged logo inputs.

The production browser gate inspects actual rendered text, native dimensions,
font roles, card transforms, cursor positions, drawer/drag state, comment typing,
resolution and logo bytes. Sampling includes source event boundaries and reverse
pixel comparisons. These hooks and prepared cases are not a browser qualification;
the final cumulative run and four encoded videos remain required.

Character-walk tests cover all source keyframe endpoints, hierarchy transforms,
subframe interpolation, all 225 visible frames in both directions, finite holds,
four-format geometry, copy limits, timing boundaries and opt-in script loading.
Converter tests reject mismatched hashes, symlinks, expressions, nonlinear easing
and disordered keys. The broader closing-contract test includes logo-collide and
the new character schedule. Prepared native QA independently reconstructs parent
matrices, verifies actual SVG painter order/shapes, card/text easing, approved
fonts, containment, non-overlap and exact reverse-seek screenshots at walking,
stopping and pointing boundaries. These browser checks and encoded-video gates
remain pending the combined qualification; the existing 4:5 raster diagnostic is
not superseded by source or math checks.

App-install checks cover source entry/exit, selection, tap, captured initial
values for interrupted scale tweens, detail/fact staggering, both ring clocks,
percentage/ring agreement, arbitrary selected rows, four-format aspect ratio and
repeat/reverse evaluation. Contract tests reject extra fields, unknown icons,
missing supplied UI/facts, wrong counts and shortened timing. Native gates are
prepared to inspect actual font/slot overflow, exact icon sources, selected-row
readability, heading/phone separation, card containment, measured circumference,
matrices and exact reverse-seek pixels around every source action boundary.
The generic geometry check uses the phone as the artwork boundary for the
lateral-heading layout and still bounds the full board. None of these prepared
browser checks constitutes an executed combined browser or export qualification.

### Creator-intro cumulative qualification

Focused tests cover source choreography, interrupted per-property tween starts,
asymmetric burst paths, Unicode grapheme timing, deterministic arbitrary seeks,
finite end holds, four-format camera bounds and physical cursor entry/exit/targets.
Contract tests cover exact nested keys, text limits, verified-image membership,
unused assets, explicit distinct action states, caption separation and settle
margins. The existing all-closing-style sweep includes a valid creator-intro case.

`production-qa.mjs` adds event-adjacent native samples and independent copy/font,
asset, opacity, timing, camera-envelope, cursor-tip and profile-state checks.
The existing geometry, reverse-seek, caption, frame, audio and review gates remain
in force. These browser gates are prepared, not yet qualified; the cumulative
candidate must pass them before implementation-lock acceptance and final exports.
The earlier workflow lock mismatch and 4:5 raster discrepancy are not cleared by
source unit tests. Original input narration remains untouched.

### Cursor-ray cumulative qualification

Focused tests cover the pinned source sampling passes, source timing curves,
Unicode typing, measured-caret timing, custom card ease, directional title handoff,
all-format card magnification bounds, approved-logo aspect, exact reverse seeks
and finite end hold. Missing WebGL or invalid approved palette values fail closed.
Temporary official onboarding/approval fixtures test exact logo-byte encoding,
changed template/brand/copied bytes, symlinks, byte/dimension limits, no overwrite
and coexistence with the existing verified-still bundle. No real channel approval
is modified by these tests.

Native QA samples every source event and neighboring frames, reads actual WebGL
uniforms, and checks the logo source, palette, shader/resource counts, native font,
typed prefix/caret, source motion and bounded card. Animated title text is clipped
by that card; intrinsic fit is checked throughout and full containment at rest.
This adds dedicated geometry checks without relaxing existing gates. Software
raster/WebGL output, cross-run pixels, combined workflow and encoded-video checks
remain pending. The accepted lock and retained 4:5 discrepancy are unchanged.

### Native halftone field

Focused tests pin the exact source shader hash and default dial mapping, verify
absolute/reverse/settled clock behavior, palette validation, frame limits and
explicit missing-WebGL failure. Python contracts cover cue/settle bounds,
unsupported fields, text limits and selective loading in all four profiles.
The native production gate checks actual WebGL uniforms against independent
frame math and brand colors, one shared context/program/buffer, opaque varying
pixels, normal caption/geometry checks and reverse seeks. No existing gate
is relaxed. Encoded-video and combined catalog qualification remain pending.

Four-format native Chrome software-raster checks passed for this addition,
including normal geometry/caption gates, actual uniforms and exact reverse
seeks. The new shader has not yet been qualified in an encoded video or the
final combined catalog run.

### Native UI depth reveal

The UI reveal contract tests reject unsupported fields, wrong styles, invalid
indices/regions, insufficient caption spacing, missing settle frames and unsafe
or changed stills. Focused motion tests check source camera interpolation, the
interrupted exit angle, quadratic layer staggering, logo/copy timing, image-space
selection, four-format projection limits and history-independent reverse seeks.

The dedicated normal production gate inspects actual CSS3D matrices, perspective,
image containment, literal copy, approved font use, intrinsic text fit, exact
selection coordinates, layer choice, brand-image references, final copy visibility
and unique SVG IDs. Text fit is checked throughout; the moving panel must fit its
content slot throughout inspection before the intentional depth exit. It also
samples source event boundaries and neighboring frames. Existing caption,
geometry and seek gates remain enabled. Combined export qualification is pending.

### Native liquid panels

Contract tests reject unsupported fields, incorrect styles, missing/duplicate
still IDs, unsafe or changed assets, invalid cue counts and insufficient timing.
Source tests pin the original vertex shader and restore/hash the fragment before
its approved-palette adaptation. Independent camera-space projections check the
entire displaced sheet in all four native aspect ratios.

The production gate reads actual WebGL uniforms, geometry/texture/triangle counts,
camera Euler angles and projection matrix. Independently calculated source
states cover ripple/wave ramps, the texture mix and interrupted final settling.
Sampled canvas pixels must be opaque and nonconstant. Literal copy, decoded
verified textures, approved colors, final rest, caption geometry and reverse seeks
remain checked. Native checks passed in four formats; cumulative workflow,
scene-seam, audio and encoded-video qualification remain pending.

### Native grade comparison checks

The grade comparison tests cover the closed schema, all 54 bounded option
combinations, image hash/exclusive installation, exact source grading values,
shader extraction hashes, independent Bezier solving, four-format plate bounds,
finite settling and reverse seeks. The native browser gate additionally checks
actual GL uniforms, fit, crop/edge positions, tag visibility, literal copy,
approved fonts and normal caption geometry.

The current private evidence records 26 focused tests and native checks for all
three looks in all four formats. A separate 72-case actual-runtime pixel probe
uses independent primary/vignette calculations with analytic grain bounds;
reverse seeking, resource reuse and explicit disposal pass. Earlier failed
hidden-tag and CSS serialization diagnostics are retained. This evidence does
not qualify cumulative scene seams, encoded exports or audio. The accepted
implementation lock remains unchanged pending combined qualification.

### Native portal panel checks

Portal checks retain the ordinary geometry, caption, visible-beat and reverse-seek
gates. Additional checks read actual GL uniforms, camera projection and plane
scales, decoded still references, contain-fit, approved colors and source opacity.
The final frame is compared directly against a separately fitted second still;
a valid low-color image is not rejected merely for its palette size.

The retained evidence covers 22 focused tests, two consecutive scenes in four
formats, eight exact full-frame endpoint comparisons, repeated input replacement,
reverse seeking and explicit renderer disposal. An initial palette-count false
failure and a real static second-beat failure are retained. The latter was fixed
by revealing explicit source attribution on the second cue; the general visible
beat assertion was not relaxed. Cumulative workflow and encoded exports remain
unqualified, and the accepted implementation lock is unchanged.

### Native shatter panel checks

Contract tests reject unsupported fields, duplicate/missing stills, invalid
styles, changed hashes, unsafe paths, overwrite attempts and insufficient cue
spacing or final settling. Geometry tests pin independently extracted source
hashes for the original aspect and all four native content surfaces. Shader
tests reconstruct the original fragment source before hashing. Independent
physics checks cover gravity, collisions, final fading and reverse seeks.

The production gate reads actual GL values, camera projection, geometry and
texture allocations, shard mesh positions/rotations/UVs, decoded image paths,
copy and palette. A separate fixed-step oracle verifies sampled fragments.
The final surface must match an independently fitted second image. Source phase
boundaries and their neighboring frames supplement the ordinary geometry,
caption, visible-beat and seam checks. Combined workflow, encoded-video and
audio qualification remain pending; the accepted lock is unchanged.

### Native glass parallax checks

Contract tests cover the closed one-image input, timing, hash and no-overwrite
rules. Motion tests pin independently extracted source cell geometry, all four
native tilings, pointer landmarks, material bounds and backward seeks. A separate
source probe compares all 54 source pane transforms/material values at twelve
forward/reverse times. The pinned postprocess converter checks exact source
bytes and rejects symlinks and unexpected local imports without executing code.

The native production gate inspects real mesh poses, physical material values,
linear brand colors, bloom parameters, GL grain uniforms, allocation counts and
projected corners of the padded source image. The normal caption, text-fit,
visible-beat, seam and reverse-seek checks remain enabled. Shader/context errors
fail the render; no fallback silently removes refraction or bloom. This optical
effect has no unchanged-image endpoint guarantee. Combined workflow, encoded
video and audio qualification remain separate requirements.

Glass parallax selects the same hardware Chrome path as other explicitly selected
GPU compositions. Ordinary interface and cinematic scenes keep their existing
software rasterization. Launch-selection tests exercise the actual capture entry
point with a test browser module and temporary run files; they do not launch a
real browser. Native resource checks require exactly sixteen textures across
still replacements. The adapter reuses its scene and camera because Three.js
caches transmission targets by those identities.
Replacing a still updates the existing canvas texture and its contain-fit instead
of rebuilding glass meshes, materials and environment maps. The independent
resource probe compares returned images byte-for-byte after backward seeks and
image replacement, then checks explicit disposal and renderer recreation.

### Approved-font extrusion

The native spatial-title check compares the actual 3D glyph advances, material
choice, letter pivots, word swing, fit bounds and approved font hash against the
closed input and source choreography. Source-event samples cover letter arrivals,
tagline entry, swing and final hold. Before letters arrive, the thin source contact
shadow can miss the coarse spatial pixel grid; this new style therefore scans
actual canvas alpha when that grid is empty. A fully empty canvas still fails.

Contract/writer tests cover copied-font drift, brand approval, symlinks, bounded
closed contours, unsupported copy, failed extraction and exclusive output writes.
Geometry tests exercise real holes in both winding directions and quadratic/cubic
curves. The macOS CoreText matrix checks all 13 catalog faces, including WOFF2;
this does not approve a new font for an existing brand. Private native fixtures
remain distinct from final cumulative audio/encoded-video qualification.

Extruded-title captures explicitly select `--disable-gpu-rasterization`: page
layers rasterize on CPU while the existing WebGL renderer remains enabled. The
initial hardware-page path reproduced a one-pixel, one-channel-level difference
in the fixed 4:5 logo. Its original PNGs remain retained. CPU page rasterization
passed the isolated 4:5 gate without pixel tolerances; all four profiles must be
qualified using this selected policy. The wireframe portal uses the same policy;
other scene capture policies are unchanged.

### Wireframe portal

The portal uses the normal four-format geometry, caption, seam and exact reverse
image gates. Its additional inspection checks the actual glyph meshes and poses,
approved font hash, nonzero-normalization marker, source/target copy and counts,
camera transform, native clock, minimum readable sizes and flat-outline bounds
and collisions. Source-event samples cover the starburst, letter matching and
swap, recession, forward rush and closing plate. Hidden DOM copy records are
marked hidden; geometry checks apply to the actual paths drawn into the canvas.

Independent source parity covers the original layout, matching, camera and
handoff functions. Shader checks retain half-float targets and exact RGBA replay.
Native contour checks cover overlapping fills, glyph counters and all 13 static
catalog faces; the legacy default extraction matches its previously qualified
geometry exactly. These checks do not approve a different font for an existing
brand or qualify the cumulative audio/export pipeline.

### Canopy titles

The native gate retains caption, geometry, visible-beat and exact reverse-pixel
checks. It additionally verifies both encoded local texture roles, all 340 leaf
poses, five species, geometry counts, source camera/focus, matched depth wind,
800 dust particles, six compositing passes, approved font hashes and projected
title bounds at a minimum 44px. Source-event sampling covers sweep, lift, retained
handoffs, title wipes, lens changes and final settling.

Native evidence passes four formats, 16 viewport checks and 380 event samples.
Independent original-source parity covers 421 instants, geometry and all five
procedural color/bump pairs. Empty-canvas, altered-font and unreadable-copy probes
must reject the composition. The first full run detected a static final cue;
mapping the source's active 0–10.5 second interval to the native clock fixes that
timing without weakening the visible-beat gate. These checks do not qualify the
cumulative cross-scene, audio or encoded-export pipeline. Historical failures
and the earlier separate 4:5 carousel raster discrepancy remain retained.

### Cuboid carousel

The native gate checks all 18 actual tile transforms, camera, hero assignment,
saved clock, source geometry counts, exact copy, loaded approved fonts and
projected readable bounds. It additionally measures visible title ink in the
actual canvas, so correctly reported metadata cannot excuse absent letters.
Source-event sampling covers chain separation, hero arrival, tile hiding and
the complete 50-frame departure. Caption, geometry and exact reverse-pixel
checks remain active in all four formats.

Independent parity runs the original HTML motion module against the adapter at
425 instants in each of four count/hero configurations, both seek directions:
890,800 scalar comparisons and 2,989,456 geometry entries match exactly. The
source renderer is stubbed in that parity harness; browser evidence is separate.
The maximum 12-card native case also passes. Negative probes reject empty canvas,
altered font metadata, an unavailable approved face and unreadable card copy.
The retained early failures exposed a font fallback and inverted ink projection;
both were fixed without relaxing the gates. Cumulative export remains pending.

### Device glass and paired framing

The phone/desktop glass gate checks the actual pinned model, camera and mesh
bounds, verified screen identity, decoded icon payloads, explicit notification
copy, source easing, supplied calendar date, font slots and shared cue clock.
Eight style/format cases pass 32 viewport checks and 680 event samples, including
strict reverse pixels and existing caption/geometry checks. Requiring the actual
loaded BrandSans 600/800 faces preserves all 48 saved frame hashes. Seven negative
probes reject empty canvas, wrong model, wrong screen, wrong font metadata,
clipped bounds, an absent approved font and an unbreakable overflowing body.

Independent comparison against the retained GSAP source covers 99,110 state
values in both directions. Maximum arithmetic error is approximately 1e-6;
this is timeline parity, not a render of the upstream page. Original-source
hashes and native payload hashes are in the device-glass provenance record.

The paired-device regression now samples exact clock event crossings. It found
that the closing fit included the still off-stage phone before its arrival.
The handoff uses the first complete paired pose, then fits each closing pose;
the original 34-degree lens, fit limit and geometry gates remain unchanged.
All four formats pass 16 viewport checks and 372 event samples. Native-rig unit
checks cover the whole closing interval and continuity at both handoff boundaries.
These results do not qualify cumulative seams, audio or encoded video exports.
