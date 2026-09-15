# Visual Director

[Assistant workflow](../ASSISTANT-WORKFLOW.md) | [Library commands](../VISUAL-LIBRARY.md)

This is a supervised procedure for Codex, Claude Code or another local-file-capable
assistant. It is not an installed model, autonomous worker or background agent.

## Selection Procedure

1. Inspect the approved brand, final narration and reviewed caption anchors.
2. State one teaching point for each of the three/four scenes. Preserve the hook,
   explanation and closing; do not add scenes just to display more assets.
3. Search the catalog with `tools/visuals.py catalog`, then `describe` the relevant
   IDs. Read readiness, limits and example fields before drafting data.
4. Prefer code or a process diagram for logic. Use charts only when values and
   their relationships explain the point. Use a map only for actual geography.
5. Keep measured data and illustrative examples distinct. Verify claimed sources
   with operator-authorized tools; never invent benchmarks or audience metrics.
6. Validate the proposed document, build in the private workspace and run browser
   QA. Inspect labels, contrast, source visibility and density at mobile size.
7. Present the reviewed asset and its provenance to the operator. Preserve the
   selected ID, dataset hash, source, run path and QA result in the episode brief.
8. For v1 production, select existing `layout:` entries. For opt-in v2 episodes,
   consult the [adapter contract](../VISUAL-ADAPTER-CONTRACT.md) and
   [chart/motion selection](../VISUAL-PRESENTATION.md). Select visuals by the
   explanation, then choose a bounded entrance/exit. Do not inject unsupported
   fields or edit CSS per episode; check technical qualification separately.

## Visual Density and Variety

Preserve approved spoken captions exactly: wording, cue boundaries, grouping,
timing adjustments, typography, placement and display behavior. Reducing visual
copy is not permission to shorten, hide, restyle or retime captions or narration.

- Give each scene one visual teaching point and one primary focal element.
  Prefer a short headline, concise labels and the code/diagram/chart itself over
  explanatory paragraphs. As editorial starting points, aim for a 3-7-word
  headline and 2-4-word labels, not mandatory quotas or caption limits.
- Avoid repeating the same claim in the heading, graphic, support text and scene
  note. Use the voice for explanation; visual copy identifies the relevant state,
  relationship or result. Keep code excerpts focused but technically meaningful.
- Keep units, legends and essential source/illustrative-data caveats legible.
  Put detailed provenance in the private brief, without hiding an on-screen
  qualification needed to interpret the data honestly.
- Show relationships or state changes using supported reveals, slides, fades
  and highlights. Do not display every detail simultaneously or use extra text
  to fill a longer recording. Respect existing caption anchors and timing limits.
- Vary existing layouts and visual families across scenes and episodes: code,
  flow, comparison, metric, chart or geography when relevant. Keep the approved
  brand, safe zones and caption system fixed, not an identical scene sequence.
  Inspect the last three episode briefs/index records when available; change
  the opening composition and sequence where the explanation benefits. Do not
  require old media to be restored or force irrelevant charts for novelty.
- At phone size, check that the focal element is immediately identifiable while
  captions remain visible. If visual copy competes with it, simplify the copy or
  select a less dense supported layout; do not shrink text to cram it in.

These are editorial review criteria, not newly implemented validator limits.
Keep required layout slots and validation intact; choose a suitable existing
layout rather than deleting required fields, overriding CSS or inventing options.
Technical stress fixtures deliberately test density and are not editorial models
for publishable Shorts. New compositions outside supported contracts require
separate implementation and qualification, not per-episode engine edits.

## Handoff Fields

Record the teaching point, catalog ID, readiness, caption anchor, data source,
illustrative/measured status, asset path, data sidecar, licenses, observed QA and
operator decision. Keep this private under the selected workspace's episode brief
or session note. Never imply that valid JSON equals editorial approval.
Also record the visual focal point, concise non-caption copy, chosen layout/motion
sequence, comparison with recent episodes and confirmation that this visual edit
leaves approved captions unchanged.

The future copy/YouTube optimization module is a separate concern. It may propose
hooks, titles, descriptions and keyword research with evidence, but cannot rewrite
approved narration/timings or claim popularity from the local hashtag validator.
