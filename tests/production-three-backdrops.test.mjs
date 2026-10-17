import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},console,Uint8ClampedArray};
for(const file of ['production-three-runtime.js','production-gpu-backdrops.js','production-optical-fields.js','production-three-backdrops.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file,import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorThreeBackdrops,three=context.window.ShortCreatorThree;
const plain=value=>JSON.parse(JSON.stringify(value));
test('pinned offline bundle exports the actual r185 rendering and geometry classes',()=>{
  assert.equal(three.REVISION,'185');assert.ok(Object.isFrozen(three));
  for(const name of ['WebGLRenderer','PerspectiveCamera','MeshPhysicalMaterial','PMREMGenerator','BufferGeometry','CanvasTexture','RawShaderMaterial','Float32BufferAttribute'])
    assert.equal(typeof three[name],'function');
  const box=new three.BoxGeometry(1.2,1.2,.08);box.computeBoundingBox();
  assert.ok(Math.abs(box.boundingBox.max.x-.6)<1e-7);assert.ok(Math.abs(box.boundingBox.max.z-.04)<1e-7);box.dispose();
});
test('bounded source poses survive reverse seeks and terminate at exact rest',()=>{
  assert.equal(api.kinds.length,7);
  const clock=context.window.ShortCreatorGpuBackdrops.clock;
  for(const kind of api.kinds) {
    const poses=[];
    for(let frame=0;frame<180;frame++)poses.push(plain(api.pose(kind,clock(frame/30,[.5,2.5]).seconds/2)));
    for(let frame=179;frame>=0;frame--)assert.deepEqual(plain(api.pose(kind,clock(frame/30,[.5,2.5]).seconds/2)),poses[frame]);
    assert.deepEqual(poses[99],poses[179]);
  }
  assert.deepEqual(plain(api.pose('three-orbiting-cards',1)),{seconds:4,rotation:[0,0,0],cameraZ:6.4});
  assert.ok(Math.abs(api.pose('three-orbiting-cards',.5).cameraZ-5.85)<1e-12);
  assert.equal(api.pose('three-galaxy',1).seconds,10);
  assert.deepEqual(plain(api.pose('three-glass-ring',0)),{seconds:0,position:[0,-3.2,1.2],scale:.62,rotation:[.5,0,.2]});
  assert.throws(()=>api.pose('constructor',0));assert.throws(()=>api.pose('three-galaxy',NaN));
});
test('galaxy reuses a seeded 20000-star three-arm field without accumulated simulation',()=>{
  const a=api.galaxyAttributes(),b=api.galaxyAttributes();
  assert.equal(Object.keys(a).length,6);
  for(const key of Object.keys(a)) {
    assert.equal(a[key].length,20000);assert.deepEqual([...a[key]],[...b[key]]);
    assert.ok([...a[key]].every(Number.isFinite));
  }
  assert.ok([...a.aRatio].every(x=>x>=0&&x<=1));assert.equal(new Set(a.aBranch).size,3);
  for(const [key,max] of [['aJitterR',1],['aJitterT',.62],['aJitterY',.3]]) {
    assert.ok([...a[key]].every(x=>Math.abs(x)<=max));assert.ok(a[key].some(x=>x<0)&&a[key].some(x=>x>0));
  }
  assert.equal(a.aBranch[0],0);assert.equal(a.aBranch[3],0);
});
test('tunnel recycles exactly fifteen absolute segments behind the fog boundary',()=>{
  const frames=[];
  for(let i=0;i<=360;i++) {
    const frame=plain(api.tunnelFrame(i/30));frames.push(frame);
    assert.equal(frame.length,15);assert.equal(new Set(frame.map(s=>s.absolute)).size,15);
    for(const segment of frame) {
      assert.ok(segment.z<=.75&&segment.z> -14.25);assert.equal(segment.panels.length,16);
      if(segment.absolute%2!==0)assert.ok(segment.panels.every(x=>x===-1));
      assert.ok(segment.panels.every(x=>Number.isInteger(x)&&x>=-1&&x<6));
    }
  }
  for(let i=360;i>=0;i--)assert.deepEqual(plain(api.tunnelFrame(i/30)),frames[i]);
  assert.throws(()=>api.tunnelFrame(-1));assert.throws(()=>api.tunnelFrame(13));
});
