# Cinema direction

[Documentation](README.md)

The optional v3 `cinema` family offers diagram and photographic modes without
the shared slide grid. Its five diagram layouts are `opening`, `prediction`,
`contrast`, `verification`, and `closing`. The content contract contains `layout`,
`kicker`, two `headline` lines, `note`, and three
`labels`. Two real caption cue anchors are required per scene.

Select a separately approved private demo identity with a dark `background`,
contrasting `accent`, and light `secondary` color. All fonts still come from the
private workspace. No channel-specific identity is built into the renderer.
Text sits inside orbital fields, branch diagrams, broken connections, and
inspection paths instead of a fixed title-and-card grid. The composition uses
a small demo identifier, edge progress and sentence-case caption overlays.
Native SVG graphics use the normal deterministic clock and measured bounds.
No episode may supply CSS, SVG, HTML, script, network URLs or unverified images.

Diagram cinema supports 1920x1080; photographic cinema also supports 1080x1920.
All scenes in a cinema film must use this family; portrait requires photographic
scenes throughout. Mixing incompatible frame geometry is rejected. Legacy compositions
and approved workspaces keep their existing behavior. This is an opt-in engine
feature, not an automatic replacement of an approved channel identity.

The normal `new --format landscape --storyboard ...`, `validate`, `build`, and
`render` commands apply. Brand and implementation hashes, local asset hashes,
caption timing, forward/backward seeks, text collisions, audio correlation and
decoded-frame checks remain active. A technical pass does not approve the art
direction or voice; final outputs remain under human review.

For local Spanish narration, `tools/voice.py` now accepts `ef_dora`, `em_alex`,
and `em_santa`, using the existing pinned Kokoro model and `es` phonemization.
No install or download occurs. The `tools/neural_timing.py` helper accepts native
phoneme intervals only when space-delimited groups correspond one-to-one to
script words. Ambiguous expansions and invalid intervals fail rather than
inventing word durations. It does not replace listening or transcription review.

Validation: targeted cinema/voice contract tests, normal full-suite checks and
the private rendered film receipt record the scope of each qualification.
Portrait diagram layouts, square/feed cinema and a general neural-timing CLI are deferred.

## Photographic sequence

`cinema` also accepts `layout: "photographic"` and a `shots` array of 2-24
shots. Each shot has exactly `image`, `from`, `to`, `seam`, and `title`.
Images are IDs from the existing hash-verified local PNG/JPEG asset manifest.
Camera poses are `[zoom, horizontalFocus, verticalFocus]`: zoom is 1-2.8 and
both focus values are 0-1. The renderer computes a covering crop for the image's
real aspect ratio. No arbitrary transforms, depth maps, URLs or scripts are accepted.

The scene needs one ordered caption cue per shot, starting at `first_cue`.
Cuts use the existing 0.4-second visual beat offset. Shots must retain at least
1.5 seconds before the following cut or scene exit. `cut` is an editorial cut;
`focus` defocuses around the cut; `occlude` carries a dark foreground obstruction
across it. Camera travel ramps smoothly into a sustained move and settles before
the next shot. The artist supplies compatible focal positions for match cuts.
Short titles (up to 32 characters, or an empty string) appear briefly over a
contrast shade. Narration, captions, brand assets and publication gates are unchanged.

This is a 2.5D still-image montage with deterministic depth-layered atmosphere,
not generated video or reconstructed 3D geometry. All asset and motion inputs
remain reusable through the normal storyboard/new/build/render pipeline.
Use `new --format portrait --storyboard ...` for a 1080x1920 Short or
`--format landscape` for 1920x1080. Supply a matching thumbnail graphic and
reframe each shot's focus/zoom for the destination crop; the engine preserves
the source aspect ratio and fills the frame. Titles reflow below the subject,
with larger sentence-case captions over the full-bleed image. The caption box
does not crop or shift the photography. Cue timing and narration are unchanged.
`compositions` lists the photographic formats separately from the five
landscape-only diagram layouts. Square and 4:5 photographic cinema remain gated.

Checks cover closed content, verified asset references, edit timing, crop coverage,
camera ramp continuity, cut selection, reverse seeks, native browser geometry,
source audio correlation and decoded export frames. Technical approval remains
separate from human review of the cinematic result.
