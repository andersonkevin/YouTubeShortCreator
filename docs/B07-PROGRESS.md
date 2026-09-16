# B07 Clean Installation Progress

[Pipeline plan](PIPELINE-ROADMAP.md) | [Installation](INSTALLATION.md) |
[B06 qualification](B06-PROGRESS.md)

Status: operator approval received on 2026-09-15 for the presented B07 results:
isolated Python/npm installations, lockfile reproduction and native/FFmpeg fixture
exports. The full operator-guided first-run walkthrough remains unexecuted. This
approval accepts the reported technical scope; it does not supply missing
walkthrough evidence or approve B05/B06, B08, publication or a release.

## Operator Approval

The operator explicitly stated: "b07 aprobado por mi", after the technical
closeout disclosed the pending onboarding/approval walkthrough and same-host
qualification limit. Approval is recorded here without rewriting historical run
JSON, fixture approvals or listening records. All 69 retained output hashes were
reverified before recording this decision. No new render or audio review is
claimed for this documentation-only update.

The original first-run acceptance criterion is still visible in the roadmap.
B08 requires a separately identified independent operator; this decision does not
claim that an independent operator has completed either episode.

## Authorization and Isolation

The operator explicitly authorized downloading declared dependencies from PyPI
and npm into a new isolated test directory, without global installations,
browser/model downloads or transmitting audio. The host has a usable Node binary
but npm was not found on PATH, in its bundled runtime or in checked conventional
installation directories. The operator subsequently authorized continuing B07 in
an isolated test environment. npm was bootstrapped only inside that private test
root; no system installation, persistent PATH change or global package was used.

This is directory/environment isolation on the same host, not a virtual machine
or a security sandbox for hostile packages. Chrome, Swift, Node and FFmpeg are
existing trusted host tools. Downloads were limited to the authorized registries.

Private qualification root: `workspaces/b07-clean-install-01/`.
An allowlisted source ZIP was extracted into its new `source/` directory. The
fresh `.venv` resides inside that extracted copy, not in the maintainer checkout.
Its configuration has `include-system-site-packages = false`; user site packages
are disabled. Both installed library module paths were verified inside that venv.
Existing source changes, captions, media, environments and approvals were preserved.

## Observed Results

| Action | Result | Acceptance boundary |
| --- | --- | --- |
| Check prerequisites | Python 3.14.6, arm64 macOS 26.6.2, venv/ensurepip available | Same host, not a fresh machine |
| Create isolated Python environment | pip 26.1.2 bootstrapped from the existing Python distribution | No global packages or system-site reuse |
| Download declared Python wheels | Pillow 12.2.0 and NumPy 2.4.6 installed from PyPI | Cache disabled; binary wheels only; no dependency/version edits |
| Check dependency consistency | `pip check`: no broken requirements | Python dependencies only |
| Run the extracted Python suite | 182 tests passed | Executed using the new venv |
| Run docs checker | 41 documents, 270 local references, 14 images; PASS | Extracted source snapshot, before this report was added |
| Audit extracted public source | 188 allowlisted files; PASS | No private assets included in the archive |
| Start the CLI help command | Exit 0; documented subcommands listed | Not a render or onboarding approval |
| Bootstrap npm locally | npm 12.0.2; registry SHA-512 integrity verified before extraction | Compatible with existing Node 24.19.0; not a new runtime dependency |
| Install pinned Playwright | Playwright/Core 1.62.1 and optional fsevents 2.3.2 | Fresh private cache/config; scripts, audits and browser downloads disabled |
| Reproduce generated lock | `npm ci` passed in a second empty extraction with a second fresh cache | Installed package trees matched byte-for-byte; all three tarballs fetched again |
| Run Node tests | Nine tests passed in each installation | Both use their fresh local packages |
| Render native fixture | PASS; 12 seconds, four scenes, graphite, charts-a | Synthetic fixture, not narration or onboarding acceptance |
| Render FFmpeg fixture | PASS; 12 seconds, three scenes, violet, charts-b | Existing FFmpeg 8.1.2; no backend installation |
| Verify retained outputs | All 69 output hashes matched; 33 decoded samples per export passed | Sampled pixel QA, not exhaustive human approval |
| Run full first-production walkthrough | Pending | Requires actual onboarding, brand approval, intake and editorial/timing review |

