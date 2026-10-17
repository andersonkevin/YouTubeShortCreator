import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};
for(const name of ['production-maps.js','production-carousels.js','production-map-spotlight.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name,import.meta.url),'utf8'),context);
const m=context.window.ShortCreatorMapSpotlight,clock=context.window.ShortCreatorCarousels.clock;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`),plain=x=>JSON.parse(JSON.stringify(x));

test('source camera approach, landing and pullback retain their boundary poses',()=>{
  for(const [t,scale,x,y] of [[0,.92,-70,18],[1.59,1.52,-63,-2],[3.18,2.12,-56,-22],[3.6,2.2,-44,-34],[4.2,2.2,-44,-34],[6.55,2.06,-82,-8]]) {
    const s=m.state(t);near(s.camera.scale,scale);near(s.camera.x,x);near(s.camera.y,y);
  }
  near(m.state(3.18).camera.saturation,1.08);near(m.state(3.18).camera.contrast,1.04);
  assert.deepEqual(plain(m.state(600)),plain(m.state(6.55)));assert.throws(()=>m.state(NaN));
});

test('original two scribbles, explicit label and finite tint respond to the source events',()=>{
  assert.equal(m.paths.length,2);assert.ok(m.paths[0].startsWith('M 74 211'));assert.ok(m.paths[1].startsWith('M 92 231'));
  near(m.state(3.12).annotation.alpha,0);near(m.state(3.28).annotation.alpha,1);
  near(m.state(3.24).draw[0],0);near(m.state(3.86).draw[0],1);near(m.state(3.9).draw[1],1);
  near(m.state(3.78).label.alpha,0);near(m.state(4.06).label.alpha,1);near(m.state(4.06).wash,1);near(m.state(6.55).wash,.82);
  near(m.state(4.04).scan,.44);near(m.state(4.24).annotation.scale,1.045);near(m.state(4.38).annotation.scale,1);
  for(let i=0;i<4;i++){near(m.state(.42+i*.035).corners[i].alpha,0);near(m.state(.7+i*.035).corners[i].alpha,.72);near(m.state(6.55).corners[i].alpha,.38);}
});

test('image-relative selected region and ink stay within every native slot once revealed',()=>{
  for(const [w,h] of [[1720,398],[940,920],[960,398],[960,628]])
    for(const [iw,ih] of [[1920,1080],[1080,1920],[1080,1080]])
      for(const region of [{x:.05,y:.05,width:.1,height:.1},{x:.65,y:.65,width:.3,height:.3},{x:.35,y:.35,width:.3,height:.3}]) {
        for(let frame=95;frame<=197;frame++) {
          const s=m.state(frame/30),g=m.geometry(w,h,iw,ih,region,s);
          assert.ok(g.ink.x>=0&&g.ink.y>=0&&g.ink.x+g.ink.width<=w&&g.ink.y+g.ink.height<=h);
          near(g.region.width,region.width*g.box.width*s.camera.scale);near(g.region.height,region.height*g.box.height*s.camera.scale);
          const labelTop=Math.max(12,g.ink.y-94-12);assert.ok(labelTop+94<=h);
        }
      }
});

test('all source states are bounded and reproduce backward seeks at fractional and long cues',()=>{
  for(let frame=0;frame<=210;frame++) {
    const s=m.state(frame/30);for(const alpha of [s.annotation.alpha,s.label.alpha,s.wash,s.scan,...s.corners.map(c=>c.alpha)])assert.ok(alpha>=0&&alpha<=1);
    assert.ok(s.camera.scale>=.92&&s.camera.scale<2.21);
  }
  for(const onsets of [[.5,7.5],[.515,7.515],[.5,590.5]])for(const time of [0,.51,1,3,5,8,300,599]) {
    const result=plain(m.state(clock(time,onsets,6.55).time));
    m.state(clock(600,onsets,6.55).time);m.state(clock(0,onsets,6.55).time);
    assert.deepEqual(plain(m.state(clock(time,onsets,6.55).time)),result);
  }
});
