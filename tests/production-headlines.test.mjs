import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const file of ['production-headlines.js','production-type.js'])vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file,import.meta.url),'utf8'),context);
const {swapState,caretState,markerState,fitPop,shapes}=context.window.ShortCreatorHeadlines;
const {matrixState,focusState,graphemes}=context.window.ShortCreatorType;
test('headline swaps preserve direction and settle to one exact readable state',()=>{
  for(const kind of ['line','state']) {
    let previous=swapState(kind,0);
    for(let f=1;f<=24;f++) {
      const current=swapState(kind,f/24);assert.ok(current.toY<=previous.toY&&current.fromY<=previous.fromY);
      assert.ok(Object.values(current).every(Number.isFinite));previous=current;
    }
    const end=swapState(kind,1);assert.equal(end.fromOpacity,0);assert.equal(end.toOpacity,1);assert.equal(end.toY,0);assert.equal(end.toBlur,0);
    const midway=JSON.stringify(swapState(kind,.41));swapState(kind,1);assert.equal(JSON.stringify(swapState(kind,.41)),midway);
  }
  assert.throws(()=>swapState('script',.5));
});
test('caret replaces source before typing, accelerates and stops blinking at the endpoint',()=>{
  for(const n of [1,6,16,52]) {
    let count=0;
    for(let f=0;f<=24;f++) {
      const state=caretState(f/24,n);assert.ok(state.count>=count&&state.count<=n);count=state.count;
      assert.ok(!(state.fromVisible&&state.count>0));assert.ok(!(state.coverVisible&&state.caretVisible));
      if(f<12)assert.equal(state.count,0);
    }
    assert.equal(count,n);assert.equal(caretState(1,n).caretVisible,false);assert.equal(caretState(1,n).coverVisible,false);
    assert.equal(caretState(-1,n).count,0);assert.equal(caretState(2,n).count,n);
  }
});
test('four retained marker strokes draw once and settle without an idle loop',()=>{
  assert.equal(Object.keys(shapes).length,4);
  for(const shape of Object.values(shapes)){assert.ok(shape.d.startsWith('M '));assert.ok(shape.opacity>0&&shape.opacity<=1);}
  let previous=0;
  for(let f=0;f<=24;f++) {const s=markerState(f/24);assert.ok(s.draw>=previous&&s.draw<=1);assert.ok(s.scale>=1&&s.scale<=1.045);previous=s.draw;}
  assert.equal(markerState(0).draw,0);assert.equal(markerState(1).draw,1);assert.equal(markerState(1).scale,1);
});
test('matrix cells resolve exact graphemes and focus resolves without replacing approved type',()=>{
  for(const text of ['Café & code','e\u0301  👩🏽‍💻','A']) {
    const glyphs=graphemes(text);
    for(let i=0;i<glyphs.length;i++) {
      const end=matrixState(1,i,glyphs.length,glyphs[i]);assert.equal(end.text,glyphs[i]);assert.equal(end.opacity,1);assert.equal(end.y,0);
      const focus=focusState(1,i,glyphs.length);assert.equal(focus.scale,1);assert.equal(focus.blur,0);assert.equal(focus.opacity,1);
      for(const p of [0,.125,.375,.875,1,.25]) {
        const s=matrixState(p,i,glyphs.length,glyphs[i]);matrixState(1,i,glyphs.length,glyphs[i]);
        assert.equal(JSON.stringify(s),JSON.stringify(matrixState(p,i,glyphs.length,glyphs[i])));
        assert.ok(s.text==='0'||s.text==='1'||s.text===glyphs[i]);
      }
    }
  }
});
test('marker settle stays within the title at line starts, ends and wrapped baselines',()=>{
  for(const box of [[0,0,100,30],[300,90,100,30],[150,45,100,30]])for(const scale of [1,1.02,1.045]) {
    const shift=fitPop(scale,box,400,120),[x,y,w,h]=box,ex=w*(scale-1)/2,ey=h*(scale-1)/2;
    assert.ok(x-ex+shift.x>=-1e-9&&x+w+ex+shift.x<=400+1e-9);
    assert.ok(y-ey+shift.y>=-1e-9&&y+h+ey+shift.y<=120+1e-9);
  }
});
