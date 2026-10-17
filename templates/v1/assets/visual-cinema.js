/* HyperFrames adaptations: masked kinetic-type-swap, before-after/directional
   wipe, and velocity-matched cut-the-curve/zoom-through. Apache-2.0 sources and
   local technique hashes are retained in docs/hyperframes-provenance.json.
   The existing Short Creator clock, brand assets and data own the result. */
(() => {
  'use strict';
  const W=880,H=900,NS='http://www.w3.org/2000/svg',D=.4;
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>(1-Math.cos(Math.PI*clamp(x)))/2;
  const powerOut=x=>1-(1-clamp(x))**5;

  function seam(kind,side,amount) {
    if(!['cut-left','zoom-through'].includes(kind)||!['entry','exit'].includes(side)||!Number.isFinite(amount))
      throw new Error('Invalid cinematic seam');
    const entry=side==='entry',p=clamp(amount),tail=entry?1-p:p;
    const travel=tail**(kind==='cut-left'?5:4);
    return {x:kind==='cut-left'?(entry?130:-130)*travel:0,
      scale:kind==='zoom-through'?1+(entry?-.18:.18)*travel:1,
      opacity:1-.68*travel,blur:(kind==='cut-left'?8:10)*travel};
  }

  function mount(scene,record,presentation,cues,theme,incoming) {
    const host=scene.querySelector('.visual-chart'),stage=scene.querySelector('.cinema-stage');
    const start=Number(scene.dataset.start),end=Number(scene.dataset.end);
    const starts=presentation.story.cues.map(index=>cues[index].start);
    const {progress,count}=window.ShortCreatorStory;
    const accent=theme.colors[0],secondary=theme.colors[1],ink='#ffffff',muted='#d4cce3';
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('width',W);svg.setAttribute('height',H);
    svg.style.fontFamily=theme.font;svg.style.fontWeight='800';
    svg.dataset.cinema=record.kind;host.appendChild(svg);
    function make(tag,attrs={},parent=svg) {
      const node=document.createElementNS(NS,tag);
      for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));
      parent.appendChild(node);return node;
    }
    const set=(node,attrs)=>{for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));};
    function text(x,y,value,size=28,color=ink,parent=svg,anchor='middle') {
      const node=make('text',{x,y,'font-size':size,fill:color,'text-anchor':anchor,'dominant-baseline':'middle'},parent);
      node.textContent=value;return node;
    }
    const measure=document.createElement('canvas').getContext('2d');
    function wrap(x,y,value,width,size,parent=svg,color=ink,anchor='middle') {
      measure.font=`800 ${size}px ${theme.font}`;
      const lines=[];let line='';
      for(const word of value.split(' ')) {
        const next=line?line+' '+word:word;
        if(line&&measure.measureText(next).width>width){lines.push(line);line=word;}else line=next;
      }
      lines.push(line);
      return lines.map((line,i)=>text(x,y+(i-(lines.length-1)/2)*size*1.5,line,size,color,parent,anchor));
    }
    const updates=[];
    if(record.kind==='flow') {
      const steps=record.data.steps;
      const defs=make('defs');
      const clipId='cinema-type-'+record.id,iconClipId='cinema-icon-'+record.id;
      make('rect',{x:0,y:70,width:W,height:290},make('clipPath',{id:clipId},defs));
      make('rect',{x:0,y:370,width:W,height:370},make('clipPath',{id:iconClipId},defs));
      const typeSlot=make('g',{'clip-path':`url(#${clipId})`});
      const iconSlot=make('g',{'clip-path':`url(#${iconClipId})`});
      const folio=text(20,30,'',23,secondary,svg,'start');
      const words=steps.map(step=>{
        const g=make('g',{},typeSlot);wrap(440,210,step.label.toUpperCase(),840,108,g);return g;
      });
      const icons=steps.map(step=>{
        const g=make('g',{},iconSlot);
        make('circle',{cx:440,cy:555,r:162,fill:accent},g);
        make('image',{href:theme.icons[step.icon],x:340,y:455,width:200,height:200},g);
        return g;
      });
      const x=i=>96+688*i/(steps.length-1);
      make('line',{x1:x(0),y1:785,x2:x(steps.length-1),y2:785,stroke:secondary,'stroke-opacity':.3,'stroke-width':3});
      const rail=make('line',{x1:x(0),y1:785,x2:x(0),y2:785,stroke:accent,'stroke-width':5});
      const dots=steps.map((step,i)=>{
        const node=make('circle',{cx:x(i),cy:785,r:10,fill:secondary});
        wrap(x(i),843,step.label,175,21,svg,muted);
        return node;
      });
      updates.push((amounts,seconds)=>{
        let active=0;starts.forEach((t,i)=>{if(seconds>=t)active=i;});
        const p=powerOut(amounts[active]);
        folio.textContent=String(active+1).padStart(2,'0')+' / '+String(steps.length).padStart(2,'0');
        words.forEach((g,i)=>{
          const visible=i===active||(i===active-1&&p<1);
          set(g,{opacity:visible?1:0,transform:`translate(0 ${i===active?320*(1-p):-320*p})`});
          set(icons[i],{opacity:visible?1:0,transform:`translate(0 ${i===active?400*(1-p):-400*p})`});
          set(dots[i],{fill:i<=active?accent:secondary,r:i===active?16:10});
        });
        set(rail,{x2:active?x(active-1)+(x(active)-x(active-1))*p:x(0)});
      });
    } else if(record.kind==='bar') {
      const {categories,series,unit}=record.data,values=series[0].values;
      const maximum=Math.max(1,...values),base=780,top=480,left=70,right=850,band=(right-left)/values.length;
      text(440,30,series[0].label.toUpperCase(),23,secondary);
      const value=text(440,245,'0',210,accent);value.style.fontVariantNumeric='tabular-nums';
      text(440,400,unit.toUpperCase(),30,muted);
      for(let i=0;i<=4;i++) {
        const y=base-(base-top)*i/4;
        make('line',{x1:left,y1:y,x2:right,y2:y,stroke:secondary,'stroke-opacity':i?.15:.5});
        text(left-14,y,String(Number((maximum*i/4).toPrecision(3))),21,muted,svg,'end');
      }
      const bars=[],labels=[];
      values.forEach((n,i)=>{
        const x=left+band*(i+.5),y=base-n/maximum*(base-top);
        bars.push(make('rect',{x:x-band*.32,y:base,width:band*.64,height:0,fill:accent}));
        labels.push(text(x,y-24,String(n),30));
        wrap(x,838,categories[i],band-12,27,svg,muted);
      });
      updates.push(amounts=>{
        let active=0;
        amounts.forEach((amount,i)=>{
          if(amount>0)active=i;
          const height=values[i]/maximum*(base-top)*smooth(amount);
          set(bars[i],{height,y:base-height});
          set(labels[i],{opacity:clamp((amount-.7)/.3)});
        });
        value.textContent=count(values[active],amounts[active]);
      });
    } else if(record.kind==='comparison') {
      const panels=[record.data.left,record.data.right].map((column,index)=>{
        const group=make('g'),color=index?accent:secondary;
        text(30,60,index?'02 / NEW STATE':'01 / CURRENT STATE',23,color,group,'start');
        wrap(440,210,column.label.toUpperCase(),840,132,group,index?accent:ink);
        make('line',{x1:30,y1:320,x2:850,y2:320,stroke:color,'stroke-width':4},group);
        const items=column.items.map((item,i)=>{
          const row=make('g',{},group),y=430+i*155;
          text(34,y,String(i+1).padStart(2,'0'),24,color,row);
          wrap(90,y,item,740,43,row,ink,'start');
          make('line',{x1:30,y1:y+70,x2:850,y2:y+70,stroke:color,'stroke-opacity':.2},row);
          return row;
        });
        return {group,items};
      });
      // One shared progress drives the cover and the content swap. At halfway
      // the opaque brand curtain covers the entire slot, so no double text leaks.
      const curtain=make('rect',{x:W,y:0,width:W,height:H,fill:accent});
      updates.push(([before,after])=>{
        const p=smooth(after),next=p>=.5;
        set(panels[0].group,{opacity:next?0:1});set(panels[1].group,{opacity:next?1:0});
        panels[1].items.forEach((row,i)=>set(row,{transform:`translate(${(1-powerOut(clamp((p-.5-i*.06)/.3)))*48} 0)`}));
        set(curtain,{x:W*(1-2*p),opacity:after>0&&after<1?1:0});
        svg.dataset.wipe=String(p);
      });
    } else throw new Error('Unsupported cinematic visual');
    return {renderAt(seconds){
      const amounts=starts.map(t=>progress(seconds,t));
      for(const update of updates)update(amounts,seconds);
      const visible=seconds>=start&&seconds<end;
      scene.style.opacity=visible?'1':'0';
      let state={x:0,scale:1,opacity:1,blur:0};
      if(seconds<start+D)state=seam(incoming||'cut-left','entry',(seconds-start)/D);
      if(seconds>end-D)state=seam(presentation.transition,'exit',(seconds-(end-D))/D);
      stage.style.transform=`translateX(${state.x}px) scale(${state.scale})`;
      stage.style.filter=`blur(${state.blur}px)`;
      stage.style.opacity=String(state.opacity);
      stage.dataset.seam=JSON.stringify(state);
      svg.dataset.storyProgress=amounts.join(',');
    }};
  }
  window.ShortCreatorCinema={mount,seam,duration:D};
})();
