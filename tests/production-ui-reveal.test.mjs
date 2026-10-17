import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-ui-reveal.js',import.meta.url),'utf8'),context);
const effect=context.window.ShortCreatorUIReveal,plain=x=>JSON.parse(JSON.stringify(x));
const state=t=>effect.state(t,9,22),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,a+' != '+b);
test('source camera push and interrupted depth exit retain their values and easing',()=>{
  const flat=state(3.4);near(flat.alpha,1);near(flat.scale,.79);near(flat.rotation,0);near(flat.y,0);
  near(state(4.15).scale,.97);near(state(5.55).rotation,-34);near(state(6.45).rotation,-31);
  const angle=-31-4*(1-Math.cos(Math.PI*.85/.9))/2;
  near(state(7.3).rotation,angle);
  near(state(7.575).rotation,angle+(-65-angle)/32);
  near(state(7.575).z,-7500/32);near(state(7.575).x,-2200/32);
  near(state(7.85).rotation,-65);assert.equal(state(7.85).visible,false);
  near(state(7.35).y,-20);near(state(7.6).glow,0);
});
test('layer cascade has quadratic delay distribution and source panel timings',()=>{
  const start=2.07+8*.045*(4/8)**2;
  near(state(start).layers[4],0);near(state(start+.175).layers[4],.875);
  near(state(1.73).toolbar,0);near(state(2.13).toolbar,1);
  near(state(2.75).selection,0);near(state(3).selection,1);
  assert.ok(state(2.4).art>1);
});
test('brand assembly and ending hold retain five pieces and grapheme timing',()=>{
  near(state(.2).intro.parts[0].stroke,.5);
  near(state(.54).intro.parts[0].fill,.75);
  near(state(1.175).intro.scale,.875);
  near(state(8.3).outro.parts[0].stroke,.5);
  near(state(10.4).outro.scale,1.04);near(state(10.6).outro.scale,1);
  near(state(10.76).letters[0],.875);near(state(11.875).pill.stroke,.5);
  const final=state(12.3);near(final.pill.fill,1);near(final.pill.text,1);
  assert.ok(final.outro.parts.every(p=>p.fill===1));assert.ok(final.letters.every(p=>p===1));
  assert.deepEqual(plain(state(80)),plain(final));
});
test('all formats contain the maximum projected inspection pose',()=>{
  for(const [w,h] of [[1720,636],[940,1246],[960,636],[960,866]]) {
    const g=effect.geometry(w,h),z=g.w*.575*Math.sin(35*Math.PI/180),projection=2800/(2800-z);
    assert.ok(g.h*1.15*projection+40<h);assert.ok(g.w*1.15<=w-64+1e-9);
    assert.equal(g.compact,w<1000);assert.ok(g.h>=400);
  }
});
test('selection is relative to contained source pixels, including letterbox space',()=>{
  const box=effect.contain(600,400,1600,900,{x:.1,y:.2,width:.5,height:.4});
  assert.deepEqual(plain(box),{x:0,y:31.25,w:600,h:337.5,selection:{x:60,y:98.75,w:300,h:135}});
  assert.throws(()=>effect.contain(0,400,1600,900,{}));
});
test('arbitrary seeking is pure and invalid state fails explicitly',()=>{
  const frames=Array.from({length:370},(_,i)=>plain(state(i/30)));
  for(let i=frames.length-1;i>=0;i--)assert.deepEqual(plain(state(i/30)),frames[i]);
  for(const values of [[NaN,3,3],[1,2,3],[1,10,3],[1,3,33],[1,3,0]])assert.throws(()=>effect.state(...values));
  assert.throws(()=>effect.geometry(400,300));assert.throws(()=>effect.geometry(NaN,690));
});
