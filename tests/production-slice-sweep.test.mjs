import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Uint8ClampedArray};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-slice-sweep.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorSliceSweep,plain=v=>JSON.parse(JSON.stringify(v));
const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
function masks(w,h) {
  const a=new Uint8ClampedArray(w*h*4),b=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    if((x===0||x===w-1||x===Math.floor(w/2))&&y%3===0)a[(y*w+x)*4+3]=128;
    if(y===0||y===h-1)b[(y*w+x)*4+3]=255;
  }
  return [a,b];
}

test('the source analytic sweep and its inverse share the same passage clock',()=>{
  const f=api.field(1920,1080,1);
  near(f.cursorAt(1.35).x,-378);near(f.cursorAt(5.55).x,2298);
  near(f.fieldAt(960,540,960,540),1);near(f.fieldAt(0,0,960,540),0);
  for(let x=0;x<=1920;x+=48)near(f.cursorAt(f.cursorTimeAtX(x)).x,x);
  assert.equal(f.cellSize,112);near(f.cursorAt(2).z,80);
});

test('integer cells cover every ink pixel once, including edges and odd dimensions',()=>{
  for(const [w,h] of [[1672,420],[892,700],[912,370],[127,83]]) {
    const [a,b]=masks(w,h),p=api.partition(a,b,w,h,.29);
    assert.deepEqual(plain(p.coverage),[a.filter((v,i)=>i%4===3&&v).length,b.filter((v,i)=>i%4===3&&v).length]);
    assert.ok(p.tiles.length<=1600&&p.last>p.first);
    for(const t of p.tiles)assert.equal(t.active,t.frontInk+t.backInk>0);
  }
});

test('only ink cells half-turn; blank cells lift locally and finish exactly front-facing',()=>{
  const [a,b]=masks(912,370),p=api.partition(a,b,912,370,72/310),f=p.field;
  assert.ok(p.tiles.some(t=>!t.active));
  for(const t of p.tiles) {
    const start=f.poseAt(t,0),end=f.poseAt(t,8);
    near(start.rx,0);near(start.ry,0);near(start.z,0);
    near(end.rx,0);near(end.ry,t.active?180:0);near(end.z,0);
    const mid=f.poseAt(t,t.flipStart+t.flipDuration*.5);
    assert.ok(Object.values(mid).every(Number.isFinite));
    if(t.active)assert.ok(mid.ry>90&&mid.ry<220);
  }
});

test('tile poses are seek-order independent and finite through source motion',()=>{
  const [a,b]=masks(892,700),p=api.partition(a,b,892,700,90/310);
  const tile=p.tiles.find(t=>t.active&&t.peak>.5);assert.ok(tile);
  const states=Array.from({length:241},(_,i)=>plain(p.field.poseAt(tile,i/30)));
  for(let i=240;i>=0;i--)assert.deepEqual(plain(p.field.poseAt(tile,i/30)),states[i]);
  assert.ok(states.every(s=>Object.values(s).every(Number.isFinite)));
});

test('bad dimensions, missing masks, empty ink and excessive grids fail closed',()=>{
  for(const w of [0,1.5,1921,NaN,Infinity])assert.throws(()=>api.field(w,100,.29));
  for(const u of [0,2,NaN,Infinity])assert.throws(()=>api.field(100,100,u));
  assert.throws(()=>api.partition([],[],10,10,.29));
  assert.throws(()=>api.partition(new Uint8ClampedArray(400),new Uint8ClampedArray(400),10,10,.29));
  assert.throws(()=>api.partition(...masks(1920,1920),1920,1920,.01));
});
