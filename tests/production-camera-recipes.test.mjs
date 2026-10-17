import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-media-camera.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorMediaCamera;
test('nine measured camera profiles retain lens ratios and positional channel asymmetry',()=>{
  assert.equal(Object.keys(api.profiles).length,9);
  assert.equal(api.profiles['handheld-wideangle-mild'].lens,28);
  assert.equal(api.profiles['handheld-normal-mild'].lens,50);
  assert.equal(api.profiles['handheld-tele-mild'].lens,85);
  assert.equal(api.profiles['handheld-wideangle-mild'].rot[0][0][0]/api.profiles['handheld-tele-mild'].rot[0][0][0],3);
  const position=api.profiles['rig-6d-shake'].pos.flat();
  assert.equal(position.filter(ch=>ch[2]===0).length,1);
  assert.equal(api.profiles['rig-6d-shake'].pos[1][1][2],0);
  for(let seed=0;seed<50;seed++)for(let i=-10;i<=10;i++) {
    const v=api.noiseHash(i,seed);assert.ok(v>=0&&v<1);
    assert.equal(api.noise(i,seed),v);
    assert.ok(Math.abs(api.noise(i-1e-8,seed)-v)<1e-7);
  }
});
test('finite camera impact preserves an exact untransformed endpoint in every profile',()=>{
  const signatures=new Set();
  for(const profile of Object.keys(api.profiles))for(const [w,h] of [[1600,340],[800,800],[800,510],[800,360]]) {
    const states=Array.from({length:25},(_,f)=>api.shake(profile,f/24,w,h));
    for(const s of states)assert.ok(Object.values(s).every(Number.isFinite)&&s.scale>0&&s.perspective>0);
    for(const s of [states[0],states[24]])for(const [key,value] of Object.entries({x:0,y:0,rx:0,ry:0,roll:0,scale:1}))assert.equal(s[key],value);
    assert.ok(states.slice(1,24).some(s=>s.x!==0||s.y!==0||s.roll!==0));
    for(let f=24;f>=0;f--)assert.equal(JSON.stringify(api.shake(profile,f/24,w,h)),JSON.stringify(states[f]));
    if(w===1600)signatures.add(JSON.stringify(states));
  }
  assert.equal(signatures.size,9);
});
test('source extended velocity reaches the target early with a monotonic moving tail',()=>{
  assert.equal(api.extended(0),0);assert.equal(api.extended(1),1);
  assert.ok(Math.abs(api.extended(102/512)-.87)<1e-10);
  const samples=Array.from({length:25},(_,i)=>api.extended(i/24));
  assert.ok(samples.every((x,i)=>!i||x>samples[i-1]));
  assert.ok(samples[5]>.87);assert.ok(samples[23]<1);
  for(const style of ['extended-left','extended-right','extended-up','extended-down']) {
    const start=api.state(style,0,0,800,600),end=api.state(style,1,0,800,600);
    assert.equal(Math.abs(start.x)+Math.abs(start.y),style.endsWith('left')||style.endsWith('right')?176:132);
    assert.equal(Math.abs(end.x)+Math.abs(end.y),0);
  }
});
test('pendulum uses the damped source cosine and lands upright without history',()=>{
  assert.equal(api.state('pendulum-left',0).roll,-18);assert.equal(api.state('pendulum-right',0).roll,18);
  for(let frame=0;frame<24;frame++) {
    const p=frame/24,left=api.state('pendulum-left',p),right=api.state('pendulum-right',p);
    assert.equal(left.roll,-right.roll);assert.ok(Math.abs(left.roll)<=18);
  }
  assert.ok(api.state('pendulum-right',1/3.5).roll<0);
  assert.equal(api.state('pendulum-left',1).roll,0);assert.equal(api.state('pendulum-right',1).roll,0);
});
