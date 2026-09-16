"""Compare sampled encoded frames against the exact capture, with lossy tolerance."""
import math

import numpy as np
from PIL import Image

from media_contract import FPS, MAX_FRAMES, duration_seconds
from safety import digest, inside, number, require

REGIONS = {
    'progress': (98, 78, 926, 92),
    'logo': (90, 130, 934, 250),
    'heading': (90, 270, 934, 590),
    'visual': (90, 630, 934, 1480),
    'note': (90, 1480, 934, 1570),
    'captions': (90, 1590, 934, 1754),
}
MAX_REGION_RMSE = 10
MAX_TILE_RMSE = 24


def sample_indices(captions, duration):
    count = round(duration_seconds(duration) * FPS)
    indices = {0, count // 2, count - 1}
    for cue in captions['cues']:
        start, end = number(cue['start']), number(cue['end'])
        require(0 <= start < end <= duration, 'Invalid caption sampling interval')
        for value in (start, end):
            boundary = math.ceil(value * FPS - 1e-7)
            indices.update((max(0, boundary - 1), min(count - 1, boundary)))
        indices.add(min(count - 1, math.floor((start + end) / 2 * FPS)))
    return sorted(indices)


def pixels(path):
    with Image.open(path) as image:
        require(image.size == (1080, 1920), 'Invalid sampled frame geometry')
        return np.asarray(image.convert('RGB'), dtype=np.float32)


def compare(reference, decoded):
    require(reference.shape == decoded.shape == (1920, 1080, 3), 'Invalid sampled frame geometry')
    require(np.isfinite(reference).all() and np.isfinite(decoded).all(), 'Non-finite frame pixels')
    require(float(np.max(reference) - np.min(reference)) >= 20, 'Blank reference frame')
    squared = (reference - decoded) ** 2
    height, width = squared.shape[:2]
    padded = np.pad(squared, ((0, (-height) % 32), (0, (-width) % 32), (0, 0)))
    tiles = padded.reshape(padded.shape[0] // 32, 32, padded.shape[1] // 32, 32, 3)
    maximum = float(np.sqrt(tiles.mean(axis=(1, 3, 4))).max())
    require(maximum <= MAX_TILE_RMSE, 'Encoded frame local pixel mismatch')
    delta = reference - decoded
    # H.264 4:2:0 reconstructs edge chroma differently across decoders. Keep
    # full-resolution luminance and raw RGB tiles; compare chroma at 2x2 resolution.
    luma = delta @ np.array([.2126, .7152, .0722], dtype=np.float32)
    chroma = np.stack(((delta[:, :, 2] - luma) / 1.8556,
                       (delta[:, :, 0] - luma) / 1.5748), axis=2)
    chroma = chroma.reshape(height // 2, 2, width // 2, 2, 2).mean(axis=(1, 3))
    regions = {}
    luma_regions, chroma_regions = {}, {}
    for name, (left, top, right, bottom) in REGIONS.items():
        rmse = float(np.sqrt(squared[top:bottom, left:right].mean()))
        luma_rmse = float(np.sqrt((luma[top:bottom, left:right] ** 2).mean()))
        chroma_rmse = float(np.sqrt((chroma[top // 2:bottom // 2, left // 2:right // 2] ** 2).mean()))
        require(max(luma_rmse, chroma_rmse) <= MAX_REGION_RMSE, 'Encoded frame region mismatch: ' + name)
        regions[name] = rmse
        luma_regions[name], chroma_regions[name] = luma_rmse, chroma_rmse
    return {'maximum_tile_rmse': maximum, 'region_rmse': regions,
            'luma_region_rmse': luma_regions, 'chroma_region_rmse': chroma_regions}


def verify(reference_dir, decoded_dir, indices):
    require(all(type(index) is int and 0 <= index < MAX_FRAMES for index in indices), 'Invalid frame sample index')
    require(indices and indices == sorted(set(indices)), 'Ordered unique frame samples required')
    names = [f'decoded-{index:05d}.png' for index in range(len(indices))]
    require({p.name for p in decoded_dir.iterdir()} == set(names), 'Incomplete decoded frame samples')
    samples = []
    for index, name in zip(indices, names):
        reference = inside(reference_dir, f'frame-{index:05d}.png')
        decoded = inside(decoded_dir, name)
        samples.append({'index': index, 'reference_sha256': digest(reference),
                        'decoded_sha256': digest(decoded), **compare(pixels(reference), pixels(decoded))})
    return {'status': 'PASS', 'scope': 'sampled lossy pixel correspondence; not human approval',
            'comparison': 'full-resolution Rec.709-weighted luma; 2x2 chroma; raw RGB tiles; not colorimetric calibration',
            'region_rmse_limit': MAX_REGION_RMSE, 'tile_rmse_limit': MAX_TILE_RMSE,
            'samples': samples, 'review_required': True}
