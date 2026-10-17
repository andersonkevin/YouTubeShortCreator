import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},console};
for(const file of ['production-three-runtime','production-gpu-backdrops','production-orbit-card','production-spatial-objects'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorOrbitCard,T=context.window.ShortCreatorThree;
const plain=v=>JSON.parse(JSON.stringify(v)),near=(a,b,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);

test('saved central rig performs exactly one source orbit with independent sphere spin',()=>{
  const a=api.pose(0),b=api.pose(1);
  near(a.frame,85);near(b.frame,205);near(a.orbit,0);near(b.orbit,2*Math.PI);
  near(a.spin,1.4);near(b.spin,3.4);near(a.position[0],0);near(b.position[0],0);
  near(a.position[1],-.06904694437980652);near(a.position[2],.10031396895647049);
  near(b.position[1],.06155156344175339);near(b.position[2],.03808974847197533);
  near(api.pose((165-85)/120).orbit,Math.PI);
  for(const x of [NaN,Infinity,-Infinity])assert.throws(()=>api.pose(x));
  assert.deepEqual(plain(api.pose(600)),plain(b));assert.deepEqual(plain(api.pose(-1)),plain(a));
});

test('absolute native seek freezes the whole rig after the settle cue',()=>{
  const clock=context.window.ShortCreatorGpuBackdrops.clock;
  const states=Array.from({length:241},(_,f)=>plain(api.pose(clock(f/30,[.507,4.507]).seconds/2)));
  for(let f=240;f>=0;f--)assert.deepEqual(plain(api.pose(clock(f/30,[.507,4.507]).seconds/2)),states[f]);
  assert.deepEqual(plain(api.pose(clock(600,[.507,4.507]).seconds/2)),states.at(-1));
});

test('actual plate retains its through-aperture and front-facing copy plane dimensions',()=>{
  const {shape,geometry}=api.plate(T);assert.equal(shape.holes.length,1);geometry.computeBoundingBox();
  const size=geometry.boundingBox.getSize(new T.Vector3());
  near(size.x,4.45,1e-6);near(size.y,5.45,1e-6);near(size.z,.2,1e-6);
  const center=new T.Vector2(0,.94),points=shape.holes[0].getPoints(128);
  assert.ok(points.every(p=>Math.abs(p.distanceTo(center)-1.08)<1e-7));geometry.dispose();
});

test('source camera and card geometry fit every native format through the complete orbit',()=>{
  for(const [width,height] of [[1720,390],[940,860],[960,390],[960,620]]) {
    const owned=new Set(),keep=o=>{owned.add(o);return o;},scene=new T.Scene();
    const rig=api.build({T,scene,keep,texture:()=>keep(new T.Texture()),canvas:()=>({c:{},g:{drawImage(){}}}),
      colors:{surface:'#1d1230',secondary:'#70f3ed',accent:'#d7ff3f'},image:{naturalWidth:1200,naturalHeight:500},
      width,height,contain:context.window.ShortCreatorSpatialObjects.contain});
    for(let i=0;i<=240;i++) {
      const state=api.pose(i/240);rig.update(state);const actual=rig.inspect();
      assert.deepEqual(plain(actual.camera),plain(state.camera));assert.deepEqual(plain(actual.position),plain(state.position));
      const [l,t,r,b]=actual.bounds;
      assert.ok(l>=0&&t>=0&&r<=width&&b<=height,`${width}x${height} frame ${i}: ${actual.bounds}`);
      assert.equal(actual.dots,640);near(actual.orbit,state.orbit);
    }
    owned.forEach(o=>o.dispose());
  }
});
