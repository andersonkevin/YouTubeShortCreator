# Validation

[Docs index](README.md) · [Qualification evidence](RELEASE-QA.md)

## Automated Gates

- Input containment, symlink rejection, bounded files, input SHA-256, duplicate
  JSON fields, finite numbers, exact episode fields and template/brand drift.
- Caption words and source-audio binding, ordered coverage, cue timing and measured
  adjustment notes. No duration-only or estimated caption alignment is accepted.
- Three/four ordered scenes, known layouts, escaped text and bounded motion.
- Headline and label fitting; metadata lengths; 5-8 unique lowercase hashtags.
- Four browser viewports: 1080x1920, 1440x900, 390x844 and 375x667. Check frame
  containment, text overflow, heading/graphic/note/caption overlap.
- Actual loaded logo and fonts, every caption at its cue midpoint, central graphic
  motion, deterministic backward seeking, page errors and attempted page network.
- MP4 codecs, dimensions, track counts, duration and every 30 fps presentation
  timestamp. Decoded samples cover both sides of cue starts/ends, cue midpoints,
  the first/middle/final frame and caption gaps.
- Sampled encoded pixels compared with the exact browser capture: fixed regions
  and local tiles, bounded lossy tolerance, source/decoded hashes in `frame-qa.json`.
- Source/export waveform comparison in voiced windows: at most 10 ms best lag,
  correlation at least 0.97, and duration difference at most 80 ms.
- Short final voiced windows are included. Nonfinite PCM, added sound during a
  source-silent window and non-silent unmatched tails fail. Silence classification
  uses RMS 0.001; unexpected sound/tails use RMS 0.003. These are engineering
  thresholds, not claims about human audibility.

## Human Review Still Required

Listen to the exported MP4 against its captions, including first/last words and
scene transitions. Check the story, factual claims, code correctness, spelling,
logo recognition, layout at phone size, graphic relevance and asset rights.
ASR confidence is not editorial approval. Waveform correlation verifies that
muxing preserved the source voice/timing, not that ASR transcribed it correctly.

Visual QA samples scene states, not every possible overlapping box at every frame.
Encoded-frame checks verify sampled pixel correspondence, not semantic image quality. Runtime
versions are recorded; deterministic captures do not guarantee byte-identical
MP4 containers across machines. Full rendering is currently macOS-only.

## Commands

```bash
python3 -B -m unittest discover -s tests -v
node --test tests/*.test.mjs
python3 -B tools/check_docs.py
python3 ysc.py doctor
python3 ysc.py validate episodes/my-short/episode.json
python3 ysc.py build episodes/my-short/episode.json --run-id qa-01 --approve-write
python3 tools/smoke.py --workspace workspaces/smoke-01 --render --approve-write
python3 tools/release.py audit
```

Unit tests use temporary fixtures; no production data is changed. The smoke test
creates its explicitly selected new workspace, using a synthetic tone and synthetic
caption intervals to exercise the pipeline. It is not a transcription test and
must not be published. Real narration transcription needs a separate local test.

## Operator Sign-Off Checklist

- [ ] The video uses the intended approved brand and correct episode recording.
- [ ] Spoken words match captions, including first/last words and sentence boundaries.
- [ ] Scene changes and animated code explain the current narration, not another topic.
- [ ] Headings, code, logo and captions remain readable at phone size.
- [ ] The cover is readable, relevant and free of placeholder copy.
- [ ] Code, factual statements and any numerical claims have been reviewed.
- [ ] Voice, font, image and logo rights have been checked for the intended use.
- [ ] The run has its final `run.json`, and the applicable QA reports pass.
- [ ] Any changes made outside this tool have been reviewed again for sync and layout.
- [ ] Publishing is deliberately approved through the operator's separate workflow.

This checklist is a review aid, not an application-generated signed approval record.
Do not change a run's `review_required` status merely to make a report look complete.
