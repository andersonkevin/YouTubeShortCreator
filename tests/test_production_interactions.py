import copy
from pathlib import Path
import tempfile
import unittest

from PIL import Image
import production_visuals as production
from safety import digest


class ProductionInteractionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.assets = {}
        for name, color in [('before', '#102030'), ('after', '#305070')]:
            path = self.base / (name + '.png')
            Image.new('RGB', (640, 360), color).save(path)
            self.assets[name] = path
        self.captions = [{'start': .1 + 2 * i, 'end': 1.5 + 2 * i} for i in range(6)]

    def scene(self, style):
        content = {'heading': 'Explicit interaction', 'source': 'Internal synthetic example', 'image': 'before',
                   'style': style, 'target': {'x': .2, 'y': .5, 'width': .2, 'height': .1}, 'label': 'Operator-supplied action'}
        if style != 'marquee': content['result'] = 'after'
        if style == 'drag': content['drop'] = {'x': .6, 'y': .2}
        if style == 'swipe': content['to_y'] = .25
        if style == 'menu': content.update(items=['Open', 'Details', 'Export'], pick=1)
        return {'kind': 'interaction', 'name': 'Test interaction', 'first_cue': 0,
                'cues': list(range(5 if style == 'menu' else 4)), 'transition': 'cut-left', 'content': content}

    def validate(self, scene):
        assets = {'before': self.assets['before']} if scene['content']['style'] == 'marquee' else self.assets
        return production.validate_scenes([scene], assets, self.captions, 14)

    def test_all_six_styles_require_separate_timed_phases(self):
        for style in production.INTERACTION_STYLES:
            scene = self.scene(style)
            self.assertEqual(self.validate(scene), [(0, 14)])
            scene['cues'].pop()
            with self.subTest(style=style), self.assertRaises(ValueError): self.validate(scene)

    def test_result_is_explicit_and_cannot_alias_original_bytes(self):
        for style in ('click', 'tap', 'swipe', 'drag', 'menu'):
            scene = self.scene(style)
            del scene['content']['result']
            with self.assertRaises(ValueError): self.validate(scene)
            scene['content']['result'] = 'before'
            with self.assertRaises(ValueError): self.validate(scene)
        self.assets['after'].write_bytes(self.assets['before'].read_bytes())
        with self.assertRaisesRegex(ValueError, 'image bytes'): self.validate(self.scene('click'))

    def test_geometry_rejects_nonfinite_booleans_outside_and_unbounded_fields(self):
        for key, value in [('x', -.1), ('x', True), ('y', float('nan')), ('width', float('inf')),
                           ('height', 0), ('x', .99), ('width', '0.4'), ('html', '<script>')]:
            scene = self.scene('click'); scene['content']['target'][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): self.validate(scene)
        for key, value in [('style', 'javascript'), ('image', '../image'), ('url', 'https://example.test'),
                           ('font', 'Another font'), ('label', 'A\nB')]:
            scene = self.scene('click'); scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): self.validate(scene)

    def test_drag_requires_a_different_contained_destination(self):
        for drop in ({'x': .9, 'y': .2}, {'x': .2, 'y': .5}, {'x': -.1, 'y': .1},
                     {'x': .6, 'y': True}, {'x': .6, 'y': .2, 'scale': 2}):
            scene = self.scene('drag'); scene['content']['drop'] = drop
            with self.subTest(drop=drop), self.assertRaises(ValueError): self.validate(scene)

    def test_swipe_is_bounded_and_menu_selection_is_not_inferred_from_text(self):
        for value in (-.1, 1, .5, True, float('nan')):
            scene = self.scene('swipe'); scene['content']['to_y'] = value
            with self.subTest(value=value), self.assertRaises(ValueError): self.validate(scene)
        for pick in (True, -1, 3, '1', 1.1):
            scene = self.scene('menu'); scene['content']['pick'] = pick
            with self.subTest(pick=pick), self.assertRaises(ValueError): self.validate(scene)
        for items in (['Only one'], ['Open', 'open'], ['a'] * 5, ['a', 'Line\nbreak']):
            scene = self.scene('menu'); scene['content']['items'] = items
            with self.subTest(items=items), self.assertRaises(ValueError): self.validate(scene)

    def test_stills_keep_existing_hash_and_path_guards(self):
        records = {name: {'path': path.name, 'sha256': digest(path)} for name, path in self.assets.items()}
        self.assertEqual(production.validate_assets(records, self.base), self.assets)
        for path in ('../before.png', 'https://example.test/image.png'):
            bad = copy.deepcopy(records); bad['before']['path'] = path
            with self.assertRaises((ValueError, OSError)): production.validate_assets(bad, self.base)
        bad = copy.deepcopy(records); bad['after']['sha256'] = '0' * 64
        with self.assertRaises(ValueError): production.validate_assets(bad, self.base)

    def test_menu_labels_are_serialized_as_data_not_icons_or_html(self):
        scene = self.scene('menu')
        scene['content']['items'] = ['icon', '<script>', '</script>']
        self.validate(scene)
        data = {'scenes': [scene], 'assets': {name: {'path': path.name} for name, path in self.assets.items()}}
        output = production.scripts(data, {'colors': {'accent': '#abcdef'}})
        self.assertNotIn('<script>"', output)
        self.assertIn('\\u003cscript>', output)
        self.assertIn('assets/production-interactions.js', output)

    def test_pointer_choices_are_explicit_and_keep_touch_actions_separate(self):
        for pointer in production.POINTER_STYLES:
            scene = self.scene('click'); scene['content']['pointer'] = pointer
            if pointer == 'agent': scene['content']['actor'] = 'Operator'
            self.assertEqual(self.validate(scene), [(0, 14)])
        for style, pointer in [('swipe', 'arrow'), ('tap', 'dart'), ('drag', 'magnetic'), ('menu', 'magnetic')]:
            scene = self.scene(style); scene['content']['pointer'] = pointer
            with self.subTest(style=style, pointer=pointer), self.assertRaises(ValueError): self.validate(scene)
        for value in (True, {}, [], 'remote'):
            scene = self.scene('click'); scene['content']['pointer'] = value
            with self.subTest(value=value), self.assertRaises(ValueError): self.validate(scene)

    def test_agent_label_and_camera_do_not_accept_arbitrary_runtime_parameters(self):
        scene = self.scene('click'); scene['content']['pointer'] = 'agent'
        with self.assertRaises(ValueError): self.validate(scene)
        scene['content']['actor'] = 'x' * 19
        with self.assertRaises(ValueError): self.validate(scene)
        scene['content'].update(actor='Operator', camera='follow')
        with self.assertRaises(ValueError): self.validate(scene)
        for style in ('click', 'drag'):
            scene = self.scene(style); scene['content']['camera'] = 'follow'
            self.assertEqual(self.validate(scene), [(0, 14)])
            scene['content']['zoom'] = 3
            with self.assertRaises(ValueError): self.validate(scene)
        for style, value in [('menu', 'follow'), ('tap', 'follow'), ('click', True), ('click', {'zoom': 3})]:
            scene = self.scene(style); scene['content']['camera'] = value
            with self.subTest(style=style), self.assertRaises(ValueError): self.validate(scene)


if __name__ == '__main__':
    unittest.main()
