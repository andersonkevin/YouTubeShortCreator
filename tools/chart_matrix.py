#!/usr/bin/env python3
"""Create and capture a private synthetic chart density matrix. Never publishes."""
import argparse
import copy
from pathlib import Path
import shutil
import subprocess
import sys
from unittest.mock import patch

HOME = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(HOME), str(HOME / 'tests')]
import branding
import runtime
import workflow
from safety import digest, read_json, require, write_json
from test_workflow import brand_record, fixture
from tools.regression import new_root
from tools.widget_smoke import chart_episode


def boundary_record(record):
    record = copy.deepcopy(record)
    data, kind = record['data'], record['kind']
    record['source'] = {'kind':'illustrative', 'label':'Synthetic boundary fixture',
                        'reference':'Deliberate extremes; no measured performance.', 'as_of':'2026-09-15'}
    if kind in ('line','bar'):
        data['categories'] = [f'C{i}' for i in range(1,7)]
        data['series'] = [{'label':'First', 'values':[0,1e6,2,2e5,1e-4,5e5]},
                          {'label':'Second', 'values':[1e6,0,2e5,1e-4,5e5,2]}]
    elif kind == 'pie':
        data['categories'], data['values'] = ['A','B','C','D'], [1e6,1e-6,1,0]
    elif kind == 'scatter':
        data['points'] = [[-1e6+i*2e6/39,((i*7)%41)*50000-1e6] for i in range(40)]
    elif kind == 'heatmap':
        data['rows'] = [f'R{i}' for i in range(1,7)]
        data['columns'] = [f'C{i}' for i in range(1,7)]
        data['values'] = [[(x+y)%3*50 for x in range(6)] for y in range(6)]
    elif kind == 'correlation':
        data['labels'] = ['A','B','C','D']
        data['observations'] = [[i*50000-1e6,((i*3)%41)*40000-800000,
                                 ((i*7)%41)*30000-600000,((i*11)%41)*20000] for i in range(40)]
    elif kind == 'timeline':
        data['stages'] = [{'label':f'Stage {i+1}', 'start':start, 'end':end}
                          for i,(start,end) in enumerate(((0,1e-6),(0,1e6),(1,2),
                                                        (1e5,2e5),(5e5,1e6),(0,1)))]
    elif kind == 'geo':
        coordinates = [(-80,-175),(-45,-120),(0,-70),(45,-30),(80,30),(40,80),(0,130),(-40,175)]
        data['points'] = [{'label':f'Location {i+1}', 'lat':lat, 'lon':lon, 'value':1}
                          for i,(lat,lon) in enumerate(coordinates)]
    return record


def matrix_episodes(seed, count):
    cases=[]
    examples=[chart_episode(seed,group,count) for group in ('charts-a','charts-b','charts-c')]
    for episode,group in zip(examples,('charts-a','charts-b','charts-c')): episode['id']=group
    if count==3:
        full=[chart_episode(seed,group,4) for group in ('charts-a','charts-b','charts-c')]
        for name,selections in (('charts-tail',((0,2),(1,2))),('stacked-tail',((2,2),(2,0)))):
            episode=chart_episode(seed,'charts-a',3)
            episode['id']=name; episode['visuals']={}
            for index,(group,scene_index) in enumerate(selections):
                scene=copy.deepcopy(full[group]['scenes'][scene_index]); scene['first_cue']=(0,2)[index]
                episode['scenes'][index]=scene
                episode['visuals'][scene['visual_id']]=copy.deepcopy(full[group]['visuals'][scene['visual_id']])
            examples.append(episode)
    for example in examples:
        for dense in (False,True):
            episode=copy.deepcopy(example)
            episode['id']+=('-boundary' if dense else '-example')
            if dense:
                episode['visuals']={name:boundary_record(record) for name,record in episode['visuals'].items()}
            cases.append((episode,False))
    for name,kind in (('overlap-labels','heatmap'),('overlap-map','geo')):
        episode=chart_episode(seed,'charts-b' if kind=='heatmap' else 'charts-c',count)
        episode['id']=name
        record=next(record for record in episode['visuals'].values() if record['kind']==kind)
        if kind=='heatmap':
            record['data']={'columns':[f'C{i}' for i in range(6)],
                            'rows':['W'*17+str(i) for i in range(6)], 'values':[[50]*6 for _ in range(6)]}
        else:
            record['data']['points']=[{'label':name,'lat':0,'lon':0,'value':1} for name in ('A','B')]
        cases.append((episode,True))
    return cases


