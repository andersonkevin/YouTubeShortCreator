/* HyperFrames exploded-stack and product-turntable, Apache-2.0.
   Local Three.js r185; RoomEnvironment geometry is adapted under its MIT notice.
   Explicit native labels/icons/stills replace all example identities and URLs. */
(() => {
  'use strict';
  const kinds=Object.freeze(['exploded-stack','product-turntable','orbit-card','extruded-logo','wireframe-portal-title','canopy-part-title','cuboid-carousel','device-review','phone-glass','desktop-glass']);
  const clamp=x=>Math.max(0,Math.min(1,x)),out=x=>1-(1-clamp(x))**3;
  const smooth=x=>{const p=clamp(x);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  const profile=Object.freeze([[0,.1],[.46,.06],[.6,0],[.66,.06],[.67,.16],[.67,2.02],
    [.63,2.14],[.56,2.24],[.555,2.29],[.575,2.31],[.56,2.33],[.5,2.3],[0,2.27]].map(Object.freeze));
  function stackState(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Invalid stack source time');
    const t=Math.max(0,Math.min(5,seconds));
    return Array.from({length:4},(_,i)=>{
      const open=out(clamp((t-.3-i*.06)/.9)**1.4)-smooth((t-4.1-(3-i)*.05)/.6),land=1.25+i*.7;
      const arrival=out((t-land+.3)/.3),shown=arrival*(1-clamp((t-4.05)/.2));
      const focus=arrival*(1-smooth((t-land-.4)/.3));
      return {y:(3-i)*(.24+open*1.55)-2.2+.08*focus,open,focus,shown};
    });
  }
  function stackClock(time,onsets) {
    if(!Number.isFinite(time)||![4,5].includes(onsets.length)||!onsets.every(Number.isFinite))throw new Error('Four or five finite stack cues required');
    const frame=Math.floor(time*30+1e-7),starts=onsets.map(t=>Math.ceil(t*30));
    if(starts.some((t,i)=>i&&t-starts[i-1]<24))throw new Error('Stack cues must preserve the native entry interval');
    const index=starts.reduce((last,t,i)=>frame>=t?i:last,-1);
    if(index<0)return {index,progress:0,seconds:0,entry:0};
    const p=clamp((frame-starts[index])/24),before=index?1.25+(index-1)*.7:0,after=index===4?5:1.25+index*.7;
    return {index,progress:p,seconds:before+(after-before)*p,entry:clamp((frame-starts[0])/24)};
  }
  function turnPose(progress) {
    if(!Number.isFinite(progress))throw new Error('Finite product progress required');
    const p=clamp(progress);
    return {progress:p,rotation:p===1?-Math.PI/2:-Math.PI/2+2*Math.PI*p};
  }
  function contain(width,height,x,y,w,h) {
    if(![width,height,w,h].every(v=>Number.isFinite(v)&&v>0))throw new Error('Invalid label image dimensions');
    const scale=Math.min(w/width,h/height);
    return {x:x+(w-width*scale)/2,y:y+(h-height*scale)/2,width:width*scale,height:height*scale};
  }
  function plateGeometry(T) {
    // Core extrusion preserves flat face4.04, outer width4.2 and thickness.22.
    const s=new T.Shape(),half=2.02,r=.02;
    s.moveTo(-half+r,-half);s.lineTo(half-r,-half);s.quadraticCurveTo(half,-half,half,-half+r);
    s.lineTo(half,half-r);s.quadraticCurveTo(half,half,half-r,half);s.lineTo(-half+r,half);
    s.quadraticCurveTo(-half,half,-half,half-r);s.lineTo(-half,-half+r);s.quadraticCurveTo(-half,-half,-half+r,-half);
    const geometry=new T.ExtrudeGeometry(s,{depth:.06,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:4,steps:1,curveSegments:4});
    geometry.rotateX(-Math.PI/2);geometry.center();return geometry;
  }
  let renderer=null,active=null;
  function release() {if(active){active.owned.forEach(o=>o.dispose());active=null;}}
  function prepare() {
    if(renderer)return;
    const T=window.ShortCreatorThree;if(T?.REVISION!=='185')throw new Error('Pinned spatial runtime unavailable');
    renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
    renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0,0);
    renderer.debug.onShaderError=()=>{throw new Error('Spatial object shader compilation failed');};
  }
  function room(T,keep,strength=.3) {
    const result=new T.Scene(),geometry=keep(new T.BoxGeometry());geometry.deleteAttribute('uv');
    const material=keep(new T.MeshStandardMaterial()),shellMaterial=keep(new T.MeshStandardMaterial({side:T.BackSide}));
    const light=new T.PointLight(0xffffff,900*strength,28,2);light.position.set(.418,16.199,.3);result.add(light);
    const shell=new T.Mesh(geometry,shellMaterial);shell.position.set(-.757,13.219,.717);shell.scale.set(31.713,28.305,28.591);result.add(shell);
    const boxes=keep(new T.InstancedMesh(geometry,material,6)),pose=new T.Object3D();
    [[-10.906,2.009,1.846,-.195,2.328,7.905,4.651],[-5.607,-.754,-.758,.994,1.97,1.534,3.955],
      [6.167,.857,7.803,.561,3.927,6.285,3.687],[-2.017,.018,6.124,.333,2.002,4.566,2.064],
      [2.291,-.756,-2.621,-.286,1.546,1.552,1.496],[-2.193,-.369,-5.547,.516,3.875,3.487,2.986]].forEach((v,i)=>{
      pose.position.set(...v.slice(0,3));pose.rotation.set(0,v[3],0);pose.scale.set(...v.slice(4));pose.updateMatrix();boxes.setMatrixAt(i,pose.matrix);
    });result.add(boxes);
    [[-16.116,14.37,8.208,.1,2.428,2.739,50],[-16.109,18.021,-8.207,.1,2.425,2.751,50],
      [14.904,12.198,-1.832,.15,4.265,6.331,17],[-.462,8.89,14.52,4.38,5.441,.088,43],
      [3.235,11.486,-12.541,2.5,2,.1,20],[0,20,0,1,.1,1,100]].forEach(v=>{
      const panel=new T.Mesh(geometry,keep(new T.MeshLambertMaterial({color:0,emissive:0xffffff,emissiveIntensity:v[6]*strength})));
      panel.position.set(...v.slice(0,3));panel.scale.set(...v.slice(3,6));result.add(panel);
    });
    return result;
  }
  function build(key,style,width,height,images,colors,content) {
    prepare();release();
    const T=window.ShortCreatorThree,owned=new Set(),keep=o=>{owned.add(o);return o;};
    const scene=new T.Scene();let camera,update,inspect=null,draw=null,paint=null;
    const texture=canvas=>{const tex=keep(new T.CanvasTexture(canvas));tex.colorSpace=T.SRGBColorSpace;
      tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return tex;};
    const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;
      const g=c.getContext('2d');if(!g)throw new Error('Spatial texture canvas unavailable');return {c,g};};
    try {
      if(style==='exploded-stack') {
        renderer.toneMapping=T.NoToneMapping;
        const fit=Math.min(width/1920,height/1080),view=5.9*height/(1080*fit);
        camera=new T.OrthographicCamera(-view*width/height,view*width/height,view,-view,.1,100);
        camera.position.set(10,10.7,10);camera.lookAt(0,.7,0);camera.position.add(new T.Vector3(1.9,0,-1.9));camera.updateMatrixWorld();
        scene.add(new T.HemisphereLight(0xffffff,colors.secondary,2.2));
        const sun=new T.DirectionalLight(0xffffff,1.4);sun.position.set(-4,10,6);scene.add(sun);
        const shadow=canvas(256,256),shade=shadow.g.createRadialGradient(128,128,40,128,128,128);
        shade.addColorStop(0,'rgba(0,0,0,.22)');shade.addColorStop(1,'rgba(0,0,0,0)');shadow.g.fillStyle=shade;shadow.g.fillRect(0,0,256,256);
        const floor=new T.Mesh(keep(new T.PlaneGeometry(7,7)),keep(new T.MeshBasicMaterial({map:texture(shadow.c),transparent:true,depthWrite:false})));
        floor.rotation.x=-Math.PI/2;floor.position.y=-2.4;scene.add(floor);
        const edge=keep(new T.MeshStandardMaterial({color:colors.surface,roughness:.6}));
        const geometry=keep(plateGeometry(T));
        const face=canvas(512,512);face.g.fillStyle=colors.surface;face.g.fillRect(0,0,512,512);
        face.g.strokeStyle=colors.secondary;face.g.lineWidth=3;face.g.strokeRect(1.5,1.5,509,509);
        const top=keep(new T.MeshStandardMaterial({map:texture(face.c),roughness:.7})),plane=keep(new T.PlaneGeometry(4.04,4.04));
        const plates=[],glyphs=[];
        images.forEach(image=>{
          const plate=new T.Mesh(geometry,edge),surface=new T.Mesh(plane,top),glyph=canvas(512,512);
          const box=contain(image.naturalWidth,image.naturalHeight,96,96,320,320);
          glyph.g.drawImage(image,box.x,box.y,box.width,box.height);
          const pixels=glyph.g.getImageData(0,0,512,512);
          for(let i=0;i<pixels.data.length;i+=4)pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;
          glyph.g.putImageData(pixels,0,0);
          const material=keep(new T.MeshStandardMaterial({map:texture(glyph.c),roughness:.7,transparent:true,depthWrite:false}));
          const motif=new T.Mesh(plane,material);surface.rotation.x=motif.rotation.x=-Math.PI/2;
          surface.position.y=.112;motif.position.y=.114;plate.add(surface,motif);scene.add(plate);plates.push(plate);glyphs.push(material);
        });
        const rest=new T.Color(colors.secondary),accent=new T.Color(colors.accent);
        update=state=>state.layers.map((layer,i)=>{
          plates[i].position.y=layer.y;glyphs[i].color.copy(rest).lerp(accent,layer.focus);
          const p=new T.Vector3(2.1,layer.y,-2.1).project(camera);
          return {x:(p.x*.5+.5)*width,y:(-.5*p.y+.5)*height};
        });
      } else if(style==='device-review') {
        const rig=window.ShortCreatorDeviceReview.build({T,renderer,scene,keep,colors,width,height,images,canvas,texture});
        camera=rig.camera;update=rig.update;inspect=rig.inspect;draw=rig.draw;
      } else if(style==='phone-glass'||style==='desktop-glass') {
        const rig=window.ShortCreatorDeviceGlass.build({T,renderer,scene,keep,colors,width,height,images,canvas,texture,content});
        camera=rig.camera;update=rig.update;inspect=rig.inspect;draw=rig.draw;
      } else if(style==='cuboid-carousel') {
        const rig=window.ShortCreatorCuboid.build({T,renderer,scene,keep,colors,width,height,content,canvas,texture,room});
        camera=rig.camera;update=rig.update;inspect=rig.inspect;draw=rig.draw;
      } else if(style==='canopy-part-title') {
        const rig=window.ShortCreatorCanopy.build({T,renderer,scene,keep,colors,width,height,content,images,canvas,texture});
        camera=rig.camera;update=rig.update;inspect=rig.inspect;draw=rig.draw;
      } else if(style==='wireframe-portal-title') {
        const rig=window.ShortCreatorWireframePortal.build({T,renderer,scene,keep,colors,width,height,content,font:window.ShortCreatorPortalOutlines});
        camera=rig.camera;update=rig.update;inspect=rig.inspect;draw=rig.draw;paint=rig.paint;
      } else if(style==='extruded-logo') {
        renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
        const rig=window.ShortCreatorExtrudedLogo.build({T,renderer,scene,keep,texture,canvas,colors,width,height,content,font:window.ShortCreatorFontOutlines});
        camera=rig.camera;update=rig.update;inspect=rig.inspect;
      } else if(style==='orbit-card') {
        renderer.toneMapping=T.NoToneMapping;
        const rig=window.ShortCreatorOrbitCard.build({T,scene,keep,texture,canvas,colors,image:images[0],width,height,contain});
        camera=rig.camera;update=rig.update;inspect=rig.inspect;
      } else {
        renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
        const studio=room(T,keep),pmrem=new T.PMREMGenerator(renderer);
        for(const [angle,intensity] of [[-35,5],[120,8]]) {
          const strip=new T.Mesh(keep(new T.PlaneGeometry(1.2,8)),keep(new T.MeshLambertMaterial({color:0,emissive:0xffffff,emissiveIntensity:intensity,side:T.DoubleSide})));
          const a=angle*Math.PI/180;strip.position.set(6*Math.sin(a),1,6*Math.cos(a));strip.lookAt(0,1,0);studio.add(strip);
        }
        try {scene.environment=keep(pmrem.fromScene(studio,.02)).texture;} finally {pmrem.dispose();}
        camera=new T.PerspectiveCamera(24,width/height,.1,100);camera.position.set(0,2.1,9.4);camera.lookAt(0,.9,0);
        const keyLight=new T.DirectionalLight(0xffffff,1.6);keyLight.position.set(-3.5,5,4);scene.add(keyLight);
        const rim=new T.DirectionalLight(colors.secondary,2.2);rim.position.set(4,3,-4);scene.add(rim);
        const plinth=new T.Mesh(keep(new T.CylinderGeometry(1.42,1.46,.2,96)),keep(new T.MeshStandardMaterial({color:colors.surface,roughness:.55,metalness:0})));
        plinth.position.y=-.1;scene.add(plinth);
        const shadow=canvas(256,256),gradient=shadow.g.createRadialGradient(128,128,0,128,128,128);
        gradient.addColorStop(0,'rgba(0,0,0,.55)');gradient.addColorStop(1,'rgba(0,0,0,0)');shadow.g.fillStyle=gradient;shadow.g.fillRect(0,0,256,256);
        const contact=new T.Mesh(keep(new T.PlaneGeometry(2.4,2.4)),keep(new T.MeshBasicMaterial({map:texture(shadow.c),transparent:true,depthWrite:false})));
        contact.rotation.x=-Math.PI/2;contact.position.y=.002;scene.add(contact);
        const group=new T.Group(),metal=keep(new T.MeshStandardMaterial({color:0xd4d7dc,metalness:1,roughness:.24}));scene.add(group);
        group.add(new T.Mesh(keep(new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),128)),metal));
        const wrap=canvas(2048,872);wrap.g.fillStyle=colors.surface;wrap.g.fillRect(0,0,2048,872);
        const image=images[0];
        for(const center of [512,1536]) {const box=contain(image.naturalWidth,image.naturalHeight,center-400,86,800,700);
          wrap.g.drawImage(image,box.x,box.y,box.width,box.height);}
        const label=new T.Mesh(keep(new T.CylinderGeometry(.674,.674,1.8,128,1,true)),keep(new T.MeshPhysicalMaterial({
          map:texture(wrap.c),metalness:.45,roughness:.32,clearcoat:1,clearcoatRoughness:.12})));
        label.position.y=1.1;group.add(label);
        const tab=new T.Mesh(keep(new T.CapsuleGeometry(.07,.22,4,12)),metal);
        tab.rotation.set(Math.PI/2,0,Math.PI/2);tab.scale.set(1,1,.25);tab.position.set(.1,2.285,0);group.add(tab);
        update=state=>{group.rotation.y=state.rotation;return [];};
      }
      renderer.setSize(width,height,false);
      active={key,scene,camera,update,inspect,draw,paint,owned};
    } catch(error){owned.forEach(o=>o.dispose());throw error;}
  }
  function mount(host,c,onsets,data,make,reveal) {
    if(!kinds.includes(c.style))throw new Error('Unknown spatial object');
    const portal=c.style==='wireframe-portal-title',canopy=c.style==='canopy-part-title',cuboid=c.style==='cuboid-carousel',device=c.style==='device-review';
    const glass=c.style==='phone-glass'||c.style==='desktop-glass';
    const heading=make('h2','prod-heading',c.heading,host,true),board=make('div','spatial-object-board'+(portal||canopy?' spatial-portal-board':''),null,host);
    const caption=make('p','spatial-object-caption',c.caption,host,true);make('p','spatial-object-source',c.source,host,true);
    if(portal||canopy){heading.hidden=true;caption.hidden=true;heading.setAttribute('aria-hidden','true');caption.setAttribute('aria-hidden','true');}
    const canvas=make('canvas','spatial-object-canvas',null,board);canvas.width=board.clientWidth;canvas.height=board.clientHeight;
    const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Spatial display canvas unavailable');
    canvas.setAttribute('aria-hidden','true');board.dataset.objectStyle=c.style;
    const hidden=make('div','spatial-source-bits',null,board),stack=c.style==='exploded-stack';
    const extruded=c.style==='extruded-logo';
    const images=(glass?[data.assets[c.image],...window.ShortCreatorDeviceGlass.iconIds(c).map(id=>data.icons[id])]:device?[data.assets[c.phone],data.assets[c.laptop]]:canopy?[data.assets[c.surface],data.assets[c.normal]]:extruded||portal||cuboid?[]:stack?c.layers.map(layer=>data.icons[layer.icon]):[data.assets[c.image]]).map((src,index)=>{
      const image=make('img','',null,hidden);
      if(canopy||device||(glass&&index===0)){const encoded=window.ShortCreatorShaderImages?.[src];if(!encoded)throw new Error('Verified spatial texture bundle missing');image.src=encoded;image.dataset.objectPath=src;}
      else image.src=src;
      image.alt='';image.dataset.objectInput='true';return image;
    });
    const ns='http://www.w3.org/2000/svg',svg=stack?document.createElementNS(ns,'svg'):null;
    if(svg){svg.classList.add('spatial-object-leaders');svg.setAttribute('viewBox',`0 0 ${canvas.width} ${canvas.height}`);board.appendChild(svg);}
    const labels=stack?c.layers.map((layer,i)=>{
      const label=make('div','spatial-object-label',null,board),index=make('span','spatial-object-index',String(i+1).padStart(2,'0'),label);
      const copy=make('span','',layer.label,label,true);label.dataset.layerLabel=String(i);
      const line=document.createElementNS(ns,'line'),dot=document.createElementNS(ns,'circle');dot.setAttribute('r','4');svg.append(line,dot);
      return {label,index,copy,line,dot};
    }):[];
    const css=getComputedStyle(host),colors={background:css.getPropertyValue('--purple').trim(),surface:css.getPropertyValue('--surface').trim(),secondary:css.getPropertyValue('--cyan').trim(),accent:css.getPropertyValue('--lime').trim()};
    const key={},fit=Math.min(canvas.width/1920,canvas.height/1080);let last=null;
    return time=>{
      const clock=stack?stackClock(time,onsets):cuboid?window.ShortCreatorCuboidMotion.clock(time,onsets):window.ShortCreatorGpuBackdrops.clock(time,onsets);
      // Canopy reaches its source hold at 10.5s; align that arrival with the
      // final cue instead of stretching the already-static 10.5–12s tail.
      const state=stack?{layers:stackState(clock.seconds)}:device||glass?{seconds:clock.seconds*7.5}:cuboid?{seconds:clock.seconds}:canopy?{seconds:clock.seconds*5.25}:portal?
        window.ShortCreatorWireframeMotion.timeline(clock.seconds*4,[...c.word].length):extruded?
        window.ShortCreatorExtrudedLogo.pose(clock.seconds*2.15,[...c.word].filter(ch=>ch!==' ').length):c.style==='orbit-card'?
        window.ShortCreatorOrbitCard.pose(clock.seconds/2):turnPose(clock.seconds/2);
      const signature=JSON.stringify(state);reveal(heading,out(clock.entry),24);caption.style.opacity=String(extruded?state.tagline:out(clock.entry));
      if(extruded)caption.style.transform=`translateY(${(1-state.tagline)*16}px)`;
      canvas.style.opacity=String(out(clock.entry));
      if(last!==signature) {
        if(images.some(image=>!image.complete||image.naturalWidth===0))throw new Error('Spatial source image is not decoded');
        if(active?.key!==key)build(key,c.style,canvas.width,canvas.height,images,colors,c);
        if(renderer.getContext().isContextLost())throw new Error('Spatial object WebGL context lost');
        const anchors=active.update(state);
        if(active.draw)active.draw();else renderer.render(active.scene,active.camera);
        if(active.paint)active.paint(context);
        else {context.globalCompositeOperation='copy';context.drawImage(renderer.domElement,0,0);context.globalCompositeOperation='source-over';}
        labels.forEach(({label,index,line,dot},i)=>{
          const s=state.layers[i],a=anchors[i],x=Math.round(a.x+(114+(1-s.shown)*16)*fit),y=Math.round(a.y-18);
          label.style.transform=`translate(${x}px,${y}px)`;label.style.opacity=String(s.shown);label.style.visibility=s.shown?'visible':'hidden';
          label.style.maxWidth=Math.max(0,canvas.width-x-8)+'px';index.style.color=s.focus>.5?'var(--lime)':'var(--cyan)';
          for(const [name,value] of Object.entries({x1:a.x,y1:a.y,x2:a.x+90*fit*s.shown,y2:a.y}))line.setAttribute(name,String(value));
          line.style.opacity=s.shown>0?'1':'0';dot.setAttribute('cx',String(a.x));dot.setAttribute('cy',String(a.y));dot.style.opacity=String(s.shown);
        });
        board.dataset.objectState=JSON.stringify({style:c.style,clock,...state,anchors,rig:active.inspect?.()??null});last=signature;
      } else {
        const observed=JSON.parse(board.dataset.objectState);observed.clock=clock;board.dataset.objectState=JSON.stringify(observed);
      }
    };
  }
  function dispose(){release();renderer?.dispose();renderer?.forceContextLoss();renderer=null;}
  window.addEventListener?.('pagehide',dispose);
  window.ShortCreatorSpatialObjects={kinds,profile,stackState,stackClock,turnPose,contain,plateGeometry,mount,dispose,
    stats:()=>({revision:window.ShortCreatorThree?.REVISION,contexts:renderer?1:0,
      geometries:renderer?.info.memory.geometries??0,textures:renderer?.info.memory.textures??0})};
})();
