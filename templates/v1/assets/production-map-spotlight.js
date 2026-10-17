/* HyperFrames north-korea-locked-down camera and annotation, Apache-2.0.
   Local image/region/copy replace the example map and editorial assertion. */
(()=>{
  'use strict';
  const clamp=p=>Math.max(0,Math.min(1,p)),out=(p,n=3)=>1-(1-clamp(p))**n;
  const sine=p=>(1-Math.cos(Math.PI*p))/2;
  const expo=p=>p===0||p===1?p:p<.5?2**(20*p-10)/2:(2-2**(-20*p+10))/2;
  const span=(t,start,duration,e=p=>p)=>e(clamp((t-start)/duration));
  const paths=[
    'M 74 211 C 42 119 118 42 254 36 C 410 30 524 111 508 222 C 494 320 350 377 208 346 C 94 322 37 278 74 211',
    'M 92 231 C 33 150 105 55 243 44 C 408 31 529 126 501 244 C 480 334 335 370 197 342 C 83 319 47 269 92 231',
  ];
  function state(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Finite spotlight time required');
    const t=Math.max(0,Math.min(6.55,seconds)),approach=span(t,0,3.18,expo);
    const land=span(t,3.18,.42,p=>window.ShortCreatorMaps.pop(p,1.5)),pull=span(t,4.2,2.35,sine);
    const entry=span(t,3.12,.16,p=>out(p)),pop=span(t,3.78,.28,p=>window.ShortCreatorMaps.pop(p,1.6));
    const accent=span(t,4.1,.14,sine)-span(t,4.24,.14,sine);
    return {time:t,approach,camera:{scale:.92+1.2*approach+.08*land-.14*pull,x:-70+14*approach+12*land-38*pull,
      y:18-40*approach-12*land+26*pull,saturation:.92+.16*approach,contrast:.98+.06*approach},
      annotation:{alpha:entry,scale:.92+.08*entry+.045*accent,x:4*(1-entry),y:-4*(1-entry)},
      draw:[span(t,3.24,.62,p=>out(p)),span(t,3.46,.44,p=>out(p,4))],label:{alpha:clamp(pop),scale:.82+.18*pop},
      wash:span(t,3.82,.24,p=>out(p))-.18*pull,scan:.44*span(t,3.86,.18),
      corners:Array.from({length:4},(_,i)=>{const entry=span(t,.42+i*.035,.28,p=>out(p,4));
        return {scale:.72+.28*entry,alpha:.72*entry-.34*span(t,5.82,.72,sine)};})};
  }
  function geometry(width,height,iw,ih,region,s) {
    const box=window.ShortCreatorMaps.contained(width,height,iw,ih),cx=box.x+(region.x+region.width/2)*box.width,cy=box.y+(region.y+region.height/2)*box.height;
    const unit=Math.min(width/1920,height/1080),anchorX=width/2+(cx-width/2)*s.approach,anchorY=height/2+(cy-height/2)*s.approach;
    const x=width/2-anchorX*s.camera.scale+s.camera.x*unit;
    const y=height*(.51+.11*s.approach)-anchorY*s.camera.scale+s.camera.y*unit;
    const r={x:(box.x+region.x*box.width)*s.camera.scale+x,y:(box.y+region.y*box.height)*s.camera.scale+y,
      width:region.width*box.width*s.camera.scale,height:region.height*box.height*s.camera.scale};
    return {box,unit,camera:{x,y,scale:s.camera.scale},region:r,
      ink:{x:r.x-r.width*.08,y:r.y-r.height*.08,width:r.width*1.16,height:r.height*1.16}};
  }
  const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
  function shape(tag,attrs,parent) {const n=document.createElementNS('http://www.w3.org/2000/svg',tag);set(n,attrs);parent.appendChild(n);return n;}
  function mount(host,c,onsets,data,make,reveal) {
    const heading=make('h2','prod-heading',c.heading,host,true),insight=make('p','data-insight',c.insight,host,true);
    make('p','data-source',`${c.source.kind.toUpperCase()} / ${c.source.label} / ${c.source.as_of}`,host,true);make('p','data-reference',c.source.reference,host,true);
    const board=make('div','map-board',null,host);board.dataset.mapStyle='spotlight';
    const picture=make('div','map-picture',null,board),camera=make('div','map-spotlight-camera',null,picture);
    const image=make('img','map-image',null,camera);image.src=data.assets[c.image];image.alt='';
    const wash=make('div','map-spotlight-wash',null,picture),scan=make('div','map-spotlight-lines',null,picture);
    const ink=make('div','map-spotlight-ink',null,picture),svg=shape('svg',{viewBox:'0 0 560 392',preserveAspectRatio:'none','aria-hidden':'true'},ink);
    const strokes=paths.map((d,i)=>shape('path',{d,fill:'none',stroke:'var(--lime)','stroke-width':i?6:12,
      'stroke-linecap':'round','stroke-linejoin':'round','stroke-opacity':i?.82:1,'data-spotlight-stroke':i},svg));
    const lengths=strokes.map(n=>n.getTotalLength());strokes.forEach((n,i)=>set(n,{'stroke-dasharray':`${lengths[i]} ${lengths[i]}`}));
    const label=make('span','map-label map-spotlight-label',c.label,picture,true);
    const empty=make('span','map-value','',board);empty.style.display='none';
    const W=picture.clientWidth,H=picture.clientHeight;
    const cornersSvg=shape('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'map-overlay','aria-hidden':'true'},picture);
    const corners=[[0,0],[1,0],[0,1],[1,1]].map(([right,bottom],i)=>{
      const x=right?W-12:12,y=bottom?H-12:12,unit=Math.min(W/1920,H/1080);
      const node=shape('path',{d:`M 0 ${84*unit} L 0 0 L ${84*unit} 0`,fill:'none',stroke:'var(--cyan)','stroke-width':Math.max(1,5*unit),'data-spotlight-corner':i},cornersSvg);
      return {node,x,y,sx:right?-1:1,sy:bottom?-1:1};
    });
    return time=>{
      if(!image.complete||!image.naturalWidth)throw new Error('Spotlight image must decode before rendering');
      const clock=window.ShortCreatorCarousels.clock(time,onsets,6.55),s=state(clock.time),g=geometry(W,H,image.naturalWidth,image.naturalHeight,c.region,s);
      const p=window.ShortCreatorStory.progress(time,onsets[0]),frame=Math.floor(time*30+1e-7);
      const active=onsets.reduce((last,t,i)=>frame>=Math.ceil(t*30)?i:last,-1);
      board.dataset.mapBeat=String(active);board.dataset.mapProgress=String(active<0?0:window.ShortCreatorStory.progress(time,onsets[active]));
      reveal(heading,out(p),24);reveal(insight,out(p),18);board.style.opacity=String(out(p));
      camera.style.transform=`translate(${g.camera.x}px,${g.camera.y}px) scale(${g.camera.scale})`;
      camera.style.filter=`saturate(${s.camera.saturation}) contrast(${s.camera.contrast})`;
      wash.style.opacity=String(s.wash);scan.style.opacity=String(s.scan);
      Object.assign(ink.style,{left:g.ink.x+'px',top:g.ink.y+'px',width:g.ink.width+'px',height:g.ink.height+'px',opacity:String(s.annotation.alpha),
        transform:`translate(${s.annotation.x*g.unit}px,${s.annotation.y*g.unit}px) scale(${s.annotation.scale})`});
      strokes.forEach((n,i)=>set(n,{'stroke-dashoffset':lengths[i]*(1-s.draw[i])}));
      label.style.left=Math.max(12,Math.min(W-label.offsetWidth-12,g.region.x+g.region.width/2-label.offsetWidth/2))+'px';
      label.style.top=Math.max(12,g.ink.y-label.offsetHeight-12)+'px';
      label.style.opacity=String(s.label.alpha);label.style.transform=`scale(${s.label.scale})`;
      corners.forEach((c,i)=>set(c.node,{opacity:s.corners[i].alpha,transform:`translate(${c.x} ${c.y}) scale(${c.sx*s.corners[i].scale} ${c.sy*s.corners[i].scale})`}));
      board.dataset.spotlightState=JSON.stringify({...s,clock,geometry:g});
    };
  }
  window.ShortCreatorMapSpotlight={paths,state,geometry,mount};
})();
