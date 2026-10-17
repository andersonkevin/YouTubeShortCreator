import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
for(const name of ['production-annotation-ink','production-title-designs','production-type'])vm.runInNewContext(
  fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const {roughUnderline,cloudPath,wavePath,typingState,emphasisState,noteState}=context.window.ShortCreatorTitleDesigns;
const plain=value=>JSON.parse(JSON.stringify(value));
test('source handwritten paths are deterministic and differ by tail orientation',()=>{
  for(const [w,h] of [[1720,462],[940,1072],[960,462],[960,692]]) {
    const underline=roughUnderline(w),cloud=cloudPath(w,h,'left'),wave=wavePath(w,h);
    for(const value of [underline,cloud,wave])assert.doesNotMatch(value,/NaN|Infinity|undefined/);
    assert.equal(underline,roughUnderline(w));assert.equal(cloud,cloudPath(w,h,'left'));
    assert.notEqual(cloud,cloudPath(w,h,'right'));
    assert.equal((cloud.match(/ Q/g)||[]).length,18);assert.ok(wave.includes(' S '));
  }
  assert.throws(()=>cloudPath(900,400,'custom'));
});
test('both typed layouts reveal exact grapheme counts and settle every endpoint',()=>{
  for(const kind of ['speech-cloud','path-wave'])for(const count of [1,8,18,28]) {
    assert.ok(typingState(kind,0,count).letters.every(v=>v===0));
    const end=typingState(kind,1,count);assert.equal(end.draw,1);assert.ok(end.letters.every(v=>v===1));
    assert.equal(end.letters.length,count);assert.equal(end.fill,kind==='speech-cloud'?.94:0);
    const states=Array.from({length:25},(_,i)=>plain(typingState(kind,i/24,count)));
    for(let i=24;i>=0;i--)assert.deepEqual(plain(typingState(kind,i/24,count)),states[i]);
    for(let i=1;i<25;i++)states[i].letters.forEach((v,j)=>assert.ok(v>=states[i-1].letters[j]&&v<=1));
  }
});
test('word highlight advances one scalar across the supplied words',()=>{
  const state=context.window.ShortCreatorType.wordState;
  assert.equal(state('word-highlight',0,0,4).opacity,.32);
  assert.equal(state('word-highlight',.25,0,4).opacity,1);
  assert.equal(state('word-highlight',.25,1,4).opacity,.32);
  assert.ok(Math.abs(state('word-highlight',.375,1,4).opacity-.66)<1e-12);
  for(let i=0;i<4;i++)assert.deepEqual(plain(state('word-highlight',1,i,4)),{y:0,scale:1,opacity:1,blur:0});
});
test('callout connector and note follow the marker and settle without idle motion',()=>{
  assert.deepEqual(plain(noteState(0)),{draw:0,connector:0,note:0,scale:1});
  assert.deepEqual(plain(noteState(1)),{draw:1,connector:1,note:1,scale:1});
  assert.equal(noteState(.3).connector,0);assert.equal(noteState(.6).note,0);
  assert.ok(noteState(.7).note>0);
  for(let i=0;i<=100;i++) {
    const s=noteState(i/100);assert.ok(Object.values(s).every(Number.isFinite));
    assert.ok(s.draw>=0&&s.draw<=1&&s.connector>=0&&s.connector<=1&&s.note>=0&&s.note<=1&&s.scale>=1&&s.scale<=1.045);
  }
});
test('decorative source word moves once and remains settled after the cue',()=>{
  assert.deepEqual(plain(emphasisState(0)),{x:40,opacity:0});
  assert.deepEqual(plain(emphasisState(1)),{x:-60,opacity:1});
  assert.deepEqual(plain(emphasisState(4)),plain(emphasisState(1)));
  for(let i=1;i<=24;i++)assert.ok(emphasisState(i/24).x<emphasisState((i-1)/24).x);
});
