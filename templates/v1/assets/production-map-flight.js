/* HyperFrames nyc-paris-flight choreography and SVG artwork, Apache-2.0.
   Verified local basemap, explicit endpoints, approved colors and cue-driven time. */
(()=>{
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),out=(p,n=3)=>1-(1-clamp(p))**n;
  const smooth=(p,n)=>p<.5?2**(n-1)*p**n:1-(-2*p+2)**n/2;
  const sine=p=>(1-Math.cos(Math.PI*p))/2;
  const span=(t,start,duration,e=p=>p)=>e(clamp((t-start)/duration));
  const pop=p=>window.ShortCreatorMaps.pop(p,1.6);
  const origin={x:308.41,y:584.158},destination={x:1611.59,y:387.842};
  const planePaths=[
    'M 58 0 C 52 -10 37 -15 15 -16 L -18 -56 C -23 -62 -34 -58 -32 -49 L -21 -15 L -48 -12 C -56 -11 -60 -6 -60 0 C -60 6 -56 11 -48 12 L -21 15 L -32 49 C -34 58 -23 62 -18 56 L 15 16 C 37 15 52 10 58 0 Z',
    'M 54 0 C 46 -6 33 -9 14 -10 L -19 -50 C -21 -53 -25 -52 -25 -47 L -15 -10 L -49 -6 C -53 -5 -55 -2 -55 0 C -55 2 -53 5 -49 6 L -15 10 L -25 47 C -25 52 -21 53 -19 50 L 14 10 C 33 9 46 6 54 0 Z',
  ];
  const doodles=[
    'M 1510 382 C 1505 323 1560 287 1627 300 C 1700 315 1740 358 1720 416 C 1705 468 1624 486 1556 462 C 1518 449 1494 417 1510 382',
    'M 1518 396 C 1488 356 1528 307 1605 296 C 1688 284 1748 338 1730 397 C 1713 453 1641 480 1570 463 C 1526 453 1504 427 1518 396',
  ];
  function route(from,to,box) {
    const dx=destination.x-origin.x,dy=destination.y-origin.y,n=dx*dx+dy*dy;
    const vx=to.x-from.x,vy=to.y-from.y;
    const control=(x,y)=>{
      const a=((x-origin.x)*dx+(y-origin.y)*dy)/n,b=((y-origin.y)*dx-(x-origin.x)*dy)/n;
      return {x:Math.max(box.x,Math.min(box.x+box.width,from.x+a*vx-b*vy)),
        y:Math.max(box.y,Math.min(box.y+box.height,from.y+a*vy+b*vx))};
    };
    return {from,to,a:control(650,520),b:control(1120,245)};
  }
  function point(curve,value) {
    const p=clamp(value),q=1-p;
    return {x:q**3*curve.from.x+3*q*q*p*curve.a.x+3*q*p*p*curve.b.x+p**3*curve.to.x,
      y:q**3*curve.from.y+3*q*q*p*curve.a.y+3*q*p*p*curve.b.y+p**3*curve.to.y};
  }
  function state(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Finite flight time required');
    const t=Math.max(0,Math.min(5.62,seconds)),entry=span(t,.16,1.05,p=>out(p));
    let landing=1;
    if(t>=5.24)landing=.9+.1*span(t,5.24,.22,pop);
    else if(t>=5.12)landing=1.23-.33*span(t,5.12,.12,p=>p**3);
    else if(t>=4.96)landing=1+.23*span(t,4.96,.16,pop);
    const badge=span(t,5.02,.28,pop),pulse=span(t,4.06,.26,pop),fade=span(t,4.64,.58,p=>out(p,4));
    return {time:t,camera:{scale:1.1-.1*entry+.025*span(t,1.28,3.2,sine),x:-38*(1-entry),y:20*(1-entry),alpha:.94+.06*entry},
      pins:[span(t,.7,.34),span(t,.86,.34)].map(p=>({alpha:p,scale:.12+.88*pop(p)})),
      draw:[span(t,1.16,3.1,p=>smooth(p,2)),span(t,1.2,3.05,p=>smooth(p,3)),span(t,1.26,2.92,sine)],
      travel:span(t,1.17,3.25,sine),plane:{alpha:span(t,1.08,.3),scale:(.48+.52*span(t,1.08,.3,pop))*landing},
      ticks:Array.from({length:6},(_,i)=>{
        const enter=span(t,1.34+i*.44,.16,pop),exit=span(t,1.48+i*.44,.34,p=>out(p));
        // The original exit interrupts entry after .14 of its .16 seconds.
        const atExit=.2+.8*pop(.14/.16),scale=t<1.48+i*.44?.2+.8*enter:atExit+(.6-atExit)*exit;
        const alpha=t<1.48+i*.44?span(t,1.34+i*.44,.16):.875+(.18-.875)*exit;
        return {scale,alpha};
      }),
      doodles:[span(t,4.18,.54,p=>out(p)),span(t,4.36,.36,p=>out(p,4))],
      pulse:{scale:(.52+.48*pulse)+(1.5-1)*fade,alpha:span(t,4.06,.26)*(1-fade)},
      badge:{alpha:span(t,5.02,.28),scale:.78+.22*badge+.06*(span(t,5.3,.16,sine)-span(t,5.46,.16,sine))}};
  }
  const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
  function shape(tag,attrs,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);set(node,attrs);parent.appendChild(node);return node;
  }
  function mount(host,c,onsets,data,make,reveal) {
    const title=make('h2','prod-heading',c.heading,host,true),insight=make('p','data-insight',c.insight,host,true);
    make('p','data-source',`${c.source.kind.toUpperCase()} / ${c.source.label} / ${c.source.as_of}`,host,true);
    make('p','data-reference',c.source.reference,host,true);
    const board=make('div','map-board',null,host);board.dataset.mapStyle='flight';
    const picture=make('div','map-picture',null,board),stage=make('div','map-flight-plane',null,picture);
    const image=make('img','map-image',null,stage);image.src=data.assets[c.image];image.alt='';
    const callout=make('div','map-callout',null,board),label=make('span','map-label','',callout,true),badge=make('span','map-value','',callout,true);
    const W=picture.clientWidth,H=picture.clientHeight;
    const svg=shape('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'map-overlay','aria-hidden':'true'},stage);
    let art=null;
    function init() {
      if(!image.complete||!image.naturalWidth)throw new Error('Flight basemap must decode before rendering');
      const box=window.ShortCreatorMaps.contained(W,H,image.naturalWidth,image.naturalHeight);
      const points=c.points.map(p=>({x:box.x+p.x*box.width,y:box.y+p.y*box.height}));
      const unit=Math.min(box.width/1920,box.height/1080),curve=route(points[0],points[1],box);
      const d=`M ${curve.from.x} ${curve.from.y} C ${curve.a.x} ${curve.a.y} ${curve.b.x} ${curve.b.y} ${curve.to.x} ${curve.to.y}`;
      const paths=[24,9,3].map((width,i)=>shape('path',{d,fill:'none',stroke:i===2?'white':'var(--lime)',
        'stroke-width':width*unit,'stroke-linecap':'round','stroke-opacity':i===0?.23:i===2?.86:1,'data-flight-route':i},svg));
      paths[0].style.filter=`blur(${4*unit}px)`;
      const length=paths[1].getTotalLength();paths.forEach(path=>set(path,{'stroke-dasharray':`${length} ${length}`}));
      const ticks=Array.from({length:6},(_,i)=>{
        const p=paths[1].getPointAtLength(length*(i+1)/7);
        const node=shape('circle',{cx:0,cy:0,r:7,fill:'white',stroke:'var(--lime)','stroke-width':3,'data-flight-tick':i},svg);
        return {node,p};
      });
      const pins=points.map((p,i)=>{
        const node=shape('g',{'data-flight-pin':i},svg);
        shape('circle',{r:27,fill:'none',stroke:'var(--lime)','stroke-opacity':.25,'stroke-width':2},node);
        shape('circle',{r:13,fill:'white',stroke:'var(--lime)','stroke-width':7},node);return node;
      });
      const plane=shape('g',{'data-flight-plane':'true'},svg);
      planePaths.forEach((d,i)=>shape('path',{d,fill:i?'var(--lime)':'white'},plane));
      shape('circle',{cx:18,cy:0,r:6,fill:'var(--purple)'},plane);
      const arrival=shape('g',{transform:`translate(${points[1].x} ${points[1].y}) scale(${unit}) translate(${-destination.x} ${-destination.y})`},svg);
      const rings=doodles.map((d,i)=>shape('path',{d,fill:'none',stroke:'var(--cyan)','stroke-width':i?6:13,
        'stroke-opacity':i?.82:1,'stroke-linecap':'round','stroke-linejoin':'round','data-flight-doodle':i},arrival));
      const ringLengths=rings.map(p=>p.getTotalLength());rings.forEach((p,i)=>set(p,{'stroke-dasharray':`${ringLengths[i]} ${ringLengths[i]}`}));
      const pulse=shape('circle',{cx:0,cy:0,r:63,fill:'none',stroke:'var(--cyan)','stroke-width':4,'data-flight-pulse':'true'},svg);
      art={box,points,unit,curve,paths,length,ticks,pins,plane,rings,ringLengths,pulse};
    }
    return time=>{
      if(!art)init();
      const clock=window.ShortCreatorCarousels.clock(time,onsets,5.62),s=state(clock.time),a=art;
      const p=window.ShortCreatorStory.progress(time,onsets[0]);
      const frame=Math.floor(time*30+1e-7),active=onsets.reduce((last,t,i)=>frame>=Math.ceil(t*30)?i:last,-1);
      board.dataset.mapBeat=String(active);board.dataset.mapProgress=String(active<0?0:window.ShortCreatorStory.progress(time,onsets[active]));
      reveal(title,out(p),24);reveal(insight,out(p),18);board.style.opacity=String(out(p));
      stage.style.transform=`translate(${s.camera.x*a.unit}px,${s.camera.y*a.unit}px) scale(${s.camera.scale})`;stage.style.opacity=String(s.camera.alpha);
      a.paths.forEach((path,i)=>set(path,{'stroke-dashoffset':a.length*(1-s.draw[i])}));
      a.ticks.forEach(({node,p},i)=>set(node,{opacity:s.ticks[i].alpha,transform:`translate(${p.x} ${p.y}) scale(${a.unit*s.ticks[i].scale})`}));
      a.pins.forEach((node,i)=>set(node,{opacity:s.pins[i].alpha,transform:`translate(${a.points[i].x} ${a.points[i].y}) scale(${a.unit*s.pins[i].scale})`}));
      const distance=s.travel*a.length,position=a.paths[1].getPointAtLength(distance);
      const before=a.paths[1].getPointAtLength(Math.max(0,distance-.5)),after=a.paths[1].getPointAtLength(Math.min(a.length,distance+.5));
      const angle=Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI;
      set(a.plane,{opacity:s.plane.alpha,transform:`translate(${position.x} ${position.y}) rotate(${angle}) scale(${a.unit*s.plane.scale})`});
      a.rings.forEach((path,i)=>set(path,{'stroke-dashoffset':a.ringLengths[i]*(1-s.doodles[i])}));
      set(a.pulse,{opacity:s.pulse.alpha,transform:`translate(${a.points[1].x} ${a.points[1].y}) scale(${a.unit*s.pulse.scale})`});
      label.textContent=active<0?'':`${c.points[0].label} → ${c.points[1].label}`;
      badge.textContent=s.time<5.02?'':c.arrival;badge.style.opacity=String(s.badge.alpha);badge.style.transform=`scale(${s.badge.scale})`;
      reveal(callout,out(p),12);
      board.dataset.flightState=JSON.stringify({...s,clock,box:a.box,curve:a.curve,unit:a.unit,position,angle,length:a.length});
    };
  }
  window.ShortCreatorMapFlight={origin,destination,route,point,state,mount};
})();
