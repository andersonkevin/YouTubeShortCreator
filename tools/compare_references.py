#!/usr/bin/env python3
"""Read-only comparison of qualified legacy reference captures on one runtime."""
import argparse
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image

HOME = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HOME))
from safety import digest, inside, read_json, require
from tools.visual_library.kit import workspace_path


def pixel_difference(before, after, allow_removed_bracket=False):
    require(before.shape == after.shape == (1920, 1080, 3), 'Expected RGB 1080x1920 references')
    changed = np.any(before != after, axis=2)
    outside = changed.copy()
    if allow_removed_bracket:
        # Old pseudo-element border box plus two pixels for antialiasing.
        outside[648:1416, 976:1018] = False
    require(not outside.any(), 'Pixels changed outside the allowed decoration region')
    return int(changed.sum())


def evidence(root):
    root = workspace_path(root)
    report = read_json(inside(root, 'regression-report.json'))
    require(report['status'] == 'PASS', 'Passing reference report required')
    require(digest(inside(root, 'regression-fixture.json')) == report['fixture_sha256'], 'Fixture drift')
    cases = {}
    for case in report['results']:
        if case['outcome'] != 'PASS':
            continue
        require(digest(inside(root, case['episode'])) == case['sha256'], 'Episode drift')
        output = root / case['run']
        require(digest(inside(root, case['run'] + '/run.json')) == case['run_sha256'], 'Run drift')
        require(digest(inside(root, case['run'] + '/visual-qa.json')) == case['visual_qa_sha256'], 'QA drift')
        run = read_json(output / 'run.json')
        for name, expected in run['outputs'].items():
            require(digest(inside(output, name)) == expected, 'Output drift: ' + name)
        cases[case['episode']] = case
    require(len(cases) >= 7 and sum(len(case['samples']) for case in cases.values()) >= 24,
            'Complete seven-run, 24-scene legacy matrix required')
    return root, report, cases


def compare(before_root, after_root, allow_removed_bracket=False):
    before_root, before, old = evidence(before_root)
    after_root, after, new = evidence(after_root)
    require(before['environment']['versions'] == after['environment']['versions'], 'Runtime mismatch')
    # A newer fixture may add cases for new layouts; every earlier case must still exist.
    require(old.keys() <= new.keys(), 'Fixture case mismatch')
    results = []
    for name, case in old.items():
        other = new[name]
        require(case['sha256'] == other['sha256'], 'Episode inputs differ')
        require(case['layouts'] == other['layouts'], 'Layout sequence differs')
        for index, (left, right) in enumerate(zip(case['samples'], other['samples']), 1):
            require(left['layout'] == right['layout'] and left['time'] == right['time'], 'Sample mismatch')
            paths = [root / item['run'] / f'scene-{index}.png' for root, item in ((before_root, case), (after_root, other))]
            for path, sample in zip(paths, (left, right)):
                require(digest(path) == sample['sha256'], 'Sample hash mismatch')
            with Image.open(paths[0]) as a, Image.open(paths[1]) as b:
                count = pixel_difference(np.asarray(a.convert('RGB')), np.asarray(b.convert('RGB')), allow_removed_bracket)
            results.append({'episode': name, 'scene': index, 'layout': left['layout'], 'changed_pixels': count})
    return {'status': 'PASS', 'comparison': 'approved-bracket-removal' if allow_removed_bracket else 'exact',
            'outside_region_changed_pixels': 0, 'samples': results, 'writes_performed': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('--allow-removed-bracket', action='store_true', help='Allow only the operator-approved legacy border region')
    args = parser.parse_args()
    try:
        print(json.dumps(compare(args.before, args.after, args.allow_removed_bracket), indent=2))
    except (ValueError, OSError) as error:
        print('ERROR: ' + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
