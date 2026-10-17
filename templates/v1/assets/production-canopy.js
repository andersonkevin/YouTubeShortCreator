/* HyperFrames canopy-part-title, Apache-2.0. Native brand-bound foliage,
   source bokeh and sharp title composition; local Three.js r185 under MIT. */
(() => {
  'use strict';
  const M=window.ShortCreatorCanopyMotion;
  const dimensions=Object.freeze({monstera:[2.05,2.7],alocasia:[1.92,2.85],lance:[.68,3.45],calathea:[1.36,3.05],fern:[.46,1.5]});
  function wind(material,index,time,photo=null) {
    material.onBeforeCompile=shader=>{
      shader.uniforms.uTime=time;
      shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
        uniform float uTime;`).replace('#include <begin_vertex>',`
        vec3 transformed=vec3(position);
        float root=pow(uv.y,1.28);
        float worldPhase=dot(modelMatrix[3].xyz,vec3(.71,1.13,.43))+${index.toFixed(1)};
        vec2 worldXY=modelMatrix[3].xy;
        float gustCell=sin(uTime*.23+worldXY.x*.42+sin(worldXY.y*.37+uTime*.11));
        float localGust=pow(max(0.,gustCell),3.6);
        float breath=sin(uTime*.46+worldPhase)*.20+sin(uTime*1.17+worldPhase*1.7)*.07+localGust*.62;
        float flutter=(sin(uTime*2.7+uv.y*8.+worldPhase*2.2)*.012+localGust*sin(uv.y*11.+worldPhase)*.038)*.8;
        float edgeNoise=sin(uv.y*31.+worldPhase*4.1)*pow(abs(uv.x-.5)*2.,2.4)*.022*2.5;
        transformed.x+=(breath*.075*2.5+flutter+edgeNoise)*root;
        transformed.z+=breath*.12*root*2.5+flutter*root*.8+edgeNoise;
        transformed.z+=(1.-pow(abs(uv.x-.5)*2.,1.65))*.075;
      `);
      if(photo){
        shader.uniforms.uPhotoSurface={value:photo};
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
          uniform sampler2D uPhotoSurface;`).replace('#include <map_fragment>',`#include <map_fragment>
          float leafNoise=fract(sin(dot(vMapUv*vec2(311.7,917.3),vec2(12.9898,78.233)))*43758.5453);
          diffuseColor.rgb*=1.+(leafNoise-.5)*.18*2.;
          vec3 photographedSurface=texture2D(uPhotoSurface,vMapUv*vec2(2.4,4.8)).rgb;
          diffuseColor.rgb*=mix(vec3(1.),photographedSurface*1.24,.26);
        `);
      }
    };
    material.customProgramCacheKey=()=>`native-canopy-${index}-${photo?'surface':'depth'}`;
  }
  function build({T,renderer,scene,keep,colors,width,height,content,images,canvas,texture}) {
    if(T?.REVISION!=='185'||images.length!==2||images.some(image=>!image.complete||!image.naturalWidth))
      throw new Error('Canopy needs the pinned runtime and two decoded local textures');
    const font=window.ShortCreatorPortalOutlines;
    if(font?.normalization!=='nonzero'||font.units!==1000||!font.font_sha256)
      throw new Error('Approved canopy display outlines are not ready');
    const sampler=M.create(T,0,width/height),initial=sampler.sample(0);
    const camera=new T.PerspectiveCamera(initial.camera.fov,width/height,.1,40);
    const bg=new T.Color(colors.background);scene.background=bg;scene.fog=new T.FogExp2(bg,.008);
    scene.add(new T.HemisphereLight(colors.secondary,colors.background,2));
    const sun=new T.DirectionalLight(0xece5ff,8.5);sun.position.set(-13.3,8.5,9);sun.target.position.set(0,-1,-3);
    sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-20,right:20,top:14.6,bottom:-14.6,near:.5,far:28});
    Object.assign(sun.shadow,{bias:.00105,normalBias:.0525,radius:2.5});keep(sun.shadow);scene.add(sun,sun.target);
    const fill=new T.DirectionalLight(colors.secondary,9.55);fill.position.set(-11.8,4.2,5.2);fill.target.position.set(.7,1,-2);scene.add(fill,fill.target);
    const planeGeometry=keep(new T.PlaneGeometry(68,44));
    const wall=new T.Mesh(planeGeometry,keep(new T.MeshBasicMaterial({color:bg,fog:false})));wall.position.z=-7.5;scene.add(wall);
    const catcher=new T.Mesh(planeGeometry,keep(new T.ShadowMaterial({opacity:.28})));catcher.position.z=-7.45;catcher.receiveShadow=true;scene.add(catcher);
    const photoSurface=keep(new T.Texture(images[0])),photoNormal=keep(new T.Texture(images[1]));
    photoSurface.colorSpace=T.SRGBColorSpace;
    for(const map of [photoSurface,photoNormal]){map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(2.4,4.8);map.needsUpdate=true;}
    const linearRgb=color=>new T.Color(color).convertLinearToSRGB();
    const tones=(kind,index)=>{
      const dark=linearRgb(colors.background),accent=linearRgb(colors.accent),secondary=linearRgb(colors.secondary);
      return [dark.lerp(secondary,.12+index*.02),secondary.clone().lerp(accent,.12+index*.03).multiplyScalar(.65),accent.clone().lerp(new T.Color(1,1,1),index*.04)]
        .map(color=>color.toArray().map(v=>Math.max(0,Math.min(255,v*255))));
    };
    const materialRows=M.kinds.map((kind,index)=>{
      const data=M.textureData(kind,index*31+7,tones(kind,index)),paint=values=>{
        const {c,g}=canvas(data.width,data.height),image=g.createImageData(data.width,data.height);image.data.set(values);g.putImageData(image,0,0);return texture(c);
      };
      const map=paint(data.color),bump=paint(data.bump);bump.colorSpace=T.NoColorSpace;
      const material=keep(new T.MeshPhysicalMaterial({map,bumpMap:bump,bumpScale:(kind==='monstera'?.065:.045)*2.5,
        normalMap:photoNormal,normalScale:new T.Vector2(.35,.35),alphaTest:.42,side:T.DoubleSide,
        roughness:.5626,metalness:0,clearcoat:.5256,clearcoatRoughness:.4274,thickness:0,transmission:.015,
        sheen:.24,sheenColor:new T.Color(kind==='calathea'?colors.accent:colors.secondary),sheenRoughness:.8,
        emissive:new T.Color(colors.background),emissiveIntensity:.18,shadowSide:T.DoubleSide}));
      const depth=keep(new T.MeshDepthMaterial({map,alphaTest:.42,side:T.DoubleSide,depthPacking:T.RGBADepthPacking,blending:T.NoBlending}));
      const time={value:0};wind(material,index,time,photoSurface);wind(depth,index,time);
      return {kind,material,depth,time};
    });
    const meshes=[],geometryCache=new Map();
    for(const spec of sampler.batches.flat()){
      const dims=dimensions[spec.kind],w=dims[0]*spec.widthMul,h=dims[1]*spec.lengthMul,key=`${w.toFixed(2)}-${h.toFixed(2)}`;
      if(!geometryCache.has(key))geometryCache.set(key,keep(M.geometry(T,w,h)));
      const row=materialRows.find(row=>row.kind===spec.kind),mesh=new T.Mesh(geometryCache.get(key),row.material);
      mesh.castShadow=true;mesh.receiveShadow=spec.z<4.8;mesh.customDepthMaterial=row.depth;mesh.userData.canopyDepth=row.depth;
      mesh.scale.setScalar(spec.scale);scene.add(mesh);meshes.push(mesh);
    }
    function headline(text,second){
      const {c,g}=canvas(4096,1024),glyphs=[...text].map(char=>{
        const glyph=font.glyphs[char];if(!glyph)throw new Error('Approved canopy font lacks a glyph');
        const box=new T.Box2();
        if(char!==' ')for(const shape of window.ShortCreatorExtrudedLogo.shapes(T,glyph.commands,1))for(const point of shape.getPoints(12))box.expandByPoint(point);
        return {char,glyph,box};
      });
      const span=size=>glyphs.reduce((n,row)=>n+row.glyph.advance*size/1000+Math.round(size*.01),-Math.round(size*.01));
      const size=Math.min(380,Math.floor(380*3760/span(380))),textWidth=span(size);
      if(textWidth>3760)throw new Error('Canopy title exceeds its readable width');
      const top=Math.max(...glyphs.filter(row=>row.char!==' ').map(row=>row.box.max.y));
      const bottom=Math.min(...glyphs.filter(row=>row.char!==' ').map(row=>row.box.min.y));
      const baseline=528+(top+bottom)*size/2,combined=new Path2D(),ink=[Infinity,Infinity,-Infinity,-Infinity];
      let cursor=(4096-textWidth)/2;
      for(const {char,glyph,box}of glyphs){
        if(char!==' '){
          const path=new Path2D();
          for(const [kind,...p]of glyph.commands){
            if(kind==='M')path.moveTo(...p);else if(kind==='L')path.lineTo(...p);else if(kind==='Q')path.quadraticCurveTo(...p);
            else if(kind==='C')path.bezierCurveTo(...p);else if(kind==='Z')path.closePath();else throw new Error('Unknown canopy font command');
          }
          combined.addPath(path,new DOMMatrix([size/1000,0,0,-size/1000,cursor,baseline]));
          ink[0]=Math.min(ink[0],cursor+box.min.x*size);ink[1]=Math.min(ink[1],baseline-box.max.y*size);
          ink[2]=Math.max(ink[2],cursor+box.max.x*size);ink[3]=Math.max(ink[3],baseline-box.min.y*size);
        }
        cursor+=glyph.advance*size/1000+Math.round(size*.01);
      }
      g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=30;g.shadowOffsetY=8;g.fillStyle='#ffffff';g.fill(combined);
      const material=keep(new T.MeshBasicMaterial({map:texture(c),transparent:true,toneMapped:false,fog:false,depthWrite:false}));
      const uniforms={uIn:{value:-.05},uOut:{value:-.05},uLift:{value:-.05}};
      material.onBeforeCompile=shader=>{
        Object.assign(shader.uniforms,uniforms);
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
          uniform float uIn;uniform float uOut;uniform float uLift;`).replace('#include <map_fragment>',`#include <map_fragment>
          float eIn=uIn+sin(vMapUv.y*43.)*.012,eOut=uOut+sin(vMapUv.y*37.+2.)*.012;
          float vis=(1.-smoothstep(eIn-.02,eIn+.02,vMapUv.x))*smoothstep(eOut-.02,eOut+.02,vMapUv.x);
          float lifted=smoothstep(uLift-.08,uLift+.08,vMapUv.y);
          diffuseColor.a*=vis*${second?'(1.-lifted)':'lifted'};
        `);
      };
      material.customProgramCacheKey=()=>`native-canopy-title-${second}`;
      const mesh=new T.Mesh(keep(new T.PlaneGeometry(16.4,4.1)),material);mesh.position.set(0,.15,-5);mesh.renderOrder=2;mesh.layers.set(1);scene.add(mesh);
      if(!ink.every(Number.isFinite)||ink[0]<0||ink[1]<0||ink[2]>4096||ink[3]>1024)throw new Error('Canopy title ink exceeds its texture');
      return {text,size,ink,mesh,uniforms,font:font.font_sha256};
    }
    const titles=[headline(content.heading,false),headline(content.caption,true)];
    const mote=canvas(64,64),gradient=mote.g.createRadialGradient(32,32,0,32,32,31);
    gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.16,'rgba(255,255,255,.92)');
    gradient.addColorStop(.5,'rgba(255,255,255,.28)');gradient.addColorStop(1,'rgba(255,255,255,0)');mote.g.fillStyle=gradient;mote.g.fillRect(0,0,64,64);
    const dustGeometry=keep(new T.BufferGeometry());dustGeometry.setAttribute('position',new T.Float32BufferAttribute(sampler.dustHome,3));
    const dust=new T.Points(dustGeometry,keep(new T.PointsMaterial({map:texture(mote.c),color:colors.accent,size:.1,transparent:true,opacity:.55,depthWrite:false,blending:T.AdditiveBlending})));scene.add(dust);
    const a=keep(new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType,depthBuffer:true,samples:4}));
    const b=keep(new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType,depthBuffer:false}));
    const depthTarget=keep(new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType,minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:true}));
    const shader=window.ShortCreatorCanopyBokeh,uniforms=T.UniformsUtils.clone(shader.uniforms);
    Object.assign(uniforms,{tColor:{value:a.texture},tDepth:{value:depthTarget.texture},focus:{value:16.4},aspect:{value:width/height},nearClip:{value:.1},farClip:{value:40},toneMappingExposure:{value:1.8}});
    // Apply the source ACES exposure before sharp type; approved white stays white.
    const fragment=shader.fragmentShader.replace('#include <common>','#include <common>\n#include <tonemapping_pars_fragment>')
      .replace('gl_FragColor = col / 41.0;','gl_FragColor = vec4(ACESFilmicToneMapping((col / 41.0).rgb),1.0);');
    const bokeh=keep(new T.ShaderMaterial({defines:{...shader.defines},uniforms,vertexShader:shader.vertexShader,fragmentShader:fragment,toneMapped:false,depthTest:false,depthWrite:false,blending:T.NoBlending}));
    const copy=keep(new T.ShaderMaterial({uniforms:{tDiffuse:{value:b.texture}},vertexShader:shader.vertexShader,
      fragmentShader:'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){gl_FragColor=texture2D(tDiffuse,vUv);}',toneMapped:false,depthTest:false,depthWrite:false,blending:T.NoBlending}));
    const output=keep(new T.MeshBasicMaterial({map:a.texture,toneMapped:false,depthTest:false,depthWrite:false}));
    const passScene=new T.Scene(),passCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(keep(new T.PlaneGeometry(2,2)),bokeh);passScene.add(quad);
    const solidDepth=keep(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide,blending:T.NoBlending}));
    let latest=null,textRows=[];
    function update(state){
      latest=sampler.sample(state.seconds);camera.fov=latest.camera.fov;camera.position.set(...latest.camera.position);camera.rotation.set(...latest.camera.rotation);camera.updateProjectionMatrix();camera.updateMatrixWorld();
      meshes.forEach((mesh,i)=>{const pose=latest.leaves[i];mesh.visible=pose.visible;if(pose.visible){mesh.position.set(...pose.position);mesh.rotation.set(...pose.rotation);}});
      materialRows.forEach(row=>{row.time.value=latest.windTime;});
      titles.forEach((title,i)=>{for(const [key,value]of Object.entries(latest.wipes[i]))title.uniforms[key].value=value;});
      dustGeometry.attributes.position.array.set(latest.dust.positions);dustGeometry.attributes.position.needsUpdate=true;dust.rotation.set(...latest.dust.rotation);
      const fit=Math.min(width/1920,height/1080),blurScale=fit*1920/width;
      uniforms.aperture.value=latest.aperture*blurScale;uniforms.maxblur.value=latest.maxblur*blurScale;
      textRows=titles.map(title=>{
        const [l,t,r,b]=title.ink,corners=[[l,t],[r,t],[r,b],[l,b]].map(([x,y])=>new T.Vector3((x/4096-.5)*16.4,.15+(.5-y/1024)*4.1,-5).project(camera));
        const points=corners.map(p=>[(p.x*.5+.5)*width,(.5-p.y*.5)*height]);
        const box=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
        const size=title.size/1024*4.1*height/(2*Math.tan(camera.fov*Math.PI/360)*(camera.position.z+5));
        if(size<44||box[0]<0||box[1]<0||box[2]>width||box[3]>height)throw new Error('Canopy title is unreadable or outside its native board; shorten it');
        return {text:title.text,font:title.font,size,box,wipe:Object.fromEntries(Object.entries(title.uniforms).map(([key,u])=>[key,u.value]))};
      });return [];
    }
    function draw(){
      const old={target:renderer.getRenderTarget(),clear:renderer.autoClear,color:renderer.getClearColor(new T.Color()),alpha:renderer.getClearAlpha(),tone:renderer.toneMapping,
        shadows:renderer.shadowMap.enabled,type:renderer.shadowMap.type,autoShadow:renderer.shadowMap.autoUpdate,layers:camera.layers.mask,background:scene.background};
      const swapped=[];
      try{
        renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=true;
        renderer.autoClear=true;camera.layers.set(0);renderer.setRenderTarget(a);renderer.clear();renderer.render(scene,camera);
        renderer.shadowMap.autoUpdate=false;scene.background=null;dust.visible=false;
        scene.traverse(object=>{if(!object.isMesh||!camera.layers.test(object.layers))return;swapped.push([object,object.material]);object.material=object.userData.canopyDepth||solidDepth;});
        renderer.setClearColor(0xffffff,1);renderer.setRenderTarget(depthTarget);renderer.clear();renderer.render(scene,camera);
        for(const [object,material]of swapped)object.material=material;swapped.length=0;dust.visible=true;
        quad.material=bokeh;renderer.setRenderTarget(b);renderer.clear();renderer.render(passScene,passCamera);
        // Preserve the original alpha-cut foliage depth while copying blurred color.
        renderer.autoClear=false;quad.material=copy;renderer.setRenderTarget(a);renderer.render(passScene,passCamera);
        camera.layers.set(1);renderer.render(scene,camera);
        renderer.autoClear=true;quad.material=output;renderer.setRenderTarget(null);renderer.setClearColor(bg,1);renderer.clear();renderer.render(passScene,passCamera);
      }finally{
        for(const [object,material]of swapped)object.material=material;dust.visible=true;scene.background=old.background;camera.layers.mask=old.layers;
        renderer.setRenderTarget(old.target);renderer.autoClear=old.clear;renderer.setClearColor(old.color,old.alpha);renderer.toneMapping=old.tone;
        renderer.shadowMap.enabled=old.shadows;renderer.shadowMap.type=old.type;renderer.shadowMap.autoUpdate=old.autoShadow;
      }
    }
    function inspect(){return {seconds:latest?.seconds,leaves:meshes.map(mesh=>({visible:mesh.visible,position:mesh.visible?mesh.position.toArray():null,
      rotation:mesh.visible?mesh.rotation.toArray().slice(0,3):null,scale:mesh.scale.x,vertices:mesh.geometry.attributes.position.count})),
      camera:{position:camera.position.toArray(),rotation:camera.rotation.toArray().slice(0,3),fov:camera.fov},titles:textRows,
      species:materialRows.map(row=>({kind:row.kind,windTime:row.time.value,alphaTest:row.material.alphaTest,depthSharesWind:row.depth.onBeforeCompile!==T.Material.prototype.onBeforeCompile})),
      dustCount:dustGeometry.attributes.position.count,dustRotation:dust.rotation.toArray().slice(0,3),dustSample:Array.from(dustGeometry.attributes.position.array.slice(0,30)),
      geometryCount:geometryCache.size,retainedBreeze:0,aperture:uniforms.aperture.value,maxblur:uniforms.maxblur.value,focus:uniforms.focus.value,passes:6,shadowMapSize:sun.shadow.mapSize.toArray()};}
    return {camera,update,draw,inspect};
  }
  window.ShortCreatorCanopy=Object.freeze({build,wind,dimensions});
})();
