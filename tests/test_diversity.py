"""Batch diversity picker: family rotation, no-overwrite records and the read-only report."""
from pathlib import Path
import sys
import tempfile
import unittest

HOME = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(HOME), str(HOME / 'tests')]
import diversity
import workflow
import ysc
from safety import read_json, write_json
from test_workflow import fixture


class PickerTests(unittest.TestCase):
    def test_families_cover_every_template_layout(self):
        self.assertEqual(sorted(diversity.FAMILY_OF), diversity.template_layouts())
        self.assertEqual(sorted(diversity.ORDER), diversity.template_layouts())
        self.assertEqual(len(diversity.FAMILIES), 8)

    def test_first_episode_keeps_the_classic_opening(self):
        self.assertEqual(diversity.pick_layouts(3, []), ['prompt-tools', 'code-policy', 'approval-gate'])
        four = diversity.pick_layouts(4, [])
        self.assertEqual(four[-1], 'approval-gate')
        self.assertEqual(len({diversity.FAMILY_OF[name] for name in four}), 4)

    def test_batch_uses_every_layout_before_leaning_on_repeats(self):
        history, shared = [], 0
        for _ in range(12):
            picked = diversity.pick_layouts(3, history)
            families = {diversity.FAMILY_OF[name] for name in picked}
            self.assertEqual(len(families), 3, 'Families repeat inside one episode')
            if history:
                shared += bool({diversity.FAMILY_OF[name] for name in history[-1]} & families)
            history.append(picked)
        used = [name for picked in history for name in picked]
        self.assertGreaterEqual(len(set(used[:18])), 17, 'The first six episodes use almost every layout once')
        self.assertEqual(len(set(used)), 18, 'Every layout appears across twelve episodes')
        self.assertLessEqual(max(used.count(name) for name in set(used)), 3)
        self.assertLessEqual(shared, 4, 'Adjacent episodes rarely share a family')
        self.assertEqual(diversity.pick_layouts(3, history), diversity.pick_layouts(3, history), 'Picker is deterministic')

    def test_gate_layouts_close_the_episode(self):
        for count in (3, 4):
            for rounds in range(6):
                picked = diversity.pick_layouts(count, [diversity.pick_layouts(count, [])] * rounds)
                gates = [name for name in picked if diversity.FAMILY_OF[name] == 'gate']
                if gates:
                    self.assertEqual(picked[-1], gates[0])

    def test_unknown_history_is_rejected(self):
        with self.assertRaises(ValueError):
            diversity.pick_layouts(3, [['visual-library']])
        with self.assertRaises(ValueError):
            diversity.pick_layouts(5, [])


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / 'channel'
        old = workflow.ROOT, workflow.RUNS
        self.addCleanup(lambda: (setattr(workflow, 'ROOT', old[0]), setattr(workflow, 'RUNS', old[1])))
        workflow.ROOT, workflow.RUNS = self.root, self.root / 'runs'
        fixture(self.root)

    def new(self, episode_id, **options):
        return ysc.new_episode(self.root, episode_id, 'intake/voice.wav', 'intake/transcript.json', 'intake/graphic.png', 'intake/captions.json', **options)

    def test_batch_members_get_different_families(self):
        first = read_json(self.new('pick-01', batch='launch'))
        second = read_json(self.new('pick-02', batch='launch'))
        third = read_json(self.new('pick-03', batch='launch'))
        layouts = [[scene['layout'] for scene in data['scenes']] for data in (first, second, third)]
        self.assertEqual(layouts[0], ['prompt-tools', 'code-policy', 'approval-gate'])
        families = [{diversity.FAMILY_OF[name] for name in picked} for picked in layouts]
        self.assertFalse(families[0] & families[1])
        self.assertFalse(families[1] & families[2])
        self.assertEqual(len(families[0] | families[1] | families[2]), 8)
        record = read_json(self.root / 'episodes/pick-03/batch.json')
        self.assertEqual(record, {'batch': 'launch', 'episode': 'pick-03', 'sequence': 3, 'picked_layouts': layouts[2]})
        self.assertFalse((self.root / 'episodes/test-episode/batch.json').exists())
        for data in (first, second, third):
            workflow.validate(self.root / 'episodes' / data['id'] / 'episode.json')

    def test_batches_are_independent_and_edits_count(self):
        self.new('a-01', batch='alpha')
        self.new('b-01', batch='beta')
        path = self.root / 'episodes/b-01/episode.json'
        data = read_json(path)
        for scene, layout in zip(data['scenes'], ('quote-card', 'numbered-steps', 'headline-stat')):
            scene['layout'] = layout
        path.unlink()
        write_json(path, data)
        second_alpha = read_json(self.new('a-02', batch='alpha'))
        second_beta = read_json(self.new('b-02', batch='beta'))
        self.assertIn('quote-card', [scene['layout'] for scene in second_alpha['scenes']])
        self.assertNotIn('quote-card', [scene['layout'] for scene in second_beta['scenes']])
        self.assertIn('prompt-tools', [scene['layout'] for scene in second_beta['scenes']])

    def test_explicit_layouts_and_validation(self):
        data = read_json(self.new('manual', layouts='headline-stat,closing,quote-card'))
        self.assertEqual([scene['layout'] for scene in data['scenes']], ['headline-stat', 'closing', 'quote-card'])
        with self.assertRaises(ValueError):
            self.new('short', layouts='headline-stat,closing')
        with self.assertRaises(ValueError):
            self.new('unknown', layouts='headline-stat,closing,visual-library')
        with self.assertRaises(ValueError):
            self.new('bad-batch', batch='Launch 01')

    def test_report_lists_repeats_and_next_pick(self):
        self.new('r-01', batch='review')
        self.new('r-02', batch='review', layouts='prompt-tools,quote-card,closing')
        report = diversity.report(self.root, 'review')
        self.assertEqual([entry['id'] for entry in report['episodes']], ['r-01', 'r-02'])
        self.assertEqual(report['repeats']['layouts'], {'prompt-tools': 2})
        self.assertEqual(report['repeats']['families'], {'evidence': 2, 'gate': 2})
        self.assertEqual(report['next_pick']['3'], diversity.pick_layouts(3, [entry['layouts'] for entry in report['episodes']]))
        self.assertFalse(report['writes_performed'])
        self.assertEqual(diversity.report(self.root, 'empty')['episodes'], [])
        self.assertEqual(ysc.main(['--workspace', str(self.root), 'batch', 'review']), 0)

    def test_corrupt_batch_record_is_rejected(self):
        self.new('c-01', batch='corrupt')
        marker = self.root / 'episodes/c-01/batch.json'
        record = read_json(marker)
        record['sequence'] = 0
        marker.unlink()
        write_json(marker, record)
        with self.assertRaises(ValueError):
            diversity.report(self.root, 'corrupt')


if __name__ == '__main__':
    unittest.main()
