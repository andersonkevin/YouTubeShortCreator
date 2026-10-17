/* Adapted HyperFrames composition mechanics; Apache-2.0 source hashes and
   changes are recorded in docs/hyperframes-production-provenance.json.
   Only selected GPU backdrops load the pinned shared shader runtime.
   No remote scripts, font substitution or content HTML. */
(() => {
  'use strict';
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => 1 - (1 - clamp(x)) ** 5;
  const phase = (time, start, length=.8) => ease((time-start)/length);
  function positionsAt(widths, gap=24) {
    return widths.map((_, index) => {
      const visible=widths.slice(0,index+1), total=visible.reduce((sum,n)=>sum+n,0)+gap*index;
      let x=(1720-total)/2;
      return visible.map(width=>{const position=x;x+=width+gap;return position;});
    });
  }
  function wrappedPositions(widths,width,height,lineHeight,gap=24) {
    if(widths.some(value=>value>width))throw new Error('Kinetic word exceeds approved type size');
    return widths.map((_,last)=>{
      const rows=[[]];let used=0;
      widths.slice(0,last+1).forEach((value,index)=>{
        if(used&&used+gap+value>width){rows.push([]);used=0;}
        rows.at(-1).push(index);used+=(used?gap:0)+value;
      });
      if(rows.length*lineHeight>height)throw new Error('Kinetic phrase exceeds composition height');
      const result=[];
      rows.forEach((row,r)=>{
        const total=row.reduce((sum,i)=>sum+widths[i],0)+gap*(row.length-1);
        let x=(width-total)/2;
        row.forEach(i=>{result[i]={x,y:(height-rows.length*lineHeight)/2+r*lineHeight};x+=widths[i]+gap;});
      });
      return result;
    });
  }
  // HyperFrames text-match-cut's shared cubic-bezier curve, solved by bisection.
  function matchCurve(value) {
    const x=clamp(value);if(x===0||x===1)return x;
    let low=0,high=1;
    for(let i=0;i<28;i++) {
      const t=(low+high)/2,b=3*(1-t)**2*t*.85+3*(1-t)*t*t*.15+t**3;
      if(b<x)low=t;else high=t;
    }
    const t=(low+high)/2;return 3*(1-t)*t*t+t**3;
  }
  function textMatch(value,travel=140) {
    const p=clamp(value),speed=(matchCurve(p+.002)-matchCurve(p-.002))/.004;
    return {x:travel-2*travel*matchCurve(p),blur:p===0||p===1?0:Math.min(6,speed*2*travel/.8/30*.07)};
  }
  function cameraTarget(width,height,imageWidth,imageHeight,region) {
    const fit=Math.min(width/imageWidth,height/imageHeight),w=imageWidth*fit,h=imageHeight*fit;
    const left=(width-w)/2+region.x*w,top=(height-h)/2+region.y*h;
    const cx=left+region.width*w/2,cy=top+region.height*h/2,scale=region.zoom;
    const limit=(offset,size)=>Math.max(-size*(scale-1)/2,Math.min(size*(scale-1)/2,offset));
    return {x:limit((width/2-cx)*scale,width),y:limit((height/2-cy)*scale,height),scale,
      left,top,width:region.width*w,height:region.height*h};
  }
  window.ShortCreatorProductionMath={phase,positionsAt,wrappedPositions,matchCurve,textMatch,cameraTarget};
  if(!document.getElementById('production-scene-data'))return;
  const data=JSON.parse(document.getElementById('production-scene-data').textContent);
  const wide=data.profile.id==='landscape',contentWidth=data.geometry.content[2];
  const cues=JSON.parse(document.getElementById('spoken-captions-data').textContent).cues;
  const mounted=[];
  const make=(tag,css,text,parent,fit=false)=>{
    const node=document.createElement(tag);node.className=css;
    if(text!==null)node.textContent=text;
    if(fit)node.dataset.fit='true';
    parent.appendChild(node);return node;
  };
  function reveal(node,amount,travel=32) {
    node.style.opacity=String(amount);
    node.style.transform=`translateY(${travel*(1-amount)}px)`;
  }
  function mountChart(host,record,onsets,options) {
    const {count,progress}=window.ShortCreatorStory,datum=record.data;
    const smooth=p=>(1-Math.cos(Math.PI*p))/2;
    make('h2','prod-heading',record.title,host,true);
    make('p','chart-insight',record.insight,host,true);
    make('p','chart-source',`${record.source.kind.toUpperCase()} / ${record.source.label} / ${record.source.as_of}`,host,true);
    make('p','chart-reference',record.source.reference,host,true);
    const updates=[],ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');svg.classList.add('production-plot');
    const [plotX,plotY,W,H]=data.geometry.plot;
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('width',String(W));svg.setAttribute('height',String(H));
    svg.style.left=plotX+'px';svg.style.top=plotY+'px';host.appendChild(svg);
    const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
    const shape=(tag,attrs)=>{const node=document.createElementNS(ns,tag);set(node,attrs);svg.appendChild(node);return node;};
    const label=(x,y,value,size=28,anchor='middle',color='white')=>{
      const node=shape('text',{x,y,'font-size':size,'text-anchor':anchor,'dominant-baseline':'middle',fill:color,'data-fit':'true'});
      node.textContent=value;return node;
    };
    if(record.kind==='bar'||record.kind==='line') {
      const values=datum.series[0].values,maximum=Math.max(1,...values),left=wide?120:100,right=W-60,base=H-92,top=96;
      const band=(right-left)/values.length,isBar=record.kind==='bar';
      label(left,24,datum.series[0].label,25,'start','var(--cyan)');
      const callout=label(right,24,'',38,'end','var(--lime)');callout.dataset.chartCallout='true';
      for(let i=0;i<=4;i++) {
        const y=base-(base-top)*i/4;
        shape('line',{x1:left,x2:right,y1:y,y2:y,stroke:'var(--cyan)','stroke-opacity':i?.2:.6});
        label(left-18,y,String(Number((maximum*i/4).toPrecision(3))),22,'end','var(--cyan)');
      }
      const points=values.map((value,i)=>({x:isBar?left+band*(i+.5):left+(right-left)*i/(values.length-1),y:base-value/maximum*(base-top)}));
      const nodes=points.map((point,i)=>{
        const category=label(point.x,H-39,datum.categories[i],25);category.dataset.chartLabel='true';
        const value=label(point.x,point.y-24,String(values[i]),26);value.dataset.chartValue=String(i);
        let mark,segment,length=0;
        if(isBar)mark=shape('rect',{x:point.x-band*.28,y:base,width:band*.56,height:0,fill:'var(--lime)'});
        else {
          if(i){const previous=points[i-1];segment=shape('path',{d:`M ${previous.x} ${previous.y} L ${point.x} ${point.y}`,fill:'none',stroke:'var(--lime)','stroke-width':5});
            length=segment.getTotalLength();set(segment,{'stroke-dasharray':`${length} ${length}`});}
          mark=shape('circle',{cx:point.x,cy:point.y,r:7,fill:'var(--lime)'});
        }
        mark.dataset.chartMark=String(i);return {mark,segment,length,value};
      });
      updates.push(amounts=>{
        let active=-1;
        nodes.forEach(({mark,segment,length,value},i)=>{
          const p=smooth(amounts[i]);if(amounts[i]>0)active=i;
          if(isBar){const height=(base-points[i].y)*p;set(mark,{height,y:base-height});}
          else {set(mark,{opacity:p});if(segment)set(segment,{'stroke-dashoffset':length*(1-p)});}
          set(value,{opacity:clamp((amounts[i]-.65)/.35)});
        });
        callout.textContent=active<0?'':count(values[active],amounts[active],!isBar&&active>0?values[active-1]:0)+' '+datum.unit;
      });
    } else if(record.kind==='metric'&&options.metric_style&&options.metric_style!=='count') {
      updates.push(window.ShortCreatorResources.metric(datum,options,{svg,label,shape,set,W,H,wide,count}));
    } else if(record.kind==='metric') {
      label(0,65*H/470,datum.label,36,'start','var(--cyan)');
      const value=label(0,228*H/470,'0',Math.min(180,150*H/470),'start','var(--lime)');value.dataset.chartMetric='true';
      label(0,342*H/470,datum.unit,38,'start');label(0,420*H/470,datum.context,30,'start','var(--cyan)');
      updates.push(([p])=>{value.textContent=count(datum.value,p);set(value,{opacity:ease(p)});});
    } else {
      // The second state advances while the first recedes, from focus-swap.
      const panels=[datum.left,datum.right].map((column,i)=>{
        const group=document.createElementNS(ns,'g');group.dataset.comparisonPanel=String(i);svg.appendChild(group);
        const own=node=>{group.appendChild(node);return node;};
        const step=wide?600:(W+40)/2,panelWidth=wide?550:(W-40)/2;
        own(shape('rect',{x:i*step,y:32,width:panelWidth,height:H-65,fill:'var(--surface)',stroke:i?'var(--lime)':'var(--cyan)','stroke-width':2}));
        own(label(i*step+32,96*H/470,column.label,wide?38:32,'start',i?'var(--lime)':'var(--cyan)'));
        column.items.forEach((item,j)=>own(label(i*step+32,(190+j*85)*H/470,item,wide?28:26,'start')));
        return group;
      });
      updates.push(([before,after])=>{
        const p=smooth(after);set(panels[0],{opacity:ease(before)*(1-.45*p)});set(panels[1],{opacity:ease(after),transform:`translate(${64*(1-p)} 0)`});
      });
    }
    return t=>{const amounts=onsets.map(onset=>progress(t,onset));updates.forEach(update=>update(amounts));svg.dataset.chartProgress=amounts.join(',');};
  }
  function mount(scene,spec,index) {
    const stage=scene.querySelector('.production-stage');
    const host=make('div','production-content production-'+spec.kind,null,stage);
    const content=spec.content, start=Number(scene.dataset.start),end=Number(scene.dataset.end);
    const onsets=spec.cues.map(cue=>cues[cue].start+.4);
    const updates=[];
    const incoming=index?data.scenes[index-1].transition:'cut-left';
    const heading=text=>make('h2','prod-heading',text,host,true);
    if(spec.kind==='lettering') {
      updates.push(window.ShortCreatorLettering.mount(host,content,onsets,make));
    } else if(spec.kind==='variable-type') {
      updates.push(window.ShortCreatorVariableType.mount(host,content,onsets,make));
    } else if(spec.kind==='cinema') {
      updates.push(window.ShortCreatorFolio.mount(host,content,onsets,data,make,end));
    } else if(spec.kind==='editorial') {
      updates.push(window.ShortCreatorEditorial.mount(host,content,onsets));
    } else if(spec.kind==='title'&&content.layout?.startsWith('promo-')) {
      updates.push(window.ShortCreatorPromoType.mountTitle(host,content,onsets[0],make));
    } else if(spec.kind==='title'&&['speech-cloud','path-wave'].includes(content.layout)) {
      updates.push(window.ShortCreatorTitleDesigns.mount(host,content,onsets[0],make));
    } else if(spec.kind==='title') {
      const kicker=make('p','prod-kicker',content.kicker,host,true);
      const title=make('h2','prod-title',content.title,host,true);
      const rule=make('div','prod-rule',null,host);
      const subtitle=make('p','prod-subtitle',content.subtitle,host,true);
      updates.push(t=>{const p=phase(t,onsets[0]);reveal(kicker,p,16);reveal(title,p,48);
        rule.style.transform=`scaleX(${p})`;reveal(subtitle,p,24);});
      if(incoming==='text-match'||spec.transition==='text-match') {
        host.classList.add('production-matched-title');title.dataset.matchCarrier='true';
        const cut=incoming==='text-match'?start:end;
        updates.push(t=>{
          const p=clamp((t-cut+.4)/.8),state=textMatch(p,140*contentWidth/1720);
          title.style.transform=`translateX(${state.x}px)`;title.style.filter=state.blur?`blur(${state.blur}px)`:'none';
          title.style.opacity=incoming==='text-match'?'1':String(phase(t,onsets[0]));
          const support=incoming==='text-match'?clamp((p-.5)*2):1-clamp(p*2);
          for(const node of [kicker,rule,subtitle])node.style.opacity=String(support*phase(t,onsets[0]));
        });
      }
      if(content.reveal&&content.reveal!=='rise')updates.push(window.ShortCreatorType.kinds.includes(content.reveal)
        ?window.ShortCreatorType.mount(title,content.reveal,onsets[0],content,data)
        :window.ShortCreatorResources.title(title,content.reveal,onsets[0]));
      if(content.marker)updates.push(window.ShortCreatorHeadlines.marker(title,content.marker,onsets[1]));
      if(['emphasis','layered-emphasis'].includes(content.layout))updates.push(window.ShortCreatorTitleDesigns.emphasis(host,content.backdrop_word,onsets[0],make,content.layout));
    } else if(spec.kind==='data-story'||spec.kind==='network') {
      updates.push(window.ShortCreatorData.mount(host,spec,onsets,data,make));
    } else if(spec.kind==='map-story') {
      updates.push(window.ShortCreatorMaps.mount(host,content,onsets,data,make,reveal));
    } else if(spec.kind==='combo-chart'||spec.kind==='specs') {
      updates.push(window.ShortCreatorChartExtras.mount(host,spec,onsets,make,reveal));
    } else if(spec.kind==='annotation') {
      updates.push(window.ShortCreatorAnnotations.mount(host,content,onsets,data,make));
    } else if(spec.kind==='interaction') {
      updates.push(window.ShortCreatorInteractions.mount(host,content,onsets,data,make));
    } else if(spec.kind==='media-carousel') {
      updates.push(window.ShortCreatorCarousels.mount(host,content,onsets,data,make,reveal));
    } else if(spec.kind==='code-story') {
      updates.push(window.ShortCreatorCode.mount(host,content,onsets,make,reveal));
    } else if(spec.kind==='interface') {
      updates.push(content.variant==='ui-3d-reveal'?window.ShortCreatorUIReveal.mount(host,content,onsets,data,make)
        :content.variant==='liquid-panels'?window.ShortCreatorLiquidPanels.mount(host,content,onsets,data,make)
        :content.variant==='portal-panels'?window.ShortCreatorPortalPanels.mount(host,content,onsets,data,make)
        :content.variant==='shatter-panels'?window.ShortCreatorShatterPanels.mount(host,content,onsets,data,make)
        :content.variant==='glass-parallax'?window.ShortCreatorGlassParallax.mount(host,content,onsets,data,make)
        :['liquid-glass','liquid-widgets'].includes(content.variant)
        ?window.ShortCreatorLiquidGlass.mount(host,content,onsets,make,data)
        :window.ShortCreatorInterface.mount(host,content,onsets,make,reveal,data));
    } else if(spec.kind==='backdrop') {
      updates.push(content.style.startsWith('gpu-')
        ?window.ShortCreatorGpuBackdrops.mount(host,content,onsets,make,reveal)
        :content.style.startsWith('three-')?window.ShortCreatorThreeBackdrops.mount(host,content,onsets,make,reveal)
        :content.style==='gooey-split'?window.ShortCreatorGooeySplit.mount(host,content,onsets,make,reveal)
        :content.style==='halftone-field'?window.ShortCreatorHalftone.mount(host,content,onsets,make,reveal)
        :window.ShortCreatorCanvasBackdrops?.kinds.includes(content.style)?window.ShortCreatorCanvasBackdrops.mount(host,content,onsets,make,reveal)
        :window.ShortCreatorBackdrops.mount(host,content,onsets[0],make,reveal));
    } else if(spec.kind==='headline') {
      make('p','prod-kicker',content.kicker,host,true);
      updates.push(window.ShortCreatorHeadlines.mount(host,content,onsets));
    } else if(spec.kind==='kinetic') {
      make('p','prod-kicker',content.kicker,host,true);
      if(content.style&&content.style!=='standard') {
        updates.push(window.ShortCreatorKineticPresets.mount(host,content,onsets,make));
      } else {
        const slot=make('div','kinetic-window',null,host);
        const words=content.words.map(word=>make('span','kinetic-word',word,slot,true));
        const measure=document.createElement('canvas').getContext('2d');
        const typography=getComputedStyle(words[0]);
        measure.font=wide?'800 90px BrandSans':`${typography.fontWeight} ${typography.fontSize} BrandSans`;
        const widths=content.words.map(word=>measure.measureText(word).width);
        if(wide&&widths.reduce((sum,n)=>sum+n,0)+24*(widths.length-1)>1700)throw new Error('Kinetic phrase exceeds approved type size');
        const positions=wide?positionsAt(widths).map(row=>row.map(x=>({x,y:72}))):
          wrappedPositions(widths,contentWidth,slot.clientHeight,parseFloat(typography.lineHeight));
        const rail=make('i','',null,make('div','kinetic-rail',null,host));
        updates.push(t=>{
          let active=-1;onsets.forEach((onset,i)=>{if(t>=onset)active=i;});
          words.forEach((word,i)=>{
            const visible=i<=active;word.style.opacity=visible?'1':'0';word.setAttribute('aria-hidden',String(!visible));
            if(!visible)return;
            const p=phase(t,onsets[active]);
            const before=active>0&&i<active?positions[active-1][i]:positions[active][i];
            word.style.left=(before.x+(positions[active][i].x-before.x)*p)+'px';
            word.style.top=(before.y+(positions[active][i].y-before.y)*p)+'px';
            word.style.transform=`translateY(${i===active?160*(1-p):0}px)`;
            word.style.color=i===active?'var(--lime)':'white';
          });
          rail.style.transform=`scaleX(${active<0?0:(active+phase(t,onsets[active]))/words.length})`;
        });
      }
    } else if(spec.kind==='grid') {
      heading(content.heading);
      const grid=make('div','prod-grid',null,host), columns=data.profile.id==='portrait'?(content.items.length<=3?1:2):content.items.length===2?2:3;
      grid.style.gridTemplateColumns=`repeat(${columns},minmax(0,1fr))`;
      grid.dataset.rows=String(Math.ceil(content.items.length/columns));
      const cards=content.items.map((item,i)=>{
        const card=make('div','prod-card',null,grid);
        make('p','card-number',String(i+1).padStart(2,'0'),card,true);
        const icon=make('img','',null,card);icon.src=data.icons[item.icon];icon.alt='';
        make('h3','',item.label,card,true);make('p','',item.body,card,true);
        const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),outline=document.createElementNS(ns,'rect');
        svg.classList.add('card-outline');svg.setAttribute('aria-hidden','true');
        outline.setAttribute('x','2');outline.setAttribute('y','2');outline.setAttribute('width',String(card.clientWidth-4));
        outline.setAttribute('height',String(card.clientHeight-4));outline.setAttribute('fill','none');
        outline.setAttribute('stroke','var(--lime)');outline.setAttribute('stroke-width','2');svg.appendChild(outline);card.appendChild(svg);
        const length=outline.getTotalLength();outline.setAttribute('stroke-dasharray',String(length));
        return {card,outline,length};
      });
      updates.push(t=>cards.forEach(({card,outline,length},i)=>{
        const p=phase(t,onsets[i]);reveal(card,p,48);
        outline.setAttribute('stroke-dashoffset',String(length*(1-p)));
      }));
    } else if(spec.kind==='quote') {
      const quote=make('div','prod-quote',null,host);
      quote.setAttribute('aria-label',content.quote);
      const tokens=content.quote.split(/\s+/).map((word,i)=>{
        if(i)quote.appendChild(document.createTextNode(' '));
        const token=make('span','',word,quote);token.style.display='inline-block';return token;
      });
      const rows=[];let top=null;
      for(const token of tokens){if(top===null||Math.abs(token.offsetTop-top)>2){rows.push([]);top=token.offsetTop;}rows.at(-1).push(token.textContent);}
      quote.textContent='';
      const lines=rows.map(row=>make('div','quote-line',row.join(' '),make('div','quote-line-mask',null,quote),true));
      const lineHeight=lines[0]?.parentElement.clientHeight||110;
      if(lines.length>(wide?4:Math.floor(parseFloat(getComputedStyle(quote).maxHeight)/lineHeight)))throw new Error('Quotation exceeds approved type size');
      const rule=make('div','prod-rule quote-rule',null,host);
      const attribution=make('p','quote-attribution',content.attribution,host,true);
      const source=make('p','quote-source',content.source,host,true);
      updates.push(t=>{const p=phase(t,onsets[0]);lines.forEach((line,i)=>reveal(line,phase(t,onsets[0],.5+i*.08),96));
        rule.style.transform=`scaleX(${p})`;reveal(attribution,p,20);reveal(source,p,12);});
    } else if(spec.kind==='screen') {
      const copy=make('div','screen-copy',null,host);make('h2','prod-heading',content.heading,copy,true);
      make('p','',content.caption,copy,true);
      const device=make('div','screen-device',null,host);device.dataset.chrome=content.chrome;
      make('div','screen-toolbar',content.chrome==='phone'?'LOCAL PREVIEW':'LOCAL FILE / '+content.chrome.toUpperCase(),device,true);
      const view=make('div','screen-view',null,device);
      const world=content.focus?make('div','screen-world',null,view):view;
      const images=content.images.map(id=>{const image=make('img','',null,world);image.src=data.assets[id];image.alt=content.caption;return image;});
      const curtain=make('div','screen-curtain',null,view);
      if(content.lens==='filmed') {
        host.classList.add('production-focus');curtain.style.opacity='0';
        const labels=content.focus.map((region,i)=>make('p','focus-label',`${String(i+1).padStart(2,'0')} / ${region.label}`,copy,true));
        const lens=window.ShortCreatorFilmedScreen.mount(view,images[0],onsets,content.focus);
        updates.push(t=>{
          reveal(device,phase(t,onsets[0]),32);const active=lens(t);
          labels.forEach((node,i)=>{node.style.opacity=active===i?'1':'.4';node.style.color=active===i?'var(--lime)':'white';});
        });
      } else if(content.focus) {
        host.classList.add('production-focus');
        const highlight=make('div','screen-focus-region',null,world);
        const labels=content.focus.map((region,i)=>make('p','focus-label',`${String(i+1).padStart(2,'0')} / ${region.label}`,copy,true));
        updates.push(t=>{
          reveal(device,phase(t,onsets[0]),32);curtain.style.opacity='0';
          let active=-1;onsets.slice(1).forEach((onset,i)=>{if(t>=onset)active=i;});
          const targets=content.focus.map(region=>cameraTarget(view.clientWidth,view.clientHeight,images[0].naturalWidth,images[0].naturalHeight,region));
          const after=active<0?{x:0,y:0,scale:1}:targets[active],before=active>0?targets[active-1]:{x:0,y:0,scale:1};
          const p=active<0?0:phase(t,onsets[active+1]),mix=key=>before[key]+(after[key]-before[key])*p;
          world.style.transform=`translate(${mix('x')}px,${mix('y')}px) scale(${mix('scale')})`;
          world.dataset.focusIndex=String(active);world.dataset.focusProgress=String(p);
          highlight.style.opacity=active<0?'0':String(p);
          if(active>=0){for(const key of ['left','top','width','height'])highlight.style[key]=after[key]+'px';highlight.style.borderWidth=(3/mix('scale'))+'px';}
          labels.forEach((node,i)=>{node.style.opacity=active===i?'1':'.4';node.style.color=active===i?'var(--lime)':'white';});
        });
      } else if(content.swap==='beat-freeze') {
        curtain.style.opacity='0';
        const swap=window.ShortCreatorBeatFreeze.mount(view,images,onsets);
        updates.push(t=>{reveal(device,phase(t,onsets[0]),32);swap(t);});
      } else if(content.swap==='clone-wall') {
        curtain.style.opacity='0';
        const swap=window.ShortCreatorScreenCuts.mount(view,images,onsets,content.word);
        updates.push(t=>{reveal(device,phase(t,onsets[0]),32);swap(t);});
      } else if(content.swap?.startsWith('catalog-')) {
        curtain.style.opacity='0';
        const swap=window.ShortCreatorSwapCatalog.mount(view,images,onsets,content.swap);
        updates.push(t=>{reveal(device,phase(t,onsets[0]),32);swap(t);});
      } else if(content.swap?.startsWith('shader-')) {
        curtain.style.opacity='0';
        const swap=window.ShortCreatorShaders.mount(view,images,onsets,content.swap);
        updates.push(t=>{reveal(device,phase(t,onsets[0]),32);swap(t);});
      } else if(content.swap==='iris') {
        curtain.style.opacity='0';
        const swap=window.ShortCreatorResources.iris(view,images,onsets);
        updates.push(t=>{reveal(device,phase(t,onsets[0]),32);swap(t);});
      } else if(content.swap&&content.swap!=='wipe') {
        curtain.style.opacity='0';
        const swap=window.ShortCreatorTransitions.mount(view,images,onsets,content.swap);
        updates.push(t=>{reveal(device,phase(t,onsets[0]),32);swap(t);});
      } else {
      updates.push(t=>{
        reveal(device,phase(t,onsets[0]),32);
        let active=0;onsets.forEach((onset,i)=>{if(t>=onset)active=i;});
        const p=phase(t,onsets[active]),shown=active>0&&p<.5?active-1:active;
        images.forEach((image,i)=>{image.style.visibility=i===shown?'visible':'hidden';});
        curtain.style.transform=`translateX(${100-200*p}%)`;
        curtain.style.opacity=active>0&&p>0&&p<1?'1':'0';
      });
      }
    } else if(spec.kind==='walkthrough') {
      heading(content.heading);
      const viewport=make('div','walk-window',null,host),strip=make('div','walk-strip',null,viewport);
      const panels=content.sections.map((item,i)=>{
        const panel=make('div','walk-panel',null,strip);
        make('p','card-number',`${String(i+1).padStart(2,'0')} / ${String(content.sections.length).padStart(2,'0')}`,panel,true);
        make('h3','',item.label,panel,true);make('p','',item.body,panel,true);
        const icon=make('img','',null,panel);icon.src=data.icons[item.icon];icon.alt='';return panel;
      });
      updates.push(t=>{
        let active=0;onsets.forEach((onset,i)=>{if(t>=onset)active=i;});
        const p=phase(t,onsets[active]),position=active?active-1+p:0;
        // Layout positioning avoids stale clipped SVG rasters after a backward seek.
        strip.style.left=`${-position*(contentWidth+parseFloat(getComputedStyle(strip).gap))}px`;
        reveal(viewport,phase(t,onsets[0]),32);
        panels.forEach((panel,i)=>panel.setAttribute('aria-hidden',String(i!==active)));
      });
    } else if(spec.kind==='lower-third') {
      if(content.variant==='news-ticker') {
        updates.push(window.ShortCreatorNewsTicker.mount(host,content,onsets,make,reveal));
      } else if(content.variant==='channel-card') {
        updates.push(window.ShortCreatorClosings.channel(host,content,onsets,make,reveal));
      } else if(content.variant&&content.variant!=='side-rule') {
        updates.push(window.ShortCreatorResources.lowerThird(host,content,onsets[0],make,reveal));
      } else {
      make('p','prod-kicker',content.heading,host,true);
      const context=make('p','lower-context',content.context,host,true);
      const lockup=make('div','lower-lockup',null,host),rule=make('div','lower-rule',null,lockup);
      const name=make('p','lower-name',content.name,lockup,true),role=make('p','lower-role',content.role,lockup,true);
      updates.push(t=>{const p=phase(t,onsets[0]);reveal(context,p,40);rule.style.transform=`scaleY(${p})`;
        reveal(name,p,24);reveal(role,p,14);});
      }
    } else if(spec.kind==='chart') {
      updates.push(mountChart(host,content.record,onsets,content));
    } else if(spec.kind==='source-stage') {
      updates.push(window.ShortCreatorSourceStages.mount(host,content,onsets,data,make,reveal));
    } else if(spec.kind==='spatial-stage') {
      updates.push(window.ShortCreatorSpatialObjects.mount(host,content,onsets,data,make,reveal));
    } else if(spec.kind==='media-grid') {
      updates.push(window.ShortCreatorMedia.mount(host,spec,onsets,data,make,reveal));
    } else if(['code','carousel','diagram','checklist'].includes(spec.kind)) {
      updates.push(window.ShortCreatorResources.mount(host,spec,onsets,data,make,reveal));
    } else if(['trust','testimonial','proof'].includes(spec.kind)) {
      updates.push(window.ShortCreatorEvidence.mount(host,spec,onsets,data,make,reveal));
    } else if(spec.kind==='cta') {
      if(content.style==='cursor-rays') {
        updates.push(window.ShortCreatorCursorRays.mount(host,content,onsets,data,make));
      } else if(content.style==='creator-intro') {
        updates.push(window.ShortCreatorCreatorIntro.mount(host,content,onsets,data,make));
      } else if(content.style==='character-walk') {
        updates.push(window.ShortCreatorCharacterWalk.mount(host,content,onsets,data,make));
      } else if(window.ShortCreatorBrandLockups.kinds.includes(content.style)) {
        updates.push(window.ShortCreatorBrandLockups.mount(host,content,onsets,data,make));
      } else if(content.style&&content.style!=='standard') {
        updates.push(window.ShortCreatorClosings.mount(host,content,onsets[0],make));
      } else {
      const title=make('h2','prod-title',content.heading,host,true);
      const action=make('p','cta-action',content.action,host,true),label=make('p','cta-label',content.label,host,true);
      updates.push(t=>{const p=phase(t,onsets[0]);reveal(title,p,32);reveal(action,p,48);reveal(label,p,24);});
      }
    } else throw new Error('Unsupported production composition');
    return {render(t){
      if(t<start||t>=end)return;
      scene.style.opacity='1';
      const pending=updates.map(update=>update(t)).filter(result=>result&&typeof result.then==='function');
      let state={x:0,scale:1,opacity:1,blur:0};
      const seam=(kind,side,p)=>window.ShortCreatorMotion.kinds.includes(kind)
        ?window.ShortCreatorMotion.seam(kind,side,p):window.ShortCreatorCinema.seam(kind,side,p);
      if(t<start+.4&&incoming!=='text-match')state=seam(incoming,'entry',(t-start)/.4);
      if(t>end-.4&&spec.transition!=='text-match')state=seam(spec.transition,'exit',(t-end+.4)/.4);
      stage.style.transform=state.y?`translateY(${state.y*data.profile.height/1080}px) scale(${state.scale})`
        :state.x===0&&state.scale===1?'none':`translateX(${state.x*data.profile.width/1080}px) scale(${state.scale})`;
      stage.style.opacity=String(state.opacity);stage.style.filter=state.blur===0?'none':`blur(${state.blur}px)`;
      if(pending.length)return Promise.all(pending);
    }};
  }
  window.ShortCreatorVisualRenderAt=t=>{
    const pending=mounted.map(item=>item.render(t)).filter(result=>result&&typeof result.then==='function');
    if(pending.length)return Promise.all(pending);
  };
  window.ShortCreatorVisualReady=(async()=>{
    await Promise.all([document.fonts.load('800 90px BrandSans'),document.fonts.load('600 38px BrandSans'),document.fonts.load('400 26px BrandMono')]);
    await document.fonts.ready;
    for(const font of ['800 90px BrandSans','600 38px BrandSans','400 26px BrandMono'])
      if(!document.fonts.check(font))throw new Error('Approved production font unavailable');
    data.scenes.forEach((spec,index)=>mounted.push(mount(document.querySelector(`[data-production-index="${index}"]`),spec,index)));
    if(window.ShortCreatorVariableType)await window.ShortCreatorVariableType.ready();
    await Promise.all([...document.querySelectorAll('.production-content img,.cinema-art')].map(image=>image.decode()));
    await window.ShortCreatorShaders.ready();
    await window.ShortCreatorAdvancedType.ready();
    if(window.ShortCreatorGpuBackdrops)await window.ShortCreatorGpuBackdrops.ready();
    if(window.ShortCreatorLiquidGlass)await window.ShortCreatorLiquidGlass.ready();
    if(window.ShortCreatorDeviceModels)await window.ShortCreatorDeviceModels.ready();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    await window.ShortCreatorRenderAt(0);
  })();
})();
