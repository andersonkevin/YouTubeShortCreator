import copy
import unittest
import production_visuals as production


class SocialInterfaceTests(unittest.TestCase):
    def scene(self, variant='post', count=2):
        social = variant != 'peek-stack'
        return {'kind': 'interface', 'name': 'Supplied cards', 'first_cue': 0,
                'cues': list(range(count)), 'transition': 'cut-left', 'content': {
                    'heading': 'Internal example', 'source': 'Illustrative test content',
                    'style': 'social' if social else 'notifications', 'variant': variant,
                    'items': [{'label': 'Author ' + str(i), 'body': 'Exact <script> copy.',
                               **({'stat': {'value': '42', 'label': 'Example count'}} if variant == 'profile-count' else {}),
                               **({'context': 'Supplied context', 'action': {'before': 'Read', 'after': 'Read'}}
                                  if social else {})} for i in range(count)]}}

    def validate(self, scene):
        count = len(scene['content']['items'])
        cues = [{'start': .1 + 3 * i, 'end': 1 + 3 * i} for i in range(count)]
        return production.validate_scenes([scene], {}, cues, count * 3)

    def test_closed_presentations_keep_caption_and_item_limits(self):
        for variant in production.INTERFACE_VARIANTS['social'] + ('peek-stack',):
            for count in (2, 3, 4):
                self.assertEqual(self.validate(self.scene(variant, count)), [(0, count * 3)])
            for count in (1, 5):
                with self.assertRaises(ValueError): self.validate(self.scene(variant, count))
            bad = self.scene(variant); bad['cues'].pop()
            with self.assertRaises(ValueError): self.validate(bad)

    def test_actions_and_context_are_explicit_never_inferred(self):
        for key in ('action', 'context'):
            scene = self.scene(); scene['content']['items'][0].pop(key)
            with self.assertRaises(ValueError): self.validate(scene)
        for action in (None, 'Follow', {}, {'before': 'Read'}, {'before': 'Read', 'after': 'Read', 'href': 'https://example.invalid'}):
            scene = self.scene(); scene['content']['items'][0]['action'] = action
            with self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('comment'); scene['content']['items'][0]['action']['after'] = 'Changed'
        with self.assertRaises(ValueError): self.validate(scene)

    def test_no_runtime_brand_or_platform_options(self):
        for key, value in [('html', '<script>'), ('font', 'Other'), ('url', 'https://example.invalid'),
                           ('verified', True), ('followers', 100), ('onClick', 'send')]:
            scene = self.scene(); scene['content']['items'][0][key] = value
            with self.assertRaises(ValueError): self.validate(scene)
        for variant in (None, '../post', 'instagram', 'spring'):
            scene = self.scene(); scene['content']['variant'] = variant
            with self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene(); scene['content'].pop('variant')
        with self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene(); scene['content']['typing_indicator'] = True
        with self.assertRaises(ValueError): self.validate(scene)

    def test_exact_copy_budget_is_preserved(self):
        for key, limit in [('label', 24), ('body', 72), ('context', 32)]:
            scene = self.scene(); scene['content']['items'][0][key] = 'A' * limit
            self.validate(scene)
            bad = copy.deepcopy(scene); bad['content']['items'][0][key] += 'A'
            with self.assertRaises(ValueError): self.validate(bad)
        scene = self.scene(); scene['content']['items'][0]['action']['after'] = 'A' * 19
        with self.assertRaises(ValueError): self.validate(scene)


if __name__ == '__main__':
    unittest.main()
