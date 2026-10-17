# Licensing and Asset Rights

[Docs index](README.md) · [Full project license](../LICENSE) · [Third-party inventory](../THIRD_PARTY_NOTICES.md)

This is an operational rights checklist, not legal advice or a warranty that a
particular recording, font or channel name is cleared for use.

## Project Code

The repository contains a complete MIT license with the attribution
`Copyright (c) 2026 YouTubeShortCreator contributors`. Preserve its copyright and
permission notice when redistributing covered software. The license permits broad
reuse and disclaims warranty; the [full text](../LICENSE), not this summary, controls.
[Official MIT license reference](https://opensource.org/license/mit).

The scope is project-authored source, templates and documentation. This does not
relicense other people's software, trademarks or imported assets. Before the first
public release, the publisher should confirm authority to release all included work
under these terms and verify the attribution is appropriate. The tooling cannot
establish chain of ownership or clear trademarks.

## What Is and Is Not Distributed

| Material | In the public source package? | Treatment |
| --- | --- | --- |
| Project code, scene contracts and docs | Yes | Project MIT license |
| Illustrative rendered documentation screenshots | Yes | Documented origin; no font software or customer media included |
| Full project MIT license | Yes | Preserve the notice and terms |
| Python/Node dependency binaries | No | Installed separately; their own licenses apply |
| Chrome, Swift, Apple frameworks and speech models | No | Separate platform/runtime terms apply |
| Optional FFmpeg/ffprobe and compiled codecs | No | Operator-installed binaries retain their own build-dependent licenses |

The optional backend invokes external binaries; the source archive does not
redistribute FFmpeg, ffprobe or codecs. The tested local FFmpeg 8.1.2 build enables
GPL and version-3 components, including libx264. Do not describe that binary as
MIT merely because the project source is MIT. Runtime profiles record complete
version/build strings; inspect the actual selected binary's `-L` and `-buildconf`
outputs before redistributing any runtime bundle. No blanket patent or legal
clearance is claimed. Binary redistribution is outside this project release.
| User fonts, logos, narration and cover artwork | No | Remain private; rights depend on their source/license |
| Generated customer videos and run assets | No | Operator-controlled output, not blanket-cleared by MIT |
| Selected visual-library SVG/JS and map geometry | Yes | Pinned vendor files with original licenses, notices and provenance |
| Optional WebGPU backdrop runtime | Yes | Modified pinned Shaders bundle; MIT package notices and Apache-2.0 tsover-runtime notice retained in `production-gpu-notices.txt` |
| Optional licensed font catalog | Yes | 64 static and 16 variable font binaries, with attached OFL-1.1 or Apache-2.0 copyright/license notices and source hashes |
| Credentials and local runtime paths | No | Never appropriate for the public source package |

The source archive includes a dependency notice inventory and selected offline
visual-library vendor files, not a complete dependency bundle or a certified
software bill of materials. Platform-specific wheels
may carry additional notices for bundled components. Preserve the actual distribution's
licenses if you later package an executable or redistribute dependencies.

## Fonts Need a Specific Review

Onboarding suggests installed fonts where available; a suggestion is not a licensing
determination. The workflow copies selected font files into private assets and loads
them via `@font-face` during local rendering. Check whether that use and your intended
commercial output are permitted. Desktop installation alone is not a guarantee.

Sharing an HTML preview with its `assets/` can redistribute font binaries. It is a
different act from sharing a raster screenshot or rendered video. Do not upload these
folders merely because the video has been approved. If terms are unclear, choose
fonts whose license explicitly covers the intended use or obtain advice/permission.

## Narration, Artwork and Logos

Confirm the right to use the recording, including consent for a person's voice and
any service-specific commercial conditions. Do not infer rights from possession of
an MP3. Apply the same review to illustrations, music, code samples and customer logos.
This tool has no music mixer, asset marketplace or rights-detection integration.

Generated wordmarks and monograms are simple local graphics. They are not searches
for existing marks, originality certifications or legal clearance. The illustrative
Signal Lab name in documentation is not a recommendation to adopt that identity.

## Before Public Distribution

- Confirm ownership/permission for all source contributed to the project.
- Keep the MIT notice intact; verify attribution and any contributed notices.
- Review the dependency inventory against what is actually being distributed.
- Inspect documentation screenshots for private information and third-party marks.
- Exclude customer fonts, recordings, private workspaces, credentials and local paths.
  Only font binaries explicitly listed in the verified font catalog may be packaged.
- Run the release audit, then manually inspect the resulting archive.
- Review Git history separately; the ZIP audit does not examine committed history.

There is no formal CLA, automated license scanner or legal approval service in this
release. A successful test or export does not establish asset rights.

The spatial presets additionally vendor the locally shipped Three.js r185 modules
under MIT. Their complete notice and pinned source/bundle hashes accompany the
runtime in `templates/v1/assets/production-three-*`. HyperFrames composition code
remains covered by its separate Apache-2.0 notice. Sample fonts, logos and scene
artwork are not imported with these presets. The fixed device models are the
explicit exception documented below.

## Embedded Device Models

The development-only `device-review`, `phone-glass` and `desktop-glass` styles share the two exact GLB files
supplied with HyperFrames `vfx-iphone-device`, also duplicated in its iOS/macOS
blocks. Their source archive declares Apache-2.0 at repository level. The GLB
metadata identifies Blender's glTF exporter but supplies no item-specific creator,
copyright or license statement. Repository-level terms are the available evidence;
this is not an independent chain-of-title or trademark clearance.

Model geometry and embedded hardware textures are retained in the pinned data
modules. Source app UI, sample screen claims, icons and wallpapers are excluded;
operators supply their own authorized screen images. Apple product identities are
not licensed by a code license. Preserve the Apache notice and review model rights
before public distribution. Exact source hashes and adaptations are recorded in
`templates/v1/assets/production-device-provenance.json`. No publication has occurred.
