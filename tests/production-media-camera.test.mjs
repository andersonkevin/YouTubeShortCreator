import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const name of ['production-media','production-media-camera'])vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const {state,parallax,kinds}=context.window.ShortCreatorMediaCamera;
const plain=x=>JSON.parse(JSON.stringify(x));
test('source push intensities and pull-back phases preserve exact endpoints',()=>{
  for(const [intensity,scale] of [['subtle',1.08],['standard',1.12],['bold',1.18]]) {
    assert.equal(state('push-in',0,0,1920,1080,{intensity}).scale,1);
    assert.equal(state('push-in',1,0,1920,1080,{intensity}).scale,scale);
  }
  assert.equal(state('pull-back',0).scale,2.2);
  assert.equal(state('pull-back',.2).scale,2.2);
  assert.equal(state('pull-back',1.75/2.4).scale,1.055);
  assert.equal(state('pull-back',1).scale,1);assert.equal(state('pull-back',1).y,0);
  assert.throws(()=>state('push-in',1,0,1920,1080,{intensity:'custom'}));
});
test('camera reset starts at the punch endpoint and returns without residual blur',()=>{
  const end=state('punch-in',1),start=state('punch-reset',0,0,1920,1080,{reset:true});
  assert.deepEqual(plain(end),plain(start));assert.equal(end.scale,1.11);assert.equal(end.rx,3);assert.equal(end.ry,-2);
  assert.equal(state('punch-in',.45).pulse,1);
  const reset=state('punch-reset',1,0,1920,1080,{reset:true});
  assert.equal(reset.scale,1);assert.equal(Math.abs(reset.y),0);assert.equal(reset.pulse,0);
  assert.equal(state('tilt',1).rx,-7);assert.equal(state('tilt',1).ry,10);
});
test('rack focus transfers clarity while preserving the source transforms',()=>{
  for(const [index,initial,final] of [[0,1.045,.94],[1,.93,1.04]]) {
    assert.equal(state('focus-rack',0,index).scale,initial);assert.equal(state('focus-rack',1,index).scale,final);
  }
  assert.equal(state('focus-rack',0,0).blur,0);assert.equal(state('focus-rack',1,1).blur,0);
  assert.equal(state('focus-rack',1,0).dim,.5);assert.equal(state('focus-rack',0,1).dim,.52);
});
test('parallax focal card remains contained across all profiles and siblings settle',()=>{
  for(const [w,h,tall] of [[1720,475,false],[940,910,true],[960,460,false],[960,620,true]]) {
    const boxes=context.window.ShortCreatorMedia.rects('3up',w,h,tall);
    for(const style of ['parallax-zoom','parallax-unzoom']) {
      for(let f=0;f<=24;f++) {
        const cards=parallax(style,f/24,boxes,w,h,tall),hero=cards[1];
        assert.ok(hero.x>=32&&hero.y>=32&&hero.x+hero.w<=w-32+1e-8&&hero.y+hero.h<=h-32+1e-8);
        assert.equal(hero.alpha,1);assert.equal(hero.scale,1);assert.equal(hero.label,1);
        assert.ok(cards.every(card=>Object.values(card).every(Number.isFinite)&&card.alpha>=0&&card.alpha<=1));
      }
      const end=parallax(style,1,boxes,w,h,tall);
      assert.equal(end[0].alpha,style==='parallax-zoom'?0:1);
      assert.equal(end[0].label,style==='parallax-zoom'?0:1);
    }
    assert.deepEqual(plain(parallax('parallax-zoom',1,boxes,w,h,tall)[1]),plain(parallax('parallax-unzoom',0,boxes,w,h,tall)[1]));
  }
});
test('all camera states are finite, clamped and independent of seek history',()=>{
  for(const kind of kinds)for(const i of [0,1,2]) {
    const expected=Array.from({length:25},(_,f)=>plain(state(kind,f/24,i,940,910)));
    for(const f of [24,0,12,3,22,1,23,6,0,24])assert.deepEqual(plain(state(kind,f/24,i,940,910)),expected[f]);
    assert.ok(expected.every(s=>Object.values(s).every(Number.isFinite)));
    assert.deepEqual(plain(state(kind,2,i,940,910)),expected[24]);
  }
  assert.throws(()=>state('custom',.5));assert.throws(()=>state('tilt',NaN));
});
