# Workflow and Contracts

[Docs index](README.md) · [First Short](FIRST-SHORT.md) · [Data reference](DATA-CONTRACTS.md)

## State Transitions

`onboarding -> brand preview -> explicit approval -> runtime qualification ->
audio intake -> timed transcript -> caption review -> episode draft -> validation
-> visual build -> render -> human review -> manual publication`

No state implies publishing approval. Brand approval only locks the brand/template;
it is not approval of future scripts or transcripts. There is no automatic upload.

## Fixed and Variable

Fixed v1: 1080x1920, 30 fps, 3-4 scenes, 180-second Shorts maximum, layout geometry,
motion engine, logo/progress/caption zones, two-line thumbnail heading and output
checks. Rounded panels use an 8-pixel radius at full resolution.

Per brand: name, local logo/fonts, dark background, primary/secondary accents,
language and default scene count. The dark style is intentional; white text needs
at least 7:1 background contrast, and the accents need 4.5:1. Light themes are not
implemented. Thumbnails use a black type zone with the same accent and logo.

Per episode: source narration, graphic, exact transcript, word-timed captions,
3-4 layout selections, text/code slots, motion timings and YouTube metadata.
An episode cannot override CSS, inject HTML or select executable tools.

Opt-in episode version 2 adds bounded visual records and `visual-library` scenes
for charts and widgets. It retains the v1 template geometry and existing
audio/caption rules. See the [adapter contract](VISUAL-ADAPTER-CONTRACT.md) before
authoring these records; check B03 qualification for charts and motion presets.

## Layouts

Run `python3 ysc.py layouts`. Each JSON under `templates/v1/scenes/` has a frozen
HTML tree, required `content_keys`, allowed `motion_keys` and an editable-copy
example. Keep the layout's exact slot names. Copy an example when changing layout;
do not reuse the previous layout's keys.

`first_cue` is a zero-based caption index. Anchors must increase; the first is zero.
The first scene starts at zero, later scenes at their first caption's timestamp.
`enter` is seconds since scene start. `active` is `[start,end]`; `fill` and `travel`
are `[start,duration]`. Motion must end within its own scene.

The same renderer handles forward capture and backward seeking. Do not remove
the capture-only paint-cache reset: otherwise Chromium can rasterize shadows
differently depending on the previous viewport/seek history.

## Audio and Captions

Use the complete authorized recording, not an arbitrary 90-second target. The
180-second ceiling follows [YouTube's three-minute Shorts format](https://support.google.com/youtube/answer/15424877?hl=en)
(checked 2026-09-15). Longer recordings are rejected with no automatic trimming or
speed change; ordinary long-form video is not implemented by this Shorts profile.
For a longer Short, anchor scenes to meaningful spoken sections and keep captions
word-timed. Do not add more on-screen text merely to fill its running time.

Transcript JSON requires `duration`, `audio_sha256`, and ordered `words` with
`text`, `start`, `end`. Times are seconds against the original recording, not
estimates based on script length. The source hash is the SHA-256 of audio bytes.

Caption JSON requires `duration` (rounded up to a whole 30 fps frame), `status`
(`word_timed_review` or `local_asr_aligned_review`) and `cues`. Each cue contains
`text`, `start`, `end`, `firstWord`, `lastWord`. Every transcript word must be
covered exactly once. Punctuation/case may differ; spoken words may not.

End times tolerate at most 0.061 seconds of difference from the last word.
Start differences over 0.12 seconds require a measured note in the episode's
`timing_adjustments`, keyed by cue index. Refinements cannot exceed 1.1 seconds
or the first spoken segment's end plus two frames. This is a narrow allowance for
measured ASR boundaries, not permission to estimate captions. Unused notes fail.

An externally imported transcript must be truthful. Hash matching cannot prove
ASR quality, that someone listened, or that the graphics explain the narration.
For corrections, make a new episode/version with updated input hashes; never
change an in-progress render's source files.

## Deliverables

- `video.mp4`: muxed H.264 picture and source narration; review required.
- `silent.mp4`: rendered picture before mux; retained for optional Canva editing.
  It still contains burned-in captions; only its audio is absent.
- `thumbnail.jpg`: vertical 1080x1920, RGB, progressive JPEG.
- `captions.srt`, `captions.json`: caption handoff and timing record.
- `video.html`, `assets/`: local silent preview; assets may contain private fonts.
- `youtube.json`, `youtube.md`: title, description, 5-8 lowercase hashtags, tags,
  pinned comment and unpublished status.
- `scene-*.png`, `visual-qa.json`, `media-qa.json`, `frame-qa.json`, `audio-qa.json`, `run.json`:
  checks, sampled frames, hashes and runtime evidence. Build-only runs have no
  encoded-media/audio QA because no MP4 was produced.
- `audio-preparation.json`: optional native AAC/Opus preparation evidence. Records
  original and temporary PCM hashes; the PCM remains invocation-owned scratch,
  not another retained recording. The original input is not overwritten.

YouTube thumbnail upload/selection behavior varies by product surface; the tool
creates a cover asset and does not automate setting a Shorts thumbnail.

## Updating a Brand or Engine

Use a new workspace for new branding or runtime qualification. Old workspaces
and renders are not overwritten. This intentional version boundary prevents
brand changes silently affecting future exports.

For intentional source changes, inspect `python3 tools/freeze.py` output, run
the tests and qualify a new native render, then replace `lock.json` through your
normal reviewed source edit. The script only prints a candidate; it does not
approve the change or mutate any lock. Review the final diff before committing.

The engine lock is a drift detector, not a cryptographic signature or security
boundary against someone who can edit both the code and the lock.
