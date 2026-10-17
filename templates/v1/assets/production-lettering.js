/* HyperFrames glyph write-on and stitched drawing, Apache-2.0. Caveat glyph
   outlines retain OFL-1.1; see production-lettering-notices.txt. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg',clamp=x=>Math.max(0,Math.min(1,x));
  function node(tag,attrs,parent){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));parent.appendChild(n);return n;}
  function handwriting(svg,text,id){
    const table=window.__hwPenCaveat,strokes=[];let x=0,gi=0;
    for(const ch of text){
      if(ch===' '){x+=340;continue;}
      const glyph=table.glyphs[ch];if(!glyph)throw new Error('Unsupported baked handwriting glyph');
      const group=node('g',{transform:`translate(${x},0)`},svg),maskId=`${id}-${gi++}`;
      const mask=node('mask',{id:maskId,maskUnits:'userSpaceOnUse',x:-200,y:-900,width:glyph.adv+400,height:1400},group);
      for(const d of glyph.strokes){
        const p=node('path',{d,fill:'none',stroke:'#fff','stroke-width':Math.max(30,Math.round(glyph.stem*1.35)),
          'stroke-linecap':'round','stroke-linejoin':'round'},mask);
        const ease=window.ShortCreatorLetteringSource.penEase(p),length=p.getTotalLength();
        p.setAttribute('stroke-dasharray',`${length} ${length}`);strokes.push({p,ease,length});
      }
      node('path',{d:glyph.outline,fill:'var(--lime)',mask:`url(#${maskId})`},group);x+=glyph.adv;
    }
    svg.setAttribute('viewBox',`-220 -1000 ${x+440} 1450`);
    const ink=strokes.reduce((sum,s)=>sum+s.ease.inkTime,0),lift=Math.min(.06,.6/Math.max(1,strokes.length-1));
    const available=3.1-lift*Math.max(0,strokes.length-1);let clock=.05;
    for(const s of strokes){s.start=clock;s.duration=available*s.ease.inkTime/ink;clock+=s.duration+lift;}
    return t=>{
      for(const s of strokes){const p=s.ease.ease(clamp((t-s.start)/s.duration));
        s.p.setAttribute('stroke-dashoffset',String(s.length*(1-p)));s.p.setAttribute('opacity',p>0?'1':'0');}
    };
  }
  function mount(host,c,onsets,make){
    const board=make('div','lettering-board',null,host);board.dataset.letteringStyle=c.style;
    const scene=host.closest('.scene').dataset.productionIndex;
    const layers=c.phrases.map((phrase,index)=>{
      const layer=make('div','lettering-layer',null,board);layer.setAttribute('aria-label',phrase);
      if(c.style==='difference'){
        const stage=make('div','difference-stage',null,layer),field=make('div','difference-field',null,stage);
        make('div','difference-copy',phrase,stage,true);
        return {layer,paint:t=>{const p=clamp(t/3.2);field.style.transform=`scaleX(${p*p*(3-2*p)})`;}};
      }
      const svg=node('svg',{class:'lettering-svg',role:'img','aria-label':phrase,preserveAspectRatio:'xMidYMid meet'},layer);
      const paint=c.style==='write-on'?handwriting(svg,phrase,`lettering-${scene}-${index}`):
        window.ShortCreatorLetteringSource.stitch(svg,phrase,c.style==='stitch-coarse');
      return {layer,paint};
    });
    make('p','lettering-note',c.label,board,true);
    return t=>{
      const active=t>=onsets[1]?1:0;
      layers.forEach(({layer,paint},i)=>{layer.style.visibility=i===active?'visible':'hidden';paint(t-onsets[i]);});
      board.dataset.letteringTime=String(t);board.dataset.letteringActive=String(active);
    };
  }
  window.ShortCreatorLettering={mount};
})();
