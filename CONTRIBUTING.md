# Contributing

[Project overview](README.md) · [Architecture](docs/ARCHITECTURE.md) · [Security](SECURITY.md)

## Development Principles

Keep changes scoped, local-first and reviewable. Preserve the division between
template geometry, approved branding, episode content and run evidence. Do not
introduce a service, account integration, remote model call, automatic publishing
or background execution without a separate design and explicit approval.

Inspect `git status --short` before editing. Do not overwrite another contributor's
work or stage private workspaces. The project has no automatic commit/push behavior.

## Setup

Follow [Installation](docs/INSTALLATION.md). Use the declared dependencies and
existing local runtimes. There is no remote CI or hosted test environment configured
by default. Native media adapters require a compatible macOS/Swift environment.

## Change Categories

| Change | Minimum verification |
| --- | --- |
| Documentation | Local links, images, JSON examples and command coverage via docs checker |
| CLI or file boundaries | Unit tests for arguments, approvals, path containment and no-overwrite |
| Caption logic | Word coverage, timing boundaries, wrong-input rejection and real narration QA |
| Templates or typography | All affected layouts, desktop/mobile checks, actual screenshots |
| Capture/encode/mux | Native render, seek parity, decoded media and source/export waveform QA |
| Packaging or privacy rules | Allowlist/exclusion tests, source audit and archive inspection |

Use temporary fixtures, not user recordings or production governance data. Keep
synthetic examples clearly labeled and never fabricate performance measurements.

## Before Review

```bash
python3 -B -m unittest discover -s tests -v
python3 -B tools/check_docs.py
python3 -B tools/release.py audit
git diff --check
```

When changing locked implementation files, inspect the candidate printed by
`python3 tools/freeze.py`, qualify the change, and update the lock through a normal
reviewed source edit. Do not auto-accept a new lock simply because a drift check failed.
Changes to docs/tools do not justify changing the production lock unnecessarily.

Describe what changed, why, validation performed, any untested cases, and whether
runtime, data, dependencies, network access or write behavior changed. Avoid unrelated
formatting sweeps or architectural migrations.

## Adding a Layout

Start with a known layout contract. Define a fixed tree, exact content/motion keys,
bounded timing and an example whose copy fits. Reuse the shared capture clock.
Keep code and graphics useful to the explanation; decorative motion is not a
substitute for an understandable scene. Extend tests and the gallery only after QA.

## Reporting Bugs

Provide a minimal reproduction, versions, exact command/error and sanitized evidence.
Do not attach credentials, real customer data or private voice files. Security-sensitive
issues follow [Security](SECURITY.md), not a public demonstration with confidential data.

## Rights and Attribution

Only contribute work you may license under this project's MIT terms. Preserve
upstream notices and identify third-party material. There is no formal CLA workflow
or automated rights verification. Font binaries, voice recordings and customer logos
do not belong in source control. Read [Licensing](docs/LICENSING.md) before adding assets.

No response-time guarantee, long-term support commitment or maintainer contact
address is invented by this document. Release decisions remain explicit maintainer actions.
