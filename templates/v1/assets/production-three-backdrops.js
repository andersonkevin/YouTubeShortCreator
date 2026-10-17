/* HyperFrames orbiting cards, refractive glass and seeded spiral galaxy.
   Source notices and hashes accompany the pinned local Three.js runtime. */
(() => {
  'use strict';
  const kinds=Object.freeze(['three-orbiting-cards','three-glass-lens','three-glass-ring','three-galaxy','three-gallery-tunnel','three-cosmic-orb','three-rack-focus']);
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>1-(1-clamp(x))**3;
  function pose(style,progress) {
    if(!kinds.includes(style)||!Number.isFinite(progress))throw new Error('Invalid spatial backdrop pose');
    const p=clamp(progress);
    if(style==='three-orbiting-cards')return {seconds:4*p,rotation:[p===1?0:Math.sin(p*2*Math.PI)*.22,p===1?0:p*2*Math.PI,0],
      cameraZ:p===1?6.4:6.4-Math.sin(p*Math.PI)*.55};
    if(style==='three-galaxy')return {seconds:10*p};
    if(style==='three-gallery-tunnel')return {seconds:12*p};
    if(style==='three-cosmic-orb')return {seconds:10*p};
    if(style==='three-rack-focus')return {seconds:6*p,focus:window.ShortCreatorOpticalFields.focusAt(6*p)};
    const t=5*p,rise=ease(t/1.8),lens=style==='three-glass-lens';
    return {seconds:t,position:[Math.sin(t*.55)*.35,-3.2*(1-rise)+Math.sin(t*.9)*.06,1.2],
      scale:.62+.14*rise,rotation:lens?[Math.sin(t*.7)*.35,Math.sin(t*.5)*.5+.2,0]:[.5+t*.22,t*.34,.2+t*.08]};
  }
  function galaxyAttributes() {
    let seed=20240817;
    const random=()=>{
      seed|=0;seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;
    };
    const attributes=Object.fromEntries(['aRatio','aBranch','aJitterR','aJitterT','aJitterY','aSpark'].map(key=>[key,new Float32Array(20000)]));
    const jitter=()=>{const magnitude=Math.pow(random(),3)*.2*5;return magnitude*(random()<.5?-1:1);};
    for(let i=0;i<20000;i++) {
      attributes.aRatio[i]=random();attributes.aBranch[i]=(i%3)/3*Math.PI*2;
      attributes.aJitterR[i]=jitter();attributes.aJitterT[i]=jitter()*.62;
      attributes.aJitterY[i]=jitter()*.3;attributes.aSpark[i]=random();
    }
    return attributes;
  }
  function tunnelFrame(seconds) {
    if(!Number.isFinite(seconds)||seconds<0||seconds>12)throw new Error('Invalid bounded tunnel time');
    const hash=(a,b)=>{
      let h=Math.imul(a|0,0x27d4eb2d)^Math.imul(b|0,0x165667b1);
      h=Math.imul(h^(h>>>15),0x2545f491);h^=h>>>13;return (h>>>0)/4294967296;
    };
    const distance=seconds*3;
    return Array.from({length:15},(_,i)=>{
      const absolute=i+15*Math.ceil((distance-i-.75)/15);
      return {absolute,z:distance-absolute,panels:Array.from({length:16},(_,slot)=>
        absolute%2===0&&hash(absolute,slot*4+1)<.5?Math.floor(hash(absolute,slot*4+3)*6):-1)};
    });
  }
  const vertexShader=`
    attribute float aRatio,aBranch,aJitterR,aJitterT,aJitterY,aSpark;
    uniform float uTime,uRate,uSpin,uRadius,uPower,uSize,uRefDist,uGlow;
    uniform vec3 uCore,uRim;
    varying vec3 vColor; varying float vBright;
    void main(){
      float ratio=clamp(aRatio,0.0,1.0),omega=1.0-ratio,r=pow(ratio,uPower)*uRadius;
      float theta=aBranch+uSpin*r+uRate*uTime*omega;
      vec2 radial=vec2(cos(theta),sin(theta)),tangent=vec2(-radial.y,radial.x);
      vec2 xz=radial*(r+aJitterR)+tangent*aJitterT;
      vec4 mv=modelViewMatrix*vec4(xz.x,aJitterY,xz.y,1.0);
      gl_Position=projectionMatrix*mv;
      gl_PointSize=uSize*(uRefDist/max(-mv.z,0.001))*(0.55+0.75*aSpark);
      vColor=mix(uCore,uRim,pow(ratio,uPower));
      vBright=uGlow*(0.22+0.78*exp(-ratio*3.0));
    }`;
  const fragmentShader=`
    varying vec3 vColor; varying float vBright;
    void main(){
      float d=length(gl_PointCoord-vec2(0.5));
      float a=1.0-smoothstep(0.0,0.5,d);
      gl_FragColor=vec4(vColor*vBright,a*a);
    }`;
  let renderer=null,active=null;
  function prepare() {
    if(renderer)return;
    const three=window.ShortCreatorThree;
    if(!three||three.REVISION!=='185')throw new Error('Pinned Three.js r185 unavailable');
    renderer=new three.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
    renderer.setPixelRatio(1);renderer.outputColorSpace=three.SRGBColorSpace;
    renderer.toneMapping=three.NoToneMapping;
    renderer.debug.onShaderError=()=>{throw new Error('Spatial backdrop shader compilation failed');};
  }
  function build(style,heading,width,height) {
    const T=window.ShortCreatorThree,owned=new Set(),keep=value=>{owned.add(value);return value;};
    const scene=new T.Scene();scene.background=new T.Color(0,0,0);
    const sourceAspect=style==='three-orbiting-cards'?760/430:1920/1080,aspect=width/height;
    const camera=new T.PerspectiveCamera(style==='three-orbiting-cards'?36:style==='three-galaxy'?45:style==='three-gallery-tunnel'?75:30,aspect,.05,200);
    camera.zoom=Math.min(1,aspect/sourceAspect);camera.updateProjectionMatrix();
    let apply;
    try {
      if(style==='three-cosmic-orb'||style==='three-rack-focus') {
        const source=window.ShortCreatorOpticalShaders,fields=window.ShortCreatorOpticalFields;
        if(!source||!fields)throw new Error('Missing pinned optical source');
        const orbital=style==='three-cosmic-orb',geometry=keep(new T.BufferGeometry());
        let values;
        if(orbital) {
          geometry.setAttribute('aPos',new T.Float32BufferAttribute([-1,-1,3,-1,-1,3],2));
          geometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,0,0,0,0,0],3));
          values={uRes:new T.Vector2(width,height),uTime:0,uRadius:.43*Math.min(width,height),uSpin:.035,
            uHue:268,uAccent:196,uStars:1,uGlow:1,uPulse:0};
        } else {
          const lights=fields.rackLights(),corners=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];
          const positions=[],sizes=[],colors=[],vertices=[];
          for(const light of lights)for(const corner of corners){vertices.push(...corner);positions.push(...light.position);sizes.push(...light.size);colors.push(...light.color);}
          geometry.setAttribute('aCorner',new T.Float32BufferAttribute(vertices,2));
          geometry.setAttribute('aPos',new T.Float32BufferAttribute(positions,3));
          geometry.setAttribute('aSize',new T.Float32BufferAttribute(sizes,2));
          geometry.setAttribute('aColor',new T.Float32BufferAttribute(colors,3));
          geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(positions.length),3));
          const fit=Math.min(width/1920,height/1080);
          values={uRes:new T.Vector2(width,height),uPxPerMm:1920/36*fit,uFocal:85,uFocus:1.2,uFstop:1.8,
            uCoCmm:.03,uMaxR:108*fit,uMinR:.75*fit,uCatsEye:.62,uBokeh:1,uBlades:6};
        }
        const uniforms=Object.fromEntries(Object.entries(values).map(([name,value])=>[name,{value}]));
        const material=keep(new T.RawShaderMaterial({uniforms,vertexShader:orbital?source.orbVertex:source.rackVertex,
          fragmentShader:orbital?source.orbFragment:source.rackFragment,depthTest:false,depthWrite:false,
          transparent:!orbital,blending:orbital?T.NoBlending:T.CustomBlending,blendEquation:T.AddEquation,blendSrc:T.OneFactor,blendDst:T.OneFactor}));
        const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
        apply=state=>{if(orbital)uniforms.uTime.value=state.seconds;else uniforms.uFocus.value=state.focus;};
      } else if(style==='three-orbiting-cards') {
        const group=new T.Group();scene.add(group);
        const geometry=keep(new T.BoxGeometry(1.2,1.2,.08));
        const materials=[keep(new T.MeshStandardMaterial({color:0x60a5fa,metalness:.18,roughness:.38})),
          keep(new T.MeshStandardMaterial({color:0xa78bfa,metalness:.12,roughness:.44}))];
        for(let i=0;i<9;i++) {
          const mesh=new T.Mesh(geometry,materials[i%2]),angle=i/9*Math.PI*2;
          mesh.position.set(Math.cos(angle)*2.15,Math.sin(angle)*2.15*.55,Math.sin(angle)*.7);
          mesh.rotation.z=angle;group.add(mesh);
        }
        scene.add(new T.AmbientLight(0xffffff,1.2));
        const key=new T.DirectionalLight(0xffffff,2.2);key.position.set(2,3,4);scene.add(key);
        apply=state=>{group.rotation.set(...state.rotation);camera.position.set(0,0,state.cameraZ);};
      } else if(style==='three-galaxy') {
        camera.position.set(0,2.9,7.6);camera.lookAt(0,0,0);
        const values={uTime:0,uRate:.25,uSpin:.78,uRadius:5,uPower:1.5,uSize:10*height/1080,
          uRefDist:camera.position.length(),uGlow:1.9,uCore:new T.Color('#ffa575'),uRim:new T.Color('#311599')};
        const uniforms=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{value}]));
        const geometry=keep(new T.BufferGeometry());
        geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(60000),3));
        for(const [key,array] of Object.entries(galaxyAttributes()))geometry.setAttribute(key,new T.BufferAttribute(array,1));
        const material=keep(new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,blending:T.AdditiveBlending,
          transparent:true,depthTest:false,depthWrite:false}));
        const points=new T.Points(geometry,material);points.frustumCulled=false;scene.add(points);
        apply=state=>{uniforms.uTime.value=state.seconds;};
      } else if(style==='three-gallery-tunnel') {
        scene.fog=new T.Fog(0x000000,1,14.25);camera.lookAt(0,0,-1);
        const plane=keep(new T.PlaneGeometry(1,1));
        const colors=[0xff6a00,0xab54f7,0xea3737,0x0072e3,0x00aa3c,0xffb200].map(color=>keep(new T.MeshBasicMaterial({color,fog:true})));
        const edge=keep(new T.MeshBasicMaterial({color:0xb0b0b0,fog:true,transparent:true,opacity:.5}));
        const tubeShapes=new Map(),up=new T.Vector3(0,1,0);
        const tube=(group,a,b)=>{
          const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),length=delta.length();
          if(!tubeShapes.has(length))tubeShapes.set(length,keep(new T.CylinderGeometry(.003,.003,length,6,1)));
          const mesh=new T.Mesh(tubeShapes.get(length),edge);
          mesh.position.set(...a).add(new T.Vector3(...b)).multiplyScalar(.5);
          mesh.quaternion.setFromUnitVectors(up,delta.divideScalar(length));group.add(mesh);
        };
        const segments=Array.from({length:15},()=>{
          const group=new T.Group(),panels=[];
          for(let face=0;face<4;face++)for(let iz=0;iz<2;iz++)for(let iu=0;iu<2;iu++) {
            const mesh=new T.Mesh(plane,colors[0]),z=-(iz+.5)*.5;
            if(face<2) {mesh.position.set(-1+(iu+.5),face===0?-.902:.902,z);mesh.rotation.x=face===0?-Math.PI/2:Math.PI/2;mesh.scale.set(.94,.47,1);}
            else {mesh.position.set(face===2?-1.002:1.002,-.9+(iu+.5)*.9,z);mesh.rotation.y=face===2?Math.PI/2:-Math.PI/2;mesh.scale.set(.47,.846,1);}
            group.add(mesh);panels.push(mesh);
          }
          for(const y of [-.9,.9])tube(group,[0,y,0],[0,y,-1]);
          for(let k=0;k<=2;k++)for(const x of [-1,1])tube(group,[x,-.9+k*.9,0],[x,-.9+k*.9,-1]);
          for(const z of [0,-.5]) {
            for(const y of [-.9,.9])tube(group,[-1,y,z],[1,y,z]);
            for(const x of [-1,1])tube(group,[x,-.9,z],[x,.9,z]);
          }
          scene.add(group);return {group,panels};
        });
        apply=state=>tunnelFrame(state.seconds).forEach((frame,i)=>{
          segments[i].group.position.z=frame.z;
          frame.panels.forEach((color,j)=>{const panel=segments[i].panels[j];panel.visible=color>=0;if(color>=0)panel.material=colors[color];});
        });
      } else {
        camera.position.set(0,0,10);
        const studio=new T.Scene();studio.background=new T.Color(.08,.08,.08);
        for(const [w,h,x,y,z,level] of [[8,3,-1,6,2,2.5],[1.2,9,-7,0,-1,4],[1.2,9,7,0,-1,4]]) {
          const box=new T.Mesh(keep(new T.PlaneGeometry(w,h)),keep(new T.MeshBasicMaterial({color:new T.Color(level,level,level),side:T.DoubleSide})));
          box.position.set(x,y,z);box.lookAt(0,0,0);studio.add(box);
        }
        const pmrem=new T.PMREMGenerator(renderer);
        try {scene.environment=keep(pmrem.fromScene(studio,.02)).texture;} finally {pmrem.dispose();}
        const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
        const context=canvas.getContext('2d');if(!context)throw new Error('Cannot paint glass text');
        if(!document.fonts.check('800 220px BrandSans'))throw new Error('Approved glass font unavailable');
        context.font='800 220px BrandSans';
        if(context.measureText(heading).width>1536)throw new Error('Glass heading exceeds fixed brand typography; shorten the heading');
        context.fillStyle='#000000';context.fillRect(0,0,1920,1080);
        context.fillStyle='#ffffff';context.textAlign='center';context.textBaseline='middle';
        context.fillText(heading,960,1080*.47);
        const texture=keep(new T.CanvasTexture(canvas));texture.colorSpace=T.SRGBColorSpace;
        texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
        const planeHeight=2*Math.tan(T.MathUtils.degToRad(15))*12;
        const backdrop=new T.Mesh(keep(new T.PlaneGeometry(planeHeight*sourceAspect,planeHeight)),keep(new T.MeshBasicMaterial({map:texture})));
        backdrop.position.z=-2;scene.add(backdrop);
        const lens=style==='three-glass-lens';
        const geometry=keep(lens?new T.SphereGeometry(1.6,128,64):new T.TorusGeometry(1.25,.46,96,200));
        if(lens)geometry.scale(1,1,.42);
        const glass=new T.Mesh(geometry,keep(new T.MeshPhysicalMaterial({color:0xffffff,transmission:1,thickness:.6,ior:1.3,
          roughness:.03,metalness:0,dispersion:.6,attenuationColor:new T.Color('#cfe9ff'),attenuationDistance:2.2,
          specularIntensity:1,clearcoat:1,clearcoatRoughness:.04})));
        scene.add(glass);const key=new T.DirectionalLight(0xffffff,2.4);key.position.set(-4,5,6);scene.add(key);
        apply=state=>{glass.position.set(...state.position);glass.scale.setScalar(state.scale);glass.rotation.set(...state.rotation);};
      }
      return {scene,camera,apply,dispose:()=>owned.forEach(value=>value.dispose())};
    } catch(error) {owned.forEach(value=>value.dispose());throw error;}
  }
  function draw(canvas,style,heading,state) {
    prepare();if(renderer.getContext().isContextLost())throw new Error('Spatial backdrop WebGL context lost');
    const key=JSON.stringify([style,heading,canvas.width,canvas.height]);
    if(active?.key!==key) {
      active?.dispose();active=null;
      renderer.setSize(canvas.width,canvas.height,false);
      active={key,...build(style,heading,canvas.width,canvas.height)};
    }
    active.apply(state);renderer.render(active.scene,active.camera);
    return renderer.domElement;
  }
  function mount(host,content,onsets,make,reveal) {
    if(!kinds.includes(content.style))throw new Error('Unknown spatial backdrop');
    const helpers=window.ShortCreatorGpuBackdrops;if(!helpers)throw new Error('Missing bounded GPU helpers');
    helpers.clock(0,onsets);
    const copy=make('div','screen-copy',null,host);
    const heading=make('h2','prod-heading',content.heading,copy,true),caption=make('p','screen-caption',content.caption,copy,true);
    const view=make('div','screen-device backdrop-art',null,host),canvas=make('canvas','backdrop-canvas',null,view);
    canvas.setAttribute('aria-hidden','true');canvas.width=view.clientWidth;canvas.height=view.clientHeight;
    if(canvas.width<1||canvas.height<1)throw new Error('Invalid spatial backdrop dimensions');
    Object.assign(canvas.style,{width:'100%',height:'100%',display:'block'});
    const context=canvas.getContext('2d',{alpha:false,willReadFrequently:true});if(!context)throw new Error('Cannot paint spatial backdrop');
    const css=getComputedStyle(host),colors={background:css.getPropertyValue('--purple').trim(),
      secondary:css.getPropertyValue('--cyan').trim(),accent:css.getPropertyValue('--lime').trim()},table=helpers.palette(colors);
    view.dataset.backdrop=content.style;view.dataset.gpuPalette=JSON.stringify(colors);
    prepare();let last=null;
    return time=>{
      const clock=helpers.clock(time,onsets),state=pose(content.style,clock.seconds/2);
      reveal(heading,ease(clock.entry),32);reveal(caption,ease(clock.entry),24);canvas.style.opacity=String(ease(clock.entry));
      if(last!==clock.seconds) {
        context.drawImage(draw(canvas,content.style,content.heading,state),0,0);
        const image=context.getImageData(0,0,canvas.width,canvas.height);helpers.recolor(image.data,table);context.putImageData(image,0,0);
        last=clock.seconds;
      }
      view.dataset.backdropProgress=String(clock.entry);view.dataset.threeClock=JSON.stringify(clock);
      view.dataset.threePose=JSON.stringify(state);
    };
  }
  function dispose() {active?.dispose();active=null;renderer?.dispose();renderer?.forceContextLoss();renderer=null;}
  window.ShortCreatorThreeBackdrops={kinds,pose,galaxyAttributes,tunnelFrame,mount,dispose,
    stats:()=>({revision:window.ShortCreatorThree?.REVISION,contexts:renderer?1:0,active:active?.key??null,
      geometries:renderer?.info.memory.geometries??0,textures:renderer?.info.memory.textures??0})};
})();
