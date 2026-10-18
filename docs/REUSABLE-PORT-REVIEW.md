# Reusable Shorts Port Review

[Editorial workflow](EDITORIAL-SHORTS.md) | [Current state](CURRENT-STATE.md)

## Analysis Before Integration

On 2026-10-18 the public baseline was commit
`3abe36ee0b8d48f892a343279a179e5a875aeebf`. The selected operator-owned private
fork originated at `c11eb247b54b03a68553228845b1de764b094cee`. Comparing the
actual trees found 235 identical same-path files, 73 changed same-path files,
19 fork-only files and 567 public-only files. Compared with its own base, the
fork modified/added 41 files. These counts describe that inventory, not this PR.

The public generator already had newer format contracts, composition families,
licensed fonts, storage protection, media QA and source packaging. Replacing it
with the fork would have regressed those features. The port is a bounded adaptation,
not a source-tree overlay or automatic approval migration.

## Selection

| Private capability | Public treatment |
| --- | --- |
| Explanatory diagrams | Closed `editorial` v2 records, validated sources/scales and deterministic SVG renderers |
| Local news imagery | Three distinct layouts, verified file hashes, story/source associations and rights-review receipt |
| Measured caption highlighting | Opt-in light brand; exact cue text and real segment timestamps; phrase mode preserved |
| Light styling | New generic public brand schema 2, operator colors, contrast checks, own preview/approval |
| Branded cover scripts | Existing generic cover path retained and extended for light ink; no separate client cover engine |
| Experimental glass/large-frame variants | Not enabled as public options; legacy frame contract retained |
| Client hashtags, CTA, fonts, logos and colors | Excluded; no private identity or publishing data imported |
| Older media/runtime changes | Not copied over newer public storage, FFmpeg, composition or runtime boundaries |

The reusable source adaptation is authorized by the operator. It introduces no
third-party visual assets or dependencies. Existing pinned Lucide icons/fonts keep
their notices. Public fixtures reuse already distributed original examples; fake
news provenance is explicitly labeled and never fetched.

## Acceptance Boundaries

Tests cover schemas, invalid numeric scales, timestamps/text preservation, unsafe
paths, symlinks, copy/hash integrity, source mismatch, no-overwrite behavior,
ordinary authoring, legacy compatibility and deterministic caption/visual state.
Media qualification and exact candidate results are recorded separately below;
static tests alone do not establish render or human acceptance.

No API, publisher, model call, background worker, UI application or dependency
installation is added. The immutable v0.5.0 tag and existing private approvals
remain untouched. The contribution is unreleased source until reviewed/merged;
no new version tag is claimed.

## Executed Qualification

Final local source checks: 687 Python tests (680 passed, seven optional upstream
archive checks skipped) and 545 Node tests (544 passed, one optional source check
skipped). Documentation validation checked 61 documents, 559 local references and
32 image manifests without errors. The release audit accepted 891 public files;
`git diff --check` passed. These counts apply to this port, not every later commit.

The final implementation lock is
`27bb5eba47a7da990c42be98bf1410b2e01425146d20dfeb8d4060bc732a160d`.
The [machine-readable results](editorial-shorts-qa.json) bind each episode, visual
report, MP4, media check and audio check to exact hashes without publishing local
runtime paths or private output folders.

- Four preview episodes cover all twelve diagram variants, with active geometry,
  overflow, motion and exact reverse-seek checks at 1080x1920, 1440x900, 390x844,
  and 375x667. Two complete exports exercise educational diagrams and all three
  news-media layouts in the same four viewports.
- Each export is 1080x1920 H.264/AAC, 30 fps, 13.4 seconds and 402 decoded frames.
  Source/export audio correlation is at least 0.9999318 across four measured
  windows, with 0 ms measured lag, no unmatched samples and one checked silent
  interval. Listening approval remains pending.
- All six final browser runs recorded zero unexpected network requests and zero
  browser errors. Actual [decoded gallery frames](GALLERY.md#unreleased-editorial-shorts)
  retain image/video/storyboard provenance.

Development failures were retained locally, not erased by successful retries:
the sandbox blocked the first Chrome launch; a news layout initially overlapped
text; and hardware rasterization changed 91 orbit-scene pixels after a reverse
seek. The fixes increased news line spacing, required complete reveal timing,
removed unexposed large-frame branches and selected software rasterization only
for opt-in editorial SVGs. Five diagnostic software captures matched exactly,
followed by the complete final matrix and exports. No pixel tolerance, retry
fallback or geometry gate was relaxed. Old candidate approvals were preserved;
the final candidate used a fresh workspace/brand approval.

The render environment was macOS/Darwin 27, Chrome 155, Node 24.19.0, Playwright
1.62.1, Python 3.12.14 and existing FFmpeg 9.0.2. No software was installed.
This qualifies representative examples on that runtime, not every font/color/text
combination, operating system or ten-minute composition. Human editorial, rights
and listening review remain open; no videos were published.
