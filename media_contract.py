"""Shared Shorts duration contract, independent of encoder selection."""
from safety import number, require

FPS = 30
MAX_SECONDS = 180
MAX_FRAMES = MAX_SECONDS * FPS
MAX_AUDIO_BYTES = 75_000_000


def duration_seconds(value):
    duration = number(value)
    require(1 < duration <= MAX_SECONDS and abs(duration * FPS - round(duration * FPS)) < 1e-5,
            'Shorts duration must be whole 30fps frames, greater than 1 and at most 180 seconds; audio is not trimmed automatically')
    return duration
