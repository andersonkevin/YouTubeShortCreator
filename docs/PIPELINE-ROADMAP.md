# Pipeline Completion Plan

[Docs index](README.md) | [Visual library](VISUAL-LIBRARY.md) |
[Qualification](VISUAL-LIBRARY-QA.md) | [Architecture](ARCHITECTURE.md)

Planning baseline: 2026-09-15, commit `6ffd3cb`. This is the execution plan for a
qualified assistant-operated local workspace, not a promise of universal platform
support or autonomous production. A batch passes only with observed evidence.

## Completion Target

A new operator on the qualified macOS setup can follow the docs to approve a
brand, supply authorized narration, prepare reviewed timed captions, select useful
visuals, export a Short and inspect its MP4, cover, captions and YouTube handoff.
The operator can explicitly select the native or qualified FFmpeg media backend.
Source installation, private output boundaries and failure recovery are tested.

Keep 1080x1920, 30 fps, three/four scenes, the 180-second Shorts ceiling, fixed
logo/progress/caption zones and manual publication. Long-form videos, light themes,
Windows/Linux qualification, an editor, hosting, provider APIs, automatic uploads
and background agents are outside this plan. FFmpeg does not imply those features.

Operator scope update, 2026-09-15: replace the internal 90-second ceiling with
recording-driven duration up to YouTube's three-minute Shorts format. Reuse the
authorized 156.68-second narration whole for private B05 QA, not a 60-second
excerpt. Requalify frame/caption boundaries and both backends under the new lock.

Two milestones have separate definitions of done:

- **Pipeline complete:** B00-B09 pass, including human review and release gates.
- **Marketing workflow complete:** M01-M03 pass after the pipeline, with evidence
  and manual editorial approval. Neither milestone promises audience growth.

No version number or release tag is assigned until the maintainer approves it.

## Batch Ledger

| Batch | Scope | Depends on | Current state | Exit evidence |
| --- | --- | --- | --- | --- |
| B00 | Baseline and execution plan | Published library | Complete | Clean starting tree, source inspection, baseline checks below |
| B01 | Opt-in adapter contract and regression fixtures | B00 | Complete | [Design](VISUAL-ADAPTER-CONTRACT.md), 24-scene references, negative cases and [qualification](B01-QUALIFICATION.md) |
| B02 | Icons, compositions and three widgets in video | B01 | Complete | [Qualification](B02-QUALIFICATION.md): two native renders, human technical approval, 56 viewport cases, exact classic parity |
| B03 | Eight chart forms and selectable motion | B02 | Complete | [Density/palette matrix](B03-DENSITY.md), native requalification and [operator technical approval](B03-PROGRESS.md) |
| B04 | Explicit media backend boundary | B03 | Complete | [Native exports, classic parity, package checks and operator technical approval](B04-PROGRESS.md) |
| B05 | FFmpeg encoding, mux and verification | B04 | In progress | [22 comparisons, full-voice listening, animated exports and package checks](B05-PROGRESS.md); technical visual approval pending |
| B06 | Full pipeline reliability and release regression | B05 technical candidate | Review pending | [182 Python/9 Node checks, 3 exports, 22 media cases and extracted package](B06-PROGRESS.md); human review deferred by operator |
| B07 | Clean dependency installation and first run | B06 | Technical scope approved | [Operator approval, fresh installs, lock reproduction and both backend fixtures](B07-PROGRESS.md); full first-run walkthrough still unexecuted |
| B08 | Independent operator acceptance | B07 | Not started | Another operator completes the documented workflow |
| B09 | Portfolio-ready release and authorized push | B08 | Not started | Audited archive, approved demo, remote commit verification |
| M01 | Evidence-based copy procedure | B09 | Deferred | Source-backed brief, hook/solution/ending, editorial checklist |
| M02 | Copy validation and private handoff | M01 | Deferred | Fixtures, validators, documented assistant procedure |
| M03 | Three-Short editorial pilot | M02 | Deferred | Three reviewed packages; measurement plan without invented data |

Work sequentially. If a gate needs user input, mark that gate blocked and continue
only work that does not depend on it. Do not silently reduce acceptance criteria.
Recheck Git and the ledger at the start of each batch; this document is context,
not an approval record or an executable instruction embedded in episode data.

