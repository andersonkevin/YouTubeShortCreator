# Public Example Qualification

[Reproduce the episodes](../examples/v0.5.0/README.md) · [Gallery](GALLERY.md#v050-compositions) · [Machine-readable results](public-examples-qa.json)

Four newly authored examples were imported through `tools/examples.py create`,
validated by the existing episode contract and exported with `ysc.py render` on
2026-10-18. The engine and implementation lock are unchanged from v0.5.0.
Every source input belongs to the public example bundle; no private channel
recordings, artwork, approvals or runtime profiles were copied into it.

| Example | Format | Duration | Encoded frames | Decoded frames checked | Audio windows |
| --- | --- | ---: | ---: | ---: | ---: |
| `data-story` | 1920x1080 | 16.633 s | 499 | 40 | 6 |
| `camera-story` | 1080x1920 | 11.400 s | 342 | 31 | 4 |
| `type-story` | 1080x1080 | 13.400 s | 402 | 32 | 4 |
| `screen-story` | 1080x1350 | 12.467 s | 374 | 37 | 4 |

All four final exports passed browser geometry, caption timing, loaded-asset,
motion, deterministic seeking, seam, media, decoded-frame and source/export audio
checks. Each ran at 30 fps with four browser viewports, zero browser errors and
zero page network requests. All recorded output hashes were rechecked. The six
gallery PNGs were decoded from these MP4s at the frame numbers in the
[image manifest](images/manifest.json), then visually inspected without retouching.

## Reproduction and Regression Commands

After the documented workspace setup, run the following for each example ID:

```bash
python3 tools/examples.py list
python3 tools/examples.py create "$example_id" --workspace "$example_workspace" --approve-write
python3 ysc.py --workspace "$example_workspace" validate "episodes/$example_id/episode.json"
python3 ysc.py --workspace "$example_workspace" render "episodes/$example_id/episode.json" --run-id example-01 --approve-write
```

Source checks for this change:

```bash
python3 -B -m unittest discover -s tests -p test_examples.py -v
python3 -B -m unittest discover -s tests -v
node --test tests/*.test.mjs
python3 -B tools/check_docs.py
python3 -B tools/release.py audit
python3 -B -c 'import workflow; print(workflow.verify_lock())'
git diff --check
```

The new regression tests exercise real episode creation for all four profiles,
unchanged brand hashes, recording-bound transcripts, the explicit write gate,
unapproved brands, no overwrite, missing inputs, invalid identifiers, path escapes,
symlinks, corrupted assets, CLI behavior and the narrowly scoped public-audio
allowlist. The release audit runs against the selected public source tree;
generated workspaces and machine-specific files are excluded.

## Fixture Corrections and Limits

An initial chart fixture failed text fitting with Geist body metrics. Shortening
the unit alone did not resolve it. The final documented chart setup uses the
bundled Archivo Semibold body font, which fits the unchanged value slot. The other
three examples use Geist Regular. No font minimum or overflow check was relaxed.

The initial screen fixture also exposed a seam sampling boundary caused by a
floating-point cue start. Its final caption starts retain their measured timing
with six-decimal downward serialization (less than one microsecond difference).
The final recipe passes the existing direction and velocity checks. Failed runs
remain in local evidence; the public receipt reports only the final input hashes.

The local media qualification used macOS, Chrome 155, Node 24 and FFmpeg 9.0.2.
The complete source suite is also exercised by the existing Linux CI matrix;
that is not a Windows/Linux rendering qualification. Exact input hashes are
reproducible; encoder/browser differences can change output bytes.

The recordings are synthetic speech with measured native phoneme timing. Human
listening approval remains pending, and every export remains `review_required`.
The illustrative chart is not a benchmark; the source page is fictional; the
portrait imagery is procedural artwork. These short examples do not repeat the
ten-minute endurance qualification or demonstrate every composition family.
