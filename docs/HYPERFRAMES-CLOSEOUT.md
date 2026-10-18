# HyperFrames integration closeout

**Historical record.** Counts, hashes, candidate status and pending actions below
belong to the dated scope of this document. They are retained evidence, not the
current operating guide or a new approval. Use [Current Generator State](CURRENT-STATE.md)
for supported behavior, publication status and remaining acceptance boundaries.

Development scope: reusable visual production in the existing ShortCreator engine,
four aspect ratios, and episodes up to ten minutes. No production deployment,
commit, push, automatic publication, editor replacement, or external service.

Resource-integration snapshot (2026-10-17): the reusable resource integration is complete with
explicit exclusions. All seven reopened typography resources and 16 variable
font files are integrated. The final three resources provide glyph write-on,
fine/coarse stitched lettering and controlled text inversion. Emoji remains
excluded by the operator rule; six font files require separate commercial rights.
This is the generic YouTubeShortCreator project. Cognativ onboarding is outside
this goal. See [variable typography](VARIABLE-TYPOGRAPHY.md) and
[drawn lettering](LETTERING.md).

## Acceptance snapshot (2026-10-17)

| Requirement | Current evidence |
| --- | --- |
| Source inventory | 9,375 retained files; 455 definitions and 418 unique media have explicit dispositions. |
| Reusable mechanics | 454 definitions covered by bounded adaptations: 366 qualified integrations, 74 earlier mechanic adaptations, 14 shader correspondences. These are source references, not 454 independent templates. No unresolved native candidates. |
| Engine discovery | 35 composition families through `ysc.py compositions`; normal v3 author/build/render commands. |
| Fonts | 80 pinned files: 64 static and 16 variable, with license notices and real binary axis validation. |
| Final regression | 629 Python cases: 622 passed, seven optional archive checks skipped in isolation. 514 Node cases: 513 passed, one optional archive check skipped. All skipped checks passed against the retained archive (32 Python and five Node checks). |
| Final resource QA | Combined five-scene lettering fixture passes all four profile builds, layout, motion, captions and exact reverse seeks; landscape MP4 passes media, 1,471 timestamps, decoded-frame and audio gates. No render requests or browser errors. |
| Scope continuity | Four aspect ratios and the 600-second contract retained. Previous four-format cumulative exports, variable-font matrix and ten-minute soak remain separately dated evidence; this final fixture is 49.0333 seconds. |

Implementation lock accepted for this historical resource qualification:
`f025c2ead206b8a23be89584ff904723dbebd7d5d6ec36cd689a582ea07360b0`.
Private receipts are under `workspaces/resource-completion-2026-10-17/`:
`qualification.json`, `lettering-qualification.json`, full suite logs and the
native run directories. The final acceptance changes no existing channel brand
approval. New internal fixture identities are not human publication approval.

The source-stage, editorial and cinema adapters remain available. No universal
upstream option parity, media rights clearance, independent-operator acceptance,
or publication approval is implied by this resource closeout. The retained sample
media are explicitly inventoried; they are not an automatically cleared stock library.

The 2026-10-16 DoD and evidence below are the historical accepted baseline with
eight exclusions. They are not the current remaining-resource count. Human
editorial, independent-operator and publication gates remain separate.

## Historical definition of done (2026-10-16)

| Requirement | Evidence and state |
| --- | --- |
| Entire retained source inventoried | PASS: 9,375 source files rehashed, 455 catalog definitions and 418 unique media binaries have dispositions. This is not a claim of manual review of every source line. |
| Reusable engine integration | PASS: normal v3 schema, authoring, compiler, renderer and QA; 31 composition families. The catalog covers 447 source definitions through bounded adaptations or existing shader implementations; eight incompatible typography/caption definitions are explicitly excluded. |
| Formats and duration | Implemented: 1920x1080, 1080x1920, 1080x1080 and 1080x1350; 30 fps; 1–120 scenes and up to 600 seconds. Current-engine exports passed in all four formats below. |
| Fonts | PASS: 64 exact static font files loaded and rasterized offline; OFL-1.1/Apache-2.0 notices and hashes retained. Sixteen variable faces and six separately licensed faces are excluded. Existing brand fonts are unchanged. |
| Brand and safety | Approved internal Signal Lab files retained exactly. Closed schemas, approved-font hashes, local paths, CSP, no-overwrite rules, narration checks and review-required publication state remain enforced. |
| Combined regression | PASS: complete unit suites and four ordinary-engine exports; 18 scenes, 39 cue events and 17 seams per video. No per-resource demonstration videos were added for this closeout. |
| Development acceptance | PASS: all four immutable run/output hashes verified; their identical 374-file implementation lock is accepted in the development root. Old brand approvals were not rewritten. |

Catalog counts overlap: they are source references, not 447 independent layouts.
The 418 media binaries include fixtures and third-party identities; each has a
recorded disposition. They are not all imported channel assets. See the
[complete inventory](HYPERFRAMES-INVENTORY.md) and
[machine-readable census](hyperframes-asset-census.json).

## What changed

