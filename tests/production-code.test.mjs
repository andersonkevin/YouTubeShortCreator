import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const window={};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-code.js',import.meta.url),'utf8'),{window,Intl});
const api=window.ShortCreatorCode,plain=value=>JSON.parse(JSON.stringify(value));

test('LCS reconstructs both exact versions, preserving duplicates, spaces and blank lines',()=>{
  const pairs=[[['a','x','a',''],['a','a','y','']], [[],['only']], [['only'],[]],
    [['  const a = 1;','return a;'],['  const a = 2;','return a;']], [['a','b'],['b','a']]];
  for(const [before,after] of pairs) {
    const ops=api.diff(before,after);
    assert.deepEqual(plain(ops.filter(op=>op.type!=='add').map(op=>before[op.before])),before);
    assert.deepEqual(plain(ops.filter(op=>op.type!=='del').map(op=>after[op.after])),after);
    for(const op of ops.filter(op=>op.type==='same'))assert.equal(before[op.before],after[op.after]);
  }
  assert.equal(api.diff(['a','b'],['b','a'])[0].type,'del');
});

test('diff collapses deletions before additions and never needs extra document height',()=>{
  for(const [before,after] of [[['a','b','c'],['d','e']], [['a','b'],['a','x','b','y']],
    [Array.from({length:8},(_,i)=>'old'+i),Array.from({length:8},(_,i)=>'new'+i)]]) {
    const ops=api.diff(before,after),samples=[];
    for(let frame=0;frame<=240;frame++) {
      const rows=api.diffState(ops,frame/240),height=rows.reduce((total,row)=>total+row.height,0);
      assert.ok(height<=Math.max(before.length,after.length)+1e-9);
      assert.ok(rows.every(row=>Number.isFinite(row.y)&&row.height>=0&&row.height<=1));
      if(rows.some(row=>row.type==='add'&&row.height>0))assert.ok(rows.filter(row=>row.type==='del').every(row=>row.height===0));
      samples.push(plain(rows));
    }
    for(let frame=240;frame>=0;frame--)assert.deepEqual(plain(api.diffState(ops,frame/240)),samples[frame]);
    assert.deepEqual(plain(api.diffState(ops,0).filter(row=>row.height===1).map(row=>before[row.before])),before);
    assert.deepEqual(plain(api.diffState(ops,1).filter(row=>row.height===1).map(row=>after[row.after])),after);
  }
});

test('typing retains graphemes and literal markup, with exact clean endpoints',()=>{
  const text='  cafe\u0301 <script>x()</script> = 42;';
  assert.equal(api.graphemes(text).join(''),text);
  assert.equal(api.lexemes(text).join(''),text);
  assert.ok(api.graphemes(text).includes('e\u0301'));
  assert.ok(api.typingState(text,0).alphas.every(a=>a===0));
  assert.ok(api.typingState(text,1).alphas.every(a=>a===1));
  assert.equal(api.typingState(text,1).active,false);
  for(let frame=0;frame<24;frame++) {
    const current=api.typingState(text,frame/24),next=api.typingState(text,(frame+1)/24);
    assert.ok(current.alphas.every((alpha,i)=>alpha<=next.alphas[i]));
  }
  assert.deepEqual(plain(api.typingState('',1).alphas),[]);
  for(const style of ['workbench','terminal']) {
    for(const p of [0,.1,.5,.9,1])assert.ok(api.typingState(text,p,style).alphas.every(a=>a===0||a===1));
    assert.ok(api.typingState(text,0,style).alphas.every(a=>a===0));
    assert.ok(api.typingState(text,1,style).alphas.every(a=>a===1));
  }
});

test('scroll centers interior targets and clamps document edges in every viewport recipe',()=>{
  for(const [line,height] of [[42,363],[42,368],[72,759],[56,508]]) {
    assert.equal(api.scrollTarget(0,line,height,32),0);
    assert.equal(api.scrollTarget(31,line,height,32),height-32*line);
    assert.equal(api.scrollTarget(16,line,height,32)+(16+.5)*line,height/2);
    assert.equal(api.scrollTarget(0,line,height,1),0);
  }
});
