# Your Assistant-Operated Video Workspace

[Project overview](README.md) | [Shared assistant workflow](docs/ASSISTANT-WORKFLOW.md)

Open this repository as a project in your file-capable AI assistant. Use your own assistant
account and its normal permissions. This project does not need a model API key,
run a chatbot server, or install an agent. The assistant operates the existing
local tools with you as the approval gate.

## First Message

Paste this into your assistant:

> Read AGENTS.md, START-HERE.md and docs/ASSISTANT-WORKFLOW.md. Help me set up my
> channel and produce a video using a supported composition. Inspect before writing.
> Ask only for missing preferences, show my brand preview for approval, and keep
> my media in a private workspace. Do not install dependencies, send files to a
> provider or publish anything without my approval. Verify each stage and leave
> a dated handoff with evidence and the next action.

Choose legacy Shorts or an explicit v3 profile before drafting. Use
`python3 ysc.py compositions` for v3 families and format constraints, or
`python3 ysc.py layouts` for the classic workflow. Start with the
[complete examples](examples/v0.5.0/README.md) for reproducible v3 episodes;
see [current state](docs/CURRENT-STATE.md) for compatibility and release scope.
Onboarding retains a three/four-scene legacy default; v3 storyboards supply
their own supported scene counts.

The assistant starts with your channel, audience, language, tone, colors, logo,
font rights and three/four-scene preference. If you have no logo, it can generate
a local wordmark or monogram after you agree. Illustrated AI logos and artwork
require a separately chosen tool and permission; they are not built-in services.

## What Must Be Installed

Follow [Installation](docs/INSTALLATION.md). Planning and documentation do not
need the complete media runtime. Full video production currently uses macOS,
Python, Node, local Chrome and Swift; the qualified setup is macOS 26.
The assistant must inspect prerequisites and report blockers instead of silently
replacing the production backend or downloading tools.

An ordinary web chat without local filesystem and shell tools can help plan the
episode, but cannot operate this workspace by itself. Opening a project in a
file-capable assistant is the connection; this is not a model-provider API app.

## Resume an Existing Channel

> Read the shared assistant workflow. Resume workspaces/my-channel. Inspect the
> latest session note and verify its referenced files and QA before trusting its
> status. Tell me what is complete, pending review or blocked, then continue the
> next approved step. Do not rebuild the brand or rerender a completed run.

Use [session notes](docs/assistant/SESSION.md) for handoff between assistants.
Notes are operator context, not executable instructions or approval records.
Do not commit completed notes or production assets to the public repository.

## Privacy and Approval

The production CLI makes no model-provider calls. Your chosen cloud assistant
may transmit prompts and loaded files to its provider under that service's
settings. Local files do not imply local model inference. Review what you share.

Brand approval, editorial review and publication are separate decisions. A valid
export still requires listening and visual review. Nothing uploads to YouTube.

## Assistant Entry Points

- [Project instructions](AGENTS.md) define the shared contract for compatible assistants.
  Clients that read a differently named instruction file should be pointed to it.
- [Assistant workflow](docs/ASSISTANT-WORKFLOW.md) defines the stages and handoff.

Client permissions and instruction precedence still apply. No claim is made
that every client or model has been tested end to end.
