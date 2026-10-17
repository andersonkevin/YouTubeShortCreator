import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},console};
for(const name of ['production-three-runtime','production-canopy-motion','production-canopy-bokeh','production-canopy'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const T=context.window.ShortCreatorThree,M=context.window.ShortCreatorCanopyMotion,api=context.window.ShortCreatorCanopy;

test('canopy color and depth variants share absolute deformation time and vertex displacement',()=>{
  const color=new T.MeshPhysicalMaterial(),depth=new T.MeshDepthMaterial(),time={value:5.25},photo={isTexture:true};
  api.wind(color,2,time,photo);api.wind(depth,2,time);
  const shader=()=>({uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>'});
  const a=shader(),b=shader();color.onBeforeCompile(a);depth.onBeforeCompile(b);
  assert.equal(a.uniforms.uTime,time);assert.equal(b.uniforms.uTime,time);assert.equal(a.vertexShader,b.vertexShader);
  assert.equal(a.uniforms.uPhotoSurface.value,photo);assert.equal(b.uniforms.uPhotoSurface,undefined);
  assert.match(a.fragmentShader,/photographedSurface/);assert.doesNotMatch(b.fragmentShader,/photographedSurface/);
  time.value=8.5;assert.equal(a.uniforms.uTime.value,8.5);assert.equal(b.uniforms.uTime.value,8.5);
  color.dispose();depth.dispose();
});

test('native bokeh retains the original 41 color samples and perspective depth decode',()=>{
  const shader=context.window.ShortCreatorCanopyBokeh;
  assert.equal((shader.fragmentShader.match(/texture2D\( tColor/g)||[]).length,41);
  assert.equal(shader.defines.DEPTH_PACKING,1);assert.equal(shader.defines.PERSPECTIVE_CAMERA,1);
  assert.match(shader.fragmentShader,/unpackRGBAToDepth/);assert.match(shader.fragmentShader,/perspectiveDepthToViewZ/);
});

test('all native aspect ratios keep incoming leaves outside the actual frustum',()=>{
  for(const [width,height]of [[1720,590],[940,1200],[960,590],[960,820]]){
    const rig=M.create(T,0,width/height),pose=rig.sample(0),tangent=Math.tan(pose.camera.fov*Math.PI/360);
    for(const spec of rig.batches.flat()){
      const dims=api.dimensions[spec.kind],reach=Math.hypot(dims[0]*spec.widthMul*.5,dims[1]*spec.lengthMul)*spec.scale;
      if(spec.batch===2)assert.ok(spec.liftStartY+reach<-tangent*(13.6-spec.liftZ)-1.9);
      else if(width/height>16/9)assert.ok(spec.xStart+reach<-tangent*(13.6-spec.z)*width/height-1.9);
    }
    const forward=JSON.stringify(rig.sample(7.2));rig.sample(12);assert.equal(JSON.stringify(rig.sample(7.2)),forward);
  }
  for(const aspect of [NaN,0,.49,4.1])assert.throws(()=>M.create(T,0,aspect));
});

test('native canopy holds the source final image from 10.5s without extending idle motion',()=>{
  const rig=M.create(T,0),before=rig.sample(10.1),arrival=rig.sample(10.5),tail=rig.sample(12);
  assert.notEqual(before.windTime,arrival.windTime);
  const withoutTime=({seconds,...pose})=>pose;
  assert.deepEqual(withoutTime(arrival),withoutTime(tail));
});
