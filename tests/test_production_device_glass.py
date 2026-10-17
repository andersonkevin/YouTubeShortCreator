import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

import branding
import production_visuals as production
from tools.vendor_device_glass import bundle, PINS


def fixture(style):
    notification = {'icon': 'file-text', 'title': 'Review', 'time': 'now', 'body': 'The draft is ready.'}
    content = {'style': style, 'heading': 'A clearer workspace', 'caption': 'Review each step.',
               'source': 'Internal illustrative test', 'image': 'screen'}
    if style == 'phone-glass':
        content['notifications'] = [{**notification, 'icon': icon} for icon in ['file-text', 'code', 'circle-check']]
    else:
        content.update(notification=notification, desktop={
            'menu': {'app': 'Workspace', 'items': ['File', 'Edit', 'View', 'Go', 'Window', 'Help'], 'status': 'Local preview'},
            'window': {'title': 'Review assets',
                       'sidebar': [{'label': label, 'icon': icon} for label, icon in zip(
                           ['Overview', 'Inputs', 'Code', 'Data', 'Review', 'Output'], ['layers', 'file-text', 'code', 'database', 'check', 'server'])],
                       'files': [{'label': label, 'kind': 'document' if i in (4, 5) else 'folder'} for i, label in enumerate(
                           ['Outline', 'Screens', 'Charts', 'Scenes', 'Script', 'Notes', 'Clips', 'Exports'])]},
            'calendar': {'year': 2026, 'month': 10, 'day': 16},
            'status': {'label': 'Local runtime', 'value': 'Ready', 'detail': 'Offline', 'note': 'Review required'},
            'media': {'title': 'Preview', 'detail': 'Current episode'},
            'dock': ['file-text', 'search', 'code', 'clock', 'layers', 'check', 'audio-lines', 'database', 'server']})
    return {'kind': 'spatial-stage', 'name': 'Device glass', 'first_cue': 0, 'cues': [0, 1], 'transition': 'cut-left', 'content': content}


class DeviceGlassContracts(unittest.TestCase):
    def validate(self, scene, gap=15):
        return production.validate_scenes([scene], {'screen': {}}, [{'start': .1, 'end': 1}, {'start': .1+gap, 'end': 1+gap}], 19)

    def test_closed_records_require_explicit_screen_and_copy(self):
        for style in ['phone-glass', 'desktop-glass']:
            scene=fixture(style);before=copy.deepcopy(scene);self.assertEqual(self.validate(scene), [(0,19)]);self.assertEqual(scene,before)
            with self.assertRaises(ValueError):self.validate(scene,14.99)
            for field,value in [('image','../screen'),('font','Other'),('model','custom.glb'),('camera',{})]:
                bad=copy.deepcopy(scene);bad['content'][field]=value
                with self.subTest(style=style,field=field),self.assertRaises(ValueError):self.validate(bad)

    def test_notification_slots_and_icons_are_bounded(self):
        for count in [0,1,2,4]:
            scene=fixture('phone-glass');scene['content']['notifications']=[scene['content']['notifications'][0]]*count
            with self.assertRaises(ValueError):self.validate(scene)
        for key,value in [('icon','https://example.invalid/icon.svg'),('title','W'*21),('body','W'*61),('time','W'*9)]:
            scene=fixture('phone-glass');scene['content']['notifications'][0][key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):self.validate(scene)

    def test_desktop_calendar_and_panel_cardinality_reject_invalid_values(self):
        for date in [{'year':2025,'month':2,'day':29},{'year':2026,'month':13,'day':1},{'year':True,'month':1,'day':1}]:
            scene=fixture('desktop-glass');scene['content']['desktop']['calendar']=date
            with self.assertRaises(ValueError):self.validate(scene)
        for path in [('dock',),('window','files'),('window','sidebar'),('menu','items')]:
            scene=fixture('desktop-glass');target=scene['content']['desktop']
            for key in path[:-1]:target=target[key]
            target[path[-1]].pop()
            with self.assertRaises(ValueError):self.validate(scene)
        scene=fixture('desktop-glass');scene['content']['desktop']['calendar']={'year':2024,'month':2,'day':29};self.validate(scene)

    def test_compiler_loads_only_selected_model_and_shared_native_modules_once(self):
        brand={'colors':branding.PALETTES['violet']}
        for style,model,other in [('phone-glass','iphone','macbook'),('desktop-glass','macbook','iphone')]:
            for profile in production.COMPOSITION_FORMATS:
                data={'format':profile,'scenes':[fixture(style),fixture(style)],'assets':{'screen':{'path':'screen.png'}}}
                html=production.scripts(data,brand)
                self.assertEqual(html.count('src="assets/production-device-'+model+'-data.js"'),1)
                self.assertNotIn('production-device-'+other+'-data.js',html)
                self.assertEqual(html.count('src="assets/production-device-models.js"'),1)
                self.assertEqual(html.count('src="assets/production-device-glass.js"'),1)
                self.assertEqual(production.raster_images(data),{'screen'})
                self.assertNotIn('src="https:',html)
                payload=json.loads(html.split('id="production-scene-data">')[1].split('</script>')[0])
                expected={'file-text','code','circle-check'} if style=='phone-glass' else {'file-text','layers','code','database','check','server','search','clock','audio-lines'}
                self.assertEqual(set(payload['icons']),expected)

    def test_converter_rejects_missing_changed_or_symlinked_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            with self.assertRaises(ValueError):bundle(root)
            name=PINS['phone'][0];folder=root/name;folder.mkdir();source=folder/(name+'.html');source.write_text('changed')
            with self.assertRaises(ValueError):bundle(root)
            alias=root/'alias';alias.symlink_to(folder,target_is_directory=True)
            with self.assertRaises(ValueError):bundle(alias)
            self.assertEqual(source.read_text(),'changed')

    def test_optional_upstream_rebuild_preserves_originals(self):
        root=Path(__file__).resolve().parents[1];blocks=root.parents[1]/'registry/blocks'
        if not blocks.is_dir():self.skipTest('Upstream checkout is optional for consumers')
        sources=[blocks/name/(name+'.html') for name,_ in PINS.values()]
        hashes=[hashlib.sha256(p.read_bytes()).hexdigest() for p in sources]
        self.assertEqual(bundle(blocks),(root/'templates/v1/assets/production-device-glass-motion.js').read_text())
        self.assertEqual(hashes,[hashlib.sha256(p.read_bytes()).hexdigest() for p in sources])
