# Visual Library Qualification

Date: 2026-09-15. Scope: asset preparation, not a new media backend or video scene
contract. All datasets are illustrative and all production runs remain private.

## Observed Checks

- Fresh clone baseline: 53 unit tests passed using the existing local runtime.
- Expanded suite: 91 tests passed, including the transferred library validation
  tests and new discovery, widget, private-output and export boundary tests.
- Final browser run: eleven visuals at 1440x1200, 390x844 and 375x667, for 33
  viewport/visual combinations. Deterministic reveal, repeated seek, selection and
  play/pause passed; no attempted page HTTP(S) requests or browser errors.
- Eleven SVGs and eleven 880x810 PNG exports produced, with sidecars and hashes.
  Pixel checks require visible content; widgets additionally require bright text
  outside the icon zone. Manual review covered the flow and gallery exports.
- Selected vendor files passed manifest hash validation and source-release audit.
- The original video engine, v1 template, CLI and implementation lock are unchanged.
  No fresh MP4/audio qualification was claimed for this asset-only pass.

During review, a DOM-screenshot raster of a flow SVG omitted text/panels while its
SVG remained intact. The export path now decodes the complete SVG and rasterizes
it through a browser canvas, with pixel checks. Do not reuse the superseded PNGs.

The pre-push archive check also caught the generic `dist` exclusion omitting the
verified ECharts bundle. Only manifest-listed vendor payloads now bypass that
build-output exclusion. A regression test checks every archived vendor hash.
The corrected 149-file source archive was extracted into a separate temporary
directory: all 91 tests, documentation checks and the release audit passed there
using the existing runtime. This is not a fresh dependency-install qualification.

## Reproduce

Run the commands in [Visual Library](VISUAL-LIBRARY.md) in a new private workspace.
Both `demo.json` and `widgets.json` are needed to cover all eleven types. The QA
entry point accepts trusted local Playwright and Chrome paths explicitly, so it
does not depend on a maintainer's private runtime file or a configured brand.

```sh
python3 -B -m unittest discover -s tests
python3 -B tools/check_docs.py
python3 -B tools/release.py audit
git diff --check
```

## Limits

Existing installed dependencies were reused; clean dependency installation and
Windows/Linux qualification remain pending. Asset studies do not approve a brand,
dataset, editorial claim, publication or marketing performance. Catalog search is
a literal filter, not AI-generated ranking. Private QA reports and raw exports are
excluded from public source; the documented neutral flow PNG is intentionally
included with its image provenance record.

Next: qualify a production scene adapter, then the optional encoder and first-run
experience. Marketing copy/YouTube research remains a separate deferred module.
