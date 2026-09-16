# CLI Reference

[Docs index](README.md) · [Troubleshooting](TROUBLESHOOTING.md)

## Invocation

```bash
python3 ysc.py --help
python3 ysc.py --workspace workspaces/my-channel COMMAND --help
```

`--workspace` is global: put it **before** the subcommand. A relative custom
workspace is resolved from the current working directory; the default `workspace/`
is beside `ysc.py`. Do not assume a custom folder elsewhere inside the repository
is ignored: use `workspaces/` or a location outside the source tree.

Running without a command starts onboarding only when the selected workspace does
not exist. For an existing workspace it prints the available commands.

## Commands and Write Boundaries

| Command | Required inputs | Behavior | Approval |
| --- | --- | --- | --- |
| `init` | Interactive branding answers | Creates a new private workspace and preview | Interactive `CREATE`; optional `--approve-write` bypasses only that prompt |
| `brand-approve` | Existing brand and unchanged generated CSS | Writes a new brand approval | `--approve-write` |
| `configure` | Existing runtime executables/modules | Writes a new private `runtime.json` | `--approve-write` |
| `doctor` | Approved brand and configured runtime | Verifies implementation, brand and version drift | Read-only |
| `layouts` | None | Lists the 18 layout identifiers | Read-only |
| `palettes` | None | Lists the 15 palette presets with their contrast ratios | Read-only |
| `import SOURCE --name NAME` | External file and intake filename | Copies bytes into a new intake file | `--approve-write` |
| `transcribe AUDIO OUTPUT` | Workspace audio; new intake JSON | Runs local speech transcription and records source hash | `--approve-write` |
| `caption-draft TRANSCRIPT OUTPUT` | Timed transcript; new intake JSON | Groups transcript segments into reviewable cues | `--approve-write` |
| `new ID` | `--audio`, `--transcript`, `--captions`, `--graphic` | Copies inputs and creates an editable episode draft | `--approve-write` |
| `validate EPISODE` | Approved brand and episode JSON | Validates input hashes, scene/caption contracts and copy | Read-only |
| `build EPISODE --run-id ID` | Valid episode and runtime | Writes HTML, cover, handoff data, screenshots and visual QA | `--approve-write` |
| `render EPISODE --run-id ID` | Valid non-placeholder metadata and runtime | Builds, encodes, muxes and checks the MP4 | `--approve-write` |

