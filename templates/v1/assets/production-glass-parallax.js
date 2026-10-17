/* HyperFrames vfx-liquid-glass, Apache-2.0. Native verified-image adapter.
   Three.js r185 physical glass and official bloom retain their MIT notices. */
(()=>{
  'use strict';
  const clamp=p=>Math.max(0,Math.min(1,p)),out=p=>1-(1-p)**3;
  function geometry(width,height){
    if(![width,height].every(n=>Number.isInteger(n)&&n>=32&&n<=4096)||width/height<.5||width/height>4)
      throw new Error('Invalid glass parallax geometry');
    return {width,height,aspect:width/height,horizontal:width/height/(16/9),fov:34,cameraZ:9.35,textZ:-3.08};
  }
  function palette(colors){
    for(const key of ['background','accent','secondary'])if(typeof colors[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(colors[key]))
      throw new Error('Approved glass palette required');
    return {...colors};
  }
  let renderer=null,scene=null,camera=null,active=null,lastStats=null;
  function prepare(){
    if(renderer)return;const T=window.ShortCreatorThree;
    if(T?.REVISION!=='185'||!window.ShortCreatorThreePostprocess)throw new Error('Pinned glass runtime unavailable');
    renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
    renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
    renderer.debug.onShaderError=()=>{throw new Error('Glass parallax shader compilation failed');};
    // Three caches transmission targets by scene and camera. Reuse both across
    // still replacements so each replacement does not allocate another target.
    scene=new T.Scene();camera=new T.PerspectiveCamera(34,1,.1,80);
  }
  function build(width,height,image,colors){
    const T=window.ShortCreatorThree,P=window.ShortCreatorThreePostprocess,motion=window.ShortCreatorGlassParallaxMotion;
    const g=geometry(width,height),owned=new Set(),keep=o=>{owned.add(o);return o;};
    try{
      const model=motion.data(g.aspect);scene.clear();scene.background=new T.Color(colors.background);
      camera.aspect=g.aspect;camera.updateProjectionMatrix();camera.position.set(0,0,9.35);
      const rig=new T.Group(),textRig=new T.Group(),glassRig=new T.Group();scene.add(rig);rig.add(textRig,glassRig);
      glassRig.scale.setScalar(1.025);glassRig.position.set(0,0,.08);
      const envCanvas=document.createElement('canvas');envCanvas.width=1024;envCanvas.height=512;
      const ectx=envCanvas.getContext('2d');if(!ectx)throw new Error('Glass environment canvas unavailable');
      const gradient=ectx.createLinearGradient(0,0,1024,512);
      for(const [stop,color]of [[0,colors.background],[.18,'#ffffff'],[.24,colors.secondary],[.42,colors.background],
        [.58,'#ffffff'],[.64,colors.accent],[.82,colors.background],[1,colors.background]])gradient.addColorStop(stop,color);
      ectx.fillStyle=gradient;ectx.fillRect(0,0,1024,512);ectx.globalCompositeOperation='screen';
      for(let i=0;i<9;i++){ectx.fillStyle='rgba(255,255,255,'+(i%3===0?.22:.1)+')';ectx.fillRect(i%2*120,36+i*52,1024*.72,4+i%3*2);}
      const envTex=new T.CanvasTexture(envCanvas);envTex.mapping=T.EquirectangularReflectionMapping;
      const pmrem=new T.PMREMGenerator(renderer);
      try{const environment=keep(pmrem.fromEquirectangular(envTex));scene.environment=environment.texture;}
      finally{envTex.dispose();pmrem.dispose();}
      const textureCanvas=document.createElement('canvas');textureCanvas.width=width;textureCanvas.height=height;
      const ctx=textureCanvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Glass texture canvas unavailable');
      const texture=keep(new T.CanvasTexture(textureCanvas));texture.colorSpace=T.SRGBColorSpace;
      texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;
      function paint(still){
        if(!still.complete||still.naturalWidth<32||still.naturalHeight<32)throw new Error('Glass still is not decoded');
        // The source plane overscans by 18%; pad the verified still rather than crop it.
        const fitted=window.ShortCreatorShaders.contain(width/1.36,height/1.36,still.naturalWidth,still.naturalHeight);
        fitted.x+=(width-width/1.36)/2;fitted.y+=(height-height/1.36)/2;
        ctx.fillStyle=colors.background;ctx.fillRect(0,0,width,height);ctx.drawImage(still,fitted.x,fitted.y,fitted.width,fitted.height);
        texture.needsUpdate=true;return fitted;
      }
      const fit=paint(image);
      const planeHeight=2*Math.tan(17*Math.PI/180)*(9.35+3.08)*1.18;
      const backdrop=new T.Mesh(keep(new T.PlaneGeometry(planeHeight*g.aspect,planeHeight)),keep(new T.MeshBasicMaterial({map:texture,depthWrite:true,depthTest:true})));
      backdrop.position.z=-3.08;backdrop.renderOrder=-4;textRig.add(backdrop);
      const bandSpecs=[[-2.8,1.45,-1.78,3.2,.035,.13,colors.secondary,.24],[2.7,-1.24,-1.76,3,.032,-.1,colors.accent,.18],
        [0,2.05,-1.82,5.2,.026,.02,'#ffffff',.13],[-.55,-1.92,-1.8,4.2,.024,-.03,colors.secondary,.1]];
      for(const s of bandSpecs){const mesh=new T.Mesh(keep(new T.PlaneGeometry(s[3]*g.horizontal,s[4])),keep(new T.MeshBasicMaterial({
        color:s[6],transparent:true,opacity:s[7],blending:T.AdditiveBlending,depthWrite:false})));
        mesh.position.set(s[0]*g.horizontal,s[1],s[2]);mesh.rotation.z=s[5];rig.add(mesh);}
      const panes=model.panes.map(d=>{
        const shape=new T.Shape();d.local.forEach((p,i)=>i===0?shape.moveTo(...p):shape.lineTo(...p));shape.closePath();
        const geo=keep(new T.ExtrudeGeometry(shape,{depth:d.depth,bevelEnabled:true,bevelThickness:d.bevel,bevelSize:d.bevel,bevelSegments:9,curveSegments:2,steps:2}));
        geo.center();geo.computeVertexNormals();
        const mat=keep(new T.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:d.roughness,transmission:1,thickness:d.thickness,
          ior:1.55,attenuationColor:new T.Color(colors.secondary).lerp(new T.Color(0xffffff),.85),attenuationDistance:12,
          clearcoat:1,clearcoatRoughness:Math.min(.12,d.roughness+.035),specularIntensity:1,envMapIntensity:2.1,
          transparent:true,opacity:.76,side:T.DoubleSide}));
        const group=new T.Group(),mesh=new T.Mesh(geo,mat);mesh.renderOrder=4+d.index;group.add(mesh);
        const edgeGeo=keep(new T.EdgesGeometry(geo,18));
        const edges=[[0xffffff,d.edgeWBase,[0,0,0]],[colors.secondary,.18,[.008,-.002,-.008]],[colors.accent,.14,[-.009,.003,.006]]].map((s,i)=>{
          const line=new T.LineSegments(i===0?edgeGeo:keep(edgeGeo.clone()),keep(new T.LineBasicMaterial({color:s[0],transparent:true,opacity:s[1],blending:T.AdditiveBlending,depthWrite:false})));
          line.position.set(...s[2]);group.add(line);return line;
        });
        glassRig.add(group);return {group,mesh,edges};
      });
      scene.add(new T.HemisphereLight(0xffffff,colors.background,1.1));
      const keyLight=new T.DirectionalLight(0xffffff,3.4);keyLight.position.set(-3.8*g.horizontal,4.4,5.6);scene.add(keyLight);
      const edgeLight=new T.PointLight(colors.secondary,14,12),warmLight=new T.PointLight(colors.accent,7,12);scene.add(edgeLight,warmLight);
      const target=keep(new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType}));
      const bloom=keep(new P.UnrealBloomPass(new T.Vector2(width,height),.32,.4,.86));bloom.renderToScreen=false;
      // The upstream pass does not dispose its high-pass material.
      keep(bloom.materialHighPassFilter);
      const grain=keep(new T.ShaderMaterial({uniforms:{tDiffuse:{value:target.texture},time:{value:0},strength:{value:.024}},
        vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:'uniform sampler2D tDiffuse; uniform float time; uniform float strength; varying vec2 vUv;\n'+
          'float n(vec2 v){return fract(sin(dot(v+time,vec2(12.9898,78.233)))*43758.5453);}\n'+
          'void main(){vec4 c=texture2D(tDiffuse,vUv);c.rgb+=(n(vUv*vec2(1520.0,940.0))-0.5)*strength;'+
          'c.rgb=pow(max(c.rgb,vec3(0.0)),vec3(0.985));gl_FragColor=c;\n'+
          '#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
      const quad=keep(new P.FullScreenQuad(grain));
      return {g,image,colors,model,scene,camera,panes,textRig,glassRig,edgeLight,warmLight,fit,bloom,grain,backdrop,planeHeight,
        replaceImage(still){this.fit=paint(still);this.image=still;},
        dispose:()=>owned.forEach(o=>o.dispose()),apply:s=>{
          camera.position.set(...s.camera);camera.lookAt(0,0,0);
          textRig.position.set(...s.textPosition);textRig.rotation.set(...s.textRotation);glassRig.rotation.set(...s.glassRotation);
          edgeLight.position.set(...s.edgeLight);warmLight.position.set(...s.warmLight);
          panes.forEach((p,i)=>{const v=s.panes[i];p.group.position.set(...v.position);p.group.rotation.set(...v.rotation);
            p.mesh.material.opacity=v.opacity;p.mesh.material.roughness=v.roughness;p.edges.forEach((e,j)=>{e.material.opacity=v.edges[j];});});
          grain.uniforms.time.value=s.time;
        },render:()=>{
          renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);
          bloom.render(renderer,null,target,0,false);renderer.setRenderTarget(null);quad.render(renderer);
        }};
    }catch(error){owned.forEach(o=>o.dispose());throw error;}
  }
  function draw(canvas,image,colors,seconds){
    const {width,height}=canvas;geometry(width,height);palette(colors);prepare();const gl=renderer.getContext();
    if(gl.isContextLost())throw new Error('Glass WebGL context lost');
    const same=active&&active.g.width===width&&active.g.height===height&&
      ['background','accent','secondary'].every(k=>colors[k]===active.colors[k]);
    if(!same){active?.dispose();active=null;renderer.setSize(width,height,false);renderer.setClearColor(colors.background,1);active=build(width,height,image,{...colors});}
    else if(active.image!==image)active.replaceImage(image);
    const state=window.ShortCreatorGlassParallaxMotion.state(seconds,active.model);active.apply(state);active.render();
    if(gl.getError()!==gl.NO_ERROR)throw new Error('Glass WebGL render failed');
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Glass output canvas unavailable');ctx.drawImage(renderer.domElement,0,0);
    const program=gl.getParameter(gl.CURRENT_PROGRAM),uniforms={};
    for(const name of ['time','strength']){const location=gl.getUniformLocation(program,name);
      if(location===null)throw new Error('Missing glass grain uniform');uniforms[name]=gl.getUniform(program,location);}
    const fit=active.fit,imageCorners=[[fit.x,fit.y],[fit.x+fit.width,fit.y],[fit.x+fit.width,fit.y+fit.height],[fit.x,fit.y+fit.height]].map(([x,y])=>{
      const point=new window.ShortCreatorThree.Vector3((x/width-.5)*active.planeHeight*active.g.aspect,(.5-y/height)*active.planeHeight,0);
      point.applyMatrix4(active.backdrop.matrixWorld).project(active.camera);return [(point.x+1)*width/2,(1-point.y)*height/2];});
    lastStats={revision:'185',contexts:1,panes:active.panes.length,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,uniforms,imageCorners,
      camera:active.camera.position.toArray(),projection:active.camera.projectionMatrix.toArray(),textPosition:active.textRig.position.toArray(),
      textRotation:active.textRig.rotation.toArray().slice(0,3),glassRotation:active.glassRig.rotation.toArray().slice(0,3),fit:active.fit,
      bloom:{strength:active.bloom.strength,radius:active.bloom.radius,threshold:active.bloom.threshold,mips:active.bloom.nMips},
      grain:{time:active.grain.uniforms.time.value,strength:active.grain.uniforms.strength.value},
      samples:[0,13,27,40,53].map(i=>{const p=active.panes[i],m=p.mesh.material;return {index:i,initial:active.model.panes[i],
        position:p.group.position.toArray(),rotation:p.group.rotation.toArray().slice(0,3),opacity:m.opacity,roughness:m.roughness,
        thickness:m.thickness,ior:m.ior,transmission:m.transmission,vertices:p.mesh.geometry.attributes.position.count,
        color:m.color.toArray(),attenuation:m.attenuationColor.toArray(),edgeColors:p.edges.map(e=>e.material.color.toArray()),
        edges:p.edges.map(e=>e.material.opacity)};})};
    return state;
  }
  function mount(host,c,onsets,data,make){
    const motion=window.ShortCreatorGlassParallaxMotion;motion.clock(0,onsets);
    const heading=make('h2','prod-heading glass-parallax-heading',c.heading,host,true),source=make('p','interface-source',c.source,host,true);
    const board=make('div','glass-parallax-board',null,host),canvas=make('canvas','glass-parallax-canvas',null,board);
    canvas.width=board.clientWidth;canvas.height=board.clientHeight;canvas.setAttribute('aria-hidden','true');
    const im=make('img','glass-parallax-ready',null,board);im.src=data.assets[c.image];im.alt='';
    const image=window.ShortCreatorShaders.verifiedImage(im),css=getComputedStyle(board);
    const colors={background:css.getPropertyValue('--purple').trim(),secondary:css.getPropertyValue('--cyan').trim(),accent:css.getPropertyValue('--lime').trim()};
    return time=>{
      const timer=motion.clock(time,onsets),frame=Math.floor(time*30+1e-7),entry=out(clamp((frame-Math.ceil(onsets[0]*30))/24));
      heading.style.opacity=String(entry);heading.style.transform='translateY('+(24*(1-entry))+'px)';
      source.style.opacity=String(out(clamp((frame-Math.ceil(onsets[1]*30))/24)));board.style.visibility=timer.visible?'visible':'hidden';
      draw(canvas,image,colors,timer.time);board.dataset.glassParallax=JSON.stringify(timer);
    };
  }
  function dispose(){active?.dispose();active=null;renderer?.dispose();renderer?.forceContextLoss();renderer=null;scene=null;camera=null;lastStats=null;}
  window.addEventListener?.('pagehide',dispose);
  window.ShortCreatorGlassParallax={geometry,palette,draw,mount,dispose,stats:()=>lastStats||{contexts:0}};
})();
