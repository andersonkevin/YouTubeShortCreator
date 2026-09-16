"""Wave 02 asset library: validators, catalog discovery, private offline builds."""
import copy
import json
from pathlib import Path
import tempfile
import unittest

from tools.visual_library import kit
from tools.visual_library.expansion.wave02 import build, schema

HOME = build.HOME


class Wave02FixtureTests(unittest.TestCase):
    def setUp(self):
        self.icons = kit.verify_assets()['icons']
        self.examples = kit.read_json(HOME / 'examples.json')
        self.stress = kit.read_json(HOME / 'stress.json')

    def component(self, kind, source=None):
        return copy.deepcopy(next(c for c in (source or self.examples)['components'] if c['kind'] == kind))

    def reject(self, record, message=None):
        with self.assertRaises(ValueError) as context:
            schema.validate_component(record, self.icons)
        if message:
            self.assertIn(message, str(context.exception))

    def test_examples_cover_every_kind_once(self):
        result = schema.validate_document(self.examples, self.icons)
        self.assertEqual({c['kind'] for c in result}, set(schema.KINDS))
        self.assertEqual(len(result), len(schema.KINDS))
        for c in result:
            self.assertEqual(c['status'], 'design_review')
            self.assertEqual(c['family'], schema.family(c['kind']))

    def test_every_variant_and_state_is_exercised(self):
        validated = [c for doc in (self.examples, self.stress) for c in schema.validate_document(doc, self.icons)]
        covered = {(c['kind'], c['variant']) for c in validated}
        expected = {(kind, v) for kind, (_, variants, _) in schema.KINDS.items() for v in variants}
        self.assertEqual(expected - covered, set())
        stated = {(c['kind'], key) for c in validated if c['state'] for key in c['state']}
        expected_states = {(kind, key) for kind, (_, _, keys) in schema.KINDS.items() for key in keys}
        self.assertEqual(expected_states - stated, set())

    def test_envelope_rejections(self):
        c = self.component('table'); c['kind'] = 'chart'; self.reject(c, 'Unsupported component kind')
        c = self.component('table'); c['variant'] = 'fancy'; self.reject(c, 'Unsupported variant')
        c = self.component('table'); c['css'] = ''; self.reject(c, 'Unexpected fields')
        c = self.component('table'); c['title'] = 'a<b'; self.reject(c, 'markup')
        c = self.component('table'); c['icon'] = 'remote'; self.reject(c, 'Unknown icon')
        c = self.component('histogram'); c['state'] = {'highlight': 0}; self.reject(c, 'no state')
        c = self.component('table'); c['state'] = {'highlight_row': 12}; self.reject(c, 'out of range')

    def test_kind_bounds(self):
        c = self.component('terminal'); c['data']['exit_code'] = 300; self.reject(c, 'exit_code')
        c = self.component('terminal'); c['data']['lines'][0]['kind'] = 'prompt'; self.reject(c, 'Line kind')
        c = self.component('logs'); c['data']['lines'][0]['level'] = 'FATAL'; self.reject(c, 'log level')
        c = self.component('payload'); c['data']['entries'][1]['key'] = c['data']['entries'][0]['key']; self.reject(c, 'Duplicate keys')
        c = self.component('payload'); c['data']['entries'][0]['type'] = 'date'; self.reject(c, 'value type')
        c = self.component('matrix'); c['data']['cells'][0][0] = 'maybe'; self.reject(c, 'yes, no, partial')
        c = self.component('matrix'); c['data']['cells'][0].pop(); self.reject(c, 'column mismatch')
        c = self.component('tree'); c['data']['nodes'][1]['depth'] = 2; self.reject(c, 'one level deeper')
        c = self.component('tree'); c['data']['nodes'][0]['depth'] = 1; self.reject(c)
        c = self.component('table'); c['data']['rows'][0].append('x'); self.reject(c, 'Row width')
        c = self.component('table'); c['data']['columns'][0]['align'] = 'center'; self.reject(c, 'align')
        c = self.component('histogram'); c['data']['edges'] = [0, 100, 50]; self.reject(c, 'increase')
        c = self.component('histogram'); c['data']['counts'] = [0, 0, 0, 0, 0]; self.reject(c, 'nonzero')
        c = self.component('histogram'); c['data']['marker']['value'] = 9999; self.reject(c, 'numeric')
        c = self.component('histogram'); c['data']['counts'][0] = 0.5
        self.assertEqual(schema.validate_component(c, self.icons)['derived']['total'], 53.5)
        c = self.component('boxplot'); c['data']['groups'][0]['q1'] = 5; self.reject(c, 'ordered')
        c = self.component('boxplot'); g = c['data']['groups'][0]; g.update(min=1, q1=1, median=1, q3=1, max=1); self.reject(c, 'nonzero range')
        c = self.component('waffle'); c['data']['parts'][0]['percent'] = 99; self.reject(c, 'exceed 100')
        c = self.component('waffle'); c['data']['parts'] = [{'label': 'Tiny', 'percent': 0.2}]
        derived = schema.validate_component(c, self.icons)['derived']
        self.assertEqual(derived['squares'], [1]); self.assertEqual(derived['flagged'], [True]); self.assertEqual(derived['remainder'], 99)
        c = self.component('percentiles'); c['data']['points'] = [{'label': 'p50', 'value': 120}, {'label': 'p75', 'value': 160}, {'label': 'p99', 'value': 4800}]; self.reject(c, 'too close for the linear')
        c['variant'] = 'ladder-log'; self.assertEqual(schema.validate_component(c, self.icons)['derived']['low'], 120)
        c['data']['points'][0]['value'] = 0; self.reject(c, 'positive')
        c = self.component('funnel'); c['data']['stages'][1]['value'] = 5000; self.reject(c, 'not increase')
        c = self.component('funnel'); c['data']['stages'][0]['value'] = 0; self.reject(c, 'First stage')
        c = self.component('funnel'); c['data']['stages'][-1]['value'] = 0
        self.assertEqual(schema.validate_component(c, self.icons)['derived']['share'][-1], 0)

    def test_document_rules(self):
        doc = copy.deepcopy(self.examples); doc['components'].append(doc['components'][0])
        with self.assertRaisesRegex(ValueError, 'Duplicate component IDs'):
            schema.validate_document(doc, self.icons)
        doc = copy.deepcopy(self.examples); doc['version'] = 3
        with self.assertRaises(ValueError):
            schema.validate_document(doc, self.icons)


