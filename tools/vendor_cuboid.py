"""Read-only extraction of pinned HyperFrames cuboid motion and geometry."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import textwrap

PINS = {
    'cuboid-carousel.html': '2d992fc1cb5a8640f9139c5789be53ffa6c4393fc44e17792dfc9bf24bb19a5c',
    'assets/cuboid-motion.js': '84c56fef029f5b8cd0886f56fafd7152fcc4011f75f7c4bdd192961e1afb6577',
    'assets/addons/utils/BufferGeometryUtils.js': '38a81e5b0f5638687fbc1ff7e4e9a45d8ab8cd59b0a70a3b423bbb5ee326bf72',
    'assets/addons/environments/RoomEnvironment.js': 'f89d80912785b14e5e9979162e5ea8ed7e11ecf2bf51e5a8e845c535bff8ff59',
}


def between(source, start, end):
    if source.count(start) != 1 or source.count(end) != 1:
        raise ValueError('Pinned source boundary changed')
    return source.split(start)[1].split(end)[0]


def bundle(source):
    source = Path(source)
    if source.is_symlink() or not source.is_dir():
        raise ValueError('A regular pinned source directory is required')
    texts = {}
    for name, expected in PINS.items():
        path = source / name
        if any(p.is_symlink() for p in [path, *path.parents] if p != source.parent):
            raise ValueError('Symlinked source is not accepted')
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError('Pinned cuboid source mismatch: ' + name)
        texts[name] = path.read_text()
    html = texts['cuboid-carousel.html']
    defaults = {r['id']: r['default'] for r in json.loads(between(html, "data-composition-variables='", "'\n>"))}
    raw = texts['assets/cuboid-motion.js'].split('export const MOTION = ', 1)[1].strip().removesuffix(';')
    raw = re.sub(r'(?m)^(\s*)([A-Za-z_][A-Za-z_0-9]*)\s*:', r'\1"\2":', raw)
    raw = re.sub(r',\s*([}\]])', r'\1', raw)
    motion = json.loads(raw)
    if motion['fps'] != 30 or motion['endFrame'] != 200 or len(motion['tiles']) != 18 or len(motion['camera']) != 201:
        raise ValueError('Unexpected saved motion shape')
    def finite(value):
        if isinstance(value, dict):
            for item in value.values(): finite(item)
        elif isinstance(value, list):
            for item in value: finite(item)
        elif isinstance(value, (int, float)) and not math.isfinite(value):
            raise ValueError('Nonfinite saved motion')
    finite(motion)
    data = ('/* HyperFrames cuboid motion, Apache-2.0; saved Blender channels. */\n'
            "(() => { 'use strict'; const value=" + json.dumps(motion, separators=(',', ':')) + ';\n'
            'const freeze=x=>{if(x&&typeof x==="object"){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};\n'
            'window.ShortCreatorCuboidData=freeze(value);})();\n')
    merge = 'function mergeVertices' + between(texts['assets/addons/utils/BufferGeometryUtils.js'],
        'function mergeVertices', '/**\n * Returns a new indexed geometry based on `TrianglesDrawMode`')
    geometry = textwrap.dedent('      function roundedRectShape' + between(html,
        '      function roundedRectShape', '      /* ---- face texture'))
    motion_code = textwrap.dedent('      const basis = ' + between(html,
        '      const basis = ', '      window.__cuboidMotion = '))
    motion_code = motion_code.replace('  renderer.toneMappingExposure = 1;\n  renderer.render(scene, camera);', '')
    if 'renderer.' in motion_code:
        raise ValueError('Unexpected rendering side effect')
    constants = {key: defaults[key] for key in ['cameraFov', 'cameraX', 'cameraY', 'cameraZ',
        'cameraTargetFov', 'cameraTargetX', 'cameraTargetY', 'cameraTargetZ', 'cameraSettleFrame',
        'heroFillIntensity', 'heroExitX', 'heroExitY', 'heroExitZ', 'heroScale']}
    body = '''/* HyperFrames cuboid composition, Apache-2.0. mergeVertices: Three.js MIT. */
(() => {
  'use strict';
  const metadata=DEFAULTS;
  MERGE
  function geometry(THREE) {
    if(THREE?.REVISION!=='185')throw new Error('Pinned cuboid runtime required');
    const WIDTH=1.7,HEIGHT=2.4,DEPTH=.14,CORNER_R=.105,BEVEL_SIZE=.03,BEVEL_THICK=.04,SMOOTH=32;
    GEOMETRY
    return buildCardGeometry();
  }
  function create(THREE,count=8,hero=4,handheld=1) {
    if(THREE?.REVISION!=='185'||!Number.isInteger(count)||count<1||count>12||
      !Number.isInteger(hero)||hero<1||hero>count||![0,1].includes(handheld))throw new Error('Invalid cuboid motion inputs');
    const MOTION=window.ShortCreatorCuboidData;
    if(!MOTION||MOTION.fps!==30||MOTION.endFrame!==200)throw new Error('Pinned cuboid motion unavailable');
    const V={...metadata,handheldStrength:handheld};
    const num=(v,d,lo,hi)=>Number.isFinite(Number(v))?Math.min(hi,Math.max(lo,Number(v))):d;
    const clamp01=x=>Math.max(0,Math.min(1,x)),smooth01=x=>x*x*(3-2*x);
    const COUNT=count,HERO=hero-1,ITEMS=Array.from({length:count}),SPACING=1.73,HERO_SCALE=1,DUR=200/30;
    const CAMERA_SETTLE=70,FOV=V.cameraFov,CAM_X=V.cameraX,CAM_Y=V.cameraY,CAM_Z=V.cameraZ;
    const TARGET_FOV=V.cameraTargetFov,TARGET_X=V.cameraTargetX,TARGET_Y=V.cameraTargetY,TARGET_Z=V.cameraTargetZ;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(FOV,16/9,.1,200);
    const capMats=ITEMS.map((_,item)=>({item})),heroMat={item:HERO,emissiveIntensity:0};
    const cuboids=MOTION.tiles.map(()=>{const mesh=new THREE.Object3D();mesh.material=[];return mesh;});
    MOTION_CODE
    function sample(seconds) {
      if(!Number.isFinite(seconds))throw new Error('Finite cuboid time required');
      renderAt(seconds);
      return {seconds:S.t,frame:actualPose.frame,camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov},
        root:motionRoot.matrix.toArray(),heroSlot,heroFill:heroMat.emissiveIntensity,
        tiles:cuboids.map(mesh=>({position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),
          visible:mesh.visible,item:mesh.material[0].item,heroMaterial:mesh.material[0]===heroMat}))};
    }
    return Object.freeze({sample,channelAt,heroSlotCorrection});
  }
  function clock(time,onsets) {
    if(!Number.isFinite(time)||!Array.isArray(onsets)||onsets.length!==2||!onsets.every(Number.isFinite))
      throw new Error('Two finite cuboid anchors required');
    const frame=Math.floor(time*30+1e-7),start=Math.ceil(onsets[0]*30),depart=Math.ceil(onsets[1]*30);
    if(depart-start<150)throw new Error('Cuboid departure requires five seconds before it');
    const elapsed=Math.max(0,frame-start),source=frame<depart?150*Math.min(1,elapsed/(depart-start)):Math.min(200,150+frame-depart);
    return {frame:source,seconds:source/30,entry:Math.min(1,elapsed/24),visible:frame>=start};
  }
  window.ShortCreatorCuboidMotion=Object.freeze({create,geometry,clock,metadata:Object.freeze(metadata)});
})();
'''
    body = body.replace('DEFAULTS', json.dumps(constants)).replace('MERGE', merge).replace('GEOMETRY', geometry).replace('MOTION_CODE', motion_code)
    return {'production-cuboid-data.js': data, 'production-cuboid-motion.js': body}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('module', choices=['production-cuboid-data.js', 'production-cuboid-motion.js'])
    args = parser.parse_args()
    print(bundle(args.source)[args.module], end='')
