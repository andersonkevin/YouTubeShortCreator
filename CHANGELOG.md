# Changelog

## Unreleased

- Add reusable legacy v2 editorial storyboards: 12 explanatory diagrams, three
  local-news image layouts, source/story associations and media integrity checks.
- Add opt-in light-editorial onboarding with contrast-checked ink/accent colors,
  matching covers and exact-text measured caption highlighting. Dark v1 branding,
  v3 compositions, storage guards and publication approval remain unchanged.
- Include two public storyboards reusing original example narration/artwork,
  with explicit synthetic-news labeling and no private channel data.

- Bound generated runs and capture scratch, check free disk reserve for every frame,
  and serialize build/render/cleanup within each workspace.
- Add read-only `storage`, exact-plan `storage-clean`, and `storage-keep` for
  previews. Preserve originals, final renders and diagnostic records; reclaim
  abandoned owned scratch only after process, age and open-file checks.
- The implementation lock changes; existing approvals remain immutable and need
  a new approved workspace for the updated engine. No v0.5.0 tag is moved.

- Aligned architecture, setup, assistant briefs, validation and release guidance with v0.5.0; added a maintained state page and separated historical qualification records from current operating instructions. Legacy contracts, assets, engine lock and runtime behavior are unchanged.

- Added four complete, reproducible v0.5.0 example episodes with public synthetic narration, word timings, captions, original artwork and storyboards across 16:9, 9:16, 1:1 and 4:5.
- Added a gated example importer that uses normal episode authoring, verifies every public input and preserves brand approval and no-overwrite rules.
- Updated the gallery with actual engine captures and documented the example export qualification. Only manifest-verified example narration is included in source; private workspaces and exported videos remain excluded.

## 0.5.0 (2026-10-17)

- Added the v3 composition workflow with explicit 16:9, 9:16, 1:1 and 4:5 profiles at 30 fps, and full-recording duration up to ten minutes. Legacy v1/v2 Shorts retain their 180-second and three/four-scene contracts.
- Added 35 reusable scene families for animated charts, screenshot focus, code, maps, interfaces, image arrangements, editorial explainers, spatial visuals and cinema. All use closed scene records and verified local assets.
- Added photographic cinema with 2-24 narration-anchored shots, bounded camera framing, focus cuts and foreground occlusion. Landscape and portrait have separate text geometry and full-frame image coverage checks.
- Added 80 pinned font files, including 16 variable faces, with retained notices, onboarding selection and real-axis validation. Added lettering, title animation and variable typography.
- Extended the optional local voice tool with Spanish voices while preserving the final recording and measured caption timing.
- Extended browser, deterministic-seek, media, decoded-frame and audio checks. Runtime drift, asset hashes, manual review and scratch-space guards remain enabled.
- Updated the public documentation and synchronized package versions. Private workspaces, recordings, generated videos and machine-specific runtime files are excluded.
- The implementation lock changes. Create and qualify a new workspace/brand combination rather than overwriting existing approvals. Format availability remains composition-specific; see the catalog and release qualification for limits.

## 0.4.0 (2026-09-16)

- `new --batch NAME` picks each draft's layouts from what the batch has not used:
  the 18 production layouts are grouped into eight visual families, unused layouts
  come first, then the family used longest ago, never two of one family in an
  episode, with a gate layout last. Membership lives in a write-once `batch.json`
  beside the episode; the picker rereads each member's current episode, so manual
  layout edits count. `--layouts` sets the scenes explicitly, and the read-only
  `batch NAME` command reports layouts, families, reveals, visual kinds, repeats
  and the next pick. Without a batch, drafts start the same way as before.
- The 55 wave 02 components are production scene records: a version 2 episode
  can reference `wave02:<kind>` in `visuals`, validated by the wave 02 schema and
  drawn into the full 824x820 slot with brand-derived tokens. The renderer is now
  a factory shared by the study and production; wrapped bold text uses 1.5x line
  spacing so heavy display faces never touch. Four synthetic fixture sets qualify
  twelve components in real scenes; catalog cards record production availability
  with human review pending.
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
