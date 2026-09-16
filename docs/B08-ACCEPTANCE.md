# Independent Operator Acceptance

[Pipeline plan](PIPELINE-ROADMAP.md) | [Start here](../START-HERE.md) |
[First Short](FIRST-SHORT.md) | [Review checklist](VALIDATION.md)

Status: test protocol prepared; the operator confirmed on 2026-09-15 that no
independent tester is currently available. Execution is pending. No onboarding,
editorial approval or independent production result is claimed by this document.

## Purpose and Boundaries

An operator who did not implement the project must produce two episodes using
the documented workflow. Normal assistant help is allowed, but it must use the
entry documentation rather than hidden maintainer setup or handcrafted approval
records. This tests usability and repeatability, not audience growth.

Use a fresh extracted source candidate or a separately agreed checkout. Do not
copy a maintainer's brand approval, runtime JSON, installed packages or private
media. A fresh environment on the same Mac is not a new-machine qualification.
The first real walkthrough can also supply the still-missing B07 first-run
evidence; record that execution explicitly instead of retroactively calling a
synthetic fixture an onboarding test.

Do not publish either episode during acceptance. The expansion's 14 study
components remain `design_review`, not supported production scene types. Select
only currently supported layouts and visual records. Preserve the fixed caption
system and any previously reviewed wording/timing; corrections need separate
operator approval and new input versions.

## Before Starting

The operator records these items privately, leaving unknowns pending:

- Source commit or candidate archive SHA-256 and acquisition method.
- Operator alias, independence from implementation, date and host OS/architecture.
- Agreed test scope and privacy settings of the chosen assistant.
- Existing Python, Node/npm, Chrome, Swift and optional FFmpeg availability.
- Local speech prerequisites or an authorized word-timed transcript import path.
- Channel preferences, permission for any generated wordmark, and font rights.
- Two reviewed scripts, final recordings and thumbnail artwork with usage rights.
- Separate consent for dependency downloads; none is implied by opening the ZIP.

Keep personal paths and recordings in private workspace notes, not public issues.
No paid voice generation, model download or external transfer is required by the
test protocol. Missing prerequisites are recorded, not silently installed.

## Execution and Evidence

| Step | Action | Required result | Definition of done |
| --- | --- | --- | --- |
| 1 | Follow Installation from the extracted source | Fresh dependency setup and CLI help | Exact commands, versions and failures recorded; no maintainer module reuse |
| 2 | Run interactive onboarding from Start Here | New brand preview | Operator supplies preferences; no fabricated approval JSON |
| 3 | Inspect preview, explicitly approve, configure, run doctor | Locked brand and measured runtime | Actual operator decision and passing doctor; stop on disagreement |
| 4 | Follow First Short for episode one | Imported final audio/artwork, timed transcript and reviewed captions | Source hashes retained; words and timing checked against the recording |
| 5 | Replace draft content and select supported visuals | Valid episode, preview and handoff copy | No placeholder claims; one main visual idea per scene; data provenance retained |
| 6 | Render with a new run ID and review the MP4 | Video, cover, captions, metadata and QA records | All applicable checks pass and operator reviews actual picture/audio |
| 7 | Restart from the documentation in a new assistant session | Existing brand/runtime recovered without edits | Resume uses workspace evidence, not memory of prior setup |
| 8 | Produce episode two with distinct content and a different supported composition | Second complete reviewed package | No source-code changes or brand rebuilding needed for ordinary production |
| 9 | Record issues, repeat corrected failing steps, submit private acceptance notes | Reproducible usability evidence | Unresolved issues and limits remain explicit; no automatic publication |

Use [Installation](INSTALLATION.md), [First Short](FIRST-SHORT.md) and
[CLI path rules](CLI.md#path-rules) for exact commands. Do not create the selected
workspace directory before `init`; onboarding expects it not to exist. All later
commands must select that same workspace, with `--workspace` before the command.
Use a new filename or run ID for every retry; preserve failed output evidence.

Use the complete authorized voice track, up to the supported 180-second ceiling.
Do not shorten or accelerate it to make the test pass. Automatic transcription
must be reviewed; synthetic signal timings cannot substitute for spoken captions.
Do not double the voice or burned-in captions in an external editor.

## Private Result Template

Create a new note in the test workspace's `session-notes/` after the operator
authorizes writing it. This is a recording aid, not a tool-generated approval.

```text
Source revision/archive hash: pending
Operator alias and independence: pending
Test date and environment: pending
Download and assistant privacy consent: pending
Setup commands, versions and observed errors: pending
Brand preview path and explicit operator decision: pending
Runtime/doctor evidence: pending
Episode 1 input hashes, run path and QA outcome: pending
Episode 1 visual/listening/editorial decision: pending
Resume procedure and assistance needed: pending
Episode 2 input hashes, run path and QA outcome: pending
Episode 2 visual/listening/editorial decision: pending
Issues, repairs, rerun evidence and unresolved limitations: pending
Independent acceptance decision and exact scope: pending
Publication: not requested
```

For each issue, record step, expected behavior, observed behavior, sanitized error,
severity, workaround and whether the corrected step was repeated. If implementation
help was necessary, disclose it; a repair without a repeated test is not a pass.

## Acceptance Decision

B08 passes only when the independently operated first run and second episode have
actual evidence, applicable QA passes, and the operator explicitly accepts the
results. Review logo/palette, captions against speech, pacing, code/data accuracy,
phone-size legibility, thumbnail and asset rights. A developer's self-test, a
passing source audit or a README screenshot cannot satisfy this decision.

Keep failures and unavailable prerequisites visible. This gate does not approve
publication, new operating systems, all possible fonts, untested study assets or
the remaining release/marketing batches. Earlier batch review gates remain separate.
