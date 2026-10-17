import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},console};
for(const name of ['production-three-runtime','production-extruded-logo'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorExtrudedLogo,T=context.window.ShortCreatorThree,plain=v=>JSON.parse(JSON.stringify(v));
test('source flip stagger preserves visibility, overshoot, swing and final hold',()=>{
  const start=api.pose(0,8),end=api.pose(5,8);
  assert.ok(start.letters.every(p=>!p.visible&&Math.abs(p.rotation+Math.PI/2)<1e-8));
  assert.ok(end.letters.every(p=>p.visible&&p.rotation===0&&p.y===0));
  assert.equal(end.rotationX,0);assert.equal(end.rotationY,0);assert.equal(end.tagline,1);
  assert.equal(api.pose(.099,8).letters[0].visible,false);assert.equal(api.pose(.1,8).letters[0].visible,true);
  assert.equal(api.pose(1.009,8).letters[7].visible,false);assert.equal(api.pose(1.01,8).letters[7].visible,true);
  assert.ok(api.pose(.8,8).letters[0].rotation>0);assert.equal(api.pose(1.7,8).tagline,0);
  assert.deepEqual(plain(api.pose(600,8)),plain(end));
});
test('absolute poses replay exactly in reverse order',()=>{
  const frames=Array.from({length:181},(_,i)=>plain(api.pose(i/30,8)));
  for(let i=180;i>=0;i--)assert.deepEqual(plain(api.pose(i/30,8)),frames[i]);
  for(const [time,count] of [[NaN,8],[0,0],[0,9],[0,1.5]])assert.throws(()=>api.pose(time,count));
});
test('both source winding directions preserve a true extruded hole',()=>{
  const outer=[['M',0,0],['L',0,1000],['L',1000,1000],['L',1000,0],['Z']];
  const hole=[['M',250,250],['L',750,250],['L',750,750],['L',250,750],['Z']];
  for(const commands of [[...outer,...hole],[...outer,...hole].map(([k,...p])=>[k,...p.map((v,i)=>i%2===0?-v:v)])]){
    const shapes=api.shapes(T,commands);assert.equal(shapes.length,1);assert.equal(shapes[0].holes.length,1);
    const geometry=new T.ExtrudeGeometry(shapes,{depth:.42,bevelEnabled:false,curveSegments:10});
    const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();
    const sign=commands[2][1]<0?-1:1;
    const ray=new T.Raycaster(new T.Vector3(.75*sign,.75,3),new T.Vector3(0,0,-1));
    assert.equal(ray.intersectObject(mesh).length,0,'Glyph counter must remain empty');
    ray.ray.origin.x=.1*sign;assert.ok(ray.intersectObject(mesh).length>0,'Solid glyph stroke must have geometry');
    geometry.dispose();mesh.material.dispose();
  }
});
test('quadratic and cubic font curves remain curves before extrusion',()=>{
  const shapes=api.shapes(T,[['M',0,0],['Q',0,1000,500,1000],['C',1000,1000,1000,0,500,0],['Z']]);
  assert.ok(shapes[0].curves.some(c=>c.isQuadraticBezierCurve));assert.ok(shapes[0].curves.some(c=>c.isCubicBezierCurve));
  assert.throws(()=>api.shapes(T,[['X']]));
});
