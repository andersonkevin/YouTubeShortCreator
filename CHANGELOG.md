# Changelog

## Unreleased

- Four more chart entrances for visual scenes, reduced from the wave 03 motion
  study to container-level presets: `wipe-left`, `wipe-down`, `wipe-up` and
  `scale-settle`. Ten reveal presets in total; the synthetic chart fixtures gain
  sets D and E that exercise them.
- Twelve generated dark palettes join the brand presets (fifteen in total) with a
  read-only `palettes` command that prints each preset's contrast ratios; the
  synthetic qualification tools accept every preset. A test keeps the presets
  equal to the wave 03 palette study.
- Added six general-purpose production layouts for any subject: quote-card,
  numbered-steps, headline-stat, checklist-progress, before-after-panels and
  pros-cons-columns, with their stylesheet, example content and gallery captures.
  The regression fixture covers all eighteen layouts; the original twelve were
  compared pixel by pixel against the previous references with zero changes.
- The browser QA loads the checked brand faces explicitly before verifying them.
- The implementation lock changed with the template: run `brand-approve` again
  in existing workspaces before producing, as documented.
- Pipeline integration batches merged from the local integration branch:
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

## 0.3.0 (2026-09-16)

- Positioned the project for explainer Shorts on any subject; the technical
  layouts remain one example of use.
- Added ten general-purpose components to the wave 02 catalog (quote, checklist,
  stat, before-after, steps, ranking, timeline, pros-cons, definition, cards),
  validated with the same QA; the catalog now holds 55 components.
- Removed vendor names from the source tree and generalized the hidden-directory
  exclusions.
- Quote and definition components wrap text by measured width, so lines never
  start with a space and heights are exact.
- Documentation examples published as the repository wiki.

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
