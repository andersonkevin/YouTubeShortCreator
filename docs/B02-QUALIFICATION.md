# B02 Widget Qualification

[Roadmap](PIPELINE-ROADMAP.md) | [Adapter contract](VISUAL-ADAPTER-CONTRACT.md)

Recorded 2026-09-15. Scope: opt-in v2 flow, metric and comparison scenes, forty
pinned icons and six compositions. Eight analytical charts remain study-only
until B03. These are synthetic test signals and illustrative data, not narration
or publishable examples.

## Implementation

- `visual_adapter.py` validates bounded records and known symbols, maps approved
  brand tokens, and records source/derived data and implementation/vendor hashes.
- Gallery and production share `tools/visual_library/options.js`. Production has
  fixed geometry, approved fonts and the existing capture clock, not gallery UI.
- v1 remains exact-key compatible. Unsupported v2 data fails before run creation.
- Engine hashing includes the adapter, shared renderer, recipes and pinned vendor
  bytes. No vendor download, runtime installation or new dependency was added.

Qualified lock SHA-256:
`8f755bf594d239850c984f6775d33cc11c3fd5d47277974fe63777ff8920934a`.
The native encoder, muxer, source narration and caption timing rules are unchanged.

## Fixture Matrix

Private evidence is retained under `workspaces/`; it is deliberately not included
in the public archive. Each row's run is `runs/widget-fixture/qualification`.

| Workspace | Scenes | Palette | Evidence |
| --- | --- | --- | --- |
| `b02-violet-4-03` | 4 | Violet | Native MP4, all three widgets and classic scene |
| `b02-graphite-3-01` | 3 | Graphite | Native MP4, flow/metric and classic scene |
| `b02-graphite-4-01` | 4 | Graphite | Visual build, all three widgets and classic scene |
| `b02-violet-3-01` | 3 | Violet | Visual build, flow/metric and classic scene |

All four configurations passed four-viewport checks: 56 scene/viewport cases in
total. Browser QA checked text bounds, decoded symbols, SVG presence, captions,
motion and exact repeated/backward seek parity. Ten widget captures also passed
read-only hash and pixel checks, with 4,552-8,592 bright pixels in the fixed text
region. This pixel count detects empty/failed rasterization, not semantic quality.
Final metric/comparison captures were inspected in both palettes.

Both native exports are 1080x1920 at 30 fps, 12 seconds and 360 frames, with one
video track and one audio track. Media QA decoded 15 samples per export. Audio QA
measured 0 ms lag in all four windows of each export; minimum correlation was
0.999650844766327. Source audio SHA-256:
`958b2c57cc8f39ae38f6dfa03a5af1deba356b32be8d71636741134c0f494d49`.

The operator explicitly approved the technical review of the two MP4 fixtures
on 2026-09-15: legibility, colors, transitions and absence of sound cuts/artifacts.
This closes B02's technical human-review gate only. Original immutable run and
audio reports still contain their generated `review_required`/pending fields;
they were not rewritten to manufacture approval. No publication was approved.

## Regression and Diagnosis

The seven-run `b02-classic-reference-02` matrix covers all twelve classic layouts
at three/four scenes. Comparison against `b01-no-bracket-01` passed with **zero
changed pixels across all 24 reference captures**, without a mask or tolerance.
Invalid caption anchors and overflowing headings still fail their intended gates.

Initial mixed-scene trials exposed Chromium logo raster-cache differences after
SVG clipping and viewport changes. Failed runs `b02-violet-4-01` and
`b02-violet-4-02` remain preserved with diagnostics. Full viewport/reload/seek
reproduction showed that a v2-only compositor layer on the logo fixes the issue;
an extra paint reset did not. The original reset and exact equality checks remain.
Successful evidence uses new workspaces, not overwritten failed runs.

The shared study gallery at `visual-review-20260915/visuals/b02-shared-01` also
passed all eleven visuals across three viewports, deterministic reveals, SVG/PNG
export, playback and selection checks, with no page network requests.

## Reproduction and Checks

Set `YSC_NODE`, `YSC_PLAYWRIGHT`, `YSC_CHROME` and, when needed, `YSC_SWIFT` to
already installed runtimes. Use new private names; commands do not install tools.

```sh
python3 -B tools/widget_smoke.py --workspace workspaces/my-widget-review --scenes 4 --palette violet --render --approve-write
python3 -B -m unittest discover -s tests -v
python3 -B tools/check_docs.py
python3 -B tools/release.py audit
git diff --check
```

The read-only maintenance helper `tools.widget_smoke.check_visual_pixels` accepts
a completed fixture workspace and checks recorded output hashes before pixels.
Its tests cover no mutation, blank/wrong-size rasters, missing evidence, hash drift,
traversal and symlinks using temporary fixtures.

Observed full suite: 112 tests passed. Engine candidate equals the qualified lock.
Versions recorded in run evidence: Python 3.14.6, Pillow 12.2.0, NumPy 2.4.6,
Node 24.19.0, Playwright 1.62.1, Chrome 152.0.7977.83 and Apple Swift 6.4 on
arm64 macOS (Darwin 25.6.0). These results do not qualify other environments.

No commit, push, release tag, publishing, private-brand migration or old-output
deletion is part of this qualification. Packaging and subsequent batch checks
do not replace the independent operator and release gates in B08/B09.
