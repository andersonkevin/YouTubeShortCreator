"""Build pinned source renderers without executing upstream code or installing packages."""
import base64
import hashlib
import io
import json
from pathlib import Path
import re

from PIL import Image

PINS = {
    'registry/blocks/glass-shard-title/assets/glass-main.mjs': '221a49d92d15372aa446a1b7f327985d1f61066f778766689d18733831c3dd34',
    'registry/blocks/glass-shard-title/assets/glass-main.js': '6d411a955eaee6a0fd26a77e84411e1dcb2a01c7b87bbcb3e87354d652f09a52',
    'registry/blocks/frost-sequence-camera-orbit/frost-sequence-camera-orbit.html': '7b895065f177ba0d3e3837712724b5d4eaa9cdf775e2bc6309478b50fed84694',
    'registry/blocks/frost-sequence-camera-orbit/assets/frost.js': 'd9585488efbc91f93bd7baed463b5f07a25f688c1d89132cdd9ac0311afb0801',
    'registry/blocks/frost-sequence-camera-orbit/assets/gsap-3.14.2.min.js': '7b2c91e3bff9022bef50054413b365a945c93f87285dcf8bdfb92076c4c56304',
}


def read_source(root, name):
    root = Path(root).resolve()
    path = root / name
    if name not in PINS or path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(root):
        raise ValueError('Expected a retained, regular source file')
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != PINS[name]:
        raise ValueError('Upstream source differs from the reviewed revision')
    return raw.decode('utf-8')


def replace_once(source, before, after):
    if source.count(before) != 1:
        raise ValueError('Source transformation no longer matches exactly once: ' + before[:80])
    return source.replace(before, after)


def glass(root):
    source = read_source(root, 'registry/blocks/glass-shard-title/assets/glass-main.mjs')
    bundle = read_source(root, 'registry/blocks/glass-shard-title/assets/glass-main.js')
    begin = bundle.index('Tg=class extends _u')
    hdr = bundle[begin:bundle.index(';(async()=>', begin)].replace('Tg=', 'const HDRLoader=')
    aliases = 'const _u=THREE.DataTextureLoader,Qt=THREE.HalfFloatType,Vt=THREE.FloatType,ba=THREE.DataUtils,Br=THREE.LinearSRGBColorSpace,St=THREE.LinearFilter;'
    source = replace_once(source, 'import * as THREE from "three";\nimport { HDRLoader } from "three/addons/loaders/HDRLoader.js";',
        'const THREE=window.ShortCreatorThree;\n' + aliases + '\n' + hdr + ';')
    source = replace_once(source, 'const hdrTex = await new HDRLoader().loadAsync(document.getElementById("gst-hdr").href);',
        "const hdrBytes=Uint8Array.from(atob(SC.resources.hdr.split(',')[1]),c=>c.charCodeAt(0));\nconst hdrData=new HDRLoader().parse(hdrBytes.buffer);\nconst hdrTex=new THREE.DataTexture(hdrData.data,hdrData.width,hdrData.height,THREE.RGBAFormat,hdrData.type);\nhdrTex.colorSpace=THREE.LinearSRGBColorSpace;hdrTex.flipY=true;hdrTex.needsUpdate=true;")
    source = source.replace('1920 / 1080', 'SC.width / SC.height')
    source = replace_once(source, 'renderer.setSize(1920, 1080, false);', 'renderer.setSize(SC.width, SC.height, false);')
    source = source.replace('0x0a0a0f', 'SC.colors.background').replace('0xccddff', 'SC.colors.secondary')
    source = source.replace('"Geist", ui-sans-serif, sans-serif', '"BrandSans"')
    start = source.index('try {\n  await Promise.all([')
    end = source.index('/* ---- Headline raster', start)
    source = source[:start] + '''const loaded = await document.fonts.load('600 100px BrandSans');
if (!loaded.length || loaded.some(font => font.status !== 'loaded')) throw new Error('Approved font did not load');
await document.fonts.ready;
''' + source[end:]
    source = replace_once(source, 'if (w0 > maxW) fpx = Math.floor((fpx * maxW) / w0);',
        "if(w0 > maxW) throw new Error('Glass headline exceeds its fixed readable slot');")
    source = source.replace('"#f4f4f8"', '"#ffffff"')
    source = replace_once(source, 'paneGroup.rotation.x = 0.02 * Math.sin(t * 0.5 + 0.7);', 'paneGroup.rotation.x = 0;')
    source = replace_once(source, 'paneGroup.rotation.y = 0.045 * Math.sin(t * 0.33 + 2.1);', 'paneGroup.rotation.y = 0;')
    source = replace_once(source, 'paneGroup.position.z = PANE_Z + 0.02 * Math.sin(t * 0.5);', 'paneGroup.position.z = PANE_Z;')
    source = replace_once(source, 'scene.environmentRotation.y = 0.6 + t * 0.04;', 'scene.environmentRotation.y = 0.6;')
    source = replace_once(source, 'if (seated > 0.001) {', 'if (false) { // Native holds remain still.')
    footer = '''
window.__source = {
  renderAt(seconds) {
    st.time=seconds;st.tin=Math.max(0,Math.min(1,(seconds-.12)/2.3));
    st.tout=Math.max(0,Math.min(1,(seconds-6.25)/2.4));renderScene();
  },
  canvas, dispose:gstDispose,
  inspect:()=>({seconds:st.time,shards:shards.length,font:'BrandSans',weight:600,
    fontPixels:G.fontPx*SC.width/TEXW,geometries:renderer.info.memory.geometries,
    textures:renderer.info.memory.textures,headline:G.vars.headline})
};
'''
    return '/* Adapted HyperFrames Glass Shard (Apache-2.0), Three HDRLoader (MIT). */\nwindow.__sourceReady=(async()=>{\nconst SC=window.__sourceConfig;\nawait window.__sourceFontsReady;\ndocument.getElementById("gst-hdr").href=SC.resources.hdr;\ndocument.getElementById("gst-matcap").href=SC.resources.matcap;\n' + source + footer + '\n})();\n'


