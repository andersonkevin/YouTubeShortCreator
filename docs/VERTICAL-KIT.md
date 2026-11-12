# Vertical Kit

[Documentation](README.md) · [Example](../examples/vertical-kit/README.md) · [Local voice](VOICE.md)

The vertical kit is a second, hand-authored route for narrated Shorts (1080x1920) and square videos (1080x1080).
Instead of choosing scene families from a closed storyboard, you write each scene as HTML with a small Python helper,
timed to the words of the narration. A deterministic clock (`window.setTime(t)`) drives every animation, so the page
is captured frame by frame and the result is identical on every run.

Use it when a Short needs one bespoke diagram per scene. Use the main engine (`ysc.py`) when its validated compositions
fit: they carry brand approval, the implementation lock and the QA gates. The kit has none of those gates. Its
safeguards are the review steps below, so every output still needs a person to watch it before publication.

## What It Produces

| Output | Detail |
| --- | --- |
| `final/<short>-final.mp4` | H.264/AAC, 30 fps, cover intro (0-1.6 s), loudness normalised to -14 LUFS / -1.5 dBTP |
| `upload/<short>.en.srt` | Caption cues from the aligned words, shifted for the intro |
| `cover/cover.png`, `cover.jpg` | Feed-safe 9:16 cover; it is also frame 0 of the video |
| `stills.jpg`, `sheet.jpg` | Review contact sheets: per-cue stills before rendering, 12 frames after |

Scenes keep to the Shorts safe zone: the scene camera spans 250-1430 px and captions start at 1450 px (56 px type in
an 820 px column), above the title and channel overlay and clear of the action rail. YouTube turns loud uploads down
but never turns quiet ones up, which is why `finish` normalises loudness. In testing, unprocessed narration measured
-22 to -26 LUFS, 8-12 dB below other videos in the feed.

## Requirements

