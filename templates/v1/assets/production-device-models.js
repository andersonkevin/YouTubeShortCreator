/* Bounded adapter for the two pinned embedded HyperFrames GLB models.
   Uses the existing Three.js runtime; no GLTF/Draco loader or remote decoder. */
(() => {
  'use strict';
  const pins=Object.freeze({iphone:'20b926be3ab68ad773af8ef83949561f1f93bc22777688efd89bc38f0840614e',
    macbook:'12749c742f3bf67d14650eb831ab6c02104fba59074034c8ed42ce2c5c37c02b'});
  const prepared=new Map();
  const bytes=encoded=>Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  function accessor(packet,index) {
    const a=packet.document.accessors[index],v=packet.document.bufferViews[a.bufferView];
    const size={SCALAR:1,VEC2:2,VEC3:3}[a.type],Type=a.componentType===5126?Float32Array:Uint16Array;
    const offset=(v.byteOffset||0)+(a.byteOffset||0);
    return {array:new Type(packet.bytes.buffer,offset,a.count*size),size};
  }
  async function ready() {
    for(const [name,packet]of Object.entries(window.ShortCreatorDevicePackets||{})){
      if(packet.sha256!==pins[name]||packet.name!==name)throw new Error('Pinned device packet mismatch');
      if(prepared.has(name))continue;
      const raw=bytes(packet.binary),images=[];
      for(const source of packet.document.images){
        const v=packet.document.bufferViews[source.bufferView],part=raw.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);
        let binary='';for(let i=0;i<part.length;i+=8192)binary+=String.fromCharCode(...part.subarray(i,i+8192));
        const image=new Image();image.src='data:'+source.mimeType+';base64,'+btoa(binary);await image.decode();images.push(image);
      }
      prepared.set(name,{...packet,bytes:raw,images});
    }
  }
  function build(T,name,keep) {
    const packet=prepared.get(name);if(!packet||T.REVISION!=='185')throw new Error('Pinned device model is not ready');
    const d=packet.document,textures=new Map();
    function texture(index,color=false){
      const key=index+':'+color;if(textures.has(key))return textures.get(key);
      const source=d.textures[index],s=d.samplers[source.sampler]||{},tex=keep(new T.Texture(packet.images[source.source]));
      tex.flipY=false;tex.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;
      const wrap={10497:T.RepeatWrapping,33071:T.ClampToEdgeWrapping,33648:T.MirroredRepeatWrapping};
      tex.wrapS=wrap[s.wrapS??10497];tex.wrapT=wrap[s.wrapT??10497];
      tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.needsUpdate=true;textures.set(key,tex);return tex;
    }
    const materials=d.materials.map(source=>{
      const p=source.pbrMetallicRoughness||{},e=source.extensions||{},coat=e.KHR_materials_clearcoat||{},spec=e.KHR_materials_specular||{};
      const rgba=p.baseColorFactor||[1,1,1,1],m=keep(new T.MeshPhysicalMaterial({
        color:new T.Color().setRGB(...rgba.slice(0,3),T.LinearSRGBColorSpace),opacity:rgba[3],
        metalness:p.metallicFactor??1,roughness:p.roughnessFactor??1,side:source.doubleSided?T.DoubleSide:T.FrontSide,
        clearcoat:coat.clearcoatFactor??0,clearcoatRoughness:coat.clearcoatRoughnessFactor??0,
        specularIntensity:spec.specularFactor??1,ior:e.KHR_materials_ior?.ior??1.5,
        emissive:new T.Color().setRGB(...(source.emissiveFactor||[0,0,0]),T.LinearSRGBColorSpace),
        transparent:source.alphaMode==='BLEND',depthWrite:source.alphaMode!=='BLEND'}));
      m.name=source.name;
      if(p.baseColorTexture)m.map=texture(p.baseColorTexture.index,true);
      if(source.normalTexture){m.normalMap=texture(source.normalTexture.index);m.normalScale.setScalar(source.normalTexture.scale??1);}
      return m;
    });
    const meshes=d.meshes.map(source=>source.primitives.map(p=>{
      const geometry=keep(new T.BufferGeometry());
      for(const [semantic,index]of Object.entries(p.attributes)){
        const a=accessor(packet,index);geometry.setAttribute({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'}[semantic],new T.BufferAttribute(a.array.slice(),a.size));
      }
      if(p.indices!==undefined){const a=accessor(packet,p.indices);geometry.setIndex(new T.BufferAttribute(a.array.slice(),1));}
      geometry.computeBoundingBox();geometry.computeBoundingSphere();return {geometry,material:materials[p.material]};
    }));
    const root=new T.Group();root.name=name;
    for(const index of d.scenes[d.scene||0].nodes){
      const node=d.nodes[index],parts=meshes[node.mesh];
      const object=parts.length===1?new T.Mesh(parts[0].geometry,parts[0].material):new T.Group();
      if(parts.length>1)for(const part of parts)object.add(new T.Mesh(part.geometry,part.material));
      object.name=node.name;if(node.translation)object.position.fromArray(node.translation);
      if(node.rotation)object.quaternion.fromArray(node.rotation);if(node.scale)object.scale.fromArray(node.scale);root.add(object);
    }
    root.updateMatrixWorld(true);
    return {root,sha256:packet.sha256,geometryCount:meshes.reduce((n,p)=>n+p.length,0),materialCount:materials.length,
      textureCount:textures.size,nodeCount:root.children.length};
  }
  function planarScreenUv(T,mesh) {
    const geometry=mesh.geometry;geometry.computeBoundingBox();const box=geometry.boundingBox,pos=geometry.attributes.position;
    const w=box.max.x-box.min.x||1,h=box.max.y-box.min.y||1,uv=new Float32Array(pos.count*2);
    for(let i=0;i<pos.count;i++){uv[i*2]=(pos.getX(i)-box.min.x)/w;uv[i*2+1]=(pos.getY(i)-box.min.y)/h;}
    geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
  }
  function alignScreenToMinusZ(T,root,frontName,backName) {
    const front=root.getObjectByName(frontName),back=root.getObjectByName(backName);
    if(!front||!back)throw new Error('Pinned device screen orientation parts missing');
    root.updateWorldMatrix(true,true);const a=new T.Vector3(),b=new T.Vector3();front.getWorldPosition(a);back.getWorldPosition(b);
    if(a.z>b.z)root.rotation.y+=Math.PI;root.updateMatrixWorld(true);
  }
  function screen(T,name,keep,map,bodyColor){
    const model=build(T,name,keep),root=model.root,phone=name==='iphone';
    const box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3());
    root.scale.setScalar(phone?3.2/size.y:4.5/Math.max(size.x,size.z));
    box.setFromObject(root);root.position.sub(box.getCenter(new T.Vector3()));
    let panel=null;
    root.traverse(child=>{
      if(!child.isMesh)return;
      if(phone?child.name.startsWith('front-glass'):child.name.replace(/\.\d+$/,'')==='display'){
        planarScreenUv(T,child);child.material=keep(new T.MeshBasicMaterial({map}));panel=child;
      }else if(child.material.name.includes('anodised-aluminium'))child.material.color.set(bodyColor);
    });
    if(!panel)throw new Error('Pinned device display is missing');
    if(phone)alignScreenToMinusZ(T,root,'front-glass','rear-window');
    return {...model,panel};
  }
  function corners(T,roots){
    const points=[];
    for(const root of roots)root.traverse(mesh=>{
      if(!mesh.isMesh)return;const box=mesh.geometry.boundingBox;
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])
        points.push(new T.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld));
    });
    return points;
  }
  function framingDolly(T,camera,roots,target){
    const distance=camera.position.distanceTo(target),tan=Math.tan(camera.fov*Math.PI/360);let retreat=0;
    for(const point of corners(T,roots)){
      point.applyMatrix4(camera.matrixWorldInverse);
      retreat=Math.max(retreat,point.z+1.06*Math.abs(point.x)/(tan*camera.aspect),point.z+1.06*Math.abs(point.y)/tan);
    }
    return 1+retreat/distance;
  }
  window.ShortCreatorDeviceModels=Object.freeze({ready,build,accessor,planarScreenUv,alignScreenToMinusZ,screen,corners,framingDolly,pins});
})();
