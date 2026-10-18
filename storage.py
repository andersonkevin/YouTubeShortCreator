"""Workspace-scoped disk budgets and explicitly approved output retention."""
from contextlib import contextmanager
import errno
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import time
import uuid

from safety import digest, identifier, inside, keys, read_json, require, write_json

GIB = 1024 ** 3
DEFAULTS = {'version': 1, 'max_generated_bytes': 10 * GIB,
            'max_scratch_bytes': 32 * GIB, 'min_free_bytes': 5 * GIB,
            'keep_builds': 2, 'older_than_days': 7}
RECORD_SUFFIXES = {'.json', '.jsonl', '.log', '.md', '.txt', '.srt', '.csv'}


def workspace(root):
    root = Path(root).expanduser().absolute()
    require(all(not p.is_symlink() for p in (root, *root.parents)), 'Symlink workspace refused')
    require(root.is_dir() and (root / 'brand/brand.json').is_file() and
            (root / 'episodes').is_dir() and (root / 'intake').is_dir(),
            'Select an initialized video workspace, not a project or parent directory')
    for name in ('brand', 'episodes', 'intake', 'runs', '.scratch', '.storage'):
        inside(root, name, exists=False)
    return root


def policy(root):
    path = inside(root, 'storage-policy.json', exists=False)
    result = read_json(path) if path.exists() else dict(DEFAULTS)
    keys(result, DEFAULTS, 'storage policy')
    require(type(result['version']) is int and result['version'] == 1, 'Unsupported storage policy')
    for key in ('max_generated_bytes', 'max_scratch_bytes'):
        require(type(result[key]) is int and GIB <= result[key] <= 1024 * GIB,
                'Storage budgets must be integer bytes between 1 GiB and 1 TiB')
    require(type(result['min_free_bytes']) is int and 2 * GIB <= result['min_free_bytes'] <= 1024 * GIB,
            'Free-space reserve must be at least 2 GiB')
    require(type(result['keep_builds']) is int and 1 <= result['keep_builds'] <= 100, 'Keep at least one build')
    require(type(result['older_than_days']) is int and 1 <= result['older_than_days'] <= 3650, 'Retention age must be at least one day')
    return result


def tree(root, directory):
    """Do not follow links, special files or mounted directories during cleanup."""
    result = []
    if not directory.exists():
        return result
    device = root.stat().st_dev
    require(directory.is_dir() and not directory.is_symlink(), 'Unsafe storage directory')
    require(directory.stat().st_dev == device, 'Mounted storage directory refused')
    for parent, directories, files in os.walk(directory, followlinks=False):
        for name in directories + files:
            path = Path(parent) / name
            info = path.lstat()
            require(info.st_dev == device and not stat.S_ISLNK(info.st_mode), 'Symlink or mounted storage refused')
            require(stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode), 'Special storage file refused')
            if stat.S_ISREG(info.st_mode):
                result.append(path)
    return sorted(result)


@contextmanager
def activity(root):
    """Serialize generator builds and approved cleanup within one workspace."""
    root = workspace(root)
    try:
        import fcntl
    except ImportError:
        raise ValueError('Storage writers currently require macOS or Linux file locking') from None
    lock = inside(root, '.storage.lock', exists=False)
    descriptor = os.open(lock, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('Workspace busy: a build, render or cleanup is active') from None
        yield
    finally:
        os.close(descriptor)


def usage(root):
    root = workspace(root)
    return {name: sum(p.stat().st_size for p in tree(root, root / directory))
            for name, directory in [('generated_bytes', 'runs'), ('scratch_bytes', '.scratch')]}


def preflight(root):
    root = workspace(root)
    limits = policy(root)
    used = usage(root)
    require(used['generated_bytes'] < limits['max_generated_bytes'],
            'Generated-output budget reached; run storage, review cleanup or archive final deliveries')
    require(used['scratch_bytes'] < limits['max_scratch_bytes'],
            'Scratch budget reached; inspect abandoned scratch with storage')
    require(shutil.disk_usage(root).free >= limits['min_free_bytes'], 'Insufficient free disk reserve')
    return {**limits, 'max_scratch_bytes': limits['max_scratch_bytes'] - used['scratch_bytes']}


@contextmanager
def scratch(root):
    root = workspace(root)
    limits = preflight(root)
    parent = inside(root, '.scratch', exists=False)
    parent.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='ysc-', dir=parent) as temporary:
        directory = Path(temporary)
        write_json(directory / 'owner.json', {'version': 1, 'kind': 'ysc-media-scratch',
                                             'pid': os.getpid(), 'created_at': time.time()})
        write_json(directory / 'budget.json', {'max_scratch_bytes': limits['max_scratch_bytes'],
                                               'min_free_bytes': limits['min_free_bytes']})
        yield directory


