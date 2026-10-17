import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-app-install.js',import.meta.url),'utf8'),context);
const {state,geometry,scrollTarget,yoyo}=context.window.ShortCreatorAppInstall;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`),plain=x=>JSON.parse(JSON.stringify(x));
test('source phone entry, scrolling, row cascade, tap and button press remain distinct',()=>{
  const first=state(0);near(first.phone.y,760);near(first.phone.scale,.82);near(first.phone.rotation,-2.5);near(first.phone.alpha,0);
  near(state(.47).phone.y,0);near(state(.47).phone.scale,1);assert.ok(state(.3).phone.y<0,'Original back ease overshoots');
  assert.equal(state(.5).rows[0]>0,true);assert.equal(state(.5).rows[1],0);
  near(state(.62).scroll,0);near(state(1.22).scroll,.96875);near(state(1.82).scroll,1);
  assert.ok(state(1.85).selection>1.035);near(state(2.15).selection,1);
  near(state(2.02).tapAlpha,.95);near(state(2.44).tapAlpha,0);near(state(2.44).tapScale,2.15);
  near(state(2.14).press,.82);near(state(2.28).press,1);
});
test('interrupted source scale tweens retain their actual initial scale',()=>{
  const expected=1+.012*(1-(1-(2-(1.25-.92)/.18))**3);
  near(state(1.25).windowScale,expected);near(state(1.39).windowScale,1.014);near(state(1.53).windowScale,expected);
  const panelBase=.96+.04*(1-(1-(3.18-2.92)/.38)**4);
  near(state(3.18).panel.scale,panelBase);near(state(3.3).panel.scale,1.025);near(state(3.42).panel.scale,panelBase);
  near(state(3.68).panel.scale,1.03);near(state(4.4).panel.scale,1.04);near(state(4.52).panel.scale,panelBase);
});
test('detail card, icon, facts and progress preserve the source stagger',()=>{
  near(state(2.32).detail.alpha,0);near(state(2.32).detail.y,620);near(state(2.78).detail.alpha,1);
  near(state(2.47).detail.iconScale,.55);near(state(2.79).detail.iconScale,1);
  near(state(2.78).facts[0],0);assert.ok(state(2.84).facts[0]>state(2.84).facts[1]);near(state(2.84).facts[2],0);
  near(state(3.04).button.progress,0);near(state(3.64).button.progress,.5);near(state(4.24).button.progress,1);
  near(state(3.73).panel.progress,.5);assert.equal(state(3.73).panel.percent,50);assert.equal(state(4.44).panel.percent,100);
  for(let f=0;f<=190;f++){const s=state(f/30);assert.equal(s.panel.percent,Math.round(s.panel.progress*100));}
  near(state(4.6).button.ring,0);near(state(4.6).button.ringScale,.35);near(state(4.72).button.open,1);near(state(4.96).status.alpha,1);
});
test('phone impact exit and brand-colored board wipe finish before the native hold',()=>{
  assert.ok(state(4.82).phone.scale>1.025);near(state(5.06).phone.scale,1);
  near(state(5.44).phone.y,0);near(state(5.92).phone.y,1050);near(state(5.92).phone.scale,.78);near(state(5.92).phone.rotation,-3.5);
  near(state(5.51).shadow.alpha,1);near(state(5.9).shadow.alpha,0);near(state(5.68).speed.y,420);near(state(5.94).speed.alpha,0);
  near(state(5.86).wipe,0);near(state(6.28).wipe,1);assert.deepEqual(plain(state(600)),plain(state(6.28)));
});
test('measured scroll targets show any selected app without crossing the content boundary',()=>{
  near(scrollTarget(400,70,330,616),286);near(scrollTarget(0,70,330,616),0);
  for(let i=0;i<8;i++){const offset=scrollTarget(i*78,70,330,616);assert.ok(i*78-offset>=0&&i*78-offset+70<=330);}
  assert.throws(()=>scrollTarget(0,70,60,616));assert.throws(()=>scrollTarget(NaN,70,330,616));
});
test('four formats preserve phone aspect, readable native UI scale and deterministic seeks',()=>{
  for(const [w,h] of [[1720,636],[940,1246],[960,636],[960,866]]) {
    const g=geometry(w,h);near(g.width/g.height,462/952);assert.ok(g.unit>1.25&&g.unit<1.6);
    assert.ok(g.x>=250&&g.y>=0&&g.x+g.width<=w&&g.y+g.height<=h);
  }
  for(let f=0;f<=189;f++){const t=f/30,s=plain(state(t));state(600);state(0);assert.deepEqual(plain(state(t)),s);}
  for(const bad of [NaN,Infinity,-Infinity])assert.throws(()=>state(bad));
  near(yoyo(1,.5,.1),0);assert.throws(()=>geometry(400,300));
});
