#!/usr/bin/env python3
"""Run the synthetic media fixture locally. This is not a publishable Short."""
import argparse
import json
from pathlib import Path
import sys

HOME = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(HOME), str(HOME / 'tests')]
import runtime
import workflow
from test_workflow import fixture
from safety import require


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace', type=Path, required=True, help='New private fixture directory')
    parser.add_argument('--approve-write', action='store_true')
    parser.add_argument('--render', action='store_true')
    args = parser.parse_args()
    require(args.approve_write, 'Smoke test creates private media; pass --approve-write')
    root = args.workspace.expanduser().resolve()
    require(not root.exists(), 'Use a new smoke workspace')
    workflow.ROOT, workflow.RUNS = root, root / 'runs'
    episode = fixture(root)
    runtime.configure(root, {})
    data = json.loads(episode.read_text())
    data['youtube']['title'] = 'TEST SIGNAL: not narration'
    data['youtube']['description'] = 'Synthetic integration test only. Do not publish.\n\n' + ' '.join(data['youtube']['hashtags'])
    data['youtube']['pinned_comment'] = 'Synthetic integration test only.'
    episode.write_text(json.dumps(data, indent=2) + '\n')
    result = workflow.build(episode, 'smoke', render=args.render)
    print(result)


if __name__ == '__main__':
    main()
