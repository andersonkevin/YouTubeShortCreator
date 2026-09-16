# Your First Short

[Docs index](README.md) · Prerequisite: [Installation and approved brand](INSTALLATION.md)

This walkthrough uses `first-short` as a new episode ID. Commands use the default
`workspace/`; add the same global `--workspace` option before each command when
using a different channel. All source media remains local.

## 1. Prepare the Story

Choose one idea that works in three or four scenes: a clear problem, a code/diagram
explanation, and a useful conclusion. Avoid trying to fit a full tutorial into a Short.
[examples/narration.txt](../examples/narration.txt) is a starting script, not a supplied recording.

Create your final narration using your own voice, a service you are authorized
to use, or the optional [local voice synthesis](VOICE.md) tool, which writes a
WAV straight into `intake/`. Export the actual voice file before timing scenes.
`ysc.py` itself does not call any voice service or generate narration. Confirm the rights
and privacy of your source.

## 2. Import Inputs

Replace the following two external paths with real files:

```bash
python3 ysc.py import /path/to/voice.mp3 --name voice.mp3 --approve-write
python3 ysc.py import /path/to/artwork.png --name artwork.png --approve-write
```

The imports go into `workspace/intake/`; the originals are not edited. Intake names
must be simple lowercase filenames, and their extensions must match their sources.
Use new filenames for new versions. The tool refuses to overwrite an existing import.

Audio validation accepts `.mp3`, `.wav`, `.m4a` and `.opus` extensions, but decoding
still depends on the actual container/codec and native support. WAV or a known-good
MP3 is a practical starting point; an accepted extension is not a decode guarantee.

Artwork must be PNG/JPEG, approximately 9:16, at most 4096 px on either side and
no larger than 30 MB. A 1080×1920 canvas is the target format. Keep the meaningful
illustration **below y=640**: the thumbnail renderer replaces the upper portion
with a black logo/headline zone. Artwork is a cover input, not automatically inserted
into the video's code/diagram scenes.

## 3. Transcribe the Recording

```bash
python3 ysc.py transcribe intake/voice.mp3 intake/transcript.json --approve-write
```

Expected output: a timed transcript with an `audio_sha256` matching the imported
recording. The native adapter requires a supported, already-installed local speech
model. If it reports `MISSING_LOCAL_MODEL`, stop; no cloud fallback is attempted.

An external word-timed transcript can be used instead. Import its JSON, verify the
audio hash and follow the [transcript contract](DATA-CONTRACTS.md#transcript).
Do not substitute a plain script with estimated times.

## 4. Draft and Review Captions

```bash
python3 ysc.py caption-draft intake/transcript.json intake/captions.json --approve-write
```

Review the transcript and draft against the recording. Correct transcription
errors and measured timing before assembling the episode. Use a new corrected file
when preserving a previous version. JSON text editing is manual; there is no
caption editor in this release. Regenerate captions from corrected timed text so
the word indexes remain coherent.

The automatic grouper considers sentence punctuation, six timed segments and a
rough 2.8-second grouping threshold. ASR segments are not guaranteed to be single
words, and these are grouping heuristics, not a promise of exactly six words or
2.8 seconds per cue. Long captions can still fail visual QA.

## 5. Create the Episode Draft

```bash
python3 ysc.py new first-short \
  --audio intake/voice.mp3 \
  --transcript intake/transcript.json \
  --captions intake/captions.json \
  --graphic intake/artwork.png \
  --approve-write
```

Expected location: `workspace/episodes/first-short/episode.json`, with private copies
of the four inputs beside it. The initial scene selection is based on the brand's
3/4-scene setting. Draft anchors divide the available cues, not their semantic meaning.

## 6. Replace the Example Content

Edit that `episode.json`:

- Set YouTube title, description, hashtags, tags and pinned comment.
- Replace the two-line thumbnail headline and its supporting label.
- Replace **every relevant text/code slot** with content matching your recording.
- Choose layouts from the [gallery](GALLERY.md), keeping their exact slot keys.
- Anchor scene changes to the appropriate caption cues and review motion timing.

Use the [data reference](DATA-CONTRACTS.md) for field limits. `new` inserts generic
AI-agent examples; it does not analyze your story. Merely removing `DRAFT:` cannot
establish that the video is accurate or ready for publication.

After this point, changing an input file invalidates its recorded hash. Preserve
the current episode and prepare a new version with correctly bound inputs rather
than silently replacing the voice or captions under an existing run.

## 7. Validate and Build

```bash
python3 ysc.py validate episodes/first-short/episode.json
python3 ysc.py build episodes/first-short/episode.json --run-id preview-01 --approve-write
```

Expected location: `workspace/runs/first-short/preview-01/`. Open `video.html`, the
scene PNGs, `thumbnail.jpg` and `youtube.md`. The HTML loops **without audio**.
Build checks the live browser layout but creates no MP4 and performs no encoded-audio QA.

If a check fails, inspect the error and any `failure.json`. Fix the source and use
a new run ID, such as `preview-02`; partial runs are intentionally preserved.

## 8. Render and Review the Actual MP4

```bash
python3 ysc.py render episodes/first-short/episode.json --run-id final-01 --approve-write
```

Expected location: `workspace/runs/first-short/final-01/`. Rendering includes visual
QA, PNG capture, native encoding, source-audio muxing and media/audio checks.

Review `video.mp4` with sound. Confirm spoken words, caption starts/ends, pacing,
scene relevance, phone-size readability, cover text and asset rights. Start/end
silence may be legitimate. Automated audio correlation checks the mux, not the
correctness of speech recognition. Follow [Validation](VALIDATION.md).

## 9. Hand Off Manually

Use `video.mp4` for the already-narrated, already-captioned result. Use the SRT only
when intentionally managing separate captions downstream; do not add a second
identical burned-in layer. `silent.mp4` has no audio but **still contains the burned-in
captions**. Replacing narration in Canva requires reviewing those timings again.

The generated JPEG is a cover asset; this tool does not control how YouTube exposes
Shorts cover selection. Publishing, account access and Canva editing are outside
the application. Run QA again after any external edit that changes audio or timing.
