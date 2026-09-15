"""Bounded validation for expansion components. Reuses kit's primitives.

Each component record has the same envelope as a library chart
(``id kind title insight source icon data``) plus an optional ``variant`` and
``state``. Data shapes are bounded so that labels fit the 824x820 production
visual slot at readable sizes; browser QA still decides actual fitting.
"""
import re

from .. import kit

SLOT = (824, 820)  # production visual zone from templates/v1/assets/motion.css
PROVENANCE_RESERVE = 74  # pixels kept free at the bottom of the slot for the source line

KINDS = {
    # kind: (allowed variants, allowed state keys)
    'agent-loop': (('ring', 'ladder'), ('active_step',)),
    'retrieval': (('scored', 'plain'), ('active_chunk',)),
    'gate': (('vertical', 'horizontal'), ('outcome',)),
    'retry-queue': (('ladder',), ('active_attempt',)),
    'tiers': (('stack', 'row'), ('hit',)),
    'router': (('fan', 'list'), ('selected',)),
    'contract': (('request', 'response'), ('highlight',)),
    'stages': (('rail', 'column'), ('current',)),
    'stack': (('bands', 'blocks'), ('highlight',)),
    'annotated-code': (('footnotes', 'inline'), ('active_line',)),
    'budget': (('bar', 'ring'), ()),
    'states': (('linear', 'ring'), ('current',)),
    'delta': (('rows',), ()),
    'trace': (('waterfall',), ('active_span',)),
}

STATUS = 'design_review'


def _index_state(state, key, count):
    """States are optional highlight indexes, never data."""
    if state is None:
        return
    kit.fields(state, key)
    value = state[key]
    kit.require(value is None or (type(value) is int and 0 <= value < count), 'State index out of range')


def _icon(value, icons):
    kit.require(isinstance(value, str) and value in icons, 'Unknown icon')


