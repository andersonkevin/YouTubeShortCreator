# Documentation

[Project overview](../README.md) · [Current state](CURRENT-STATE.md) · [License](../LICENSE) · [Security](../SECURITY.md)

## Choose a Path

| Goal | Read in this order |
| --- | --- |
| Check supported features and publication | [Current generator state](CURRENT-STATE.md), [changelog](../CHANGELOG.md) |
| Operate with an AI assistant | [Start here](../START-HERE.md), [assistant workflow](ASSISTANT-WORKFLOW.md), [episode brief](assistant/BRIEF.md) |
| Reproduce the v0.5.0 compositions | [Installation](INSTALLATION.md), [complete examples](../examples/v0.5.0/README.md), [current gallery](GALLERY.md#v050-compositions) |
| Create a classic Short | [Branding](BRANDING.md), [legacy first Short](FIRST-SHORT.md), [legacy gallery](GALLERY.md#legacy-v1v2-layouts) |
| Produce the next episode | [Workflow](WORKFLOW.md), [CLI](CLI.md), [data contracts](DATA-CONTRACTS.md), [validation](VALIDATION.md) |
| Choose visual assets | [Visual director](assistant/VISUAL-DIRECTOR.md), [visual library](VISUAL-LIBRARY.md), [cinema direction](CINEMA-DIRECTION.md) |
| Maintain the engine | [Architecture](ARCHITECTURE.md), [contributing](../CONTRIBUTING.md), [backend boundary](MEDIA-BACKENDS.md) |
| Resolve a blocked command | [CLI](CLI.md), [troubleshooting](TROUBLESHOOTING.md) |
| Share the project publicly | [Licensing](LICENSING.md), [third-party notices](../THIRD_PARTY_NOTICES.md), [release guide](RELEASING.md) |

## Current Reference

- [Current generator state](CURRENT-STATE.md): supported profiles, compatibility, published source and remaining operator gates.
- [CLI reference](CLI.md): command inputs, path bases and write boundaries.
- [Data contracts](DATA-CONTRACTS.md): v1/v2 and explicit v3 episode fields and bounded scene records.
- [Branding](BRANDING.md): palettes, licensed font selection, logo preparation and approval.
- [Gallery](GALLERY.md): six captures from four v0.5.0 exports, followed by all 18 supported legacy layouts.
- [Architecture](ARCHITECTURE.md): module responsibilities, deterministic capture and privacy boundaries.
- [Validation](VALIDATION.md): active gates and separately scoped qualification results.
- [Local voice synthesis](VOICE.md): optional offline narration, setup, timing and review limits.
- [Cinema direction](CINEMA-DIRECTION.md): full-frame editorial/photographic sequences and local Spanish voice support.
- [Editorial designs](EDITORIAL-DESIGNS.md): three opt-in landscape graphic systems.
- [Editorial Shorts](EDITORIAL-SHORTS.md): legacy v2 diagrams, local news media, light brand and measured highlights; [complete inputs](../examples/editorial-shorts/README.md) and [port review](REUSABLE-PORT-REVIEW.md).
- [Variable typography](VARIABLE-TYPOGRAPHY.md): local variable-font axes and cue-driven treatments.
- [Drawn lettering](LETTERING.md): pen paths, stitched glyphs and controlled text inversion.
- [Visual library](VISUAL-LIBRARY.md): offline catalog, charts, widgets and SVG/PNG preparation.
- [Asset expansion](ASSET-EXPANSION.md), [wave 02](ASSET-LIBRARY-WAVE02.md), [wave 03](ASSET-LIBRARY-WAVE03.md): library component contracts and their dated qualification sections.
- [Visual adapter contract](VISUAL-ADAPTER-CONTRACT.md): supported v2 records and compatibility boundaries.
- [Chart and motion selection](VISUAL-PRESENTATION.md): legacy analytical visuals and bounded motion choices.
- [Media backend boundary](MEDIA-BACKENDS.md): explicit native/FFmpeg dispatch, temporary ownership and failure behavior.
- [Storage and retention](STORAGE.md): disk budgets, protected final renders, owned scratch and approved cleanup.
- [Visual director](assistant/VISUAL-DIRECTOR.md): supervised profile, composition and source selection.

## Dated Release and Example Qualification

- [Release qualification](RELEASE-QA.md): results tied to specific source candidates and versions.
- [Public example qualification](EXAMPLES-QA.md): four exports on 2026-10-18, corrections and limits.
- [Example results JSON](public-examples-qa.json): recorded checks and source/output hashes.
- [Image provenance](images/README.md): origin, hashes and interpretation of documentation images.

## Historical Evidence and Plans

These records preserve the original measurements, failures, approvals and pending
gates. Counts, locks and statements such as "current candidate" or "not pushed"
refer to their dated integration stage. Use [current state](CURRENT-STATE.md) for
present behavior; do not treat old pending tasks as instructions to rerun work.
Existing filenames and links remain stable for provenance.

- [Resource closeout](HYPERFRAMES-CLOSEOUT.md): dated engineering DoD and combined qualification before the source release.
- [Adoption inventory](HYPERFRAMES-INVENTORY.md): source selections, successive implementation checkpoints and original promotion gaps.
- [Integration log](HYPERFRAMES-PILOT.md): pilot effects, multiformat extensions, cinematic requalification and retained failure evidence.
- [Extraction review](HYPERFRAMES-REVIEW.md): early adaptation decisions and review scope.
- [Source asset census](hyperframes-asset-census.json): 455 source definitions, deduplicated media and retained source hashes; see [counting rules](HYPERFRAMES-INVENTORY.md#full-local-asset-census-2026-10-15).
- [Initial production inventory JSON](visual-production-inventory.json): historical selection and source locators, not the latest feature total.
- [Visual-library qualification](VISUAL-LIBRARY-QA.md): original preparation/export checks.
- [Pipeline roadmap](PIPELINE-ROADMAP.md): historical B00-B09 and marketing plan; source publication does not close unexecuted human acceptance.
- [B01 references](B01-QUALIFICATION.md), [B02 widgets](B02-QUALIFICATION.md), [B03 charts/motion](B03-PROGRESS.md), [B03 density](B03-DENSITY.md): compatibility and early visual qualification.
- [B04 native backend](B04-PROGRESS.md), [B05 FFmpeg](B05-PROGRESS.md), [B06 reliability](B06-PROGRESS.md): media, recovery and original human-review boundaries.
- [B07 installation](B07-PROGRESS.md): isolated dependency installations; full first-run operator walkthrough remains unexecuted.
- [B08 independent acceptance](B08-ACCEPTANCE.md): retained protocol; no independent execution is claimed.

## Reading Conventions

Commands run from the repository root unless stated otherwise. `--workspace` is a
global option and goes **before** the command. Paths in episode inputs are relative
to the episode JSON; CLI paths usually refer to the selected private workspace.
[CLI path rules](CLI.md#path-rules) identify the exceptions.

Reference snippets use placeholder IDs and media paths. The separately documented
[complete examples](../examples/v0.5.0/README.md) include actual hash-verified inputs.
Successful automated checks are not approval to publish. `review_required` and
`listening_approval: pending` are deliberate handoff states.

The code is authoritative for implemented behavior. Documentation does not promise
features that have not been implemented or qualify untested operating systems.
