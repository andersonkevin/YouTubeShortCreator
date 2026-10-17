import copy
from pathlib import Path
import tempfile
import unittest
from PIL import Image
import production_visuals as production


class InterfacePresetTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.image = Path(self.directory.name) / 'background.png'
        Image.new('RGB', (64, 64), '#140b30').save(self.image)
        self.cues = [{'start': .1, 'end': 1}, {'start': 3, 'end': 4}]
        self.scene = {'kind': 'interface', 'name': 'Interface', 'first_cue': 0, 'cues': [0, 1],
                      'transition': 'cut-left', 'content': {'heading': 'Explicit content', 'source': 'Internal test',
                      'style': 'chat', 'items': [{'label': 'First', 'body': 'Literal <script> text.', 'side': 'sent'},
                                               {'label': 'Second', 'body': 'Supplied response.', 'side': 'received'}]}}

    def validate(self, scene):
        assets = {'background': self.image} if scene['content'].get('variant') in production.LIQUID_GLASS_VARIANTS + ('ui-3d-reveal',) else {}
        if scene['content'].get('variant') == 'glass-parallax':
            return production.validate_scenes([scene], {'background': self.image},
                [{'start': .1, 'end': 1}, {'start': 20.1, 'end': 21}], 22)
        if scene['content'].get('variant') == 'shatter-panels':
            return production.validate_scenes([scene], {'background': self.image, 'second': self.image},
                [{'start': .1, 'end': 1}, {'start': 12.1, 'end': 13}], 14)
        if scene['content'].get('variant') == 'portal-panels':
            return production.validate_scenes([scene], {'background': self.image, 'second': self.image},
                [{'start': .1, 'end': 1}, {'start': 10.1, 'end': 11}], 12)
        if scene['content'].get('variant') == 'liquid-panels':
            return production.validate_scenes([scene], {'background': self.image, 'second': self.image},
                [{'start': .1, 'end': 1}, {'start': 5.1, 'end': 6}, {'start': 12.1, 'end': 13}], 14)
        if scene['content'].get('variant') == 'ui-3d-reveal':
            return production.validate_scenes([scene], assets, [{'start': .1, 'end': 1}, {'start': 13.1, 'end': 14}], 15)
        if scene['content'].get('variant') in ('product-canvas', 'app-install'):
            gap, duration = (12, 15) if scene['content']['variant'] == 'product-canvas' else (7, 10)
            return production.validate_scenes([scene], assets, [{'start': .1, 'end': 1}, {'start': gap+.1, 'end': gap+1}], duration)
        if scene['content'].get('variant') == 'answer-rank':
            return production.validate_scenes([scene], assets, [{'start': .1 + 2*i, 'end': 1 + 2*i} for i in range(4)], 9)
        if scene['content'].get('variant') in production.CHAT_EXCHANGE_VARIANTS:
            count = len(scene['cues'])
            return production.validate_scenes([scene], assets, [{'start': .1 + 3*i, 'end': 1 + 3*i} for i in range(count)], count*3 + 1)
        return production.validate_scenes([scene], assets, self.cues, 6)

    def test_every_variant_is_bounded_to_its_declared_style(self):
        for style, variants in production.INTERFACE_VARIANTS.items():
            for variant in variants:
                scene = copy.deepcopy(self.scene)
                scene['content'].update(style=style, variant=variant)
                if variant in production.LIQUID_GLASS_VARIANTS:
                    scene['content']['image'] = 'background'
                if style != 'chat':
                    for item in scene['content']['items']: item.pop('side')
                if style == 'settings':
                    for index, item in enumerate(scene['content']['items']): item['enabled'] = index == 1
                if style == 'social':
                    for item in scene['content']['items']:
                        item.update(context='Internal example', action={'before': 'Read', 'after': 'Read'})
                for item in scene['content']['items']:
                    if variant == 'micro-badge': item['badge'] = 'New'
                    if variant == 'micro-check': item['checked'] = True
                    if variant == 'profile-count': item['stat'] = {'value': '42', 'label': 'Example count'}
                    if variant == 'vector-editor': item['tool'] = 'pen'
                    if variant == 'text-select': item['selection'] = item['body']
                if variant == 'answer-rank':
                    scene['cues'] = [0, 1, 2, 3]
                    scene['content'].update(prompt='Which option fits?', lead='Explicit choices', rank=2,
                        items=[{'label': f'Option {i}', 'body': 'Supplied detail.'} for i in range(4)])
                if variant == 'product-canvas':
                    scene['content'].update(items=[{'label': f'Card {i}', 'body': 'Supplied detail'} for i in range(3)],
                        hero={'title': 'A workspace', 'body': 'Supplied explanation', 'action': 'Explore'},
                        actors=['Designer', 'Engineer', 'Reviewer'], comment={'text': 'Review the cards', 'resolved': True})
                if variant == 'app-install':
                    scene['content'].update(items=[{'label': f'App {i}', 'body': 'Supplied detail', 'icon': 'code'} for i in range(8)],
                        selected=5, ui={'title': 'Search', 'query': 'Work tools', 'get': 'GET', 'open': 'OPEN', 'ready': 'Ready'},
                        detail={'body': 'Supplied explanation', 'facts': [{'label': 'Type', 'value': 'Tool'}, {'label': 'Mode', 'value': 'Local'}, {'label': 'Input', 'value': 'Files'}]})
                if variant == 'note-scroll':
                    scene['content']['title'] = 'Supplied document'
                    scene['content']['items'] = [item['body'] for item in scene['content']['items']]
                if variant == 'ui-3d-reveal':
                    scene['content'].pop('items')
                    scene['content'].update(image='background', layers=['Page', 'Hero', 'Details'], selected=1,
                        properties=[{'label': 'Mode', 'value': 'Local'}, {'label': 'Frame', 'value': 'Wide'}, {'label': 'Status', 'value': 'Draft'}],
                        selection={'x': .1, 'y': .1, 'width': .6, 'height': .5}, tagline='Review the details', action='Explore')
                if variant == 'glass-parallax':
                    scene['content'].pop('items')
                    scene['content']['image'] = 'background'
                if variant in ('liquid-panels', 'portal-panels', 'shatter-panels'):
                    scene['content'].pop('items')
                    scene['content']['images'] = ['background', 'second']
                    scene['cues'] = [0, 1, 2] if variant == 'liquid-panels' else [0, 1]
                if variant == 'answer-stream':
                    scene['content']['table'] = {'headers': ['Option', 'Detail', 'Source'], 'rows': [['A', 'First', 'Internal'], ['B', 'Second', 'Internal']]}
                    scene['cues'] = [0, 1, 2, 3]
                if variant == 'research-stream':
                    scene['content']['activity'] = {'steps': ['First', 'Second'], 'summary': 'Complete'}
                    scene['cues'] = [0, 1, 2]
                end = len(scene['cues'])*3 + 1 if variant in production.CHAT_EXCHANGE_VARIANTS else 9 if variant == 'answer-rank' else 6
                if variant in ('product-canvas', 'app-install'): end = 15 if variant == 'product-canvas' else 10
                if variant == 'ui-3d-reveal': end = 15
                if variant == 'liquid-panels': end = 14
                if variant == 'portal-panels': end = 12
                if variant == 'shatter-panels': end = 14
                if variant == 'glass-parallax': end = 22
                self.assertEqual(self.validate(scene), [(0, end)])
                scene['content']['variant'] = '../' + variant
                with self.assertRaises(ValueError): self.validate(scene)
        for variant in (None, {}, ['sheet'], 'sheet', 'script'):
            scene = copy.deepcopy(self.scene)
            scene['content']['variant'] = variant
            with self.assertRaises(ValueError): self.validate(scene)

    def test_feedback_states_are_explicit_and_never_inferred(self):
        scene = copy.deepcopy(self.scene)
        scene['content']['style'] = 'feedback'
        for item, state in zip(scene['content']['items'], ['error', 'valid']):
            item.pop('side')
            item['state'] = state
        self.assertEqual(self.validate(scene), [(0, 6)])
        for value in (True, 1, [], None, 'success', 'unknown'):
            bad = copy.deepcopy(scene)
            bad['content']['items'][0]['state'] = value
            with self.assertRaises(ValueError): self.validate(bad)
        scene['content']['items'][0].pop('state')
        with self.assertRaises(ValueError): self.validate(scene)

    def test_presets_retain_closed_fields_and_exact_cues(self):
        scene = copy.deepcopy(self.scene)
        scene['content'].update(variant='bottom-stack', typing_indicator=True)
        self.assertEqual(self.validate(scene), [(0, 6)])
        for key, value in [('html', '<script>'), ('font', 'Other'), ('speed', 5), ('receipt', 'Delivered')]:
            bad = copy.deepcopy(scene)
            bad['content'][key] = value
            with self.assertRaises(ValueError): self.validate(bad)
        scene['cues'] = [0]
        with self.assertRaises(ValueError): self.validate(scene)

    def test_navigation_labels_have_a_fixed_width_budget(self):
        scene = copy.deepcopy(self.scene)
        scene['content'].update(style='steps', variant='tabs')
        for item in scene['content']['items']: item.pop('side')
        self.assertEqual(self.validate(scene), [(0, 6)])
        scene['content']['items'][0]['label'] = 'Fifteen letters'
        with self.assertRaises(ValueError): self.validate(scene)


if __name__ == '__main__':
    unittest.main()
