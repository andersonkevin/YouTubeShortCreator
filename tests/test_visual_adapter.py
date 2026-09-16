import copy
import json
import subprocess
import sys
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import visual_adapter
import workflow
from safety import read_json
from test_workflow import fixture
from tools.visual_library import kit


def visual_episode(seed, count=4):
    data = copy.deepcopy(seed)
    data['version'] = 2
    data['visuals'] = {}
    examples = read_json(kit.HOME / 'widgets.json')['charts']
    anchors = [0, 2, 4] if count == 3 else [0, 1, 3, 4]
    scenes = []
    for i, source in enumerate(examples[:count - 1]):
        source = copy.deepcopy(source)
        data['visuals'][source['id']] = source
        scenes.append({'layout': 'visual-library', 'name': source['kind'], 'first_cue': anchors[i],
                       'content': {'eyebrow': 'VISUAL REGRESSION', 'heading_1': 'Show the process.',
                                   'heading_2': 'Keep the context.', 'note': 'Synthetic visual and timing fixture. Not narration.'},
                       'motion': {'visual': {'enter': .1, 'fill': [.2, 1.2]}},
                       'visual_id': source['id'], 'symbol': 'composition:governed-agent' if i == 0 else 'icon:activity'})
    classic = copy.deepcopy(seed['scenes'][-1])
    classic['first_cue'] = anchors[-1]
    scenes.append(classic)
    data['scenes'] = scenes
    return data


class AdapterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / 'channel'
        old = workflow.ROOT, workflow.RUNS
        self.addCleanup(lambda: (setattr(workflow, 'ROOT', old[0]), setattr(workflow, 'RUNS', old[1])))
        workflow.ROOT, workflow.RUNS = self.root, self.root / 'runs'
        self.episode = fixture(self.root)
        self.seed = read_json(self.episode)
        self.data = visual_episode(self.seed)

    def validate(self, data=None):
        self.episode.write_text(json.dumps(self.data if data is None else data))
        return workflow.validate(self.episode)

    def test_three_and_four_scenes(self):
        for count in (3, 4):
            self.assertEqual(len(self.validate(visual_episode(self.seed, count))[3]), count)

    def test_v1_rejects_visual_extension(self):
        self.data['version'] = 1
        with self.assertRaises(ValueError): self.validate()

    def test_extra_options_rejected(self):
        record = next(iter(self.data['visuals'].values()))
        record['options'] = {'animation': True}
        with self.assertRaises(ValueError): self.validate()

    def test_missing_duplicate_unused_references(self):
        for kind in ('missing', 'duplicate', 'unused'):
            data = copy.deepcopy(self.data)
            if kind == 'missing': data['scenes'][0]['visual_id'] = 'unknown'
            if kind == 'duplicate': data['scenes'][1]['visual_id'] = data['scenes'][0]['visual_id']
            if kind == 'unused': data['scenes'] = [*data['scenes'][:2], data['scenes'][-1]]
            with self.subTest(kind=kind), self.assertRaises(ValueError): self.validate(data)

    def test_unknown_symbol_and_markup(self):
        for value in ('../private', 'https://example.invalid/icon.svg', 'icon:unknown', '<svg>'):
            data = copy.deepcopy(self.data); data['scenes'][0]['symbol'] = value
            with self.assertRaises(ValueError): self.validate(data)

    def test_all_symbols(self):
        names = ['icon:' + name for name in kit.verify_assets()['icons']]
        names += ['composition:' + name for name in read_json(kit.HOME / 'recipes.json')]
        self.assertEqual(len(names), 46)
        for name in names: self.assertIn(b'<svg', kit.symbol_svg(name))

    def test_scene_timing_and_limits(self):
        for timing in ({'enter': -1, 'fill': [0, 1]}, {'enter': 1, 'fill': [0, 1]}, {'enter': 0, 'fill': [0, 100]}):
            data = copy.deepcopy(self.data); data['scenes'][0]['motion']['visual'] = timing
            with self.assertRaises(ValueError): self.validate(data)
        self.data['scenes'][0]['content']['heading_1'] = 'W' * 33
        with self.assertRaises(ValueError): self.validate()

    def test_chart_kinds_and_unknown_kind(self):
        chart = read_json(kit.HOME / 'demo.json')['charts'][0]
        self.assertEqual(visual_adapter.validate_records({chart['id']: chart})[chart['id']]['kind'], 'line')
        chart['kind'] = 'arbitrary-script'
        with self.assertRaisesRegex(ValueError, 'not qualified'):
            visual_adapter.validate_records({chart['id']: chart})

    def test_all_charts_preserve_data_and_sources(self):
        for chart in read_json(kit.HOME / 'demo.json')['charts']:
            result = visual_adapter.validate_records({chart['id']: chart})[chart['id']]
            self.assertEqual(result['data'], chart['data'])
            self.assertEqual(result['source'], chart['source'])

    def test_chart_fixtures_and_stacked_bars(self):
        from tools.widget_smoke import chart_episode
        for group in ('charts-a','charts-b','charts-c'):
            for count in (3,4):
                data = chart_episode(self.seed, group, count)
                self.assertEqual(len(self.validate(data)[3]),count)
        data = chart_episode(self.seed, 'charts-c')
        stack = data['visuals']['stacked-latency']
        self.assertEqual(len(stack['data']['series']),2)
        self.assertEqual(data['scenes'][2]['presentation']['chart_style'],'stacked')

    def test_density_matrix_covers_every_chart_at_both_scene_counts(self):
        from tools.chart_matrix import matrix_episodes
        for count in (3,4):
            cases=matrix_episodes(self.seed,count)
            kinds=set()
            for data,negative in cases:
                self.validate(data)
                if not negative:
                    kinds.update(r['kind'] for r in data['visuals'].values())
                    self.assertEqual(len(data['scenes']),count)
            self.assertEqual(kinds,{'line','bar','pie','scatter','heatmap','correlation','timeline','geo'})

    def test_each_chart_rejects_invalid_data(self):
        for record in read_json(kit.HOME / 'demo.json')['charts']:
            record = copy.deepcopy(record)
            kind, data = record['kind'], record['data']
            if kind in ('line','bar'): data['series'][0]['values'][0] = -1
            elif kind == 'pie': data['values'] = [0] * len(data['values'])
            elif kind == 'scatter': data['points'] = [[1,1],[1,2],[1,3]]
            elif kind == 'heatmap': data['values'][0][0] = 101
            elif kind == 'correlation': data['observations'] = [[1,1,1]] * 3
            elif kind == 'timeline': data['stages'][0]['end'] = data['stages'][0]['start']
            elif kind == 'geo': data['points'][0]['value'] = 10
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                visual_adapter.validate_records({record['id']:record})

    def test_presets_validate_and_default_is_compatible(self):
        for preset in visual_adapter.REVEALS:
            data = copy.deepcopy(self.data)
            data['scenes'][0]['presentation'] = {**visual_adapter.DEFAULT_PRESENTATION,
                'reveal': preset, 'exit': 'fade', 'exit_duration': .3}
            self.validate(data)
        self.validate()

    def test_bad_presentation_and_overlapping_exit(self):
        for field, value in (('reveal', 'custom-css'), ('exit', 'slide'),
                             ('exit_duration', .8), ('exit_duration', True),
                             ('chart_style', 'stacked'), ('arbitrary', 'value')):
            data = copy.deepcopy(self.data)
            data['scenes'][0]['presentation'] = {**visual_adapter.DEFAULT_PRESENTATION, field:value}
            with self.subTest(field=field, value=value), self.assertRaises(ValueError): self.validate(data)
        scene = copy.deepcopy(self.data['scenes'][0])
        scene['presentation'] = {**visual_adapter.DEFAULT_PRESENTATION, 'exit':'fade', 'exit_duration':.3}
        with self.assertRaisesRegex(ValueError, 'overlap'):
            visual_adapter.validate_duration(scene, 1.5)

    def test_geography_only_embeds_pinned_map_when_needed(self):
        brand = read_json(self.root / 'brand/brand.json')
        self.assertNotIn('world', visual_adapter.payload(self.data, brand))
        geo = read_json(kit.HOME / 'demo.json')['charts'][-1]
        self.data['visuals'] = {geo['id']:geo}
        self.data['scenes'] = [self.data['scenes'][0]]
        self.data['scenes'][0]['visual_id'] = geo['id']
        payload = visual_adapter.payload(self.data, brand)
        self.assertEqual(payload['world']['type'], 'FeatureCollection')
        self.assertTrue(payload['world']['features'])

    def test_html_escaped_and_classic_markup_unextended(self):
        data, _, captions, bounds = self.validate()
        data['scenes'][0]['content']['note'] = '<script>unsafe()</script>'
        content = workflow.build_html(data, captions, bounds)
        self.assertNotIn('<script>unsafe()', content)
        self.assertIn('&lt;script&gt;', content)
        data, _, captions, bounds = self.validate(self.seed)
        classic = workflow.build_html(data, captions, bounds)
        self.assertNotIn('visual-scene-data', classic)
        self.assertNotIn('echarts', classic)

    def test_tampered_vendor_fails_before_build(self):
        with patch.object(kit, 'verify_assets', side_effect=ValueError('Vendor hash drift')):
            with self.assertRaisesRegex(ValueError, 'Vendor hash drift'): self.validate()
        self.assertFalse(any((self.root / 'runs').iterdir()))

    def test_lock_covers_adapter_renderer_recipes_and_vendor(self):
        from tools.freeze import record
        manifest = record()['files']
        required = ('visual_adapter.py', 'chart-qa.mjs', 'media_backend.py', 'media_contract.py', 'native-capabilities.swift', 'ffmpeg_backend.py',
                    'tools/visual_library/kit.py', 'tools/visual_library/options.js',
                    'tools/visual_library/recipes.json', 'tools/visual_library/vendor/manifest.json',
                    'tools/visual_library/vendor/lucide-static/icons/bot.svg')
        actual = workflow.digest
        for target in required:
            self.assertIn(target, manifest)
            with patch.object(workflow, 'digest', side_effect=lambda path, target=target: '0' * 64 if path == workflow.HOME / target else actual(path)):
                with self.assertRaisesRegex(ValueError, 'Locked implementation changed'):
                    workflow.verify_lock()
        output = subprocess.check_output([sys.executable, '-B', str(workflow.HOME / 'tools/freeze.py')], text=True)
        self.assertEqual(json.loads(output)['files'], manifest)

    def test_payload_source_data_and_brand(self):
        brand = read_json(self.root / 'brand/brand.json')
        content = visual_adapter.payload(self.data, brand)
        self.assertEqual(content['colors'], brand['colors'])
        for name, source in self.data['visuals'].items():
            self.assertEqual(content['records'][name]['data'], source['data'])
            self.assertEqual(content['records'][name]['source'], source['source'])

    def test_numeric_boolean_nonfinite_and_oversized_visuals(self):
        metric = copy.deepcopy(read_json(kit.HOME / 'widgets.json')['charts'][1])
        for value in (True, float('nan'), float('inf')):
            bad = copy.deepcopy(metric); bad['data']['value'] = value
            with self.assertRaises(ValueError): visual_adapter.validate_records({bad['id']: bad})
        metric['insight'] = 'x' * 100_001
        with self.assertRaisesRegex(ValueError, '100 KB'):
            visual_adapter.validate_records({metric['id']: metric})


