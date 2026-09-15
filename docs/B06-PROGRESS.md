# B06 Reliability Qualification

[Pipeline plan](PIPELINE-ROADMAP.md) | [Validation](VALIDATION.md) |
[Media backends](MEDIA-BACKENDS.md)

Status: automated qualification passed; human review pending. The operator requested continued technical work with review
later. B05 visual review is still pending; its earlier full-voice listening
approval is retained, not extended to new exports. No publication is authorized.

## Scope and Acceptance

| Action | Result | Definition of done |
| --- | --- | --- |
| Reject exponent overflow, duplicate keys and malformed JSON | Strict finite-number parsing | Invalid input fails before use |
| Publish Python JSON records atomically without replacement | Serialize, fsync, hard-link, remove owned temporary | No partial target on serialization/flush/link failure; existing and competing targets preserved |
| Exercise interrupted capture and failed media stages | Failure records and retained diagnostic files | No successful run record; no source mutation; retry requires a new ID |
| Hash nested output assets | Complete new-run file inventory | Nested logo, scripts and styles match recorded hashes |
| Check final audio windows and silent spans | More complete waveform coverage | Wrong tail, added sound in silence and nonfinite samples rejected without relaxing existing lag/correlation limits |
| Inspect encoded frames against captured pixels | Shared native/FFmpeg frame QA | Cue boundaries, caption gaps, first/middle/final frames and full presentation timestamps verified |
| Requalify media and package | New private fixtures and source-only archive | Automated checks pass; human review remains explicit |

## Failure Semantics

Tests use temporary channels, never production approvals or recordings. They
inject capture interruption, an actually terminated child process, encoder/mux/QA
exceptions and implementation drift after capture. They verify preserved partial
outputs, absence of `run.json`, source hashes and cleanup of invocation scratch.
Stage injection is orchestration evidence, not proof that a codec decoded correctly.

JSON tests include serialization failure, fsync/link errors and interruption,
existing files, dangling symlinks, a concurrent target created immediately before
publication and cleanup failure. The last warns while keeping the complete target.
This is not crash-transactional recovery: a hard process/OS kill can leave scratch
or no failure report. Disk-full conditions may prevent a diagnostic record too.

## Pixel-Comparison Diagnosis

The first B06 native chart fixture was deliberately retained as failed: its new
RGB-only regional check rejected the thin progress bar. Diagnostic reconstruction
at the same frame showed matching geometry and luminance, but native 4:2:0 chroma
reconstruction differed at one-pixel color edges. At the final frame, progress
RGB RMSE was 10.372, luma RMSE 0.974 and 2x2 chroma RMSE 5.011.

This is evidence for a chroma-aware comparison, not permission to increase an
arbitrary RGB threshold. Regression tests must still reject an absent caption,
missing progress, a one-row displacement, broad palette errors and blank frames.
No video pixels, brand colors or encoder settings are changed by the comparison.

The implemented metric retains raw RGB tile RMSE <=24 and measures fixed regions
using full-resolution Rec.709-weighted luma and 2x2-averaged chroma, both RMSE <=10.
Raw regional RGB errors are still reported. The chroma-aware test reproduces the
observed edge reconstruction and passes; deliberate displacement/color-loss cases
still fail. This is a bounded codec-correspondence check, not ICC/colorimetric
calibration or a claim of perceptually indistinguishable video.
In `frame-qa.json`, `region_rmse_limit` applies to `luma_region_rmse` and
`chroma_region_rmse`; `region_rmse` contains diagnostic raw RGB values, not the
regional acceptance metric. The separate raw RGB tile limit remains enforced.

## Source and Regression Evidence

Final technical candidate lock:
`bae9395e0765bc466148c0cab2ca3873a1850c8fb5a2895d516d14017d221bda`.

- 182 Python tests and nine Node tests passed in the checkout and in a new
  extracted source archive, using the existing installed dependencies.
- Documentation check: 41 documents, 268 local references and 14 registered
  images, with no page requests. Source audit: 188 allowlisted files.
- The candidate ZIP has SHA-256
  `185ae0e7fd506b207866aff69cd06cd9a4d6942b317fd8055f4b2e146bdafe20`.
  It was built before these final evidence-doc edits, with the same engine lock.
  Inspection found no private workspaces, Git metadata, voice recordings or MP4s.
- Compared the retained B05 source ZIP, first verifying its recorded SHA-256:
  26 renderer/template files are byte-identical. The `build_html`, `scene_html`
  and `srt` functions have identical syntax trees. B03 density and B04 legacy
  coverage are retained evidence; the whole density matrix was not rerendered
  for this checker-only change. New actual exports separately exercise both
  scene counts and encoded output checks.
- The initial RGB-only candidate matrix passed all 22 cases; its failed native
  animated fixture and diagnostic files remain retained. Its evidence is not
  substituted for the final-candidate rerun.

## Bounded Regression Sequence

Run from the repository root with the documented local runtimes configured.
Choose fresh workspace IDs every time. This sequence writes private fixtures only
when `--approve-write` is passed; no command installs packages or publishes.

