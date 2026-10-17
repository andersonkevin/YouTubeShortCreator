/* Local-image annotation: HyperFrames cursor-annotate path tracking,
   press-ripple tip pivot and yt-circle-pointer stroke drawing. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),out=x=>1-(1-clamp(x))**3;
  function regionPixels(width,height,imageWidth,imageHeight,region) {
    if(!(width>0&&height>0&&imageWidth>0&&imageHeight>0))throw new Error('Annotation image is not decoded');
    const scale=Math.min(width/imageWidth,height/imageHeight),w=imageWidth*scale,h=imageHeight*scale;
    return {x:(width-w)/2+region.x*w,y:(height-h)/2+region.y*h,width:region.width*w,height:region.height*h};
  }
  function pointerState(amount,height,pathPoint) {
    const p=clamp(amount),draw=clamp((p-.3)/.5),begin=pathPoint(0),end=pathPoint(1);
    let point=pathPoint(draw);
    if(p<.3)point={x:begin.x,y:height*1.16+(begin.y-height*1.16)*out(p/.3)};
    if(p>.8)point={x:end.x,y:end.y+(height*1.16-end.y)*((p-.8)/.2)**3};
    const press=clamp((p-.3)/.18),scale=p<.3||p>.48?1:press<1/3?1-.16*(press*3)**2:.84+.16*out((press-1/3)*1.5);
    // SVG getPointAtLength returns a DOMPoint with non-enumerable coordinates.
    return {x:point.x,y:point.y,draw,scale,rings:[0,.075].map(delay=>{
      const age=(p-.3-delay)/.32,q=clamp(age);
      return {radius:16+56*out(q),opacity:age<0||age>=1?0:(1-q*q)*(delay?.6:1)};
    })};
  }
  const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
  function activeAt(time,onsets) {
    const frame=Math.floor(time*30+1e-7);
    let active=-1;onsets.forEach((onset,i)=>{if(frame>=Math.ceil(onset*30))active=i;});
    return active;
  }
  function shape(tag,attrs,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);set(node,attrs);parent.appendChild(node);return node;
  }
  function mount(host,c,onsets,data,make) {
    make('h2','prod-heading',c.heading,host,true);
    const board=make('div','annotation-board',null,host),image=make('img','',null,board);
    image.src=data.assets[c.image];image.alt='';
    const svg=shape('svg',{class:'annotation-overlay'},board);
    const paths=c.marks.map(()=>shape('path',{fill:'none',stroke:'var(--lime)','stroke-width':5,'stroke-linecap':'round'},svg));
    const rings=[0,1].map(()=>shape('circle',{fill:'none',stroke:'var(--lime)','stroke-width':3},svg));
    const cursor=shape('g',{'data-annotation-cursor':'true'},svg);
    const arrow=shape('path',{d:'M5 3 L5 19 L9 15 L12 22 L15 20.5 L11.5 14 L18 14 Z',fill:'white',stroke:'var(--purple)','stroke-width':1.4},cursor);
    const pen=shape('g',{display:'none'},cursor);
    shape('path',{d:'M 0 0 L -43 -11 L -52 0 L -43 11 Z',fill:'var(--surface)',stroke:'white','stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round'},pen);
    shape('path',{d:'M 0 0 L -11 -7 L -11 7 Z',fill:'var(--lime)',stroke:'white','stroke-width':3},pen);
    const label=make('p','annotation-label','',host,true);make('p','annotation-source',c.source,host,true);
    let geometry=null;
    return time=>{
      const W=board.clientWidth,H=board.clientHeight;
      if(!geometry){
        set(svg,{viewBox:`0 0 ${W} ${H}`,width:W,height:H});
        geometry=c.marks.map((mark,i)=>{
          const r=regionPixels(W,H,image.naturalWidth,image.naturalHeight,mark),x=r.x+3,y=r.y+3,w=Math.max(1,r.width-6),h=Math.max(1,r.height-6);
          paths[i].dataset.annotationRegion=JSON.stringify(r);
          if(['scan-gate','segmentation-flood'].includes(mark.style))
            return window.ShortCreatorImageInspection.prepare(svg,paths[i],mark.style,r,i);
          if(mark.style.startsWith('hand-')) {
            const ink=window.ShortCreatorAnnotationInk,id=ink.maskId(Number(host.closest('.scene').dataset.productionIndex),i);
            return ink.prepare(svg,paths[i],mark,r,id,i+1);
          }
          let d;
          if(mark.style==='circle')d=`M ${x+w} ${y+h/2} A ${w/2} ${h/2} 0 1 1 ${x} ${y+h/2} A ${w/2} ${h/2} 0 1 1 ${x+w} ${y+h/2}`;
          else if(mark.style==='underline')d=`M ${x} ${y+h} Q ${x+w/2} ${y+h-4} ${x+w} ${y+h}`;
          else d=`M ${x} ${y} H ${x+w} V ${y+h} H ${x} Z`;
          set(paths[i],{d});const length=paths[i].getTotalLength();set(paths[i],{'stroke-dasharray':`${length} ${length}`});
          return {length,point:p=>paths[i].getPointAtLength(p*length)};
        });
      }
      board.style.opacity=String(out(window.ShortCreatorStory.progress(time,onsets[0])));
      const active=activeAt(time,onsets.slice(1));
      const p=active<0?0:window.ShortCreatorStory.progress(time,onsets[active+1]);
      board.dataset.annotationIndex=String(active);board.dataset.annotationProgress=String(p);
      paths.forEach((path,i)=>{
        const q=window.ShortCreatorStory.progress(time,onsets[i+1]),draw=clamp((q-.3)/.5);
        const opacity=i>active?0:i===active?1:.25,g=geometry[i];
        if(g.renderCue)g.renderCue(q,opacity);
        else if(g.render)g.render(g.ease(draw),opacity);
        else set(path,{'stroke-dashoffset':g.length*(1-draw),opacity});
        if(!g.renderCue)path.dataset.annotationDraw=String(draw);
      });
      const g=geometry[Math.max(0,active)];
      const usePen=c.marks[Math.max(0,active)].pointer==='pen';
      const travelHeight=usePen?window.ShortCreatorAnnotationInk.penTravelHeight(W,H):H;
      const state=pointerState(p,travelHeight,q=>g.point(g.ease?g.ease(q):q)),size=W*.07;
      set(arrow,{display:usePen?'none':'inline'});set(pen,{display:usePen?'inline':'none'});
      if(usePen) {
        const pose=window.ShortCreatorAnnotationInk.penPose(g.length,g.point,g.ease?g.ease(state.draw):state.draw);
        set(cursor,{transform:`translate(${state.x} ${state.y}) rotate(${pose.rotation}) scale(${W*.0012*state.scale})`});
      } else set(cursor,{transform:`translate(${state.x} ${state.y}) scale(${size/24*state.scale}) translate(-5 -3)`});
      set(cursor,{opacity:g.inspection?0:1});
      cursor.dataset.annotationPointer=g.inspection?'none':usePen?'pen':'cursor';
      cursor.dataset.annotationTip=JSON.stringify({x:state.x,y:state.y});
      const origin=geometry[Math.max(0,active)].point(0);
      rings.forEach((ring,i)=>set(ring,{cx:origin.x,cy:origin.y,r:state.rings[i].radius*W/1920,opacity:active<0||g.inspection?0:state.rings[i].opacity}));
      label.textContent=active<0?'':c.marks[active].label;
      label.style.opacity=String(active<0?0:g.labelOpacity?g.labelOpacity(p):p>=.3?1:0);
    };
  }
  window.ShortCreatorAnnotations={regionPixels,pointerState,activeAt,mount};
})();
