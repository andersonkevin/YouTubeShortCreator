"""Compare decoded source/export narration; no speech-quality claim is made."""
from pathlib import Path
import numpy as np


def compare_files(source: Path, export: Path):
    a = np.fromfile(source, dtype='<f4').astype(np.float64)
    b = np.fromfile(export, dtype='<f4').astype(np.float64)
    rate = 16000
    if not len(a) or not len(b) or abs(len(a) - len(b)) > rate * .08:
        raise ValueError('Audio duration mismatch')
    if not np.isfinite(a).all() or not np.isfinite(b).all():
        raise ValueError('Non-finite decoded audio samples')
    common = min(len(a), len(b))
    for tail in (a[common:], b[common:]):
        if len(tail) and np.sqrt(np.mean(tail * tail)) > .003:
            raise ValueError('Non-silent unmatched audio tail')
    windows = []
    silent_windows = 0
    for start in range(0, common, 3 * rate):
        x, y = a[start:start + 3 * rate], b[start:start + 3 * rate]
        count = min(len(x), len(y))
        x, y = x[:count], y[:count]
        if np.sqrt(np.mean(x * x)) < .001:
            if np.sqrt(np.mean(y * y)) > .003:
                raise ValueError(f'Unexpected audio during source silence at {start / rate}s')
            silent_windows += 1
            continue
        n = 1 << (2 * count - 1).bit_length()
        cross = np.fft.irfft(np.fft.rfft(y, n) * np.conj(np.fft.rfft(x, n)), n)
        limit = min(1600, count - 1)
        lags = np.arange(-limit, limit + 1)
        lag = int(lags[np.argmax(cross[lags % n])])
        correlation = float(np.dot(x, y) / max(1e-30, np.linalg.norm(x) * np.linalg.norm(y)))
        if abs(lag) > 160 or correlation < .97:
            raise ValueError(f'Voice identity/sync mismatch at {start / rate}s: lag={lag / rate}s correlation={correlation}')
        windows.append({'start': start / rate, 'lag_ms': lag * 1000 / rate, 'correlation': correlation})
    if not windows:
        raise ValueError('No voiced audio windows')
    return {'status': 'PASS', 'source_seconds': len(a) / rate, 'export_seconds': len(b) / rate,
            'windows': windows, 'silent_windows_checked': silent_windows,
            'unmatched_samples': abs(len(a) - len(b)), 'listening_approval': 'pending'}
