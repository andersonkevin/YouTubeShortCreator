import copy
import unittest
from pathlib import Path
from unittest.mock import patch

from safety import read_json
from tools.chart_matrix import boundary_record, matrix_episodes, run
from tools.visual_library import kit


class ChartMatrixTests(unittest.TestCase):
    def test_all_boundaries_are_valid_and_preserve_source(self):
        icons=kit.verify_assets()['icons']
        for source in read_json(kit.HOME/'demo.json')['charts']:
            before=copy.deepcopy(source)
            result=kit.validate_chart(boundary_record(source),icons)
            self.assertEqual(result['source']['kind'],'illustrative')
            self.assertEqual(source,before)

    def test_declared_maximum_dimensions(self):
        records={r['kind']:boundary_record(r)['data'] for r in read_json(kit.HOME/'demo.json')['charts']}
        self.assertEqual(len(records['scatter']['points']),40)
        self.assertEqual(len(records['heatmap']['values']),6)
        self.assertEqual(len(records['heatmap']['values'][0]),6)
        self.assertEqual(len(records['correlation']['labels']),4)
        self.assertEqual(len(records['correlation']['observations']),40)
        self.assertEqual(len(records['line']['categories']),6)
        self.assertEqual(len(records['geo']['points']),8)

    def test_approval_before_filesystem_access(self):
        with patch('tools.chart_matrix.new_root',side_effect=AssertionError('must not access')):
            with self.assertRaisesRegex(ValueError,'approve-write'): run(Path('unused'),'violet',4,False)

    def test_invalid_selection_before_writes(self):
        with patch('tools.chart_matrix.new_root',side_effect=AssertionError('must not access')):
            with self.assertRaisesRegex(ValueError,'selection'): run(Path('unused'),'unknown',4,True)


if __name__=='__main__': unittest.main()
