import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-answer-rank.js',import.meta.url),'utf8'),context);
const {monogram,typing,leadState,rowState,insertion,layout}=context.window.ShortCreatorAnswerRank;
const plain=x=>JSON.parse(JSON.stringify(x));
test('prompt uses complete graphemes and reaches a stable exact final value',()=>{
  for(const text of ['One choice?','Keep e\u0301 and 👩‍💻 together.','A'.repeat(64)]){
    const boundaries=new Set(['',...[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text)].map(p=>text.slice(0,p.index+p.segment.length))]);
    for(let frame=0;frame<=90;frame++)assert.ok(boundaries.has(typing(text,frame/90).text));
    assert.equal(typing(text,0).text,'');assert.equal(typing(text,1).text,text);assert.equal(typing(text,1).caret,false);
    assert.deepEqual(plain(typing(text,1)),plain(typing(text,60)));
  }
  assert.equal(monogram('Clear Choice'),'CC');assert.equal(monogram('e\u0301clair'),'E\u0301');
});
test('thinking stops before the lead and each row follows the authored stagger',()=>{
  const lead='Here are explicit choices';
  assert.equal(leadState(lead,0).thinking,0);
  assert.ok(leadState(lead,.2).thinking>0);
  const end=leadState(lead,1);assert.equal(end.thinking,0);assert.equal(end.star,1);assert.ok(end.words.every(Boolean));
  assert.ok(rowState(.3,0).entry>rowState(.3,1).entry);assert.equal(rowState(.3,2).entry,0);
  for(let i=0;i<3;i++)assert.deepEqual(plain(rowState(1,i)),{rank:1,entry:1});
});
test('insertion preserves slot ranks, waits for clearance and settles all three explicit placements',()=>{
  for(let slot=0;slot<3;slot++){
    const zero=insertion(0,slot),end=insertion(1,slot);
    assert.equal(zero.incoming,0);assert.equal(zero.last,1);assert.equal(zero.shift,0);
    assert.equal(insertion(.34/1.44,slot).incoming,0);assert.ok(insertion(.34/1.44,slot).shift>.8);
    assert.deepEqual(plain(end),{shift:1,incoming:1,last:0,highlight:1,check:1,draw:1,order:[[3,0,1],[0,3,1],[0,1,3]][slot]});
    const frames=Array.from({length:49},(_,f)=>plain(insertion(f/48,slot)));
    for(let f=48;f>=0;f--)assert.deepEqual(plain(insertion(f/48,slot)),frames[f]);
    assert.deepEqual(plain(insertion(600,slot)),plain(end));
  }
  for(const rank of [-1,3,1.5,NaN])assert.throws(()=>insertion(.5,rank));
});
test('native rank geometry reserves readable rows and a masked exit runway in all formats',()=>{
  for(const [W,H] of [[1720,494],[940,1060],[960,494],[960,724]]){
    const g=layout(W,H);assert.ok(g.row>=80);assert.equal(g.slot-g.row,12);assert.equal(g.listHeight,3*g.slot+32);
    assert.ok(158+g.listHeight<=H-24+1e-8);
  }
  assert.throws(()=>layout(500,300));assert.throws(()=>layout(NaN,494));
});
