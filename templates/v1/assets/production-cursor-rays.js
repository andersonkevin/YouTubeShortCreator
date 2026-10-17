/* HyperFrames vfx-text-cursor, Apache-2.0. Shared native ray renderer and
   supplied text-card choreography; exact approved logo bytes, no font requests. */
(()=>{
  'use strict';
  const duration=8,clamp=p=>Math.max(0,Math.min(1,p)),out=(p,n)=>1-(1-clamp(p))**n;
  const expoOut=p=>{p=clamp(p);return p===0||p===1?p:1-2**(-10*p);};
  const expoIn=p=>{p=clamp(p);return p===0||p===1?p:2**(10*p-10);};
  const graphemes=text=>Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),part=>part.segment);
  function state(seconds,count) {
    if(!Number.isFinite(seconds)||!Number.isInteger(count)||count<1||count>8)throw new Error('Invalid cursor-ray clock or title');
    const t=Math.max(0,Math.min(duration,seconds)),typeEnd=3.15+(count-1)*.085,slideStart=typeEnd+.25,slideEnd=slideStart+.05;
    const exitStart=slideEnd+.42+.08+.5,secondStart=exitStart+.36;
    const entry=clamp((t-3.1)/.9),entryEase=-.806*entry*entry+1.806*entry,settle=clamp((t-4)/.4),exit=expoIn((t-2.9)/.2);
    return {t,typeEnd,slideStart,slideEnd,exitStart,secondStart,logoY:760*(1-out(t,5)),logoScale:1-.6*exit,
      effect:out((t-.72)/.34,4),cursor:clamp((t-.72)/2.28),canvasAlpha:1-exit,canvasBlur:16*exit,
      cardAlpha:t>=3.1?1:0,cardScale:t<4?1.45+(.88-1.45)*entryEase:.88-.04*settle,
      cardBlur:t<4?14*(1-entryEase):1.5*settle,
      typed:t<3.15?0:Math.min(count,1+Math.floor((t-3.15+1e-9)/.085)),caret:t>=3.1&&t<typeEnd?1:0,
      wordSlide:out((t-slideStart)/.05,3),support:[0,1].map(i=>expoOut((t-slideEnd-i*.08)/.42)),
      firstAlpha:t<secondStart?1:0,firstExit:clamp((t-exitStart)/.36)**3,
      secondAlpha:t>=secondStart?1:0,secondEntry:expoOut((t-secondStart)/.48)};
  }
  function geometry(W,H) {
    if(![W,H].every(Number.isFinite)||W<900||H<600)throw new Error('Cursor rays require a native composition viewport');
    const w=Math.min(1140,(W-64)/1.45),h=Math.min(520,(H-64)/1.45);
    return {W,H,unit:H/1080,card:{x:(W-w)/2,y:(H-h)/2,w,h},travel:w+80};
  }
  function logoBox(W,H,width,height) {
    if(![W,H,width,height].every(n=>Number.isFinite(n)&&n>0))throw new Error('Invalid approved logo geometry');
    const scale=Math.min(W*.5625/width,H*.48/height),w=width*scale,h=height*scale;
    return {x:(W-w)/2,y:(H-h)/2-8*H/1080,w,h};
  }
  function palette(style) {
    return Object.fromEntries([['ground','--purple'],['accent','--lime'],['secondary','--cyan']].map(([name,key])=>{
      const hex=style.getPropertyValue(key).trim();if(!/^#[\da-f]{6}$/i.test(hex))throw new Error('Ray shader requires approved brand colors');
      return [name,[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)];
    }));
  }
  function createRenderer() {
    const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false,antialias:false});
    if(!gl)throw new Error('WebGL is unavailable for the selected cursor rays');
    const shaders=[],textures=[];let program,buffer;
    try {
      const source=window.ShortCreatorCursorRayShader;
      shaders.push(window.ShortCreatorShaders.compile(gl,gl.VERTEX_SHADER,source.vertex));
      shaders.push(window.ShortCreatorShaders.compile(gl,gl.FRAGMENT_SHADER,source.fragment));
      program=gl.createProgram();if(!program)throw new Error('Cannot allocate cursor-ray program');
      shaders.forEach(s=>gl.attachShader(program,s));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Cursor-ray shader link failed: '+gl.getProgramInfoLog(program));
      buffer=gl.createBuffer();if(!buffer)throw new Error('Cannot allocate cursor-ray geometry');
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      for(let i=0;i<2;i++) {
        const texture=gl.createTexture();if(!texture)throw new Error('Cannot allocate cursor-ray texture');textures.push(texture);
        gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);
        for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
        for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
      }
    } catch(error) {
      textures.forEach(texture=>gl.deleteTexture(texture));if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);throw error;
    } finally {shaders.forEach(shader=>gl.deleteShader(shader));}
    const position=gl.getAttribLocation(program,'position'),uniform={};
    for(const name of ['resolution','mouse','logoY','logoScale','effectMix','src','colorSrc','ground','accent','secondary'])uniform[name]=gl.getUniformLocation(program,name);
    const mask=document.createElement('canvas'),color=document.createElement('canvas'),maskCtx=mask.getContext('2d'),colorCtx=color.getContext('2d');
    if(!maskCtx||!colorCtx)throw new Error('Cannot prepare approved logo textures');
    let previous=null;
    const check=()=>{if(gl.isContextLost())throw new Error('Cursor-ray context lost');const error=gl.getError();if(error!==gl.NO_ERROR)throw new Error('Cursor-ray WebGL error: '+error);};
    return {
      draw(target,image,s,colors) {
        check();const W=target.width,H=target.height;
        if(W>gl.getParameter(gl.MAX_TEXTURE_SIZE)||H>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw new Error('Cursor-ray texture exceeds local WebGL size');
        if(!image.complete||!image.naturalWidth)throw new Error('Approved logo has not decoded');
        const resized=canvas.width!==W||canvas.height!==H;
        if(resized){canvas.width=W;canvas.height=H;}
        const key=[image,W,H];
        if(resized||!previous||key.some((v,i)=>v!==previous[i])) {
          mask.width=color.width=W;mask.height=color.height=H;
          const g=logoBox(W,H,image.naturalWidth,image.naturalHeight);
          for(const ctx of [maskCtx,colorCtx]){ctx.clearRect(0,0,W,H);ctx.drawImage(image,g.x,g.y,g.w,g.h);}
          maskCtx.save();maskCtx.globalCompositeOperation='source-in';maskCtx.fillStyle='#ffffff';maskCtx.fillRect(0,0,W,H);maskCtx.restore();
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
          [mask,color].forEach((source,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);});
          previous=key;
        }
        gl.viewport(0,0,W,H);gl.clearColor(...colors.ground,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
        textures.forEach((texture,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);});
        gl.uniform1i(uniform.src,0);gl.uniform1i(uniform.colorSrc,1);gl.uniform2f(uniform.resolution,W,H);
        gl.uniform2f(uniform.mouse,s.cursor*W,H*.5);gl.uniform1f(uniform.logoY,s.logoY*H/1080);
        gl.uniform1f(uniform.logoScale,s.logoScale);gl.uniform1f(uniform.effectMix,s.effect);
        for(const name of ['ground','accent','secondary'])gl.uniform3fv(uniform[name],colors[name]);
        gl.drawArrays(gl.TRIANGLES,0,6);check();
        const output=target.getContext('2d',{alpha:false});if(!output)throw new Error('Cannot copy cursor-ray pixels');
        output.clearRect(0,0,W,H);output.drawImage(canvas,0,0);
      },
      stats:()=>({contexts:1,textures:2,programs:1,samples:112,lost:gl.isContextLost(),
        uniforms:Object.fromEntries(['resolution','mouse','logoY','logoScale','effectMix','ground','accent','secondary'].map(name=>{
          const value=gl.getUniform(program,uniform[name]);return [name,typeof value==='number'?value:Array.from(value)];
        }))})
    };
  }
  let renderer;
  const box=(node,g)=>Object.assign(node.style,{left:g.x+'px',top:g.y+'px',width:g.w+'px',height:g.h+'px'});
  function mount(host,c,onsets,data,make) {
    const board=make('div','cursor-rays-board',null,host),stage=make('div','cursor-rays-stage',null,board),g=geometry(host.clientWidth,host.clientHeight-54);
    stage.style.height=g.H+'px';make('p','cursor-rays-label',c.label,board,true);
    const logo=make('img','cursor-rays-source-logo',null,stage);logo.src='assets/logo.png';logo.alt='';logo.setAttribute('aria-hidden','true');
    const image=window.ShortCreatorShaders.verifiedImage(logo),colors=palette(getComputedStyle(host));
    if(!renderer)renderer=createRenderer();
    const canvas=make('canvas','cursor-rays-canvas',null,stage);canvas.width=g.W;canvas.height=g.H;canvas.setAttribute('aria-hidden','true');
    const card=make('div','cursor-rays-card',null,stage);box(card,g.card);
    const first=make('div','cursor-rays-first',null,card),line=make('div','cursor-rays-first-line',null,first);
    const word=make('div','cursor-rays-word',null,line),typed=make('span','cursor-rays-typed',c.heading,word),caret=make('span','cursor-rays-caret','|',word);
    const supporting=[make('span','cursor-rays-support',c.action,line),make('span','cursor-rays-support cursor-rays-last',c.support,first)];
    const second=make('div','cursor-rays-second',null,card),finalLines=c.finale.map(text=>make('h2','cursor-rays-final-line',text,second));
    // Copy travels outside the card during the intentional masked handoff.
    // Dedicated QA checks intrinsic fit at every sample and containment at rest.
    [...supporting,...finalLines].forEach(node=>{node.dataset.rayCopy='true';});
    const letters=graphemes(c.heading),width=typed.getBoundingClientRect().width;
    word.style.width=width+'px';word.setAttribute('aria-label',c.heading);
    if(width+supporting[0].getBoundingClientRect().width+18>g.card.w-80)line.classList.add('cursor-rays-stacked');
    const cardBox=card.getBoundingClientRect(),wordBox=word.getBoundingClientRect();
    const offset={x:cardBox.left+cardBox.width/2-wordBox.left-wordBox.width/2,y:cardBox.top+cardBox.height/2-wordBox.top-wordBox.height/2};
    const caretWidth=caret.getBoundingClientRect().width;
    if(width*1.8+caretWidth>g.card.w-32)throw new Error('Typed ray title exceeds its initial card slot at approved font size');
    const widths=letters.map((_,i)=>{typed.textContent=letters.slice(0,i+1).join('');return typed.getBoundingClientRect().width;});typed.textContent='';
    return seconds=>{
      const clock=window.ShortCreatorCarousels.clock(seconds,onsets,duration),s=state(clock.time,letters.length);
      board.style.opacity=seconds<onsets[0]?'0':'1';
      canvas.style.opacity=String(s.canvasAlpha);canvas.style.filter=`blur(${s.canvasBlur*g.unit}px)`;
      canvas.style.visibility=s.canvasAlpha>0?'visible':'hidden';
      if(s.canvasAlpha>0)renderer.draw(canvas,image,s,colors);
      card.style.opacity=String(s.cardAlpha);card.style.transform=`scale(${s.cardScale})`;card.style.filter=`blur(${s.cardBlur*g.unit}px)`;
      typed.textContent=letters.slice(0,s.typed).join('');caret.style.opacity=String(s.caret);caret.style.left=(s.typed?widths[s.typed-1]:0)+'px';
      word.style.transform=`translate(${offset.x*(1-s.wordSlide)}px,${offset.y*(1-s.wordSlide)}px) scale(${1.8-.8*s.wordSlide})`;
      supporting.forEach((node,i)=>{const p=s.support[i];node.style.opacity=String(p);node.style.transform=`translateY(${54*(1-p)}px) scale(${.96+.04*p})`;node.style.filter=`blur(${10*(1-p)}px)`;});
      first.style.opacity=String(s.firstAlpha);first.style.transform=`translateX(${-g.travel*s.firstExit}px)`;first.style.filter=`blur(${8*s.firstExit}px)`;
      second.style.opacity=String(s.secondAlpha);second.style.transform=`translateX(${g.travel*(1-s.secondEntry)}px)`;second.style.filter=`blur(${8*(1-s.secondEntry)}px)`;
      board.dataset.rayState=JSON.stringify({clock,...s,offset,widths,travel:g.travel,colors,logo:logoBox(g.W,g.H,image.naturalWidth,image.naturalHeight),stats:renderer.stats()});
    };
  }
  window.ShortCreatorCursorRays={duration,state,geometry,logoBox,graphemes,palette,createRenderer,mount,stats:()=>renderer?.stats()||{contexts:0,textures:0,programs:0,samples:112,lost:false}};
})();
