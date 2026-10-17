import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const file of ['production-screen-cuts','production-headline-panels'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file+'.js',import.meta.url),'utf8'),context);
const cuts=context.window.ShortCreatorScreenCuts,circle=context.window.ShortCreatorHeadlinePanels.circleState;
const plain=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('clone wall hides the underlying cut behind an opaque source wall',()=>{
  const start=cuts.state(0);assert.equal(start.x,0);assert.equal(start.y,0);assert.equal(start.width,1);assert.equal(start.height,1);
  const card=cuts.state(.95/2.4);near(card.x,1/3);near(card.y,330/1080);near(card.width,1/3);near(card.height,420/1080);
  assert.equal(card.radius,40);assert.equal(card.cardAlpha,1);
  for(const t of [1.75,1.76,1.8,1.89]){const s=cuts.state(t/2.4);assert.equal(s.after,true);assert.equal(s.wallAlpha,1);assert.equal(s.cardAlpha,0);}
  const end=cuts.state(1);assert.equal(end.visible,false);assert.equal(end.wallAlpha,0);assert.equal(end.cardVisible,false);assert.equal(end.after,true);
});

test('word wall uses actual text width, source spacing and bounded rows in every profile',()=>{
  for(const [w,h] of [[1500,500],[800,900],[800,500],[800,680]])for(const textWidth of [35,180,550]) {
    const s=cuts.grid(w,h,textWidth);assert.ok(s.rows*s.columns<=1000);
    near(s.font,240*Math.min(w/1920,h/1080));near(s.gapX,90*s.fit);near(s.gapY,60*s.fit);
    assert.ok(s.columns*s.tile-1.5*s.tile>w);
    assert.ok((s.rows-1)*(s.font+s.gapY)-s.font*.35+s.font>h);
  }
  for(const value of [NaN,Infinity,0,-1])assert.throws(()=>cuts.grid(100,100,value));
});

test('circle cut matches geometry and continues the same growing camera vector',()=>{
  near(circle(0).scale,.54);near(circle(.45/2.35).scale,.64);
  const cut=1.4/2.35,epsilon=1e-7,a=circle(cut-epsilon),b=circle(cut),c=circle(cut+epsilon);
  assert.equal(a.after,false);assert.equal(b.after,true);near(b.scale,1);assert.ok(a.scale<b.scale&&b.scale<c.scale);
  const incoming=(c.scale-b.scale)/epsilon,outgoing=(b.scale-a.scale)/epsilon;
  assert.ok(incoming/outgoing>.95&&incoming/outgoing<1.1,'Carrier speed must remain continuous within the source easing tolerance');
  assert.equal(b.copy,0);assert.equal(circle(1).copy,1);assert.equal(circle(1).scale,1.26);assert.equal(circle(1).y,0);
});

test('both handoffs reproduce arbitrary reverse seeks and reject non-finite clocks',()=>{
  for(const state of [cuts.state,circle]) {
    const expected=Array.from({length:25},(_,i)=>plain(state(i/24)));
    for(let i=24;i>=0;i--)assert.deepEqual(plain(state(i/24)),expected[i]);
    for(const p of [NaN,Infinity,-Infinity])assert.throws(()=>state(p));
  }
});
