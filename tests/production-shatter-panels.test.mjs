import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {test} from 'node:test';
const context={window:{ShortCreatorCarouselPresets:{}}};
for(const name of ['production-carousels','production-shatter-shader','production-shatter-motion','production-shatter-panels'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const motion=context.window.ShortCreatorShatterMotion,effect=context.window.ShortCreatorShatterPanels,shader=context.window.ShortCreatorShatterShader;
const plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,a+' != '+b);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
test('source crack shader is retained with approved colors and defined smoothsteps',()=>{
  assert.equal(shader.source_sha256,'8e74692cd23813233ad826ee1ec2379c4f6ec91128b774e8df4b8bf23bff3dbf');
  assert.equal(hash(shader.vertex),shader.vertex_sha256);
  assert.equal(hash(shader.fragment),shader.fragment_sha256);
  const original=shader.fragment.replace('uniform vec3 uCrackColor;\nuniform vec3 uImpactColor;\n','')
    .replace('vec3 crackColor = uCrackColor;','vec3 crackColor = vec3(0.85, 0.92, 1.0);')
    .replace('impactGlow * uImpactColor','vec3(impactGlow * 0.3, impactGlow * 0.4, impactGlow * 0.6)')
    .replace('(1.0 - smoothstep(0.0, crackWidth, crackPattern))','smoothstep(crackWidth, 0.0, crackPattern)')
    .replace('(1.0 - smoothstep(wavefront * 0.6, wavefront, distFromCenter))','smoothstep(wavefront, wavefront * 0.6, distFromCenter)');
  assert.equal(hash(original),shader.original_fragment_sha256);
});
test('200 seeded cells match independently extracted source geometry in all formats',()=>{
  const references=[
    [16/9,'1da910d9cc22ec5afecc7eae96b20ccc2bdbfae9b5528152b82d9821b73023e4'],
    [1720/526,'437a18718551d47fef4e0b9a09242f4c875049782269ccd29b470f0ca6d7c8fd'],
    [940/1136,'684ff180911040f3e93099f7a760e5a8291a8f73c41f643c5ef354bf835e31e2'],
    [960/526,'69b3b881ba45e610b87189b126f274450cbf2c1df4dae2753aaccdbcc6cc519b'],
    [960/756,'349b7aba2de788a9b5ae10e1e72b02a1a5b7234aef0c58f348675b9aa5c8a17d']];
  for(const [aspect,expected]of references){
    const model=motion.data(aspect);assert.equal(model.shards.length,200);
    assert.equal(hash(JSON.stringify(model.shards)),expected);
    for(const shard of model.shards){
      assert.equal(shard.triangles.length,32);
      const {positions,uvs}=motion.vertices(shard,aspect);assert.equal(positions.length,288);assert.equal(uvs.length,192);
      for(let i=0;i<uvs.length;i+=2){assert.ok(uvs[i]>=-1e-12&&uvs[i]<=1+1e-12);assert.ok(uvs[i+1]>=-1e-12&&uvs[i+1]<=1+1e-12);
        near(positions[i/2*3],(uvs[i]-.5)*aspect);near(positions[i/2*3+1],uvs[i+1]-.5);}
    }
  }
  for(const aspect of [NaN,Infinity,0,.49,4.01])assert.throws(()=>motion.data(aspect));
});
test('phase boundaries preserve cracking, background reveal, fragment fade and terminal still',()=>{
  assert.equal(motion.state(1.999).phase,0);assert.equal(motion.state(2).phase,1);
  near(motion.state(3).crack,.25);assert.equal(motion.state(4).phase,2);
  near(motion.state(4.75).background,.5);near(motion.state(5.5).background,1);
  near(motion.state(10).opacity,1);near(motion.state(11).opacity,.5);near(motion.state(12).opacity,0);
  assert.deepEqual(plain(motion.state(600)),plain(motion.state(12)));assert.throws(()=>motion.state(NaN));
});
test('fixed steps, gravity and collision agree with an independent single-fragment integrator',()=>{
  const model=motion.data(16/9),before=JSON.stringify(model);
  for(const seconds of [4,4+1/30,4.5,5,7,10,11,12]){
    const actual=motion.physics(model,seconds);
    for(const index of [0,31,79,120,199]){
      const row=model.initial[index],p=[0,0,0],r=[0,0,0],v=[row.vx,row.vy,row.vz],a=[row.rx,row.ry,row.rz];
      let settled=false;
      for(let step=0;step<Math.floor((seconds-4)/(1/30))&&!settled;step++){
        v[1]-=2.5/30;for(let axis=0;axis<3;axis++){p[axis]+=v[axis]/30;r[axis]+=a[axis]/30;}
        if(row.cy+p[1]<-.8&&v[1]<0){p[1]=-.8-row.cy;v[1]*=-.6;v[0]*=.92;v[2]*=.92;
          for(let axis=0;axis<3;axis++)a[axis]*=.92;if(Math.abs(v[1])<.05)settled=true;}
      }
      ['posX','posY','posZ'].forEach((key,i)=>near(actual[index][key],p[i]));
      ['rotX','rotY','rotZ'].forEach((key,i)=>near(actual[index][key],r[i]));
      assert.equal(actual[index].settled,settled);near(actual[index].opacity,seconds<=10?1:(12-seconds)/2);
    }
  }
  assert.equal(JSON.stringify(model),before);
  const forward=[4.1,5,7,11].map(t=>plain(motion.physics(model,t)));
  for(let i=3;i>=0;i--)assert.deepEqual(plain(motion.physics(model,[4.1,5,7,11][i])),forward[i]);
});
test('two caption anchors enforce twelve seconds and finite reversible settling up to ten minutes',()=>{
  const cues=[.515,12.515],first=Math.ceil(cues[0]*30),last=Math.ceil(cues[1]*30)+24;
  assert.equal(motion.clock((first-1)/30,cues).visible,false);near(motion.clock(last/30,cues).time,12);
  const frames=Array.from({length:last+1},(_,i)=>plain(motion.clock(i/30,cues)));
  for(let f=last;f>=0;f--)assert.deepEqual(plain(motion.clock(f/30,cues)),frames[f]);
  for(const bad of [[.5,12.49],[.5],[.5,12.5,13],[NaN,12.5]])assert.throws(()=>motion.clock(0,bad));
  near(motion.clock(599.8,[580,598]).time,12);
});
test('native geometry and palette are bounded without free CSS inputs',()=>{
  for(const [w,h]of [[1720,526],[940,1136],[960,526],[960,756]])near(effect.geometry(w,h).aspect,w/h);
  for(const size of [[0,20],[5000,500],[100.1,100],[4000,40]])assert.throws(()=>effect.geometry(...size));
  const palette=plain(effect.palette({background:'#140b30',secondary:'#66d4ff'}));
  assert.deepEqual(palette.crack,[102/255,212/255,1]);palette.impact.forEach((v,i)=>near(v,palette.crack[i]*.6));
  for(const value of ['red','#fff','url(file)',null])assert.throws(()=>effect.palette({background:value,secondary:'#66d4ff'}));
});
