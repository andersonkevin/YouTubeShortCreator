# Asset Library Wave 02

[Visual library](VISUAL-LIBRARY.md) | [Asset expansion (wave 01)](ASSET-EXPANSION.md) | [Docs index](README.md)

A second design_review asset pack for the offline visual library, built beside
the first expansion without touching it. Every component here is a study: it
reuses the library's `kit.py` helpers, the pinned vendor files (Lucide 0.468.0,
ECharts 6.0.0), the gallery template and the wave 01 palette tokens (read only).
No production renderer, template, caption, validator, manifest, dependency,
top-level README or first-expansion file was changed. `production_scene_available` is
`false` for every asset; integration requires the maintainer's approval and is
not performed here.

Base commit `c0b275e07b1a399f0c75012f2bddde242f7d79dc` (the reviewed head of
the first expansion); the branch was fast-forwarded to the merged `main`,
including the integration corrections, before this work was committed.
Additions live only under `tools/visual_library/expansion/wave02/`,
`tests/test_visual_wave02.py`, this document and one index line in the
documentation map. Review builds and QA evidence
are written to the ignored `workspaces/` directory and are not published.

## Gap inventory

Wave 01 covers processes, gates, retrieval, retries, tiers, routing, contracts,
stages, stacks, annotated code, budgets, state machines, deltas and traces. The
`general` family adds subject-free forms (quotes, checklists, a headline figure,
before/after, steps, rankings, timelines, pros and cons, definitions, cards) so a
channel about any topic can use the same system. Wave 01 does not show raw evidence widgets (a terminal, a log, a payload), distribution
or uncertainty, systems mechanics beyond retries and routing, or the software
topics a programming channel returns to (events, concurrency, dependencies,
diffs, tests, versions, trust). The inventory below was ranked by how often an
AI-programming Short would need the idea and how far it sits from an existing
asset. Ideas that only differ from an existing asset by color or label were
dropped (a "checklist" table, a two-tile metric, a second flow layout).

| Family | Gap | Wave 02 asset (`wave02:<kind>`) | Status |
| --- | --- | --- | --- |
| Widgets | Shell session with exit code | terminal | implemented |
| Widgets | Timestamped log lines with levels | logs | implemented |
| Widgets | Real payload contents with value types | payload (card, raw) | implemented |
| Widgets | Yes/no/partial capability matrix | matrix | implemented |
| Widgets | File or hierarchy tree | tree | implemented |
| Widgets | Compact text table | table (grid, clean) | implemented |
| Data | Counts per bin with explicit edges | histogram | implemented |
| Data | Five-number summaries per group | boxplot | implemented |
| Data | Countable shares of a whole | waffle | implemented |
| Data | Non-increasing stage counts | funnel (centered, left) | implemented |
| Data | Percentile ladder with an SLO marker | percentiles (ladder, ladder-log) | implemented |
| Data | Before/after per category on one axis | dumbbell | implemented |
| Data | Estimates with bounds | intervals | implemented |
| Data | One source split into destinations | split-flow | implemented |
| Data | Value versus target inside declared bands | bullet | implemented |
| Systems | Bounded queue with backlog | queue | implemented |
| Systems | Load balancer with replica health | balancer | implemented |
| Systems | Circuit breaker states and meter | breaker | implemented |
| Systems | Token-bucket rate limit | token-bucket | implemented |
| Systems | Replication with quorum and lag | replication | implemented |
| AI | Message order between roles and tools | sequence | implemented |
| AI | Context window occupancy against capacity | context-window | implemented |
| AI | Confusion matrix with precision and recall | confusion | implemented |
| AI | Claim-by-claim grounding verdicts | claims | implemented |
| AI | Layered output guardrails | guardrails | implemented |
| AI | Nearest neighbors in an embedding map | embedding-map | implemented |
| AI | Prompt sections by kind | prompt-anatomy | implemented |
| AI | Orchestrator, workers and shared state | orchestration | implemented |
| Software | Publish/subscribe topology | event-bus | implemented |
| Software | Parallel lanes with a lock region | lanes | implemented |
| Software | Dependency graph in levels | dag | implemented |
| Software | Unified diff | diff | implemented |
| Software | Test pyramid with real counts | pyramid | implemented |
| Software | Release tags by semver kind | versions | implemented |
| Software | Trust boundary with guarded crossings | trust-boundary | implemented |
| AI | Memory recalled and forgotten across turns | memory-timeline | implemented |
| AI | Evaluation scorecard with threshold and delta | eval-scorecard | implemented |
| AI | Tool definition with typed parameters | tool-schema | implemented |
| Systems | Sequential latency breakdown | latency-breakdown | implemented |
| Systems | Sliding-window rate limit | sliding-window | implemented |
| Systems | Retry budget and amplification | retry-budget | implemented |
| Data | Shaded value matrix with printed numbers | heatmap | implemented |
| Data | Rank or value change between two points | slope | implemented |
| Software | Before/after record with changed fields | state-diff | implemented |
| Software | Which version part changes and why | semver-rule | implemented |
| General | One sentence with attribution | quote | implemented |
| General | Items done or not, with notes | checklist | implemented |
| General | One headline figure with context and trend | stat | implemented |
| General | The same list before and after a change | before-after | implemented |
| General | Numbered steps with one line of detail | steps | implemented |
| General | Top list with proportional bars | ranking | implemented |
| General | Dated events on a vertical line | timeline | implemented |
| General | Points for and against | pros-cons | implemented |
| General | A term, its meaning and an example | definition | implemented |
| General | Two or three idea cards with icons | cards | implemented |

