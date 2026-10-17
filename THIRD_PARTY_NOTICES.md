# Third-Party Notices

## Retained source renderers and expanded font catalog

`production-shard-runtime.js` retains HyperFrames Glass Shard geometry, material
and flight code, plus the bundled Three.js HDR loader. `production-frost-runtime.js`
retains the Frost WebGPU renderer. Their native wrapper replaces demo content,
font selection, dimensions, clock integration and persistent caching. The exact
source hashes, lossless texture conversions and output hashes are recorded in
`templates/v1/assets/production-source-provenance.json`.

HyperFrames composition code is Apache-2.0. The source runtime also includes
Three.js, three-mesh-bvh, opentype.js, Clipper, GSAP, D3 Delaunay, Delaunator and
robust-predicates. Their separate retained notices are in
`templates/v1/assets/production-source-notices.txt`; GSAP is not described as MIT.
No package installation or runtime download is added.

The font manifest contains 64 static and 16 variable source files. Additional OFL notices
come from the corresponding Google Fonts source folders; Permanent Marker and
Special Elite retain Apache-2.0 notices. Embedded font copyright/license metadata
was inspected. Monoton's named font and 2011 Vernon Adams copyright match its
official OFL notice. Six separately licensed commercial/personal-use binaries and
16 variable faces are not distributed by the catalog. Variable faces need an axis
contract that keeps browser and cover rendering consistent. Existing brand fonts
are unchanged. These records do not approve publication or third-party trademarks.

## HyperFrames native canopy composition

`production-canopy-motion.js` derives the seeded layouts, sweep/lift choreography,
retained-leaf handoff, camera/focus state, curved leaf geometry and procedural
color/bump generation from `registry/blocks/canopy-part-title/canopy-part-title.html`.
The original HyperFrames source is Apache-2.0; retain
`docs/licenses/hyperframes-apache-2.0.txt`. Exact source and adapted-file hashes
are recorded in `templates/v1/assets/production-canopy-provenance.json`.

The native `production-canopy.js` adds source-derived physical leaf materials,
wind deformation shared by color/depth/shadow passes, lighting, sharp title wipes
and the ordered depth-of-field compositor. It binds the approved brand palette
and display outlines, verified local texture inputs and the native caption clock.
Aspect fitting adapts leaf arrivals to the four native boards; the source's final
hold remains still. No original photographs, fonts or demo copy are redistributed.
Final cumulative encoded-export qualification remains pending.

`production-canopy-bokeh.js` vendors the Three.js r185 `BokehShader.js` under MIT,
retaining its source attribution and the complete `production-three-notices.txt`.
Its shader body matches r170, used by the original composition. The native caller
applies ACES exposure before the sharp approved title pass. The source URL, blob
identity, SHA-256 and local wrapper hash are pinned in the canopy provenance record.

The multiformat renderer adapts selected HyperFrames composition mechanics under
Apache-2.0. See `docs/hyperframes-production-provenance.json` for exact local source
hashes, changes and destination files. The full notice remains in
`docs/licenses/hyperframes-apache-2.0.txt`. No upstream font files, GSAP runtime,
remote assets or demo claims are included by this adaptation.

The native interaction adapter also adapts the oversized pointer's tip pivot and
press timing, quadratic drag and marquee paths, edge-aware context-menu placement
and reveal, and touch contact/swipe mechanics. The source demos, application
actions and arbitrary styling controls are omitted; outcomes use verified local
stills. Exact hashes and modifications are listed in production provenance.

The pointer extension adapts dart steering/smear, delayed echoes, sampled glyph
trails, magnetic target morphing, actor-tag positioning, and the critically
damped follow-camera spring. The chat extension adapts the typing bubble and
staggered dot wave. All run on the native cue clock with fixed brand styling;
demo identities, inferred outcomes and arbitrary runtime controls are omitted.

The interface presentations adapt bottom/side message stacking, measured token
and keystroke rhythms, a damped notification spring, notification restacking,
sliding tab-text highlights, the measured sheet trajectory, skeleton loading
reveal, menu-bar/pill morphing and explicit-state input feedback. All use supplied
content and brand tokens. Product identities, demo claims, live controls, source
keyboards, external responses and sound-effect events are not included. Exact
source hashes and per-presentation changes are in production provenance.

[Project license](LICENSE) · [Licensing guide](docs/LICENSING.md) · [Image provenance](docs/images/README.md)

## Scope

The MIT license in this repository covers project-authored work. It does not replace
dependency licenses or grant rights to platform tools, fonts, voices, artwork or
trademarks. This is a source-only distribution: dependency binaries, browsers,
frameworks, speech models and user media are not bundled.

## Direct Dependency Inventory

The optional development motion and composition adapters use HyperFrames code under
Apache-2.0. Its retained [license](docs/licenses/hyperframes-apache-2.0.txt),
[source provenance](docs/hyperframes-provenance.json), and
[modification notes](docs/HYPERFRAMES-PILOT.md) apply to those adaptations.
No HyperFrames runtime or GSAP dependency is bundled. Effect-enabled render
outputs, including cinematic compositions, retain these notices and source provenance.

Versions come from the project's manifests and the locally inspected qualification
environment, checked on 2026-09-14. This table is not a complete transitive SBOM.

