/* HyperFrames arc, offset-path and beam mechanics (Apache-2.0), bounded to
   connectors between native diagram cards. Paths are generated, never input. */
(() => {
  'use strict';
  const styles=Object.freeze(['separated','arc-route','offset-traveler','tracing-beam']);
  const clamp=x=>Math.max(0,Math.min(1,x)),out=(p,n=3)=>1-(1-clamp(p))**n;
  const sine=p=>(1-Math.cos(Math.PI*clamp(p)))/2;
  const quadratic=p=>{const q=clamp(p);return q<.5?2*q*q:1-(-2*q+2)**2/2;};
  const back=p=>{const q=clamp(p)-1;return 1+2.7*q**3+1.7*q**2;};
  function state(style,progress) {
    if(!styles.includes(style))throw new Error('Unknown diagram path');
    const p=clamp(progress);
    if(style==='separated')return {draw:out(p*.8/.42,4),travel:0,alpha:0,scale:1,beam:0};
    if(style==='arc-route')return {draw:out(p),travel:quadratic(p),second:.1+.82*sine((p*2.4-.25)/2.1),alpha:p>0&&p<1?Math.min(1,p*8,(1-p)*8):0,scale:1,beam:0};
    if(style==='offset-traveler') {
      const t=p*1.85,a=out(t/1.2,4),b=clamp((t-1.2)/.65)**3;
      return {draw:out(p),travel:.72*a+.28*b,alpha:out(t/.28)*(1-b),scale:.9+.1*back(t/.5),beam:0};
    }
    if(p===1)return {draw:1,travel:1,alpha:0,scale:1,beam:-1};
    const t=p*2.98,q=sine((t-.35)/2.35),end=clamp((t-2.7)/.28)**3;
    return {draw:out(p),travel:q,alpha:out((t-.35)/.28)*(1-end),scale:1,beam:.24-q-.24*end};
  }
  // Affine adaptation preserves the authored control points, including its
  // inflections, while joining the responsive card edges exactly.
  function route(style,x1,y1,x2,y2,alternate=false) {
    const vertical=x1===x2,span=vertical?y2-y1:x2-x1,amplitude=Math.min(38,Math.abs(span)*.4);
    const map=(x,y,start,end,base,finish)=>{
      const u=(x-start)/(end-start),v=(y-(base+(finish-base)*u))/400*amplitude;
      return vertical?[x1+v,y1+span*u]:[x1+span*u,y1+v];
    };
    const path=(commands,start,end,base,finish)=>commands.map(([command,...points])=>command+' '+points.map(([x,y])=>map(x,y,start,end,base,finish).join(' ')).join(' ')).join(' ');
    if(style==='arc-route')return alternate?
      path([['M',[118,142]],['C',[224,300],[410,330],[642,206]]],118,642,142,206):
      path([['M',[104,310]],['C',[178,110],[334,74],[442,178]],['S',[592,306],[668,120]]],104,668,310,120);
    if(style==='offset-traveler')return path([
      ['M',[-90,390]],['C',[150,490],[190,70],[430,185]],['C',[650,300],[720,105],[850,145]],['C',[970,180],[1030,85],[1090,35]]],-90,1090,390,35);
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  function tangent(path,length,p) {
    const distance=clamp(p)*length,step=Math.max(.5,length*.002);
    const at=path.getPointAtLength(distance),before=path.getPointAtLength(Math.max(0,distance-step)),after=path.getPointAtLength(Math.min(length,distance+step));
    return {x:at.x,y:at.y,angle:Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI};
  }
  const svgNode=(tag,attrs,parent)=>{
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));parent.appendChild(node);return node;
  };
  function mount(view,cards,onsets,style,reveal) {
    view.dataset.pathStyle=style;
    const vertical=view.dataset.vertical==='true';
    const svg=svgNode('svg',{class:'resource-diagram-links','aria-hidden':'true'},view);
    const links=cards.slice(1).map((card,i)=>{
      const previous=cards[i],x1=previous.offsetLeft+(vertical?previous.offsetWidth/2:previous.offsetWidth),y1=previous.offsetTop+(vertical?previous.offsetHeight:previous.offsetHeight/2);
      const x2=card.offsetLeft+(vertical?card.offsetWidth/2:0),y2=card.offsetTop+(vertical?0:card.offsetHeight/2);
      const d=route(style,x1,y1,x2,y2),path=svgNode('path',{d,stroke:'var(--lime)','stroke-width':style==='separated'?1:2,fill:'none'},svg);
      const length=path.getTotalLength();path.setAttribute('stroke-dasharray',`${length} ${length}`);
      const beam=style==='tracing-beam'?svgNode('path',{d,stroke:'var(--cyan)','stroke-width':7,fill:'none','stroke-linecap':'round','stroke-dasharray':`${length*.24} ${length}`},svg):null;
      const actor=['arc-route','offset-traveler'].includes(style)?svgNode('polygon',{points:'-5,-4 5,0 -5,4',fill:'var(--cyan)'},svg):null;
      const second=style==='arc-route'?svgNode('path',{d:route(style,x1,y1,x2,y2,true),fill:'none',stroke:'var(--line)','stroke-width':1},svg):null;
      const secondActor=second?svgNode('circle',{cx:0,cy:0,r:3,fill:'var(--lime)'},svg):null;
      return {path,length,beam,actor,second,secondActor};
    });
    return time=>{
      cards.forEach((card,i)=>{const p=out(window.ShortCreatorStory.progress(time,onsets[i]));reveal(card,p,0);card.dataset.stepProgress=String(p);});
      const states=links.map(({path,length,beam,actor,second,secondActor},i)=>{
        const p=window.ShortCreatorStory.progress(time,onsets[i+1]),s=state(style,p);
        path.setAttribute('stroke-dashoffset',String(length*(1-s.draw)));path.dataset.traceProgress=String(s.draw);
        if(beam){beam.setAttribute('stroke-dashoffset',String(length*s.beam));beam.style.opacity=String(s.alpha);}
        if(actor){const a=tangent(path,length,s.travel);actor.setAttribute('transform',`translate(${a.x} ${a.y}) rotate(${a.angle}) scale(${s.scale})`);actor.style.opacity=String(s.alpha);}
        if(second){const a=tangent(second,second.getTotalLength(),s.second);second.style.opacity=String(s.draw*.4);secondActor.setAttribute('transform',`translate(${a.x} ${a.y})`);secondActor.style.opacity=String(s.alpha);}
        return s;
      });
      view.dataset.pathPresentation=JSON.stringify({style,links:states});
    };
  }
  window.ShortCreatorPathMotion={styles,state,route,tangent,mount};
})();