class Wave02CatalogTests(unittest.TestCase):
    def test_index_and_cards_are_consistent(self):
        data = build.index()
        self.assertEqual(data['base_commit'], 'c0b275e07b1a399f0c75012f2bddde242f7d79dc')
        implemented = [a for a in data['assets'] if a['status'] == 'implemented']
        self.assertEqual({a['kind'] for a in implemented}, set(schema.KINDS))
        for asset in implemented:
            card = build.card(asset['id'])
            self.assertEqual(card['id'], asset['id'])
            self.assertFalse(card['production_scene_available'])
            self.assertEqual(card['human_review'], 'pending')
            for key in ('purpose', 'use_when', 'not_when', 'limits', 'provenance', 'licenses'):
                self.assertTrue(card[key].strip(), key)
            self.assertTrue(card['parameters'])
            self.assertEqual(card['qa']['script'], 'tools/visual_library/expansion/wave02/qa.mjs')
        for asset in data['assets']:
            self.assertIn(asset['family'], schema.FAMILIES)

    def test_card_and_search_boundaries(self):
        with self.assertRaises(ValueError):
            build.card('wave02:../kit')
        with self.assertRaises(ValueError):
            build.card('wave02:unknown')
        with self.assertRaises(ValueError):
            build.search(family='video')
        hits = build.search('exit code')
        self.assertEqual([h['id'] for h in hits], ['wave02:terminal'])
        self.assertTrue(all(h['family'] == 'data' for h in build.search(family='data')))
        self.assertEqual(build.search('no such term anywhere'), [])

    def test_index_rejects_status_drift(self):
        original = kit.read_json(HOME / 'catalog' / 'index.json')
        tampered = copy.deepcopy(original); tampered['assets'][0]['status'] = 'production'
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); (root / 'catalog' / 'cards').mkdir(parents=True)
            (root / 'catalog' / 'index.json').write_text(json.dumps(tampered))
            for name in ('examples.json', 'stress.json'):
                (root / name).write_text((HOME / name).read_text())
            for card in (HOME / 'catalog' / 'cards').glob('*.json'):
                (root / 'catalog' / 'cards' / card.name).write_text(card.read_text())
            with unittest.mock.patch.object(build, 'HOME', root):
                with self.assertRaises(ValueError):
                    build.index()

    def test_tokens_are_read_only_from_the_first_expansion(self):
        tokens = build.load_tokens()
        self.assertIn('study', tokens['palettes'])
        self.assertGreaterEqual(len(tokens['palettes']), 2)
        source = (HOME / 'wave02.js').read_text()
        # No color literals in the renderer: every color goes through the token set.
        import re
        self.assertEqual(re.findall(r'#[0-9a-fA-F]{6}\b', source), [])