## Common Definition of Done

1. Scope implemented or explicitly a design-only batch; no unrelated refactors.
2. Targeted tests pass, then the full suite, docs checker, release audit and diff
   checks. A growing test count alone is not evidence of adequate coverage.
3. Media changes have real encoded-media/audio QA, relevant screenshots and human
   review. Record pending listening or visual approval as pending, not passed.
4. New write boundaries have traversal, symlink, overwrite, malformed-input and
   failed-run tests. No runtime installs, network providers or silent fallbacks.
5. Docs match available commands, limitations, compatibility and license inventory.
6. Record commands, tool versions, source/input hashes, outputs, observed results
   and unresolved risks. Private assets stay in an ignored qualification workspace.
7. Review intentional engine-lock changes through a candidate. Never rewrite old
   brand approvals to make new implementation hashes pass. Qualify a new workspace.
8. Update this ledger. Commit, push, tags and releases require operator authorization
   for that handoff; the previous push is not standing permission for future ones.

Recurring baseline commands, run from the repository root:

```sh
git status --short
python3 -B -m unittest discover -s tests -v
node --test tests/*.test.mjs
python3 -B tools/check_docs.py
python3 -B tools/release.py audit
git diff --check
```

For source packaging, create a new ZIP using the documented release tool, inspect
it, extract it into a new temporary directory, and run tests/docs/audit there too.
This does not replace B07's fresh dependency installation.

## B00: Baseline and Plan

| Action | Result | Definition of done |
| --- | --- | --- |
| Inspect source, contracts, lock, runtime and latest qualification | Verified starting state | Distinguish implemented assets from pending production support |
| Identify integration points and dependencies | Module map below | Each remaining feature has an owner module and a test boundary |
| Define batches, approvals and release scope | This plan | Every batch has actions, outputs and objective exit criteria |

Observed baseline: `main` clean and synchronized at `6ffd3cb` before these docs
edits; 91 tests, docs checks and source audit passed. The previous delivery also
qualified 33 study/viewport combinations and a 149-file extracted source archive.
Those are retained asset-library results, not fresh production video evidence.

Source findings driving the next batches:

- `workflow.py` accepts exactly v1 episodes and text/motion slots, not chart data.
- `capture.mjs` owns temporary frames and directly invokes `encode.swift`.
- `workflow.py` directly invokes native mux, media QA and audio decoders.
- `runtime.py` requires macOS and four exact runtime paths; no backend selection.
- `tools/freeze.py` does not currently cover the visual-library code/vendor tree.
- `gallery.js` owns study UI, hardcoded study colors/fonts and its own playback;
  embedding that page inside a production scene is not a valid integration.
- The public template still contains the right-side `#film::after` decoration.
  The channel experiment's correction was not a public-template qualification.
- `SECURITY.md` and the release guide retain initial-publication language; B09
  must verify the actual reporting route and current repository presentation.

## B01: Contract and Reference Fixtures

| Action | Result | Definition of done |
| --- | --- | --- |
| Design an explicit opt-in episode extension | Versioned visual-scene contract | Exact keys, bounded data, asset IDs, timings and rejection rules documented; old v1 records remain unchanged |
| Define adapter-owned visual slots and brand mapping | Fixed geometry specification | No input HTML/CSS/SVG/JS, file-selected scripts, raw ECharts options or remote asset URLs |
| Map engine/vendor hashing and migration | Drift-detection design | Adapter and vendor bytes covered; old approved workspaces preserved, never auto-migrated |
| Build neutral fixtures and capture current legacy layouts | Reproducible reference set | Twelve legacy layouts, both scene counts, long labels and caption boundaries; private captures with source/environment hashes |
| Review the right-side decoration as a separate visual decision | Recorded expected appearance | Do not mix an intentional branding fix into an alleged zero-diff legacy regression |

Touchpoints: `workflow.py`, `ysc.py`, `branding.py`, `tools/freeze.py`, scene and
data-contract docs, synthetic tests. First deliver the design and fixtures; do not
enable new production input types until B02 validates them end to end.

Fit against computed production geometry, not the study canvas. Current base
visual bounds are x=100, y=650, width=824, height=820. Scene notes begin at y=1485,
spoken captions at y=1590, and the progress bar at y=82. Some layouts have their
own overrides. Read all applicable CSS and check actual bounds in the browser.