The engine exposes reusable typography, backgrounds, headline transitions, screen
zooms, charts, maps, diagrams, code scenes, interface choreography, media layouts,
brand lockups and bounded spatial compositions through `ysc.py compositions`.
The final source-stage integration adds original Glass Shard geometry/materials
and the Frost camera/material/assembly sequence, using explicit supplied text and
approved fonts instead of upstream identities.

Source stages use packaged local scripts inside one owned renderer document.
They inherit the original CSP. Their loaders can decode only the exact compiled
payloads already held in memory. Frost uses four-sample spatial antialiasing in
place of history-dependent temporal antialiasing, preserving exact reverse seeks.
Neither source stage downloads resources, installs fonts, nor accepts arbitrary
HTML, URLs, shaders or renderer configuration from an episode.

## Files and use

- `production_visuals.py`, `ysc.py`, `workflow.py`, `media_contract.py`: validated
  v3 authoring, format selection, compilation and ordinary rendering.
- `templates/v1/assets/production-*.js` and `.css`: reusable composition families;
  `production-source-*`, `production-shard-runtime.js` and `production-frost-*`
  contain the final retained-source bridge and payloads.
- `tools/vendor_source_stages.py`: pinned, reproducible source transformations.
- `tools/font_library/`: offline font catalog, binaries and license notices.
- `production-qa.mjs`, `capture.mjs`, `tests/`: browser, frame, contract and
  source-provenance regression checks.
- Inventory, contracts, CLI and licensing documentation record available choices,
  deliberate exclusions and source-specific adaptations.

```sh
python3 ysc.py compositions
python3 ysc.py fonts
python3 ysc.py --workspace PATH new EPISODE --help
python3 ysc.py --workspace PATH render episodes/EPISODE/episode.json --run-id RUN --approve-write
```

Use a private workspace whose brand approval matches the accepted engine lock.
Changing an existing production approval is a separate operator action. Font
catalog choices are for explicit brand onboarding and still require preview and
approval. The [data contracts](DATA-CONTRACTS.md) specify bounded content fields.

## Validation record

All four ordinary `ysc.py render` deliveries passed browser geometry, timed captions,
motion, exact reverse-seek pixels, media dimensions/duration, all 3,855 frame timestamps,
196 decoded frame comparisons and audio alignment. No render network requests or
browser errors were observed. Each MP4 is 128.5 seconds at 30 fps.

| Profile | Encoded dimensions | Native QA |
| --- | --- | --- |
| 16:9 | 1920x1080 | PASS |
| 9:16 | 1080x1920 | PASS |
| 1:1 | 1080x1080 | PASS |
| 4:5 | 1080x1350 | PASS |

The exact locked implementation SHA-256 is `50971b81f0d1c9eb422880dcd056b61a1aa0807018db15e12ed62b0f917500b5`.
Private immutable receipts are under
`workspaces/integration-final-2026-10-16/closeout-r1/`: `delivery-summary.json`,
`lock-acceptance.json`, the four native run directories and their per-gate reports.
The original accepted lock is retained as `root-lock-before-acceptance.json`.
The locked source provenance describes its build-time pending state; these later
native receipts establish qualification without changing that rendered source.

Validation executed:

- `python3 -B -m unittest discover -s tests -v`: 611 tests, 605 passed and six
  archive-dependent checks skipped in the isolated candidate. All six subsequently
  passed against the retained upstream archive in the development root.
- `node --test tests/*.test.mjs`: 509 tests, 508 passed and one archive-dependent
  check skipped in the candidate. Its five-test optical file subsequently passed
  in the development root, including that check.
- Final font contracts: ten passed, including one additional negative license
  test; browser font QA loaded and rasterized all 64 exact static files offline.
- Source-stage contracts: six Python and three Node checks passed. Eleven exact
  forward/reverse source-stage pixel comparisons passed before native exports.
- Full retained-source audit: 9,375 file hashes unchanged; all 455 definitions,
  418 unique media dispositions and implementation references checked.
- `python3 -B tools/check_docs.py`, `python3 -B tools/release.py audit` and
  `git diff --check`: PASS. Release audit uploads nothing.

The existing ten-minute landscape soak remains historical evidence. This current
delivery is a representative 18-scene matrix, not a fresh ten-minute test or a
render of every catalog option combination. Actual encoded frames were inspected
for composition and caption placement. This is technical review, not full listening,
editorial approval or human approval of the final videos.

## Safety and remaining operator gates

No Git staging, commit or push; no production modifications; no dependency or
system-font installation. Source-license and dependency payload downloads used
for vendoring are separate from runtime: final rendering blocks network requests.
Generated delivery files and diagnostic receipts remain private workspaces.

The selected GPU scenes require supported local Chrome/WebGPU hardware. Human
editorial review, Cognativ brand onboarding, third-party media/mark clearance and
publication approval remain operator decisions. The older independent-operator
and release milestones in the [pipeline roadmap](PIPELINE-ROADMAP.md) are not
automatically satisfied by this engineering integration.

Recommended commit message (not executed):
`feat: integrate reusable multiformat HyperFrames production assets`