def validate_component(record, icons):
    """Return the record with ``variant``/``state`` normalized and ``derived`` values."""
    kit.require(isinstance(record, dict), 'Component must be an object')
    allowed = {'id', 'kind', 'title', 'insight', 'source', 'icon', 'data', 'variant', 'state'}
    kit.require(set(record) - {'variant', 'state'} == allowed - {'variant', 'state'}, 'Unexpected fields')
    kit.require(record['kind'] in KINDS, 'Unsupported component kind')
    variants, state_keys = KINDS[record['kind']]
    variant = record.get('variant', variants[0])
    kit.require(variant in variants, 'Unsupported variant')
    state = record.get('state')
    if state is not None:
        kit.require(state_keys, 'This kind has no state')
    # Envelope: same rules as library charts so the adapter can reuse them.
    base = {k: record[k] for k in ('id', 'kind', 'title', 'insight', 'source', 'icon')}
    kit.require(isinstance(base['id'], str) and re.fullmatch(r'[a-z][a-z0-9-]{0,39}', base['id']), 'Invalid component ID')
    kit.label(base['title'], 54)
    kit.label(base['insight'], 110)
    kit.fields(base['source'], 'kind label reference as_of')
    kit.require(base['source']['kind'] in ('illustrative', 'measured'), 'Declare data provenance')
    kit.label(base['source']['label'], 70)
    kit.label(base['source']['reference'], 180)
    from datetime import date
    try:
        date.fromisoformat(base['source']['as_of'])
    except (TypeError, ValueError):
        raise ValueError('Source date must be YYYY-MM-DD') from None
    _icon(base['icon'], icons)

    data = record['data']
    kind = record['kind']
    derived = {}
    if kind == 'agent-loop':
        kit.fields(data, 'steps exit')
        kit.items(data['steps'], 3, 5)
        names = []
        for step in data['steps']:
            kit.fields(step, 'label icon')
            kit.label(step['label'], 16)
            _icon(step['icon'], icons)
            names.append(step['label'])
        kit.require(len(set(names)) == len(names), 'Duplicate step labels')
        if variant == 'ring':
            kit.require(len(data['steps']) <= 4, 'Ring shows at most four steps; use the ladder variant for five')
        kit.fields(data['exit'], 'label icon')
        kit.label(data['exit']['label'], 24)
        _icon(data['exit']['icon'], icons)
        _index_state(state, 'active_step', len(data['steps']))
    elif kind == 'retrieval':
        kit.fields(data, 'query chunks answer')
        kit.label(data['query'], 40)
        kit.items(data['chunks'], 2, 4)
        for chunk in data['chunks']:
            kit.fields(chunk, 'label score')
            kit.label(chunk['label'], 30)
            kit.number(chunk['score'], 0, 1)
        kit.label(data['answer'], 40)
        derived = {'ranked': sorted(range(len(data['chunks'])), key=lambda i: -data['chunks'][i]['score'])}
        _index_state(state, 'active_chunk', len(data['chunks']))
    elif kind == 'gate':
        kit.fields(data, 'input check pass fail')
        kit.label(data['input'], 30)
        kit.fields(data['check'], 'label icon')
        kit.label(data['check']['label'], 26)
        _icon(data['check']['icon'], icons)
        for branch in (data['pass'], data['fail']):
            kit.fields(branch, 'label hint icon')
            kit.label(branch['label'], 14)
            kit.label(branch['hint'], 30)
            _icon(branch['icon'], icons)
        if state is not None:
            kit.fields(state, 'outcome')
            kit.require(state['outcome'] in (None, 'pass', 'fail'), 'Outcome must be pass, fail or null')
    elif kind == 'retry-queue':
        kit.fields(data, 'job attempts dead_letter')
        kit.label(data['job'], 30)
        kit.items(data['attempts'], 2, 5)
        for attempt in data['attempts']:
            kit.fields(attempt, 'label wait outcome')
            kit.label(attempt['label'], 16)
            kit.label(attempt['wait'], 10)
            kit.require(attempt['outcome'] in ('ok', 'fail', 'pending'), 'Attempt outcome must be ok, fail or pending')
        kit.require(sum(a['outcome'] == 'ok' for a in data['attempts']) <= 1, 'At most one successful attempt')
        kit.label(data['dead_letter'], 30)
        _index_state(state, 'active_attempt', len(data['attempts']))
    elif kind == 'tiers':
        kit.fields(data, 'layers request')
        kit.items(data['layers'], 2, 4)
        for layer in data['layers']:
            kit.fields(layer, 'label hint icon')
            kit.label(layer['label'], 20)
            kit.label(layer['hint'], 28)
            _icon(layer['icon'], icons)
        kit.label(data['request'], 30)
        _index_state(state, 'hit', len(data['layers']))
    elif kind == 'router':
        kit.fields(data, 'input rule routes')
        kit.label(data['input'], 30)
        kit.label(data['rule'], 34)
        kit.items(data['routes'], 2, 4)
        for route in data['routes']:
            kit.fields(route, 'label hint icon')
            kit.label(route['label'], 18)
            kit.label(route['hint'], 24)
            _icon(route['icon'], icons)
        _index_state(state, 'selected', len(data['routes']))
    elif kind == 'contract':
        kit.fields(data, 'name fields')
        kit.label(data['name'], 30)
        kit.items(data['fields'], 2, 6)
        names = []
        for field in data['fields']:
            kit.fields(field, 'name type required note')
            kit.label(field['name'], 16)
            kit.label(field['type'], 12)
            kit.require(type(field['required']) is bool, 'required must be boolean')
            kit.label(field['note'], 24)
            names.append(field['name'])
        kit.require(len(set(names)) == len(names), 'Duplicate field names')
        _index_state(state, 'highlight', len(data['fields']))
    elif kind == 'stages':
        kit.fields(data, 'stages')
        kit.items(data['stages'], 3, 5)
        for stage in data['stages']:
            kit.fields(stage, 'label gate')
            kit.label(stage['label'], 14)
            kit.label(stage['gate'], 20)
        _index_state(state, 'current', len(data['stages']))
    elif kind == 'stack':
        kit.fields(data, 'layers')
        kit.items(data['layers'], 3, 6)
        for layer in data['layers']:
            kit.fields(layer, 'label hint')
            kit.label(layer['label'], 20)
            kit.label(layer['hint'], 30)
        _index_state(state, 'highlight', len(data['layers']))
    elif kind == 'annotated-code':
        kit.fields(data, 'file lines')
        kit.label(data['file'], 24)
        kit.items(data['lines'], 2, 7)
        for line in data['lines']:
            kit.fields(line, 'code note')
            kit.label(line['code'], 34)
            kit.require(isinstance(line['note'], str) and len(line['note']) <= 40 and not any(ord(c) < 32 or c in '<>' for c in line['note']), 'Note too long or contains markup')
        kit.require(sum(1 for line in data['lines'] if line['note'].strip()) <= 4, 'At most four annotations')
        if record.get('variant') == 'inline':
            kit.require(len(data['lines']) <= 6, 'Inline notes allow at most six lines')
        _index_state(state, 'active_line', len(data['lines']))
    elif kind == 'budget':
        kit.fields(data, 'capacity unit parts')
        kit.number(data['capacity'], 1)
        kit.label(data['unit'], 12)
        kit.items(data['parts'], 2, 4)
        total = 0
        for part in data['parts']:
            kit.fields(part, 'label value')
            kit.label(part['label'], 16)
            kit.number(part['value'], 0)
            total += part['value']
        kit.require(total <= data['capacity'], 'Parts exceed capacity')
        derived = {'used': total, 'headroom': data['capacity'] - total}
    elif kind == 'states':
        kit.fields(data, 'states transitions')
        kit.labels(data['states'], high=5)
        kit.require(len(data['states']) >= 3, 'Need at least three states')
        kit.items(data['transitions'], 2, 6)
        for transition in data['transitions']:
            kit.fields(transition, 'from to label')
            for key in ('from', 'to'):
                kit.require(type(transition[key]) is int and 0 <= transition[key] < len(data['states']), 'Transition index out of range')
            kit.label(transition['label'], 14)
            kit.require(transition['from'] != transition['to'], 'Self-transitions are not drawn')
        _index_state(state, 'current', len(data['states']))
    elif kind == 'delta':
        kit.fields(data, 'before_label after_label rows')
        kit.label(data['before_label'], 14)
        kit.label(data['after_label'], 14)
        kit.items(data['rows'], 2, 4)
        for row in data['rows']:
            kit.fields(row, 'label before after change')
            kit.label(row['label'], 16)
            kit.label(row['before'], 20)
            kit.label(row['after'], 20)
            kit.require(row['change'] in ('better', 'worse', 'same', 'new', 'removed'), 'Unknown change token')
    elif kind == 'trace':
        kit.fields(data, 'unit spans')
        kit.label(data['unit'], 12)
        kit.items(data['spans'], 2, 6)
        end_max = 0
        for span in data['spans']:
            kit.fields(span, 'label start end depth')
            kit.label(span['label'], 18)
            kit.number(span['start'], 0)
            kit.number(span['end'], 0)
            kit.require(span['end'] > span['start'], 'Invalid interval')
            kit.require(type(span['depth']) is int and 0 <= span['depth'] <= 2, 'Depth must be 0-2')
            end_max = max(end_max, span['end'])
        kit.require(data['spans'][0]['depth'] == 0, 'First span must be a root span')
        derived = {'total': end_max}
        _index_state(state, 'active_span', len(data['spans']))
    return {**base, 'data': data, 'variant': variant, 'state': state, 'derived': derived, 'status': STATUS}


def validate_document(document, icons):
    kit.fields(document, 'version components')
    kit.require(type(document['version']) is int and document['version'] == 1, 'Unsupported expansion version')
    kit.items(document['components'], high=24)
    result = [validate_component(component, icons) for component in document['components']]
    kit.require(len({c['id'] for c in result}) == len(result), 'Duplicate component IDs')
    return result
