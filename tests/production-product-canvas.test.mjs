import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
for(const name of ['production-carousels','production-product-canvas'])vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const {state,geometry,cursors,tap,chars,duration}=context.window.ShortCreatorProductCanvas;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const plain=x=>JSON.parse(JSON.stringify(x));

test('source UI reveal, selection, comment, panel and stamp ordering are retained',()=>{
  assert.equal(state(.5,30,true).frame,0);assert.equal(state(1,30,true).ui,0);
  assert.equal(state(5.3,30,true).selection,0);assert.equal(state(6.5,30,true).comment,0);
  assert.equal(state(6.9,30,true).bubble,0);assert.equal(state(8,30,true).panel,0);
  assert.equal(state(9.1,30,true).reflow,0);assert.equal(state(9.9,30,true).cards[0].alpha,0);
  assert.ok(state(10.1,30,true).cards[0].alpha>0);assert.equal(state(10.1,30,true).cards[1].alpha,0);
  assert.ok(state(10.3,30,true).cards[1].alpha>0);assert.equal(state(10.3,30,true).cards[2].alpha,0);
  near(state(9.5,30,true).heroScale,.9);near(state(9.9,30,true).heroScale,.8);
});
test('typed comments use complete supplied graphemes at the source thirty-per-second rate',()=>{
  assert.equal(state(7.1,60,false).typed,0);assert.equal(state(7.2,60,false).typed,3);
  assert.equal(state(7.1+1/30,60,false).typed,1);assert.equal(state(9.1,60,false).typed,60);
  assert.deepEqual(plain(chars('A e\u0301 Z')),['A',' ','e\u0301',' ','Z']);
  for(const count of [1,30,60])assert.equal(state(11.9,count,false).typed,count);
});
test('resolution never appears unless explicitly supplied and final state is finite',()=>{
  for(let frame=0;frame<=357;frame++)assert.equal(state(frame/30,60,false).check,0);
  assert.equal(state(10.7,60,true).check,0);assert.ok(state(10.9,60,true).check>0);
  for(const resolved of [false,true]) {
    const end=state(duration,60,resolved);assert.equal(end.check,resolved?1:0);
    assert.equal(end.panel,0);assert.equal(end.dragged,0);assert.equal(end.scale,1);
    assert.equal(end.heroScale,.8);assert.ok(end.cards.every(n=>n.alpha===1&&n.y===0));
    assert.deepEqual(plain(state(600,60,resolved)),plain(end));
  }
});
test('four native geometries contain all final cards without scaling their text',()=>{
  for(const [W,H] of [[1720,494],[940,1060],[960,494],[960,724]]) {
    const g=geometry(W,H);assert.equal(g.stacked,H===1060);
    for(const card of g.cards) {
      assert.ok(card.x>=24&&card.y>g.hero.endY);
      assert.ok(card.x+card.w<=g.frame.w-23&&card.y+card.h<=g.frame.h-23);
      assert.ok(card.w>=270&&card.h>=130);
    }
    assert.ok(g.comment.x+g.comment.w<W&&g.comment.y>0);
    assert.ok(g.pick.x>0&&g.pick.x<g.panel.w);
  }
  assert.throws(()=>geometry(400,400));assert.throws(()=>geometry(Infinity,1060));
});
test('cursor tips reach their targets on the action frames and enter/leave physically',()=>{
  const g=geometry(960,494),action={x:300,y:260};
  const start=cursors(0,g,action);assert.ok(start.designer.y>g.H);assert.ok(start.engineer.x<0);assert.ok(start.reviewer.x>g.W);
  near(cursors(.5,g,action).designer.x,g.W/2);near(cursors(.5,g,action).designer.y,g.H/2);
  for(const [time,expected] of [[5.3,action],[8.9,g.pick],[9.9,g.drop]]) {
    const actual=cursors(time,g,action).engineer;near(actual.x,expected.x);near(actual.y,expected.y);
  }
  near(cursors(6.5,g,action).reviewer.x,g.comment.x);near(cursors(6.5,g,action).reviewer.y,g.comment.y);
  const before=cursors(4.5-1e-7,g,action).engineer,after=cursors(4.5,g,action).engineer;
  assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.001,'Interrupted source tween must be continuous');
  const end=cursors(duration,g,action);assert.ok(end.designer.x<0&&end.engineer.x>g.W&&end.reviewer.y>g.H);
  near(tap(5.4,5.3),.84);near(tap(5.62,5.3),1);
});
test('shared absolute cue clock reconstructs every native frame after reverse seeks',()=>{
  const onsets=[.515,12.515],clock=context.window.ShortCreatorCarousels.clock;
  const end=Math.ceil(onsets[1]*30)+24,forward=[];
  for(let frame=0;frame<=end;frame++)forward.push(plain(state(clock(frame/30,onsets,duration).time,60,true)));
  for(let frame=end;frame>=0;frame--)assert.deepEqual(plain(state(clock(frame/30,onsets,duration).time,60,true)),forward[frame]);
  assert.equal(forward.at(-1).t,duration);assert.equal(forward.at(-1).panel,0);
  for(const args of [[NaN,1,true],[0,0,true],[0,61,true],[0,1,'true']])assert.throws(()=>state(...args));
});
