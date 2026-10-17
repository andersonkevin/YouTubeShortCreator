# Variable typography

[Documentation](README.md) | [Branding](BRANDING.md)

The offline font catalog includes 64 static and 16 variable files. Variable
entries expose their measured axes in `ysc.py fonts`. They preserve the original
bytes and retained OFL notices. They are explicit choices during new-brand
onboarding; existing brand files and approvals are never changed.

The v3 `variable-type` composition accepts exactly `style`, `phrases` (two
single-line strings of at most 18 characters) and `label` (48 characters).
Use two real caption cues. Available styles are `axis-weight`, `weight-wave`,
`font-flex` and `weight-shift`. They work through normal `new`, `build` and
`render` commands in all four production formats.

The display role must contain a real variable font with a weight range of at
least 100. `weight-wave` additionally requires a negative slant axis; the local
`font:recursive-sans-linear-light-variable-7623ffd5` supplies both. Static fonts
fail explicitly. No font URL, axis values or arbitrary style code may be supplied
by an episode. The compiler checks the copied font against the brand approval,
reads the real binary axes, and emits the bounded local font configuration.

These are adaptations of four HyperFrames resources. The weight option of
`variable-axis-type` and `variable-font-flex` is retained; no width option is
advertised because the retained fonts do not provide it. `weight-wave` performs
one finite character wave per cue rather than looping indefinitely.
`caption-weight-shift` becomes a scene typography treatment; it does not change
the word-timed spoken-caption rail. Source hashes and differences are recorded in
`templates/v1/assets/production-variable-provenance.json`.

Validation covers metadata/binary agreement, immutable font copies, real glyph
changes, finite axis values, repeatable numeric state, font loading, layout,
captions, forward/reverse seeks and native export. Qualification receipts belong
to the private integration workspace. Visual and listening approval are separate.

Variable display fonts are not a compatibility claim for older 3D font-outline
or source-stage adapters; those retain their own explicit font requirements.
