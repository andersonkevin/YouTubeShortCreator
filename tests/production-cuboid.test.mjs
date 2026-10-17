import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},console};
for(const name of ['production-three-runtime','production-cuboid-data','production-cuboid-motion','production-cuboid'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const T=context.window.ShortCreatorThree,M=context.window.ShortCreatorCuboidMotion,D=context.window.ShortCreatorCuboidData;
const plain=value=>JSON.parse(JSON.stringify(value));

test('saved Blender channels retain 18 tracks, one hero and all 201 camera poses',()=>{
  assert.equal(D.tiles.length,18);assert.equal(D.tiles.filter(t=>t.hero).length,1);assert.equal(D.camera.length,201);
  assert.ok(Object.isFrozen(D)&&Object.isFrozen(D.tiles[0].channels.location[0]));
  for(const tile of D.tiles)for(const channels of Object.values(tile.channels))for(const keys of channels){
    assert.ok(keys.length>0);keys.forEach((row,i)=>{assert.ok(row.every(Number.isFinite));if(i)assert.ok(row[0]>keys[i-1][0]);});
  }
  assert.equal(M.metadata.cameraFov,11);assert.equal(M.metadata.cameraY,8.5);
});

test('native caption clock preserves the complete 50-frame departure and backward seeks',()=>{
  const onsets=[.507,6.507],rows=Array.from({length:301},(_,i)=>plain(M.clock(i/30,onsets)));
  assert.equal(rows[15].frame,0);assert.equal(rows[196].frame,150);assert.equal(rows[236].frame,190);assert.equal(rows[246].frame,200);
  assert.deepEqual(rows[246],rows[300]);for(let i=300;i>=0;i--)assert.deepEqual(plain(M.clock(i/30,onsets)),rows[i]);
  for(const args of [[NaN,onsets],[0,[0,4.96]],[0,[0,1,2]],[0,[0,Infinity]]])assert.throws(()=>M.clock(...args));
});

test('hero stays in the travelling chain before detaching and clears at the original frame',()=>{
  const rig=M.create(T,4,3,0),hero=D.tiles.find(t=>t.hero),chain=D.tiles.find(t=>!t.hero);
  for(const frame of [0,1,28,31,35,36]){
    const pose=rig.sample(frame/30),p=pose.tiles[pose.heroSlot];
    const expected=hero.channels.location[0][0][1]+rig.channelAt(chain.channels.location[0],frame)-chain.channels.location[0][0][1];
    assert.ok(Math.abs(p.position[0]-expected)<1e-8);
  }
  const before=rig.sample(189/30),after=rig.sample(190/30);assert.equal(before.tiles[before.heroSlot].visible,true);
  assert.ok(after.tiles.every(tile=>!tile.visible));assert.equal(rig.heroSlotCorrection(70),0);
  const rows=Array.from({length:201},(_,i)=>plain(rig.sample(i/30)));
  for(let i=200;i>=0;i--)assert.deepEqual(plain(rig.sample(i/30)),rows[i]);
  assert.deepEqual(rows[90].camera,rows[149].camera);
});

test('each selected hero owns the supplied content even when the chain repeats',()=>{
  for(const count of [1,4,8,12])for(const hero of [1,count]){
    const rig=M.create(T,count,hero),s=rig.sample(4);assert.equal(s.tiles[s.heroSlot].item,hero-1);
    assert.ok(s.tiles.every(t=>t.item>=0&&t.item<count));
  }
  for(const args of [[0,1],[13,1],[4,0],[4,5],[1.5,1]])assert.throws(()=>M.create(T,...args));
});

test('source bevel geometry retains closed caps, thickness, normals and separate materials',()=>{
  const g=M.geometry(T);g.computeBoundingBox();
  assert.equal(g.attributes.position.count,80552);assert.equal(g.index.count,102948);assert.equal(g.groups.length,2);
  const size=g.boundingBox.getSize(new T.Vector3());for(const [a,b]of [[size.x,1.7],[size.y,2.4],[size.z,.14]])assert.ok(Math.abs(a-b)<1e-6);
  assert.ok([...g.attributes.normal.array].every(Number.isFinite));g.dispose();
});

test('face wrapping preserves whole words and rejects overflow instead of dropping copy',()=>{
  const measure={measureText:text=>({width:text.length*10})},wrap=context.window.ShortCreatorCuboid.wrap;
  assert.deepEqual(plain(wrap(measure,'Build the next step',90)),['Build the','next step']);
  assert.throws(()=>wrap(measure,'Unbreakableword',90));
});

test('printed face bounds follow flipY=false through the saved hero orientation',()=>{
  const pose=M.create(T,4,3,0).sample(3),tile=pose.tiles[pose.heroSlot],mesh=new T.Object3D();
  mesh.position.fromArray(tile.position);mesh.quaternion.fromArray(tile.quaternion);mesh.updateMatrixWorld();
  const camera=new T.PerspectiveCamera(pose.camera.fov,16/9,.1,200);camera.position.fromArray(pose.camera.position);
  camera.quaternion.fromArray(pose.camera.quaternion);camera.updateMatrixWorld();
  const point=(x,y)=>context.window.ShortCreatorCuboid.facePoint(T,x,y).applyMatrix4(mesh.matrixWorld).project(camera);
  assert.ok(point(270,0).y>point(270,756).y);assert.ok(point(0,378).x<point(540,378).x);
});