if __name__ == '__main__': unittest.main()


class Wave02RecordTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / 'channel'
        old = workflow.ROOT, workflow.RUNS
        self.addCleanup(lambda: (setattr(workflow, 'ROOT', old[0]), setattr(workflow, 'RUNS', old[1])))
        workflow.ROOT, workflow.RUNS = self.root, self.root / 'runs'
        self.episode = fixture(self.root)
        self.seed = read_json(self.episode)
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
        from widget_smoke import wave02_episode
        self.data = wave02_episode(self.seed)

    def validate(self, data=None):
        self.episode.write_text(json.dumps(self.data if data is None else data))
        return workflow.validate(self.episode)

    def test_prefixed_kinds_validate_with_derived_values(self):
        data, _, _, scenes = self.validate()
        records = visual_adapter.validate_records(data['visuals'])
        self.assertEqual(len(scenes), 4)
        self.assertEqual({r['library'] for r in records.values()}, {'wave02'})
        self.assertEqual(records['w02-confusion']['kind'], 'wave02:confusion')
        self.assertIn('precision', records['w02-confusion']['derived'])

    def test_unknown_or_unprefixed_wave02_kind_rejected(self):
        record = self.data['visuals']['w02-terminal']
        record['kind'] = 'wave02:nope'
        with self.assertRaises(ValueError): self.validate()
        record['kind'] = 'terminal'
        with self.assertRaises(ValueError): self.validate()

    def test_prefixed_heatmap_is_the_component_not_the_chart(self):
        from widget_smoke import wave02_episode
        data = wave02_episode(self.seed, 4, ('heatmap', 'quote', 'steps'))
        records = visual_adapter.validate_records(data['visuals'])
        self.assertEqual(records['w02-heatmap']['library'], 'wave02')
        self.assertIn('low', records['w02-heatmap']['derived'])
        with self.assertRaises(ValueError):
            visual_adapter.validate_records({'x': {**data['visuals']['w02-heatmap'], 'id': 'x', 'data': {'rows': [], 'columns': [], 'values': [], 'unit': ''}}})

    def test_scripts_and_assets_include_the_component_renderer(self):
        brand = read_json(self.root / 'brand/brand.json')
        html = visual_adapter.scripts(self.data, brand)
        self.assertIn('assets/wave02.js', html)
        self.assertIn('"library": "wave02"', html)
        output = self.root / 'runs' / 'x' / 'y'
        (output / 'assets').mkdir(parents=True)
        for name in ('visual-scenes.css', 'visual-scenes.js'):
            (output / 'assets' / name).write_text((workflow.TEMPLATE / 'assets' / name).read_text())
        visual_adapter.install_assets(output, self.data, brand)
        evidence = read_json(output / 'visual-evidence.json')
        self.assertIn('wave02.js', evidence['asset_hashes'])
        self.assertTrue((output / 'assets' / 'wave02.js').is_file())
