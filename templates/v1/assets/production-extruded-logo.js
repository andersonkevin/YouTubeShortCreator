/* HyperFrames extruded-logo, Apache-2.0. Actual approved-font outlines replace
   the bundled Geist face; native cues and brand tokens replace demo controls. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  function pose(seconds,count) {
    if(!Number.isFinite(seconds)||!Number.isInteger(count)||count<1||count>8)throw new Error('Invalid extruded title pose');
    const t=Math.max(0,Math.min(5,seconds)),p=clamp((t-.9)/3.4),swing=p<.5?4*p**3:1-(-2*p+2)**3/2;
    const letters=Array.from({length:count},(_,i)=>{
      const x=clamp((t-.1-i*.13)/.9)-1,u=1+2.2*x**3+1.2*x**2;
      return {rotation:(1-u)*(-Math.PI/2),y:(1-clamp(u))*-.2,visible:t>=.1+i*.13};
    });
    return {seconds:t,letters,rotationY:-.42+swing*.42,rotationX:.04-swing*.04,tagline:1-(1-clamp((t-1.7)/.6))**3};
  }
  function shapes(T,commands,size=1.5) {
    if(!Number.isFinite(size)||size<=0||size>10)throw new Error('Invalid approved-font geometry size');
    const path=new T.ShapePath(),scale=size/1000;
    for(const [kind,...raw] of commands) {
      const p=raw.map(x=>x*scale);
      if(kind==='M')path.moveTo(...p);
      else if(kind==='L')path.lineTo(...p);
      else if(kind==='Q')path.quadraticCurveTo(...p);
      else if(kind==='C')path.bezierCurveTo(...p);
      else if(kind==='Z')path.currentPath.closePath();
      else throw new Error('Unknown approved-font path command');
    }
    if(!path.subPaths.length)throw new Error('Empty extruded glyph');
    const largest=path.subPaths.reduce((a,b)=>Math.abs(T.ShapeUtils.area(a.getPoints(10)))>=Math.abs(T.ShapeUtils.area(b.getPoints(10)))?a:b);
    return path.toShapes(!T.ShapeUtils.isClockWise(largest.getPoints(10)));
  }
  function build({T,renderer,scene,keep,texture,canvas,colors,width,height,content,font}) {
    if(font?.units!==1000||font.version!==1||!font.font_sha256)throw new Error('Approved display-font outlines unavailable');
    const studio=new T.Scene();studio.background=new T.Color(colors.background);
    function softbox(w,h,x,y,z,color,power) {
      const material=keep(new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(power),side:T.DoubleSide}));
      const panel=new T.Mesh(keep(new T.PlaneGeometry(w,h)),material);panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);
    }
    softbox(10,2.2,0,7,1,0xffffff,3);softbox(1.2,7,-7,1,2,0xffffff,2.2);
    softbox(1.2,7,7,1,-1,0xffffff,1.6);softbox(9,1.4,0,.5,-7,colors.secondary,2);
    const bars=canvas(1024,256),fade=bars.g.createLinearGradient(0,0,0,256);
    fade.addColorStop(0,'#9a9ca3');fade.addColorStop(1,'#15161a');bars.g.fillStyle=fade;bars.g.fillRect(0,0,1024,256);
    bars.g.fillStyle='#ffffff';for(const [x,w] of [[150,60],[430,140],[760,36]])bars.g.fillRect(x,0,w,256);
    const mirror=new T.Mesh(keep(new T.PlaneGeometry(22,8)),keep(new T.MeshBasicMaterial({
      map:texture(bars.c),color:new T.Color(2.2,2.2,2.2),side:T.DoubleSide})));
    mirror.position.set(0,1,9);mirror.lookAt(0,1,0);studio.add(mirror);
    const pmrem=new T.PMREMGenerator(renderer);
    try {scene.environment=keep(pmrem.fromScene(studio,.01)).texture;} finally {pmrem.dispose();}
    const fov=2*Math.atan(Math.tan(13*Math.PI/180)*Math.max(1,(16/9)/(width/height)))*180/Math.PI;
    const camera=new T.PerspectiveCamera(fov,width/height,.1,100);camera.position.set(0,.9,11);camera.lookAt(0,.35,0);camera.updateMatrixWorld();
    const rim=new T.DirectionalLight(colors.secondary,5);rim.position.set(0,3,-6);scene.add(rim);
    const light=new T.DirectionalLight(0xffffff,1.4);light.position.set(-5,4,6);scene.add(light);
    const finishes={chrome:{color:0xffffff,metalness:1,roughness:.16},
      'accent-metal':{color:colors.accent,metalness:1,roughness:.2},matte:{color:0xffffff,metalness:0,roughness:.62}};
    if(!Object.hasOwn(finishes,content.finish))throw new Error('Unknown extruded finish');
    const material=keep(new T.MeshStandardMaterial(finishes[content.finish])),word=new T.Group();scene.add(word);
    const letters=[],details=[];let cursor=0;
    for(const ch of content.word) {
      const glyph=font.glyphs[ch];if(!glyph)throw new Error('Approved font lacks extruded glyph');
      const advance=glyph.advance*.0015;
      if(ch!==' ') {
        const contours=shapes(T,glyph.commands),geometry=keep(new T.ExtrudeGeometry(contours,{
          depth:.42,curveSegments:10,bevelEnabled:true,bevelThickness:.06,bevelSize:.035,bevelSegments:5,steps:1}));
        geometry.computeBoundingBox();const box=geometry.boundingBox;
        geometry.translate(-(box.min.x+box.max.x)/2,0,-.21);
        const pivot=new T.Group();pivot.position.x=cursor+advance/2;pivot.add(new T.Mesh(geometry,material));word.add(pivot);letters.push(pivot);
        details.push({character:ch,advance,shapes:contours.length,holes:contours.reduce((n,s)=>n+s.holes.length,0),vertices:geometry.attributes.position.count});
      }
      cursor+=advance+.08;
    }
    const span=cursor-.08;for(const p of letters)p.position.x-=span/2;word.scale.setScalar(Math.min(1,7.4/span));
    const shadow=canvas(512,128),gradient=shadow.g.createRadialGradient(256,64,0,256,64,256);
    gradient.addColorStop(0,'rgba(0,0,0,.6)');gradient.addColorStop(1,'rgba(0,0,0,0)');
    shadow.g.setTransform(1,0,0,.25,0,48);shadow.g.fillStyle=gradient;shadow.g.fillRect(0,0,512,512);
    const floor=new T.Mesh(keep(new T.PlaneGeometry(Math.min(span,7.4)*1.25,1.4)),keep(new T.MeshBasicMaterial({map:texture(shadow.c),transparent:true,depthWrite:false})));
    floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);
    return {camera,update(state) {
      letters.forEach((p,i)=>{p.rotation.x=state.letters[i].rotation;p.position.y=state.letters[i].y;p.visible=state.letters[i].visible;});
      word.rotation.set(state.rotationX,state.rotationY,0);word.updateMatrixWorld(true);return [];
    },inspect() {
      const points=[];
      for(const p of letters) {
        if(!p.visible)continue;
        const box=new T.Box3().setFromObject(p);
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
          const point=new T.Vector3(x,y,z).project(camera);points.push([(point.x*.5+.5)*width,(-point.y*.5+.5)*height]);
        }
      }
      return {font:font.font_sha256,word:content.word,finish:content.finish,details,scale:word.scale.x,
        bounds:points.length?[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]:null,
        rotation:[word.rotation.x,word.rotation.y],letters:letters.map(p=>({rotation:p.rotation.x,y:p.position.y,visible:p.visible}))};
    }};
  }
  window.ShortCreatorExtrudedLogo={pose,shapes,build};
})();
