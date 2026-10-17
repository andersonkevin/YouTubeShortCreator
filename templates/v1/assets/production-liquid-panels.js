/* HyperFrames vfx-liquid-background, Apache-2.0. Two verified stills on the
   original subdivided liquid plane, driven by three caption anchors. */
(()=>{
  'use strict';
  const duration=12,clamp=x=>Math.max(0,Math.min(1,x)),out=p=>1-(1-p)**3;
  const inOut=(p,n=3)=>p<.5?2**(n-1)*p**n:1-(-2*p+2)**n/2,sine=p=>(1-Math.cos(Math.PI*p))/2;
  function state(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Finite liquid panel time required');
    const t=Math.max(0,Math.min(duration,seconds)),phase=(a,d)=>clamp((t-a)/d);
    let wave=out(phase(0,2)),ripple=.6*out(phase(.5,2.5));
    if(t>=4.5){const p=phase(4.5,1)**3;wave=1+1.5*p;ripple=.6+1.4*p;}
    if(t>=6.5){const p=out(phase(6.5,2));wave=2.5-1.5*p;ripple=2-1.5*p;}
    if(t>=9){const p=sine(phase(9,2));wave=1-.3*p;ripple=.5-.2*p;}
    const tilt=inOut(phase(2,2.5),2),returnTilt=inOut(phase(6.5,2.5),2);
    let rotation=[.06*tilt-.09*returnTilt,-.04*tilt+.07*returnTilt,0];
    if(t>=10.5){
      const hold=1-inOut(phase(10.5,1.5));
      // The final tween interrupts the two-second settling tween at 10.5 s.
      wave=(1-.3*sine(.75))*hold;ripple=(.5-.2*sine(.75))*hold;
      rotation=[-.03*hold,.03*hold,0];
    }
    return {time:t,wave,ripple,mix:inOut(phase(5,2)),rotation};
  }
  function clock(time,onsets) {
    if(!Number.isFinite(time)||onsets.length!==3||!onsets.every(Number.isFinite)||
       onsets[1]-onsets[0]<5-1e-8||onsets[2]-onsets[1]<7-1e-8)throw new Error('Liquid panels need start, mix and settle anchors');
    const frame=Math.floor(time*30+1e-7),frames=onsets.map(t=>Math.ceil(t*30));
    if(frames[1]-frames[0]<150||frames[2]-frames[1]<210)throw new Error('Liquid panel capture anchors are too close');
    const second=window.ShortCreatorCarousels.clock(time,onsets.slice(1),7);
    return {time:frame<frames[1]?5*clamp((frame-frames[0])/(frames[1]-frames[0])):5+second.time,
      visible:frame>=frames[0],settle:second.settle,frame:Math.max(frames[0],Math.min(frames[2]+24,frame))};
  }
  function geometry(width,height) {
    if(![width,height].every(n=>Number.isInteger(n)&&n>=32&&n<=4096))throw new Error('Invalid liquid panel size');
    const aspect=width/height,planeWidth=4.8,planeHeight=planeWidth/aspect;
    const halfW=planeWidth/2,halfH=planeHeight/2,maxDisplacement=.04*2.5+.025*2.5+.015*2;
    const far=2.8+maxDisplacement,near=Math.cos(.06)*Math.cos(.04)*(2.8-maxDisplacement)-.06*halfH-.04*halfW;
    if(near<=0)throw new Error('Liquid panel aspect exceeds the bounded camera');
    const extentX=halfW+.04*(far+.06*halfH),extentY=halfH+.06*far;
    const zoom=.92*Math.min(1,near*Math.tan(Math.PI/8)*aspect/extentX,near*Math.tan(Math.PI/8)/extentY);
    return {width,height,planeWidth,planeHeight,zoom,fov:45,cameraZ:2.8,maxDisplacement,segments:[100,60]};
  }
  function palette(colors) {
    const rgb=value=>{if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw new Error('Approved liquid panel palette required');
      return [1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255);};
    return {background:rgb(colors.background),highlight:rgb(colors.secondary).map(v=>v*.2)};
  }
  let renderer=null,active=null,lastStats=null;
  function prepare() {
    if(renderer)return;
    const T=window.ShortCreatorThree;
    if(!T||T.REVISION!=='185')throw new Error('Pinned Three.js r185 unavailable for liquid panels');
    renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
    renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
    renderer.debug.onShaderError=()=>{throw new Error('Liquid panel shader compilation failed');};
  }
  function build(width,height,images,colors) {
    const T=window.ShortCreatorThree,g=geometry(width,height),p=palette(colors),owned=[];
    const keep=value=>{owned.push(value);return value;};
    try {
      const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,width/height,.1,100);
      camera.position.set(0,0,2.8);camera.zoom=g.zoom;camera.updateProjectionMatrix();
      const textures=images.map(image=>{
        if(!image.complete||!image.naturalWidth)throw new Error('Liquid panel still is not decoded');
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
        const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Liquid panel texture canvas unavailable');
        const r=window.ShortCreatorShaders.contain(width,height,image.naturalWidth,image.naturalHeight);
        ctx.fillStyle=colors.background;ctx.fillRect(0,0,width,height);ctx.drawImage(image,r.x,r.y,r.width,r.height);
        const texture=keep(new T.CanvasTexture(canvas));texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;
        texture.generateMipmaps=false;return texture;
      });
      const uniforms={uTime:{value:0},uMix:{value:0},uWaveIntensity:{value:0},uRippleIntensity:{value:0},
        uTextureA:{value:textures[0]},uTextureB:{value:textures[1]},uHighlightColor:{value:new T.Vector3(...p.highlight)}};
      const shaders=window.ShortCreatorLiquidPanelsShader;
      if(!shaders)throw new Error('Pinned liquid panel shader unavailable');
      const material=keep(new T.ShaderMaterial({uniforms,vertexShader:shaders.vertex,fragmentShader:shaders.fragment,side:T.FrontSide}));
      const plane=keep(new T.PlaneGeometry(g.planeWidth,g.planeHeight,100,60)),mesh=new T.Mesh(plane,material);scene.add(mesh);
      return {scene,camera,g,uniforms,images,colors,dispose:()=>owned.forEach(value=>value.dispose()),
        apply:s=>{uniforms.uTime.value=s.time;uniforms.uMix.value=s.mix;uniforms.uWaveIntensity.value=s.wave;
          uniforms.uRippleIntensity.value=s.ripple;camera.rotation.set(...s.rotation);}};
    } catch(error){owned.forEach(value=>value.dispose());throw error;}
  }
  function draw(canvas,images,colors,s) {
    if(images.length!==2||![s.time,s.wave,s.ripple,s.mix,...s.rotation].every(Number.isFinite)||
      s.time<0||s.time>12)throw new Error('Invalid liquid panel frame');
    const {width,height}=canvas;geometry(width,height);palette(colors);prepare();
    const gl=renderer.getContext();if(gl.isContextLost())throw new Error('Liquid panel WebGL context lost');
    const same=active&&active.g.width===width&&active.g.height===height&&images.every((image,i)=>image===active.images[i])&&
      colors.background===active.colors.background&&colors.secondary===active.colors.secondary;
    if(!same){
      active?.dispose();active=null;renderer.setSize(width,height,false);
      renderer.setClearColor(new window.ShortCreatorThree.Color(colors.background),1);
      active=build(width,height,images,{...colors});
    }
    active.apply(s);renderer.render(active.scene,active.camera);
    if(gl.getError()!==gl.NO_ERROR)throw new Error('Liquid panel WebGL draw failed');
    const context=canvas.getContext('2d',{alpha:false});if(!context)throw new Error('Liquid panel output canvas unavailable');
    context.drawImage(renderer.domElement,0,0);
    const program=gl.getParameter(gl.CURRENT_PROGRAM),uniforms={};
    for(const name of ['uTime','uMix','uWaveIntensity','uRippleIntensity','uHighlightColor']){
      const location=gl.getUniformLocation(program,name);if(location===null)throw new Error('Missing liquid panel uniform: '+name);
      const value=gl.getUniform(program,location);uniforms[name]=typeof value==='number'?value:Array.from(value);
    }
    lastStats={revision:window.ShortCreatorThree.REVISION,contexts:1,geometries:renderer.info.memory.geometries,
      textures:renderer.info.memory.textures,triangles:renderer.info.render.triangles,
      geometry:active.g,cameraRotation:active.camera.rotation.toArray().slice(0,3),
      projection:active.camera.projectionMatrix.toArray(),uniforms};
  }
  function mount(host,c,onsets,data,make) {
    clock(0,onsets);
    const heading=make('h2','prod-heading liquid-panels-heading',c.heading,host,true);
    make('p','interface-source',c.source,host,true);
    const board=make('div','liquid-panels-board',null,host),canvas=make('canvas','liquid-panels-canvas',null,board);
    canvas.setAttribute('aria-hidden','true');canvas.width=board.clientWidth;canvas.height=board.clientHeight;
    const images=c.images.map(name=>{
      const img=make('img','liquid-panels-ready',null,board);img.src=data.assets[name];img.alt='';
      return window.ShortCreatorShaders.verifiedImage(img);
    });
    const css=getComputedStyle(board),colors={background:css.getPropertyValue('--purple').trim(),secondary:css.getPropertyValue('--cyan').trim()};
    return time=>{
      const timer=clock(time,onsets),s=state(timer.time),entry=out(clamp((Math.floor(time*30+1e-7)-Math.ceil(onsets[0]*30))/24));
      heading.style.opacity=String(entry);heading.style.transform='translateY('+(24*(1-entry))+'px)';
      board.style.visibility=timer.visible?'visible':'hidden';
      draw(canvas,images,colors,s);board.dataset.liquidPanels=JSON.stringify({clock:timer,state:s});
    };
  }
  function dispose(){active?.dispose();active=null;renderer?.dispose();renderer?.forceContextLoss();renderer=null;lastStats=null;}
  window.ShortCreatorLiquidPanels={duration,state,clock,geometry,palette,draw,mount,dispose,stats:()=>lastStats||{contexts:0}};
})();
