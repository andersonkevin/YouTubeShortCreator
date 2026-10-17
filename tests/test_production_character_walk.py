import copy
from math import ceil
from pathlib import Path
import tempfile
import unittest

import branding
import production_visuals as production
from tools.vendor_character import bundle, property_data


class CharacterWalkContracts(unittest.TestCase):
    def scene(self):
        return {'kind': 'cta', 'name': 'Character introduction', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                'content': {'style': 'character-walk', 'heading': 'Follow the idea', 'action': 'The next step, clearly explained', 'label': 'Internal illustrative example'}}

    def validate(self, scene, captions=None, duration=11):
        return production.validate_scenes([scene], {}, captions or [{'start': .115, 'end': 1.115}, {'start': 8.115, 'end': 9.115}], duration)

    def test_normal_engine_contract_and_all_four_profiles(self):
        scene = self.scene()
        self.assertEqual(self.validate(scene), [(0, 11)])
        for profile in production.COMPOSITION_FORMATS:
            data = {'format': profile, 'scenes': [scene], 'assets': {}}
            script = production.scripts(data, {'colors': branding.PALETTES['violet']})
            self.assertEqual(script.count('src="assets/production-character-walk.js"'), 1)
            self.assertLess(script.index('production-character-data.js'), script.index('production-character-walk.js'))
            self.assertNotIn('https://', script)
            data['scenes'] = []
            self.assertNotIn('production-character', production.scripts(data, {'colors': branding.PALETTES['violet']}))

    def test_no_external_lottie_input_brand_overrides_or_unbounded_copy(self):
        for key, value in [('lottie', '../mascot.json'), ('url', 'https://example.invalid'), ('script', '<script>'),
                           ('font', 'Inter'), ('color', '#fff'), ('duration', 2), ('heading', 'x'*29),
                           ('action', 'x'*41), ('label', 'x'*65), ('badges', [])]:
            scene = self.scene();scene['content'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):self.validate(scene)

    def test_start_settle_and_transition_gates_remain_explicit(self):
        for cues in ([0], [0, 1, 2]):
            scene = self.scene();scene['cues'] = cues
            with self.assertRaises(ValueError):self.validate(scene)
        with self.assertRaises(ValueError):self.validate(self.scene(), [{'start': .115, 'end': 1}, {'start': 8.08, 'end': 9}])
        boundary = (ceil((8.115+production.BEAT_DELAY)*30)+24+12)/30
        self.validate(self.scene(), duration=boundary)
        with self.assertRaises(ValueError):self.validate(self.scene(), duration=boundary-1/30)

    def test_converter_fails_closed_without_writing_or_following_symlinks(self):
        with tempfile.TemporaryDirectory() as temp:
            file = Path(temp)/'mascot.json';file.write_text('{}')
            with self.assertRaisesRegex(ValueError, 'hash mismatch'):bundle(file)
            link = Path(temp)/'link.json';link.symlink_to(file)
            with self.assertRaisesRegex(ValueError, 'regular local file'):bundle(link)
            self.assertEqual(file.read_text(), '{}')

    def test_converter_rejects_expressions_curved_easing_and_disordered_keys(self):
        linear = {'a': 1, 'k': [{'t': 0, 's': [1], 'i': {'x': [1], 'y': [1]}, 'o': {'x': [0], 'y': [0]}}, {'t': 2, 's': [3]}]}
        self.assertEqual(property_data(linear), {'keys': [[0, [1]], [2, [3]]]})
        bad = copy.deepcopy(linear);bad['k'][0]['o']['x'] = [.42]
        with self.assertRaises(ValueError):property_data(bad)
        bad = copy.deepcopy(linear);bad['k'][1]['t'] = 0
        with self.assertRaises(ValueError):property_data(bad)
        with self.assertRaises(ValueError):property_data({'a': 0, 'k': 0, 'x': 'expression()'})


if __name__ == '__main__':
    unittest.main()