## Counts

| Category | Count |
| --- | --- |
| Proposed (catalog entry, no renderer) | 0 |
| Implemented (validator, renderer, card, example, stress fixture) | 55 |
| Validated by the automated QA script (examples run) | 55 of 55 |
| Stress fixtures validated by the automated QA script | 61 of 61 |
| Approved by a human reviewer | 0 (`human_review: pending` on every card) |

Implemented by family: widgets 6, data 11, systems 8, AI 11, software 9, general
10. Batches were built and validated in order: widgets and data (10), systems and
data (10), AI and software (15), the ten catalog candidates (10), and ten
general-purpose components for any subject (10): quote, checklist, stat,
before-after, steps, ranking, timeline, pros-cons, definition and cards.

## Files

| Path | Role |
| --- | --- |
| `tools/visual_library/expansion/wave02/schema.py` | Validators for the 55 kinds, variants, states and derived values |
| `tools/visual_library/expansion/wave02/wave02.js` | Parametrized ECharts renderer (`draw[kind]`), study gallery plumbing, deterministic `renderAt` |
| `tools/visual_library/expansion/wave02/wave02.css` | Study overrides for the gallery template |
| `tools/visual_library/expansion/wave02/build.py` | CLI: `validate`, `build`, `index`, `card`, `search` |
| `tools/visual_library/expansion/wave02/qa.mjs` | Own QA script (see below); `--survey` reports every failure in one pass |
| `tools/visual_library/expansion/wave02/examples.json` | One minimal example per implemented kind (55) |
| `tools/visual_library/expansion/wave02/stress.json` | 61 stress fixtures: maximum counts, long labels, zero and extreme values, every variant and state |
| `tools/visual_library/expansion/wave02/catalog/index.json` | Compact index: 55 entries, all implemented, with id, kind, family, status, purpose, tags, variants, states |
| `tools/visual_library/expansion/wave02/catalog/cards/<kind>.json` | Detailed card per implemented kind (55): purpose, use_when, not_when, parameters, defaults, limits, variants, states, example, stress, provenance, licenses, renderer, qa, production_scene_available, human_review |
| `tests/test_visual_wave02.py` | 13 unit tests (fixtures, rejections, catalog consistency, private offline build, writer preflight, release audit, QA script boundaries) |

