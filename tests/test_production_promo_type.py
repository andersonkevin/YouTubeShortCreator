import copy
import unittest

import branding
import production_visuals as production


class PromoTypeContracts(unittest.TestCase):
    def title(self, layout='promo-hook'):
        return {'kind': 'title', 'name': 'Promotional type', 'first_cue': 0, 'cues': [0], 'transition': 'cut-left',
                'content': {'kicker': 'Internal example', 'title': 'Clear ideas', 'subtitle': 'Supplied copy only', 'layout': layout}}

    def glyphs(self):
        scene = self.title()
        scene.update(kind='kinetic', cues=[0, 1, 2], content={'kicker': 'Internal example', 'style': 'glyph-build', 'words': ['Motion', 'Transitions', 'Typography']})
        return scene

    def validate(self, scene):
        return production.validate_scenes([scene], {}, [{'start': .115+i*2, 'end': 1.1+i*2} for i in range(3)], 7)

    def test_five_titles_and_three_explicit_glyph_labels_share_engine_contracts(self):
        for layout in production.PROMO_TITLE_LAYOUTS:
            self.assertEqual(self.validate(self.title(layout)), [(0, 7)])
        self.assertEqual(self.validate(self.glyphs()), [(0, 7)])
        for count in (2, 4):
            scene = self.glyphs();scene['content']['words'] = ['Word']*count;scene['cues'] = list(range(count))
            with self.assertRaises(ValueError):self.validate(scene)

    def test_copy_limits_and_brand_boundaries_remain_closed(self):
        for layout in production.PROMO_TITLE_LAYOUTS:
            for edit in [{'title': 'x'*33}, {'subtitle': 'x'*61}, {'reveal': 'matrix'},
                         {'font': 'Inter'}, {'color': '#fff'}, {'html': '<b>Title</b>'}, {'duration': 4}]:
                scene = self.title(layout);scene['content'].update(edit)
                with self.subTest(layout=layout,edit=edit),self.assertRaises(ValueError):self.validate(scene)
        for word in ('x'*13, 'Two words', 'Line\nbreak'):
            scene = self.glyphs();scene['content']['words'][0] = word
            with self.assertRaises(ValueError):self.validate(scene)

    def test_adapter_loads_only_for_selected_compositions_in_all_profiles(self):
        for profile in production.COMPOSITION_FORMATS:
            for scene in [self.glyphs(), *[self.title(layout) for layout in production.PROMO_TITLE_LAYOUTS]]:
                data = {'format': profile, 'scenes': [scene], 'assets': {}}
                scripts = production.scripts(data, {'colors': branding.PALETTES['violet']})
                self.assertEqual(scripts.count('src="assets/production-promo-type.js"'), 1)
                self.assertLess(scripts.index('production-promo-type.js'), scripts.index('production-scenes.js'))
                for forbidden in ('https://', 'gsap.min.js', 'Playfair'):
                    self.assertNotIn(forbidden, scripts)
            data['scenes'] = [self.title('standard')]
            self.assertNotIn('production-promo-type.js', production.scripts(data, {'colors': branding.PALETTES['violet']}))

    def test_one_cue_per_beat_and_final_settle_margin_are_preserved(self):
        scene = self.glyphs();scene['cues'] = [0, 1]
        with self.assertRaises(ValueError):self.validate(scene)
        scene = self.title();bad = copy.deepcopy(scene);bad['cues'] = [0, 1]
        with self.assertRaises(ValueError):self.validate(bad)
        self.validate(scene)


if __name__ == '__main__':
    unittest.main()
