/* Bounded CSS-depth adaptations from HyperFrames, Apache-2.0. Source equations
   and omissions are recorded in production provenance. No 3D model loader. */
(() => {
  'use strict';
  const kinds=Object.freeze(['depth-card','scrub-stack','device-splay','dolly-depth-in','dolly-depth-out','phone-trio']);
  const clamp=x=>Math.max(0,Math.min(1,x));
  const out=(p,n=4)=>1-(1-clamp(p))**n;
  const back=(p,s)=>{const t=clamp(p)-1;return 1+(s+1)*t**3+s*t*t;};
  const mix=(a,b,p)=>a+(b-a)*p;
  const dims=[[500*.59*9/19.5,500*.59],[500*.64*3/4,500*.64],[440,275]];
  function state(style,progress,index=0) {
    if(!kinds.includes(style)||!Number.isFinite(progress)||!Number.isInteger(index)||index<0||index>2)
      throw new Error('Invalid spatial media state');
    const p=clamp(progress),q=out(p);
    const s={p,x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:1,alpha:1,perspective:900};
    if(style==='depth-card')return {...s,ry:mix(-20,10,q),rx:mix(12,-4,q),z:mix(-80,80,q)};
    if(style==='scrub-stack') {
      const local=clamp((p*.72-index*.12)/.48),a=back(local,1.6);
      return {...s,x:index*18,y:mix(42,index*26,a),scale:mix(.88,1-index*.04,a),alpha:local};
    }
    if(style==='device-splay') {
      const local=clamp((p*1.14-index*.12)/.9),a=back(local,1.7);
      return {...s,x:[-300,-50,240][index]*a,y:mix(45,[17.5,-5,10][index],a),
        rz:[-12,0,12][index]*a,scale:mix(.9,1,a),alpha:local};
    }
    if(style==='phone-trio') {
      const t=p*1.6,start=[.3,.2,.4][index],arrival=back((t-start)/.7,1.4);
      if(index===1)return {...s,scale:.85+.15*arrival,alpha:clamp(arrival)};
      const progress=clamp((t-start)/1.2),fan=progress===1?1:1-2**(-10*progress),direction=index===0?-1:1;
      return {...s,x:direction*340*fan,rz:direction*12*fan,alpha:clamp(arrival)};
    }
    // Source invariant: focal length / camera-to-subject distance = 1.
    // The foreground stays on z=0 while six actual CSS-depth arches move.
    const ease=p<.5?4*p**3:1-(-2*p+2)**3/2;
    const distance=mix(1400,style==='dolly-depth-in'?700:2800,ease);
    return {...s,perspective:distance,distance,subjectScale:1};
  }
  function frame(style,index) {
    if(style==='phone-trio')return {width:320,height:650};
    if(style==='device-splay')return {width:dims[index][0],height:dims[index][1]};
    return style==='scrub-stack'?{width:520,height:260}:{width:580,height:318};
  }
  function fit(width,height,style) {
    if(![width,height].every(x=>Number.isFinite(x)&&x>0))throw new Error('Invalid spatial viewport');
    const scale=Math.min((width-32)/(style==='phone-trio'?1200:1120),(height-32)/(style==='phone-trio'?800:560));
    if(scale<=0)throw new Error('Spatial viewport is too small');
    return {scale,x:(width-1000*scale)/2,y:(height-500*scale)/2};
  }
  function mount(host,spec,onsets,data,make,reveal) {
    const c=spec.content,style=c.treatment;
    const heading=make('h2','prod-heading',c.heading,host,true);
    const board=make('div','media-board spatial-board',null,host);
    board.dataset.spatialStyle=style;
    const viewport=make('div','spatial-viewport',null,board);
    const f=fit(viewport.clientWidth,viewport.clientHeight,style),scaler=make('div','spatial-scaler',null,viewport);
    Object.assign(scaler.style,{left:f.x+'px',top:f.y+'px',transform:`scale(${f.scale})`});
    const stage=make('div','spatial-stage',null,scaler);
    const arches=[];
    if(style.startsWith('dolly-depth'))for(const z of [-3200,-2360,-1720,-1120,-560,0]) {
      const arch=make('div','spatial-arch',null,stage);arch.setAttribute('aria-hidden','true');
      arch.style.transform=`translateZ(${z}px)`;arch.dataset.depth=String(z);arches.push(arch);
    }
    const labels=make('div','spatial-labels',null,board);
    const cards=c.items.map((item,index)=>{
      const card=make('div','spatial-card',null,stage),size=frame(style,index);
      card.dataset.spatialIndex=String(index);
      Object.assign(card.style,{width:size.width+'px',height:size.height+'px',marginLeft:-size.width/2+'px',marginTop:-size.height/2+'px',
        zIndex:String(style==='phone-trio'?(index===1?3:2):style==='device-splay'?3-index:index+1)});
      if(style==='device-splay')card.dataset.device=['phone','tablet','desktop'][index];
      if(style==='phone-trio')card.dataset.device='phone';
      const image=make('img','spatial-image',null,card);image.src=data.assets[item.image];image.alt=item.label;
      make('p','spatial-label',item.label,labels,true);
      return card;
    });
    const source=make('p','resource-source',c.source,host,true);
    return time=>{
      const entrance=window.ShortCreatorStory.progress(time,onsets[0]),p=window.ShortCreatorStory.progress(time,onsets[1]);
      const alpha=out(entrance);
      reveal(heading,alpha,20);source.style.opacity=String(alpha);board.style.opacity=String(alpha);
      board.dataset.spatialProgress=String(p);board.dataset.spatialEntrance=String(entrance);
      const states=cards.map((card,index)=>{
        const s=state(style,p,index);stage.style.perspective=s.perspective+'px';
        card.style.transform=`translate3d(${s.x}px,${s.y}px,${s.z}px) rotateX(${s.rx}deg) rotateY(${s.ry}deg) rotateZ(${s.rz}deg) scale(${s.scale})`;
        card.style.opacity=String(s.alpha);return s;
      });
      board.dataset.spatialState=JSON.stringify(states);
    };
  }
  window.ShortCreatorMediaSpatial=Object.freeze({kinds,state,frame,fit,mount});
})();