Both runtime records point to Playwright inside the first isolated source copy,
not the application's bundled package. Capture passed four viewports, timing,
central motion and deterministic seeking. Both encoded outputs contain 360 frames
at 1080x1920/30 fps, with one audio track. All eight measured audio windows had
zero lag. Minimum correlation was 0.9996508 native and 0.9999701 FFmpeg. FFmpeg's
decoded PCM includes 512 tolerated trailing samples (32 ms); container duration
is 12 seconds. No narration was shortened, replaced or uploaded.

Actual encoded frames at five seconds were extracted to each fixture's new
`review-frame-5.png` and inspected for visible charts, legibility and overlap.
The existing `widget_smoke.py` test helper deliberately creates synthetic brand,
input and approval fixtures. Those records are not operator approvals and do not
satisfy the documented interactive onboarding or real caption-review gates.
No existing production runtime/approval record was copied. Speech transcription,
new-machine compatibility and independent operator acceptance were not tested here.

After adding the reviewed lockfile and updating installation/notices/progress
documentation, the maintainer source passed 182 Python tests using the isolated
venv, `tools/check_docs.py` (42 documents, 279 local references, 14 images),
`tools/release.py audit` (190 allowlisted files), `git diff --check`, and an exact
comparison of `tools.freeze.record()` against the unchanged implementation lock.
These checks do not claim a new public release or a rerender after documentation.

## Reproduction

Start in a new extracted source directory after explicit download approval:

```sh
env -u PYTHONPATH -u PYTHONHOME python3 -m venv .venv
.venv/bin/python -I -m pip --isolated --disable-pip-version-check --no-cache-dir install --only-binary=:all: --index-url https://pypi.org/simple -r requirements.txt
.venv/bin/python -I -m pip --isolated --disable-pip-version-check --no-cache-dir check
env -u PYTHONPATH -u PYTHONHOME PYTHONNOUSERSITE=1 .venv/bin/python -B -m unittest discover -s tests -q
env -u PYTHONPATH -u PYTHONHOME PYTHONNOUSERSITE=1 .venv/bin/python -B tools/check_docs.py
env -u PYTHONPATH -u PYTHONHOME PYTHONNOUSERSITE=1 .venv/bin/python -B tools/release.py audit
env -u PYTHONPATH -u PYTHONHOME PYTHONNOUSERSITE=1 .venv/bin/python -B ysc.py --help
```

The actual pip installation also used `--report ../../logs/pip-install-01.json`
and `--log ../../logs/pip-install-01.log`, both new paths in the private root.
Do not reuse these filenames for another attempt. Those pip-produced records
retain the wheel URLs, hashes and installation details; no success report was
fabricated to replace an unexecuted install.

### JavaScript Installation

The bootstrap metadata and archive are retained under `npm-bootstrap-01/`.
The download came from `https://registry.npmjs.org/npm/latest`; the resolved
version was 12.0.2. Its declared SHA-512 was checked before extraction; archive
paths, file types and containment were checked, rejecting links and traversal.
Future reproductions must use a reviewed exact version, not assume `latest`
still resolves to this version.

The following describes the observed isolated install environment. Set `B07`
to an absolute new qualification root and `NODE` to the already installed binary.
Run from its extracted source directory. The named config paths must be new and
empty; the public source archive contains no project `.npmrc`.

```sh
env -i HOME="$B07/npm-home-02" PATH="$(dirname "$NODE"):/usr/bin:/bin" \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  NPM_CONFIG_USERCONFIG="$B07/npm-home-02/user.npmrc" \
  NPM_CONFIG_GLOBALCONFIG="$B07/npm-home-02/global.npmrc" \
  NPM_CONFIG_CACHE="$B07/npm-cache-02" \
  NPM_CONFIG_PREFIX="$B07/npm-prefix-02" \
  "$NODE" "$B07/npm-bootstrap-01/package/bin/npm-cli.js" \
  install --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org
```

The second run used `ci` instead of `install`, a second extraction named
`source-ci-01/YouTubeShortCreator`, the generated lockfile, and new
`npm-home-ci-01`, `npm-cache-ci-01` and `npm-prefix-ci-01` paths. `diff -qr`
reported no differences between the two installed `node_modules` directories.
The reviewed lockfile was added to public source unchanged. No installed packages
or npm bootstrap files were added to the public release. npm logs also record a
registry request for npm update metadata; this was setup traffic, not a runtime call.

