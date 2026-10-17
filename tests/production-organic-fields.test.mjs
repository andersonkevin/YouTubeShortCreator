import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-organic-fields.js',import.meta.url),'utf8'),context);
const {facetFrame,touchState,grainTable,paint}=context.window.ShortCreatorOrganicFields;
test('authored topology morphs through all three forms and settles',()=>{
  assert.equal(facetFrame(0).progress,0);assert.equal(facetFrame(1.8).progress,1);
  for(let f=0;f<126;f++) {
    const s=facetFrame(f/30);assert.equal(s.triangles.length,36);
    assert.ok(s.triangles.every(t=>t.points.length===3&&t.points.flat().every(Number.isFinite)&&Math.abs(t.shade)<=1));
  }
  const end=facetFrame(4.1025);assert.equal(end.progress,2);assert.equal(end.amplitude,0);
  assert.equal(JSON.stringify(end),JSON.stringify(facetFrame(600)));assert.throws(()=>facetFrame(NaN));
});
test('touch attack and recovery preserve the cut velocity within the endpoint correction',()=>{
  const cut=2.0125,eps=1e-6,end=touchState(3.1625);
  assert.ok(Math.abs(touchState(cut).bulge-.9375)<1e-12);
  assert.ok(Math.abs(touchState(cut-eps).bulge-touchState(cut+eps).bulge)<3e-6);
  assert.ok(Math.abs(touchState(cut-eps).lean-touchState(cut+eps).lean)<3e-6);
  assert.equal(touchState(1.6).dot,1);
  for(const key of ['bulge','lean','dot'])assert.equal(end[key],0);
  assert.equal(JSON.stringify(end),JSON.stringify(touchState(600)));assert.throws(()=>touchState(-1));
});
test('seeded grain tables and every backward sample repeat exactly',()=>{
  const table=grainTable();assert.equal(table.length,1500);
  assert.equal(JSON.stringify(table),JSON.stringify(grainTable()));
  assert.ok(table.every(g=>g.size>0&&g.dim>=0&&g.dim<=1&&[1,2].includes(g.cycles)));
  for(const fn of [facetFrame,touchState])for(const t of [0,.8,1.7,2.1,2.8,4]) {
    const original=JSON.stringify(fn(t));fn(600);assert.equal(JSON.stringify(fn(t)),original);
  }
});
test('canvas painter draws source facets or grain and restores state',()=>{
  for(const style of ['facet-morph','soft-blob-touch']) {
    const calls=[];
    const ctx=new Proxy({}, {get:(target,key)=>target[key]??((...args)=>{
      calls.push([key,...args]);return key==='createRadialGradient'?{addColorStop(){}}:undefined;
    }),set:(target,key,value)=>{target[key]=value;return true;}});
    const colors={background:'#140b30',accent:'#b6ff00',secondary:'#65e8ff',foreground:'#ffffff'};
    const state=paint(ctx,960,494,2.2,colors,style);
    assert.equal(ctx.globalAlpha,1);assert.equal(ctx.filter,'none');
    if(style==='facet-morph'){assert.equal(state.facets,36);assert.equal(calls.filter(c=>c[0]==='closePath').length,36);}
    else {assert.equal(state.grains,1500);assert.ok(calls.filter(c=>c[0]==='arc').length>=1500);}
    assert.ok(calls.every(call=>call.slice(1).every(v=>typeof v!=='number'||Number.isFinite(v))));
  }
});
