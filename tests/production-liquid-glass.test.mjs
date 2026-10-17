import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},console};
for(const file of ['production-liquid-glass-runtime.js','production-liquid-glass.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file,import.meta.url),'utf8'),context);
const core=context.window.ShortCreatorLiquidGlassRuntime,api=context.window.ShortCreatorLiquidGlass;
const plain=value=>JSON.parse(JSON.stringify(value));
test('pinned core exposes real GPU glass without the experimental DOM capture adapter',()=>{
  assert.equal(typeof core.GlassRendererGPU,'function');assert.equal(core.LiquidGlassCanvas,undefined);
  assert.equal(core.DEFAULTS.refraction,.69);assert.equal(core.DEFAULTS.bevelMode,0);
  assert.equal(api.configs['liquid-glass'].refraction,.6);assert.equal(api.configs['liquid-widgets'].refraction,.82);
  const source=fs.readFileSync(new URL('../templates/v1/assets/production-liquid-glass-runtime.js',import.meta.url),'utf8');
  assert.ok(source.includes('fn bevelHeight')&&source.includes('fn rrSDF')&&source.includes('renderGlassPanel'));
  assert.ok(!source.includes('drawElementImage')&&!source.includes('requestAnimationFrame'));
});
test('all native boards contain two to four final panels without overlap',()=>{
  for(const [w,h] of [[1720,494],[940,1060],[960,494],[960,724]])for(const n of [2,3,4])for(const variant of api.variants) {
    const boxes=api.layout(variant,w,h,n);assert.equal(boxes.length,n);
    for(const [i,b] of boxes.entries()) {
      assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=w&&b.y+b.height<=h);
      assert.ok(b.width>=100&&b.height>=88);
      for(const c of boxes.slice(i+1))assert.ok(b.x+b.width<=c.x||c.x+c.width<=b.x||b.y+b.height<=c.y||c.y+c.height<=b.y);
      const state=api.pose(variant,1,b,w,h);assert.equal(state.x,b.x);assert.equal(state.y,b.y);
      assert.equal(state.opacity,1);assert.equal(state.copyVisible,true);
    }
  }
  for(const args of [['unknown',960,494,2],['liquid-glass',0,494,2],['liquid-glass',960,494,5]])assert.throws(()=>api.layout(...args));
});
test('source entry overshoot and waterfall remain seekable while copy waits for containment',()=>{
  for(const variant of api.variants) {
    const box=api.layout(variant,960,494,3)[1],samples=[];
    for(let f=0;f<=24;f++) {
      const state=api.pose(variant,f/24,box,960,494);samples.push(plain(state));
      if(state.copyVisible)assert.ok(state.x>=0&&state.y>=0&&state.x+state.width<=960&&state.y+state.height<=494);
      assert.ok(Object.values(state).filter(v=>typeof v==='number').every(Number.isFinite));
    }
    assert.equal(samples[0].visible,false);assert.equal(samples[24].visible,true);
    for(let f=24;f>=0;f--)assert.deepEqual(plain(api.pose(variant,f/24,box,960,494)),samples[f]);
    if(variant==='liquid-glass')assert.ok(samples.some(s=>s.x<box.x));
    else assert.ok(samples.every((s,i)=>i===0||s.y<=samples[i-1].y));
  }
});
test('queued source Gaussian passes retain separate horizontal and vertical directions',()=>{
  const writes=new Map(),bound=[],buffers=[];
  const makeBuffer=()=>{const b={destroyed:false,destroy(){this.destroyed=true;}};buffers.push(b);return b;};
  const renderer=Object.create(core.GlassRendererGPU.prototype);
  renderer.blurUniformBuffer=makeBuffer();renderer.quadBuffer={};renderer.blurPipeline={getBindGroupLayout:()=>({})};
  renderer.device={createBuffer:makeBuffer,createBindGroup:args=>args,
    queue:{writeBuffer:(buffer,offset,data)=>writes.set(buffer,[...data])}};
  const encoder={beginRenderPass:()=>({setPipeline(){},setBindGroup:(index,group)=>bound.push(group.entries[0].resource.buffer),
    setVertexBuffer(){},setViewport(){},draw(){},end(){}})};
  const release=api.separateBlurUniforms(renderer,64);
  for(let i=0;i<6;i++) {
    renderer._blurPass(encoder,{},{},400,200,.001,0);
    renderer._blurPass(encoder,{},{},400,200,0,.002);
  }
  assert.equal(bound.length,12);assert.equal(new Set(bound).size,2);
  bound.forEach((buffer,i)=>{const value=writes.get(buffer);assert.equal(value[i%2?0:1],0);assert.ok(value[i%2?1:0]>0);});
  release();assert.equal(buffers[0].destroyed,false);assert.equal(buffers[1].destroyed,true);
  assert.throws(()=>renderer._blurPass(encoder,{},{},400,200,1,1));
});