`configure` supports `--backend native` (the default) or `--backend ffmpeg`,
`--node`, `--playwright`, `--chrome`, `--swift`, `--ffmpeg`, `--ffprobe`; see
[runtime setup](INSTALLATION.md#4-configure-existing-runtimes). There are no in-place
reset, delete, upload, provider-authentication or background execution commands.

Backend selection is runtime configuration, never an episode field. Native
configuration probes local H.264 settings and the export preset before writing.
Unknown backends fail without fallback. FFmpeg is implemented under B05
qualification and requires its own new runtime profile, not an edited native one.
`doctor` repeats the capability check in invocation-owned temporary storage;
it does not modify workspace records. See [backend boundary](MEDIA-BACKENDS.md).

The private media-only matrix is a maintenance command, not a production episode:
`python3 -B tools/media_matrix.py --workspace workspaces/media-review --ffmpeg /path/to/ffmpeg --ffprobe /path/to/ffprobe --swift /path/to/swift --approve-write`.
It generates synthetic signals and comparison exports without invented transcripts.
Add `--real-source /path/to/authorized.mp3` to test the complete recording unchanged.
`--real-only` skips synthetic cases and cannot qualify their matrix. The optional
`--excerpt-seconds` creates an excerpt only when explicitly authorized; omission
means the full recording, never an automatic cut. Ask permission before using
private narration. The Shorts duration limit is 180 seconds.

`tools/widget_smoke.py` also accepts `--duration SECONDS` (12-180, whole 30 fps
frames) for synthetic visual/caption timing qualification. Default duration is
12 seconds. This creates test signals, not speech or a real transcript.

## Optional Tools

`tools/voice.py` runs outside `ysc.py` in a separate operator-prepared Python
environment; see [local voice synthesis](VOICE.md). Its writers follow the same
boundaries: `synthesize SCRIPT OUTPUT` needs `--approve-write` and a new `.wav`
under the workspace `intake/`; `audition SCRIPT --run-id ID` needs
`--approve-write` and a new `voice/auditions/ID/`; `doctor` and `voices` are
read-only. Model files come from `<workspace>/voice/models/` or an explicit
`--models` directory and are verified against `tools/voice-models.json`.

## Path Rules

| Argument | Base and restriction |
| --- | --- |
| `--workspace` | Operator-selected directory; new for `init`, existing for production |
| `import SOURCE` | Explicit external path; relative to current directory or absolute |
| `import --name` | Lowercase simple filename; goes under the selected `intake/` |
| Runtime/font/logo paths | Operator-selected local files; quote paths containing spaces |
| `transcribe AUDIO` | Workspace-relative file |
| `transcribe OUTPUT`, `caption-draft OUTPUT` | New `.json` under workspace `intake/`; parent must exist |
| `caption-draft TRANSCRIPT`, `new` input options | Workspace-relative files |
| `validate/build/render EPISODE` | Workspace-relative JSON |
| Episode `inputs.*.path` | Relative to the episode JSON's directory, not the workspace root |

Contained workflow paths reject traversal and symlinks within their boundary.
External imports and executable configuration are separate operator-controlled
trust boundaries; they are not a sandbox for hostile source files or executables.
Episode/run IDs use lowercase ASCII letters, digits and single hyphens, up to 64 characters.

## Existing Outputs and Exit Status

Writers do not offer a force-overwrite flag. Use a new name/run ID/version. A failed
build may leave a partial run plus `failure.json`; do not mistake its files for a
successful export. Confirm the final `run.json` and applicable QA results.

The primary CLI returns 0 on success, 1 for handled operational/validation errors,
2 for argument-parser errors and 130 for interruption/cancelled input. Unexpected
bugs or native subprocess failures can include diagnostic output; preserve a
sanitized error report rather than silently bypassing the failing check.

## Maintenance Tools

The separate `python3 -B tools/visuals.py` entry point provides `catalog`,
`describe`, `validate`, `build` and `export-svg`. Put its `--workspace` option
before the command. It does not require branding to inspect illustrative asset
studies, and it cannot render or publish a Short. See the complete
[visual-library commands and QA](VISUAL-LIBRARY.md).

| Invocation | Purpose | Writes |
| --- | --- | --- |
| `python3 -B tools/check_docs.py` | Local links, embedded images, JSON examples, CLI coverage and image manifest checks | None |
| `python3 -B tools/release.py audit` | Audit the allowlisted public source tree | None |
| `python3 tools/release.py zip OUTPUT.zip --approve-write` | Create a new public source ZIP | New archive only |
| `python3 tools/freeze.py` | Print an implementation lock candidate | None |
| `python3 tools/smoke.py --workspace workspaces/smoke-01 --approve-write` | Create a synthetic fixture and run browser build checks | New private fixture and outputs |
| `python3 -B tools/regression.py prepare --workspace workspaces/reference-01 --approve-write` | Create nine synthetic legacy reference cases | New private fixture workspace; test-only brand approval |
| `python3 -B tools/regression.py capture --workspace workspaces/reference-01 --approve-write` | Capture all eighteen layouts with three/four scenes and verify negative cases | New reference builds and report; no MP4 |
| `python3 -B tools/compare_references.py workspaces/reference-01 workspaces/reference-02` | Compare all 24 reference screenshots on the same runtime | None |
| `python3 -B tools/widget_smoke.py --workspace workspaces/widget-01 --scenes 4 --palette violet --approve-write` | Build a new mixed v2 widget fixture; `--render` also creates an MP4 | Private synthetic assets, test-only brand approval and QA |
| `python3 -B tools/chart_matrix.py --workspace workspaces/density-01 --palette violet --scenes 4 --approve-write` | Check chart examples, maximum-density inputs and expected geometry failures | New private fixtures, builds and matrix evidence; no MP4 |
| `node --test tests/chart-qa.test.mjs tests/visual-options.test.mjs` | Test label collision/bounds and numeric display without mutating raw values | None |
| Same smoke command with `--render` | Also encode/mux the synthetic test | New private media |

`tools/smoke.py` accepts runtime overrides through `YSC_*` environment variables,
not the `configure` flags. Its workspace must not exist. No tool commits or pushes Git.

The regression tool uses the same `YSC_*` overrides. Its workspace parent must
exist and be a private location. Preparation uses the existing synthetic test
brand/approval, never an operator's channel approval. Captures reject fixture or
implementation drift, preserve failed runs and never overwrite reference reports.
After a failed attempt, diagnose it and prepare a new workspace for the retry.
Reference comparison verifies recorded artifact hashes before comparing pixels.
`--allow-removed-bracket` permits only the specifically approved old decoration
region; otherwise any pixel difference fails. This flag is not general tolerance
for changed layouts, typography or browser versions.
