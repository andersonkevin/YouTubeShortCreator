# Reusable Editorial Shorts

[Documentation](README.md) | [Executable examples](../examples/editorial-shorts/README.md) | [Branding](BRANDING.md)

An opt-in legacy v2 workflow adds explanatory diagrams, attributable local news
images and measured caption highlighting. It does not replace the v3 landscape
editorial designs, photographic cinema, storage guards or existing v1 brand.

## Choose a Brand

Select `light-editorial` at the normal `init` palette prompt. This creates public
brand schema 2 with `theme: light-editorial` and four six-digit colors:
`background`, `accent`, `secondary`, `ink`. Suggested colors are white, dark teal,
dark rose and near-black, respectively. Text/background needs 7:1 contrast;
both accents need 4.5:1 against the background, and the primary highlight needs
4.5:1 with white. The checks measure contrast, not accessibility certification.

Review the generated preview and approve it normally. The generated wordmark uses
the ink color; supplied logos retain their own colors and must suit the chosen
background. Covers use the approved light type zone rather than recoloring a logo.
The preview is a brand swatch, not proof that every episode text fits.

Light editorial supports only legacy `shorts` / episode v2, three or four
`visual-library` scenes using `editorial` or `news-media` records, up to 180 seconds.
It rejects v1 layouts, v3 formats and other chart types instead of silently applying
a partially qualified theme. Existing brand schema 1 remains dark and unchanged;
it may also use the new v2 records with the existing phrase-caption behavior.
Private experimental brand versions are not a compatible public schema.

## Author a Closed Storyboard

`new --format shorts --storyboard intake/storyboard.json` accepts a workspace-relative
legacy storyboard with exactly `version: 1`, `visuals`, `scenes`, and optional
`editorial`. `--batch` and `--layouts` cannot be combined with a storyboard.
The scene count must equal the approved brand default. Records retain the existing
v2 envelope, one unique record per visual scene, caption-anchored `first_cue`,
bounded text and fixed reveal/motion settings. See the complete JSON examples.
Draft publishing metadata still requires editorial work before rendering.

### Editorial Diagrams

Each `kind: editorial` record contains `id`, `title` (54 characters), `insight`
(110), a pinned `icon`, `source`, and `data`. Source declares `illustrative` or
`measured`, `label` (52), `reference` (180), and ISO `as_of` date. No source content
is executed or treated as an instruction.

Data contains exactly `variant`, `labels` (2-4, at most 27 characters each),
matching `details` (58), `values`, `unit` (32), and positive `maximum` up to 1e9.
Variants are `branch`, `flow`, `orbit`, `bars`, `curve`, `terrain`, `matrix`,
`trace`, `rings`, `worlds`, `clock`, `axes`. Numeric bars/curve/clock/axes require
one finite value per label within the explicit zero-based maximum. Other variants
require empty values; decorative movement is not a measurement. Clock/terrain
need two entries and worlds needs three. There is no term inference or invented data.

### News Media

`kind: news-media` offers three actual layouts: `image`, `person`, `image-metric`.
The last enlarges supplied headline text; it does not calculate or manufacture a
statistic. Source declares `kind: reported`, `label`, HTTPS `reference`, ISO
`as_of`. The data fields are `variant`, `asset`, `fit` (`contain` or `cover`),
`label`, `headline`, `detail`, and up to three text `items`.

The asset requires all of: relative local `path`, `sha256`, `source_url`,
`source_page`, `asset_type`, `story`, matching record `scene`, `retrieved_at`,
`alt`, `credit`, `rights_status`. Supported types: photograph, product-render,
screenshot, diagram, logo. Its PNG/JPEG must decode, be at most 30 MB, at least
450 px on its short side and 800 px on its long side, at most 8000 px per side
and 32 million pixels. Absolute paths, traversal, backslashes and symlinks are
rejected. Copies use new files and verified hashes. URLs are metadata only:
there is no fetching, browser scraping, credentials or network fallback.

The episode also declares `editorial` with `format: news`, `story`, ISO
`verified_at`, and 1-12 unique HTTPS `sources`. Each record reference and asset
source page must be registered, with a matching story. Educational classification
cannot contain news-media records. These checks establish association and integrity,
not truth, independent verification or copyright permission.

At authoring, local media is resolved relative to the storyboard, verified and
copied into the new episode. At build/render it is checked again and copied into
the new run; `news-sources.json` retains provenance and an explicit rights-review
requirement. Keep essential qualifications visible in the record/scene copy.
Do not interpret a filled `rights_status` string as an automated license grant.

## Captions and Geometry

Light brands highlight each measured transcript segment only during its actual
start/end interval. A multiword ASR segment stays one segment; no timings are
fabricated within it. Pauses clear the highlight, cue gaps clear the text, and
backward seeking resets the same state. The exact joined transcript segments must
match the approved cue including punctuation/case; mismatch blocks production
instead of rewriting captions. Existing caption validation still runs first.
Capture uses Chrome software rasterization for these opt-in SVG scenes; the
strict pixel-equality checks stay enabled, including reverse seeks.

The legacy film, logo, heading, note and caption safe zones remain fixed. Diagrams
and images fit the central visual slot; source labels, insight and notes remain
visible rather than hiding qualifications to make a layout fit. Long or unsuitable
text can fail browser geometry checks even when it meets character bounds. Shorten
and review the copy instead of disabling checks. HTML preview remains silent.
The validator also requires every staged diagram group and news item to finish
its reveal before scene exit; it does not silently drop late content.

## Upgrade and Review

The implementation lock changes. Use a new workspace and its normal brand/runtime
approval; do not rewrite old receipts. The [port review](REUSABLE-PORT-REVIEW.md)
explains retained and rejected adaptations. Every run remains `review_required`.
Listening, editorial accuracy, rights and publication decisions remain human gates.
No third-party brand assets, news photos, private recordings or models are shipped.
