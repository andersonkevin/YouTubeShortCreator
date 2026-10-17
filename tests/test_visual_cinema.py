import copy
import json
from pathlib import Path
import tempfile
import unittest

import visual_adapter
import workflow
from safety import read_json
from test_workflow import fixture
from tools.hyperframes_pilot import episode
from tools.visual_library import catalog


class CinemaTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        root=Path(self.temp.name).resolve()/'channel'
        old=workflow.ROOT,workflow.RUNS
        self.addCleanup(lambda:(setattr(workflow,'ROOT',old[0]),setattr(workflow,'RUNS',old[1])))
        workflow.ROOT,workflow.RUNS=root,root/'runs'
        self.path=fixture(root);self.data=episode(read_json(self.path))
        self.data['visuals']['flow']['data']['steps']=self.data['visuals']['flow']['data']['steps'][:2]
        for scene,preset,cues in zip(self.data['scenes'],['flow-trace','metric-count','compare-swap'],[[0,1],[2],[4,5]]):
            scene['presentation']['story']={'preset':preset,'cues':cues}
        # Reuse the real flow/comparison contracts; the metric stays classic
        # until the sequence validation test deliberately rejects that mix.
        for scene in (self.data['scenes'][0], self.data['scenes'][2]):
            scene['presentation'].update(composition='cinematic-v1',transition='cut-left',
                                         reveal='fade',exit='fade',exit_duration=.4)

    def test_cinematic_contract_is_explicit_and_closed(self):
        scene=self.data['scenes'][0];record=self.data['visuals'][scene['visual_id']]
        visual_adapter.validate_scene(scene,self.data['visuals'])
        for key,value in [('composition','free-html'),('transition','crossfade'),('exit_duration',0)]:
            invalid=copy.deepcopy(scene);invalid['presentation'][key]=value
            with self.assertRaises(ValueError):visual_adapter.validate_scene(invalid,self.data['visuals'])
        invalid=copy.deepcopy(scene);del invalid['presentation']['story']
        with self.assertRaises(ValueError):visual_adapter.validate_composition(invalid,record)

    def test_frame_contracts_cannot_mix(self):
        self.path.write_text(json.dumps(self.data))
        with self.assertRaisesRegex(ValueError,'mix'):workflow.validate(self.path)

    def test_transition_cannot_escape_composition_gate(self):
        scene=copy.deepcopy(self.data['scenes'][0]);del scene['presentation']['composition']
        with self.assertRaises(ValueError):visual_adapter.validate_composition(scene,self.data['visuals'][scene['visual_id']])

    def test_discovery_and_scoped_markup(self):
        self.assertEqual(catalog.describe('visual:flow')['compositions'],['cinematic-v1'])
        self.assertEqual(catalog.describe('visual:metric')['compositions'],[])
        scene=self.data['scenes'][0]
        markup=visual_adapter.scene_html(scene,0,4)
        self.assertIn('cinema-viewport',markup)
        del scene['presentation']['composition'];del scene['presentation']['transition']
        self.assertNotIn('cinema-viewport',visual_adapter.scene_html(scene,0,4))
