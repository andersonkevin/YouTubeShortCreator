/* HyperFrames vfx-iphone-device, Apache-2.0; native local screens and brand palette. */
(() => {
  'use strict';
  const M=window.ShortCreatorDeviceMotion;
  const {corners:deviceCorners,framingDolly}=window.ShortCreatorDeviceModels;
  function screenPlacement(iw,ih,width,height,scroll,travel){
    if(![iw,ih,width,height].every(v=>Number.isFinite(v)&&v>0)||!Number.isFinite(scroll))throw new Error('Invalid device screen dimensions');
    const scale=width/iw,h=ih*scale;
    if(h>=height)return {x:0,y:-Math.min(h-height,Math.max(0,scroll)*travel),width,height:h};
    return {x:0,y:(height-h)/2,width,height:h};
  }
  function build({T,renderer,scene,keep,colors,width,height,images,canvas,texture}){
    const models=window.ShortCreatorDeviceModels;
    const camera=new T.PerspectiveCamera(34,width/height,.1,100),turntable=new T.Group();scene.add(turntable);
    const phoneGroup=new T.Group(),laptopGroup=new T.Group();turntable.add(phoneGroup,laptopGroup);
    const canvases=[canvas(390,844),canvas(1440,900)],maps=canvases.map(({c})=>texture(c));
    maps.forEach(t=>{t.minFilter=t.magFilter=T.LinearFilter;t.generateMipmaps=false;});
    const phone=models.screen(T,'iphone',keep,maps[0],colors.secondary),laptop=models.screen(T,'macbook',keep,maps[1],colors.secondary);
    phoneGroup.add(phone.root);laptopGroup.add(laptop.root);const screens=[phone.panel,laptop.panel];
    const env=canvas(1024,512),gradient=env.g.createLinearGradient(0,0,1024,512);
    [[0,colors.background],[.15,colors.surface],[.3,'#ffffff'],[.45,colors.background],[.6,'#ffffff'],[.75,colors.surface],[1,colors.background]]
      .forEach(([stop,color])=>gradient.addColorStop(stop,color));
    env.g.fillStyle=gradient;env.g.fillRect(0,0,1024,512);env.g.globalCompositeOperation='screen';
    for(let i=0;i<7;i++){env.g.fillStyle='rgba(255,255,255,'+(i%2===0?.15:.08)+')';env.g.fillRect((i%3)*100,60+i*56,700,3+i%2*2);}
    const eT=texture(env.c);eT.mapping=T.EquirectangularReflectionMapping;const pm=new T.PMREMGenerator(renderer);
    try{scene.environment=keep(pm.fromEquirectangular(eT)).texture;}finally{pm.dispose();}
    scene.background=new T.Color(colors.background);
    const floor=new T.Mesh(keep(new T.PlaneGeometry(30,30)),keep(new T.MeshStandardMaterial({color:colors.background,metalness:.95,roughness:.18})));
    floor.rotation.x=-Math.PI/2;floor.position.y=-2.5;scene.add(floor);
    scene.add(new T.AmbientLight(colors.surface,.5));
    const key=new T.DirectionalLight(0xffffff,2.2);key.position.set(-3,4,5);scene.add(key);
    for(const [color,intensity,range,p]of [[colors.secondary,3,15,[4,2,3]],[colors.accent,1.5,12,[-3,-1,4]]]){
      const light=new T.PointLight(color,intensity,range);light.position.set(...p);scene.add(light);
    }
    const material=keep(new T.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.02,transmission:1,thickness:1.8,ior:1.45,
      attenuationColor:new T.Color(colors.secondary),attenuationDistance:10,clearcoat:1,clearcoatRoughness:.03,
      specularIntensity:1,envMapIntensity:2.5,transparent:true,opacity:.85,side:T.DoubleSide}));
    const shapes=[new T.SphereGeometry(.22,32,32),new T.IcosahedronGeometry(.22,1),new T.OctahedronGeometry(.25,0),
      new T.DodecahedronGeometry(.22,0),new T.TetrahedronGeometry(.28,0),new T.TorusGeometry(.16,.07,16,32)].map(keep);
    const lens=new T.Mesh(shapes[0],material);lens.renderOrder=10;scene.add(lens);let latest=null,placements=[];
    function place(s,dolly=1){
      phoneGroup.position.set(s.phX,s.phY,s.phZ);phoneGroup.rotation.set(s.phRX,s.phRY,s.phRZ);
      laptopGroup.position.set(s.lpX,s.lpY,s.lpZ);laptopGroup.rotation.set(s.lpRX,s.lpRY,s.lpRZ);turntable.rotation.y=s.turn;
      const target=new T.Vector3(s.clX,s.clY,s.clZ);
      camera.position.set(s.cX,s.cY,s.cZ).sub(target).multiplyScalar(dolly).add(target);
      camera.lookAt(target);camera.updateMatrixWorld();
      scene.updateMatrixWorld(true);
    }
    function projectedBounds(){
      const points=deviceCorners(T,[phoneGroup,laptopGroup]).map(point=>point.project(camera));
      return [Math.min(...points.map(p=>p.x)),Math.min(...points.map(p=>p.y)),Math.max(...points.map(p=>p.x)),Math.max(...points.map(p=>p.y))];
    }
    // Retain the source lens and hero shots. Fit each absolute closing pose so
    // the final front view stays prominent after the wider spinning silhouette.
    let fit=1,dolly=1;
    function update(state){
      const p=M.pose(state.seconds),s=p.state;latest=p;
      // Before both devices arrive, use their first complete closing pose as the
      // framing target. An off-stage device must not drive the camera retreat.
      const framing=p.seconds>=11&&p.seconds<12.5?M.pose(12.5).state:s;
      place(framing);
      fit=p.seconds<11?1:1.01*framingDolly(T,camera,[phoneGroup,laptopGroup],new T.Vector3(framing.clX,framing.clY,framing.clZ));
      const progress=Math.max(0,Math.min(1,(p.seconds-11)/1.5));
      dolly=1+(fit-1)*progress*progress*(3-2*progress);place(s,dolly);
      lens.geometry=shapes[p.lens.shape];lens.rotation.fromArray(p.lens.rotation);lens.position.fromArray(p.lens.position);lens.visible=p.lens.visible;
      placements=canvases.map(({c,g},i)=>{
        const image=images[i],box=screenPlacement(image.naturalWidth,image.naturalHeight,c.width,c.height,s.scroll,i?300:500);
        g.fillStyle=colors.surface;g.fillRect(0,0,c.width,c.height);g.drawImage(image,box.x,box.y,box.width,box.height);maps[i].needsUpdate=true;return box;
      });
      scene.updateMatrixWorld(true);return [];
    }
    function draw(){
      const tone=renderer.toneMapping,exposure=renderer.toneMappingExposure;
      try{renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.render(scene,camera);}
      finally{renderer.toneMapping=tone;renderer.toneMappingExposure=exposure;}
    }
    function inspect(){
      const modelData=(m,group)=>({sha256:m.sha256,nodes:m.nodeCount,geometries:m.geometryCount,materials:m.materialCount,
        textureCount:m.textureCount,scale:m.root.scale.toArray(),offset:m.root.position.toArray(),alignment:m.root.rotation.y,
        position:group.position.toArray(),rotation:group.rotation.toArray().slice(0,3)});
      return {seconds:latest.seconds,state:latest.state,phone:modelData(phone,phoneGroup),laptop:modelData(laptop,laptopGroup),
        turn:turntable.rotation.y,sourceFov:34,fit,dolly,framing:'mesh-bounds-dolly',closingBounds:latest.seconds>=12.5?projectedBounds():null,
        camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov},
        lens:{...latest.lens,position:lens.position.toArray(),rotation:lens.rotation.toArray().slice(0,3),visible:lens.visible},
        screens:screens.map((mesh,i)=>({name:mesh.name,placement:placements[i],canvas:[canvases[i].c.width,canvases[i].c.height],
          image:[images[i].naturalWidth,images[i].naturalHeight],uvRange:[Math.min(...mesh.geometry.attributes.uv.array),Math.max(...mesh.geometry.attributes.uv.array)],
          source:images[i].dataset.objectPath,material:mesh.material.type})),idleDrift:false};
    }
    return {camera,update,draw,inspect};
  }
  window.ShortCreatorDeviceReview=Object.freeze({build,screenPlacement,framingDolly});
})();
