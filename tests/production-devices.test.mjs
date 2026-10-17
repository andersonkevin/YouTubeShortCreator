import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context=vm.createContext({window:{},console,atob,btoa,Image:class {async decode(){}}});
for(const name of ['production-three-runtime','production-device-iphone-data','production-device-macbook-data','production-device-models','production-device-motion','production-device-review'])
  vm.runInContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const T=context.window.ShortCreatorThree,D=context.window.ShortCreatorDeviceModels,M=context.window.ShortCreatorDeviceMotion;
const plain=v=>JSON.parse(JSON.stringify(v));await D.ready();

test('embedded device packets retain every source mesh, material and node without external resources',()=>{
  for(const [name,nodes,geometries,materials]of [['iphone',31,31,11],['macbook',105,34,13]]){
    const owned=new Set(),model=D.build(T,name,o=>{owned.add(o);return o;});
    assert.equal(model.nodeCount,nodes);assert.equal(model.geometryCount,geometries);assert.equal(model.materialCount,materials);
    assert.equal(model.sha256,D.pins[name]);assert.ok(model.textureCount>0);
    const packet=context.window.ShortCreatorDevicePackets[name];
    assert.ok(packet.document.buffers.every(x=>!x.uri));assert.ok(packet.document.images.every(x=>!x.uri));
    const raw={...packet,bytes:Uint8Array.from(atob(packet.binary),c=>c.charCodeAt(0))};
    for(const [i,nodeIndex]of packet.document.scenes[packet.document.scene||0].nodes.entries()){
      const node=packet.document.nodes[nodeIndex],mesh=model.root.children[i],p=packet.document.meshes[node.mesh].primitives[0];
      assert.ok(mesh.isMesh);assert.equal(mesh.name,node.name);
      for(const [property,value]of [['position',node.translation||[0,0,0]],['quaternion',node.rotation||[0,0,0,1]],['scale',node.scale||[1,1,1]]])
        assert.deepEqual(Array.from(mesh[property].toArray()),Array.from(value));
      for(const [semantic,index]of Object.entries(p.attributes))
        assert.deepEqual(Array.from(mesh.geometry.attributes[{POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'}[semantic]].array),Array.from(D.accessor(raw,index).array));
      assert.deepEqual(Array.from(mesh.geometry.index.array),Array.from(D.accessor(raw,p.indices).array));
      const source=packet.document.materials[p.material],pbr=source.pbrMetallicRoughness||{};
      assert.equal(mesh.material.name,source.name);assert.equal(mesh.material.metalness,pbr.metallicFactor??1);
      assert.equal(mesh.material.roughness,pbr.roughnessFactor??1);
    }
    owned.forEach(o=>o.dispose());
  }
});

test('closing camera dolly contains the complete device orbit without widening the source lens',()=>{
  const owned=new Set(),keep=o=>{owned.add(o);return o;},stage=new T.Group(),groups=[new T.Group(),new T.Group()];stage.add(...groups);
  for(const [i,name,target]of [[0,'iphone',3.2],[1,'macbook',4.5]]){
    const root=D.build(T,name,keep).root,box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3());
    root.scale.setScalar(target/(i?Math.max(size.x,size.z):size.y));box.setFromObject(root);root.position.sub(box.getCenter(new T.Vector3()));
    if(!i)D.alignScreenToMinusZ(T,root,'front-glass','rear-window');groups[i].add(root);
  }
  for(const aspect of [2.8,1.5,1,.7]){
    const camera=new T.PerspectiveCamera(34,aspect,.1,100);
    function pose(frame,dolly=1){
      const s=M.pose(frame/30).state,target=new T.Vector3(s.clX,s.clY,s.clZ);
      groups.forEach((g,i)=>{const p=i?'lp':'ph';g.position.set(s[p+'X'],s[p+'Y'],s[p+'Z']);g.rotation.set(s[p+'RX'],s[p+'RY'],s[p+'RZ']);});
      stage.rotation.y=s.turn;stage.updateMatrixWorld(true);
      camera.position.set(s.cX,s.cY,s.cZ).sub(target).multiplyScalar(dolly).add(target);camera.lookAt(target);camera.updateMatrixWorld();return target;
    }
    for(let frame=375;frame<=450;frame+=.125){
      const fit=1.01*context.window.ShortCreatorDeviceReview.framingDolly(T,camera,groups,pose(frame));
      assert.ok(fit>=1&&fit<4);assert.equal(camera.fov,34);
      pose(frame,fit);stage.traverse(mesh=>{
        if(!mesh.isMesh)return;const box=mesh.geometry.boundingBox;
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
          const p=new T.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld).project(camera);
          assert.ok(p.z>-1&&p.z<1);assert.ok(Math.max(Math.abs(p.x),Math.abs(p.y))<.95,
            JSON.stringify({aspect,frame,fit,mesh:mesh.name,projection:p.toArray()}));
        }
      });
    }
  }
  owned.forEach(o=>o.dispose());
});

test('device screen UV repair retains original geometry and phone orientation uses actual parts',()=>{
  const owned=new Set(),keep=o=>{owned.add(o);return o;};
  const model=D.build(T,'iphone',keep),front=model.root.getObjectByName('front-glass');
  const positions=Array.from(front.geometry.attributes.position.array);
  D.planarScreenUv(T,front);const uv=Array.from(front.geometry.attributes.uv.array);
  assert.equal(Math.min(...uv),0);assert.equal(Math.max(...uv),1);assert.deepEqual(Array.from(front.geometry.attributes.position.array),positions);
  D.alignScreenToMinusZ(T,model.root,'front-glass','rear-window');assert.equal(model.root.rotation.y,Math.PI);
  const a=front.getWorldPosition(new T.Vector3()),b=model.root.getObjectByName('rear-window').getWorldPosition(new T.Vector3());assert.ok(a.z<b.z);
  assert.throws(()=>D.alignScreenToMinusZ(T,model.root,'missing','rear-window'));
  const laptop=D.build(T,'macbook',keep);assert.ok(laptop.root.getObjectByName('display'));assert.ok(laptop.root.getObjectByName('display-notch'));
  owned.forEach(o=>o.dispose());
});

test('native closing handoff stays bounded before the off-stage phone arrives',()=>{
  const native={...T,PMREMGenerator:class {fromEquirectangular(){return {texture:new T.Texture(),dispose(){}};}dispose(){}}};
  const owned=new Set(),keep=o=>{owned.add(o);return o;};
  const canvas=(width,height)=>({c:{width,height},g:{createLinearGradient:()=>({addColorStop(){}}),fillRect(){},drawImage(){}}});
  for(const aspect of [.7,1,1.5,2.8]){
    const rig=context.window.ShortCreatorDeviceReview.build({T:native,renderer:{},scene:new T.Scene(),keep,
      colors:{background:'#000000',surface:'#222222',secondary:'#aa88ff',accent:'#ccff66'},width:aspect*1000,height:1000,
      images:[{naturalWidth:390,naturalHeight:844,dataset:{objectPath:'phone.png'}},
        {naturalWidth:1440,naturalHeight:900,dataset:{objectPath:'laptop.png'}}],canvas,texture:c=>keep(new T.CanvasTexture(c))});
    for(let frame=659;frame<=900;frame++){
      rig.update({seconds:frame/60});const state=rig.inspect();
      assert.ok(state.fit>=1&&state.fit<4,JSON.stringify({aspect,frame,fit:state.fit}));
      assert.equal(state.camera.fov,34);assert.ok(state.dolly>=1&&state.dolly<4);
      if(frame===660)assert.equal(state.dolly,1);
      if(frame>=750)assert.ok(state.closingBounds.every(v=>Math.abs(v)<1/1.06));
    }
    for(const boundary of [11,12.5]){
      rig.update({seconds:boundary-.000001});const before=rig.inspect();
      rig.update({seconds:boundary+.000001});const after=rig.inspect();
      assert.ok(Math.abs(after.dolly-before.dolly)<.0001,'Closing handoff must remain continuous');
      assert.ok(after.camera.position.every((v,i)=>Math.abs(v-before.camera.position[i])<.0001));
    }
  }
  owned.forEach(o=>o.dispose());
});

test('six-act source motion returns identical state for forward and backward seeks',()=>{
  const rows=Array.from({length:901},(_,i)=>plain(M.pose(i/60)));
  for(let i=900;i>=0;i--)assert.deepEqual(plain(M.pose(i/60)),rows[i]);
  assert.equal(rows[0].state.lpX,10);assert.equal(rows[600].state.phX,-6);
  assert.equal(rows[900].state.phX,-2);assert.equal(rows[900].state.lpX,2.2);assert.ok(Math.abs(rows[900].state.turn-Math.PI*2)<1e-6);
  assert.equal(rows[210].lens.visible,false);assert.equal(rows[600].lens.visible,true);assert.equal(rows[780].lens.visible,false);
  assert.ok(new Set(rows.map(r=>r.lens.shape)).size===6);assert.throws(()=>M.pose(NaN));
});

test('long screenshots scroll inside their source while short images remain centered',()=>{
  const place=context.window.ShortCreatorDeviceReview.screenPlacement;
  assert.deepEqual(plain(place(390,1600,390,844,.8,500)),{x:0,y:-400,width:390,height:1600});
  assert.deepEqual(plain(place(390,900,390,844,.8,500)),{x:0,y:-56,width:390,height:900});
  assert.deepEqual(plain(place(1440,600,1440,900,.8,300)),{x:0,y:150,width:1440,height:600});
  assert.throws(()=>place(0,1,390,844,0,500));
});
