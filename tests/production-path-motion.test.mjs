import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-path-motion.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorPathMotion;
test('responsive source paths retain their command topology and join exact native edges',()=>{
  for(const vertical of [false,true])for(const span of [24,42,48,96])for(const style of api.styles) {
    const x=vertical?100:100+span,y=vertical?200+span:200;
    const d=api.route(style,100,200,x,y);assert.ok(d.startsWith('M 100 200 '));assert.ok(d.endsWith(`${x} ${y}`));
    const commands=d.match(/[MCLS]/g).join('');assert.equal(commands,style==='arc-route'?'MCS':style==='offset-traveler'?'MCCC':'ML');
    assert.ok(d.match(/-?\d+(?:\.\d+)?/g).every(n=>Number.isFinite(+n)));
  }
  assert.match(api.route('arc-route',0,0,80,0,true),/^M 0 0 C /);
});
test('arc travelers use quadratic and delayed sine timing',()=>{
  assert.equal(api.state('arc-route',.25).travel,.125);
  assert.equal(api.state('arc-route',.25/2.4).second,.1);
  assert.ok(Math.abs(api.state('arc-route',1).second-.92)<1e-12);
});
test('offset traveler retains the 72-percent handoff and acceleration on exit',()=>{
  const s=api.state('offset-traveler',1.2/1.85);assert.equal(s.travel,.72);assert.equal(s.alpha,1);
  assert.ok(api.state('offset-traveler',.3/1.85).scale>1);
  const end=api.state('offset-traveler',1);assert.equal(end.travel,1);assert.equal(end.alpha,0);assert.equal(end.scale,1);
});
test('beam uses a quarter-length segment, delayed sine sweep and bounded exit',()=>{
  assert.equal(api.state('tracing-beam',0).alpha,0);
  assert.equal(api.state('tracing-beam',.35/2.98).beam,.24);
  assert.ok(Math.abs(api.state('tracing-beam',(1.175+.35)/2.98).beam+.26)<1e-12);
  const end=api.state('tracing-beam',1);assert.equal(end.beam,-1);assert.equal(end.alpha,0);
  assert.equal(api.state('separated',.21/.8).draw,1-.5**4);
});
test('tangents are measured with the source step and clamped at both endpoints',()=>{
  const calls=[],path={getPointAtLength(n){calls.push(n);return {x:n,y:2*n};}};
  const first=api.tangent(path,100,0);assert.equal(first.angle,Math.atan2(1,.5)*180/Math.PI);assert.deepEqual(calls,[0,0,.5]);
  calls.length=0;api.tangent(path,1000,1);assert.deepEqual(calls,[1000,998,1000]);
});
test('all path effects are finite, seekable and reach a motionless endpoint',()=>{
  for(const style of api.styles)for(let f=0;f<=24;f++) {
    const s=api.state(style,f/24);assert.ok(Object.values(s).every(Number.isFinite));assert.ok(s.alpha>=0&&s.alpha<=1);
    api.state(style,1);assert.equal(JSON.stringify(api.state(style,f/24)),JSON.stringify(s));
  }
  for(const style of api.styles){const end=api.state(style,1);assert.equal(end.draw,1);assert.equal(end.alpha,0);}
  assert.throws(()=>api.state('custom',.5));
});
