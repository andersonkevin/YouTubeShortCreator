import copy
import json
import re
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image

import numpy as np

import branding
import ffmpeg_backend
import frame_qa
import media_backend
from media_contract import COMPOSITION_FORMATS, composition_geometry, duration_seconds, episode_profile, output_profile
import production_visuals as production
from safety import digest, read_json, write_json
import workflow
import ysc
from test_workflow import fixture


def title(name='Opening', first=0):
    return {'kind': 'title', 'name': name, 'first_cue': first, 'cues': [first],
            'transition': 'cut-left', 'content': {'kicker': 'LOCAL EXAMPLE', 'title': 'A wider canvas.', 'subtitle': 'One unchanged brand.'}}


class ProfileTests(unittest.TestCase):
    def test_explicit_ten_minute_boundary_and_legacy_limit(self):
        self.assertEqual(duration_seconds(600, 'landscape'), 600)
        self.assertEqual(output_profile('landscape')['max_frames'], 18000)
        self.assertGreater(output_profile('landscape')['max_audio_bytes'], 600*48000*2*4+4096)
        for value in (600+1/30, 600.001, True, float('nan'), float('inf'), 1):
            with self.subTest(value=value), self.assertRaises(ValueError):
                duration_seconds(value, 'landscape')
        with self.assertRaises(ValueError):
            duration_seconds(180+1/30)
        for name in ('cinema', '', None, {'width': 1920}):
            with self.subTest(name=name), self.assertRaises(ValueError):
                output_profile(name)
        with self.assertRaises(ValueError):
            episode_profile({'version': 3, 'format': 'shorts'})

    def test_composition_profiles_preserve_bounds_and_media_gates(self):
        expected = {'landscape': (1920, 1080), 'portrait': (1080, 1920),
                    'square': (1080, 1080), 'portrait-4x5': (1080, 1350)}
        for name, size in expected.items():
            with self.subTest(profile=name):
                spec = output_profile(name)
                self.assertEqual((spec['width'], spec['height']), size)
                self.assertEqual(episode_profile({'version': 3, 'format': name})['id'], name)
                self.assertEqual(duration_seconds(600, name), 600)
                with self.assertRaises(ValueError): duration_seconds(600.001, name)
                with patch.object(media_backend, 'scratch') as scratch, self.assertRaises(ValueError):
                    media_backend.preflight('native', {}, profile=name)
                scratch.assert_not_called()
                geometry = composition_geometry(name)
                for role in ('content', 'caption', 'logo', 'progress'):
                    x, y, w, h = geometry[role]
                    self.assertTrue(0 <= x < x+w <= size[0] and 0 <= y < y+h <= size[1])
                geometry['content'][0] = -999
                self.assertGreaterEqual(composition_geometry(name)['content'][0], 0)
                for left, top, right, bottom in frame_qa.regions_for(name).values():
                    self.assertTrue(0 <= left < right <= size[0] and 0 <= top < bottom <= size[1])
        self.assertEqual(output_profile('shorts')['max_seconds'], 180)

    def test_portrait_progress_has_even_pixel_edges_for_video_encoding(self):
        _, y, _, height = composition_geometry('portrait')['progress']
        self.assertEqual(y % 2, 0)
        self.assertEqual((y + height) % 2, 0)

    def test_new_frame_regions_detect_caption_and_visual_corruption(self):
        for name in ('portrait', 'square', 'portrait-4x5'):
            spec = output_profile(name)
            reference = np.zeros((spec['height'], spec['width'], 3), dtype=np.float32)
            reference[0, 0] = 255
            self.assertEqual(frame_qa.compare(reference, reference.copy(), name)['maximum_tile_rmse'], 0)
            for role in ('captions', 'visual'):
                broken = reference.copy()
                x, y, right, bottom = frame_qa.regions_for(name)[role]
                broken[y:bottom, x:right] = 255
                with self.subTest(profile=name, role=role), self.assertRaises(ValueError):
                    frame_qa.compare(reference, broken, name)

    def test_native_landscape_fails_without_fallback(self):
        with patch.object(media_backend, 'scratch') as scratch, self.assertRaises(ValueError):
            media_backend.preflight('native', {}, profile='landscape')
        scratch.assert_not_called()

    def test_all_late_caption_boundaries_are_sampled(self):
        cues={'cues':[{'start':590.1,'end':599.9}]}
        indices=frame_qa.sample_indices(cues,600,'landscape')
        self.assertEqual(indices[-1],17999)
        self.assertIn(17703,indices)
        self.assertIn(17997,indices)
        with self.assertRaises(ValueError):
            frame_qa.sample_indices(cues,600)

    def test_media_geometry_duration_and_timestamps_are_not_relaxed(self):
        record={'format':{'duration':'600'},'streams':[
            {'codec_type':'video','codec_name':'h264','width':1920,'height':1080,'r_frame_rate':'30/1','nb_read_frames':'18000'},
            {'codec_type':'audio','codec_name':'aac','channels':1}]}
        self.assertEqual(ffmpeg_backend.inspect_record(record,600,'landscape')['dimensions'],[1920,1080])
        for field,value in [('width',1080),('nb_read_frames','17999'),('r_frame_rate','29/1')]:
            altered=copy.deepcopy(record);altered['streams'][0][field]=value
            with self.subTest(field=field), self.assertRaises(ValueError):
                ffmpeg_backend.inspect_record(altered,600,'landscape')
        values=[i/30 for i in range(18000)]
        self.assertEqual(ffmpeg_backend.validate_timestamps(values,18000)['frames_checked'],18000)
        values[-1]+=.01
        with self.assertRaises(ValueError):ffmpeg_backend.validate_timestamps(values,18000)

    def test_large_frame_selection_preserves_every_index_with_bounded_depth(self):
        for indices in ([list(range(0, n * 2, 2)) for n in (8, 9, 64, 96, 100, 121, 127, 128, 129)] +
                        [list(range(18000)), list(range(0,18000,2)),
                         [i for i in range(18000) if i % 3 != 2]]):
            expression = ffmpeg_backend.frame_selection(indices).replace('\\,', ',')
            selected = []
            for start, end in re.findall(r'(?:eq|between)\(n,(\d+)(?:,(\d+))?\)', expression):
                selected.extend(range(int(start), int(end or start) + 1))
            self.assertEqual(selected, indices)
            depth = maximum = 0
            for char in expression:
                depth += (char == '(') - (char == ')')
                maximum = max(maximum, depth)
            self.assertEqual(depth, 0)
            self.assertLessEqual(maximum, 16)
            self.assertLess(len(expression), 200000)
            if len(indices) > 8:
                # The parser must never receive a long sum at the root level.
                nesting = 0
                root_additions = 0
                for char in expression:
                    nesting += (char == '(') - (char == ')')
                    root_additions += char == '+' and nesting == 0
                self.assertEqual(root_additions, 0)
        self.assertEqual(ffmpeg_backend.frame_selection([0, 4]), 'eq(n\\,0)+eq(n\\,4)')
        for invalid in ([], [True], [-1], [18000], [1,1], [2,1], ['0']):
            with self.assertRaises(ValueError):ffmpeg_backend.frame_selection(invalid)


class ProductionTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name).resolve()/'channel'
        old=workflow.ROOT,workflow.RUNS
        self.addCleanup(lambda:setattr(workflow,'ROOT',old[0]))
        self.addCleanup(lambda:setattr(workflow,'RUNS',old[1]))
        workflow.ROOT,workflow.RUNS=self.root,self.root/'runs'
        self.legacy=fixture(self.root)
        self.legacy_bytes=self.legacy.read_bytes()
        self.captions=read_json(self.root/'intake/captions.json')['cues']
        Image.new('RGB',(1920,1080),'#140b30').save(self.root/'intake/wide.png')
        seed=read_json(self.legacy)
        self.board={'version':1,'scenes':[title(),title('Closing',3)],'assets':{},
                    'thumbnail':{'headline':['WIDER CANVAS','SAME BRAND'],'label':'LOCAL EXAMPLE'},'youtube':seed['youtube']}

    def create(self,board=None,name='wide-test'):
        record=board or self.board
        path=self.root/'intake'/f'{name}.json';write_json(path,record)
        return ysc.new_episode(self.root,name,'intake/voice.wav','intake/transcript.json',
            'intake/wide.png','intake/captions.json',output_format='landscape',storyboard='intake/'+path.name)

    def test_normal_author_validate_and_build_are_reusable(self):
        hashes=branding.brand_files(self.root)
        path=self.create();data,_,captions,bounds=workflow.validate(path)
        self.assertEqual(data['version'],3);self.assertEqual(len(bounds),2)
        result=workflow.build_html(data,captions,bounds)
        self.assertIn('data-width="1920"',result)
        self.assertIn('production-scenes.js',result)
        self.assertNotIn('echarts.min.js',result)
        changed=copy.deepcopy(self.board)
        changed['scenes'][0]['content']['title']='Different input.'
        self.assertEqual(workflow.validate(self.create(changed,'other-video'))[0]['scenes'][0]['content']['title'],'Different input.')
        self.assertEqual(branding.brand_files(self.root),hashes)
        self.assertEqual(self.legacy.read_bytes(),self.legacy_bytes)
        self.assertEqual(workflow.validate(self.legacy)[0]['version'],1)

    def test_normal_authoring_and_covers_for_each_new_format(self):
        hashes = branding.brand_files(self.root)
        for name in ('portrait', 'square', 'portrait-4x5'):
            spec = output_profile(name)
            graphic = self.root / 'intake' / (name + '.png')
            Image.new('RGB', (spec['width'], spec['height']), '#140b30').save(graphic)
            board = copy.deepcopy(self.board)
            # This format fixture must fit both supported platform display fonts.
            board['thumbnail']['headline'] = ['FORMATS', 'SAME BRAND']
            write_json(self.root / 'intake' / (name + '.json'), board)
            path = ysc.new_episode(self.root, name, 'intake/voice.wav', 'intake/transcript.json',
                'intake/' + graphic.name, 'intake/captions.json', output_format=name, storyboard='intake/' + name + '.json')
            data, _, captions, bounds = workflow.validate(path)
            html = workflow.build_html(data, captions, bounds)
            self.assertIn('data-profile="' + name + '"', html)
            self.assertIn('data-height="' + str(spec['height']) + '"', html)
            cover = self.root / (name + '.jpg')
            branding.thumbnail(self.root, graphic, board['thumbnail']['headline'], 'EXAMPLE', cover, profile=name)
            with Image.open(cover) as image: self.assertEqual(image.size, (spec['width'], spec['height']))
            with self.assertRaises(ValueError):
                branding.thumbnail(self.root, graphic, board['thumbnail']['headline'], 'EXAMPLE', cover, profile=name)
            with self.assertRaises(ValueError):
                ysc.new_episode(self.root, name + '-bad', 'intake/voice.wav', 'intake/transcript.json',
                    'intake/wide.png', 'intake/captions.json', output_format=name, storyboard='intake/' + name + '.json')
            self.assertFalse((self.root / 'episodes' / (name + '-bad')).exists())
        self.assertEqual(branding.brand_files(self.root), hashes)
        self.assertEqual(self.legacy.read_bytes(), self.legacy_bytes)

    def test_new_resources_reuse_caption_asset_and_text_boundaries(self):
        icon = next(iter(production.kit.verify_assets()['icons']))
        samples = [
            ('code', {'heading': 'Read the contract.', 'filename': 'example.py', 'lines': ['if approved:', '    render()'],
                      'highlights': [0, 1], 'source': 'Illustrative code, never executed.'}, [0, 1]),
            ('diagram', {'heading': 'Follow the process.', 'steps': [
                {'label': 'Inspect', 'body': 'Check the source.', 'icon': icon},
                {'label': 'Review', 'body': 'Make a decision.', 'icon': icon}], 'source': 'Illustrative workflow.'}, [0, 1]),
        ]
        for kind, content, cues in samples:
            board = copy.deepcopy(self.board)
            board['scenes'][0].update(kind=kind, content=content, cues=cues)
            path = self.create(board, 'resource-' + kind)
            data, _, captions, bounds = workflow.validate(path)
            self.assertIn('production-resources.js', workflow.build_html(data, captions, bounds))
        for reveal in production.TITLE_REVEALS:
            board = copy.deepcopy(self.board);board['scenes'][0]['content']['reveal'] = reveal
            if reveal in ('neon-accent', 'particle-burst'):
                board['scenes'][0]['content']['accent_word'] = board['scenes'][0]['content']['title'].split()[0]
            if reveal == 'texture-read':
                board['assets'] = {'texture': {'path': 'wide.png', 'sha256': digest(self.root / 'intake/wide.png')}}
                board['scenes'][0]['content']['texture'] = 'texture'
            self.create(board, 'reveal-' + reveal)
        bad = copy.deepcopy(self.board);bad['scenes'][0]['content']['reveal'] = 'eval'
        with self.assertRaises(ValueError): self.create(bad, 'bad-reveal')
        bad['scenes'][0]['content']['reveal'] = 'scramble';bad['scenes'][0]['transition'] = 'text-match'
        with self.assertRaises(ValueError): self.create(bad, 'bad-match')

    def test_headlines_preserve_exact_text_and_reject_unbounded_controls(self):
        for swap in production.HEADLINE_SWAPS:
            board = copy.deepcopy(self.board)
            board['scenes'][0].update(kind='headline', cues=[0, 1], content={
                'kicker': 'EXACT TEXT', 'phrases': ['Café & code', '</script><img src=x>'], 'swap': swap})
            data, _, captions, bounds = workflow.validate(self.create(board, 'headline-' + swap))
            markup = workflow.build_html(data, captions, bounds)
            self.assertIn('production-headlines.js', markup)
            self.assertNotIn('</script><img', markup)
            for index, change in enumerate([{'swap': 'custom'}, {'font': 'remote'}, {'duration': .2},
                    {'phrases': ['one']}, {'phrases': ['same', 'same']}, {'phrases': ['x' * 53, 'other']},
                    {'phrases': ['one\nline', 'other']} ]):
                bad = copy.deepcopy(board);bad['scenes'][0]['content'].update(change)
                with self.assertRaises(ValueError):self.create(bad, 'bad-headline-' + swap + str(index))
            bad = copy.deepcopy(board);bad['scenes'][0]['cues'] = [0]
            with self.assertRaises(ValueError):self.create(bad, 'bad-headline-cues-' + swap)

    def test_title_marker_requires_explicit_unique_text_and_second_cue(self):
        for style in production.MARKER_STYLES:
            board = copy.deepcopy(self.board);scene = board['scenes'][0]
            scene['cues'] = [0, 1];scene['content']['marker'] = {'text': 'wider', 'style': style}
            self.create(board, 'marker-' + style)
            for index, change in enumerate([{'text': ''}, {'text': 'missing'}, {'style': 'custom'}, {'path': 'M0,0'}, {'color': 'red'}]):
                bad = copy.deepcopy(board);bad['scenes'][0]['content']['marker'].update(change)
                with self.assertRaises(ValueError):self.create(bad, 'bad-marker-' + style + str(index))
            for index in range(4):
                bad = copy.deepcopy(board);s = bad['scenes'][0]
                if index == 0:s['cues'] = [0]
                if index == 1:s['content']['title'] = 'wider wider'
                if index == 2:s['content']['reveal'] = 'matrix'
                if index == 3:s['transition'] = 'text-match'
                with self.assertRaises(ValueError):self.create(bad, 'bad-marker-mode-' + style + str(index))

    def test_code_is_display_only_and_rejects_unknown_controls(self):
        base = {'kind': 'code', 'name': 'Code', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left',
                'content': {'heading': 'Read.', 'filename': 'example.py', 'lines': ['</script><img src=x>', 'review()'],
                            'highlights': [0, 1], 'source': 'Internal example.'}}
        board = copy.deepcopy(self.board);board['scenes'][0] = base
        data, _, captions, bounds = workflow.validate(self.create(board, 'code-text'))
        html = workflow.build_html(data, captions, bounds)
        self.assertNotIn('</script><img', html);self.assertIn('\\u003c/script>', html)
        for case, (field, value) in enumerate([('lines', ['x' * 73, 'y']), ('lines', ['x\nrun()', 'y']),
                             ('lines', ['x\x7f', 'y']), ('lines', ['x\x9b', 'y']), ('highlights', [True, 1]), ('highlights', [0, 0]), ('highlights', [0, 2]),
                             ('command', 'python3 example.py')]):
            bad = copy.deepcopy(board);bad['scenes'][0]['content'][field] = value
            with self.subTest(field=field,value=value), self.assertRaises(ValueError): self.create(bad, 'invalid-code-' + str(case))
        self.assertFalse(any((self.root/'episodes').glob('invalid-code-*')))

    def test_media_grid_layouts_and_treatment_combinations(self):
        captions = [{'start': i * 2, 'end': i * 2 + 1} for i in range(6)]
        for layout, count in production.MEDIA_LAYOUTS.items():
            for treatment in production.MEDIA_TREATMENTS:
                scene = {**title(), 'kind': 'media-grid', 'cues': list(range(count)), 'content': {
                    'heading': 'Keep the full image.', 'layout': layout, 'treatment': treatment,
                    'items': [{'image': 'screen', 'label': 'Local still'} for _ in range(count)], 'source': 'Internal example.'}}
                allowed = treatment == 'box' or (treatment in ('gloss', 'spotlight', 'hand-frame') and layout == 'solo') or (treatment == 'book-open' and layout == '2up')
                if treatment == 'collaborators':
                    allowed = layout == 'solo'
                    scene['cues'] = [0, 1]
                    scene['content']['actors'] = ['Anna', 'Ken']
                if treatment in production.SPATIAL_TREATMENTS:
                    scene['cues'] = [0, 1]
                    allowed = layout == ('3up' if treatment in ('scrub-stack', 'device-splay', 'phone-trio') else 'solo')
                if treatment in production.MEDIA_PRESENTATIONS:
                    allowed = layout == ('4up' if treatment == 'preview-sheet' else 'solo')
                    scene['cues'] = [0] if treatment == 'album-card' else [0, 3]
                    if treatment == 'steam-window': scene['content']['region'] = {'x': .2, 'y': .1, 'width': .4, 'height': .5}
                    if treatment == 'grade-split': scene['content']['grade'] = {'look': 'warm-cinematic', 'split': 62, 'edge': 'hairline', 'labels': True}
                    if treatment == 'album-card':
                        for item in scene['content']['items']: item['detail'] = 'Explicit description'
                with self.subTest(layout=layout, treatment=treatment):
                    if allowed:
                        self.assertEqual(production.validate_scenes([scene], {'screen': object()}, captions, 14), [(0, 14)])
                    else:
                        with self.assertRaises(ValueError): production.validate_scenes([scene], {'screen': object()}, captions, 14)

    def test_media_grid_rejects_unknown_controls_counts_paths_and_cues(self):
        scene = {**title(), 'kind': 'media-grid', 'cues': [0, 1], 'content': {
            'heading': 'Two states.', 'layout': '2up', 'items': [{'image': 'screen', 'label': 'First'},
            {'image': 'screen', 'label': 'Second'}], 'source': 'Internal example.'}}
        changes = [('layout', 'remote'), ('layout', []), ('treatment', 'css'), ('items', []),
                   ('items', [{'image': 'screen', 'label': 'Only one'}]), ('font', 'unapproved'), ('source', ''),
                   ('items', [{'image': '../screen', 'label': 'First'}, {'image': 'screen', 'label': 'Second'}]),
                   ('items', [{'image': 'unknown', 'label': 'First'}, {'image': 'screen', 'label': 'Second'}]),
                   ('items', [{'image': 'screen', 'label': 'x' * 23}, {'image': 'screen', 'label': 'Second'}]),
                   ('items', [{'image': 'screen', 'label': 'First', 'crop': True}, {'image': 'screen', 'label': 'Second'}])]
        for field, value in changes:
            bad = copy.deepcopy(scene); bad['content'][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                production.validate_scenes([bad], {'screen': object()}, self.captions, 12)
        for cues in ([0], [0, 0], [0, True], [0, 999]):
            bad = copy.deepcopy(scene); bad['cues'] = cues
            with self.assertRaises(ValueError): production.validate_scenes([bad], {'screen': object()}, self.captions, 12)

    def test_media_grid_normal_writer_preserves_inputs_and_escapes_text(self):
        Image.new('RGB', (800, 450), '#140b30').save(self.root/'intake/media.png')
        board = copy.deepcopy(self.board)
        board['assets'] = {'screen': {'path': 'media.png', 'sha256': digest(self.root/'intake/media.png')}}
        board['scenes'][0].update(kind='media-grid', cues=[0,1], content={'heading': 'Two states.', 'layout': '2up',
            'treatment': 'book-open', 'items': [{'image': 'screen', 'label': '</script><img src=x>'},
            {'image': 'screen', 'label': 'Second'}], 'source': 'Local fixture.'})
        hashes = branding.brand_files(self.root)
        path = self.create(board, 'media-valid'); data, _, captions, bounds = workflow.validate(path)
        rendered = workflow.build_html(data, captions, bounds)
        self.assertIn('assets/production-media.js', rendered); self.assertIn('assets/production-media.css', rendered)
        self.assertNotIn('</script><img', rendered); self.assertIn('\\u003c/script>', rendered)
        self.assertEqual(branding.brand_files(self.root), hashes); self.assertEqual(self.legacy.read_bytes(), self.legacy_bytes)
        for name, asset in [('hash', {'path': 'media.png', 'sha256': '0' * 64}),
                            ('path', {'path': '../media.png', 'sha256': digest(self.root/'intake/media.png')})]:
            bad = copy.deepcopy(board); bad['assets']['screen'] = asset
            with self.assertRaises(ValueError): self.create(bad, 'media-bad-' + name)
            self.assertFalse((self.root/'episodes'/('media-bad-' + name)).exists())

    def test_carousel_and_iris_require_contained_verified_local_stills(self):
        Image.new('RGB', (800, 450), '#140b30').save(self.root/'intake/screen.png')
        board = copy.deepcopy(self.board)
        board['assets'] = {'screen': {'path': 'screen.png', 'sha256': digest(self.root/'intake/screen.png')}}
        board['scenes'][0].update(kind='carousel', cues=[0,1], content={'heading':'Two states.',
            'screens':[{'image':'screen','label':'First'},{'image':'screen','label':'Second'}],'source':'Local fixture.'})
        self.create(board,'carousel-valid')
        bad = copy.deepcopy(board);bad['scenes'][0]['content']['screens'][1]['image']='../screen'
        with self.assertRaises(ValueError): self.create(bad,'carousel-bad')
        board['scenes'][0].update(kind='screen',content={'heading':'Two states.','caption':'Inspect the change.',
            'images':['screen','screen'],'chrome':'browser','swap':'iris'})
        self.create(board,'iris-valid')
        bad=copy.deepcopy(board);bad['scenes'][0]['content']['swap']='remote-script'
        with self.assertRaises(ValueError): self.create(bad,'iris-bad')

    def test_screen_transitions_use_the_normal_writer_and_local_asset_contract(self):
        Image.new('RGB', (800, 450), '#140b30').save(self.root/'intake/screen.png')
        for swap in ('curtain', 'grid', 'halftone', 'fade-through', 'whip-pan') + tuple('shader-' + name for name in production.SHADER_SWAPS):
            board = copy.deepcopy(self.board)
            board['assets'] = {'screen': {'path': 'screen.png', 'sha256': digest(self.root/'intake/screen.png')}}
            board['scenes'][0].update(kind='screen', cues=[0, 1], content={
                'heading': 'Review both states.', 'caption': 'Supplied local images.',
                'images': ['screen', 'screen'], 'chrome': 'browser', 'swap': swap})
            path = self.create(board, 'screen-' + swap)
            data, _, captions, bounds = workflow.validate(path)
            rendered = workflow.build_html(data, captions, bounds)
            self.assertIn('assets/production-transitions.js', rendered)
            self.assertIn('production-transitions.css', rendered)
            if swap.startswith('shader-'):
                import base64
                output = self.root / ('shader-assets-' + swap)
                (output / 'assets').mkdir(parents=True)
                production.install_assets(output, data, path.parent)
                self.assertIn('production-shader-images.js', rendered)
                encoded = (output / 'assets/production-shader-images.js').read_text()
                mapping = json.loads(encoded.removeprefix('window.ShortCreatorShaderImages=Object.freeze(').removesuffix(');\n'))
                self.assertEqual(set(mapping), {'assets/still-screen.png'})
                self.assertEqual(base64.b64decode(mapping['assets/still-screen.png'].split(',', 1)[1]), (self.root/'intake/screen.png').read_bytes())
                with self.assertRaises(ValueError):
                    production.install_assets(output, data, path.parent)
            for case, (field, value) in enumerate([('images', ['screen', '../screen']), ('direction', 'remote'),
                                 ('duration', 10), ('focus', []), ('images', ['missing', 'screen'])]):
                bad = copy.deepcopy(board);bad['scenes'][0]['content'][field] = value
                with self.subTest(swap=swap, field=field), self.assertRaises(ValueError):
                    self.create(bad, 'invalid-' + swap + '-' + str(case))

    def test_resource_count_limits_and_caption_cardinality(self):
        captions = [{'text': 'Review.', 'start': i*2, 'end': i*2+1.5} for i in range(10)]
        icon = next(iter(production.kit.verify_assets()['icons']))
        records = [
            ('code', {'heading': 'Read.', 'filename': 'example.py', 'source': 'Example.',
                      'lines': ['review()']*12, 'highlights': [0, 2, 4, 6, 8, 11]}, 6, {}),
            ('carousel', {'heading': 'Follow.', 'source': 'Example.',
                          'screens': [{'image': 'screen', 'label': 'State'}]*5}, 5, {'screen': object()}),
            ('diagram', {'heading': 'Explain.', 'source': 'Example.',
                         'steps': [{'label': 'Review', 'body': 'Keep the source.', 'icon': icon}]*4}, 4, {}),
        ]
        for kind, content, count, assets in records:
            scene = {**title(), 'kind': kind, 'content': content, 'cues': list(range(count))}
            self.assertEqual(production.validate_scenes([scene], assets, captions, 20), [(0, 20)])
            bad = copy.deepcopy(scene);bad['cues'].pop()
            with self.subTest(kind=kind, case='cue count'), self.assertRaises(ValueError):
                production.validate_scenes([bad], assets, captions, 20)
            field = {'code': 'lines', 'carousel': 'screens', 'diagram': 'steps'}[kind]
            bad = copy.deepcopy(scene);bad['content'][field].append(copy.deepcopy(content[field][-1]))
            with self.subTest(kind=kind, case='item count'), self.assertRaises(ValueError):
                production.validate_scenes([bad], assets, captions, 20)
            bad = copy.deepcopy(scene);bad['content']['html'] = '<script>run()</script>'
            with self.subTest(kind=kind, case='unknown content'), self.assertRaises(ValueError):
                production.validate_scenes([bad], assets, captions, 20)

    def test_lower_third_variants_keep_the_existing_record_closed(self):
        base = {**title(), 'kind': 'lower-third', 'content': {'heading': 'Attribution', 'name': 'Signal Lab',
                'role': 'Research notes', 'context': 'Keep the source visible.'}}
        for variant in production.LOWER_VARIANTS:
            scene = copy.deepcopy(base);scene['content']['variant'] = variant
            captions = self.captions
            if variant == 'channel-card':
                scene['cues'] = [0, 1]
                scene['content']['button'] = {'before': 'Open preview', 'after': 'Preview ready'}
            if variant == 'news-ticker':
                scene['cues'] = [0, 1];scene['content']['items'] = ['First explicit item', 'Second explicit item']
                captions = [{'start': 0, 'end': 1}, {'start': 6, 'end': 7}]
            self.assertEqual(production.validate_scenes([scene], {}, captions, 12), [(0, 12)])
        self.assertEqual(production.validate_scenes([base], {}, self.captions, 12), [(0, 12)])
        for key, value in [('variant', 'remote'), ('variant', {}), ('font', 'other.woff2'), ('color', '#ffffff'), ('script', 'run()')]:
            bad = copy.deepcopy(base);bad['content'][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                production.validate_scenes([bad], {}, self.captions, 12)

    def test_checklist_requires_explicit_states_and_valid_emphasis(self):
        base = {**title(), 'kind': 'checklist', 'cues': [0, 1], 'content': {'heading': 'Review the result.',
                'emphasis': 'result', 'source': 'Internal fixture.', 'items': [
                    {'label': 'Input', 'value': 'Present', 'checked': True},
                    {'label': 'Review', 'value': 'Pending', 'checked': False}]}}
        board = copy.deepcopy(self.board);board['scenes'][0] = copy.deepcopy(base)
        episode, _, captions, bounds = workflow.validate(self.create(board, 'checklist'))
        self.assertFalse(episode['scenes'][0]['content']['items'][1]['checked'])
        self.assertIn('production-resources.js', workflow.build_html(episode, captions, bounds))
        for value in [1, 0, 'true', None]:
            bad = copy.deepcopy(base);bad['content']['items'][0]['checked'] = value
            with self.subTest(value=value), self.assertRaises(ValueError):production.validate_scenes([bad], {}, self.captions, 12)
        for emphasis in ['missing', '', 'x'*21]:
            bad = copy.deepcopy(base);bad['content']['emphasis'] = emphasis
            with self.subTest(emphasis=emphasis), self.assertRaises(ValueError):production.validate_scenes([bad], {}, self.captions, 12)
        bad = copy.deepcopy(base);bad['content'].update(heading='Review and Review', emphasis='Review')
        with self.assertRaises(ValueError):production.validate_scenes([bad], {}, self.captions, 12)
        for count in (2, 5):
            scene = copy.deepcopy(base);scene['content']['items'] = [copy.deepcopy(base['content']['items'][0]) for _ in range(count)]
            scene['cues'] = list(range(count))
            self.assertEqual(production.validate_scenes([scene], {}, self.captions, 12), [(0, 12)])
        for count in (1, 6):
            bad = copy.deepcopy(base);bad['content']['items'] *= count;bad['content']['items'] = bad['content']['items'][:count]
            bad['cues'] = list(range(count))
            with self.assertRaises(ValueError):production.validate_scenes([bad], {}, self.captions, 12)

    def test_all_eight_families_accept_bounded_data(self):
        panel={'label':'Review','body':'Keep the source.','icon':'check'}
        # Use a pinned icon from the actual manifest, not an assumed public ID.
        panel['icon']=next(iter(production.kit.verify_assets()['icons']))
        records={
            'title':(title()['content'],[0]),
            'kinetic':({'kicker':'ONE PHRASE','words':['Think','Build','Review']},[0,1,2]),
            'grid':({'heading':'Each step matters.','items':[panel,panel]},[0,1]),
            'quote':({'quote':'A sourced example.','attribution':'Example author','source':'Illustrative quotation'},[0]),
            'screen':({'heading':'A local screen.','caption':'Illustrative image.','images':['screen-a'],'chrome':'browser'},[0]),
            'walkthrough':({'heading':'Follow the work.','sections':[panel,panel]},[0,1]),
            'lower-third':({'heading':'Attribution','name':'Signal Lab','role':'Example','context':'The source stays visible.'},[0]),
            'cta':({'heading':'Ready for review.','action':'Inspect the result','label':'Manual publication.'},[0])}
        for kind,(content,cues) in records.items():
            scene={**title(),'kind':kind,'content':content,'cues':cues}
            assets={'screen-a':object()} if kind=='screen' else {}
            self.assertEqual(production.validate_scenes([scene],assets,self.captions,12),[(0,12)])
            serialized_assets = {name: {'path': 'screen.png'} for name in assets}
            scripts = production.scripts({'scenes': [scene], 'assets': serialized_assets},
                                         {'colors': {'accent': '#caff29'}})
            self.assertIn('production-scenes.js', scripts)
            if kind in ('grid', 'walkthrough'):
                self.assertIn('data:image/svg+xml;base64,', scripts)

    def test_reject_unknown_fields_oversize_copy_and_bad_timing(self):
        mutations=[lambda s:s.update(css='body{}'),lambda s:s.update(kind='html'),
                   lambda s:s.update(kind='screen',content=None),
                   lambda s:s.update(transition='remote'),lambda s:s.update(first_cue=True),
                   lambda s:s.update(cues=[True]),lambda s:s.update(cues=[5]),
                   lambda s:s['content'].update(title='x'*53)]
        for mutate in mutations:
            scene=title();mutate(scene)
            with self.subTest(scene=scene), self.assertRaises(ValueError):
                production.validate_scenes([scene],{},self.captions,10)
        with self.assertRaises(ValueError):production.validate_scenes([title()]*121,{},self.captions,12)

    def test_focus_contract_rejects_unsafe_regions_and_requires_separate_beats(self):
        region={'x':.3,'y':.2,'width':.3,'height':.4,'zoom':1.8,'label':'Review'}
        screen={**title(),'kind':'screen','cues':[0,1],
                'content':{'heading':'Inspect','caption':'A local image','images':['screen-a'],
                           'chrome':'browser','focus':[region]}}
        original=copy.deepcopy(screen)
        production.validate_scenes([screen],{'screen-a':object()},self.captions,12)
        self.assertEqual(screen,original)
        mutations=[lambda s:s['content']['focus'][0].update(x=-.1),
                   lambda s:s['content']['focus'][0].update(x=.9),
                   lambda s:s['content']['focus'][0].update(zoom=3.1),
                   lambda s:s['content']['focus'][0].update(zoom=True),
                   lambda s:s['content']['focus'][0].update(y=float('nan')),
                   lambda s:s['content']['focus'][0].update(width=0),
                   lambda s:s['content']['focus'][0].update(height=.6),
                   lambda s:s['content']['focus'][0].update(selector='body'),
                   lambda s:s['content'].update(images=['screen-a','screen-a']),
                   lambda s:s.update(cues=[0])]
        for mutation in mutations:
            bad=copy.deepcopy(screen);mutation(bad)
            with self.subTest(scene=bad),self.assertRaises(ValueError):
                production.validate_scenes([bad],{'screen-a':object()},self.captions,12)

    def test_metric_styles_keep_numeric_values_and_provenance(self):
        record = {'id': 'metric', 'kind': 'metric', 'title': 'A number', 'insight': 'Illustrative only',
                  'icon': next(iter(production.kit.verify_assets()['icons'])),
                  'source': {'kind': 'illustrative', 'label': 'Fixture', 'reference': 'Internal example', 'as_of': '2026-10-15'},
                  'data': {'label': 'Example', 'value': 12.5, 'unit': 'units', 'context': 'Retain the source'}}
        for style in (style for style in production.METRIC_STYLES if style != 'star-rating'):
            for value in (0, 12.5, 1_000_000):
                content = {'record': copy.deepcopy(record), 'metric_style': style}
                content['record']['data']['value'] = value
                if style in ('usage-arc', 'progress-bar', 'conic-ring'): content['maximum'] = 1_000_000
                scene = {**title(), 'kind': 'chart', 'content': content}
                if style == 'count-burst': scene['cues'] = [0, 1]
                if style == 'soft-stat' and value == 1_000_000:
                    with self.assertRaises(ValueError): production.validate_scenes([scene], {}, self.captions, 12)
                    continue
                before = copy.deepcopy(scene)
                production.validate_scenes([scene], {}, self.captions, 12)
                self.assertEqual(scene, before)
                board = copy.deepcopy(self.board);board['scenes'] = [scene]
                data, _, captions, bounds = workflow.validate(self.create(board, f'metric-{style}-{str(value).replace(".", "-")}'))
                self.assertEqual(data['scenes'][0]['content'], content)
                self.assertIn('production-resources.js', workflow.build_html(data, captions, bounds))
        for style in ('wheel', 'slot', 'pop'):
            for value in (-999999.125, 1e-7, 0.123456789):
                scene = {**title(), 'kind': 'chart', 'content': {'record': copy.deepcopy(record), 'metric_style': style}}
                scene['content']['record']['data']['value'] = value
                production.validate_scenes([scene], {}, self.captions, 12)

    def test_metric_gauges_reject_inferred_maxima_and_invalid_data(self):
        record = {'id': 'metric', 'kind': 'metric', 'title': 'A number', 'insight': 'Illustrative only',
                  'icon': next(iter(production.kit.verify_assets()['icons'])),
                  'source': {'kind': 'illustrative', 'label': 'Fixture', 'reference': 'Internal example', 'as_of': '2026-10-15'},
                  'data': {'label': 'Example', 'value': 12.5, 'unit': 'units', 'context': 'Retain the source'}}
        base = {**title(), 'kind': 'chart', 'content': {'record': record, 'metric_style': 'usage-arc', 'maximum': 100}}
        mutations = [lambda c: c.pop('maximum'), lambda c: c.update(metric_style='remote'),
                     lambda c: c.update(metric_style='count'), lambda c: c.update(metric_style='wheel'),
                     lambda c: c.update(maximum=0), lambda c: c.update(maximum=True),
                     lambda c: c.update(maximum=float('nan')), lambda c: c.update(maximum=float('inf')),
                     lambda c: c.update(maximum=1_000_001), lambda c: c.update(maximum=1),
                     lambda c: c['record']['data'].update(value=-1), lambda c: c['record']['data'].update(value=True),
                     lambda c: c['record']['data'].update(value=float('inf')), lambda c: c['record']['source'].update(kind='trusted'),
                     lambda c: c['record']['source'].update(as_of='yesterday'), lambda c: c['record'].pop('source'),
                     lambda c: c.update(duration=10), lambda c: c.update(css='color:red')]
        for mutate in mutations:
            scene = copy.deepcopy(base);mutate(scene['content'])
            with self.subTest(content=scene['content']), self.assertRaises(ValueError):
                production.validate_scenes([scene], {}, self.captions, 12)
        for option in ({'metric_style': 'count'}, {'metric_style': 'slot'}, {'maximum': 100}):
            scene = copy.deepcopy(base);scene['content'] = {'record': copy.deepcopy(record), **option}
            scene['content']['record'].update(kind='bar', data={'categories': ['A', 'B'], 'series': [{'label': 'X', 'values': [1, 2]}], 'unit': 'units'})
            scene['cues'] = [0, 1]
            with self.assertRaises(ValueError): production.validate_scenes([scene], {}, self.captions, 12)

    def test_star_ratings_have_explicit_scale_units_and_exact_values(self):
        record = {'id': 'rating', 'kind': 'metric', 'title': 'Example rating', 'insight': 'Illustrative only',
                  'icon': next(iter(production.kit.verify_assets()['icons'])),
                  'source': {'kind': 'illustrative', 'label': 'Fixture', 'reference': 'Internal example', 'as_of': '2026-10-15'},
                  'data': {'label': 'Rating', 'value': 4.8, 'unit': 'stars', 'context': 'Explicit scale'}}
        base = {**title(), 'kind': 'chart', 'content': {'record': record, 'metric_style': 'star-rating', 'maximum': 5}}
        for maximum in (1, 5, 10):
            for value in (0, maximum / 2, maximum):
                scene = copy.deepcopy(base);scene['content']['maximum'] = maximum
                scene['content']['record']['data']['value'] = value
                original = copy.deepcopy(scene)
                production.validate_scenes([scene], {}, self.captions, 12)
                self.assertEqual(scene, original)
        for maximum in (True, 0, 11, 5.0, 4.8):
            scene = copy.deepcopy(base);scene['content']['maximum'] = maximum
            with self.assertRaises(ValueError): production.validate_scenes([scene], {}, self.captions, 12)
        scene = copy.deepcopy(base);scene['content']['record']['data']['unit'] = 'percent'
        with self.assertRaises(ValueError): production.validate_scenes([scene], {}, self.captions, 12)
        for value in (True, -1, 5.1, float('nan')):
            scene = copy.deepcopy(base);scene['content']['record']['data']['value'] = value
            with self.assertRaises(ValueError): production.validate_scenes([scene], {}, self.captions, 12)

    def test_evidence_compositions_preserve_explicit_content_sources_and_badges(self):
        source = {'kind': 'illustrative', 'label': 'Fixture', 'reference': 'Internal example', 'as_of': '2026-10-15'}
        icon = next(iter(production.kit.verify_assets()['icons']))
        samples = [('trust', [0, 1, 2], {'heading': 'Sources', 'marks': ['Source A', 'Source B', 'Source C'], 'source': source}),
                   ('testimonial', [0, 1], {'heading': 'A sourced quote', 'quote': 'Keep the source attached.',
                    'author': 'Example Author', 'role': 'Illustrative quotation', 'rating': 0, 'source': source}),
                   ('proof', [0, 1, 2], {'heading': 'Review the evidence', 'claim': 'Illustrative claim', 'action': 'Review',
                    'features': [{'label': 'Source', 'icon': icon, 'badge': 'NEW'}, {'label': 'Check', 'icon': icon},
                                 {'label': 'Review', 'icon': icon, 'badge': '0'}], 'rating': 4.85, 'source': source})]
        for kind, cues, content in samples:
            board = copy.deepcopy(self.board);board['scenes'] = [{**title(), 'kind': kind, 'cues': cues, 'content': content}]
            data, _, captions, bounds = workflow.validate(self.create(board, 'evidence-' + kind))
            self.assertEqual(data['scenes'][0]['content'], content)
            html = workflow.build_html(data, captions, bounds)
            self.assertIn('production-evidence.js', html);self.assertIn('production-evidence.css', html)
            if kind == 'proof': self.assertIn('data:image/svg+xml;base64,', html)
            for mutate in (lambda c: c.pop('source'), lambda c: c['source'].update(kind='verified'),
                           lambda c: c['source'].update(as_of='yesterday'), lambda c: c['source'].update(reference=''),
                           lambda c: c.update(css='color: red')):
                bad = copy.deepcopy(board['scenes'][0]);mutate(bad['content'])
                with self.assertRaises(ValueError): production.validate_scenes([bad], {}, self.captions, 12)

    def test_evidence_bounds_do_not_infer_credibility(self):
        source = {'kind': 'illustrative', 'label': 'Fixture', 'reference': 'Internal example', 'as_of': '2026-10-15'}
        trust = {**title(), 'kind': 'trust', 'cues': [0, 1, 2], 'content': {'heading': 'Sources',
                 'marks': ['A', 'B', 'C'], 'source': source}}
        for marks in ([], ['A', 'B'], ['A']*8, ['A', 'B', 'a'], ['x'*25, 'B', 'C'], [True, 'B', 'C']):
            scene = copy.deepcopy(trust);scene['content']['marks'] = marks
            with self.assertRaises(ValueError): production.validate_scenes([scene], {}, self.captions, 12)
        captions = [{'start': i*2} for i in range(7)]
        scene = copy.deepcopy(trust);scene['content']['marks'] = [f'Source {i}' for i in range(7)];scene['cues'] = list(range(7))
        production.validate_scenes([scene], {}, captions, 14)
        testimonial = {**title(), 'kind': 'testimonial', 'cues': [0, 1], 'content': {'heading': 'Quote', 'quote': 'Example',
                       'author': 'Example Author', 'role': 'Fixture', 'rating': 0, 'source': source}}
        for value in (True, -1, 5.01, float('inf'), '5', None):
            bad = copy.deepcopy(testimonial);bad['content']['rating'] = value
            with self.assertRaises(ValueError): production.validate_scenes([bad], {}, self.captions, 12)
        for field in ('rating', 'author', 'role'):
            bad = copy.deepcopy(testimonial);bad['content'].pop(field)
            with self.assertRaises(ValueError): production.validate_scenes([bad], {}, self.captions, 12)
        icon = next(iter(production.kit.verify_assets()['icons']))
        proof = {**title(), 'kind': 'proof', 'cues': [0, 1, 2], 'content': {'heading': 'Evidence', 'claim': 'Example',
                 'features': [{'label': 'Input', 'icon': icon, 'badge': '3'} for _ in range(3)],
                 'action': 'Review', 'rating': 3.25, 'source': source}}
        for mutate in (lambda c: c['features'].pop(), lambda c: c['features'].append(c['features'][0]),
                       lambda c: c['features'][0].update(icon='remote'), lambda c: c['features'][0].update(badge='12345'),
                       lambda c: c['features'][0].update(badge=3), lambda c: c.update(rating=True)):
            bad = copy.deepcopy(proof);mutate(bad['content'])
            with self.assertRaises(ValueError): production.validate_scenes([bad], {}, self.captions, 12)

    def test_landscape_data_reuses_provenance_and_numeric_contracts(self):
        icon=next(iter(production.kit.verify_assets()['icons']))
        record={'id':'example','kind':'bar','title':'A chart','insight':'Illustrative only','icon':icon,
                'source':{'kind':'illustrative','label':'Fixture','reference':'Internal example','as_of':'2026-10-15'},
                'data':{'categories':['A','B','C'],'series':[{'label':'Example','values':[0,1.25,1000000]}],'unit':'units'}}
        variants={'bar':(record['data'],[0,1,2]),'line':(record['data'],[0,1,2]),
                  'metric':({'label':'A number','value':-1.25,'unit':'units','context':'Example'},[0]),
                  'comparison':({'left':{'label':'Before','items':['One']},'right':{'label':'After','items':['Two']}},[0,1])}
        for kind,(data,cues) in variants.items():
            scene={**title(),'kind':'chart','cues':cues,'content':{'record':{**record,'kind':kind,'data':data}}}
            before=copy.deepcopy(scene)
            production.validate_scenes([scene],{},self.captions,12)
            self.assertEqual(scene,before)
            board=copy.deepcopy(self.board);board['scenes']=[scene]
            authored=self.create(board,'data-'+kind)
            verified,_,captions,bounds=workflow.validate(authored)
            self.assertEqual(verified['scenes'][0]['content']['record'],before['content']['record'])
            self.assertIn('visual-story.js',workflow.build_html(verified,captions,bounds))
        scene={**title(),'kind':'chart','cues':[0,1,2],'content':{'record':record}}
        mutations=[lambda r:r['source'].update(kind='verified'),lambda r:r['source'].update(as_of='yesterday'),
                   lambda r:r['data']['series'][0].update(values=[1,2]),
                   lambda r:r['data']['series'][0].update(values=[1,float('inf'),3]),
                   lambda r:r['data']['series'][0].update(values=[1,-2,3]),
                   lambda r:r['data']['series'].append({'label':'Other','values':[1,2,3]}),
                   lambda r:r.update(script='alert(1)')]
        for mutation in mutations:
            bad=copy.deepcopy(scene);mutation(bad['content']['record'])
            with self.subTest(scene=bad),self.assertRaises(ValueError):
                production.validate_scenes([bad],{},self.captions,12)

    def test_text_match_requires_adjacent_nonoverlapping_title_pairs(self):
        scenes=[title(),title('Second',2),title('Third',4)]
        scenes[0]['transition']='text-match'
        production.validate_scenes(scenes,{},self.captions,12)
        for mutation in (lambda s:s[1].update(transition='text-match'),
                         lambda s:s[0]['content'].update(title='x'*33),
                         lambda s:s[2].update(transition='text-match'),
                         lambda s:s[1].update(kind='cta',content={'heading':'Heading','action':'Act','label':'Label'})):
            bad=copy.deepcopy(scenes);mutation(bad)
            with self.subTest(scenes=bad),self.assertRaises(ValueError):
                production.validate_scenes(bad,{},self.captions,12)

    def test_asset_hash_path_and_unused_rejection(self):
        source=self.root/'intake/wide.png'
        valid={'screen-a':{'path':'wide.png','sha256':digest(source)}}
        self.assertEqual(production.validate_assets(valid,source.parent)['screen-a'],source)
        for path in ('../intake/wide.png','/etc/passwd','https://example.test/x.png'):
            changed=copy.deepcopy(valid);changed['screen-a']['path']=path
            with self.subTest(path=path), self.assertRaises((ValueError,OSError)):
                production.validate_assets(changed,source.parent)
        changed=copy.deepcopy(valid);changed['screen-a']['sha256']='0'*64
        with self.assertRaises(ValueError):production.validate_assets(changed,source.parent)
        (source.parent/'linked.png').symlink_to(source)
        changed=copy.deepcopy(valid);changed['screen-a']['path']='linked.png'
        with self.assertRaises(ValueError):production.validate_assets(changed,source.parent)
        with self.assertRaises(ValueError):production.validate_scenes([title()],valid,self.captions,12)

    def test_text_is_data_not_markup(self):
        board=copy.deepcopy(self.board);board['scenes'][0]['content']['title']='</script><img src=x>'
        path=self.create(board);data,_,captions,bounds=workflow.validate(path)
        rendered=workflow.build_html(data,captions,bounds)
        self.assertNotIn('</script><img',rendered)
        self.assertIn('\\u003c/script>',rendered)

    def test_writer_rejects_before_creating_invalid_episode_and_never_overwrites(self):
        bad=copy.deepcopy(self.board);bad['scenes'][0]['content']['title']='X'*100
        with self.assertRaises(ValueError):self.create(bad,'invalid')
        self.assertFalse((self.root/'episodes/invalid').exists())
        path=self.create();before=path.read_bytes()
        with self.assertRaises(ValueError):
            ysc.new_episode(self.root,'wide-test','intake/voice.wav','intake/transcript.json',
                'intake/wide.png','intake/captions.json',output_format='landscape',storyboard='intake/wide-test.json')
        self.assertEqual(path.read_bytes(),before)

    def test_caption_and_media_input_hashes_still_gate(self):
        path=self.create();data=read_json(path)
        data['inputs']['audio']['sha256']='0'*64;path.write_text(json.dumps(data))
        with self.assertRaises(ValueError):workflow.validate(path)

    def test_unknown_input_roles_fail_before_any_episode_write(self):
        inputs = {'audio': 'intake/voice.wav', 'graphic': 'intake/wide.png',
                  'captions': 'intake/captions.json', 'transcript': 'intake/transcript.json'}
        for supplied in ({**inputs, 'script': 'intake/script.js'},
                         {name: path for name, path in inputs.items() if name != 'audio'}):
            with self.subTest(keys=list(supplied)), self.assertRaises(ValueError):
                production.new_episode(self.root, 'invalid-inputs', supplied, 'intake/board.json')
            self.assertFalse((self.root/'episodes/invalid-inputs').exists())

    def test_thumbnail_is_landscape_and_uses_no_overwrite(self):
        output=self.root/'wide-cover.jpg'
        branding.thumbnail(self.root,self.root/'intake/wide.png',['WIDE CANVAS','SAME BRAND'],'EXAMPLE',output,profile='landscape')
        with Image.open(output) as image:self.assertEqual(image.size,(1920,1080))
        with self.assertRaises(ValueError):
            branding.thumbnail(self.root,self.root/'intake/wide.png',['WIDE CANVAS','SAME BRAND'],'EXAMPLE',output,profile='landscape')

    def test_cli_exposes_explicit_profile_and_storyboard(self):
        args=ysc.parser().parse_args(['new','x','--audio','a','--graphic','g','--transcript','t','--captions','c',
                                     '--format','landscape','--storyboard','s'])
        self.assertEqual(args.format,'landscape');self.assertEqual(args.storyboard,'s')
        self.assertEqual(ysc.parser().parse_args(['compositions']).command,'compositions')

    def test_native_runtime_rejection_creates_no_run(self):
        path=self.create()
        with patch.object(workflow,'doctor',return_value=({}, {'backend':'native'})), self.assertRaises(ValueError):
            workflow.build(path,'not-created',True)
        self.assertFalse((self.root/'runs/wide-test/not-created').exists())
