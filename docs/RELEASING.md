# GitHub Handoff and Releases

[Docs index](README.md) · [Licensing](LICENSING.md) · [Security](../SECURITY.md)

## Scope of This Guide

The upstream repository is public at
[andersonkevin/YouTubeShortCreator](https://github.com/andersonkevin/YouTubeShortCreator).
Repository visibility and the default `main` branch were verified through GitHub
on 2026-09-15. This does not mean the current development tree is published or
release-approved. Check the actual remote commit and local changes at each handoff.

The application does not configure GitHub accounts, remotes, hosted documentation,
CI or publishing automation. It can prepare a source archive without signing in.
Creating a separate repository or fork remains an explicit operator action; an
existing upstream checkout does not need another repository to publish an update.

Suggested repository name: `YouTubeShortCreator`.
Suggested description: `Local-first, brand-driven Shorts production with timed captions and native media QA.`
Suggested topics: `youtube-shorts`, `video-production`, `local-first`, `python`,
`playwright`, `avfoundation`. These are categorization suggestions, not SEO metrics.

## 1. Check the Source

```bash
git status --short
git diff --check
python3 -B -m unittest discover -s tests -v
python3 -B tools/check_docs.py
python3 -B tools/release.py audit
```

`git diff --check` does not cover unstaged/untracked new-file content in the same way
as a reviewed patch; do not treat an empty result in an initial repository as a full
audit. Inspect the proposed public file list and documentation images explicitly.

When the media implementation changes, also qualify a fresh native smoke render
and a real narration path. Documentation-only changes do not automatically require
a new media export if the implementation lock remains identical.

## 2. Review Rights and Public Content

Use the [licensing checklist](LICENSING.md). Confirm the MIT attribution is suitable
and the publisher has authority to release the code. Remove no required notices.
Do not upload recordings, `.env` files, private runtime paths, HTML font assets or
customer output folders. Custom workspace folders outside the documented ignored
names need separate attention.

The release audit checks allowed locations/extensions, selected sensitive-text
patterns, size and symlinks. It is not a full secret scanner, image-content scanner,
license validator or Git-history audit. Known private folders are excluded, not
certified safe. Manually review the actual files you will share.

## 3. Create a New Source Archive

Choose a filename that does not already exist:

```bash
python3 -B tools/release.py zip ../YouTubeShortCreator-v0.1.0-source.zip --approve-write
```

The ZIP contains one `YouTubeShortCreator/` root directory. It excludes `.git`,
private workspaces, dependencies, virtual environments and caches. It contains the
public documentation images, not generated production media. Existing archives are
not overwritten; preserve an old release and choose a new filename for a revision.

Open the archive and inspect its contents before upload. In particular, confirm
there are no user fonts, audio/video files, account credentials or machine-specific
paths. Compare source checksums when moving the archive between machines.

## 4. Publish Through Your Normal GitHub Workflow

### Existing Repository

Inspect `git remote -v`, the current branch and `git status --short`. Confirm the
intended remote with the operator before writing; do not change credentials,
create another remote or recreate the repository merely to deliver an update.
Compare the remote branch's actual commit with the candidate being reviewed.
Equal local HEAD and remote HEAD do not prove a clean tree: uncommitted and
untracked development files are not present in either commit.

Complete the applicable [pipeline gates](PIPELINE-ROADMAP.md), review the exact
public diff and obtain authorization for a selective commit and normal push.
Do not stage the whole workspace, amend unrelated commits or force-push. After
the push, read the remote commit again and confirm its exact SHA. Record any
remaining local changes instead of describing the whole tree as delivered.

### New Repository or Fork

Create the repository using your GitHub account and preferred Git client. Choose
visibility deliberately, review/stage only intended public files, make the first
commit, then connect and push through your normal authenticated workflow. If importing
this existing local repository, avoid adding a conflicting starter README/license
remotely. The upstream link identifies this project; it is not a runtime setting
or authorization to push to a particular account. Use the operator's intended
destination and authentication, without putting credentials into files.

Before making it public, set an appropriate private security-reporting channel and
review the MIT/license display. Do not put an invented contact address into the repo.
After upload, verify relative links, the image gallery, Mermaid rendering and the
license view in GitHub itself; local rendering is only an approximation.

## Current Delivery Boundary

On 2026-09-15 the observed upstream `main` commit and local HEAD were both
`6ffd3cb9aab6566e21d729ef7f8b963acd8f3f60`. The local tree still contained uncommitted
pipeline, tests and documentation changes. That is the published baseline, not
evidence that B00-B09 or the marketing batches are complete. Reverify before a
release; this dated observation does not authorize a commit or push.

Private security reporting has not been verified by this handoff check. Follow
[Security](../SECURITY.md) and obtain a confirmed private route before advertising
one. The public repository URL and permission to push do not establish that route.

## 5. A Useful Release Note

Include version, tested platform/toolchain, changed behavior, checks performed and
known limitations. Link the qualification record and distinguish new measurements
from evidence retained from the initial release. Avoid claims such as universally
deterministic encoding, automatic legal clearance or Windows support unless qualified.

Recommended initial commit: `feat: add brand-first local Shorts production workflow`.
Recommended documentation revision: `docs: prepare professional public documentation and template gallery`.

Keep version tags and published releases an explicit maintainer decision. This guide
does not create a tag, commit, remote, GitHub repository or release on its own.