An initial configuration attempt reused `/dev/null` for both npm config files;
npm rejected the duplicate configuration path before installation. Distinct
private paths resolved it. A fixture command using `../..` was correctly rejected
as traversal; the retry used an absolute workspace path without weakening safety.

### Render Reproduction

From the first extracted source, unset `PYTHONPATH`, `PYTHONHOME` and
`YSC_PLAYWRIGHT`; set `PYTHONNOUSERSITE=1`. Supply existing absolute `YSC_NODE`,
`YSC_SWIFT` and `YSC_CHROME` paths. For FFmpeg also set `YSC_FFMPEG` and
`YSC_FFPROBE`. Do not point Playwright at maintainer-installed modules.

```sh
.venv/bin/python -B tools/widget_smoke.py --workspace "$B07/native-01" --set charts-a --scenes 4 --palette graphite --duration 12 --backend native --render --approve-write
.venv/bin/python -B tools/widget_smoke.py --workspace "$B07/ffmpeg-01" --set charts-b --scenes 3 --palette violet --duration 12 --backend ffmpeg --render --approve-write
```

Use new workspace names for retries. Outputs are under each fixture's
`runs/widget-fixture/qualification/`. Tests use synthetic signal/cues and existing
test-font prerequisites; they are not production videos or licensed font bundles.

## Provenance

Source ZIP SHA-256:
`90dcc8164f9f9e1c12f3afb3c0ec2d0d802031a35b0dcf3af032775a8d8eb945`.

Engine lock remains:
`bae9395e0765bc466148c0cab2ca3873a1850c8fb5a2895d516d14017d221bda`.

| Artifact | SHA-256 |
| --- | --- |
| pip install report | `49d0aa711dd459a533ac9d725a7f76dfd45b52eca78386e013089e3c67367d63` |
| pip install log | `ffc363f7c1369c0ed7eb8deee2a5c96e9de2a11878eabd59fbd44c315054d4c4` |
| Pillow cp314 macOS arm64 wheel, pip-reported hash | `80b2da48193b2f33ed0c32c38140f9d3186583ce7d516526d462645fd98660ae` |
| NumPy cp314 macOS arm64 wheel, pip-reported hash | `d581b735e177fdcdce6fed8e7e8880a3fb6ee4e3653a3ac6af01c6f4c03effc5` |
| npm bootstrap tarball, independently rehashed | `5dbb86c71d07a1957f2e90734092dd6a58bdcd9ebc2d8d41ca1c6e6a21d364e1` |
| npm registry metadata | `67da15c69ae934e5267c801208428a1fe8f79fb488d6cbb562081416f55f24bb` |
| Generated lockfile; identical in both test copies and public source | `968ae244e78bcaa497edd302417620d3a9c65978e61802cf3bf43dab4a219667` |
| npm install debug log, 13:48:28 UTC | `2c847ff1e51a83be84ba31951e982b85eb26fb75517e516db98012a606b5e80a` |
| npm ci debug log, 13:49:43 UTC | `88fe9d4c97a505dabab48911b70ab7094a51ea066e8a3aa8dc2a36a80cfd6c74` |
| Native video | `5f89a78173f4c82776728505428a824e74468f163eb56354b74fb20e9acd3bf5` |
| FFmpeg video | `2c6af1cd8e9be5a669e2c0b97cbcb052a4f1d61d8380568132a7fe19f842ccf4` |

These wheel hashes describe the observed platform-specific downloads, not a
portable hash-locked dependency set or a security certification. The temporary
download cache was not retained; the report is not an independently rehashed
wheel archive.

## Next Actions

1. Complete the documented interactive onboarding/intake/preview/render path using
   authorized assets and actual operator approvals. Do not treat fixture records
   as completion of this gate. Preserve previously approved captions.
2. Retain the operator's B07 approval above. Earlier B05/B06 review gates remain
   separate; do not infer those approvals from this batch decision.
3. Continue B08 independent-operator acceptance and B09 release before M01-M03.

Python and npm packages were downloaded only into authorized private test paths.
No browser, speech model, agent SDK or global tool was installed. No publishing,
commit, push, production-media deletion or visual/audio/caption engine change
occurred. Only invocation-owned rendering scratch was automatically cleaned.