def frost(root):
    source = read_source(root, 'registry/blocks/frost-sequence-camera-orbit/assets/frost.js')
    source = replace_once(source, 'a2=e=>wde+e',
        'a2=e=>{const value=window.__sourceConfig.resources[e];if(!value)throw Error("Unknown source texture: "+e);return value}')
    # Temporal AA depends on which preceding frames were drawn. Offline capture
    # uses four-sample scene rasterization with no temporal history.
    source = replace_once(source, 'le.post=structuredClone(Mx.post),le.post.pixelRatioCap=',
        'le.post=structuredClone(Mx.post),le.post.aaMode="none",le.post.pixelRatioCap=')
    source = replace_once(source, 'fhe(e.scene,e.camera,{type:Dt,samples:0})',
        'fhe(e.scene,e.camera,{type:Dt,samples:4})')
    # This native renderer has no persistent cache, preview flags or URL-selected profiles.
    source = source.replace('new URLSearchParams(location.search)', 'new URLSearchParams("fresh")')
    return source


def frost_template(root):
    source = read_source(root, 'registry/blocks/frost-sequence-camera-orbit/frost-sequence-camera-orbit.html')
    source = source.replace('src="assets/gsap-3.14.2.min.js"', 'src="assets/production-source-gsap.js"')
    source = source.replace('src="assets/frost.js"', 'src="assets/production-frost-runtime.js"')
    source = replace_once(source, 'const W = 1920,\n          H = 1080;', 'const W = window.__sourceConfig.width, H = window.__sourceConfig.height;')
    source = replace_once(source, 'logoUrl: str("logoUrl", 200) || defaults.logoUrl,', 'logoUrl: window.__sourceConfig.wordSvg,')
    source = replace_once(source, 'fontUrl: (window.__frostAssetBase || "assets/") + "fonts/Geist-Bold.ttf",', 'fontUrl: window.__sourceConfig.displayFont,')
    source = source.replace('width: 1920px;', 'width: 100%;').replace('height: 1080px;', 'height: 100%;')
    source = source.replace('background: #030303;', 'background: transparent;')
    source = replace_once(source, 'const base = camera.position.clone(),',
        'const fit=Math.max(1,(16/9)/(W/H));camera.position.multiplyScalar(fit);\n          const base = camera.position.clone(),')
    source = replace_once(source, '<head>', '<head>\n<!--SOURCE_BOOT-->')
    source = replace_once(source, '</body>', '''<script>
if(!window.__frostReady)throw new Error('Frost requires a supported local WebGPU adapter');
window.__sourceReady=window.__frostReady.then(()=>{
  const stage=document.getElementById('frost-root').shadowRoot.querySelector('#frost-stage');
  window.__source={canvas:stage.querySelector('canvas'),
    async renderAt(t){window.__frost.renderAt(t);await window.__frost.waitForGpu();
      if(window.__frostRuntimeError)throw new Error(window.__frostRuntimeError);},
    dispose:()=>window.__frostInstance.dispose(),
    inspect:()=>({seconds:Number(stage.dataset.time),
      pose:window.__logoRig.sample(Number(stage.dataset.time)),
      font:'BrandSans',weight:800,cache:false,profile:'studio'})};
});
</script></body>''')
    return source


