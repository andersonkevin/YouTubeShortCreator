"""Map native phoneme intervals to words only when boundaries are unambiguous."""
import math
from safety import require


def words_from_phonemes(script, timings, duration):
    require(math.isfinite(duration) and duration > 0, 'Invalid measured audio duration')
    groups, current, previous = [], [], 0.0
    for item in timings:
        require(isinstance(item.phoneme, str) and len(item.phoneme) == 1, 'Expected individual phonemes')
        require(math.isfinite(item.start) and math.isfinite(item.end)
                and previous <= item.start <= item.end <= duration + 1e-6,
                'Invalid or unordered native phoneme timing')
        previous = item.end
        if item.phoneme.isspace():
            if current:
                groups.append(current)
                current = []
        else:
            current.append(item)
    if current:
        groups.append(current)
    tokens = script.split()
    require(len(groups) == len(tokens) and bool(groups),
            'Ambiguous phoneme-to-word mapping; use measured transcription instead')
    result = []
    for token, group in zip(tokens, groups):
        require(group[-1].end > group[0].start, 'Empty native word interval')
        result.append({'text': token, 'start': group[0].start, 'end': group[-1].end})
    return result
