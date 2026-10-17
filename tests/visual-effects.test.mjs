import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{},structuredClone};
for(const path of ['../templates/v1/assets/visual-effects.js','../tools/visual_library/options.js'])
  vm.runInNewContext(fs.readFileSync(new URL(path,import.meta.url),'utf8'),context);
const {progress,cascade}=context.window.ShortCreatorEffects;
const flow=JSON.parse(fs.readFileSync(new URL('../tools/visual_library/widgets.json',import.meta.url))).charts[0];
const options=context.window.ShortCreatorVisualOptions;

test('effect uses frame-rounded cue onset, clamps and rejects nonfinite values',()=>{
  assert.equal(progress(.101,.101,12),0);
  assert.equal(progress(4/30,.101,12),0);
  assert.equal(progress(10/30,.101,12),.5);
  assert.equal(progress(16/30,.101,12),1);
  assert.equal(progress(-1,.101,12),0);
  assert.equal(progress(100,.101,12),1);
  for(const args of [[NaN,0,12],[0,Infinity,12],[0,0,0]])assert.throws(()=>progress(...args));
});
test('semantic cascade preserves graphics and source records at rest',()=>{
  const before=JSON.stringify(flow);
  const classic=options(flow,{scene:true});
  const pilot=options(flow,{scene:true,motionTargets:true});
  assert.equal(pilot.graphic.length,flow.data.steps.length);
  assert.equal(JSON.stringify(pilot.graphic.flatMap(group=>group.children)),JSON.stringify(classic.graphic));
  const settled=cascade(pilot.graphic,1);
  assert.ok(settled.every(group=>group.y===0 && group.children.every(child=>child.style.opacity===1)));
  assert.equal(JSON.stringify(flow),before);
});
test('cascade is ordered and seeking backwards has no state accumulation',()=>{
  const groups=options(flow,{scene:true,motionTargets:true}).graphic;
  const original=JSON.stringify(groups);
  const a=cascade(groups,.2);
  assert.ok(a[0].children[0].style.opacity>a.at(-1).children[0].style.opacity);
  assert.equal(a.at(-1).children[0].style.opacity,0);
  assert.equal(a.at(-1).y,24);
  cascade(groups,1);
  cascade(groups,0);
  assert.deepEqual(cascade(groups,.2),a);
  assert.equal(JSON.stringify(groups),original);
});
test('mount commits each changed cascade state before capture and avoids repeated repaint',()=>{
  const applied=[];
  let flushed=0;
  const chart={setOption(value){applied.push(value);},getZr(){return {flush(){flushed++;}};}};
  const mounted=context.window.ShortCreatorEffects.mount({chart,options:options(flow,{scene:true,motionTargets:true}),
    effects:[{preset:'cascade-v1',cue:0,duration_frames:24}],cues:[{start:.1}]});
  mounted.renderAt(.3);
  const first=JSON.stringify(applied.at(-1));
  mounted.renderAt(.3);
  assert.equal(applied.length,1);
  mounted.renderAt(2);
  mounted.renderAt(.3);
  assert.equal(JSON.stringify(applied.at(-1)),first);
  assert.equal(flushed,applied.length);
});
