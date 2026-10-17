/* HyperFrames data-chart / animated-bar-chart and mk-specs-list adaptations.
   Exact supplied records, fixed brand typography and the existing caption clock. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),out=x=>1-(1-clamp(x))**3;
  const smooth=x=>{const p=clamp(x);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
  function shape(tag,attrs,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);set(node,attrs);parent.appendChild(node);return node;
  }
  function text(svg,x,y,value,size=22,anchor='start',color='white') {
    const node=shape('text',{x,y,'font-size':size,'text-anchor':anchor,'dominant-baseline':'middle',fill:color,'data-fit':'true'},svg);
    node.textContent=value;return node;
  }
  function comboLayout(c,width,height) {
    const left=120,right=width-120,top=110,base=height-44,pitch=(right-left)/c.categories.length;
    return {left,right,top,base,pitch,width:Math.min(68,pitch*.44),
      bars:c.bars.values.map((value,i)=>({x:left+(i+.5)*pitch,y:base-value/c.bars.maximum*(base-top),height:value/c.bars.maximum*(base-top)})),
      line:c.line.values.map((value,i)=>({x:left+(i+.5)*pitch,y:base-value/c.line.maximum*(base-top)}))};
  }
  function specsState(value) {
    const p=clamp(value),entry=1-(1-clamp(p*.95/.7))**4;
    return {alpha:entry,x:36*(entry-1),rule:smooth((p*.95-.15)/.8)};
  }
  function mount(host,spec,onsets,make,reveal) {
    const c=spec.content,title=make('h2','prod-heading',c.heading,host,true);
    if(spec.kind==='specs') {
      make('p','resource-source',c.source,host,true);
      const board=make('div','specs-board',null,host),pitch=board.clientHeight/c.rows.length;
      const rows=c.rows.map((row,i)=>{
        const element=make('div','specs-row',null,board);element.style.top=i*pitch+'px';element.style.height=(pitch-12)+'px';
        make('span','specs-label',row.label,element,true);make('span','specs-value',row.value,element,true);
        const rule=make('i','specs-rule',null,element);return {element,rule};
      });
      return time=>{
        reveal(title,out(window.ShortCreatorStory.progress(time,onsets[0])),24);
        rows.forEach(({element,rule},i)=>{
          const p=window.ShortCreatorStory.progress(time,onsets[i]),state=specsState(p);
          element.style.opacity=String(state.alpha);element.style.transform=`translateX(${state.x}px)`;
          element.dataset.specProgress=String(p);rule.style.transform=`scaleX(${state.rule})`;
        });
      };
    }
    make('p','data-insight',c.insight,host,true);
    make('p','data-source',`${c.source.kind.toUpperCase()} / ${c.source.label} / ${c.source.as_of}`,host,true);
    make('p','data-reference',c.source.reference,host,true);
    const board=make('div','data-board combo-board',null,host),W=board.clientWidth,H=board.clientHeight;
    const layout=comboLayout(c,W,H),svg=shape('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'data-svg'},board);
    const barLegend=text(svg,0,20,'',24,'start','var(--cyan)'),lineLegend=text(svg,W,54,'',24,'end','var(--lime)');
    barLegend.dataset.comboLegend='bars';lineLegend.dataset.comboLegend='line';
    for(let i=0;i<=4;i++) {
      const y=layout.base-(layout.base-layout.top)*i/4;
      shape('line',{x1:layout.left,x2:layout.right,y1:y,y2:y,stroke:'var(--cyan)','stroke-opacity':.2},svg);
      text(svg,layout.left-14,y,String(Number((c.bars.maximum*i/4).toPrecision(3))),20,'end','var(--cyan)');
      text(svg,layout.right+14,y,String(Number((c.line.maximum*i/4).toPrecision(3))),20,'start','var(--lime)');
    }
    const bars=layout.bars.map((point,i)=>{
      text(svg,point.x,H-16,c.categories[i],22,'middle');
      const rect=shape('rect',{x:point.x-layout.width/2,y:layout.base,width:layout.width,height:0,fill:'var(--cyan)',
        'data-combo-bar':i,'data-combo-value':c.bars.values[i]},svg);
      const label=text(svg,point.x,point.y-16,String(c.bars.values[i]),22,'middle');
      return {rect,label,point};
    });
    const lines=layout.line.map((point,i)=>{
      const dot=shape('circle',{cx:point.x,cy:point.y,r:5,fill:'var(--lime)','data-combo-line':i,'data-combo-value':c.line.values[i]},svg);
      let path=null,length=0;
      if(i) {
        const before=layout.line[i-1];path=shape('path',{d:`M ${before.x} ${before.y} L ${point.x} ${point.y}`,
          fill:'none',stroke:'var(--lime)','stroke-width':4},svg);length=path.getTotalLength();
        set(path,{'stroke-dasharray':`${length} ${length}`});
      }
      return {dot,path,length,point};
    });
    const cursor=shape('circle',{r:7,fill:'white','data-combo-cursor':'true'},svg),n=c.categories.length;
    return time=>{
      const progress=onsets.map(onset=>window.ShortCreatorStory.progress(time,onset));
      let active=-1;onsets.forEach((onset,i)=>{if(Math.floor(time*30+1e-7)>=Math.ceil(onset*30))active=i;});
      board.dataset.comboBeat=String(active);board.dataset.comboProgress=String(active<0?0:progress[active]);
      reveal(title,out(progress[0]),24);board.style.opacity=active<0?'0':'1';
      bars.forEach(({rect,label,point},i)=>{
        const q=out(progress[i]);set(rect,{y:layout.base-point.height*q,height:point.height*q});
        rect.dataset.comboProgress=String(progress[i]);label.style.opacity=String(q);
      });
      lines.forEach(({dot,path,length},i)=>{
        const p=progress[n+i];set(dot,{opacity:p});dot.dataset.comboProgress=String(p);
        if(path)set(path,{'stroke-dashoffset':length*(1-p)});
      });
      const barIndex=Math.max(0,Math.min(n-1,active)),lineIndex=Math.max(0,active-n);
      const barValue=c.bars.values[barIndex]*out(progress[barIndex]);
      const lineProgress=progress[n+lineIndex],before=lines[Math.max(0,lineIndex-1)].point,after=lines[lineIndex].point;
      set(cursor,{cx:before.x+(after.x-before.x)*lineProgress,cy:before.y+(after.y-before.y)*lineProgress,opacity:active>=n?1:0});
      const previous=c.line.values[Math.max(0,lineIndex-1)],lineValue=previous+(c.line.values[lineIndex]-previous)*lineProgress;
      barLegend.textContent=`${c.bars.label} / ${Number(barValue.toFixed(2))} ${c.bars.unit}`;
      lineLegend.textContent=`${c.line.label} / ${active>=n?String(lineProgress===1?c.line.values[lineIndex]:Number(lineValue.toFixed(2))):'—'} ${c.line.unit}`;
      if(progress[barIndex]===1)barLegend.textContent=`${c.bars.label} / ${c.bars.values[barIndex]} ${c.bars.unit}`;
    };
  }
  window.ShortCreatorChartExtras={comboLayout,specsState,mount};
})();
