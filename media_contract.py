"""Bounded output profiles. Legacy episodes retain the original Shorts contract."""
from safety import number, require

FPS = 30
MAX_SECONDS = 180
MAX_FRAMES = MAX_SECONDS * FPS
MAX_AUDIO_BYTES = 75_000_000
COMPOSITION_FORMATS = ('landscape', 'portrait', 'square', 'portrait-4x5')


def output_profile(name='shorts'):
    require(isinstance(name, str) and name in ('shorts',) + COMPOSITION_FORMATS, 'Unsupported output profile')
    dimensions = {'shorts': (1080, 1920), 'landscape': (1920, 1080), 'portrait': (1080, 1920),
                  'square': (1080, 1080), 'portrait-4x5': (1080, 1350)}
    width, height = dimensions[name]
    modern = name != 'shorts'
    return {'id': name, 'width': width, 'height': height,
            'fps': FPS, 'max_seconds': 600 if modern else MAX_SECONDS,
            'max_frames': 18000 if modern else MAX_FRAMES,
            'max_audio_bytes': 250_000_000 if modern else MAX_AUDIO_BYTES}


def composition_geometry(name):
    require(name in COMPOSITION_FORMATS, 'Composition profile required')
    # Absolute pixels in each output canvas; preview scaling never changes these slots.
    # Even portrait progress edges survive 4:2:0 encoding without thin-line luma loss.
    layouts = {
        'landscape': {'content': [100, 190, 1720, 690], 'caption': [310, 910, 1300, 130],
                      'logo': [100, 70, 340, 70], 'progress': [100, 40, 1720, 6], 'plot': [560, 125, 1160, 470]},
        'portrait': {'content': [70, 260, 940, 1300], 'caption': [90, 1690, 900, 170],
                     'logo': [70, 90, 340, 70], 'progress': [70, 44, 940, 6], 'plot': [0, 430, 940, 600]},
        'square': {'content': [60, 180, 960, 690], 'caption': [60, 900, 960, 140],
                   'logo': [60, 65, 260, 55], 'progress': [60, 35, 960, 5], 'plot': [0, 220, 960, 360]},
        'portrait-4x5': {'content': [60, 200, 960, 920], 'caption': [60, 1160, 960, 150],
                         'logo': [60, 65, 300, 62], 'progress': [60, 35, 960, 5], 'plot': [0, 300, 960, 440]},
    }
    return {key: list(value) for key, value in layouts[name].items()}


def episode_profile(data):
    if data.get('version') == 3:
        require(data.get('format') in COMPOSITION_FORMATS, 'Version 3 requires an explicit composition profile')
        return output_profile(data['format'])
    return output_profile()


def duration_seconds(value, profile='shorts'):
    spec = output_profile(profile)
    duration = number(value)
    require(1 < duration <= spec['max_seconds'] and abs(duration * FPS - round(duration * FPS)) < 1e-5,
            f"{profile} duration must be whole 30fps frames, greater than 1 and at most {spec['max_seconds']} seconds; audio is not trimmed automatically")
    return duration
