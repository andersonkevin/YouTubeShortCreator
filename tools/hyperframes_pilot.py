#!/usr/bin/env python3
"""Create an isolated, explicitly synthetic three-scene motion fixture."""
import argparse
import copy
import json
from pathlib import Path
import sys

HOME = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(HOME), str(HOME / 'tests')]

import workflow
from safety import digest, read_json, require, write_json
from test_workflow import fixture
from tools.regression import new_root
from tools.visual_library import kit


def episode(seed, effects=False):
    data = copy.deepcopy(seed)
    data['version'] = 2
    data['visuals'] = {}
    data['scenes'] = []
    presets = [('cascade-v1', 'steps', 0, 24), ('outline-v1', 'metric-panel', 3, 24),
               ('highlight-v1', 'comparison-right-title', 5, 18)]
    headings = [('Show each step.', 'Keep the order.'), ('A number needs context.', 'Keep the source.'),
                ('Two checks.', 'Different jobs.')]
    for index, record in enumerate(read_json(kit.HOME / 'widgets.json')['charts']):
        data['visuals'][record['id']] = record
        presentation = {'reveal': 'fade' if index == 0 else 'wipe-right',
                        'exit': 'none', 'exit_duration': 0, 'chart_style': 'standard'}
        if effects:
            preset, target, cue, frames = presets[index]
            presentation['effects'] = [{'preset': preset, 'target': target, 'cue': cue, 'duration_frames': frames}]
        data['scenes'].append({'layout': 'visual-library', 'name': record['kind'], 'first_cue': index * 2,
            'content': {'eyebrow': 'SYNTHETIC MOTION PILOT', 'heading_1': headings[index][0],
                        'heading_2': headings[index][1], 'note': 'Illustrative fixture. Not a measured result or approved episode.'},
            'motion': {'visual': {'enter': .1, 'fill': [.2, .4 if index == 0 else 1.2]}},
            'visual_id': record['id'], 'symbol': 'icon:' + record['icon'], 'presentation': presentation})
    data['youtube']['title'] = 'TEST SIGNAL: three-scene motion pilot'
    data['youtube']['description'] = 'Synthetic fixture. Not narration. Do not publish.\n\n' + ' '.join(data['youtube']['hashtags'])
    data['youtube']['pinned_comment'] = 'Synthetic fixture. Human review pending.'
    return data


def prepare(requested, approved, effects=False):
    require(approved, 'Fixture creation requires --approve-write')
    root = new_root(requested)
    old = workflow.ROOT, workflow.RUNS
    workflow.ROOT, workflow.RUNS = root, root / 'runs'
    try:
        path = fixture(root)
        data = episode(read_json(path), effects)
        # fixture() creates only synthetic assets and a test approval in this new root.
        path.write_text(json.dumps(data, indent=2) + '\n')
        write_json(root / 'pilot-fixture.json', {'version': 1, 'purpose': 'synthetic-motion-pilot',
            'production_approval': False, 'real_brand_qualified': False, 'effects': effects,
            'implementation_sha256': workflow.verify_lock(), 'episode_sha256': digest(path)})
        return root
    finally:
        workflow.ROOT, workflow.RUNS = old


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace', type=Path, required=True)
    parser.add_argument('--approve-write', action='store_true')
    parser.add_argument('--effects', action='store_true')
    args = parser.parse_args()
    try:
        print(prepare(args.workspace, args.approve_write, args.effects))
    except (ValueError, OSError) as error:
        print('ERROR: ' + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
