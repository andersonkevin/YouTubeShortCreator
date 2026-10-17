import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},console,Uint8ClampedArray};
for(const file of ['production-three-runtime','production-gpu-backdrops','production-spatial-objects'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorSpatialObjects,T=context.window.ShortCreatorThree;
const plain=value=>JSON.parse(JSON.stringify(value)),near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

test('stack retains the four source plate positions, staged focus and full collapse',()=>{
  const start=api.stackState(0),end=api.stackState(5);
  for(let i=0;i<4;i++) {near(start[i].y,(3-i)*.24-2.2);assert.equal(start[i].shown,0);assert.equal(start[i].open,0);
    near(end[i].y,start[i].y);assert.equal(end[i].shown,0);assert.equal(end[i].open,0);assert.equal(end[i].focus,0);}
  const opened=api.stackState(1.4);assert.ok(opened.every(row=>row.open===1));
  for(let i=0;i<4;i++){const rows=api.stackState(1.25+i*.7);near(rows[i].focus,1);near(rows[i].shown,1);}
  assert.ok(api.stackState(3.35).every(row=>row.shown===1));
});

test('native cues control each source stage without accumulated simulation',()=>{
  for(const starts of [[.507,2.507,4.507,6.507],[.507,2.507,4.507,6.507,8.507]]) {
    const states=Array.from({length:361},(_,i)=>plain(api.stackClock(i/30,starts)));
    for(let i=360;i>=0;i--)assert.deepEqual(plain(api.stackClock(i/30,starts)),states[i]);
    assert.equal(states[15].index,-1);assert.equal(states[16].index,0);
    assert.equal(states[40].seconds,1.25);near(states[220].seconds,3.35);
    near(states.at(-1).seconds,starts.length===4?3.35:5);
    assert.deepEqual(plain(api.stackClock(600,starts)),states.at(-1));
  }
  for(const t of [NaN,Infinity])assert.throws(()=>api.stackClock(t,[1,3,5,7]));
  assert.throws(()=>api.stackClock(0,[1,1,2,3]));assert.throws(()=>api.stackClock(0,[1,2,3]));
});

test('beveled plates use actual local Three geometry and retain source extents',()=>{
  const geometry=api.plateGeometry(T);geometry.computeBoundingBox();
  const size=geometry.boundingBox.getSize(new T.Vector3());
  near(size.x,4.2,1e-6);near(size.z,4.2,1e-6);near(size.y,.22,1e-6);
  assert.ok(geometry.attributes.position.count>100);assert.ok([...geometry.attributes.normal.array].every(Number.isFinite));geometry.dispose();
});

test('orthographic source anchors remain correct in every native object board',()=>{
  for(const [w,h] of [[1720,390],[940,860],[960,390],[960,620]]) {
    const fit=Math.min(w/1920,h/1080),view=5.9*h/(1080*fit),px=1080/(2*5.9)*fit;
    const camera=new T.OrthographicCamera(-view*w/h,view*w/h,view,-view,.1,100);
    camera.position.set(10,10.7,10);camera.lookAt(0,.7,0);camera.position.add(new T.Vector3(1.9,0,-1.9));camera.updateMatrixWorld();
    for(const seconds of [0,.6,1.25,1.95,2.65,3.35,4.4,5])for(const layer of api.stackState(seconds)) {
      const p=new T.Vector3(2.1,layer.y,-2.1).project(camera),x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h;
      near(x,w/2+.4/Math.sqrt(2)*px);near(y,h/2-(2*layer.y-1.4)/Math.sqrt(6)*px);
      assert.ok(x>=0&&x<w&&y>=0&&y<h);
      assert.ok(x+114*fit<w-220,'Native layer text needs usable width at fixed brand type');
    }
  }
});

test('can retains the complete lathe profile and one bounded revolution',()=>{
  assert.equal(api.profile.length,13);assert.ok(Object.isFrozen(api.profile));
  const geometry=new T.LatheGeometry(api.profile.map(([x,y])=>new T.Vector2(x,y)),128);geometry.computeBoundingBox();
  near(geometry.boundingBox.max.y,2.33,1e-6);near(geometry.boundingBox.min.y,0);near(geometry.boundingBox.max.x,.67,1e-6);geometry.dispose();
  for(const name of ['CapsuleGeometry','CylinderGeometry','MeshPhysicalMaterial','PMREMGenerator','InstancedMesh'])assert.equal(typeof T[name],'function');
  const clock=context.window.ShortCreatorGpuBackdrops.clock;
  const frames=Array.from({length:241},(_,i)=>plain(api.turnPose(clock(i/30,[.5,6.5]).seconds/2)));
  for(let i=240;i>=0;i--)assert.deepEqual(plain(api.turnPose(clock(i/30,[.5,6.5]).seconds/2)),frames[i]);
  assert.equal(api.turnPose(0).rotation,api.turnPose(1).rotation);assert.deepEqual(plain(api.turnPose(2)),plain(api.turnPose(1)));
  near(api.turnPose(.5).rotation,Math.PI/2);assert.throws(()=>api.turnPose(NaN));
});

test('both label faces contain the complete verified image without aspect distortion',()=>{
  for(const [w,h] of [[1920,1080],[1080,1920],[1080,1080],[4096,32],[32,4096]])for(const center of [512,1536]) {
    const b=api.contain(w,h,center-400,86,800,700);near(b.width/b.height,w/h);
    assert.ok(b.x>=center-400&&b.x+b.width<=center+400);assert.ok(b.y>=86&&b.y+b.height<=786);
  }
  for(const bad of [0,-1,NaN,Infinity])assert.throws(()=>api.contain(bad,100,0,0,100,100));
});
