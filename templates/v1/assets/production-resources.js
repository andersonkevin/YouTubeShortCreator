/* Bounded HyperFrames adaptations; source hashes in hyperframes-production-provenance.json.
   Caller records supply text and local image IDs, never code, selectors or SVG paths. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>1-(1-clamp(x))**5;
  const smooth=x=>(1-Math.cos(Math.PI*clamp(x)))/2;
  const progress=(t,onset)=>clamp((t-onset)/.8);
  function successState(p,checked) {
    const q=clamp(p),time=q*.54,a=clamp(time/.34)-1;
    const back=q===0?0:1+2.8*a**3+1.8*a**2;
    return {opacity:checked?clamp(back):0,scale:q===1?1:.72+.28*back,
      rotation:q===1?0:-18*(1-back),blur:Math.max(0,7*(1-back)),
      draw:checked?1-(1-clamp((time-.12)/.42))**3:0};
  }
  function scrambleTable(text,frames=24) {
    const chars=Array.from(text),glyphs='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+?<>';
    let state=0x27c0ffee;
    return Array.from({length:frames+1},(_,frame)=>chars.map((char,index)=>{
      const lock=Math.round(3+index/Math.max(1,chars.length-1)*(frames-3));
      if(/\s/.test(char)||frame>=lock)return char;
      state=(Math.imul(1664525,state)+1013904223)>>>0;
      let glyph=glyphs[state%glyphs.length];
      if(glyph===char)glyph=glyphs[(state+1)%glyphs.length];
      return glyph;
    }));
  }
  // Upstream carousel sheds 86% of travel in 42% of the move, then catches softly.
  function carouselTravel(p) {
    const x=clamp(p);
    return x<=.42?.86*(1-(1-x/.42)**5):.86+.14*(1-(1-(x-.42)/.58)**3);
  }
  function irisRadius(width,height,p) {
    return (Math.hypot(width/2,height/2)*1.02+2)*smooth(p);
  }
  function metricColumns(value,style) {
    return Array.from(String(value),char=>{
      const stops=/\d/.test(char)?(style==='wheel'?10+Number(char):1):0;
      const rows=stops?Array.from({length:stops+1},(_,i)=>style==='wheel'?String(i%10):(i?char:'0')):[char];
      return {char,stops,rows};
    });
  }
  function metricPhase(p,index,length) {
    return clamp((p-.22*index/Math.max(1,length-1))/.78);
  }
  // apple-money-count's seeded-by-index burst; the caller supplies the metric.
  function burstSpecs() {
    return Array.from({length:62},(_,i)=>{
      const coin=i%3===0,angle=i*2.399963229728653,ring=i%5;
      return {coin,x:Math.max(-865,Math.min(865,Math.cos(angle)*(260+ring*145+i%7*12)+i%4*24-36)),
        y:Math.max(-465,Math.min(465,Math.sin(angle*1.13)*(160+ring*78+i%6*12)+i%5*18-36)),
        delay:i%8*.025,duration:.74+i%5*.045,fadeDelay:i%5*.05,
        rotation:i*43%160-80,scale:coin?.72+i%4*.08:.68+i%5*.07};
    });
  }
  function burstState(progress) {
    if(!Number.isFinite(progress))throw new Error('Burst requires a finite native clock');
    const p=clamp(progress),t=3.16+1.6*p,cubic=x=>1-(1-clamp(x))**3;
    const attack=clamp((t-3.16)/.16),a=attack-1,back=1+3.2*a**3+2.2*a*a;
    const scale=t<3.33?1+.06*back:1.06-.06*cubic((t-3.33)/.23);
    const flash=t<3.24?.34*clamp((t-3.16)/.08):t<4?.34-.12*clamp((t-3.24)/.76):.22*(1-cubic((t-4)/.16));
    const icons=burstSpecs().map(s=>{
      const q=1-(1-clamp((t-3.28-s.delay)/s.duration))**5;
      const fadeAt=4.18+s.fadeDelay,fade=clamp((t-fadeAt)/.38)**3;
      const reached=1-(1-clamp((fadeAt-3.28-s.delay)/s.duration))**5;
      const fading=t>=fadeAt,fromScale=.18+(s.scale-.18)*reached;
      return {x:s.x*q,y:fading?s.y*reached+(s.y*(1-reached)+(s.y<0?-58:58))*fade:s.y*q,
        rotation:s.rotation*q,scale:fading?fromScale+(s.scale*.54-fromScale)*fade:.18+(s.scale-.18)*q,
        opacity:p===1?0:(fading?reached*(1-fade):q)};
    });
    return {scale:p===1?1:scale,flash:p===1?0:flash,icons};
  }
  function metric(datum,options,{svg,label,shape,set,W,H,wide,count}) {
    if(window.ShortCreatorStatCards?.kinds.includes(options.metric_style))return window.ShortCreatorStatCards.mount(datum,options,{svg,label,shape,set,W,H});
    const style=options.metric_style,size=wide?156:100,baseline=H*.43;
    label(0,H*.08,datum.label,32,'start','var(--cyan)');
    label(0,H*.91,datum.context,28,'start','var(--cyan)');
    svg.dataset.metricStyle=style;
    if(style==='count-burst') {
      const fit=Math.min(W/1920,H/1080),center=W/2;
      const flash=shape('rect',{x:0,y:H*.14,width:W,height:H*.66,fill:'var(--lime)',opacity:0});
      const value=label(center,baseline,'0',size,'middle','var(--lime)');value.dataset.chartMetric='true';
      label(0,H*.7,datum.unit,34,'start');
      const extentX=(W-96*fit)/2-4,extentY=Math.min(baseline-H*.14,H*.8-baseline)-48*fit-4;
      const icons=burstSpecs().map(s=>{
        const group=shape('g',{'data-metric-burst':'true','aria-hidden':'true'});
        const mark=s.coin?shape('circle',{cx:0,cy:0,r:32,fill:'var(--lime)',stroke:'var(--purple)','stroke-width':4}):
          shape('rect',{x:-48,y:-26,width:96,height:52,rx:10,fill:'var(--cyan)',stroke:'var(--purple)','stroke-width':3});
        group.appendChild(mark);return group;
      });
      return ([p,q])=>{
        const s=burstState(q);value.textContent=p===1?String(datum.value):String(Number((datum.value*p).toFixed(2)));
        set(value,{opacity:ease(p),transform:`translate(${center} ${baseline}) scale(${s.scale}) translate(${-center} ${-baseline})`});
        set(flash,{opacity:s.flash});
        icons.forEach((icon,i)=>{const state=s.icons[i];set(icon,{opacity:state.opacity,
          transform:`translate(${center+state.x*extentX/865} ${baseline+state.y*extentY/523}) rotate(${state.rotation}) scale(${fit*state.scale})`});});
        svg.dataset.burstState=JSON.stringify(s);
      };
    }
    if(style==='star-rating') {
      const stars=window.ShortCreatorEvidence.starRow(svg,datum.value,options.maximum,
        {x:0,y:H*(wide?.25:.18),width:W*(wide?.64:1),height:H*(wide?.27:.24)});
      const value=label(wide?W*.7:0,H*(wide?.42:.6),'0',size,'start','var(--lime)');value.dataset.chartMetric='true';
      label(0,H*.78,`${datum.unit} / max ${options.maximum}`,28,'start');
      return ([p])=>{stars(p);value.textContent=count(datum.value,p);set(value,{opacity:ease(p)});};
    }
    if(style==='usage-arc'||style==='progress-bar'||style==='conic-ring') {
      const ring=style==='conic-ring',arc=style!=='progress-bar',diameter=Math.min(H*.58,300),r=ring?diameter/2/1.12-2:diameter/2-8;
      const value=label(arc?diameter+36:0,baseline,'0',size,'start','var(--lime)');
      value.dataset.chartMetric='true';
      label(arc?diameter+36:0,H*.68,`${datum.unit} / max ${options.maximum}`,30,'start');
      let fill,length;
      if(arc) {
        const attrs={cx:diameter/2,cy:H*.45,r,fill:'none','stroke-width':ring?r*.24:6};
        shape('circle',{...attrs,stroke:'var(--cyan)','stroke-opacity':.3});
        length=2*Math.PI*r;
        fill=shape('circle',{...attrs,stroke:'var(--lime)',transform:`rotate(-90 ${diameter/2} ${H*.45})`,
          'stroke-dasharray':`${length} ${length}`,'stroke-linecap':'butt'});
      } else {
        const attrs={x:0,y:H*.54,width:W,height:8};
        shape('rect',{...attrs,fill:'var(--cyan)','fill-opacity':.3});
        fill=shape('rect',{...attrs,fill:'var(--lime)'});
      }
      fill.dataset.metricGauge=style;
      return ([p])=>{
        const amount=ring?1-(1-p)**3:smooth(p),fraction=datum.value/options.maximum*amount;
        value.textContent=ring?(p===1?String(datum.value):String(Number((datum.value*amount).toFixed(2)))):count(datum.value,p);
        set(value,{opacity:ease(p)});
        set(fill,arc?{'stroke-dashoffset':length*(1-fraction)}:{width:W*fraction});
      };
    }
    label(0,H*.7,datum.unit,34,'start');
    const group=shape('g',{'data-chart-metric':'true','aria-label':String(datum.value)});
    const columns=metricColumns(datum.value,style),row=size*1.35;
    let left=0;
    const nodes=columns.map(({char,stops,rows},index)=>{
      const measure=label(0,0,char,size,'start','var(--lime)');
      const width=measure.getComputedTextLength()+4;measure.remove();
      const x=left;left+=width;
      if(style==='pop'||!stops) {
        const node=label(x,baseline,char,size,'start','var(--lime)');group.appendChild(node);
        node.dataset.metricFinal='true';node.dataset.metricColumn=String(index);
        return {node,x,stops:0};
      }
      // SVG viewports provide the same one-row mask as the upstream DOM reels.
      const frame=shape('svg',{x,y:baseline-row/2,width,height:row,overflow:'hidden','data-metric-reel':index});
      group.appendChild(frame);
      const viewport=shape('rect',{x:0,y:0,width,height:row,fill:'none','data-metric-viewport':'true','data-fit':'true'});
      frame.appendChild(viewport);
      const strip=shape('g',{});frame.appendChild(strip);
      rows.forEach((text,i)=>{
        const node=label(0,row/2+i*row,text,size,'start','var(--lime)');
        node.removeAttribute('data-fit');strip.appendChild(node);
        if(i===stops)node.dataset.metricFinal='true';
      });
      return {node:strip,frame,stops,x};
    });
    if(left>W)throw new Error('Metric exceeds composition at approved type size');
    return ([p])=>{
      nodes.forEach(({node,stops,x},i)=>{
        const q=metricPhase(p,i,nodes.length);
        if(stops) {
          const travel=style==='wheel'?1-(1-q)**3:smooth(q);
          set(node,{transform:`translate(0 ${-row*stops*travel})`});
        } else if(style==='pop') {
          const back=1+2.8*(q-1)**3+1.8*(q-1)**2;
          set(node,{transform:`translate(${x} ${baseline+24*(1-q)}) scale(${.82+.18*back}) translate(${-x} ${-baseline})`,
            visibility:q===0?'hidden':'visible'});
          node.style.filter=q===1?'none':`blur(${8*(1-q)}px)`;
        }
      });
    };
  }
  function cursor(t,onsets) {
    let index=0;onsets.forEach((time,i)=>{if(t>=time)index=i;});
    return {index,p:progress(t,onsets[index])};
  }
  function title(node,kind,onset) {
    if(kind==='rise')throw new Error('Default title reveal is owned by the production renderer');
    const text=node.textContent,words=text.split(/(\s+)/),chars=[];
    node.dataset.resourceReveal=kind;node.setAttribute('aria-label',text);node.textContent='';
    const units=[];
    for(const word of words) {
      if(/^\s+$/.test(word)){node.appendChild(document.createTextNode(word));chars.push(...Array.from(word,()=>null));continue;}
      const span=document.createElement('span');span.className='resource-word';span.textContent=word;node.appendChild(span);units.push(span);
      if(kind==='typewriter'||kind==='scramble') {
        span.textContent='';
        for(const char of Array.from(word)) {
          const unit=document.createElement('span');unit.className='resource-character';unit.textContent=char;span.appendChild(unit);chars.push(unit);
        }
      }
    }
    const table=scrambleTable(text);
    if(kind==='scramble')for(const char of chars.filter(Boolean)) {
      // Reserve target advances: temporary glyphs cannot reflow the authored words.
      char.style.width=char.offsetWidth+'px';char.style.overflow='hidden';
    }
    return t=>{
      const p=progress(t,onset);node.style.opacity=t<onset?'0':'1';node.style.transform='none';
      node.dataset.revealProgress=String(p);
      if(kind==='typewriter'||kind==='scramble') {
        const visible=p===1?chars.length:Math.floor(p*chars.length),row=table[Math.min(24,Math.floor(p*24+1e-8))];
        chars.forEach((char,i)=>{if(!char)return;
          if(kind==='scramble')char.textContent=row[i];
          else {char.style.visibility=i<visible?'visible':'hidden';char.style.boxShadow=i===visible-1&&p<1?'3px 0 var(--lime)':'none';}
        });
      } else units.forEach((unit,i)=>{
        const q=ease((p-i*.32/Math.max(1,units.length-1))/.68);
        unit.style.opacity=kind==='per-word-rise'?(q>0?'1':'0'):String(q);
        unit.style.transform=`translateY(${(kind==='per-word-rise'?50:8)*(1-q)}px)`;
        unit.style.filter=q===1?'none':`blur(${10*(1-q)}px)`;
      });
    };
  }
  function iris(view,images,onsets) {
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),ring=document.createElementNS(ns,'circle');
    svg.classList.add('resource-iris-rim');svg.setAttribute('aria-hidden','true');svg.appendChild(ring);view.appendChild(svg);
    ring.setAttribute('fill','none');ring.setAttribute('stroke','var(--lime)');ring.setAttribute('stroke-width','3');
    return t=>{
      const {index,p}=cursor(t,onsets),w=view.clientWidth,h=view.clientHeight,r=irisRadius(w,h,p);
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);ring.setAttribute('cx',String(w/2));ring.setAttribute('cy',String(h/2));ring.setAttribute('r',String(r));
      svg.style.opacity=index>0&&p>0&&p<.95?'1':'0';
      images.forEach((image,i)=>{
        const before=i===index-1&&p<1,after=i===index;
        image.style.visibility=before||after?'visible':'hidden';image.style.zIndex=after?'2':'1';
        image.style.clipPath=after&&index>0&&p<1?`circle(${r}px at 50% 50%)`:'none';
      });
      view.dataset.swapIndex=String(index);view.dataset.swapProgress=String(p);view.dataset.irisRadius=String(r);
    };
  }
  function lowerThirdState(value) {
    const p=clamp(value);
    return {base:ease(p/.62),name:ease((p-.15)/.65),role:ease((p-.32)/.68),
      accent:ease((p-.18)/.62),sweep:smooth(p/.72)};
  }
  function roundedRail(width,height,radius) {
    const r=Math.min(radius,width/2,height/2),sw=width-2*r,sh=height-2*r,arc=Math.PI*r/2;
    return {d:`M ${r} 0 H ${width-r} A ${r} ${r} 0 0 1 ${width} ${r} V ${height-r} A ${r} ${r} 0 0 1 ${width-r} ${height} H ${r} A ${r} ${r} 0 0 1 0 ${height-r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`,
      length:2*sw+2*sh+4*arc,corners:[sw+arc/2,sw+sh+1.5*arc,2*sw+sh+2.5*arc,2*sw+2*sh+3.5*arc]};
  }
  function cornerHead(corners,length,value) {
    const phase=clamp(value)*4,index=Math.floor(phase),p=phase-index;
    const at=i=>corners[i%4]+Math.floor(i/4)*length;
    return at(index)+(at(index+1)-at(index))*smooth(p);
  }
  function svgNode(tag,attrs,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
    parent.appendChild(node);return node;
  }
  function lowerThird(host,c,onset,make,reveal) {
    make('p','prod-kicker',c.heading,host,true);
    const context=make('p','lower-context resource-lower-context',c.context,host,true);
    const panel=make('div','resource-lower',null,host);panel.dataset.variant=c.variant;
    const nameWrap=make('div','resource-lower-name-wrap',null,panel);
    const name=make('p','resource-lower-name',c.name,nameWrap,true);
    const roleWrap=make('div','resource-lower-role-wrap',null,panel);
    const role=make('p','resource-lower-role',c.role,roleWrap,true);
    const accent=make('i','resource-lower-accent',null,panel),sweep=make('i','resource-lower-sweep',null,nameWrap);
    let neon=null;
    if(c.variant==='neon-border') {
      const width=panel.clientWidth,height=panel.clientHeight,shape=roundedRail(width-16,height-16,20);
      const svg=svgNode('svg',{class:'resource-lower-neon',viewBox:`0 0 ${width} ${height}`,'aria-hidden':'true'},panel);
      const attrs={d:shape.d,transform:'translate(8 8)',fill:'none',stroke:'var(--lime)','stroke-width':3};
      const rail=svgNode('path',{...attrs,'data-lower-rail':'true'},svg),length=rail.getTotalLength();
      const corners=shape.corners.map(n=>n*length/shape.length),segments=[];
      for(const offset of [0,length/2])for(let i=0;i<12;i++) {
        const step=length*.22/12;
        const path=svgNode('path',{...attrs,'stroke-width':i<4?4:7,stroke:i<4?'white':'var(--lime)',
          'stroke-dasharray':`${step} ${length-step}`,'stroke-linecap':i===0?'round':'butt'},svg);
        segments.push({path,offset,step,index:i});
      }
      neon=p=>{
        const head=cornerHead(corners,length,p);rail.style.opacity=String(.14+.86*ease(p));
        for(const {path,offset,step,index} of segments) {
          const start=((head+offset-(index+1)*step)%length+length)%length;
          path.setAttribute('stroke-dashoffset',String(-start));path.style.opacity=p===1?'0':String((1-index/12)**2.6);
        }
        svg.dataset.railProgress=String(p);
      };
    }
    return t=>{
      const p=progress(t,onset),s=lowerThirdState(p);panel.dataset.lowerProgress=String(p);
      reveal(context,ease(p),40);reveal(name,s.name,24);reveal(role,s.role,14);
      panel.style.opacity=t<onset?'0':'1';panel.style.transform='none';
      panel.style.clipPath='none';nameWrap.style.clipPath='none';roleWrap.style.clipPath='none';
      accent.style.transform=`scaleX(${s.accent})`;
      if(['clean-bar','bold-block'].includes(c.variant))panel.style.clipPath=`inset(0 ${(1-s.base)*100}% 0 0)`;
      if(c.variant==='clean-bar')accent.style.transform=`scaleY(${s.accent})`;
      if(c.variant==='color-block')panel.style.transform=`translateX(${-60*(1-s.base)}px)`;
      if(c.variant==='dark-card')panel.style.transform=`translateY(${50*(1-s.base)}px)`;
      if(c.variant==='soft-pill') {
        panel.style.transform=`translateY(${18*(1-s.base)}px) scale(${.88+.12*s.base})`;
        accent.style.transform=`scale(${s.accent})`;
      }
      if(c.variant==='kicker-name')role.style.transform=`translateY(${-26*(1-s.role)}px)`;
      if(c.variant==='mask-reveal') {
        reveal(name,1,0);nameWrap.style.clipPath=`inset(0 ${(1-s.sweep)*100}% 0 0)`;
        sweep.style.left=(nameWrap.clientWidth*s.sweep-6)+'px';sweep.style.opacity=p>0&&p<.72?'1':'0';
      }
      if(c.variant==='stack-bars') {
        nameWrap.style.clipPath=`inset(0 ${(1-s.name)*100}% 0 0)`;
        roleWrap.style.clipPath=`inset(0 0 0 ${(1-s.role)*100}%)`;
      }
      if(neon)neon(p);
    };
  }
  function mount(host,spec,onsets,data,make,reveal) {
    const c=spec.content;
    const heading=make('h2','prod-heading',c.heading,host,true);
    make('p','resource-source',c.source,host,true);
    if(spec.kind==='checklist') {
      let ellipse=null;
      if(c.emphasis) {
        const index=c.heading.indexOf(c.emphasis);heading.textContent='';
        heading.appendChild(document.createTextNode(c.heading.slice(0,index)));
        const word=make('span','resource-check-emphasis',c.emphasis,heading);
        const svg=svgNode('svg',{viewBox:'0 0 100 32',preserveAspectRatio:'none','aria-hidden':'true'},word);
        ellipse=svgNode('ellipse',{cx:50,cy:16,rx:47,ry:13.5,pathLength:100,fill:'none',stroke:'var(--lime)','stroke-width':1.2,'stroke-dasharray':100},svg);
        heading.appendChild(document.createTextNode(c.heading.slice(index+c.emphasis.length)));
      }
      const list=make('div','resource-checklist',null,host);
      const rows=c.items.map(item=>{
        const row=make('div','resource-check-row',null,list);row.dataset.checked=String(item.checked);
        make('p','resource-check-label',item.label,row,true);make('p','resource-check-value',item.value,row,true);
        const ring=c.style==='success-ring';
        const svg=svgNode('svg',{viewBox:ring?'0 0 64 64':'0 0 100 100',class:'resource-check-mark','aria-hidden':'true'},row);
        if(ring)svgNode('circle',{cx:32,cy:32,r:27,fill:'none',stroke:'var(--lime)','stroke-opacity':.28,'stroke-width':5},svg);
        else svgNode('rect',{x:3,y:3,width:94,height:94,rx:10,fill:'none',stroke:'var(--line)','stroke-width':3},svg);
        const check=svgNode('path',{d:ring?'M20 33.5l8 8L45 23':'M6 46 L30 72 L80 8',transform:ring?'translate(0 0)':'translate(7 6)',pathLength:100,fill:'none',stroke:'var(--lime)','stroke-width':ring?5:7,'stroke-linecap':'round','stroke-linejoin':'round','stroke-dasharray':100},svg);
        const neutral=c.style==='icon-swap'?svgNode('circle',{cx:50,cy:50,r:18,fill:'none',stroke:'var(--cyan)','stroke-width':5},svg):null;
        if(c.style==='icon-morph'){check.setAttribute('transform','translate(0 0)');check.setAttribute('fill','var(--lime)');check.setAttribute('stroke-width',1);}
        return {row,svg,check,neutral,checked:item.checked};
      });
      return t=>{
        if(ellipse)ellipse.setAttribute('stroke-dashoffset',String(100*(1-smooth(progress(t,onsets[0])))));
        rows.forEach(({row,svg,check,neutral,checked},i)=>{
          const p=progress(t,onsets[i]),s=c.style==='success-ring'?successState(p,checked):null;
          const draw=s?s.draw:checked?ease((p-.35)/.65):0;
          reveal(row,ease(p),18);row.dataset.rowProgress=String(p);
          check.setAttribute('stroke-dashoffset',String(100*(1-draw)));check.style.opacity=draw>0?'1':'0';
          if(['icon-swap','icon-morph'].includes(c.style)) {
            const state=window.ShortCreatorUIPrimitives.statusState(c.style,p,checked);
            check.style.transformOrigin='50px 50px';check.style.transform=`rotate(${state.turn}deg) scale(${state.scale})`;
            check.style.filter=state.blur>0?`blur(${state.blur}px)`:'none';check.style.opacity=String(state.alpha);
            check.setAttribute('stroke-dashoffset',String(100*(1-state.draw)));
            if(c.style==='icon-morph')check.setAttribute('d',window.ShortCreatorUIPrimitives.morphPath(state.morph));
            if(neutral){neutral.style.transformOrigin='50px 50px';neutral.style.transform=checked?`rotate(${state.neutralTurn}deg) scale(${state.neutralScale})`:'none';neutral.style.filter=checked?`blur(${state.neutralBlur}px)`:'none';neutral.style.opacity=String(checked?state.neutralAlpha:1);}
            row.dataset.statusPresentation=JSON.stringify(state);
          }
          if(s) {
            svg.style.transform=p===1?'none':`rotate(${s.rotation}deg) scale(${s.scale})`;
            svg.style.filter=s.blur>0?`blur(${s.blur}px)`:'none';
            // An unchecked item retains its empty circle; it never gains a tick.
            svg.style.opacity=String(checked?s.opacity:1);row.dataset.successState=JSON.stringify(s);
          }
        });
      };
    }
    if(spec.kind==='code') {
      const editor=make('div','resource-code',null,host),bar=make('p','resource-code-file',c.filename,editor,true);
      editor.dataset.codeDensity=c.lines.length<=6?'reading':'dense';
      const lines=make('div','resource-code-lines',null,editor);
      const highlight=make('div','resource-code-highlight',null,lines);
      const rows=c.lines.map((value,i)=>{
        const row=make('div','resource-code-row',null,lines);
        make('span','resource-code-number',String(i+1).padStart(2,'0'),row);
        const code=make('code','resource-code-text',value||' ',row,true);code.dataset.codeLine=String(i);return row;
      });
      return t=>{
        reveal(editor,ease(progress(t,onsets[0])),24);
        const {index,p}=cursor(t,onsets),next=c.highlights[index],previous=index?c.highlights[index-1]:next,q=smooth(p);
        const h=rows[0].offsetHeight,y=previous+(next-previous)*q;
        highlight.style.top=(y*h)+'px';highlight.style.height=h+'px';highlight.style.width=(index?100:q*100)+'%';
        rows.forEach((row,i)=>{const a=i===previous?1:.65,b=i===next?1:.65;row.style.opacity=String(a+(b-a)*q);});
        editor.dataset.activeLine=String(next);editor.dataset.highlightProgress=String(p);editor.dataset.highlightY=String(y*h);
      };
    }
    if(spec.kind==='carousel') {
      const view=make('div','resource-carousel',null,host),rail=make('div','resource-carousel-rail',null,view);
      const caption=make('p','resource-carousel-caption','',host,true);
      const cards=c.screens.map(screen=>{
        const card=make('div','resource-carousel-card',null,rail),image=make('img','',null,card);image.src=data.assets[screen.image];image.alt=screen.label;return card;
      });
      return t=>{
        const {index,p}=cursor(t,onsets),position=index?index-1+carouselTravel(p):0;
        reveal(view,ease(progress(t,onsets[0])),28);
        // Preserve fractional layout widths; integer rounding drifts across five cards.
        const width=parseFloat(getComputedStyle(cards[0]).width),gap=32;
        rail.style.left=(view.clientWidth/2-width/2-position*(width+gap))+'px';
        cards.forEach((card,i)=>{
          const distance=Math.min(1,Math.abs(i-position));card.style.transform=`scale(${1-.06*distance})`;
          card.style.opacity=String(1-.38*distance);card.style.borderColor=i===index?'var(--lime)':'var(--line)';
        });
        caption.textContent=c.screens[index].label;
        view.dataset.activeScreen=String(index);view.dataset.carouselPosition=String(position);
      };
    }
    if(spec.kind==='diagram') {
      const view=make('div','resource-diagram',null,host),vertical=data.profile.id!=='landscape';
      view.dataset.vertical=String(vertical);
      const cards=c.steps.map((step,i)=>{
        const card=make('div','resource-diagram-card',null,view);
        make('p','resource-diagram-index',String(i+1).padStart(2,'0'),card,true);
        const image=make('img','',null,card);image.src=data.icons[step.icon];image.alt='';
        make('h3','',step.label,card,true);make('p','resource-diagram-body',step.body,card,true);return card;
      });
      if(c.style==='hand-drawn')return window.ShortCreatorHandLayouts.pipeline(view,cards,onsets);
      if(window.ShortCreatorPathMotion?.styles.includes(c.style))return window.ShortCreatorPathMotion.mount(view,cards,onsets,c.style,reveal);
      const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('resource-diagram-links');view.appendChild(svg);
      const paths=cards.slice(1).map((card,i)=>{
        const previous=cards[i],path=document.createElementNS(ns,'path');
        const x1=previous.offsetLeft+(vertical?previous.offsetWidth/2:previous.offsetWidth),y1=previous.offsetTop+(vertical?previous.offsetHeight:previous.offsetHeight/2);
        const x2=card.offsetLeft+(vertical?card.offsetWidth/2:0),y2=card.offsetTop+(vertical?0:card.offsetHeight/2);
        path.setAttribute('d',`M ${x1} ${y1} L ${x2} ${y2}`);path.setAttribute('stroke','var(--lime)');path.setAttribute('stroke-width','4');path.setAttribute('fill','none');
        svg.appendChild(path);const length=path.getTotalLength();path.setAttribute('stroke-dasharray',`${length} ${length}`);return {path,length};
      });
      return t=>{
        cards.forEach((card,i)=>{const p=ease(progress(t,onsets[i]));reveal(card,p,0);card.dataset.stepProgress=String(p);});
        paths.forEach(({path,length},i)=>{const p=smooth(progress(t,onsets[i+1]));path.setAttribute('stroke-dashoffset',String(length*(1-p)));path.dataset.traceProgress=String(p);});
      };
    }
    throw new Error('Unknown production resource');
  }
  window.ShortCreatorResources={scrambleTable,carouselTravel,irisRadius,metricColumns,metricPhase,burstSpecs,burstState,metric,title,iris,lowerThirdState,roundedRail,cornerHead,lowerThird,successState,mount};
})();
