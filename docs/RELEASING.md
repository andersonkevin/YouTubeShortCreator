# GitHub Handoff and Releases

[Docs index](README.md) · [Licensing](LICENSING.md) · [Security](../SECURITY.md)

## Scope of This Guide

The upstream repository is public at
[andersonkevin/YouTubeShortCreator](https://github.com/andersonkevin/YouTubeShortCreator).
See [current state](CURRENT-STATE.md#publication-and-qualification) for verified
source deliveries and the distinction between `main` and the immutable v0.5.0 tag.
Check the actual remote commit and local changes at each new handoff; a published
baseline does not include later uncommitted work.

The application does not configure GitHub accounts, remotes, hosted documentation
or publishing automation. A GitHub Actions workflow (`.github/workflows/tests.yml`)
runs the unit tests, documentation checks and release audit on pushes and pull
requests; it is excluded from the source archive. A source archive can be prepared
without signing in. The packager intentionally rejects unknown public-root files.
If local auxiliary data blocks an audit, check that it is not in use, preserve it
under an ignored private workspace with a checksum/restore record, and verify the
bytes after relocation. Do not weaken the allowlist or delete data to pass the audit.
Creating a separate repository or fork remains an explicit operator action; an
existing upstream checkout does not need another repository to publish an update.

Suggested repository name: `YouTubeShortCreator`.
Suggested description: `Local video generation with reusable compositions, timed captions and media QA.`
Suggested topics: `youtube-shorts`, `video-production`, `local-first`, `python`,
`playwright`, `avfoundation`. These are categorization suggestions, not SEO metrics.

## 1. Check the Source

```bash
git status --short
git diff --check
python3 -B -m unittest discover -s tests -v
node --test tests/*.test.mjs
python3 -B tools/check_docs.py
python3 -B tools/release.py audit
python3 -B -c 'import workflow; print(workflow.verify_lock())'
```

`git diff --check` does not cover unstaged/untracked new-file content in the same way
as a reviewed patch; do not treat an empty result in an initial repository as a full
audit. Inspect the proposed public file list and documentation images explicitly.

When the media implementation changes, also qualify an affected-profile smoke
render and a real narration path using its explicitly configured backend.
Documentation-only changes do not automatically require a new media export if
the implementation lock remains identical.

## 2. Review Rights and Public Content

Use the [licensing checklist](LICENSING.md). Confirm the MIT attribution is suitable
and the publisher has authority to release the code. Remove no required notices.
Do not upload private recordings, `.env` files, runtime paths, HTML run assets or
customer output folders. Public distribution permits the pinned, licensed font
catalog and exactly four manifest-verified `examples/v0.5.0/*/narration.wav`
inputs. The manifest, provenance and release audit constrain this exception;
it does not permit arbitrary WAVs, voice models or generated MP4s. Custom workspace
folders outside the documented ignored names need separate attention.

The release audit checks allowed locations/extensions, selected sensitive-text
patterns, size and symlinks. It is not a full secret scanner, image-content scanner,
license validator or Git-history audit. Known private folders are excluded, not
certified safe. Manually review the actual files you will share.

## 3. Create a New Source Archive

Choose a filename that does not already exist:

```bash
python3 -B tools/release.py zip ../YouTubeShortCreator-v0.5.0-source.zip --approve-write
```

The ZIP contains one `YouTubeShortCreator/` root directory. It excludes `.git`,
private workspaces, dependencies, virtual environments and caches. It contains the
public documentation images, not generated production media. Existing archives are
not overwritten; preserve an old release and choose a new filename for a revision.

Open the archive and inspect its contents before upload. In particular, confirm
there are no private fonts/recordings, generated videos, account credentials or
machine-specific paths. Check that every distributed font and example WAV is
manifest-listed and hash-verified. Compare source checksums when moving the archive
between machines.

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

The v0.5.0 implementation and its later complete public examples are published.
The [current-state record](CURRENT-STATE.md#publication-and-qualification) identifies
the tag, merged deliveries and verified CI. Use `main` for the post-tag examples;
do not move an existing tag to make it include a later documentation update.

Historical B05/B06 human review, the full B07 first-run walkthrough and
[B08 independent acceptance](B08-ACCEPTANCE.md) remain separately scoped gates.
Publishing source or passing CI does not close them or approve a channel's media.
The older [pipeline plan](PIPELINE-ROADMAP.md) is retained history, not a claim that
its unexecuted operator or marketing milestones were delivered in v0.5.0.

GitHub private vulnerability reporting was verified enabled through the repository
settings API on 2026-09-15. The read-only check submitted no report and changed no
settings. Follow [Security](../SECURITY.md) for the private reporting route and
recheck availability before release.

## 5. A Useful Release Note

Include version, tested platform/toolchain, changed behavior, checks performed and
known limitations. Link the qualification record and distinguish new measurements
from evidence retained from the initial release. Avoid claims such as universally
deterministic encoding, automatic legal clearance or Windows support unless qualified.

Recommended initial commit: `feat: add brand-first local Shorts production workflow`.
Recommended documentation revision: `docs: prepare professional public documentation and template gallery`.

Keep version tags and published releases an explicit maintainer decision. This guide
does not create a tag, commit, remote, GitHub repository or release on its own.