```sh
python3 -B -m unittest discover -s tests -v
node --test tests/*.test.mjs
python3 -B tools/check_docs.py
python3 -B tools/release.py audit
git diff --check
python3 -B tools/widget_smoke.py --workspace workspaces/reliability-native-new --set charts-a --scenes 4 --palette graphite --backend native --render --approve-write
python3 -B tools/widget_smoke.py --workspace workspaces/reliability-ffmpeg-new --set charts-b --scenes 3 --palette violet --backend ffmpeg --render --approve-write
python3 -B tools/widget_smoke.py --workspace workspaces/reliability-long-new --set charts-c --scenes 4 --duration 180 --backend ffmpeg --render --approve-write
python3 -B tools/media_matrix.py --workspace workspaces/reliability-audio-new --swift /usr/bin/swift --ffmpeg /opt/homebrew/bin/ffmpeg --ffprobe /opt/homebrew/bin/ffprobe --approve-write
```

Executable paths are examples for the qualified macOS host, not universal paths.
Set `YSC_NODE` and `YSC_PLAYWRIGHT` if those tools are not in the documented default
locations. The matrix uses synthetic audio by default; `--real-source` requires
separate authorization for that recording. Omitting `--excerpt-seconds` uses its
whole original recording. An over-limit recording fails rather than being trimmed.

Run the documented source ZIP/extraction checks after the sequence. Testing an
extracted archive with installed dependencies is not B07 clean-install evidence.

## Remaining Gates

- Human visual review remains deferred, not waived or fabricated.
- B07 fresh package installation needs explicit download approval.
- Claude's parallel asset expansion is separate and not integrated or qualified
  by this batch. Marketing remains M01-M03 after the pipeline release gates.

## Final Media Results

All three new private runs use the final lock above and passed input/brand/runtime
checks, four viewport layouts, caption/motion/seek checks, exact frame timing,
sampled encoded-pixel comparison and source/export waveform checks. Page-network
attempts and page errors were empty. Each run remains `review_required`.

| Private workspace | Backend / content | Duration / scenes | Pixel samples | Max RGB tile RMSE | Minimum audio correlation |
| --- | --- | --- | --- | --- | --- |
| `b06-native-02` | Native, line/bar/donut + classic, Graphite | 12 s / 4 | 33 | 13.7753 | 0.9996508 |
| `b06-ffmpeg-02` | FFmpeg, scatter/heatmap + classic, Violet | 12 s / 3 | 33 | 14.7596 | 0.9999701 |
| `b06-ffmpeg-long-02` | FFmpeg, timeline/geo/stacked bars + classic, Violet | 180 s / 4 | 33 | 13.8940 | 0.9999701 |

The long export checked all 5,400 presentation timestamps, ending at 179.966667 s
with a maximum timestamp error of 0.000000334 s. Decoded frames at 75 s (map) and
178 s (final caption/progress) were also visually inspected by the implementation
assistant. That is not human approval. These use synthetic test signals and are
technical fixtures, not publishable narrated Shorts.

All 104 run-output hashes, including nested assets, were verified after export.
MP4 SHA-256 values, in the table order:

```text
b294b355fcd945d7008c6cfac17dab2d0224869b20bf0d8b2a302674e8bca2b1
2c6af1cd8e9be5a669e2c0b97cbcb052a4f1d61d8380568132a7fe19f842ccf4
2b1531fc301cc5fd895f3b4ca271639781c3c4e0c39f5d187d85c44825b79ec7
```

The final `b06-media-matrix-02` report passed 22 cases: 20 accepted exports and two
expected silence-only rejections, across both backends. It includes WAV/MP3/M4A/
Opus, mono/stereo, 44.1/48 kHz, non-frame-aligned audio, leading/trailing silence,
the 179.983-second case and the complete authorized private narration. All source
hashes and 134 recorded output hashes were verified; the external original's hash
was unchanged. The matrix contains static diagnostic imagery, not storyboards or
an ASR test.

Both full-voice exports checked 53 voiced windows with zero best lag. Minimum
correlation: native 0.9858119; FFmpeg 0.9999576. Decoded source/export durations
were 156.6820625/156.6813125 s natively and 156.6824375/156.68825 s with FFmpeg.
Native decoder padding can vary between invocations; original byte preservation,
measured duration/correlation/lag and listening remain separate checks.

Final matrix-report SHA-256:
`1d88043e65c57eb7030c42e3247043a61ab6f71d8420c0090db197bd2dd6c9ae`.

No human review or publication records were rewritten. B05's previous listening
approval refers to those earlier files, not an automatic approval of B06 exports.

## Changed Files

- Runtime checks: `safety.py`, `audio_qa.py`, `frame_qa.py`, `workflow.py`,
  `media_backend.py`, `ffmpeg_backend.py`, `media-qa.swift`, `lock.json`.
- Maintenance: `tools/media_matrix.py`, `tools/release.py`.
- Tests: `tests/test_safety.py`, `tests/test_frame_qa.py`,
  `tests/test_reliability.py`, `tests/test_audio_qa.py`,
  `tests/test_media_backend.py`, `tests/test_ffmpeg_backend.py`.
- Docs: this report, `docs/PIPELINE-ROADMAP.md`, `docs/README.md`,
  `docs/VALIDATION.md`, `docs/ARCHITECTURE.md`, `docs/WORKFLOW.md`,
  `docs/MEDIA-BACKENDS.md`, `CHANGELOG.md`.

Earlier B00-B05 changes in the checkout are preserved. No dependency changes,
new provider/network calls, global configuration changes, commits or pushes were
performed. Only invocation-owned scratch was automatically removed; historical
successes, failed attempts and all original recordings remain intact.
