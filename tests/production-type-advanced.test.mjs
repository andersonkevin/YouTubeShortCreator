import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
for(const name of ['production-type-advanced','production-type'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorAdvancedType,plain=x=>JSON.parse(JSON.stringify(x));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('native type routing exposes all ten bounded additions',()=>{
  assert.equal(api.kinds.length,10);
  for(const kind of api.kinds)assert.ok(context.window.ShortCreatorType.kinds.includes(kind));
  assert.throws(()=>api.wordState('remote',.5,0,1));
  assert.throws(()=>api.wordState('glitch-read',NaN,0,1));
});
test('prism entrance retains source focus and bow but clears every effect for the native hold',()=>{
  assert.deepEqual(plain(api.prismState(0)),{alpha:0,blur:18,offset:18,ghost:.45,tilt:6});
  const settled=api.prismState(.85);near(settled.alpha,1);near(settled.blur,2.5);near(settled.offset,4);near(settled.ghost,.85);near(settled.tilt,6);
  const end={alpha:1,blur:0,offset:0,ghost:0,tilt:0};assert.deepEqual(plain(api.prismState(1)),end);assert.deepEqual(plain(api.prismState(600)),end);
  const frames=Array.from({length:25},(_,i)=>plain(api.prismState(i/24)));
  for(let i=24;i>=0;i--)assert.deepEqual(plain(api.prismState(i/24)),frames[i]);
  assert.throws(()=>api.prismState(NaN));
});
test('word treatments have exact rest and reverse evaluations retain every state',()=>{
  const rest={opacity:1,x:0,scale:1,shadow:0,glow:0,accent:0,decode:2};
  for(const kind of ['glitch-read','decode-read','neon-accent','particle-burst'])for(const count of [1,4,12])for(let i=0;i<count;i++) {
    const frames=Array.from({length:25},(_,f)=>plain(api.wordState(kind,f/24,i,count,true)));
    assert.deepEqual(frames[24],rest);assert.deepEqual(plain(api.wordState(kind,4,i,count,true)),rest);
    for(let f=24;f>=0;f--){assert.deepEqual(plain(api.wordState(kind,f/24,i,count,true)),frames[f]);
      assert.ok(Object.values(frames[f]).every(Number.isFinite));assert.ok(frames[f].opacity>=0&&frames[f].opacity<=1);}
  }
  const attack=api.wordState('glitch-read',.35*.45,0,1);
  assert.ok(attack.x<=-8&&attack.x>=-16);assert.ok(attack.shadow>=5&&attack.shadow<=12);
  near(api.wordState('neon-accent',0,0,1,true).scale,.65);
});
test('decode keeps grapheme counts and returns two repeatable independent rows',()=>{
  for(const text of ['Exact','Cafe\u0301','A👩‍💻B','日本語']) {
    const rows=plain(api.decodeRows(text,7)),length=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text)].length;
    assert.deepEqual(rows,plain(api.decodeRows(text,7)));assert.ok(rows.every(row=>row.length===length&&/^[A-Za-z0-9]+$/.test(row)));
    assert.notDeepEqual(rows,plain(api.decodeRows(text,8)));
  }
  assert.equal(api.wordState('decode-read',.45/3-1e-6,0,1).decode,0);
  assert.equal(api.wordState('decode-read',.45/3+1e-6,0,1).decode,1);
  assert.equal(api.wordState('decode-read',.45*2/3+1e-6,0,1).decode,2);
});
test('seeded bursts have ten rays, bounded travel and fully clear endpoints',()=>{
  const rows=api.burst(3);assert.equal(rows.length,10);assert.deepEqual(plain(rows),plain(api.burst(3)));
  rows.forEach((row,i)=>{near(row.delay,i*.018);assert.ok(Math.hypot(row.x,row.y)>=120&&Math.hypot(row.x,row.y)<320);
    assert.ok(row.size>=4&&row.size<12);assert.equal(api.burstPose(row,0).alpha,0);assert.equal(api.burstPose(row,1).alpha,0);
    const mid=api.burstPose(row,(row.delay+.12)/.7);near(mid.x,row.x);near(mid.y,row.y);near(mid.alpha,1);});
});
test('mosaic preserves all sixty ranked cells and the source scale handoff',()=>{
  const rows=api.tileTable();assert.equal(rows.length,60);assert.equal(new Set(rows.map(row=>row.rank)).size,60);
  assert.deepEqual(plain(rows),plain(api.tileTable()));
  for(const row of rows) {
    const start=api.tileState(row,0),end=api.tileState(row,1);
    near(start.resolve,0);near(start.scale,.82);near(start.noise,row.alpha);near(start.stage,0);
    near(end.resolve,1);near(end.scale,1);near(end.noise,0);
  }
});
test('ASCII front covers 24 by 14 cells and follows the authored S curve',()=>{
  assert.deepEqual(plain(api.curve(0)),{x:-80,y:460});assert.deepEqual(plain(api.curve(1)),{x:1080,y:140});
  assert.deepEqual(plain(api.curve(.5)),{x:500,y:300});
  const rows=api.asciiTable();assert.equal(rows.length,336);
  for(const row of rows){assert.equal(api.asciiState(row,0).opacity,1);assert.equal(api.asciiState(row,1).opacity,0);}
  assert.ok(rows.some(row=>api.asciiState(row,.5).opacity>0));
  assert.ok(rows.some(row=>api.asciiState(row,.5).opacity===0));
});
test('human typing reserves exact Unicode and whitespace and never splits a grapheme',()=>{
  const text='A👩‍💻B  Cafe\u0301  exact.',table=api.typingTable(text);
  assert.deepEqual(plain(table),plain(api.typingTable(text)));
  const length=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text)].length;
  assert.equal(table.length,length);assert.equal(api.typingState(table,0).count,0);
  assert.deepEqual(plain(api.typingState(table,1)),{count:length,caret:false});
  const forward=Array.from({length:25},(_,i)=>plain(api.typingState(table,i/24)));
  assert.ok(forward.every((s,i)=>!i||s.count>=forward[i-1].count));
  for(let i=24;i>=0;i--)assert.deepEqual(plain(api.typingState(table,i/24)),forward[i]);
});
test('assembly samples only actual opaque glyph cells and particles disappear at rest',()=>{
  const width=100,height=60,pixels=new Uint8ClampedArray(width*height*4);
  for(let y=10;y<50;y++)for(let x=20;x<80;x++)pixels[(y*width+x)*4+3]=255;
  const rows=api.particleTable(pixels,width,height);assert.ok(rows.length>100);assert.ok(rows.length<1700);
  assert.deepEqual(plain(rows),plain(api.particleTable(pixels,width,height)));
  for(const row of rows) {
    assert.ok(row.tx>=20&&row.tx<80&&row.ty>=10&&row.ty<50);
    const end=api.particlePose(row,1);assert.equal(end.alpha,0);near(end.x,row.tx);near(end.y,row.ty);
    assert.equal(api.particlePose(row,0).alpha,0);
  }
  assert.deepEqual(plain(api.particleTable(new Uint8ClampedArray(4),1,1)),[]);
  assert.throws(()=>api.particleTable(pixels,101,height));
});
