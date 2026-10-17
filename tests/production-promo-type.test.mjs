import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-promo-type.js',import.meta.url),'utf8'),context);
const {layouts,titleState,glyphState}=context.window.ShortCreatorPromoType;
const plain=x=>JSON.parse(JSON.stringify(x));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('hook preserves the delayed kicker, overshoot and later subtitle',()=>{
  assert.equal(titleState('promo-hook',.2/1.5).kicker,0);
  assert.equal(titleState('promo-hook',.5/1.5).title,0);
  assert.ok(titleState('promo-hook',1.05/1.5).titleScale>1);
  assert.equal(titleState('promo-hook',.9/1.5).subtitle,0);
  near(titleState('promo-hook',1).kickerY,-30);
});
test('grid slides in before its individual shapes and words',()=>{
  assert.equal(titleState('promo-grid',0).boardX,1);
  near(titleState('promo-grid',.5/1.8).boardX,2**-5);
  assert.equal(titleState('promo-grid',1/1.8).circle,0);
  assert.equal(titleState('promo-grid',1.2/1.8).square,0);
  near(titleState('promo-grid',1).circleScale,1.2);
  near(titleState('promo-grid',1).squareRotation,45);
});
test('offset, pair and close retain different source timelines',()=>{
  near(titleState('promo-offset',.1/1.1).titleY,200);
  near(titleState('promo-offset',.4/1.1).titleY,200/32);
  near(titleState('promo-offset',1).subtitleX,-50);
  assert.equal(titleState('promo-pair',.6/1.5).rule,0);
  assert.equal(titleState('promo-pair',.9/1.5).subtitle,0);
  assert.ok(titleState('promo-pair',1.3/1.5).subtitleY<0);
  assert.equal(titleState('promo-close',.3/1.1).title,0);
  assert.equal(titleState('promo-close',.5/1.1).subtitle,0);
  near(titleState('promo-close',.7/1.1).rule,0);
});
test('all title states settle and reconstruct at every native frame',()=>{
  for(const layout of layouts) {
    const states=Array.from({length:25},(_,i)=>plain(titleState(layout,i/24)));
    for(let i=24;i>=0;i--)assert.deepEqual(plain(titleState(layout,i/24)),states[i]);
    for(const state of states)assert.ok(Object.values(state).every(Number.isFinite));
    const end=titleState(layout,1);near(end.kicker,1);near(end.title,1);near(end.subtitle,1);near(end.titleScale,1);near(end.titleY,0);
    assert.deepEqual(plain(titleState(layout,8)),plain(end));
  }
  for(const layout of ['custom','../promo-hook',null])assert.throws(()=>titleState(layout,1));
  for(const p of [NaN,Infinity])assert.throws(()=>titleState('promo-hook',p));
});
test('glyphs rotate once, wipe once and draw three staggered lines',()=>{
  near(glyphState(0,0).rotation,45);near(glyphState(.5,0).rotation,135);near(glyphState(1,0).rotation,225);
  near(glyphState(.5,1).wipe,.5);near(glyphState(1,1).wipe,1);
  const middle=glyphState(.5,2).lines;assert.ok(middle[0]>middle[1]&&middle[1]>middle[2]);
  assert.deepEqual(plain(glyphState(1,2).lines),[1,1,1]);
  for(let glyph=0;glyph<3;glyph++) {
    const states=Array.from({length:25},(_,i)=>plain(glyphState(i/24,glyph)));
    for(let i=24;i>=0;i--)assert.deepEqual(plain(glyphState(i/24,glyph)),states[i]);
    assert.equal(states[0].alpha,0);assert.equal(states[24].alpha,1);
  }
  for(const index of [-1,3,.5])assert.throws(()=>glyphState(1,index));
});
