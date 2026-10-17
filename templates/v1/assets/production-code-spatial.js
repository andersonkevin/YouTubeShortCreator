/* HyperFrames code-particle-assemble, code-shader-dissolve and code-3d-extrude,
   Apache-2.0. Explicit native text replaces baked example tokens. */
(() => {
  'use strict';
  const kinds=Object.freeze(['particles','dissolve','extrude']),clamp=x=>Math.max(0,Math.min(1,x));
  function pose(style,value) {
    if(!kinds.includes(style)||!Number.isFinite(value))throw new Error('Invalid spatial code pose');
    const p=clamp(value),arrive=clamp(p/(style==='particles'?.72:style==='dissolve'?.62:.6));
    const q=style==='dissolve'?(arrive<.5?2*arrive**2:1-(-2*arrive+2)**2/2):1-(1-arrive)**(style==='extrude'?4:3);
    const rest=clamp((p-.9)/.1),native=rest*rest*(3-2*rest);
    return {progress:p,reveal:style==='dissolve'?1.15*q:q,rx:style==='extrude'?.4*(1-q):0,
      ry:style==='extrude'?q-1:0,cameraOffset:style==='extrude'?6*(1-q):0,native};
  }
  function particles(data,width,height) {
    if(!(data instanceof Uint8ClampedArray)||data.length!==width*height*4||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>1920||height>1920)
      throw new Error('Invalid code raster');
    const target=[],color=[],origin=[],delay=[],worldW=13,worldH=worldW*height/width;
    let seed=Math.imul(23,2654435761)>>>0;
    const random=()=>{seed|=0;seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
    for(let y=0;y<height;y+=2)for(let x=0;x<width;x+=2) {
      const i=(y*width+x)*4;if(data[i+3]<128)continue;
      target.push((x/width-.5)*worldW,-(y/height-.5)*worldH,0);
      color.push(data[i]/255,data[i+1]/255,data[i+2]/255);
      origin.push((random()*2-1)*worldW*1.15,(random()*2-1)*worldH*1.7,(random()*2-1)*9-2);delay.push(random());
    }
    if(delay.length>80000)throw new Error('Code glyph field exceeds its fixed particle budget');
    return {target,origin,color,delay,worldW,worldH};
  }
  const particleVertex=`
    attribute vec3 aOrigin,aTarget,aColor; attribute float aDelay;
    uniform float uProgress,uSize; varying vec3 vColor; varying float vP;
    void main(){
      float p=clamp((uProgress-aDelay*(1.0-0.62))/0.62,0.0,1.0);p=p*p*(3.0-2.0*p);
      vec4 mv=modelViewMatrix*vec4(mix(aOrigin,aTarget,p),1.0);
      gl_Position=projectionMatrix*mv;gl_PointSize=uSize*(60.0/-mv.z)*(0.45+0.55*p);
      vColor=aColor;vP=p;
    }`;
  const particleFragment=`
    precision highp float; varying vec3 vColor; varying float vP;
    void main(){vec2 d=gl_PointCoord-0.5;float r2=dot(d,d);if(r2>0.25)discard;
      float a=1.0-smoothstep(0.02,0.25,r2);
      vec3 c=mix(vColor+vec3(0.32)*(1.0-vP),vColor,vP);
      gl_FragColor=vec4(c,a*(0.7+0.3*vP));}`;
  const dissolveVertex=`varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
  const dissolveFragment=`
    precision highp float;uniform sampler2D uTex;uniform float uProgress,uSeed;uniform vec3 uGlow;varying vec2 vUv;
    float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));vec2 u=f*f*(3.-2.*f);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
    void main(){vec2 uv=vUv;
      float n=noise(uv*16.0+uSeed)*0.6+noise(uv*48.0+uSeed*1.7)*0.3+noise(uv*120.0+uSeed*2.3)*0.1;
      float reveal=smoothstep(n-0.12,n+0.12,uProgress),band=reveal*(1.0-reveal)*4.0,off=band*0.010;
      vec3 codeCol=vec3(texture2D(uTex,uv+vec2(off,0.0)).r,texture2D(uTex,uv).g,texture2D(uTex,uv-vec2(off,0.0)).b);
      gl_FragColor=vec4(codeCol*reveal+uGlow*band*0.9,max(reveal,band*0.8));}`;
  let renderer=null,active=null;
  function release() {
    if(active){for(const item of active.owned)item.dispose();active=null;}
  }
  function prepare() {
    if(renderer)return;
    const T=window.ShortCreatorThree;if(!T||T.REVISION!=='185')throw new Error('Pinned code renderer unavailable');
    renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
    renderer.debug.onShaderError=()=>{throw new Error('Spatial code shader compilation failed');};
  }
  function build(style,textureCanvas,colors,key) {
    prepare();release();
    const T=window.ShortCreatorThree,owned=new Set(),keep=o=>{owned.add(o);return o;};
    const width=textureCanvas.width,height=textureCanvas.height,scene=new T.Scene();scene.background=new T.Color(colors.background);
    const camera=new T.PerspectiveCamera(45,width/height,.1,200);let update,count=0;
    try {
      if(style==='particles') {
        const data=particles(textureCanvas.getContext('2d').getImageData(0,0,width,height).data,width,height);count=data.delay.length;
        const geometry=keep(new T.BufferGeometry());
        for(const [name,values,size] of [['position',data.origin,3],['aOrigin',data.origin,3],['aTarget',data.target,3],['aColor',data.color,3],['aDelay',data.delay,1]])
          geometry.setAttribute(name,new T.Float32BufferAttribute(values,size));
        const fit=data.worldH/2/Math.tan(Math.PI/8),z=Math.max(10,fit);camera.zoom=z/fit;camera.position.z=z;camera.updateProjectionMatrix();
        const uniforms={uProgress:{value:0},uSize:{value:2.4*z/60}};
        const material=keep(new T.ShaderMaterial({uniforms,vertexShader:particleVertex,fragmentShader:particleFragment,
          transparent:true,depthTest:false,depthWrite:false,blending:T.NormalBlending}));
        const points=new T.Points(geometry,material);points.frustumCulled=false;scene.add(points);
        update=s=>{uniforms.uProgress.value=s.reveal;};
      } else {
        const texture=keep(new T.CanvasTexture(textureCanvas));texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;
        const h=style==='extrude'?6.2:6.6,w=h*width/height;
        let geometry,material;
        if(style==='dissolve') {
          geometry=keep(new T.PlaneGeometry(w,h));
          const uniforms={uTex:{value:texture},uProgress:{value:0},uSeed:{value:11*13.37},uGlow:{value:new T.Vector3(...colors.glow)}};
          material=keep(new T.ShaderMaterial({uniforms,vertexShader:dissolveVertex,fragmentShader:dissolveFragment,transparent:true}));
          camera.position.z=h/2/Math.tan(Math.PI/8);update=s=>{uniforms.uProgress.value=s.reveal;};
        } else {
          texture.colorSpace=T.SRGBColorSpace;
          const x=w/2,y=h/2,r=.18,shape=new T.Shape();
          shape.moveTo(-x+r,-y);shape.lineTo(x-r,-y);shape.quadraticCurveTo(x,-y,x,-y+r);
          shape.lineTo(x,y-r);shape.quadraticCurveTo(x,y,x-r,y);shape.lineTo(-x+r,y);
          shape.quadraticCurveTo(-x,y,-x,y-r);shape.lineTo(-x,-y+r);shape.quadraticCurveTo(-x,-y,-x+r,-y);
          geometry=keep(new T.ExtrudeGeometry(shape,{depth:.5,bevelEnabled:true,bevelThickness:.12,bevelSize:.1,bevelSegments:3,steps:1}));
          geometry.center();geometry.computeBoundingBox();const b=geometry.boundingBox,p=geometry.attributes.position,uv=geometry.attributes.uv;
          for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-b.min.x)/(b.max.x-b.min.x),(p.getY(i)-b.min.y)/(b.max.y-b.min.y));uv.needsUpdate=true;
          material=[keep(new T.MeshBasicMaterial({map:texture})),keep(new T.MeshStandardMaterial({color:colors.background,roughness:.3,metalness:.4}))];
          scene.add(new T.AmbientLight(0xffffff,.5));
          const light=new T.DirectionalLight(colors.secondary,1.25);light.position.set(5,7,9);scene.add(light);
          const rim=new T.DirectionalLight(colors.accent,.45);rim.position.set(-7,-3,5);scene.add(rim);
          const fit=Math.max((b.max.y-b.min.y)/2/Math.tan(Math.PI/8),(b.max.x-b.min.x)/2/Math.tan(Math.PI/8)/(width/height))+b.max.z;
          update=s=>{mesh.rotation.set(s.rx,s.ry,0);camera.position.z=fit+s.cameraOffset;};
        }
        const mesh=new T.Mesh(geometry,material);scene.add(mesh);
      }
      camera.lookAt(0,0,0);renderer.setSize(width,height,false);
      active={key,owned,scene,camera,update,count};
    } catch(error) {for(const item of owned)item.dispose();throw error;}
  }
  function mount(viewport,documents,style) {
    if(!kinds.includes(style))throw new Error('Unknown spatial code style');
    const css=getComputedStyle(viewport),boardCss=getComputedStyle(viewport.parentNode),width=viewport.clientWidth,height=viewport.clientHeight;
    const colors={background:boardCss.getPropertyValue('--surface').trim(),secondary:boardCss.getPropertyValue('--cyan').trim(),accent:boardCss.getPropertyValue('--lime').trim()};
    colors.glow=[1,3,5].map(i=>parseInt(colors.secondary.slice(i,i+2),16)/255);
    if(!document.fonts.check(css.font)||!css.fontFamily.includes('BrandMono'))throw new Error('Approved code font unavailable');
    const position=n=>{let x=0,y=0;for(let p=n;p&&p!==viewport;p=p.offsetParent){x+=p.offsetLeft;y+=p.offsetTop;}return {x,y};};
    const bitmaps=documents.map(doc=>{
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Code raster unavailable');
      if(style!=='particles'){ctx.fillStyle=colors.background;ctx.fillRect(0,0,width,height);}
      ctx.font=css.font;ctx.textBaseline='top';
      for(const node of doc.node.querySelectorAll('.code-story-number,.code-story-text')) {
        const p=position(node);ctx.fillStyle=getComputedStyle(node).color;ctx.textAlign=node.classList.contains('code-story-number')?'right':'left';
        ctx.fillText(node.textContent,p.x+(ctx.textAlign==='right'?node.offsetWidth:0),p.y+(parseFloat(css.lineHeight)-parseFloat(css.fontSize))/2);
      }
      return canvas;
    });
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.className='code-spatial-canvas';canvas.setAttribute('aria-hidden','true');viewport.appendChild(canvas);
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Code display canvas unavailable');
    const keys=bitmaps.map(()=>({}));let lastKey=null,lastProgress=null;
    return (index,p)=>{
      const state=pose(style,p),moving=index>=0&&p>0&&p<1;
      canvas.style.visibility=moving?'visible':'hidden';canvas.style.opacity=String(1-state.native);
      if(moving&&(lastKey!==keys[index]||lastProgress!==p)) {
        if(active?.key!==keys[index])build(style,bitmaps[index],colors,keys[index]);
        active.update(state);renderer.render(active.scene,active.camera);
        ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='copy';ctx.drawImage(renderer.domElement,0,0);ctx.globalCompositeOperation='source-over';
        lastKey=keys[index];lastProgress=p;
      }
      viewport.dataset.spatialCode=JSON.stringify({style,index,...state,moving,width,height});
      return state.native;
    };
  }
  const stats=()=>({contexts:renderer?1:0,geometries:renderer?.info.memory.geometries??0,textures:renderer?.info.memory.textures??0,particles:active?.count??0,revision:'185'});
  window.addEventListener?.('pagehide',()=>{release();renderer?.dispose();renderer=null;});
  window.ShortCreatorSpatialCode={kinds,pose,particles,mount,stats};
})();
