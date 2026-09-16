import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from safety import digest, read_json, write_json
from tools.widget_smoke import check_visual_pixels


class WidgetPixelTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.output = self.root / 'runs/widget-fixture/qualification'
        self.output.mkdir(parents=True)
        write_json(self.output / 'episode.json', {'scenes': [
            {'layout': 'visual-library', 'visual_id': 'metric'}]})
        self.make_image()
        self.record()

    def make_image(self, blank=False, size=(1080, 1920)):
        image = Image.new('RGB', size, 'black')
        if not blank:
            ImageDraw.Draw(image).rectangle((400, 800, 440, 840), fill='white')
        image.save(self.output / 'scene-1.png')

    def record(self):
        (self.output / 'run.json').write_text(json.dumps({'automated_checks': 'PASS',
            'outputs': {name: digest(self.output / name)
                        for name in ('episode.json', 'scene-1.png')}}))

    def test_reads_without_mutation(self):
        before = {p.name: digest(p) for p in self.output.iterdir()}
        result = check_visual_pixels(self.root)
        self.assertEqual(result['status'], 'PASS')
        self.assertEqual(result['samples'][0]['bright_text_pixels'], 1681)
        self.assertFalse(result['writes_performed'])
        self.assertEqual(before, {p.name: digest(p) for p in self.output.iterdir()})

    def test_blank_and_wrong_dimensions(self):
        for blank, size, error in ((True, (1080, 1920), 'widget text'),
                                  (False, (540, 960), 'dimensions')):
            self.make_image(blank=blank, size=size)
            self.record()
            with self.assertRaisesRegex(ValueError, error): check_visual_pixels(self.root)

    def test_changed_or_untracked_capture(self):
        self.make_image(blank=True)
        with self.assertRaisesRegex(ValueError, 'drift'): check_visual_pixels(self.root)
        self.record()
        record = read_json(self.output / 'run.json')
        del record['outputs']['scene-1.png']
        (self.output / 'run.json').write_text(json.dumps(record))
        with self.assertRaisesRegex(ValueError, 'Missing scene'): check_visual_pixels(self.root)

    def test_traversal_and_symlink(self):
        with self.assertRaisesRegex(ValueError, 'Traversal'):
            check_visual_pixels(self.root / 'nested/..')
        (self.root / 'alias').symlink_to(self.output, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            check_visual_pixels(self.root / 'alias')


if __name__ == '__main__': unittest.main()
