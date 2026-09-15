# B03 Density and Numeric Boundaries

[B03 progress](B03-PROGRESS.md) | [Presentation](VISUAL-PRESENTATION.md)

Recorded 2026-09-15. Automated density qualification passed; subsequent human
technical approval is recorded separately in the B03 progress report. These are synthetic stress fixtures, not editorial
recommendations to put extreme ranges in one real Short.

## Findings and Corrections

The first matrix exposed numeric axis labels wrapping into overlapping lines and
large timeline labels extending beyond the chart. The second matrix isolated a
scatter corner-label collision and a high-latitude map label above the canvas.
The failing private runs remain preserved. Expected outcomes were not changed to
make those positive fixtures pass.

Corrections:

- Production numeric axes and timeline labels use scientific notation for
  magnitudes at least 10,000 or nonzero magnitudes below 0.01. Scientific labels
  use three significant digits; ordinary numeric labels use up to two decimals.
- A positive micro-duration is displayed as `1e-6`, not silently rounded to zero.
  Actual series values, interval endpoints and source records remain unchanged.
- Scatter labels have enough axis margin at the minimum corner; geography
  reserves additional top space for numbered markers near the poles.
- `chart-qa.mjs` rejects chart text outside its bounds or overlapping other text.
  Coordinates are normalized to production pixels, with at most one pixel of
  tolerance for rounding/contact. Text is not shrunk or hidden to pass the gate.

## Verified Matrix

All four roots use implementation lock
`0d86b38efe17e9494a406957bfe7ecd7dc049fc521ecedc37e91e12f98ff0e12`.
Each retains input hashes in `matrix-fixture.json`, outcome/evidence hashes in
`matrix-report.json`, and normal workflow run or failure records. Those hashes
and every successful run's recorded output hashes were rechecked at closeout.

| Private workspace | Scenes | Palette | Successful scene/viewport cases | Expected geometry rejections |
| --- | --- | --- | --- | --- |
| `b03-boundary-violet-4-03` | 4 | Violet | 96 | 2 |
| `b03-boundary-graphite-4-01` | 4 | Graphite | 96 | 2 |
| `b03-boundary-violet-3-01` | 3 | Violet | 120 | 2 |
| `b03-boundary-graphite-3-01` | 3 | Graphite | 120 | 2 |

Total: 32 successful builds, 432 scene/viewport cases and eight expected failed
builds. Three-scene matrices include additional tail groups so donut, correlation
and stacked bars are not accidentally omitted. Every chart form is represented
at both scene counts and in both palettes, using the four production viewports.

Limits exercised: six categories/two series, four donut slices, forty scatter
pairs, 6x6 percentage heatmaps, four-variable/forty-observation correlations,
six timeline stages, eight geographic markers, zero/negative permitted values,
million-scale values and tiny positive values. Negative fixtures use maximum
length crowded matrix labels and coincident map markers. Their JSON/data passes
validation first; the browser then rejects the unreadable geometry.

Readable labels and a technically valid canvas do not establish good editorial
density. Very small values can be visually negligible on a shared linear scale;
the tool does not enlarge them or invent a minimum bar length. Use a different
comparison or split the explanation when that range obscures the teaching point.

## Reproduction

Configure the existing `YSC_NODE`, `YSC_PLAYWRIGHT`, `YSC_CHROME` and optional
`YSC_SWIFT` paths. No downloads are performed. Choose a new private workspace:

```sh
python3 -B tools/chart_matrix.py --workspace workspaces/density-review --palette violet --scenes 4 --approve-write
node --test tests/chart-qa.test.mjs tests/visual-options.test.mjs
python3 -B -m unittest discover -s tests -v
```

The matrix command creates synthetic assets and test-only brand approval, validates
all episode data before capture, then runs the production CLI in isolated child
processes. It records unexpected failures without skipping the remaining cases and
returns nonzero if any case misses its expected outcome. It never publishes or
overwrites an existing workspace. A failed matrix must be retried with a new name.

Six Node tests cover geometric contacts/overlap, bounds, numeric formatting and
unchanged raw intervals. The Python suite includes boundary-data validation,
write-gate tests and all-kind coverage at three/four scenes. Browser matrices are
additional evidence, not a substitute for unit tests or native media review.
