# B01 Reference Qualification

[Plan](PIPELINE-ROADMAP.md) | [Adapter design](VISUAL-ADAPTER-CONTRACT.md) |
[Commands](CLI.md)

Date: 2026-09-15. B01 establishes the integration contract and synthetic legacy
references. It does not enable visual-library scenes in production.

## Evidence

- New test-only Signal Lab workspaces were prepared using the existing synthetic
  fixture and local fonts. No customer assets or approvals were edited.
- Seven valid episodes cover all twelve layouts with both three and four scenes:
  24 scene samples per reference set, checked at four viewports (96 scene/viewport
  checks per set), with existing caption, motion and backward-seek checks.
- A bad first-cue anchor fails validation. A 300-character heading passes the text
  schema but fails browser fitting with `Text overflow`, retaining `failure.json`.
  An unrelated browser failure cannot count as the expected overflow rejection.
- The operator approved removing the right-side bracket from the public template.
  Only its three border colors changed to transparent; border geometry remained.
- A reviewed lock candidate changed exactly one implementation entry:
  `templates/v1/assets/technology.css`. New synthetic workspaces were qualified;
  old brand approvals and reference outputs were not overwritten.
- Comparing before/after on the same recorded runtime verified every referenced
  run/output hash, episode hash, layout and sample time. All 24 screenshots changed
  exactly 1,680 pixels each, with zero differences outside the old bracket region.
- Manual image inspection confirmed the intended removed bracket and retained
  logo, progress, central panel, headings and caption zones.
- A fresh native 12-second MP4 encoded 360 frames at 1080x1920. Media QA passed
  one video/one audio track and 15 decoded samples. Four waveform windows had
  zero measured lag and minimum correlation 0.9996508448; source/export decoded
  durations were both 12 seconds. Listening approval remains pending.
- The 95-test suite, docs checker, public source audit (154 files), diff check and
  exact source/lock comparison passed. No dependency installation was performed.

Private evidence locations under `workspaces/`:

| Workspace | Evidence |
| --- | --- |
| `b01-legacy-reference-01` | Old-lock fixture, seven reference runs, expected failures and `regression-report.json` |
| `b01-no-bracket-01` | New-lock fixture, same coverage, `regression-report.json` and `runs/legacy-3-1/native-qualification/` media/audio evidence |

The preserved old reference intentionally uses the previous lock. It can be read
and compared without rewriting it; trying to build it against changed code must
continue to fail drift checks. Prepare a new workspace for new captures.

## Reproduction

Use a new private workspace name for preparation. Set the documented `YSC_*`
runtime overrides if needed; never copy a maintainer's private runtime file.

```sh
python3 -B tools/regression.py prepare --workspace workspaces/reference-01 --approve-write
python3 -B tools/regression.py capture --workspace workspaces/reference-01 --approve-write
python3 -B tools/compare_references.py workspaces/reference-01 workspaces/reference-02
```

The comparison requires two completed reference sets. For the explicitly approved
bracket-only change, add `--allow-removed-bracket`; all other changes use exact
comparison unless a separately reviewed regression strategy replaces it.

## Boundaries

Tests and synthetic brand approvals are not human approval of publishable content.
The signal is not narration, and its synthetic transcript is not an ASR result.
These checks do not prove storytelling quality or all possible caption boundaries.
The broader timing/failure matrix remains B06; real narration remains required for
the backend qualification. Existing public gallery images retain their earlier
qualification and still show the historical decoration until refreshed for release.
