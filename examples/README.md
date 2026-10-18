# Examples

[First-Short walkthrough](../docs/FIRST-SHORT.md) · [Layout gallery](../docs/GALLERY.md)

## Complete v0.5.0 Episodes

Start with the [four reproducible examples](v0.5.0/README.md): animated data in
16:9, a camera sequence in 9:16, matched headlines in 1:1 and screen inspection
in 4:5. Each includes public synthetic narration, word timings, captions, all
artwork and a complete storyboard. The importer uses the normal authoring API;
the standard renderer and validation gates generate the video.

## Narration

[narration.txt](narration.txt) is a short American-English script about AI-agent
boundaries. Record it with a voice you are authorized to use, import the resulting
audio and transcribe that exact file. This legacy script does not include a recording.
It also does not claim that one voice service or delivery style is required.
The separate v0.5.0 set above does include ready-to-use synthetic recordings.

## Scene Examples

Every file under [templates/v1/scenes](../templates/v1/scenes) includes its own
`example` content/motion object and required slot names. The `new` command assembles
a three/four-scene AI-agent draft from these. The examples are illustrative and must
be adapted to your final recording; they are not automatically matched to it.

## Synthetic Test Fixture

`tools/smoke.py` creates a local synthetic tone with synthetic caption intervals to
test capture, mux and QA. It is not a demonstration of ASR accuracy, a recorded
speaker or a publishable Short. Keep its outputs in an ignored private workspace.

Public screenshots document the renderer, not a library of licensed production
artwork. Supply your own authorized thumbnail illustration for real episodes.
