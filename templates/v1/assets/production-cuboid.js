/* HyperFrames cuboid-carousel, Apache-2.0; Three.js and RoomEnvironment MIT. */
(() => {
  'use strict';
  const M=window.ShortCreatorCuboidMotion;
  // The source prints the negative-Z cap with flipY=false, so the top canvas
  // row maps to the local bottom edge before the saved card rotation.
  const facePoint=(T,x,y)=>new T.Vector3((x/540-.5)*1.7,(y/756-.5)*2.4,-.07);
  function wrap(context,text,width) {
    const lines=[];let current='';
    for(const word of text.split(' ')) {
      if(context.measureText(word).width>width)throw new Error('Cuboid word exceeds its readable face');
      const candidate=current?current+' '+word:word;
      if(current&&context.measureText(candidate).width>width){lines.push(current);current=word;}
      else current=candidate;
    }
    if(current)lines.push(current);return lines;
  }
  function capShader(material,body,T) {
    material.onBeforeCompile=shader=>{
      shader.uniforms.uBody={value:new T.Color(body)};
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vLocalZ;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvLocalZ = position.z;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vLocalZ;uniform vec3 uBody;')
        .replace('#include <map_fragment>','#include <map_fragment>\nif(vLocalZ>0.0)diffuseColor.rgb=uBody;')
        .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nif(vLocalZ>0.0)totalEmissiveRadiance=vec3(0.0);');
    };
    material.customProgramCacheKey=()=> 'native-cuboid-printed-front';
  }
  function build({T,renderer,scene,keep,colors,width,height,content,canvas,texture,room}) {
    for(const weight of ['600','800'])if(![...document.fonts].some(face=>face.family.replaceAll('"','')==='BrandSans'&&face.weight===weight&&face.status==='loaded'))
      throw new Error('Approved cuboid body and display fonts must be loaded');
    const rig=M.create(T,content.cards.length,content.hero,0),geometry=keep(M.geometry(T));
    geometry.computeBoundingBox();
    const studio=room(T,keep,1),pmrem=new T.PMREMGenerator(renderer);let env;
    try{env=keep(pmrem.fromScene(studio,.04)).texture;}finally{pmrem.dispose();}
    const side=keep(new T.MeshStandardMaterial({color:colors.surface,roughness:.6,metalness:.4,envMap:env,envMapIntensity:.3}));
    const copy=[];
    const caps=content.cards.map((item,index)=>{
      const {c,g}=canvas(540,756),ink=index%2?colors.secondary:colors.accent,rows=[];
      g.fillStyle=colors.surface;g.fillRect(0,0,540,756);g.textBaseline='alphabetic';g.textAlign='left';
      const line=(text,x,y,size,weight,color)=>{
        g.font=`${weight} ${size}px BrandSans`;const m=g.measureText(text);
        const box=[x-m.actualBoundingBoxLeft,y-m.actualBoundingBoxAscent,x+m.actualBoundingBoxRight,y+m.actualBoundingBoxDescent];
        if(box[0]<0||box[2]>495||box[1]<0||box[3]>756)
          throw new Error('Cuboid copy exceeds its face; shorten it');
        g.fillStyle=color;g.fillText(text,x,y);rows.push({text,size,font:g.font,weight,box});
      };
      line(item.category,45,74,44,600,ink);
      g.font='800 68px BrandSans';const lines=wrap(g,item.title,450);
      if(lines.length>5)throw new Error('Cuboid title exceeds five readable lines');
      for(const [i,text]of lines.entries())line(text,45,167+i*80,68,800,'#ffffff');
      let x=45;
      for(const text of item.pills){
        g.font='600 36px BrandSans';const w=g.measureText(text).width+44;
        if(x+w>495)throw new Error('Cuboid pills exceed their shared row');
        g.beginPath();g.roundRect(x,661,w,50,25);g.strokeStyle=ink;g.lineWidth=1.4;g.stroke();
        line(text,x+22,699,36,600,ink);x+=w+15;
      }
      copy.push({category:item.category,title:item.title,pills:[...item.pills],rows});
      const map=texture(c);map.flipY=false;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;
      const material=keep(new T.MeshStandardMaterial({map,roughness:.6,metalness:.4,envMap:env,envMapIntensity:0}));
      capShader(material,colors.surface,T);return material;
    });
    const heroMaterial=keep(caps[content.hero-1].clone());capShader(heroMaterial,colors.surface,T);
    heroMaterial.emissive.set(0xffffff);heroMaterial.emissiveMap=caps[content.hero-1].map;heroMaterial.emissiveIntensity=0;
    const root=new T.Group();root.matrixAutoUpdate=false;root.matrix.fromArray(rig.sample(0).root);scene.add(root);
    const meshes=window.ShortCreatorCuboidData.tiles.map(()=>{
      const mesh=new T.Mesh(geometry,[caps[0],side]);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;
    });
    scene.background=new T.Color(colors.background);scene.add(new T.AmbientLight(0xffffff,.35));
    const top=new T.DirectionalLight(0xffffff,3.1);top.position.set(20,9,3);top.castShadow=true;
    top.shadow.mapSize.set(2048,2048);top.shadow.radius=44.5;top.shadow.bias=-.0003;top.shadow.normalBias=.02;
    Object.assign(top.shadow.camera,{left:-14,right:14,top:10,bottom:-10,near:.5,far:60});top.shadow.camera.updateProjectionMatrix();keep(top.shadow);scene.add(top);
    for(const [color,intensity,position]of [[colors.secondary,2.15,[0,-8,3]],[colors.accent,5,[12,9.2,7]]]){
      const light=new T.DirectionalLight(color,intensity);light.position.set(...position);scene.add(light);
    }
    const camera=new T.PerspectiveCamera(34,width/height,.1,200);let latest=null,heroBounds=null,readable=[];
    function update(state){
      latest=rig.sample(state.seconds);camera.position.fromArray(latest.camera.position);camera.quaternion.fromArray(latest.camera.quaternion);
      // Native boards are shorter than the source film; this fixed lens fit
      // preserves the saved path while keeping the isolated card readable.
      camera.fov=2*Math.atan(Math.tan(latest.camera.fov*Math.PI/360)*.72)*180/Math.PI;
      camera.updateProjectionMatrix();camera.updateMatrixWorld();heroMaterial.emissiveIntensity=latest.heroFill;
      meshes.forEach((mesh,i)=>{const pose=latest.tiles[i];mesh.position.fromArray(pose.position);mesh.quaternion.fromArray(pose.quaternion);
        mesh.scale.fromArray(pose.scale);mesh.visible=pose.visible;mesh.material[0]=pose.heroMaterial?heroMaterial:caps[pose.item];});
      root.updateMatrixWorld(true);readable=[];heroBounds=null;
      if(latest.frame>=90&&latest.frame<=150){
        const mesh=meshes[latest.heroSlot],project=(x,y)=>facePoint(T,x,y).applyMatrix4(mesh.matrixWorld).project(camera);
        const bounds=(l,t,r,b)=>{const p=[[l,t],[r,t],[r,b],[l,b]].map(([x,y])=>project(x,y));
          return [Math.min(...p.map(p=>(p.x*.5+.5)*width)),Math.min(...p.map(p=>(.5-p.y*.5)*height)),
            Math.max(...p.map(p=>(p.x*.5+.5)*width)),Math.max(...p.map(p=>(.5-p.y*.5)*height))];};
        heroBounds=bounds(0,0,540,756);
        if(heroBounds[0]<0||heroBounds[1]<0||heroBounds[2]>width||heroBounds[3]>height)throw new Error('Cuboid hero escapes its readable board');
        readable=copy[content.hero-1].rows.map(row=>{
          const box=bounds(...row.box),a=project(270,378),b=project(270,378+row.size);
          const size=Math.abs(b.y-a.y)*height/2,min=row.weight===800?28:14;
          if(size<min)throw new Error('Cuboid face text is too small in its native format');
          return {...row,box,size};
        });
      }
      return [];
    }
    function draw(){
      const old={tone:renderer.toneMapping,exposure:renderer.toneMappingExposure,shadows:renderer.shadowMap.enabled,type:renderer.shadowMap.type,auto:renderer.shadowMap.autoUpdate};
      try{renderer.toneMapping=T.NoToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=true;renderer.render(scene,camera);}
      finally{renderer.toneMapping=old.tone;renderer.toneMappingExposure=old.exposure;renderer.shadowMap.enabled=old.shadows;renderer.shadowMap.type=old.type;renderer.shadowMap.autoUpdate=old.auto;}
    }
    function inspect(){return {frame:latest.frame,heroSlot:latest.heroSlot,hero:content.hero,copy,readable,heroBounds,handheld:0,
      sourceCamera:latest.camera,camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov},
      root:root.matrix.toArray(),heroFill:heroMaterial.emissiveIntensity,geometry:{vertices:geometry.attributes.position.count,indices:geometry.index.count},
      tiles:meshes.map((mesh,i)=>({position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),visible:mesh.visible,
        item:mesh.material[0]===heroMaterial?content.hero-1:caps.indexOf(mesh.material[0]),heroMaterial:mesh.material[0]===heroMaterial})),
      shadowMapSize:top.shadow.mapSize.toArray(),textureSize:[540,756]};}
    return {camera,update,draw,inspect};
  }
  window.ShortCreatorCuboid=Object.freeze({build,wrap,capShader,facePoint});
})();
