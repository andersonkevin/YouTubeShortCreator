/* Graphic subsets of HyperFrames Swiss Grid, Warm Grain, Play Mode and Vignelli.
   Exact supplied values; approved typography; no sample survey or caption track. */
(() => {
  'use strict';
  const kinds=Object.freeze(['grid-stat','soft-stat','sticker-stat','rail-stat']);
  const clamp=x=>Math.max(0,Math.min(1,x));
  const cubic=p=>1-(1-clamp(p))**3;
  const back=p=>{const q=clamp(p)-1;return 1+2.7*q**3+1.7*q*q;};
  function pose(style,progress) {
    if(!kinds.includes(style)||!Number.isFinite(progress))throw new Error('Invalid statistic presentation');
    const p=clamp(progress),s={alpha:1,x:0,y:0,scale:1,rotation:0};
    if(style==='grid-stat'){const q=cubic(p);s.alpha=q;s.x=-200*(1-q);}
    if(style==='soft-stat'){const q=back(p);s.alpha=clamp(q);s.x=40*(1-q);s.y=15*(1-q);s.scale=.8+.2*q;}
    if(style==='sticker-stat'){
      const q=p===0?0:p===1?1:1+2**(-10*p)*Math.sin((p-.15)*2*Math.PI/.6);
      s.alpha=clamp(q);s.scale=q;s.rotation=8;
    }
    if(style==='rail-stat')s.x=-(p===1?0:2**(-10*p));
    if(p===1)Object.assign(s,{alpha:1,x:0,y:0,scale:1});
    return s;
  }
  function layout(W,H,style) {
    if(!kinds.includes(style)||!Number.isFinite(W)||!Number.isFinite(H)||W<=0||H<=0)throw new Error('Invalid statistic geometry');
    const circle=style==='soft-stat',height=H*(circle?.64:.52),width=circle?height:Math.min(W*.72,820);
    return {x:(W-width)/2,y:H*.46-height/2,width,height,cx:W/2,cy:H*.46};
  }
  function mount(datum,options,{svg,label,shape,set,W,H}) {
    const style=options.metric_style,g=layout(W,H,style);
    svg.dataset.metricStyle=style;
    label(0,H*.07,datum.label,32,'start','var(--cyan)');
    label(0,H*.91,datum.context,28,'start','var(--cyan)');
    const group=shape('g',{'data-stat-card':style});
    const own=node=>{group.appendChild(node);return node;};
    const card={x:g.x,y:g.y,width:g.width,height:g.height};
    if(style==='soft-stat')own(shape('circle',{cx:g.cx,cy:g.cy,r:g.height/2,fill:'var(--surface)',stroke:'var(--cyan)','stroke-width':3}));
    else {
      if(style==='grid-stat')own(shape('rect',{...card,x:g.x+20,y:g.y+20,fill:'var(--cyan)','fill-opacity':.14}));
      if(style==='sticker-stat')own(shape('rect',{...card,rx:40,fill:'var(--cyan)',transform:`rotate(-2 ${g.cx} ${g.cy})`}));
      own(shape('rect',{...card,rx:style==='sticker-stat'?35:0,fill:'var(--surface)',stroke:style==='sticker-stat'?'var(--lime)':'var(--line)','stroke-width':style==='sticker-stat'?8:2}));
      if(style==='grid-stat'||style==='rail-stat')own(shape('rect',{x:g.x,y:g.y,width:style==='grid-stat'?10:20,height:g.height,fill:'var(--lime)'}));
      if(style==='sticker-stat') {
        own(shape('circle',{cx:g.x-10,cy:g.y+8,r:24,fill:'var(--cyan)'}));
        own(shape('rect',{x:g.x+g.width-56,y:g.y+g.height-10,width:84,height:24,rx:12,fill:'var(--lime)',transform:`rotate(-15 ${g.x+g.width-14} ${g.y+g.height+2})`}));
      }
    }
    const value=own(label(g.cx,g.cy-18,String(datum.value),style==='soft-stat'?100:120,'middle','var(--lime)'));
    value.dataset.chartMetric='true';
    const unit=own(label(g.cx,g.cy+64,datum.unit,28,'middle'));
    unit.dataset.statUnit='true';
    // Clip animated entrances to the existing plot; settled text still uses normal fitting QA.
    svg.style.overflow='hidden';
    return ([p])=>{
      const s=pose(style,p),x=style==='rail-stat'?s.x*(g.x+g.width+4):s.x;
      set(group,{opacity:s.alpha,transform:`translate(${x} ${s.y}) translate(${g.cx} ${g.cy}) rotate(${s.rotation}) scale(${s.scale}) translate(${-g.cx} ${-g.cy})`});
      group.dataset.statState=JSON.stringify(s);group.dataset.statGeometry=JSON.stringify(g);
    };
  }
  window.ShortCreatorStatCards={kinds,pose,layout,mount};
})();
