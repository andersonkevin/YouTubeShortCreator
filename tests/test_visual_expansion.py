"""Expansion pack: bounded validation, catalog integrity, private offline builds."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
import unittest.mock

from tools.visual_library import kit
from tools.visual_library.expansion import build, schema

HOME = build.HOME


class ExpansionFixtureTests(unittest.TestCase):
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
        self.assertEqual(len(result), len(schema.KINDS))
        self.assertEqual({c['kind'] for c in result}, set(schema.KINDS))
        self.assertTrue(all(c['status'] == 'design_review' for c in result))

    def test_stress_and_examples_cover_every_variant(self):
        covered = {(c['kind'], c['variant']) for doc in (self.examples, self.stress) for c in schema.validate_document(doc, self.icons)}
        expected = {(kind, variant) for kind, (variants, _) in schema.KINDS.items() for variant in variants}
        self.assertEqual(expected - covered, set())

    def test_fixture_data_is_declared_illustrative_or_flagged(self):
        for doc in (self.examples, self.stress):
            for c in doc['components']:
                self.assertIn(c['source']['kind'], ('illustrative', 'measured'))
                self.assertEqual(c['source']['as_of'], '2026-09-15')

    def test_envelope_rejections(self):
        c = self.component('gate'); c['kind'] = 'script'; self.reject(c, 'Unsupported component kind')
        c = self.component('gate'); c['variant'] = 'diagonal'; self.reject(c, 'Unsupported variant')
        c = self.component('gate'); c['style'] = {}; self.reject(c, 'Unexpected fields')
        c = self.component('gate'); c['title'] = '<b>x</b>'; self.reject(c, 'markup')
        c = self.component('gate'); c['icon'] = '../private'; self.reject(c, 'Unknown icon')
        c = self.component('gate'); del c['source']; self.reject(c)
        c = self.component('budget'); c['state'] = {'current': 0}; self.reject(c, 'no state')
        c = self.component('stages'); c['state'] = {'current': 9}; self.reject(c, 'out of range')
        c = self.component('stages'); c['state'] = {'other': 0}; self.reject(c, 'Unexpected fields')

    def test_kind_specific_bounds(self):
        c = self.component('agent-loop'); c['data']['steps'].append({'label': 'Fifth', 'icon': 'zap'}); self.reject(c, 'Ring shows at most four')
        c = self.component('agent-loop'); c['variant'] = 'ladder'; c['data']['steps'].append({'label': 'Fifth', 'icon': 'zap'})
        self.assertEqual(schema.validate_component(c, self.icons)['variant'], 'ladder')
        c = self.component('agent-loop'); c['data']['steps'][0]['label'] = 'A label far too long'; self.reject(c, 'label length')
        c = self.component('retrieval'); c['data']['chunks'][0]['score'] = 1.5; self.reject(c, 'numeric')
        c = self.component('retrieval'); result = schema.validate_component(c, self.icons)
        self.assertEqual(result['derived']['ranked'][0], 0)
        c = self.component('gate'); c['state'] = {'outcome': 'maybe'}; self.reject(c, 'Outcome')
        c = self.component('retry-queue'); c['data']['attempts'][0]['outcome'] = 'ok'; c['data']['attempts'][1]['outcome'] = 'ok'; self.reject(c, 'one successful')
        c = self.component('budget'); c['data']['parts'][0]['value'] = 1e5; self.reject(c, 'exceed capacity')
        c = self.component('budget'); result = schema.validate_component(c, self.icons)
        self.assertEqual(result['derived']['used'] + result['derived']['headroom'], c['data']['capacity'])
        c = self.component('states'); c['data']['transitions'][0]['to'] = 0; self.reject(c, 'Self-transitions')
        c = self.component('states'); c['data']['transitions'][0]['to'] = 7; self.reject(c, 'out of range')
        c = self.component('delta'); c['data']['rows'][0]['change'] = 'faster'; self.reject(c, 'change token')
        c = self.component('trace'); c['data']['spans'][0]['depth'] = 1; self.reject(c, 'root span')
        c = self.component('trace'); c['data']['spans'][1]['end'] = c['data']['spans'][1]['start']; self.reject(c, 'interval')
        c = self.component('annotated-code'); c['data']['lines'][0]['note'] = 'x' * 41; self.reject(c, 'Note too long')
        c = self.component('annotated-code'); c['data']['lines'][0]['note'] = '<script>'; self.reject(c, 'markup')
        c = self.component('annotated-code'); c['variant'] = 'inline'; c['data']['lines'].extend([{'code': 'x', 'note': ''}] * 2); self.reject(c, 'Inline')
        c = self.component('contract'); c['data']['fields'][0]['required'] = 'yes'; self.reject(c, 'boolean')
        c = self.component('contract'); c['data']['fields'][1]['name'] = c['data']['fields'][0]['name']; self.reject(c, 'Duplicate')

    def test_document_rules(self):
        doc = copy.deepcopy(self.examples); doc['components'].append(doc['components'][0])
        with self.assertRaisesRegex(ValueError, 'Duplicate component IDs'):
            schema.validate_document(doc, self.icons)
        doc = copy.deepcopy(self.examples); doc['version'] = 2
        with self.assertRaises(ValueError):
            schema.validate_document(doc, self.icons)


class ExpansionCatalogTests(unittest.TestCase):
    def test_catalog_integrity(self):
        data = build.catalog()
        self.assertEqual(data['base_commit'], '6ffd3cb9aab6566e21d729ef7f8b963acd8f3f60')
        kinds = {a['kind'] for a in data['assets']}
        self.assertEqual(kinds, {'component', 'composition', 'chart-variant'})
        components = [a for a in data['assets'] if a['kind'] == 'component']
        compositions = [a for a in data['assets'] if a['kind'] == 'composition']
        variants = [a for a in data['assets'] if a['kind'] == 'chart-variant']
        self.assertEqual(len(components), len(schema.KINDS))
        self.assertGreaterEqual(len(compositions), 6)
        self.assertGreaterEqual(len(variants), 4)
        for asset in data['assets']:
            self.assertEqual(asset['status'], 'design_review')
            for key in ('purpose', 'use_when', 'misuse', 'integration'):
                self.assertTrue(asset[key].strip())

    def test_catalog_rejects_drift(self):
        data = build.catalog()
        original = kit.read_json(HOME / 'catalog.json')
        tampered = copy.deepcopy(original); tampered['assets'][0]['status'] = 'production'
        with tempfile.TemporaryDirectory() as temp, unittest.mock.patch.object(build, 'HOME', Path(temp)):
            Path(temp, 'catalog.json').write_text(json.dumps(tampered))
            Path(temp, 'examples.json').write_text((HOME / 'examples.json').read_text())
            Path(temp, 'recipes.json').write_text((HOME / 'recipes.json').read_text())
            with self.assertRaises(ValueError):
                build.catalog()
        self.assertEqual(data['status'], 'design_review')

    def test_expansion_recipes_use_pinned_icons_and_do_not_collide(self):
        icons = kit.verify_assets()['icons']
        base, extra = build.load_recipes(icons)
        self.assertEqual(len(base), 6)
        self.assertEqual(len(extra), 8)
        self.assertFalse(set(base) & set(extra))
        for recipe in extra.values():
            self.assertIn(recipe['base'], icons)
            self.assertIn(recipe['badge'], icons)
        # A merged file would stay within the library's sixteen-recipe ceiling.
        kit.validate_recipes({**base, **extra}, icons)

    def test_tokens_are_hex_and_brand_neutral(self):
        tokens = build.load_tokens()
        self.assertIn('study', tokens['palettes'])
        self.assertGreaterEqual(len(tokens['palettes']), 2)
        text = (HOME / 'tokens.json').read_text() + (HOME / 'expansion.js').read_text() + (HOME / 'examples.json').read_text()
        for brand in ('Cognativ', 'COGNATIV', 'Signal Lab'):
            self.assertNotIn(brand, text)


class ExpansionBuildTests(unittest.TestCase):
    def test_build_is_private_offline_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            output = build.build('examples.json', 'review', True, root, example=True)
            self.assertTrue(output.is_file())
            page = output.read_text()
            self.assertIn('window.visualLibraryData=', page)
            self.assertIn("default-src 'none'", page)
            self.assertNotIn('/Users/', page)
            self.assertNotIn('COGNATIV', page)
            record = json.loads((output.parent / 'build.json').read_text())
            self.assertEqual(record['components'], len(schema.KINDS))
            self.assertEqual(record['design_status'], 'design_review')
            self.assertFalse(record['production_integration'])
            self.assertEqual(record['slot'], [824, 820])
            self.assertIn('kit.py', record['library_hashes'])
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
                build.build('../kit.py', 'review', True, root, example=True)
            self.assertEqual(list(root.iterdir()), [])

    def test_release_audit_includes_pack_and_excludes_private_runs(self):
        from tools import release
        names = {str(p.relative_to(release.HOME)) for p in release.files()}
        for name in ('tools/visual_library/expansion/schema.py', 'tools/visual_library/expansion/expansion.js', 'tools/visual_library/expansion/qa.mjs',
                     'tools/visual_library/expansion/catalog.json', 'tests/test_visual_expansion.py', 'docs/ASSET-EXPANSION.md'):
            self.assertIn(name, names)
        self.assertFalse(any(name.startswith('workspaces/') for name in names))

    def test_qa_script_has_no_network_and_requires_approval(self):
        qa = (HOME / 'qa.mjs').read_text()
        self.assertIn("route(/^https?:/", qa)
        self.assertIn("'--approve-write'", qa)
        self.assertIn('Truncated label', qa)
        self.assertIn('Text occluded', qa)
        self.assertNotIn('fetch(', qa)


if __name__ == '__main__':
    unittest.main()
