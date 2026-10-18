# Reproduce the v0.5.0 Examples

[Gallery](../../docs/GALLERY.md) · [Installation](../../docs/INSTALLATION.md) · [Input manifest](manifest.json) · [Provenance](provenance.json)

Four complete English episodes ship with synthetic narration, recording-bound word
timings, captions, a storyboard, cover artwork and every required still image.
No voice model, API key, download, private workspace or hand-edited hash is needed
to reproduce them. Install the normal generator prerequisites first.

| Example ID | Format | What it demonstrates |
| --- | --- | --- |
| `data-story` | 16:9 / 1920x1080 | A question, progressively revealed bars and a conclusion; values explicitly labeled as invented |
| `camera-story` | 9:16 / 1080x1920 | Three original procedural stills, deliberate camera paths, a focus cut and foreground occlusion |
| `type-story` | 1:1 / 1080x1080 | Two matched headlines, followed by three caption-anchored text states |
| `screen-story` | 4:5 / 1080x1350 | A fictional source page, two focus regions and a review handoff |

Each folder contains `script.txt`, `narration.wav`, `transcript.json`,
`captions.json`, `storyboard.json` and `cover.png`. The portrait and screen examples
also contain their original illustrative images. These are executable authoring
inputs, not placeholder hashes or fragments to assemble yourself.

## 1. Create an Example Workspace

Run from the repository root:

```bash
example_id=data-story
example_workspace="workspaces/example-$example_id"
python3 ysc.py --workspace "$example_workspace" init
```

Use a new workspace per example. For the same design shown in the gallery, enter these values when prompted:

| Prompt | Value |
| --- | --- |
| Channel name | `Example Lab` |
| Narration language | `en-US` |
| Audience | `People learning the generator` |
| Editorial tone | `Clear and practical` |
| Scenes per Short | `3` (legacy default; the v3 storyboards supply their own scene counts) |
| Palette | `custom` |
| Background / accent / secondary | `#142232` / `#78dfc4` / `#f1c98b` |
| Existing logo | Leave blank |
| Generated logo | `wordmark` |
| Display font | `font:geist-bold` |
| Body font | `font:archivo-semibold` for `data-story`; `font:geist-regular` for the other three |
| Mono font | `font:jetbrains-mono-regular` |

The fonts are already in the licensed local catalog. The chart uses Archivo
Semibold for its body/value slots; Geist's taller metrics fail that fixed slot
check. Keep the documented font choice when reproducing this example. Review
the selected workspace's `brand/preview.png`, then approve the illustrative brand
and configure the installed runtime:

```bash
python3 ysc.py --workspace "$example_workspace" brand-approve --approve-write
python3 ysc.py --workspace "$example_workspace" configure --backend ffmpeg --approve-write
python3 ysc.py --workspace "$example_workspace" doctor
```

Use the explicit `--node`, `--playwright`, `--chrome`, `--swift`, `--ffmpeg` or
`--ffprobe` options on `configure` if the tools are not in their default locations.
Full media rendering currently requires the documented macOS runtime. The Linux
CI validates the inputs and authoring contracts; it does not qualify media rendering.

## 2. Import, Validate and Render

```bash
python3 tools/examples.py list
python3 tools/examples.py create "$example_id" --workspace "$example_workspace" --approve-write
python3 ysc.py --workspace "$example_workspace" validate "episodes/$example_id/episode.json"
python3 ysc.py --workspace "$example_workspace" render "episodes/$example_id/episode.json" --run-id example-01 --approve-write
```

The importer checks the public manifest, requires the existing brand approval,
copies only that example's inputs and calls the same `new_episode` authoring path
as `ysc.py new`. It does not configure a runtime, grant approvals or change an
existing episode. `render` includes browser, layout, frame and audio checks.

Repeat steps 1 and 2 with `example_id=camera-story`, `example_id=type-story`
or `example_id=screen-story`, using the body font shown in the table. The output format is declared in the catalog;
there is no automatic aspect-ratio override. Run one export at a time to limit
temporary disk usage. A repeated import fails without overwriting; reuse the
existing episode and choose a new render run ID, or create a new workspace.

Outputs appear under:

```text
workspaces/example-data-story/runs/data-story/example-01/video.mp4
workspaces/example-data-story/runs/data-story/example-01/thumbnail.jpg
workspaces/example-data-story/runs/data-story/example-01/captions.srt
workspaces/example-data-story/runs/data-story/example-01/run.json
```

You also receive the usual visual, media, decoded-frame and audio QA records.
The HTML preview is silent; use the MP4 to review speech and captions together.
Technical checks leave the output at `review_required`.

## Customize and Understand the Inputs

After import, inspect the complete `episode.json` inside the workspace's episode
folder. The bundled storyboard shows the closed scene records used to create it.
For a new topic, supply a new recording, its exact transcript/captions, authorized
artwork and edited storyboard through the normal `new` command. Do not reuse these
timings for different speech or change hashes to conceal changed inputs.

The example audio is newly generated speech using the existing local Kokoro
toolchain and `af_heart`; no personal recording or cloned user voice is included.
Word times come from native phoneme durations with strict one-to-one word mapping.
This is reproducible recorded input, not a promise that future synthesis produces
identical bytes or that automated timing establishes human listening approval.
The supplied images are original procedural illustrations and a fictional source
page, not photographs, customer screenshots or measured benchmark results.

Input SHA-256 hashes are exact. MP4 bytes and rasterization may vary with approved
OS/browser/encoder versions; every fresh export still runs the existing QA gates.
The recipe importer does not install packages, run synthesis or make network calls.
Only the four manifest-verified WAV files are permitted as public example audio;
private workspaces and generated MP4s remain excluded from source distribution.

## Qualification

See the [example qualification](../../docs/EXAMPLES-QA.md) for the executed commands,
render checks and public screenshot provenance. This example set does not repeat
the ten-minute qualification or claim that every composition family was rendered.
