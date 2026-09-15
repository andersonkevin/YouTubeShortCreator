# B05: FFmpeg Qualification Progress

[Roadmap](PIPELINE-ROADMAP.md) | [Media backends](MEDIA-BACKENDS.md) |
[Installation](INSTALLATION.md) | [CLI](CLI.md)

Recorded 2026-09-15. **In progress, not approved for release.** B04 technical
approval does not approve the B05 implementation or its new exports. The operator
approved listening to both full-voice exports; automated media/package checks
passed. Technical visual approval remains required to close this batch.

## Implementation Candidate

Initial synthetic-matrix lock SHA-256, before the authorized duration extension:
`6b03a644cb33b89109f85f26a9478fc266312f78408c07e6093c3a215612548e`.

Current three-minute candidate:
`4da21879c368aa725ec155ad8aed7108c1140b900065fc42692a54af4f61d9ca`.
The operator requested use of the full narration and removal of the 90-second
internal ceiling. The shared media contract now allows 180 seconds/5,400 frames.
Audio intake/validation is bounded at 75,000,000 bytes to accommodate three-minute
PCM; other file bounds are unchanged. The current matrix below qualifies these
automated media checks; the earlier matrix is retained separately, not relabeled.

- Explicit optional FFmpeg/ffprobe profile, measured versions and actual codec
  preflight. Native remains the default and never falls back to FFmpeg.
- Existing browser capture and approved scene geometry are unchanged. FFmpeg
  receives numbered frames, encodes H.264 (`libx264`, medium, CRF 18, yuv420p),
  copies that video when muxing and encodes one AAC audio track at 192 kbit/s.
- Inputs use a local-file protocol and bounded demuxer allowlist. Commands are
  fixed argument arrays, not a shell or user-supplied FFmpeg options.
- Verification checks tracks, geometry, exact frame count, every frame timestamp,
  selected decoded frames and source/export waveform correlation. No time stretch,
  inferred narration, automatic installation or publishing is implemented.
- Native AAC and Opus use invocation-owned PCM preparation before composition to
  avoid observed compressed-audio trimming errors. Original rate, channels and
  source files are preserved; preparation hashes are recorded and scratch removed.

The tested external FFmpeg 8.1.2 build enables GPL/version3 and libx264. No binary
is redistributed. See [licensing](LICENSING.md); the project's MIT license does
not cover external binaries. This remains a macOS qualification, not Linux/Windows
support or proof of cross-machine byte-identical output.

## Current Three-Minute Matrix

`workspaces/b05-media-matrix-05/matrix-report.json`: **PASS, 22 comparisons**
(20 accepted exports including both full-voice exports, two expected silence
rejections). Source/output hashes were independently rechecked. Both backends
passed 5,400-frame near-limit exports and 4,701-frame full-voice exports. Every
accepted frame timestamp was checked; maximum error remained below one microsecond.

| Source | Native seconds | FFmpeg seconds | Native bytes | FFmpeg bytes |
| --- | --- | --- | --- | --- |
| Near-limit WAV, 179.983 s | 55.827 | 26.794 | 6,976,814 | 5,057,534 |
| Full authorized MP3, about 156.68 s | 49.394 | 24.340 | 2,956,404 | 3,861,632 |

Times include media encode/mux/QA, not browser capture; these are static-pattern,
single-host measurements with different encoder settings, not a general speed or
quality guarantee. The new full recording was not clipped, resampled or converted
on intake: the private copy's hash equals the original's hash.

For the real voice, both backends checked 53 voiced windows with maximum detected
lag 0 ms. Minimum correlation was 0.9858119008 native and 0.9999575696 FFmpeg. Native
source/export decoded durations were 156.6940625/156.6813125 seconds; FFmpeg's were
156.6824375/156.68825 seconds. Decoder sample accounting differs; the unchanged
80 ms/10 ms/0.97 tolerances passed. These metrics do not replace listening.

Private full-voice MP4 SHA-256:

- Native: `58b542390789d8ba5e65f5f0ec77efc2b01833ccbc0a06638e75372fd16a7bc0`.
- FFmpeg: `8c842f9c5a15f62119cd08abb064a81c59272d4d554d3157e392ef0755a95b13`.

## Retained Synthetic Baseline

