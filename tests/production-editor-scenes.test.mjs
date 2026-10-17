import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const file of ['production-editor-scenes.js','production-headline-panels.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file,import.meta.url),'utf8'),context);
const {vectorState,captionArc,stickyState,path,anchors}=context.window.ShortCreatorEditorScenes;
const {state,splitText}=context.window.ShortCreatorHeadlinePanels;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('vector path draws before the selection settles, with the five authored nodes',()=>{
  assert.equal(anchors.length,5);assert.match(path,/^M 140 350 C/);
  close(vectorState(.1/1.2).draw,0);close(vectorState(1.05/1.2).draw,1);
  close(vectorState(.82/1.2).selection,0);close(vectorState(1.05/1.2).selection,1);
  const end=vectorState(1);assert.equal(end.entry,1);assert.equal(end.fill,.08);assert.ok(end.nodes.every(x=>x===1));
  let previous=vectorState(0);
  for(let f=1;f<=24;f++){const s=vectorState(f/24);assert.ok(s.draw>=previous.draw);s.nodes.forEach((v,i)=>assert.ok(v>=previous.nodes[i]));previous=s;}
  assert.throws(()=>vectorState(NaN));
});
test('pinned caption arcs join continuously and retain the source overshoot',()=>{
  for(const exiting of [false,true]) {
    const split=exiting?.32:.72,at=captionArc(split,exiting);
    for(const p of [split-1e-8,split+1e-8]) {
      const s=captionArc(p,exiting);for(const key of ['x','y','opacity'])assert.ok(Math.abs(s[key]-at[key])<1e-5);
    }
  }
  const arrived=captionArc(1);close(arrived.x,0);close(arrived.y,0);close(arrived.opacity,1);
  close(captionArc(.72).x,.45);close(captionArc(.72).y,-.28);
  const gone=captionArc(1,true);close(gone.x,-1.1);close(gone.y,-4.5);close(gone.opacity,0);
});
test('pinned mock has a readable hold, leaves before the next cue and crossfades in place',()=>{
  const onsets=[.4,2.4,4.4];
  assert.equal(stickyState(.39,onsets,0).visible,false);
  const hold=stickyState(1.4,onsets,0);close(hold.copy.opacity,1);close(hold.copy.x,0);assert.equal(hold.exit,0);
  const exit=stickyState(2.2,onsets,0);assert.ok(exit.exit>0&&exit.copy.opacity<1);assert.equal(exit.mockOpacity,1);
  close(stickyState(2.4,onsets,0).copy.opacity,0);
  assert.equal(stickyState(2.4,onsets,1).mockOpacity,0);
  assert.equal(stickyState(3.2,onsets,0).visible,false);assert.equal(stickyState(3.2,onsets,1).mockOpacity,1);
  assert.equal(stickyState(9,onsets,2).exit,0);assert.equal(stickyState(9,onsets,2).copy.opacity,1);
  assert.throws(()=>stickyState(0,onsets,3));
});
test('split panel preserves word boundaries, spaces, casing and graphemes',()=>{
  for(const text of ['Café & code','Two  words','e\u0301 👩🏽‍💻 together','Single']) {
    const parts=splitText(text);assert.equal(parts.join(''),text);assert.equal(parts.length,2);
    if(parts[1])assert.ok(/\s$/u.test(parts[0]));
  }
  const end=state(1);assert.equal(end.oldVisible,false);assert.equal(end.sx,1);assert.equal(end.sy,1);assert.equal(end.radius,0);assert.equal(end.ink,1);
  const panel=state(1.05/2.2);close(panel.sx,.46);close(panel.sy,.14);close(panel.y,-.2);
  const corner=state((1.05+.42*1.15)/2.2);close(corner.x,.03);close(corner.y,-.42);
  close(end.x,-.05);close(end.y,-1.25);assert.throws(()=>state(Infinity));
});
test('all new motions are pure under backward and repeated seeking',()=>{
  for(const p of [0,.125,.65,1,.5,.125,0])for(const fn of [vectorState,captionArc,state]) {
    const expected=JSON.stringify(fn(p));fn(1);fn(0);assert.equal(JSON.stringify(fn(p)),expected);
  }
  for(const t of [0,.4,1.2,2.3,2.4,2.8,6,1.2]) {
    const expected=JSON.stringify(stickyState(t,[.4,2.4,4.4],1));stickyState(8,[.4,2.4,4.4],1);
    assert.equal(JSON.stringify(stickyState(t,[.4,2.4,4.4],1)),expected);
  }
});
