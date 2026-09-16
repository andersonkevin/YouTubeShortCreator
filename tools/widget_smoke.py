#!/usr/bin/env python3
"""Build/render a new private mixed widget fixture. Test media, not narration."""
import argparse
import copy
from pathlib import Path
import shutil
import sys
from unittest.mock import patch

import numpy as np
from PIL import Image

HOME = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(HOME), str(HOME / 'tests')]
import branding
import runtime
import workflow
from safety import digest, inside, read_json, require, write_json
from test_workflow import brand_record, fixture
from test_visual_adapter import visual_episode
from tools.regression import new_root
from tools.visual_library.kit import workspace_path


def chart_episode(seed, group, count=4):
    data = visual_episode(seed, count)
    examples = read_json(workflow.HOME / 'tools/visual_library/demo.json')['charts']
    indexes = {'charts-a':(0,1,2), 'charts-b':(3,4,5), 'charts-c':(6,7,1)}[group]
    presets = {'charts-a':('slide-left','slide-up','fade'),
               'charts-b':('slide-right','slide-down','wipe-right'),
               'charts-c':('fade','slide-up','slide-left')}[group]
    data['visuals'] = {}
    for i, scene in enumerate(data['scenes'][:-1]):
        record = copy.deepcopy(examples[indexes[i]])
        if group == 'charts-c' and i == 2:
            record['id'] = 'stacked-latency'
            record['data']['series'].append({'label':'Overhead','values':[.3,.6,.2,.1]})
        data['visuals'][record['id']] = record
        scene['name'] = record['kind']
        scene['visual_id'] = record['id']
        scene['symbol'] = 'icon:' + record['icon']
        scene['content']['heading_1'] = 'Read the data.'
        scene['content']['heading_2'] = 'Keep its meaning.'
        scene['presentation'] = {'reveal':presets[i], 'exit':'fade', 'exit_duration':.3,
                                 'chart_style':'stacked' if record['id']=='stacked-latency' else 'standard'}
    return data


def check_visual_pixels(root):
    """Read verified fixture captures; do not modify qualification records."""
    root = workspace_path(root)
    output = root / 'runs/widget-fixture/qualification'
    record = read_json(inside(output, 'run.json'))
    require(record['automated_checks'] == 'PASS', 'Successful run required')
    require('episode.json' in record['outputs'], 'Missing episode evidence')
    for name, expected in record['outputs'].items():
        require(digest(inside(output, name)) == expected, 'Run output drift')
    episode = read_json(inside(output, 'episode.json'))
    samples = []
    for index, scene in enumerate(episode['scenes'], 1):
        if scene['layout'] != 'visual-library':
            continue
        name = f'scene-{index}.png'
        require(name in record['outputs'], 'Missing scene evidence')
        path = inside(output, name)
        with Image.open(path) as source:
            require(source.size == (1080, 1920), 'Unexpected capture dimensions')
            # Exclude the flow's left icon badges and the surrounding page copy.
            pixels = np.asarray(source.convert('RGB'))[720:1280, 300:924]
        bright = int(np.sum(np.min(pixels, axis=2) > 180))
        require(bright > 500, 'Missing or incomplete widget text raster')
        samples.append({'visual_id': scene['visual_id'],
                        'bright_text_pixels': bright, 'sha256': digest(path)})
    require(samples, 'No widget samples')
    return {'status': 'PASS', 'samples': samples, 'writes_performed': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace', type=Path, required=True)
    parser.add_argument('--scenes', type=int, choices=(3, 4), default=4)
    parser.add_argument('--duration', type=float, default=12, help='Synthetic signal duration, 12-180 seconds on a whole frame')
    parser.add_argument('--palette', choices=tuple(branding.PALETTES), default='violet')
    parser.add_argument('--render', action='store_true')
    parser.add_argument('--backend', choices=('native', 'ffmpeg'), default='native')
    parser.add_argument('--set', choices=('widgets','charts-a','charts-b','charts-c'), default='widgets')
    parser.add_argument('--approve-write', action='store_true')
    args = parser.parse_args()
    require(args.approve_write, 'Synthetic fixture writes require --approve-write')
    workflow.duration_seconds(args.duration)
    require(args.duration >= 12, 'Six synthetic timing cues require at least 12 seconds')
    root = new_root(args.workspace)
    workflow.ROOT, workflow.RUNS = root, root / 'runs'
    brand = brand_record()
    brand['colors'] = copy.deepcopy(branding.PALETTES[args.palette])
    with patch('test_workflow.brand_record', return_value=brand):
        seed = fixture(root, args.duration)
    data = (visual_episode(read_json(seed), args.scenes) if args.set == 'widgets' else
            chart_episode(read_json(seed), args.set, args.scenes))
    data['id'] = 'widget-fixture'
    data['youtube']['title'] = 'TEST SIGNAL: widget qualification'
    data['youtube']['description'] = 'Synthetic integration fixture. Do not publish.\n\n' + ' '.join(data['youtube']['hashtags'])
    data['youtube']['pinned_comment'] = 'Test media, not narration or editorial approval.'
    folder = root / 'episodes' / data['id']; folder.mkdir()
    for entry in data['inputs'].values(): shutil.copyfile(seed.parent / entry['path'], folder / entry['path'])
    write_json(folder / 'episode.json', data)
    runtime.configure(root, {'backend': args.backend})
    print(workflow.build(folder / 'episode.json', 'qualification', render=args.render))


if __name__ == '__main__': main()
