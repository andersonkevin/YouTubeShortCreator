import copy
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import hashlib
import json
from html.parser import HTMLParser

import branding
import production_visuals as production
from tools import vendor_source_stages as vendor


class SourceStageContracts(unittest.TestCase):
    def test_retained_template_uses_only_packaged_scripts_under_existing_csp(self):
        assets = Path(production.__file__).parent/'templates/v1/assets'
        script = (assets/'production-source-templates.js').read_text()
        templates = json.loads(script.removeprefix('window.ShortCreatorSourceTemplates=Object.freeze(').removesuffix(');\n'))
        scripts = []
        class Parser(HTMLParser):
            def handle_starttag(self, tag, attrs):
                if tag == 'script': scripts.append(dict(attrs))
        Parser().feed(templates['frost-orbit'])
        self.assertEqual(len(scripts), 5)
        for attrs in scripts:
            self.assertEqual(set(attrs), {'src'})
            self.assertTrue(attrs['src'].startswith('assets/production-'))
            self.assertTrue((assets/Path(attrs['src']).name).is_file())

    def scene(self, style):
        content = {'style': style, 'heading': 'Build with purpose', 'caption': 'Make it clear', 'source': 'Internal test'}
        if style == 'frost-orbit': content['word'] = 'CREATE'
        return {'kind': 'source-stage', 'name': 'Source stage', 'first_cue': 0, 'cues': [0, 1],
                'transition': 'cut-left', 'content': content}

    def validate(self, scene, gap):
        return production.validate_scenes([scene], {}, [{'start': .1, 'end': 1},
            {'start': .1 + gap, 'end': gap + 1}], gap + 3)

    def test_source_duration_boundary_and_closed_inputs(self):
        for style, duration in production.SOURCE_STAGE_DURATIONS.items():
            scene = self.scene(style);original = copy.deepcopy(scene)
            self.assertEqual(self.validate(scene, duration), [(0, duration + 3)])
            self.assertEqual(scene, original)
            with self.assertRaises(ValueError): self.validate(scene, duration - 1 / 30)
            for field in ('url', 'html', 'script', 'font', 'model', 'quality'):
                invalid = copy.deepcopy(scene);invalid['content'][field] = '../untrusted'
                with self.subTest(field=field), self.assertRaises(ValueError): self.validate(invalid, duration)

    def test_compiler_selects_only_needed_source_resources(self):
        for style in production.SOURCE_STAGE_DURATIONS:
            data = {'format': 'portrait', 'scenes': [self.scene(style)], 'assets': {}}
            html = production.scripts(data, {'colors': branding.PALETTES['violet']})
            self.assertEqual(html.count('src="assets/production-source-stages.js"'), 1)
            self.assertIn('production-source-fonts.js', html)
            self.assertEqual('production-source-ice.js' in html, style == 'frost-orbit')
            self.assertEqual('production-source-matcap.js' in html, style == 'glass-shard')
            self.assertNotIn('src="https:', html)
        data['scenes'] = []
        self.assertNotIn('production-source-', production.scripts(data, {'colors': branding.PALETTES['violet']}))

    def test_vendor_rejects_changed_or_unknown_sources_without_writes(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            with self.assertRaises(ValueError): vendor.read_source(root, '../anything')
            source = next(iter(vendor.PINS));path = root/source;path.parent.mkdir(parents=True)
            path.write_text('changed source')
            with self.assertRaises(ValueError): vendor.read_source(root, source)
            self.assertEqual(path.read_text(), 'changed source')
            with self.assertRaises(ValueError): vendor.replace_once('two two', 'two', 'new')

    def test_lossless_packaging_preserves_transparent_rgb(self):
        import base64
        import hashlib
        import io
        from PIL import Image
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'texture.png';image = Image.new('RGBA', (2, 2), (123, 45, 67, 0));image.save(path)
            packet = vendor.image_packet(path, hashlib.sha256(path.read_bytes()).hexdigest())
            with Image.open(io.BytesIO(base64.b64decode(packet.split(',', 1)[1]))) as decoded:
                self.assertEqual(decoded.convert('RGBA').tobytes(), image.tobytes())

    def test_install_copies_only_hash_verified_brand_font_payloads_without_overwrite(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder);brand = root/'brand';brand.mkdir();out = root/'run';(out/'assets').mkdir(parents=True)
            files = {}
            for role in ('display', 'body', 'mono'):
                raw = (role+'-fixture').encode();path = out/'assets'/(role+'.ttf');path.write_bytes(raw)
                files['assets/'+path.name] = hashlib.sha256(raw).hexdigest()
            (brand/'approval.json').write_text(json.dumps({'files':files}))
            fonts = {role:out/'assets'/(role+'.ttf') for role in ('display','body','mono')}
            data = {'scenes':[self.scene('glass-shard')], 'assets':{}}
            with patch.object(branding, 'verified'), patch.object(branding, 'fonts_in', return_value=fonts):
                production.install_assets(out, data, root, brand_root=root, template_hash='test-only')
                self.assertIn(files['assets/body.ttf'], (out/'assets/production-source-fonts.js').read_text())
                with self.assertRaises(FileExistsError):
                    production.install_assets(out, data, root, brand_root=root, template_hash='test-only')
                (out/'assets/body.ttf').write_bytes(b'changed')
                with self.assertRaisesRegex(ValueError, 'differs from approved brand'):
                    production.install_assets(out, data, root, brand_root=root, template_hash='test-only')
