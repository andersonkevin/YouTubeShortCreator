import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {test} from 'node:test';
const c={window:{ShortCreatorCarouselPresets:{}},console};
for(const name of ['production-carousels','production-three-runtime','production-three-postprocess','production-glass-parallax-motion','production-glass-parallax'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),c);
const motion=c.window.ShortCreatorGlassParallaxMotion,effect=c.window.ShortCreatorGlassParallax;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,a+' != '+b),plain=v=>JSON.parse(JSON.stringify(v));
test('seeded glass cells retain the independently extracted source geometry',()=>{
  const m=motion.data(16/9);
  assert.equal(motion.source,'1c3d3eeb6d64c59dd8f7d211792de1b9abd73547c07bf3e79bd59e2a2882fa2f');
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(m.cells)).digest('hex'),'ce8ae8175f70cbd1fb00e47f7183935e1e646703b4bc0dae893c20db921270b9');
  assert.equal(m.panes.length,54);assert.deepEqual(plain(m),plain(motion.data(16/9)));
});
test('all four native surfaces are completely tessellated into bounded beveled panes',()=>{
  for(const [w,h]of [[1720,526],[940,1136],[960,526],[960,756]]){
    const m=motion.data(w/h);assert.equal(m.panes.length,54);
    near(m.panes.reduce((sum,p)=>sum+p.area,0),m.width*m.height);
    for(const p of m.panes){assert.ok(p.cell.every(([x,y])=>x>=-1e-9&&x<=m.width+1e-9&&y>=-1e-9&&y<=m.height+1e-9));
      assert.ok(p.depth>=.18&&p.depth<=.28);assert.ok(p.thickness>=1.45&&p.thickness<=2.7);assert.ok(p.bevel>0&&p.bevel<=.108);}
  }
});
test('source pointer choreography retains landmarks, finite rest and arbitrary reverse seeks',()=>{
  for(const [t,x,y]of [[0,.16,.04],[.5,.16,.04],[2.25,.305,-.055],[4,.45,-.15],[7.5,-.35,.25],[10.5,.15,-.35],
    [13.5,-.45,.05],[16.5,.3,.2],[19,-.1,-.1],[19.5,.03,-.03],[20,.16,.04]]){
    near(motion.pointer(t).x,x);near(motion.pointer(t).y,y);}
  const model=motion.data(16/9),before=JSON.stringify(model),frames=[0,4,10,20].map(t=>plain(motion.state(t,model)));
  for(let i=3;i>=0;i--)assert.deepEqual(plain(motion.state([0,4,10,20][i],model)),frames[i]);
  assert.deepEqual(plain(motion.state(600,model)),frames[3]);assert.equal(JSON.stringify(model),before);
  for(const p of frames.flatMap(f=>f.panes)){assert.ok(p.opacity>=.76&&p.opacity<=.811);assert.ok(p.roughness<=.14);assert.ok(p.position.every(Number.isFinite));}
});
test('caption clock enforces twenty seconds and retains exact terminal state at late episode positions',()=>{
  near(motion.clock(599.8,[570,598]).time,20);
  for(const cues of [[.5,20.49],[.5],[.5,20.5,22],[NaN,20.5]])assert.throws(()=>motion.clock(0,cues));
  const cues=[.515,22.515],end=(Math.ceil(cues[1]*30)+24)/30;near(motion.clock(end,cues).time,20);
  assert.equal(motion.clock(0,cues).visible,false);
});
test('native geometry and palette reject unbounded or free-form input',()=>{
  for(const size of [[0,20],[5000,500],[100.1,100],[4000,40]])assert.throws(()=>effect.geometry(...size));
  for(const color of ['red','#fff','url(file)',null])assert.throws(()=>effect.palette({background:color,secondary:'#66d4ff',accent:'#cfff69'}));
  for(const aspect of [NaN,Infinity,.49,4.01])assert.throws(()=>motion.data(aspect));assert.throws(()=>motion.pointer(NaN));
});
test('pinned postprocessing bundle retains official five-mip bloom without a realtime clock',()=>{
  const P=c.window.ShortCreatorThreePostprocess,T=c.window.ShortCreatorThree;
  assert.ok(Object.isFrozen(P));assert.equal(P.EffectComposer,undefined);
  const bloom=new P.UnrealBloomPass(new T.Vector2(1720,526),.32,.4,.86);
  assert.equal(bloom.nMips,5);assert.equal(bloom.renderTargetsHorizontal.length,5);assert.equal(bloom.renderTargetsVertical.length,5);
  assert.deepEqual(plain(bloom.separableBlurMaterials.map(m=>m.defines.KERNEL_RADIUS)),[6,10,14,18,22]);
  assert.equal(bloom.highPassUniforms.luminosityThreshold.value,.86);bloom.materialHighPassFilter.dispose();bloom.dispose();
});
