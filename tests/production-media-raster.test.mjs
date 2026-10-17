import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-media-raster.js',import.meta.url),'utf8'),context);
const {kinds,bayer,summedLuma,cellLuma,ditherPixel,particles,particlePose,blobs,blobPose,slitPose,state}=context.window.ShortCreatorMediaRaster;
const plain=x=>JSON.parse(JSON.stringify(x));
test('Bayer recursion preserves the source quadrant ordering and all thresholds',()=>{
 assert.deepEqual(plain(bayer(2)),[.125,.625,.875,.375]);
 for(const n of [2,4,8])assert.deepEqual([...bayer(n)].sort((a,b)=>a-b),Array.from({length:n*n},(_,i)=>(i+.5)/(n*n)));
 for(const n of [0,3,16,NaN,'4'])assert.throws(()=>bayer(n));
});
test('summed-area luminance matches direct means without touching source pixels',()=>{
 const pixels=Uint8ClampedArray.from([255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,255]);
 const original=pixels.slice(),table=summedLuma(pixels,2,2);
 assert.ok(Math.abs(cellLuma(table,2,0,0,2,2)-.5)<1e-12);
 assert.ok(Math.abs(cellLuma(table,2,0,0,1,1)-.299)<1e-12);
 assert.equal(cellLuma(table,2,1,0,1,2),0);assert.deepEqual(pixels,original);
 assert.throws(()=>summedLuma(pixels,3,2));
});
test('dither has exact clean endpoints and approved duotone noise poles',()=>{
 const bg=[20,11,48],fg=[190,218,97],source=[95,180,211];
 for(const th of bayer(8)) {
  assert.deepEqual(plain(ditherPixel(source,th,0,bg,fg)),source);
  assert.deepEqual(plain(ditherPixel(source,th,1,bg,fg)),th<.5?fg:bg);
  for(const p of [0,.25,.5,.75,1])assert.ok(ditherPixel(source,th,p,bg,fg).every(v=>v>=0&&v<=255));
 }
});
test('particle and ink tables preserve deterministic bounded source geometry',()=>{
 for(const direction of ['left','center']) {
  const rows=particles(direction);assert.equal(rows.length,640);assert.deepEqual(plain(rows),plain(particles(direction)));
  for(const row of rows) {
   assert.ok(row.tx>=0&&row.tx<=1&&row.ty>=0&&row.ty<=1&&row.birth<row.arrive&&row.arrive<=.94);
   assert.equal(particlePose(row,0,900,500).alpha,0);assert.equal(particlePose(row,1,900,500).alpha,0);
   assert.ok(particlePose(row,row.arrive,900,500).alpha>0);
  }
 }
 assert.throws(()=>particles('random'));
 for(const row of blobs()){assert.equal(blobPose(row,0,900,500).radius,0);assert.equal(blobPose(row,1,900,500).radius,0);}
 assert.deepEqual(plain(blobs()),plain(blobs()));
});
test('slit sampling resolves to one coherent centered image',()=>{
 for(const rows of [true,false]) {
  assert.deepEqual(plain(slitPose(2.8,rows)),{x:.5,y:.5,rotation:0,scale:1,alpha:1});
  assert.equal(slitPose(0,rows).alpha,0);
 }
});
test('all eleven raster treatments are history independent and settle without idle motion',()=>{
 assert.equal(kinds.length,11);
 for(const kind of kinds) {
  const frames=Array.from({length:25},(_,i)=>plain(state(kind,i/24)));
  for(const s of frames)assert.ok(Object.values(s).every(Number.isFinite));
  for(const i of [24,0,12,1,23,4,18,24])assert.deepEqual(plain(state(kind,i/24)),frames[i]);
  assert.deepEqual(plain(state(kind,2)),frames[24]);assert.deepEqual(plain(state(kind,-2)),frames[0]);
  if(kind.startsWith('ascii-'))assert.equal(frames[24].step,4);else assert.equal(frames[24].canvas,0);
 }
 assert.throws(()=>state('custom',.5));assert.throws(()=>state('dither-2',NaN));
});
