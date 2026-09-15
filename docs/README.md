# Documentation

[Project overview](../README.md) · [License](../LICENSE) · [Security](../SECURITY.md)

## Choose a Path

| Goal | Read in this order |
| --- | --- |
| Operate with Codex or Claude Code | [Start here](../START-HERE.md), [assistant workflow](ASSISTANT-WORKFLOW.md) |
| Create your first Short | [Installation](INSTALLATION.md), [branding](BRANDING.md), [first Short](FIRST-SHORT.md) |
| Produce the next episode | [Workflow](WORKFLOW.md), [data contracts](DATA-CONTRACTS.md), [validation](VALIDATION.md) |
| Pick or extend visual assets | [Visual director](assistant/VISUAL-DIRECTOR.md), [visual library](VISUAL-LIBRARY.md), [asset expansion](ASSET-EXPANSION.md) |
| Change a layout or understand the engine | [Gallery](GALLERY.md), [architecture](ARCHITECTURE.md), [contributing](../CONTRIBUTING.md) |
| Resolve a blocked command | [CLI](CLI.md), [troubleshooting](TROUBLESHOOTING.md) |
| Share the project publicly | [Licensing](LICENSING.md), [third-party notices](../THIRD_PARTY_NOTICES.md), [release guide](RELEASING.md) |

## Reference

- [Visual library](VISUAL-LIBRARY.md): offline catalog, charts, widgets and SVG/PNG asset preparation.
- [Visual-library qualification](VISUAL-LIBRARY-QA.md): observed tests, export checks and integration limits.
- [Asset expansion](ASSET-EXPANSION.md): design-review components for AI-programming topics, their bounds, QA evidence and the integration checklist.
- [Visual director](assistant/VISUAL-DIRECTOR.md): supervised selection and source-review procedure.
- [Pipeline roadmap](PIPELINE-ROADMAP.md): integration and qualification gates; marketing remains separate.
- [CLI reference](CLI.md): every command, path base and write boundary.
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
