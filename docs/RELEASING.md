# GitHub Handoff and Releases

[Docs index](README.md) · [Licensing](LICENSING.md) · [Security](../SECURITY.md)

## Scope of This Guide

The repository can be prepared locally without signing into GitHub. No remote,
account integration, hosted documentation, CI pipeline or publishing automation is
configured by the application. Creating a public repository is a separate operator
action, after reviewing source and rights.

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

Create the repository using your GitHub account and preferred Git client. Choose
visibility deliberately, review/stage only intended public files, make the first
commit, then connect and push through your normal authenticated workflow. If importing
this existing local repository, avoid adding a conflicting starter README/license
remotely. No account names, remotes or credentials are hardcoded in these docs.

Before making it public, set an appropriate private security-reporting channel and
review the MIT/license display. Do not put an invented contact address into the repo.
After upload, verify relative links, the image gallery, Mermaid rendering and the
license view in GitHub itself; local rendering is only an approximation.

## 5. A Useful Release Note

Include version, tested platform/toolchain, changed behavior, checks performed and
known limitations. Link the qualification record and distinguish new measurements
from evidence retained from the initial release. Avoid claims such as universally
deterministic encoding, automatic legal clearance or Windows support unless qualified.

Recommended initial commit: `feat: add brand-first local Shorts production workflow`.
Recommended documentation revision: `docs: prepare professional public documentation and template gallery`.

Keep version tags and published releases an explicit maintainer decision. This guide
does not create a tag, commit, remote, GitHub repository or release on its own.
