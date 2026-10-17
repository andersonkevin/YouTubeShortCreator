/* Adapted from HyperFrames flowchart-vertical, chart-story, count-up and
   comparison-split (Apache-2.0). See docs/hyperframes-provenance.json.
   Changes: existing brand/data contracts, cue-driven 30fps seeking, no GSAP,
   remote resources, idle animation, mutable measurements or second clock. */
(() => {
  'use strict';
  const W=824, H=560, FRAMES=24, NS='http://www.w3.org/2000/svg';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>1-(1-clamp(x))**3;
  const smooth=x=>(1-Math.cos(Math.PI*clamp(x)))/2;
  function progress(seconds,start) {
    if(!Number.isFinite(seconds)||!Number.isFinite(start))throw new Error('Invalid story clock');
    return clamp((Math.floor(seconds*30+1e-7)-Math.ceil(start*30))/FRAMES);
  }
  function number(value) {
    return String(value);
  }
  function count(value,p,initial=0) {
    if(p>=1)return number(value);
    const current=initial+(value-initial)*smooth(p);
    if(current!==0&&Math.abs(current)<.001)return number(Number(current.toPrecision(6)));
    const precision=x=>(String(x).split('.')[1]||'').split('e')[0].length;
    const decimals=Math.min(6,Math.max(precision(value),precision(initial)));
    return number(Number(current.toFixed(decimals)));
  }
  function mount(host,record,story,cues,theme) {
    const starts=story.cues.map(index=>cues[index].start);
    const accent=theme.colors[0], secondary=theme.colors[1], ink='#ffffff', muted='#d4cce3';
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    svg.setAttribute('width',W);svg.setAttribute('height',H);
    svg.style.fontFamily=theme.font;svg.style.fontWeight='600';
    svg.setAttribute('data-story',story.preset);host.appendChild(svg);
    function make(tag,attrs={},parent=svg) {
      const node=document.createElementNS(NS,tag);
      for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
      parent.appendChild(node);return node;
    }
    const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
    function text(x,y,value,size=28,color=ink,parent=svg,anchor='middle') {
      const node=make('text',{x,y,'font-size':size,fill:color,'text-anchor':anchor,'dominant-baseline':'middle'},parent);
      node.textContent=value;return node;
    }
    const measure=document.createElement('canvas').getContext('2d');
    function wrap(x,y,value,width,size,parent,color=ink) {
      measure.font=`600 ${size}px ${theme.font}`;
      const lines=[];let line='';
      for(const word of value.split(' ')) {
        const next=line?line+' '+word:word;
        if(line && measure.measureText(next).width>width){lines.push(line);line=word;}else line=next;
      }
      lines.push(line);
      return lines.map((value,index)=>text(x,y+(index-(lines.length-1)/2)*size*1.15,value,size,color,parent));
    }
    function panel(parent,x,y,width,height,color) {
      // Explicit geometry avoids Chrome's rounded-rect raster cache changing after a seek.
      const r=16,right=x+width,bottom=y+height;
      const d=`M ${x+r} ${y} H ${right-r} Q ${right} ${y} ${right} ${y+r} V ${bottom-r} Q ${right} ${bottom} ${right-r} ${bottom} H ${x+r} Q ${x} ${bottom} ${x} ${bottom-r} V ${y+r} Q ${x} ${y} ${x+r} ${y} Z`;
      return make('path',{d,fill:theme.surface,stroke:color,'stroke-width':2},parent);
    }
    function drawnPath(d,color,width=4) {
      const path=make('path',{d,fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round'});
      const length=path.getTotalLength();
      set(path,{'stroke-dasharray':`${length} ${length}`,'stroke-dashoffset':length});
      return {path,length,draw(p){set(path,{'stroke-dashoffset':length*(1-clamp(p))});}};
    }
    const animations=[];
    if(story.preset==='flow-trace') {
      const steps=record.data.steps;
      const positions=steps.length===2?[[220,280],[604,280]]:
        steps.length===3?[[220,120],[604,120],[412,420]]:[[220,120],[604,120],[604,420],[220,420]];
      const edges=positions.slice(1).map(([x,y],index)=>{
        const [px,py]=positions[index];let d;
        if(y===py){const direction=Math.sign(x-px);d=`M ${px+direction*170} ${py} L ${x-direction*170} ${y}`;}
        else if(x===px)d=`M ${px} ${py+92} L ${x} ${y-92}`;
        else d=`M ${px} ${py+92} Q ${px} 270 ${(px+x)/2} 270 Q ${x} 270 ${x} ${y-92}`;
        const trace=drawnPath(d,secondary,5);
        const dot=make('circle',{r:8,fill:accent});
        return {...trace,dot};
      });
      const nodes=steps.map((step,index)=>{
        const [x,y]=positions[index],group=make('g',{'data-story-step':index});
        const border=panel(group,x-158,y-82,316,164,secondary);
        text(x-132,y-58,String(index+1).padStart(2,'0'),21,muted,group,'start');
        make('circle',{cx:x,cy:y-31,r:30,fill:accent},group);
        make('image',{href:theme.icons[step.icon],x:x-22,y:y-53,width:44,height:44},group);
        wrap(x,y+32,step.label,280,28,group);
        return {group,border};
      });
      animations.push(amounts=>{
        let active=-1;amounts.forEach((p,i)=>{if(p>0)active=i;});
        nodes.forEach(({group,border},i)=>{
          const p=ease(i?clamp((amounts[i]-.35)/.65):amounts[i]);
          set(group,{opacity:p,transform:`translate(0 ${(1-p)*24})`});
          set(border,{stroke:i===active?accent:secondary,'stroke-width':i===active?4:2});
        });
        edges.forEach((edge,i)=>{
          const p=clamp(amounts[i+1]/.55);edge.draw(p);
          const point=edge.path.getPointAtLength(edge.length*p);
          set(edge.dot,{cx:point.x,cy:point.y,opacity:p>0&&p<1?1:0});
        });
      });
    } else if(story.preset==='metric-count') {
      const group=make('g');
      const ring=drawnPath('M 108 338 A 304 260 0 0 1 716 338',secondary,9);
      const value=text(412,285,'0',142,accent,group);value.style.fontVariantNumeric='tabular-nums';
      wrap(412,115,record.data.label,740,32,group);
      text(412,385,record.data.unit,35,secondary,group);
      wrap(412,468,record.data.context,720,27,group,muted);
      animations.push(([p])=>{
        value.textContent=count(record.data.value,p);
        // This arc is the animation's progress, not a data percentage.
        ring.draw(smooth(p));
        set(group,{opacity:ease(p),transform:`translate(0 ${(1-ease(p))*20})`});
      });
    } else if(story.preset==='compare-swap') {
      const columns=[record.data.left,record.data.right];
      const cards=columns.map((column,index)=>{
        const group=make('g'),color=index?accent:secondary;
        panel(group,0,48,354,456,color);
        text(177,108,column.label,30,color,group);
        make('line',{x1:26,y1:147,x2:328,y2:147,stroke:color,'stroke-width':2},group);
        column.items.forEach((item,i)=>{
          make('circle',{cx:30,cy:218+i*100,r:4,fill:color},group);
          wrap(192,218+i*100,item,284,26,group);
        });
        return group;
      });
      const arrow=make('path',{d:'M 392 276 L 429 276 M 419 267 L 430 276 L 419 285',fill:'none',stroke:accent,'stroke-width':4});
      animations.push(([before,after])=>{
        const p=smooth(after);
        set(cards[0],{opacity:ease(before),transform:`translate(${235-215*p} ${(1-ease(before))*28})`});
        set(cards[1],{opacity:ease(after),transform:`translate(${824-374*p} 0)`});
        set(arrow,{opacity:clamp((p-.7)/.3)});
      });
    } else if(story.preset==='chart-build') {
      const {categories,series,unit}=record.data,values=series[0].values;
      const maximum=Math.max(1,...values),left=96,right=760,base=434,top=134;
      const isBar=record.kind==='bar',band=(right-left)/categories.length;
      const points=values.map((value,i)=>({x:isBar?left+band*(i+.5):left+(right-left)*i/(values.length-1),
        y:base-value/maximum*(base-top)}));
      for(let i=0;i<=4;i++) {
        const y=base-(base-top)*i/4;
        make('line',{x1:left,y1:y,x2:right,y2:y,stroke:secondary,'stroke-opacity':i?.15:.5,'stroke-width':i?1:2});
        text(left-16,y,number(Number((maximum*i/4).toPrecision(3))),21,muted,svg,'end');
      }
      text(left,49,series[0].label,26,muted,svg,'start');
      const callout=text(right,61,'',44,accent,svg,'end');callout.style.fontVariantNumeric='tabular-nums';
      const bars=[],segments=[],dots=[],labels=[];
      points.forEach((point,i)=>{
        if(isBar)bars.push(make('rect',{x:point.x-Math.min(band*.6,140)/2,y:base,width:Math.min(band*.6,140),height:0,rx:0,fill:accent}));
        else {
          if(i){const prev=points[i-1];segments.push(drawnPath(`M ${prev.x} ${prev.y} L ${point.x} ${point.y}`,accent,5));}
          dots.push(make('circle',{cx:point.x,cy:point.y,r:7,fill:accent,stroke:theme.background,'stroke-width':3}));
        }
        wrap(point.x,478,categories[i],isBar?band-10:112,25,svg,muted);
        labels.push(text(point.x,point.y-24,number(values[i]),27,ink));
      });
      animations.push(amounts=>{
        let active=-1;
        amounts.forEach((amount,i)=>{
          if(amount>0)active=i;
          const p=smooth(amount);
          if(isBar){const height=(base-points[i].y)*p;set(bars[i],{height,y:base-height,rx:Math.min(8,height/2)});}
          else {if(i)segments[i-1].draw(p);set(dots[i],{opacity:i?clamp((amount-.7)/.3):p,r:7+4*Math.sin(Math.PI*amount)});}
          set(labels[i],{opacity:clamp((amount-.65)/.35)});
        });
        callout.textContent=active<0?'':count(values[active],amounts[active],!isBar&&active>0?values[active-1]:0)+' '+unit;
      });
    } else throw new Error('Unknown story preset');
    return {renderAt(seconds){
      const amounts=starts.map(start=>progress(seconds,start));
      for(const update of animations)update(amounts);
      svg.dataset.storyProgress=amounts.join(',');
    }};
  }
  window.ShortCreatorStory={mount,progress,count};
})();
