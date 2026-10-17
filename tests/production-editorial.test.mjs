import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
for(const name of ['production-annotation-ink','production-hand-layouts','production-closings'])vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const {frameState,pipelineState,sparks,connector}=context.window.ShortCreatorHandLayouts;
const {state,channelState}=context.window.ShortCreatorClosings;
const plain=x=>JSON.parse(JSON.stringify(x));
test('hand frame reveals border, image, sparks and caption in source order',()=>{
  const start=frameState(0),end=frameState(1);
  assert.equal(start.media,0);assert.equal(start.border,0);assert.equal(start.caption,0);
  assert.equal(end.media,1);assert.equal(end.scale,1);assert.equal(end.border,1);assert.equal(end.caption,1);
  assert.deepEqual(plain(end.doodles),[1,1,1]);
  const middle=frameState(.5);assert.ok(middle.border>middle.media);assert.equal(middle.caption,0);
  assert.equal((sparks(80,80,0).match(/M /g)||[]).length,3);
});
test('pipeline draws the incoming connector before its next box and label',()=>{
  assert.deepEqual(plain(pipelineState(1,0)),{connector:0,box:1,label:1});
  assert.deepEqual(plain(pipelineState(1,3)),{connector:1,box:1,label:1});
  const early=pipelineState(.25,1);assert.ok(early.connector>0);assert.equal(early.box,0);assert.equal(early.label,0);
  for(const vertical of [false,true])for(const gap of [24,42,48,190]) {
    const d=connector(100,100,gap,0,vertical);assert.ok(!/NaN|Infinity/.test(d));assert.equal((d.match(/M /g)||[]).length,3);assert.ok(d.includes(' Q '));
  }
});
test('shared box geometry preserves every existing annotation output',()=>{
  const ink=context.window.ShortCreatorAnnotationInk;
  for(const [w,h,seed] of [[200,80,11],[960,620,14],[32,32,4]])assert.equal(ink.pathData('hand-box',w,h,seed),ink.box(w,h,seed));
  assert.notEqual(ink.box(960,620,14),ink.box(960,620,14,18,5));
});
test('closing choreography settles exact text units and a single impact frame',()=>{
  for(const style of ['capsule','brand-close','sting'])for(const n of [1,2,6,24]) {
    const end=state(style,1,n,true);assert.ok(end.units.every(a=>a===1));assert.equal(end.scale,1);assert.equal(end.action,1);assert.equal(end.label,1);assert.equal(end.actionScale,1);assert.equal(end.actionY,0);
  }
  assert.deepEqual(Array.from({length:25},(_,i)=>state('sting',i/24,0).flash).filter(Boolean),[1]);
  assert.equal(state('sting',1,0).ringOpacity,0);
  assert.throws(()=>state('custom',.5,4));
});
test('channel button uses explicit source press and release without accumulating motion',()=>{
  assert.deepEqual(plain(channelState(0)),{scale:1,before:1,after:0});
  assert.deepEqual(plain(channelState(1)),{scale:1,before:0,after:1});
  assert.equal(channelState(.15/.55).scale,.92);
  for(let f=0;f<=24;f++){const s=channelState(f/24);assert.ok(s.scale>=.92&&s.scale<1.04);assert.ok(s.before>=0&&s.before<=1&&s.after>=0&&s.after<=1);}
});
test('new editorial states are finite and exactly repeatable on reverse seek',()=>{
  const helpers=[frameState,p=>pipelineState(p,2),channelState,...['capsule','brand-close','sting'].map(kind=>p=>state(kind,p,13,true))];
  const finite=x=>typeof x==='number'?Number.isFinite(x):Object.values(x).every(finite);
  for(const helper of helpers) {
    const expected=Array.from({length:25},(_,i)=>plain(helper(i/24)));assert.ok(expected.every(finite));
    for(const i of [24,0,12,1,23,5,18,0,24])assert.deepEqual(plain(helper(i/24)),expected[i]);
  }
});
