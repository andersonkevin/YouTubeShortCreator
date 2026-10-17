import copy
import unittest
import production_visuals as production


class EditorialTests(unittest.TestCase):
    def scene(self, kind, content, cues=1):
        return {'kind': kind, 'name': 'Internal editorial', 'first_cue': 0, 'cues': list(range(cues)), 'transition': 'cut-left', 'content': content}

    def validate(self, scene, assets=None, captions=None, duration=13):
        return production.validate_scenes([scene], assets or {}, captions or [{'start': .107 + i * 3, 'end': 1.5 + i * 3} for i in range(4)], duration)

    def test_hand_frame_is_solo_and_keeps_verified_image_records(self):
        scene = self.scene('media-grid', {'heading': 'Keep the frame', 'source': 'Internal fixture', 'layout': 'solo', 'treatment': 'hand-frame', 'items': [{'image': 'still', 'label': 'Supplied caption'}]})
        self.validate(scene, {'still': {}})
        with self.assertRaises(ValueError): self.validate(scene)
        for edit in [{'layout': '2up'}, {'camera': {'style': 'push-in'}}, {'seed': 3}, {'svg': 'M 0 0'}]:
            bad = copy.deepcopy(scene);bad['content'].update(edit)
            with self.assertRaises(ValueError): self.validate(bad, {'still': {}})

    def test_hand_pipeline_uses_existing_steps_icons_and_cues(self):
        icon = next(iter(production.kit.verify_assets()['icons']))
        for count in (2, 3, 4):
            scene = self.scene('diagram', {'heading': 'Follow the process', 'source': 'Internal example', 'style': 'hand-drawn',
                'steps': [{'label': 'Review', 'body': 'Use supplied evidence.', 'icon': icon} for _ in range(count)]}, count)
            self.validate(scene)
            scene['content']['path'] = 'M 0 0'
            with self.assertRaises(ValueError): self.validate(scene)

    def test_channel_requires_explicit_distinct_button_states_and_two_cues(self):
        base = {'heading': 'A source', 'name': 'Signal Lab', 'role': 'Internal channel', 'context': 'Use supplied content.', 'variant': 'channel-card', 'button': {'before': 'Open preview', 'after': 'Preview ready'}}
        self.validate(self.scene('lower-third', copy.deepcopy(base), 2))
        for edit in [{'button': None}, {'button': {'before': 'Same', 'after': 'Same'}}, {'button': {'before': 'x' * 19, 'after': 'Done'}}, {'variant': 'side-rule'}, {'button': {'before': 'One', 'after': 'Two', 'url': 'https://example.com'}}]:
            bad = copy.deepcopy(base);bad.update(edit)
            with self.assertRaises(ValueError): self.validate(self.scene('lower-third', bad, 2))
        with self.assertRaises(ValueError): self.validate(self.scene('lower-third', base))

    def test_closing_styles_keep_supplied_text_and_reject_unbounded_controls(self):
        for style in production.CTA_STYLES:
            scene = self.scene('cta', {'heading': 'Make it clear.', 'action': 'Open the preview', 'label': 'Internal fixture', 'style': style})
            options = {}
            if style in production.BRAND_LOCKUPS and style != 'badge-pair': scene['cues'] = [0, 1]
            if style == 'character-walk': scene['cues'] = [0, 3]
            if style == 'cursor-rays':
                scene['cues'] = [0, 3]
                scene['content'].update(heading='IDEAS', action='in', support='motion', finale=['Make it clear', 'Keep it moving'])
            if style == 'creator-intro':
                scene['cues'] = [0, 1]
                scene['content']['prompt'] = {'placeholder': 'Start here', 'text': 'Show the supplied profile.', 'model': 'Workspace', 'thinking': 'Preparing'}
                scene['content']['profile'] = {'image': 'still', 'name': 'Example', 'handle': '@example', 'bio': 'Supplied profile.', 'before': 'Open', 'after': 'Ready'}
                options = {'assets': {'still': {}}, 'captions': [{'start': .107, 'end': 1}, {'start': 12.107, 'end': 13}], 'duration': 15}
            if style == 'badge-pair':
                scene['content']['badges'] = [{'icon': 'code', 'eyebrow': 'Read the source', 'label': 'Repository'}]
            self.validate(scene, **options)
            for edit in [{'style': 'custom'}, {'color': '#fff'}, {'duration': 60}, {'font': 'Caveat'}, {'logo': 'https://example.com/a.png'}]:
                bad = copy.deepcopy(scene);bad['content'].update(edit)
                with self.assertRaises(ValueError): self.validate(bad, **options)


if __name__ == '__main__':
    unittest.main()
