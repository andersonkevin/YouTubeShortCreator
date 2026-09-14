# Initial Release Qualification

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
