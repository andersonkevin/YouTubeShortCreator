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

The first remote CI run at commit `105fd008` caught a stale documentation test:
it still expected 30 images after the final two gallery frames were added. The
documentation checker itself verified all 32 images successfully. The test now
requires exactly 32 and explicitly includes both editorial frames; hash, path
and missing-link checks remain unchanged, and rights review remains human. This test/documentation-only
correction does not change the implementation lock or invalidate the media runs.

## Main Integration Review: 2026-10-19

The remote `main` was checked again at
`3abe36ee0b8d48f892a343279a179e5a875aeebf`, exactly the ancestor of PR #20's
`64c3c50408b8d2509bbc01f6ae11ce199a8d4c64`. The PR is two commits ahead and
zero behind; GitHub reports a clean merge with both Python 3.12/3.13 CI jobs
successful. This is a compatibility review, not authorization to merge.

The diff leaves storage guards, media contracts, FFmpeg, v3 production code,
the eighteen layout definitions, `motion.js`, vendor assets, dependencies and CI
configuration unchanged. New records, caption highlighting and light branding
remain explicitly selected options rather than changes to existing defaults.

A same-runtime differential probe loaded the main versions of `branding.py`,
`visual_adapter.py`, `workflow.py` and `ysc.py` read-only from Git, then compared
them with the candidate against unchanged shared dependencies. Six synthetic or
public-example cases covered legacy v1, v2 charts and all four v3 formats. All
36 comparisons matched: canonical episode data, captions, scene bounds, compiled
HTML, generated JPEG cover and brand-file hashes. Separate JavaScript probes
matched fifteen legacy caption states, including gaps, backward seeks, original
text and the render function's return value. Temporary fixture workspaces were
automatically removed. This was not an isolated full-main checkout test, browser
pixel comparison or new MP4 qualification.

Six additional regression tests in `tests/test_editorial_compatibility.py` retain
these operational boundaries: default phrase captions, legacy caption case review,
unmodified v2 chart payloads, all four v3 authoring dispatches, rejection of mixed
storyboard/batch/layout modes, and rejection of a stale engine approval without
rewriting any files. The workflow guide's obsolete blanket statement that light
themes were unimplemented was corrected; schema 1 remains dark.

These test/documentation changes do not alter the qualified implementation lock.
The 2026-10-18 media results above remain dated evidence, not fresh exports.

Follow-up local validation passed: 693 Python tests (686 passed, seven optional
skips), 545 Node tests (544 passed, one optional skip), documentation validation
(61 documents, 560 local references, 32 manifest images), the release audit
(892 public files), lock verification and `git diff --check`. No dependencies
were installed. The initial differential probe stopped on the existing
no-thumbnail-overwrite guard because the probe reused its own temporary output
name; distinct fixture filenames fixed the probe without changing the product.
At the end of this review, the six new tests and guide correction were local and
uncommitted. The remote green CI at that point applied to the PR head above, not
these additional working-tree changes. Subsequent commit, CI and merge status
must be checked against the actual GitHub records.

### Recommended Rollout

1. Review and approve the exact PR; merge only through the operator's authorized
   GitHub workflow, without replacing the repository with the older private fork.
2. Keep existing production workspaces, approvals, inputs and deliveries intact.
   The changed engine lock intentionally rejects old approvals; this is an
   upgrade boundary, not permission to edit or regenerate approval JSON in place.
3. Finish an existing episode on its matching source revision, or initialize a
   new private workspace for this implementation and use normal brand/runtime
   approval. Select editorial/news modes only when needed.
4. Run an actual channel smoke production and complete visual, listening and
   rights review before regular use. Technical qualification never publishes.

No merge, new commit, push, tag change, dependency installation, production
workspace migration or publication was performed during this follow-up review.
