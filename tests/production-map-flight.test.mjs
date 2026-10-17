import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{}};
for(const file of ['production-maps.js','production-carousels.js','production-map-flight.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file,import.meta.url),'utf8'),context);
const flight=context.window.ShortCreatorMapFlight,clock=context.window.ShortCreatorCarousels.clock;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const plain=x=>JSON.parse(JSON.stringify(x));

test('source cubic controls and endpoints survive the identity map',()=>{
  const c=flight.route(flight.origin,flight.destination,{x:0,y:0,width:1920,height:1080});
  near(c.a.x,650);near(c.a.y,520);near(c.b.x,1120);near(c.b.y,245);
  assert.deepEqual(plain(flight.point(c,0)),plain(flight.origin));
  assert.deepEqual(plain(flight.point(c,1)),plain(flight.destination));
  near(flight.point(c,.5).x,(308.41+3*650+3*1120+1611.59)/8);
  near(flight.point(c,.5).y,(584.158+3*520+3*245+387.842)/8);
});

test('local contain mapping and constrained cubic controls fit all format slots and directions',()=>{
  for(const [w,h] of [[1720,322],[940,844],[960,322],[960,552]])
    for(const [iw,ih] of [[1920,1080],[1080,1920],[4096,32],[32,4096]])
      for(const [ax,ay,bx,by] of [[.15,.15,.85,.85],[.85,.15,.15,.85],[.15,.85,.85,.15],[.85,.85,.15,.15],[.5,.15,.5,.85]]) {
        const box=context.window.ShortCreatorMaps.contained(w,h,iw,ih);
        const a={x:box.x+ax*box.width,y:box.y+ay*box.height},b={x:box.x+bx*box.width,y:box.y+by*box.height};
        const c=flight.route(a,b,box);
        for(let i=0;i<=120;i++) {
          const p=flight.point(c,i/120);
          assert.ok(p.x>=box.x-1e-8&&p.x<=box.x+box.width+1e-8&&p.y>=box.y-1e-8&&p.y<=box.y+box.height+1e-8);
        }
      }
});

test('route layers keep independent source eases, departure and arrival timings',()=>{
  const start=flight.state(0);assert.equal(start.travel,0);assert.equal(start.plane.alpha,0);
  assert.ok(start.pins.every(p=>p.alpha===0));assert.ok(start.draw.every(p=>p===0));
  near(flight.state(1.17).travel,0);near(flight.state(1.17+3.25/2).travel,.5);near(flight.state(4.42).travel,1);
  near(flight.state(1.16+3.1/2).draw[0],.5);near(flight.state(1.2+3.05/2).draw[1],.5);near(flight.state(1.26+2.92/2).draw[2],.5);
  near(flight.state(4.18).doodles[0],0);near(flight.state(4.72).doodles[0],1);near(flight.state(4.72).doodles[1],1);
  near(flight.state(5.12).plane.scale,1.23);near(flight.state(5.24).plane.scale,.9);near(flight.state(5.46).plane.scale,1);
  near(flight.state(5.02).badge.alpha,0);near(flight.state(5.3).badge.alpha,1);near(flight.state(5.46).badge.scale,1.06);
  const rest=flight.state(5.62);near(rest.camera.scale,1.025);near(rest.camera.x,0);near(rest.camera.y,0);
  near(rest.badge.scale,1);near(rest.pulse.alpha,0);near(rest.plane.scale,1);
  assert.deepEqual(plain(rest),plain(flight.state(600)));assert.deepEqual(plain(start),plain(flight.state(-10)));
  assert.throws(()=>flight.state(NaN));assert.throws(()=>flight.state(Infinity));
});

test('six ticks are staggered, interrupted continuously, and settle without idle loops',()=>{
  for(let i=0;i<6;i++) {
    const first=1.34+i*.44,exit=1.48+i*.44,end=exit+.34;
    near(flight.state(first).ticks[i].alpha,0);near(flight.state(end).ticks[i].alpha,.18);near(flight.state(end).ticks[i].scale,.6);
    const a=flight.state(exit-1e-9).ticks[i],b=flight.state(exit+1e-9).ticks[i];
    assert.ok(Math.abs(a.alpha-b.alpha)<1e-7&&Math.abs(a.scale-b.scale)<1e-7);
  }
  let previous=0;
  for(let frame=0;frame<=180;frame++) {
    const s=flight.state(frame/30);assert.ok(s.travel>=previous);previous=s.travel;
    for(const item of [...s.ticks,...s.pins,s.plane,s.badge,s.pulse])assert.ok(item.alpha>=0&&item.alpha<=1&&item.scale>0&&item.scale<=1.51);
    assert.ok(s.draw.every(p=>p>=0&&p<=1)&&s.doodles.every(p=>p>=0&&p<=1));
  }
});

test('shared native clock remains finite and reproducible at fractional cues and long holds',()=>{
  for(const onsets of [[.5,6.5],[.515,6.515],[.5,590.5]]) {
    const end=(Math.ceil(onsets[1]*30)+24)/30;
    near(clock(end,onsets,5.62).time,5.62);near(clock(600,onsets,5.62).time,5.62);
    for(const time of [0,.5,.5333,1,2,5,6.5,7.3,300,599]) {
      const expected=plain(flight.state(clock(time,onsets,5.62).time));
      flight.state(clock(600,onsets,5.62).time);flight.state(clock(0,onsets,5.62).time);
      assert.deepEqual(plain(flight.state(clock(time,onsets,5.62).time)),expected);
    }
  }
});
