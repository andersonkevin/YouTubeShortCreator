"""Batch diversity: pick layouts for a new episode that its batch has not used yet."""
from collections import Counter

import workflow
from safety import identifier, keys, read_json, require

# Every production layout belongs to one visual family. Two layouts from the same
# family share a silhouette, so a batch rotates families before it repeats a layout.
FAMILIES = {
    'code': ('code-policy', 'code-pipeline', 'code-evaluation'),
    'evidence': ('prompt-tools', 'evidence-comparison', 'retrieval-checks'),
    'automation': ('automation-plan', 'automation-preview', 'automation-rollback', 'automation-close'),
    'gate': ('approval-gate', 'closing'),
    'quote': ('quote-card',),
    'steps': ('numbered-steps', 'checklist-progress'),
    'stat': ('headline-stat',),
    'compare': ('before-after-panels', 'pros-cons-columns'),
}
FAMILY_OF = {layout: family for family, layouts in FAMILIES.items() for layout in layouts}
# Tie-break order for a batch's first episode: the classic opener, then the
# general-purpose forms, so a batch reaches every family within three episodes.
ORDER = ('prompt-tools', 'code-policy', 'approval-gate', 'quote-card', 'numbered-steps', 'headline-stat',
         'before-after-panels', 'automation-plan', 'evidence-comparison', 'code-pipeline', 'closing',
         'checklist-progress', 'pros-cons-columns', 'automation-preview', 'retrieval-checks',
         'code-evaluation', 'automation-rollback', 'automation-close')


def template_layouts():
    return sorted(path.stem for path in workflow.TEMPLATE.joinpath('scenes').glob('*.json'))


def pick_layouts(count, history):
    """Choose `count` layouts of distinct families: layouts the batch has not used come
    first, then the family used longest ago, then the family used least. `history` is
    the batch's earlier episodes as layout lists, oldest first. Deterministic."""
    require(count in (3, 4), 'Use 3-4 scenes')
    require(set(ORDER) == set(FAMILY_OF) == set(template_layouts()), 'Layout families are out of date with the template')
    layout_uses, family_uses, last_family_use = Counter(), Counter(), {}
    for index, layouts in enumerate(history):
        for layout in layouts:
            require(layout in FAMILY_OF, 'Unknown layout in batch history: ' + str(layout))
            layout_uses[layout] += 1
            family_uses[FAMILY_OF[layout]] += 1
            last_family_use[FAMILY_OF[layout]] = index
    ranked = sorted(ORDER, key=lambda layout: (layout_uses[layout], last_family_use.get(FAMILY_OF[layout], -1),
                                               family_uses[FAMILY_OF[layout]], ORDER.index(layout)))
    picked = []
    for layout in ranked:
        if FAMILY_OF[layout] not in {FAMILY_OF[p] for p in picked}:
            picked.append(layout)
        if len(picked) == count:
            break
    # A gate layout reads as an ending; keep it in the last scene.
    return sorted(picked, key=lambda layout: FAMILY_OF[layout] == 'gate')


def members(root, batch):
    """Episodes recorded in a batch, oldest first, as (id, episode data)."""
    identifier(batch)
    found = []
    episodes = root / 'episodes'
    folders = sorted(p for p in episodes.iterdir() if p.is_dir() and not p.is_symlink()) if episodes.is_dir() else []
    for folder in folders:
        marker = folder / 'batch.json'
        if marker.is_symlink() or not marker.is_file():
            continue
        record = read_json(marker)
        keys(record, ['batch', 'episode', 'sequence', 'picked_layouts'], 'batch record')
        identifier(record['batch'])
        require(record['episode'] == folder.name and type(record['sequence']) is int and record['sequence'] >= 1, 'Invalid batch record')
        if record['batch'] == batch:
            found.append((record['sequence'], folder.name, read_json(folder / 'episode.json')))
    require(len({sequence for sequence, _, _ in found}) == len(found), 'Batch sequence numbers collide')
    return [(name, data) for _, name, data in sorted(found)]


def history(root, batch):
    return [[scene['layout'] for scene in data['scenes']] for _, data in members(root, batch)]


def report(root, batch):
    """Read-only summary of what a batch has used and what the next episode would get."""
    episodes = []
    layouts, families, reveals, kinds = Counter(), Counter(), Counter(), Counter()
    for name, data in members(root, batch):
        entry = {'id': name, 'layouts': [], 'families': [], 'reveals': [], 'visual_kinds': []}
        for scene in data['scenes']:
            layout = scene['layout']
            if layout == 'visual-library':
                record = data.get('visuals', {}).get(scene.get('visual_id'), {})
                reveal = scene.get('presentation', {}).get('reveal', 'wipe-right')
                entry['reveals'].append(reveal)
                entry['visual_kinds'].append(record.get('kind'))
                reveals[reveal] += 1
                kinds[record.get('kind')] += 1
                continue
            entry['layouts'].append(layout)
            entry['families'].append(FAMILY_OF.get(layout))
            layouts[layout] += 1
            families[FAMILY_OF.get(layout)] += 1
        episodes.append(entry)
    repeats = {name: {key: value for key, value in counter.items() if value > 1}
               for name, counter in (('layouts', layouts), ('families', families), ('reveals', reveals), ('visual_kinds', kinds))}
    past = [entry['layouts'] for entry in episodes]
    return {'batch': batch, 'episodes': episodes, 'repeats': repeats,
            'next_pick': {str(count): pick_layouts(count, past) for count in (3, 4)}, 'writes_performed': False}
