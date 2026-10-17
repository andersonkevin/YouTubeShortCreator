import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-ui-primitives.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorUIPrimitives;
test('micro transitions retain source distances, scale and quartic release',()=>{
  const q=1-.5**4,p=.25/.9;
  const badge=api.state('micro-badge',p);assert.equal(badge.alpha,q);assert.equal(badge.x,-7*(1-q));assert.equal(badge.y,10*(1-q));assert.equal(badge.scale,.25+.75*q);
  for(const [name,y,scale] of [['micro-dropdown',-12,.95],['micro-modal',18,.96],['micro-tooltip',6,.96]]) {
    const start=api.state(name,0),end=api.state(name,1);assert.equal(start.y,y);assert.equal(start.scale,scale);assert.equal(Math.abs(end.y),0);assert.equal(end.scale,1);
  }
  assert.equal(api.state('micro-tabs',.55/.9).tab,0);assert.equal(api.state('micro-tabs',1).tab,1);
  assert.equal(api.state('micro-check',p).check,q);assert.throws(()=>api.state('unknown',.5));
});
test('signup shell precedes content, final button compresses and releases without actions',()=>{
  const initial=api.state('signup-flow',0,true);assert.equal(initial.alpha,0);assert.equal(initial.y,26);assert.equal(initial.bodyY,14);
  assert.equal(api.state('signup-flow',.23/1.19).body,0);
  assert.equal(api.state('signup-flow',1.07/1.19,true).scale,.97);
  assert.equal(api.state('signup-flow',1.07/1.19,false).scale,1);
  const end=api.state('signup-flow',1,true);assert.equal(end.body,1);assert.equal(end.scale,1);assert.equal(end.y,0);
});
test('beat and explicit social stat arrive using their distinct source curves',()=>{
  assert.equal(api.state('beat-sequence',0).scale,.98);assert.equal(api.state('beat-sequence',.25).alpha,.875);
  assert.ok(api.state('profile-count',.36/.64).statY<0);
  assert.equal(api.state('profile-count',.22/.64).avatars[0],0);
  const end=api.state('profile-count',1);assert.equal(end.statY,0);assert.ok(end.avatars.every(x=>x===1));
});
test('status swapping and point morphing preserve explicit unchecked semantics',()=>{
  assert.equal(api.statusState('icon-swap',0,true).neutralAlpha,1);
  const early=api.statusState('icon-swap',.12/.38,true);assert.equal(early.alpha,0);
  assert.equal(api.statusState('icon-swap',1,true).neutralAlpha,0);
  assert.ok(Math.abs(api.statusState('icon-morph',.35/1.2,true).morph)<1e-12);
  assert.equal(api.statusState('icon-morph',1.02/1.2,true).scale,1.08);
  assert.equal(api.morphPath(0),'M 28 18 L 36 23 L 44 28 L 52 33 L 60 38 L 68 43 L 76 48 L 80 50 L 76 52 L 68 57 L 60 62 L 52 67 L 44 72 L 36 77 L 28 82 L 28 50 Z');
  assert.equal(api.morphPath(1),'M 16 50 L 20 46 L 24 42 L 34 52 L 44 62 L 52 54 L 60 46 L 68 38 L 76 30 L 80 34 L 84 38 L 74 48 L 64 58 L 54 68 L 44 78 L 34 68 Z');
  for(const style of ['icon-swap','icon-morph'])for(let frame=0;frame<=24;frame++) {
    const s=api.statusState(style,frame/24,false);assert.equal(s.alpha,0);assert.equal(s.draw,0);assert.equal(s.morph,0);
  }
  assert.throws(()=>api.statusState('auto',.5,true));
});
test('avatar lift keeps the back overshoot and bounded bounce return',()=>{
  assert.equal(api.avatarLift(0),0);assert.equal(api.avatarLift(1),0);
  assert.ok(api.avatarLift(.2/.78)<-18);assert.equal(api.avatarLift(.36/.78),-18);
  let changing=0;for(let f=1;f<24;f++){const y=api.avatarLift(f/24);assert.ok(y>=-20&&y<=0);changing+=y!==api.avatarLift((f-1)/24);}
  assert.ok(changing>18);
});
test('all primitive states reconstruct after non-monotonic seeks without clocks or random input',()=>{
  const finite=x=>typeof x==='number'?Number.isFinite(x):Object.values(x).every(finite);
  for(const variant of api.variants)for(let f=0;f<=24;f++) {
    const state=api.state(variant,f/24,true);assert.ok(finite(state));api.state(variant,1);api.state(variant,0);
    assert.equal(JSON.stringify(api.state(variant,f/24,true)),JSON.stringify(state));
  }
  for(const style of ['icon-swap','icon-morph'])for(let f=0;f<=24;f++) {
    const state=api.statusState(style,f/24,true);assert.ok(finite(state));api.statusState(style,1,false);
    assert.equal(JSON.stringify(state),JSON.stringify(api.statusState(style,f/24,true)));
  }
});