Exit: reviewed implementation contract and reproducible baseline captures, with
no claim that new visuals can already be rendered through the production CLI.

Completed 2026-09-15: see the linked B01 qualification. The operator-approved
bracket removal is separately qualified against the retained old reference.
At B01 closeout, production visual scenes were pending B02/B03. Subsequent widget
qualification is recorded separately below. B01 does not grant release approval.

## B02: Icons and Widgets

| Action | Result | Definition of done |
| --- | --- | --- |
| Separate reusable visual construction from study navigation | Small shared renderer boundary | Gallery remains usable; production imports no gallery controls, global timer or duplicated option builders |
| Add known icon/composition IDs and flow, metric, comparison slots | Opt-in production visuals | Forty icons and six compositions resolve from pinned assets; unknown IDs and unsafe data fail before run creation |
| Derive colors/fonts from approved branding | Channel-consistent render | No hardcoded study palette, system-font substitution or geometry changes; two neutral dark brands pass contrast/fitting review |
| Drive reveals/highlights from the existing caption clock | Deterministic animation | Forward/backward/repeated seeks agree; numbers never change merely to animate |
| Render mixed legacy/widget episodes | Real native MP4s | Three- and four-scene examples pass media/audio QA and human visual/listening review |

Touchpoints: visual library, adapter, episode validator/builder, capture checks,
template extension and tests. Avoid a second recorder. Preserve captions, source
audio, thumbnail type zone and the existing progress/logo positions.

Exit: widgets and symbols are selectable production tools, not only exported PNGs;
all legacy reference checks pass except separately reviewed intentional changes.

Completed 2026-09-15: see [B02 qualification](B02-QUALIFICATION.md). The operator
approved the two fixtures' technical review, not publication. Original run reports
remain unchanged; analytical charts and release approval are still pending.

## B03: Charts and Data Semantics

Operator scope addition, 2026-09-15: include selectable fades/slides, optional
fade exits and additive stacked bars. Keep them bounded and deterministic; do not
introduce an arbitrary animation editor or animate numeric data into false values.
See the [presentation contract](VISUAL-PRESENTATION.md).

| Action | Result | Definition of done |
| --- | --- | --- |
| Integrate line, bar, pie/donut and timeline | Four explanatory chart forms | Units, totals, ordering and labels match bounded input data |
| Integrate scatter, heatmap, correlation and geo | Four analytical chart forms | Paired observations preserved; constant/invalid correlations rejected; no implied causation or hidden geographic ranking |
| Preserve source kind, source label/date and necessary caveats | Traceable visual claims | Illustrative data visibly identified; measured inputs remain subject to human source review |
| Add meaningful clock-based reveal/highlight | Useful motion | No fabricated interpolated measurements; same requested time yields the same visual |
| Run boundary datasets across all viewports | Complete integration matrix | Eight forms at 1080x1920, 1440x900, 390x844 and 375x667; no clipped labels or overlap |

Cover the library's current data bounds rather than adding unlimited datasets.
Do not fetch databases or expand to arbitrary map files. New vendor dependencies
or asset downloads require separate approval and provenance review.

Exit: every chart form has valid and invalid fixtures, production screenshots and
at least one encoded scene covered by timing/audio QA; library claims distinguish
production-ready forms from any explicitly unfinished ones.

## B04: Backend Boundary

| Action | Result | Definition of done |
| --- | --- | --- |
| Separate frame capture from encoder dispatch | One capture path, explicit backend | No duplicate renderer; deterministic frame count and timestamps remain unchanged |
| Add runtime-owned backend selection and capability checks | Validated configuration | Episode data cannot choose executables/arguments; missing tools or capabilities fail clearly |
| Route native encode/mux/QA through the boundary | Native compatibility | Existing fixtures retain geometry, audio/timing and deliverables; no hidden FFmpeg fallback |
| Define temporary-frame ownership and error handling | Predictable failures | Cleanup affects only the invocation's scratch files; failed-run evidence and source inputs survive |

Touchpoints: `runtime.py`, `ysc.py`, `capture.mjs`, `workflow.py`, native adapters,
tests and installation docs. Do not turn the project into a plugin framework.