Private evidence: `workspaces/b05-media-matrix-04/matrix-report.json` and each
case/backend's `result.json`, MP4 and QA records. The report records engine/tool
hashes, input and output hashes, codec probes, tool versions and measurements.
Source and output hashes were independently rechecked after completion.

**PASS: 20 comparisons, comprising 18 accepted exports and two expected
silence-only rejections.** Coverage includes WAV, MP3, M4A/AAC and Opus; mono and
stereo; 44.1/48 kHz where supported; leading/trailing silence; non-frame-aligned
duration; and a 89.983-second source yielding 2,700 frames. Opus uses 48 kHz.

Every accepted export has its complete timestamp sequence checked against 30 fps.
Maximum timestamp error was below 0.000001 seconds. Across accepted waveform
windows, minimum correlation was 0.9999396157 and maximum detected lag was 0 ms.
Maximum decoded-duration difference was 15 ms. Existing thresholds remain
unchanged: duration difference <=80 ms, absolute lag <=10 ms and correlation
>=0.97 for every checked voiced window. Listening is still pending.

These are deterministic audio signals over a static test pattern, not a real
narration, storyboard or claim of perceptual equivalence.

### Observed Time and Size

Seconds include encoding, muxing and media/audio QA, not browser capture.
Measurements are single runs on the same host, not isolated benchmarks. The first
native case includes a cold Swift compilation cache; later cases reuse it. Native
and FFmpeg use their documented, different encoder settings. Do not generalize
these figures to animated Shorts, other machines or equal visual quality.

| Identical source | Native seconds | FFmpeg seconds | Native MP4 bytes | FFmpeg MP4 bytes |
| --- | --- | --- | --- | --- |
| WAV mono 44.1 kHz, cold native compile | 26.485 | 1.016 | 64,945 | 71,713 |
| WAV stereo 48 kHz | 3.334 | 1.041 | 165,399 | 100,605 |
| MP3 stereo 44.1 kHz | 3.165 | 0.925 | 73,139 | 101,221 |
| M4A stereo 48 kHz | 3.099 | 0.901 | 165,044 | 100,643 |
| Opus stereo 48 kHz | 3.292 | 0.954 | 168,830 | 102,286 |
| Near-limit WAV stereo 48 kHz | 29.172 | 13.840 | 3,674,788 | 2,521,965 |

FFmpeg was faster in this matrix, but not consistently smaller. This is evidence
for offering an explicit choice, not replacing the native backend automatically.

## Findings and Retained Failures

The first three matrix workspaces remain unchanged as failure evidence:

1. `b05-media-matrix-01`: average-frame-rate metadata was insufficient for native
   partial last frames; native compressed-audio duration estimates also differed
   from decoded samples. The harness now requires exact counts and **every** PTS,
   rather than trusting average rate alone.
2. `b05-media-matrix-02`: adjusting the Opus duration alone still produced a
   6.5 ms pre-skip error and failed waveform correlation. The failure was not
   accepted by relaxing audio thresholds or shifting the voice.
3. `b05-media-matrix-03`: native Opus passed after PCM preparation, but direct
   native AAC composition still lost the final video frame. AAC now uses the
   same rate/channel-preserving preparation. Directed Opus and AAC diagnostics
   passed before the full fourth matrix passed.

Failed fixture exports are not approved production media. Retry workspaces use
new names; historical run records and brand approvals were not rewritten.

## Real Narration Gate

The operator authorized reusing a previously supplied narration **only for private
testing, never GitHub or publication**. Its measured duration is 156.682438 seconds.
The latest operator instruction supersedes the proposed 60-second excerpt: use
the full recording within the new three-minute Shorts limit. The private matrix
copies original bytes without format conversion or trimming and records source
hashes. This media-only test creates no inferred transcript and does not replace
actual narration/subtitle review in production.

Operator response, 2026-09-15: **"Apruebo la escucha de ambas"**, in response to
reviewing the native and FFmpeg full-voice files listed above at the beginning,
middle and end. This approves only their private audio test, not captions,
animated visuals, editorial content or publication. Automated `audio-qa.json`
records remain unchanged; this dated note records the separate human decision.

## Animated Candidate

`workspaces/b05-ffmpeg-long-01/runs/widget-fixture/qualification`: four-scene
Violet charts plus a classic layout, **180-second FFmpeg export passed** under
the current lock. All 5,400 frames were captured through the production browser
path, encoded and timestamp-checked. The final timestamp is 179.966667 seconds.
Fifteen decoded media samples include late caption boundaries and frame 5,397.

