/* HyperFrames iOS/macOS Canvas glass compositions, Apache-2.0.
   Original geometry/easing; explicit copy and pinned icons replace demo identity. */
(() => {
  'use strict';
  const motion=window.ShortCreatorDeviceGlassMotion;
  const round=(g,x,y,w,h,r)=>{g.beginPath();g.roundRect(x,y,w,h,r);};
  function iconIds(c){
    const ids=c.style==='phone-glass'?c.notifications.map(n=>n.icon):
      [c.notification.icon,...c.desktop.window.sidebar.map(n=>n.icon),...c.desktop.dock];
    return [...new Set(ids)];
  }
  function calendar(date){
    return {first:new Date(Date.UTC(date.year,date.month-1,1)).getUTCDay(),
      days:new Date(Date.UTC(date.year,date.month,0)).getUTCDate(),selected:date.day,
      label:['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'][date.month-1]};
  }
  function paint(g,buffer,image,icons,c,state,colors){
    const phone=c.style==='phone-glass',width=phone?390:1440,height=phone?844:900;
    const scale=Math.min(width/image.naturalWidth,height/image.naturalHeight);
    const placement={x:(width-image.naturalWidth*scale)/2,y:(height-image.naturalHeight*scale)/2,width:image.naturalWidth*scale,height:image.naturalHeight*scale};
    g.clearRect(0,0,width,height);g.fillStyle=colors.background;g.fillRect(0,0,width,height);
    g.drawImage(image,placement.x,placement.y,placement.width,placement.height);
    const copy=[],notifications=[];
    function text(value,x,y,size,weight,limit,align='left',color=colors.background){
      g.font=weight+' '+size+'px BrandSans';g.textBaseline='top';g.textAlign=align;
      const measured=g.measureText(value).width;
      if(measured>limit+.01)throw new Error('Device glass copy exceeds its readable slot: '+value);
      g.fillStyle=color;g.fillText(value,x,y);copy.push({text:value,font:g.font,width:measured,limit,x,y});
    }
    function body(value,x,y,limit,size=12){
      g.font='600 '+size+'px BrandSans';const lines=[''];
      for(const word of value.split(' ')){
        const i=lines.length-1,next=lines[i]?lines[i]+' '+word:word;
        if(g.measureText(next).width<=limit)lines[i]=next;else lines.push(word);
      }
      if(lines.length>2||lines.some(line=>!line))throw new Error('Device glass body exceeds two readable lines');
      lines.forEach((line,i)=>text(line,x,y+i*(size+2),size,600,limit));
    }
    function icon(id,x,y,w,h,r){
      const item=icons.get(id);if(!item||!item.complete||!item.naturalWidth)throw new Error('Pinned device icon is not decoded');
      g.save();round(g,x,y,w,h,r);g.clip();g.fillStyle=colors.background;g.fillRect(x,y,w,h);g.drawImage(item,x,y,w,h);g.restore();
    }
    function panel(x,y,w,h,r){
      g.save();g.shadowColor='rgba(7,47,96,.2)';g.shadowBlur=24;g.shadowOffsetY=12;
      round(g,x,y,w,h,r);g.fillStyle='rgba(255,255,255,.72)';g.fill();
      const gradient=g.createLinearGradient(x,y,x+w,y+h);
      gradient.addColorStop(0,'rgba(255,255,255,.82)');gradient.addColorStop(.46,'rgba(245,253,255,.42)');gradient.addColorStop(1,'rgba(211,237,255,.3)');
      g.fillStyle=gradient;g.fill();g.shadowColor='transparent';g.lineWidth=1.25;g.strokeStyle='rgba(255,255,255,.72)';g.stroke();
      round(g,x+2,y+2,w-4,h-4,Math.max(0,r-2));g.strokeStyle='rgba(255,255,255,.24)';g.stroke();g.restore();
    }
    if(phone){
      buffer.g.clearRect(0,0,width,height);buffer.g.drawImage(g.canvas,0,0);
      c.notifications.forEach((n,index)=>{
        const q=motion.notification(state['iosN'+(index+1)]),lift=Math.sin(q*Math.PI);
        const x=13,y=106+index*68+(1-q)*-58+lift*6,w=364,h=66+lift*2;
        notifications.push({q,x,y,w,h,icon:n.icon,title:n.title,time:n.time,body:n.body});
        if(q<=.001)return;
        g.save();g.globalAlpha=q*.98;g.shadowColor='rgba(0,0,0,.54)';g.shadowBlur=22;g.shadowOffsetY=14;
        round(g,x,y,w,h,23);g.clip();g.filter='blur(12px) saturate(1.55) brightness(1.24)';
        g.drawImage(buffer.c,-4,-4,398,852);g.filter='none';
        panel(x,y,w,h,23);
        g.globalCompositeOperation='screen';const caustic=g.createLinearGradient(x+40,y,x+w-20,y+h);
        caustic.addColorStop(0,'rgba(255,255,255,.18)');caustic.addColorStop(.36,colors.secondary);caustic.addColorStop(.64,colors.accent);caustic.addColorStop(1,'rgba(255,255,255,.08)');
        g.globalAlpha=q*.12;g.fillStyle=caustic;g.fillRect(x,y,w,h);g.globalAlpha=q*.98;g.globalCompositeOperation='source-over';
        g.shadowColor='transparent';g.beginPath();g.moveTo(x+24,y+11);g.bezierCurveTo(x+105,y-2,x+220,y+7,x+w-42,y+12);
        g.strokeStyle='rgba(255,255,255,.38)';g.lineWidth=2;g.stroke();
        icon(n.icon,x+10,y+14,38,38,11);
        text(n.title,x+60,y+13,13,800,220);text(n.time,x+w-14,y+13,12,800,60,'right');
        body(n.body,x+60,y+34,w-74);g.restore();
      });
      return {placement,notifications,copy,calendar:null};
    }
    const d=c.desktop,menu=d.menu,window=d.window,cal=calendar(d.calendar);
    panel(0,0,1440,28,0);text(menu.app,50,7,14,800,140);
    menu.items.forEach((item,i)=>text(item,210+i*70,9,11,600,66));text(menu.status,1414,9,11,600,600,'right');
    panel(28,48,100,124,18);text(cal.label,44,60,8,800,76);
    ['S','M','T','W','T','F','S'].forEach((day,i)=>text(day,42+i*10,80,7,800,9));
    for(let day=1;day<=cal.days;day++){
      const index=cal.first+day-1,x=42+index%7*10,y=95+Math.floor(index/7)*11;
      if(day===cal.selected){g.fillStyle=colors.accent;g.beginPath();g.arc(x+3,y+4,6,0,Math.PI*2);g.fill();}
      text(String(day),x,y,7,800,10);
    }
    panel(138,48,112,124,18);text(d.status.label,150,62,9,800,88);
    text(d.status.value,150,83,26,800,88);text(d.status.detail,150,130,8,600,88);text(d.status.note,150,144,8,600,88);
    panel(28,182,222,92,22);const pg=g.createLinearGradient(44,200,116,256);
    pg.addColorStop(0,colors.accent);pg.addColorStop(.52,colors.secondary);pg.addColorStop(1,colors.surface);
    round(g,44,200,72,56,14);g.fillStyle=pg;g.fill();
    text(d.media.title,130,205,12,800,108);text(d.media.detail,130,230,10,600,108);
    const x=112,y=286,w=620,h=338;panel(x,y,w,h,18);
    [colors.accent,colors.secondary,colors.background].forEach((color,i)=>{g.fillStyle=color;g.beginPath();g.arc(x+26+i*20,y+21,6,0,Math.PI*2);g.fill();});
    text(window.title,x+w/2,y+13,13,800,400,'center');
    g.fillStyle='rgba(255,255,255,.23)';g.fillRect(x,y+42,164,h-42);
    window.sidebar.forEach((item,i)=>{const sy=y+70+i*34;
      if(!i){round(g,x+16,sy-17,132,26,8);g.fillStyle='rgba(43,139,235,.24)';g.fill();}
      icon(item.icon,x+28,sy-14,18,18,5);text(item.label,x+54,sy-11,12,i?600:800,96);
    });
    window.files.forEach((item,i)=>{const fx=x+212+i%4*94,fy=y+94+Math.floor(i/4)*112;
      round(g,fx,fy,54,42,10);g.fillStyle=item.kind==='folder'?colors.secondary:'rgba(255,255,255,.82)';g.fill();
      if(item.kind==='folder'){round(g,fx+4,fy-8,28,13,6);g.fillStyle=colors.secondary;g.fill();}
      else{g.fillStyle=colors.background;g.fillRect(fx+10,fy+12,34,3);g.fillRect(fx+10,fy+22,26,3);}
      text(item.label,fx+27,fy+54,11,800,90,'center');
    });
    const n=c.notification,nx=state.macToastX,ny=state.macToastY,q=state.macToastOpacity;
    notifications.push({q,x:nx,y:ny,w:390,h:96,icon:n.icon,title:n.title,time:n.time,body:n.body});
    if(q>.01){g.save();g.globalAlpha=q;panel(nx,ny,390,96,28);icon(n.icon,nx+20,ny+22,44,44,12);
      text(n.title,nx+80,ny+18,18,800,228);text(n.time,nx+370,ny+22,12,600,60,'right');body(n.body,nx+80,ny+48,290,13);g.restore();}
    const dockWidth=d.dock.length*46+(d.dock.length-1)*8+28,dx=Math.round((1440-dockWidth)/2);
    panel(dx,792,dockWidth,64,23);d.dock.forEach((id,i)=>icon(id,dx+14+i*54,801,46,46,13));
    return {placement,notifications,copy,calendar:cal};
  }
  function build({T,renderer,scene,keep,colors,width,height,images,canvas,texture,content}){
    for(const weight of [600,800]){
      const loaded=[...document.fonts].some(face=>face.family.replaceAll('"','')==='BrandSans'&&face.weight===String(weight)&&face.status==='loaded');
      if(!loaded||!document.fonts.check(weight+' 12px BrandSans'))throw new Error('Approved device glass fonts must be loaded');
    }
    const phone=content.style==='phone-glass',name=phone?'phone':'desktop',models=window.ShortCreatorDeviceModels;
    const face=canvas(phone?390:1440,phone?844:900),buffer=canvas(face.c.width,face.c.height),map=texture(face.c);
    map.minFilter=map.magFilter=T.LinearFilter;map.generateMipmaps=false;
    const model=models.screen(T,phone?'iphone':'macbook',keep,map,colors.secondary),group=new T.Group();group.add(model.root);scene.add(group);
    const camera=new T.PerspectiveCamera(34,width/height,.1,100),icons=new Map(iconIds(content).map((id,i)=>[id,images[i+1]]));
    const env=canvas(1024,512),gradient=env.g.createLinearGradient(0,0,1024,512);
    [[0,colors.background],[.15,colors.surface],[.3,'#ffffff'],[.45,colors.background],[.6,'#ffffff'],[.75,colors.surface],[1,colors.background]].forEach(([s,c])=>gradient.addColorStop(s,c));
    env.g.fillStyle=gradient;env.g.fillRect(0,0,1024,512);env.g.globalCompositeOperation='screen';
    for(let i=0;i<7;i++){env.g.fillStyle='rgba(255,255,255,'+(i%2===0?.15:.08)+')';env.g.fillRect(i%3*100,60+i*56,700,3+i%2*2);}
    const eT=texture(env.c);eT.mapping=T.EquirectangularReflectionMapping;const pm=new T.PMREMGenerator(renderer);
    try{scene.environment=keep(pm.fromEquirectangular(eT)).texture;}finally{pm.dispose();}
    scene.background=new T.Color(colors.background);
    const uniforms={uTime:{value:0},uAspect:{value:width/height},uBackground:{value:new T.Color(colors.background)},uSurface:{value:new T.Color(colors.surface)},uSecondary:{value:new T.Color(colors.secondary)},uAccent:{value:new T.Color(colors.accent)}};
    // The source fixed world plane exposes its edges in wide native content slots.
    // Keep its fragment field, with a full-frame clip-space carrier in every format.
    const backdrop=new T.Mesh(keep(new T.PlaneGeometry(2,2)),keep(new T.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,
      vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,1.0,1.0);}',
      fragmentShader:`uniform float uTime,uAspect;uniform vec3 uBackground,uSurface,uSecondary,uAccent;varying vec2 v;
      float wave(vec2 p,float s,float t){return sin(p.x*s+p.y*s*.57+uTime*t);}
      void main(){vec2 p=v*2.-1.;p.x*=uAspect;float w=wave(p,3.,.22)+.55*wave(p.yx+vec2(.7,-.2),5.1,.16)+.32*wave(p+vec2(-.4,.5),8.,-.12);
      float a=smoothstep(-.75,1.05,w);float ribbon=smoothstep(.22,.95,sin(p.x*2.2-p.y*3.1+uTime*.18));
      vec3 c=mix(uBackground,uSecondary,a);c=mix(c,uSurface,smoothstep(.16,1.1,wave(p+vec2(.8,.1),2.4,.1)));c+=uAccent*ribbon*.33;
      float glow=exp(-dot(p+vec2(.62,-.08),p+vec2(.62,-.08))*1.7);c+=uSecondary*.6*glow;float vign=1.-smoothstep(.25,1.85,length(p));gl_FragColor=vec4(c*vign,1.);}`
    })));backdrop.frustumCulled=false;backdrop.renderOrder=-1;scene.add(backdrop);
    const floor=new T.Mesh(keep(new T.PlaneGeometry(30,30)),keep(new T.MeshStandardMaterial({color:colors.background,metalness:phone?.86:.9,roughness:phone?.22:.2})));
    floor.rotation.x=-Math.PI/2;floor.position.y=-2.5;scene.add(floor);scene.add(new T.AmbientLight(colors.surface,.5));
    const key=new T.DirectionalLight(0xffffff,2.2);key.position.set(-3,4,5);scene.add(key);
    for(const [color,intensity,range,p]of [[colors.secondary,3,15,[4,2,3]],[colors.accent,1.5,12,[-3,-1,4]]]){
      const light=new T.PointLight(color,intensity,range);light.position.set(...p);scene.add(light);
    }
    let latest=null,overlay=null,fit=1;
    function update(input){
      latest=motion.pose(name,input.seconds);const s=latest.state,prefix=phone?'ph':'lp',target=new T.Vector3(s.clX,s.clY,s.clZ);
      group.position.set(s[prefix+'X'],s[prefix+'Y'],s[prefix+'Z']);group.rotation.set(s[prefix+'RX'],s[prefix+'RY'],s[prefix+'RZ']);scene.updateMatrixWorld(true);
      camera.position.set(s.cX,s.cY,s.cZ);camera.lookAt(target);camera.updateMatrixWorld();
      fit=1.01*models.framingDolly(T,camera,[group],target);camera.position.sub(target).multiplyScalar(fit).add(target);camera.lookAt(target);camera.updateMatrixWorld();
      overlay=paint(face.g,buffer,images[0],icons,content,s,colors);map.needsUpdate=true;uniforms.uTime.value=s.drift;return [];
    }
    function draw(){const tone=renderer.toneMapping,exposure=renderer.toneMappingExposure;
      try{renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.render(scene,camera);}finally{renderer.toneMapping=tone;renderer.toneMappingExposure=exposure;}}
    function inspect(){
      const bounds=models.corners(T,[group]).map(p=>p.project(camera));
      return {...latest,overlay,fit,model:{sha256:model.sha256,nodes:model.nodeCount,geometries:model.geometryCount,screen:model.panel.name,alignment:model.root.rotation.y,
        position:group.position.toArray(),rotation:group.rotation.toArray().slice(0,3)},
        camera:{position:camera.position.toArray(),fov:camera.fov},bounds:[Math.min(...bounds.map(p=>p.x)),Math.min(...bounds.map(p=>p.y)),Math.max(...bounds.map(p=>p.x)),Math.max(...bounds.map(p=>p.y))],
        canvas:[face.c.width,face.c.height],screenSource:images[0].dataset.objectPath,iconIds:iconIds(content),idleDrift:false,backdropTime:uniforms.uTime.value};
    }
    return {camera,update,draw,inspect};
  }
  window.ShortCreatorDeviceGlass=Object.freeze({build,paint,iconIds,calendar});
})();