def alive(pid):
    require(type(pid) is int and 0 < pid <= 2147483647, 'Invalid scratch owner PID')
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def has_open_files(directory):
    """Fail closed if local open-file inspection is unavailable or uncertain."""
    executable = shutil.which('lsof')
    if executable is None:
        return True
    try:
        result = subprocess.run([executable, '-nP', '-Fn', '+D', str(directory)],
                                capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.TimeoutExpired):
        return True
    return result.returncode != 1 or bool(result.stderr.strip()) or bool(result.stdout.strip())


def file_record(root, path):
    info = path.stat()
    return {'path': str(path.relative_to(root)), 'bytes': info.st_size,
            'mtime_ns': info.st_mtime_ns, 'inode': info.st_ino, 'sha256': digest(path)}


def protected(root, run):
    if (run / 'video.mp4').exists():
        return True
    marker = inside(root, '.storage/kept/' + str(run.relative_to(root / 'runs')) + '.json', exists=False)
    return marker.exists()


def inventory(root, now=None):
    root = workspace(root)
    limits = policy(root)
    used = usage(root)
    now = time.time() if now is None else now
    cutoff = now - limits['older_than_days'] * 86400
    selected, retained, unknown = [], [], []
    runs = root / 'runs'
    if runs.exists():
        for episode in sorted(runs.iterdir()):
            if not episode.is_dir():
                continue
            identifier(episode.name)
            candidates = []
            for run in sorted(episode.iterdir()):
                if not run.is_dir():
                    continue
                identifier(run.name)
                report_path = run / 'run.json'
                failure = run / 'failure.json'
                if protected(root, run):
                    retained.append(str(run.relative_to(root)))
                elif report_path.exists():
                    report = read_json(report_path)
                    if report.get('mode') == 'build' and report.get('automated_checks') == 'PASS':
                        candidates.append((report_path.stat().st_mtime, run, report))
                    else:
                        retained.append(str(run.relative_to(root)))
                elif failure.exists() and (run / 'episode.json').exists():
                    candidates.append((failure.stat().st_mtime, run, None))
                else:
                    unknown.append(str(run.relative_to(root)))
            candidates.sort(key=lambda row: (row[0], str(row[1])), reverse=True)
            for index, (modified, run, report) in enumerate(candidates):
                if index < limits['keep_builds'] or modified >= cutoff:
                    retained.append(str(run.relative_to(root)))
                    continue
                outputs = report.get('outputs', {}) if report else None
                require(outputs is None or isinstance(outputs, dict), 'Invalid run output manifest')
                for path in tree(root, run):
                    relative = str(path.relative_to(run))
                    generated = relative.startswith('assets/') or path.name in {'video.html', 'silent.mp4', 'thumbnail.jpg'} or path.name.startswith(('scene-', 'preview'))
                    if not generated or (path.suffix in RECORD_SUFFIXES and not relative.startswith('assets/')):
                        continue
                    if outputs is not None:
                        if relative not in outputs:
                            continue
                        require(digest(path) == outputs[relative], 'Changed build output; cleanup refused')
                    selected.append(file_record(root, path))
    scratch_root = root / '.scratch'
    if scratch_root.exists():
        for directory in sorted(scratch_root.iterdir()):
            if not directory.is_dir() or not directory.name.startswith('ysc-'):
                unknown.append(str(directory.relative_to(root)))
                continue
            owner_path = directory / 'owner.json'
            if not owner_path.is_file():
                unknown.append(str(directory.relative_to(root)))
                continue
            owner = read_json(owner_path)
            if owner.get('kind') != 'ysc-media-scratch' or owner.get('version') != 1:
                unknown.append(str(directory.relative_to(root)))
                continue
            created = owner.get('created_at')
            require(type(created) in (int, float) and 0 < created <= now, 'Invalid scratch creation time')
            children = directory / 'capture-owner.json'
            active = alive(owner.get('pid')) or (children.exists() and alive(read_json(children).get('pid')))
            if active or created > now - 86400 or has_open_files(directory):
                retained.append(str(directory.relative_to(root)))
                continue
            selected.extend(file_record(root, path) for path in tree(root, directory))
    selected.sort(key=lambda item: item['path'])
    token = hashlib.sha256(json.dumps(selected, sort_keys=True).encode()).hexdigest()
    return {'policy': limits, **used, 'free_bytes': shutil.disk_usage(root).free,
            'plan_id': token, 'candidate_bytes': sum(row['bytes'] for row in selected),
            'candidates': selected, 'protected': retained, 'unrecognized': unknown,
            'writes': False, 'completed_renders_always_protected': True}


