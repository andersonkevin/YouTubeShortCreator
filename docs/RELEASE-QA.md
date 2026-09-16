# Release Qualification

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
