# Data Contracts

[Docs index](README.md) · [CLI paths](CLI.md#path-rules)

The examples below illustrate field shapes. They are not complete runnable episodes
and do not contain real narration. Generate an episode using `new`; do not paste an
illustrative hash into a production transcript.

## Episode

Version 1 top-level keys must be exactly:

| Field | Meaning and current checks |
| --- | --- |
| `version` | Contract version `1` |
| `id` | Lowercase hyphenated ID, maximum 64 characters |
| `template` | `v1` |
| `language` | Must match the approved brand |
| `duration` | Seconds; greater than 1, at most 180, on a 30 fps boundary; derived from the complete recording |
| `inputs` | Exactly `audio`, `graphic`, `transcript`, `captions` |
| `thumbnail` | Exactly `headline` and `label` |
| `youtube` | Exactly `title`, `description`, `hashtags`, `tags`, `pinned_comment` |
| `scenes` | Three or four scene records |
| `timing_adjustments` | Measured caption-start notes indexed by cue number, or `{}` |

Batch membership is not an episode field. `new --batch NAME` writes a separate
`batch.json` beside the episode with exactly `batch`, `episode`, `sequence` and
`picked_layouts`; it is written once, never updated, and the picker rereads the
current `episode.json` of each member rather than trusting the recorded pick.

Version 2 keeps `template: "v1"` and all existing timing/media rules, and adds an
exact `visuals` object. It enables mixed classic and visual-library scenes. Flow,
metric and comparison passed B02; analytical charts and selectable motion are
implemented under B03 qualification. Use the [visual adapter contract](VISUAL-ADAPTER-CONTRACT.md)
for exact fields, symbol IDs, data limits and rendering boundaries. Version 1
rejects these extra fields; there is no silent episode/profile migration.

Each input has `path` and `sha256`. Paths are relative to the episode JSON directory,
with containment and symlink checks. Files must be nonempty. Audio may be at most
75,000,000 bytes (enough for 180 seconds of 48 kHz stereo float PCM); other inputs
remain capped at 30,000,000 bytes. This is a storage bound, not a duration estimate.
JSON parsing applies an additional 2 MB limit. Hashes must match the current bytes.

Example input descriptor, with an intentionally non-production placeholder hash:

```json
{
  "path": "audio.mp3",
  "sha256": "replace-with-the-actual-sha256-of-audio-bytes"
}
```

No arbitrary style/configuration field is allowed. The source of truth for exact
validation is [workflow.py](../workflow.py), not a separately maintained JSON Schema.

## Transcript

Required operational fields are `duration`, `audio_sha256` and a nonempty `words`
array. The native adapter also records engine/locale metadata. Each timed segment
contains text and start/end seconds measured against the original recording.

```json
{
  "duration": 3.0,
  "audio_sha256": "replace-with-the-actual-sha256-of-audio-bytes",
  "words": [
    {"text": "Check", "start": 0.2, "end": 0.6},
    {"text": "the result.", "start": 0.65, "end": 1.4}
  ]
}
```

`words` is the field name; a native ASR segment can contain more than one lexical
word. Index these entries as returned. The validator requires finite times, positive
intervals within the episode duration and ordered segments, with a 0.061-second
ordering tolerance. A transcript hash binds a file, not the truthfulness of its text.

## Captions

```json
{
  "duration": 3.0,
  "status": "word_timed_review",
  "cues": [
    {
      "text": "Check the result.",
      "start": 0.2,
      "end": 1.4,
      "firstWord": 0,
      "lastWord": 1
    }
  ]
}
```

The accepted status values are `word_timed_review` and `local_asr_aligned_review`.
Neither is a claim of human approval. `firstWord` and `lastWord` are inclusive,
zero-based indexes into transcript segments. Cues cover every segment exactly once,
in order, without overlapping cue intervals. Caption text must preserve the sequence
of normalized spoken words; punctuation and case may differ. Each cue is at most
100 characters, but visual fitting is checked separately in the browser.

End timestamps must match the final segment within 0.061 seconds. Start differences
greater than 0.12 seconds require an explicit measured `timing_adjustments` note;
the existing refinement ceiling is 1.1 seconds, and the cue cannot start later than
the first segment's end plus 0.061 seconds. Unused notes fail validation.

`caption-draft` rounds transcript duration up to a whole 30 fps frame. Do not stretch
the original recording to match manually invented duration or cue intervals.

## Scenes and Motion

Scene fields are exactly `layout`, `name`, `first_cue`, `content`, `motion`.
`content` and `motion` keys must match the chosen layout JSON. Text slots are escaped,
limited to 300 characters and subject to visual QA. This ceiling does not imply
300 characters fit in a headline or code line. Scene names are limited to 100 characters.

`first_cue` anchors must increase. The first is zero; the first scene starts at time
zero, and later scenes start at their anchored cue's start time. `new` additionally
requires at least two seconds for each drafted scene; the general validator only
requires positive scene durations.

| Motion key | Value | Interpretation |
| --- | --- | --- |
| `enter` | Nonnegative number | Reveal time relative to scene start |
| `active` | `[start, end]` | Active-state interval |
| `fill` | `[start, duration]` | Line/fill animation interval |
| `travel` | `[start, duration]` | Packet movement interval |

Only motion keys declared by that layout are permitted. Intervals must finish
inside the scene. When changing layout, start from that layout's `example` object
and adapt its timing; do not retain incompatible slot names.

## Cover and YouTube Copy

| Field | Limit |
| --- | --- |
| Cover headline | Exactly two uppercase lines, each at most 24 characters; must fit width and height |
| Cover label | Uppercase, at most 32 characters; must fit at the fixed size |
| YouTube title | Nonempty, at most 100 characters |
| Description | Nonempty, at most 5,000 characters |
| Pinned comment | Nonempty, at most 1,000 characters |
| Hashtags | 5-8 unique lowercase `#[a-z0-9]+` entries |
| Description hashtags | Must match the hashtag list in the same order |
| Tags | List of strings; comma-space joined length at most 450 characters |

These are local editorial/validation constraints, not a complete implementation of
current platform policy. There is no search-volume lookup or platform API validation.
Final render blocks `DRAFT:` in title, description or pinned comment; other placeholder
copy is still a human-review responsibility.

## Run Records

Successful `run.json` records the episode/input hashes, mode, measured environment,
output hashes, `automated_checks: PASS` and `status: review_required`.
`publication_performed` is false. Build-only runs have no final media/audio checks.

The run manifest hashes top-level output files; it is not a recursive archive of
every asset/dependency byte. Preserve the approved brand, exact inputs, implementation
version and relevant runtime evidence when reproduction matters.
