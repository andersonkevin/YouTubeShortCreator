# Editorial explainer designs

The `editorial` v3 family adds three deliberately different graphic systems:
`dossier` uses documents and evidence marks; `circuit` uses connected operations
and decision routes; `atlas` uses a light secondary-color surface and device/data
illustrations. Each supports `hero`, `mechanism`, `comparison`, `process`, and
`close` layouts. This replaces oversized empty cards with substantial original
vector diagrams. It is opt-in; existing episode records retain their renderer.

This edition targets **landscape 1920x1080 only**. Selecting this family in another
format fails validation instead of scaling its text down. The existing four-format
compositions and ten-minute duration contract are unaffected.

## Record

An editorial scene uses the usual `kind`, `name`, `first_cue`, `cues`, `transition`
and `content` fields. Its kind is `editorial`; exactly two increasing caption cues
anchor the initial diagram and the explanatory action. Content fields are:

| Field | Contract |
| --- | --- |
| `design` | `dossier`, `circuit`, `atlas` |
| `layout` | `hero`, `mechanism`, `comparison`, `process`, `close` |
| `kicker` | One line, at most 36 characters |
| `headline` | Exactly two lines supplied as two strings, each at most 21 characters |
| `deck` | One line, at most 62 characters |
| `labels` | Exactly three strings, each at most 20 characters |
| `details` | Exactly three strings, each at most 39 characters |

These are maximum input bounds, not a guarantee that every string fits every
layout. Browser QA rejects overflow and label collisions. Use short editorial
headlines. The graphics are conceptual; labels must not imply numerical evidence
or actual captured output. No arbitrary SVG, HTML, colors, code or URLs are accepted.

All artwork uses the existing approved palette and font files. The landscape film
uses a smaller 230x48 logo and a 10-pixel progress indicator when editorial scenes
are present. This deliberate template change requires a newly bound workspace;
old approvals and outputs must not be rewritten. Human design approval remains
separate from automated technical qualification.

Use `python3 ysc.py compositions` to discover the family, then the normal
`new --format landscape --storyboard ...` and `render` commands. The same caption,
path/hash, browser, reverse-seek, media, audio and encoded-frame checks still run.
The extra browser checks enforce diagram presence, approved font roles, a 24-pixel
minimum source type size, no executable/foreign graphics and no label collisions.

The SVG drawings are original project code. Animation uses the existing absolute
caption clock and previously integrated HyperFrames seam mechanisms. There are no
new dependencies, downloaded artwork, network calls or installation requirements.
The local waveform and native speech markers belong to private authoring inputs,
not the public renderer.

Validation for each source revision is recorded in the delivery receipt; a unit
pass alone does not establish visual or editorial approval. Portrait redesigns,
light backgrounds outside the drawing surface, arbitrary layouts and an editor
UI are not part of this change.
