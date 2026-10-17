import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const file of ['production-shader-sources','production-shaders','production-filmed-screen-shader','production-filmed-screen'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorFilmedScreen,plain=x=>JSON.parse(JSON.stringify(x));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const regions=[{x:.1,y:.1,width:.2,height:.2,zoom:2.5},{x:.65,y:.6,width:.2,height:.2,zoom:3},{x:.4,y:.3,width:.25,height:.2,zoom:2}];
const onsets=[.5,2.5,4.5,6.5];

test('lens retains the source optical passes and uses explicit frame uniforms',()=>{
  const source=context.window.ShortCreatorFilmedShader.fragment;
  assert.match(source,/const int TAPS = 36; const int GLOW_TAPS = 16;/);
  for(const name of ['uSrc','uAim','uZoom','uFocusRect','uRot','uCurve','uLed','uGround','uTime','uSeed'])assert.ok(source.includes(name));
  assert.ok(source.includes('return mix(uGround, c, inside);'));
  assert.ok(source.includes('floor(uTime * 30.0)'));
  assert.ok(!/drawElementImage|layoutsubtree|requestAnimationFrame|Math.random|Date.now/.test(source));
});
test('fit uses the same verified contain geometry as the existing screen shaders',()=>{
  const s=api.target(regions[0],1000,500,400,800);
  assert.deepEqual(plain(s.rect),[400,50,50,100]);assert.deepEqual(plain(s.center),[425,100]);assert.equal(s.zoom,2.5);
  assert.throws(()=>api.target(regions[0],0,500,400,800));
  assert.throws(()=>api.target({...regions[0],width:0},1000,500,400,800));
});
test('source quintic glide and 12-tap Hann rack retain their distinct timings',()=>{
  near(api.smooth(.5),.5);near(api.smooth(.25),.103515625);
  const start=api.camera(2.5,onsets,regions,1000,500,1000,500);
  assert.equal(start.active,1);assert.equal(start.p,0);near(start.zoom,1);assert.deepEqual(plain(start.rot),[0,0,0]);
  assert.ok(start.rect[2]>0&&start.rect[2]<10,'First rack sample must have small but nonzero Hann weight');
  const rack=api.camera(2.8,onsets,regions,1000,500,1000,500);
  near(rack.rect[0],92);near(rack.rect[1],44);near(rack.rect[2],216);near(rack.rect[3],112);
  assert.ok(rack.zoom>1&&rack.zoom<2.5,'Focus arrives before the camera glide settles');
  const settled=api.camera(3.3,onsets,regions,1000,500,1000,500);
  assert.equal(settled.p,1);near(settled.zoom,2.5);near(settled.aim[0],200);near(settled.aim[1],100);
  assert.deepEqual(plain(settled.rot),plain(api.rotations[0]));
});
test('focus corners remain visible in wide, tall and square capture viewports',()=>{
  for(const [w,h] of [[1160,600],[940,720],[960,430],[960,620]])for(const [iw,ih] of [[1600,900],[900,1600],[1200,1200]]) {
    for(let i=0;i<3;i++) {
      const s=api.camera(onsets[i+1]+.8,onsets,regions,w,h,iw,ih),[x,y,rw,rh]=s.target;
      const center=api.project([x+rw/2,y+rh/2],s,w,h);near(center[0],w/2);near(center[1],h/2);
      for(const point of [[x,y],[x+rw,y],[x+rw,y+rh],[x,y+rh]]) {
        const [px,py]=api.project(point,s,w,h);assert.ok(px>=0&&px<=w&&py>=0&&py<=h,'Requested focus exceeds the optical viewport');
      }
    }
  }
});
test('native holds freeze film texture and seeking never accumulates camera or focus state',()=>{
  const frames=Array.from({length:300},(_,f)=>plain(api.camera(f/30,onsets,regions,960,620,1600,900)));
  for(let f=299;f>=0;f--)assert.deepEqual(plain(api.camera(f/30,onsets,regions,960,620,1600,900)),frames[f]);
  assert.deepEqual(plain(api.camera(8,onsets,regions,960,620,1600,900)),plain(api.camera(600,onsets,regions,960,620,1600,900)));
  assert.equal(frames[14].visible,false);assert.equal(frames[15].visible,true);
  for(const times of [[.5,2.5],[.5,2.5,2.5,6.5],[.5,NaN,4.5,6.5]])assert.throws(()=>api.camera(0,times,regions,960,620,1600,900));
  assert.throws(()=>api.camera(Infinity,onsets,regions,960,620,1600,900));
});
test('missing WebGL2 fails explicitly instead of silently substituting an ordinary screenshot',()=>{
  context.document={createElement:()=>({getContext:()=>null})};
  assert.throws(()=>api.createRenderer(),/WebGL2 is unavailable/);
});
