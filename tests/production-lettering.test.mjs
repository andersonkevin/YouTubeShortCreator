import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const name of ['production-caveat-pen.js','production-lettering-source.js'])
 vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name,import.meta.url),'utf8'),context);
test('every permitted handwriting glyph has retained outlines and real centerlines',()=>{
 for(const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  const g=context.window.__hwPenCaveat.glyphs[c];assert.ok(g,c);assert.ok(g.adv>0&&g.stem>0);
  assert.match(g.outline,/^M/);assert.ok(g.strokes.length>0);for(const p of g.strokes)assert.match(p,/^M/);
 }
});
test('source pen-speed inversion is monotonic and deterministic on a curved stroke',()=>{
 const path={getTotalLength:()=>100,getPointAtLength:s=>s<50?{x:s,y:0}:{x:50+30*Math.sin((s-50)/30),y:30*(1-Math.cos((s-50)/30))}};
 const a=context.window.ShortCreatorLetteringSource.penEase(path),b=context.window.ShortCreatorLetteringSource.penEase(path);
 assert.ok(a.samples>=25&&a.samples<=75);assert.ok(a.inkTime>100);
 let prior=0;for(let i=0;i<=100;i++){const q=a.ease(i/100);assert.equal(q,b.ease(i/100));assert.ok(q>=prior&&q<=1);prior=q;}
 assert.equal(a.ease(0),0);assert.equal(a.ease(1),1);
});