macOS with Node 22 and the repository's Playwright (`npm ci`), Google Chrome, FFmpeg and FFprobe, Swift for
on-device transcription (the repository's `transcribe.swift`, which needs the local speech model for your locale), Python 3 with Pillow. Narration can be any
recording you are authorized to use, or the optional local Kokoro voice described in [local voice synthesis](VOICE.md).

The kit finds tools on `PATH`. Override them with the same variables as the runtime profile: `YSC_NODE`,
`YSC_PLAYWRIGHT` (path to `playwright/index.mjs`, default `node_modules/playwright/index.mjs`), `YSC_CHROME`,
`YSC_FFMPEG`, `YSC_FFPROBE` and `YSC_SWIFT`. Nothing is installed or downloaded, and page capture blocks network requests.

## Try the Example

The [example](../examples/vertical-kit/README.md) ships its word timings, so you can build and render it without a
voice. Copy it into the ignored `workspaces/` folder first so the outputs stay out of source control:

```bash
cp -R examples/vertical-kit workspaces/vertical-demo
python3 tools/vertical_kit/vkit.py build workspaces/vertical-demo/quiet-shorts
python3 tools/vertical_kit/vkit.py stills workspaces/vertical-demo/quiet-shorts
python3 tools/vertical_kit/vkit.py render workspaces/vertical-demo/quiet-shorts --silent
```

## Make a Short

```bash
python3 tools/vertical_kit/vkit.py new workspaces/shorts-batch my-short
# write my-short/script/script.txt: paragraphs separated by a blank line
python3 tools/vertical_kit/vkit.py narrate workspaces/shorts-batch/my-short --voice af_heart --models <dir>
python3 tools/vertical_kit/vkit.py transcribe workspaces/shorts-batch/my-short
python3 tools/vertical_kit/vkit.py align workspaces/shorts-batch/my-short
# write web/build.py and web/my-short.css, then iterate:
python3 tools/vertical_kit/vkit.py build workspaces/shorts-batch/my-short
python3 tools/vertical_kit/vkit.py stills workspaces/shorts-batch/my-short
python3 tools/vertical_kit/vkit.py cover workspaces/shorts-batch/my-short --art <image> "LINE ONE" "LINE TWO" "subtitle" --tag NEWS
python3 tools/vertical_kit/vkit.py render workspaces/shorts-batch/my-short
python3 tools/vertical_kit/vkit.py finish workspaces/shorts-batch/my-short
python3 tools/vertical_kit/vkit.py deliver workspaces/shorts-batch/my-short <folder>
```

Keep batches under `workspaces/` (ignored by Git). Steps never overwrite a take or a transcript; `narrate` writes a new
take name (`--take take02`) and `render` uses the newest take unless `--take` is given. With your own recording, place
`narration.wav` and an `audio.json` (`duration` plus one `sections` entry per paragraph with its `start`) in
`takes/take01/` and continue at `transcribe`.

| Step | What to check |
| --- | --- |
| `narrate` | Listen to the whole take. Spoken forms come from `script/say.json` (`phrases`, `say`); the script keeps the written forms for captions. |
| `align` | Printed `block` lines show where the recogniser heard something else. Add recurring mishearings to `say.json` under `asr`. |
| `stills` | One still per caption cue: no empty frames, nothing cut off, text inside the camera, readable on a phone. |
| `finish` | Watch the MP4 with sound and read `sheet.jpg`. Captions above the overlay, cover readable, loudness line near -14 LUFS. |

## Brand

A batch's `brand.json` holds everything brand-specific; every key is optional and paths are relative to the batch.
Start from `tools/vertical_kit/brand.example.json`:

| Key | Use |
| --- | --- |
| `name` | Wordmark text when there is no logo image |
| `logo`, `logo_white` | Logo for light scenes and for the dark cover |
| `font`, `font_family`, `cover_font` | A licensed font file; the default is Geist from the pinned font catalog |
| `theme` | A CSS file that overrides the theme variables |
| `cta`, `url`, `tag` | Closing call to action, the URL under it, and the tag shown with `news=True` or `--tag` |
| `cover` | Cover colours: `bg`, `glow`, `accent`, `ink` |

A theme only needs the variables at the top of `tools/vertical_kit/vbase.css`. Every gradient, shadow, glow and
chart colour is derived from them:

```css
:root{--brand:#3b1f6e;--brand-2:#5a3aa8;--brand-deep:#1d0f3a;--soft:#8c84c9;--soft-2:#bdb7e6;--soft-3:#6a62a8;
 --accent:#7fd1ae;--accent-2:#b5ecd4;--accent-3:#4fae86;--violet:#6a4fd0;--glow-a:#8a5cff;--glow-b:#4cc3ff}
```

Only use logos, fonts and images you are licensed to use, and keep them in the private batch, not in source control.

## Scene Helpers

`web/build.py` imports `tools/vertical_kit/common.py` (the `build` step sets `VKIT_HOME`). Times are seconds from
`intake/timing.json`: `S.c(i)` is when caption cue `i` starts, `S.w(k)` when word `k` is spoken.

| Helper | Purpose |
| --- | --- |
| `S.scene(first_cue, cls, html)` | A scene from cue `first_cue` until the next scene; the camera is 880x1180 px |
| `S.kin(a, b, grad=)` | Heading from narration words `a..b`, each word rising as it is spoken |
| `S.close(cue)` | Closing scene with the logo or wordmark and the call to action |
| `S.write(css, title, news=, square=)` | Writes `web/stage.html`; `square=True` makes a 1080x1080 video |
| `at(t, fx, dur)` | Entrance at `t`: `rise`, `word`, `pop`, `spring`, `blur`, `slide-l`, `slide-r`, `mask`, `zoom`, `draw`, `grow`, `growy`, `type`, `flip`, `fade` |
| `on(t0, t1)`, `count(t, value, ...)` | Highlight window; a number that counts to `value` |
| `card`, `bars`, `line_chart`, `donut`, `connector`, `photo` | Glass cards, spring bar charts, a line with a riding head, a filling ring, paths with flowing tokens, a framed image with a slow drift |
| `icon(name)` | One of 112 Lucide icons from `icons.json` |

Two rules keep scenes readable. Every card in a scene enters within the first second (`common.skeleton` cascades
them), so there is never an empty frame. Straight SVG paths have a zero-size bounding box, so gradient strokes vanish
on them; use the solid `.k-conn` class for straight connectors.

## Limits

The kit is not covered by `lock.json`, brand approval or the production QA gates, and CI does not render media. Word
timing comes from automatic transcription; it does not prove word-perfect synchronization. The kit never uploads or
publishes anything.
