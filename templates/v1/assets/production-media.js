/* Bounded HyperFrames media-card adaptations; Apache-2.0 sources and changes
   are recorded in production provenance. Supplied stills always use contain-fit. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const out=x=>1-(1-clamp(x))**4;
  const sine=x=>(1-Math.cos(Math.PI*clamp(x)))/2;
  function rects(layout,width,height,stacked=false,padding=32,gap=24) {
    const w=width-2*padding,h=height-2*padding;
    const grid=(cols,rows)=>{
      const cw=(w-(cols-1)*gap)/cols,ch=(h-(rows-1)*gap)/rows;
      return Array.from({length:cols*rows},(_,i)=>({x:padding+i%cols*(cw+gap),y:padding+Math.floor(i/cols)*(ch+gap),w:cw,h:ch}));
    };
    if(layout==='solo')return grid(1,1);
    if(layout==='2up')return stacked?grid(1,2):grid(2,1);
    if(layout==='3up')return stacked?grid(1,3):grid(3,1);
    if(layout==='4up')return grid(2,2);
    if(layout==='3x2')return stacked?grid(2,3):grid(3,2);
    if(layout!=='hero')throw new Error('Unknown media layout');
    // Preserve the source's 58% hero ratio; rotate the recipe for tall canvases.
    if(stacked) {
      const first=Math.round((h-gap)*.58),last=h-gap-first,half=(w-gap)/2;
      return [{x:padding,y:padding,w,h:first},{x:padding,y:padding+first+gap,w:half,h:last},
        {x:padding+half+gap,y:padding+first+gap,w:half,h:last}];
    }
    const first=Math.round((w-gap)*.58),last=w-gap-first,half=(h-gap)/2;
    return [{x:padding,y:padding,w:first,h},{x:padding+first+gap,y:padding,w:last,h:half},
      {x:padding+first+gap,y:padding+half+gap,w:last,h:half}];
  }
  function state(treatment,p,index,width,height) {
    p=clamp(p);
    const q=out(p),base={opacity:q,x:0,y:28*(1-q),scale:.92+.08*q,angle:0,
      light:0,sweep:-30,spotX:0,spotY:0};
    if(treatment==='box')return base;
    if(treatment==='gloss') {
      const land=clamp(p/(.5/1.35)),arrival=land===1?1:1-2**(-10*land);
      const sweep=clamp((p-.65/1.35)/(.7/1.35));
      return {...base,y:-height*.05*(1-arrival),scale:1.06-.06*arrival,
        light:p>=.65/1.35&&p<1?1:0,sweep:-30+160*(1-(1-sweep)**3)};
    }
    if(treatment==='spotlight')return {...base,light:p>0&&p<1?Math.sin(Math.PI*p):0,
      spotX:(-120+310*sine(p))*width/760,spotY:(-70+160*sine(p))*height/428};
    if(treatment==='book-open')return {...base,x:(index===0?-1:1)*width*.26*(1-q),y:0,
      scale:.85+.15*q,angle:index===0?18:-18};
    throw new Error('Unknown media treatment');
  }
  function mount(host,spec,onsets,data,make,reveal) {
    if(spec.content.treatment==='grade-split')return window.ShortCreatorGradeSplit.mount(host,spec,onsets,data,make,reveal);
    if(spec.content.treatment==='collaborators')return window.ShortCreatorCursorScenes.mountCollaboration(host,spec,onsets,data,make);
    if(window.ShortCreatorMediaPresentations.kinds.includes(spec.content.treatment))
      return window.ShortCreatorMediaPresentations.mount(host,spec,onsets,data,make,reveal);
    if(window.ShortCreatorMediaSpatial.kinds.includes(spec.content.treatment))
      return window.ShortCreatorMediaSpatial.mount(host,spec,onsets,data,make,reveal);
    if(spec.content.camera)return window.ShortCreatorMediaCamera.mount(host,spec,onsets,data,make,reveal);
    if(spec.content.treatment==='hand-frame')return window.ShortCreatorHandLayouts.frame(host,spec,onsets,data,make,reveal);
    const content=spec.content,treatment=content.treatment||'box',profile=data.profile.id;
    const heading=make('h2','prod-heading',content.heading,host,true);
    const board=make('div','media-board',null,host);
    board.dataset.mediaLayout=content.layout;board.dataset.mediaTreatment=treatment;
    const source=make('p','resource-source',content.source,host,true);
    const width=board.clientWidth,height=board.clientHeight,stacked=profile==='portrait'||profile==='portrait-4x5';
    board.style.perspective=`${width*1.2}px`;
    const boxes=rects(content.layout,width,height,stacked,treatment==='book-open'?56:32);
    const cards=content.items.map((item,index)=>{
      const wing=make('div','media-wing',null,board),box=boxes[index];
      Object.assign(wing.style,{left:box.x+'px',top:box.y+'px',width:box.w+'px',height:box.h+'px'});
      const card=make('div','media-card',null,wing);card.dataset.mediaIndex=String(index);
      const picture=make('div','media-picture',null,card),image=make('img','media-image',null,picture);
      image.src=data.assets[item.image];image.alt=item.label;
      const surface=content.surface?(window.ShortCreatorMediaRaster.kinds.includes(content.surface.style)
        ?window.ShortCreatorMediaRaster:window.ShortCreatorMediaSurfaces).mount(picture,image,content.surface,make):null;
      const hud=content.hud?window.ShortCreatorImageInspection.mountHud(picture,content.hud,onsets,profile,make):null;
      const light=treatment==='gloss'?make('div','media-gloss',null,picture):treatment==='spotlight'?make('div','media-spot',null,picture):null;
      if(light)light.setAttribute('aria-hidden','true');
      make('p','media-label',item.label,card,true);
      return {wing,card,light,surface,hud};
    });
    return time=>{
      const amounts=onsets.map(onset=>window.ShortCreatorStory.progress(time,onset));
      reveal(heading,out(amounts[0]),20);source.style.opacity=String(out(amounts[0]));
      cards.forEach(({wing,card,light,surface,hud},index)=>{
        const p=amounts[index],s=state(treatment,p,index,width,height);
        card.dataset.mediaProgress=String(p);card.style.opacity=String(time<onsets[index]?0:s.opacity);
        wing.style.transform=`translate(${s.x}px,${s.y}px) scale(${s.scale})`;
        card.style.transform=s.angle?`rotateY(${s.angle}deg)`:'none';
        if(surface)surface(p);
        if(hud)hud(time);
        if(light) {
          light.style.opacity=String(s.light);
          if(treatment==='gloss')light.style.setProperty('--media-sweep',String(s.sweep));
          else light.style.transform=`translate(calc(-50% + ${s.spotX}px),calc(-50% + ${s.spotY}px))`;
        }
      });
    };
  }
  window.ShortCreatorMedia={rects,state,mount};
})();
