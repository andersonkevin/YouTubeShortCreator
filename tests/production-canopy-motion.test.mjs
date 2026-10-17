import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {test} from 'node:test';

const context={window:{},console};
for(const file of ['production-three-runtime','production-canopy-motion'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorCanopyMotion,T=context.window.ShortCreatorThree;
const plain=value=>JSON.parse(JSON.stringify(value));

test('canopy keeps two seeded 170-leaf batches, five species and exactly five retained leaves each',()=>{
  const rig=api.create(T);
  assert.deepEqual(plain(rig.batches.map(batch=>batch.length)),[170,170]);
  assert.deepEqual(plain(rig.batches.map(batch=>batch.filter(s=>s.stayer).length)),[5,5]);
  assert.deepEqual(plain(api.kinds.map(kind=>rig.batches.flat().filter(s=>s.kind===kind).length)),[79,67,90,71,33]);
  assert.equal(rig.batches[0][0].xStart,-16.98372471111361);
  assert.equal(rig.dustHome.length,2400);assert.equal(rig.dustSeeds.length,800);
  assert.deepEqual(plain(rig.batches),plain(api.create(T).batches));
});

test('source sweep, upward depth lift and focus windows have finite absolute timing',()=>{
  const rig=api.create(T),a=rig.sample(0),b=rig.sample(3.6),c=rig.sample(5.2),d=rig.sample(8.4);
  assert.equal(a.sweep,0);assert.equal(a.lift,0);
  assert.equal(b.sweep,1);assert.equal(b.lift,0);assert.equal(c.lift,0);assert.equal(d.lift,1);
  assert.equal(rig.sample(6.8).aperture,.0016+.0005);assert.equal(rig.sample(6.8).maxblur,.0055+.0035);
  assert.equal(d.aperture,.0016);assert.equal(d.maxblur,.0055);
  for(const sample of [a,b,c,d]){
    assert.equal(sample.camera.fov,41);assert.equal(sample.dust.positions.length,2400);
    for(const row of sample.leaves){
      if(!row.visible){assert.equal(row.position,null);continue;}
      assert.ok([...row.position,...row.rotation,row.scale].every(Number.isFinite));
    }
  }
});

test('second canopy batch starts wholly below the frame and passers leave beyond the camera',()=>{
  const rig=api.create(T),start=rig.sample(0),end=rig.sample(8.4);
  const dimensions={monstera:[2.05,2.7],alocasia:[1.92,2.85],lance:[.68,3.45],calathea:[1.36,3.05],fern:[.46,1.5]};
  rig.batches[1].forEach((spec,i)=>{
    const row=start.leaves[170+i],dims=dimensions[spec.kind];
    const reach=Math.hypot(dims[0]*spec.widthMul*.5,dims[1]*spec.lengthMul)*spec.scale;
    const bottom=-Math.tan(41*Math.PI/360)*(start.camera.position[2]-row.position[2]);
    assert.ok(row.position[1]+reach<bottom-1);
    if(!spec.stayer)assert.ok(end.leaves[170+i].position[2]>end.camera.position[2]+10);
  });
});

test('reverse and repeated seeking preserve all visible leaf, dust and camera values exactly',()=>{
  const rig=api.create(T),times=[0,.4,1,3.6,5.2,6,7.1,8.4,10.5,12];
  const expected=new Map(times.map(t=>[t,JSON.stringify(rig.sample(t))]));
  for(const t of [...times].reverse())assert.equal(JSON.stringify(rig.sample(t)),expected.get(t));
  for(const t of times)assert.equal(JSON.stringify(rig.sample(t)),expected.get(t));
});

test('retained-leaf handoff joins without a position or velocity jump',()=>{
  const rig=api.create(T),epsilon=.00001;
  rig.batches.flat().forEach((spec,index)=>{
    if(!spec.stayer)return;
    for(const t of [spec.handoff.start,spec.handoff.start+spec.handoff.duration]){
      const before=rig.sample(t-epsilon).leaves[index],at=rig.sample(t).leaves[index],after=rig.sample(t+epsilon).leaves[index];
      const a=[...before.position,...before.rotation],b=[...at.position,...at.rotation],c=[...after.position,...after.rotation];
      for(let k=0;k<6;k++){
        assert.ok(Math.abs(a[k]-c[k])<.005,'position continuity');
        assert.ok(Math.abs((c[k]-b[k])/epsilon-(b[k]-a[k])/epsilon)<.03,'velocity continuity');
      }
    }
  });
});

test('zero retained breeze reaches a fixed final hold without accumulated drift',()=>{
  const rig=api.create(T,0),a=rig.sample(10.5),b=rig.sample(12);
  for(const key of ['leaves','camera','dust','windTime','wipes'])assert.deepEqual(plain(a[key]),plain(b[key]));
});

test('curved leaf geometry preserves tessellation, finite normals and original dimensions',()=>{
  for(const [width,length] of [[2.05,2.7],[1.92,2.85],[.68,3.45],[1.36,3.05],[.46,1.5]]){
    const geometry=api.geometry(T,width,length);
    assert.equal(geometry.attributes.position.count,299);assert.equal(geometry.index.count,1584);
    assert.ok([...geometry.attributes.normal.array].every(Number.isFinite));
    geometry.computeBoundingBox();const box=geometry.boundingBox;
    assert.ok(Math.abs(box.max.x-box.min.x-width)<1e-6);
    assert.ok(Math.abs(box.max.y-box.min.y-length)<1e-6);
    assert.ok(box.max.z-box.min.z>.05);geometry.dispose();
  }
});

test('procedural species retain unique cutouts and repeatable color and bump detail',()=>{
  const palette=[[10,20,30],[60,80,100],[180,200,220]],hashes=[];
  for(const [i,kind]of api.kinds.entries()){
    const data=api.textureData(kind,i*31+7,palette);
    assert.equal(data.width,384);assert.equal(data.height,768);
    assert.equal(data.color.length,384*768*4);assert.equal(data.bump.length,data.color.length);
    let clear=0,opaque=0;
    for(let k=3;k<data.color.length;k+=4){if(data.color[k]===0)clear++;if(data.color[k]===255)opaque++;assert.equal(data.bump[k],255);}
    assert.ok(clear>5000&&opaque>5000);
    const hash=crypto.createHash('sha256').update(data.color).update(data.bump).digest('hex');hashes.push(hash);
    const replay=api.textureData(kind,i*31+7,palette);
    assert.equal(crypto.createHash('sha256').update(replay.color).update(replay.bump).digest('hex'),hash);
  }
  assert.equal(new Set(hashes).size,5);
});

test('prepared helpers reject unknown runtime, nonfinite clocks and unbounded geometry or colors',()=>{
  assert.throws(()=>api.create({REVISION:'170'}));
  for(const value of [NaN,Infinity,-1,2.1])assert.throws(()=>api.create(T,value));
  for(const value of [NaN,Infinity,'1'])assert.throws(()=>api.create(T).sample(value));
  for(const value of [NaN,0,-1,8.1])assert.throws(()=>api.geometry(T,value,1));
  assert.throws(()=>api.textureData('unknown',1,[[0,0,0],[1,1,1],[2,2,2]]));
  assert.throws(()=>api.textureData('fern',NaN,[[0,0,0],[1,1,1],[2,2,2]]));
  assert.throws(()=>api.textureData('fern',1,[[0,0,0],[1,1,1],[256,2,2]]));
});
