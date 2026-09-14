# Troubleshooting

[Docs index](README.md) · [CLI reference](CLI.md)

Fix the cause of a failing check. Do not remove hashes, rename a failure report to
success, delete approval records or loosen limits to force a render through.

## Setup and Branding

| Symptom | Likely cause | Next action |
| --- | --- | --- |
| `ModuleNotFoundError` before the questions | Wrong Python environment or missing dependencies | Activate `.venv`; install `requirements.txt` explicitly |
| `node` or `npm` not found | Missing PATH entry or a standalone Node binary without npm | Use a normal Node/npm installation; specify an existing Node path for runtime |
| `Workspace exists` | Onboarding refuses to replace a directory | Use a new `workspaces/<id>` path; do not pre-create it |
| Missing `brand/approval.json` | Preview exists but approval was not completed | Review the preview, then run `brand-approve --approve-write` |
| `Brand settings and generated CSS disagree` | Manual edit to brand preferences after generation | Run onboarding into a new workspace with the desired preferences |
| `Brand changed after approval` | Logo, fonts, CSS, brand JSON or preview changed | Preserve the old version; create/review a new brand workspace |
| Logo appears as a white rectangle | JPEG or opaque-background logo | Prepare an authorized transparent PNG and create a new brand version |
| Missing glyphs or unusual typography | Font lacks the language's glyphs or font choice differs | Supply suitable licensed TTF/OTF files and repeat visual QA |
| Contrast rejection | Background/accents do not meet the dark-template thresholds | Choose another preset or correct the custom colors |

The static branding preview is not a full episode and includes illustrative
three-scene wording. The saved `scene_count` is what `new` uses.

## Runtime and Capture

| Symptom | Likely cause | Next action |
| --- | --- | --- |
| `Missing runtime` | Node, Chrome, Swift or Playwright could not be found | Run `configure --help` and point to installed files |
| `Runtime drift` | OS/browser/library/tool version changed | Qualify a new workspace/profile; do not hand-edit versions to bypass the gate |
| `Locked implementation changed` | Source/template differs from `lock.json` | Review the source change, test it and review a new lock candidate |
| Chrome exits immediately / sandbox denies startup | Host execution permission or browser startup problem | Inspect the error and allow the intended local process through the host's normal permission flow |
| Native compile/availability error | Incompatible SDK, Swift or macOS API | Use a compatible tested toolchain; there is no non-native fallback |
| Capture is slow or disk usage rises | Full-resolution PNG frames and native compilation | Allow temporary storage; keep input/output on a reliable local disk; runtime estimates vary |

Do not add arbitrary unsafe browser flags, disable validators or change global
machine security settings as a troubleshooting shortcut.

## Audio and Captions

| Symptom | Likely cause | Next action |
| --- | --- | --- |
| `MISSING_LOCAL_MODEL` | Requested speech locale is unavailable or not installed | Check the installed model/language through Apple's supported process; the tool will not download it |
| `LOCAL_TRANSCRIPTION_FAILED` | Unsupported or damaged audio, native failure | Check the recording independently and use a supported source encoding |
| `LOCAL_TRANSCRIPTION_TIMEOUT` | Speech task did not finish in its native deadline | Inspect the recording/environment; use a new output name for a reviewed retry |
| Transcript/audio hash mismatch | Transcript came from another recording, or source was changed | Transcribe the exact final file and rebuild correctly bound inputs |
| `Caption contains missing or unspoken words` | Caption text and indexed transcript segments disagree | Correct the timed transcript and regenerate/review cues |
| Caption gap, overlap or omitted words | Incorrect segment indexes or timestamps | Restore complete ordered segment coverage |
| Timing refinement needs evidence | Cue start differs materially from ASR start | Listen and measure; add a truthful bounded note only when supported |
| Source/export audio mismatch | Timing shift, wrong track, truncation or waveform difference | Inspect both audio files; keep the failing run for diagnosis; do not lower thresholds |

The HTML preview has no audio. Check synchronization in the exported `video.mp4`.
Waveform QA cannot tell whether ASR heard the right words. If external edits change
the voice or timing, the original captions and QA no longer establish correctness.

## Content and Files

| Symptom | Likely cause | Next action |
| --- | --- | --- |
| Text does not fit / caption overflow | Copy or font metrics exceed a fixed zone | Shorten copy or regroup captions with truthful timings |
| Motion exceeds scene | A reveal/interval was not adapted to new cue anchors | Adjust local motion within the scene's actual duration |
| Unknown content/motion fields | Layout changed but old slot keys were retained | Start from the chosen layout's exact example contract |
| Static central visual | Both sampled states show no meaningful motion | Review the layout and reveal timing; preserve a useful animated explanation |
| `DRAFT:` metadata blocks render | Example metadata remains | Replace it with reviewed episode metadata; build is available before final render |
| Input changed | Bytes differ from the recorded hash | Prepare a new episode version and verify provenance |
| Run/output already exists | No-overwrite policy | Choose a new run ID or input/output name |
| Release audit rejects a file | Private/unrecognized file inside the source tree | Inspect it; keep private data outside the public source allowlist |

## A Useful Bug Report

Include the command with private paths removed, runtime versions, expected/actual
behavior, exact failing check, and a minimal synthetic reproduction. Include only
screenshots or media you are authorized to share. A source hash can help compare
artifacts but is not a substitute for a reproduction. See [Security](../SECURITY.md)
before reporting sensitive failures publicly.
