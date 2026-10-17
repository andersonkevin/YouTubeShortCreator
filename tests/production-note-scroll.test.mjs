import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-note-scroll.js',import.meta.url),'utf8'),context);
const {graphemes,countAt,state}=context.window.ShortCreatorNoteScroll;
const plain=x=>JSON.parse(JSON.stringify(x));
test('source cadence and normalized replacement text end exactly inside their caption phase',()=>{
  assert.equal(countAt(16,0,-1),0);assert.equal(countAt(16,0,0),1);assert.equal(countAt(16,0,1),2);assert.equal(countAt(16,0,4),3);
  for(let line=0;line<7;line++)for(let length=1;length<=52;length++){
    let previous=0;for(let frame=0;frame<=24;frame++){
      const count=countAt(length,line,frame);assert.ok(count>=previous&&count<=length);previous=count;
    }
    assert.equal(previous,length);assert.equal(countAt(length,line,600),length);
  }
  assert.deepEqual(plain(graphemes('e\u0301 👩‍💻')),['e\u0301',' ','👩‍💻']);
});
test('first and later measured scrolls retain plateaus and settle without drift',()=>{
  const onsets=[.5,2.5,4.5,6.5,8.5,10.5,12.5],lengths=[16,17,23,30,35,39,21],H=442,step=H/4;
  const at=frame=>state(frame/30,onsets,lengths,H);
  assert.equal(at(117).scroll,0);assert.ok(Math.abs(at(118).scroll-step*.8*21.74/120)<1e-12);
  assert.equal(at(120).scroll,at(121).scroll);assert.equal(at(135).scroll,step*.8);
  assert.equal(at(196).scroll,step*.8+step);assert.equal(at(400).scroll,step*4.8);
  assert.equal(at(117).caret,2);assert.equal(at(135).counts[2],1);
});
test('seven lines keep the current two-line ink area within every native viewport',()=>{
  for(const H of [442,1008,442,672])for(let count=2;count<=7;count++){
    const onsets=Array.from({length:count},(_,i)=>.5+2*i),lengths=onsets.map(()=>52);
    const s=state(600,onsets,lengths,H),y=s.first+(count-1)*s.step-s.scroll;
    assert.ok(y>=0&&y+80<=H);assert.ok(s.counts.every(c=>c===52));assert.equal(s.caret,count-1);
    const frames=Array.from({length:420},(_,f)=>plain(state(f/30,onsets,lengths,H)));
    for(let f=419;f>=0;f--)assert.deepEqual(plain(state(f/30,onsets,lengths,H)),frames[f]);
  }
  assert.throws(()=>state(0,[.5],[4],442));assert.throws(()=>state(0,[.5,2.5],[4,4],300));
});
