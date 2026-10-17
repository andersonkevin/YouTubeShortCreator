# CLI Reference

[Docs index](README.md) · [Troubleshooting](TROUBLESHOOTING.md)

## Invocation

```bash
python3 ysc.py --help
python3 ysc.py --workspace workspaces/my-channel COMMAND --help
```

`--workspace` is global: put it **before** the subcommand. A relative custom
workspace is resolved from the current working directory; the default `workspace/`
is beside `ysc.py`. Do not assume a custom folder elsewhere inside the repository
is ignored: use `workspaces/` or a location outside the source tree.

Running without a command starts onboarding only when the selected workspace does
not exist. For an existing workspace it prints the available commands.

## Commands and Write Boundaries

| Command | Required inputs | Behavior | Approval |
| --- | --- | --- | --- |
| `init` | Interactive branding answers | Creates a new private workspace and preview | Interactive `CREATE`; optional `--approve-write` bypasses only that prompt |
| `brand-approve` | Existing brand and unchanged generated CSS | Writes a new brand approval | `--approve-write` |
| `configure` | Existing runtime executables/modules | Writes a new private `runtime.json` | `--approve-write` |
| `doctor` | Approved brand and configured runtime | Verifies implementation, brand and version drift | Read-only |
| `layouts` | None | Lists the 18 layout identifiers | Read-only |
| `compositions` | None | Lists composition IDs, visual variants, profiles and transitions; additions under batch qualification are identified in the integration record | Read-only |
| `fonts` | None | Lists 64 static and 16 variable OFL/Apache font files, with measured axes, for new-brand onboarding | Read-only |
| `palettes` | None | Lists the 15 palette presets with their contrast ratios | Read-only |
| `batch NAME` | Episodes created with `new --batch NAME` | Prints the layouts, families, reveals and visual kinds the batch has used, the repeats, and the next pick | Read-only |
| `import SOURCE --name NAME` | External file and intake filename | Copies bytes into a new intake file | `--approve-write` |
| `transcribe AUDIO OUTPUT` | Workspace audio; new intake JSON | Runs local speech transcription and records source hash | `--approve-write` |
| `caption-draft TRANSCRIPT OUTPUT` | Timed transcript; new intake JSON | Groups transcript segments into reviewable cues | `--approve-write` |
| `new ID` | `--audio`, `--transcript`, `--captions`, `--graphic`; optional `--batch NAME` or `--layouts a,b,c` | Copies inputs and creates an editable episode draft whose layouts avoid what the batch already used | `--approve-write` |
| `validate EPISODE` | Approved brand and episode JSON | Validates input hashes, scene/caption contracts and copy | Read-only |
| `build EPISODE --run-id ID` | Valid episode and runtime | Writes HTML, cover, handoff data, screenshots and visual QA | `--approve-write` |
| `render EPISODE --run-id ID` | Valid non-placeholder metadata and runtime | Builds, encodes, muxes and checks the MP4 | `--approve-write` |

`new` picks one layout per scene from the 18 production layouts, grouped into
eight visual families (code, evidence, automation, gate, quote, steps, stat and
compare). Without `--batch`, every draft starts from the same classic opening.
With `--batch NAME`, the picker reads the current `episode.json` of every episode
that carries a `batch.json` naming that batch, so edits count, and chooses layouts
the batch has not used, then the family used longest ago, never two layouts of one
family in an episode, with a gate layout last. The choice is deterministic; a
twelve-episode batch of three scenes uses every layout and repeats none more than
three times. `--layouts` takes an explicit comma-separated list, one per scene,
validated against the template. `batch NAME` reports the same history read-only.

