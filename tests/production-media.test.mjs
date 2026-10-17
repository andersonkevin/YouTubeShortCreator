import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-media.js',import.meta.url),'utf8'),context);
const {rects,state}=context.window.ShortCreatorMedia;
test('all media recipes fit their fixed canvases with distinct non-overlapping cells',()=>{
  const counts={solo:1,'2up':2,'3up':3,'4up':4,'3x2':6,hero:3};
  for(const [w,h,stacked] of [[1720,475,false],[960,460,false],[940,910,true],[960,620,true]]) {
    for(const [layout,count] of Object.entries(counts)) {
      const boxes=rects(layout,w,h,stacked);assert.equal(boxes.length,count);
      boxes.forEach((a,i)=>{
        assert.ok(a.x>=32&&a.y>=32&&a.x+a.w<=w-32+1e-8&&a.y+a.h<=h-32+1e-8);
        assert.ok(a.w>200&&a.h>140,'Cell must retain useful image and label space');
        for(const b of boxes.slice(i+1))assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
      });
    }
  }
});
test('hero recipe preserves its source ratio and rotates only for tall profiles',()=>{
  const wide=rects('hero',1720,475),tall=rects('hero',940,910,true);
  assert.equal(wide[0].w,Math.round((1720-64-24)*.58));assert.equal(wide[0].h,475-64);
  assert.equal(tall[0].h,Math.round((910-64-24)*.58));assert.equal(tall[0].w,940-64);
  assert.equal(wide[1].x,wide[2].x);assert.equal(tall[1].y,tall[2].y);
});
test('media entries settle, retain opposite book tilts and reproduce arbitrary seeks',()=>{
  for(const treatment of ['box','gloss','spotlight','book-open'])for(const i of [0,1]) {
    const end=state(treatment,1,i,960,620);
    assert.equal(end.opacity,1);assert.equal(end.scale,1);assert.equal(Math.abs(end.x),0);assert.equal(Math.abs(end.y),0);assert.equal(end.light,0);
    assert.equal(end.angle,treatment==='book-open'?(i===0?18:-18):0);
    for(const p of [0,.5,1,.25,.75,0]) {
      const a=state(treatment,p,i,960,620);state(treatment,1,i,960,620);
      assert.equal(JSON.stringify(a),JSON.stringify(state(treatment,p,i,960,620)));
      assert.ok(Object.values(a).every(Number.isFinite));assert.ok(a.light>=0&&a.light<=1);
    }
    assert.equal(JSON.stringify(end),JSON.stringify(state(treatment,2,i,960,620)));
  }
  assert.ok(state('book-open',0,0,960,620).x<0);assert.ok(state('book-open',0,1,960,620).x>0);
});
test('one gloss sweep follows landing and spotlight finishes without idle light',()=>{
  assert.equal(state('gloss',.4,0,960,620).light,0);
  assert.equal(state('gloss',.5,0,960,620).light,1);
  assert.equal(state('gloss',1,0,960,620).sweep,130);
  let last=-30;
  for(let f=0;f<=24;f++){const value=state('gloss',f/24,0,960,620).sweep;assert.ok(value>=last);last=value;}
  assert.equal(state('spotlight',.5,0,960,620).light,1);
  assert.equal(state('spotlight',0,0,960,620).light,0);assert.equal(state('spotlight',1,0,960,620).light,0);
  assert.throws(()=>rects('arbitrary',960,620));assert.throws(()=>state('arbitrary',.5,0,960,620));
});
