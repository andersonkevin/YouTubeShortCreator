/* HyperFrames grade-split-reveal and colorGrading, Apache-2.0.
   Closed source looks on verified stills; text and branding are never graded. */
(()=>{
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const adjustKeys=['exposure','contrast','highlights','shadows','whites','blacks','temperature','tint','vibrance','saturation'];
  const detailKeys=['vignette','vignetteMidpoint','vignetteRoundness','vignetteFeather','grain','grainSize','grainRoughness'];
  const names=Object.freeze({'warm-cinematic':'Warm Cinematic','cool-teal':'Cool Teal','bleach-bypass':'Bleach Bypass'});
  const values=Object.freeze({
    flat:Object.freeze([.1,-.42,-.1,.24,-.14,.3,-.06,0,-.22,-.34]),
    'warm-cinematic':Object.freeze([.02,.28,-.16,.08,.06,-.16,.18,-.04,.26,.1]),
    'cool-teal':Object.freeze([0,.32,-.2,.14,.04,-.2,-.26,.08,.22,.04]),
    'bleach-bypass':Object.freeze([.08,.54,.12,-.1,.18,-.28,.04,0,-.18,-.46]),
  });
  const details=Object.freeze({
    flat:Object.freeze([0,.5,0,.65,0,.25,.5]),
    'warm-cinematic':Object.freeze([.3,.5,0,.7,.1,.3,.5]),
    'cool-teal':Object.freeze([.34,.5,0,.68,.1,.3,.5]),
    'bleach-bypass':Object.freeze([.24,.5,0,.72,.18,.34,.5]),
  });
  function options(o){
    if(!o||Object.keys(o).sort().join(',')!=='edge,labels,look,split'||!Object.hasOwn(names,o.look)||
      !Number.isInteger(o.split)||o.split<25||o.split>85||!['hairline','bold','hidden'].includes(o.edge)||
      typeof o.labels!=='boolean')throw new Error('Invalid grade split options');
    return o;
  }
  // Retained source Newton solve, with bounded bisection when the slope is small.
  function bezier(x1,y1,x2,y2){
    const curve=(t,a,b)=>((1-3*b+3*a)*t+(3*b-6*a))*t*t+3*a*t;
    const slope=(t,a,b)=>(3*(1-3*b+3*a)*t+2*(3*b-6*a))*t+3*a;
    return p=>{
      if(p<=0)return 0;if(p>=1)return 1;let t=p;
      for(let i=0;i<8;i++){const d=slope(t,x1,x2);if(Math.abs(d)<1e-6)break;
        const e=curve(t,x1,x2)-p;if(Math.abs(e)<1e-7)return curve(t,y1,y2);t-=e/d;}
      let lo=0,hi=1;t=p;
      for(let i=0;i<24;i++){const x=curve(t,x1,x2);if(Math.abs(x-p)<1e-7)break;if(x>p)hi=t;else lo=t;t=(lo+hi)/2;}
      return curve(t,y1,y2);
    };
  }
  const ease={plate:bezier(.16,.84,.24,1),wipe:bezier(.62,0,.14,1),commit:bezier(.4,0,.05,1),
    tag:bezier(.22,.8,.3,1),fade:bezier(.4,0,.7,1)};
  function state(seconds,width,split=62){
    if(!Number.isFinite(seconds)||!Number.isInteger(width)||width<32||width>4096||
      !Number.isInteger(split)||split<25||split>85)throw new Error('Invalid grade split frame');
    const t=Math.max(0,Math.min(6,seconds)),p=(a,d)=>clamp((t-a)/d),hold=Math.round(width*split/100);
    const commit=ease.commit(p(3.1,1.2)),x=t<3.1?hold*ease.wipe(p(.7,1.6)):hold+(width-hold)*commit;
    return {time:t,width:x,hold,scale:t<3.1?1.05-.05*ease.plate(p(0,.62)):1+.03*ease.commit(p(3.1,1.5)),
      edge:t<4.05?ease.fade(p(.7,.2)):1-ease.fade(p(4.05,.3)),
      before:.82*ease.tag(p(.36,.34))*(1-ease.fade(p(3.1,.5))),beforeY:10*(1-ease.tag(p(.36,.34))),
      after:ease.tag(p(1.16,.34)),afterY:10*(1-ease.tag(p(1.16,.34)))};
  }
  function clock(time,onsets){return window.ShortCreatorCarousels.clock(time,onsets,6);}
  function geometry(width,height){
    if(![width,height].every(n=>Number.isInteger(n)&&n>=100&&n<=4096))throw new Error('Invalid grade split board');
    const available=height-52,inset=Math.min(width,available)*.085;
    const w=Math.min(Math.round(width-inset*2),Math.floor((width-2)/1.05));
    const h=Math.min(Math.round(available-inset*2),Math.floor((available-2)/1.05));
    return {x:(width-w)/2,y:(available-h)/2,w,h,pad:Math.round(inset*.62)};
  }
  function seed(value){
    let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return (hash>>>0)%10000;
  }
  function uniforms(look,time){
    if(!Object.hasOwn(values,look)||!Number.isFinite(time)||time<0||time>6)throw new Error('Unknown bounded grade');
    return Object.fromEntries([...adjustKeys.map((key,i)=>['u_'+key,values[look][i]]),
      ...detailKeys.map((key,i)=>['u_'+key,details[look][i]]),
      ['u_grainSeed',seed(look==='flat'?'gs-img-before':'gs-img-after')+Math.floor(time*60)]]);
  }
  let renderer=null;
  function create(){
    const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{
      alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true});
    if(!gl)throw new Error('Grade split requires local WebGL');
    const r={canvas,gl,program:null,buffer:null,texture:null,image:null,locations:{},last:null};
    try{
      const shaders=[];
      const compile=(kind,text)=>{
        const shader=gl.createShader(kind);if(!shader)throw new Error('Grade split shader allocation failed');
        shaders.push(shader);gl.shaderSource(shader,text);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Grade split shader: '+gl.getShaderInfoLog(shader));
        return shader;
      };
      try{
        const source=window.ShortCreatorGradeSplitShader;
        if(!source)throw new Error('Grade split source shader unavailable');
        const vertex=compile(gl.VERTEX_SHADER,source.vertex),fragment=compile(gl.FRAGMENT_SHADER,source.fragment);
        r.program=gl.createProgram();if(!r.program)throw new Error('Grade split program allocation failed');
        gl.attachShader(r.program,vertex);gl.attachShader(r.program,fragment);gl.linkProgram(r.program);
        if(!gl.getProgramParameter(r.program,gl.LINK_STATUS))throw new Error('Grade split shader link failed');
      }finally{shaders.forEach(s=>gl.deleteShader(s));}
      gl.useProgram(r.program);r.buffer=gl.createBuffer();r.texture=gl.createTexture();
      if(!r.buffer||!r.texture)throw new Error('Grade split resource allocation failed');
      gl.bindBuffer(gl.ARRAY_BUFFER,r.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(r.program,'a_pos');if(position<0)throw new Error('Grade split position missing');
      gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,r.texture);
      for(const [key,value] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],
        [gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,value);
      for(const key of ['u_source','u_resolution','u_uvScale','u_uvOffset',...Object.keys(uniforms('flat',0))]){
        const location=gl.getUniformLocation(r.program,key);
        if(location===null)throw new Error('Grade split uniform missing: '+key);r.locations[key]=location;
      }
      return r;
    }catch(error){if(r.texture)gl.deleteTexture(r.texture);if(r.buffer)gl.deleteBuffer(r.buffer);
      if(r.program)gl.deleteProgram(r.program);gl.getExtension('WEBGL_lose_context')?.loseContext();throw error;}
  }
  function draw(canvas,image,look,time){
    const values=uniforms(look,time),w=canvas.width,h=canvas.height;
    if(![w,h].every(n=>Number.isInteger(n)&&n>=32&&n<=4096)||!image.complete||image.naturalWidth<32)
      throw new Error('Grade split needs a decoded verified still and bounded canvas');
    if(!renderer)renderer=create();
    const r=renderer,{gl,locations:u}=r;
    if(gl.isContextLost())throw new Error('Grade split WebGL context lost');
    if(r.canvas.width!==w)r.canvas.width=w;if(r.canvas.height!==h)r.canvas.height=h;
    gl.useProgram(r.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,r.texture);
    if(r.image!==image){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);r.image=image;}
    const fit=window.ShortCreatorShaders.contain(w,h,image.naturalWidth,image.naturalHeight);
    gl.viewport(0,0,w,h);gl.uniform1i(u.u_source,0);gl.uniform2f(u.u_resolution,w,h);
    gl.uniform2f(u.u_uvScale,fit.width/w,fit.height/h);gl.uniform2f(u.u_uvOffset,fit.x/w,fit.y/h);
    for(const [key,value] of Object.entries(values))gl.uniform1f(u[key],value);
    gl.drawArrays(gl.TRIANGLES,0,3);
    if(gl.getError()!==gl.NO_ERROR)throw new Error('Grade split WebGL draw failed');
    const context=canvas.getContext('2d');if(!context)throw new Error('Grade split canvas unavailable');
    context.clearRect(0,0,w,h);context.drawImage(r.canvas,0,0);
    r.last={look,time,width:w,height:h,fit};
  }
  function stats(){
    if(!renderer)return {contexts:0};
    const r=renderer,values={};for(const [key,location] of Object.entries(r.locations)){
      const value=r.gl.getUniform(r.program,location);values[key]=ArrayBuffer.isView(value)?Array.from(value):value;}
    return {contexts:1,programs:1,buffers:1,textures:1,lost:r.gl.isContextLost(),...r.last,uniforms:values};
  }
  function mount(host,spec,onsets,data,make,reveal){
    const c=spec.content,o=options(c.grade);clock(0,onsets);
    const heading=make('h2','prod-heading',c.heading,host,true),source=make('p','resource-source',c.source,host,true);
    const board=make('div','media-board grade-board',null,host);board.dataset.mediaTreatment='grade-split';board.dataset.mediaLayout='solo';
    const g=geometry(board.clientWidth,board.clientHeight),plate=make('div','grade-plate',null,board);
    Object.assign(plate.style,{left:g.x+'px',top:g.y+'px',width:g.w+'px',height:g.h+'px'});
    const image=make('img','grade-source',null,board);image.src=data.assets[c.items[0].image];image.alt=c.items[0].label;
    const readable=window.ShortCreatorShaders.verifiedImage(image),before=make('canvas','grade-before',null,plate);
    const crop=make('div','grade-crop',null,plate),after=make('canvas','grade-after',null,crop);
    for(const canvas of [before,after]){canvas.width=g.w;canvas.height=g.h;canvas.setAttribute('aria-hidden','true');}
    const edge=make('div','grade-edge',null,plate);edge.setAttribute('aria-hidden','true');edge.style.width=({hairline:2,bold:6,hidden:0})[o.edge]+'px';
    edge.style.display=o.edge==='hidden'?'none':'block';
    const tagBefore=make('span','grade-tag grade-tag-before','Flat preview',plate,true);
    const tagAfter=make('span','grade-tag grade-tag-after',names[o.look],plate,true);
    for(const tag of [tagBefore,tagAfter]){tag.style.bottom=g.pad+'px';tag.style.display=o.labels?'block':'none';
      tag.setAttribute('aria-hidden',String(!o.labels));}
    tagBefore.style.right=g.pad+'px';tagAfter.style.left=g.pad+'px';
    make('p','grade-label',c.items[0].label,board,true);
    return time=>{
      const timer=clock(time,onsets),s=state(timer.time,g.w,o.split),entry=1-(1-window.ShortCreatorStory.progress(time,onsets[0]))**4;
      reveal(heading,entry,20);source.style.opacity=String(entry);board.style.visibility=timer.visible?'visible':'hidden';
      draw(before,readable,'flat',timer.time);draw(after,readable,o.look,timer.time);
      plate.style.transform='scale('+s.scale+')';crop.style.width=s.width+'px';
      edge.style.transform='translateX('+s.width+'px)';edge.style.opacity=String(s.edge);
      for(const [tag,alpha,y] of [[tagBefore,s.before,s.beforeY],[tagAfter,s.after,s.afterY]]){
        tag.style.opacity=String(alpha);tag.style.transform='translateY('+y+'px)';}
      board.dataset.gradeState=JSON.stringify({clock:timer,state:s,geometry:g,options:o});
    };
  }
  function dispose(){if(!renderer)return;const r=renderer;r.gl.deleteTexture(r.texture);r.gl.deleteBuffer(r.buffer);
    r.gl.deleteProgram(r.program);r.gl.getExtension('WEBGL_lose_context')?.loseContext();renderer=null;}
  window.ShortCreatorGradeSplit={names,options,state,clock,geometry,uniforms,draw,stats,mount,dispose};
})();
