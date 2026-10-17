/* Bounded native host for retained HyperFrames source renderers (Apache-2.0).
   Only compiled content, approved fonts and pinned local payloads enter the child document. */
(() => {
  'use strict';
  const styles=Object.freeze(['glass-shard','frost-orbit']);
  const duration=Object.freeze({'glass-shard':9,'frost-orbit':22.5});
  const clamp=x=>Math.max(0,Math.min(1,x));
  let active=null;
  function clock(time,onsets,style) {
    if(!styles.includes(style)||!Number.isFinite(time)||onsets.length!==2||!onsets.every(Number.isFinite))
      throw new Error('Invalid source stage clock');
    const first=Math.ceil(onsets[0]*30),last=Math.ceil(onsets[1]*30),frame=Math.floor(time*30+1e-7);
    if(last-first<duration[style]*30)throw new Error('Source stage cues compress the original choreography');
    return {seconds:duration[style]*clamp((frame-first)/(last-first)),entry:clamp((frame-first)/24),caption:clamp((frame-last)/24)};
  }
  function wordSvg(word,font) {
    if(font?.version!==1||font.units!==1000||!font.font_sha256)throw new Error('Approved word outlines unavailable');
    let x=0;const paths=[];
    for(const character of word){
      const glyph=font.glyphs[character];if(!glyph)throw new Error('Missing approved glyph');
      const commands=glyph.commands.map(([kind,...values])=>kind+values.join(' ')).join(' ');
      paths.push(`<path transform="translate(${x} 0) scale(1 -1)" d="${commands}"/>`);x+=glyph.advance;
    }
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -1100 ${x} 1600"><g fill="white">${paths.join('')}</g></svg>`;
    return 'data:image/svg+xml;base64,'+btoa(svg);
  }
  function payload(c,width,height,colors) {
    const fonts=window.ShortCreatorSourceFonts,resources=window.ShortCreatorSourceTextures;
    if(!fonts?.display_sha256||!fonts?.body_sha256||!resources)throw new Error('Verified source stage payload unavailable');
    const vars={headline:c.heading,headline1:c.heading,headline2:c.caption,
      materialBaseColor:'#ffffff',attenuationColor:'#ffffff',accentCoolColor:colors.secondary,
      accentWarmColor:colors.accent,backdropTop:colors.background,backdropMid:colors.background,
      backdropBottom:colors.background,grainStrength:0,backdropNoise:0,strayDust:0,idleYaw:0,driftYaw:0,driftSway:0,
      shapeResolution:'128',erosionResolution:'64',particleCount:'100k',renderScale:1,
      rendererProfile:'studio',quality:'full',upscaler:'native'};
    return {style:c.style,width,height,colors,vars,resources,bodyFont:fonts.body,displayFont:fonts.display,
      wordSvg:c.style==='frost-orbit'?wordSvg(c.word,window.ShortCreatorFontOutlines):null};
  }
  function documentSource(config) {
    // The parent retains its native brand and caption overlay. Source globals stay in one owned frame.
    const boot='<script src="assets/production-source-bootstrap.js"></script>';
    if(config.style==='frost-orbit')return window.ShortCreatorSourceTemplates['frost-orbit'].replace('<!--SOURCE_BOOT-->',boot);
    return `<!doctype html><html><head>${boot}
      <script src="assets/production-three-runtime.js"></script><script src="assets/production-source-delaunay.js"></script></head><body>
      <canvas id="gst-canvas"></canvas><link id="gst-hdr"><link id="gst-matcap">
      <script src="assets/production-shard-runtime.js"></script></body></html>`;
  }

  function dispose() {
    if(!active)return;
    try{active.frame.contentWindow?.__source?.dispose();}finally{active.frame.remove();active=null;}
  }
  async function prepare(key,c,width,height,colors) {
    if(active?.key===key)return active.ready;
    dispose();
    const frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');
    frame.setAttribute('title','Local source composition');
    frame.style.cssText=`position:fixed;left:-12000px;top:0;width:${width}px;height:${height}px;border:0;pointer-events:none;`;
    const item={key,frame,config:payload(c,width,height,colors),ready:null};active=item;
    item.ready=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Source composition initialization exceeded 120 seconds')),120000);
      frame.onload=async()=>{
        try{
          const child=frame.contentWindow;
          if(child.__sourceFailure)throw new Error(child.__sourceFailure);
          if(!child.__sourceReady)throw new Error('Source composition did not initialize');
          await child.__sourceReady;
          if(child.__sourceFailure||!child.__source)throw new Error(child.__sourceFailure||'Source renderer missing');
          resolve(child.__source);
        }catch(error){reject(error);}finally{clearTimeout(timer);}
      };
      frame.onerror=()=>{clearTimeout(timer);reject(new Error('Local source document failed to load'));};
      frame.srcdoc=documentSource(item.config);document.body.appendChild(frame);
    });
    return item.ready;
  }
  function mount(host,c,onsets,data,make,reveal) {
    if(!styles.includes(c.style))throw new Error('Unknown source composition');
    const heading=make('h2','prod-heading',c.heading,host,true);
    const board=make('div','source-stage-board',null,host),canvas=make('canvas','source-stage-canvas',null,board);
    const caption=make('p','source-stage-caption',c.caption,host,true);make('p','source-stage-source',c.source,host,true);
    canvas.width=board.clientWidth;canvas.height=board.clientHeight;canvas.setAttribute('aria-hidden','true');
    const context=canvas.getContext('2d',{willReadFrequently:true});
    if(!context)throw new Error('Source composition output canvas unavailable');
    const css=getComputedStyle(host),colors={background:css.getPropertyValue('--purple').trim(),
      accent:css.getPropertyValue('--lime').trim(),secondary:css.getPropertyValue('--cyan').trim()};
    const key={};let last=null;
    return async time=>{
      const state=clock(time,onsets,c.style);reveal(heading,state.entry,24);reveal(caption,state.caption,16);
      if(last===state.seconds&&active?.key===key)return;
      const source=await prepare(key,c,canvas.width,canvas.height,colors);
      await source.renderAt(state.seconds);
      if(active.frame.contentWindow.__sourceFailure)throw new Error(active.frame.contentWindow.__sourceFailure);
      context.globalCompositeOperation='copy';context.globalAlpha=Number(source.canvas.style.opacity||1);
      context.drawImage(source.canvas,0,0,canvas.width,canvas.height);
      context.globalCompositeOperation='source-over';context.globalAlpha=1;
      board.dataset.sourceState=JSON.stringify({style:c.style,clock:state,rig:source.inspect(),
        font_sha256:window.ShortCreatorSourceFonts[c.style==='glass-shard'?'body_sha256':'display_sha256']});
      last=state.seconds;
    };
  }
  window.addEventListener('pagehide',dispose);
  function childConfig(child) {
    if(!active||active.frame.contentWindow!==child)throw new Error('Unowned source frame');
    return active.config;
  }
  window.ShortCreatorSourceStages={styles,duration,clock,wordSvg,mount,dispose,childConfig};
})();
