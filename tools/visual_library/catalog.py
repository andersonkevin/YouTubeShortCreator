"""Machine-readable discovery over bounded assets and existing scene contracts."""
from . import kit

INTENTS = {
    'line': ('Trend over ordered categories', 'Comparable nonnegative values; do not infer a forecast'),
    'bar': ('Compare category magnitudes', 'Comparable units and a zero baseline'),
    'pie': ('Explain parts of one whole', 'Non-overlapping categories with a positive total'),
    'scatter': ('Inspect paired observations', 'At least three pairs; correlation is not causation'),
    'heatmap': ('Compare a percentage matrix', '0-100 percentages only, not raw counts'),
    'correlation': ('Inspect relationships between variables', 'Complete paired observations; no causal claims'),
    'timeline': ('Explain latency and overlapping stages', 'Explicit start/end intervals and units'),
    'geo': ('Explain actual locations', 'Fixed-size locations only; no audience volume or ranking'),
    'flow': ('Explain a process or approval boundary', 'Two to four labeled steps; no executing actions'),
    'metric': ('Highlight one contextualized value', 'Explicit unit and source; not a KPI claim without evidence'),
    'comparison': ('Contrast two concepts', 'Two columns of short labels; no invented quantitative ranking'),
}


def entries():
    from visual_adapter import PRODUCTION_KINDS, REVEALS, DEFAULT_PRESENTATION
    manifest = kit.verify_assets()
    recipes = kit.validate_recipes(kit.read_json(kit.HOME/'recipes.json'), manifest['icons'])
    result = []
    for name in manifest['icons']:
        result.append({'id':'icon:'+name, 'kind':'icon', 'title':name.replace('-', ' '),
                       'keywords':name.split('-'), 'use_when':'Label a concept without implying a brand endorsement',
                       'limits':'Pinned SVG only; not a third-party logo', 'ready_for':'svg-export', 'license':'ISC/MIT notices'})
    for name, recipe in recipes.items():
        result.append({'id':'composition:'+name, 'kind':'composition', 'title':recipe['label'],
                       'keywords':name.split('-')+[recipe['base'],recipe['badge']], 'use_when':'Combine one concept with one state badge',
                       'limits':'Fixed two-icon composition; not a brand logo', 'ready_for':'svg-export', 'example':recipe})
    examples = {}
    for filename in ('demo.json','widgets.json'):
        document = kit.read_json(kit.HOME/filename)
        kit.validate_document(document, manifest['icons'])
        examples.update({chart['kind']:chart for chart in document['charts']})
    for name, (intent, limit) in INTENTS.items():
        result.append({'id':'visual:'+name, 'kind':'widget' if name in ('flow','metric','comparison') else 'chart',
                       'title':name, 'keywords':(name+' '+intent+(' grouped stacked components' if name=='bar' else '')).lower().split()+list(REVEALS), 'use_when':intent,
                       'limits':limit, 'ready_for':'production-v2-review' if name in PRODUCTION_KINDS else 'validated-study-export', 'dimensions':[880,810],
                       'data_provenance_required':True, 'production_scene_available':name in PRODUCTION_KINDS,
                       'episode_version':2 if name in PRODUCTION_KINDS else None,
                       'scene_layout':'visual-library' if name in PRODUCTION_KINDS else None,
                       'production_dimensions':[824,560], 'reveals':list(REVEALS),
                       'presentation_default':dict(DEFAULT_PRESENTATION),
                       'chart_styles':['standard','stacked'] if name=='bar' else ['standard'],
                       'qualification':'B02' if name in ('flow','metric','comparison') else 'B03',
                       'motion_qualification':'B03',
                       'example':examples[name]})
    for path in sorted((kit.HOME.parents[1]/'templates/v1/scenes').glob('*.json')):
        layout = kit.read_json(path)
        result.append({'id':'layout:'+path.stem, 'kind':'layout', 'title':path.stem.replace('-',' '),
                       'keywords':path.stem.split('-'), 'use_when':'Use the existing fixed production layout slots',
                       'limits':'Approved brand and timed narration required; do not add arbitrary fields',
                       'ready_for':'production-template', 'content_keys':layout['content_keys'],
                       'motion_keys':layout['motion_keys'], 'example':layout['example']})
    return result


def search(query='', kind=None):
    kit.label(query,100) if query else None
    result = entries()
    if kind:
        kit.require(kind in ('icon','composition','chart','widget','layout'), 'Unknown asset kind')
        result = [entry for entry in result if entry['kind']==kind]
    terms = query.casefold().split()
    return [entry for entry in result if all(term in ' '.join([entry['title'],entry['use_when'],*entry['keywords']]).casefold() for term in terms)]


def describe(identifier):
    found = [entry for entry in entries() if entry['id']==identifier]
    kit.require(len(found)==1, 'Unknown catalog ID')
    return found[0]
