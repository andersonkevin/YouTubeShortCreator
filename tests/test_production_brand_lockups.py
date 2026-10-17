import copy
import json
import unittest
import production_visuals as production
import branding


class BrandLockupContracts(unittest.TestCase):
    def scene(self, style):
        content = dict(style=style, heading='Make it clear.', action='Inspect the source', label='Internal fixture')
        if style == 'badge-pair':
            content['badges'] = [dict(icon='code', eyebrow='Read the source', label='Repository'),
                                 dict(icon='file-text', eyebrow='Explore the guide', label='Documentation')]
        return dict(kind='cta', name='Brand lockup test', first_cue=0,
                    cues=[0] if style == 'badge-pair' else [0, 1], transition='cut-left', content=content)

    def validate(self, scene):
        return production.validate_scenes([scene], {}, [{'start': .1, 'end': 1}, {'start': 2.1, 'end': 3}], 5)

    def test_reusable_closed_records_keep_the_approved_brand_external_to_episode_input(self):
        for style in production.BRAND_LOCKUPS:
            scene = self.scene(style); before = copy.deepcopy(scene)
            self.assertEqual(self.validate(scene), [(0, 5)]); self.assertEqual(before, scene)
            for key, value in [('logo', 'other.png'), ('font', 'Other'), ('svg', '<svg>'), ('url', 'https://example.test'), ('color', 'red')]:
                bad = copy.deepcopy(scene); bad['content'][key] = value
                with self.subTest(style=style, key=key), self.assertRaises(ValueError): self.validate(bad)

    def test_badges_require_explicit_bounded_copy_and_verified_icon_ids(self):
        for values in [[], [{}], ['badge'], [dict(icon=[], eyebrow='Open', label='Guide')],
                       [dict(icon='../icon', eyebrow='Open', label='Guide')],
                       [dict(icon='code', eyebrow='x'*25, label='Guide')],
                       [dict(icon='code', eyebrow='Open', label='x'*23)]]:
            scene = self.scene('badge-pair'); scene['content']['badges'] = values
            with self.subTest(values=values), self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('badge-pair'); scene['content']['badges'] *= 2
        with self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('badge-pair'); scene['content']['style'] = 'standard'
        with self.assertRaises(ValueError): self.validate(scene)

    def test_native_cue_counts_cannot_skip_logo_or_text_beats(self):
        for style in production.BRAND_LOCKUPS:
            scene = self.scene(style); scene['cues'] = [0, 1] if style == 'badge-pair' else [0]
            with self.assertRaises(ValueError): self.validate(scene)

    def test_compiler_includes_only_pinned_icons_and_escapes_literal_copy(self):
        scene = self.scene('badge-pair'); scene['content']['badges'][0]['label'] = '</script><img>'
        self.validate(scene)
        html = production.scripts(dict(format='square', scenes=[scene], assets={}), {'colors': branding.PALETTES['violet']})
        self.assertIn('production-brand-lockups.js', html); self.assertNotIn('</script><img>', html)
        self.assertIn('\\u003c/script>', html)
        payload = json.loads(html.split('id="production-scene-data">')[1].split('</script>')[0])
        self.assertEqual(set(payload['icons']), {'code', 'file-text'})
        self.assertTrue(all(icon.startswith('data:image/svg+xml;base64,') for icon in payload['icons'].values()))


if __name__ == '__main__':
    unittest.main()
