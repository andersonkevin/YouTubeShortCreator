import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
for(const name of ['production-type','production-headlines'])vm.runInNewContext(
  fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const {wordState,treatmentState}=context.window.ShortCreatorType;
const {morphState,strikeState,flapState}=context.window.ShortCreatorHeadlines;
const plain=value=>JSON.parse(JSON.stringify(value));
test('word arrivals settle at exact approved typography for every word count',()=>{
  for(const kind of ['word-crossfade','shared-axis-y','shared-axis-z'])for(const length of [1,2,8,26]) {
    for(let i=0;i<length;i++) {
      assert.deepEqual(plain(wordState(kind,1,i,length)),{y:0,scale:1,opacity:1,blur:0});
      assert.equal(wordState(kind,0,i,length).opacity,0);
      for(let frame=0;frame<=24;frame++) {
        const s=wordState(kind,frame/24,i,length);assert.ok(Object.values(s).every(Number.isFinite));
        assert.ok(s.opacity>=0&&s.opacity<=1&&s.scale>0&&s.blur>=0);
      }
    }
  }
});
test('optical title treatments stay bounded and clear their temporary effect',()=>{
  const start=treatmentState('soft-blur',0),end=treatmentState('soft-blur',1);
  assert.deepEqual(plain(start),{opacity:0,y:28,blur:18});assert.deepEqual(plain(end),{opacity:1,y:0,blur:0});
  assert.equal(treatmentState('scan-band',0).position,-60);assert.equal(treatmentState('scan-band',1).position,160);
  assert.equal(treatmentState('shimmer-sweep',0).position,-20);assert.equal(treatmentState('shimmer-sweep',1).position,120);
  assert.equal(treatmentState('mask-reveal',0).position,-10);assert.equal(treatmentState('mask-reveal',1).position,100);
  for(let frame=0;frame<=24;frame++)assert.ok([0,8].includes(treatmentState('accent-glitch',frame/24).offset));
  assert.equal(treatmentState('accent-glitch',1).offset,0);
  assert.deepEqual(plain(treatmentState('calm',1)),{kicker:1,title:1,subtitle:1});
});
test('text stagger retains separate word arrival and shimmer clocks then returns to native type',()=>{
  for(const length of [1,4,12,26])for(let index=0;index<length;index++) {
    assert.deepEqual(plain(wordState('text-stagger',0,index,length)),{y:48,scale:1,opacity:0,blur:14,sweep:0});
    assert.deepEqual(plain(wordState('text-stagger',1,index,length)),{y:0,scale:1,opacity:1,blur:0,sweep:100});
    for(let frame=0;frame<=24;frame++) {
      const state=wordState('text-stagger',frame/24,index,length);
      assert.ok(Object.values(state).every(Number.isFinite));assert.ok(state.opacity>=0&&state.opacity<=1);
      assert.ok(state.blur>=0&&state.blur<=14);assert.ok(state.sweep>=0&&state.sweep<=100);
      wordState('text-stagger',1,index,length);
      assert.deepEqual(plain(state),plain(wordState('text-stagger',frame/24,index,length)));
    }
  }
  const duration=1.77+.04*3;
  assert.equal(wordState('text-stagger',.7/duration,0,4).sweep,0);
  assert.ok(wordState('text-stagger',.7/duration,0,4).opacity>wordState('text-stagger',.7/duration,3,4).opacity);
  assert.ok(wordState('text-stagger',1.5/duration,0,4).sweep>0);
});
test('morph and strike obey exact endpoints without changing supplied strings',()=>{
  assert.deepEqual(plain(morphState(0)),{fromOpacity:1,toOpacity:0,fromBlur:0,toBlur:0,threshold:false});
  assert.deepEqual(plain(morphState(1)),{fromOpacity:0,toOpacity:1,fromBlur:0,toBlur:0,threshold:false});
  assert.equal(morphState(.5).fromBlur,8);assert.equal(morphState(.5).toBlur,8);
  assert.equal(strikeState(0).draw,0);assert.equal(strikeState(4/9).toOpacity,0);
  const end=strikeState(1);assert.equal(end.draw,1);assert.equal(end.toOpacity,1);assert.equal(end.fromOpacity,0);assert.equal(end.toY,0);
});
test('split flap swaps physical leaves at the ninety degree crossing',()=>{
  for(let frame=0;frame<=24;frame++) {
    const p=frame/24,s=flapState(p);
    assert.ok(!(s.front&&s.back));assert.ok(s.shade>=.5&&s.shade<=1);
    assert.equal(s.front,p>0&&p<1&&p*p<.5);assert.equal(s.back,p>0&&p<1&&p*p>=.5);
    assert.equal(s.angle,180*p*p);
  }
  assert.equal(flapState(1).front,false);assert.equal(flapState(1).back,false);
});
test('new timing functions are history independent on shuffled and reverse evaluation',()=>{
  const helpers=[p=>wordState('shared-axis-z',p,3,6),p=>treatmentState('scan-band',p),p=>treatmentState('accent-glitch',p),morphState,strikeState,flapState];
  for(const helper of helpers) {
    const expected=Array.from({length:25},(_,i)=>plain(helper(i/24)));
    for(const index of [24,0,12,6,23,1,18,2,22,0,24])assert.deepEqual(plain(helper(index/24)),expected[index]);
  }
});
