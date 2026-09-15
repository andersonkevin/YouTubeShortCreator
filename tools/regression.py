#!/usr/bin/env python3
"""Prepare or capture private synthetic legacy references. Never publishes media."""
import argparse
import copy
from pathlib import Path
import shutil
import subprocess
import sys

HOME = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(HOME), str(HOME / 'tests')]
import runtime
import workflow
from safety import digest, inside, read_json, require, write_json
from test_workflow import fixture
from tools.visual_library.kit import workspace_path


def plan_scenes(layouts, captions, count):
    require(count in (3, 4) and len(layouts) == count, 'Expected three or four layouts')
    anchors = [i * len(captions['cues']) // count for i in range(count)]
    starts = [0] + [captions['cues'][i]['start'] for i in anchors[1:]]
    ends = starts[1:] + [captions['duration']]
    scenes = []
    for name, cue, start, end in zip(layouts, anchors, starts, ends):
        sample = copy.deepcopy(read_json(inside(workflow.TEMPLATE / 'scenes', name + '.json'))['example'])
        maximum = max(value if kind == 'enter' else value[1] if kind == 'active' else sum(value)
                      for values in sample['motion'].values() for kind, value in values.items())
        factor = (end - start) * .8 / max(maximum, 1)
        for values in sample['motion'].values():
            for kind, value in values.items():
                values[kind] = round(value * factor, 6) if type(value) in (int, float) else [round(v * factor, 6) for v in value]
        scenes.append({'layout': name, 'name': name, 'first_cue': cue, **sample})
    return scenes


def new_root(requested):
    root = Path(requested).expanduser().absolute()
    require('..' not in root.parts, 'Traversal blocked')
    workspace_path(root.parent)
    require(not root.is_symlink() and not root.exists(), 'Use a new private fixture workspace')
    return root


def prepare(requested, approved):
    require(approved, 'Fixture creation requires --approve-write')
    root = new_root(requested)
    old = workflow.ROOT, workflow.RUNS
    workflow.ROOT, workflow.RUNS = root, root / 'runs'
    try:
        seed = fixture(root)
        data = read_json(seed)
        captions = read_json(seed.parent / data['inputs']['captions']['path'])
        layouts = sorted(p.stem for p in (workflow.TEMPLATE / 'scenes').glob('*.json'))
        require(len(layouts) == 12, 'Review fixture coverage before changing the legacy layout count')
        cases = []

        def add_case(identifier, scenes, expected='PASS', error=None):
            episode = copy.deepcopy(data)
            episode['id'], episode['scenes'] = identifier, scenes
            episode['youtube']['title'] = 'TEST SIGNAL: legacy regression only'
            episode['youtube']['description'] = 'Synthetic fixture, not narration. Do not publish.\n\n' + ' '.join(episode['youtube']['hashtags'])
            episode['youtube']['pinned_comment'] = 'Synthetic fixture. Not editorially approved.'
            target = root / 'episodes' / identifier
            target.mkdir()
            for item in episode['inputs'].values():
                shutil.copyfile(seed.parent / item['path'], target / item['path'])
            path = target / 'episode.json'
            write_json(path, episode)
            cases.append({'episode': str(path.relative_to(root)), 'sha256': digest(path),
                          'scene_count': len(scenes), 'layouts': [s['layout'] for s in scenes],
                          'expected': expected, 'error_contains': error})

        for count in (3, 4):
            for offset in range(0, len(layouts), count):
                add_case(f'legacy-{count}-{offset // count + 1}', plan_scenes(layouts[offset:offset + count], captions, count))
        scenes = plan_scenes(layouts[:3], captions, 3)
        scenes[0]['first_cue'] = 1
        add_case('invalid-anchor', scenes, 'FAIL', 'First scene must start')
        scenes = plan_scenes(layouts[:3], captions, 3)
        heading = next(key for key in scenes[0]['content'] if key.startswith(('h1_', 'h2_')))
        scenes[0]['content'][heading] = 'W' * 300
        add_case('overflow-heading', scenes, 'FAIL', 'Text overflow')
        record = {'version': 1, 'purpose': 'synthetic-legacy-regression', 'production_approval': False,
                  'implementation_sha256': workflow.verify_lock(), 'cases': cases,
                  'fixture_tool_sha256': digest(Path(__file__)), 'seed_test_sha256': digest(HOME / 'tests/test_workflow.py')}
        write_json(root / 'regression-fixture.json', record)
        return root
    finally:
        workflow.ROOT, workflow.RUNS = old


def capture(root, approved):
    require(approved, 'Capture requires --approve-write')
    root = workspace_path(root)
    manifest = read_json(inside(root, 'regression-fixture.json'))
    require(manifest['purpose'] == 'synthetic-legacy-regression' and manifest['production_approval'] is False,
            'Synthetic fixture required')
    require(not (root / 'regression-report.json').exists(), 'Reference report exists; use a new workspace')
    require(manifest['implementation_sha256'] == workflow.verify_lock(), 'Fixture implementation drift')
    require(manifest['fixture_tool_sha256'] == digest(Path(__file__)) and
            manifest['seed_test_sha256'] == digest(HOME / 'tests/test_workflow.py'), 'Fixture tool drift')
    # Preflight the entire fixture before starting the first build.
    for case in manifest['cases']:
        require(digest(inside(root, case['episode'])) == case['sha256'], 'Fixture episode drift')
        require(case['expected'] in ('PASS', 'FAIL'), 'Invalid expected outcome')
    old = workflow.ROOT, workflow.RUNS
    workflow.ROOT, workflow.RUNS = root, root / 'runs'
    try:
        if not (root / 'runtime.json').exists():
            runtime.configure(root, {})
        _, environment = workflow.doctor()
        results = []
        for case in manifest['cases']:
            path = inside(root, case['episode'])
            process = subprocess.run([sys.executable, '-B', str(HOME / 'ysc.py'), '--workspace', str(root),
                                      'build', case['episode'], '--run-id', 'reference', '--approve-write'],
                                     capture_output=True, text=True)
            if process.returncode:
                detail = process.stdout + process.stderr
                require(case['expected'] == 'FAIL' and case['error_contains'] in detail, detail)
                if path.parent.name == 'overflow-heading':
                    failure = read_json(root / 'runs' / path.parent.name / 'reference/failure.json')
                    require(failure['status'] == 'FAILED', 'Expected retained failed-run evidence')
                results.append({**case, 'outcome': 'EXPECTED_FAILURE', 'error': detail})
                continue
            require(case['expected'] == 'PASS', 'Negative fixture unexpectedly passed')
            output = root / 'runs' / path.parent.name / 'reference'
            qa = read_json(output / 'visual-qa.json')
            require(qa['status'] == 'PASS', 'Visual QA did not pass')
            results.append({**case, 'outcome': 'PASS', 'run': str(output.relative_to(root)),
                            'run_sha256': digest(output / 'run.json'), 'visual_qa_sha256': digest(output / 'visual-qa.json'),
                            'samples': [{'layout': scene['name'], 'sha256': scene['sha256'], 'time': scene['sample']}
                                        for scene in qa['scenes']]})
        report = {'status': 'PASS', 'environment': environment, 'fixture_sha256': digest(root / 'regression-fixture.json'),
                  'results': results, 'media_rendered': False, 'human_review': 'pending', 'publication_performed': False}
        write_json(root / 'regression-report.json', report)
        return root / 'regression-report.json'
    finally:
        workflow.ROOT, workflow.RUNS = old


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('prepare', 'capture'))
    parser.add_argument('--workspace', type=Path, required=True)
    parser.add_argument('--approve-write', action='store_true')
    args = parser.parse_args()
    try:
        operation = prepare if args.command == 'prepare' else capture
        print(operation(args.workspace, args.approve_write))
    except (ValueError, OSError) as error:
        print('ERROR: ' + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
