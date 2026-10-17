/* HyperFrames filmed-screen camera and focus rack, adapted under Apache-2.0.
   One local-still lens, one shared WebGL2 context, no DOM capture or external assets. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
  const mix=(a,b,p)=>p===0?a:p===1?b:a+(b-a)*p;
  const blend=(a,b,p)=>a.map((v,i)=>mix(v,b[i],p));
  const rotations=Object.freeze([[.08,.14,-.012],[.06,-.24,.02],[.1,.14,-.012]].map(Object.freeze));
  function target(region,width,height,imageWidth,imageHeight) {
    const fit=window.ShortCreatorShaders.contain(width,height,imageWidth,imageHeight);
    const rect=[fit.x+region.x*fit.width,fit.y+region.y*fit.height,region.width*fit.width,region.height*fit.height];
    if(!rect.every(Number.isFinite)||rect[2]<=0||rect[3]<=0||!Number.isFinite(region.zoom))throw new Error('Invalid filmed focus region');
    return {rect,center:[rect[0]+rect[2]/2,rect[1]+rect[3]/2],zoom:region.zoom};
  }
  function rack(frame,starts,targets) {
    const rect=[0,0,0,0];let sum=0;
    for(let i=0;i<12;i++) {
      const t=frame-9*i/11,weight=.5-.5*Math.cos(2*Math.PI*(i+.5)/12);let active=0;
      starts.forEach((start,j)=>{if(t>=start)active=j;});
      const base=targets[active].rect,r=active?[base[0]-8,base[1]-6,base[2]+16,base[3]+12]:base;
      for(let j=0;j<4;j++)rect[j]+=r[j]*weight;sum+=weight;
    }
    return rect.map(v=>v/sum);
  }
  function camera(time,onsets,regions,width,height,imageWidth,imageHeight) {
    if(!Number.isFinite(time)||regions.length<1||regions.length>3||onsets.length!==regions.length+1||
      !onsets.every(Number.isFinite)||onsets.some((v,i)=>i>0&&v<=onsets[i-1]))throw new Error('Invalid filmed camera clock');
    const frame=Math.floor(time*30+1e-7),starts=onsets.map(v=>Math.ceil(v*30));let active=0;
    starts.forEach((start,i)=>{if(frame>=start)active=i;});
    const targets=[{rect:[width/2,height/2,0,0],center:[width/2,height/2],zoom:1,rot:[0,0,0]},
      ...regions.map((region,i)=>({...target(region,width,height,imageWidth,imageHeight),rot:rotations[i]}))];
    const elapsed=Math.max(0,frame-starts[active]),p=clamp(elapsed/24),q=smooth(p);
    const before=targets[Math.max(0,active-1)],after=targets[active],center=blend(before.center,after.center,q);
    const rect=rack(frame,starts,targets),focus=[rect[0]+rect[2]/2,rect[1]+rect[3]/2];
    return {active,p,visible:frame>=starts[0],rect,focus,aim:blend(center,focus,.65),
      rot:blend(before.rot,after.rot,q),zoom:mix(before.zoom,after.zoom,q),blur:.45,
      time:(starts[active]+Math.min(elapsed,24)-starts[0])/30,seed:active*31+Math.min(elapsed,24),
      target:after.rect,center};
  }
  function basis(rot) {
    const [x,y,z]=rot,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);
    return {u:[cz*cy,sz*cy,-sy],v:[cz*sy*sx-sz*cx,sz*sy*sx+cz*cx,cy*sx]};
  }
  function project(point,state,width,height) {
    const {u,v}=basis(state.rot),K=1.7*height/state.zoom,local=[(point[0]-state.aim[0])/K,(point[1]-state.aim[1])/K];
    const world=u.map((n,i)=>n*local[0]+v[i]*local[1]+(i===2?1:0));
    if(world[2]<=0)throw new Error('Filmed focus crossed the camera plane');
    const s=[1.7*world[0]/world[2],1.7*world[1]/world[2]],radius=Math.hypot(...s);
    const factor=1+.15*((width/height/2)**2+.25);let low=0,high=Math.max(1,radius*factor);
    for(let i=0;i<48;i++){const r=(low+high)/2;if(r*(1+.15*r*r)<radius*factor)low=r;else high=r;}
    const r=(low+high)/2,ratio=radius?r/radius:0;
    return [width/2+s[0]*ratio*height,height/2+s[1]*ratio*height];
  }
  function createRenderer() {
    const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{preserveDrawingBuffer:true,alpha:false,antialias:false});
    if(!gl)throw new Error('WebGL2 is unavailable for the selected filmed screen');
    const shaders=[];let program;
    try {
      shaders.push(window.ShortCreatorShaders.compile(gl,gl.VERTEX_SHADER,window.ShortCreatorFilmedShader.vertex));
      shaders.push(window.ShortCreatorShaders.compile(gl,gl.FRAGMENT_SHADER,window.ShortCreatorFilmedShader.fragment));
      program=gl.createProgram();if(!program)throw new Error('Cannot allocate filmed-screen program');
      shaders.forEach(shader=>gl.attachShader(program,shader));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Filmed-screen link failed: '+gl.getProgramInfoLog(program));
    } catch(error){if(program)gl.deleteProgram(program);throw error;}
    finally{shaders.forEach(shader=>gl.deleteShader(shader));}
    const buffer=gl.createBuffer(),texture=gl.createTexture();
    if(!buffer||!texture)throw new Error('Cannot allocate filmed-screen resources');
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'a'),loc={};
    for(const key of ['uSrc','uRes','uTime','uAim','uZoom','uRot','uFocus','uFocusRect','uBlur','uP','uTrue','uCut','uOut','uSeed','uInv','uVig','uCA','uLed','uCurve','uGround'])
      loc[key]=gl.getUniformLocation(program,key);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
    for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    const scratch=document.createElement('canvas'),context=scratch.getContext('2d',{alpha:false});
    if(!context)throw new Error('Cannot prepare filmed-screen pixels');
    let previous=null;
    function check() {
      if(gl.isContextLost())throw new Error('Filmed-screen context was lost');
      const error=gl.getError();if(error!==gl.NO_ERROR)throw new Error('Filmed-screen WebGL error: '+error);
    }
    check();
    return {
      draw(output,image,state,ground) {
        check();const width=output.width,height=output.height;
        if(width>gl.getParameter(gl.MAX_TEXTURE_SIZE)||height>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw new Error('Filmed-screen texture exceeds GPU limits');
        if(!image.complete||!image.naturalWidth)throw new Error('Filmed-screen image has not decoded');
        const changed=canvas.width!==width||canvas.height!==height;
        if(changed){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}
        const key=[image,width,height,ground];
        if(!previous||changed||key.some((value,i)=>value!==previous[i])) {
          scratch.width=width;scratch.height=height;context.fillStyle=ground;context.fillRect(0,0,width,height);
          const fit=window.ShortCreatorShaders.contain(width,height,image.naturalWidth,image.naturalHeight);
          context.drawImage(image,fit.x,fit.y,fit.width,fit.height);gl.bindTexture(gl.TEXTURE_2D,texture);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,scratch);previous=key;
        }
        gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(loc.uSrc,0);
        gl.uniform2f(loc.uRes,width,height);gl.uniform2fv(loc.uAim,state.aim);gl.uniform3fv(loc.uRot,state.rot);
        gl.uniform2fv(loc.uFocus,state.focus);gl.uniform4fv(loc.uFocusRect,state.rect);gl.uniform3fv(loc.uP,new Float32Array(15));
        gl.uniform3fv(loc.uGround,[1,3,5].map(i=>parseInt(ground.slice(i,i+2),16)/255));
        for(const [key,value] of Object.entries({uTime:state.time,uZoom:state.zoom,uBlur:state.blur,uTrue:1,uCut:0,uOut:0,uSeed:state.seed,uInv:0,uVig:1,uCA:2.2,uLed:.45,uCurve:.15}))
          gl.uniform1f(loc[key],value);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.finish();check();
        const ctx=output.getContext('2d',{alpha:false});if(!ctx)throw new Error('Cannot paint filmed screen');
        ctx.clearRect(0,0,width,height);ctx.drawImage(canvas,0,0);
      },
      stats:()=>({contexts:1,programs:1,textures:1,lost:gl.isContextLost(),taps:36,glowTaps:16}),
    };
  }
  let renderer;
  function mount(view,image,onsets,regions) {
    if(!renderer)renderer=createRenderer();
    const texture=window.ShortCreatorShaders.verifiedImage(image),canvas=document.createElement('canvas');
    canvas.className='filmed-screen-canvas';canvas.width=view.clientWidth;canvas.height=view.clientHeight;canvas.setAttribute('aria-hidden','true');
    Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});view.appendChild(canvas);
    const ground=getComputedStyle(view).getPropertyValue('--purple').trim();
    if(!/^#[\da-f]{6}$/i.test(ground))throw new Error('Filmed screen requires an approved background');
    return time=>{
      const s=camera(time,onsets,regions,canvas.width,canvas.height,image.naturalWidth,image.naturalHeight);
      image.style.visibility=s.visible?'hidden':'visible';canvas.style.visibility=s.visible?'visible':'hidden';
      if(s.visible)renderer.draw(canvas,texture,s,ground);
      view.dataset.filmedState=JSON.stringify(s);view.dataset.filmedStats=JSON.stringify(renderer.stats());
      return s.active-1;
    };
  }
  window.ShortCreatorFilmedScreen=Object.freeze({rotations,smooth,target,rack,camera,basis,project,createRenderer,mount,stats:()=>renderer?.stats()||{contexts:0,programs:0,textures:0,lost:false}});
})();
