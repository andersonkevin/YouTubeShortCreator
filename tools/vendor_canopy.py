#!/usr/bin/env python3
"""Print reviewed canopy geometry and motion from one hash-pinned local source.

No downloads, source execution or writes. Rendering, typography, image selection
and final engine integration are deliberately outside this pure preparation step.
"""
import argparse
import hashlib
from pathlib import Path

SOURCE_SHA256 = 'dd24f698d1b62ab73a85cf25bd24006b3f5f386f43f045f3a90a68629204af3a'


def section(source, start, end):
    if source.count(start) != 1 or source.count(end) != 1:
        raise ValueError('Unexpected pinned canopy boundary')
    return source.split(start, 1)[1].split(end, 1)[0]


def bundle(path):
    if path.is_symlink() or not path.is_file():
        raise ValueError('Canopy source must be a regular file')
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise ValueError('Canopy source hash mismatch')
    source = raw.decode('utf-8')
    layout = 'function mulberry32(seed) {' + section(
        source, '        function mulberry32(seed) {', '        /* Masters tweened by the timeline;')
    layout = layout.replace('window.__cptBatches = [batch1, batch2];', 'const batches = [batch1, batch2];')
    layout = layout.replace('window.__cptDust = { home: dustHome, seeds: dustSeeds };', '')
    dimensions = 'const DIMS = {' + section(source, '      const DIMS = {', '      const leaves = [];')
    lift = section(source, '          const dims = DIMS[spec.kind];', '          const group = new THREE.Group();')
    motion = 'function motionClock(t) {' + section(source, '      function motionClock(t) {', '      let disposed = false;')
    render = 'function renderAt(t) {' + section(source, '      function renderAt(t) {', '      function onSeek(event) {')
    render = render.replace('        if (disposed) return;\n', '').replace('        composer.render();', '')
    geometry = 'function leafGeometry(width, length) {' + section(source, '      function leafGeometry(width, length) {', '      const DIMS = {')
    hashing = 'function hash2(x, y, seed) {' + section(source, '      function hash2(x, y, seed) {', '      document.getElementById("cpt-bg").style.background = BG;')
    leaf_width = 'function leafWidth(kind, y) {' + section(source, '      function leafWidth(kind, y) {', '      function makeLeafTexture(kind, seed) {')
    pixels = 'for (let py = 0; py < h; py++) {' + section(source, '        for (let py = 0; py < h; py++) {', '        colorCtx.putImageData(colorImage, 0, 0);')
    # One private factory owns each layout and its scratch objects. Nothing is
    # registered on the page or scheduled by this prepared module.
    prefix = '''/* HyperFrames canopy-part-title, Apache-2.0. Source-derived preparation:
   two seeded sweeps, retained-leaf handoffs, geometry and focus/camera state.
   See production-canopy-provenance.json. Not a selectable native scene yet. */
(() => {
  'use strict';
  const source=''' + repr(SOURCE_SHA256) + ''';
  const kinds=Object.freeze(['monstera','alocasia','lance','calathea','fern']);
  function create(THREE,retainedBreeze=1,aspect=16/9) {
    if(THREE?.REVISION!=='185')throw new Error('Pinned canopy runtime required');
    if(!Number.isFinite(retainedBreeze)||retainedBreeze<0||retainedBreeze>2)
      throw new Error('Bounded retained-leaf motion required');
    if(!Number.isFinite(aspect)||aspect<.5||aspect>4)throw new Error('Bounded canopy aspect required');
    const LEAF_COUNT=170,STAY_COUNT=5,DUR=12,WIND_SPEED=1.06,WIND_STRENGTH=2.5;
    const CAM_DIST=13.6,RETAINED_BREEZE=retainedBreeze,DJ=.5;
    const windows=Object.freeze({d1:3.2,s2:5.2,d2:3.2});
    const clamp=THREE.MathUtils.clamp,degToRad=THREE.MathUtils.degToRad;
    const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
    const fov=aspect>=16/9?41:2*Math.atan(Math.tan(41*Math.PI/360)*(16/9)/aspect)*180/Math.PI;
    const camera=new THREE.PerspectiveCamera(fov,aspect,.1,40);
    const cameraTarget=new THREE.Vector3(0,0,-1.5),cameraOffset=new THREE.Vector3();
    const cameraOrbit=new THREE.Euler(0,0,0,'YXZ');
'''
    setup = '''
    dustHome=Float32Array.from(dustHome);dustSeeds=Float32Array.from(dustSeeds);
    const leaves=batches.flat().map(spec=>{
      const dims=DIMS[spec.kind];
      if(aspect>16/9){
        const reach=Math.hypot(dims[0]*spec.widthMul*.5,dims[1]*spec.lengthMul)*spec.scale;
        const edge=Math.tan(fov*Math.PI/360)*(CAM_DIST-spec.z)*aspect+reach+2;
        spec.xStart=Math.min(spec.xStart,-edge);spec.xEnd=Math.max(spec.xEnd,edge);
      }
''' + lift + '''
      const group=new THREE.Object3D();group.visible=false;
      group.position.set(spec.xStart,spec.y0,spec.z);
      group.scale.setScalar(spec.scale);group.rotation.set(spec.tiltX,spec.tiltY,spec.rotation);
      return {group,spec};
    });
    const state={sw1:0,sw2:0};
    const plane=()=>({uniforms:{uIn:{value:0},uOut:{value:0},uLift:{value:0}}});
    const plane1=plane(),plane2=plane();
    const bokehPass={uniforms:{aperture:{value:0},maxblur:{value:0}}};
    const shaderMaterials=[{userData:{timeUniform:{value:0}}}];
    const dustPositions=new Float32Array(dustHome),dust=new THREE.Object3D();
    const dustGeo={attributes:{position:{needsUpdate:false}}};
'''
    tail = '''
    function sample(seconds) {
      if(!Number.isFinite(seconds))throw new Error('Finite canopy time required');
      const t=clamp(seconds,0,12);
      state.sw1=clamp((t-.4)/windows.d1,0,1);
      state.sw2=clamp((t-windows.s2)/windows.d2,0,1);
      renderAt(t);
      return {seconds:t,sweep:state.sw1,lift:state.sw2,
        camera:{position:camera.position.toArray(),rotation:camera.rotation.toArray().slice(0,3),fov:camera.fov},
        leaves:leaves.map(({group,spec})=>({kind:spec.kind,batch:spec.batch,stayer:spec.stayer,
          visible:group.visible,position:group.visible?group.position.toArray():null,
          rotation:group.visible?group.rotation.toArray().slice(0,3):null,scale:spec.scale})),
        wipes:[plane1,plane2].map(p=>Object.fromEntries(Object.entries(p.uniforms).map(([k,u])=>[k,u.value]))),
        aperture:bokehPass.uniforms.aperture.value,maxblur:bokehPass.uniforms.maxblur.value,
        windTime:shaderMaterials[0].userData.timeUniform.value,
        dust:{positions:Array.from(dustPositions),rotation:dust.rotation.toArray().slice(0,3)}};
    }
    return Object.freeze({sample,windows,batches,dustHome,dustSeeds});
  }
  function geometry(THREE,width,length) {
    if(THREE?.REVISION!=='185'||![width,length].every(v=>Number.isFinite(v)&&v>0&&v<=8))
      throw new Error('Bounded canopy leaf geometry required');
    const geometryCache=new Map();
''' + geometry + '''
    return leafGeometry(width,length);
  }
  function textureData(kind,seed,palette) {
    if(!kinds.includes(kind)||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)
      throw new Error('Known leaf species and bounded integer seed required');
    if(!Array.isArray(palette)||palette.length!==3||!palette.every(row=>Array.isArray(row)&&row.length===3&&
        row.every(n=>Number.isFinite(n)&&n>=0&&n<=255)))throw new Error('Three approved RGB tones required');
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
    const w=384,h=768,p=palette;
    const colorImage={data:new Uint8ClampedArray(w*h*4)},bumpImage={data:new Uint8ClampedArray(w*h*4)};
''' + hashing + leaf_width + pixels + '''
    return {width:w,height:h,color:colorImage.data,bump:bumpImage.data};
  }
  window.ShortCreatorCanopyMotion=Object.freeze({source,kinds,create,geometry,textureData});
})();
'''
    return (prefix + layout + dimensions + setup + motion + render + tail).replace('window.__cptWindows', 'windows')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    print(bundle(parser.parse_args().source), end='')
