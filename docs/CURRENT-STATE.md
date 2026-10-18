# Current Generator State

[Documentation](README.md) · [Architecture](ARCHITECTURE.md) · [Complete examples](../examples/v0.5.0/README.md)

Maintained overview for the v0.5.0 implementation, checked on 2026-10-18.
Use this page for supported behavior and the distinction between the published
source, retained qualification and historical integration work. Exact accepted
fields remain defined by the code and exposed through `ysc.py compositions`.

## Supported Workflows

| Contract | Output | Duration / scenes | Backend |
| --- | --- | --- | --- |
| Legacy v1/v2 `shorts` | 1080x1920, 30 fps | More than 1 and at most 180 seconds; 3 or 4 scenes | Explicit native or FFmpeg configuration |
| v3 `landscape` | 1920x1080, 30 fps | More than 1 and at most 600 seconds; 1-120 scenes | FFmpeg |
| v3 `portrait` | 1080x1920, 30 fps | Same v3 limits | FFmpeg |
| v3 `square` | 1080x1080, 30 fps | Same v3 limits | FFmpeg |
| v3 `portrait-4x5` | 1080x1350, 30 fps | Same v3 limits | FFmpeg |

The catalog exposes 35 composition families and 80 pinned font files, including
16 variable faces. Family-specific constraints still apply: editorial and diagram
cinema use landscape; photographic cinema supports landscape and portrait with
2-24 verified local stills. Square and 4:5 photographic cinema are not enabled.
Scene beats follow reviewed caption anchors; selecting a profile does not rewrite
the story, crop arbitrary inputs into compliance or shorten the recording.

The original 18 layouts, v2 visual records, batch picker and synthetic regression
utilities remain supported. Their age is not a deprecation notice. New v3 episodes
use a closed storyboard rather than the legacy batch layout picker. The
[classic walkthrough](FIRST-SHORT.md) and [legacy gallery](GALLERY.md#legacy-v1v2-layouts)
remain useful for that workflow; the four complete examples are the entry point
for the newer compositions.

## Publication and Qualification

- The `v0.5.0` tag retains commit `975ec3465ecfdec44fd89a1fc2640772463effb4`,
  delivered through [PR #17](https://github.com/andersonkevin/YouTubeShortCreator/pull/17).
- The complete examples and gallery were added afterward through
  [PR #18](https://github.com/andersonkevin/YouTubeShortCreator/pull/18), merged as
  `cc5b4c39f1953c5f0bff3bfc0ac15312a61da789`. Its
  [main CI run](https://github.com/andersonkevin/YouTubeShortCreator/actions/runs/39108337884)
  passed on Python 3.12 and 3.13, including the Node checks.
- Those examples are available on `main`; the immutable tag does not contain
  these later additions. Post-tag changes are listed under `Unreleased` in the
  [changelog](../CHANGELOG.md). This documentation refresh does not move the tag.
- The retained v0.5.0 example lock was
  `42b08b645219d28ed28919380e5ca00bf0ce6b0a289ef1540e1ce7700866ee0e`.
  Post-tag [storage hardening](STORAGE.md) changes the current lock without
  rewriting previous approvals. Verify the checked-out implementation with `python3 -B -c 'import workflow; print(workflow.verify_lock())'`.
  Older locks in dated receipts apply only to those earlier runs.

The [release qualification](RELEASE-QA.md) records the v0.5.0 source/portrait
checks. The [example qualification](EXAMPLES-QA.md) records four actual exports on
2026-10-18 and six gallery frames. Earlier four-format cumulative exports and the
600-second qualification remain dated evidence in the integration history.
Updating documentation does not rerender or reapprove any of those films.

The example delivery ran 647 Python tests (640 passed, seven skipped) and 518
Node tests (517 passed, one skipped) in an isolated public source tree. These
counts describe that delivery, not a promise about every later checkout. Run the
commands in [Contributing](../CONTRIBUTING.md#before-review) for a new candidate.

## Remaining Boundaries

Full media production is qualified on macOS. Linux CI exercises source contracts;
it does not qualify Linux or Windows video rendering. No graphical timeline,
automatic publication, provider service or background worker is included.

Approved brand hashes, input provenance, strict schemas, word-timed captions,
runtime qualification, no-overwrite behavior and `review_required` remain in
force for every profile. Technical checks do not grant listening, editorial,
rights or publication approval. Independent-operator acceptance and the historical
first-run/human-review gates have not been closed by the source release.

Private channel recordings, approvals, runtime files, outputs and session notes
stay outside the public source tree. The only bundled narration is the four
manifest-verified public example WAVs. See [release boundaries](RELEASING.md).

## Historical Records

The [historical evidence index](README.md#historical-evidence-and-plans) groups
integration inventories, pilot runs, B01-B08 records and the older pipeline plan.
Their original hashes, counts, failures, decisions and pending gates are retained.
Statements such as "current candidate" or "not pushed" inside those records
refer to their dated scope, not the current repository. They are not an active
task queue or authorization to rerun media, migrate approvals or publish content.
