"""Closed editorial infographic records for reusable landscape explainers."""
from safety import keys, require, text

DESIGNS = ('dossier', 'circuit', 'atlas')
LAYOUTS = ('hero', 'mechanism', 'comparison', 'process', 'close')


def validate(content):
    keys(content, ('design', 'layout', 'kicker', 'headline', 'deck', 'labels', 'details'), 'editorial composition')
    require(content['design'] in DESIGNS and content['layout'] in LAYOUTS, 'Unknown editorial design or layout')
    for field, count, maximum in (('headline', 2, 21), ('labels', 3, 20), ('details', 3, 39)):
        values = content[field]
        require(isinstance(values, list) and len(values) == count, 'Invalid editorial ' + field)
        for value in values:
            text(value, maximum)
            require('\n' not in value and '\t' not in value, 'Editorial labels must be single-line')
    for field, maximum in (('kicker', 36), ('deck', 62)):
        text(content[field], maximum)
        require('\n' not in content[field] and '\t' not in content[field], 'Editorial labels must be single-line')
    return 2


def validate_profile(scenes, profile):
    import cinema
    cinema.validate_profile(scenes, profile)
    if any(scene.get('kind') == 'editorial' for scene in scenes):
        require(profile == 'landscape', 'Editorial designs currently require landscape; other formats retain their existing layouts')


def geometry(scenes, profile):
    """Use one layout contract for both the compiler CSS and browser QA payload."""
    from media_contract import composition_geometry
    result = composition_geometry(profile)
    if any(scene.get('kind') == 'editorial' for scene in scenes):
        validate_profile(scenes, profile)
        result['logo'] = [100, 76, 230, 48]
        result['progress'] = [100, 40, 1720, 10]
    import cinema
    return cinema.geometry(scenes, profile, result)
