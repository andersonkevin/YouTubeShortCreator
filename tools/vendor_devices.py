"""Read-only conversion of the two pinned HyperFrames device models.

This accepts only the retained, uncompressed source binaries. It is not a
general GLTF importer and performs no download, execution or source write.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import struct

PINS = {
    'iphone': '20b926be3ab68ad773af8ef83949561f1f93bc22777688efd89bc38f0840614e',
    'macbook': '12749c742f3bf67d14650eb831ab6c02104fba59074034c8ed42ce2c5c37c02b',
}


def packet(path, name):
    path = Path(path)
    if name not in PINS or any(p.is_symlink() for p in [path, *path.parents]) or not path.is_file():
        raise ValueError('A regular pinned device model is required')
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != PINS[name]:
        raise ValueError('Pinned device model hash mismatch')
    if struct.unpack_from('<4sII', raw) != (b'glTF', 2, len(raw)):
        raise ValueError('Unexpected device container')
    size, kind = struct.unpack_from('<II', raw, 12)
    if kind != 0x4e4f534a:
        raise ValueError('Device JSON chunk required')
    doc = json.loads(raw[20:20 + size])
    end = 20 + size
    length, kind = struct.unpack_from('<II', raw, end)
    binary = raw[end + 8:]
    if kind != 0x004e4942 or length != len(binary) or doc['buffers'] != [{'byteLength': length}]:
        raise ValueError('One embedded device buffer required')
    if doc.get('animations') or doc.get('skins') or doc.get('extensionsRequired'):
        raise ValueError('Unsupported animated or compressed device')
    if any('uri' in item for key in ('buffers', 'images') for item in doc.get(key, [])):
        raise ValueError('Device resources must be embedded')
    for view in doc['bufferViews']:
        start = view.get('byteOffset', 0)
        if view['buffer'] != 0 or view.get('byteStride') or not 0 <= start < start + view['byteLength'] <= length:
            raise ValueError('Invalid pinned device buffer view')
    for accessor in doc['accessors']:
        components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}.get(accessor['type'])
        width = {5123: 2, 5126: 4}.get(accessor['componentType'])
        view = doc['bufferViews'][accessor['bufferView']]
        if not components or not width or accessor.get('sparse') or accessor.get('normalized'):
            raise ValueError('Unsupported device accessor')
        if accessor.get('byteOffset', 0) + accessor['count'] * components * width > view['byteLength']:
            raise ValueError('Device accessor exceeds its view')
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            if primitive.get('mode', 4) != 4 or primitive.get('extensions') or primitive.get('targets'):
                raise ValueError('Only uncompressed device triangles are supported')
            if not set(primitive['attributes']) <= {'POSITION', 'NORMAL', 'TEXCOORD_0'}:
                raise ValueError('Unexpected device vertex attribute')
    if any(node.get('children') or 'matrix' in node for node in doc['nodes']):
        raise ValueError('Pinned device nodes must retain their flat TRS structure')
    return {'name': name, 'sha256': PINS[name], 'document': doc,
            'binary': base64.b64encode(binary).decode('ascii')}


def bundle(path, name):
    data = json.dumps(packet(path, name), separators=(',', ':'))
    return ('/* HyperFrames retained device model; see production-device-provenance.json. */\n'
            "window.ShortCreatorDevicePackets=window.ShortCreatorDevicePackets||{};\n"
            f'window.ShortCreatorDevicePackets.{name}=Object.freeze({data});\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('name', choices=PINS)
    parser.add_argument('path', type=Path)
    args = parser.parse_args()
    print(bundle(args.path, args.name), end='')