Exit: native backend still passes end to end; the selection contract is tested
before FFmpeg is advertised as usable. Remain macOS-qualified only.

## B05: FFmpeg Backend

| Action | Result | Definition of done |
| --- | --- | --- |
| Add explicit FFmpeg/ffprobe runtime paths and version/capability checks | Optional local backend | Native runs do not require FFmpeg; selected FFmpeg failures never fall back silently |
| Encode the existing frames and mux the original recording | H.264 MP4 with one audio track | 1080x1920, 30 fps, correct frame count/duration, no audio stretching or duplicate narration |
| Add media inspection and PCM decoding | Comparable evidence | Validated stream metadata and waveform comparison, with backend/version/input hashes recorded |
| Test diverse audio cases against both backends | Comparison matrix | WAV, MP3, M4A and Opus; mono/stereo; 44.1/48 kHz; lead/trailing silence, non-frame-aligned audio and near-limit duration |
| Measure time and size on identical inputs | Honest tradeoff report | Record actual measurements; do not promise FFmpeg is faster or smaller in advance |
| Document external binary and codec licensing inventory | Distribution boundary | No FFmpeg binary redistribution or automatic installation; actual selected build recorded |

Existing waveform acceptance is duration difference <=80 ms, absolute lag <=10 ms
and zero-lag correlation >=0.97 for each checked voiced window. These are current
project test limits, not perceptual guarantees. Do not loosen them just to pass a
new backend. Silence-only fixtures must fail with a clear no-voiced-audio result.
Synthetic signals test timing; an authorized real narration is also required,
kept private and reviewed by listening, to close this batch.

Exit: both backends qualify on the matrix and the selected real narration. The
separate channel experiment is supporting context, not this repository's proof.

## B06: Reliability and Regression

Operator instruction, 2026-09-15: continue technical work and review later. This
allows B06 work against the tested B05 candidate while its visual gate remains
pending. It does not approve B05 visuals, waive later gates or authorize release.

| Action | Result | Definition of done |
| --- | --- | --- |
| Exercise shared failure boundaries | Negative test matrix | Malformed/duplicate/nonfinite JSON, traversal, symlinks, changed inputs, vendor drift, missing tools and existing run IDs fail safely |
| Check duration, cues and scene transitions | Timing regression set | Both scene counts, 180-second boundary, caption gaps, final frame and wrong-audio rejection covered |
| Extend visual checks to encoded frames and all new labels | Output-level QA | Nonblank pixels, safe zones, clear text, loaded icons/fonts, no page HTTP(S), deterministic seeks |
| Test interrupted subprocesses and partial writes | Recovery instructions | No success record on failure, existing output remains unchanged, retry uses a new ID |
| Qualify implementation candidate and docs | Reviewed baseline | Lock and input changes are deliberate; no production approval files fabricated or overwritten |

Exit: a bounded release regression suite runs with one documented sequence. No
unresolved critical/high-risk correctness, privacy, destructive-write or sync bug;
lower-risk limitations are recorded with reproduction and release impact.

## B07: Clean Installation

| Action | Result | Definition of done |
| --- | --- | --- |
| Obtain explicit approval for package downloads | Isolated setup scope | No system/global changes; agreed new local qualification directory |
| Install declared dependencies into fresh environments | Reproducible dependency set | Python and npm resolve successfully without reusing the maintainer's installed modules; review generated lock data |
| Follow docs from onboarding to native render | New-operator walkthrough evidence | No undocumented paths, copied runtime JSON, fabricated approvals or private maintainer assets |
| Configure/test FFmpeg separately, then test extracted archive | Distribution proof | Both source forms work; missing speech models/tools produce actionable errors |
| Update compatibility and troubleshooting from observations | Accurate setup docs | Distinguish fresh dependencies on the same host from a genuinely fresh machine |

Exit: first-render evidence with actual versions, setup commands and authorized
assets. An unavailable package, speech model or font blocks the relevant path;
do not replace dependencies or download models silently.

## B08: Independent Operator