## Using the catalog

```bash
python3 tools/visual_library/expansion/wave02/build.py index
python3 tools/visual_library/expansion/wave02/build.py card wave02:confusion
python3 tools/visual_library/expansion/wave02/build.py search "rate limit"
python3 tools/visual_library/expansion/wave02/build.py search --family software
python3 tools/visual_library/expansion/wave02/build.py validate examples.json --example
```

`index` re-validates the index, every card and every fixture on each call, so a
stale card or a status that drifted from the schema fails instead of being
listed. `search` matches all terms against the id, purpose and tags. Component
documents follow the library envelope: `id`, `kind`, `title`, `insight`,
`source` (with `kind`, `label`, `reference`, `as_of`), `icon`, optional
`variant` and `state`, and `data`. The validator returns the component with
`family`, `derived` values (totals, shares, neighbors, overflow) and
`status: design_review`.

## Building a private study and running QA

```bash
python3 tools/visual_library/expansion/wave02/build.py build examples.json --example --workspace workspaces/<workspace> --run <run> --approve-write
node tools/visual_library/expansion/wave02/qa.mjs workspaces/<workspace> <run> <playwright/index.mjs> "<chrome binary>" --approve-write
```

The build writes `visuals/<run>/index.html` (inline ECharts, data and renderer,
`default-src 'none'` CSP), `build.json` (input, index, token, vendor manifest
and implementation hashes) and `THIRD-PARTY-NOTICES.txt`. It refuses an
existing run, a public tree, a missing approval flag or a path outside the
workspace. QA refuses to run when the implementation hashes differ from the
build and writes `qa/` with per-component SVG, JSON, study screenshots, 824x820
asset rasters per palette, gallery screenshots, a contact sheet and
`report.json`.

### Own checks (not copied from wave 01)

The first expansion's QA originally captured palette colors before switching
and divided the font size by the page scale; both were corrected in the
integration review recorded in [ASSET-EXPANSION.md](ASSET-EXPANSION.md). The
wave 02 script was written independently and carries its own checks:

- Font size is read from `getComputedStyle` in design pixels and never divided
  by the preview scale; the floor is 19 px.
- Every `fill` and `stroke` in the rendered SVG must belong to the active
  palette's token set, and the set of rendered colors must change between
  palettes for every component. The renderer contains no color literals (a unit
  test enforces it).
- Ellipsis detection, text/text collision, text occluded by a later filled
  shape, text clipped by the slot, slot size, non-empty render.
- Deterministic seek: the frame at `renderAt(4)` hashes identically before and
  after seeking to `renderAt(0.2)`, and the early frame differs.
- No `fetch`, all http(s) requests aborted and recorded, no page errors.
- Exports only under the private workspace, never overwriting.

## Observed validation results

| Run | Input | Components | Palettes | Viewports | Exports | Errors | Network | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `w-20` | examples.json | 55 | study, graphite | 1440x1200, 390x844, 375x667 | 110 | 0 | 0 | PASS |
| `w-stress-21` | stress.json | 61 | study, graphite | 1440x1200, 390x844, 375x667 | 122 | 0 | 0 | PASS |

Browser: Chrome 153.0.8010.48 via Playwright 1.62.1, Node 24.19.0. Earlier
runs (`w-01` to `w-19`, `w-stress-01` to `w-stress-20`) are the iteration
history; `w-10` holds a partial `qa/` directory from a run that stopped at the
first dag failure and is kept as is because the writer never overwrites.

Defects found by the checks and fixed during the batches include truncated log
timestamps, wrapped matrix headers, funnel labels over narrow bars, clustered
percentile points (solved with the `ladder-log` variant and validator guards),
split-flow ribbons overrunning labels, bullet label collisions, a dag caption
colliding with the provenance line, lane labels drawn over neighboring spans,
scorecard chips over the score, dense memory timelines with colliding turn
labels, slope labels pushed past the axis, and state-diff values that
truncated at 18 characters (now 16). Renders of every implemented kind and every stress fixture were also
inspected by the implementation reviewer on the contact sheets; that inspection
is not operator approval.

