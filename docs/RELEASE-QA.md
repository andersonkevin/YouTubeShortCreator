# Release Qualification

This page retains dated qualification results. For the maintained capability and
publication overview, see [current state](CURRENT-STATE.md). Test counts and locks
below apply to their recorded candidates; a documentation edit does not requalify
media or grant human approval.

## Public examples (2026-10-18)

Four complete episodes and six decoded gallery captures were published through
[PR #18](https://github.com/andersonkevin/YouTubeShortCreator/pull/18), after the
v0.5.0 tag. The unchanged engine passed their ordinary authoring/render gates;
see [example qualification](EXAMPLES-QA.md) for durations, frame/audio checks,
fixture corrections and review limits. The isolated source check ran 647 Python
tests (640 passed, seven skipped) and 518 Node tests (517 passed, one skipped).
Its [main CI run](https://github.com/andersonkevin/YouTubeShortCreator/actions/runs/39108337884)
passed. The tag retains the original release snapshot; `main` includes the examples.

## 0.5.0 (2026-10-17)

The release candidate contains the reusable visual engine, 35 composition
families, four explicit output profiles, the 600-second v3 ceiling and 80 licensed
font files. Legacy episode contracts and human publication gates remain intact.
The checks below ran against an isolated public source candidate, using existing
local runtimes. Private workspaces, recordings, demo identities and generated
videos are excluded from the source release.

- `python3 -B -m unittest discover -s tests -q`: **633 tests**, 626 passed and
  seven optional checks skipped on Python 3.14.7.
- `node --test tests/*.test.mjs`: **518 tests**, 517 passed and one optional
  check skipped on Node 24.19.0.
- `python3 -B tools/check_docs.py`: **PASS**, 54 documents and 24 checksummed
  documentation images. `python3 -B tools/release.py audit`: **PASS**, 826
  allowlisted source files in the initial candidate. The final source audit
  includes one additional pinned geometry test fixture: 827 source files plus
  the CI workflow, totaling 828 public files with no private data.
- The normal `ysc.py ... render` command completed the portrait photographic
  film: **1080x1920, 70.433333 seconds, 30 fps, 2,113 frames and 14 shots**.
  Browser checks passed across four viewports, including caption timing,
  geometry, camera movement and deterministic seeking. No page errors or
  attempted network requests were recorded.
- Encoded-media checks: one video and one audio track, all 2,113 frame timestamps
  checked, and **147 decoded frame samples** passed pixel correspondence. Maximum
  sampled tile RMSE was 9.911 against the existing limit of 24.
- Audio checks: **23 waveform windows**, maximum measured lag **0 ms**, minimum
  correlation **0.9999567**, one silent window checked and no unmatched samples.
  Listening approval remains pending.
- All **224 output hashes** were reverified after export. The qualified source
  equals the implementation record, and the episode validates from the main
  development checkout after accepting that record. Existing brand approvals
  were not rewritten.
- `git diff --check`: **PASS**. Package metadata and the root lockfile agree on
  version 0.5.0. The earlier disk-space failure remains retained; the successful
  retry used the existing exporter and its unchanged free-space gate.
- The first full staged-diff check exposed blank-space style warnings in 37
  qualified assets and original license notices, plus one test-file ending.
  The test ending was corrected. Exact byte-locked asset paths declare only
  end-of-line/end-of-file blank-space style exceptions in `.gitattributes`;
  their contents and qualified implementation hash remain unchanged. CI also
  verifies the full implementation lock. The aggregate diff from v0.4.0 passes
  the resulting format check; no media, asset-hash or runtime gate was relaxed.

Encoded-film implementation lock SHA-256:
`d17576cb9d5a9dff6523f2b6f765b0c5115d073c9280654c659c43b79fd4cd72`.

The first hosted Python 3.12/3.13 checks exposed a case-only alias for the Inter
license: macOS resolved it, while Linux correctly rejected the missing spelling.
The font manifest now uses the existing `inter-OFL.txt` filename consistently.
A regression compares manifest names with actual directory entries even on
case-insensitive filesystems; all 11 font-library tests pass locally. The source
record removes the duplicate alias and updates only the font-manifest hash.
All renderer, font and license bytes remain identical to the qualified film.
The resulting source-release implementation lock is
`42b08b645219d28ed28919380e5ca00bf0ce6b0a289ef1540e1ce7700866ee0e`.
Existing private approvals and render receipts retain their original record.
The hosted rerun also identified a format-test headline that exceeded the
unchanged width limit with Linux's display font. The synthetic fixture now uses
shorter copy; production geometry, minimum font size and overflow rejection are
unchanged. These packaging/test fixes required hosted verification before merge;
subsequent publication is recorded in [current state](CURRENT-STATE.md).
The shatter geometry regression now evaluates a hash-pinned extraction of the
original algorithm in the same JavaScript runtime and requires exact serialized
geometry equality in all five aspect cases, including repeated reverse-order
evaluation. This avoids treating one V8 version's floating-point output as a
universal fixture; numerical tolerances and production animation are unchanged.
CI runs the independent remaining checks after a failure so one run reports all
diagnostics; a failed check still fails its required job.

The current render qualifies portrait photographic cinema on the existing macOS
setup. Earlier four-format and 600-second exports remain separately dated
qualification evidence; this release pass did not repeat every catalog resource
or every duration. Square/feed photographic cinema, portrait diagram cinema,
fresh dependency installation and Windows/Linux media rendering are not qualified
by this run. Historical B05-B09 human acceptance gates remain separate from the
source update. These were local qualification results before publication;
[current state](CURRENT-STATE.md#publication-and-qualification) records the later
merged source delivery. The original local evidence is not rewritten as hosted QA.

## 0.4.0 (2026-09-16)

Sanitized summary of the checks behind the 0.4.0 release. Private workspaces,
fixture media and machine-specific paths are excluded.

- `python3 -B -m unittest discover -s tests -p 'test_*.py'`: **249 tests passed**
  locally on Python 3.14 and in GitHub Actions on Python 3.12 and 3.13; the three
  Node test files (capture boundary, chart QA, visual options) pass locally.
- `python3 -B tools/check_docs.py`: **PASS**. `python3 -B tools/release.py audit`:
  **PASS**, private workspaces, hidden directories and `.github/` excluded.
- Pipeline batches B01-B07 merged with their qualification records
  (`docs/B01-QUALIFICATION.md` to `docs/B07-PROGRESS.md`); B05/B06 human review,
  the B07 walkthrough and B08 independent acceptance remain pending.
- Six general-purpose layouts: the regression fixture covers all eighteen layouts
  with three- and four-scene cases and two negative cases; the twelve original
  layouts were compared pixel by pixel against the previous references over 24
  samples with **0 changed pixels**.
- Palette presets: synthetic fixtures built with three generated presets
  (`mint-dark`, `cobalt-dark`, `rose-dark`) passed the browser QA; a test keeps
  the fifteen presets equal to the wave 03 palette study.
- Reveal presets: synthetic chart fixture sets D and E exercise the four new
  entrances with transition checks: **PASS**.
- Wave 02 production records: four synthetic fixture sets (`wave02-a` to
  `wave02-d`) render twelve components in real scenes with brand tokens; browser
  QA and chart label QA **PASS**; the wave 02 study QA passed again after the
  renderer refactor (55 examples, 61 stress fixtures, 0 errors, 0 network requests).
- Batch picker: a synthetic three-episode batch drafted with `new --batch` built
  with browser QA, nine distinct layouts over seven families, every build and
  visual QA **PASS**; a simulated twelve-episode batch uses all 18 layouts, none
  more than three times.
- The implementation lock changed with the template and adapter; existing
  workspaces must run `brand-approve` again. Encoding, mux and publishing
  behavior are unchanged; the 0.1.0 media qualification below still describes
  the production path.

## 0.3.0 (2026-09-16)

Sanitized summary of the checks behind the 0.3.0 release.

- `python3 -B -m unittest discover -s tests -p 'test_*.py'`: **141 tests passed**
  locally on Python 3.14 and in GitHub Actions on Python 3.12 and 3.13.
- `python3 -B tools/check_docs.py`: **PASS**. `python3 -B tools/release.py audit`:
  **PASS**, private workspaces, hidden directories and `.github/` excluded.
- Asset library wave 02 with the ten general-purpose components: 55 example
  components and 61 stress fixtures in 2 palettes and 3 viewports, token-only
  colors, verified palette switch, design-pixel typography, collision, occlusion,
  ellipsis and clipping checks, deterministic reveal; 110 and 122 exports, no page
  errors, no network requests.
- Asset library wave 03 on the updated renderer: 26 palettes and 10 motion recipes
  over 8 sample components, 18 layouts over 3 components at 1080x1920: **PASS**.
- No production template, capture clock, encoding, mux or publishing behavior
  changed. The 0.1.0 media qualification below still describes the production path.

## 0.2.0 (2026-09-16)

Sanitized summary of the checks behind the 0.2.0 release. Private review runs,
model files, generated audio and machine-specific paths are excluded.

- `python3 -B -m unittest discover -s tests -p 'test_*.py'`: **141 tests passed**
  locally on Python 3.14 and in GitHub Actions on Python 3.12 and 3.13.
- `python3 -B tools/check_docs.py`: **PASS**. `python3 -B tools/release.py audit`:
  **PASS**, 239 public files, private workspaces and `.github/` excluded.
- Asset library wave 02: 45 example components and 51 stress fixtures rendered in
  2 palettes and 3 viewports with token-only colors, verified palette switch,
  design-pixel typography, collision, occlusion, ellipsis and clipping checks and
  deterministic reveal; 90 and 102 exports, no page errors, no network requests.
- Asset library wave 03: 26 palettes and 10 motion recipes over 8 sample
  components (pairwise distinct palettes, end-state identity, deterministic frames,
  distinct recipes) and 18 layouts over 3 components at 1080x1920 (no placeholder
  overflow, visual fills its zone, no content overlap, safe box respected).
- Optional local voice tool: `doctor` PASS with the pinned model hashes; the
  59-word example narration synthesized in 5.3 seconds and transcribed by the
  local speech step into 59 timed words. Listening approval remains pending.
- No production template, capture clock, encoding, mux or publishing behavior
  changed. The 0.1.0 media qualification below still describes the production path.

## 0.1.0 (Initial Release)

Date: 2026-09-14. This is a sanitized summary; test recordings, local runtime paths,
private font copies and generated runs are intentionally excluded from the release.

## Results

- `python3 -B -m unittest discover -s tests -v`: **44 tests passed**.
- `python3 ysc.py --workspace workspaces/smoke-01 doctor`: **PASS**.
- Native synthetic fixture: **360 frames**, 12-second MP4, 1080x1920, 30 fps,
  one video and one audio track. Source/export audio lag: 0 ms in all four windows;
  minimum waveform correlation: 0.99965. Fifteen encoded frame samples decoded.
- All **12 layouts**, grouped into three four-scene test episodes: **PASS** in
  1080x1920, 1440x900, 390x844 and 375x667. No reported text overflow, tested zone
  overlap, browser error or attempted page network request. Central motion and
  exact repeated-seek pixel hashes passed for every layout.
- Local macOS synthesized narration from `examples/narration.txt`: transcribed
  into **59 timed segments**, grouped into **12 caption cues**, rendered as
  **636 frames** and muxed to a 21.173-second MP4. One video and one audio track;
  27 decoded-frame checks passed. Seven waveform windows had 0 ms best lag and
  correlation at least **0.99276**.
- `python3 tools/release.py audit`: **PASS**. Source tree excludes all private
  workspaces and carries no imported voice, customer branding or font binaries.

## Environment

Python 3.14.6; Pillow 12.2.0; NumPy 2.4.6; Node 24.19.0; Playwright 1.62.1;
Chrome 152.0.7977.83; Apple Swift 6.4; macOS 26 on Apple Silicon.

Implementation lock SHA-256:
`fc7d50be1d2f195b14def2da066d8ebda4322cabe291d6c9a48406c06e746f75`.

## Limits

No fresh package installation, Windows/Linux production render, alternate-language
transcription, public upload or manual publication approval was performed. Tests
used existing local runtimes. The initial sandbox prevented Chrome startup; the
same local workflow passed with host permission, without weakening its validators.
ASR and editorial accuracy still require listening and visual review for each Short.

## Public Documentation Pass

Date: 2026-09-14. The following checks apply to the documentation expansion, not a
second media qualification. The original production implementation lock above is unchanged.

- Added detailed setup, first-episode, branding, CLI, architecture, data-contract,
  gallery, troubleshooting, licensing and GitHub handoff documentation.
- `python3 -B -m unittest discover -s tests -v`: **51 tests passed**, including
  seven new documentation regressions and the existing 44 tests.
- `python3 -B tools/check_docs.py`: **22 Markdown documents**, **152 local references**
  and **13 checksummed PNGs** passed link, anchor, JSON-example, CLI-coverage and
  image-integrity checks. The checker makes no network requests.
- Local GFM rendering of all 22 documents: **44 viewport checks** at 1200 and 390 px
  passed document-width and image-loading checks. README and gallery screenshots
  were inspected. This is a local approximation, not a live GitHub verification;
  Mermaid diagrams remain subject to GitHub's renderer.
- Direct dependency license metadata and relevant upstream license pages were
  reviewed; this is a notice inventory, not a legal clearance or complete binary SBOM.
- No capture, encoding, muxing, caption logic, production template, dependency pins,
  existing qualification media, approval record or publishing behavior changed.

Fresh dependency installation, a live GitHub repository, remote publishing and
formal intellectual-property review remain outside this documentation pass.
