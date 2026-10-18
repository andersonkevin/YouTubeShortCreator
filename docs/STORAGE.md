# Storage budgets and retention

[Documentation](README.md) · [CLI](CLI.md) · [Media backend](MEDIA-BACKENDS.md)

Builds and renders now check disk budgets before creating output, after asset
preparation, before encoding and before completion. Capture checks free space
and its PNG budget before every frame, including legacy Shorts. Every 150 frames
it also projects remaining capture needs with the existing 1.5 safety factor.
Exceeding a budget stops the operation; it never lowers quality or skips QA.

## Defaults

| Limit | Default |
| --- | --- |
| Generated runs per workspace | 10 GiB |
| Capture scratch per workspace | 32 GiB |
| Free disk reserve | 5 GiB |
| Recent build/failed-run records retained per episode | 2 |
| Minimum age before build/failed-output cleanup | 7 days |
| Abandoned owned scratch minimum age | 24 hours |

The generated-output budget is a stage-boundary guard, not an operating-system
filesystem quota. An encoder or unrelated program may write between checks.
The frame budget bounds captured PNGs; compiler, audio and encoder overhead still
need free space. Large ten-minute photographic sequences may need a deliberately
larger scratch budget. No operation promises unlimited disk capacity.

Originals in `intake/`, `episodes/` and `brand/` are never cleanup candidates.
Every completed render is protected, regardless of age, as is any run containing
`video.mp4`. Cleanup retains diagnostic JSON, logs, captions and metadata. Old run
manifests stay unchanged and no longer verify completely after their listed
generated output is pruned; separate cleanup receipts identify the removed files.
Unrecognized directories and files remain untouched.

## Inspect, protect and clean

```bash
python3 ysc.py --workspace workspaces/my-channel storage
python3 ysc.py --workspace workspaces/my-channel storage-keep episode-id/preview-01 --approve-write
python3 ysc.py --workspace workspaces/my-channel storage-clean --plan-id SHA256_FROM_STORAGE --approve-write
```

`storage` is read-only. Review its exact candidate paths and byte count. The clean
command recomputes the plan and refuses a changed token or changed file hash.
It uses no recursive project deletion. The plan and completed/partial deletion
receipt remain under that workspace's `.storage/`; they are records, not backups.
Protecting a preview writes a separate marker without editing its original report.
No unattended deletion, background job or global temporary-directory scan occurs.

Generated runs have their normal new run IDs. A workspace file lock prevents
simultaneous build/render/cleanup writers. Cleanup locks require macOS or Linux;
Windows media production remains unqualified. A lock file left on disk is harmless:
the operating system releases the actual lock when its process exits.

## Interrupted rendering

Large render scratch now lives in the selected workspace's `.scratch/ysc-*/`.
Normal success, exceptions and keyboard interruption remove that invocation's
scratch. A hard process kill can leave it behind. `storage` only selects owned
scratch older than 24 hours when both the parent and capture processes are gone
and local `lsof` inspection confirms no open files. If inspection is unavailable,
times out or reports an error, the directory is retained. Nothing is installed.
Unknown historical OS temporaries are never guessed at or automatically removed.
Small capability/transcription probes still use invocation-owned OS temporaries.

## Operator policy

An optional workspace `storage-policy.json` can set explicit budgets. It is
operator configuration, never episode input. All fields are required; numbers
must be integer bytes. Budgets cannot be disabled and the disk reserve cannot
fall below 2 GiB. Changes take effect on the next command.

```json
{
  "version": 1,
  "max_generated_bytes": 10737418240,
  "max_scratch_bytes": 34359738368,
  "min_free_bytes": 5368709120,
  "keep_builds": 2,
  "older_than_days": 7
}
```

Completed films accumulate intentionally. Once the output budget is reached,
review and archive deliveries yourself or raise the explicit budget after checking
capacity. The generator does not delete a final film to make room for another.

## Development and upgrades

Use automatic temporary directories for synthetic tests. Do not copy the entire
repository into private workspaces for repeated test runs or keep per-frame dumps
after qualification. Keep one acceptance workspace for the change and retain its
final deliverable, original inputs and compact QA records.

This hardening is on `main` after the immutable v0.5.0 tag. It changes the
implementation lock. Existing approvals and delivered files remain untouched;
use a new workspace and normal brand/runtime approval for the new implementation,
as described in [the upgrade contract](WORKFLOW.md#updating-a-brand-or-engine).
Never rewrite an old approval merely to bypass the drift check.
