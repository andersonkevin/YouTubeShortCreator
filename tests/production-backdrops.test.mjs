import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-backdrops.js',import.meta.url),'utf8'),context);
const {kinds,particles,paint}=context.window.ShortCreatorBackdrops;
const colors={background:'#140b30',accent:'#beda61',secondary:'#7acbd7'};
function recordingContext() {
  const calls=[];
  const ctx=new Proxy({}, {set(object,name,value){calls.push([name,value]);object[name]=value;return true;}});
  for(const method of ['setTransform','clearRect','fillRect','beginPath','moveTo','lineTo','stroke','arc','fill','roundRect','setLineDash','bezierCurveTo','save','restore','translate','rotate'])
    ctx[method]=(...values)=>calls.push([method,...values]);
  ctx.createRadialGradient=(...values)=>{
    calls.push(['gradient',...values]);return {addColorStop:(...stop)=>calls.push(['stop',...stop])};
  };
  calls.length=0;return {ctx,calls};
}
test('seeded source fields are bounded and independent of sampling order',()=>{
  for(const kind of ['snow','starfield']) {
    const values=particles(140,kind);particles(100,kind);
    assert.deepEqual(values,particles(140,kind));
    assert.equal(new Set(values.map(v=>v.x)).size,140);
    assert.ok(values.every(v=>v.x>=0&&v.x<1&&v.y>=0&&v.y<1&&v.size>0&&v.size<=9));
  }
  for(const count of [0,201,1.5,NaN])assert.throws(()=>particles(count));
  assert.throws(()=>particles(4,'unknown'));
});
test('all backdrops repaint from a complete deterministic state',()=>{
  for(const kind of kinds)for(const [width,height] of [[1076,616],[936,686],[896,426],[896,536]]) {
    const {ctx,calls}=recordingContext(),points=particles(100,kind==='snow'?'snow':'starfield');
    const frames=[];
    for(const p of [0,.5,1,.5,1]) {
      calls.length=0;paint(ctx,width,height,kind,p,colors,points);frames.push(JSON.stringify(calls));
      for(const call of calls)for(const value of call)if(typeof value==='number')assert.ok(Number.isFinite(value));
    }
    assert.notEqual(frames[0],frames[1],kind);assert.notEqual(frames[1],frames[2],kind);
    assert.equal(frames[1],frames[3],kind);assert.equal(frames[2],frames[4],kind);
  }
});
test('invalid styles, dimensions and arbitrary colors fail closed',()=>{
  const {ctx}=recordingContext();
  for(const args of [[10,10,'raw',0,colors],[0,10,'mesh',0,colors],[10,10,'mesh',NaN,colors],
    [10,10,'mesh',0,{...colors,accent:'url(remote)'}]])assert.throws(()=>paint(ctx,...args,[]));
});
test('confetti retains the 22 source trajectories and stagger without accumulating state',()=>{
  const state=context.window.ShortCreatorBackdrops.confettiState;
  for(let i=0;i<22;i++) {
    assert.equal(state(i,0).opacity,0);
    assert.equal(state(i,(.2+i*.015)/1.315).opacity,0);
    const end=state(i,1);
    assert.equal(end.opacity,1);assert.equal(end.x,Math.cos(i*.83)*250);
    assert.equal(end.y,-120-Math.sin(i*.61)*120);assert.equal(end.rotation,180+i*37);
    const middle=state(i,.5);state(i,1);assert.deepEqual(state(i,.5),middle);
  }
  for(const i of [-1,22,.5,NaN])assert.throws(()=>state(i,0));
});
