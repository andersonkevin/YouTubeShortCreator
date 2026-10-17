import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-paper-transitions.js',import.meta.url),'utf8'),context);
const P=context.window.ShortCreatorPaperTransitions;
test('seven deterministic scribbles fully cover the midpoint cut and clear at rest',()=>{
  assert.equal(P.scribbles().length,7);assert.equal(JSON.stringify(P.scribbles()),JSON.stringify(P.scribbles()));
  for(let i=0;i<7;i++) {
    assert.equal(P.scribbleState(0,i).solid,0);assert.equal(P.scribbleState(.5,i).solid,1);
    assert.equal(Math.abs(P.scribbleState(.5,i).offset),0);assert.equal(P.scribbleState(1,i).solid,0);assert.ok(P.scribbleState(1,i).hidden);
  }
});
test('paper scraps retain seeded shape, stagger and directional travel',()=>{
  const scraps=P.scraps();assert.equal(scraps.length,6);assert.equal(JSON.stringify(scraps),JSON.stringify(P.scraps()));
  let last=-1;
  for(const s of scraps) {
    assert.equal(s.poly.length,24);assert.ok(s.start>last);last=s.start;
    const a=P.scrapState(s,0,1000,500),b=P.scrapState(s,1,1000,500);
    assert.equal(Math.abs(a.x)+Math.abs(a.y),0);assert.equal(b.p,1);assert.equal(b.rotation,s.rotation);
    assert.ok(Math.hypot(b.x,b.y)>450);
  }
});
test('torn edge is continuous, seeded and completely outside the image at both endpoints',()=>{
  const table=P.tearTable();assert.equal(table.edge.length,181);
  assert.equal(JSON.stringify(table),JSON.stringify(P.tearTable()));
  const start=P.tearState(table,0),end=P.tearState(table,1);
  assert.ok(start.edge.every(r=>r.x<0&&r.rimX<0));assert.ok(end.edge.every(r=>r.x>100&&r.rimX>100));
  assert.equal(end.x,3);assert.equal(end.rotation,1.5);
  let last=-Infinity;
  for(let f=0;f<=24;f++) {const s=P.tearState(table,f/24);assert.ok(s.boundary>last);last=s.boundary;}
  assert.ok(Math.abs(P.tearState(table,.3).q-.2)<1e-12);
});
test('all paper motion tables reproduce reverse seeks without mutable simulation',()=>{
  const table=P.tearTable(),scraps=P.scraps();
  for(const p of [0,.9,.2,1,.7,0,.5]) {
    const a=JSON.stringify(P.tearState(table,p));P.tearState(table,1);assert.equal(JSON.stringify(P.tearState(table,p)),a);
    for(const s of scraps)assert.ok(Object.values(P.scrapState(s,p,960,620)).every(Number.isFinite));
  }
});
