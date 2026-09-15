import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

from tools.visual_library import catalog, kit
from tools.visual_library.test_kit import VisualLibraryTests
from tools.visuals import export_svg


class CatalogTests(unittest.TestCase):
    def test_source_archive_contains_every_verified_vendor_file(self):
        from tools import release
        manifest = kit.verify_assets()
        with tempfile.TemporaryDirectory() as temp:
            destination = Path(temp) / 'source.zip'
            release.package(destination)
            with zipfile.ZipFile(destination) as archive:
                for name, digest in manifest['files'].items():
                    payload = archive.read('YouTubeShortCreator/tools/visual_library/vendor/' + name)
                    self.assertEqual(hashlib.sha256(payload).hexdigest(), digest)
                self.assertFalse(any('/workspaces/' in name for name in archive.namelist()))

    def test_discovery_and_production_boundary(self):
        entries=catalog.entries()
        self.assertEqual(len(entries),69)
        self.assertEqual(len({e['id'] for e in entries}),69)
        self.assertEqual(len(catalog.search(kind='widget')),3)
        self.assertEqual(len(catalog.search('latency',kind='chart')),1)
        self.assertFalse(catalog.describe('visual:flow')['production_scene_available'])

    def test_unknown_ids_and_kinds(self):
        for value in ('../private','icon:unknown','https://example.invalid/a.svg'):
            with self.assertRaises(ValueError):catalog.describe(value)
        with self.assertRaises(ValueError):catalog.search(kind='remote')

    def test_widget_contracts(self):
        widgets=kit.read_json(kit.HOME/'widgets.json')
        icons=kit.verify_assets()['icons']
        self.assertEqual(len(kit.validate_document(widgets,icons)),3)
        for index in range(3):
            invalid=copy.deepcopy(widgets['charts'][index]);invalid['data']['script']='bad'
            with self.assertRaises(ValueError):kit.validate_chart(invalid,icons)
        invalid=copy.deepcopy(widgets['charts'][0]);invalid['data']['steps'][0]['icon']='remote'
        with self.assertRaises(ValueError):kit.validate_chart(invalid,icons)
        invalid=copy.deepcopy(widgets['charts'][1]);invalid['data']['value']=True
        with self.assertRaises(ValueError):kit.validate_chart(invalid,icons)

    def test_source_tree_output_rejected(self):
        with self.assertRaises(ValueError):kit.workspace_path(kit.HOME)
        with self.assertRaises(ValueError):kit.workspace_path(kit.HOME.parents[1]/'workspaces/../tools')

    def test_nonfinite_json(self):
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp)/'bad.json';p.write_text('{"value":NaN}')
            with self.assertRaises(ValueError):kit.read_json(p)

    def test_build_is_private_and_offline(self):
        with tempfile.TemporaryDirectory() as temp:
            output=kit.build('widgets.json','review',True,Path(temp).resolve(),example=True)
            self.assertTrue(output.is_file())
            self.assertNotIn('COGNATIV',output.read_text())
            record=json.loads((output.parent/'build.json').read_text())
            self.assertEqual(record['charts'],3)
            self.assertFalse(record['production_integration'])
            with self.assertRaises(ValueError):kit.build('widgets.json','review',True,Path(temp).resolve(),example=True)

    def test_svg_export_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp).resolve()
            for index,asset in enumerate(('icon:bot','composition:governed-agent')):
                output=Path(export_svg(asset,root,'asset-'+str(index),True))
                self.assertIn('<svg',output.read_text())
                self.assertTrue((output.parent/'LICENSE.txt').is_file())
                with self.assertRaises(ValueError):export_svg(asset,root,'asset-'+str(index),True)

    def test_svg_preflight_no_writes(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp).resolve()
            cases=[('icon:bot','valid',False,'#ffffff'),('icon:bot','../bad',True,'#ffffff'),('icon:bot','valid',True,'url(x)'),('visual:bar','valid',True,'#ffffff')]
            for asset,run,approved,color in cases:
                with self.assertRaises(ValueError):export_svg(asset,root,run,approved,color)
            self.assertEqual(list(root.iterdir()),[])


if __name__=='__main__':unittest.main()
