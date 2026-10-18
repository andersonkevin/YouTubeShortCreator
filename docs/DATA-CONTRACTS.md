# Data Contracts

[Docs index](README.md) · [CLI paths](CLI.md#path-rules)

The examples below illustrate field shapes. They are not complete runnable episodes
and do not contain real narration. Generate an episode using `new`; do not paste an
illustrative hash into a production transcript.

## Episode

Version 1 top-level keys must be exactly:

| Field | Meaning and current checks |
| --- | --- |
| `version` | Contract version `1` |
| `id` | Lowercase hyphenated ID, maximum 64 characters |
| `template` | `v1` |
| `language` | Must match the approved brand |
| `duration` | Seconds; greater than 1, at most 180, on a 30 fps boundary; derived from the complete recording |
| `inputs` | Exactly `audio`, `graphic`, `transcript`, `captions` |
| `thumbnail` | Exactly `headline` and `label` |
| `youtube` | Exactly `title`, `description`, `hashtags`, `tags`, `pinned_comment` |
| `scenes` | Three or four scene records |
| `timing_adjustments` | Measured caption-start notes indexed by cue number, or `{}` |

Batch membership is not an episode field. `new --batch NAME` writes a separate
`batch.json` beside the episode with exactly `batch`, `episode`, `sequence` and
`picked_layouts`; it is written once, never updated, and the picker rereads the
current `episode.json` of each member rather than trusting the recorded pick.

Version 2 keeps `template: "v1"` and all existing timing/media rules, and adds an
exact `visuals` object. It enables mixed classic and visual-library scenes. Flow,
metric and comparison passed B02; analytical charts and selectable motion are
implemented under B03 qualification. Use the [visual adapter contract](VISUAL-ADAPTER-CONTRACT.md)
for exact fields, symbol IDs, data limits and rendering boundaries. Version 1
rejects these extra fields; there is no silent episode/profile migration.

Each input has `path` and `sha256`. Paths are relative to the episode JSON directory,
with containment and symlink checks. Files must be nonempty. Audio may be at most
75,000,000 bytes for v1/v2 (enough for 180 seconds of 48 kHz stereo float PCM),
or 250,000,000 bytes for a v3 profile; other inputs remain capped at 30,000,000 bytes. This is a storage bound, not a duration estimate.
JSON parsing applies an additional 2 MB limit. Hashes must match the current bytes.

Example input descriptor, with an intentionally non-production placeholder hash:

```json
{
  "path": "audio.mp3",
  "sha256": "replace-with-the-actual-sha256-of-audio-bytes"
}
```

No arbitrary style/configuration field is allowed. The source of truth for exact
validation is [workflow.py](../workflow.py), not a separately maintained JSON Schema.

## Landscape version 3

This retained heading also covers the portrait, square and 4:5 v3 profiles.

Version 3 retains common episode keys, `template: "v1"`, original voice,
caption/source hashes, metadata and review gates. It adds `format` and `assets` instead of `visuals`. Allowed formats are
`landscape` (1920x1080), `portrait` (1080x1920), `square` (1080x1080), and
`portrait-4x5` (1080x1350), all at 30 fps,
greater than one and at most 600 seconds, with 1-120 scenes. Existing v1/v2 limits
remain unchanged. This implementation requires configured FFmpeg; native is
rejected without automatic fallback.

### Retained source stages

`kind: "source-stage"` accepts `content.style: "glass-shard"` or `"frost-orbit"`.
Both require `heading` (1-18 characters), `caption` (1-24 characters), `source`
(1-90 characters), and exactly two caption cues. Frost also requires `word`
(1-8 supported Latin characters). The first Frost object is this supplied word,
followed by the heading and caption; it does not import the source demo logo.

The cue gap must be at least nine seconds for Glass Shard and 22.5 seconds for
Frost. Native scene entry/exit margins and all ordinary caption rules also apply.
All four v3 output profiles are supported by the compiler. Glass rejects a heading
that exceeds its fixed font slot instead of shrinking it. Frost uses the approved
TTF/OTF display font and requires WebGPU; unsupported runtime/font combinations fail.

The implementation owns renderer settings, assets, camera and texture selection.
Episodes cannot provide HTML, scripts, shader code, external URLs, custom fonts,
models or renderer options. Texture modules are pinned, local and locked. Font
payloads are generated privately from hash-verified approved brand files. Frost's
persistent build cache and ambient dust are disabled. Four-sample spatial
antialiasing replaces history-dependent temporal antialiasing. The final caption
enters on the second cue. The normal `build` and `render` commands await
initialization and the GPU queue before inspecting or capturing a frame.
Source scripts are packaged files. The inherited CSP remains unchanged; source
loaders can decode only the exact compiled in-memory payloads, never a URL supplied
by an episode or an external server. Each child owns its renderer and typed arrays.

### Shared scene records

Scenes contain exactly `kind`, `name`, `first_cue`, `cues`, `transition`, `content`.
Names are unique. Scene anchors increase from caption zero. `cues` is ordered and
unique, with one caption anchor per visual beat. Each beat begins 0.4 seconds
after its anchor and settles within 0.8 seconds before the final 0.4-second seam.
Scenes last at least two seconds. Shared transitions are `cut-left`, `cut-right`,
`cut-up`, `cut-down`, `zoom-through`, `inverse-zoom`, `rack-focus`, `fade-through`
and `text-match`, subject to the selected family's seam constraints.
Text-match joins two adjacent title scenes in a non-overlapping pair;
both headlines must fit one line at the unchanged type size, at most 32 characters.
It moves the headline carrier through one continuous curve across the cut while
supporting copy recedes/arrives. It is invalid on the last scene or on other kinds.
Caption text and timing remain unchanged.

| Kind | Exact content fields | Beats / limits |
| --- | --- | --- |
| `title` | `kicker`, `title`, `subtitle`; optional `reveal`, `marker`, or bounded `layout` | One cue, two with marker; 40/52/90 characters, narrower design limits below |
| `headline` | `kicker`, `phrases`, `swap` | 2-6 exact phrases/cues; 52 characters each |
| `kinetic` | `kicker`, `words` | 2-6 words/cues; 16 characters per word; measured phrase must fit |
| `grid` | `heading`, `items` | 2-6 items/cues; each item has `label`, `body`, pinned `icon` |
| `quote` | `quote`, `attribution`, `source` | One; 150/70/90 characters; four measured lines in landscape; compact profiles use their bounded text slot |
| `screen` | `heading`, `caption`, `images`, `chrome`; optional `focus` or `swap` | 1-3 asset IDs/cues normally; focus requires one image and one establishment cue plus 1-3 focus cues |
| `walkthrough` | `heading`, `sections` | 2-4 sections/cues; same item fields as grid |
| `lower-third` | `heading`, `name`, `role`, `context`; optional `variant` | One; 52/40/64/100 characters |
| `cta` | `heading`, `action`, `label` | One; 52/40/90 characters |
| `chart` | `record`; metric-only optional `metric_style`, gauge-only `maximum` | Existing visual-library record: bar/line use one series, 2-6 categories/cues; metric one cue; comparison two |

Additional closed composition resources:

| Kind | Exact content fields | Beats / limits |
| --- | --- | --- |
| `code` | `heading`, `filename`, `lines`, `highlights`, `source` | 2-12 display-only lines, at most 72 characters each; 1-6 zero-based line highlights/cues; no consecutive duplicate highlights |
| `carousel` | `heading`, `screens`, `source` | 2-5 screens/cues; each has verified local `image` ID and `label` (40 characters) |
| `media-grid` | `heading`, `layout`, `items`, `source`; optional `treatment`, `camera` or `surface` | 1-6 verified local image items matching layout, each with a 22-character label; one cue per item, or the fixed camera sequence below |
| `diagram` | `heading`, `steps`, `source` | 2-4 steps/cues; each has `label` (24), `body` (64), pinned `icon`; connectors are engine-generated |
| `checklist` | `heading`, `items`, `source`; optional `emphasis`, `style` | 2-5 items/cues; each has `label` (24), `value` (40), and explicit boolean `checked`; styles `standard`, `success-ring` |
| `trust` | `heading`, `marks`, structured `source`; optional `style` | 3-7 distinct text marks/cues, at most 24 characters each; styles `standard`, `logo-wall`, `spring-pop`; no imported logos or implied endorsements |
| `testimonial` | `heading`, `quote`, `author`, `role`, `rating`, structured `source` | Two cues: quote/rating, then attribution; quote 150, author 40, role 64 characters; explicit rating 0-5 |
| `proof` | `heading`, `claim`, `features`, `action`, `rating`, structured `source` | Three cues: rating, claim/features, action; claim 90, action 40 characters; explicit rating 0-5 |

A `media-grid.camera` record requires `style` from `push-in`, `pull-back`,
`punch-in`, `punch-reset`, `tilt`, `focus-rack`, `parallax-zoom`, or
`parallax-unzoom`, or the bounded camera recipes below. Solo layout is required except `focus-rack` (two cards) and
parallax (three). Only the default `box` treatment can accompany a camera.
Two caption cues establish the shot and move it; `punch-reset` requires a third
cue to return to rest. Every movement uses the native 24-frame clock. Push-in
alone accepts `intensity: subtle|standard|bold`; tilt alone accepts
`glow: tight|standard|wide`. Other controls, fonts, CSS, paths and zoom values
are rejected. Push/pull/punch intentionally crop inside the image window;
labels, source, brand and captions remain outside that crop. Parallax sends
only sibling imagery beyond the clipped board and keeps the focal card and
visible labels contained. Supplied labels keep their native font size.

Spatial `media-grid.treatment` choices use two cues: establish, then move.
`depth-card`, `dolly-depth-in` and `dolly-depth-out` require `solo` and one
verified still. `scrub-stack` and `device-splay` require `3up` and three stills
(phone, tablet, desktop in that order for the splay). They reject additional
camera, surface and HUD records. Labels remain outside the camera at the fixed
native size. Stack and device imagery overlaps intentionally; use ordinary
media-grid layouts when every image must be fully visible simultaneously.
The dolly keeps the subject at a fixed size while six actual CSS-depth frames
change perspective; it does not infer depth from the supplied image. No models,
new fonts, arbitrary camera values or free-running motion are accepted.

Screen swaps also include `scribble`, `paper-collage` and `paper-rip`.
These use the same 1-3 verified still IDs and caption cues as other screen swaps.
The scribble uses an opaque midpoint before switching images. Collage and rip
remove pieces of the outgoing image over the next image. Every overlay clears
at the settled frame. Source texture packs, arbitrary HTML slots, paths, seeds,
colors and roughness controls are not accepted. These source integrations await
the combined native browser and encoded export qualification.

Additional camera recipes are `handheld-normal-mild`, `handheld-normal-strong`,
`handheld-normal-extreme`, `handheld-wideangle-mild`, `handheld-wideangle-strong`,
`handheld-tele-mild`, `handheld-tele-strong`, `rig-6d-shake`, `rig-6d-wobble`,
`pendulum-left`, `pendulum-right`, and `extended-left|right|up|down`. These require
solo layout, box treatment, no surface and two caption cues. The second cue
animates only the clipped image. Every recipe returns to an exact identity
transform after 24 frames. Frequencies, seed, pivot, duration, perspective,
easing and arbitrary motion parameters are not episode inputs.

Resource headings are at most 52 characters; string source labels at most 90. Code filenames
are display labels (40 characters), never paths to execute. Code lines can be
blank but the whole block cannot be blank. Newlines, tabs and control characters
inside a line are rejected. Code uses the approved mono face without syntax-color
substitution. Up to six lines use the fixed reading-size recipe; seven to twelve
use the fixed dense recipe. Neither recipe shrinks itself to fit a long line. Long code is rejected by fitting checks, never silently truncated.

Evidence compositions (`trust`, `testimonial`, `proof`) use the same structured
source contract as charts: exact keys `kind`, `label`, `reference`, `as_of`, with
`kind` either `illustrative` or `measured`. `kit.validate_source` retains the
existing field, label and date validation. Both source lines remain visible.
Trust marks are distinct ignoring case, rendered as text in the approved mono
font and revealed only on their assigned caption cues. No company list is inferred.

Testimonials derive a two-character initials placeholder from the supplied author;
they do not load a person image. The full author and role remain unchanged. Proof
cards require exactly three features, each with `label` (24 characters) and a
pinned `icon`; an optional `badge` is explicit 1-4-character display text. Badge
motion is a single entrance pop and pulse, then a still hold. No default claim,
person, rating or badge count is supplied. These display records neither execute
work nor alter approvals. They keep the standard source, fitting and publication gates.

Optional lower-third `variant`: `side-rule` (existing default), `accent-underline`,
`bold-block`, `clean-bar`, `color-block`, `dark-card`, `kicker-name`, `mask-reveal`,
`neon-border`, `soft-pill`, or `stack-bars`. These change attribution composition
and entrance choreography, not text, font files or the global scene transition.
The neon rail performs one measured perimeter lap during the entrance, then holds.
Masks and names use measured widths. New variant names/roles must fit one line at
the approved font recipe; the browser gate rejects excess copy without truncation.

Checklist `checked` is required and must be a JSON boolean. Unchecked items remain
unchecked after their cue; animation never infers completion or approval. Optional
`emphasis` is a 1-20-character substring occurring exactly once in the heading;
an engine-generated ellipse traces it without changing the words. Every item has
one ordered caption cue, and source attribution remains visible. The diagram,
checklist, code and carousel families share the existing source and geometry gates.

Media `layout` is `solo` (1 image), `2up` (2), `3up` (3), `4up` (4), `3x2` (6),
or `hero` (3). `heading` is at most 52 characters; visible `source` is at most 90.
Each item has exactly `image` and `label`, with one caption cue per item. Images
reuse the existing PNG/JPEG ID, path, dimension and hash checks. Repeated image IDs
are allowed; unused asset records remain rejected. All images use contain-fit.

Media `treatment` defaults to `box`. `gloss` and `spotlight` require `solo`;
`book-open` requires `2up`. Other combinations fail before writing the episode.
All treatments finish within the shared 24-frame entry envelope. Gloss lands once
then sweeps at a fixed 25-degree angle; spotlight follows one authored path and
fades away. Their light stays inside the image viewport, away from its label.
Book-open retains mirrored 18-degree card tilts, with no idle motion. Tall profiles
stack two/three images, use two columns for six images and rotate the 58% hero
recipe. The square/landscape recipes retain horizontal arrangements. No crop,
font, geometry, color, timing, script, sound or remote-image overrides are accepted.
A gallery supplies an overview; a screen-focus scene supports detailed reading.

Optional title `reveal`: `rise` (existing default), `per-word-rise`, `blur-in`,
`typewriter`, `scramble`, `bottom-up`, `top-down`, `clip-wipe`, `line-slide`,
`char-slam`, `headline-slam`, `text-shimmer`, `tracking-in`, `streaming`, `matrix`, or `focus-resolve`.
All use the existing first cue + 0.4-second anchor and 0.8-second envelope.
Scramble has a fixed-seed frame table; typewriter keeps the full measured layout.

| Added reveal | Bounded behavior |
| --- | --- |
| `bottom-up`, `top-down` | Grapheme cascades in word masks, preserving accented and joined characters |
| `clip-wipe` | Staggered horizontal word clips |
| `line-slide` | Slide/blur by measured line; words on the same row move together |
| `char-slam` | Fixed source scatter table, center-first arrival and a three-frame title-only impact |
| `headline-slam` | Whole-title arrival from 1.6 scale, then a three-frame title-only impact |
| `text-shimmer` | One white/brand-accent gradient sweep, returning to plain white |
| `tracking-in` | Per-row letter contraction using transforms, with no layout reflow |
| `streaming` | Deterministic word bursts, including simultaneous arrivals, followed by full ink |

All settle on the exact supplied text and retain the approved font, weight, size
and final tracking. There are no font, timing, color, random-seed or code overrides.
These alter visual headings only, never spoken captions. Text-match pairs require
`rise` because their transition owns the headline motion. Schema-valid long copy
can still fail browser fitting; edit or split the copy instead of shrinking type.

Optional screen `swap`: `wipe` (existing default), `iris`, `curtain`, `grid`,
`halftone`, `fade-through`, or `whip-pan`. Iris shares a measured radius between
its image clip and accent rim. Curtain folds, grid cells and the brand-ground wash
fully cover the image at the midpoint before switching. Halftone uses seeded
dot thresholds and ink-leading reveal windows. Whip moves both stills on one strip
with horizontal blur capped at 16 pixels. All finish on the exact supplied image,
keep contain-fit geometry, and use the existing 24-frame cue envelope. They alter
only the device viewport; branding and captions stay fixed. `focus` and `swap`
cannot be combined. No palette, direction, timing, external URL or code overrides
are accepted.

Focus regions contain exactly `x`, `y`, `width`, `height`, `zoom`, `label`.
Coordinates are fractions of the original image, not the device frame. Rectangles
must stay inside `[0,1]`, have positive size, and each dimension multiplied by zoom
must be at most 0.8. Zoom is greater than 1 and at most 3; labels are at most 40
characters. The image retains contain-fit geometry. The camera clamps its pan to
the surface, the active region is outlined and its label emphasized. No arbitrary
selectors, new files or remote captures are accepted. Example optional field:

```json
{"focus":[{"x":0.36,"y":0.32,"width":0.29,"height":0.43,"zoom":1.8,"label":"Validate the source"}]}
```

Chart records use the existing `id`, `kind`, `title`, `insight`, `source`, `icon`,
`data` contract validated by `kit.validate_chart`. Source kind, label, date and
reference remain attached and visible. Bar/line values remain nonnegative and
bounded; metric values may be signed. Animation never changes source records or
final values. Labels that collide or exceed the composition are rejected by browser
QA rather than truncated or reduced in size. Comparison emphasis moves from the
initial state to the next state on its second cue.

Metric scenes optionally select `metric_style`: `count` (unchanged default),
`wheel`, `slot`, `pop`, `usage-arc`, `progress-bar`, or `star-rating`. Reels preserve the exact
numeric string, including signs, decimal points and scientific notation; there
is no inferred suffix or rounding of the final value. Pop reveals each character
with a bounded rise, scale overshoot and blur. All settle within the existing
0.8-second caption beat, then hold. Fixed approved type sizes still reject overflow.

The two gauges require `maximum`, a finite number greater than zero and at most
1,000,000 in the record's unit. The value must be between zero and that maximum.
The maximum is printed beside the unit; fill encodes `value / maximum`, on the
same ease as the numeric count. Zero remains zero. These options are rejected
on bar/line/comparison records; `maximum` is rejected on nongauge styles.
Sources remain mandatory and visible. Example additions beside a metric `record`:

```json
{"metric_style":"progress-bar","maximum":30}
```

`star-rating` requires `unit: "stars"` and an explicit integer `maximum` from 1
through 10. Value must be between zero and maximum; floats such as `maximum: 5.0`
are rejected. A fractional clip sweep and the numeric count share the same ease.
The final value is never rounded to one decimal. Testimonial/proof cards use the
same star renderer with a fixed five-star scale and print the exact supplied rating.

Panel labels/bodies are bounded at 24/90 characters; headings at 52. Browser fitting
can reject text within those caps; there is no silent font shrinking. Scene JSON is
at most 512 KB. Text is escaped or assigned with `textContent`. No arbitrary
HTML/CSS/JS, font path, backend option or remote asset URL is accepted.

`assets` maps up to 32 lowercase IDs to local path/hash records. Every asset must
be used. PNG/JPEG stills are at most 20 MB, 32-4096 pixels per axis, with containment,
symlink, hash and decode checks. Asset paths are relative to the episode JSON.
The cover input must match the selected aspect ratio; output uses the unchanged
approved logo/font files/palette. Frame geometry lives in `composition_geometry`;
the compiler supplies it to CSS, capture and QA. It is not an episode-defined
layout. Captions and logo retain fixed protected positions for each profile.
Square and 4:5 covers use a fixed compact typography recipe; portrait keeps the
existing portrait cover recipe. No automatic cropping of the film occurs.
Brand `scene_count` remains the old Shorts default; version-3 scene count is
episode-owned. Old approvals are never rewritten. Source:
[production_visuals.py](../production_visuals.py).

## Transcript

Required operational fields are `duration`, `audio_sha256` and a nonempty `words`
array. The native adapter also records engine/locale metadata. Each timed segment
contains text and start/end seconds measured against the original recording.

```json
{
  "duration": 3.0,
  "audio_sha256": "replace-with-the-actual-sha256-of-audio-bytes",
  "words": [
    {"text": "Check", "start": 0.2, "end": 0.6},
    {"text": "the result.", "start": 0.65, "end": 1.4}
  ]
}
```

`words` is the field name; a native ASR segment can contain more than one lexical
word. Index these entries as returned. The validator requires finite times, positive
intervals within the episode duration and ordered segments, with a 0.061-second
ordering tolerance. A transcript hash binds a file, not the truthfulness of its text.

## Captions

```json
{
  "duration": 3.0,
  "status": "word_timed_review",
  "cues": [
    {
      "text": "Check the result.",
      "start": 0.2,
      "end": 1.4,
      "firstWord": 0,
      "lastWord": 1
    }
  ]
}
```

The accepted status values are `word_timed_review` and `local_asr_aligned_review`.
Neither is a claim of human approval. `firstWord` and `lastWord` are inclusive,
zero-based indexes into transcript segments. Cues cover every segment exactly once,
in order, without overlapping cue intervals. Caption text must preserve the sequence
of normalized spoken words; punctuation and case may differ. Each cue is at most
100 characters, but visual fitting is checked separately in the browser.

End timestamps must match the final segment within 0.061 seconds. Start differences
greater than 0.12 seconds require an explicit measured `timing_adjustments` note;
the existing refinement ceiling is 1.1 seconds, and the cue cannot start later than
the first segment's end plus 0.061 seconds. Unused notes fail validation.

`caption-draft` rounds transcript duration up to a whole 30 fps frame. Do not stretch
the original recording to match manually invented duration or cue intervals.

## Scenes and Motion

Scene fields are exactly `layout`, `name`, `first_cue`, `content`, `motion`.
`content` and `motion` keys must match the chosen layout JSON. Text slots are escaped,
limited to 300 characters and subject to visual QA. This ceiling does not imply
300 characters fit in a headline or code line. Scene names are limited to 100 characters.

`first_cue` anchors must increase. The first is zero; the first scene starts at time
zero, and later scenes start at their anchored cue's start time. `new` additionally
requires at least two seconds for each drafted scene; the general validator only
requires positive scene durations.

| Motion key | Value | Interpretation |
| --- | --- | --- |
| `enter` | Nonnegative number | Reveal time relative to scene start |
| `active` | `[start, end]` | Active-state interval |
| `fill` | `[start, duration]` | Line/fill animation interval |
| `travel` | `[start, duration]` | Packet movement interval |

Only motion keys declared by that layout are permitted. Intervals must finish
inside the scene. When changing layout, start from that layout's `example` object
and adapt its timing; do not retain incompatible slot names.

## Cover and YouTube Copy

| Field | Limit |
| --- | --- |
| Cover headline | Exactly two uppercase lines, each at most 24 characters; must fit width and height |
| Cover label | Uppercase, at most 32 characters; must fit at the fixed size |
| YouTube title | Nonempty, at most 100 characters |
| Description | Nonempty, at most 5,000 characters |
| Pinned comment | Nonempty, at most 1,000 characters |
| Hashtags | 5-8 unique lowercase `#[a-z0-9]+` entries |
| Description hashtags | Must match the hashtag list in the same order |
| Tags | List of strings; comma-space joined length at most 450 characters |

These are local editorial/validation constraints, not a complete implementation of
current platform policy. There is no search-volume lookup or platform API validation.
Final render blocks `DRAFT:` in title, description or pinned comment; other placeholder
copy is still a human-review responsibility.

## Run Records

Successful `run.json` records the episode/input hashes, mode, measured environment,
output hashes, `automated_checks: PASS` and `status: review_required`.
`publication_performed` is false. Build-only runs have no final media/audio checks.

The run manifest hashes top-level output files; it is not a recursive archive of
every asset/dependency byte. Preserve the approved brand, exact inputs, implementation
version and relevant runtime evidence when reproduction matters.

### Shader screen swaps (development v3)

`screen.content.swap` additionally accepts the `shader-` prefix followed by
`domain-warp`, `ridged-burn`, `whip-pan`, `sdf-iris`, `ripple-waves`,
`gravitational-lens`, `cinematic-zoom`, `chromatic-split`, `glitch`,
`swirl-vortex`, `thermal-distortion`, `flash-through-white`, `cross-warp-morph`
or `light-leak`. The existing local PNG/JPEG hashes, one image per cue, fixed
24-frame timing and mutually exclusive `focus` mode apply. No shader source,
uniforms, colors, texture URLs, custom time or browser flags are input fields.

Effects occupy only the device's image viewport. Original stills are shown at
both endpoints; fonts, logo, captions, toolbar and scene seams retain their
existing rendering. Images preserve contain-fit and approved background padding.
Generated `production-shader-images.js` holds base64 of the verified copied bytes
for clean WebGL textures under local-file origins. It is private run output.
The shared renderer owns one WebGL context and two textures, with at most fourteen
programs. Programs or context errors stop the run; no visual fallback is substituted.

### Headline swaps and title markers (development v3)

`headline` takes `kicker` (48 characters), 2-6 `phrases` (52 characters each),
and `swap`: `line`, `state`, or `caret`. Each phrase has one cue; adjacent
phrases must differ. Line swaps move upward through a mask, then draw a rule.
State swaps transfer focus with an eight-pixel blur. Caret swaps cover the
previous phrase and type the next in accelerating grapheme steps; they require
one line at the approved size. The final caret is hidden, with no idle blink.
Long copy fails fitting instead of shrinking the font.

Title `matrix` reveals staggered binary cells that resolve to the exact supplied
graphemes. `focus-resolve` resolves word focus from 16px blur and 1.08 scale.
Both preserve the final font, color, casing, spacing and source text.

A title can instead supply `marker: {"text": "clarity", "style": "circle"}`.
The text must match exactly once in the title, with a maximum of 24 characters.
Styles are `highlight`, `circle`, `underline`, `scribble`, and `rough-underline`. Two cues are
required: title arrival, then measured stroke drawing and a small settle pop.
Markers use `rise` and cannot combine with text-match seams. No arbitrary paths,
fonts, colors, timings or scripts are accepted. All new motion finishes in the
shared 24-frame envelope and leaves spoken captions unchanged.

A marker may also contain an explicit `note` of at most 28 characters. A noted
title is limited to 38 characters and its subtitle to 72. The connector draws
after the marker and the note appears below the title. Keyword matching stays
exact; note text never replaces or adds narration. Arbitrary note positions,
font/color controls and paths are rejected.

Optional title `layout` is `standard` (default), `speech-cloud`, `path-wave`, or
`emphasis`. Designed layouts own their entrance and cannot combine with another
reveal, marker or text-match seam. All retain `kicker`, `title`, and `subtitle`:

- `speech-cloud`: title up to 28 characters; optional `tail` is `left` (default)
  or `right`. The seeded outline draws, the brand-colored fill appears, and
  grapheme spans reveal the supplied title.
- `path-wave`: title up to 18 characters along the retained cubic wave and dotted
  guide. Font sizes are fixed. A title wider than the measured path is rejected;
  shorten the copy rather than changing the approved font. No SVG/path input.
- `emphasis` or `layered-emphasis`: requires `backdrop_word`, one explicit word up to 16 characters.
  Its decorative uppercase copy moves once behind the normal title and settles.
  The original foreground text limits apply. Other layouts reject this field.
  `layered-emphasis` instead stretches that decorative word across the content
  width and by 2.8 vertically, with a short entrance and a still hold. It retains
  the existing decorative font role and approved accents; foreground copy stays
  at its normal size and position.

`word-highlight` is an additional standard-layout reveal: one scalar progresses
through the supplied words from faint to full white ink. Whitespace, exact text,
approved font and the existing caption-cue clock remain unchanged.

### Additional title treatments

These standard-layout `reveal` choices use one caption cue and the existing
24-frame entrance. They restore the supplied title in its approved font at rest:

| Reveal | Native behavior | Additional content |
| --- | --- | --- |
| `glitch-read` | Seeded word displacement and two brand-colored shadow channels | None |
| `decode-read` | Two seeded alphanumeric substitutions per word, then exact supplied text | None |
| `neon-accent` | Scale entrance and a bounded glow on one supplied word | `accent_word` |
| `particle-burst` | Ten seeded rays from one supplied word, with a brief scale accent | `accent_word` |
| `tile-resolve` | A 12-by-5 field resolves crops of the actual approved-font title | None |
| `ascii-trail` | A 24-by-14 glyph field clears along the retained S-curve schedule | None |
| `cadenced-type` | Seeded 1-3-grapheme bursts and a caret during entry | None |
| `particle-assemble` | Particles converge on samples of the actual title glyph raster | None |
| `texture-read` | A moving luminance mask reveals the title, then clears completely | `texture` |

`accent_word` must match exactly one whitespace-delimited title word, including
punctuation, and be at most 24 characters. No automatic keyword selection occurs.
It is rejected for other reveal types. `texture` is an ID in the existing verified
local PNG/JPEG asset table; hashes, path restrictions, size bounds and no-unused-
asset checks apply. It is required only for `texture-read` and rejected otherwise.
The source texture pack is not bundled by these code adaptations.

No seed, timing, density, font, shader, HTML or source-color override is accepted.
Markers and designed layouts keep their existing incompatibility rules. These
effects do not alter spoken-caption text, timing, styling or position. Combined
four-format and encoded-video qualification remains pending.

## Batch additions awaiting combined qualification

These v3 contracts are implemented in source; native browser/export qualification
will run with the complete integration batch. No old episode is migrated.

- `backdrop` content is exactly `heading` (52), `caption` (100), and `style`.
  Styles: `grid`, `grain`, `mesh`, `aurora`, `beat-pulse`, `starfield`, `snow`,
  `stagger-lattice`, `line-trace`, `confetti`.
  One caption cue builds the field in 24 frames and then holds it still. The
  generated artwork is contained in the existing screen slot; text, logo and
  spoken captions keep their approved roles and positions.
- The 36 `gpu-*` backdrop styles listed by `compositions` use the same closed
  content record and require exactly two caption cues at least two seconds apart.
  The first starts the field; the second brakes it to a still frame over 24 frames.
  The pinned shader's two-second clock is evaluated from absolute native frames.
  Original colors are remapped to the approved background, secondary and accent
  colors. Fonts, logo and spoken captions are unchanged. Shader properties,
  arbitrary paths, seeds, palettes and remote assets are not episode inputs.
  These explicit styles require local WebGPU-capable Chrome; missing hardware
  or GPU errors fail the run. Existing non-GPU capture retains its configuration.
- `interface` content is exactly `heading` (52), `source` (70), `style`, and
  `items` (2-4). Styles: `chat`, `terminal`, `steps`, `settings`, `notifications`.
  Every item has `label` and `body`, with one ordered caption cue per item.
  Labels are at most 24 characters, or 58 for terminal text. Bodies are at most
  72 characters, 100 for steps, or 58 for terminal output. Chat items additionally
  require `side: sent|received`; settings require an explicit boolean `enabled`.
  Terminal commands are display text and never execute. Interfaces do not submit
  forms, send messages or change system settings.
- Additional scene transitions are `cut-right`, `cut-up`, `cut-down`,
  `inverse-zoom`, `rack-focus`, and `fade-through`. They retain the fixed
  0.4-second halves. Direction/scale seams have matching velocity signs; optical
  cuts use a bounded blur peak. Fade-through swaps on the opaque brand ground.
- `data-story` content is exactly `heading` (52), `insight` (90), `source`
  (the existing structured provenance record), `style`, `unit` (12), `categories`
  (2-6 distinct labels, 12 characters each), and `series`. Each series has a
  distinct `label` (16) and one explicit finite value from 0 to 1,000,000 per
  category. `lines` requires two series sharing one zero-based scale; `ranking`
  accepts 2-6 series with stable input-order tie breaks. One cue per category.
  Ranking rows interpolate ten rank samples per period; overlapping moving labels
  temporarily hide during overtakes and return to exact supplied copy on settle.
  Line legends show the current values without placing colliding labels at
  crossing points. Both styles use a single maximum across every supplied value.
- `network` content is exactly `heading` (52), structured `source`, `style`
  (`hub`, `branch`, `avatar-cloud`, `radial-surround`, `nucleus-orbit`, or
  `pressure-surround`), and `nodes` (3-7). Each node has a distinct `label` (16)
  and explicit `parent`: `null` for the root, otherwise an earlier node index.
  Every non-branch style attaches children to root index zero. Branches have at most three levels and
  four nodes per non-root level. There is one cue per node. Paths and positions
  are generated internally; arbitrary SVG, cycles and inferred links are rejected.
  Radial layouts keep the center fixed. Moving labels temporarily hide when they
  cross another readable label or the viewport; all labels must be visible at
  rest. `avatar-cloud` uses derived initials, not external profile images.
- `annotation` content is exactly `heading` (52), `source` (70), `image`
  (one hash-verified local image identifier), and `marks` (1-4). Each mark has
  `x`, `y`, `width`, `height`, `label` (40), and `style`. Original styles are
  `circle`, `underline`, and `box`. Handwritten styles are `hand-circle`,
  `hand-box`, `hand-arrow`, `hand-underline`, `hand-strike`, `hand-bracket`, and
  `hand-scribble`. Only handwritten marks accept optional `stroke`: `plain`
  (default), `soft`, `sharp`, or `spray`. Only `hand-arrow` accepts optional
  `curve`: `straight`, `gentle` (default), or `swoop`. Every mark accepts optional
  `pointer`: `cursor` (default) or `pen`. The pen follows the path tangent and
  exits completely below the board. Coordinates are normalized against the original image; width and
  height must be at least 0.04 and the entire region must fit within the image.
  Contain-fit letterboxing is accounted for. The first cue reveals the still;
  one further cue per mark drives cursor entry, click, stroke and physical exit.
  Handwriting uses seeded source geometry and curvature-weighted pen speed.
  Texture masks have unique scene/mark identities; spray dots are deterministic.
  Font, color, arbitrary SVG/path, seed and idle-motion overrides are rejected.
  This renders annotations; it does not control or modify the captured application.
- Additional `title.reveal` values are `word-crossfade`, `shared-axis-y`,
  `shared-axis-z`, `soft-blur`, `scan-band`, `accent-glitch`, `shimmer-sweep`,
  `mask-reveal`, and `calm`. They use the existing exact title/kicker/subtitle
  record and a single cue. Every treatment settles to the same approved font,
  white text and unfiltered layout. The shared word-crossfade adapter covers
  three identical upstream entry recipes; they are not three separate features.
  Mask and color layers are internal generated geometry, never episode code.
- Additional `headline.swap` values are `morph`, `strike`, and `flap`. They keep
  2-6 supplied phrases and one cue per phrase. Morph uses bounded reciprocal blur
  and a fixed alpha-threshold filter. Strike draws a brand-colored line before
  replacing the phrase. Flap uses two physical half-leaves and reconstructs their
  state on every seek. It applies the split-flap mechanic to complete phrases;
  it does not uppercase, truncate or replace authored copy with a fixed alphabet.
- `media-carousel` content is exactly `heading` (52), `source` (70), `preset`,
  and `images`. Presets are `circle-1..5`, `path-1..5`, `orbit-1..5`,
  `text-circle-1..5`, and `vision-1..5`. Use 3-12 verified local image references,
  or up to 24 for orbit presets and `path-1`, `path-4`, `path-5`. References cycle
  in supplied order across the preset's fixed 12 or 24 slots; no demo media is
  supplied. Every source image uses contain-fit inside its moving card. Cards
  overlap and pass through the clipped artwork window as part of the trajectory;
  the heading, source and spoken captions remain outside that moving layer.
  Text-circle presets additionally require `center_text` (1-4 words, 24 characters,
  no surrounding whitespace), in the approved font. Other presets reject it.
  Exactly two caption cues, at least six seconds apart, start travel and then
  trigger a 24-frame deceleration. The final state holds. Source paths, orbit
  geometry, perspective, keyframe curves and convergence are fixed presets, not
  episode controls. The source's promotional outro, free variables, colors,
  fonts and text drift are excluded; scene handoffs remain engine-owned.
- `screen.swap` additionally accepts the following closed catalog names, each
  prefixed with `catalog-`: `push-slide`, `vertical-push`, `elastic-push`,
  `squeeze`, `staggered-blocks`, `horizontal-blinds`, `vertical-blinds`,
  `circle-iris`, `diamond-iris`, `diagonal-split`, `grid-dissolve`, `card-flip`,
  `shutter`, `clock-wipe`, `page-burn`, `glitch`, `chromatic`, `ripple`,
  `light-leak`, `overexposure`, `film-burn`, `flash-cut`, `gravity-drop`,
  `morph-circle`, `blur-through`, `directional-blur`, `calm-blur`, `crossfade`,
  `blur-crossfade`, `focus-pull`, `color-dip`, `zoom-through`, and `zoom-out`.
  Existing screen fields, 1-3 local images, one cue per image, contain-fit and
  separation from focus regions remain unchanged. Effects use the fixed 24-frame
  envelope; their source-relative timing is normalized to it. Temporary masks,
  perspective, blur, brightness, ghost images and brand-color layers reset on
  every seek. Endpoints show the complete unfiltered original image. They affect
  the clipped screen viewport only, leaving approved copy/logo/captions intact.

- `code-story` content is exactly `heading` (52), `filename` (40), `source` (90),
  `style`, and `documents`. Styles are `typing`, `diff`, `morph`, `scroll`,
  `workbench`, `terminal`, `particles`, `dissolve`, and `extrude`.
  A document is an array of 1-8 literal display
  lines, each at most 44 printable characters; empty lines are preserved, but
  an entirely blank document is invalid. Tabs, newlines and control characters
  are rejected. Text is never executed or interpreted as HTML.
  `diff`, `morph`, `particles`, `dissolve`, and `extrude` require 2-4 differing consecutive documents and one cue
  per version. Other styles require one document. `typing`, `workbench`, and
  `terminal` use one cue per line; in terminal mode the first line is typed and
  subsequent supplied output lines enter on their cues. No prompt or result is
  invented. `scroll` alone allows up to 32 lines and additionally requires
  `focus`: 1-8 valid zero-based line indices, differing consecutively, one cue
  each. The code viewport may scroll; the heading, source and captions stay fixed.
  Source mechanics use the existing 24-frame cue envelope. BrandMono is fixed,
  and overflow rejects the episode instead of reducing the font size.
  The three spatial styles rasterize only these supplied glyphs, animate them
  with the fixed local source recipes and resolve to native text at rest.
  Seeds, token colors, shaders, fonts and models cannot be supplied by the episode.
  Particle fields fail closed above 80,000 samples; no samples are silently dropped.

- Quantitative `map-story` styles require `heading` (52), `insight` (90), structured `source`,
  `style`, `unit` (12), and an explicit `maximum` greater than zero and at most
  1,000,000. One initial cue reveals the map; subsequent cues reveal/focus data.
  `us-hex` additionally requires `values`: 1-51 unique `{region, value}` records
  using US postal state codes or `DC`, with values from zero through maximum.
  `focus` contains 1-8 supplied region codes, differing consecutively, one cue each.
  Missing regions remain blank; no data is inferred. This is a schematic grid,
  not geographic boundary data. `bubbles` and `flows` instead require a verified
  local `image` and explicit `points` with `label` (24), `x`, and `y`, normalized
  within that image from .15 through .85. Positions and case-insensitive labels
  must be distinct. Bubbles use 1-8 points with an additional `value` per point,
  from zero through maximum, one cue each; final area is proportional to value.
  Flows use 2-8 points and 1-8 `{from, to, value}` records, one cue per flow.
  Endpoints are distinct zero-based point indices, directed pairs are unique,
  values are positive and at most maximum, and every point must be referenced.
  No URLs, projections, geocoding, demo statistics or custom SVG paths are accepted.
- `map-story/flight` requires `heading` (52), `insight` (90), structured `source`,
  `style: "flight"`, one verified local `image`, exactly two `points` with the same
  label/coordinate rules, and an explicit `arrival` label (16). Endpoint separation
  must be at least .25 in normalized image space. It accepts no numeric distance,
  scale, inferred destination, sound, raw path or free style fields. The two cues
  mark start and settle, at least six seconds and 180 native frames apart. The
  existing clock retimes the 5.62-second flight and settles over 24 frames. The
  source cubic curve is fitted to supplied endpoints; controls stay within the
  contained image. The aircraft follows arc length and the local path tangent.
  Three route strokes, six staggered marks, two pins, destination drawing and a
  finite landing accent use the approved palette. Point labels stay at the normal
  native callout size. Source sample map/audio, remote scripts, demo distance,
  idle aircraft pulsing and the white-screen ending are omitted. Any basemap
  attribution required by its rights belongs in the visible structured source.
- `map-story/world` uses the quantitative fields above, with `values` containing
  1-177 unique `{region, value}` records. Region names must match the pinned
  Natural Earth catalog exposed by `ysc compositions`; values range from zero
  to the explicit maximum. `focus` contains 1-8 supplied regions, differing
  consecutively. Missing countries remain blank; zero retains a distinct fill.
  One cue starts the reveal, followed by one cue per focused region. There must
  be 150 native frames before the first focus, 36 frames between focus cues,
  and 30 frames for the last pulse before the existing scene-exit margin.
  The 177-country geometry/projection and approved gradient are fixed. This
  style accepts no image, remote topology, projection, raw SVG, colors or GDP
  defaults. Native callouts replace source hover tooltips.
- `map-story/spain` and `map-story/us` use the quantitative fields above. Values
  name the fixed 19 Spanish community/city codes or 50 US postal codes exposed
  by `compositions`; DC is valid only in `us-hex`. All values are explicit,
  finite, unique, and between zero and `maximum`. `focus` names 1-8 supplied
  regions, with different consecutive entries. One cue starts the source
  reveal; subsequent cues focus regions. Require 195 native frames before the
  first highlight, 36 between highlights, and 30 for the final pulse before
  the scene-exit margin. Abbreviation labels have collision-free placements
  connected to the original projected centroids; full names appear in callouts.
  Actual boundaries, islands, projection, label font, color stops and geographic
  attribution are fixed. No topology path, raw SVG, projection, font, arbitrary
  colors or attribution override is accepted. Metric dates and attribution
  remain separate from geometry provenance. Spain's source edition is not
  supplied by es-atlas0.6.0 and is explicitly identified as unspecified.
- `map-story/spotlight` requires `heading` (52), `insight` (90), structured
  `source`, `style: "spotlight"`, a verified local `image`, `label` (24), and
  `region: {x, y, width, height}`. Width/height must be .1-.3; all bounds stay
  within the image's .05-.95 margin. Two cues mark start and settle, at least
  seven seconds and 210 native frames apart. The original camera/drawing
  sequence is retimed through the existing finite clock. The label follows
  the image-relative region at a fixed native font size; the approved accent
  replaces the source red wash. Source image, geographical assertion, late
  idle label bob and unrestricted zoom/color/path controls are omitted.
- `combo-chart` requires `heading` (52), `insight` (90), structured `source`,
  2-6 unique `categories` (12 each), and `bars`/`line` series. Each series is
  exactly `{label, unit, maximum, values}`: distinct label (16), unit (12),
  positive maximum at most 1,000,000, and one finite value from zero through
  maximum per category. Both axes are explicit. One cue per bar comes first,
  followed by one cue per line point; there are twice as many cues as categories.
- `specs` requires `heading` (52), `source` (90) and 2-5 `rows`, each exactly
  `{label, value}` with limits 24 and 50, one cue per row. Exact supplied text
  accompanies a delayed accent-rule draw; no specification is invented.
- Metric style `conic-ring` uses the existing chart metric record and requires
  the same explicit positive `maximum` as other gauges. Cubic-out fill and count
  share progress; the final numeric value is exact. Other metric styles retain
  their existing easing and geometry.

- `interaction` requires `heading` (52), `source` (70), `label` (40), `image`,
  `style`, and a normalized `target: {x, y, width, height}` inside the verified
  still. Both dimensions are at least .04. Styles are `click`, `drag`, `marquee`,
  `menu`, `tap`, and `swipe`. Four caption cues establish the image, approach,
  perform the action, and exit; `menu` has a fifth cue for selection before exit.
  Every style except `marquee` requires a separate verified `result` image with
  different bytes. The engine displays supplied results; it does not operate an
  application, execute menu labels, or infer the resulting screen.
  `drag` also requires normalized `drop: {x, y}`, the destination's top-left;
  the complete region must fit and the summed axis displacement is at least .08.
  The lifted region is a visual copy of the original screenshot until the result
  replaces it. `swipe` requires `to_y` from .04 to .96, with vertical travel of
  20-65% of image height from the target center. `menu` requires 2-4 distinct
  `items` (24 characters each) and a zero-based integer `pick`. All other fields
  are rejected except the following bounded presentation options.
  Optional `pointer` is `arrow` (default), `dart`, `echo`, `glyph-trail`,
  `magnetic`, or `agent`; touch styles reject this field. Magnetic requires
  `click`; agent requires `actor` (18 characters) and displays the supplied
  `label`, without inventing completion. The actor label yields to a visible menu.
  Optional `camera: "follow"` requires click/drag with the standard arrow.
  It applies a fixed 1.8x spring-follow crop inside the screenshot board,
  returning to the full contain-fit image on exit. Brand and captions stay fixed.
  Other zoom values, arbitrary pointer styles and actor fields are rejected.
- `interface` with `style: "chat"` accepts optional boolean `typing_indicator`.
  When true, a bounded three-dot wait precedes each explicit received message.
  It dismisses on that message's exact cue frame; sent messages never show it.
  Other interface styles reject this option. Absent/false retains the default.
- `interface` optionally selects a closed `variant` for its existing style:
  chat: `bottom-stack`, `side-stack`, `token-stream`; notifications: `spring`,
  `pileup`, `cascade`, `slide`; steps: `tabs`, `sheet`, `skeleton`, `menu`.
  Incompatible combinations are rejected. Items still use the exact supplied
  label/body and one cue each. Chat variants retain explicit sent/received sides
  and optional waiting dots; bottom stacks make room before showing the dots.
  `tabs` and `menu` labels have a 14-character limit, with no font shrinking.
- New interface style `notes` uses 2-4 exact `{label, body}` items (24/72
  characters), measured typing rhythm and a finite caret. New style `feedback`
  uses 2-4 exact `{label, body, state}` items with the same text limits and
  `state` strictly `valid` or `error`. The supplied state controls the visual
  shake/badge/hint; the engine performs no validation or application action.
  Neither new style accepts a variant, typing indicator, arbitrary style,
  runtime callback, inferred receipt or generated status text.

Arbitrary colors, HTML, CSS, scripts, fonts, timing and remote asset URLs remain
invalid episode fields. The browser gate checks overflow and can reject copy
within the character limits; text is never silently shrunk or truncated.

### Editorial frame, pipeline and closing options

- `media-grid.treatment: hand-frame` requires `solo`, one verified local image,
  one caption cue and its existing label. Seeded borders and sparks use fixed
  engine geometry. No font, seed, SVG, tilt or animation-duration overrides are accepted.
- `diagram.style` is `standard` or `hand-drawn`. Both retain the existing 2-4
  steps, supplied labels/bodies, pinned icons and one cue per step. The handwritten
  version draws the incoming curved arrow before its box and label.
- `lower-third.variant: news-plate` retains the original record and one cue.
  Its two tight-fit bars use approved white/accent/ground colors.
- `lower-third.variant: channel-card` requires two cues and a `button` record
  with distinct explicit `before` and `after` strings, at most 18 characters each.
  Name is limited to 24 characters and role to 38. The first cue reveals the
  approved-logo card; the second animates the declared button-state change.
  This is a rendered illustration, with no click handler or external action.
- `cta.style` is `standard`, `capsule`, `brand-close`, or `sting`. All retain one
  cue and exact `heading`, `action`, and `label` strings. Brand-close and sting
  headings are limited to 24 characters. Brand-close accents a supplied final
  period; it never appends punctuation. Sting has exactly one impact frame
  inside the composition area. Fonts, colors, timings, exit scripts and logos
  cannot be supplied by the episode.

### Media surfaces

`media-grid.content.surface` is a closed record with `style` chosen from
`blur-fill`, `mirror-fill`, `copy-fill`, `screen`, `grain`, `vignette`,
`light-sweep`, `light-leak`, `editorial-flash`, `beat-accent`, `feather-focus`,
`lcd`, `phone`, or `tablet`. It requires `solo`, one verified still, one cue,
and absent/default `box` treatment. It cannot coexist with `camera`.
The original image is contain-fit; fill copies and effects are clipped inside
its viewport. Existing source, label, font and caption checks remain active.

Only `phone` accepts optional `cutout: none|island|notch`. Only `feather-focus`
accepts and requires `target: {x,y,width,height}`: finite image-relative values,
nonnegative origin, width/height from 0.1 to 1, and the complete target inside
the source image. Letterboxing is excluded from target coordinates. No other
surface fields, HTML, CSS, colors, timing, source URLs or audio hooks are accepted.

### Gesture and panel interfaces

The existing `interface` record adds eleven `steps` variants: `swipe-rail`,
`velocity-throw-snap`, `spring-stack-shuffle`, `scroll-feed`, `state-chip-rail`,
`card-resize`, `modal-morph`, `modal-morph-snappy`, `pull-to-refresh`,
`pull-to-refresh-arrow`, and `pull-to-refresh-dots`. `settings` adds `toggle-flip`.
All retain 2-4 exact `{label,body}` items, one existing caption cue per item,
and the original source/heading fields. Settings additionally require each
item's explicit boolean `enabled`; its opposite is the illustrated flip origin.
Only state-chip labels have the additional 14-character navigation limit.

There are no new timing, physics, event, palette, font, callback or URL fields.
At rest the selected step's copy is fully visible. Traveling card silhouettes
can cross their clipped viewport; readable copy stays within it. Expanded
panels counter-scale their text to preserve glyph size. Other interface variants
and their validation remain unchanged. Refresh and toggles illustrate declared
states; they do not perform external actions.

### Source-backed title reading treatments

`title.reveal: "text-stagger"` adds per-word rise/blur followed by a separate
accent shimmer. The source phase ratios fit within one 24-frame cue, including
the last word. It preserves exact text and whitespace, approved fonts and final
white type. It cannot combine with a marker or a non-standard title layout.
No changes apply to spoken captions, their timing or their presentation.

Standard `title.content.reveal` also accepts `marker-sweep`, `gradient-read`,
`neon-read`, `kinetic-words`, `editorial-words`, and `pill-read`. These apply
bounded word treatments to the supplied title during its existing 24-frame
cue entrance. They do not change spoken captions or claim word/audio alignment.
No extra fields, font overrides, timing values or arbitrary styles are accepted.
Existing title lengths, fixed type sizes, layout/marker exclusivity, overflow
checks and human review still apply. Character count alone does not guarantee
visual fit; oversized copy must be shortened by its author.

The marker grows and releases behind each word; gradient and glow accents make
one pass and clear. Kinetic words alternate four directional/spring entries,
while editorial words resolve from 1.12 scale around their lower-left origin.
The pill uses approved white/purple and progressive ink with the first word
active. All variants settle to exact supplied text, full opacity and zero
transform. Palette and fonts come from the approved brand, not upstream demos.
These are partial source adaptations; omissions and source hashes are recorded
in `hyperframes-production-provenance.json`.

### Local image raster treatments

A solo `media-grid` with standard box treatment and no camera may set
`surface.style` to `ascii-coarse`, `ascii-medium`, `ascii-fine`, `dither-2`,
`dither-4`, `dither-8`, `particle-left`, `particle-center`, `ink-bleed`,
`slit-rows`, or `slit-columns`. Each still keeps its existing cue, label and
source record. These styles accept only `style`; arbitrary character sets,
fonts, seeds, levels, timings, URLs and source DOM are rejected.

ASCII resolves through five stable cell pitches and holds as a stylized image
using approved BrandMono and accent ink. Its three variants retain the source
22/36/54 final-row densities. Dither uses 2x2, 4x4 or 8x8 Bayer thresholds.
Particle, ink and slit treatments reveal the complete contain-fit still, and
their transient canvas clears at the endpoint. Labels and spoken captions stay
outside the effect. Render and review the supplied image: ASCII deliberately
changes its appearance and is not a legibility guarantee for screenshot copy.

Canvas source pixels use the same hash-checked embedded PNG/JPEG bundle as
screen shaders. The historical `production-shader-images.js` filename and its
mapping remain compatible. Only images selected by a shader or raster style
are encoded; other stills are copied normally. Decoding is shared and awaited
before capture. No file-origin exception, remote fetch, HTML rasterization,
WebGL context or server is required by the raster treatments. Existing path,
hash, size, no-overwrite and human review gates remain unchanged.

Social interface records select `style: "social"` and an explicit `variant` of
`post`, `discussion`, `comment`, or `follow`. Each of the existing 2-4 items has
exactly `label` (24 characters), `body` (72), `context` (32), and
`action: {"before": "...", "after": "..."}` (18 characters per state).
These states are supplied illustrations; the renderer does not infer accounts,
verification, engagement or completed external actions. Comment footers require
identical before/after text. One caption cue introduces each card. Only the
current card is visible after settling. Notification records can instead select
`variant: "peek-stack"`; they keep the original label/body schema and show only
blank backing-card strips behind the current notification.

Screen swaps additionally accept `catalog-physical-toss`, `catalog-physical-drop`,
`catalog-physical-slide`, `catalog-rubber-left`, `catalog-rubber-up`,
`catalog-condense`, `catalog-reshape`, `catalog-page-slide`, and
`catalog-spectral-left`, `catalog-spectral-right`, `catalog-spectral-up`,
`catalog-spectral-down`. They retain the existing 1-3 verified images, fixed cue
envelope, image viewport and focus/swap separation. They are image transitions,
not changes to the global scene-seam or spoken-caption contracts.

### Image inspection and camera overlays

Annotation marks add `style: "scan-gate"` and `"segmentation-flood"`. Their
existing normalized `x`, `y`, `width`, `height` and explicit `label` define the
region; they do not perform detection. Each mark keeps its caption cue. These
two styles own their sweep/fill and reject `pointer`, `stroke` and `curve`.
Other annotation styles keep those options. One to four marks remain allowed.

A solo media-grid with the standard box treatment may include one `hud` record.
It cannot combine with a camera or image surface. Labels, verified local image
IDs and source attribution remain required.

- `{"style":"telemetry","readouts":[{"label":"STATUS","value":"READY"}],"emphasis":0}`
  accepts one to four distinct labels, with labels and values up to 16 characters.
  `emphasis` is an explicit readout index or `null`. The image uses the first
  cue; every readout requires its own further cue. Supplied values resolve from
  deterministic letter/digit scrambling; the renderer invents no measurements.
- `{"style":"camcorder","date":"INTERNAL TEST","mode":"PREVIEW","recording":true,"battery":80,"counter_start":0}`
  accepts a date label up to 32 characters, mode up to 12, an explicit boolean,
  integer battery percentage 0-100 and integer starting seconds 0-86399. One cue
  starts the image and overlay. The counter follows elapsed native scene frames;
  the aspect label follows the output profile. No system date, device status or
  external recorder is queried.

### Additional bounded presentations

Steps interfaces add `variant: "pan-stations"` and `"panel-reveal"`. They keep
two to four supplied label/body items and one caption cue per item. Station
cards retain the source 78-percent width and 6-percent gap, traveling with a
sine curve between cues. Panels expand their body with a quartic in/out curve
and preserve the approved text size. Arbitrary dwell times, widths, themes,
fallback text and interactive behavior are not accepted.

Backdrop style `confetti` draws the source's 22 indexed trajectories with a
fixed stagger, rotation and cubic arrival. It is a finite caption-driven burst
using the approved accents; its settled particles hold. It is not a physical
gravity simulation or a continuous celebration loop. The standard backdrop
heading, caption and one-cue contract apply. All these cumulative additions
still require combined browser/export qualification.

### Native UI and diagram primitives

Steps interfaces accept `micro-badge`, `micro-dropdown`, `micro-modal`,
`micro-tabs`, `micro-tooltip`, `micro-check`, `signup-flow` and `beat-sequence`.
All retain two to four explicit items and one caption cue per item. Badges require
an item `badge` string (eight characters); checks require a strict `checked`
boolean. Tabs limit labels to 14 characters. Signup and beat rows limit bodies to
64 characters and remain visible after entry; other steps show the current item.
These are display-only compositions, with no form fields, submissions or actions.

Social `profile-count` requires the existing label/body/context/action record and
`stat: {"value":"42","label":"Example records"}` on every item. The value is an
explicit string of at most eight characters; its label permits 24. Values, action
text and audience claims are never inferred. Decorative circles depict no people.

Trust adds `avatar-lift`; only decorative initials lift and return. Exact supplied
marks and structured sources remain required. Checklist adds `icon-swap` and
`icon-morph`; an unchecked item never acquires a completion mark. Diagram adds
`separated`, `arc-route`, `offset-traveler` and `tracing-beam`. The engine generates
connector paths between native cards. Arbitrary SVG, coordinates, colors, fonts,
duration and live interaction fields remain rejected.

### Kinetic composition styles

The existing `kinetic` record optionally accepts `style`: `standard`,
`perspective-marquee`, `ticker-takeover`, `shutter-slam` or `camera-follow`. Omitting it preserves
the original composition. Every style keeps two to six explicit single words,
at most 16 characters each, and one native caption cue per word.

- `perspective-marquee` reuses the source 18-degree plane, 900-pixel perspective,
  22-pixel pill gap and linear strip travel. Each cue centers its supplied word;
  the current word must fit completely. Brand font roles and fixed readable type
  replace the demo font and color choices.
- `ticker-takeover` accelerates through the supplied prefix, settles on the
  current word and promotes it into a headline. The source .72 acceleration split,
  quintic release, flash and quartic promotion remain. It creates no extra words,
  default options or claims; the last word remains readable at rest.
- `shutter-slam` assigns the six source beats in order: horizontal travel,
  vertical travel, scale punch, X turn, Y turn and Z turn. With fewer than six
  words, only that prefix is used. Seventeen source-weighted subframe copies
  sample the actual trajectory around the current frame. The content viewport
  clips the intentional motion; exact full-size type and zero ghost copies remain
  at rest. Neither the caption rail nor the whole film is blurred.

Free speed, shutter samples/angles, perspective, fonts, palette and HTML fields
are rejected. These source integrations await combined browser/export qualification.

### Spatial backdrop presets

The same `backdrop` record accepts `three-orbiting-cards`, `three-glass-lens`,
`three-glass-ring`, `three-galaxy` and `three-gallery-tunnel`. It keeps only
`heading`, `caption` and `style`, with exactly two caption cues at least two
seconds apart. The first starts motion; the second starts a 24-frame brake.
The source pose is evaluated from absolute frame time and holds exactly at rest.
The full source traversals are four, five, ten and twelve seconds respectively;
use a longer cue gap for a slower presentation. No speed or scene-code override
is accepted.

Glass headings allow at most 12 characters and are drawn verbatim in the approved
BrandSans face at a fixed 220-pixel texture size. Oversized text fails with a
shortening instruction; it is never shrunk or substituted. The actual transmissive
lens or torus refracts that texture. The exterior heading and caption retain the
normal brand typography and geometry.

These choices share one pinned local Three.js r185 WebGL renderer. The cards
reuse nine solid meshes; the galaxy uses 20,000 seeded points; the tunnel reuses
15 segments with solid tube edges, deterministic tile selection and fog. Native
aspect fitting keeps the authored camera view inside the existing art region.
The rendered art uses the existing approved-palette mapping. Models, image URLs,
external fonts, arbitrary materials and frame callbacks are not exposed. The
tunnel currently adopts the source's empty-image-list color-panel mode.
Source integration is complete for these bounded choices; combined native
browser, resource, reverse-seek and encoded-video qualification is pending.

### Liquid-glass interfaces

Interface `notifications` accepts `variant: "liquid-glass"`; `steps` accepts
`variant: "liquid-widgets"`. Both additionally require `image`, a verified local
still ID. They keep two to four explicit label/body items and one cue per item.
Labels allow 24 characters and bodies 64; normal measured text-fit checks still
apply. The image is contained, never fetched or replaced by source demo artwork.
Every supplied item persists at rest; widget cards do not silently replace prior
items. No automatic counts, statuses, progress values or live controls are added.

The pinned GPU core implements bevel refraction, Gaussian blur, edge highlights
and shadows. Notifications retain the source quartic entry, 14-pixel overshoot
and cubic settle; widgets retain the source quartic rise. Source glass parameter
sets are fixed by the selected variant. Native board geometry, approved fonts
and a brand-colored copy backing replace demo-specific sizes and identities.
Copy appears only after its entire card enters the board, and all motion stops
after the existing 24-frame cue interval.

The adapter uses WebGPU and one local canvas image source. It does not use the
experimental HTML-in-canvas wrapper or expose shader settings. One target set,
separate horizontal/vertical blur uniforms, a reused upload canvas and serialized
capture bound runtime state. GPU errors fail the render without a visual fallback.
The complete candidate still requires combined browser/export qualification.

### Camera-follow composition words

`kinetic.style: "camera-follow"` builds the supplied two-to-six-word phrase in
measured world space. A single camera fits successive prefixes, using the source
aspect-based placement, 0.72 height ratio, 0.07-em gap, 1.36 framing margin and
distance-weighted blur. The final cue includes the source resolve to margin 1.2.
Source bezier control points are evaluated through the existing deterministic
solver; the native 24-frame cue interval owns every move.

The words retain their exact case and the approved BrandSans face at a fixed
90-pixel logical size. Geometric transforms replace source font substitutions;
a 1.1 line box preserves mixed-case glyphs instead of the source uppercase-only
0.78 line box. A phrase whose final effective type would be smaller than 24 pixels
fails with a shortening instruction. At rest, every revealed word is contained
and blur is zero. This is a composition style; the spoken-caption rail is unchanged.

## Canvas backdrops and magnetic swaps

The normal `backdrop` content record accepts five additional `style` values:
`anamorphic-flare`, `mesh-card`, `stop-motion-8`, `stop-motion-10`, `stop-motion-12`.
Keep the required explicit `heading`, `caption` and two ordered caption cues.
Start/settle anchors must be at least two seconds apart for flare/mesh, or three
seconds for stop motion. Existing cue, scene and transition margins still apply.

Flare uses the source seeded emitter field and horizontal high-pass tent streaks.
Mesh retains the source full-frame/card/full-frame mask. Both map the cue clock
to a fixed source interval and brake to rest. Stop motion retains its three-second
throw/landing choreography at the selected cadence, then holds still; it does not
change the output video's 30 fps. Only approved colors and native copy are used.
Seeds, color controls, emitters, free timing, persistent jitter and source exits
are not episode inputs.

The existing `screen` record accepts `swap: "shader-magnetic-pull"` or
`"shader-magnetic-repel"`. Supply two or more verified still IDs in `images`,
one cue per image, `heading`, `caption` and the existing `chrome` choice. The
source Gaussian warp and chromatic sampling operate only inside the contained
image viewport. The existing fixed 24-frame handoff and original DOM endpoints
remain. No HTML capture, external image paths, custom cursor trajectories or
shader parameters are accepted. Spoken captions remain independent.

## Editor compositions and split headlines

The existing `interface` record with `style: "steps"` accepts `variant: "vector-editor"`
or `"sticky-mock"`. Both require two to four explicit `{label, body}` items and
one cue per item. Vector items additionally require `tool: "pen"`, `"shape"` or
`"type"`; their bodies are limited to 72 characters. Sticky-mock bodies are
limited to 64 characters and consecutive cues must be at least two seconds apart
to leave time for entry, readable stillness and exit. Labels retain the existing
24-character cap. These are illustrated interfaces, with no editing controls,
inferred product activity, additional image inputs or episode-supplied paths.

The ordinary `headline` record accepts `swap: "split-panel"`. Each phrase splits
at a whole-word boundary around the incoming panel. Exact spacing, case and
graphemes are preserved. Every phrase must fit one line at the fixed approved
font size; overflowing copy fails with a shortening instruction. The existing
two-to-six phrase limit, one cue per phrase and 24-frame handoff remain.

## Organic canvas fields

`backdrop` additionally accepts `facet-morph` and `soft-blob-touch`, with the same
explicit heading/caption and two caption cues at least two seconds apart. The
first morphs 36 authored facets through three silhouettes. The second animates a
seeded granular field toward a scripted contact, then recovers with bounded
springs. Both brake to a still frame and preserve the approved palette. Shapes,
touch positions, seed, grain count and timing are fixed engine presets, not
episode overrides. No package or GPU runtime is added. These source additions
await the combined native browser and encoded-video qualification.

Optical backdrops retain exactly `heading`, `caption`, and `style`, with two
cues at least two seconds apart. `three-cosmic-orb` uses a fixed ten-second source
clock; `three-rack-focus` uses a six-second focus pull from 1.2m to 80m. Their
output uses the approved palette lookup. `scope-sine`, `scope-square`, and
`scope-triangle` use a six-second synthetic waveform recipe with square grid
divisions. No waveform data, lens settings, free colors, seeds or duration
overrides are accepted. Each source clock decelerates to a fixed final frame.

Additional image handoffs and surfaces:

- `screen` with `swap: clone-wall` requires `word` (1-18 printable characters,
  no whitespace) and 2-3 verified image IDs. Only this swap accepts `word`.
  All existing image/hash/path/caption checks remain mandatory.
- `headline` with `swap: circle-match` requires exactly two explicit phrases;
  all other headline limits and approved type geometry remain unchanged.
- Media surfaces `freeze-paper`, `phone-dive`, and `drift-accent` accept exactly
  `{style}` and retain solo/box/no-camera restrictions. Phone-dive uses one
  verified still, split into three fixed image bands for temporary relative
  motion; the bands rejoin before the final zoomed hold. No measured metrics
  or example dashboard content are added.

All five options are deterministic, bounded by existing native cue envelopes
and pending combined browser/export qualification.

`chart` with `metric_style: count-burst` requires a normal metric record and
exactly two cues: count to its supplied value, then play the fixed 62-shape
burst. The original value remains visible after the burst clears. Currency,
sounds, colors, count limits and particle controls are not inferred or accepted.
The first cue uses a linear count and restores the exact numeric string at rest.

`data-story` with `style: value-lanes` keeps the existing 2-6 periods, one cue
per period, structured source and complete nonnegative numeric series. It accepts
2-6 series. Speed represents each current value divided by the global maximum
across supplied periods; zero is stationary. Markers reflect at fixed lane ends,
so position is not a ranking or an axis value. Rows retain their initial ranking.
Travel is integrated from absolute quantized frame time without resetting at a
period change. No avatar path, fallback data or free speed is accepted. The
insight should explain that speed, rather than position, represents the value.
Both additions remain pending combined native browser/export qualification.

### Spatial object stages

`spatial-stage` requires `heading` (52 characters), `caption` and `source`
(90 characters each), plus a fixed `style` and its payload:

- `exploded-stack`: exactly four `layers`, each with a distinct `label` of up
  to 22 characters and a pinned `icon` ID. Four cues reveal/focus the layers.
  An optional fifth cue collapses the stack and clears its labels. Four cues
  leave the labeled stack open. Native type stays at its fixed approved size;
  shorten labels if geometry QA rejects them.
- `product-turntable`: `image` names one verified local still, fitted without
  cropping onto two faces of the fixed can mockup. Two cues, at least six
  seconds apart, start the turn and bring it to rest over 24 frames. It is a
  label-design mockup, not a reconstruction of an arbitrary product photograph.
- `orbit-card`: `image` names one verified local still, contained on the lower
  face of a card with an open circular aperture. Two cues at least four seconds
  apart drive the saved camera, a complete card revolution and independent dot
  sphere rotation. Source seconds 2.8-6.8 are retained and then held; the original
  off-screen entrance/exit and example text are omitted. The native heading and
  caption carry the copy at their approved size.

Example stack content:

```json
{"style":"exploded-stack","heading":"Four layers","caption":"Internal architecture example.","source":"Supplied diagram","layers":[{"label":"Interface","icon":"code"},{"label":"Gateway","icon":"server"},{"label":"Services","icon":"layers"},{"label":"Data","icon":"database"}]}
```

No model URL/path, custom shader, colors, fonts, turns, camera or timing controls
are accepted. The existing caption, asset path/hash and review gates remain.
The local Three.js runtime loads once when selected; native GPU checks and
exports remain pending the combined qualification.

### Tile headline and media belt

`headline` accepts `swap: "slice-sweep"` with 2-6 supplied phrases, each at most
32 characters and one cue per phrase. Every phrase must also fit one line at the
approved native font size. The build rejects overflow; it never fits or changes
the font. A finite field-driven tile flip runs in the normal 24-frame cue window.
Only cells containing either headline flip; nearby blank cells tilt and lift.
Local WebGL 2 faces and projected shadows use the approved ground. Static holds
use the original DOM text, and a moving surface has no duplicate text behind it.
No shader, font, cursor, color or motion overrides are accepted.

`media-carousel` accepts `preset: "promo-belt"` with 3-12 verified stills. The
existing two-cue contract (at least six seconds apart) drives twelve cards in
two rows. Supplied images repeat in slot order when fewer than twelve are given.
The measured source entry table and 93.601-pixel-per-source-second travel are
retained; image contain-fit replaces the source video crops. The belt finishes
once and holds. Source avatar videos, music, logos, offers and fonts are omitted.
Both choices remain pending combined native and encoded-video qualification.

### Media presentations and headline ticker

The following source additions await the final combined qualification:

- `media-grid`, `treatment: "phone-trio"`: exactly three verified images,
  `layout: "3up"`, two cues. The first introduces the board; the second fans the
  three phone frames into the retained source poses. Existing labels/source apply.
- `media-grid`, `treatment: "album-card"`: one verified image, `layout: "solo"`,
  one cue. Its item additionally requires `detail` (56 characters maximum).
  The title, detail and source arrive in the source order within the native cue.
- `media-grid`, `treatment: "preview-sheet"`: exactly four verified images,
  `layout: "4up"`, two cues at least six seconds apart. The measured card spring
  and thirteen image cuts are retained. The final two cuts follow the second cue,
  then hold. Labels and a truthful image counter replace the source action buttons.
- `lower-third`, `variant: "news-ticker"`: the existing heading, name, role and
  context plus `items`, a list of 2-6 strings (40 characters each, 180 total).
  Name and role are further bounded to 18 and 56 characters. Two cues at least
  six seconds apart drive one traversal, then hold the final item fully in view.
  Items that cannot fit at the approved font size fail the build.

The three media treatments reject camera/surface/HUD combinations. Primary images
remain complete and contain-fitted. The preview sheet also uses a decorative,
darkened copy of the active image behind its card. All content is explicitly
supplied: no sample accounts, metrics, platform marks, live indicators, timestamps,
button approvals, narration or audio tracks are inferred or imported.

`title` also accepts `reveal: "prism-bow"` through the existing one-cue contract.
It retains the source focus entrance, perspective bow and paired color offsets,
using the approved accent colors. The final 15 percent clears blur, tilt and
color ghosts to restore the exact native title. It accepts no extra fields,
font controls, persistent distortion or idle animation.

### Brand lockups and localized image motion

Three additional `cta.style` choices use the existing heading/action/label fields.
Heading and action are each limited to 32 characters:

- `logo-intro` requires two cues. The approved logo and `label` kicker arrive on
  the first cue; heading/action and an arrow replace the kicker on the second.
  Its label is limited to 36 characters. Twelve fixed source background lines
  are decorative and remain still.
- `logo-assemble` requires two cues. Five exhaustive rectangular portions of the
  approved logo retain the source stagger and scale pulse, then restore the
  original whole image. Heading/action/label arrive on the second cue. The
  source Figma paths are not imported. Label is limited to 64 characters.
- `badge-pair` requires one cue and `badges`, a list of one or two records with
  `icon` (pinned library ID), `eyebrow` (24 characters) and `label` (22 characters).
  Equal-size cards enter after the heading. Heading, action, label and all badge
  text are explicit; no store availability, URL or click action is inferred.
  The top-level label is limited to 64 characters. Text must also pass the normal
  fitting gates at the fixed approved type size.

`media-grid/treatment: "steam-window"` requires `layout: "solo"`, one verified
still and two cues at least six seconds apart. `region` is required, with
normalized `x`, `y`, `width`, `height`; each extent is between .05 and .6 and the
whole region must fit inside the image. A feathered procedural steam overlay
uses the source's fourteen deterministic wisps in that region. Ten source seconds
map to the existing native start/settle clock, then hold at the exact initial
phase. This is an illustrative effect over a still, not recovered motion or video
playback. The image remains contain-fitted; other camera/surface/HUD effects and
arbitrary regions on other treatments are rejected. Native qualification is pending.

### Statistic cards and declining data

The existing metric record accepts `grid-stat`, `soft-stat`, `sticker-stat` and
`rail-stat` in `metric_style`, with one caption cue. These present the supplied
value directly; they do not invent a count, percentage or survey result. Labels
are limited to 24 characters, context to 52, units to 12 (8 for `soft-stat`),
and numeric text to seven characters (four for `soft-stat`). Approved fonts and
normal fit checks remain authoritative; no automatic type shrinking is added.

`data-story` also accepts `style: decline`: one supplied series, two to six
periods, nonnegative nonincreasing values and a lower final value. Every period
requires its normal caption cue. Actual data points replace the source's
decorative curve. The plot background dims with the measured drop; labels,
brand elements, captions and structured source records retain their contracts.

### Text selection and collaborator cursors

`interface` accepts `style: notes, variant: text-select`. Each of two to four
items supplies `label`, `body` and `selection`, with one caption cue per item.
The selected phrase must occur exactly once in that body's literal text, contain
1-40 characters and have no surrounding whitespace. The renderer also rejects
partial Unicode graphemes. It animates the arrow-to-I-beam change, measured text
selection, floating toolbar and Bold click using the existing frame clock.
The existing approved 600/800 font weights replace source font choices; labels
and body retain their 24/72-character limits. The cursor physically exits after
the action. Copy, colors, geometry, captions and the review gate remain bounded.

`media-grid` accepts `layout: solo, treatment: collaborators`, one verified local
image and `actors`: two to six explicit, case-insensitively distinct labels of
1-8 characters, without surrounding whitespace. Two cues drive entry/convergence
and physical exit. Names travel rigidly with their pointers; fixed label sides
keep the six names separated in compact formats. This is illustrated activity,
not a connection to collaborators or evidence of actual product usage. Camera,
surface, HUD, remote assets, arbitrary paths and automatic names are rejected.
Both additions await combined native/browser and encoded-video qualification.

### Ranked answer insertion

`interface` accepts `style: steps, variant: answer-rank`. Supply `heading`,
`source`, `prompt` (up to 64 characters), `lead` (up to 36), `rank` (integer
1-3) and exactly four `items` with distinct `label` values (up to 24) and
`body` descriptions (up to 40). Labels cannot have surrounding whitespace.
Items 1-3 form the initial ordering; item 4 is inserted at the explicit rank.
The displaced last item leaves. No ordering is inferred from claims or values.

Exactly four caption cues drive the question, lead, initial ranking and
insertion. Copy is literal display text; HTML, colors, fonts, URLs and timing
callbacks are not accepted. Name initials are descriptive badges, not imported
brand logos. Fit checks remain authoritative and never shrink approved type.
The source-specific animation is integrated; combined native/browser and
encoded-video qualification remains pending.

### Scrolling document notes

`interface` accepts `style: notes, variant: note-scroll`. Keep the normal
`heading` and `source`, supply `title` (up to 52 characters), and use `items`
as two to seven literal strings (up to 52 characters each). This string-list
shape and seven-item limit apply only to this variant; other interface records
retain their existing object schema and limits. No blank line, fallback copy,
HTML, keyboard configuration or timing/style controls are accepted.

Each line requires one caption cue. Successive cues must be at least two
seconds apart; exact decimal comparison preserves that boundary without an
epsilon. Typing occupies the normal 24-frame phase. Before a new lower paragraph,
the source's measured scroll table moves the document and its caret. Approved
40-pixel title and 28-pixel body fonts stay fixed. Body text may wrap to two
40-pixel lines; normal fit checks reject overflow. Content leaving the clipped
document viewport is hidden deliberately, while its literal text is retained.
Native/browser and encoded-video qualification remain pending.

### Compound title wipe and freeze cut

A standard `title` accepts `reveal: "colorama-wipe"` with the existing kicker,
title and subtitle fields. The effect uses approved font measurements per line,
a tilted feather mask, five blur levels and a brand-color lookup. It settles
to the exact native white title after the existing 24-frame entrance. No palette,
font, shader, canvas scale or timing override is accepted. Markers and designed
title layouts retain their existing separate contracts.

A `screen` accepts `swap: "beat-freeze"` with two or three verified local stills.
Each change after the first image lasts 69 frames (2.3 seconds), starting at its
caption cue plus the existing delay. A ramp leads into a held image, exposure
pulse and a single hard swap during the stretched/blurred connector. The new
image settles to its complete original bounds. The validator requires every
69-frame window to finish before the next change and the scene exit margin.
The first image uses the ordinary entrance. This option does not detect music
beats or modify captions, narration, logo or surrounding brand geometry.

### Filmed-screen focus lens

A `screen` with one verified still and the existing one to three `focus` regions
can set `lens: "filmed"`. The ordinary heading, caption, chrome, region labels
and caption cues remain required. The lens cannot combine with `swap`; custom
shaders, callbacks, colors, camera vectors and optical strengths are rejected.
Existing region containment, zoom and caption timing limits remain enforced.

The lens glides to each region in the normal 24-frame window. The source
12-sample Hann rack transfers focus over nine frames. Approved background fills
outside the screenshot. The shader retains true-color mode and fixed optics;
film texture stops advancing once the camera settles. Focus labels, logo and
spoken captions stay in the native layout. Explicit lens selection requires
local WebGL2 and fails on compilation, allocation or context errors. It never
substitutes a plain capture or downloads a runtime. Browser and encoded-video
qualification is pending for this development addition.
# Conversation exchange variants

Production `interface` scenes with `style: "chat"` now accept three additional
closed `variant` values. All retain `heading` (52 characters), `source` (70),
and explicit `items` containing `label` (24), `body`, and `side` (`sent` or
`received`). No default account, answer, table value or activity claim is inferred.

| Variant | Required content | Caption cues |
| --- | --- | --- |
| `answer-stream` | One sent prompt and 1-3 received paragraphs; `table` with three `headers` (18 characters each) and 2-4 `rows`, each an array of three literal cells (32 each) | One per message, then one per table row |
| `research-stream` | One sent prompt and 1-3 received paragraphs; `activity` with two explicit `steps` and one `summary` (32 characters each) | Prompt, activity group, then each answer paragraph |
| `message-thread` | 2-12 messages with explicit sides; each may additionally reference an `image` from the verified local assets | One per message |

Sent prompts and message-thread bodies allow 72 characters; streamed received
paragraphs allow 160. The existing image import, hash, safe-path and unused-asset
checks apply to message cards. Images are contained in their card, never cropped.
The existing `typing_indicator` override is rejected for these variants because
they own a finite typing/send sequence.

Each cue must leave 60 actual capture frames before the next cue, including the
normal 0.4-second visual delay, or before the scene's 0.4-second exit margin.
The contract checks rounded frame boundaries, not just approximate seconds.
Text is measured with the approved fonts; excessive native geometry fails rather
than shrinking text. The viewport follows the latest message or table row; older
content scrolls out of view. All four composition profiles use the same records.

These are visual illustrations of supplied conversations and activity. They do
not call models, search websites or send messages. Source phone chrome, keyboards,
brand marks, demo endorsements and end cards are not imported. New variants remain
pending combined native/browser/export qualification.
## Organic vector backdrop

`backdrop` with `style: "gooey-split"` keeps the existing closed `heading` and
`caption` fields. Two caption cues select the start and settle points, at least
150 actual capture frames apart. The original 4.7-second split/spin/merge sequence
maps to this interval and the normal 24-frame deceleration. It ends at one still
dot. The approved channel logo, fonts and captions are unaffected.

The composition retains the three authored trajectories, curved blade paths,
28-unit SVG blur, alpha threshold and 17 shutter boundary samples. The shutter
samples one native 30 fps frame along the actual retimed trajectories. It returns
to a crisp original when movement falls below the source deadband. All marks use
the approved accent against the approved background; this decorative geometry
does not replace the channel identity. No free path, color, sample count, shutter,
filter or frame-rate override is accepted.

The vector renderer uses local browser SVG/CSS and the existing cue clock and
cubic-bezier helper. It does not load GSAP, a GPU library, external assets, runtime
polling or timeline hooks. Source/math/contract checks passed; native SVG blending,
filtered pixels, reverse-raster parity and final exports remain unqualified.
## Promotional typography layouts

The `title` composition accepts `layout: promo-hook`, `promo-grid`, `promo-offset`,
`promo-pair`, or `promo-close`. The existing `kicker`, `title`, and `subtitle` fields
remain required. These layouts limit title text to 32 characters and subtitle text
to 60, use one cue, and own their entrance; custom reveals, markers, fonts, colors,
HTML and timing controls remain invalid. Typography uses the existing native brand
roles, without shrinking to fit. Final text geometry remains a browser gate.

`kinetic` accepts `style: glyph-build` with exactly three supplied single-word
labels, each at most 12 characters, and three caption cues. A ring/diamond rotates,
a rounded tile wipes, and a triangle draws three lines. Each item arrives on its
own cue and remains visible after settling. Portrait output stacks the items;
the other three profiles use three columns.

These are reusable adaptations of the six `kinetic-type` example scenes, selected
independently in ordinary episodes. The native 24-frame cue envelope retimes their
entry curves. Original example copy, remote footage/audio, fonts, absolute master
scene timings and terminal blackout are omitted. Existing scene seams own exits;
the source diamond's repeated restart is replaced by one finite half-turn.
Combined native-layout, reverse-seek and encoded-video qualification is pending.

## Product canvas and logo collision

`interface` with `style: steps` and `variant: product-canvas` requires the normal
heading/source and exactly three `items` (label14/body28), plus:
- `hero`: title24, body44, action18.
- `actors`: exactly three distinct supplied names, maximum18 characters each.
- `comment`: text60 and an explicit boolean `resolved`.

All text is supplied by the episode. The interface is an illustration, with no
live controls or executed commands. Two caption anchors drive the sequence;
they must be at least12 seconds and360 native frames apart, followed by24 full
settling frames before the existing scene-exit margin. The shared clock retimes
11.9 source seconds. Native geometry stacks cards in portrait and uses a row in
the other profiles. Fixed font roles remain subject to normal overflow checks;
a valid character count does not imply every string fits.

The source frame entrance, UI staging, selection handles, comment type-on,
asset drawer, drag/reflow, three-card stamping and explicit resolution remain.
Pointer targets are measured, the interrupted source cursor tween is continuous,
and action landings align with selection/comment/pick/drop events. Pointers enter
and leave physically. The source tiny type, fake1440/900 dimensions, unprovided
claims and automatic resolved state are replaced; displayed frame dimensions
are the actual native illustration dimensions.

`cta/style: logo-collide` uses the existing heading/action/label fields and two
cues. Five clipped strips of the approved logo converge on the original five
vectors with0.05-second stagger and0.6-second back easing. A ring and finite
pulse follow; the second cue runs the source scale-down exit. The fixed channel
logo remains unchanged. `logo-assemble` already covers the example outro's
right-to-left pieces, overlapping expand/return, glow and supplied closing copy.
No source Figma marks, palettes, fonts, captions, URLs or master timeline are imported.
Combined browser/export qualification remains pending.

The `cta/character-walk` record requires exactly `heading`, `action`, `label`
and `style` in content. Bounds are 28/40/64 characters respectively; normal text
fitting can still reject copy at the approved size. Exactly two caption cues
must be separated by at least eight seconds and 240 actual 30 fps frames. The
second cue needs 24 settling frames before the final 0.4-second seam. The optional
illustration is pinned source geometry/keyframes, with native brand color roles;
JSON/Lottie paths, scripts, expressions, custom colors/fonts and media URLs are
not episode inputs. The source 7.5-second choreography maps to the shared cue
clock and holds frame 224 after settling. It does not loop during long holds.

The `interface/steps/app-install` content allows only the normal heading/source
plus `items`, `selected`, `ui`, `detail`, `style` and `variant`. It requires eight
items with label/body limits of 12/22 characters and verified local icon IDs.
`selected` is an integer 0-7 (booleans rejected). UI title/query/get/open/ready
limits are 14/22/8/8/18; detail body is at most 48 characters. Three explicit
facts each have label/value limits of 8/8. Existing font fitting can still reject
copy within those length limits. No implicit ratings or application claims are
inserted. Two caption anchors need seven seconds and 210 native frames between
them, plus 24 settling frames before the scene seam. Source choreography lasts
6.28 seconds on the shared clock. The percentage is illustrative gauge state,
not an observed download metric. Narration and caption contracts are unchanged.

### Creator intro (`cta/creator-intro`)

This closed CTA record requires `heading`, `action`, `label`, `style`, `prompt`
and `profile`; `badges` and arbitrary extra fields are rejected. Its supplied text
limits and ordinary CLI use are documented in [CLI](CLI.md#creator-introduction-composition).
`profile.image` must name an asset already accepted by the existing local still
path/hash/size checks and counts toward the no-unused-assets rule. Neither a
profile URL nor executable action is part of this schema. The before/after labels
must differ, and the illustrated state is not evidence of a real follow operation.

The two ordered caption anchors need at least 12.0 seconds and 360 capture frames
between them. The final anchor needs 24 settling frames before the existing
0.4-second scene exit margin. The source's 11.76-second finite sequence uses the
shared deterministic presentation clock and then holds its final profile. All
four native formats keep approved fonts, palette, channel logo and caption slots.
Camera magnification/translation is bounded against the entire UI panel envelope;
compact formats use less magnification, never a smaller base font. Cursor target
centers come from measured DOM geometry. Source example identities, marks and
audio are outside this record. Geometry or font overflow remains a hard failure.

### Cursor-ray composition (`cta/cursor-rays`)

The closed record requires `heading`, `action`, `support`, `finale`, `label` and
`style`. Its copy limits are in [CLI](CLI.md#cursor-ray-logo-and-headline-composition).
No image path, custom font, palette, shader, sample count or timing override is
accepted. Exactly two caption anchors need 8.0 seconds and 240 native capture
frames of separation, followed by 24 settling frames before the existing
0.4-second exit margin. The shared frame clock evaluates the finite eight-second
source choreography and holds the final supplied title.

For this style only, asset installation receives the selected private brand root
and implementation-lock hash from the normal workflow. `branding.verified` checks
the existing approval. The copied `assets/logo.png` must match that approval,
be a regular contained PNG, contain at most 20,000,000 bytes and measure 1-4096
pixels per dimension. The shader bundle embeds those checked bytes together
with any existing verified still textures, using exclusive creation. The brand
files and approval record are never rewritten. Existing still-only callers do
not require a logo or gain permission to read another asset. The browser uses
the existing verified data-URI decoder without changing file-origin protections.

### Halftone field

`backdrop` supports `style: "halftone-field"` with the existing `heading` (52
characters maximum) and `caption` (100 maximum). Exactly two cue indices are
required; their starts must differ by at least two seconds and 60 capture
frames. The normal beat/transition clearance is unchanged.

The source frequency, speed, cell size, gamma and bias are fixed engine values.
Four source palette stops become approved secondary, accent, background and
background. The analytic shader runs from source time zero to ten seconds
through the shared cue clock and stops after 24 settling frames. Arbitrary
parameters, colors, shader text, seeds and URLs are rejected. WebGL failure
is an error; no blank fallback or replacement effect is used.

### UI depth reveal contract

`interface/steps/ui-3d-reveal` is a separate closed content record without `items`.
Only these fields are accepted: heading (28), source (64), style, variant, image ID,
layers (3-9 strings of at most 16 characters), selected (integer index, not boolean),
properties (exactly three label (12) / value (14) records), selection, tagline (32) and
action (22). Selection has numeric normalized x/y/width/height, width and height at
least 0.08, and must remain inside the screenshot. Existing safe-path, still-file,
hash, decoder and unused-asset checks apply.

Exactly two cues are required, separated by at least 13 seconds and 390 captured
frames. The second cue leaves24 settling frames before the existing transition
window. The shared absolute frame clock maps to a 12.3-second authored sequence,
then holds the complete closing copy. No free camera, CSS, font, logo, URL, shader
or executable control fields are accepted. The approved PNG supplies logo pieces;
its bytes and aspect ratio are retained. Normal scene transitions own the end
boundary, so the source's terminal black overlay is intentionally omitted.

### Liquid panel transition

The closed content record for interface/steps/liquid-panels accepts only heading
(28 characters), source (64), style, variant and images. Images must contain
exactly two distinct IDs of verified local PNG/JPEG stills. Existing path, size,
hash, decoder, unused-asset and no-overwrite checks remain authoritative.

Exactly three cues drive start, mix and settle. The first interval is at least
five seconds and 150 captured frames; the second is at least seven seconds and
210 frames. The last cue leaves 24 settling frames before the existing 0.4-second
exit margin. The source twelve-second timeline then holds its final state.
Arbitrary wave, camera, shader, color, font, HTML and URL fields are rejected.

The existing pinned Three.js r185 runtime renders the source 100-by-60-segment
plane, wave/ripple displacement, camera tilt and two-texture crossfade. Complete
stills fit each native canvas. A bounded camera keeps the displaced sheet inside
the content slot. Only the source highlight color changes to the approved
secondary; the original optical vignette remains. Image bytes are not modified.
One shared renderer owns one active geometry and two textures, disposing them
on replacement. Shader/context failures remain errors, with no blank fallback.

### Grade comparison contract

The closed `media-grid/solo/grade-split` record requires heading (28), source
(90), exactly one verified image/label item (label 22), and the four-field grade
record documented in [CLI](CLI.md#grade-comparison-composition). Boolean or
fractional split values, unknown keys/looks/edges, non-boolean labels and
incompatible media effects are rejected. The existing local PNG/JPEG path,
size, hash, decoder, unused-asset and exclusive-write gates remain unchanged.

Two ordered cues need six seconds and 180 frames of separation. The second cue
must leave 24 settling frames before the existing 0.4-second exit margin. A
shared absolute-frame clock maps these anchors to the six-second source sequence.
The engine retains the source comparison hold, Bezier wipe, edge, tag and scale
curves, followed by a final rest. Both layers contain-fit the identical still.

Only verified image pixels receive the closed primary/grain/vignette operations.
Brand text, logo, background and captions retain their approved colors and fonts.
One shared WebGL renderer reuses one texture; failures remain errors. No LUT,
custom shader, grading parameters, URL, font or executable controls are accepted.
The "before" layer is explicitly labeled Flat preview because the source applies
a flat grade to it. It is not an untouched-input comparison.

### Portal panel contract

The closed `interface/steps/portal-panels` record uses the same two-image
input contract as liquid panels, with exactly two cue indices instead of three.
Its fields and copy limits appear in [CLI](CLI.md#portal-panel-composition).
Existing identifier, contained path, file type/size, hash, decode, unused-asset
and exclusive-write gates remain authoritative. Unknown camera, intensity,
palette, shader, HTML and URL fields are rejected.

Cue starts must be separated by ten seconds and 300 frames. The final cue leaves
24 settling frames before the existing 0.4-second scene exit margin. The shared
absolute clock evaluates the source ten-second sequence and holds its result.
The original radius, energy, distortion, chromatic strength, edge width and
camera curves are retained. Two native planes preserve the original frustum
scaling; the back plane includes its depth offset to retain exact final fit.
The source radius must cover the native canvas diagonal; unsupported extreme
aspect ratios fail rather than exposing an incomplete transition.

The retained noise/ring shader uses native aspect and approved secondary/accent
colors with white sparks. Four descending smoothsteps become mathematically
equivalent defined ascending forms. Two verified stills replace upstream HTML
capture, foreign website branding and example claims. One existing Three.js r185
renderer owns two geometries/textures and disposes them when inputs change.

For portal panels, the second cue reveals the supplied source attribution as
the image settles. The source fixed radius is retained across native aspects.

### Shatter panel contract

The closed `interface/steps/shatter-panels` record uses two distinct verified
still IDs and exactly two cue indices. Copy limits and timing are documented
in [CLI](CLI.md#shatter-panel-composition). Existing path, type, dimensions,
hash, unused-asset and exclusive-write checks remain authoritative. Custom
HTML, URL, camera, font, shader, palette, physics or intensity fields fail.

The source twelve-second sequence uses the shared absolute-frame clock and
24-frame final deceleration. Source cracking occupies seconds 2-4; fragments
then separate while the second image fades in over 1.5 seconds. Fragments fade
out from seconds 10-12. Timing remains relative to the two caption anchors.

The retained seed-42 generator creates 200 cells with 32 radial samples each.
This is the source radial Voronoi approximation, not an exact tessellation.
Its small gaps and actual panel-origin rotation are retained; the source's
centroid-pivot assignment was overwritten by its own final position assignment.
Physics is recomputed at fixed 1/30-second steps, with the original gravity,
floor, damping and friction, so backward seeks do not accumulate state.

The existing Three.js r185 renderer owns two textures and 202 geometries and
disposes them on replacement. Shader cracks use the approved secondary color;
two descending smoothsteps become defined ascending equivalents. Invisible
terminal fragments are not drawn. Context/shader failure stops the render.

### Glass parallax contract

The closed `interface/steps/glass-parallax` record accepts heading, source, style,
variant and one verified local still ID. It has two cue indices and no arbitrary
camera, physics, effect, font, palette, URL, shader or HTML controls. The ordinary
image path/hash/decoder/dimension and exclusive-write gates remain authoritative.
See [CLI](CLI.md#glass-parallax-composition) for timing and copy limits.

Seed 5297, a 9-by-6 grid and exact polygon clipping define 54 glass cells. Native
aspect scales the horizontal layout, camera and reveal path. Source extrusion,
bevel, material thickness/refraction, three edge layers and deterministic
parallax formulas remain. The twenty-second choreography ends at finite rest
through the shared cue clock; it does not continue an idle loop.

The existing Three.js r185 renderer uses a procedural reflection environment,
physical transmission, the official r185 five-mip bloom and source grain. Final
color-space/tone conversion is explicit for the current runtime. The upstream
HTML capture and fixed sample copy are replaced with a padded verified still.
One renderer disposes all image, environment, geometry, material and postprocess
resources on replacement. Native callers pass absolute time; no composer timer,
remote script or package installation is involved.

## Approved-font extruded titles

Version 3 `spatial-stage` records accept `style: "extruded-logo"` with exactly
`heading`, `caption`, `source`, `word` and `finish`. `word` retains its supplied
case and uses 1-8 NFC characters: basic Latin, accented Latin letters and interior
spaces. The approved display font must contain every glyph; substitution and
truncation are rejected. `finish` is `chrome`, `accent-metal` or `matte`; the
metal accent uses the approved primary color. Two native cues, at least five
seconds apart, drive the original letter flips and word swing before a still hold.

The normal build/export path verifies the brand and copied display-font hashes,
then extracts curves, counters and advances from a static face through the already-qualified Swift
runtime and CoreText. Variable fonts are rejected until their axes are qualified
against the approved browser face. It never installs or globally registers a font. A bounded
outline bundle belongs only to the private run. No episode font path, URL, model,
shader or material parameters are accepted. All four formats retain their native
caption and brand geometry. Final cumulative export qualification remains pending.

### Approved-font wireframe portal

Version 3 `spatial-stage` accepts `style: "wireframe-portal-title"` with exactly
`heading`, `caption`, `source`, `word` and `phrase`. Limits are 36 characters for
the supporting heading, 48 for the supporting caption, 90 for attribution,
18 for the initial word/title and 48 for the replacement phrase. Portal copy
uses the same NFC Latin repertoire as extruded type, with single interior spaces
and exact supplied case. Missing glyphs and copy that exceeds readable geometry
fail; text is never truncated or replaced. The caption anchors must be at least
eight seconds apart. No caller-supplied camera, font, color, shader or timing
parameters are accepted.

The original flat-card entrance, starburst opening, outlined letter extrusion,
identity/proximity handoff, receding supporting lines, forward camera rush and
empty closing plate use the native caption clock. The dark brand background
replaces the source's white plate. The logo, spoken captions and source attribution
remain in their established native positions. Supporting portal copy uses the
approved display face, matching the letterform geometry; it is part of the title
composition, separate from the spoken-caption rail.

An opt-in `--nonzero` extraction mode normalizes overlapping font contours through
existing CoreGraphics on macOS 13 or newer. It writes a separate private
`production-portal-outlines.js` bundle, after the same approval, copied-font hash,
path, repertoire and complexity checks. The previous extruded-title extraction
is unchanged. No font registration, Clipper dependency or runtime download is
needed. Existing local Three.js owns the actual meshes and ordered render targets;
screen-space outlines retain the source 1.5px title width and 1.05px supporting
width. Native source fitting preserves the composition in all four formats;
undersized or colliding copy is rejected. Cumulative audio/export qualification
remains separate from native scene checks.

### Approved-font canopy titles

Version 3 `spatial-stage` accepts `style: "canopy-part-title"` with exactly
`heading`, `caption`, `source`, `surface` and `normal`. The two distinct titles
retain supplied case, use NFC Latin copy with single interior spaces and contain
at most 24 characters each. Attribution allows 90 characters. Both texture fields
must name distinct verified local still assets; URLs, arbitrary paths, cameras,
shaders, fonts and leaf parameters are not accepted.

Two caption anchors at least twelve seconds apart bound the animation. The native
clock maps the source's active 0–10.5 second interval to those anchors plus the
existing 24-frame settling period, then holds its final image. This preserves the
source sweep, lift, focus changes and two title wipes without idle filler. Exact
supplied titles use the approved display face through the existing private
normalized outline bundle; no substitute face or font download is used. Titles
that cannot fit their board at 44px or larger fail rather than being truncated.

The local Three.js renderer handles 340 seeded leaves, five material species,
alpha-aware shadows/depth, 41-sample bokeh and sharp title compositing. Native
aspect fitting contains the titles and positions leaf arrivals outside each
frame. Brand/logo geometry, source attribution, spoken captions and review gates
remain unchanged. Original photographic examples are excluded from public source;
operators supply their own authorized color and normal-map stills. Cumulative
workflow/audio/export qualification remains pending.

### Approved-font cuboid carousel

`spatial-stage` with `style: "cuboid-carousel"` accepts exactly `heading` (52),
`caption` (90), `source` (90), `cards` and `hero`. Parenthesized numbers are
maximum character counts. Use 1-12 explicit cards and a one-based integer `hero`
within that array. Each card has exactly `category` (18), `title` (48), and
`pills` (one or two strings, each at most 12 characters). Card copy uses the
existing NFC Latin repertoire, whole words and single spaces. The complete
title and pills must fit their readable face; length-valid overflow still fails.

Two caption cues control arrival and departure. Actual visual onset frames,
including the existing 0.4-second beat delay, must be at least 150 frames apart.
The second onset needs 50 further frames before the 0.4-second scene exit margin.
The native clock preserves the full source departure instead of compressing it
into the generic settle period. Saved motion repeats cards through 18 tiles;
the selected hero always carries the corresponding supplied card.

The approved `BrandSans` display/body faces paint local card textures. There are
no caller font, palette, camera, shader, URL or HTML inputs. The saved camera and
beveled geometry are retained with a fixed native lens fit and a stable readable
hold. Titles must remain at least 28px and other card text at least 14px in the
native hold. Logos, spoken captions and the publication review gate are unchanged.
Native four-format qualification is separate from cumulative encoded exports.

### Paired device review

`spatial-stage` with `style: "device-review"` accepts exactly `heading` (52),
`caption` (90), `source` (90), `phone` and `laptop`. Both image fields must identify
distinct verified local assets. Two caption cues must be at least fifteen seconds
apart; the normal settle and exit margins still apply. The normal compiler loads
the pinned device resources only when this style is selected.

The retained source sequence moves from the phone to the laptop and then a paired
turntable, with the original six lens shapes. Screens use the supplied image pixels;
tall screenshots scroll only inside their available height, and shorter images are
centered. The source 34-degree lens and hero shots are retained. During the paired
reveal, the camera pulls back smoothly enough to contain the closing orbit in each
format. Hardware hues use the approved palette; headings, logo and spoken captions
retain their existing brand contracts. Source demo statistics, app icons and copy
are not imported.

The two embedded models are fixed engine resources. Episode input cannot provide
GLB files, loaders, model URLs, camera code, fonts or arbitrary shaders. See
[asset rights](LICENSING.md#embedded-device-models) before distributing these
resources. Native checks and cumulative encoded-video qualification are separate.

### Device glass compositions

`spatial-stage/phone-glass` and `spatial-stage/desktop-glass` require `heading`
(52 characters), `caption` (90), `source` (90), `style` and one verified local
`image` asset ID. Two caption anchors must be at least fifteen seconds apart,
with the normal settling and scene-exit margins. Both use the pinned device
geometry, source camera and a complete-image screen fit.

Phone content additionally requires exactly three `notifications`. Each has
exactly `icon` (a pinned native icon ID), `title` (20), `time` (8) and `body` (60).
Desktop content requires one `notification` with that shape and a `desktop`
object with these exact fields:

- `menu`: `app` (16), six `items` (8 each), `status` (42).
- `window`: `title` (30), six `sidebar` records with `label` (12) and `icon`,
  eight `files` with `label` (14) and `kind` (`folder` or `document`).
- `calendar`: integer `year` (1900-2100), `month` and `day`; a valid explicit date.
- `status`: `label` (18), `value` (5), `detail` (22), `note` (22).
- `media`: `title` (16), `detail` (20).
- `dock`: nine pinned native icon IDs.

The calendar uses UTC arithmetic on the supplied date, never the current clock.
Notifications retain the source glass panels, arrival geometry and easing;
desktop overlays retain the menu, widgets, file window, toast and dock. The
approved BrandSans 600/800 faces must actually be loaded. Copy must fit its fixed
slot; bodies may wrap to two lines. It fails instead of shrinking or truncating.
Screen images and icons are verified before drawing; source demo accounts,
wallpapers, product icons and example claims are excluded. No episode-supplied
model, font, URL, shader or camera code is accepted. Existing brand, caption and
human-review gates apply. Model distribution rights remain subject to the
[embedded model notice](LICENSING.md#embedded-device-models).
