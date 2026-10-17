import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-network-layouts.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorNetworkLayouts;
test('all supplied nodes are fully readable at rest across formats and allowed counts',()=>{
  for(const style of api.kinds)for(const [W,H] of [[1720,443],[940,990],[960,443],[960,673]])for(let count=3;count<=7;count++) {
    const w=Math.min(220,W*.19),h=style==='avatar-cloud'?112:78;
    const states=Array.from({length:count},(_,i)=>api.pose(style,i,count,1,W,H));
    assert.ok(api.readable(states,Array(count).fill(1),w,h,W,H).every(Boolean),`${style} ${W}x${H} count ${count}`);
    assert.ok(states.every(s=>s.opacity===1&&s.line===1&&s.scale===1));
    assert.equal(states[0].x,W/2);assert.equal(states[0].y,H/2);assert.equal(states[0].rotation,0);
  }
});
test('center stays fixed while every peripheral presentation has distinct finite movement',()=>{
  const signatures=new Set();
  for(const style of api.kinds) {
    const frames=[];
    for(let f=0;f<=24;f++) {
      const p=f/24,center=api.pose(style,0,7,p,960,443);
      assert.equal(center.x,480);assert.equal(center.y,221.5);
      const states=Array.from({length:7},(_,i)=>api.pose(style,i,7,p,960,443));
      assert.ok(states.every(s=>Object.values(s).every(Number.isFinite)&&s.opacity>=0&&s.opacity<=1));frames.push(states);
    }
    signatures.add(JSON.stringify(frames));
    for(let f=24;f>=0;f--)for(let i=0;i<7;i++)assert.equal(JSON.stringify(api.pose(style,i,7,f/24,960,443)),JSON.stringify(frames[f][i]));
  }
  assert.equal(signatures.size,4);
});
test('copy containment prioritizes settled labels over passing silhouettes',()=>{
  const rest={x:300,y:200,scale:1,rotation:0,opacity:1,line:1};
  const moving={...rest,x:320};
  assert.equal(JSON.stringify(api.readable([moving,rest],[.5,1],180,78,960,443)),JSON.stringify([false,true]));
  const outside={...rest,x:-10};assert.equal(api.readable([outside],[.5],180,78,960,443)[0],false);
});
test('source orbit phase and radial alternating compass order are retained',()=>{
  const ring=api.pose('nucleus-orbit',1,7,0,1000,600);
  const angle=(-90-210)*Math.PI/180;
  assert.ok(Math.abs(ring.x-(500+Math.cos(angle)*360*23/35))<1e-9);
  assert.ok(Math.abs(ring.y-(300+Math.sin(angle)*210*23/35))<1e-9);
  const left=api.pose('radial-surround',3,7,1,1000,600),right=api.pose('radial-surround',2,7,1,1000,600);
  assert.ok(left.x<500&&right.x>500);assert.ok(Math.abs(left.y-right.y)<1e-9);
});
