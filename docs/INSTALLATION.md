# Installation

[Docs index](README.md) · Next: [Branding](BRANDING.md)

## Compatibility

| Component | Expected setup | Qualification |
| --- | --- | --- |
| Python | 3.11+ with `venv` and pip | 3.14.6 tested |
| Pillow / NumPy | Exact versions in `requirements.txt` | 12.2.0 / 2.4.6 tested |
| Node.js | 22+ with npm available for setup | Node 24.19.0 tested |
| Playwright | Exact version in `package.json` | 1.62.1 tested |
| Chrome | Installed local Google Chrome | 152.0.7977.83 tested |
| Swift / OS | Compatible Apple toolchain and macOS | Swift 6.4, macOS 26, Apple Silicon tested |
| Speech | Supported device and an already-installed locale model | English (US) tested |
| Fonts | Local TTF/OTF with appropriate usage rights | Local test fonts; no font files distributed |

The Python utilities are not inherently macOS-only, but Windows/Linux are not
qualified production targets. `configure` explicitly requires macOS; consequently
`build` also requires macOS even though it does not encode an MP4. Do not interpret
Playwright's cross-platform support as support for this project's native backend.

The installed speech model is a separate prerequisite. Apple's
[SpeechTranscriber documentation](https://developer.apple.com/documentation/speech/speechtranscriber)
distinguishes supported and installed locales. This tool does not install models.

## 1. Check Local Tools

Open a terminal in the repository directory:

```bash
python3 --version
node --version
npm --version
swift --version
```

If a command is missing, install that tool through its official distribution or
your normal device-management process before proceeding. This repository does not
change your system package manager or install Xcode/Chrome for you. A Node binary
bundled with another application may not include npm or be on your shell's PATH.

## 2. Install Project Dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --ignore-scripts --no-audit --no-fund
```

These are explicit network-enabled installation commands. Browser download is
disabled because the capture adapter uses local Chrome. Do not run a separate
Playwright browser installation just to satisfy this workflow.

Direct versions are pinned. The npm-generated `package-lock.json` was reviewed
and reproduced with `npm ci` in a second empty source copy and fresh cache during
[B07](B07-PROGRESS.md). Both installations passed nine Node tests. Lifecycle
scripts, browser downloads, audit calls and funding messages were disabled.
The lockfile marks optional macOS `fsevents` as having an install script;
lifecycle scripts were not run.
Use `npm ci` only in a dedicated checkout: it replaces that checkout's existing
`node_modules`. It does not install npm itself or change global packages.

The Python packages also passed a fresh isolated installation and 182 tests.
Python wheel hashes are recorded as observed evidence, not a portable fully
hash-locked dependency set. These are fresh dependencies on the same qualified
macOS host, not qualification of a new machine. The complete operator-guided
onboarding and production walkthrough remains a separate acceptance gate.

## 3. Create and Approve a Brand

```bash
python3 ysc.py
```

Choose a new workspace, answer the questions and inspect its preview. Do not create
the workspace directory manually: onboarding expects it not to exist.

```bash
python3 ysc.py brand-approve --approve-write
```

See [Branding](BRANDING.md) for logo preparation, font rights and the approval boundary.

## 4. Configure Existing Runtimes

```bash
python3 ysc.py configure --approve-write
python3 ysc.py doctor
```

Defaults use `node`/`swift` from PATH, the conventional macOS Chrome application,
and `node_modules/playwright/index.mjs` in this repository.

For nonstandard locations, supply existing paths explicitly:

```bash
python3 ysc.py configure \
  --node /path/to/node \
  --playwright /path/to/playwright/index.mjs \
  --chrome /path/to/chrome-executable \
  --swift /path/to/swift \
  --approve-write
```

Each option takes a file, not a directory. Paths containing spaces must be quoted.
Precedence is command-line option, then `YSC_NODE`, `YSC_PLAYWRIGHT`, `YSC_CHROME`
or `YSC_SWIFT`, then discovery defaults.

`workspace/runtime.json` stores local paths, measured versions, the explicit
`native` backend and probed capabilities. It is private and never overwritten.
`configure --backend native --approve-write` explicitly selects the current
backend. Existing profiles without a backend remain native and are not migrated
in place. A new backend or changed runtime requires a new qualified workspace.
The optional FFmpeg backend is implemented under B05 qualification. To test it,
use a new workspace and supply already installed binaries explicitly:

```sh
python3 ysc.py --workspace workspaces/ffmpeg-review configure --backend ffmpeg --ffmpeg /path/to/ffmpeg --ffprobe /path/to/ffprobe --approve-write
```

`YSC_FFMPEG` and `YSC_FFPROBE` also supply paths; installed PATH tools are the
last default. Native profiles do not require either binary. Swift remains part
of the macOS runtime for local transcription; selecting FFmpeg does not claim
Windows/Linux support. No installation or binary download occurs at runtime.
See [backend boundaries](MEDIA-BACKENDS.md) and [licensing](LICENSING.md).
Executable paths are trusted operator configuration; never copy a stranger's
runtime configuration or point it at unreviewed scripts.

## 5. Verify

```bash
python3 -B -m unittest discover -s tests -v
python3 -B tools/check_docs.py
python3 ysc.py doctor
```

`doctor` requires an approved brand and a configured runtime. It checks drift,
not speech-model availability, asset rights or every possible media codec.

An optional native integration test creates a separate private workspace:

```bash
python3 tools/smoke.py --workspace workspaces/smoke-01 --render --approve-write
```

Use `YSC_*` environment variables if the smoke test needs custom runtime paths.
Its synthetic tone and captions are test fixtures, not a publishable video.

## Upgrades and Recovery

Version drift intentionally blocks production. Preserve the previous workspace,
qualify a new one with the updated environment, and compare outputs before reuse.
Do not delete approval records or edit stored version strings just to bypass a gate.
There is no automatic profile migration or in-place reset command in this release.

[Troubleshooting](TROUBLESHOOTING.md) covers missing models, fonts, runtimes and failed runs.