| Dependency | Declared version | License information | Source |
| --- | --- | --- | --- |
| Pillow | 12.2.0 | MIT-CMU | [Versioned upstream license](https://github.com/python-pillow/Pillow/blob/12.2.0/LICENSE) |
| NumPy | 2.4.6 | Core BSD-3-Clause; installed distribution carries additional component licenses | [Versioned core license](https://github.com/numpy/numpy/blob/v2.4.6/LICENSE.txt) |
| Playwright | 1.62.1 | Apache-2.0 | [Upstream license](https://github.com/microsoft/playwright/blob/main/LICENSE) |

Pillow's installed metadata identifies `MIT-CMU`. NumPy's inspected 2.4.6 metadata
declares `BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0` and lists component
license files. Do not reduce a redistributed NumPy binary package's obligations to
its core license alone. Playwright also depends on separately distributed packages;
retain the licenses and notices from the actual installation when redistributing it.

The B07 npm lockfile records Playwright Core 1.62.1 (Apache-2.0) and the optional
macOS dependency fsevents 2.3.2 (MIT), as reported by the installed packages.
Their binaries are not bundled in the source release. The isolated qualification
used npm 12.0.2 as a setup tool only; npm is not a project runtime dependency and
its bootstrap archive is not distributed. This is not a complete binary SBOM.

## Optional Voice Runtime (Not Bundled)

The optional `tools/voice.py` uses packages and model files that the operator
installs into a separate environment; none are included in this repository or
its source archive. `tools/voice-models.json` pins the accepted model files by
SHA-256 and lists these components:

| Component | Version | License information | Source |
| --- | --- | --- | --- |
| Kokoro-82M weights (v1.0, ONNX release model-files-v1.1) | 1.0 | Apache-2.0 | [Model card](https://huggingface.co/hexgrad/Kokoro-82M) |
| kokoro-onnx | 0.6.1 | MIT | [Upstream](https://github.com/thewh1teagle/kokoro-onnx) |
| ONNX Runtime | 1.30.0 | MIT | [Upstream](https://github.com/microsoft/onnxruntime) |
| phonemizer | 3.4.0 | GPL-3.0-or-later | [Upstream](https://github.com/bootphon/phonemizer) |
| espeak-ng via espeakng-loader | 0.2.4 | GPL-3.0-or-later | [Upstream](https://github.com/espeak-ng/espeak-ng) |

The GPL components stay in the operator's environment as separate programs
invoked by the optional tool; they are not linked into or shipped with this
project. Review their terms before redistributing an environment that contains
them.

No third-party license texts have been relabeled as the project's MIT license.
Upstream links are provided for review; the notices shipped with the precise
distribution being used remain important, especially for platform-specific wheels.

## Separately Installed Runtime

Python, Node.js, Google Chrome, Swift, AVFoundation, Speech and local speech models
are supplied by their respective distributions/platforms. Their licensing and update
behavior are not controlled by this project's license. They are not part of the
source ZIP. This document does not certify redistribution of a self-contained app
that bundles those components.

Optional FFmpeg and ffprobe executables are also separately installed, never
included in the source ZIP. Their codec/build licenses are independent of this
project's MIT license. The tested FFmpeg 8.1.2 build enables GPL/version-3
components and libx264. See [licensing boundaries](docs/LICENSING.md); no permission
to redistribute a runtime bundle or patent clearance is implied.

## Fonts and Imported Content

No TTF/OTF/TTC font files, voice recordings, customer logos, production artwork,
credentials or model weights are shipped in the public tree. Onboarding copies
operator-selected fonts into private workspace assets and loads them locally for
capture. Installed-font suggestions are not permission to embed or redistribute them.

Imported media retains its own rights. A generated video or cover is not an
automatic license for the source material. Sharing a run's HTML/assets folder may
share font software and private content; treat that as a separate rights/privacy review.

## Documentation Images

The gallery consists of project-rendered examples using the illustrative Signal Lab
name. The [image manifest](docs/images/manifest.json) records origin and integrity.
These are raster documentation samples, not bundled fonts or customer production
assets. They make no claim that a channel name or mark is available for registration.

## Contributions and Future Packaging

Contributors must have permission to contribute their work and preserve necessary
notices. If a future release adds vendored code, downloadable assets, an executable
bundle or generated third-party material, update this inventory and review the actual
distribution before publishing. A passing release audit is not legal clearance.
## Offline Visual Library

The development tree retains selected Lucide 0.468.0 SVGs (ISC with inherited MIT
notices), ECharts 6.0.0 (Apache-2.0 and bundled notices), and simplified Natural
Earth 5.1.2 map geometry (public domain). Original license/notice files and pinned
source/file hashes are under `tools/visual_library/vendor/`. They are not relicensed
under the project MIT license. Generated asset runs carry the relevant notices.
No company logos, voice recordings or customer media are included. The optional
font catalog below is a separate, explicitly allowlisted font distribution.

## HyperFrames Shader Package

The development screen adapter retains fourteen GLSL algorithms from
`packages/shader-transitions` and adapts its WebGL program/texture mechanics.
The upstream root LICENSE says Apache-2.0; the package README says MIT and its
package.json has no license field. Both declarations and exact source hashes are
recorded in [production provenance](docs/hyperframes-production-provenance.json).
The retained Apache license and attribution accompany generated runs. This local
integration does not resolve the conflicting declarations for public redistribution.
No html2canvas, GSAP, DOM snapshot cache or upstream runtime is bundled.

The development headline module additionally adapts `caret-swap`, `line-swap`,
`text-state-swap`, and the four authored `marker-highlight` SVG paths. Typography
also adapts `matrix-decode` and `focus-blur-resolve`. Exact source paths and
SHA-256 hashes are retained in `docs/hyperframes-production-provenance.json`.
The existing Apache-2.0 notice applies; upstream fonts, CDN/GSAP calls, example
copy, dynamic font fitting and idle blinking are not distributed.

## Optional font catalog

`tools/font_library/vendor/manifest.json` pins 80 unchanged font files, including Archivo (Regular/SemiBold), Geist (Regular/SemiBold/Bold), Inter
(Regular/Medium/SemiBold/Bold), EB Garamond (Regular/Bold), and JetBrains Mono
(Regular/Bold). The exact accompanying copyright and SIL Open Font License 1.1
texts are retained in `tools/font_library/vendor/licenses/`. Font and notice
hashes and their upstream paths are recorded per face. These fonts retain their
own OFL or Apache terms; they are not relicensed as project MIT or HyperFrames Apache code.
They are optional new-brand inputs. No existing approved font is replaced.

The 16 variable files retain their real weight axes; Recursive also retains its
slant axis. Their original bytes and separate OFL notices are pinned. Four new
typography treatments adapt HyperFrames `weight-wave`, `variable-axis-type`,
`variable-font-flex` and `caption-weight-shift`; exact source hashes and changes
are in `templates/v1/assets/production-variable-provenance.json`.

The development batch also adapts `dynamic-grid`, `grain-field`, `mesh-gradient-bg`,
`aurora-drift`, `beat-pulse-background`, `starfield`, `snow`, `cut-the-curve`,
selected scale/blur/dissolve transition mechanics, `chat-message`,
`code-terminal-run`, `onboarding-stepper-flow`, `settings-toggle-flow` and
`notification-stack`. Exact source hashes and bounded changes remain in the
production provenance record. CDN/GSAP calls, example identities, automatic font
shrinking, arbitrary slots and background timers are not imported.

Further bounded adaptations use `bar-chart-race` (ten-sample rank interpolation
and stable ties), `mk-line-graph` (shared-scale two-series paths),
`constellation-hub` (radial connectors and settle), `flowchart` (orthogonal
branch connectors), `cursor-annotate` (shared stroke/pointer position),
`press-ripple` (arrow path, tip pivot and two click rings), and
`yt-circle-pointer` (ellipse stroke drawing). Source hashes, adaptations and
pending qualification are recorded in `docs/hyperframes-production-provenance.json`.
The new adapters retain Apache-2.0 source attribution. Supplied example metrics,
claims, application actions and identities are not copied into episodes.

Typography adaptations additionally use `per-word-crossfade`, `staggered-fade-up`,
the entry snippet in `blur-out-up`, `shared-axis-y`, `shared-axis-z`,
`soft-blur-in`, `scan-band`, `rgb-glitch-text`, `shimmer-sweep`, `svg-mask-reveal`,
`titlecard-calm`, `morph-text`, `strikethrough-replace`, and `split-flap-board`.
The adapters retain source attribution and the Apache-2.0 notice while using
approved brand fonts/colors, exact supplied copy and the engine's cue clock.
All per-source changes are recorded in production provenance. Existing shader
coverage also records the fourteen corresponding catalog demo paths; this does
not import or clear the examples' fonts, layout, narration or media.

The carousel batch reuses the shared `CarouselRig` math from all 25
`carousel-circle-*`, `carousel-path-*`, `carousel-orbit-*`,
`carousel-text-circle-*`, and `carousel-vision-*` blocks. The math is preserved
with a namespaced export. Preset geometry and keyframe curves are retained;
the renderer is adapted to the engine's caption clock, approved brand and local
image validation. Demo media, external scripts, source font/color/copy overrides,
promotional outros and arbitrary variables are excluded. Source hashes and the
exact modifications are recorded in production provenance under Apache-2.0.

The complete 13-group `transitions-*` catalog contributes 33 bounded local-image
swap recipes. Their source timing/easing, transforms, masks, gradient layer
arrangements and deterministic burn geometry are adapted into native state
evaluation. The original Apache-2.0 notice and per-source hashes remain retained.
Changes include caption-frame timing, approved palette substitution, full-cover
cut corrections and clean endpoints. Demo text/media, remote GSAP loading and
source branding are excluded. Detailed changes are in production provenance.

Eight code/editor definitions contribute six `code-story` modes: character typing,
LCS line diffs, measured token morphs, centered code scrolling, workbench typing,
and supplied terminal output. The two dark-workbench blocks share identical
render/timeline functions and one native mode. Apache-2.0 source hashes and
modifications are retained in production provenance. Source themes, fonts, demo
commands/results, remote dependencies and callbacks are excluded. Native adapters
use literal text, approved type, caption-frame timing and deterministic seeking.

The data-resource adapters retain mechanics from `us-map-hex`, `us-map-bubble`,
`us-map-flow`, `data-chart`, `animated-bar-chart`, `mk-specs-list`, and
`conic-progress-ring`, under the retained Apache-2.0 source notice. The US hex
grid retains all 51 source positions, with corrected non-overlapping geometry.
Bubble/flow modes reuse visual math over operator-supplied local images; no
geographic dataset, D3, TopoJSON, demo statistics, theme or remote script is
included. Explicit numeric/source records and brand roles replace demo inputs.
Source hashes and precise adaptations are listed in production provenance.

The annotation ink adapter retains seeded geometry, curvature-weighted pen
timing and stroke textures from `hw-boil`, `hw-arrow`, `hw-box-label`,
`hw-callout-circle` and `hw-underline`, plus pen geometry/tangent tracking from
`whiteboard-ink`. These are bounded subsets of the Apache-2.0 sources. Source
hashes and omissions are recorded in production provenance. Image-region fitting,
caption-frame timing, scene-local masks and complete pen exit are native changes.
Source fonts, demo sketches/content, arbitrary SVG slots, perpetual boil and
remote scripts are excluded. The existing approved brand remains authoritative.

Title design additions adapt `mk-callout-highlight`, `hw-title`, `hw-text-cloud`,
`hw-path-text`, `mk-emphasis-type`, and `vox-annotate` under the retained
Apache-2.0 source notice. Reused mechanics include word emphasis, a seeded
underline/cloud, cubic text-path typography, a decorative background word and
connector/note choreography. Bounded native layouts, approved fonts, fixed cue
timing, grapheme handling and exact text/fit gates replace source configuration.
Source fonts, remote scripts, arbitrary geometry and perpetual boil are omitted.
Per-file hashes and precise adaptation scope remain in production provenance.

## Additional native media camera recipes

The engine adapts HyperFrames `push-in`, `pull-back-reveal`, `yt-camera-move`,
`tilt-card`, `focus-rack`, `parallax-zoom`, and `parallax-unzoom` under Apache-2.0.
Their source scale/easing phases, focus transfer, perspective and parallax
relations are mapped to closed camera records and local verified stills.
Source fonts, colors, demo claims, arbitrary transforms and idle hold loops
are omitted. Exact hashes and changes are in production provenance.

## Additional editorial layouts and closings

The renderer adapts HyperFrames `hw-frame`, `hw-pipeline`, `lower-third-bild`,
`yt-lower-third`, `cta-close`, `logo-brand-close`, and `logo-sting` under
Apache-2.0. Source drawing paths, plate geometry and timing recipes are mapped
to bounded native scenes. Source fonts, identities, avatar artwork, colors,
arbitrary runtime parameters and idle boil are not copied. Exact source hashes
and modifications are recorded in production provenance.

`production-editor-scenes.js` adapts HyperFrames `vector-editor-rig` and
`sticky-mock-swap`; `production-headline-panels.js` adapts `type-match-cut`.
`production-organic-fields.js` retains authored facet tables, seeded grain
generation and motion/lighting calculations from `facet-morph` and
`soft-blob-touch`. These source files are covered by the retained HyperFrames
Apache-2.0 notice. Native adapters replace source branding, fonts, variable
controls and free timelines with approved tokens and bounded caption cues.
No source audio, remote import or unverified example artwork is distributed.
Individual source hashes and changes are recorded in production provenance.

## Canvas fields, cadence and magnetic image swaps

`production-canvas-backdrops.js` adapts HyperFrames `vfx-anamorphic-flare`,
`mk-background` and `stop-motion-cadence` under the retained Apache-2.0 notice.
The source emitter seed/trajectories, horizontal tent calculation, mesh-card
geometry and stepped throw/landing schedules are reused. Approved colors, native
panel dimensions and bounded cue clocks replace source configuration. Idle loops,
source exits, demo branding and remote GSAP imports are omitted.

The two magnetic fragments in `production-shader-sources.js` adapt the Gaussian
pull/repel and RGB sampling from HyperFrames `vfx-magnetic`. Verified local stills
replace experimental DOM texture capture; the existing shader adapter owns
endpoint blending, filtering and resource/error limits. The original fourteen
shader-transition bodies remain unchanged. Source hashes and all material
adaptations are recorded in `docs/hyperframes-production-provenance.json`.

## Additional image surface and device adaptations

The renderer adapts HyperFrames `yt-vertical-fill`, `yt-screen-warp`,
`grain-overlay`, `vignette`, `light-sweep-pass`, `organic-light-leak-overlay`,
`editorial-flash-overlay`, `beat-accent`, `yt-feather-highlight`,
`yt-lcd-background`, and `device-frame-stage` under Apache-2.0. Source geometry,
easing and fixed texture recipes are mapped to verified local-image records.
Fonts, colors, arbitrary content slots, external scripts and repeating motion
are omitted or replaced by approved engine roles. Exact source hashes and
per-adaptation modifications are recorded in production provenance.

## Additional native gesture and panel presentations

The renderer adapts HyperFrames `swipe-rail`, `velocity-throw-snap`,
`spring-stack-shuffle`, `scroll-feed`, `state-chip-rail`, `toggle-flip`,
`card-resize`, `modal-morph`, and `pull-to-refresh` under Apache-2.0.
Source motion and geometry become fixed native interface variants with exact
supplied copy, approved fonts and caption cues. Demo identities, arbitrary DOM,
remote scripts, live actions, sound events and idle motion are omitted. Source
hashes and individual modifications are retained in production provenance.

The native title-reading options also adapt mechanics from HyperFrames
`caption-highlight`, `caption-gradient-fill`, `caption-neon-glow`,
`caption-kinetic-slam`, `caption-editorial-emphasis`, and `caption-pill-karaoke`
under Apache-2.0. Implementation is in `production-type.js` and
`production-type.css`. They retain bounded entrance, sweep, glow or ink geometry
using approved brand assets and the native cue clock. Upstream sample text,
fonts, narration, transcript grouping and remote scripts are not distributed.
Exact source hashes, timing adaptations and omitted behaviors are recorded in
`docs/hyperframes-production-provenance.json`.

`production-media-raster.js` adapts HyperFrames `ascii-render-pass`,
`ordered-dither-pass`, `particle-image-reveal`, `ink-bleed-reveal`, and
`slit-scan-reveal` under Apache-2.0. Retained mechanics include the luminance
summed-area table, integer character-grid hash, Bayer recursion/quantization,
seeded particle/blob schedules, ink threshold and delayed slice sampling.
Source hashes, fixed presets, timing adaptations and omitted options are listed
in `docs/hyperframes-production-provenance.json`. Source sample marks, artwork,
remote scripts, font families and arbitrary DOM capture are not distributed.

The cumulative native interface and screen-swap additions adapt HyperFrames
`reddit-post`, `x-post`, `yt-comment-card`, `instagram-follow`, `tiktok-follow`,
`slack-notification-ad`, `physical-exit`, `rubber-band-bumper`, `morph-swap`,
`page-slide`, `chromatic-aberration-wipe`, and `zoom-through-transition` under
Apache-2.0. Platform identities, sample metrics, remote runtime scripts,
callbacks and arbitrary source styling are omitted. Approved brand roles,
explicit supplied action states, local stills and the native cue clock replace
those inputs. Exact source hashes, shared implementations and changes are in
`docs/hyperframes-production-provenance.json`. Source integration does not imply
final visual qualification or publication approval.

Further cumulative adaptations use HyperFrames `camera-shake`, `pendulum-swing`,
`extended-keyframe`, `avatar-cloud`, `radial-surround`, `locked-nucleus-orbit`,
`overwhelm-surround`, `logo-wall`, `spring-pop`, `success-check`, `stagger-lattice`,
`svg-line-draw-loader`, and `text-stagger` under Apache-2.0. Native adapters retain
their measured curves, selected source geometry and deterministic algorithms,
with approved colors/fonts and explicit content. Source identities, branded demo
assets, arbitrary overrides, remote runtimes and continuous idle loops are not
imported. Exact hashes and individual adaptations are recorded in production
provenance; the retained Apache license and attribution apply to this code.

Native image-inspection overlays adapt `telemetry-hud`, `camcorder-hud`,
`camera-scan-gate`, and `segmentation-flood` from HyperFrames under Apache-2.0.
They retain source bracket/sweep geometry, seeded scan/readout recipes and
frame-driven counter mechanics. Supplied regions and metadata replace sample
values, recognition claims, dates and automatic content. The native panel,
station and particle additions adapt `panel-reveal`, `pan-stations`, and
`confetti` under the same terms. Fixed native cues, approved fonts/palette and
closed records replace source timing/style overrides and remote GSAP imports.
Exact source hashes and modifications are in production provenance.

## Optional bundled GPU backdrops

`templates/v1/assets/production-gpu-runtime.js` adapts the identical shader bundle
shipped with 36 HyperFrames backdrop blocks. Its retained package notices are in
`templates/v1/assets/production-gpu-notices.txt`: Shaders 4.0.0, TypeGPU 0.12.3,
tinyest 0.3.4 and typed-binary 4.3.3 carry MIT notices; tsover-runtime 0.0.7 carries
an Apache-2.0 notice. The original bytes, modified bytes and individual patches
are identified in `templates/v1/assets/production-gpu-provenance.json`.

This is a vendored runtime dependency, loaded only for explicit native `gpu-*`
backdrops. The adaptation disables autonomous playback, dynamic writer
compilation and external SDF loads, evaluates absolute caption-driven time and
maps the output into the approved palette. Source geometry and lighting are
retained; arbitrary source properties and original colors are not exposed.
The complete package notices accompany the template assets and engine lock.

## Additional native title treatments

`production-type-advanced.js`, its native routing and styles adapt HyperFrames
`caption-glitch-rgb`, `caption-matrix-decode`, `caption-neon-accent`,
`caption-particle-burst`, `caption-texture`, `texture-mask-text`,
`particle-text-dissolve`, `wordmark-tiles`, `ascii-trail-reveal` and `typed-prompt`
under Apache-2.0. The layered title backdrop adapts `caption-parallax-layers`.
Source hashes and individual changes are in production provenance. These are
title adapters, not imports of the source caption rail, demo transcript, keyword
lists, fonts, texture pack or GSAP runtime. The approved font/palette, explicit
content, verified local images and native caption-frame clock remain authoritative.

## Spatial images and paper transitions

`production-media-spatial.js` adapts `camera-rig-depth-stack`,
`keyframe-scrub-stack`, `multi-device-splay` and `camera-dolly-zoom` under
Apache-2.0. `production-paper-transitions.js` adapts `hw-scribble-transition`,
`paper-collage-reveal` and `torn-paper-rip` under the same license. Source hashes,
retained equations and specific modifications are recorded in production
provenance. Native captions drive fixed presets using verified stills. Source
sample applications, footage, glyph systems, texture assets, fonts, brands and
external runtimes are not included in these adapters.

## UI and diagram primitives

`production-ui-primitives.js` adapts HyperFrames `micro-transitions`,
`signup-flow`, `beat-timeline`, `x-follow-card`, `avatar-group-hover`, `icon-swap`
and `icon-morph-beat`. `production-path-motion.js` adapts `separator`,
`arc-motion-path`, `offset-path-traveler` and `tracing-beam`. These source
components are Apache-2.0; their individual hashes, changes and omissions are
recorded in production provenance. The adapters reuse source equations and SVG
control points, with approved brand fonts/palette and native caption timing.
No source sample identities, audience metrics, network calls, audio cues,
interactive controls, GSAP or MotionPath runtime are imported.

## Kinetic composition presets

`production-kinetic-presets.js` adapts HyperFrames `perspective-marquee`,
`ticker-takeover`, `shutter-slam` and the shutter sampling core of `motion-blur`
under Apache-2.0. The native adapter uses the source timing curves, geometry and
inclusive shutter samples, driven by explicit caption cues. Source defaults,
custom font fitting, GSAP integration, arbitrary DOM selectors and automatic
registration are omitted. Approved fonts and exact supplied words are retained.
Individual source hashes and modifications are recorded in production provenance.

## Spatial backdrops and Three.js

`production-three-backdrops.js` adapts HyperFrames `three-orbiting-cards`,
`glass-hero`, `spiral-galaxy` and the color-panel mode of `gallery-tunnel` under
Apache-2.0. Source geometry, physical material settings, seeded attributes,
differential rotation, solid tunnel edges, fog and recycling equations are reused.
Native changes constrain inputs, map art to the approved palette, keep approved
typography, fit the camera to the output profile and use the bounded caption clock.

`production-three-runtime.js` vendors the exact local Three.js r185 core and WebGL
modules shipped in HyperFrames' `orbit-card` assets. Three.js is MIT-licensed;
the full copyright and permission notice is retained in
`templates/v1/assets/production-three-notices.txt`. Source and bundle hashes are
recorded in `production-three-provenance.json` beside it. `tools/vendor_three.py`
reproduces the classic-script wrapper from those two exact local inputs without
installing packages. The wrapper converts named imports/exports to private
closures; the module bodies are unchanged. Source demo fonts, images, loaders,
remote imports, GSAP and automatic animation loops are not used by the adapter.

## Liquid glass and composition-word camera

`production-liquid-glass-runtime.js` retains the GPU core and shaders from the
identical `liquid-glass.iife.js` files shipped with HyperFrames' notification and
widget blocks. It is retained under the repository's Apache-2.0 notice; no separate
library notice is present in those files. The experimental DOM-capture wrapper is
excluded. Two reversed-edge smoothstep expressions use equivalent ascending
edges, and one reusable staging canvas replaces per-frame allocations. The native
adapter separates horizontal/vertical blur uniforms, serializes frames, constrains
inputs/resources and reports GPU errors. Source and adapted hashes are retained
in `templates/v1/assets/production-liquid-glass-provenance.json`.

`production-kinetic-camera.js` adapts the layout, camera-fit, easing and blur
mechanics of HyperFrames `caption-camera-follow` under Apache-2.0. It targets
explicit composition words using the approved font and shared native clock;
the spoken-caption implementation is unchanged. Default copy, accent choices,
font substitutions, free timing and framing controls are omitted. Source hashes
and modifications are recorded in production provenance.

`production-optical-fields.js`, `production-optical-shaders.js` and their native
backdrop adapters reuse HyperFrames `cosmic-orb`, `rack-focus`, and
`oscilloscope-trace` under Apache-2.0. Source hashes and recipe changes are in
`docs/hyperframes-production-provenance.json`. Six reversed-edge GLSL smoothstep
calls are replaced with defined ascending-edge complements. Approved palette
mapping, fixed synthetic modes and bounded clocks replace example controls.

`production-code-spatial.js` adapts HyperFrames `code-particle-assemble`,
`code-shader-dissolve`, and `code-3d-extrude` under Apache-2.0. It retains seeded
particle assembly, dissolve noise/fringe math and beveled geometry/UV mechanics.
Explicit native text and approved BrandMono replace baked example tokens and
source fonts. Source fitting, colors and point size are adapted to native glyph
geometry; the particle fragment's reversed smoothstep is corrected. The existing
local MIT Three.js bundle and its retained notices are reused without installation.

`production-screen-cuts.js` ports HyperFrames `mk-clone-wall-transition` under
Apache-2.0, retaining card contraction, brick-offset tiles, sweep and exit timing.
Verified stills and supplied words replace demo media/identity; two approved
palette planes replace difference blending, and idle drift is omitted.

The native media-surface module additionally adapts `freeze-frame-dressing`,
`parallax-device-dive`, and `drift-hold` under Apache-2.0. Fixed source curves and
layer mechanics apply to verified stills with approved color tokens. The phone
dashboard is replaced by three image bands, and full-duration idle movement
becomes one finite entry accent. No source measurements, app identity or live
video controls are imported.

The headline-panel module also adapts `match-cut` under Apache-2.0. It retains
the matched circle and source easing/timing, with explicit native headlines.
The incoming scale sign is corrected to continue the outgoing camera vector;
the example button/check/result, font fitting and idle bob are omitted. Source
hashes and full adaptation notes remain in production provenance.

The resources module adapts `apple-money-count` under Apache-2.0: 62 indexed
paths, golden-angle spread, pulse/flash and overlapping departure curves. Native
metric data replaces the fixed example amount; no dollar marks or audio are
copied, and the result remains readable after the decorations clear.

The data module adapts `week-in-merges` under Apache-2.0: proportional marker
speed and reflected lane travel. Supplied native series replace example people,
counts and remote avatars. Zero speed replaces the source's artificial zero
floor; absolute integration preserves travel across explicit period changes.

`production-spatial-objects.js` adapts HyperFrames `exploded-stack` and
`product-turntable` under Apache-2.0. Four plates retain source separation,
focus, projected leaders and collapse. A core beveled extrusion replaces the
unavailable RoundedBoxGeometry addon. The can retains its 13-point lathe,
studio strips, plinth, contact shadow and pull tab; a verified local label image
replaces the source product copy. No remote model loader or font is imported.

The room-lighting helper adapts the local Three.js `RoomEnvironment.js` shipped
with the cuboid-carousel source, under the existing complete Three.js MIT
notice in `templates/v1/assets/production-three-notices.txt`. Its source hash
is retained alongside the object provenance. This reuse does not declare the
cuboid-carousel composition integrated. The pinned r185 runtime is unchanged;
the source compositions originally requested r184.

`production-orbit-card.js` adapts HyperFrames `orbit-card` and its saved Blender
motion export under Apache-2.0. Source camera samples, F-curve values, aperture
geometry, one card revolution and dot-sphere construction are retained. Verified
image art replaces the Archivo text atlas; approved colors replace sample colors.
Only the central source segment is used, followed by an exact native hold.

`production-slice-sweep.js` and `production-slice-surface.js` adapt HyperFrames
`code-slice-hero`, including its surface and projected-shadow source, under
Apache-2.0. The original deterministic field, seeded torque, cell eligibility,
instanced faces and shadow projection remain. Native dimensions, a shared local
WebGL context, approved type/ground and caption cues replace the standalone
composition, Geist fitting, free variables and GSAP clock.

The `promo-belt` carousel adapts the measured entry table and two-row conveyor
from `heygen-avatar-promo-card` under Apache-2.0. Only motion and layout code are
reused. No source avatars, soundtrack, HeyGen marks, promotional claims or font
files are imported. All displayed stills retain the native asset checks.

`production-media-spatial.js` additionally adapts the three-phone fan from
HyperFrames `app-showcase`. `production-media-presentations.js` adapts the card
layers and stagger from `spotify-card`, and the measured spring/image-cut sequence
from `share-sheet-carousel`. `production-news-ticker.js` adapts the entrance,
headline mask, two specular passes and finite track traversal from `news-ticker`.
These source mechanics are Apache-2.0. Native caption cues, complete-image fitting,
approved fonts/colors and explicit copy replace the source demo UI, marks, claims,
music and action buttons. The ticker distance fits the supplied text; the preview's
final two cuts are tied to its settle cue. Idle pulses and automatic exits are omitted.

The `prism-bow` title treatment adapts HyperFrames `yt-prism-title` under
Apache-2.0. The original 950-pixel perspective, six-degree bow, focus entrance and
paired color offsets are retained during entry. Approved typography and accents
replace source styling. A bounded final settle removes the source resting blur
and prism offsets; source breathing, wobble and automatic exit are omitted.

`production-brand-lockups.js` adapts HyperFrames `yt-logo-intro`, `logo-outro`
and `store-badge-lockup` under Apache-2.0. Source entry/handoff timing, five-piece
stagger, interrupted scale pulse, glow bloom and equal-size badge choreography
are retained. The existing approved logo replaces example marks; five exhaustive
image strips replace Figma-specific paths and restore the original image at rest.
Pinned generic icons and explicit badge text replace store identities. Native
geometry, fonts, colors, cues and finite holds replace the standalone lifecycle.

The `steam-window` treatment in `production-media-presentations.js` adapts
HyperFrames `cinemagraph` under Apache-2.0: the seeded fourteen-wisp field,
elliptical feather mask, ten-second periodic phase and radial-gradient drawing.
A verified local still and explicit normalized region replace the procedural
cup scene. The approved white replaces source near-white; the loop endpoint is
canonicalized for an exact native hold. No sample photograph, video, font,
audio or external runtime is imported.

### HyperFrames statistic compositions

Selected graphic mechanics from the `swiss-grid`, `warm-grain`, `play-mode` and
`vignelli` examples are adapted in `production-stat-cards.js`; `decline-chart`
is adapted in `production-data.js`. The `nyt-graph` and `decision-tree` examples
reuse the existing bounded combo-chart and branch-tree adaptations. Individual
source paths, SHA-256 hashes, retained mechanics and omissions are recorded in
`docs/hyperframes-production-provenance.json`. The retained HyperFrames
Apache-2.0 notice applies. No source survey, actor footage, alternate caption
track, font binary or example branding is imported by these additions.

### HyperFrames cursor compositions

`production-cursor-scenes.js` adapts `cursor-text-select` and
`multiplayer-cursors` under the retained HyperFrames Apache-2.0 notice. Source
paths, SHA-256 hashes, retained curves/waypoints and specific changes are in
`docs/hyperframes-production-provenance.json`. Native frame timing, complete
Unicode graphemes, explicit content, physical exits and compact-format name-tag
placement replace standalone callbacks, fallback text/names, alpha reveals and
idle drift. No source font binary, sample identity, external runtime or claim
of live collaboration is imported.

### HyperFrames ranked-answer composition

`production-answer-rank.js` adapts `ai-answer-rank` under the retained
HyperFrames Apache-2.0 notice: authored keystroke gaps, finite thinking dots,
lead/row timing, fixed ranks, insertion curves and check drawing. Exact source
path/hash and changes are recorded in `docs/hyperframes-production-provenance.json`.
Native cue timing, complete graphemes, approved fonts/colors, caller-supplied
copy and descriptions replace the demonstration brands, skeletons and theme.
No source font, external GSAP runtime, remote service or actual ranking claim
is imported.

### HyperFrames measured note scrolling

`production-note-scroll.js` adapts the seven typing-event tables, five measured
scroll curves, paragraph jumps and glyph-measured caret from `notes-reveal`
under the retained HyperFrames Apache-2.0 notice. Its exact source path/hash
and changes are in `docs/hyperframes-production-provenance.json`. Native cue
timing, approved fonts/palette, complete graphemes and bounded wrapping replace
source timing, theme, UTF-16 slicing and font-size reduction. The demo copy,
phone keyboard/chrome, alternate closing card, video placeholder, source fonts
and extra sign-off brand are not imported.

The cumulative development integration also adapts the HyperFrames
`registry/components/colorama-wipe/colorama-wipe.html` compound text wipe and
`registry/blocks/beat-freeze-cut/beat-freeze-cut.html` held-image cut interval
under the retained Apache-2.0 notice. Source hashes and specific modifications
are in `docs/hyperframes-production-provenance.json`. Demo fonts, music, labels
and graphic data are not included.

The development `production-filmed-screen.js` adapter and
`production-filmed-screen-shader.js` lens derive from HyperFrames
`registry/components/filmed-screen/filmed-screen.html` under Apache-2.0. The
retained shader changes out-of-screen ground to the approved background; the
adapter changes input, camera timing and lifecycle as documented in production
provenance. No example images, fonts, models or external runtime are distributed
with this adaptation. The complete HyperFrames notice remains included.

## HyperFrames conversation compositions

`production-chat-exchange.js` adapts motion and composition mechanics from
`registry/blocks/chatgpt-exchange/chatgpt-exchange.html`,
`registry/blocks/claude-exchange/claude-exchange.html`, and
`registry/blocks/message-thread-reveal/message-thread-reveal.html`.
They remain covered by the retained HyperFrames Apache-2.0 license and notice.
Exact source hashes and changes are in `docs/hyperframes-production-provenance.json`.
Product identities, demo copy, supplied third-party fonts, phone UI and example
media are not redistributed with this adaptation.

## HyperFrames gooey-split composition

`production-gooey-split.js` adapts the authored geometry, timing and motion-blur
mechanics from `registry/blocks/gooey-split/gooey-split.html` under the retained
HyperFrames Apache-2.0 license. Exact source hashes and modifications are recorded
in `docs/hyperframes-production-provenance.json`. GSAP/CustomEase, source timeline
hooks and polling are not imported; existing native math helpers are reused.

The native flight-route adapter derives cubic controls, aircraft and arrival-doodle
SVG paths, camera/route timing and staggered route markers from HyperFrames
`nyc-paris-flight` by Stronkter under the retained Apache-2.0 source notice.
The pinned source hash and adaptation details are in production provenance.
A supplied verified basemap, explicit endpoints, approved palette and existing
frame clock replace demo media, location claims, fonts and the GSAP dependency.
The example OpenStreetMap/CARTO map and sound mix are not distributed. A supplied
basemap remains subject to its own rights and visible source attribution.

The regional choropleth adapter additionally derives motion from HyperFrames
`spain-map` and `us-map` under the retained Apache-2.0 notice. It preserves
value sorting, center-out region/label staggers, the piecewise scale structure
and selected-region pulses. Approved typography/colors and supplied metrics
replace demonstration fonts, branding and GDP/density claims. Offline geometry
and exact source/output hashes are documented in
[regional geometry provenance](docs/hyperframes-regional-geometry-provenance.json).

- es-atlas0.6.0: [MIT notice](docs/licenses/es-atlas-mit.txt). Its Spanish
  administrative-boundary data comes from IGN under
  [CC BY4.0](https://creativecommons.org/licenses/by/4.0/) and the
  [IGN attribution terms](https://www.ign.es/resources/licencia/Condiciones_licenciaUso_IGN.pdf).
  This derivative projects the atlas paths, retains islands/holes and adds
  supplied-value coloring and labels. Credits are fixed and visible alongside
  the map, identifying the derivation, producer, atlas version and license.
  The atlas does not state the original geometry edition date; it remains
  explicitly unspecified. Do not substitute a metric date or claim current
  administrative boundaries. Publisher review of this limitation remains open.
- us-atlas3.0.1: [ISC notice](docs/licenses/us-atlas-isc.txt), derived from the
  2017 U.S. Census cartographic boundaries identified by the
  [versioned upstream README](https://github.com/topojson/us-atlas/tree/v3.0.1).
  The original Albers USA projection and fifty-state filter are retained.

The offline compiler selects only the pinned D3 7.9.0 library script from a
local retained source artifact; it does not execute composition scripts, fetch
resources or distribute D3 in generated videos. No demo metrics are imported.

The geographic map and local spotlight adapters retain HyperFrames `world-map`
and `north-korea-locked-down` (the latter by Stronkter) mechanics under the
retained Apache-2.0 notice. Source hashes and modifications are recorded in
production provenance. World geometry derives from the already-vendored
public-domain Natural Earth 5.1.2 dataset. The local D3 7.9.0 bundle is used only
as a pinned offline projection tool and is not copied into the engine. Derived
geometry provenance records its source/output hashes, projection and retained
polygon structure. No upstream example statistics, Google fonts, map tiles,
country claims or sample image are distributed by these additions. Supplied
images retain their own rights and visible attribution requirements.

The promotional typography adapters derive from HyperFrames
`registry/examples/kinetic-type/compositions/main-graphics.html` under the retained
Apache-2.0 notice. Exact source hashes and modifications are recorded in production
provenance. All six scene mechanics are adapted to closed native choices. Original
fonts, remote A-roll footage/audio, promotional copy and GSAP are not distributed.
Approved brand assets remain separately governed.

The product-canvas and logo-collision adaptations derive from HyperFrames
`registry/examples/product-promo` under the retained Apache-2.0 notice. The source
canvas, intro, outro and host hashes and changes are retained in production
provenance. The existing logo-assemble adapter shares the source outro choreography
without adding another equivalent native choice. Supplied copy, native geometry,
measured cursor targets and the approved logo replace example content. The three
standalone demo SVGs are retained only as source references; their original colors,
text/font declarations and marks are not distributed by these adaptations.

The walking-character adaptation and generated native geometry/keyframes derive
from `registry/blocks/lottie-character-walk`, explicitly licensed Apache-2.0.
The retained HyperFrames notice applies. Production provenance records both
source hashes and the derived data hash. `tools/vendor_character.py` accepts
only that exact local animation and prints the reproducible native data. Source
colors become approved brand roles. The original character silhouette is retained
as an optional illustration, not adopted as the channel logo. No Lottie/GSAP
runtime, external font or example copy is distributed by this addition.

The illustrated app-install adapter derives from HyperFrames
`registry/blocks/vpn-youtube-spot/vpn-youtube-spot.html`, credited to Stronkter in
its registry metadata, under the repository's retained Apache-2.0 notice. Source
hash and modifications are recorded in production provenance. Original example
app names, ratings, system fonts, GSAP and the source audio track are not shipped.
Pinned existing icon assets retain their separate notices.

The native creator-intro sequence derives from HyperFrames
`registry/blocks/blue-sweater-intro-video/blue-sweater-intro-video.html`, credited
to Joe Sai in registry metadata, under the retained Apache-2.0 notice. The source
hash and substantive changes are recorded in production provenance. Source creator
identity/avatar, provider/social marks, system fonts and soundtrack are not imported.
The approved logo and operator-supplied local image occupy their respective slots.

The cursor-ray composition and shader derive from HyperFrames
`registry/blocks/vfx-text-cursor/vfx-text-cursor.html` under the retained
Apache-2.0 notice. The original 112-sample ray algorithm is retained with four
explicit brand-color substitutions documented in production provenance. Approved
logo PNG textures replace the upstream inline logo paths. The external Big
Shoulders Display import, upstream mark, demo copy and GSAP are not distributed
by this adaptation. Approved private fonts/logos retain their own provenance.

## Halftone field

The native `backdrop/halftone-field` adapter retains the HyperFrames composition's
vertex and fragment shaders verbatim (Apache-2.0). Its embedded simplex-noise
implementation is attributed to Ashima Arts and Stefan Gustavson under MIT.
The complete [MIT notice](templates/v1/assets/production-halftone-notices.txt) is
shipped with the runtime assets. Notice provenance is the
[primary webgl-noise license](https://raw.githubusercontent.com/ashima/webgl-noise/master/LICENSE).
Native changes fix the source defaults, map palette uniforms to approved brand
colors and replace GSAP/CDN timing with the existing caption-frame clock.

## UI depth reveal

The native UI reveal derives from HyperFrames
`registry/blocks/ui-3d-reveal/ui-3d-reveal.html` under the retained Apache-2.0
license and notice. Source hashes, choreography and adaptation details are
recorded in production provenance. Figma/HeyGen names, logos, embedded imagery,
mock claims, Google Fonts and CDN scripts are not imported. Approved private
logo imagery and the episode's verified screenshot retain their own provenance.

## Liquid panel transition

The native liquid-panels composition derives from HyperFrames
registry/blocks/vfx-liquid-background/vfx-liquid-background.html under the
retained Apache-2.0 license. The vertex shader is retained verbatim. The fragment
shader changes only its highlight color to an approved palette uniform.
Source hashes and adaptations are recorded in production provenance.
The existing pinned Three.js r185 bundle and MIT notice supply rendering.
Source Three.js r147/GSAP CDN scripts, Google Fonts, dashboard/feed identities,
claims and mock images are not imported. Two verified private stills supply
the textures and retain their own provenance.

## Grade comparison

The native grade comparison derives from HyperFrames
`registry/components/grade-split-reveal/grade-split-reveal.html`,
`packages/core/src/runtime/colorGrading.ts` and `packages/core/src/colorGrading.ts`
under the retained Apache-2.0 license. Exact source and selected shader hashes
are recorded in production provenance. Retained operations include primary
adjustments, deterministic grain, vignette and the finite split/hold/commit
sequence. The native adapter limits inputs to three source looks and verified
local stills. Upstream demo images, labels implying an untouched original,
CDN scripts, general DOM grading, LUT loading and arbitrary grading controls
are not imported. Private images and approved fonts retain their provenance.

## Portal panel transition

The native portal panel transition derives from HyperFrames
`registry/blocks/vfx-portal/vfx-portal.html` under the retained Apache-2.0 notice.
The source organic-edge noise, radial distortion, chromatic split, energy glow
and finite choreography are retained. Changes provide native aspect, approved
palette/sparks, defined GLSL smoothsteps and exact back-plane fit. Source hashes
and modifications are recorded in production provenance. The existing pinned
Three.js r185 bundle retains its MIT notice. The source experimental CanvasDrawElement
capture, GSAP/Three.js CDN scripts, Google Fonts, demo website and claims are not
imported. Verified private stills retain their own provenance.

## Shatter panel transition

The native shatter transition derives from HyperFrames
`registry/blocks/vfx-shatter/vfx-shatter.html` under the retained Apache-2.0
notice. It retains the seeded cell approximation, Voronoi crack shader and
fixed-step fragment physics. Native changes provide verified image textures,
approved crack colors, defined GLSL smoothsteps, caption-driven timing and
finite rest. Source hashes and changes are recorded in production provenance.
The existing pinned Three.js r185 bundle retains its MIT notice. Source
experimental DOM capture, CDN scripts, fonts, branding, mock claims and
confetti artwork are not imported. Private stills retain their own provenance.

## Glass parallax and Three.js postprocessing

The native glass parallax composition derives from HyperFrames
`registry/blocks/vfx-liquid-glass/vfx-liquid-glass.html` under the retained
Apache-2.0 notice. It retains clipped Voronoi cells, seeded beveled glass,
physical material settings, pointer choreography, parallax and grain mechanics.
Native changes replace demo HTML capture, claims, branding and fonts with a
verified local image and approved colors, adapt horizontal geometry to native
aspect, and end motion at the cue-controlled final frame.

Four official Three.js r185 modules provide FullScreenQuad, CopyShader,
LuminosityHighPassShader and UnrealBloomPass. They use the existing r185 core.
Their [MIT notice](templates/v1/assets/production-three-notices.txt), exact
source URLs/hashes and reproducible bundle hash accompany the code in
`production-three-postprocess-provenance.json`. Only module scopes are converted;
module bodies/shaders are retained. Source r147 CDN dependencies are replaced by
this pinned local r185 implementation, including its updated bloom kernels.
No runtime network calls, realtime composer timer or installed package is added.

### HyperFrames extruded-logo

`production-extruded-logo.js` adapts the Apache-2.0 composition at
`registry/blocks/extruded-logo/extruded-logo.html`: beveled per-letter geometry,
flip stagger, word swing, studio softboxes, reflected bars and contact shadow.
Its default Geist typeface data is not imported. Private approved display-font
curves replace it; the original gold finish maps to the approved accent.
Local Three.js retains its existing MIT notice. CoreText is an existing macOS
platform framework, not a redistributed dependency. See the exact source hash
and changes in [production provenance](docs/hyperframes-production-provenance.json).

### HyperFrames wireframe portal

`production-wireframe-motion.js`, `production-wireframe-shaders.js` and
`production-wireframe-portal.js` adapt the
Apache-2.0 source at `registry/blocks/wireframe-portal-title/wireframe-portal-title.html`.
The source camera, seeded glyph handoff, whole-word layout, warp field and six
shader bodies are retained. Two undefined descending GLSL `smoothstep` calls
are expressed as defined inverse ramps. The source's demo text, fonts, CDN
imports and GSAP runtime are not imported. Existing CoreGraphics performs nonzero
union on the approved private font; Clipper is not redistributed. Native segment
meshes retain screen-space outline widths, round caps and near-plane clipping.
Explicit targets retain the source postprocessing order. Source and payload hashes
are in `templates/v1/assets/production-wireframe-provenance.json`. The composition
is selectable through the normal native spatial renderer; cumulative export
qualification remains pending.

### HyperFrames cuboid carousel

`production-cuboid-data.js`, `production-cuboid-motion.js` and
`production-cuboid.js` adapt the Apache-2.0 composition and supplied Blender
channels at `registry/blocks/cuboid-carousel/`. The saved channels, camera,
rounded extrusion and hero handoff are retained. Native changes use approved
fonts/colors, bounded card records, a fixed lens fit and caption-driven timing.
The source GSAP package, demo copy and fonts are not imported. Three.js
`mergeVertices` and `RoomEnvironment` retain the existing MIT notice in
`templates/v1/assets/production-three-notices.txt`. Exact original and adapted
hashes are recorded in `templates/v1/assets/production-cuboid-provenance.json`.

### HyperFrames paired device review

`production-device-motion.js` and `production-device-review.js` adapt the retained
`vfx-iphone-device` camera, six-act motion, screen UV repair, environment lighting
and six glass-lens shapes under the repository's Apache-2.0 notice. The existing
Three.js r185 runtime retains its MIT notice. GSAP, GLTFLoader and Draco are not
redistributed by this addition. Pure absolute-time sampling fixes the original
overlapping laptop-rotation tween's direction-dependent reverse result.

`production-device-iphone-data.js` and `production-device-macbook-data.js` embed the
original two models and their embedded hardware textures. Repository Apache-2.0
terms are present; item-specific authorship and license statements are absent
from their GLB metadata. Model/trademark clearance remains a publisher review,
as described in `docs/LICENSING.md`. Source screen UI, sample claims and app icons
are excluded. Exact hashes and limits are recorded in
`templates/v1/assets/production-device-provenance.json`.

### HyperFrames device glass compositions

`production-device-glass-motion.js` and `production-device-glass.js` adapt the
Apache-2.0 `ios26-liquid-glass` and `macos-tahoe-liquid-glass` HTML sources.
The source timeline, glass-panel geometry, notification easing, desktop layout,
procedural backdrop, studio lighting and pinned device geometry are retained.
Native changes use explicit caller copy, approved fonts/colors, pinned native
icons, supplied local screen images, valid explicit calendar dates and responsive
camera framing. The full-frame backdrop corrects exposed world-plane edges;
defined inverse GLSL ramps replace undefined descending smoothstep calls.
Source app icons, wallpapers, example identities, GSAP and remote loaders are
excluded. The existing Three.js MIT notice and model-rights limitations above
still apply. Exact hashes and qualification scope are recorded in
`templates/v1/assets/production-device-glass-provenance.json`.

## Retained lettering painters

HyperFrames pen-speed and stitch painters retain Apache-2.0 attribution in
`templates/v1/assets/production-lettering-source.js`. Baked Caveat outlines and
centerlines retain their OFL-1.1 notice in `production-lettering-notices.txt`.
`production-lettering-provenance.json` records exact upstream hashes and bounded
adaptations, including the isolated difference blend. No upstream demo copy or
identity is imported.
