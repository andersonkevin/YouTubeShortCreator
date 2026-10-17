import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-media-spatial.js',import.meta.url),'utf8'),context);
const {kinds,state,frame,fit}=context.window.ShortCreatorMediaSpatial;
test('phone fan preserves source asymmetry and keeps all projected corners inside four boards',()=>{
  assert.equal(state('phone-trio',.2/1.6,1).alpha,0);
  assert.ok(state('phone-trio',.45,1).scale>1,'Source back ease overshoots before settling');
  for(const [w,h] of [[1720,379],[960,364],[940,814],[960,524]]) {
    const f=fit(w,h,'phone-trio');
    for(let tick=0;tick<=240;tick++)for(let i=0;i<3;i++) {
      const s=state('phone-trio',tick/240,i),a=s.rz*Math.PI/180;
      for(const x of [-160,160])for(const y of [-325,325]) {
        const px=f.x+(500+s.x+(x*Math.cos(a)-y*Math.sin(a))*s.scale)*f.scale;
        const py=f.y+(250+s.y+(x*Math.sin(a)+y*Math.cos(a))*s.scale)*f.scale;
        assert.ok(px>=0&&px<=w&&py>=0&&py<=h,'Phone is cropped');
      }
    }
  }
  assert.equal(state('phone-trio',1,0).x,-340);assert.equal(state('phone-trio',1,2).x,340);
  assert.equal(state('phone-trio',1,1).scale,1);
});
test('source depth poses preserve the authored start and finish',()=>{
  const a=state('depth-card',0),b=state('depth-card',1);
  assert.deepEqual([a.rx,a.ry,a.z],[12,-20,-80]);assert.deepEqual([b.rx,b.ry,b.z],[-4,10,80]);
  for(let i=0;i<3;i++) {
    const end=state('scrub-stack',1,i);assert.equal(end.y,i*26);assert.equal(end.scale,1-i*.04);assert.equal(end.alpha,1);
    const splay=state('device-splay',1,i);assert.equal(splay.x,[-300,-50,240][i]);assert.equal(splay.rz,[-12,0,12][i]);
  }
});
test('dolly moves actual depth while the subject size remains fixed',()=>{
  for(const [kind,end] of [['dolly-depth-in',700],['dolly-depth-out',2800]]) {
    assert.equal(state(kind,0).distance,1400);assert.equal(state(kind,1).distance,end);
    let previous=1;
    for(let f=0;f<=24;f++) {
      const s=state(kind,f/24);assert.equal(s.perspective/s.distance,s.subjectScale);
      const projection=s.perspective/(s.distance+560);
      if(f)assert.ok(kind.endsWith('-in')?projection<previous:projection>previous);
      previous=projection;
    }
  }
});
test('all fixed poses are finite and independent of seek history',()=>{
  for(const kind of kinds)for(let i=0;i<3;i++)for(const p of [-1,0,.03,.25,.5,.87,1,2,.5]) {
    const expected=state(kind,p,i);state(kind,1,i);state(kind,0,i);
    assert.equal(JSON.stringify(state(kind,p,i)),JSON.stringify(expected));
    assert.ok(Object.values(expected).every(Number.isFinite));assert.ok(expected.alpha>=0&&expected.alpha<=1);
  }
  assert.throws(()=>state('custom',.5));assert.throws(()=>state('depth-card',NaN));assert.throws(()=>state('scrub-stack',0,3));
});
test('virtual composition fits all native boards with room for projected overshoot',()=>{
  for(const [w,h] of [[1720,379],[960,364],[940,814],[960,524]]) {
    const f=fit(w,h);assert.ok(f.scale>0&&f.x>=0&&f.y>=0);
    assert.ok(f.x-60*f.scale>=16-1e-6&&f.x+1060*f.scale<=w-16+1e-6);
    assert.ok(f.y-30*f.scale>=16-1e-6&&f.y+530*f.scale<=h-16+1e-6);
  }
  assert.equal(frame('device-splay',0).height,295);assert.equal(frame('device-splay',2).width,440);
  assert.throws(()=>fit(0,400));assert.throws(()=>fit(20,20));
});
