"""News is opt-in, attributable, local, bounded, and compatible with education."""
import copy
from pathlib import Path
import tempfile
import unittest

from PIL import Image
import news_media
from safety import digest
from tools.freeze import record as lock_record


class NewsMediaTests(unittest.TestCase):
    def setUp(self):
        self.record = {'id':'story-1','kind':'news-media','title':'COMPANY NEWS','insight':'A reported announcement.',
            'icon':'layers','source':{'kind':'reported','label':'Company announcement','reference':'https://example.org/news','as_of':'2026-09-23'},
            'data':{'variant':'image','fit':'contain','label':'ANNOUNCED','headline':'A new device','detail':'Shipping plans remain plans.','items':[],
                'asset':{'path':'media/image.png','sha256':'a'*64,'source_url':'https://example.org/image.png',
                         'source_page':'https://example.org/news','asset_type':'product-render','story':'Device announcement',
                         'scene':'story-1','retrieved_at':'2026-09-23','alt':'Official device render','credit':'Example company',
                         'rights_status':'Internal review; clearance pending'}}}
        self.episode={'version':2,'visuals':{'story-1':self.record},'editorial':{'format':'news','story':'Device announcement',
            'verified_at':'2026-09-23','sources':['https://example.org/news']}}

    def test_all_variants_are_data_only_and_do_not_mutate(self):
        for variant in news_media.VARIANTS:
            record=copy.deepcopy(self.record)
            record['data']['variant']=variant
            self.assertEqual(news_media.validate(record,['layers']),record)
            self.assertEqual(news_media.filename(record),'news-story-1.png')

    def test_news_requires_explicit_family(self):
        self.assertEqual(news_media.classify(self.episode,{'version':2}),'news')
        self.assertEqual(news_media.classify(self.episode,{'version':1}),'news')
        del self.episode['editorial']
        with self.assertRaises(ValueError): news_media.classify(self.episode,{'version':2})

    def test_legacy_education_remains_unchanged(self):
        self.assertEqual(news_media.classify({'version':1},{'version':1}),'educational')
        self.assertEqual(news_media.classify({'version':2,'visuals':{}},{'version':2}),'educational')

    def test_mismatched_sources_story_and_scene_rejected(self):
        for key,value in [('story','Another story'),('sources',['https://example.org/other'])]:
            episode=copy.deepcopy(self.episode)
            episode['editorial'][key]=value
            with self.assertRaises(ValueError): news_media.classify(episode,{'version':2})
        self.record['data']['asset']['scene']='wrong'
        with self.assertRaises(ValueError): news_media.validate(self.record,['layers'])

    def test_unsafe_paths_and_remote_local_paths_rejected(self):
        for path in ['media\\\\image.png','../image.png','/tmp/image.png','https://example.org/image.webp','media/image.svg']:
            self.record['data']['asset']['path']=path
            with self.assertRaises(ValueError): news_media.validate(self.record,['layers'])

    def test_bad_source_schemes_credentials_and_dates(self):
        for url in ['http://example.org','javascript:alert(1)','https://user:password@example.org']:
            with self.assertRaises(ValueError): news_media.https(url)
        for date in ['tomorrow','2026-99-01',None]:
            with self.assertRaises((ValueError,TypeError)): news_media.day(date)

    def test_news_beats_must_finish_before_the_scene_ends(self):
        import visual_adapter
        self.record['data']['items'] = ['First', 'Second', 'Third']
        scene = {'motion': {'visual': {'enter': .1, 'fill': [.2, .8]}}}
        with self.assertRaisesRegex(ValueError, 'beats exceed'):
            visual_adapter.validate_duration(scene, 4, self.record)
        visual_adapter.validate_duration(scene, 6, self.record)

    def test_files_integrity_copy_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'media').mkdir()
            image=root/'media/image.png'
            Image.new('RGB',(1200,800),'white').save(image)
            self.record['data']['asset']['sha256']=digest(image)
            inputs=news_media.files(self.episode,root)
            output=root/'out'
            (output/'assets').mkdir(parents=True)
            news_media.install(output,self.episode,inputs)
            self.assertEqual(digest(output/'assets/news-story-1.png'),digest(image))
            self.assertTrue((output/'news-sources.json').exists())
            with self.assertRaises(ValueError): news_media.install(output,self.episode,inputs)
            Image.new('RGB',(1200,800),'red').save(image)
            with self.assertRaisesRegex(ValueError,'changed'): news_media.files(self.episode,root)

    def test_small_images_and_symlinks_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'media').mkdir()
            file=root/'media/image.png'
            Image.new('RGB',(200,200)).save(file)
            self.record['data']['asset']['sha256']=digest(file)
            with self.assertRaisesRegex(ValueError,'resolution'): news_media.files(self.episode,root)
            link=root/'media/link.png'
            link.symlink_to(file)
            self.record['data']['asset']['path']='media/link.png'
            with self.assertRaises(ValueError): news_media.files(self.episode,root)

    def test_news_engine_modules_are_implementation_locked(self):
        locked=lock_record()['files']
        self.assertIn('news_media.py',locked)
        self.assertIn('templates/v1/assets/news-media.js',locked)
        self.assertEqual(len(locked['branding.py']),64)


if __name__=='__main__': unittest.main()