The four viewport checks, deterministic seeking, transitions, loaded fonts/icons,
caption text/overflow and chart raster checks passed. A decoded frame at 178 seconds
was visually inspected: the last caption is legible, the progress bar is near its
end and content does not overlap. Source/export signal QA passed all 60 windows,
with zero detected lag and minimum correlation 0.9999700625. The container is
exactly 180 seconds; AAC decoding includes 32 ms of codec tail padding within the
existing tolerance. This synthetic fixture tests timing, not editorial pacing.

MP4 SHA-256:
`59b8dd7fc1c75186db06339f5939875128186ba6ccffe99678340ed1c963da59`.
Human technical visual approval remains pending. The separately approved real
voice is not used as an invented transcript for this signal-only fixture.

`workspaces/b05-native-final-01/runs/widget-fixture/qualification`: the native
companion passed under the same lock, using three Graphite widget/classic scenes,
12 seconds and 360 frames. Media/audio QA, four viewports, raster checks and every
decoded frame timestamp passed. Minimum waveform correlation was 0.9996508448
with zero detected lag. All three scene PNGs exactly match the B04-approved
widget fixture. Native MP4 SHA-256:
`096d169097dfea3abe1859a914dcfe2731044c65c8b5e5b28bfa4a7832593121`.

The operator was asked to review both final animated files technically. No visual
response has been recorded yet. The source audio, frame clock and geometry were
not changed to obtain human approval.

The earlier 12-second native/FFmpeg chart pair (`b05-native-a-01`,
`b05-ffmpeg-a-02`) had exact four-scene PNG parity. Those runs use the preceding
lock and remain historical evidence, not replacement qualification for this one.

## Automated Checks

Reproduce media QA in a new private workspace with the maintenance command below.
Use installed local tools; this command does not install dependencies. Omit the
real-source argument for synthetic-only QA; add it only with explicit permission.

```sh
python3 -B tools/media_matrix.py --workspace workspaces/new-media-review \
  --ffmpeg /path/to/ffmpeg --ffprobe /path/to/ffprobe --swift /path/to/swift \
  --real-source /path/to/authorized.mp3 --approve-write
```

For animated maximum-duration QA, supply the documented `YSC_NODE`,
`YSC_PLAYWRIGHT`, `YSC_CHROME`, `YSC_FFMPEG` and `YSC_FFPROBE` runtime paths, then:

```sh
python3 -B tools/widget_smoke.py --workspace workspaces/new-long-review \
  --set charts-a --scenes 4 --duration 180 --palette violet \
  --backend ffmpeg --render --approve-write
```

- `python3 -B -m unittest discover -s tests`: 160 tests passed, including long
  episodes/captions at 91, 156.7 and 180 seconds, full-recording copy/no-overwrite,
  symlink rejection and frame-limit validation.
- `node --test tests/*.test.mjs`: nine tests passed using the configured Node.
- `python3 -B tools/check_docs.py`: 40 documents, 263 local references and 14
  manifest images passed; the checker made no network requests.
- `python3 -B tools/release.py audit`: 183 allowlisted public files passed;
  private voices and exports are excluded. No upload was performed.
- `git diff --check`: passed.

The new duration helper participates in the implementation lock and its tamper
test. No dependency was installed or added. Only public YouTube format guidance
was consulted externally; the real voice stayed local. No commit or push occurred.

An allowlisted 183-file candidate ZIP was extracted into a new temporary directory;
the extracted tree passed the same 160 Python tests, nine Node tests, docs check
and source audit using existing installed dependencies. Archive SHA-256:
`c95b5b750e47edc7730cd56c2d89f2525403ff65f22370512bc625e720358575`.
The archive snapshots this engine before final evidence-only documentation edits;
it contains no private voices, fonts, brands or exports. This is not B07's fresh
dependency installation, a release authorization or a public upload.

## Remaining Gates

- Obtain technical visual approval of the current animated candidate. Full-voice
  listening passed separately; automated correlation alone does not approve visuals.
- Proceed to B06 only after the B05 exit criteria pass. B07-B09 and M01-M03 remain
  separate pending batches; no release, commit or push is implied by these tests.
