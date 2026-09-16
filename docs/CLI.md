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
| `layouts` | None | Lists 12 layout identifiers | Read-only |
| `import SOURCE --name NAME` | External file and intake filename | Copies bytes into a new intake file | `--approve-write` |
| `transcribe AUDIO OUTPUT` | Workspace audio; new intake JSON | Runs local speech transcription and records source hash | `--approve-write` |
| `caption-draft TRANSCRIPT OUTPUT` | Timed transcript; new intake JSON | Groups transcript segments into reviewable cues | `--approve-write` |
| `new ID` | `--audio`, `--transcript`, `--captions`, `--graphic` | Copies inputs and creates an editable episode draft | `--approve-write` |
| `validate EPISODE` | Approved brand and episode JSON | Validates input hashes, scene/caption contracts and copy | Read-only |
| `build EPISODE --run-id ID` | Valid episode and runtime | Writes HTML, cover, handoff data, screenshots and visual QA | `--approve-write` |
| `render EPISODE --run-id ID` | Valid non-placeholder metadata and runtime | Builds, encodes, muxes and checks the MP4 | `--approve-write` |

`configure` supports `--node`, `--playwright`, `--chrome`, `--swift`; see
[runtime setup](INSTALLATION.md#4-configure-existing-runtimes). There are no in-place
reset, delete, upload, provider-authentication or background execution commands.

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
| Same smoke command with `--render` | Also encode/mux the synthetic test | New private media |

`tools/smoke.py` accepts runtime overrides through `YSC_*` environment variables,
not the `configure` flags. Its workspace must not exist. No tool commits or pushes Git.
