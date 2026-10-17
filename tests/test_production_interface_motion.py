import copy
import unittest
import production_visuals as production


class InterfaceMotionTests(unittest.TestCase):
    def scene(self, variant, count=3):
        settings = variant == 'toggle-flip'
        return {'kind': 'interface', 'name': 'Motion', 'first_cue': 0, 'cues': list(range(count)),
                'transition': 'cut-left', 'content': {'heading': 'An explicit sequence', 'source': 'Internal test',
                'style': 'settings' if settings else 'steps', 'variant': variant,
                'items': [{'label': 'Step ' + str(i), 'body': 'Exact supplied copy.',
                           **({'enabled': bool(i % 2)} if settings else {})} for i in range(count)]}}

    def validate(self, scene):
        cues = [{'start': .1 + i * 3, 'end': 1 + i * 3} for i in scene['cues']]
        return production.validate_scenes([scene], {}, cues, len(cues) * 3)

    def test_motion_variants_retain_the_existing_closed_interface_contract(self):
        names = tuple(name for name in production.INTERFACE_VARIANTS['steps'][4:]
                      if name not in production.UI_PRIMITIVES + production.LIQUID_GLASS_VARIANTS + production.EDITOR_VARIANTS + production.ANSWER_VARIANTS +
                      ('product-canvas', 'app-install', 'ui-3d-reveal', 'liquid-panels', 'portal-panels', 'shatter-panels', 'glass-parallax')) + production.INTERFACE_VARIANTS['settings']
        self.assertEqual(len(names), 14)
        for variant in names:
            for count in (2, 3, 4):
                self.assertEqual(self.validate(self.scene(variant, count)), [(0, count * 3)])
            for key, value in [('html', '<script>'), ('font', 'Other'), ('duration', 10), ('url', 'https://example.invalid'), ('onClick', 'send')]:
                bad = self.scene(variant); bad['content'][key] = value
                with self.assertRaises(ValueError): self.validate(bad)

    def test_toggle_requires_explicit_boolean_and_cannot_be_selected_on_steps(self):
        for value in (0, 1, 'true', None, [], {}):
            scene = self.scene('toggle-flip'); scene['content']['items'][0]['enabled'] = value
            with self.assertRaises(ValueError): self.validate(scene)
        scene = self.scene('toggle-flip'); scene['content']['style'] = 'steps'
        with self.assertRaises(ValueError): self.validate(scene)

    def test_chip_labels_and_item_counts_remain_bounded(self):
        scene = self.scene('state-chip-rail'); scene['content']['items'][0]['label'] = 'A' * 15
        with self.assertRaises(ValueError): self.validate(scene)
        for count in (1, 5):
            with self.assertRaises(ValueError): self.validate(self.scene('swipe-rail', count))

    def test_new_variants_do_not_relax_cue_spacing_or_allow_unknown_state_fields(self):
        scene = self.scene('spring-stack-shuffle')
        with self.assertRaises(ValueError): production.validate_scenes([scene], {}, [{'start': .1, 'end': .2}, {'start': .3, 'end': .4}, {'start': .5, 'end': .6}], 3)
        for variant in ('modal-morph', 'pull-to-refresh', 'velocity-throw-snap'):
            bad = self.scene(variant); bad['content']['items'][0]['state'] = 'automatic'
            with self.assertRaises(ValueError): self.validate(bad)


if __name__ == '__main__':
    unittest.main()
