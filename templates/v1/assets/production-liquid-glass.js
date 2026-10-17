/* Native adapters for HyperFrames liquid-glass notifications and widgets.
   The source GPU core refracts verified local pixels; no DOM capture API is used. */
(() => {
  'use strict';
  const variants=Object.freeze(['liquid-glass','liquid-widgets']);
  const clamp=x=>Math.max(0,Math.min(1,x)),out=(x,n=4)=>1-(1-clamp(x))**n;
  const configs=Object.freeze({
    'liquid-glass':Object.freeze({blurAmount:.22,refraction:.6,cornerRadius:36,zRadius:38,specular:.2,fresnel:.9,
      edgeHighlight:.1,chromAberration:.05,shadowOpacity:.35,shadowSpread:14,shadowOffsetY:4,saturation:.25}),
    'liquid-widgets':Object.freeze({blurAmount:.42,refraction:.82,cornerRadius:28,zRadius:46,specular:.34,fresnel:1.25,
      edgeHighlight:.26,chromAberration:.08,shadowOpacity:0,shadowSpread:0,shadowOffsetY:0,saturation:.38}),
  });
  function layout(variant,width,height,count) {
    if(!variants.includes(variant)||![width,height].every(v=>Number.isFinite(v)&&v>=240&&v<=1920)||
       !Number.isInteger(count)||count<2||count>4)throw new Error('Invalid bounded glass layout');
    const gap=24,pad=28;
    if(variant==='liquid-glass') {
      const h=(height-pad*2-gap*(count-1))/count;
      return Array.from({length:count},(_,i)=>({x:pad,y:pad+i*(h+gap),width:width-2*pad,height:h}));
    }
    const cols=width/height>2?count:2,rows=Math.ceil(count/cols);
    const w=(width-pad*2-gap*(cols-1))/cols,h=(height-pad*2-gap*(rows-1))/rows;
    return Array.from({length:count},(_,i)=>({x:pad+(i%cols)*(w+gap),y:pad+Math.floor(i/cols)*(h+gap),width:w,height:h}));
  }
  function pose(variant,progress,box,width,height) {
    if(!variants.includes(variant)||!Number.isFinite(progress))throw new Error('Invalid glass cue pose');
    const p=clamp(progress),state={...box,opacity:1,progress:p,visible:p>0};
    if(variant==='liquid-glass') {
      const t=p*.52;
      state.x=t<.36?(width+40)+(box.x-14-width-40)*out(t/.36):box.x-14+14*out((t-.36)/.16,3);
      state.opacity=out(t/.36);
    } else state.y=box.y+(height+80-box.y)*(1-out(p));
    if(p===1){state.x=box.x;state.y=box.y;state.opacity=1;}
    state.copyVisible=state.visible&&state.x>=0&&state.y>=0&&state.x+state.width<=width&&state.y+state.height<=height;
    return state;
  }
  // Source blur passes reuse one uniform buffer inside a single command encoder.
  // Separate H/V buffers keep queued passes from all reading the final V value.
  function separateBlurUniforms(renderer,usage) {
    const horizontal=renderer.blurUniformBuffer,vertical=renderer.device.createBuffer({size:16,usage});
    const original=renderer._blurPass;
    renderer._blurPass=function(encoder,input,output,width,height,dx,dy) {
      if((dx===0)===(dy===0))throw new Error('Glass blur must use one axis per pass');
      this.blurUniformBuffer=dx!==0?horizontal:vertical;
      try {return original.call(this,encoder,input,output,width,height,dx,dy);}
      finally {this.blurUniformBuffer=horizontal;}
    };
    return ()=>vertical.destroy();
  }
  let renderer=null,preparation=null,failed=null,releaseBlur=null,queue=Promise.resolve(),disposed=false;
  async function prepare() {
    if(!preparation)preparation=(async()=>{
      const core=window.ShortCreatorLiquidGlassRuntime;if(!core)throw new Error('Missing pinned glass GPU core');
      renderer=new core.GlassRendererGPU();
      const pipelines=renderer._initPipelines.bind(renderer);let pipelineCheck;
      renderer._initPipelines=()=>{
        renderer.device.pushErrorScope('validation');
        try {pipelines();} finally {pipelineCheck=renderer.device.popErrorScope();}
      };
      if(!await renderer.init())throw new Error('WebGPU liquid glass unavailable');
      const error=await pipelineCheck;if(error)throw new Error('Liquid glass pipeline: '+error.message);
      renderer.device.addEventListener('uncapturederror',event=>{failed=new Error('Liquid glass GPU: '+event.error.message);});
      renderer.device.lost.then(info=>{if(!disposed)failed=new Error('Liquid glass device lost: '+info.reason);});
      releaseBlur=separateBlurUniforms(renderer,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST);
    })();
    await preparation;if(failed)throw failed;
  }
  function draw(background,context,states,variant) {
    const work=queue.then(async()=>{
      await prepare();
      context.clearRect(0,0,background.width,background.height);context.drawImage(background,0,0);
      const settings={...window.ShortCreatorLiquidGlassRuntime.DEFAULTS,...configs[variant]};
      for(const state of states) {
        if(!state.visible||state.opacity<=0)continue;
        const width=Math.ceil(state.width+40),height=Math.ceil(state.height+40),x=state.x-20,y=state.y-20;
        // One target set at a time bounds memory across a long mixed-scene film.
        renderer.resize(width,height);renderer.device.pushErrorScope('validation');
        try {
          renderer.uploadAndBlur(background,x,y,width,height,settings.blurAmount);
          renderer.clear();renderer.renderGlassPanel(settings,state.width,state.height,1);
        } finally {
          const error=await renderer.device.popErrorScope();if(error)throw new Error('Liquid glass frame: '+error.message);
        }
        await renderer.device.queue.onSubmittedWorkDone();if(failed)throw failed;
        context.globalAlpha=state.opacity;
        context.drawImage(renderer.canvas,0,0,width,height,x,y,width,height);context.globalAlpha=1;
      }
    });
    queue=work.catch(error=>{failed=error;});return work;
  }
  const preparations=[];
  function mount(host,content,onsets,make,data) {
    if(!variants.includes(content.variant)||!data.assets[content.image])throw new Error('Unknown liquid-glass presentation or image');
    make('h2','prod-heading',content.heading,host,true);
    const board=make('div','interface-board interface-'+content.style+' interface-presets liquid-interface',null,host);
    make('p','interface-source',content.source,host,true);
    board.dataset.interfaceStyle=content.style;board.dataset.interfaceVariant=content.variant;board.dataset.glassImage=content.image;
    const width=board.clientWidth,height=board.clientHeight,boxes=layout(content.variant,width,height,content.items.length);
    const canvas=make('canvas','liquid-canvas',null,board);canvas.width=width;canvas.height=height;canvas.setAttribute('aria-hidden','true');
    const context=canvas.getContext('2d',{alpha:false});if(!context)throw new Error('Cannot paint glass composition');
    const background=document.createElement('canvas');background.width=width;background.height=height;
    const bg=background.getContext('2d',{alpha:false});if(!bg)throw new Error('Cannot prepare glass background');
    const image=new Image();image.src=data.assets[content.image];
    const imageReady=image.decode().then(()=>{
      bg.fillStyle=getComputedStyle(host).getPropertyValue('--purple').trim();bg.fillRect(0,0,width,height);
      const scale=Math.min(width/image.naturalWidth,height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
      bg.drawImage(image,(width-w)/2,(height-h)/2,w,h);
      board.dataset.glassImageSize=JSON.stringify([image.naturalWidth,image.naturalHeight]);
    });
    preparations.push(Promise.all([imageReady,prepare()]));
    const rows=content.items.map((item,i)=>{
      const row=make('div','interface-row liquid-row',null,board);row.dataset.interfaceIndex=String(i);
      Object.assign(row.style,{left:'0',top:'0',width:boxes[i].width+'px',height:boxes[i].height+'px'});
      const copy=make('div','liquid-copy',null,row);
      make('h3','interface-label',item.label,copy,true);make('p','interface-body',item.body,copy,true);
      return row;
    });
    let last=null;
    return async time=>{
      await imageReady;
      const frame=Math.floor(time*30+1e-7),states=boxes.map((box,i)=>pose(content.variant,clamp((frame-Math.ceil(onsets[i]*30))/24),box,width,height));
      const active=onsets.reduce((previous,onset,i)=>frame>=Math.ceil(onset*30)?i:previous,-1);
      const signature=JSON.stringify(states);
      if(signature!==last){await draw(background,context,states,content.variant);last=signature;}
      rows.forEach((row,i)=>{
        const state=states[i];row.dataset.interfaceProgress=String(state.progress);
        row.style.visibility=state.copyVisible?'visible':'hidden';row.style.opacity=String(state.opacity);
        row.style.transform=`translate(${state.x}px,${state.y}px)`;
      });
      board.dataset.interfaceActive=String(active);
      board.dataset.interfacePresentation=JSON.stringify({variant:content.variant,active,rows:states});
    };
  }
  async function dispose() {await queue;disposed=true;releaseBlur?.();renderer?.destroy();renderer=null;}
  window.ShortCreatorLiquidGlass={variants,configs,layout,pose,separateBlurUniforms,mount,ready:()=>Promise.all(preparations),dispose,
    stats:()=>({contexts:renderer?1:0,targets:renderer?.targetCache.size??0,failed:Boolean(failed),uniformBuffers:releaseBlur?4:0})};
})();
