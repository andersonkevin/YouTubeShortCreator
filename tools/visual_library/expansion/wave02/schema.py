"""Bounded validation for wave-02 components. Reuses kit's primitives.

Envelope matches the library chart record (``id kind title insight source icon
data``) plus optional exact ``variant`` and ``state``. Label ceilings are sized
for the 824x820 production slot at 22-28 px; browser QA decides actual fitting.
"""
from datetime import date
import re

from ... import kit

SLOT = (824, 820)
PROVENANCE_RESERVE = 74
STATUS = 'design_review'

FAMILIES = ('widget', 'data', 'systems', 'software', 'ai', 'general')

# kind: (family, allowed variants, allowed state keys)
KINDS = {
    'terminal': ('widget', ('shell',), ('active_line',)),
    'logs': ('widget', ('stream',), ('active_line',)),
    'payload': ('widget', ('card', 'raw'), ('highlight',)),
    'matrix': ('widget', ('grid',), ('highlight_row',)),
    'tree': ('widget', ('outline',), ('highlight',)),
    'table': ('widget', ('grid', 'clean'), ('highlight_row',)),
    'histogram': ('data', ('bars',), ()),
    'boxplot': ('data', ('horizontal',), ('highlight',)),
    'waffle': ('data', ('grid',), ()),
    'funnel': ('data', ('centered', 'left'), ('highlight',)),
    'queue': ('systems', ('lanes',), ()),
    'balancer': ('systems', ('fan',), ('selected',)),
    'breaker': ('systems', ('meter',), ()),
    'token-bucket': ('systems', ('bucket',), ()),
    'replication': ('systems', ('tree',), ()),
    'percentiles': ('data', ('ladder', 'ladder-log'), ()),
    'dumbbell': ('data', ('rows',), ('highlight',)),
    'intervals': ('data', ('rows',), ('highlight',)),
    'split-flow': ('data', ('ribbons',), ()),
    'bullet': ('data', ('rows',), ('highlight',)),
    'sequence': ('ai', ('lifelines',), ('active',)),
    'context-window': ('ai', ('strip',), ()),
    'confusion': ('ai', ('grid',), ()),
    'claims': ('ai', ('rows',), ('highlight',)),
    'guardrails': ('ai', ('chain',), ('highlight',)),
    'embedding-map': ('ai', ('scatter',), ()),
    'prompt-anatomy': ('ai', ('document',), ('highlight',)),
    'orchestration': ('ai', ('hub',), ()),
    'event-bus': ('software', ('bus',), ()),
    'lanes': ('software', ('swimlanes',), ()),
    'dag': ('software', ('levels',), ('highlight',)),
    'diff': ('software', ('unified',), ('active_line',)),
    'pyramid': ('software', ('stack',), ('highlight',)),
    'versions': ('software', ('line',), ('highlight',)),
    'trust-boundary': ('software', ('zones',), ()),
    'memory-timeline': ('ai', ('line',), ('highlight',)),
    'eval-scorecard': ('ai', ('rows',), ('highlight',)),
    'tool-schema': ('ai', ('card',), ('highlight',)),
    'latency-breakdown': ('systems', ('stacked',), ('highlight',)),
    'sliding-window': ('systems', ('timeline',), ()),
    'retry-budget': ('systems', ('bars',), ()),
    'heatmap': ('data', ('grid',), ()),
    'slope': ('data', ('lines',), ('highlight',)),
    'state-diff': ('software', ('columns',), ()),
    'semver-rule': ('software', ('ladder',), ('highlight',)),
    'quote': ('general', ('block',), ()),
    'checklist': ('general', ('rows',), ('highlight',)),
    'stat': ('general', ('hero',), ()),
    'before-after': ('general', ('panels',), ()),
    'steps': ('general', ('numbered',), ('highlight',)),
    'ranking': ('general', ('bars',), ('highlight',)),
    'timeline': ('general', ('vertical',), ('highlight',)),
    'pros-cons': ('general', ('columns',), ()),
    'definition': ('general', ('card',), ()),
    'cards': ('general', ('row',), ('highlight',)),
}
TRENDS = ('up', 'down', 'flat', 'none')
MEMORY_KINDS = ('stored', 'recalled', 'updated', 'forgotten')
PARAM_TYPES = ('string', 'number', 'boolean', 'array', 'object', 'enum')
MESSAGE_KINDS = ('request', 'response', 'tool', 'note')
CONTEXT_KINDS = ('system', 'history', 'retrieved', 'tool', 'input', 'output')
VERDICTS = ('supported', 'unsupported', 'partial')
WORKER_STATES = ('idle', 'working', 'done', 'blocked')
DIFF_KINDS = ('context', 'added', 'removed')
VERSION_KINDS = ('major', 'minor', 'patch')
PROMPT_KINDS = ('system', 'instruction', 'example', 'input', 'format')
HEALTH = ('healthy', 'degraded', 'down')
BREAKER_STATES = ('closed', 'open', 'half-open')
REPLICA_STATES = ('acked', 'pending', 'lagging')

LEVELS = ('DEBUG', 'INFO', 'WARN', 'ERROR')
CELLS = ('yes', 'no', 'partial', 'na')
TYPES = ('string', 'number', 'boolean', 'null', 'object', 'array')
LINE_KINDS = ('command', 'output', 'error', 'comment')


def family(kind):
    return KINDS[kind][0]


