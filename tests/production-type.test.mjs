import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-type.js',import.meta.url),'utf8'),context);
const {graphemes,streamStarts,stagger,shake,glyphState,headlineState}=context.window.ShortCreatorType;
test('glyph splitting retains accents, joined emoji and exact source whitespace',()=>{
  for(const text of ['Cafe\u0301  & code','Café → approve','👩🏽‍💻 review','👨‍👩‍👧‍👦'])assert.equal(graphemes(text).join(''),text);
  assert.equal(graphemes('e\u0301').length,1);assert.equal(graphemes('👩🏽‍💻').length,1);
});
test('glyph treatments settle exactly and reproduce arbitrary reverse seeks',()=>{
  for(const kind of ['bottom-up','top-down','char-slam','tracking-in'])for(const length of [1,12,52])for(let index=0;index<length;index++) {
    const end=glyphState(kind,1,index,length);
    assert.ok(Math.abs(end.x)<1e-10&&Math.abs(end.y)<1e-10&&Math.abs(end.angle)<1e-10);
    assert.equal(end.scale,1);assert.equal(end.opacity,1);
    for(const p of [0,.25,.5,.75,1,.1]) {
      const state=glyphState(kind,p,index,length);glyphState(kind,1,index,length);
      assert.equal(JSON.stringify(state),JSON.stringify(glyphState(kind,p,index,length)));
      assert.ok(Object.values(state).every(Number.isFinite));assert.ok(state.opacity>=0&&state.opacity<=1);
      assert.ok(state.scale>=.8&&state.scale<=1.03);
    }
  }
  assert.ok(glyphState('bottom-up',0,0,5).y>0);assert.ok(glyphState('top-down',0,0,5).y<0);
});
test('tracking contracts toward each line center without changing its final positions',()=>{
  for(const length of [2,10,52]) {
    const left=glyphState('tracking-in',0,0,length),right=glyphState('tracking-in',0,length-1,length);
    assert.equal(left.x,-right.x);assert.ok(left.x<0&&right.x>0);
    let previous=right.x;
    for(let f=1;f<=24;f++) {const x=glyphState('tracking-in',f/24,length-1,length).x;assert.ok(x<=previous);previous=x;}
  }
});
test('slam impact occupies three fixed frames then holds still',()=>{
  assert.equal(headlineState(0).scale,1.6);assert.equal(headlineState(0).opacity,0);
  assert.equal(headlineState(1).scale,1);assert.equal(headlineState(1).opacity,1);
  for(const start of [18,21]) {
    assert.equal(shake((start-1)/24,start).x,0);assert.equal(shake(start/24,start).x,4);
    assert.equal(shake((start+1)/24,start).x,-3);assert.equal(shake((start+2)/24,start).x,0);
    assert.equal(shake(1,start).x,0);
  }
});
test('token bursts keep source order, simultaneous arrivals and a fully inked endpoint',()=>{
  for(const length of [1,6,30,52]) {
    const starts=streamStarts(length);assert.equal(starts.length,length);assert.equal(starts[0],0);
    assert.ok(starts.every((t,i)=>t>=0&&t<=.65&&(i===0||t>=starts[i-1])));
    assert.ok(starts.every(t=>(1-t)/.35>=1));
    if(length>2)assert.equal(starts[1],starts[2]);
    for(let i=0;i<length;i++){assert.equal(stagger(0,i,length),0);assert.equal(stagger(1,i,length),1);}
  }
});
