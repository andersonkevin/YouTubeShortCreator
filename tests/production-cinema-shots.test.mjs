import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-cinema-shots.js',import.meta.url),'utf8'),context);
const {camera,state,travel}=context.window.ShortCreatorCinemaShots;
const shot={from:[1,.1,.2],to:[2.8,.9,.8],seam:'cut'};
test('crop coverage holds through every frame, focus extreme and source aspect ratio',()=>{
  for(const [width,height] of [[1920,1080],[1080,1920]])for(const [w,h] of [[1672,941],[512,2048],[4096,512]])for(const focus of [0,.5,1])for(let f=0;f<=180;f++){
    const s=camera({...shot,from:[1,focus,focus],to:[2.8,1-focus,1-focus]},f/180,w,h,width,height);
    assert.ok(s.x<=.0001&&s.y<=.0001&&s.x+s.w>=width-.001&&s.y+s.h>=height-.001);
    assert.ok(Math.abs(s.w/s.h-w/h)<1e-10,'The crop must not stretch source imagery');
  }
  assert.throws(()=>camera(shot,.5,0,100));assert.throws(()=>camera(shot,NaN,100,100));
});
test('portrait focus keeps the selected subject centered in a wide source',()=>{
  const width=1080,height=1920,iw=1672,ih=941,subject=.72;
  const projectedWidth=iw*height/ih,focus=(subject*projectedWidth-width/2)/(projectedWidth-width);
  const fixed={from:[1,focus,.5],to:[1,focus,.5]};
  const crop=camera(fixed,.5,iw,ih,width,height);
  assert.ok(Math.abs(crop.x+subject*crop.w-width/2)<1e-8);
  assert.ok(Math.abs(crop.h-height)<1e-8);
});
test('camera travel has exact endpoints, monotonic movement and continuous ramp velocity',()=>{
  assert.equal(travel(0),0);assert.equal(travel(1),1);
  for(let i=1;i<=600;i++)assert.ok(travel(i/600)>=travel((i-1)/600));
  for(const p of [.12,.88])assert.ok(Math.abs((travel(p)-travel(p-1e-6))-(travel(p+1e-6)-travel(p)))<1e-10);
});
test('cut selection and optical cover are deterministic in either seek order',()=>{
  const shots=[shot,{...shot,seam:'focus'},{...shot,seam:'occlude'}],onsets=[.4,5,10];
  assert.equal(state(shots,onsets,16,4.999).index,0);
  assert.equal(state(shots,onsets,16,5).index,1);
  assert.equal(state(shots,onsets,16,5).blur,18);
  assert.equal(state(shots,onsets,16,10).curtain,0);
  assert.equal(state(shots,onsets,16,11).curtain,null);
  const sample=t=>JSON.stringify(state(shots,onsets,16,t));
  const times=[0,4.8,5,5.2,9.8,10,10.2,15.9],before=times.map(sample);
  times.slice().reverse().forEach(sample);assert.deepEqual(times.map(sample),before);
});
