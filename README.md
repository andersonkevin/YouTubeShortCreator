# YouTubeShortCreator

[![Tests](https://github.com/andersonkevin/YouTubeShortCreator/actions/workflows/tests.yml/badge.svg)](https://github.com/andersonkevin/YouTubeShortCreator/actions/workflows/tests.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-2ea043)](LICENSE)
[![Version 0.5.0](https://img.shields.io/badge/version-0.5.0-3776ab)](CHANGELOG.md)

**A local video generator for narrated explainers, visual stories and cinematic sequences.**

Build a channel identity, supply authorized imagery and narration, then compose
videos using validated scenes and timed captions. The engine produces MP4,
subtitles, a cover, publishing metadata and quality reports. You review the
result; publication stays manual.

**v0.5.0** adds reusable compositions across four aspect ratios, episodes up to
ten minutes, a licensed font catalog and photographic camera sequences. Existing
Shorts episodes retain their original contracts.

## What You Can Produce

| Capability | Available behavior |
| --- | --- |
| Output formats | 16:9 at 1920x1080, 9:16 at 1080x1920, 1:1 at 1080x1080 and 4:5 at 1080x1350; 30 fps |
| Duration | Explicit v3 composition profiles accept the full recording up to 600 seconds; legacy Shorts remain capped at 180 seconds |
| Compositions | 35 scene families: titles, charts, diagrams, screenshots, code, maps, interfaces, image arrangements, editorial scenes and cinema |
| Camera and editing | Narration-anchored crop moves, screenshot focus, match cuts, optical handoffs and bounded image transitions |
| Photographic cinema | 2-24 verified local stills with shot-specific framing; 16:9 and 9:16, short titles and caption overlays |
| Typography | 80 pinned font files, including 16 variable faces, with retained notices; lettering and axis animation use approved fonts |
| Narration | Imported final audio; optional local synthesis, including Spanish voices, with separately reviewed timing |
| Delivery | H.264/AAC MP4, SRT, JPEG cover, YouTube metadata and source/export QA |

Format support is composition-specific: editorial and diagram cinema remain
landscape-only, while photographic cinema supports landscape and portrait.
Run `python3 ysc.py compositions` for the closed authoring catalog.

The photographic mode animates stills with camera movement and optical editing.
It does not generate live-action footage or reconstruct a 3D subject. The tool
has no graphical timeline, cloud generation service or automatic publishing.

## Start a Channel

Use a file-capable assistant to operate the local CLI, or run the commands
manually. Start with [START-HERE.md](START-HERE.md) and the
[installation guide](docs/INSTALLATION.md). The qualified media environment is
macOS with Python, Node, local Chrome and the selected media tools.

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --ignore-scripts --no-audit --no-fund
python3 ysc.py --workspace workspaces/my-channel init
```

Review the generated brand preview before approving it. Configure an explicit
FFmpeg workspace for v3 composition profiles; the legacy native backend remains
available for existing Shorts.

```bash
python3 ysc.py --workspace workspaces/my-channel brand-approve --approve-write
python3 ysc.py --workspace workspaces/my-channel configure --backend ffmpeg --approve-write
python3 ysc.py --workspace workspaces/my-channel doctor
python3 ysc.py fonts
python3 ysc.py compositions
```

Installation is an explicit setup step. Runtime commands do not install packages,
download fonts or models, call providers, or upload media. Your assistant's own
provider and permissions are separate from the local generator; see
[privacy and security](SECURITY.md).

## Generate a Video

To try the engine immediately, follow the [four complete public examples](examples/v0.5.0/README.md).
They include narration, timed captions, artwork and storyboards for all four
formats. See their actual renderer captures in the [v0.5.0 gallery](docs/GALLERY.md#v050-compositions).

Supply the final recording, its recording-bound transcript, reviewed word-timed
captions, matching-aspect thumbnail artwork and a closed storyboard. Use the
[composition contract](docs/DATA-CONTRACTS.md) and
[CLI reference](docs/CLI.md#landscape-episodes) for complete examples.

```bash
python3 ysc.py --workspace workspaces/my-channel new first-film --format landscape --audio intake/voice.wav --transcript intake/transcript.json --captions intake/captions.json --graphic intake/cover.png --storyboard intake/storyboard.json --approve-write
python3 ysc.py --workspace workspaces/my-channel validate episodes/first-film/episode.json
python3 ysc.py --workspace workspaces/my-channel build episodes/first-film/episode.json --run-id preview-01 --approve-write
python3 ysc.py --workspace workspaces/my-channel render episodes/first-film/episode.json --run-id final-01 --approve-write
```

Use `portrait`, `square` or `portrait-4x5` for the other v3 profiles, with suitable
scene recipes and source framing. Format selection does not rewrite the story or
trim the voice. For cinematic stills, follow [cinema direction](docs/CINEMA-DIRECTION.md).

Outputs are private under `workspaces/my-channel/runs/first-film/final-01/`.
`video.mp4` includes narration and burned-in captions. The HTML preview is silent.
New run IDs preserve previous results and failed diagnostics.

## Brand and Validation

The unreleased [editorial Shorts workflow](docs/EDITORIAL-SHORTS.md) adds opt-in
light branding, 12 closed explanatory diagrams, three local-news image layouts
and measured caption highlighting. [Two complete storyboards](examples/editorial-shorts/README.md)
reuse the public example narration without importing a customer identity.
These are legacy v2 options, not replacements for the v3 compositions.

- Approved logo, palette and font files are hash-bound to the implementation.
- Episodes accept bounded content records and verified local images, not custom executable markup.
- One frame clock drives scenes, camera moves and captions, including backward seeking.
- Browser checks cover geometry, text fit, motion, loaded assets and unexpected requests.
- Export checks inspect dimensions, timestamps, decoded frames and source/audio correspondence.
- Every result stays `review_required`; technical checks do not replace visual, listening or factual review.

The original 18-layout workflow, batch rotation and v1/v2 contracts remain
available. See the [legacy gallery](docs/GALLERY.md#legacy-v1v2-layouts) and
[first-Short walkthrough](docs/FIRST-SHORT.md).

## Updating from 0.4.0

The implementation lock changes in this release. Create a new private workspace
for the new implementation and approve its brand/runtime combination; preserve
existing approvals and renders. Existing workspace approval records must not be
rewritten to bypass the drift check. See [upgrade boundaries](docs/WORKFLOW.md#updating-a-brand-or-engine).

Capture uses temporary lossless PNG frames. The post-v0.5.0 storage hardening
limits generated runs to 10 GiB and scratch to 32 GiB per workspace by default,
with a 5 GiB free-space reserve. Capture checks every frame and stops instead of
reducing quality. `storage` previews usage and cleanup candidates; `storage-clean`
requires the reviewed plan and explicit write approval. Completed renders and
original inputs remain protected. See [storage and retention](docs/STORAGE.md),
including new-workspace approval after the implementation-lock change.
Full ten-minute coverage remains a retained representative qualification, not a
soak test of every scene recipe or disk budget.

## Verify and Distribute

```bash
python3 -B -m unittest discover -s tests -v
node --test tests/*.test.mjs
python3 -B tools/check_docs.py
python3 -B tools/release.py audit
```

The release audit expects an allowlisted source tree. Keep private work under
`workspace/` or `workspaces/`, and inspect the selected source files before sharing.
See the [current state](docs/CURRENT-STATE.md), [release qualification](docs/RELEASE-QA.md), [changelog](CHANGELOG.md),
[release guide](docs/RELEASING.md), [documentation index](docs/README.md) and
[third-party notices](THIRD_PARTY_NOTICES.md).

Project-authored code is MIT. Bundled code, fonts and other assets retain their own
licenses and provenance; the project license does not relicense third-party work.
Platform-wide portability, media rights clearance and independent operator
acceptance are not implied by a successful local export.
