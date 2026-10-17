import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
class Path {
  constructor(){this.commands=[];}
  moveTo(...p){this.commands.push(['M',...p]);}
  lineTo(...p){this.commands.push(['L',...p]);}
  quadraticCurveTo(...p){this.commands.push(['Q',...p]);}
  bezierCurveTo(...p){this.commands.push(['C',...p]);}
  closePath(){this.commands.push(['Z']);}
}
const context={window:{},console,Path2D:Path};
for(const name of ['production-three-runtime','production-extruded-logo','production-wireframe-motion','production-wireframe-portal'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorWireframePortal,T=context.window.ShortCreatorThree;
const plain=v=>JSON.parse(JSON.stringify(v));

test('screen-space outlines carry all original box edges as finite independent segments',()=>{
  const owned=[],geometry=new T.BoxGeometry(2,3,4),mesh=api.outline(T,geometry,v=>{owned.push(v);return v;});
  assert.equal(mesh.geometry.instanceCount,12);assert.equal(mesh.material.uniforms.linewidth.value,1.5);
  assert.equal(mesh.frustumCulled,false);assert.equal(mesh.geometry.index.count,18);
  for(const name of ['instanceStart','instanceEnd']){
    const a=mesh.geometry.attributes[name];assert.equal(a.count,12);assert.equal(a.itemSize,3);
    assert.ok([...a.array].every(Number.isFinite));
  }
  const points=[...mesh.geometry.attributes.instanceStart.array,...mesh.geometry.attributes.instanceEnd.array];
  assert.ok(points.every((n,i)=>Math.abs(n)===[1,1.5,2][i%3]));
  assert.equal(mesh.material.transparent,true);assert.equal(mesh.material.depthWrite,false);
  geometry.dispose();owned.forEach(v=>v.dispose());
});

test('supporting outlines preserve the source thinner width and edge threshold',()=>{
  const owned=[],geometry=new T.CylinderGeometry(1,1,.02,12),mesh=api.outline(T,geometry,v=>{owned.push(v);return v;},1.05,40);
  assert.equal(mesh.material.uniforms.linewidth.value,1.05);
  const source=new T.EdgesGeometry(geometry,40);
  assert.equal(mesh.geometry.instanceCount,source.attributes.position.count/2);
  assert.equal(mesh.material.uniforms.opacity.value,1);
  source.dispose();geometry.dispose();owned.forEach(v=>v.dispose());
});

test('flat card paths retain every approved curve and counter instruction',()=>{
  const commands=[['M',0,0],['L',300,0],['Q',500,0,500,300],['C',500,600,0,600,0,300],['Z'],
    ['M',100,100],['L',100,200],['L',200,200],['L',200,100],['Z']];
  assert.deepEqual(plain(api.path2d(commands).commands),commands);
  assert.throws(()=>api.path2d([['X',1,2]]));
});

test('shared glyph preparation retains legacy sizing and bounds the portal scale',()=>{
  const commands=[['M',0,0],['L',0,1000],['L',1000,1000],['L',1000,0],['Z']];
  for(const [size,expected]of [[undefined,1.5],[1,1],[10,10]]){
    const shapes=context.window.ShortCreatorExtrudedLogo.shapes(T,commands,size);
    const points=shapes[0].getPoints();assert.equal(Math.max(...points.map(p=>p.x)),expected);
  }
  for(const size of [0,-1,10.01,NaN,Infinity])assert.throws(()=>context.window.ShortCreatorExtrudedLogo.shapes(T,commands,size));
});
