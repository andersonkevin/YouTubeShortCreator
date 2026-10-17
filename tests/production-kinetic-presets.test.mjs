import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-kinetic-presets.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorKineticPresets;
test('marquee travels linearly between measured centers without inventing or wrapping words',()=>{
  assert.equal(api.marqueePosition([100,400,700],-1,0,1000),400);
  assert.equal(api.marqueePosition([100,400,700],0,1,1000),400);
  assert.equal(api.marqueePosition([100,400,700],2,.5,1000),-50);
  assert.equal(api.marqueePosition([100,400,700],2,1,1000),-200);
});
test('ticker retains the source acceleration split, flash, then promotion',()=>{
  const before=api.tickerState(.32/3.15,4);assert.equal(before.position,0);assert.equal(before.heroAlpha,0);
  assert.ok(Math.abs(api.tickerState(1.14/3.15,4).position-3*.72)<1e-12);
  const lock=api.tickerState(2.07/3.15,4);assert.equal(lock.position,3);assert.equal(lock.flash,.82);assert.ok(Math.abs(lock.finalScale-1.14)<1e-12);
  for(const count of [1,2,6]){const end=api.tickerState(1,count);assert.equal(end.position,count-1);assert.equal(end.tickerAlpha,0);assert.equal(end.heroAlpha,1);assert.equal(end.heroScale,1);assert.equal(end.heroY,0);assert.equal(end.flash,0);}
  for(const count of [0,7,1.2])assert.throws(()=>api.tickerState(.5,count));
});
test('shutter slam preserves all six source beats and exact rest states',()=>{
  assert.equal(api.slamPose(.25,0,1000,500).x,321);assert.equal(api.slamPose(.5,0,1000,500).x,-321);assert.equal(api.slamPose(.75,0,1000,500).x,321);
  assert.equal(api.slamPose(.25,1,1000,500).y,-152.5);assert.equal(api.slamPose(.5,1,1000,500).y,152.5);
  assert.equal(api.slamPose(.25,2,1000,500).scale,4.04);assert.equal(api.slamPose(.5,2,1000,500).scale,.466);
  for(const [beat,key] of [[3,'rx'],[4,'ry'],[5,'rz']])assert.equal(api.slamPose(.5,beat,1000,500)[key],180);
  for(let beat=0;beat<6;beat++)for(const p of [0,1])assert.equal(JSON.stringify(api.slamPose(p,beat,1000,500)),JSON.stringify({x:0,y:0,scale:1,rx:0,ry:0,rz:0}));
});
test('physical shutter samples include both boundaries one frame away, not a CSS blur',()=>{
  const p=.5,samples=api.shutterSamples(p,0,1000,500);assert.equal(samples.length,17);
  assert.equal(JSON.stringify(samples[0]),JSON.stringify(api.slamPose(p-1/24,0,1000,500)));
  assert.equal(JSON.stringify(samples[8]),JSON.stringify(api.slamPose(p,0,1000,500)));
  assert.equal(JSON.stringify(samples[16]),JSON.stringify(api.slamPose(p+1/24,0,1000,500)));
  assert.ok(new Set(samples.map(s=>s.x)).size>5);
  for(const p of [0,1])assert.ok(api.shutterSamples(p,2,1000,500).every(s=>s.scale>=.466&&s.scale<=4.04));
});
test('all states depend only on absolute progress and reconstruct after reverse seeks',()=>{
  for(let beat=0;beat<6;beat++)for(let frame=0;frame<=24;frame++) {
    const p=frame/24,pose=api.slamPose(p,beat,940,750),samples=api.shutterSamples(p,beat,940,750);
    assert.ok(samples.every(s=>Object.values(s).every(Number.isFinite)));api.shutterSamples(1,beat,940,750);
    assert.equal(JSON.stringify(api.slamPose(p,beat,940,750)),JSON.stringify(pose));assert.equal(JSON.stringify(api.shutterSamples(p,beat,940,750)),JSON.stringify(samples));
  }
  let last=-1;for(let frame=0;frame<=24;frame++){const s=api.tickerState(frame/24,6);assert.ok(s.position>=last);last=s.position;assert.ok(Object.values(s).every(Number.isFinite));}
});
