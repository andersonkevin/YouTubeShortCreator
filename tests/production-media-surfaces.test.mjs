import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-media-surfaces.js',import.meta.url),'utf8'),context);
const {kinds,state,fit,devicePose}=context.window.ShortCreatorMediaSurfaces;
const plain=x=>JSON.parse(JSON.stringify(x));

test('surface image fit preserves aspect and centers portrait, wide and square stills',()=>{
  for(const [w,h] of [[1696,391],[852,366],[852,816],[852,526]])for(const [iw,ih] of [[1920,1080],[1080,1920],[1080,1080]]) {
    const r=fit(w,h,iw,ih);assert.ok(r.x>=0&&r.y>=0);assert.ok(r.x+r.width<=w+1e-8&&r.y+r.height<=h+1e-8);
    assert.ok(Math.abs(r.width/r.height-iw/ih)<1e-8);assert.ok(Math.abs(2*r.x+r.width-w)<1e-8);
  }
  for(const value of [0,-1,NaN,Infinity])assert.throws(()=>fit(100,100,value,100));
});
test('grain retains its ten authored offsets and returns to its first tile',()=>{
  assert.deepEqual(Array.from({length:10},(_,i)=>plain(state('grain',i/10).offset)),[[0,0],[-5,-5],[-10,5],[5,-10],[-5,15],[-10,5],[15,0],[0,10],[-15,0],[10,5]]);
  assert.deepEqual(plain(state('grain',1).offset),[0,0]);
});
test('light sweep crosses once then settles with the band gone and a fixed key',()=>{
  assert.equal(state('light-sweep',0).lightX,-35);
  assert.ok(Math.abs(state('light-sweep',2.5/3.05).lightX-118)<1e-8);
  const end=state('light-sweep',1);assert.equal(end.lightX,62);assert.equal(end.band,0);assert.equal(end.ambient,0);
  assert.ok(Math.abs(end.glow-(1-12/26))<1e-8);
});
test('editorial flash has a captured attack peak and fully decays inside its cue',()=>{
  const frames=Array.from({length:25},(_,i)=>state('editorial-flash',i/24));
  const peak=frames.map(s=>s.core).indexOf(Math.max(...frames.map(s=>s.core)));
  assert.equal(peak,13);assert.ok(frames[13].core>.999999);assert.ok(frames[13].wash>.91999);
  for(const name of ['core','wash','sweep']){assert.equal(frames[0][name],0);assert.equal(frames.at(-1)[name],0);}
});
test('light leak and beat accent have finite source envelopes without idle motion',()=>{
  assert.equal(state('light-leak',0).alpha,0);assert.equal(state('light-leak',1).alpha,0);
  assert.ok(Math.abs(state('light-leak',.32).alpha-.9)<1e-8);
  const peak=state('beat-accent',.37/.9);assert.ok(Math.abs(peak.scale-1.18)<1e-8);
  const end=state('beat-accent',1);assert.equal(end.scale,1);assert.equal(end.flash,0);assert.equal(end.x,0);assert.equal(end.y,0);
});
test('fills and physical device entries resolve to exact source pose endpoints',()=>{
  for(const name of ['blur-fill','mirror-fill','copy-fill']) {
    const s=state(name,1);assert.equal(s.scale,1);assert.equal(s.alpha,1);assert.equal(s.y,0);
  }
  assert.deepEqual(plain(devicePose(0)),{y:18,scale:.94});assert.deepEqual(plain(devicePose(1)),{y:0,scale:1});
  const high=devicePose(.9/1.08);assert.ok(Math.abs(high.y+1.2)<1e-8);assert.ok(Math.abs(high.scale-1.01)<1e-8);
});
test('all surface states are finite, bounded and independent of seek history',()=>{
  assert.equal(kinds.length,17);
  const finite=x=>typeof x==='number'?Number.isFinite(x):Object.values(x).every(finite);
  for(const name of kinds) {
    const expected=Array.from({length:25},(_,i)=>plain(state(name,i/24)));assert.ok(expected.every(finite));
    for(let i=24;i>=0;i--)assert.deepEqual(plain(state(name,i/24)),expected[i]);
    assert.deepEqual(plain(state(name,-1)),expected[0]);assert.deepEqual(plain(state(name,2)),expected[24]);
  }
  assert.throws(()=>state('external',.5));assert.throws(()=>state('grain',NaN));
});

test('freeze dressing preserves the flash, staggered tapes and complete overlay exit',()=>{
  const peak=state('freeze-paper',1.02/4);assert.ok(Math.abs(peak.flash-.95)<1e-10);
  const taped=state('freeze-paper',1.62/4);assert.equal(taped.paper,.64);assert.ok(taped.tapes.every(t=>Math.abs(t.alpha-1)<1e-10&&Math.abs(t.scale-1)<1e-10));
  for(const p of [0,1]) {const s=state('freeze-paper',p);assert.equal(s.flash,0);assert.equal(s.paper,0);assert.ok(s.tapes.every(t=>t.alpha===0));}
});

test('device dive reuses source rise, settle, quintic push and differential layers',()=>{
  const a=state('phone-dive',0);assert.equal(a.y,18);assert.equal(a.scale,.86);assert.equal(a.alpha,0);
  const b=state('phone-dive',1.05/2.7);assert.equal(b.scale,1);assert.equal(Math.abs(b.y),0);
  const peak=state('phone-dive',(1.05+1.65*.72)/2.7);assert.ok(Math.abs(peak.layers[0].y+1.2)<1e-10);assert.ok(Math.abs(peak.layers[2].scale-1.16)<1e-10);
  const end=state('phone-dive',1);assert.equal(end.scale,6.4);assert.equal(end.y,2.4);assert.equal(end.cutout,0);
  assert.ok(end.layers.every(l=>Math.abs(l.y)===0&&l.scale===1));
  const values=Array.from({length:31},(_,i)=>state('phone-dive',(1.05+i*1.65/30)/2.7).scale);
  assert.ok(values.every((v,i)=>i===0||v>=values[i-1]));
});

test('drift source becomes one cue accent with identical endpoint phase and no ongoing loop',()=>{
  const a=state('drift-accent',0),b=state('drift-accent',1),later=state('drift-accent',600);
  for(const key of ['rotation','scale','sweepX','sweepAlpha'])assert.equal(a[key],b[key]);
  assert.deepEqual(plain(later),plain(b));assert.equal(b.scale,1.015);assert.equal(b.sweepX,-42);
  const middle=state('drift-accent',.5);assert.ok(Math.abs(middle.rotation+.3)<1e-10);assert.equal(middle.scale,.985);assert.equal(middle.sweepX,42);
});
