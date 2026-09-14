# Third-Party Notices

[Project license](LICENSE) · [Licensing guide](docs/LICENSING.md) · [Image provenance](docs/images/README.md)

## Scope

The MIT license in this repository covers project-authored work. It does not replace
dependency licenses or grant rights to platform tools, fonts, voices, artwork or
trademarks. This is a source-only distribution: dependency binaries, browsers,
frameworks, speech models and user media are not bundled.

## Direct Dependency Inventory

Versions come from the project's manifests and the locally inspected qualification
environment, checked on 2026-09-14. This table is not a complete transitive SBOM.

| Dependency | Declared version | License information | Source |
| --- | --- | --- | --- |
| Pillow | 12.2.0 | MIT-CMU | [Versioned upstream license](https://github.com/python-pillow/Pillow/blob/12.2.0/LICENSE) |
| NumPy | 2.4.6 | Core BSD-3-Clause; installed distribution carries additional component licenses | [Versioned core license](https://github.com/numpy/numpy/blob/v2.4.6/LICENSE.txt) |
| Playwright | 1.62.1 | Apache-2.0 | [Upstream license](https://github.com/microsoft/playwright/blob/main/LICENSE) |

Pillow's installed metadata identifies `MIT-CMU`. NumPy's inspected 2.4.6 metadata
declares `BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0` and lists component
license files. Do not reduce a redistributed NumPy binary package's obligations to
its core license alone. Playwright also depends on separately distributed packages;
retain the licenses and notices from the actual installation when redistributing it.

No third-party license texts have been relabeled as the project's MIT license.
Upstream links are provided for review; the notices shipped with the precise
distribution being used remain important, especially for platform-specific wheels.

## Separately Installed Runtime

Python, Node.js, Google Chrome, Swift, AVFoundation, Speech and local speech models
are supplied by their respective distributions/platforms. Their licensing and update
behavior are not controlled by this project's license. They are not part of the
source ZIP. This document does not certify redistribution of a self-contained app
that bundles those components.

## Fonts and Imported Content

No TTF/OTF/TTC font files, voice recordings, customer logos, production artwork,
credentials or model weights are shipped in the public tree. Onboarding copies
operator-selected fonts into private workspace assets and loads them locally for
capture. Installed-font suggestions are not permission to embed or redistribute them.

Imported media retains its own rights. A generated video or cover is not an
automatic license for the source material. Sharing a run's HTML/assets folder may
share font software and private content; treat that as a separate rights/privacy review.

## Documentation Images

The gallery consists of project-rendered examples using the illustrative Signal Lab
name. The [image manifest](docs/images/manifest.json) records origin and integrity.
These are raster documentation samples, not bundled fonts or customer production
assets. They make no claim that a channel name or mark is available for registration.

## Contributions and Future Packaging

Contributors must have permission to contribute their work and preserve necessary
notices. If a future release adds vendored code, downloadable assets, an executable
bundle or generated third-party material, update this inventory and review the actual
distribution before publishing. A passing release audit is not legal clearance.
