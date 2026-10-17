import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const context={window:{}};
for(const file of ['production-carousel-rig','production-carousel-presets','production-carousels'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file+'.js',import.meta.url),'utf8'),context);
const {clock,create}=context.window.ShortCreatorCarousels;
const presets=context.window.ShortCreatorCarouselPresets,R=context.window.ShortCreatorCarouselRig;

test('path distance, wrap and tangent preserve the upstream sampled Bezier model',()=>{
  const path=R.buildPath([{p:[0,0],in:[0,0],out:[10/3,0]},{p:[10,0],in:[-10/3,0],out:[0,0]}],false,64);
  assert.ok(Math.abs(path.length-10)<1e-9);
  for(const p of [0,.25,.5,.75,1]) {
    const point=path.pointOnPath(p);assert.ok(Math.abs(point[0]-10*p)<1e-9);assert.equal(point[1],0);
    assert.equal(JSON.stringify(path.tangentOnPath(p)),JSON.stringify([1,0]));
  }
  assert.equal(JSON.stringify(path.pointOnPath(2)),JSON.stringify([10,0]));
  const line=R.aeCurve([{time:0,value:0,flags:'01010000'},{time:2,value:100,flags:'01010000'}]);
  assert.equal(line.at(1),50);assert.equal(line.at(-1),0);assert.equal(line.at(3),100);
});

test('all 26 recipes retain distinct finite trajectories and reproduce arbitrary seeks',()=>{
  assert.equal(Object.keys(presets).length,26);
  const signatures=new Set(),before=JSON.stringify(presets);
  for(const [name,preset] of Object.entries(presets)) {
    const sample=create(name,preset.text?3:0),signature=[];
    for(let frame=0;frame<=preset.comp.duration*30;frame++) {
      const poses=sample(frame/30);assert.equal(poses.length,preset.n);
      for(const p of poses) {
        for(const key of ['x','y','z','scale','rotX','rotY','rotZ','alpha','entry','entryScale'])assert.ok(Number.isFinite(p[key]),name+' '+key);
        assert.ok(p.alpha>=0&&p.alpha<=1);assert.ok(p.entry>=0&&p.entry<=1);
      }
      if(frame%30===0)signature.push(poses);
    }
    signatures.add(JSON.stringify(signature));
    for(const t of [0,1.5,6,2,0,.3,5,1]) {
      const expected=JSON.stringify(sample(t));sample(6);sample(0);
      assert.equal(JSON.stringify(sample(t)),expected);
    }
    assert.equal(JSON.stringify(sample(30)),JSON.stringify(sample(preset.comp.duration)));
  }
  assert.equal(signatures.size,26,'Preset names must correspond to different trajectories');
  assert.equal(JSON.stringify(presets),before,'Rendering must not mutate shared geometry');
  assert.throws(()=>create('constructor'));assert.throws(()=>create('external'));assert.throws(()=>create('circle-1')(NaN));
});

test('caption clock is frame-quantized, decelerates continuously and holds at settle',()=>{
  const starts=[.5,6.5],duration=6,end=7.3;
  assert.equal(clock(.49,starts,duration).visible,false);
  assert.equal(clock(.5,starts,duration).visible,true);
  assert.equal(clock(.5,starts,duration).time,0);
  let last=0,lastDelta=Infinity;
  for(let frame=15;frame<=219;frame++) {
    const state=clock(frame/30,starts,duration),delta=state.time-last;
    assert.ok(delta>=0);assert.ok(state.time<=duration);
    if(frame>196)assert.ok(delta<=lastDelta+1e-12,'Velocity must decrease during settle');
    last=state.time;lastDelta=delta;
    assert.equal(state.time,clock((frame+.2)/30,starts,duration).time);
  }
  assert.equal(clock(end,starts,duration).time,duration);assert.equal(clock(end,starts,duration).settle,1);
  assert.equal(JSON.stringify(clock(end,starts,duration)),JSON.stringify(clock(600,starts,duration)));
  for(const starts of [[0,1],[0],[0,Infinity]])assert.throws(()=>clock(1,starts,6));
  assert.throws(()=>clock(NaN,[0,6],6));
});

test('text rings converge before the final hold without altering carousel poses',()=>{
  const text=create('text-circle-1',3),plain=create('circle-1');
  assert.ok(Math.abs(text(0)[0].x-1920)>=Math.abs(plain(0)[0].x-1920));
  for(const t of [2,3,4])for(let i=0;i<12;i++)for(const key of ['x','y','scale','rotZ'])
    assert.ok(Math.abs(text(t)[i][key]-plain(t)[i][key])<1e-9);
});

test('promo belt retains all measured entry samples, row pitch and source travel',()=>{
  const {belt,beltEntry}=context.window.ShortCreatorCarousels;
  for(let i=0;i<beltEntry.length;i++) {
    const t=i/25,poses=belt(t);assert.equal(poses.length,12);
    assert.ok(Math.abs(poses[0].x-(320.1-93.601*t+beltEntry[i]))<1e-8);
    assert.equal(poses[6].y-poses[0].y,404);assert.equal(poses[6].x,poses[0].x);
  }
  assert.ok(Math.abs(belt(10)[0].x-(320.1-1016.01))<1e-8);
  assert.equal(JSON.stringify(belt(600)),JSON.stringify(belt(10)));assert.throws(()=>belt(NaN));
});
