/* HyperFrames bundled shader geometry, driven only by native caption frames.
   Original shader colors are mapped to the approved background/accent palette. */
(() => {
  'use strict';
  const shaders=Object.freeze({
    'gpu-aurora':'Aurora','gpu-blob':'Blob','gpu-chrome-orb':'Chrome','gpu-color-wheel':'ColorWheel',
    'gpu-falling-lines':'FallingLines','gpu-flowing-gradient':'FlowingGradient','gpu-fractal-noise':'FractalNoise',
    'gpu-frost':'Frost','gpu-gabor-noise':'GaborNoise','gpu-godrays':'Godrays','gpu-goo':'Goo',
    'gpu-heatmap':'Heatmap','gpu-hologram':'Hologram','gpu-holographic':'Holographic',
    'gpu-lens-flare':'LensFlare','gpu-light-edge':'LightEdge','gpu-liquid-metal':'LiquidMetal',
    'gpu-marble':'Marble','gpu-mesh-gradient':'MeshGradient','gpu-nebula':'Nebula',
    'gpu-obsidian':'Obsidian','gpu-plasma':'Plasma','gpu-plastic':'Plastic','gpu-prism':'Prism',
    'gpu-ripples':'Ripples','gpu-sine-wave':'SineWave','gpu-spiral':'Spiral','gpu-strands':'Strands',
    'gpu-stripes':'Stripes','gpu-sun-burst':'SunBurst','gpu-swirl':'Swirl','gpu-thin-film':'ThinFilm',
    'gpu-voronoi':'Voronoi','gpu-water':'Water','gpu-waveform':'Waveform','gpu-worley-noise':'WorleyNoise',
  });
  const kinds=Object.freeze(Object.keys(shaders));
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>1-(1-clamp(x))**3;
  function clock(time,onsets) {
    if(!Number.isFinite(time)||!Array.isArray(onsets)||onsets.length!==2||
       !onsets.every(Number.isFinite)||onsets[1]-onsets[0]<2-1e-8)throw new Error('Invalid GPU backdrop cue clock');
    const frame=Math.floor(time*30+1e-7),start=Math.ceil(onsets[0]*30),stop=Math.ceil(onsets[1]*30);
    const elapsed=Math.max(0,frame-start),gap=stop-start,settle=clamp((elapsed-gap)/24);
    // Integrate velocity falloff over the final 24 frames. Absolute evaluation
    // avoids accumulated deltas during capture and backward seeking.
    const seconds=settle===1?2:2*(Math.min(elapsed,gap)+24*(settle-settle**3+.5*settle**4))/(gap+12);
    return {seconds,settle,entry:clamp(elapsed/24),visible:frame>=start};
  }
  function palette(colors) {
    const rgb=key=>{
      const hex=colors[key];if(typeof hex!=='string'||!/^#[\da-f]{6}$/i.test(hex))throw new Error('GPU backdrop requires approved hex colors');
      return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    };
    const stops=[rgb('background'),rgb('secondary'),rgb('accent')],table=new Uint8ClampedArray(768);
    for(let i=0;i<256;i++) {
      const t=i/255*2,k=Math.min(1,Math.floor(t)),p=t-k;
      for(let j=0;j<3;j++)table[i*3+j]=stops[k][j]+(stops[k+1][j]-stops[k][j])*p;
    }
    return table;
  }
  function recolor(pixels,table) {
    if(!(pixels instanceof Uint8ClampedArray)||pixels.length%4||!(table instanceof Uint8ClampedArray)||table.length!==768)
      throw new Error('Invalid GPU backdrop pixel buffer');
    for(let i=0;i<pixels.length;i+=4) {
      const luma=Math.min(255,Math.round((54*pixels[i]+183*pixels[i+1]+19*pixels[i+2])/256)),alpha=pixels[i+3]/255;
      for(let j=0;j<3;j++)pixels[i+j]=table[j]+(table[luma*3+j]-table[j])*alpha;
      pixels[i+3]=255;
    }
  }
  const preparations=[];
  function mount(host,content,onsets,make,reveal) {
    if(!Object.hasOwn(shaders,content.style))throw new Error('Unknown GPU backdrop');
    const runtime=window.ShortCreatorGpuRuntime;if(!runtime)throw new Error('Missing bundled GPU runtime');
    clock(0,onsets);
    const copy=make('div','screen-copy',null,host);
    const heading=make('h2','prod-heading',content.heading,copy,true),caption=make('p','screen-caption',content.caption,copy,true);
    const view=make('div','screen-device backdrop-art',null,host),canvas=make('canvas','backdrop-canvas',null,view);
    canvas.setAttribute('aria-hidden','true');canvas.width=view.clientWidth;canvas.height=view.clientHeight;
    Object.assign(canvas.style,{width:'100%',height:'100%',display:'block'});
    const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
    if(!ctx)throw new Error('Cannot paint GPU backdrop');
    const css=getComputedStyle(host),colors={background:css.getPropertyValue('--purple').trim(),
      accent:css.getPropertyValue('--lime').trim(),secondary:css.getPropertyValue('--cyan').trim()};
    const table=palette(colors);
    view.dataset.backdrop=content.style;view.dataset.gpuPalette=JSON.stringify(colors);
    preparations.push(runtime.prepare(canvas.width,canvas.height));
    let last=null;
    return async time=>{
      const state=clock(time,onsets);reveal(heading,ease(state.entry),32);reveal(caption,ease(state.entry),24);
      canvas.style.opacity=String(ease(state.entry));
      if(last!==state.seconds) {
        const rendered=await runtime.draw(canvas,shaders[content.style],state.seconds);
        const image=ctx.getImageData(0,0,canvas.width,canvas.height);recolor(image.data,table);ctx.putImageData(image,0,0);
        view.dataset.gpuFrame=JSON.stringify(rendered);last=state.seconds;
      }
      view.dataset.backdropProgress=String(state.entry);view.dataset.gpuClock=JSON.stringify(state);
    };
  }
  window.ShortCreatorGpuBackdrops={kinds,shaders,clock,palette,recolor,mount,ready:()=>Promise.all(preparations)};
})();