def keep(root, value, approved=False):
    require(approved, 'Protecting a run requires --approve-write')
    parts = Path(value).parts
    require(len(parts) == 2, 'Use EPISODE/RUN')
    for part in parts:
        identifier(part)
    with activity(root):
        root = workspace(root)
        run = inside(root, 'runs/' + value, exists=False)
        require(run.is_dir() and (run / 'run.json').is_file(), 'Select a completed build or render')
        target = inside(root, '.storage/kept/' + value + '.json', exists=False)
        target.parent.mkdir(parents=True, exist_ok=True)
        write_json(target, {'version': 1, 'run': value, 'protected': True})
    return {'protected': value}


def cleanup(root, plan_id, approved=False):
    require(approved, 'Cleanup requires --approve-write and the reviewed --plan-id')
    with activity(root):
        root = workspace(root)
        plan = inventory(root)
        require(plan_id == plan['plan_id'], 'Cleanup plan changed; inspect storage again')
        destination = inside(root, '.storage/cleanup-' + uuid.uuid4().hex + '.json', exists=False)
        destination.parent.mkdir(parents=True, exist_ok=True)
        write_json(destination, {'version': 1, 'plan_id': plan_id, 'planned': plan['candidates'],
                                 'created_at': time.time(), 'status': 'planned'})
        removed = []
        before = shutil.disk_usage(root).free
        try:
            for record in plan['candidates']:
                path = inside(root, record['path'])
                require(record == file_record(root, path), 'Output changed during cleanup; stopped')
                path.unlink()
                removed.append(record['path'])
        finally:
            write_json(destination.with_suffix('.result.json'), {'plan_id': plan_id, 'deleted': removed,
                       'completed': len(removed) == len(plan['candidates']), 'free_bytes_before': before,
                       'free_bytes_after': shutil.disk_usage(root).free})
        # Remove only empty directories left by selected scratch files; never remove run records.
        for directory in sorted({(root / r).parent for r in removed}, key=lambda p: len(p.parts), reverse=True):
            if directory.is_relative_to(root / '.scratch'):
                try:
                    directory.rmdir()
                except OSError as error:
                    if error.errno not in (errno.ENOTEMPTY, errno.ENOENT):
                        raise
        return {'deleted_files': len(removed), 'deleted_logical_bytes': plan['candidate_bytes'],
                'receipt': str(destination.relative_to(root)), 'writes': True}
