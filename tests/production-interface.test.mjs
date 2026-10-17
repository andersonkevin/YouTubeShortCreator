import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-interface.js',import.meta.url),'utf8'),context);
const {activeAt,notificationY,typed}=context.window.ShortCreatorInterface;
const {typingAt}=context.window.ShortCreatorInterface;
test('interfaces reveal only on their supplied cue and support backward seeks',()=>{
  const cues=[.5,2.5,4.5,6.5];
  for(const [time,index] of [[0,-1],[.5,0],[2.4,0],[2.5,1],[7,3],[4.5,2],[0,-1]])assert.equal(activeAt(time,cues),index);
});
test('new notifications occupy the top while older cards shift without overlap',()=>{
  const height=110,gap=16;
  for(let active=0;active<4;active++)for(const p of [0,.1,.5,.9,1]) {
    const y=Array.from({length:active+1},(_,i)=>notificationY(i,active,p,height,gap));
    for(let i=0;i<y.length-1;i++)assert.ok(y[i]-y[i+1]>=height-1e-8);
    if(p===1){assert.equal(y.at(-1),0);assert.equal(y[0],active*(height+gap));}
  }
});
test('terminal type-on preserves complete graphemes and exact supplied text',()=>{
  for(const text of ['python3 render.py','cafe\u0301','a\u0308界']) {
    assert.equal(typed(text,0),'');assert.equal(typed(text,1),text);
    const valid=new Set(['',...Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),part=>text.slice(0,part.index+part.segment.length))]);
    for(let i=0;i<=24;i++)assert.ok(valid.has(typed(text,i/24)));
    assert.equal(typed(text,.5),typed(text,.5));
  }
});
test('typing dots are limited to the wait before an explicit received message',()=>{
  const onsets=[.5,4.5,8.5],items=[{side:'sent'},{side:'received'},{side:'sent'}];
  assert.equal(typingAt(0,onsets,items).index,-1);
  assert.equal(typingAt(1.3,onsets,items).index,1);
  assert.ok(typingAt(1.7,onsets,items).dots.some(y=>y<0));
  assert.ok(typingAt(4.3,onsets,items).dots.every(y=>y===0));
  assert.equal(typingAt(4.5,onsets,items).index,-1);
  assert.equal(typingAt(8,onsets,items).index,-1);
  const frames=Array.from({length:300},(_,i)=>JSON.stringify(typingAt(i/30,onsets,items)));
  for(let i=299;i>=0;i--)assert.equal(JSON.stringify(typingAt(i/30,onsets,items)),frames[i]);
});
test('interface selection and typing dismiss on the same late fractional frame',()=>{
  const onsets=[63.4,65.4],first=Math.ceil(onsets[1]*30),items=[{side:'sent'},{side:'received'}];
  assert.equal(activeAt((first-1)/30,onsets),0);assert.equal(activeAt(first/30,onsets),1);
  assert.equal(typingAt((first-1)/30,onsets,items).index,1);assert.equal(typingAt(first/30,onsets,items).index,-1);
});
