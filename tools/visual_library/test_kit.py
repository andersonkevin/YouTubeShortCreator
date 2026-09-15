import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tools.visual_library import kit


class VisualLibraryTests(unittest.TestCase):
    def setUp(self):
        self.doc = kit.read_json(kit.HOME / 'demo.json')
        self.icons = kit.verify_assets()['icons']

    def chart(self, kind):
        return copy.deepcopy(next(c for c in self.doc['charts'] if c['kind'] == kind))

    def reject(self, chart):
        with self.assertRaises(ValueError):
            kit.validate_chart(chart, self.icons)

    def test_all_eight_examples(self):
        self.assertEqual(len(kit.validate_document(self.doc, self.icons)), 8)

    def test_forty_local_icons(self):
        self.assertEqual(len(self.icons), 40)

    def test_six_compositions(self):
        recipes=kit.validate_recipes(kit.read_json(kit.HOME/'recipes.json'),self.icons)
        self.assertEqual(len(recipes),6)
        recipes['governed-agent']['badge']='remote.svg'
        with self.assertRaises(ValueError):kit.validate_recipes(recipes,self.icons)

    def test_no_output_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp).resolve()
            (root/'demo.json').write_text(json.dumps(self.doc))
            (root/'visuals').mkdir();(root/'visuals'/'existing').mkdir()
            with self.assertRaisesRegex(ValueError,'already exists'):kit.build('demo.json','existing',True,root)
            self.assertEqual(list((root/'visuals'/'existing').iterdir()),[])

    def test_output_symlink(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp).resolve();(root/'demo.json').write_text(json.dumps(self.doc));(root/'actual').mkdir();(root/'visuals').symlink_to(root/'actual',target_is_directory=True)
            with self.assertRaisesRegex(ValueError,'Symlink'):kit.build('demo.json','safe',True,root)
            self.assertEqual(list((root/'actual').iterdir()),[])

    def test_unknown_fields(self):
        c = self.chart('line'); c['style'] = {}; self.reject(c)

    def test_unknown_icon(self):
        c = self.chart('line'); c['icon'] = '../private'; self.reject(c)

    def test_markup(self):
        c = self.chart('line'); c['title'] = '<script>bad</script>'; self.reject(c)

    def test_numeric_types(self):
        for bad in [True, None, '1', float('nan'), float('inf'), -1, 1e9]:
            with self.subTest(bad=bad):
                c = self.chart('bar'); c['data']['series'][0]['values'][0] = bad; self.reject(c)

    def test_series_lengths(self):
        c = self.chart('line'); c['data']['series'][0]['values'].pop(); self.reject(c)

    def test_pie_zero(self):
        c = self.chart('pie'); c['data']['values'] = [0]*4; self.reject(c)

    def test_pie_too_many_slices(self):
        c = self.chart('pie'); c['data']['categories'].append('Other'); self.reject(c)

    def test_matrix_shape(self):
        c = self.chart('heatmap'); c['data']['values'][0].pop(); self.reject(c)

    def test_heatmap_percentage_range(self):
        c = self.chart('heatmap'); c['data']['values'][0][0]=101; self.reject(c)

    def test_correlation_from_observations(self):
        c=self.chart('scatter'); c['data']['points']=[[1,3],[2,2],[3,1]]
        result=kit.validate_chart(c,self.icons)
        self.assertAlmostEqual(result['derived']['r'],-1)
        self.assertEqual(result['derived']['n'],3)

    def test_constant_scatter(self):
        c=self.chart('scatter'); c['data']['points']=[[1,2],[1,3],[1,4]]; self.reject(c)

    def test_correlation_matrix(self):
        c=self.chart('correlation'); result=kit.validate_chart(c,self.icons)['derived']['matrix']
        for i in range(3):
            self.assertAlmostEqual(result[i][i],1)
            for j in range(3): self.assertAlmostEqual(result[i][j],result[j][i])

    def test_constant_matrix(self):
        c=self.chart('correlation')
        for row in c['data']['observations']: row[0]=1
        self.reject(c)

    def test_timeline_intervals(self):
        c=self.chart('timeline'); c['data']['stages'][0]['end']=0; self.reject(c)

    def test_geo_bounds_and_quantity(self):
        for key,value in [('lat',91),('lon',181),('value',50)]:
            c=self.chart('geo');c['data']['points'][0][key]=value;self.reject(c)

    def test_source_required(self):
        c=self.chart('line');del c['source'];self.reject(c)

    def test_source_date(self):
        c=self.chart('line');c['source']['as_of']='today';self.reject(c)

    def test_duplicate_ids(self):
        self.doc['charts'].append(self.doc['charts'][0])
        with self.assertRaises(ValueError): kit.validate_document(self.doc,self.icons)

    def test_label_bounds(self):
        c=self.chart('line');c['title']='W'*55;self.reject(c)

    def test_unknown_kind(self):
        c=self.chart('line');c['kind']='script';self.reject(c)

    def test_safe_paths(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); (root/'ok').write_text('ok');(root/'link').symlink_to(root/'ok')
            self.assertEqual(kit.safe_file(root,'ok'),root/'ok')
            for path in ['../ok','/tmp/ok','missing','link']:
                with self.subTest(path=path),self.assertRaises(ValueError): kit.safe_file(root,path)

    def test_duplicate_json_keys(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'data.json';path.write_text('{"version":1,"version":2}')
            with self.assertRaises(ValueError):kit.read_json(path)

    def test_writer_preflight(self):
        with tempfile.TemporaryDirectory() as temp,patch.object(kit,'HOME',Path(temp)):
            for approved,run_id in [(False,'example'),(True,'../bad'),(True,None)]:
                with self.assertRaises(ValueError):kit.build('demo.json',run_id,approved,Path(temp))
            self.assertEqual(list(Path(temp).iterdir()),[])

    def test_vendor_tamper(self):
        with tempfile.TemporaryDirectory() as temp,patch.object(kit,'HOME',Path(temp)):
            vendor=Path(temp)/'vendor';vendor.mkdir();(vendor/'asset').write_text('changed')
            (vendor/'manifest.json').write_text(json.dumps({'files':{'asset':hashlib.sha256(b'original').hexdigest()}}))
            with self.assertRaises(ValueError):kit.verify_assets()


if __name__=='__main__':unittest.main()
