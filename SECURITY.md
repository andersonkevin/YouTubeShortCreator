# Security and Privacy

This is a single-operator local tool, not a sandbox for hostile projects.
Review code before running it. Runtime executable paths and template code are
trusted operator inputs; never accept them from a downloaded episode.

Version 0.1.0 is the documented release. No support SLA, external penetration test
or security certification is claimed. See [Architecture](docs/ARCHITECTURE.md) for
the actual process and data boundaries.

Episode JSON only fills escaped text and validated timing slots. It cannot supply
HTML, CSS, executable commands, external URLs or runtime paths. File paths are
contained, symlinks are rejected within workspaces, and imports require explicit
operator action. JSON rejects duplicate keys and non-finite values.

Writers require confirmation or `--approve-write`. Runs and approvals do not
overwrite existing files. A failed run retains its partial output and a failure
record. Only each invocation's own temporary frames/audio cache are removed.

SHA-256 locks detect accidental changes, not an attacker who can edit code and
locks together. This tool does not provide multi-user isolation or signature-based
approval. Do not edit a workspace while a render is running.

No publishing, analytics, background agent, credentials, API integration or cloud
fallback is implemented. Browser page network requests are blocked and reported.
The separately installed browser/OS may have their own background behavior.
Speech transcription requires an already-installed compatible local model.

Keep channel work under `workspace/`, `workspaces/`, or outside the repository.
Before sharing, run `python3 tools/release.py audit`. Only its allowlisted release
archive is intended for source distribution. Never upload your whole working
directory, Git history, or HTML run asset folders without reviewing them.

Report reproducible issues without private audio, credentials or customer data.
Use a minimal synthetic fixture, runtime versions and the failing check.

## Reporting a Vulnerability

A public repository/contact channel has not yet been configured. Do not post live
credentials, customer media or a weaponized reproduction to obtain support. After
publication, use the private reporting channel actually advertised by the maintainer;
if none exists, request a private contact without disclosing the sensitive details.

Include affected version, prerequisites, impact, a minimal safe reproduction and
sanitized evidence. There is no promised response deadline. This document does not
enable GitHub private reporting automatically; the publisher must configure an
appropriate channel before accepting confidential reports.

## Residual Risks

- Native image/audio decoders process operator-supplied files; validate their source
  and keep your runtime patched. A filename extension is not proof of safe content.
- Runtime checks record versions, not signed dependency/executable provenance.
- Input hashing and post-run checks do not make concurrent edits transaction-safe.
- The browser request check is page-level, not an OS-wide network isolation policy.
- The source audit has an allowlist and selected text patterns, not comprehensive
  secret discovery, image-content inspection, licensing clearance or Git-history review.
- Read-only commands can invoke installed tools to obtain version information; they
  do not represent untrusted-executable isolation.

Never weaken these boundaries to make an example or render pass. Public sharing
requires a separate [release review](docs/RELEASING.md).