def run(requested, palette, count, approved):
    require(approved,'Matrix writes require --approve-write')
    require(palette in branding.PALETTES and count in (3,4),'Invalid matrix selection')
    root=new_root(requested)
    old=workflow.ROOT, workflow.RUNS
    workflow.ROOT, workflow.RUNS = root, root/'runs'
    try:
        brand=brand_record()
        brand['colors']=copy.deepcopy(branding.PALETTES[palette])
        with patch('test_workflow.brand_record',return_value=brand): seed=fixture(root)
        cases=[]
        for episode,negative in matrix_episodes(read_json(seed),count):
            target=root/'episodes'/episode['id']; target.mkdir()
            for item in episode['inputs'].values(): shutil.copyfile(seed.parent/item['path'],target/item['path'])
            write_json(target/'episode.json',episode)
            # Negative geometry fixtures must pass data validation first.
            workflow.validate(target/'episode.json')
            cases.append({'episode':str((target/'episode.json').relative_to(root)),
                          'sha256':digest(target/'episode.json'),'expected':'FAIL' if negative else 'PASS'})
        manifest={'purpose':'synthetic-chart-boundaries','palette':palette,'scene_count':count,
                  'lock_sha256':workflow.verify_lock(),'tool_sha256':digest(Path(__file__)),
                  'cases':cases,'publication_approval':False}
        write_json(root/'matrix-fixture.json',manifest)
        runtime.configure(root,{})
        results=[]
        for case in cases:
            require(digest(root/case['episode'])==case['sha256'],'Matrix input drift')
            process=subprocess.run([sys.executable,'-B',str(HOME/'ysc.py'),'--workspace',str(root),
                                    'build',case['episode'],'--run-id','matrix','--approve-write'],
                                   capture_output=True,text=True)
            detail=process.stdout+process.stderr
            valid=(process.returncode==0) if case['expected']=='PASS' else (process.returncode!=0 and 'Chart label' in detail)
            output=root/'runs'/Path(case['episode']).parent.name/'matrix'
            record=output/('run.json' if process.returncode==0 else 'failure.json')
            results.append({**case,'check':'PASS' if valid else 'FAIL','returncode':process.returncode,
                            'evidence':str(record.relative_to(root)) if record.exists() else None,
                            'evidence_sha256':digest(record) if record.exists() else None,'log':detail})
            print(case['episode'],results[-1]['check'],flush=True)
        require(manifest['lock_sha256']==workflow.verify_lock(),'Implementation drift during matrix')
        report={'status':'PASS' if all(r['check']=='PASS' for r in results) else 'FAIL',
                'manifest_sha256':digest(root/'matrix-fixture.json'),'results':results,
                'media_rendered':False,'human_review':'pending','publication_performed':False}
        write_json(root/'matrix-report.json',report)
        return root/'matrix-report.json',report['status']
    finally:
        workflow.ROOT, workflow.RUNS=old


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace',type=Path,required=True)
    parser.add_argument('--palette',choices=tuple(branding.PALETTES),default='violet')
    parser.add_argument('--scenes',type=int,choices=(3,4),default=4)
    parser.add_argument('--approve-write',action='store_true')
    args=parser.parse_args()
    path,status=run(args.workspace,args.palette,args.scenes,args.approve_write)
    print(path)
    return 0 if status=='PASS' else 1


if __name__=='__main__': raise SystemExit(main())
