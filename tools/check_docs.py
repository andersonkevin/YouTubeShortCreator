#!/usr/bin/env python3
"""Read-only checks for local public documentation; no network requests."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import struct
import sys
from urllib.parse import unquote, urlsplit

HOME = Path(__file__).resolve().parents[1]


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag in ('a', 'img'):
            key = 'src' if tag == 'img' else 'href'
            if key in values:
                self.items.append((values[key], tag == 'img'))
            if tag == 'img' and not values.get('alt', '').strip():
                self.errors.append('Image needs descriptive alt text')


def anchors(content):
    result, counts = set(), {}
    for title in re.findall(r'^#{1,6}\s+(.+?)\s*#*$', content, re.MULTILINE):
        title = re.sub(r'\[([^]]+)\]\([^)]+\)', r'\1', title)
        slug = re.sub(r'[^\w\- ]', '', title.lower()).replace(' ', '-')
        count = counts.get(slug, 0)
        counts[slug] = count + 1
        result.add(slug if not count else f'{slug}-{count}')
    return result


def check(root=HOME):
    root = root.resolve()
    documents = sorted([*root.glob('*.md'), *root.joinpath('docs').rglob('*.md'), *root.joinpath('examples').rglob('*.md')])
    errors, references, image_refs = [], 0, set()
    for document in documents:
        name = str(document.relative_to(root))
        content = document.read_text(encoding='utf-8')
        if not re.match(r'^# [^\n]+\n', content):
            errors.append(f'{name}: missing document title')
        if len(re.findall(r'^```', content, re.MULTILINE)) % 2:
            errors.append(f'{name}: unbalanced fenced code blocks')
        for payload in re.findall(r'^```json\s*\n(.*?)^```', content, re.MULTILINE | re.DOTALL):
            try:
                json.loads(payload)
            except ValueError as error:
                errors.append(f'{name}: invalid JSON example: {error}')
        prose = re.sub(r'^```[^\n]*\n.*?^```\s*$', '', content, flags=re.MULTILINE | re.DOTALL)
        parser = Links()
        parser.feed(prose)
        errors.extend(f'{name}: {message}' for message in parser.errors)
        links = list(parser.items)
        for match in re.finditer(r'(!?)\[([^\]]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)', prose):
            is_image = bool(match.group(1))
            if is_image and not match.group(2).strip():
                errors.append(f'{name}: image needs descriptive alt text')
            links.append((match.group(3), is_image))
        for target, is_image in links:
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc:
                if parsed.scheme not in ('http', 'https', 'mailto'):
                    errors.append(f'{name}: unsupported link scheme: {target}')
                if is_image:
                    errors.append(f'{name}: documentation images must be local: {target}')
                continue
            path = (document.parent / unquote(parsed.path)).resolve() if parsed.path else document
            if not path.is_relative_to(root):
                errors.append(f'{name}: link escapes repository: {target}')
                continue
            references += 1
            if not path.exists():
                errors.append(f'{name}: missing local target: {target}')
                continue
            if parsed.fragment and path.suffix == '.md' and unquote(parsed.fragment) not in anchors(path.read_text()):
                errors.append(f'{name}: missing heading anchor: {target}')
            if is_image:
                image_refs.add(str(path.relative_to(root)))

    manifest = root / 'docs/images/manifest.json'
    assets = []
    if manifest.is_file():
        try:
            assets = json.loads(manifest.read_text())['assets']
            seen = set()
            for asset in assets:
                name = asset['path']
                relative = Path(name)
                if relative.is_absolute() or '..' in relative.parts or relative.parts[:2] != ('docs', 'images'):
                    raise ValueError('Image manifest path must stay in docs/images')
                path = (root / name).resolve()
                if not path.is_relative_to(root) or name in seen:
                    raise ValueError('Duplicate or escaping image manifest entry')
                seen.add(name)
                data = path.read_bytes()
                if data[:8] != b'\x89PNG\r\n\x1a\n' or len(data) < 24:
                    raise ValueError(f'Invalid PNG: {name}')
                if hashlib.sha256(data).hexdigest() != asset['sha256']:
                    errors.append(f'{name}: image hash mismatch')
                if struct.unpack('>II', data[16:24]) != (asset['width'], asset['height']):
                    errors.append(f'{name}: image dimensions differ from manifest')
            errors.extend(f'{name}: embedded image not in provenance manifest' for name in sorted(image_refs - seen))
        except (OSError, ValueError, KeyError, TypeError) as error:
            errors.append(f'Image manifest: {error}')
    else:
        errors.append('Missing image provenance manifest')

    cli = root / 'docs/CLI.md'
    if cli.is_file():
        # Import only when explicitly invoked; no runtime command or writer runs here.
        sys.path.insert(0, str(root))
        import ysc
        parser = ysc.parser()
        import argparse
        commands = next(action.choices for action in parser._actions if isinstance(action, argparse._SubParsersAction))
        copy = cli.read_text()
        for command in commands:
            if not re.search(r'`' + re.escape(command) + r'(?:`|[ A-Z])', copy):
                errors.append(f'CLI reference missing command: {command}')
    else:
        errors.append('Missing CLI reference')
    return {'status': 'FAIL' if errors else 'PASS', 'documents': len(documents),
            'local_references': references, 'manifest_images': len(assets), 'errors': errors,
            'network_requests': 0}


if __name__ == '__main__':
    result = check()
    print(json.dumps(result, indent=2))
    raise SystemExit(1 if result['errors'] else 0)
