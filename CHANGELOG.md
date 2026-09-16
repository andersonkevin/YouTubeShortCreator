# Changelog

## Unreleased

- Positioned the project for explainer Shorts on any subject; the technical
  layouts remain one example of use.
- Added ten general-purpose components to the wave 02 catalog (quote, checklist,
  stat, before-after, steps, ranking, timeline, pros-cons, definition, cards),
  validated with the same QA; the catalog now holds 55 components.
- Removed vendor names from the source tree and generalized the hidden-directory
  exclusions.

## 0.2.0 (2026-09-16)

- Added asset library wave 02: 45 design-review components across widgets, data,
  systems, AI and software, with a searchable catalog, cards, fixtures and an own
  browser QA (token-only colors, palette switch, design-pixel typography,
  collision and clipping checks, deterministic reveal).
- Added asset library wave 03: 24 generated palettes with contrast rules, 10
  deterministic motion recipes and 18 layout studies with a frame QA.
- Added optional local narration synthesis (`tools/voice.py`) with the Kokoro
  model in a separate operator-prepared environment: pinned model hashes,
  auditions, records with listening approval pending; nothing installed or
  downloaded at runtime.
- Added a GitHub Actions workflow running the unit tests, documentation checks
  and release audit; the release audit now excludes `.github/` from the archive.
- Corrected the first expansion's palette and typography checks and made the
  public prose provider-neutral.
- Added offline visual preparation: a 69-entry catalog, bounded charts/widgets,
  local SVG/PNG export, provenance and assistant selection guidance. Production
  scene integration, FFmpeg backend and marketing remain separate milestones.
- Added shared assistant onboarding, assistant entry points, private brief
  and session-handoff templates; no model API or autonomous runtime added.
- Expanded the public README and linked installation, first-episode, branding,
  CLI, architecture, data-contract, troubleshooting, licensing and release guides.
- Added the full 12-layout screenshot gallery with a checksummed provenance manifest.
- Added local documentation validation and tests; clarified source-only licensing,
  actual validation coverage and macOS production limits.
- No production template, capture clock, encoding, audio or publishing behavior changed.

## 0.1.0

- Private channel onboarding, local logo creation/import, palettes and font selection.
- Explicit brand approval with drift detection.
- Twelve fixed code/diagram scene layouts and a shared caption clock.
- Original-audio binding, local transcription adapter and caption drafting.
- Native macOS capture, H.264 encoding, muxing and audio/visual checks.
- Per-run provenance, manual publishing handoff and an allowlisted source release tool.
