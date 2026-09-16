#!/usr/bin/env python3
"""Discover and prepare offline visual assets. Does not render or publish Shorts."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

HOME = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HOME))
from tools.visual_library import catalog, kit


def export_svg(asset_id, workspace, run_id, approved, color='#ffffff'):
    kit.require(approved, 'Explicit --approve-write required')
    kit.require(re.fullmatch(r'[a-z][a-z0-9-]{0,47}', run_id or ''), 'Invalid run ID')
    kit.require(re.fullmatch(r'#[0-9a-fA-F]{6}', color or ''), 'Use a six-digit hex color')
    root = kit.workspace_path(workspace)
    entry = catalog.describe(asset_id)
    kit.require(entry['kind'] in ('icon','composition'), 'Only icons/compositions use SVG export; build and QA data visuals')
    parent = root/'visuals'
    output = parent/run_id
    kit.require(not parent.is_symlink() and not output.exists() and not output.is_symlink(), 'New contained output required')
    data=kit.symbol_svg(asset_id,color)
    notices=kit.safe_file(kit.HOME/'vendor','lucide-static/LICENSE').read_bytes()
    parent.mkdir(exist_ok=True);output.mkdir()
    with (output/'asset.svg').open('xb') as stream:stream.write(data)
    with (output/'LICENSE.txt').open('xb') as stream:stream.write(notices)
    record={'status':'review_required','id':asset_id,'color':color,'sha256':hashlib.sha256(data).hexdigest(),
            'publication_performed':False,'vendor_manifest_sha256':hashlib.sha256((kit.HOME/'vendor/manifest.json').read_bytes()).hexdigest()}
    with (output/'export.json').open('x') as stream:json.dump(record,stream,indent=2)
    return str(output/'asset.svg')


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace',type=Path,default=HOME/'workspace')
    commands=parser.add_subparsers(dest='command',required=True)
    p=commands.add_parser('catalog');p.add_argument('--query',default='');p.add_argument('--kind')
    p=commands.add_parser('describe');p.add_argument('id')
    for command in ('validate','build'):
        p=commands.add_parser(command);p.add_argument('input');p.add_argument('--example',action='store_true')
        if command=='build':p.add_argument('--run-id',required=True);p.add_argument('--approve-write',action='store_true')
    p=commands.add_parser('export-svg');p.add_argument('id');p.add_argument('--run-id',required=True);p.add_argument('--color',default='#ffffff');p.add_argument('--approve-write',action='store_true')
    args=parser.parse_args(argv)
    try:
        if args.command=='catalog':
            result={'version':1,'entries':catalog.search(args.query,args.kind),'ranking':'literal term filter, not an AI relevance score'}
        elif args.command=='describe':result=catalog.describe(args.id)
        elif args.command=='export-svg':result={'output':export_svg(args.id,args.workspace,args.run_id,args.approve_write,args.color)}
        elif args.command=='build':result={'output':str(kit.build(args.input,args.run_id,args.approve_write,args.workspace,args.example)),'production_integration':False}
        else:
            if args.example:kit.require(args.input in ('demo.json','widgets.json'),'Unknown built-in example')
            root=kit.HOME if args.example else kit.workspace_path(args.workspace)
            charts=kit.validate_document(kit.read_json(kit.safe_file(root,args.input)),kit.verify_assets()['icons'])
            result={'status':'PASS','visuals':len(charts),'production_integration':False}
        print(json.dumps(result,indent=2,ensure_ascii=True));return 0
    except (ValueError,OSError,KeyError,TypeError) as error:
        print('ERROR: '+str(error),file=sys.stderr);return 1


if __name__=='__main__':raise SystemExit(main())
