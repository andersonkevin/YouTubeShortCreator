"""Review-only news records, local media integrity, and editorial provenance."""
import copy
from datetime import date
from pathlib import Path
import re
import shutil
from urllib.parse import urlsplit

from safety import digest, identifier, inside, keys, require, text, write_json

VARIANTS = ('image', 'person', 'image-metric')


def https(value):
    text(value, 2000)
    url = urlsplit(value)
    require(url.scheme == 'https' and url.hostname and not url.username and not url.password,
            'News provenance requires a public HTTPS URL without credentials')
    return value


def day(value):
    require(isinstance(value, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', value), 'Expected ISO date')
    date.fromisoformat(value)


def validate(record, icons):
    keys(record, ['id', 'kind', 'title', 'insight', 'source', 'icon', 'data'], 'news record')
    identifier(record['id'])
    require(record['kind'] == 'news-media' and record['icon'] in icons, 'Invalid news kind or icon')
    text(record['title'], 52)
    text(record['insight'], 110)
    source = record['source']
    keys(source, ['kind', 'label', 'reference', 'as_of'], 'news source')
    require(source['kind'] == 'reported', 'News must identify reported facts')
    text(source['label'], 70)
    https(source['reference'])
    day(source['as_of'])
    data = record['data']
    keys(data, ['variant', 'asset', 'fit', 'label', 'headline', 'detail', 'items'], 'news window')
    require(data['variant'] in VARIANTS, 'Unknown news window variant')
    require(data['fit'] in ('contain', 'cover'), 'Invalid news media fit')
    for field, limit in [('label', 60), ('headline', 88), ('detail', 150)]:
        text(data[field], limit)
    require(isinstance(data['items'], list) and len(data['items']) <= 3, 'Use up to three news beats')
    for item in data['items']:
        text(item, 65)
    asset = data['asset']
    keys(asset, ['path', 'sha256', 'source_url', 'source_page', 'asset_type', 'story', 'scene',
                 'retrieved_at', 'alt', 'credit', 'rights_status'], 'news asset')
    require(isinstance(asset['path'], str) and '\\' not in asset['path'], 'Use a POSIX relative media path')
    relative = Path(asset['path'])
    require(not relative.is_absolute() and '..' not in relative.parts and
            relative.suffix.lower() in ('.png', '.jpg', '.jpeg'), 'Use a relative local PNG/JPEG')
    require(re.fullmatch(r'[0-9a-f]{64}', asset['sha256']), 'Missing news asset SHA-256')
    https(asset['source_url'])
    https(asset['source_page'])
    day(asset['retrieved_at'])
    require(asset['asset_type'] in ('photograph', 'product-render', 'screenshot', 'diagram', 'logo'), 'Unknown asset type')
    for field in ('story', 'alt', 'credit', 'rights_status'):
        text(asset[field], 300)
    require(asset['scene'] == record['id'], 'Asset scene association differs')
    return copy.deepcopy(record)


def classify(data, brand):
    news = [r for r in data.get('visuals', {}).values() if r['kind'] == 'news-media']
    editorial = data.get('editorial')
    require(editorial is None or data['version'] == 2, 'Editorial classification requires episode v2')
    if editorial is None:
        require(not news, 'News media requires explicit editorial classification')
        return 'educational'
    keys(editorial, ['format', 'story', 'verified_at', 'sources'], 'editorial classification')
    require(editorial['format'] in ('news', 'educational'), 'Unknown editorial family')
    text(editorial['story'], 200)
    day(editorial['verified_at'])
    require(isinstance(editorial['sources'], list) and 1 <= len(editorial['sources']) <= 12, 'Supply verified sources')
    for source in editorial['sources']:
        https(source)
    if editorial['format'] == 'news':
        require(data['version'] == 2 and news,
                'News requires episode v2 and verified local media')
        require(len(set(editorial['sources'])) == len(editorial['sources']), 'Duplicate news sources')
        for record in news:
            require(record['source']['reference'] in editorial['sources'], 'Unregistered news source')
            require(record['data']['asset']['source_page'] in editorial['sources'], 'Unregistered asset source page')
            require(record['data']['asset']['story'] == editorial['story'], 'Asset belongs to a different story')
    else:
        require(not news, 'Classify entity-driven real-media stories as News')
    return editorial['format']


def filename(record):
    return 'news-' + identifier(record['id']) + Path(record['data']['asset']['path']).suffix.lower()


def files(data, directory):
    from PIL import Image
    result = {}
    for record in data.get('visuals', {}).values():
        if record['kind'] != 'news-media':
            continue
        asset = record['data']['asset']
        path = inside(directory, asset['path'])
        require(path.is_file() and 0 < path.stat().st_size <= 30_000_000, 'News asset file size invalid')
        require(digest(path) == asset['sha256'], 'News asset changed')
        with Image.open(path) as image:
            require(image.format in ('PNG', 'JPEG') and max(image.size) <= 8000 and
                    min(image.size) >= 450 and max(image.size) >= 800 and
                    image.width * image.height <= 32_000_000, 'News media resolution outside bounds')
            image.verify()
        result['news:' + record['id']] = path
    return result


def install(output, data, inputs):
    records = [r for r in data.get('visuals', {}).values() if r['kind'] == 'news-media']
    if not records:
        return
    for record in records:
        target = output / 'assets' / filename(record)
        source = inputs['news:' + record['id']]
        require(digest(source) == record['data']['asset']['sha256'], 'News input changed before copying')
        require(not target.exists() and not target.is_symlink(), 'News asset collision')
        with source.open('rb') as reader, target.open('xb') as writer:
            shutil.copyfileobj(reader, writer)
        require(digest(target) == record['data']['asset']['sha256'], 'News copy differs')
    write_json(output / 'news-sources.json', {'editorial': data['editorial'], 'status': 'review_required',
               'publication_performed': False, 'rights_review': 'required; provenance does not grant a license', 'assets': [r['data']['asset'] for r in records]})
