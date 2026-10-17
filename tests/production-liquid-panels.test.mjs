import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {test} from 'node:test';
const context={window:{}};
context.window.ShortCreatorCarouselPresets={};
for(const name of ['production-carousels','production-liquid-panels-shader','production-liquid-panels'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const effect=context.window.ShortCreatorLiquidPanels,shader=context.window.ShortCreatorLiquidPanelsShader;
const plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,a+' != '+b);
test('retains source vertex displacement and changes only the fragment highlight color',()=>{
  const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
  assert.equal(shader.source_sha256,'0bdc2d57d292c5d4d937908fb02c9d646ee141014a90637534f331b49a46d5df');
  assert.equal(hash(shader.vertex),'eb9faaa118a490df6947be8fbdb0cf4df365d2d084e6da77735a2636a8f02c21');
  const original=shader.fragment.replace('\nuniform vec3 uHighlightColor;','').replace('highlight * uHighlightColor','vec3(highlight * 0.15, highlight * 0.12, highlight * 0.2)');
  assert.equal(hash(original),'8d7929ed79165659521c299aab96a3ca4be1df0a6245ddd523b45cf74466e958');
});
test('source waves, camera, crossfade and interrupted final settling retain exact values',()=>{
  const a=effect.state(0);assert.deepEqual(plain(a),{time:0,wave:0,ripple:0,mix:0,rotation:[0,0,0]});
  near(effect.state(1).wave,.875);near(effect.state(3).ripple,.6);
  near(effect.state(4.5).rotation[0],.06);near(effect.state(4.5).rotation[1],-.04);
  near(effect.state(5).wave,1.1875);near(effect.state(5.5).wave,2.5);near(effect.state(5.5).ripple,2);
  near(effect.state(6).mix,.5);near(effect.state(7).mix,1);
  near(effect.state(8.5).wave,1);near(effect.state(8.5).ripple,.5);
  const weight=(1-Math.cos(Math.PI*.75))/2,start=effect.state(10.5),middle=effect.state(11.25);
  near(start.wave,1-.3*weight);near(start.ripple,.5-.2*weight);
  near(middle.wave,start.wave/2);near(middle.ripple,start.ripple/2);
  near(middle.rotation[0],-.015);near(middle.rotation[1],.015);
  const final=effect.state(12);near(final.wave,0);near(final.ripple,0);near(final.rotation[0],0);near(final.rotation[1],0);
  assert.deepEqual(plain(effect.state(600)),plain(final));assert.throws(()=>effect.state(NaN));
});
test('three caption anchors place the mix onset precisely and end in finite rest',()=>{
  const cues=[.515,6.515,14.515],mixFrame=Math.ceil(cues[1]*30),last=Math.ceil(cues[2]*30)+24;
  assert.equal(effect.clock((Math.ceil(cues[0]*30)-1)/30,cues).visible,false);
  near(effect.clock(mixFrame/30,cues).time,5);near(effect.clock(last/30,cues).time,12);
  const samples=Array.from({length:last+2},(_,f)=>plain(effect.clock(f/30,cues)));
  for(let f=samples.length-1;f>=0;f--)assert.deepEqual(plain(effect.clock(f/30,cues)),samples[f]);
  for(let f=1;f<samples.length;f++)assert.ok(samples[f].time>=samples[f-1].time);
  for(const starts of [[.5,5.49,12.5],[.5,5.5,12.49],[.5,5.5],[NaN,5.5,12.5]])
    assert.throws(()=>effect.clock(0,starts));
});
test('native framing contains the displaced sheet with perspective in every format',()=>{
  for(const [w,h] of [[1720,526],[940,1136],[960,526],[960,756]]) {
    const g=effect.geometry(w,h),half=[g.planeWidth/2,g.planeHeight/2];
    for(const rx of [-.03,0,.03,.06])for(const ry of [-.04,0,.03])for(const x of [-half[0],half[0]])
      for(const y of [-half[1],half[1]])for(const z of [-g.maxDisplacement,g.maxDisplacement]){
        // Inverse XYZ camera rotation: R_y(-y) R_x(-x) (point - camera).
        const dz=z-2.8,vy=Math.cos(rx)*y+Math.sin(rx)*dz,vz=-Math.sin(rx)*y+Math.cos(rx)*dz;
        const vx=Math.cos(ry)*x-Math.sin(ry)*vz,vzz=Math.sin(ry)*x+Math.cos(ry)*vz;
        const scale=g.zoom/Math.tan(Math.PI/8)/-vzz;
        assert.ok(Math.abs(vx*scale/(w/h))<1);assert.ok(Math.abs(vy*scale)<1);
      }
    assert.deepEqual(plain(g.segments),[100,60]);
  }
  for(const size of [[0,20],[5000,500],[100.1,100],[40,4000]])assert.throws(()=>effect.geometry(...size));
});
test('palette rejects free CSS and uses the approved secondary highlight',()=>{
  assert.deepEqual(plain(effect.palette({background:'#140b30',secondary:'#66d4ff'}).highlight),[102/255*.2,212/255*.2,.2]);
  for(const value of ['red','#fff','url(file)',null])assert.throws(()=>effect.palette({background:value,secondary:'#66d4ff'}));
});
