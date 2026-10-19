# Editorial Shorts Examples

[Feature contract](../../docs/EDITORIAL-SHORTS.md) | [Original public inputs](../v0.5.0/README.md)

These two legacy v2 storyboards reuse the public `type-story` narration and its
recording-bound captions. They do not duplicate audio, download news, or import a
customer brand. The news cards are visibly labeled synthetic layout fixtures;
`example.org` is inert provenance metadata, not evidence of an actual report.
The `person` layout uses an abstract drawing, not an image of a real person.

## Setup

Create a new workspace with `python3 ysc.py --workspace workspaces/editorial-demo init`.
Choose three scenes and `light-editorial` at the palette prompt. Accept its
suggested colors or supply your own contrast-checked colors. For the qualified
example choose `font:geist-bold`, `font:geist-regular` and
`font:jetbrains-mono-regular`. Choose your own channel name and approve the
preview explicitly. Configure the installed FFmpeg runtime normally; no installation
or brand approval is performed by a storyboard.

## Import

Run these commands from the repository root. Every destination must be new.

```bash
python3 ysc.py --workspace workspaces/editorial-demo import examples/v0.5.0/type-story/narration.wav --name voice.wav --approve-write
python3 ysc.py --workspace workspaces/editorial-demo import examples/v0.5.0/type-story/transcript.json --name transcript.json --approve-write
python3 ysc.py --workspace workspaces/editorial-demo import examples/v0.5.0/type-story/captions.json --name captions.json --approve-write
python3 ysc.py --workspace workspaces/editorial-demo import examples/v0.5.0/camera-story/cover.png --name source.png --approve-write
python3 ysc.py --workspace workspaces/editorial-demo import examples/editorial-shorts/educational.json --name educational.json --approve-write
python3 ysc.py --workspace workspaces/editorial-demo import examples/editorial-shorts/news.json --name news.json --approve-write
python3 ysc.py --workspace workspaces/editorial-demo new education --audio intake/voice.wav --transcript intake/transcript.json --captions intake/captions.json --graphic intake/source.png --storyboard intake/educational.json --approve-write
python3 ysc.py --workspace workspaces/editorial-demo new source-review --audio intake/voice.wav --transcript intake/transcript.json --captions intake/captions.json --graphic intake/source.png --storyboard intake/news.json --approve-write
```

The new episodes deliberately retain draft publishing metadata. Review/edit their
thumbnail headline, label, title, description, hashtags and pinned comment;
`render` rejects remaining `DRAFT:` metadata. Do not change recording hashes,
caption text or timings just to pass checks. The example source image SHA-256 is
`ddee7961377a95f72e2f062441db2b36e0640a787061eab8e85c229fb378b968`.

## Validate and Render

```bash
python3 ysc.py --workspace workspaces/editorial-demo validate episodes/education/episode.json
python3 ysc.py --workspace workspaces/editorial-demo build episodes/education/episode.json --run-id preview-01 --approve-write
python3 ysc.py --workspace workspaces/editorial-demo render episodes/education/episode.json --run-id final-01 --approve-write
python3 ysc.py --workspace workspaces/editorial-demo validate episodes/source-review/episode.json
python3 ysc.py --workspace workspaces/editorial-demo render episodes/source-review/episode.json --run-id final-01 --approve-write
```

Rendering writes the normal MP4, cover, SRT, publishing metadata and QA receipts.
News additionally writes `news-sources.json`; its rights review remains explicit.
A successful export is not human listening, editorial acceptance or permission to
publish. Use a new run ID for a retry, preserving failed diagnostics.

The input narration, timing and artwork provenance remains in the original
[v0.5.0 manifest](../v0.5.0/manifest.json) and
[provenance record](../v0.5.0/provenance.json). No additional media license is implied.
