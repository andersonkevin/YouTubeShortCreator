import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-brand-lockups.js',import.meta.url),'utf8'),context);
const {clock,intro,assembly,collision,badges,lines,badgeGeometry}=context.window.ShortCreatorBrandLockups;
const plain=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('logo intro preserves source entrances, kicker handoff and final arrow',()=>{
  assert.equal(intro(0).root,0);near(intro(.288).logo,0);near(intro(.838).scale,1);near(intro(1.188).kicker,1);
  assert.ok(intro(.65).scale>1,'Source logo spring overshoots');
  near(intro(2.6).kicker,0);near(intro(2.66).title,0);near(intro(3.16).title,1);
  const end=intro(3.35);near(end.arrow,1);near(end.arrowScale,1);near(end.arrowX,0);
  assert.equal(JSON.stringify(intro(600)),JSON.stringify(end));
  assert.equal(lines().length,12);assert.ok(lines().every(line=>line.y>0&&line.y<1&&Math.abs(line.angle)<=.35));
});
test('logo assembly retains the five source staggers and overlapping scale return',()=>{
  const first=assembly(0);assert.ok(first.pieces.every(p=>p.alpha===0&&p.x===1920));
  const before=assembly(.1);assert.ok(before.pieces[0].alpha>before.pieces[1].alpha);assert.equal(before.pieces[2].alpha,0);
  const at=assembly(1.5),later=assembly(1.7),rest=assembly(1.9);
  assert.ok(at.pieces[0].scale>at.pieces[4].scale);
  for(let i=0;i<5;i++){near(later.pieces[i].scale,(at.pieces[i].scale+1)/2);near(rest.pieces[i].scale,1);near(rest.pieces[i].x,0);}
  assert.ok(rest.assembled);near(assembly(3.2).title,1);near(assembly(3.2).action,1);near(assembly(3.2).glow,0);
});
test('destination badges preserve the source lead, stagger, rise and readable hold',()=>{
  assert.equal(badges(0,2).titleY,.22);assert.equal(badges(0,2).items[0].y,.28);
  near(badges(.22/1.2,2).items[0].alpha,0);near(badges(.32/1.2,2).items[1].alpha,0);
  const end=badges(1,2);near(end.title,1);near(end.footer,1);assert.ok(end.items.every(item=>item.alpha===1&&item.y===0));
  assert.throws(()=>badges(0,0));assert.throws(()=>badges(NaN,1));
});
test('native clocks support finite long holds and reproduce reverse seeks without state',()=>{
  for(const style of ['logo-intro','logo-assemble','badge-pair','logo-collide']) {
    const onsets=style==='badge-pair'?[.4]:[.4,590.4];
    for(const t of [0,.4,.8,1.2,2,300,590.4,591.2,599]) {
      const a=plain(clock(style,t,onsets));clock(style,599,onsets);clock(style,0,onsets);assert.deepEqual(plain(clock(style,t,onsets)),a);
    }
  }
  near(clock('logo-intro',300,[.4,590.4]).seconds,1.188);
  near(clock('logo-assemble',300,[.4,590.4]).seconds,1.9);
  assert.throws(()=>clock('logo-intro',1,[.4,.6]));assert.throws(()=>clock('custom',1,[.4]));assert.throws(()=>clock('badge-pair',NaN,[.4]));
});
test('promotional collision retains five approach vectors, ring and finite logo exit',()=>{
  assert.deepEqual(plain(collision(0).pieces),[{x:-960,y:-540},{x:960,y:-540},{x:-960,y:0},{x:960,y:0},{x:-960,y:540}]);
  assert.ok(collision(.4).pieces[0].x>0,'Source convergence has bounded overshoot');
  assert.ok(collision(.8).assembled);collision(.8).pieces.forEach(n=>{near(n.x,0);near(n.y,0);});
  near(collision(.8).ring,1);near(collision(.8).ringScale,.2);near(collision(.95).scale,1.05);
  near(collision(1.1).scale,1);near(collision(1.2).ring,0);near(collision(1.35).scale,1-2**-5);
  near(collision(1.5).scale,0);near(collision(1.5).copy,1);
  assert.deepEqual(plain(collision(600)),plain(collision(1.5)));
  near(clock('logo-collide',300,[.4,590.4]).seconds,1.2);
  near(clock('logo-collide',599,[.4,590.4]).seconds,1.5);
});
test('equal badge geometry fits all four native content boards and separates header and footer',()=>{
  for(const [w,h,tall] of [[1720,690,false],[940,1300,true],[960,690,false],[960,920,true]])for(const count of [1,2]) {
    const boxes=badgeGeometry(w,h,tall,count);
    for(const b of boxes){assert.ok(b.x>=0&&b.x+b.w<=w&&b.y>=204&&b.y+b.h+0.28*b.h<h-144);assert.ok(Math.abs(b.w/b.h-3.12)<.03);}
    if(count===2){assert.equal(boxes[0].w,boxes[1].w);assert.equal(boxes[0].h,boxes[1].h);
      assert.ok(tall?boxes[0].y+boxes[0].h<boxes[1].y:boxes[0].x+boxes[0].w<boxes[1].x);}
  }
});
