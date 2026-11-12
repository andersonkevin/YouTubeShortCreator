# Vertical Kit Example

[Vertical kit guide](../../docs/VERTICAL-KIT.md) · [Examples](../README.md)

`quiet-shorts` is a 23-second demo Short made with the [vertical kit](../../docs/VERTICAL-KIT.md). It explains why
quiet Shorts stay quiet in the feed: five scenes with a live waveform, a loudness scale, a measured comparison, a
three-step fix and the closing call to action.

| File | Content |
| --- | --- |
| `brand.json` | A neutral demo brand ("Example Studio", wordmark only, default theme) |
| `quiet-shorts/script/script.txt` | The narration script, written forms as they appear in captions |
| `quiet-shorts/script/say.json` | Spoken forms for the voice and known mishearings for alignment |
| `quiet-shorts/intake/timing.json` | Word timings and caption cues from a local Kokoro take (af_heart) and on-device transcription |
| `quiet-shorts/web/build.py`, `quiet-shorts.css` | The five scenes |
| `make_art.py`, `img/waveform.jpg` | Generated cover artwork; no third-party imagery |

The narration recording is not included. With the committed timings you can build, review stills and render a silent
preview. For the full flow, generate a take with `vkit.py narrate` and run `transcribe` and `align` again. The new
timings replace the committed ones, so check the word indices in `build.py` if your take is phrased differently.

```bash
cp -R examples/vertical-kit workspaces/vertical-demo
python3 tools/vertical_kit/vkit.py build workspaces/vertical-demo/quiet-shorts
python3 tools/vertical_kit/vkit.py render workspaces/vertical-demo/quiet-shorts --silent
```

The content is a synthetic tutorial. The loudness figures match the kit's own measurements: narration went from -26
to -15.4 LUFS after `finish`, with the true peak limited at -1.5 dBTP.
