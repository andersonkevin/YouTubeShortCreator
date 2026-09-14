# Template Gallery

[Docs index](README.md) · [Branding](BRANDING.md) · [Data contracts](DATA-CONTRACTS.md)

These are unmodified PNG captures from the local qualification runs, not generated
marketing mockups. The illustrative Signal Lab brand demonstrates the shared visual
system. Colors, logo and fonts come from branding; episode copy and timing remain
editable. Code, values and outcomes in examples are illustrative, not benchmarks.

Screenshots sample different points in a scene, so some timed captions may be absent
during natural cue gaps. They do not demonstrate audio quality or authorize publication.
Click an image to inspect it at 1080x1920.

## Agents and Tool Boundaries

| Prompt and tools | Policy as code | Approval gate |
| :---: | :---: | :---: |
| <a href="images/prompt-tools.png"><img src="images/prompt-tools.png" alt="Prompt branching into allowed tools" width="250"></a> | <a href="images/code-policy.png"><img src="images/code-policy.png" alt="Policy code and allow, deny, review outcomes" width="250"></a> | <a href="images/approval-gate.png"><img src="images/approval-gate.png" alt="Action waiting at a human approval gate" width="250"></a> |
| [prompt-tools](../templates/v1/scenes/prompt-tools.json) | [code-policy](../templates/v1/scenes/code-policy.json) | [approval-gate](../templates/v1/scenes/approval-gate.json) |

Use these for a hook, a concrete code contract and a visible control point. Keep
tool names brief; don't shrink typography to accommodate a long API description.

## Retrieval and Evidence

| Retrieval checks | Evaluation code | Evidence comparison |
| :---: | :---: | :---: |
| <a href="images/retrieval-checks.png"><img src="images/retrieval-checks.png" alt="Retrieval flow with answer quality checks" width="250"></a> | <a href="images/code-evaluation.png"><img src="images/code-evaluation.png" alt="Evaluation code and measured criteria illustration" width="250"></a> | <a href="images/evidence-comparison.png"><img src="images/evidence-comparison.png" alt="Comparison of evidence and answer support" width="250"></a> |
| [retrieval-checks](../templates/v1/scenes/retrieval-checks.json) | [code-evaluation](../templates/v1/scenes/code-evaluation.json) | [evidence-comparison](../templates/v1/scenes/evidence-comparison.json) |

Use these when the point is checking evidence rather than merely displaying a model
response. Replace sample figures with sourced values, or label them as illustrative.

## Controlled Automation

| Plan before action | Preview the change | Roll back safely |
| :---: | :---: | :---: |
| <a href="images/automation-plan.png"><img src="images/automation-plan.png" alt="Automation plan with a preview before execution" width="250"></a> | <a href="images/automation-preview.png"><img src="images/automation-preview.png" alt="Recorded change scope and approval example" width="250"></a> | <a href="images/automation-rollback.png"><img src="images/automation-rollback.png" alt="Rollback and recovery information example" width="250"></a> |
| [automation-plan](../templates/v1/scenes/automation-plan.json) | [automation-preview](../templates/v1/scenes/automation-preview.json) | [automation-rollback](../templates/v1/scenes/automation-rollback.json) |

Use these to explain the relationship between a proposed change, approval, evidence
and recovery. A diagram of a rollback is not implementation of a rollback mechanism.

## Pipelines and Conclusions

| Code pipeline | Concise closing | Automation closing |
| :---: | :---: | :---: |
| <a href="images/code-pipeline.png"><img src="images/code-pipeline.png" alt="Code-driven pipeline with staged checks" width="250"></a> | <a href="images/closing.png"><img src="images/closing.png" alt="Short concluding statement in the fixed visual system" width="250"></a> | <a href="images/automation-close.png"><img src="images/automation-close.png" alt="Closing principles for controlled automation" width="250"></a> |
| [code-pipeline](../templates/v1/scenes/code-pipeline.json) | [closing](../templates/v1/scenes/closing.json) | [automation-close](../templates/v1/scenes/automation-close.json) |

Use one clear takeaway. Do not repeat the whole narration in the heading, diagram,
scene note and caption simultaneously.

## Reuse the Contract, Not Just the Picture

Each linked layout JSON contains a fixed `tree`, `content_keys`, `motion_keys` and
an `example`. Use these records to create content; PNGs are documentation, not
editable production templates. Re-run visual QA after any change to text, timing,
fonts or branding. See [image provenance](images/README.md) for hashes and limitations.
