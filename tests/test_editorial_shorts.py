"""Reusable editorial authoring preserves private brands and legacy boundaries."""
import copy
from pathlib import Path
import shutil
import tempfile
import unittest

import branding
import editorial_visuals
import visual_adapter
import workflow
import ysc
from safety import read_json, write_json
from test_workflow import brand_record, fixture


def diagram(name='first', variant='flow'):
    count = 3 if variant == 'worlds' else 2
    return {'id': name, 'kind': 'editorial', 'title': 'Review the evidence',
            'insight': 'A synthetic example, not a measured outcome.', 'icon': 'layers',
            'source': {'kind': 'illustrative', 'label': 'Synthetic fixture',
                       'reference': 'Original test data', 'as_of': '2026-10-18'},
            'data': {'variant': variant, 'labels': ['Input', 'Review', 'Decision'][:count],
                     'details': ['Read the source', 'Check the claim', 'Choose a step'][:count],
                     'values': [2, 4] if variant in ('bars', 'curve', 'clock', 'axes') else [],
                     'unit': 'Example units', 'maximum': 10}}


def board():
    records = {name: diagram(name, variant) for name, variant in
               [('first', 'flow'), ('second', 'bars'), ('third', 'rings')]}
    scenes = [{'layout': 'visual-library', 'name': name, 'first_cue': i * 2,
               'content': {'eyebrow': 'SYNTHETIC EXAMPLE', 'heading_1': 'Check the evidence.',
                           'heading_2': 'Choose the next step.', 'note': 'Illustration only. Review before use.'},
               'motion': {'visual': {'enter': .1, 'fill': [.2, .8]}},
               'visual_id': name, 'symbol': 'icon:layers'} for i, name in enumerate(records)]
    return {'version': 1, 'visuals': records, 'scenes': scenes}


class EditorialShortsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / 'seed'
        old = workflow.ROOT, workflow.RUNS
        self.addCleanup(lambda: (setattr(workflow, 'ROOT', old[0]), setattr(workflow, 'RUNS', old[1])))
        workflow.ROOT, workflow.RUNS = self.root, self.root / 'runs'
        self.episode = fixture(self.root)

    def create(self, root=None, name='editorial', selected=None):
        root = root or self.root
        write_json(root / 'intake' / (name + '.json'), selected or board())
        return ysc.new_episode(root, name, 'intake/voice.wav', 'intake/transcript.json',
                               'intake/graphic.png', 'intake/captions.json', storyboard='intake/' + name + '.json')

    def light_root(self):
        root = Path(self.temp.name).resolve() / 'light'
        brand = brand_record()
        brand.update(version=2, theme='light-editorial', colors={
            'background': '#ffffff', 'ink': '#16181d', 'accent': '#155e75', 'secondary': '#9f1239'})
        branding.create(root, brand, {r: branding.font_path(r) for r in ('display', 'body', 'mono')})
        branding.approve(root, workflow.verify_lock())
        for file in (self.root / 'intake').iterdir():
            shutil.copyfile(file, root / 'intake' / file.name)
        workflow.ROOT, workflow.RUNS = root, root / 'runs'
        return root, brand

    def test_normal_authoring_validation_html_and_source_preservation(self):
        original = board()
        episode = self.create(selected=original)
        data, _, captions, bounds = workflow.validate(episode)
        self.assertEqual(data['version'], 2)
        self.assertEqual(data['visuals'], original['visuals'])
        html = workflow.build_html(data, captions, bounds)
        self.assertIn('editorial-visuals.js', html)
        self.assertNotIn('news-media.js', html)
        self.assertNotIn('measured-segment', html)

    def test_light_brand_and_measured_highlights(self):
        root, brand = self.light_root()
        episode = self.create(root)
        data, inputs, captions, bounds = workflow.validate(episode)
        transcript = read_json(inputs['transcript'])
        html = workflow.build_html(data, captions, bounds, transcript['words'])
        self.assertIn('measured-segment', html)
        self.assertIn('.caption-word{display:inline}', branding.brand_css(brand, root / 'brand/assets'))
        self.assertEqual(read_json(root / 'brand/brand.json'), brand)
        with self.assertRaisesRegex(ValueError, 'Measured caption'):
            workflow.build_html(data, captions, bounds)

    def test_highlights_never_rewrite_approved_text(self):
        _, inputs, captions, _ = workflow.validate(self.episode)
        transcript = read_json(inputs['transcript'])
        workflow.validate_highlights(captions, transcript['words'])
        captions['cues'][0]['text'] = captions['cues'][0]['text'].upper()
        with self.assertRaisesRegex(ValueError, 'exact caption'):
            workflow.validate_highlights(captions, transcript['words'])

    def test_light_brand_rejects_v1_and_existing_v3(self):
        root, _ = self.light_root()
        with self.assertRaisesRegex(ValueError, 'storyboard'):
            ysc.new_episode(root, 'no-board', 'intake/voice.wav', 'intake/transcript.json',
                            'intake/graphic.png', 'intake/captions.json')
        self.assertFalse((root / 'episodes/no-board').exists())
        with self.assertRaisesRegex(ValueError, 'legacy Shorts only'):
            ysc.new_episode(root, 'no-v3', 'intake/voice.wav', 'intake/transcript.json',
                            'intake/graphic.png', 'intake/captions.json', output_format='landscape',
                            storyboard='intake/unsupported.json')
        self.assertFalse((root / 'episodes/no-v3').exists())
        data = read_json(self.episode)
        write_json(root / 'episodes/unsupported.json', data)
        with self.assertRaisesRegex(ValueError, 'Light editorial'):
            workflow.validate(root / 'episodes/unsupported.json')

    def test_light_contrast_and_closed_configuration(self):
        _, brand = self.light_root()
        for change in ({'ink': '#ffffff'}, {'accent': '#ffff00'}, {'secondary': '#eeeeee'}):
            broken = copy.deepcopy(brand)
            broken['colors'].update(change)
            with self.assertRaises(ValueError):
                branding.validate_brand(broken)
        brand['css'] = 'arbitrary'
        with self.assertRaises(ValueError):
            branding.validate_brand(brand)

    def test_all_diagrams_validate_without_mutation(self):
        for variant in editorial_visuals.VARIANTS:
            record = diagram(variant=variant)
            self.assertEqual(editorial_visuals.validate(record, ['layers']), record)
        for value in (True, float('nan'), -1, 11):
            record = diagram(variant='bars')
            record['data']['values'][0] = value
            with self.assertRaises(ValueError):
                editorial_visuals.validate(record, ['layers'])

    def test_duplicate_keys_and_unsafe_storyboard_rejected_before_creation(self):
        (self.root / 'intake/duplicate.json').write_text('{"version":1,"version":2}')
        for path in ('../escape.json', 'intake/duplicate.json'):
            with self.assertRaises(ValueError):
                ysc.new_episode(self.root, 'bad', 'intake/voice.wav', 'intake/transcript.json',
                                'intake/graphic.png', 'intake/captions.json', storyboard=path)
            self.assertFalse((self.root / 'episodes/bad').exists())

    def test_unsupported_decorative_hooks_are_not_accepted(self):
        record = diagram()
        scene = board()['scenes'][0]
        scene['presentation'] = {**visual_adapter.DEFAULT_PRESENTATION, 'story': {'preset': 'flow-trace', 'cues': [0, 1]}}
        with self.assertRaisesRegex(ValueError, 'incompatible'):
            visual_adapter.validate_scene(scene, {'first': record})

    def test_editorial_reveals_must_finish_before_the_scene_ends(self):
        record = diagram(variant='terrain')
        with self.assertRaisesRegex(ValueError, 'reveals exceed'):
            visual_adapter.validate_duration(board()['scenes'][0], 2, record)
        visual_adapter.validate_duration(board()['scenes'][0], 3, record)

    def test_storyboard_missing_and_unused_records_are_rejected(self):
        for broken in ('missing', 'unused'):
            selected = board()
            if broken == 'missing':
                selected['scenes'][0]['visual_id'] = 'unknown'
                with self.assertRaises(ValueError):
                    self.create(name=broken, selected=selected)
            else:
                selected['visuals']['unused'] = diagram('unused')
                episode = self.create(name=broken, selected=selected)
                with self.assertRaisesRegex(ValueError, 'exactly once'):
                    workflow.validate(episode)

    def test_build_installs_reusable_assets_and_review_evidence(self):
        episode = self.create()
        data = read_json(episode)
        output = self.root / 'runs/payload'
        shutil.copytree(workflow.TEMPLATE / 'assets', output / 'assets')
        visual_adapter.install_assets(output, data, brand_record())
        receipt = read_json(output / 'visual-evidence.json')
        self.assertEqual(receipt['status'], 'review_required')
        self.assertIn('editorial-visuals.js', receipt['asset_hashes'])

    def test_public_storyboards_use_the_normal_cli_authoring_contract(self):
        root, _ = self.light_root()
        for name, source in [('voice.wav', 'type-story/narration.wav'),
                             ('transcript.json', 'type-story/transcript.json'),
                             ('captions.json', 'type-story/captions.json'),
                             ('source.png', 'camera-story/cover.png')]:
            # These are immutable public example inputs, copied into this test's private intake.
            (root / 'intake' / name).write_bytes((workflow.HOME / 'examples/v0.5.0' / source).read_bytes())
        for kind in ('educational', 'news'):
            source = workflow.HOME / 'examples/editorial-shorts' / (kind + '.json')
            ysc.import_file(root, str(source), kind + '.json')
            episode = ysc.new_episode(root, kind, 'intake/voice.wav', 'intake/transcript.json',
                                       'intake/source.png', 'intake/captions.json', storyboard='intake/' + kind + '.json')
            data, inputs, captions, bounds = workflow.validate(episode)
            workflow.build_html(data, captions, bounds, read_json(inputs['transcript'])['words'])
            self.assertEqual(len([key for key in inputs if key.startswith('news:')]), 3 if kind == 'news' else 0)
            before = episode.read_bytes()
            with self.assertRaises(ValueError):
                ysc.new_episode(root, kind, 'intake/voice.wav', 'intake/transcript.json',
                                'intake/source.png', 'intake/captions.json', storyboard='intake/' + kind + '.json')
            self.assertEqual(episode.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
