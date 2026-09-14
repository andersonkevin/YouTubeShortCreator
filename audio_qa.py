"""Compare decoded source/export narration; no speech-quality claim is made."""
from pathlib import Path
import numpy as np


def compare_files(source: Path, export: Path):
    a = np.fromfile(source, dtype='<f4').astype(np.float64)
    b = np.fromfile(export, dtype='<f4').astype(np.float64)
    rate = 16000
    if not len(a) or not len(b) or abs(len(a) - len(b)) > rate * .08:
        raise ValueError('Audio duration mismatch')
    windows = []
    for start in range(0, min(len(a), len(b)) - rate // 2, 3 * rate):
        x, y = a[start:start + 3 * rate], b[start:start + 3 * rate]
        if np.sqrt(np.mean(x * x)) < .001:
            continue
        count = min(len(x), len(y))
        x, y = x[:count], y[:count]
        n = 1 << (2 * count - 1).bit_length()
        cross = np.fft.irfft(np.fft.rfft(y, n) * np.conj(np.fft.rfft(x, n)), n)
        lags = np.arange(-1600, 1601)
        lag = int(lags[np.argmax(cross[lags % n])])
        correlation = float(np.dot(x, y) / max(1e-30, np.linalg.norm(x) * np.linalg.norm(y)))
        if abs(lag) > 160 or correlation < .97:
            raise ValueError(f'Voice identity/sync mismatch at {start / rate}s: lag={lag / rate}s correlation={correlation}')
        windows.append({'start': start / rate, 'lag_ms': lag * 1000 / rate, 'correlation': correlation})
    if not windows:
        raise ValueError('No voiced audio windows')
    return {'status': 'PASS', 'source_seconds': len(a) / rate, 'export_seconds': len(b) / rate, 'windows': windows, 'listening_approval': 'pending'}
