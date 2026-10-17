import copy
import unittest
import production_visuals as production


class PresentationContracts(unittest.TestCase):
    captions = [{'start': .1, 'end': 1}, {'start': 6.1, 'end': 7}]

    def scene(self, style):
        if style == 'news-ticker':
            content = dict(heading='Internal test', name='Signal Lab', role='Explicit headline', context='Source supplied by author',
                           variant=style, items=['First supplied item', 'Second supplied item'])
            kind, cues = 'lower-third', [0, 1]
        else:
            items = [dict(image='still', label='Supplied cover') for _ in range(4 if style == 'preview-sheet' else 1)]
            if style == 'album-card': items[0]['detail'] = 'A supplied description'
            content = dict(heading='Internal test', layout='4up' if style == 'preview-sheet' else 'solo',
                           treatment=style, items=items, source='Local artwork')
            if style == 'steam-window': content['region'] = dict(x=.2, y=.1, width=.4, height=.5)
            kind, cues = 'media-grid', [0, 1] if style in ('preview-sheet', 'steam-window') else [0]
        return dict(kind=kind, name='Presentation test', first_cue=0, cues=cues, transition='cut-left', content=content)

    def validate(self, scene, captions=None):
        return production.validate_scenes([scene], {} if scene['kind'] == 'lower-third' else {'still': {}}, captions or self.captions, 9)

    def test_native_contracts_are_valid_and_do_not_mutate_input(self):
        for style in ('album-card', 'preview-sheet', 'steam-window', 'news-ticker'):
            scene = self.scene(style); before = copy.deepcopy(scene)
            self.assertEqual(self.validate(scene), [(0, 9)]); self.assertEqual(scene, before)

    def test_no_brand_controls_arbitrary_markup_or_incompatible_effects(self):
        for style in ('album-card', 'preview-sheet', 'steam-window', 'news-ticker'):
            for key, value in [('font', 'other'), ('html', '<script>'), ('color', 'red'), ('camera', {}), ('surface', {}), ('hud', {})]:
                scene = self.scene(style); scene['content'][key] = value
                with self.subTest(style=style, key=key), self.assertRaises(ValueError): self.validate(scene)
        for style in ('album-card', 'preview-sheet', 'steam-window'):
            scene = self.scene(style); scene['content']['items'][0]['image'] = '../still'
            with self.assertRaises(ValueError): self.validate(scene)
            scene = self.scene(style); scene['content']['layout'] = '2up'
            with self.assertRaises(ValueError): self.validate(scene)

    def test_explicit_details_counts_and_ticker_text_bounds(self):
        album = self.scene('album-card'); del album['content']['items'][0]['detail']
        with self.assertRaises(ValueError): self.validate(album)
        for items in [[], ['one'], ['a'*41, 'b'], ['a'*31]*6, [True, 'b']]:
            scene = self.scene('news-ticker'); scene['content']['items'] = items
            with self.subTest(items=items), self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('news-ticker'); scene['content']['variant'] = 'side-rule'
        with self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('preview-sheet'); scene['content']['items'][0]['detail'] = 'Unexpected field'
        with self.assertRaises(ValueError): self.validate(scene)

    def test_long_motion_requires_two_six_second_anchors_and_room_to_settle(self):
        for style in ('preview-sheet', 'steam-window', 'news-ticker'):
            for anchors in [[0], [1, 0], [0, 0], [0, True]]:
                scene = self.scene(style); scene['cues'] = anchors
                with self.assertRaises(ValueError): self.validate(scene)
            with self.assertRaises(ValueError):
                self.validate(self.scene(style), [{'start': .1, 'end': 1}, {'start': 6.09, 'end': 7}])
            self.validate(self.scene(style))

    def test_local_motion_regions_are_explicit_bounded_and_cannot_move_into_other_treatments(self):
        scene = self.scene('steam-window'); del scene['content']['region']
        with self.assertRaises(ValueError): self.validate(scene)
        for region in [None, {}, dict(x=.9, y=0, width=.4, height=.4), dict(x=True, y=0, width=.4, height=.4),
                       dict(x=0, y=0, width=0, height=.4), dict(x=0, y=0, width=.7, height=.4),
                       dict(x=0, y=0, width=.4, height=.4, shader='other')]:
            scene = self.scene('steam-window'); scene['content']['region'] = region
            with self.subTest(region=region), self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('steam-window'); scene['content']['treatment'] = 'box'; scene['cues'] = [0]
        with self.assertRaises(ValueError): self.validate(scene)


if __name__ == '__main__':
    unittest.main()
