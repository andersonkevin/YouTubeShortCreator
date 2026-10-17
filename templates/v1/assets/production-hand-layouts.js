/* HyperFrames hw-frame and hw-pipeline adaptations, Apache-2.0.
   Reuses the pinned handwriting geometry; source fonts and idle boil are omitted. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),out=x=>1-(1-clamp(x))**3;
  const smooth=x=>{const p=clamp(x);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  const svg=(tag,attrs,parent)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));parent.appendChild(n);return n;};
  const ink=()=>window.ShortCreatorAnnotationInk;
  function sparks(x,y,index) {
    let d='';for(let k=0;k<3;k++) {
      const a=-.6-k*.5+ink().hash(index*9+k,14)*.2,l=26+ink().hash(index*9+k+4,14)*8;
      d+=`M ${x} ${y} l ${(Math.cos(a)*l).toFixed(1)} ${(Math.sin(a)*l).toFixed(1)} `;
    }return d;
  }
  function frameState(p) {
    const t=clamp(p)*1.8,media=out((t-.512)/.896);
    return {media,scale:.96+.04*media,border:smooth((t-.2)/.9),caption:out((t-1.4)/.4),
      doodles:Array.from({length:3},(_,i)=>out((t-1.1-i*.12)/.3))};
  }
  function pipelineState(p,index) {
    const t=clamp(p)*(index?1.3:.8),start=index?.5:0;
    return {connector:index?smooth(t/.45):0,box:smooth((t-start)/.65),label:out((t-start-.45)/.35)};
  }
  function connector(x,y,gap,index,vertical=false) {
    const scale=gap/190,tx=gap-10*scale,qx=gap/2+ink().hash(index*9+2,11)*16*scale,qy=(-46-ink().hash(index*9+3,11)*12)*scale;
    const angle=Math.atan2(-qy,tx-qx)+Math.PI;
    const map=(a,b)=>vertical?`${x-b} ${y+a}`:`${x+a} ${y+b}`;
    let d=`M ${map(10*scale,0)} Q ${map(qx,qy)} ${map(tx,0)}`;
    for(const sign of [-1,1])d+=` M ${map(tx,0)} L ${map(tx+26*scale*Math.cos(angle+sign*.42),26*scale*Math.sin(angle+sign*.42))}`;
    return d;
  }
  function stroke(path) {
    const length=path.getTotalLength();path.setAttribute('stroke-dasharray',`${length} ${length}`);
    return p=>{path.setAttribute('stroke-dashoffset',String(length*(1-p)));path.style.opacity=p>0?'1':'0';};
  }
  function frame(host,spec,onsets,data,make,reveal) {
    const c=spec.content;const heading=make('h2','prod-heading',c.heading,host,true);
    const board=make('div','hand-frame-board',null,host),source=make('p','resource-source',c.source,host,true);
    const W=board.clientWidth,H=board.clientHeight,w=W-160,h=H-200,x=80,y=80;
    const picture=make('div','hand-frame-picture',null,board),image=make('img','',null,picture);
    Object.assign(picture.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});image.src=data.assets[c.items[0].image];image.alt=c.items[0].label;
    const art=svg('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'hand-frame-ink','aria-hidden':'true'},board);
    const attributes={fill:'none',stroke:'var(--lime)','stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round'};
    const border=stroke(svg('path',{...attributes,d:ink().box(w+32,h+32,14,18,5),transform:`translate(${x-16} ${y-16})`},art));
    const doodles=[[x-40,y-34],[x+w+40,y-26],[x+w+36,y+h+30]].map(([a,b],i)=>stroke(svg('path',{...attributes,d:sparks(a,b,i)},art)));
    const caption=make('p','hand-frame-label',c.items[0].label,board,true);caption.style.top=y+h+42+'px';
    return time=>{
      const p=window.ShortCreatorStory.progress(time,onsets[0]),s=frameState(p);
      reveal(heading,out(p),20);source.style.opacity=String(out(p));
      picture.style.opacity=String(s.media);picture.style.transform=`scale(${s.scale})`;
      border(s.border);doodles.forEach((draw,i)=>draw(s.doodles[i]));caption.style.opacity=String(s.caption);
      board.dataset.handFrameProgress=String(p);board.dataset.handFrameState=JSON.stringify(s);
    };
  }
  function pipeline(view,cards,onsets) {
    view.dataset.diagramStyle='hand-drawn';
    const vertical=view.dataset.vertical==='true';
    const outlines=cards.map((card,i)=>{
      card.classList.add('hand-pipeline-card');
      const art=svg('svg',{width:card.clientWidth,height:card.clientHeight,class:'hand-pipeline-border','aria-hidden':'true'},card);
      return stroke(svg('path',{d:ink().box(card.clientWidth-16,card.clientHeight-16,11+i,24),transform:'translate(8 8)',fill:'none',stroke:'var(--lime)','stroke-width':3},art));
    });
    const art=svg('svg',{class:'resource-diagram-links','aria-hidden':'true'},view);
    const links=cards.slice(1).map((card,i)=>{
      const previous=cards[i],x=previous.offsetLeft+(vertical?previous.offsetWidth/2:previous.offsetWidth),y=previous.offsetTop+(vertical?previous.offsetHeight:previous.offsetHeight/2);
      const gap=vertical?card.offsetTop-y:card.offsetLeft-x;
      const path=svg('path',{d:connector(x,y,gap,i,vertical),fill:'none',stroke:'var(--lime)','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'},art);
      return {draw:stroke(path),path};
    });
    return time=>cards.forEach((card,i)=>{
      const p=window.ShortCreatorStory.progress(time,onsets[i]),s=pipelineState(p,i);
      card.style.opacity='1';card.style.background='transparent';
      for(const child of card.children)if(child.tagName.toLowerCase()!=='svg')child.style.opacity=String(s.label);
      outlines[i](s.box);card.dataset.stepProgress=String(s.label);
      if(i){links[i-1].draw(s.connector);links[i-1].path.dataset.traceProgress=String(s.connector);}
    });
  }
  window.ShortCreatorHandLayouts={sparks,frameState,pipelineState,connector,frame,pipeline};
})();
