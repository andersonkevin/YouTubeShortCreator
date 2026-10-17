import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-beat-freeze.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorBeatFreeze,plain=x=>JSON.parse(JSON.stringify(x));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('source ramp freezes the image before a single hard swap at the connector peak',()=>{
  const mid=api.state(.425/2.29);near(mid.scale,1+.28/16);near(mid.x,28/16);near(mid.y,-12/16);
  for(const t of [.85,1,1.2,1.4,1.64]) {
    const s=api.state(t/2.29);near(s.scale,1.28);near(s.x,28);near(s.y,-12);assert.equal(s.incoming,false);
  }
  const before=api.state((1.79-1e-7)/2.29),after=api.state(1.79/2.29);
  assert.equal(before.incoming,false);assert.equal(after.incoming,true);
  near(before.blur,14);near(after.blur,14);near(before.sx,1.35);near(after.sx,1.35);
  assert.ok(before.streak>.9&&after.streak>.9);assert.equal(after.outline,0);assert.equal(after.contour,0);
});
test('exposure is a single pulse and all transient layers clear for the native still hold',()=>{
  near(api.state(.85/2.29).flash,.55);near(api.state(1.13/2.29).flash,0);
  near(api.state(1.55/2.29).outline,.75);near(api.state(1.55/2.29).contour,.75);
  for(const p of [0,1,600]) {
    const s=api.state(p);assert.equal(s.scale,1);assert.equal(s.sx,1);assert.equal(s.sy,1);assert.equal(s.brightness,1);
    for(const k of ['x','y','blur','outline','flash','contour','streak'])assert.equal(s[k],0);
  }
  assert.throws(()=>api.state(Infinity));
});
test('69-frame window respects the caption clock and restores forward/reverse equality',()=>{
  const onsets=[.5,2.5,5.5];assert.equal(api.frames,69);
  const start=api.frameState(75/30,onsets);assert.equal(start.active,1);assert.equal(start.p,0);assert.equal(start.incoming,false);
  assert.equal(api.frameState(144/30,onsets).p,1);
  const frames=Array.from({length:300},(_,f)=>plain(api.frameState(f/30,onsets)));
  for(let f=299;f>=0;f--)assert.deepEqual(plain(api.frameState(f/30,onsets)),frames[f]);
  assert.ok(frames.every(s=>Object.values(s).every(v=>typeof v==='boolean'||Number.isFinite(v))));
  assert.throws(()=>api.frameState(0,[]));assert.throws(()=>api.frameState(NaN,onsets));
});
