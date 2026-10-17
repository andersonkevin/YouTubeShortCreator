import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Uint8ClampedArray};
for(const name of ['production-gpu-backdrops','production-canvas-backdrops'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorCanvasBackdrops,plain=v=>JSON.parse(JSON.stringify(v));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('source emitter seed, field dimensions and high-pass remain deterministic',()=>{
  const points=api.emitters();assert.equal(points.length,140);assert.deepEqual(plain(api.emitters()),plain(points));
  // First Mulberry32(1337) value: independent pinned source fixture.
  near(points[0].x0,.1844118325971067);
  for(const t of [0,1,5,10])for(const e of points) {
    const s=api.emitterPose(e,t,1920,1080),half=api.emitterPose(e,t,960,540);
    near(s.x,half.x*2);near(s.y,half.y*2);near(s.radius,half.radius*2);
    assert.ok(s.brightness>=0&&s.brightness<=1);assert.ok(s.radius>=3&&s.radius<=13);
  }
  const dark=api.highpass([.2,.1,.3],1,[1,1,1],1);assert.equal(dark.alpha,0);
  const light=api.highpass([1,.5,.1],1,[.5,1,1],1);
  near(light.alpha,.35*5/(80/3));near(light.hue[0],1);near(light.hue[1],.2/.35);near(light.hue[2],0);
  for(const value of [NaN,-1,11])assert.throws(()=>api.emitterPose(points[0],value,100,100));
});
test('all three cadences quantize before movement and reproduce arbitrary seek order',()=>{
  for(const fps of [8,10,12])for(const [w,h] of [[1720,690],[940,1300],[960,690],[960,920]]) {
    const frames=Array.from({length:101},(_,f)=>Array.from({length:4},(_,i)=>plain(api.stopPose(i,f/30,fps,w,h))));
    for(let f=100;f>=0;f--)for(let i=0;i<4;i++)assert.deepEqual(plain(api.stopPose(i,f/30,fps,w,h)),frames[f][i]);
    for(let step=0;step<3*fps;step++)for(let i=0;i<4;i++)
      assert.deepEqual(plain(api.stopPose(i,step/fps,fps,w,h)),plain(api.stopPose(i,(step+.9)/fps,fps,w,h)));
    for(let i=0;i<4;i++) {
      const rest=api.stopPose(i,3,fps,w,h);assert.equal(rest.settled,true);assert.equal(rest.sx,1);assert.equal(rest.sy,1);
      assert.equal(rest.sparkle.visible,false);near(rest.x,[.3,.56,.72,.43][i]*w);near(rest.y,.72*h);
      assert.deepEqual(plain(api.stopPose(i,600,fps,w,h)),plain(rest));
    }
  }
});
test('landing squash and sparkle lifetimes use the source integer hit schedule',()=>{
  for(const fps of [8,10,12])for(let i=0;i<4;i++) {
    const th=api.throws[i],land=Math.round(th.t1*fps);
    for(let d=-1;d<=4;d++) {
      const s=api.stopPose(i,(land+d)/fps,fps,1000,600);
      const a=d<0?0:[1,.55,-.3,.1,0][d]*th.squash;
      near(s.sx,1+a);near(s.sy,1-a*.85);assert.equal(s.sparkle.visible,d>=0&&d<th.life);
    }
  }
  const mid=api.stopPose(0,.6,10,1000,600),u=(.6-.15)/.85;
  // Remove the independently pinned two-step boil to check the ballistic arc.
  const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  near(mid.x- (hash(3*13)-.5)*.008*600,(-.12+.42*u)*1000);
  near(mid.y- (hash(3*29)-.5)*.008*600,(.28+.44*u-.3*4*u*(1-u))*600);
});
test('native cue clock includes finite entry and fixed stop-motion duration',()=>{
  const onsets=[.507,3.507],start=Math.ceil(onsets[0]*30);
  for(const style of api.kinds) {
    const before=api.clock(style,(start-1)/30,onsets);assert.equal(before.visible,false);assert.equal(before.sourceTime,0);
    const rest=api.clock(style,600,onsets);assert.equal(rest.entry,1);assert.equal(rest.settle,1);
    const durations={'anamorphic-flare':10,'mesh-card':8.6,'facet-morph':4.1025,'soft-blob-touch':3.1625,'scope-sine':6,'scope-square':6,'scope-triangle':6};
    assert.equal(rest.sourceTime,durations[style]??3);
    if(style.startsWith('stop'))assert.equal(rest.cadence,Number(style.slice(12)));
    for(const gap of [.8,1.9])assert.throws(()=>api.clock(style,1,[0,gap]));
  }
  for(const style of api.kinds.filter(s=>s.startsWith('stop-')))assert.throws(()=>api.clock(style,1,[0,2.99]));
  assert.throws(()=>api.clock('unknown',1,onsets));
  for(const fps of [0,9,NaN])assert.throws(()=>api.stopPose(0,1,fps,100,100));
});
test('mesh card retains the source full-frame to rounded-card to full-frame geometry',()=>{
  for(const t of [0,3.8,8.6]) {
    const s=api.meshCardPose(t);assert.equal(s.x,0);assert.equal(s.y,0);assert.equal(s.width,1);assert.equal(s.height,1);
  }
  for(const t of [4.9,6,7.6]) {
    const s=api.meshCardPose(t);near(s.x,240/1920);near(s.y,140/1080);near(s.width,1440/1920);near(s.height,800/1080);near(s.radius,40);
  }
  near(api.meshCardPose(0).scale,1.14);near(api.meshCardPose(1.2).scale,1);
  for(const t of [-1,NaN,9])assert.throws(()=>api.meshCardPose(t));
});
function canvasRecorder() {
  const log=[];
  const ctx=new Proxy({}, {set:(obj,key,value)=>{log.push([key,value]);obj[key]=value;return true;},get:(obj,key)=>{
    if(key in obj)return obj[key];
    if(key==='createLinearGradient'||key==='createRadialGradient')return (...args)=>{
      assert.ok(args.every(Number.isFinite));log.push([key,...args]);return {addColorStop:(p,c)=>log.push(['stop',p,c])};
    };
    return (...args)=>{for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value));log.push([key,...args.filter(v=>typeof v!=='object')]);};
  }});
  return {ctx,log};
}
test('canvas writers reset frame state and emit identical draw commands on reverse seek',()=>{
  const colors={background:'#140b30',accent:'#beda61',secondary:'#7acbd7',foreground:'#ffffff'},points=api.emitters();
  for(const [w,h] of [[1720,494],[940,1060],[960,494],[960,724]]) {
    const front=canvasRecorder(),quarter=canvasRecorder(),buffer={width:Math.round(w/4),height:Math.round(h/4),getContext:()=>quarter.ctx};
    const draw=t=>{front.log.length=0;quarter.log.length=0;api.paintFlare(front.ctx,buffer,w,h,t,colors,points);return JSON.stringify([front.log,quarter.log]);};
    const middle=draw(5);draw(10);assert.equal(draw(5),middle);
    assert.ok(quarter.log.some(row=>row[0]==='clearRect'));assert.equal(front.ctx.globalCompositeOperation,'source-over');
    front.log.length=0;api.paintMeshCard(front.ctx,w,h,4.2,colors);const card=JSON.stringify(front.log);
    api.paintMeshCard(front.ctx,w,h,8.6,colors);front.log.length=0;api.paintMeshCard(front.ctx,w,h,4.2,colors);
    assert.equal(JSON.stringify(front.log),card);
    for(const fps of [8,10,12]) {
      front.log.length=0;api.paintStop(front.ctx,w,h,1.5,fps,colors);const recorded=JSON.stringify(front.log);
      api.paintStop(front.ctx,w,h,3,fps,colors);front.log.length=0;api.paintStop(front.ctx,w,h,1.5,fps,colors);
      assert.equal(JSON.stringify(front.log),recorded);
    }
  }
});
