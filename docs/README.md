# Documentation

[Project overview](../README.md) · [License](../LICENSE) · [Security](../SECURITY.md)

## Choose a Path

| Goal | Read in this order |
| --- | --- |
| Operate with an AI assistant | [Start here](../START-HERE.md), [assistant workflow](ASSISTANT-WORKFLOW.md) |
| Create your first Short | [Installation](INSTALLATION.md), [branding](BRANDING.md), [first Short](FIRST-SHORT.md), [local voice synthesis](VOICE.md) (optional) |
| Produce the next episode | [Workflow](WORKFLOW.md), [data contracts](DATA-CONTRACTS.md), [validation](VALIDATION.md) |
| Pick or extend visual assets | [Visual director](assistant/VISUAL-DIRECTOR.md), [visual library](VISUAL-LIBRARY.md), [asset expansion](ASSET-EXPANSION.md), [asset library wave 02](ASSET-LIBRARY-WAVE02.md), [asset library wave 03](ASSET-LIBRARY-WAVE03.md) |
| Change a layout or understand the engine | [Gallery](GALLERY.md), [architecture](ARCHITECTURE.md), [contributing](../CONTRIBUTING.md) |
| Resolve a blocked command | [CLI](CLI.md), [troubleshooting](TROUBLESHOOTING.md) |
| Share the project publicly | [Licensing](LICENSING.md), [third-party notices](../THIRD_PARTY_NOTICES.md), [release guide](RELEASING.md) |

## Reference

- [Visual library](VISUAL-LIBRARY.md): offline catalog, charts, widgets and SVG/PNG asset preparation.
- [Visual-library qualification](VISUAL-LIBRARY-QA.md): observed tests, export checks and integration limits.
- [Asset expansion](ASSET-EXPANSION.md): design-review components for AI-programming topics, their bounds, QA evidence and the integration checklist.
- [Asset library wave 02](ASSET-LIBRARY-WAVE02.md): 55 further design-review components across general-purpose forms, widgets, data, systems, AI and software, with a searchable catalog, own QA checks and the integration checklist.
- [Asset library wave 03](ASSET-LIBRARY-WAVE03.md): 24 generated palettes with contrast rules and 10 deterministic motion recipes for the design-review components, with their QA and integration checklist.
- [Visual director](assistant/VISUAL-DIRECTOR.md): supervised selection and source-review procedure.
- [Pipeline roadmap](PIPELINE-ROADMAP.md): integration and qualification gates; marketing remains separate.
- [Visual adapter contract](VISUAL-ADAPTER-CONTRACT.md): opt-in v2 structure, enabled widgets and regression boundaries.
- [B02 qualification](B02-QUALIFICATION.md): widget media, two palettes, technical human review and classic pixel parity.
- [Chart and motion selection](VISUAL-PRESENTATION.md): analytical visuals, stacked bars and selectable slide/fade presets under B03 qualification.
- [B03 qualification](B03-PROGRESS.md): three encoded chart/motion samples, density checks and operator technical approval.
- [B03 density](B03-DENSITY.md): dense datasets, label-collision rejection and numeric extremes across palettes and scene counts.
- [Media backend boundary](MEDIA-BACKENDS.md): explicit native dispatch, runtime capabilities, temporary ownership and failure behavior.
- [B04 qualification](B04-PROGRESS.md): native fixture comparisons, observed raster differences and operator technical approval.
- [B05 progress](B05-PROGRESS.md): optional FFmpeg, three-minute format matrix, full-voice listening approval and pending animated review.
- [B06 progress](B06-PROGRESS.md): failure recovery, atomic JSON records, audio-tail checks and encoded-frame regression.
- [B07 progress](B07-PROGRESS.md): operator-approved isolated installs, lockfile reproduction and native/FFmpeg fixtures; full first-run walkthrough remains unexecuted.
- [B08 acceptance](B08-ACCEPTANCE.md): independent operator protocol, two-episode evidence and explicit acceptance boundaries; execution pending.
- [CLI reference](CLI.md): every command, path base and write boundary.
- [Local voice synthesis](VOICE.md): optional offline narration with Kokoro, its setup, records, rules and limits.
- [Data contracts](DATA-CONTRACTS.md): episode fields, caption timing and safe examples.
- [Branding](BRANDING.md): palettes, fonts, logo preparation and approval.
- [Gallery](GALLERY.md): all 12 layouts with actual screenshots and source links.
- [Architecture](ARCHITECTURE.md): module responsibilities, capture clock and privacy boundaries.
- [Release qualification](RELEASE-QA.md): tested environment and measured outcomes.
- [Image provenance](images/README.md): origin, hashes and interpretation of documentation images.

## Reading Conventions

Commands run from the repository root unless stated otherwise. `--workspace` is a
global option and goes **before** the command. Paths in episode inputs are relative
to the episode JSON; CLI paths usually refer to the selected private workspace.
[CLI path rules](CLI.md#path-rules) identify the exceptions.

Example IDs and media paths are placeholders, not preinstalled production assets.
Successful automated checks are not approval to publish. `review_required` and
`listening_approval: pending` are deliberate handoff states.

The code is authoritative for implemented behavior. Documentation does not promise
features that have not been implemented or qualify untested operating systems.
