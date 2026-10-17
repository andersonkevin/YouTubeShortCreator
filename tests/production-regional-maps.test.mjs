import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {decode,compile,regularFile} from '../tools/project_regional_maps.mjs';

const root=new URL('../',import.meta.url),context={window:{}};
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const code=read('templates/v1/assets/production-regional-geometry.js');
vm.runInNewContext(code,context);vm.runInNewContext(read('templates/v1/assets/production-regional-map.js'),context);
const geometry=context.window.ShortCreatorRegionalGeometry,m=context.window.ShortCreatorRegionalMap;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('real regional boundaries retain exact pinned paths, islands and closed ring geometry',()=>{
  const p=JSON.parse(read('docs/hyperframes-regional-geometry-provenance.json'));
  assert.equal(crypto.createHash('sha256').update(code).digest('hex'),p.output_sha256);
  assert.equal(geometry.spain.regions.length,19);assert.equal(geometry.us.regions.length,50);
  assert.ok(!geometry.us.regions.some(r=>r.code==='DC'));assert.ok(!geometry.spain.regions.some(r=>r.id==='20'));
  for(const [style,g] of Object.entries(geometry)) {
    assert.equal(new Set(g.regions.map(r=>r.code)).size,g.regions.length);
    for(const r of g.regions) {
      assert.match(r.d,/^M[MLZ0-9.,\-]+Z$/);assert.ok(r.d.length>20);
      assert.ok(r.bounds.flat().every(Number.isFinite));assert.ok(r.centroid.every(Number.isFinite));
    }
    for(const key of style==='spain'?['CAN','BAL','CEU','MEL']:['AK','HI','RI'])assert.ok(g.regions.some(r=>r.code===key));
  }
  assert.ok(geometry.spain.regions.find(r=>r.code==='CAN').d.split('M').length>5);
  assert.ok(geometry.us.regions.find(r=>r.code==='HI').d.split('M').length>5);
});

test('value-sorted center-out reveals retain both source schedules and exact pulse endpoints',()=>{
  for(const [style,n,each,labelEach,start] of [['spain',19,.08,.05,4],['us',50,.06,.04,3.5]]) {
    near(m.delay(0,n,each),each*(n-1));near(m.delay(Math.floor(n/2),n,each),0);
    for(let i=0;i<n;i++) {
      near(m.delay(i,n,each),m.delay(n-1-i,n,each));near(m.revealAt(style,0,i,n),0);
      near(m.revealAt(style,1+each*(n-1)+.4,i,n),1);near(m.revealAt(style,start+labelEach*(n-1)+.3,i,n,true),1);
    }
    near(m.revealAt(style,1.2,Math.floor(n/2),n),1);near(m.revealAt(style,start+.15,Math.floor(n/2),n,true),.875);
  }
  near(m.pulse(-1),0);near(m.pulse(0),0);near(m.pulse(.25),.875);near(m.pulse(.5),1);near(m.pulse(.75),.875);near(m.pulse(1),0);
  assert.throws(()=>m.pulse(NaN));assert.throws(()=>m.revealAt('us',Infinity,0,50));assert.throws(()=>m.delay(50,50,.06));
});

test('source piecewise scales use approved colors, preserve zero and reject invalid values',()=>{
  for(const style of ['spain','us']) {
    assert.equal(m.color(style,0,100,'#201344','#beda61'),'rgb(64,59,74)');
    assert.equal(m.color(style,100,100,'#201344','#beda61'),'rgb(190,218,97)');
    assert.equal(m.color(style,25,100,'#201344','#beda61'),m.color(style,50,200,'#201344','#beda61'));
    for(const [v,max] of [[-1,100],[101,100],[0,0],[NaN,100],[1,Infinity]])assert.throws(()=>m.color(style,v,max,'#201344','#beda61'));
    assert.throws(()=>m.color(style,1,100,'red','#beda61'));
  }
  assert.notEqual(m.color('spain',50,100,'#201344','#beda61'),m.color('us',50,100,'#201344','#beda61'));
});

test('all abbreviations fit without overlap in each native surface with deterministic leader anchors',()=>{
  for(const g of Object.values(geometry))for(const [w,h] of [[1720,246],[940,768],[960,246],[960,476],[912,530],[960,334],[960,564]]) {
    const layout=m.labelLayout(g.regions,w,h);assert.equal(layout.labels.length,g.regions.length);
    assert.deepEqual(layout,m.labelLayout([...g.regions].reverse(),w,h));
    for(let i=0;i<layout.labels.length;i++) {
      const a=layout.labels[i];assert.ok(a.x-a.w/2>=0&&a.x+a.w/2<=w&&a.y-a.h/2>=0&&a.y+a.h/2<=h);
      const r=g.regions.find(r=>r.code===a.code);
      near(a.anchor.x,layout.left+r.centroid[0]*layout.scale);near(a.anchor.y,layout.top+r.centroid[1]*layout.scale);
      for(const b of layout.labels.slice(0,i))assert.ok(Math.abs(a.x-b.x)>=(a.w+b.w)/2||Math.abs(a.y-b.y)>=(a.h+b.h)/2);
    }
  }
  assert.throws(()=>m.labelLayout(geometry.us.regions,100,100));
});

test('offline topology decoder preserves reversed arcs, holes and quantized degenerate rings',()=>{
  const topo={type:'Topology',transform:{scale:[2,3],translate:[10,20]},arcs:[[[0,0],[1,0],[0,1],[-1,-1]],[[0,0],[0,0]]],
    objects:{regions:{type:'GeometryCollection',geometries:[{type:'Polygon',id:'01',properties:{name:'Fixture'},arcs:[[0],[-1],[1]]}]}}};
  const rings=decode(topo,'regions').features[0].geometry.coordinates;
  assert.deepEqual(rings[0],[[10,20],[12,20],[12,23],[10,20]]);assert.deepEqual(rings[1],[...rings[0]].reverse());
  assert.deepEqual(rings[2],Array(4).fill([10,20]));
  topo.objects.regions.geometries[0].arcs=[[99]];assert.throws(()=>decode(topo,'regions'));
  assert.throws(()=>compile('<script>throw new Error("Never execute")</script>','{}','{}'),/pinned D3/);
});

test('offline compiler rejects symbolic file or parent inputs',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'regional-source-'));
  try {
    fs.writeFileSync(path.join(dir,'source.json'),'{}');fs.symlinkSync('source.json',path.join(dir,'link.json'));
    assert.equal(regularFile(path.join(fs.realpathSync(dir),'source.json')),'{}');
    assert.throws(()=>regularFile(path.join(dir,'link.json')));
    fs.symlinkSync(dir,path.join(dir,'parent'));assert.throws(()=>regularFile(path.join(dir,'parent/source.json')));
  } finally {fs.rmSync(dir,{recursive:true});}
});
