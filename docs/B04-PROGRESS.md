# B04 Native Backend Evidence

[Roadmap](PIPELINE-ROADMAP.md) | [Backend contract](MEDIA-BACKENDS.md)

Recorded 2026-09-15. Implementation and two native exports passed automated
checks. Full classic regression and extracted-source checks also passed. B04
is complete following explicit operator technical approval of both new exports
on 2026-09-15. This covers image and sound, not publication. B03's approved source
baseline is retained, not rewritten.

## Candidate and Fixtures

Implementation lock SHA-256:
`8ffc82016200dea143d6e9b396fd8007dc390359ffffcc0ce931e0d4897dccfb`.

| Private workspace | Scenes/palette | Comparison baseline |
| --- | --- | --- |
| `b04-native-a-01` | 4 / Violet: line, bar, donut, classic | `b03-media-a-03` |
| `b04-native-widgets-01` | 3 / Graphite: flow, metric, classic | `b02-graphite-3-01` |

Each sample is `runs/widget-fixture/qualification/video.mp4`: twelve seconds,
360 frames, 1080x1920, 30 fps, one video/audio track. Both passed native media QA
with fifteen decoded samples, deterministic seeks and four-viewport checks.
Episode records are identical to their comparison baselines. All seven scene
PNGs match exactly, and recorded output hashes were rechecked before comparison.

MP4 SHA-256 values:

- Charts: `14150ca23c0805861e3aa82802f1664ef1592a865dce1fea90f2ac2f54f37835`.
- Widgets: `397c96c817a7183f16d093b64ddb7561480f3364cfa15e524fa06e7e8a9e9800`.

## Decoded Comparisons

An already-installed FFmpeg 8.1.2 was used as an independent, read-only comparison
tool. This did not install anything, encode the fixtures with FFmpeg, or enable a
production FFmpeg backend. The native algorithms remain unchanged.

- Widgets: all 360 decoded video frame hashes match the B02 baseline exactly.
- Charts: 331 of 360 decoded frames match. Frames 29-57 differ in 591 YUV channel
  samples overall, with maximum absolute difference 5 on the 8-bit scale.
- Chart full-video PSNR is 107.833799 dB; minimum per-frame PSNR is 93.516541 dB.
  FFmpeg reports aggregate SSIM as 1.000000 at its printed precision, not proof
  of exact equality. The silent and muxed comparisons have the same metrics.
- Decoded float PCM for both exports exactly matches its corresponding baseline,
  with MD5 `c0cea9dec0d6ccc2f770e7fdc9afb1bd` as a comparison checksum. Source/export
  waveform QA also passed, with zero measured lag in each checked window.

The tiny chart raster difference is observed, not attributed conclusively to a
codec or browser. No acceptance threshold was weakened and no exact video parity
is claimed for that sample. The operator approved the subsequent technical review.

Reproduce a decoded-frame comparison without writing files:

```sh
ffmpeg -v error -i VIDEO.mp4 -map 0:v:0 -an -f framemd5 -
ffmpeg -v error -i VIDEO.mp4 -map 0:a:0 -vn -c:a pcm_f32le -f md5 -
```

The first invocation of an auxiliary raw-pixel comparison failed its frame-count
assertion and left a child blocked in a pipe. That identified comparison child
was terminated; no video was changed. A bounded retry explicitly used
`-fps_mode passthrough` and decoded only frames 29-57, validating all 29 frames
before calculating the sample counts above. This was a maintenance diagnostic,
not a production workflow failure or evidence substituted for a failed render.

## Validation and Pending Gates

The Python suite passes 135 tests; nine Node tests cover charts and capture path
boundaries. Tests exercise native-only dispatch, capabilities, old profiles,
profile drift, frame sequences, symlinks, no-overwrite, capture failure and scratch
cleanup. Build-only capture no longer allocates media scratch. Existing media
algorithms, source audio and waveform limits have not changed.

The seven-run `b04-classic-01` matrix passed, including its invalid-anchor and
overflowing-heading cases. Comparison with `b03-density-classic-01` produced zero
changed pixels across all 24 classic captures, without a mask or tolerance.
The twelve classic layouts retain coverage at both scene counts.

The 176-file source candidate was packaged and extracted into a new temporary
directory. All 135 Python tests, nine Node tests, docs checks and the source audit
passed there too. This uses existing local dependencies, not B07's future clean
dependency installation. Final engine and runtime-profile hashes matched the two
new successful media runs. The native chart frame at index 31 was decoded and
visually inspected; no visible layout or legibility defect was observed.

Original run `review_required`/listening fields remain unchanged.
No publication, commit, push, dependency installation or runtime provider call
occurred. FFmpeg implementation remains the separate B05 batch.