## Limitations

- The QA does not detect a word broken across lines by ECharts `break`
  wrapping. Two such breaks were found by inspection in the four-layer
  guardrails fixture and are prevented by validator rules (words of at most 9
  characters in layer labels and 7 in the end labels). Other wrapped labels use
  widths that hold their maximum length; a future check could compare wrapped
  line ends with word boundaries.
- `dag` edges are Bezier curves that are not routed around nodes; keep levels
  tidy. Edges have no arrowheads; the caption states the direction.
- `embedding-map` coordinates are illustrative and the neighbors are computed
  from them; the card says so and the caption is drawn in the graphic.
- `pyramid` widths are the conventional shape, not proportional to counts; the
  caption states it. `versions` spacing is even, not to scale.
- `percentiles` in the linear variant rejects points closer than 12% of the
  axis and points to `ladder-log`, which needs positive values with at least a
  1.25x ratio between neighbors.
- The `sequence` label floor width of 330 px lets a label cross a neighboring
  lifeline when adjacent columns exchange a long message.
- Study gallery only. No production scene, template slot wiring, caption, logo,
  progress or brand element exists for any asset.

## Provenance and licenses

- Fixture data is invented and every fixture carries `source.kind:
  illustrative`; the graphic draws an `ILLUSTRATIVE · <label> · <date>` line
  in the reserved 74 px provenance band. A measured source switches the line to
  `SOURCE REVIEW REQUIRED`.
- Icons: pinned Lucide 0.468.0 (ISC) from the existing vendor set, 40 names, no
  new SVGs. Charts: pinned ECharts 6.0.0 (Apache-2.0) SVG renderer. Both are
  listed in the existing vendor manifest and in the build's
  `THIRD-PARTY-NOTICES.txt`.
- Palette tokens are read from `tools/visual_library/expansion/tokens.json`
  and hashed into `build.json`; the file is not modified.
- No new libraries, downloads, fonts or logos were added.

## Shared changes proposed (not made)

None were required. Two observations for the maintainers, left as proposals:

1. `kit.labels` caps every label at 18 characters. Several wave 02 kinds
   validate longer labels through `kit.label` with an explicit maximum instead;
   a `maximum` parameter on `kit.labels` would remove that duplication.
2. The corrected wave 01 QA and the wave 02 script now implement font-size and
   palette checks twice. A shared helper under `tools/visual_library/` would
   keep one implementation of the computed-font-size and token-set checks.

## Integration checklist (not executed)

1. Pick kinds from `catalog/index.json` and read the card for each; confirm
   `not_when` does not apply to the planned scene.
2. Decide the production slot mapping: the renderer draws into 824x820 with
   the bottom 74 px reserved for provenance and centers content vertically via
   the ECharts group offset.
3. Port `draw[kind]` functions into the production renderer behind the
   library's scene contract, keeping `renderAt(seconds)` clip-reveal semantics
   and reading colors only from production tokens.
4. Run the production validators against the wave 02 example and stress
   fixtures; the wave 02 schema is a study validator, not the production one.
5. Extend the production QA with the checks listed above, then add a
   word-boundary check for wrapped text.
6. Record human review in the production catalog; `human_review` in the wave
   02 cards stays `pending`; only a reviewer records approval.
7. Only then set `production_scene_available` in the production catalog; the
   wave 02 cards keep `false`.

## Release audit

`tools/release.py audit` includes every wave 02 file (Python, JavaScript, JSON,
CSS and this document) and excludes `workspaces/`. Unit tests, the docs check
and the release audit were run before handoff; results are in the handoff
message, not asserted here.
