"""Bounded data-only contract for open editorial diagrams, legacy v2 scenes."""
import copy
from datetime import date
import re

from safety import identifier, keys, number, require
from tools.visual_library.kit import label

VARIANTS = ('branch', 'flow', 'orbit', 'bars', 'curve', 'terrain', 'matrix',
            'trace', 'rings', 'worlds', 'clock', 'axes')


def validate(record, icons):
    keys(record, ('id', 'kind', 'title', 'insight', 'source', 'icon', 'data'), 'editorial record')
    identifier(record['id'])
    require(record['kind'] == 'editorial' and record['icon'] in icons, 'Unknown editorial kind or icon')
    label(record['title'], 54)
    label(record['insight'], 110)
    source = record['source']
    keys(source, ('kind', 'label', 'reference', 'as_of'), 'editorial source')
    require(source['kind'] in ('illustrative', 'measured'), 'Declare provenance')
    label(source['label'], 52)
    label(source['reference'], 180)
    require(isinstance(source['as_of'], str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', source['as_of']), 'Expected ISO date')
    date.fromisoformat(source['as_of'])
    data = record['data']
    keys(data, ('variant', 'labels', 'details', 'values', 'unit', 'maximum'), 'editorial data')
    require(data['variant'] in VARIANTS, 'Unknown editorial composition')
    require(isinstance(data['labels'], list) and 2 <= len(data['labels']) <= 4, 'Two to four labels required')
    require(isinstance(data['details'], list) and len(data['labels']) == len(data['details']), 'Detail count differs')
    for value in data['labels']:
        label(value, 27)
    for value in data['details']:
        label(value, 58)
    label(data['unit'], 32)
    maximum = number(data['maximum'])
    require(0 < maximum <= 1e9, 'Positive bounded scale maximum required')
    require(isinstance(data['values'], list), 'Numeric values must be a list')
    if data['variant'] in ('bars', 'curve', 'clock', 'axes'):
        require(len(data['values']) == len(data['labels']), 'One value per label required')
        require(all(0 <= number(value) <= maximum for value in data['values']), 'Value outside zero-based scale')
    else:
        require(data['values'] == [], 'Conceptual diagrams cannot imply measured values')
    if data['variant'] in ('clock', 'terrain'):
        require(len(data['labels']) == 2, 'This composition needs exactly two entries')
    if data['variant'] == 'worlds':
        require(len(data['labels']) == 3, 'Three illustrative worlds required')
    return copy.deepcopy(record)
