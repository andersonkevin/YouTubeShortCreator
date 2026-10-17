/* HyperFrames vfx-shatter, Apache-2.0. Two verified local images, retained
   crack shader, 200 seeded shards and fixed-step physics on Three.js r185. */
(()=>{
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),out=p=>1-(1-p)**3;
  function geometry(width,height){
    if(![width,height].every(n=>Number.isInteger(n)&&n>=32&&n<=4096)||width/height<.5||width/height>4)
      throw new Error('Invalid native shatter geometry');
    return {width,height,aspect:width/height,near:.1,far:100,cameraZ:10,backgroundZ:-.5};
  }
  function palette(colors){
    const rgb=s=>{if(typeof s!=='string'||!/^#[0-9a-f]{6}$/i.test(s))throw new Error('Approved shatter palette required');
      return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255);};
    return {background:rgb(colors.background),crack:rgb(colors.secondary),impact:rgb(colors.secondary).map(v=>v*.6)};
  }
  let renderer=null,active=null,lastStats=null;
  function prepare(){
    if(renderer)return;const T=window.ShortCreatorThree;
    if(T?.REVISION!=='185')throw new Error('Pinned Three.js r185 unavailable for shatter');
    renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
    renderer.setPixelRatio(1);renderer.toneMapping=T.NoToneMapping;
    renderer.debug.onShaderError=()=>{throw new Error('Shatter shader compilation failed');};
  }
  function build(width,height,images,colors){
    const T=window.ShortCreatorThree,g=geometry(width,height),p=palette(colors),owned=[];
    const keep=o=>{owned.push(o);return o;};
    try{
      const source=window.ShortCreatorShatterShader,motion=window.ShortCreatorShatterMotion;
      if(!source||!motion)throw new Error('Pinned shatter kernels unavailable');
      const model=motion.data(g.aspect),scene=new T.Scene(),camera=new T.OrthographicCamera(-g.aspect/2,g.aspect/2,.5,-.5,.1,100),fits=[];
      camera.position.z=10;
      const textures=images.map(image=>{
        if(!image.complete||image.naturalWidth<32||image.naturalHeight<32)throw new Error('Shatter still is not decoded');
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
        const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Shatter texture canvas unavailable');
        const fit=window.ShortCreatorShaders.contain(width,height,image.naturalWidth,image.naturalHeight);fits.push(fit);
        ctx.fillStyle=colors.background;ctx.fillRect(0,0,width,height);ctx.drawImage(image,fit.x,fit.y,fit.width,fit.height);
        const texture=keep(new T.CanvasTexture(canvas));texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;
        texture.generateMipmaps=false;return texture;
      });
      const uniforms={tPanel:{value:textures[0]},uCrackProgress:{value:0},uAspect:{value:g.aspect},uTime:{value:0},
        uCrackColor:{value:new T.Vector3(...p.crack)},uImpactColor:{value:new T.Vector3(...p.impact)}};
      const fullMaterial=keep(new T.ShaderMaterial({uniforms,vertexShader:source.vertex,fragmentShader:source.fragment}));
      const full=new T.Mesh(keep(new T.PlaneGeometry(g.aspect,1)),fullMaterial);scene.add(full);
      const imageMaterial=texture=>keep(new T.ShaderMaterial({vertexShader:source.vertex,
        fragmentShader:'uniform sampler2D image; uniform float opacity; varying vec2 vUv; void main(){vec4 c=texture2D(image,vUv);gl_FragColor=vec4(c.rgb,c.a*opacity);}',
        uniforms:{image:{value:texture},opacity:{value:1}},side:T.DoubleSide}));
      const backMaterial=imageMaterial(textures[1]);backMaterial.side=T.FrontSide;backMaterial.transparent=true;
      const back=new T.Mesh(keep(new T.PlaneGeometry(g.aspect,1)),backMaterial);back.position.z=-.5;scene.add(back);
      const shards=model.shards.map(shard=>{
        const v=motion.vertices(shard,g.aspect),geometry=keep(new T.BufferGeometry());
        geometry.setAttribute('position',new T.Float32BufferAttribute(v.positions,3));
        geometry.setAttribute('uv',new T.Float32BufferAttribute(v.uvs,2));
        const mesh=new T.Mesh(geometry,imageMaterial(textures[0]));scene.add(mesh);return mesh;
      });
      return {g,images,colors,scene,camera,full,back,shards,model,fits,uniforms,owned,
        dispose:()=>owned.forEach(o=>o.dispose()),apply:s=>{
          full.visible=s.phase<2;back.visible=s.phase===2;uniforms.uCrackProgress.value=s.crack;uniforms.uTime.value=s.time;
          back.material.uniforms.opacity.value=s.background;
          const physics=s.phase===2?motion.physics(model,s.time):null;
          shards.forEach((mesh,i)=>{
            mesh.visible=s.phase===2&&s.opacity>0;
            if(physics){const sp=physics[i];
              // Retain the source's actual panel-origin rotation; its earlier pivot write is overwritten.
              mesh.position.set(sp.posX,sp.posY,sp.posZ+.01);mesh.rotation.set(sp.rotX,sp.rotY,sp.rotZ);
              mesh.material.uniforms.opacity.value=sp.opacity;mesh.material.transparent=sp.opacity<1;
            }else{mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.material.uniforms.opacity.value=1;mesh.material.transparent=false;}
          });
        }};
    }catch(error){owned.forEach(o=>o.dispose());throw error;}
  }
  function draw(canvas,images,colors,seconds){
    if(images.length!==2)throw new Error('Shatter requires two verified stills');
    const s=window.ShortCreatorShatterMotion.state(seconds),{width,height}=canvas;
    geometry(width,height);palette(colors);prepare();const gl=renderer.getContext();
    if(gl.isContextLost())throw new Error('Shatter WebGL context lost');
    const same=active&&active.g.width===width&&active.g.height===height&&images.every((im,i)=>im===active.images[i])&&
      ['background','secondary'].every(k=>colors[k]===active.colors[k]);
    if(!same){active?.dispose();active=null;renderer.setSize(width,height,false);renderer.setClearColor(colors.background,1);
      active=build(width,height,images,{...colors});}
    active.apply(s);renderer.render(active.scene,active.camera);
    if(gl.getError()!==gl.NO_ERROR)throw new Error('Shatter WebGL draw failed');
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Shatter output canvas unavailable');
    ctx.drawImage(renderer.domElement,0,0);
    const program=gl.getParameter(gl.CURRENT_PROGRAM),uniforms={};
    for(const name of s.phase<2?['uCrackProgress','uAspect','uCrackColor','uImpactColor']:['opacity']){
      const location=gl.getUniformLocation(program,name);if(location===null)throw new Error('Missing shatter uniform: '+name);
      const value=gl.getUniform(program,location);uniforms[name]=ArrayBuffer.isView(value)?Array.from(value):value;
    }
    const samples=[0,31,79,120,199].map(i=>{
      const m=active.shards[i],v=m.geometry.attributes;
      return {index:i,position:m.position.toArray(),rotation:m.rotation.toArray().slice(0,3),visible:m.visible,
        opacity:m.material.uniforms.opacity.value,vertices:v.position.count,
        firstVertex:Array.from(v.position.array.slice(0,3)),firstUV:Array.from(v.uv.array.slice(0,2)),initial:active.model.initial[i]};
    });
    lastStats={revision:window.ShortCreatorThree.REVISION,contexts:1,geometries:renderer.info.memory.geometries,
      textures:renderer.info.memory.textures,allocatedGeometries:active.owned.filter(o=>o.isBufferGeometry).length,
      triangles:renderer.info.render.triangles,shards:active.shards.length,geometry:active.g,fits:active.fits,
      projection:active.camera.projectionMatrix.toArray(),cameraZ:active.camera.position.z,fullVisible:active.full.visible,
      backVisible:active.back.visible,backOpacity:active.back.material.uniforms.opacity.value,samples,uniforms};
  }
  function mount(host,c,onsets,data,make){
    const motion=window.ShortCreatorShatterMotion;motion.clock(0,onsets);
    const heading=make('h2','prod-heading shatter-panels-heading',c.heading,host,true),source=make('p','interface-source',c.source,host,true);
    const board=make('div','shatter-panels-board',null,host),canvas=make('canvas','shatter-panels-canvas',null,board);
    canvas.width=board.clientWidth;canvas.height=board.clientHeight;canvas.setAttribute('aria-hidden','true');
    const images=c.images.map(name=>{const im=make('img','shatter-panels-ready',null,board);im.src=data.assets[name];im.alt='';
      return window.ShortCreatorShaders.verifiedImage(im);});
    const css=getComputedStyle(board),colors={background:css.getPropertyValue('--purple').trim(),secondary:css.getPropertyValue('--cyan').trim()};
    return time=>{
      const timer=motion.clock(time,onsets),s=motion.state(timer.time),frame=Math.floor(time*30+1e-7),entry=out(clamp((frame-Math.ceil(onsets[0]*30))/24));
      heading.style.opacity=String(entry);heading.style.transform='translateY('+(24*(1-entry))+'px)';
      source.style.opacity=String(out(clamp((frame-Math.ceil(onsets[1]*30))/24)));
      board.style.visibility=timer.visible?'visible':'hidden';draw(canvas,images,colors,timer.time);
      board.dataset.shatterPanels=JSON.stringify({clock:timer,state:s});
    };
  }
  function dispose(){active?.dispose();active=null;renderer?.dispose();renderer?.forceContextLoss();renderer=null;lastStats=null;}
  window.addEventListener?.('pagehide',dispose);
  window.ShortCreatorShatterPanels={geometry,palette,draw,mount,dispose,stats:()=>lastStats||{contexts:0}};
})();
