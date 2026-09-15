# Changelog

## Unreleased

- Added B06 failure recovery tests, finite JSON exponent parsing and atomic
  no-overwrite Python JSON publication. New runs hash nested assets and retain
  diagnostic evidence after caught interrupts. Audio QA includes short final
  windows, silent spans and unmatched tails. Shared encoded-frame QA compares
  chroma-aware samples against original captures and checks all native frame
  timestamps. Technical qualification and pending human gates are tracked in
  `docs/B06-PROGRESS.md`; no design, encoder setting or publication behavior changed.

- Replaced the internal 90-second ceiling with a shared 180-second Shorts
  contract at the operator's request. The full recording drives duration; no
  automatic excerpt or speed change. Added long caption/frame tests and bounded
  75 MB audio intake for three-minute PCM. B05 extended media review is pending.

- Recorded operator technical approval of B04's native backend boundary.
- Implemented optional FFmpeg encoding/mux/QA under B05 qualification, with
  explicit binary configuration and no fallback. Added format/size/time fixtures.
- Validate actual decoded frame timestamps instead of inferring cadence from
  average container metadata. Corrected native AAC padding and Opus pre-skip using
  invocation-owned Apple-decoded PCM, preserving rate, channels and original audio.

- Recorded operator technical approval of all three B03 chart/motion samples.
- Separated PNG capture from native media dispatch. New runtime profiles record
  an explicit native backend and capability probe; runs detect profile drift.
  Scratch ownership and failure cleanup are Python-managed. B04 passed technical
  review; optional FFmpeg qualification remains the separate B05 batch.

- Added chart density/palette/count qualification and explicit label-collision
  rejection. Corrected extreme-value formatting, tiny timeline duration labels
  and scatter/map label margins without changing source data.

- Implemented eight analytical chart forms, additive stacked bars, six selectable
  entrance presets and optional fade exits. B03 technical qualification passed;
  source data, brand geometry and the caption clock remain authoritative.

- Added opt-in v2 flow, metric and comparison scenes with 40 pinned icons and six
  compositions, shared study/production rendering and source/derived-data evidence.
  Two palettes and native three/four-scene fixtures passed B02 technical review.
- Added private legacy regression tools; all twelve layouts have three/four-scene
  reference coverage and exact pixel parity after widget integration.
- Removed the operator-approved right-side decorative bracket without changing
  layout geometry. Qualified the reviewed CSS lock change with 24 before/after
  comparisons and a synthetic native media/audio test.
- Added offline visual preparation: a 69-entry catalog, bounded charts/widgets,
  local SVG/PNG export, provenance and assistant selection guidance. Production
  integration of eight analytical charts, FFmpeg and marketing remain separate milestones.
- Added shared assistant onboarding, Codex/Claude Code entry points, private brief
  and session-handoff templates; no model API or autonomous runtime added.
- Expanded the public README and linked installation, first-episode, branding,
  CLI, architecture, data-contract, troubleshooting, licensing and release guides.
- Added the full 12-layout screenshot gallery with a checksummed provenance manifest.
- Added local documentation validation and tests; clarified source-only licensing,
  actual validation coverage and macOS production limits.
- New visual scenes use the existing capture clock and a v2-only logo compositor
  layer for deterministic SVG/backward seeking. Encoding, audio and publishing
  behavior are unchanged; no new runtime dependency or automatic download added.

## 0.1.0

- Private channel onboarding, local logo creation/import, palettes and font selection.
- Explicit brand approval with drift detection.
- Twelve fixed code/diagram scene layouts and a shared caption clock.
- Original-audio binding, local transcription adapter and caption drafting.
- Native macOS capture, H.264 encoding, muxing and audio/visual checks.
- Per-run provenance, manual publishing handoff and an allowlisted source release tool.
