# Local Voice Synthesis (Optional)

[Docs index](README.md) · [First Short](FIRST-SHORT.md) · [CLI](CLI.md) · [Third-party notices](../THIRD_PARTY_NOTICES.md)

`tools/voice.py` turns a script file into a narration WAV on this machine with
the Kokoro text-to-speech model. It is optional: the pipeline still accepts any
recording. The generated file enters production exactly like a recording, through
`transcribe`, `caption-draft` and `new`, and it needs the same listening review.
Nothing here approves a voice, uploads audio or contacts a service.

What the tool does not do: install packages, download models, call an API, read
credentials, change `ysc.py`, alter templates or captions, or mark anything
approved. `doctor` reports what is missing instead of fetching it.

## What You Need Once

1. An isolated Python 3.12 environment with the pinned packages. Create it
   outside the repository or under an ignored path, then install from PyPI.
   Package installation is an operator action, never a runtime command:

   ```bash
   python3.12 -m venv /path/to/voice-venv
   /path/to/voice-venv/bin/pip install kokoro-onnx==0.6.1 onnxruntime==1.30.0 numpy==2.5.3 phonemizer==3.4.0 espeakng-loader==0.2.4
   ```

   The repository's own Python 3.14 and `requirements.txt` are unchanged; the
   voice environment is separate on purpose.

2. The two pinned model files from the kokoro-onnx `model-files-v1.1` release
   (Kokoro-82M v1.0): `kokoro-v1.0.onnx` (325,505,369 bytes) and
   `voices-v1.0.bin` (28,214,398 bytes). Put them in `<workspace>/voice/models/`
   or in any local directory you pass with `--models`. Their SHA-256 values are
   pinned in `tools/voice-models.json`; a different release, a partial download
   or a modified file is rejected.

3. Verify:

   ```bash
   /path/to/voice-venv/bin/python tools/voice.py --workspace workspaces/my-channel doctor
   ```

   `doctor` is read-only. It reports the Python and package versions, checks
   both model files by size and hash, confirms the bundled espeak-ng library,
   loads the engine on the CPU and counts the American English voices. Any
   problem is listed with `status: FAIL`; nothing is installed to fix it.

## Generate a Narration

```bash
/path/to/voice-venv/bin/python tools/voice.py --workspace workspaces/my-channel synthesize intake/script.txt intake/voice.wav --voice af_heart --approve-write
python3 ysc.py --workspace workspaces/my-channel transcribe intake/voice.wav intake/transcript.json --approve-write
python3 ysc.py --workspace workspaces/my-channel caption-draft intake/transcript.json intake/captions.json --approve-write
```

The script is a small workspace-relative `.txt` or `.md` file (at most 3,000
characters, no markup). Lines are joined with spaces; the engine handles sentence
and clause pauses from the punctuation. The output is a new 24 kHz, 16-bit mono
WAV under `intake/` with a sidecar record `intake/voice.voice.json`: engine and
model hashes, script hash and word count, duration, generation time, real-time
factor, peak level, package versions, `listening_approval: pending`,
`word_alignment: not measured` and `publication_performed: false`. Existing
files are never overwritten; use a new name for a new take.

Rules: American English voices only (`af_*` and `am_*`), speed between 0.8 and
1.2, `lang` fixed to `en-us`. Silent, clipped or non-finite audio fails before
anything is written. No equalization, normalization, denoising or time stretch
is applied.

## Choose a Voice by Listening

```bash
/path/to/voice-venv/bin/python tools/voice.py --workspace workspaces/my-channel audition intake/script.txt --voices af_heart,af_bella,af_sky,am_michael,am_adam --run-id pick-01 --approve-write
/path/to/voice-venv/bin/python tools/voice.py --workspace workspaces/my-channel voices
```

`audition` writes one WAV per voice for the same short script (up to 600
characters, up to 12 voices) under `<workspace>/voice/auditions/<run-id>/` with
`audition.json`. The metrics describe timing and level only; naturalness,
pronunciation of names and pacing are judged by listening. The voices file
holds 20 American English voices; `voices` lists them.

Voice is one more axis of variety for a batch of Shorts: alternate voices the
same way palettes, motion recipes and layouts are alternated, and record the
chosen voice in the episode notes.

## Observed Run

Measured on 2026-09-16 with the pinned environment on an Apple Silicon Mac,
CPU only, four inference threads, using the repository's example narration
(59 words):

| Check | Result |
| --- | --- |
| `doctor` | PASS: packages present, both model hashes match, espeak-ng bundled, engine loaded in 0.47 s, 20 American voices |
| `synthesize` with `af_heart` | 22.38 s of audio in 5.29 s (real-time factor 0.24), peak -6.4 dBFS |
| `audition` with seven voices | 17.7 to 23.8 s of audio per voice, real-time factor 0.18 to 0.21 |
| Local transcription of the WAV (`transcribe.swift`, en-US) | 59 timed words, all matching the script, duration 22.38 s |
| Listening approval | pending; the operator decides |

The transcription result shows that the WAV decodes in the production step and
that word timing is available for captions. It says nothing about whether the
voice sounds right for the channel.

## Licenses and Distribution

The repository ships only the tool and the manifest. The model weights
(Apache-2.0), kokoro-onnx (MIT), ONNX Runtime (MIT), phonemizer (GPL-3.0 or
later) and espeak-ng via espeakng-loader (GPL-3.0 or later) are installed by the
operator into a separate environment and are not redistributed here. Generated
narration is your content; check the Kokoro model card and the voice terms
before publishing commercially. Model files, environments and WAVs belong under
ignored paths (`workspaces/`, `.venv/`, `*.onnx`, `*.bin`, `*.wav`).

## Limitations

- CPU inference only through ONNX Runtime; no GPU path is configured.
- No word timings from the engine are used; timing comes from the existing
  local transcription step, which remains the caption source of truth.
- Long scripts are synthesized in one call; for more than about 3,000 characters
  split the script and generate separate takes.
- The pronunciation of brand names and acronyms varies by voice; audition them.
- Kokoro is a research model: the same script can render slightly differently
  across package or model versions. The record pins both so a take can be
  attributed, not reproduced bit for bit.