class Wave02BuildTests(unittest.TestCase):
    def test_build_is_private_offline_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            output = build.build('examples.json', 'review', True, root, example=True)
            page = output.read_text()
            self.assertIn('window.visualLibraryData=', page)
            self.assertIn("default-src 'none'", page)
            self.assertNotIn('/Users/', page)
            record = json.loads((output.parent / 'build.json').read_text())
            self.assertEqual(record['wave'], 2)
            self.assertEqual(record['components'], len(schema.KINDS))
            self.assertFalse(record['production_integration'])
            self.assertEqual(record['slot'], [824, 820])
            self.assertTrue((output.parent / 'THIRD-PARTY-NOTICES.txt').is_file())
            with self.assertRaisesRegex(ValueError, 'already exists'):
                build.build('examples.json', 'review', True, root, example=True)
            with self.assertRaisesRegex(ValueError, 'Unknown palette'):
                build.build('examples.json', 'other', True, root, example=True, palette='neon')
            self.assertFalse((root / 'visuals' / 'other').exists())

    def test_writer_preflight_and_public_tree(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            for run_id, approved in (('review', False), ('../bad', True), (None, True)):
                with self.assertRaises(ValueError):
                    build.build('examples.json', run_id, approved, root, example=True)
            with self.assertRaises(ValueError):
                build.build('examples.json', 'review', True, kit.HOME, example=True)
            with self.assertRaises(ValueError):
                build.build('../schema.py', 'review', True, root, example=True)
            self.assertEqual(list(root.iterdir()), [])

    def test_release_audit_includes_wave_and_excludes_private_runs(self):
        from tools import release
        names = {str(p.relative_to(release.HOME)) for p in release.files()}
        for name in ('tools/visual_library/expansion/wave02/schema.py', 'tools/visual_library/expansion/wave02/wave02.js',
                     'tools/visual_library/expansion/wave02/qa.mjs', 'tools/visual_library/expansion/wave02/catalog/index.json',
                     'tests/test_visual_wave02.py'):
            self.assertIn(name, names)
        self.assertFalse(any(name.startswith('workspaces/') for name in names))

    def test_qa_script_boundaries(self):
        qa = (HOME / 'qa.mjs').read_text()
        for needle in ("route(/^https?:/", "'--approve-write'", 'Truncated label', 'Text occluded', 'Color outside the token set', 'Palette switch did not change colors', 'getComputedStyle(t.el).fontSize'):
            self.assertIn(needle, qa)
        self.assertNotIn('fetch(', qa)
        self.assertNotIn('/ scale;', qa.split('fontSize')[1][:80])


import unittest.mock  # noqa: E402

if __name__ == '__main__':
    unittest.main()