def image_packet(path, expected):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        raise ValueError('Source texture hash mismatch')
    with Image.open(path) as image:
        image.load()
        output = io.BytesIO()
        image.save(output, format='WEBP', lossless=True, method=6, exact=True)
        encoded = output.getvalue()
        with Image.open(io.BytesIO(encoded)) as decoded:
            if image.convert('RGBA').tobytes() != decoded.convert('RGBA').tobytes():
                raise ValueError('Texture pixels changed during lossless packaging')
    return 'data:image/webp;base64,' + base64.b64encode(encoded).decode('ascii')


def frost_files(root):
    files = {}
    def external(match):
        name = 'production-frost-scene-' + str(len(files) + 1) + '.js'
        files[name] = match.group(1) + '\n'
        return '<script src="assets/' + name + '"></script>'
    html = re.sub(r'<script>([\s\S]*?)</script>', external, frost_template(root))
    files['production-source-templates.js'] = ('window.ShortCreatorSourceTemplates=Object.freeze(' +
        json.dumps({'frost-orbit': html}, ensure_ascii=True).replace('<', '\\u003c') + ');\n')
    return files


def template_script(root):
    return frost_files(root)['production-source-templates.js']


def build(root, textures, dependency):
    """Return reproducible output bytes; caller owns the explicit no-overwrite write."""
    root, textures, dependency = map(Path, (root, textures, dependency))
    upstream = root / 'registry/blocks/frost-sequence-camera-orbit/assets'
    files = {'production-shard-runtime.js': glass(root), 'production-frost-runtime.js': frost(root),
             'production-source-templates.js': template_script(root),
             'production-source-gsap.js': read_source(root, 'registry/blocks/frost-sequence-camera-orbit/assets/gsap-3.14.2.min.js')}
    files.update(frost_files(root))
    d3 = dependency / 'd3-delaunay.min.js'
    if d3.is_symlink() or hashlib.sha256(d3.read_bytes()).hexdigest() != 'efc726aa8aea0897f6dda19874709d09fd791781208ed5847ef1fd36f9886b18':
        raise ValueError('Pinned D3 source differs')
    files['production-source-delaunay.js'] = d3.read_text()
    resources = [
        ('ice', 'textures/ice-inclusions-generated.png', textures / 'frost-sequence-camera-orbit/ice-inclusions-generated.png', '4bea3a8ab90c952736ff78fcea4b57ec96a881f26c548c6baeea0d00d5174f33'),
        ('atlas', 'shards-atlas.png', textures / 'frost-sequence-camera-orbit/shards-atlas.png', '122961c82d240e47d643af9a3ccf340cbede742169e8c5de495904ae95439760'),
        ('matcap', 'matcap', textures / 'glass-shard-title/matcap-1.png', '8a4ba0deaf2bafb4ffe60d5685850b6b9174e58ce6cfd29bf026e060812961a0'),
        ('noise', 'textures/bluenoise64.png', upstream / 'textures/bluenoise64.png', 'cd061e31f2ac7cc580c3819e96b9f567bf309939e699fe162860cf58ca610417')]
    manifest = {'source_pins': PINS, 'resources': [], 'qualification': 'pending cumulative engine validation',
                'adaptations': ['Native four-format canvas and cue clock', 'Approved fonts, explicit text and brand colors',
                    'No runtime downloads, persistent cache or demo identity', 'Lossless WebP packaging: exact decoded RGBA verification',
                    'Frost first shape is an explicit approved-font word, not the upstream logo',
                    'Temporal antialiasing replaced with four-sample spatial antialiasing for exact reverse-seek pixels',
                    'Fixed local external scripts preserve the native CSP; payload loaders reject all unlisted bytes']}
    for name, key, path, digest in resources:
        packet = image_packet(path, digest)
        files['production-source-' + name + '.js'] = ('window.ShortCreatorSourceTextures??={};window.ShortCreatorSourceTextures[' +
                                                     json.dumps(key) + ']=' + json.dumps(packet) + ';\n')
        manifest['resources'].append({'key': key, 'source_sha256': digest, 'encoding': 'lossless WebP, identical RGBA pixels',
                                     'license_evidence': 'HyperFrames repository Apache-2.0; no item-specific creator declaration'})
    hdr = root / 'registry/blocks/glass-shard-title/assets/ferndale_studio_01_1k.hdr'
    expected = 'e76abcf0e02675ec3ec49a608e94742f1e9cb47069f99a31cc95233d29ca2745'
    if hdr.is_symlink() or hashlib.sha256(hdr.read_bytes()).hexdigest() != expected:
        raise ValueError('Pinned HDR differs')
    packet = 'data:application/octet-stream;base64,' + base64.b64encode(hdr.read_bytes()).decode('ascii')
    files['production-source-hdr.js'] = 'window.ShortCreatorSourceTextures??={};window.ShortCreatorSourceTextures.hdr=' + json.dumps(packet) + ';\n'
    manifest['resources'].append({'key': 'hdr', 'source_sha256': expected, 'encoding': 'exact original HDR',
                                 'license_evidence': 'HyperFrames repository; item-specific evidence under review'})
    notices = ['HyperFrames source compositions: Apache-2.0; see docs/licenses/hyperframes-apache-2.0.txt.']
    for name in ('Three-LICENSE.txt', 'ThreeMeshBVH-LICENSE.txt', 'OpentypeJS-LICENSE.txt', 'Clipper-LICENSE.txt', 'GSAP-NOTICE.txt'):
        notices.append(name + '\n' + (upstream / name).read_text())
    notices.append('D3 Delaunay 6.0.4\n' + (dependency / 'd3-delaunay-LICENSE.txt').read_text())
    for name in ('delaunator-LICENSE.txt', 'robust-predicates-LICENSE.txt'):
        notices.append(name + '\n' + (dependency / name).read_text())
    files['production-source-notices.txt'] = '\n\n'.join(notices)
    manifest['outputs'] = {name: hashlib.sha256(value.encode()).hexdigest() for name, value in files.items()}
    files['production-source-provenance.json'] = json.dumps(manifest, indent=2) + '\n'
    if any(len(value.encode()) > 4_000_000 for value in files.values()):
        raise ValueError('Source package exceeds the existing per-file bound')
    return files
