/* HyperFrames vfx-portal, Apache-2.0. Original finite portal choreography over
   two verified stills; existing Three.js r185, no DOM capture or remote loading. */
(()=>{
  'use strict';
  const duration=10,clamp=x=>Math.max(0,Math.min(1,x));
  const out=p=>1-(1-p)**3,smooth=p=>p<.5?4*p**3:1-(-2*p+2)**3/2;
  function state(seconds){
    if(!Number.isFinite(seconds))throw new Error('Finite portal time required');
    const time=Math.max(0,Math.min(duration,seconds)),p=(a,d)=>clamp((time-a)/d);
    let energy=.3*p(.3,1.2)**3;
    if(time>=1.5)energy=.3+.7*(1-(1-p(1.5,.6))**4);
    if(time>=5)energy=1+.5*p(5,.8)**3;
    if(time>=6.2)energy=1.5*(1-out(p(6.2,1.2)));
    let chromatic=.035*p(1.5,2)**3;
    if(time>=5.5)chromatic=.035+.025*p(5.5,1)**4;
    if(time>=6.8)chromatic=.06*(1-out(p(6.8,1)));
    let distortion=.06*smooth(p(1.5,2.5));
    if(time>=6.5)distortion=.06*(1-out(p(6.5,1)));
    return {time,radius:time<5?.85*smooth(p(1.5,3.5)):.85+.95*p(5,2)**4,
      cameraZ:time<7?2.8-1.4*smooth(p(3.5,3)):1.4+1.4*out(p(7,2.5)),
      energy,chromatic,distortion,edge:.06+.02*(1-Math.cos(Math.PI*p(2,2)))/2};
  }
  function clock(time,onsets){
    if(onsets.length!==2||!onsets.every(Number.isFinite)||onsets[1]-onsets[0]<10-1e-8||
      Math.ceil(onsets[1]*30)-Math.ceil(onsets[0]*30)<300)throw new Error('Portal requires ten seconds between two anchors');
    return window.ShortCreatorCarousels.clock(time,onsets,duration);
  }
  function geometry(width,height,cameraZ=2.8){
    if(![width,height].every(n=>Number.isInteger(n)&&n>=32&&n<=4096)||
      !Number.isFinite(cameraZ)||cameraZ<1.4||cameraZ>2.8)throw new Error('Invalid native portal geometry');
    const aspect=width/height;
    if(Math.hypot(aspect/2,.5)>=1.79)throw new Error('Portal canvas is too wide for its source radius');
    const h=2*Math.tan(25*Math.PI/180)*2.8;
    return {width,height,aspect,fov:50,plane:[h*aspect,h],frontScale:cameraZ/2.8,backScale:(cameraZ+.01)/2.8};
  }
  function palette(colors){
    const rgb=s=>{if(typeof s!=='string'||!/^#[0-9a-f]{6}$/i.test(s))throw new Error('Approved portal palette required');
      return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255);};
    return {background:rgb(colors.background),primary:rgb(colors.secondary),secondary:rgb(colors.accent),spark:[1,1,1]};
  }
  let renderer=null,active=null,lastStats=null;
  function prepare(){
    if(renderer)return;const T=window.ShortCreatorThree;
    if(T?.REVISION!=='185')throw new Error('Pinned Three.js r185 unavailable for portal');
    renderer=new T.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:true});
    renderer.setPixelRatio(1);renderer.toneMapping=T.NoToneMapping;
    renderer.debug.onShaderError=()=>{throw new Error('Portal shader compilation failed');};
  }
  function build(width,height,images,colors){
    const T=window.ShortCreatorThree,g=geometry(width,height),p=palette(colors),owned=[];
    const keep=o=>{owned.push(o);return o;};
    try{
      const source=window.ShortCreatorPortalPanelsShader;if(!source)throw new Error('Portal shader unavailable');
      const scene=new T.Scene(),camera=new T.PerspectiveCamera(50,g.aspect,.1,100),fits=[];
      camera.position.set(0,0,2.8);
      const textures=images.map(image=>{
        if(!image.complete||image.naturalWidth<32||image.naturalHeight<32)throw new Error('Portal still is not decoded');
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
        const context=canvas.getContext('2d',{alpha:false});if(!context)throw new Error('Portal texture canvas unavailable');
        const fit=window.ShortCreatorShaders.contain(width,height,image.naturalWidth,image.naturalHeight);fits.push(fit);
        context.fillStyle=colors.background;context.fillRect(0,0,width,height);context.drawImage(image,fit.x,fit.y,fit.width,fit.height);
        const texture=keep(new T.CanvasTexture(canvas));texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;
        texture.generateMipmaps=false;return texture;
      });
      const backMaterial=keep(new T.ShaderMaterial({vertexShader:source.vertex,
        fragmentShader:'uniform sampler2D image; varying vec2 vUv; void main(){gl_FragColor=texture2D(image,vUv);}',
        uniforms:{image:{value:textures[1]}},side:T.FrontSide}));
      const back=new T.Mesh(keep(new T.PlaneGeometry(...g.plane)),backMaterial);back.position.z=-.01;scene.add(back);
      const uniforms={tLight:{value:textures[0]},portalRadius:{value:0},portalCenter:{value:new T.Vector2(.5,.5)},
        edgeWidth:{value:.06},glowColor:{value:new T.Vector3(...p.primary)},glowColor2:{value:new T.Vector3(...p.secondary)},
        sparkColor:{value:new T.Vector3(...p.spark)},nativeAspect:{value:g.aspect},chromaticStrength:{value:0},
        distortionStrength:{value:0},time:{value:0},energyIntensity:{value:0}};
      const material=keep(new T.ShaderMaterial({vertexShader:source.vertex,fragmentShader:source.fragment,uniforms,
        transparent:true,side:T.FrontSide,depthWrite:false}));
      const front=new T.Mesh(keep(new T.PlaneGeometry(...g.plane)),material);front.renderOrder=1;scene.add(front);
      return {scene,camera,g,images,colors,front,back,fits,uniforms,dispose:()=>owned.forEach(o=>o.dispose()),apply:s=>{
        camera.position.z=s.cameraZ;const frame=geometry(width,height,s.cameraZ);
        front.scale.set(frame.frontScale,frame.frontScale,1);back.scale.set(frame.backScale,frame.backScale,1);
        for(const [name,key]of [['portalRadius','radius'],['energyIntensity','energy'],['chromaticStrength','chromatic'],
          ['distortionStrength','distortion'],['edgeWidth','edge'],['time','time']])uniforms[name].value=s[key];
      }};
    }catch(error){owned.forEach(o=>o.dispose());throw error;}
  }
  function draw(canvas,images,colors,seconds){
    if(images.length!==2)throw new Error('Portal needs two verified stills');
    const s=state(seconds),{width,height}=canvas;geometry(width,height,s.cameraZ);palette(colors);prepare();
    const gl=renderer.getContext();if(gl.isContextLost())throw new Error('Portal WebGL context lost');
    const same=active&&active.g.width===width&&active.g.height===height&&images.every((im,i)=>im===active.images[i])&&
      ['background','secondary','accent'].every(k=>colors[k]===active.colors[k]);
    if(!same){active?.dispose();active=null;renderer.setSize(width,height,false);
      renderer.setClearColor(colors.background,1);active=build(width,height,images,{...colors});}
    active.apply(s);renderer.render(active.scene,active.camera);
    if(gl.getError()!==gl.NO_ERROR)throw new Error('Portal WebGL draw failed');
    const context=canvas.getContext('2d',{alpha:false});if(!context)throw new Error('Portal output canvas unavailable');
    context.drawImage(renderer.domElement,0,0);
    const program=gl.getParameter(gl.CURRENT_PROGRAM),uniforms={};
    for(const name of ['portalRadius','portalCenter','edgeWidth','glowColor','glowColor2','sparkColor','nativeAspect',
      'chromaticStrength','distortionStrength','time','energyIntensity']){
      const location=gl.getUniformLocation(program,name);if(location===null)throw new Error('Missing portal uniform: '+name);
      const value=gl.getUniform(program,location);uniforms[name]=ArrayBuffer.isView(value)?Array.from(value):value;
    }
    lastStats={revision:window.ShortCreatorThree.REVISION,contexts:1,geometries:renderer.info.memory.geometries,
      textures:renderer.info.memory.textures,triangles:renderer.info.render.triangles,geometry:active.g,
      cameraZ:active.camera.position.z,frontScale:active.front.scale.x,backScale:active.back.scale.x,
      projection:active.camera.projectionMatrix.toArray(),fits:active.fits,uniforms};
  }
  function mount(host,c,onsets,data,make){
    clock(0,onsets);const heading=make('h2','prod-heading portal-panels-heading',c.heading,host,true);
    const source=make('p','interface-source',c.source,host,true);
    const board=make('div','portal-panels-board',null,host),canvas=make('canvas','portal-panels-canvas',null,board);
    canvas.width=board.clientWidth;canvas.height=board.clientHeight;canvas.setAttribute('aria-hidden','true');
    const images=c.images.map(name=>{const img=make('img','portal-panels-ready',null,board);img.src=data.assets[name];img.alt='';
      return window.ShortCreatorShaders.verifiedImage(img);});
    const css=getComputedStyle(board),colors={background:css.getPropertyValue('--purple').trim(),
      secondary:css.getPropertyValue('--cyan').trim(),accent:css.getPropertyValue('--lime').trim()};
    return time=>{const timer=clock(time,onsets),s=state(timer.time),entry=out(clamp((Math.floor(time*30+1e-7)-Math.ceil(onsets[0]*30))/24));
      heading.style.opacity=String(entry);heading.style.transform='translateY('+(24*(1-entry))+'px)';
      // The source reveal gives the second narration cue a visible, useful result.
      source.style.opacity=String(out(clamp((Math.floor(time*30+1e-7)-Math.ceil(onsets[1]*30))/24)));
      board.style.visibility=timer.visible?'visible':'hidden';draw(canvas,images,colors,timer.time);
      board.dataset.portalPanels=JSON.stringify({clock:timer,state:s});};
  }
  function dispose(){active?.dispose();active=null;renderer?.dispose();renderer?.forceContextLoss();renderer=null;lastStats=null;}
  window.addEventListener?.('pagehide',dispose);
  window.ShortCreatorPortalPanels={duration,state,clock,geometry,palette,draw,mount,dispose,stats:()=>lastStats||{contexts:0}};
})();