`configure` supports `--backend native` (the default) or `--backend ffmpeg`,
`--node`, `--playwright`, `--chrome`, `--swift`, `--ffmpeg`, `--ffprobe`; see
[runtime setup](INSTALLATION.md#4-configure-existing-runtimes). There are no in-place
reset, delete, upload, provider-authentication or background execution commands.

Backend selection is runtime configuration, never an episode field. Native
configuration probes local H.264 settings and the export preset before writing.
Unknown backends fail without fallback. FFmpeg is implemented under B05
qualification and requires its own new runtime profile, not an edited native one.
`doctor` repeats the capability check in invocation-owned temporary storage;
it does not modify workspace records. See [backend boundary](MEDIA-BACKENDS.md).

The private media-only matrix is a maintenance command, not a production episode:
`python3 -B tools/media_matrix.py --workspace workspaces/media-review --ffmpeg /path/to/ffmpeg --ffprobe /path/to/ffprobe --swift /path/to/swift --approve-write`.
It generates synthetic signals and comparison exports without invented transcripts.
Add `--real-source /path/to/authorized.mp3` to test the complete recording unchanged.
`--real-only` skips synthetic cases and cannot qualify their matrix. The optional
`--excerpt-seconds` creates an excerpt only when explicitly authorized; omission
means the full recording, never an automatic cut. Ask permission before using
private narration. The Shorts duration limit is 180 seconds.

`tools/widget_smoke.py` also accepts `--duration SECONDS` (12-180, whole 30 fps
frames) for synthetic visual/caption timing qualification. Default duration is
12 seconds. This creates test signals, not speech or a real transcript.

## Landscape Episodes

The development engine accepts explicit version-3 composition episodes at 30 fps,
up to 600 seconds and 1-120 cue-driven scenes. Use the approved brand in
a newly qualified development workspace with **FFmpeg explicitly selected**.
Profiles: `landscape` (1920x1080), `portrait` (1080x1920), `square`
(1080x1080), `portrait-4x5` (1080x1350). Substitute the same profile in the
commands below. Cover artwork must match that aspect ratio. Each profile has
fixed composition geometry; compact formats reflow content instead of cropping
landscape. Kinetic phrases can wrap into centered rows. Browser fitting still
rejects overflow: shorten copy or split a scene rather than shrinking brand type.
Native rendering is not enabled for these profiles. Legacy `new --format shorts`
and its 180-second limit are unchanged.

```sh
python3 ysc.py compositions
python3 ysc.py --workspace workspaces/my-channel import /path/to/voice.wav --name voice.wav --format landscape --approve-write
python3 ysc.py --workspace workspaces/my-channel caption-draft intake/transcript.json intake/captions.json --format landscape --approve-write
python3 ysc.py --workspace workspaces/my-channel new wide-episode --format landscape --storyboard intake/storyboard.json --audio intake/voice.wav --transcript intake/transcript.json --captions intake/captions.json --graphic intake/cover-art.png --approve-write
python3 ysc.py --workspace workspaces/my-channel render episodes/wide-episode/episode.json --run-id review-01 --approve-write
```

`compositions` also lists title reveals, screen swaps, metric styles and bounded code/carousel/diagram/media-grid inputs.
It identifies spatial media treatments and their two-cue/count rules. Screen
swaps include `scribble`, `paper-collage` and `paper-rip`; all retain verified local
image inputs. The cumulative source additions still require combined qualification.
For `media-grid`, choose `layout` (`solo`, `2up`, `3up`, `4up`, `3x2`, `hero`),
supply `heading`, visible `source` and the matching number of `items` with local
`image` IDs and `label` text. One cue reveals each item. Optional `treatment` is
`box` (default), `gloss`/`spotlight` for a solo card, or `book-open` for two cards.
The default treatments show complete contain-fit images in fixed layouts.
Optional `camera: {"style": "push-in", "intensity": "standard"}` adds a deliberate
image crop on the second caption cue. Other styles are `pull-back`, `punch-in`,
`punch-reset`, `tilt`, `focus-rack`, `parallax-zoom`, and `parallax-unzoom`.
The camera catalog also lists nine finite handheld/rig profiles, two pendulum
directions and four `extended-*` arrivals. These use solo box imagery and two
cues, with an identity image transform at the end of the second cue. They accept
only the closed style name; `compositions` lists each name.
Use two cues (establish, move), or three for `punch-reset` (establish, move,
return). These options require `box` treatment and `solo` layout, except
`focus-rack` uses `2up` and both parallax directions use `3up`. Push-in intensity
is `subtle`, `standard`, or `bold`; tilt optionally accepts `glow` as `tight`,
`standard`, or `wide`. Brand, captions, source labels and exact supplied copy
remain fixed. These are ordinary engine inputs; no separate composition page
is needed.
For a solo still, `surface: {"style": "blur-fill"}` selects one of fourteen
image treatments listed by `compositions`. Surface effects use one cue and
cannot be combined with a camera or a non-default treatment. For example,
`{"style":"phone","cutout":"island"}` stages a verified image in a phone;
`{"style":"feather-focus","target":{"x":0.2,"y":0.15,"width":0.5,"height":0.6}}`
highlights an explicit region of that image. Labels, captions and brand remain
outside the effect. These are development options with separate qualification evidence.
For `title` content, `reveal` selects `rise`, `per-word-rise`, `blur-in`,
`typewriter`, `scramble`, `bottom-up`, `top-down`, `clip-wipe`, `line-slide`,
`char-slam`, `headline-slam`, `text-shimmer`, `tracking-in`, `streaming`, `matrix`, or `focus-resolve`.
The first caption cue anchors the fixed entry; exact text and approved type remain.
Paired `text-match` scenes require the default `rise`.
For `screen` content, `swap` selects `wipe`, `iris`, `curtain`, `grid`, `halftone`,
`fade-through`, or `whip-pan`. Supply 1-3 verified local image IDs with one cue per
image; the first image establishes the frame and later cues trigger the selected
swap. Browser, window and phone frames retain their existing geometry.
For a metric `record`, add `metric_style` (`count`, `wheel`, `slot`, `pop`,
`usage-arc`, `progress-bar`, `star-rating`). Arcs/bars require an explicit positive `maximum`
in the same unit; star ratings require an integer scale of 1-10 and the `stars` unit.
`trust`, `testimonial` and `proof` use structured chart-style sources and explicit
names, claims and ratings. These remain normal storyboard fields, with source, bounds and
browser validation before rendering.

`--storyboard` is workspace-relative; its still-image paths are relative to the
storyboard. Exact keys: `version: 1`, `scenes`, `assets`, `thumbnail`, `youtube`.
See [closed scene fields](DATA-CONTRACTS.md#landscape-version-3). Authoring copies
verified inputs into a new episode directory. `--batch` and `--layouts` remain
Shorts options. Never estimate caption timestamps from word counts.

`import --format` with any composition profile enables a 250 MB audio-size budget; duration is checked
separately. Parsed JSON stays capped at 2 MB. Render checks free scratch space
against observed PNG sizes plus a 2 GB encoding reserve before frame writes and
every 150 frames. Failures preserve run diagnostics and clean only invocation-owned
scratch. New output profiles never rewrite old brand approvals or runtime records.

## Optional Tools

`tools/voice.py` runs outside `ysc.py` in a separate operator-prepared Python
environment; see [local voice synthesis](VOICE.md). Its writers follow the same
boundaries: `synthesize SCRIPT OUTPUT` needs `--approve-write` and a new `.wav`
under the workspace `intake/`; `audition SCRIPT --run-id ID` needs
`--approve-write` and a new `voice/auditions/ID/`; `doctor` and `voices` are
read-only. Model files come from `<workspace>/voice/models/` or an explicit
`--models` directory and are verified against `tools/voice-models.json`.

## Path Rules

| Argument | Base and restriction |
| --- | --- |
| `--workspace` | Operator-selected directory; new for `init`, existing for production |
| `import SOURCE` | Explicit external path; relative to current directory or absolute |
| `import --name` | Lowercase simple filename; goes under the selected `intake/` |
| Runtime/font/logo paths | Operator-selected local files; quote paths containing spaces |
| `transcribe AUDIO` | Workspace-relative file |
| `transcribe OUTPUT`, `caption-draft OUTPUT` | New `.json` under workspace `intake/`; parent must exist |
| `caption-draft TRANSCRIPT`, `new` input options | Workspace-relative files |
| `validate/build/render EPISODE` | Workspace-relative JSON |
| Episode `inputs.*.path` | Relative to the episode JSON's directory, not the workspace root |

Contained workflow paths reject traversal and symlinks within their boundary.
External imports and executable configuration are separate operator-controlled
trust boundaries; they are not a sandbox for hostile source files or executables.
Episode/run IDs use lowercase ASCII letters, digits and single hyphens, up to 64 characters.

## Existing Outputs and Exit Status

Writers do not offer a force-overwrite flag. Use a new name/run ID/version. A failed
build may leave a partial run plus `failure.json`; do not mistake its files for a
successful export. Confirm the final `run.json` and applicable QA results.

The primary CLI returns 0 on success, 1 for handled operational/validation errors,
2 for argument-parser errors and 130 for interruption/cancelled input. Unexpected
bugs or native subprocess failures can include diagnostic output; preserve a
sanitized error report rather than silently bypassing the failing check.

## Maintenance Tools

The separate `python3 -B tools/visuals.py` entry point provides `catalog`,
`describe`, `validate`, `build` and `export-svg`. Put its `--workspace` option
before the command. It does not require branding to inspect illustrative asset
studies, and it cannot render or publish a Short. See the complete
[visual-library commands and QA](VISUAL-LIBRARY.md).

| Invocation | Purpose | Writes |
| --- | --- | --- |
| `python3 -B tools/check_docs.py` | Local links, embedded images, JSON examples, CLI coverage and image manifest checks | None |
| `python3 -B tools/release.py audit` | Audit the allowlisted public source tree | None |
| `python3 tools/release.py zip OUTPUT.zip --approve-write` | Create a new public source ZIP | New archive only |
| `python3 tools/freeze.py` | Print an implementation lock candidate | None |
| `python3 tools/smoke.py --workspace workspaces/smoke-01 --approve-write` | Create a synthetic fixture and run browser build checks | New private fixture and outputs |
| `python3 -B tools/regression.py prepare --workspace workspaces/reference-01 --approve-write` | Create nine synthetic legacy reference cases | New private fixture workspace; test-only brand approval |
| `python3 -B tools/regression.py capture --workspace workspaces/reference-01 --approve-write` | Capture all eighteen layouts with three/four scenes and verify negative cases | New reference builds and report; no MP4 |
| `python3 -B tools/compare_references.py workspaces/reference-01 workspaces/reference-02` | Compare all 24 reference screenshots on the same runtime | None |
| `python3 -B tools/widget_smoke.py --workspace workspaces/widget-01 --scenes 4 --palette violet --approve-write` | Build a new mixed v2 widget fixture; `--render` also creates an MP4 | Private synthetic assets, test-only brand approval and QA |
| `python3 -B tools/chart_matrix.py --workspace workspaces/density-01 --palette violet --scenes 4 --approve-write` | Check chart examples, maximum-density inputs and expected geometry failures | New private fixtures, builds and matrix evidence; no MP4 |
| `node --test tests/chart-qa.test.mjs tests/visual-options.test.mjs` | Test label collision/bounds and numeric display without mutating raw values | None |
| Same smoke command with `--render` | Also encode/mux the synthetic test | New private media |

`tools/smoke.py` accepts runtime overrides through `YSC_*` environment variables,
not the `configure` flags. Its workspace must not exist. No tool commits or pushes Git.

The regression tool uses the same `YSC_*` overrides. Its workspace parent must
exist and be a private location. Preparation uses the existing synthetic test
brand/approval, never an operator's channel approval. Captures reject fixture or
implementation drift, preserve failed runs and never overwrite reference reports.
After a failed attempt, diagnose it and prepare a new workspace for the retry.
Reference comparison verifies recorded artifact hashes before comparing pixels.
`--allow-removed-bracket` permits only the specifically approved old decoration
region; otherwise any pixel difference fails. This flag is not general tolerance
for changed layouts, typography or browser versions.

The v3 composition catalog also lists sixteen `shader-*` screen swaps. Use the
normal `new --format`, `build` and `render` commands; there is no separate shader
renderer command. See [shader input contracts](DATA-CONTRACTS.md) and
[local rendering requirements](MEDIA-BACKENDS.md).

The `headline` family accepts a `kicker`, 2-6 `phrases`, and a `swap` of
`line`, `state`, or `caret`, with one cue per phrase. A `title` can use an explicit
`marker` with `text` and `style` (`highlight`, `circle`, `underline`, `scribble`)
and two cues: title entrance, then marker. Run `python3 ysc.py compositions` for
these enums; see [input boundaries](DATA-CONTRACTS.md#headline-swaps-and-title-markers-development-v3).

## Optional local font catalog

`python3 ysc.py fonts` lists the pinned static faces. During `init`, each font
prompt accepts an existing licensed `.ttf`, `.otf` or `.woff2` path, or an exact
ID such as `font:geist-bold`, `font:inter-regular` or
`font:jetbrains-mono-regular`. Installed-font defaults are unchanged.
Catalog choices copy their exact font bytes, source hashes and original notices
into the new private brand. Brand preview and `brand-approve` remain separate.
Existing workspaces are never migrated or overwritten. Generated runs carry
the selected font notices and provenance alongside their copied font assets.
Variable fonts and arbitrary catalog IDs are not enabled by this catalog.

The current integration batch also exposes `data-story`, `network`, and
`annotation` through `python3 ysc.py compositions`. They use the ordinary v3
episode/build/render commands and the existing four output formats. Their exact
keys, cue counts and numeric/path boundaries are in
[batch input contracts](DATA-CONTRACTS.md#batch-additions-awaiting-combined-qualification).
These additions await the combined browser/export qualification; source drift
continues to block production writes under the previous accepted lock.

`compositions` lists ten annotation styles, four handwritten stroke textures,
three arrow curves and cursor/pen pointers. These are optional fields on the
existing annotation mark, not a new scene type or command. Example mark:
`{"x":0.2,"y":0.2,"width":0.5,"height":0.4,"label":"Inspect this region","style":"hand-arrow","stroke":"sharp","curve":"swoop","pointer":"pen"}`.
The image identifier, hashes, cue count and normal build/render gates still apply.

`compositions` lists the available title reveals and six headline swaps. The batch adds
`word-crossfade`, `shared-axis-y`, `shared-axis-z`, `soft-blur`, `scan-band`,
`accent-glitch`, `shimmer-sweep`, `mask-reveal`, `calm`, and headline swaps
`morph`, `strike`, `flap`. They retain the same ordinary v3 authoring commands,
caption-cue anchors and approved font inputs. Their qualification is pending.

`compositions` also exposes `title_layouts` (`standard`, `speech-cloud`,
`path-wave`, `emphasis`, `layered-emphasis`), `rough-underline`, optional marker notes and
`word-highlight`. Use these fields in ordinary v3 title content; no separate
renderer command is needed. Speech clouds accept a declared tail side, emphasis
requires one supplied backdrop word, and path titles have a measured fit gate.
Exact limits and incompatible combinations are in [title contracts](DATA-CONTRACTS.md).

The nine advanced title reveals are `glitch-read`, `decode-read`, `neon-accent`,
`particle-burst`, `tile-resolve`, `ascii-trail`, `cadenced-type`,
`particle-assemble` and `texture-read`. Supply an explicit `accent_word` for
`neon-accent` and `particle-burst`; `texture-read`
requires one verified still ID in `texture`. All use the ordinary title scene
and one caption cue. `advanced_title_inputs` exposes these requirements in the
catalog. No new command, font selection or caption replacement is involved.

`compositions` also lists 26 `media-carousel` presets. They are normal v3 scenes,
separate from the existing two-to-five-screen `carousel`. Supply verified local
image IDs and two caption cues at least six seconds apart. The presets distribute
the references across 12 or 24 animated slots, then settle over 24 frames.
`text-circle` variants also accept a short `center_text` in the approved font.
They use the same build/render command and four output profiles; combined visual
qualification is pending. No upstream HTML or GSAP runtime is loaded.

`compositions` lists 33 additional `catalog-*` screen swaps, for 54 total swap
choices. For example, a normal screen scene can set `"swap": "catalog-card-flip"`,
`"catalog-horizontal-blinds"`, or `"catalog-light-leak"`. Image IDs, cue anchors,
chrome and content fields retain their existing contract. There are no new
commands, duration controls, color overrides or external assets. All new catalog
swaps await the combined visual qualification.

`compositions` also lists `code-story` with nine styles: `typing`, `diff`, `morph`,
`scroll`, `workbench`, `terminal`, `particles`, `dissolve`, and `extrude`.
These use normal v3 authoring/build/render,
with literal `documents` and caption cues. For example, `"style": "diff"` with
`"documents": [["value = 1"], ["value = 2"]]` needs two cue indices. The four
output profiles share the same document contract. This is a text visualization,
not a code runner. Combined browser/export qualification is pending.

The three spatial code styles use 2-4 explicit documents, one cue per document,
and the existing local Three.js bundle. Chrome uses its hardware rendering path
only when a GPU composition is selected. The final frame resolves to the approved
native text; there is no external syntax service, shader input or model loader.

Optical backdrop choices are `three-cosmic-orb`, `three-rack-focus`, `scope-sine`,
`scope-square`, and `scope-triangle`. They use the existing backdrop fields and
two cues separated by at least two seconds. Scope traces are synthetic artwork,
not measurements. All five await combined native/export qualification.

The data-resource batch adds `map-story`, `combo-chart`, `specs`, and metric style
`conic-ring` to `compositions`. Map choices are a local US hex grid, bubbles, or
flow routes over a verified supplied image. They do not fetch geographic data.
Combo charts require separate units/maxima for bars and line. These records use
the normal v3 commands and retain structured attribution, source hashes and
caption anchors. All additions await the combined browser/export qualification.

Regional choropleths use `kind: "map-story"` and `style: "spain"` or `"us"`.
The same quantitative fields supply `heading`, `insight`, structured `source`,
`unit`, positive `maximum`, unique `values: [{region, value}]`, and `focus`.
`compositions` exposes the exact 19 Spanish region codes and 50 US state codes.
Missing regions stay blank; explicit zero is colored. US geography excludes DC
and territories, matching the original composition; the existing `us-hex` still
includes DC. Spain retains the Canary/Balearic islands, Ceuta and Melilla.

One caption cue starts the map, followed by one cue per focused region. Allow
195 frames before the first focus, 36 between focus cues, and 30 after the last
focus before the scene-exit margin. The map reveals regions in supplied-value
order, then labels, legend and metric source. Fixed geographic credits remain
visible with the map. All four formats reflow the same record; landscape places
the map beside the title and callout. No remote data or D3 runtime is loaded.
See [regional geometry provenance](hyperframes-regional-geometry-provenance.json)
for atlas versions and geometry dates. The original Spanish edition date is
unspecified in the pinned atlas and is labeled as such, independently of the
metric source date. Combined workflow/export qualification remains pending.

`interaction` adds six caption-driven screen actions to the same `compositions`,
`new`, `build`, and `render` commands: `click`, `drag`, `marquee`, `menu`, `tap`,
and `swipe`. Supply a verified original image, normalized target, and a different
verified result image except for marquee selection. Four cues establish,
approach, act, and exit; menu selection requires five. Action-specific fields
are documented in [data contracts](DATA-CONTRACTS.md). These are visual actions
over local stills, with no application control or executable menu commands.

Screen actions optionally select `pointer`: `arrow` (default), `dart`, `echo`,
`glyph-trail`, `magnetic`, or `agent`. Magnetic is click-only; agent requires an
explicit `actor` label. Touch actions reject pointer styling. `camera: "follow"`
adds a fixed, clamped 1.8x camera move to click/drag with the standard arrow.
Chat interfaces optionally use `typing_indicator: true` before received messages.
These are normal v3 content fields, listed by `compositions`; other records keep
their existing presentation. See the closed limits in [data contracts](DATA-CONTRACTS.md).

Interface presentations use the optional `variant` field: chat supports
`bottom-stack`, `side-stack`, and `token-stream`; notifications support `spring`,
`pileup`, `cascade`, and `slide`; steps support `tabs`, `sheet`, `skeleton`, and
`menu`. For example, a normal steps record can select `"variant": "tabs"` to
move an indicator between its supplied labels on each caption cue. Navigation
labels are limited to 14 characters. New `notes` and `feedback` styles use the
same 2-4 item contract; feedback requires an explicit `state` of `valid` or
`error` on every item. These presentations do not operate a live application.

Steps also accept `swipe-rail`, `velocity-throw-snap`, `spring-stack-shuffle`,
`scroll-feed`, `state-chip-rail`, `card-resize`, `modal-morph`,
`modal-morph-snappy`, `pull-to-refresh`, `pull-to-refresh-arrow`, and
`pull-to-refresh-dots`. Settings accept `toggle-flip`; every item still requires
its explicit boolean `enabled`. The existing 2-4 items and caption cues drive
the sequence. For example, select `"style":"steps","variant":"swipe-rail"`
to demonstrate a gesture between your supplied steps. No additional runtime or
interaction commands are needed. State-chip labels are limited to 14 characters.

### Editorial options

Use `treatment: "hand-frame"` on a solo media-grid to draw its frame, corner
sparks and supplied caption. Use `style: "hand-drawn"` on an ordinary diagram
for drawn boxes and curved arrows. Existing image, icon and source fields stay
required. Each visual beat remains anchored to its caption cue.

Lower thirds add `variant: "news-plate"` and `variant: "channel-card"`. The
channel card uses two cues and requires `button: {"before": "Open preview",
"after": "Preview ready"}` with your own explicit text. It performs no external
action. Closing scenes add `style: "capsule"`, `"brand-close"`, or `"sting"` to
ordinary `cta` content. These settings select reusable native renderer paths.

For sequential title emphasis, set ordinary v3 title content to, for example,
`"reveal": "gradient-read"`. The same field accepts `marker-sweep`, `neon-read`,
`kinetic-words`, `editorial-words`, and `pill-read`. Author, build and render with
the existing commands; no additional renderer or timing input is required.
These options affect titles, while spoken captions retain their approved layout.
The existing overflow gate still requires title copy to fit its output format.

For source-backed image treatment, use the existing solo `media-grid` content
with, for example, `"surface": {"style": "particle-center"}`. Available raster
styles are `ascii-coarse`, `ascii-medium`, `ascii-fine`, `dither-2`, `dither-4`,
`dither-8`, `particle-left`, `particle-center`, `ink-bleed`, `slit-rows`, and
`slit-columns`. Use ordinary local image records and the normal author/render
commands. The engine prepares its verified pixel bundle automatically; no
browser flags, server or extra dependency is needed. ASCII holds as styled
characters; the other effects settle to the original still.

For an illustrated social card, use ordinary interface content with
`"style":"social","variant":"post"`. Supply `label`, `body`, `context`, and
`action: {"before":"Read","after":"Read"}` on every item. Other presentations
are `discussion`, `comment`, and `follow`; comment footer states must match.
These cards use the same author/build/render commands and caption cues. A
notification record can select `"variant":"peek-stack"` without new item fields.

The screen `swap` field also accepts physical toss/drop/slide, rubber left/up,
condense/reshape, page slide, and four spectral directions. The exact `catalog-`
names and unchanged image contract are listed in [Data contracts](DATA-CONTRACTS.md).
These cumulative source additions await combined browser/export qualification.

For annotated stills, `annotation.marks[].style` also accepts `scan-gate` and
`segmentation-flood`. A solo `media-grid` may instead select `hud.style` as
`telemetry` or `camcorder`, supplying the readouts or camera metadata described
in [data contracts](DATA-CONTRACTS.md). The renderer does not detect objects or
measure the image. `compositions` lists these closed options alongside the new
steps variants `pan-stations` and `panel-reveal`, and backdrop `confetti`.

The source catalog also lists 36 explicit `gpu-*` backdrop styles. They retain
the normal `backdrop` record, with two ordered caption cues at least two seconds
apart. Only episodes selecting one load the pinned offline WebGPU runtime and
use hardware Chrome capture. No shader controls or external assets are exposed.
All native validation gates still apply; combined export qualification is pending.
They use the existing v3 build/render commands and await combined qualification.
### Cumulative UI primitives

`python3 ysc.py compositions` lists native UI primitive inputs, checklist and trust
styles, and generated diagram routes. Select them in the existing version-three
episode records; no separate renderer or command is required. See
[the contracts](DATA-CONTRACTS.md#native-ui-and-diagram-primitives) for explicit
badge/check/stat fields and persistent signup/beat rows. These source additions
still require the combined candidate qualification before a new delivery is accepted.

Kinetic records now expose `kinetic_styles` in the same discovery command. The
three added styles run through the ordinary episode compiler and caption clock;
see [kinetic contracts](DATA-CONTRACTS.md#kinetic-composition-styles). They require
no additional runtime command, dependency installation or separate demo project.

`compositions` also lists `spatial_backdrops`. Select a `three-*` style in the
ordinary `backdrop` record and use the same v3 build/render commands. The compiler
loads the local Three.js bundle only when selected; capture then uses hardware
Chrome. See [spatial inputs](DATA-CONTRACTS.md#spatial-backdrop-presets) for cue
timing and the short glass-heading requirement. These additions await the final
combined qualification; they do not replace the accepted implementation lock.

The same discovery command now lists liquid-glass interface variants and the
kinetic `camera-follow` style. The glass variants require an existing verified
still ID as `image`; all copy remains explicit. Their normal v3 episode records
are described in [liquid-glass inputs](DATA-CONTRACTS.md#liquid-glass-interfaces)
and [camera-follow inputs](DATA-CONTRACTS.md#camera-follow-composition-words).
There is no separate demo renderer, installation step or browser flag to enable.

`compositions` also lists the `anamorphic-flare`, `mesh-card`, `stop-motion-8`,
`stop-motion-10` and `stop-motion-12` backdrops, plus `shader-magnetic-pull` and
`shader-magnetic-repel` screen swaps. Use normal v3 episode records and the
existing render command. See [canvas and magnetic inputs](DATA-CONTRACTS.md#canvas-backdrops-and-magnetic-swaps).
These cumulative additions still await combined browser/export qualification.

The same `compositions` command exposes `vector-editor` and `sticky-mock` step
interfaces, the `split-panel` headline swap, and `facet-morph`/`soft-blob-touch`
canvas backdrops. They use the normal v3 authoring, build and render commands.
See [editor inputs](DATA-CONTRACTS.md#editor-compositions-and-split-headlines) and
[organic fields](DATA-CONTRACTS.md#organic-canvas-fields). Source integration is
complete for these choices; final combined qualification remains pending.

`screen` adds `"swap": "clone-wall"`, requiring two or three verified stills
and an explicit `word` of at most 18 characters without whitespace. The outgoing
image contracts over a tiled word field; the field covers the image handoff.
`headline` adds `"swap": "circle-match"` for exactly two explicit phrases.
Its shared circle continues growing through the cut.

`media-grid` surfaces add `freeze-paper`, `phone-dive`, and `drift-accent` for
solo standard cards. Each uses the existing caption-bound entry and accepts no
extra timing, color, camera or model controls. Phone-dive uses a fixed phone
cutout and intentionally pushes into the verified image. Freeze-paper dresses
a still; it does not freeze a moving clip. Drift-accent completes one cycle
during entry and remains still afterwards. Combined qualification is pending.

`chart` adds `"metric_style": "count-burst"`: keep the standard metric record
and supply two cues, one for the count and one for its finite burst. `data-story`
adds `"style": "value-lanes"` for 2-6 supplied series across 2-6 periods. One cue
selects each period; marker speed represents its value relative to the global
maximum. Both remain under the normal author/build/render and source gates.

`compositions` also lists `spatial-stage` and its closed object inputs. Use
`exploded-stack` with four label/icon layers and four or five cues, or
`product-turntable` with one verified label image and two cues at least six
seconds apart. The normal v3 author/build/render commands handle all four output
profiles. See [spatial object inputs](DATA-CONTRACTS.md#spatial-object-stages).
Use `orbit-card` with one verified image and two cues at least four seconds
apart for the saved camera/card motion. Source integration is complete for these
three choices; combined qualification
and new video delivery are still pending.

`headline` also accepts `swap: "slice-sweep"` for a native tile flip between
explicit headlines. `media-carousel` accepts `preset: "promo-belt"` for the
measured two-row image belt. Use the existing author/build/render commands;
see [input limits](DATA-CONTRACTS.md#tile-headline-and-media-belt). Neither option
loads source example media, changes brand approval or adds a new backend.
## Promotional title and glyph options

`python3 ysc.py compositions` lists five additional title layouts:
`promo-hook`, `promo-grid`, `promo-offset`, `promo-pair`, and `promo-close`.
For example, use this content in a normal one-cue `title` scene:

```json
{"kicker":"Internal example","title":"Clear ideas","subtitle":"Supplied copy only","layout":"promo-grid"}
```

For a three-cue `kinetic` scene, use:

```json
{"kicker":"Internal example","style":"glyph-build","words":["Motion","Transitions","Typography"]}
```

The normal author/build/render commands and all approval gates apply. These new
source choices await combined browser/export qualification with the cumulative batch.

## Product collaboration illustration

Select `interface/steps` with `variant: product-canvas`. The `product_canvas`
entry in `python3 ysc.py compositions` lists required inputs and limits. Use two
caption cues at least12 seconds apart and allow the final24-frame settling period.

Example content for the ordinary scene authoring path:

```json
{"heading":"Design together","source":"Internal illustrative example","style":"steps","variant":"product-canvas","hero":{"title":"A shared workspace","body":"Build a clear experience","action":"Explore"},"actors":["Designer","Engineer","Reviewer"],"comment":{"text":"Use the supplied cards here","resolved":true},"items":[{"label":"Overview","body":"Supplied content"},{"label":"Features","body":"Supplied content"},{"label":"Details","body":"Supplied content"}]}
```

For the source opening, select `cta/style: logo-collide` with the normal
heading/action/label fields and two cues. Its image comes from the approved brand,
never from episode input. Use existing `logo-assemble` for the closing assembly.
All additions remain in development pending combined visual/export qualification.

`cta` style `character-walk` supplies a reusable illustrated introduction or
closing card. Use two cue anchors at least eight seconds and 240 frames apart;
allow 24 settling frames before the normal scene transition. Supply `heading`
(up to 28 characters), `action` (40) and `label` (64). The pinned local character
walks, stops and points at that copy. `python3 ysc.py compositions` lists the
contract. No external animation file is accepted. Browser/export qualification
of this cumulative addition remains pending.

Use `interface`, `style: steps`, `variant: app-install` for the illustrated
phone search/install sequence. Supply exactly eight `items` with `label`, `body`
and an existing local `icon` ID, plus `selected` (0-7). The `ui` object supplies
`title`, `query`, `get`, `open`, `ready`; `detail` supplies `body` and three
`facts` with explicit `label`/`value`. Use two cues separated by seven seconds
and 210 frames, with 24 settling frames before the normal scene transition.
The CLI compositions catalog lists this option. It animates an illustration;
there is no store access, installation, telemetry, SFX import or remote asset.
The cumulative browser/export qualification remains pending.

### Creator introduction composition

The composition catalog includes `cta/creator-intro`. Use the ordinary v3
storyboard and `new` / `build` / `render` path; no extra command or service is added.
Supply `heading` (28 characters), `action` (40), `label` (64), `prompt` and
`profile`. The prompt record requires `placeholder` (64), `text` (180), `model`
(24) and `thinking` (32); these are literal illustration copy. The profile requires
one verified local still ID in `image`, plus `name` (24), `handle` (32), `bio`
(90) and distinct `before` / `after` labels (14 each). No URL or action callback
is accepted. Choose two caption anchors at least twelve seconds and 360 native
frames apart, followed by 24 settling frames before the scene's exit margin.

This optional composition covers a brand reveal, typed prompt, illustrated result
and supplied profile. No model call or social action occurs. Actual text must also
pass native geometry checks; character limits do not promise fit for every glyph.
Combined browser/export qualification is pending for this cumulative addition.

### Cursor-ray logo and headline composition

Use `cta/cursor-rays` through the normal v3 storyboard and `new` / `build` /
`render` commands. Supply `heading` (8 characters), `action` (12), `support`
(16), `finale` (exactly two lines, 20 characters each) and `label` (64). The
heading is typed, action/support complete the first title, and finale supplies
the second title. Choose two caption anchors at least eight seconds and 240
native frames apart, with 24 settling frames before the scene exit margin.

The light sweep uses the existing approved logo, not an episode-provided logo
path. Build rechecks brand/template approval and the copied PNG before embedding
its exact bytes into the existing private texture bundle. The selected effect
requires WebGL and fails if it cannot render; there is no partial black-stage
fallback. Font sizes remain native. Copy must pass measured fit, including the
initial 1.8 word magnification and the clipped headline handoff. Source integration
is complete; combined browser/export qualification remains pending.

### Halftone field backdrop

`python3 ysc.py compositions` lists `halftone-field` under backdrop styles. Select
it through an ordinary v3 storyboard: `kind: "backdrop"`, with `heading`,
`caption` and `style: "halftone-field"` in `content`. Supply two caption cues
at least two seconds and 60 capture frames apart, leaving the existing 24-frame
settling window before the scene transition. All four profiles use the same
local WebGL shader with approved colors. No runtime download or shader input
is accepted. Combined workflow and encoded-video qualification remain pending.

### UI depth reveal

Use `interface`, `style: steps`, `variant: ui-3d-reveal` for a local screenshot
inside a staged layer/property panel. The camera pushes in, tilts in perspective
and exits in depth before assembling the approved logo and supplied closing copy.
The normal `compositions` command lists the reusable `ui_reveal` contract.

Content requires `heading`, `source`, `image`, `layers`, `selected`, `properties`,
`selection`, `tagline` and `action` in addition to style/variant. The image names
a verified episode asset. Layers are 3-9 explicit labels; selected is their
zero-based index. Properties are exactly three `{label,value}` records. Selection
is normalized `{x,y,width,height}` within the complete, contained image.

Use two real caption anchors at least 13 seconds/390 frames apart, followed by
24 settling frames before the scene transition. Narrow formats place properties
below the image and layer list. The action is visual copy, not an executable link.
Source branding, source screenshots and remote scripts are not imported.
Combined workflow/export qualification remains pending.

### Liquid panel transition

Use interface, style steps, variant liquid-panels with heading, source and
images containing two verified episode still IDs. The normal compositions
command exposes the liquid_panels contract. No items array is accepted.

Three caption anchors control the first surface, the start of the texture mix
and the final surface. Leave at least five seconds/150 frames before the second
cue, seven seconds/210 frames before the third, and 24 settling frames afterward.
The retained shader ripples the subdivided surface while the camera tilts; it
then settles on the second still. Source mock dashboards and sample claims are
replaced by the supplied images. Approved heading, source, captions and logo
remain outside the optical treatment. Combined export qualification is pending.

### Grade comparison composition

Use `media-grid` with `layout: "solo"`, `treatment: "grade-split"`, one
verified image/label item, heading (28 characters maximum) and source. Add:

```json
{"grade": {"look": "warm-cinematic", "split": 62, "edge": "hairline", "labels": true}}
```

Looks are `warm-cinematic`, `cool-teal` and `bleach-bypass`. Split is an integer
from 25 through 85 percent; edge is `hairline`, `bold` or `hidden`; labels is an
explicit boolean. Exactly two caption anchors require six seconds / 180 frames
between them and 24 settling frames before the scene exit margin. The native
sweep pauses for comparison, commits to the treatment and rests. "Flat preview"
is the source flat grade, not an unchanged original. The effect supports all
four production formats and cannot combine with camera, surface or HUD options.
The native browser checks passed; combined workflow/export qualification remains
pending. Existing brand approval and implementation-lock checks still apply.

### Portal panel composition

Use `interface`, `style: "steps"` and `variant: "portal-panels"` with a heading
(up to 28 characters), source (64) and exactly two distinct verified local image
IDs. This record has no `items` or arbitrary effect parameters:

```json
{"heading":"Through the portal","source":"Supplied screenshot source","style":"steps","variant":"portal-panels","images":["before","after"]}
```

Exactly two caption anchors need ten seconds / 300 capture frames between them,
then 24 settling frames before the scene exit margin. The source organic opening,
chromatic/distorted edge, energy ring and camera return use the normal engine
clock and all four native layouts. Both stills retain contain-fit; the closing
frame matches the second still on the approved background. Runtime WebGL failure
stops the render. Combined workflow/export qualification is pending.

For portal panels, the second cue reveals the supplied source attribution as
the image settles. The source fixed radius is retained across native aspects.

### Shatter panel composition

Use `interface`, `style: "steps"`, `variant: "shatter-panels"`, heading
(up to 28 characters), source (64), and exactly two distinct verified local
image IDs. There is no `items` array or arbitrary effect configuration.

```json
{"heading":"Break into the next view","source":"Supplied screenshot source","style":"steps","variant":"shatter-panels","images":["before","after"]}
```

Two real caption anchors must be at least twelve seconds / 360 frames apart,
followed by 24 settling frames before the scene exit margin. The first image
cracks, separates into 200 seeded fragments, and reveals the second image.
The second cue reveals the supplied source attribution. Both images contain-fit
the native content surface. The approved heading, logo and captions remain
outside the optical effect. Combined workflow/export qualification is pending.

### Glass parallax composition

Use `interface`, `style: "steps"`, `variant: "glass-parallax"`, heading
(up to 28 characters), source (64), and one verified local image ID.

```json
{"heading":"Depth through glass","source":"Supplied image source","style":"steps","variant":"glass-parallax","image":"screen"}
```

Two real caption anchors need twenty seconds / 600 frames of separation and
24 settling frames before the scene exit margin. Fifty-four beveled glass cells
refract the supplied image while the camera and reveal follow the source path.
The second cue reveals the source attribution. Image padding preserves the
complete source within the moving backdrop. Brand text, logo and captions are
outside the effect. This optical treatment intentionally distorts the image;
use an ordinary screen composition when exact visual reading is the purpose.
Native and combined export qualification are tracked separately in the inventory.

### Extruded display type

`compositions` lists `spatial-stage/extruded-logo` and its three finishes. Use the
ordinary version-3 build/render workflow with two caption anchors at least five
seconds apart. Supply an exact `word` of 1-8 Latin characters, `finish`
(`chrome`, `accent-metal`, `matte`), `heading`, `caption` and `source`.
See the [input contract](DATA-CONTRACTS.md#approved-font-extruded-titles).
The existing qualified Swift runtime extracts private geometry from the approved
display font during asset preparation. Missing glyphs, changed font copies and
existing output bundles fail; no fallback font is selected.

### Wireframe portal title

Select `spatial-stage/wireframe-portal-title` through the ordinary version-3
build/render workflow. Supply `word`, `phrase`, `heading`, `caption` and `source`,
plus two caption anchors at least eight seconds apart. The approved display font
supplies both the initial card and the actual extruded letterforms. Copy, font
hashes and geometry are validated; shorten text if it cannot remain readable.
See the [portal contract](DATA-CONTRACTS.md#approved-font-wireframe-portal).
The existing Swift runtime and macOS 13+ CoreGraphics prepare a private normalized
outline bundle. The renderer uses local Three.js with no additional installation.

Select `spatial-stage/canopy-part-title` through the same version-3 episode flow.
`python3 ysc.py compositions` lists its closed inputs: two distinct headlines of
up to 24 Latin characters, attribution and two distinct verified still IDs in
`surface` and `normal`. Use two cue anchors at least twelve seconds apart and
leave room for the normal settling period. The approved display face and existing
Swift extraction are shared with portal titles. See the
[canopy contract](DATA-CONTRACTS.md#approved-font-canopy-titles).

### Cuboid carousel

Select `spatial-stage/cuboid-carousel` in a version-3 episode. Supply `heading`,
`caption`, `source`, 1-12 `cards`, and a one-based `hero` card index. Each card
has exactly `category`, `title` and `pills`. The travelling chain selects the
requested card, presents its exact copy, then departs on the second caption cue.
See the [cuboid contract](DATA-CONTRACTS.md#approved-font-cuboid-carousel).
The two anchors need at least 150 frames of separation. Leave another 50 frames
after the second visual onset, plus the normal scene exit margin. Brand fonts
must load; unreadable text fails instead of shrinking or truncating silently.

For `spatial-stage/device-review`, supply `heading`, `caption`, `source`, `phone`
and `laptop`. The last two values are distinct local image asset IDs. Use two
caption cues at least fifteen seconds apart and the normal `new`, `build` and
`render` flow. The compiler selects the pinned local models and camera sequence;
no separate HyperFrames project or network loader is needed. See the
[paired-device contract](DATA-CONTRACTS.md#paired-device-review).

For `spatial-stage/phone-glass` or `spatial-stage/desktop-glass`, supply `heading`,
`caption`, `source` and one verified `image` asset ID. Phone scenes require three
notifications; desktop scenes require one notification and explicit menu, window,
calendar, status, media and dock records. Use two caption cues at least fifteen
seconds apart. The existing `build` and `render` commands load only the selected
device model. See the [device glass contract](DATA-CONTRACTS.md#device-glass-compositions).

The `lettering` composition exposes `write-on`, `stitch-fine`, `stitch-coarse`,
and `difference`; see [content, font and timing requirements](LETTERING.md).
