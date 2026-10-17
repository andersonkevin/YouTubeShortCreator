import copy
from pathlib import Path
import tempfile
import unittest
from PIL import Image
import branding
import production_visuals as production


def conversation(variant, count=2):
    content = {'style': 'chat', 'variant': variant, 'heading': 'A supplied conversation',
               'source': 'Internal illustration', 'items': [
                   {'label': 'Operator' if i == 0 else 'Reply', 'body': 'Exact supplied text.',
                    'side': 'sent' if i == 0 else 'received'} for i in range(count)]}
    beats = count
    if variant == 'answer-stream':
        content['table'] = {'headers': ['Option', 'Detail', 'Source'],
                            'rows': [['First', 'Supplied detail', 'Internal'], ['Second', 'Supplied detail', 'Internal']]}
        beats += 2
    if variant == 'research-stream':
        content['activity'] = {'steps': ['Read supplied notes', 'Compare supplied options'], 'summary': 'Review complete'}
        beats += 1
    return {'kind': 'interface', 'name': 'Conversation', 'first_cue': 0,
            'cues': list(range(beats)), 'transition': 'cut-left', 'content': content}


class ChatExchangeContracts(unittest.TestCase):
    def validate(self, scene, assets=None):
        count = len(scene['cues'])
        return production.validate_scenes([scene], assets or {},
            [{'start': .1 + 3*i, 'end': 1 + 3*i} for i in range(count)], count*3 + 1)

    def test_three_variants_preserve_literal_copy_and_route_in_four_formats(self):
        for variant in production.CHAT_EXCHANGE_VARIANTS:
            scene = conversation(variant)
            scene['content']['items'][0]['body'] = 'Literal <script> and e\u0301 text.'
            before = copy.deepcopy(scene)
            self.validate(scene);self.assertEqual(scene, before)
            for profile in production.COMPOSITION_FORMATS:
                scripts = production.scripts({'format': profile, 'scenes': [scene], 'assets': {}},
                                             {'colors': branding.PALETTES['violet']})
                self.assertLess(scripts.index('assets/production-chat-exchange.js'), scripts.index('assets/production-interface.js'))

    def test_bounded_message_counts_copy_and_explicit_direction(self):
        self.validate(conversation('message-thread', 12))
        for variant in production.CHAT_EXCHANGE_VARIANTS:
            for count in (1, 13 if variant == 'message-thread' else 5):
                with self.assertRaises(ValueError): self.validate(conversation(variant, count))
            for field, value in [('label', 'A'*25), ('body', 'A'*73), ('side', 'automatic')]:
                scene = conversation(variant);scene['content']['items'][0][field] = value
                with self.assertRaises(ValueError):self.validate(scene)
        for variant in ('answer-stream', 'research-stream'):
            scene = conversation(variant);scene['content']['items'][1]['body'] = 'A'*160
            self.validate(scene)
            scene['content']['items'][1]['body'] += 'A'
            with self.assertRaises(ValueError):self.validate(scene)
            scene = conversation(variant);scene['content']['items'][1]['side'] = 'sent'
            with self.assertRaises(ValueError):self.validate(scene)

    def test_table_and_activity_require_explicit_structured_content(self):
        for variant, field in [('answer-stream', 'table'), ('research-stream', 'activity')]:
            for value in (None, {}, 'inferred'):
                scene = conversation(variant);scene['content'][field] = value
                with self.assertRaises(ValueError):self.validate(scene)
            scene = conversation(variant);del scene['content'][field]
            with self.assertRaises(ValueError):self.validate(scene)
        for mutate in [lambda t:t.update(headers=['One']), lambda t:t.update(rows=[['One', 'Two', 'Three']]),
                       lambda t:t['rows'][0].append('Four'), lambda t:t['rows'][0].__setitem__(0, 'X'*33)]:
            scene = conversation('answer-stream');mutate(scene['content']['table'])
            with self.assertRaises(ValueError):self.validate(scene)
        scene = conversation('research-stream');scene['content']['activity']['steps'].append('Third')
        with self.assertRaises(ValueError):self.validate(scene)

    def test_each_caption_owns_a_complete_sixty_frame_action(self):
        scene = conversation('message-thread')
        cues = [{'start': .1, 'end': .9}, {'start': 2.1, 'end': 3}]
        self.assertEqual(production.validate_scenes([scene], {}, cues, 4.9), [(0, 4.9)])
        with self.assertRaises(ValueError):production.validate_scenes([scene], {}, cues, 4.89)
        cues[1]['start'] = 2.06
        with self.assertRaises(ValueError):production.validate_scenes([scene], {}, cues, 5)
        scene = conversation('answer-stream');scene['cues'].pop()
        with self.assertRaises(ValueError):self.validate(scene)

    def test_message_cards_use_the_existing_asset_gate(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'card.png';Image.new('RGB', (64, 64), '#140b30').save(path)
            scene = conversation('message-thread');scene['content']['items'][1]['image'] = 'card'
            self.validate(scene, {'card': path})
            for image in ('unknown', '../card', 'https://example.test/card.png'):
                scene['content']['items'][1]['image'] = image
                with self.assertRaises(ValueError):self.validate(scene, {'card': path})
            scene = conversation('answer-stream');scene['content']['items'][1]['image'] = 'card'
            with self.assertRaises(ValueError):self.validate(scene, {'card': path})

    def test_arbitrary_controls_and_live_integrations_are_rejected(self):
        for variant in production.CHAT_EXCHANGE_VARIANTS:
            for key, value in [('typing_indicator', True), ('font', 'Other'), ('html', '<script>'),
                               ('endpoint', 'remote'), ('duration', 5), ('temperature', 1), ('url', 'remote')]:
                scene = conversation(variant);scene['content'][key] = value
                with self.subTest(variant=variant, key=key), self.assertRaises(ValueError):self.validate(scene)


if __name__ == '__main__':
    unittest.main()
