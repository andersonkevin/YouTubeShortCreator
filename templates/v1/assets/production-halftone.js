/* HyperFrames halftone-field, Apache-2.0; simplex noise, MIT.
   See production-halftone-notices.txt. One shared renderer, no simulation state. */
(() => {
  'use strict';
  const recipe=Object.freeze({frequency:.3+5.7/9,speed:.25,cell:6+53*54/99,gamma:.5+11*7.5/19,bias:.1});
  const rgb=hex=>{
    if(typeof hex!=='string'||!/^#[\da-f]{6}$/i.test(hex))throw new Error('Halftone requires approved hex colors');
    return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  };
  function palette(colors) {
    const background=rgb(colors.background),secondary=rgb(colors.secondary),accent=rgb(colors.accent);
    return {background,stops:[secondary,accent,background,background]};
  }
  function clock(time,onsets) {
    const state=window.ShortCreatorGpuBackdrops.clock(time,onsets);
    const first=Math.ceil(onsets[0]*30),last=Math.ceil(onsets[1]*30);
    if(last-first<60)throw new Error('Halftone requires 60 frames between cues');
    return {...state,sourceTime:state.seconds*5};
  }
  let renderer=null;
  function createRenderer() {
    const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{
      alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true,
    });
    if(!gl)throw new Error('Halftone requires local WebGL');
    const state={canvas,gl,lost:false,program:null,uniforms:{},buffer:null};
    canvas.addEventListener('webglcontextlost',()=>{state.lost=true;});
    const source=window.ShortCreatorHalftoneShader;
    if(!source)throw new Error('Missing pinned halftone shader');
    const compile=(kind,text)=>{
      const shader=gl.createShader(kind);if(!shader)throw new Error('Cannot allocate halftone shader');
      gl.shaderSource(shader,text);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
        const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error('Halftone shader failed: '+error);
      }
      return shader;
    };
    const vertex=compile(gl.VERTEX_SHADER,source.vertex),fragment=compile(gl.FRAGMENT_SHADER,source.fragment);
    state.program=gl.createProgram();if(!state.program)throw new Error('Cannot allocate halftone program');
    gl.attachShader(state.program,vertex);gl.attachShader(state.program,fragment);gl.linkProgram(state.program);
    gl.deleteShader(vertex);gl.deleteShader(fragment);
    if(!gl.getProgramParameter(state.program,gl.LINK_STATUS))throw new Error('Halftone link failed: '+gl.getProgramInfoLog(state.program));
    gl.useProgram(state.program);state.buffer=gl.createBuffer();
    if(!state.buffer)throw new Error('Cannot allocate halftone triangle');
    gl.bindBuffer(gl.ARRAY_BUFFER,state.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(state.program,'aPos');
    if(position<0)throw new Error('Missing halftone position attribute');
    gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    for(const name of ['uRes','uTime','uFreq','uSpeed','uCell','uGamma','uBias','uPal0','uPal1','uPal2','uPal3','uBg']){
      const location=gl.getUniformLocation(state.program,name);
      if(location===null)throw new Error('Missing halftone uniform: '+name);
      state.uniforms[name]=location;
    }
    return state;
  }
  function draw(ctx,width,height,time,colors) {
    if(![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=4096)||!Number.isFinite(time)||time<0||time>10)
      throw new Error('Invalid halftone frame');
    const color=palette(colors);
    if(!renderer)renderer=createRenderer();
    const {canvas,gl,program,uniforms:u}=renderer;
    if(renderer.lost||gl.isContextLost())throw new Error('Halftone WebGL context lost');
    const maximum=gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    if(width>maximum[0]||height>maximum[1])throw new Error('Halftone viewport exceeds device limits');
    if(canvas.width!==width)canvas.width=width;
    if(canvas.height!==height)canvas.height=height;
    gl.useProgram(program);gl.viewport(0,0,width,height);gl.uniform2f(u.uRes,width,height);
    for(const [name,value] of Object.entries({uTime:time,uFreq:recipe.frequency,uSpeed:recipe.speed,
      uCell:recipe.cell,uGamma:recipe.gamma,uBias:recipe.bias}))gl.uniform1f(u[name],value);
    color.stops.forEach((value,i)=>gl.uniform3f(u['uPal'+i],...value));gl.uniform3f(u.uBg,...color.background);
    gl.drawArrays(gl.TRIANGLES,0,3);gl.flush();
    if(gl.getError()!==gl.NO_ERROR)throw new Error('Halftone WebGL draw failed');
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';
    ctx.drawImage(canvas,0,0,width,height);
  }
  function stats() {
    if(!renderer)return {contexts:0};
    const {gl,program,uniforms:u}=renderer,uniforms={};
    for(const [name,location] of Object.entries(u)){
      const value=gl.getUniform(program,location);uniforms[name]=ArrayBuffer.isView(value)?Array.from(value):value;
    }
    return {contexts:1,programs:1,buffers:1,textures:0,lost:renderer.lost||gl.isContextLost(),uniforms};
  }
  function mount(host,content,onsets,make,reveal) {
    if(content.style!=='halftone-field')throw new Error('Unknown halftone style');
    clock(0,onsets);
    const copy=make('div','screen-copy',null,host),heading=make('h2','prod-heading',content.heading,copy,true);
    const caption=make('p','screen-caption',content.caption,copy,true),view=make('div','screen-device backdrop-art',null,host);
    const canvas=make('canvas','backdrop-canvas',null,view);canvas.setAttribute('aria-hidden','true');
    canvas.width=view.clientWidth;canvas.height=view.clientHeight;Object.assign(canvas.style,{width:'100%',height:'100%',display:'block'});
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Cannot paint halftone backdrop');
    const css=getComputedStyle(host),colors={background:css.getPropertyValue('--purple').trim(),
      accent:css.getPropertyValue('--lime').trim(),secondary:css.getPropertyValue('--cyan').trim()};
    palette(colors);view.dataset.backdrop=content.style;
    return time=>{
      const state=clock(time,onsets),entry=1-(1-state.entry)**3;
      reveal(heading,entry,32);reveal(caption,entry,24);canvas.style.opacity=String(entry);
      draw(ctx,canvas.width,canvas.height,state.sourceTime,colors);
      view.dataset.backdropProgress=String(state.entry);view.dataset.halftoneClock=JSON.stringify(state);
    };
  }
  window.ShortCreatorHalftone={recipe,palette,clock,draw,stats,mount};
})();
