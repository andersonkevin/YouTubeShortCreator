import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const file of ['production-resources','production-data'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file+'.js',import.meta.url),'utf8'),context);
const {burstSpecs,burstState}=context.window.ShortCreatorResources;
const {laneState}=context.window.ShortCreatorData;
const plain=value=>JSON.parse(JSON.stringify(value));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('burst retains all 62 source paths, seeded by index without randomness',()=>{
  const specs=burstSpecs();assert.equal(specs.length,62);assert.equal(specs.filter(s=>s.coin).length,21);
  assert.deepEqual(plain(specs[0]),{coin:true,x:224,y:-36,delay:0,duration:.74,fadeDelay:0,rotation:-80,scale:.72});
  assert.deepEqual(plain(specs),plain(burstSpecs()));
  for(const s of specs){assert.ok(Math.abs(s.x)<=865&&Math.abs(s.y)<=465);assert.ok(s.delay<=.17500001);}
});

test('burst starts only on its second cue, then clears every decorative layer',()=>{
  for(const p of [0,1]){
    const s=burstState(p);assert.equal(s.scale,1);assert.equal(s.flash,0);assert.ok(s.icons.every(i=>i.opacity===0));
  }
  near(burstState(.08/1.6).flash,.34);
  assert.ok(burstState(.45).icons.some(i=>i.opacity>.99));
  const i=15,spec=burstSpecs()[i],t=4.18+spec.fadeDelay;
  const before=burstState((t-3.16-1e-9)/1.6).icons[i],after=burstState((t-3.16)/1.6).icons[i];
  near(before.y,after.y);near(before.scale,after.scale);near(before.opacity,after.opacity);
});

test('burst sampling is finite, clamped and independent of seek order',()=>{
  const frames=Array.from({length:161},(_,i)=>plain(burstState(i/160)));
  for(let i=160;i>=0;i--){const s=burstState(i/160);assert.deepEqual(plain(s),frames[i]);
    for(const icon of s.icons){assert.ok(Object.values(icon).every(Number.isFinite));assert.ok(icon.opacity>=0&&icon.opacity<=1);}}
  for(const p of [NaN,Infinity,-Infinity])assert.throws(()=>burstState(p));
  assert.deepEqual(plain(burstState(2)),frames.at(-1));assert.deepEqual(plain(burstState(-1)),frames[0]);
});

test('lane speed preserves real ratios and zero, with one shared scale across periods',()=>{
  const values=[[10,20],[5,0],[0,10]],starts=[.5,3.5];
  const s=laneState(values,starts,1.5,532);
  assert.deepEqual(plain(s.speeds),[150,75,0]);assert.deepEqual(plain(s.positions),[150,75,0]);
  assert.deepEqual(plain(s.values),[10,5,0]);assert.equal(s.index,0);
  const next=laneState(values,starts,4.5,532);
  assert.deepEqual(plain(next.distance),[750,225,150]);assert.deepEqual(plain(next.positions),[314,225,150]);
  assert.deepEqual(plain(next.values),[20,0,10]);assert.equal(next.speeds[1],0);
  assert.deepEqual(plain(laneState([[0,0],[0,0]],starts,600,532).positions),[0,0]);
});

test('lane reflections remain bounded in four formats and over ten minutes',()=>{
  for(const span of [370,450,660,1350]) {
    const values=[[10,5,0],[5,10,2]],starts=[.5,20.5,400.5];
    const frames=Array.from({length:601},(_,i)=>plain(laneState(values,starts,i,span)));
    for(let i=600;i>=0;i--){const s=laneState(values,starts,i,span);assert.deepEqual(plain(s),frames[i]);
      assert.ok(s.positions.every(x=>Number.isFinite(x)&&x>=0&&x<=span));}
    near(laneState(values,starts,22,span).distance[0]/span,laneState(values,starts,22,532).distance[0]/532);
  }
});

test('lane period switches use the quantized native frame and reject invalid data',()=>{
  const values=[[2,4],[0,2]],starts=[.507,2.507];
  assert.equal(laneState(values,starts,.5,532).index,-1);
  assert.equal(laneState(values,starts,16/30,532).index,0);
  assert.equal(laneState(values,starts,2.5,532).index,0);
  const at=laneState(values,starts,76/30,532);assert.equal(at.index,1);near(at.distance[0],300);
  for(const time of [NaN,Infinity])assert.throws(()=>laneState(values,starts,time,532));
  for(const span of [0,-1,NaN,Infinity])assert.throws(()=>laneState(values,starts,2,span));
  for(const bad of [[[1,NaN],[0,1]],[[1,-1],[0,1]],[[1],[0,1]]])assert.throws(()=>laneState(bad,starts,2,532));
  assert.throws(()=>laneState(values,[1,1],2,532));
});
