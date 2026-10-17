# Drawn lettering

The native `lettering` composition offers four deterministic treatments:
`write-on`, `stitch-fine`, `stitch-coarse`, and `difference`.
They use the normal v3 storyboard, render command, caption clock, frame QA and
approved workspace fonts. They do not alter spoken captions.

```json
{"kind":"lettering","name":"Evidence","first_cue":0,"cues":[0,2],
 "transition":"cut-right","content":{"style":"write-on",
 "phrases":["IDEA","SOURCE"],"label":"Check the original reference"}}
```

Supply exactly two phrases, at most 12 characters each, and a single-line label
of at most 48 characters. Each phrase needs at least 3.3 seconds after its measured
caption anchor, including the existing beat delay, before the next phrase or
transition. Invalid timing and unsupported characters fail validation.

`write-on` uses the retained Caveat outlines, pen centerlines and curvature-based
speed curve. It requires the exact approved display font
`font:caveat-variable-891951df`. It accepts ASCII letters, digits and spaces.
The stitch variants retain the source alphabet, seeded irregularity, stitch
patterns, needle and thread. They accept uppercase ASCII letters, digits and spaces.
`difference` accepts ASCII letters, digits and spaces and applies inversion only
over isolated black and white fields. Arbitrary footage is not an input to this
effect; softer blend modes are not exposed.

Source transformations are pinned and reproducible with
`python3 tools/vendor_lettering.py UPSTREAM_PATH` (read-only parity check).
`--approve-write` explicitly regenerates the retained helpers. Apache-2.0 source
provenance and the OFL glyph notice are shipped in `templates/v1/assets/`.
No dependencies or runtime network calls are added.
