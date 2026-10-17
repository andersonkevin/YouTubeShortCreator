import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const file of ['evidence','resources','backdrops'])vm.runInNewContext(fs.readFileSync(new URL(`../templates/v1/assets/production-${file}.js`,import.meta.url),'utf8'),context);
const {markState}=context.window.ShortCreatorEvidence;
const {successState}=context.window.ShortCreatorResources;
const {latticeState,lineTrace}=context.window.ShortCreatorBackdrops;

test('trust cells preserve the source wall delay and the spring scale overshoot',()=>{
  assert.equal(markState('logo-wall',.2).opacity,0);
  assert.ok(Math.abs(markState('logo-wall',(.15+.275)/.7).opacity-.875)<1e-12);
  assert.equal(markState('spring-pop',.5).opacity,1);
  assert.ok(markState('spring-pop',.6).scale>1);
  for(const style of ['standard','logo-wall','spring-pop']) {
    assert.equal(markState(style,0).opacity,0);
    assert.equal(JSON.stringify(markState(style,1)),JSON.stringify({opacity:1,scale:1}));
    for(let frame=0;frame<=24;frame++) {
      const s=markState(style,frame/24);assert.ok(s.opacity>=0&&s.opacity<=1);
      assert.ok(s.scale>=.9&&s.scale<1.011);
      markState(style,1);assert.equal(JSON.stringify(s),JSON.stringify(markState(style,frame/24)));
    }
  }
  assert.throws(()=>markState('arbitrary',.5));
});

test('success mark retains pop then delayed draw and cannot turn an unchecked item into success',()=>{
  assert.equal(successState(.12/.54,true).draw,0);
  assert.ok(Math.abs(successState((.12+.21)/.54,true).draw-.875)<1e-12);
  assert.equal(successState(0,true).scale,.72);
  for(const checked of [false,true])for(let frame=0;frame<=24;frame++) {
    const state=successState(frame/24,checked);
    assert.ok(Object.values(state).every(Number.isFinite));
    assert.ok(state.opacity>=0&&state.opacity<=1&&state.blur>=0);
    if(!checked)assert.equal(state.draw,0);
    successState(1,!checked);assert.equal(JSON.stringify(state),JSON.stringify(successState(frame/24,checked)));
  }
  assert.equal(successState(1,true).draw,1);assert.equal(successState(1,false).draw,0);
  for(const checked of [false,true]) {
    const s=successState(1,checked);assert.equal(s.scale,1);assert.equal(s.rotation,0);assert.equal(s.blur,0);
  }
});

test('lattice uses the original 5 by 8 geometry with a center-first stagger',()=>{
  assert.ok(latticeState(19,.1).opacity>0);assert.equal(latticeState(0,.1).opacity,0);
  for(let i=0;i<40;i++) {
    assert.equal(latticeState(i,0).opacity,0);
    const end=latticeState(i,1);assert.equal(end.opacity,1);assert.equal(end.scale,1);
    assert.equal(end.x,i%8*56);assert.equal(end.y,Math.floor(i/8)*56);
    for(let f=0;f<=24;f++) {
      const s=latticeState(i,f/24),mirror=latticeState(39-i,f/24);
      assert.equal(s.opacity,mirror.opacity);assert.equal(s.scale,mirror.scale);
      latticeState(i,1);assert.equal(JSON.stringify(s),JSON.stringify(latticeState(i,f/24)));
    }
  }
  for(const i of [-1,40,.5])assert.throws(()=>latticeState(i,.5));
});

test('line draw uses the source quartic in-out without a perpetual loader',()=>{
  assert.equal(lineTrace(0),900);assert.equal(lineTrace(.5),450);assert.equal(lineTrace(1),0);
  assert.equal(lineTrace(3),0);assert.equal(lineTrace(.25),900*(1-8*.25**4));
  let prior=900;
  for(let f=0;f<=24;f++){const dash=lineTrace(f/24);assert.ok(dash<=prior&&dash>=0);prior=dash;}
});
