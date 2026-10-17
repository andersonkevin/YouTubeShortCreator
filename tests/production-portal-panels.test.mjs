import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {test} from 'node:test';
const context={window:{ShortCreatorCarouselPresets:{}}};
for(const name of ['production-carousels','production-portal-panels-shader','production-portal-panels'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const effect=context.window.ShortCreatorPortalPanels,shader=context.window.ShortCreatorPortalPanelsShader;
const plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,a+' != '+b);
test('source portal shader is retained with four defined smoothsteps, native aspect and approved sparks',()=>{
  const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
  assert.equal(shader.source_sha256,'3a70718be5486fc7936bf4f2ddbd3addf53533048f2e53dee47b5b8de82c2526');
  assert.equal(hash(shader.vertex),shader.vertex_sha256);
  assert.equal(hash(shader.fragment),shader.native_fragment_sha256);
  let original=shader.fragment.replace('uniform float nativeAspect;\nuniform vec3 sparkColor;\n','')
    .replace('vec2(nativeAspect, 1.0)','vec2(1.7778, 1.0)').replace('sparkColor * sparks','vec3(1.0, 0.9, 1.0) * sparks');
  for(const [a,b]of [['edgeWidth * 1.5','0.0'],['edgeWidth * 2.0','0.0'],['edgeWidth','0.0'],['edgeWidth * 2.5','edgeWidth * 0.5']])
    original=original.replace('(1.0 - smoothstep('+b+', '+a+', edgeDist))','smoothstep('+a+', '+b+', edgeDist)');
  assert.equal(hash(original),shader.original_fragment_sha256);
});
test('source energy, opening, push, overshoot and return preserve phase landmarks',()=>{
  const start=effect.state(0);near(start.radius,0);near(start.cameraZ,2.8);near(start.energy,0);
  near(effect.state(1.5).energy,.3);near(effect.state(2.1).energy,1);
  near(effect.state(3.25).radius,.425);near(effect.state(3.5).chromatic,.035);
  near(effect.state(4).distortion,.06);near(effect.state(4).edge,.08);
  near(effect.state(5).radius,.85);near(effect.state(5).cameraZ,2.1);
  near(effect.state(5.8).energy,1.5);near(effect.state(6).radius,.85+.95/16);
  near(effect.state(6.5).cameraZ,1.4);near(effect.state(6.5).chromatic,.06);
  near(effect.state(7).radius,1.8);near(effect.state(7.4).energy,0);
  near(effect.state(7.5).distortion,0);near(effect.state(7.8).chromatic,0);
  const end=effect.state(10);near(end.cameraZ,2.8);near(end.radius,1.8);
  assert.deepEqual(plain(effect.state(600)),plain(end));assert.throws(()=>effect.state(NaN));
});
test('two ordered cues enforce ten seconds and finish with a reversible finite clock',()=>{
  const cues=[.515,12.515],first=Math.ceil(cues[0]*30),last=Math.ceil(cues[1]*30)+24;
  assert.equal(effect.clock((first-1)/30,cues).visible,false);near(effect.clock(last/30,cues).time,10);
  const frames=Array.from({length:last+1},(_,i)=>plain(effect.clock(i/30,cues)));
  for(let f=last;f>=0;f--)assert.deepEqual(plain(effect.clock(f/30,cues)),frames[f]);
  for(const bad of [[.5,10.49],[.5],[.5,10.5,12],[NaN,10.5]])assert.throws(()=>effect.clock(0,bad));
  near(effect.clock(599.8,[580,598]).time,10);
});
test('native front and back planes exactly fill the camera and terminal portal covers all four profiles',()=>{
  for(const [w,h]of [[1720,526],[940,1136],[960,526],[960,756]])for(const z of [1.4,2.1,2.8]){
    const g=effect.geometry(w,h,z),visibleHeight=2*Math.tan(25*Math.PI/180)*z;
    near(g.plane[1]*g.frontScale,visibleHeight);
    near(g.plane[1]*g.backScale,2*Math.tan(25*Math.PI/180)*(z+.01));
    assert.ok(Math.hypot(w/h/2,.5)+.008<effect.state(10).radius);
  }
  for(const size of [[0,20],[5000,500],[100.1,100],[4000,40]])assert.throws(()=>effect.geometry(...size));
});
test('palette uses approved secondary/accent and rejects free CSS input',()=>{
  const p=plain(effect.palette({background:'#140b30',secondary:'#66d4ff',accent:'#cfff69'}));
  assert.deepEqual(p.primary,[102/255,212/255,1]);assert.deepEqual(p.secondary,[207/255,1,105/255]);
  assert.deepEqual(p.spark,[1,1,1]);
  for(const value of ['red','#fff','url(file)',null])
    assert.throws(()=>effect.palette({background:value,secondary:'#66d4ff',accent:'#cfff69'}));
});
