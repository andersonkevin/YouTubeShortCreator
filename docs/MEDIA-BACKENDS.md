# Media Backend Boundary

[Roadmap](PIPELINE-ROADMAP.md) | [CLI](CLI.md) | [Installation](INSTALLATION.md)

B04's native boundary is technically approved. B05 adds optional `ffmpeg`
selection under qualification, using the same frame capture. Cross-platform
qualification, external binary installation and silent fallback are not implemented.

## Configuration and Evidence

`configure --backend native --approve-write` writes a new private runtime profile
with exact `backend`, `paths`, `versions` and `capabilities` fields. Omission selects
native. Existing two-field profiles (`paths`, `versions`) are interpreted as native
without being edited. Episodes cannot choose backend names, tools or arguments.

Configuration and `doctor` check executable availability and measured versions,
then invoke a fixed native capability probe in temporary storage. The probe checks
AVFoundation H.264 1080x1920 settings, writer input support and the highest-quality
export preset. A probe is not proof of a successful export: each rendered file
must still pass media and source/export audio QA.

Runs record backend, capabilities, versions and runtime-profile SHA-256. Profile
bytes are checked again after production; drift prevents a success record. A tool
or profile change requires new qualification, not rewriting old approvals. Paths
remain trusted operator configuration, not a sandbox against hostile executables.

## One Capture Path

1. Python validates the brand, runtime and episode, then creates a new run.
2. For a render, Python owns a unique OS temporary directory and empty `frames/`.
3. `capture.mjs` runs the existing browser checks and captures exactly
   `round(duration * 30)` PNGs at timestamps `frame / 30`. It does not encode.
4. `media_backend.py` validates the exact frame sequence and dispatches fixed
   selected-backend encoding, mux, media inspection and PCM decoding operations.
5. Sampled decoded pixels are compared with exact captured frames; the waveform
   comparator checks original versus exported audio, including short final windows.
6. Python removes only its temporary directory on success or failure. Run outputs,
   partial media, `failure.json` and original inputs remain for diagnosis.

Build-only runs capture previews without frame scratch or media dispatch. Both
modes use the same renderer and preserve fixed logo/progress/caption geometry.
Waveform thresholds are unchanged. B05 corrects native AAC/Opus preparation:
direct AVFoundation composition can misapply padding/pre-skip or estimate duration.
AAC and Opus are decoded with Apple libraries to temporary float PCM at their original
sample rate and channel count before native mux. Contiguous decoded timestamps
are checked, the original recording is retained, and `audio-preparation.json`
records original/intermediate hashes. This is not a FFmpeg fallback. Other native
audio formats keep their existing path; Python owns the PCM scratch cleanup.

## FFmpeg Contract

Select `--backend ffmpeg` only in a new profile. Explicit `--ffmpeg`/`--ffprobe`
paths, their full version/build strings and an actual two-frame capability probe
are recorded. Native profiles neither require nor invoke these tools. Selected
FFmpeg failures never invoke Swift as a media fallback.

Encoding uses libx264, medium preset, CRF 18, yuv420p and MP4 faststart at the
existing 1080x1920/30 fps. Mux copies the picture stream and encodes the original
audio to AAC at 192 kbps, mapping exactly one video and one audio stream. It does
not stretch, normalize, generate or mix narration. These settings differ from
native rate control, so file size and speed must be measured rather than promised.

FFprobe verifies codecs, dimensions, exact decoded frame count and frame rate,
track counts and duration. FFmpeg decodes samples around caption boundaries and
the original/exported audio to the shared 16 kHz mono float PCM comparator.
Duration difference remains at most 80 ms, absolute lag at most 10 ms and each
checked voiced-window correlation at least 0.97. Silence cannot pass as narration.

Frame timing is checked against every decoded presentation timestamp (`index / 30`,
within 10 microseconds for printed timestamp precision), not just the container's
average-rate field. The latter can differ for a valid partial final native frame.
This does not relax frame count, nominal 30 fps, duration or audio thresholds.

B06 adds this full-timestamp check to native decoding too, plus shared pixel
sampling at cue starts/ends/midpoints and first/middle/final frames. `frame-qa.json`
records captured/decoded hashes and fixed-region/local-tile errors. Native PNG
samples use Apple frameworks, not an implicit FFmpeg dependency. These checks do
not replace phone-size visual review or verify caption transcription accuracy.

Commands are fixed argv lists with no shell or episode-supplied options. Media
inputs allow only local `file` protocol and WAV, MP3, MOV/MP4 or Ogg demuxers;
playlist/network protocols are not enabled. This narrows input behavior but is
not a sandbox for hostile media decoders. Runtime paths remain trusted operator
configuration. Writers reject existing outputs and use FFmpeg's no-overwrite mode.

## Recovery and Limits

No overwrite or force flag is provided. A missing capability fails before a run
directory is created. Later failures retain partial run evidence without a
successful `run.json`; retry with a new ID. There is no native-to-FFmpeg fallback.

Scratch cleanup covers normal completion and Python exception unwinding. A hard
process/OS kill can leave OS temporary files; it is not claimed as transactional
recovery. Concurrent editing remains unsupported. Native comparisons and batch
evidence are recorded in [B04 progress](B04-PROGRESS.md). B05 requires its own
format matrix and human review, including an authorized real narration.

Tests include backend rejection, immutable/legacy profiles, capability/profile
drift, malformed frame sequences, symlinks, no-overwrite and capture failure.
Run `node --test tests/*.test.mjs` alongside the Python suite. These tests do not
replace actual native rendering or human review of changed media.
