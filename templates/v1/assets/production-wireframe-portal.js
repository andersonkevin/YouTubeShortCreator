/* HyperFrames wireframe-portal-title, Apache-2.0. Approved nonzero font paths,
   bounded source choreography and explicit local render targets replace the
   source CDN/font/composer runtime. Screen-space outlines retain 1.5px width. */
(() => {
  'use strict';
  const motion=window.ShortCreatorWireframeMotion;
  const vertex=`
    attribute vec3 instanceStart;
    attribute vec3 instanceEnd;
    uniform vec2 resolution;
    uniform float linewidth;
    varying vec2 edge;
    void main() {
      vec4 a=modelViewMatrix*vec4(instanceStart,1.0);
      vec4 b=modelViewMatrix*vec4(instanceEnd,1.0);
      // Keep segments finite during the source camera's forward rush.
      if(a.z>-.1 && b.z>-.1){gl_Position=vec4(2.,2.,2.,1.);edge=vec2(2.);return;}
      if(a.z>-.1)a=mix(a,b,(-.1-a.z)/(b.z-a.z));
      if(b.z>-.1)b=mix(b,a,(-.1-b.z)/(a.z-b.z));
      vec4 start=projectionMatrix*a,stop=projectionMatrix*b;
      vec2 direction=(stop.xy/stop.w-start.xy/start.w)*resolution*.5;
      direction/=max(length(direction),.00001);
      vec2 normal=vec2(-direction.y,direction.x);
      float cap=position.y<0.?-1.:(position.y>1.?1.:0.);
      vec4 clip=position.y<.5?start:stop;
      clip.xy+=(normal*position.x+direction*cap)*linewidth/resolution*clip.w;
      gl_Position=clip;edge=position.xy;
    }`;
  const fragment=`
    uniform vec3 color;
    uniform float opacity;
    varying vec2 edge;
    void main() {
      float y=edge.y<0.?edge.y:(edge.y>1.?edge.y-1.:0.);
      float distanceToEdge=length(vec2(edge.x,y));
      float aa=max(fwidth(distanceToEdge),.0001);
      float coverage=1.-smoothstep(1.-aa,1.+aa,distanceToEdge);
      if(coverage<=0.)discard;
      gl_FragColor=vec4(color,opacity*coverage);
    }`;
  function outline(T,geometry,keep,width=1.5,threshold=20) {
    const edges=new T.EdgesGeometry(geometry,threshold),positions=edges.attributes.position.array;
    const start=[],end=[];
    for(let i=0;i<positions.length;i+=6){start.push(...positions.slice(i,i+3));end.push(...positions.slice(i+3,i+6));}
    edges.dispose();
    const meshGeometry=keep(new T.InstancedBufferGeometry());
    meshGeometry.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,1,-1,0,-1,0,0,1,0,0,-1,1,0,1,1,0,-1,2,0,1,2,0],3));
    meshGeometry.setIndex([0,1,2,2,1,3,2,3,4,4,3,5,4,5,6,6,5,7]);
    meshGeometry.setAttribute('instanceStart',new T.InstancedBufferAttribute(new Float32Array(start),3));
    meshGeometry.setAttribute('instanceEnd',new T.InstancedBufferAttribute(new Float32Array(end),3));
    meshGeometry.instanceCount=start.length/3;
    const material=keep(new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,
      uniforms:{resolution:{value:new T.Vector2()},linewidth:{value:width},color:{value:new T.Color(0xffffff)},opacity:{value:1}},
      transparent:true,depthWrite:false,side:T.DoubleSide}));
    const mesh=new T.Mesh(meshGeometry,material);mesh.frustumCulled=false;
    return mesh;
  }
  function path2d(commands) {
    const path=new Path2D();
    for(const [kind,...p]of commands){
      if(kind==='M')path.moveTo(...p);else if(kind==='L')path.lineTo(...p);
      else if(kind==='Q')path.quadraticCurveTo(...p);else if(kind==='C')path.bezierCurveTo(...p);
      else if(kind==='Z')path.closePath();else throw new Error('Unknown portal font path');
    }
    return path;
  }
  function build({T,renderer,scene,keep,colors,width,height,content,font}) {
    if(font?.normalization!=='nonzero'||font.units!==1000||font.version!==1||!font.font_sha256)
      throw new Error('Approved normalized portal outlines unavailable');
    const fit=Math.min(width/1920,height/1080),offsetX=(width-1920*fit)/2,offsetY=(height-1080*fit)/2;
    const camera=new T.PerspectiveCamera(100,width/height,.1,500),gridScene=new T.Scene();
    renderer.toneMapping=T.NoToneMapping;
    const endColor=new T.Color(colors.background),startColor=endColor.clone().convertLinearToSRGB().lerp(new T.Color(0xffffff),.07).convertSRGBToLinear();
    const surface='#'+startColor.getHexString();
    const shaders=window.ShortCreatorWireframeShaders.create(T,width,height,{surface,foreground:'#ffffff'});
    const background=keep(new T.MeshBasicMaterial({color:startColor,side:T.DoubleSide}));
    const ground=new T.Mesh(keep(new T.PlaneGeometry(500,500)),background);ground.position.z=-100;ground.renderOrder=-10;gridScene.add(ground);
    const gridGeometry=keep(new T.BufferGeometry());gridGeometry.setAttribute('position',new T.Float32BufferAttribute(motion.gridPositions(),3));
    const gridMaterial=keep(new T.ShaderMaterial({...shaders.GridLineShader,transparent:true,depthWrite:false}));
    const grid=new T.LineSegments(gridGeometry,gridMaterial);grid.position.x=-14.5;gridScene.add(grid);
    scene.add(new T.AmbientLight(0xffffff,.5));
    const light=new T.DirectionalLight(0xffffff,4.25);light.position.set(2,-2.5,4.5);scene.add(light);
    const triangles=[];
    for(let i=0;i<4;i++){
      const size=motion.trianglePose(0,i).size,h=size*Math.sqrt(3)/2,shape=new T.Shape();
      shape.moveTo(0,h*.66);shape.lineTo(-size/2,-h*.33);shape.lineTo(size/2,-h*.33);shape.closePath();
      const geometry=keep(new T.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:2}));
      geometry.center();const mesh=new T.Mesh(geometry,keep(new T.MeshStandardMaterial({color:i===2?colors.background:colors.accent,roughness:.4,metalness:.1})));
      scene.add(mesh);triangles.push(mesh);
    }
    const contentGroup=new T.Group();scene.add(contentGroup);
    const geometryCache=new Map(),paths=new Map(),details=[];
    function glyphGeometry(char,size=10,depth=2) {
      const glyph=font.glyphs[char];if(!glyph)throw new Error('Approved portal font lacks a glyph');
      const key=char+':'+size+':'+depth;if(geometryCache.has(key))return geometryCache.get(key);
      const shapes=window.ShortCreatorExtrudedLogo.shapes(T,glyph.commands,size);
      const geometry=keep(new T.ExtrudeGeometry(shapes,{depth,bevelEnabled:false,curveSegments:12}));
      geometry.computeBoundingBox();const bounds=geometry.boundingBox.clone();geometry.center();
      const row={geometry,bounds,shapes:shapes.length,holes:shapes.reduce((n,s)=>n+s.holes.length,0)};
      geometryCache.set(key,row);return row;
    }
    function makeGlyph(char,rect,random) {
      const row=glyphGeometry(char),box=row.bounds;
      const data=motion.letterData(char,rect,box.max.x-box.min.x,box.max.y-box.min.y,random);
      const group=new T.Group(),face=new T.Mesh(row.geometry,keep(new T.MeshBasicMaterial({color:colors.background,side:T.DoubleSide,transparent:true})));
      const wire=outline(T,row.geometry,keep);wire.material.uniforms.resolution.value.set(width,height);
      group.add(face,wire);contentGroup.add(group);group.userData=data;
      details.push({char,shapes:row.shapes,holes:row.holes,vertices:row.geometry.attributes.position.count,segments:wire.geometry.instanceCount});
      return group;
    }
    function flatLine(text,size,baseline,tracking=0) {
      const advances=[...text].map(char=>{
        const glyph=font.glyphs[char];if(!glyph)throw new Error('Approved portal font lacks a glyph');return glyph.advance*size/1000+tracking;
      });
      const span=advances.reduce((a,b)=>a+b,0)-tracking;
      if(span>1760)throw new Error('Portal supporting copy exceeds the approved readable width; shorten it');
      let x=(1920-span)/2;
      const letters=[...text].map((char,i)=>{const row={char,x,baseline,size};x+=advances[i];return row;});
      return {text,size,baseline,width:span,letters};
    }
    const titleWidth=[...content.word].reduce((n,ch)=>n+(font.glyphs[ch]?.advance??0)*.176+5.28,0)-5.28;
    const titleSize=Math.min(176,176*1760/titleWidth);
    if(titleSize*fit<44)throw new Error('Portal title is too small; shorten it');
    const title=flatLine(content.word,titleSize,610,titleSize*.03),kicker=flatLine(content.heading,42,405),subtitle=flatLine(content.caption,56,720);
    const flatRows=[kicker,title,subtitle].map(line=>{
      const bounds=new T.Box2();
      for(const item of line.letters)if(item.char!==' '){
        const shapes=window.ShortCreatorExtrudedLogo.shapes(T,font.glyphs[item.char].commands,1);
        for(const shape of shapes)for(const point of shape.getPoints(12))
          bounds.expandByPoint(new T.Vector2(offsetX+(item.x+point.x*item.size)*fit,offsetY+(item.baseline-point.y*item.size)*fit));
      }
      const box=[bounds.min.x,bounds.min.y,bounds.max.x,bounds.max.y];
      if(box[0]<0||box[1]<0||box[2]>width||box[3]>height)throw new Error('Portal text escapes its native board');
      return {text:line.text,size:line.size*fit,box};
    });
    for(let i=0;i<flatRows.length;i++)for(let j=i+1;j<flatRows.length;j++){
      const [a,b]=[flatRows[i].box,flatRows[j].box];
      if(a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1])throw new Error('Portal text lines overlap');
    }
    const initialRandom=motion.seeded(20260824),phraseRandom=motion.seeded(20260831),sourceLetters=[];
    for(const item of title.letters){
      if(item.char===' ')continue;
      const row=glyphGeometry(item.char),scale=item.size/10,box=row.bounds;
      // The same approved outlines define flat ink and the initial 3D rectangle.
      const rect={left:item.x+box.min.x*scale,top:item.baseline-box.max.y*scale,
        width:(box.max.x-box.min.x)*scale,height:(box.max.y-box.min.y)*scale};
      sourceLetters.push(makeGlyph(item.char,rect,initialRandom));
    }
    const layout=motion.layoutPhrase(content.phrase,char=>font.glyphs[char].advance*.176),targetLetters=[];
    if(176*layout.scale*fit<36)throw new Error('Portal phrase is too small; shorten it');
    for(const item of layout.glyphs){
      const group=makeGlyph(item.char,item.rect,phraseRandom);group.userData=motion.perspectiveCorrect(group.userData);targetLetters.push(group);
    }
    const slots=motion.matchLetters(sourceLetters.map(g=>g.userData),targetLetters.map(g=>g.userData),phraseRandom);
    const supporting=[];
    for(const line of [kicker,subtitle]){
      const shapes=[];
      for(const item of line.letters)if(item.char!==' '){
        const contours=window.ShortCreatorExtrudedLogo.shapes(T,font.glyphs[item.char].commands,1);
        const geometry=keep(new T.ExtrudeGeometry(contours,{depth:.02,bevelEnabled:false,curveSegments:12}));
        // Use separate glyph meshes so font counters and exact advances remain intact.
        const visH=44*Math.tan(50*Math.PI/180),units=visH/1080;
        const group=new T.Group(),face=new T.Mesh(geometry,keep(new T.MeshBasicMaterial({color:colors.background,side:T.DoubleSide,transparent:true})));
        const wire=outline(T,geometry,keep,1.05,40);wire.material.uniforms.resolution.value.set(width,height);
        group.add(face,wire);group.position.set((item.x-960)*units,(540-line.baseline)*units,0);group.scale.setScalar(line.size*units);
        contentGroup.add(group);shapes.push(group);
      }
      supporting.push(shapes);
    }
    for(const char of new Set(content.word+content.heading+content.caption))if(char!==' ')paths.set(char,path2d(font.glyphs[char].commands));
    const a=keep(new T.WebGLRenderTarget(width,height,{format:T.RGBAFormat,type:T.HalfFloatType,depthBuffer:true,samples:4}));
    const b=keep(new T.WebGLRenderTarget(width,height,{format:T.RGBAFormat,type:T.HalfFloatType,depthBuffer:false}));
    const passScene=new T.Scene(),passCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(keep(new T.PlaneGeometry(2,2)),undefined);
    passScene.add(quad);
    const passes=['EdgeBlurShader','EdgeBlurShader','PostFXShader','GlitchShader','TransitionFXShader','PortalCompositeShader'].map(name=>keep(new T.ShaderMaterial({
      uniforms:T.UniformsUtils.clone(shaders[name].uniforms),vertexShader:shaders[name].vertexShader,fragmentShader:shaders[name].fragmentShader,
      depthTest:false,depthWrite:false,blending:T.NoBlending})));
    passes[1].uniforms.uDirection.value.set(0,1);
    const output=keep(new T.MeshBasicMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
    let latest=null,hand=null;
    function setGlyph(group,pose) {
      if(!group||!pose)return;group.visible=pose.visible;group.position.set(...pose.position);group.rotation.set(...pose.rotation);group.scale.set(...pose.scale);
      group.children[0].material.opacity=pose.opacity;group.children[0].material.depthWrite=pose.opacity>.995;
      const wire=group.children[1].material;wire.uniforms.opacity.value=pose.outlineOpacity;
      wire.uniforms.color.value.set(0xffffff).lerp(new T.Color(colors.background),1-pose.haze);wire.depthWrite=pose.opacity>.995;
    }
    function update(state) {
      latest=state;const t=state.seconds,p=state.portal,pose=motion.cameraPose(t);
      camera.fov=2*Math.atan(Math.tan(pose.fov*Math.PI/360)*Math.max(1,(16/9)/(width/height)))*180/Math.PI;
      camera.position.set(...pose.position);camera.rotation.set(...pose.rotation);camera.updateProjectionMatrix();camera.updateMatrixWorld();
      hand=motion.handoff(t,slots,targetLetters.length,(x,y,z)=>new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse).z);
      slots.forEach((slot,i)=>{setGlyph(slot.from===null?null:sourceLetters[slot.from],hand.letters[i].from);setGlyph(slot.to===null?null:targetLetters[slot.to],hand.letters[i].to);});
      supporting.forEach((letters,i)=>{const fade=motion.supportingPose(t,i);for(const group of letters){
        group.position.z=fade.z;group.visible=fade.visible;group.children[0].material.opacity=fade.opacity;
        const wire=group.children[1].material;wire.uniforms.opacity.value=fade.outlineOpacity;
        wire.uniforms.color.value.set(0xffffff).lerp(new T.Color(colors.background),1-fade.haze);
      }});
      contentGroup.position.z=30*p;contentGroup.visible=grid.visible=ground.visible=p>.01;
      background.color.copy(startColor).lerp(endColor,Math.max(0,Math.min(1,(p-.15)*1.7)));
      triangles.forEach((mesh,i)=>{const pose=motion.trianglePose(t,i);mesh.position.set(...pose.position);mesh.rotation.set(...pose.rotation);});
      gridMaterial.uniforms.uTime.value=t;gridMaterial.uniforms.uCameraPos.value.copy(camera.position);
      for(const pass of passes)if(pass.uniforms.uTime)pass.uniforms.uTime.value=t;
      for(const pass of passes.slice(0,2))pass.uniforms.uBlurAmount.value=50*p;
      Object.assign(passes[2].uniforms.uVignetteIntensity,{value:1.7*p});passes[2].uniforms.uChromaticAberration.value=.006*p;passes[2].uniforms.uScanlineIntensity.value=.25*p;
      passes[3].uniforms.uShakePower.value=hand.shakePower;passes[3].uniforms.uShakeRate.value=hand.shakeRate;passes[3].uniforms.uShakeColorRate.value=hand.shakeColorRate;
      passes[4].uniforms.uTransAmount.value=state.transition;passes[5].uniforms.uPortalRadius.value=p*.8;passes[5].uniforms.uPortalProgress.value=p;
      return [];
    }
    function draw() {
      renderer.setRenderTarget(null);renderer.clear();if(latest.portal<.001)return;
      const auto=renderer.autoClear;
      try{
        renderer.autoClear=false;renderer.setRenderTarget(a);renderer.clear();renderer.render(gridScene,camera);renderer.render(scene,camera);
        let input=a,target=b;
        for(const pass of passes){pass.uniforms.tDiffuse.value=input.texture;quad.material=pass;renderer.setRenderTarget(target);renderer.clear();renderer.render(passScene,passCamera);[input,target]=[target,input];}
        output.map=input.texture;quad.material=output;renderer.setRenderTarget(null);renderer.clear();renderer.render(passScene,passCamera);
      }finally{renderer.autoClear=auto;renderer.setRenderTarget(null);}
    }
    function paint(context) {
      const s=latest;context.clearRect(0,0,width,height);context.fillStyle=surface;context.fillRect(0,0,width,height);
      context.save();context.translate(offsetX,offsetY);context.scale(fit,fit);
      function line(row,alpha,yOffset=0,stagger=false) {
        row.letters.forEach((item,i)=>{if(item.char===' ')return;const opacity=stagger?s.letters[i]:alpha;
          context.save();context.globalAlpha=opacity;context.fillStyle='#ffffff';
          context.translate(item.x,item.baseline+yOffset*(1-opacity));context.scale(item.size/1000,-item.size/1000);
          context.fill(paths.get(item.char),'nonzero');context.restore();});
      }
      if(s.cardVisible){line(kicker,s.kicker,-24);line(title,1,44,true);line(subtitle,s.subtitle,18);}
      context.restore();context.drawImage(renderer.domElement,0,0);
      context.save();context.translate(offsetX,offsetY);context.scale(fit,fit);context.fillStyle=context.strokeStyle=colors.secondary;
      for(const dot of motion.warpDots(s.seconds)){
        context.globalAlpha=dot.alpha;context.beginPath();context.arc(dot.x,dot.y,dot.size,0,Math.PI*2);context.fill();
        if(dot.streak){context.globalAlpha=dot.alpha*.3;context.lineWidth=dot.size*.5;context.beginPath();context.moveTo(dot.x,dot.y);context.lineTo(dot.endX,dot.endY);context.stroke();}
      }
      context.restore();context.save();context.globalAlpha=s.plate;context.fillStyle=colors.background;context.fillRect(0,0,width,height);context.restore();
    }
    function inspect() {
      const actual=group=>group?{position:group.position.toArray(),rotation:group.rotation.toArray().slice(0,3),
        scale:group.scale.toArray(),visible:group.visible,opacity:group.children[0].material.opacity,
        outlineOpacity:group.children[1].material.uniforms.opacity.value}:null;
      return {font:font.font_sha256,normalization:font.normalization,word:content.word,phrase:content.phrase,
        heading:content.heading,caption:content.caption,details,sourceLetters:sourceLetters.length,targetLetters:targetLetters.length,
        lineWidth:1.5,gridSegments:3675,warpCount:1000,passes:passes.length+3,
        camera:{fov:camera.fov,position:camera.position.toArray(),rotation:camera.rotation.toArray().slice(0,3)},
        titleSize:titleSize*fit,phraseSize:176*layout.scale*fit,flatRows,slots:slots.map(s=>({from:s.from,to:s.to,sameGlyph:s.sameGlyph})),
        sourceData:sourceLetters.map(g=>g.userData),targetData:targetLetters.map(g=>g.userData),
        letters:slots.map(slot=>({from:actual(slot.from===null?null:sourceLetters[slot.from]),to:actual(slot.to===null?null:targetLetters[slot.to])})),
        portal:latest?.portal,plate:latest?.plate};
    }
    return {camera,update,draw,paint,inspect};
  }
  window.ShortCreatorWireframePortal=Object.freeze({build,outline,path2d});
})();
