"""Bounded diagram and photographic films driven by measured caption beats."""
from safety import identifier, keys, number, require, text

LAYOUTS = ('opening', 'prediction', 'contrast', 'verification', 'closing')
PHOTOGRAPHIC_FORMATS = ('landscape', 'portrait')


def validate(content, assets=None):
    if content.get('layout') == 'photographic':
        keys(content, ('layout', 'shots'), 'photographic cinema')
        shots = content['shots']
        require(isinstance(shots, list) and 2 <= len(shots) <= 24, 'Use 2-24 photographic shots')
        for shot in shots:
            keys(shot, ('image', 'from', 'to', 'seam', 'title'), 'cinema shot')
            identifier(shot['image'])
            require(assets is not None and shot['image'] in assets, 'Cinema shot needs a verified local image')
            require(shot['seam'] in ('cut', 'focus', 'occlude'), 'Unknown cinema shot seam')
            require(isinstance(shot['title'], str) and len(shot['title']) <= 32 and '\n' not in shot['title'], 'Shot title must be a short single line')
            if shot['title']:
                text(shot['title'], 32)
            for field in ('from', 'to'):
                pose = shot[field]
                require(isinstance(pose, list) and len(pose) == 3, 'Camera pose is [zoom, horizontal focus, vertical focus]')
                require(1 <= number(pose[0]) <= 2.8 and all(0 <= number(v) <= 1 for v in pose[1:]), 'Cinema camera outside bounds')
        return len(shots)
    keys(content, ('layout', 'kicker', 'headline', 'note', 'labels'), 'cinema composition')
    require(content['layout'] in LAYOUTS, 'Unknown cinema layout')
    for field, maximum in (('kicker', 36), ('note', 76)):
        text(content[field], maximum)
        require('\n' not in content[field], 'Cinema copy must be single-line')
    for field, length, maximum in (('headline', 2, 26), ('labels', 3, 24)):
        require(isinstance(content[field], list) and len(content[field]) == length, 'Invalid cinema ' + field)
        for value in content[field]:
            text(value, maximum)
            require('\n' not in value, 'Cinema copy must be single-line')
    return 2


def selected(scenes):
    return any(scene.get('kind') == 'cinema' for scene in scenes)


def validate_profile(scenes, profile):
    if selected(scenes):
        require(all(scene.get('kind') == 'cinema' for scene in scenes), 'Cinema films use their own shared frame')
        photographic = all(scene.get('content', {}).get('layout') == 'photographic' for scene in scenes)
        require(profile in (PHOTOGRAPHIC_FORMATS if photographic else ('landscape',)),
                'Photographic cinema supports landscape/portrait; diagram cinema requires landscape')


def geometry(scenes, profile, original):
    if selected(scenes):
        validate_profile(scenes, profile)
        if profile == 'portrait':
            # These boxes constrain copy only. Photography still fills the frame.
            original.update(content=[72, 160, 864, 1320], caption=[72, 1540, 864, 156],
                            logo=[64, 88, 140, 26], progress=[0, 1918, 1080, 2])
        else:
            original.update(content=[80, 110, 1760, 780], caption=[330, 972, 1260, 58],
                            logo=[48, 36, 140, 22], progress=[0, 1078, 1920, 2])
    return original
