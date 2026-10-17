import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Uint8ClampedArray};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-code-spatial.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorSpatialCode,plain=v=>JSON.parse(JSON.stringify(v));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('spatial code curves retain source arrival ratios and finish with native readable text',()=>{
  assert.deepEqual(plain(api.kinds),['particles','dissolve','extrude']);
  near(api.pose('particles',.36).reveal,.875);
  near(api.pose('dissolve',.31).reveal,.575);
  near(api.pose('extrude',.3).ry,-.0625);
  for(const style of api.kinds) {
    const frames=Array.from({length:25},(_,f)=>plain(api.pose(style,f/24)));
    for(let f=24;f>=0;f--)assert.deepEqual(plain(api.pose(style,f/24)),frames[f]);
    assert.equal(frames[0].native,0);assert.equal(frames[24].native,1);
    assert.equal(frames[24].rx,0);assert.equal(frames[24].ry,0);assert.equal(frames[24].cameraOffset,0);
    assert.equal(frames[24].reveal,style==='dissolve'?1.15:1);
    assert.deepEqual(plain(api.pose(style,600)),frames[24]);
    assert.throws(()=>api.pose(style,NaN));
  }
  assert.throws(()=>api.pose('constructor',0));
});

test('source particle grid samples only supplied glyph pixels and pins the random seed',()=>{
  const pixels=new Uint8ClampedArray(8*6*4);
  const pixel=(x,y,rgba)=>pixels.set(rgba,(y*8+x)*4);
  pixel(0,0,[255,255,255,255]);pixel(2,2,[120,200,210,255]);pixel(4,4,[255,255,255,127]);pixel(1,1,[255,255,255,255]);
  const data=plain(api.particles(pixels,8,6));assert.equal(data.delay.length,2);
  assert.deepEqual(data.target,[-6.5,4.875,0,-3.25,1.6250000000000002,0]);
  assert.deepEqual(data.color,[1,1,1,120/255,200/255,210/255]);
  assert.deepEqual(plain(api.particles(pixels,8,6)),data);
  // Mulberry32 with the source seed 23 * 2654435761, independent pinned outputs.
  let seed=Math.imul(23,2654435761)>>>0;
  function random(){seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;}
  near(data.origin[0],(random()*2-1)*13*1.15);near(data.origin[1],(random()*2-1)*9.75*1.7);
  near(data.origin[2],(random()*2-1)*9-2);near(data.delay[0],random());
  assert.equal(api.particles(new Uint8ClampedArray(16),2,2).delay.length,0);
  for(const [w,h] of [[0,1],[1.5,1],[-1,-1],[2000,1]])assert.throws(()=>api.particles(pixels,w,h));
  assert.throws(()=>api.particles([],8,6));
});

test('bounded glyph budget fails closed rather than silently dropping particles',()=>{
  const pixels=new Uint8ClampedArray(600*600*4);pixels.fill(255);
  assert.throws(()=>api.particles(pixels,600,600),/particle budget/);
});