| Action | Result | Definition of done |
| --- | --- | --- |
| Choose an operator other than the implementation author | Independent acceptance | Operator and test scope agreed; cloud-assistant privacy acknowledged |
| Ask them to use only entry docs plus normal assistance | Usability evidence | Brand preview/approval, intake, timing review, visual selection, export and handoff completed |
| Record unclear steps, manual repairs and defects | Issue list | No hidden maintainer-only fixes; instructions corrected and failing steps repeated |
| Review the actual exported Short | Human acceptance | Logo, palette, thumbnail, narration/subtitle sync and legibility explicitly reviewed |

Exit: the independent operator can repeat the workflow with a second episode.
An assistant self-test is useful but cannot satisfy this independent-human gate.
Lack of an available operator stays a visible blocker, not a simulated pass.

## B09: Release and Portfolio

Independent documentation preparation: the public upstream and its `main` commit
were checked on 2026-09-15, and stale first-publication instructions were corrected
in the [release guide](RELEASING.md). This is not B09 acceptance: B05-B08 review/
installation gates, private security contact, approved release content and an
authorized push remain outstanding. No remote write was performed.

| Action | Result | Definition of done |
| --- | --- | --- |
| Assemble current QA and known limitations | Release record | Evidence distinguishes retained, rerun, human-reviewed and untested claims |
| Update overview, architecture, commands and demo | Professional presentation | Real approved neutral visuals; no customer branding, voice files, metrics or runtime paths committed |
| Verify security contact, rights and vendor notices | Public handoff readiness | Maintainer chooses a real reporting route; do not invent contact details or claim legal clearance |
| Audit Git diff/history and source ZIP | Reviewed public contents | All staged files intended; licenses/vendor hashes intact; extracted package passes checks |
| Obtain commit/push and optional tag/release approval | Published delivery | Scoped commit, normal push, remote SHA confirmed, no unrelated local changes staged |

Exit: B00-B08 closed, release content approved, exact remote commit verified and
working-tree state reported. A version tag or GitHub Release is a separate explicit
action, not implied by a push. Present the project's real constraints in a CV/demo.

## Marketing Phase

Start only after B09 or an explicit operator decision to change the dependency.
Existing YouTube metadata handoff continues to work throughout pipeline work.

| Batch | Actions | Result | Definition of done |
| --- | --- | --- | --- |
| M01 | Define audience/search intent, check claims against dated sources, draft hook -> useful example/solution -> ending, review read-aloud duration | Supervised copy brief and rubric | Three example briefs with source URLs, uncertainties, factual review and no unsupported performance claims |
| M02 | Add bounded copy-review inputs, checks and assistant handoff; preserve current metadata contracts | Reusable local copy procedure and validation | Title/description/tags/5-8 lowercase hashtags/pinned comment checked; current research required before calling anything high-volume; no provider APIs or auto-upload |
| M03 | Produce three episodes one by one, approve copy and actual voices, inspect final deliverables; define later measurement using operator-provided analytics | Three reviewed Short packages | Hook matches delivered value, captions match recording, thumbnails preserve brand; metrics remain absent until supplied, no invented causal lift |

Search tools used by the assistant require authorized access; research is not a
new runtime network feature. The copy module does not generate voice by itself.
ElevenLabs or another provider remains a separate user-approved step.

## Evidence and Handoff

Use a new private workspace such as `workspaces/pipeline-qualification-<id>` for
media/fixtures. Keep reports, source/input hashes, actual commands and short human
review notes there. Do not manually fabricate brand/editorial approval records.
Public docs contain sanitized observations, not private absolute paths or raw media.
Use the existing [session-note structure](assistant/SESSION.md) for continuity.

At each batch handoff report: completed actions, changed files, exact checks and
results, pending approvals/blockers, next batch and a recommended commit message.
Update the ledger with evidence before changing a status to complete. If tests
fail, fix within scope or leave the batch open; do not hide failures with cleanup.

## Planning Estimates

Engineering estimates, not delivery guarantees: B01 0.5-1 day; B02 1-2 days;
B03 1-2 days; B04 0.5-1 day; B05 1-2 days; B06 1-2 days; B07 0.5-1 day;
B08 0.5-1 operator day; B09 0.5-1 day. Approximately 6-12 engineering days plus
0.5-1 operator day, excluding approval/access waits and unexpected defects.
M01-M03 are approximately 2-4 additional days, dependent on narration and review.
Re-estimate after B01 and the first native/FFmpeg comparison; a batch can span
several sessions. No background work or future execution is scheduled by this plan.
