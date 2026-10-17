import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-swap-catalog.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorSwapCatalog;
test('physical exits retain distinct source trajectories and opaque outgoing images',()=>{
  const toss=api.state('catalog-physical-toss',.42),drop=api.state('catalog-physical-drop',.42);
  assert.equal(toss.a.x,.34);assert.equal(toss.a.y,-.36);assert.equal(toss.a.rotation,8);
  assert.equal(drop.a.x,0);assert.ok(drop.a.y>0);assert.ok(drop.a.rotation>0);
  const slide=api.state('catalog-physical-slide',.72);
  assert.equal(slide.a.x,.9);assert.equal(slide.a.skew,-12);assert.equal(slide.a.sx,1.08);
  for(const kind of ['toss','drop','slide'])for(let f=1;f<24;f++) {
    const s=api.state('catalog-physical-'+kind,f/24);assert.equal(s.a.alpha,1);assert.equal(s.b.alpha,1);
  }
});
test('rubber resistance uses the five authored equal-time displacements',()=>{
  for(const [index,value] of [.05,.085,.105,.1175,.1225].entries()) {
    const p=(index+1)*.25/2.5,left=api.state('catalog-rubber-left',p),up=api.state('catalog-rubber-up',p);
    assert.ok(Math.abs(left.a.x-value)<1e-10);assert.ok(Math.abs(up.a.y-value)<1e-10);
  }
  for(const direction of ['left','up']) {
    const s=api.state('catalog-rubber-'+direction,1.55/2.5);assert.ok(s.layers.every(l=>l.alpha===.7));
    const end=api.state('catalog-rubber-'+direction,.99);assert.equal(end.b.scale,1);assert.equal(end.b.alpha,1);
  }
});
test('morph registers retain common origin and different source silhouettes',()=>{
  const c=api.state('catalog-condense',.35/.75),r=api.state('catalog-reshape',.6/1.05);
  assert.equal(c.a.scale,.72);assert.equal(c.a.alpha,0);
  assert.ok(Math.abs(r.a.sx-.68)<1e-12);assert.ok(Math.abs(r.a.sy-1.34)<1e-12);
  for(const s of [c,r]) {assert.equal(s.a.origin,'50% 50%');assert.equal(s.b.origin,'50% 50%');}
});
test('page slide carries the outgoing panel and spectral directions clip the corresponding edge',()=>{
  const page=api.state('catalog-page-slide',.5);
  assert.equal(page.a.x,-.14);assert.equal(page.a.scale,.97);assert.equal(page.b.x,.5);
  const expected={left:'inset(0% 50% 0% 0%)',right:'inset(0% 0% 0% 50%)',
    up:'inset(50% 0% 0% 0%)',down:'inset(0% 0% 50% 0%)'};
  for(const [direction,clip] of Object.entries(expected))assert.equal(api.state('catalog-spectral-'+direction,.5).b.clip,clip);
});
