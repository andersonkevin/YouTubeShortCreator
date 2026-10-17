import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const root=new URL('../',import.meta.url),context={window:{}};
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const geometryCode=read('templates/v1/assets/production-world-geometry.js');
vm.runInNewContext(geometryCode,context);
vm.runInNewContext(read('templates/v1/assets/production-world-map.js'),context);
const g=context.window.ShortCreatorWorldGeometry,m=context.window.ShortCreatorWorldMap;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('all 177 pinned local countries retain names, closed paths, holes and projected bounds',()=>{
  const input=JSON.parse(read('tools/visual_library/vendor/natural-earth/world.json'));
  const provenance=JSON.parse(read('docs/hyperframes-world-geometry-provenance.json'));
  assert.equal(crypto.createHash('sha256').update(geometryCode).digest('hex'),provenance.output_sha256);
  assert.equal(crypto.createHash('sha256').update(read(provenance.source)).digest('hex'),provenance.source_sha256);
  assert.equal(provenance.build_tool.runtime_distributed,false);assert.equal(provenance.build_tool.network_requests,0);
  assert.equal(g.width,1380);assert.equal(g.height,700);assert.equal(g.regions.length,177);
  assert.deepEqual(Array.from(g.regions,r=>r.name),input.features.map(f=>f.properties.name));
  assert.equal(new Set(g.regions.map(r=>r.name)).size,177);
  for(const region of g.regions) {
    assert.match(region.d,/^M[MLZ0-9.,\-]+Z$/);assert.ok(region.d.length>20);
    const [[x0,y0],[x1,y1]]=region.bounds;assert.ok(x0>=7.99&&y0>=7.99&&x1<=1372.01&&y1<=692.01&&x1>x0&&y1>y0);
  }
  assert.ok(g.regions.find(r=>r.name==='South Africa').d.split('M').length>=3,'Retain the Lesotho interior ring');
  assert.ok(g.regions.find(r=>r.name==='Fiji').d.split('M').length>=3,'Retain islands on both sides of the dateline');
  assert.ok(g.graticule.startsWith('M')&&g.graticule.length>1000);
  for(const [w,h] of [[1720,292],[940,814],[960,292],[960,522]]) {
    const scale=Math.min(w/g.width,h/g.height),x=(w-g.width*scale)/2,y=(h-g.height*scale)/2;
    for(const r of g.regions)assert.ok(x+r.bounds[0][0]*scale>=0&&x+r.bounds[1][0]*scale<=w&&y+r.bounds[0][1]*scale>=0&&y+r.bounds[1][1]*scale<=h);
  }
});

test('world center-out stagger retains the source total spread and earliest/latest reveals',()=>{
  near(m.delay(88,177),0);near(m.delay(0,177),3.52);near(m.delay(176,177),3.52);
  near(m.revealAt(1,88,177),0);near(m.revealAt(1.3,88,177),1);
  near(m.revealAt(4.52,0,177),0);near(m.revealAt(4.82,176,177),1);
  for(let i=0;i<177;i++) {
    near(m.delay(i,177),m.delay(176-i,177));near(m.revealAt(0,i,177),0);near(m.revealAt(5,i,177),1);
  }
  assert.throws(()=>m.delay(-1,177));assert.throws(()=>m.delay(177,177));assert.throws(()=>m.delay(0,0));
});

test('highlight pulse is finite and returns to the original country color',()=>{
  near(m.pulse(-1),0);near(m.pulse(0),0);near(m.pulse(.2),.875);near(m.pulse(.4),1);
  near(m.pulse(.7),.5);near(m.pulse(1),0);near(m.pulse(600),0);
  for(let i=0;i<=300;i++)assert.ok(m.pulse(i/300)>=0&&m.pulse(i/300)<=1);
  assert.throws(()=>m.pulse(NaN));
});

test('explicit numeric scale distinguishes zero from blank and clamps no invalid data',()=>{
  const background='#201344',accent='#beda61';
  assert.equal(m.color(0,100,background,accent),'rgb(64,59,74)');
  assert.equal(m.color(100,100,background,accent),'rgb(190,218,97)');
  assert.notEqual(m.color(0,100,background,accent),background);
  assert.equal(m.color(10,100,background,accent),m.color(20,200,background,accent));
  const channels=s=>s.match(/\d+/g).map(Number);let last=[0,0,0];
  for(let i=0;i<=100;i++) {const next=channels(m.color(i,100,background,accent));next.forEach((v,j)=>assert.ok(v>=last[j]));last=next;}
  for(const [value,max] of [[-1,100],[101,100],[0,0],[NaN,100],[1,Infinity]])assert.throws(()=>m.color(value,max,background,accent));
  assert.throws(()=>m.color(1,100,'red',accent));
});
