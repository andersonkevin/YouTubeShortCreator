import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const name of ['production-shader-sources','production-shaders'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorShaders;
test('sixteen closed shader programs retain endpoint guards and deterministic inputs',()=>{
  assert.equal(api.names.length,16);
  for(const name of api.names) {
    const source=api.fragment(name);
    assert.ok(source.includes('void effectMain()')&&source.includes('void main()'));
    assert.ok(source.includes('u_progress<=0.')&&source.includes('u_progress>=1.'));
    assert.ok(!/u_time|Date|Math.random/.test(source));
  }
  for(const name of ['__proto__','constructor','https://test','unknown'])assert.throws(()=>api.fragment(name),/Unknown/);
  assert.ok(api.fragment('cross-warp-morph').includes('n+u_progress*1.2-.6'));
  assert.ok(api.fragment('sdf-iris').includes('length(vec2(u_resolution.x/u_resolution.y,1.))'));
});
test('texture fit preserves all pixels and aspect ratio in tall, square and wide viewports',()=>{
  for(const [w,h] of [[1040,524],[900,330],[280,700],[600,600]])for(const [iw,ih] of [[1920,1080],[800,1200],[500,500]]) {
    const box=api.contain(w,h,iw,ih);
    assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=w+.001&&box.y+box.height<=h+.001);
    assert.ok(Math.abs(box.width/box.height-iw/ih)<1e-12);
  }
  for(const v of [0,-1,NaN,Infinity])assert.throws(()=>api.contain(v,10,10,10),/dimensions/);
});
test('RGB separation has a bounded antialias filter and untouched endpoints',()=>{
  for(const name of api.names) {
    assert.equal(api.filterRadius(name,0),0);assert.equal(api.filterRadius(name,1),0);
    for(let i=0;i<=24;i++) {
      const value=api.filterRadius(name,i/24);assert.ok(value>=0&&value<=1.2);
      if(!['gravitational-lens','chromatic-split','glitch','magnetic-pull','magnetic-repel'].includes(name))assert.equal(value,0);
      assert.ok(Math.abs(value-api.filterRadius(name,1-i/24))<1e-12);
    }
  }
});
test('magnetic shaders retain Gaussian falloff, aspect correction and opposing displacement',()=>{
  for(const [name,direction] of [['magnetic-pull','1.0'],['magnetic-repel','-1.0']]) {
    const source=api.fragment(name);
    assert.ok(source.includes('float direction='+direction));
    for(const code of ['precision highp float','delta*vec2(aspect,1.0)','exp(-dist*dist*20.0)*0.04',
      'strength*0.6','normalize(delta+0.0001)*aberration','displaced+aberDir*0.3','displaced-aberDir*0.3',
      'texture2D(u_from,uv)','texture2D(u_to,uv)','vec2(.35,.3),vec2(.6,.35)'])assert.ok(source.includes(code),code);
    assert.ok(!/texElementImage|drawElementImage|u_mouse;/.test(source));
    assert.equal(api.filterRadius(name,.5),1.2);
  }
});
test('unavailable WebGL fails explicitly instead of substituting an effect',()=>{
  context.document={createElement:()=>({getContext:()=>null})};
  try {assert.throws(()=>api.createRenderer(),/WebGL is unavailable/);}
  finally {delete context.document;}
});
function mock(failure) {
  const deleted=[],programs=[],sources=[];
  return {deleted,programs,sources,VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,
    createShader:type=>({type}),shaderSource:(shader,source)=>sources.push(source),compileShader:()=>{},
    getShaderParameter:shader=>shader.type!==failure,getShaderInfoLog:()=> 'compile diagnostic',deleteShader:shader=>deleted.push(shader.type),
    createProgram:()=>({}),attachShader:()=>{},linkProgram:()=>{},getProgramParameter:()=>failure!=='link',
    getProgramInfoLog:()=> 'link diagnostic',deleteProgram:p=>programs.push(p)};
}
test('compile and link failures retain diagnostics and release owned shader objects',()=>{
  for(const failure of [1,2,'link']) {
    const gl=mock(failure);assert.throws(()=>api.link(gl,api.fragment('glitch')),/failed/);
    assert.deepEqual(gl.deleted.sort(),failure===1?[1]:[1,2]);
    assert.equal(gl.programs.length,failure==='link'?1:0);
  }
  const gl=mock(null);assert.ok(api.link(gl,api.fragment('glitch')));assert.deepEqual(gl.deleted.sort(),[1,2]);assert.equal(gl.programs.length,0);
});

test('verified image decoder rejects file, network and unsupported image sources',()=>{
  for(const source of [undefined,'https://example.com/a.png','file:///tmp/a.png','data:image/svg+xml;base64,PHN2Zz4=']) {
    context.window.ShortCreatorShaderImages={'assets/rejected.png':source};
    assert.throws(()=>api.verifiedImage({getAttribute:()=> 'assets/rejected.png'}),/Missing verified/);
  }
});
test('canvas and shader callers share one verified decode without creating WebGL',async()=>{
  let count=0;
  context.Image=class {decode(){count++;return Promise.resolve();}};
  context.window.ShortCreatorShaderImages={'assets/shared.png':'data:image/png;base64,AA=='};
  const node={getAttribute:()=> 'assets/shared.png'},first=api.verifiedImage(node);
  assert.equal(api.verifiedImage(node),first);await api.ready();assert.equal(count,1);
  assert.equal(api.stats().contexts,0);assert.equal(first.src,context.window.ShortCreatorShaderImages['assets/shared.png']);
});