def _index_state(state, key, count):
    if state is None:
        return
    kit.fields(state, key)
    value = state[key]
    kit.require(value is None or (type(value) is int and 0 <= value < count), 'State index out of range')


def _icon(value, icons):
    kit.require(isinstance(value, str) and value in icons, 'Unknown icon')


def _text(value, maximum):
    """Like kit.label but allows an empty string (blank output line, empty cell)."""
    kit.require(isinstance(value, str) and len(value) <= maximum, 'Text too long')
    kit.require(not any(ord(c) < 32 or c in '<>' for c in value), 'Text contains markup or controls')


def _increasing(values):
    kit.require(all(b > a for a, b in zip(values, values[1:])), 'Values must increase')


def validate_component(record, icons):
    kit.require(isinstance(record, dict), 'Component must be an object')
    required = {'id', 'kind', 'title', 'insight', 'source', 'icon', 'data'}
    kit.require(required <= set(record) <= required | {'variant', 'state'}, 'Unexpected fields')
    kit.require(record['kind'] in KINDS, 'Unsupported component kind')
    _, variants, state_keys = KINDS[record['kind']]
    variant = record.get('variant', variants[0])
    kit.require(variant in variants, 'Unsupported variant')
    state = record.get('state')
    if state is not None:
        kit.require(state_keys, 'This kind has no state')
    base = {k: record[k] for k in ('id', 'kind', 'title', 'insight', 'source', 'icon')}
    kit.require(isinstance(base['id'], str) and re.fullmatch(r'[a-z][a-z0-9-]{0,39}', base['id']), 'Invalid component ID')
    kit.label(base['title'], 54)
    kit.label(base['insight'], 110)
    kit.fields(base['source'], 'kind label reference as_of')
    kit.require(base['source']['kind'] in ('illustrative', 'measured'), 'Declare data provenance')
    kit.label(base['source']['label'], 70)
    kit.label(base['source']['reference'], 180)
    try:
        date.fromisoformat(base['source']['as_of'])
    except (TypeError, ValueError):
        raise ValueError('Source date must be YYYY-MM-DD') from None
    _icon(base['icon'], icons)

    data, kind, derived = record['data'], record['kind'], {}
    if kind == 'terminal':
        kit.fields(data, 'title lines exit_code')
        kit.label(data['title'], 24)
        kit.items(data['lines'], 2, 10)
        for line in data['lines']:
            kit.fields(line, 'kind text')
            kit.require(line['kind'] in LINE_KINDS, 'Line kind must be command, output, error or comment')
            _text(line['text'], 44)
        kit.require(data['exit_code'] is None or (type(data['exit_code']) is int and 0 <= data['exit_code'] <= 255), 'exit_code must be null or 0-255')
        _index_state(state, 'active_line', len(data['lines']))
    elif kind == 'logs':
        kit.fields(data, 'lines')
        kit.items(data['lines'], 2, 8)
        for line in data['lines']:
            kit.fields(line, 'time level message')
            kit.label(line['time'], 12)
            kit.require(line['level'] in LEVELS, 'Unknown log level')
            kit.label(line['message'], 40)
        _index_state(state, 'active_line', len(data['lines']))
    elif kind == 'payload':
        kit.fields(data, 'title entries')
        kit.label(data['title'], 24)
        kit.items(data['entries'], 2, 8)
        keys = []
        for entry in data['entries']:
            kit.fields(entry, 'key value type')
            kit.label(entry['key'], 18)
            _text(entry['value'], 26)
            kit.require(entry['type'] in TYPES, 'Unknown value type')
            keys.append(entry['key'])
        kit.require(len(set(keys)) == len(keys), 'Duplicate keys')
        _index_state(state, 'highlight', len(data['entries']))
    elif kind == 'matrix':
        kit.fields(data, 'rows columns cells legend')
        kit.labels(data['rows'], high=5)
        kit.require(all(len(r) <= 14 for r in data['rows']), 'Row label too long')
        kit.labels(data['columns'], high=5)
        kit.require(all(len(c) <= 12 for c in data['columns']), 'Column label too long')
        kit.require(isinstance(data['cells'], list) and len(data['cells']) == len(data['rows']), 'Cell row mismatch')
        for row in data['cells']:
            kit.require(isinstance(row, list) and len(row) == len(data['columns']), 'Cell column mismatch')
            for cell in row:
                kit.require(cell in CELLS, 'Cell must be yes, no, partial or na')
        kit.label(data['legend'], 40)
        _index_state(state, 'highlight_row', len(data['rows']))
    elif kind == 'tree':
        kit.fields(data, 'nodes')
        kit.items(data['nodes'], 2, 10)
        previous = -1
        for node in data['nodes']:
            kit.fields(node, 'label depth icon')
            kit.label(node['label'], 26)
            kit.require(type(node['depth']) is int and 0 <= node['depth'] <= 3, 'Depth must be 0-3')
            kit.require(node['depth'] <= previous + 1, 'A node may only nest one level deeper than the previous node')
            kit.require(node['icon'] is None or node['icon'] in icons, 'Unknown icon')
            previous = node['depth']
        kit.require(data['nodes'][0]['depth'] == 0, 'First node must be a root')
        _index_state(state, 'highlight', len(data['nodes']))
    elif kind == 'table':
        kit.fields(data, 'columns rows')
        kit.items(data['columns'], 2, 4)
        for column in data['columns']:
            kit.fields(column, 'label align mono')
            kit.label(column['label'], 14)
            kit.require(column['align'] in ('left', 'right'), 'align must be left or right')
            kit.require(type(column['mono']) is bool, 'mono must be boolean')
        kit.items(data['rows'], 2, 6)
        ceiling = 13 if len(data['columns']) == 4 else 16  # four columns share 824 px
        for row in data['rows']:
            kit.require(isinstance(row, list) and len(row) == len(data['columns']), 'Row width mismatch')
            for cell in row:
                _text(cell, ceiling)
        _index_state(state, 'highlight_row', len(data['rows']))
    elif kind == 'histogram':
        kit.fields(data, 'edges counts unit marker')
        kit.items(data['edges'], 3, 9)
        for edge in data['edges']:
            kit.number(edge)
        _increasing(data['edges'])
        kit.require(isinstance(data['counts'], list) and len(data['counts']) == len(data['edges']) - 1, 'counts must have one fewer entry than edges')
        for count in data['counts']:
            kit.number(count, 0)
        kit.require(sum(data['counts']) > 0, 'Histogram needs at least one nonzero count')
        kit.label(data['unit'], 12)
        if data['marker'] is not None:
            kit.fields(data['marker'], 'label value')
            kit.label(data['marker']['label'], 16)
            kit.number(data['marker']['value'], data['edges'][0], data['edges'][-1])
        derived = {'total': sum(data['counts']), 'max': max(data['counts'])}
    elif kind == 'boxplot':
        kit.fields(data, 'unit groups')
        kit.label(data['unit'], 12)
        kit.items(data['groups'], 1, 4)
        for group in data['groups']:
            kit.fields(group, 'label min q1 median q3 max')
            kit.label(group['label'], 14)
            values = [group[k] for k in ('min', 'q1', 'median', 'q3', 'max')]
            for value in values:
                kit.number(value)
            kit.require(all(b >= a for a, b in zip(values, values[1:])), 'Quartiles must be ordered min <= q1 <= median <= q3 <= max')
            kit.require(group['max'] > group['min'], 'A box needs a nonzero range')
        derived = {'low': min(g['min'] for g in data['groups']), 'high': max(g['max'] for g in data['groups'])}
        _index_state(state, 'highlight', len(data['groups']))
    elif kind == 'waffle':
        kit.fields(data, 'parts')
        kit.items(data['parts'], 1, 4)
        total = 0
        for part in data['parts']:
            kit.fields(part, 'label percent')
            kit.label(part['label'], 16)
            kit.number(part['percent'], 0, 100)
            total += part['percent']
        kit.require(total <= 100.000001, 'Parts exceed 100 percent')
        # Squares are rounded per part; a nonzero part never disappears (it gets a marked square).
        squares, flagged = [], []
        for part in data['parts']:
            n = round(part['percent'])
            if part['percent'] > 0 and n == 0:
                n, flag = 1, True
            else:
                flag = False
            squares.append(n)
            flagged.append(flag)
        kit.require(sum(squares) <= 100, 'Rounded squares exceed the grid')
        derived = {'squares': squares, 'flagged': flagged, 'remainder': 100 - sum(squares), 'total_percent': total}
    elif kind == 'funnel':
        kit.fields(data, 'unit stages')
        kit.label(data['unit'], 12)
        kit.items(data['stages'], 2, 6)
        values = []
        for stage in data['stages']:
            kit.fields(stage, 'label value')
            kit.label(stage['label'], 16)
            kit.number(stage['value'], 0)
            values.append(stage['value'])
        kit.require(values[0] > 0, 'First stage must be positive')
        kit.require(all(b <= a for a, b in zip(values, values[1:])), 'Funnel stages must not increase')
        derived = {'share': [v / values[0] for v in values]}
        _index_state(state, 'highlight', len(data['stages']))
    elif kind == 'queue':
        kit.fields(data, 'label depth capacity producers consumers')
        kit.label(data['label'], 24)
        kit.require(type(data['depth']) is int and 0 <= data['depth'] <= 9999, 'depth must be an integer 0-9999')
        kit.require(data['capacity'] is None or (type(data['capacity']) is int and 1 <= data['capacity'] <= 9999), 'capacity must be null or 1-9999')
        for side in ('producers', 'consumers'):
            kit.items(data[side], 1, 4)
            for node in data[side]:
                kit.fields(node, 'label rate')
                kit.label(node['label'], 14)
                kit.label(node['rate'], 10)
        derived = {'full': data['capacity'] is not None and data['depth'] >= data['capacity'], 'shown': min(data['depth'], 10)}
    elif kind == 'balancer':
        kit.fields(data, 'label algorithm replicas')
        kit.label(data['label'], 20)
        kit.label(data['algorithm'], 20)
        kit.items(data['replicas'], 2, 5)
        for replica in data['replicas']:
            kit.fields(replica, 'label health share')
            kit.label(replica['label'], 14)
            kit.require(replica['health'] in HEALTH, 'health must be healthy, degraded or down')
            kit.label(replica['share'], 8)
        _index_state(state, 'selected', len(data['replicas']))
    elif kind == 'breaker':
        kit.fields(data, 'failures threshold window state next')
        kit.require(type(data['failures']) is int and data['failures'] >= 0, 'failures must be a nonnegative integer')
        kit.require(type(data['threshold']) is int and 1 <= data['threshold'] <= 20, 'threshold must be an integer 1-20')
        kit.label(data['window'], 16)
        kit.require(data['state'] in BREAKER_STATES, 'state must be closed, open or half-open')
        kit.label(data['next'], 36)
        derived = {'filled': min(data['failures'], data['threshold'])}
    elif kind == 'token-bucket':
        kit.fields(data, 'capacity tokens refill requests')
        kit.require(type(data['capacity']) is int and 1 <= data['capacity'] <= 60, 'capacity must be an integer 1-60')
        kit.require(type(data['tokens']) is int and 0 <= data['tokens'] <= data['capacity'], 'tokens must be 0..capacity')
        kit.label(data['refill'], 14)
        kit.items(data['requests'], 2, 6)
        remaining, outcomes = data['tokens'], []
        for request in data['requests']:
            kit.fields(request, 'label cost')
            kit.label(request['label'], 12)
            kit.require(type(request['cost']) is int and 1 <= request['cost'] <= 60, 'cost must be an integer 1-60')
            if request['cost'] <= remaining:
                remaining -= request['cost']
                outcomes.append('allowed')
            else:
                outcomes.append('denied')
        # Evaluated in order from the current token count, without refill; the graphic says so.
        derived = {'outcomes': outcomes, 'remaining': remaining}
    elif kind == 'replication':
        kit.fields(data, 'primary quorum replicas')
        kit.label(data['primary'], 14)
        kit.label(data['quorum'], 24)
        kit.items(data['replicas'], 1, 4)
        for replica in data['replicas']:
            kit.fields(replica, 'label lag status')
            kit.label(replica['label'], 14)
            kit.label(replica['lag'], 10)
            kit.require(replica['status'] in REPLICA_STATES, 'status must be acked, pending or lagging')
        derived = {'acked': sum(r['status'] == 'acked' for r in data['replicas'])}
    elif kind == 'percentiles':
        kit.fields(data, 'unit points target')
        kit.label(data['unit'], 12)
        kit.items(data['points'], 2, 5)
        values = []
        for point in data['points']:
            kit.fields(point, 'label value')
            kit.label(point['label'], 6)
            kit.number(point['value'], 0)
            values.append(point['value'])
        _increasing(values)
        if data['target'] is not None:
            kit.fields(data['target'], 'label value')
            kit.label(data['target']['label'], 12)
            kit.number(data['target']['value'], 0)
        marks = values + ([data['target']['value']] if data['target'] else [])
        high = max(marks)
        if variant == 'ladder-log':
            kit.require(min(marks) > 0, 'Log ladder needs positive values')
            # Adjacent labels need room: at least a 1.25x ratio on the log axis.
            kit.require(all(b / a >= 1.25 for a, b in zip(values, values[1:])), 'Points too close for the log ladder')
        else:
            kit.require(all((b - a) / high >= 0.12 for a, b in zip(values, values[1:])), 'Points too close for the linear ladder; use the ladder-log variant')
        derived = {'high': high, 'low': min(marks)}
    elif kind == 'dumbbell':
        kit.fields(data, 'unit before_label after_label rows')
        kit.label(data['unit'], 12)
        kit.label(data['before_label'], 12)
        kit.label(data['after_label'], 12)
        kit.items(data['rows'], 2, 6)
        high = 0
        for row in data['rows']:
            kit.fields(row, 'label before after')
            kit.label(row['label'], 14)
            kit.number(row['before'], 0)
            kit.number(row['after'], 0)
            high = max(high, row['before'], row['after'])
        kit.require(high > 0, 'At least one nonzero value')
        derived = {'high': high}
        _index_state(state, 'highlight', len(data['rows']))
    elif kind == 'intervals':
        kit.fields(data, 'unit note items')
        kit.label(data['unit'], 12)
        kit.label(data['note'], 40)
        kit.items(data['items'], 2, 6)
        lows, highs = [], []
        for item in data['items']:
            kit.fields(item, 'label low mid high')
            kit.label(item['label'], 14)
            for key in ('low', 'mid', 'high'):
                kit.number(item[key])
            kit.require(item['low'] <= item['mid'] <= item['high'], 'Interval must satisfy low <= mid <= high')
            lows.append(item['low']); highs.append(item['high'])
        kit.require(max(highs) > min(lows), 'Intervals need a nonzero span')
        derived = {'low': min(lows), 'high': max(highs)}
        _index_state(state, 'highlight', len(data['items']))
    elif kind == 'split-flow':
        kit.fields(data, 'source total unit targets')
        kit.label(data['source'], 16)
        kit.number(data['total'], 1e-9)
        kit.label(data['unit'], 10)
        kit.items(data['targets'], 2, 5)
        assigned = 0
        for target in data['targets']:
            kit.fields(target, 'label value')
            kit.label(target['label'], 16)
            kit.number(target['value'], 0)
            assigned += target['value']
        kit.require(assigned <= data['total'] * 1.000001, 'Targets exceed the source total')
        derived = {'unassigned': max(0, data['total'] - assigned)}
    elif kind == 'bullet':
        kit.fields(data, 'unit items')
        kit.label(data['unit'], 10)
        kit.items(data['items'], 1, 4)
        for item in data['items']:
            kit.fields(item, 'label value target max bands')
            kit.label(item['label'], 14)
            kit.number(item['value'], 0)
            kit.number(item['target'], 0)
            kit.number(item['max'], 1e-9)
            kit.require(item['value'] <= item['max'] and item['target'] <= item['max'], 'value and target must be within max')
            kit.items(item['bands'], 2, 2)
            for band in item['bands']:
                kit.number(band, 0)
            kit.require(0 < item['bands'][0] < item['bands'][1] < item['max'], 'bands must be increasing and inside max')
        _index_state(state, 'highlight', len(data['items']))
    elif kind == 'sequence':
        kit.fields(data, 'roles messages')
        kit.labels(data['roles'], high=4)
        kit.require(len(data['roles']) >= 2 and all(len(r) <= 10 for r in data['roles']), 'Need 2-4 roles of at most 10 characters')
        kit.items(data['messages'], 2, 7)
        for m in data['messages']:
            kit.fields(m, 'from to label kind')
            for key in ('from', 'to'):
                kit.require(type(m[key]) is int and 0 <= m[key] < len(data['roles']), 'Message role index out of range')
            kit.require(m['from'] != m['to'], 'Self-messages are not drawn')
            kit.label(m['label'], 26)
            kit.require(m['kind'] in MESSAGE_KINDS, 'kind must be request, response, tool or note')
        _index_state(state, 'active', len(data['messages']))
    elif kind == 'context-window':
        kit.fields(data, 'capacity unit segments')
        kit.require(type(data['capacity']) is int and data['capacity'] > 0, 'capacity must be a positive integer')
        kit.label(data['unit'], 10)
        kit.items(data['segments'], 2, 6)
        used = 0
        for seg in data['segments']:
            kit.fields(seg, 'label tokens kind')
            kit.label(seg['label'], 16)
            kit.require(type(seg['tokens']) is int and seg['tokens'] >= 0, 'tokens must be a nonnegative integer')
            kit.require(seg['kind'] in CONTEXT_KINDS, 'Unknown segment kind')
            used += seg['tokens']
        derived = {'used': used, 'overflow': max(0, used - data['capacity'])}
    elif kind == 'confusion':
        kit.fields(data, 'positive negative tp fp fn tn')
        kit.label(data['positive'], 14)
        kit.label(data['negative'], 14)
        for key in ('tp', 'fp', 'fn', 'tn'):
            kit.require(type(data[key]) is int and 0 <= data[key] <= 999999, f'{key} must be a nonnegative integer')
        n = data['tp'] + data['fp'] + data['fn'] + data['tn']
        kit.require(n > 0, 'Confusion matrix needs at least one observation')
        precision = data['tp'] / (data['tp'] + data['fp']) if data['tp'] + data['fp'] else None
        recall = data['tp'] / (data['tp'] + data['fn']) if data['tp'] + data['fn'] else None
        derived = {'n': n, 'precision': precision, 'recall': recall}
    elif kind == 'claims':
        kit.fields(data, 'items')
        kit.items(data['items'], 2, 4)
        for item in data['items']:
            kit.fields(item, 'claim source verdict')
            kit.label(item['claim'], 44)
            kit.label(item['source'], 30)
            kit.require(item['verdict'] in VERDICTS, 'verdict must be supported, unsupported or partial')
        _index_state(state, 'highlight', len(data['items']))
    elif kind == 'guardrails':
        kit.fields(data, 'input output layers')
        kit.label(data['input'], 16)
        kit.label(data['output'], 16)
        kit.require(all(len(word) <= 7 for word in (data['input'] + ' ' + data['output']).split()), 'End label words must be 7 characters or fewer')
        kit.items(data['layers'], 2, 4)
        for layer in data['layers']:
            kit.fields(layer, 'label catches')
            kit.label(layer['label'], 16)
            kit.label(layer['catches'], 26)
            kit.require(all(len(word) <= 9 for word in layer['label'].split()), 'Layer label words must be 9 characters or fewer')
        _index_state(state, 'highlight', len(data['layers']))
    elif kind == 'embedding-map':
        kit.fields(data, 'groups points query k')
        kit.labels(data['groups'], high=4)
        kit.require(all(len(g) <= 14 for g in data['groups']), 'Group label too long')
        kit.items(data['points'], 4, 24)
        for point in data['points']:
            kit.fields(point, 'label x y group')
            _text(point['label'], 12)
            kit.number(point['x'], 0, 1)
            kit.number(point['y'], 0, 1)
            kit.require(type(point['group']) is int and 0 <= point['group'] < len(data['groups']), 'Point group out of range')
        kit.fields(data['query'], 'label x y')
        kit.label(data['query']['label'], 12)
        kit.number(data['query']['x'], 0, 1)
        kit.number(data['query']['y'], 0, 1)
        kit.require(type(data['k']) is int and 1 <= data['k'] <= min(5, len(data['points'])), 'k must be 1-5 and at most the point count')
        qx, qy = data['query']['x'], data['query']['y']
        order = sorted(range(len(data['points'])), key=lambda i: (data['points'][i]['x'] - qx) ** 2 + (data['points'][i]['y'] - qy) ** 2)
        derived = {'neighbors': order[:data['k']]}
    elif kind == 'prompt-anatomy':
        kit.fields(data, 'sections')
        kit.items(data['sections'], 2, 6)
        for section in data['sections']:
            kit.fields(section, 'label text kind')
            kit.label(section['label'], 14)
            kit.label(section['text'], 60)
            kit.require(section['kind'] in PROMPT_KINDS, 'Unknown section kind')
        _index_state(state, 'highlight', len(data['sections']))
    elif kind == 'orchestration':
        kit.fields(data, 'orchestrator shared workers')
        kit.label(data['orchestrator'], 16)
        kit.label(data['shared'], 20)
        kit.items(data['workers'], 2, 4)
        for worker in data['workers']:
            kit.fields(worker, 'label task status')
            kit.label(worker['label'], 14)
            kit.label(worker['task'], 22)
            kit.require(worker['status'] in WORKER_STATES, 'status must be idle, working, done or blocked')
    elif kind == 'event-bus':
        kit.fields(data, 'topic publishers subscribers events')
        kit.label(data['topic'], 18)
        kit.labels(data['publishers'], high=3)
        kit.labels(data['subscribers'], high=4)
        kit.require(all(len(x) <= 14 for x in data['publishers'] + data['subscribers']), 'Node label too long')
        kit.labels(data['events'], high=3)
        kit.require(all(len(x) <= 12 for x in data['events']), 'Event label too long')
    elif kind == 'lanes':
        kit.fields(data, 'unit lanes lock')
        kit.label(data['unit'], 12)
        kit.items(data['lanes'], 2, 4)
        end_max = 0
        for lane in data['lanes']:
            kit.fields(lane, 'label spans')
            kit.label(lane['label'], 12)
            kit.items(lane['spans'], 1, 4)
            last = -1
            for span in lane['spans']:
                kit.fields(span, 'label start end')
                kit.label(span['label'], 12)
                kit.number(span['start'], 0)
                kit.number(span['end'], 0)
                kit.require(span['end'] > span['start'] and span['start'] >= last, 'Spans in a lane must be ordered and not overlap')
                last = span['end']
                end_max = max(end_max, span['end'])
        if data['lock'] is not None:
            kit.fields(data['lock'], 'label start end')
            kit.label(data['lock']['label'], 14)
            kit.number(data['lock']['start'], 0)
            kit.number(data['lock']['end'], 0)
            kit.require(data['lock']['end'] > data['lock']['start'], 'Invalid lock interval')
            end_max = max(end_max, data['lock']['end'])
        derived = {'total': end_max}
    elif kind == 'dag':
        kit.fields(data, 'nodes edges')
        kit.items(data['nodes'], 3, 8)
        levels = {}
        for node in data['nodes']:
            kit.fields(node, 'label level')
            kit.label(node['label'], 14)
            kit.require(type(node['level']) is int and 0 <= node['level'] <= 3, 'level must be 0-3')
            levels[node['level']] = levels.get(node['level'], 0) + 1
        kit.require(max(levels.values()) <= 4, 'At most four nodes per level')
        kit.require(sorted(levels) == list(range(len(levels))), 'Levels must be contiguous from 0')
        kit.items(data['edges'], 2, 10)
        seen = set()
        for edge in data['edges']:
            kit.fields(edge, 'from to')
            for key in ('from', 'to'):
                kit.require(type(edge[key]) is int and 0 <= edge[key] < len(data['nodes']), 'Edge index out of range')
            kit.require(data['nodes'][edge['from']]['level'] < data['nodes'][edge['to']]['level'], 'Edges must go to a later level')
            kit.require((edge['from'], edge['to']) not in seen, 'Duplicate edge')
            seen.add((edge['from'], edge['to']))
        derived = {'levels': len(levels)}
        _index_state(state, 'highlight', len(data['nodes']))
    elif kind == 'diff':
        kit.fields(data, 'file lines')
        kit.label(data['file'], 24)
        kit.items(data['lines'], 2, 9)
        for line in data['lines']:
            kit.fields(line, 'kind text')
            kit.require(line['kind'] in DIFF_KINDS, 'kind must be context, added or removed')
            _text(line['text'], 40)
        derived = {'added': sum(l['kind'] == 'added' for l in data['lines']), 'removed': sum(l['kind'] == 'removed' for l in data['lines'])}
        _index_state(state, 'active_line', len(data['lines']))
    elif kind == 'pyramid':
        kit.fields(data, 'layers')
        kit.items(data['layers'], 2, 4)
        for layer in data['layers']:
            kit.fields(layer, 'label count note')
            kit.label(layer['label'], 14)
            kit.require(type(layer['count']) is int and layer['count'] >= 0, 'count must be a nonnegative integer')
            kit.label(layer['note'], 22)
        _index_state(state, 'highlight', len(data['layers']))
    elif kind == 'versions':
        kit.fields(data, 'tags')
        kit.items(data['tags'], 2, 6)
        for tag in data['tags']:
            kit.fields(tag, 'label kind date note')
            kit.label(tag['label'], 9)
            kit.require(tag['kind'] in VERSION_KINDS, 'kind must be major, minor or patch')
            kit.label(tag['date'], 10)
            kit.label(tag['note'], 22)
        _index_state(state, 'highlight', len(data['tags']))
    elif kind == 'trust-boundary':
        kit.fields(data, 'inside outside crossings')
        for zone in (data['inside'], data['outside']):
            kit.fields(zone, 'label items')
            kit.label(zone['label'], 18)
            kit.labels(zone['items'], high=4)
            kit.require(all(len(i) <= 16 for i in zone['items']), 'Zone item too long')
        kit.items(data['crossings'], 1, 4)
        for crossing in data['crossings']:
            kit.fields(crossing, 'label direction guarded')
            kit.label(crossing['label'], 22)
            kit.require(crossing['direction'] in ('in', 'out'), 'direction must be in or out')
            kit.require(type(crossing['guarded']) is bool, 'guarded must be boolean')
    elif kind == 'memory-timeline':
        kit.fields(data, 'turns events')
        kit.require(type(data['turns']) is int and 3 <= data['turns'] <= 12, 'turns must be 3-12')
        kit.items(data['events'], 2, 8)
        last = 0
        for event in data['events']:
            kit.fields(event, 'turn kind label')
            kit.require(type(event['turn']) is int and 1 <= event['turn'] <= data['turns'] and event['turn'] >= last, 'Events must be ordered by turn within range')
            last = event['turn']
            kit.require(event['kind'] in MEMORY_KINDS, 'kind must be stored, recalled, updated or forgotten')
            kit.label(event['label'], 18)
        _index_state(state, 'highlight', len(data['events']))
    elif kind == 'eval-scorecard':
        kit.fields(data, 'threshold suites')
        kit.number(data['threshold'], 0, 100)
        kit.items(data['suites'], 2, 6)
        passed = []
        for suite in data['suites']:
            kit.fields(suite, 'label score previous')
            kit.label(suite['label'], 16)
            kit.number(suite['score'], 0, 100)
            if suite['previous'] is not None:
                kit.number(suite['previous'], 0, 100)
            passed.append(suite['score'] >= data['threshold'])
        derived = {'passed': passed, 'deltas': [None if s['previous'] is None else round(s['score'] - s['previous'], 3) for s in data['suites']]}
        _index_state(state, 'highlight', len(data['suites']))
    elif kind == 'tool-schema':
        kit.fields(data, 'name description params')
        kit.label(data['name'], 20)
        kit.label(data['description'], 44)
        kit.items(data['params'], 1, 6)
        names = []
        for param in data['params']:
            kit.fields(param, 'name type required note')
            kit.label(param['name'], 14)
            kit.require(param['type'] in PARAM_TYPES, 'Unknown parameter type')
            kit.require(type(param['required']) is bool, 'required must be boolean')
            kit.label(param['note'], 22)
            names.append(param['name'])
        kit.require(len(set(names)) == len(names), 'Duplicate parameter names')
        derived = {'required': sum(p['required'] for p in data['params'])}
        _index_state(state, 'highlight', len(data['params']))
    elif kind == 'latency-breakdown':
        kit.fields(data, 'unit stages')
        kit.label(data['unit'], 6)
        kit.items(data['stages'], 2, 6)
        total = 0
        for stage in data['stages']:
            kit.fields(stage, 'label value')
            kit.label(stage['label'], 14)
            kit.number(stage['value'], 0)
            total += stage['value']
        kit.require(total > 0, 'Stages must add up to a positive total')
        derived = {'total': total, 'share': [stage['value'] / total for stage in data['stages']]}
        _index_state(state, 'highlight', len(data['stages']))
    elif kind == 'sliding-window':
        kit.fields(data, 'window limit now unit events')
        kit.number(data['window'], 0.001)
        kit.require(type(data['limit']) is int and 1 <= data['limit'] <= 999, 'limit must be 1-999')
        kit.number(data['now'], 0)
        kit.label(data['unit'], 8)
        kit.items(data['events'], 1, 24)
        last = None
        for t in data['events']:
            kit.number(t, 0)
            kit.require(t <= data['now'] and (last is None or t >= last), 'Events must be ordered and not in the future')
            last = t
        inside = [t for t in data['events'] if t > data['now'] - data['window']]
        derived = {'in_window': len(inside), 'allowed': len(inside) < data['limit'], 'start': data['now'] - data['window']}
    elif kind == 'retry-budget':
        kit.fields(data, 'window requests retries budget_percent')
        kit.label(data['window'], 14)
        kit.require(type(data['requests']) is int and data['requests'] > 0, 'requests must be a positive integer')
        kit.require(type(data['retries']) is int and data['retries'] >= 0, 'retries must be a nonnegative integer')
        kit.number(data['budget_percent'], 0, 100)
        allowed = data['requests'] * data['budget_percent'] / 100
        derived = {'allowed': allowed, 'ratio': data['retries'] / data['requests'], 'within': data['retries'] <= allowed,
                   'load_factor': (data['requests'] + data['retries']) / data['requests']}
    elif kind == 'heatmap':
        kit.fields(data, 'rows columns values unit')
        kit.labels(data['rows'], high=6)
        kit.labels(data['columns'], high=6)
        kit.require(all(len(x) <= 12 for x in data['rows']) and all(len(x) <= 10 for x in data['columns']), 'Row or column label too long')
        kit.label(data['unit'], 8)
        kit.require(isinstance(data['values'], list) and len(data['values']) == len(data['rows']), 'One value row per row label')
        flat = []
        for row in data['values']:
            kit.require(isinstance(row, list) and len(row) == len(data['columns']), 'Row width must match the columns')
            for value in row:
                kit.number(value)
                flat.append(value)
        derived = {'low': min(flat), 'high': max(flat)}
    elif kind == 'slope':
        kit.fields(data, 'left right unit items')
        kit.label(data['left'], 10)
        kit.label(data['right'], 10)
        kit.label(data['unit'], 8)
        kit.items(data['items'], 2, 6)
        for item in data['items']:
            kit.fields(item, 'label start end')
            kit.label(item['label'], 12)
            kit.number(item['start'])
            kit.number(item['end'])
        values = [v for item in data['items'] for v in (item['start'], item['end'])]
        kit.require(max(values) > min(values), 'Slope values need a nonzero range')
        derived = {'low': min(values), 'high': max(values)}
        _index_state(state, 'highlight', len(data['items']))
    elif kind == 'state-diff':
        kit.fields(data, 'record fields')
        kit.label(data['record'], 20)
        kit.items(data['fields'], 2, 8)
        keys = []
        for field in data['fields']:
            kit.fields(field, 'key before after')
            kit.label(field['key'], 12)
            _text(field['before'], 16)
            _text(field['after'], 16)
            keys.append(field['key'])
        kit.require(len(set(keys)) == len(keys), 'Duplicate field keys')
        derived = {'changed': [f['before'] != f['after'] for f in data['fields']]}
    elif kind == 'semver-rule':
        kit.fields(data, 'version changes')
        match = re.fullmatch(r'(\d{1,3})\.(\d{1,3})\.(\d{1,3})', data['version'])
        kit.require(match, 'version must be MAJOR.MINOR.PATCH')
        major, minor, patch = (int(x) for x in match.groups())
        kit.items(data['changes'], 1, 3)
        kinds = []
        nxt = {'major': f'{major + 1}.0.0', 'minor': f'{major}.{minor + 1}.0', 'patch': f'{major}.{minor}.{patch + 1}'}
        for change in data['changes']:
            kit.fields(change, 'kind example')
            kit.require(change['kind'] in VERSION_KINDS, 'kind must be major, minor or patch')
            kit.label(change['example'], 30)
            kinds.append(change['kind'])
        kit.require(len(set(kinds)) == len(kinds), 'One change per kind')
        derived = {'next': {k: nxt[k] for k in kinds}}
        _index_state(state, 'highlight', len(data['changes']))
    elif kind == 'quote':
        kit.fields(data, 'text attribution role')
        kit.label(data['text'], 140)
        kit.label(data['attribution'], 30)
        _text(data['role'], 30)
    elif kind == 'checklist':
        kit.fields(data, 'items')
        kit.items(data['items'], 2, 7)
        for item in data['items']:
            kit.fields(item, 'label done note')
            kit.label(item['label'], 34)
            kit.require(type(item['done']) is bool, 'done must be boolean')
            _text(item['note'], 22)
        derived = {'done': sum(i['done'] for i in data['items'])}
        _index_state(state, 'highlight', len(data['items']))
    elif kind == 'stat':
        kit.fields(data, 'value unit label context trend')
        kit.label(data['value'], 12)
        _text(data['unit'], 10)
        kit.label(data['label'], 40)
        _text(data['context'], 60)
        kit.require(data['trend'] in TRENDS, 'trend must be up, down, flat or none')
    elif kind == 'before-after':
        kit.fields(data, 'before after')
        for side in (data['before'], data['after']):
            kit.fields(side, 'title items')
            kit.label(side['title'], 14)
            kit.items(side['items'], 1, 4)
            for item in side['items']:
                kit.label(item, 26)
    elif kind == 'steps':
        kit.fields(data, 'items')
        kit.items(data['items'], 2, 6)
        for item in data['items']:
            kit.fields(item, 'label note')
            kit.label(item['label'], 26)
            _text(item['note'], 40)
        _index_state(state, 'highlight', len(data['items']))
    elif kind == 'ranking':
        kit.fields(data, 'unit items')
        _text(data['unit'], 8)
        kit.items(data['items'], 2, 6)
        values = []
        for item in data['items']:
            kit.fields(item, 'label value')
            kit.label(item['label'], 18)
            kit.number(item['value'], 0)
            values.append(item['value'])
        kit.require(all(a >= b for a, b in zip(values, values[1:])), 'Ranking items must be listed from highest to lowest')
        kit.require(values[0] > 0, 'The top value must be positive')
        derived = {'high': values[0]}
        _index_state(state, 'highlight', len(data['items']))
    elif kind == 'timeline':
        kit.fields(data, 'items')
        kit.items(data['items'], 2, 6)
        for item in data['items']:
            kit.fields(item, 'when label note')
            kit.label(item['when'], 12)
            kit.label(item['label'], 24)
            _text(item['note'], 40)
        _index_state(state, 'highlight', len(data['items']))
    elif kind == 'pros-cons':
        kit.fields(data, 'pros cons')
        for side in (data['pros'], data['cons']):
            kit.items(side, 1, 4)
            for item in side:
                kit.label(item, 30)
    elif kind == 'definition':
        kit.fields(data, 'term kind meaning example')
        kit.label(data['term'], 24)
        _text(data['kind'], 16)
        kit.label(data['meaning'], 120)
        _text(data['example'], 80)
    elif kind == 'cards':
        kit.fields(data, 'items')
        kit.items(data['items'], 2, 3)
        for item in data['items']:
            kit.fields(item, 'title text icon')
            kit.label(item['title'], 16)
            kit.label(item['text'], 60)
            _icon(item['icon'], icons)
        _index_state(state, 'highlight', len(data['items']))
    return {**base, 'family': family(kind), 'data': data, 'variant': variant, 'state': state, 'derived': derived, 'status': STATUS}


def validate_document(document, icons):
    kit.fields(document, 'version components')
    kit.require(type(document['version']) is int and document['version'] == 1, 'Unsupported wave version')
    kit.items(document['components'], high=80)
    result = [validate_component(c, icons) for c in document['components']]
    kit.require(len({c['id'] for c in result}) == len(result), 'Duplicate component IDs')
    return result
