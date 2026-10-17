/* HyperFrames spain-map / us-map adaptations, Apache-2.0.
   Fixed offline geography; supplied values, approved palette and native cue clock. */
(()=>{
  'use strict';
  const clamp=p=>Math.max(0,Math.min(1,p)),out=p=>1-(1-clamp(p))**3;
  const smooth=p=>{p=clamp(p);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  const span=(t,start,duration)=>clamp((t-start)/duration);
  const config=Object.freeze({
    spain:{regionEach:.08,labelEach:.05,labelStart:4,legend:5.5,source:6,stroke:.8,brightness:.5,
      credit:['Derived IGN administrative boundaries / es-atlas 0.6.0 / edition unspecified',
        'CC BY 4.0 / ign.es / creativecommons.org/licenses/by/4.0']},
    us:{regionEach:.06,labelEach:.04,labelStart:3.5,legend:5,source:5.5,stroke:1.2,brightness:.6,
      credit:['Geometry: 2017 U.S. Census boundaries / adapted via us-atlas 3.0.1',
        'Albers USA projection / Alaska and Hawaii insets']},
  });
  function settings(style){if(!Object.hasOwn(config,style))throw new Error('Unknown regional map');return config[style];}
  function delay(index,count,each) {
    if(!Number.isInteger(index)||!Number.isInteger(count)||count<1||index<0||index>=count||!Number.isFinite(each)||each<0)throw new Error('Invalid regional stagger');
    const nearest=count%2?0:.5,furthest=(count-1)/2;
    return (Math.abs(index-(count-1)/2)-nearest)/(furthest-nearest||1)*each*(count-1);
  }
  function revealAt(style,seconds,index,count,labels=false) {
    if(!Number.isFinite(seconds))throw new Error('Finite regional time required');
    const c=settings(style),p=span(seconds,(labels?c.labelStart:1)+delay(index,count,labels?c.labelEach:c.regionEach),labels?.3:.4);
    // CSS opacity clamps the source back.out(1.4) overshoot to one.
    return labels?out(p):clamp(1+2.4*(p-1)**3+1.4*(p-1)**2);
  }
  function pulse(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Finite highlight time required');
    return seconds<0?0:seconds<.5?out(seconds/.5):1-clamp((seconds-.5)/.5)**3;
  }
  function color(style,value,maximum,background,accent) {
    settings(style);
    if(!Number.isFinite(value)||!Number.isFinite(maximum)||maximum<=0||value<0||value>maximum)throw new Error('Regional value outside its explicit scale');
    if(!/^#[0-9a-f]{6}$/i.test(background)||!/^#[0-9a-f]{6}$/i.test(accent))throw new Error('Approved hex palette required');
    const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),a=rgb(background),b=rgb(accent);
    const positions=style==='spain'?[0,.5,1]:[0,.33,.66,1],mixes=style==='spain'?[.2,.6,1]:[.2,.45,.7,1];
    const stops=mixes.map(t=>a.map((v,i)=>Math.round(v+(b[i]-v)*t))),t=value/maximum;
    const index=Math.max(0,Math.min(positions.length-2,positions.findIndex(p=>p>=t)-1)),p=(t-positions[index])/(positions[index+1]-positions[index]);
    return `rgb(${stops[index].map((v,i)=>Math.round(v+(stops[index+1][i]-v)*p)).join(',')})`;
  }
  function labelLayout(regions,width,height) {
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<200||height<150)throw new Error('Regional labels need a measurable map surface');
    const scale=Math.min((width-16)/1400,(height-16)/820),left=(width-1400*scale)/2,top=(height-820*scale)/2;
    const placed=[];
    for(const r of [...regions].sort((a,b)=>a.code<b.code?-1:a.code>b.code?1:0)) {
      const anchor={x:left+r.centroid[0]*scale,y:top+r.centroid[1]*scale},w=12*r.code.length+8,h=24;
      let chosen;
      for(let i=0;i<3000&&!chosen;i++) {
        const radius=4*Math.sqrt(i),angle=i*2.399963229728653;
        const x=Math.max(w/2+2,Math.min(width-w/2-2,anchor.x+radius*Math.cos(angle)));
        const y=Math.max(h/2+2,Math.min(height-h/2-2,anchor.y+radius*Math.sin(angle)));
        if(placed.every(p=>Math.abs(x-p.x)>=(w+p.w)/2+3||Math.abs(y-p.y)>=(h+p.h)/2+3))chosen={code:r.code,x,y,w,h,anchor};
      }
      if(!chosen)throw new Error('Regional abbreviation labels do not fit');
      placed.push(chosen);
    }
    return {scale,left,top,labels:placed};
  }
  const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
  function shape(tag,attrs,parent){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);set(n,attrs);parent.appendChild(n);return n;}
  function mount(host,c,onsets,make,reveal) {
    host.classList.add('regional-map-content');
    const cfg=settings(c.style),geometry=window.ShortCreatorRegionalGeometry[c.style];
    const title=make('h2','prod-heading',c.heading,host,true),insight=make('p','data-insight',c.insight,host,true);
    const source=make('p','data-source',`${c.source.kind.toUpperCase()} / ${c.source.label} / ${c.source.as_of}`,host,true);
    const reference=make('p','data-reference',c.source.reference,host,true);
    const board=make('div','map-board regional-board',null,host);board.dataset.mapStyle=c.style;
    const picture=make('div','map-picture',null,board),callout=make('div','map-callout',null,board);
    const label=make('span','map-label','',callout,true),value=make('span','map-value','',callout,true);
    const scale=make('p','map-scale',`0 / ${c.maximum} ${c.unit} / blank = no data`,board,true);
    const gradient=make('span','world-legend-gradient',null,scale),credit=make('div','regional-credit',null,board);
    cfg.credit.forEach(text=>make('p','regional-credit-line',text,credit,true));
    const style=getComputedStyle(host),background=style.getPropertyValue('--purple').trim(),accent=style.getPropertyValue('--lime').trim();
    gradient.style.background=`linear-gradient(90deg,${[0,.33,.5,.66,1].map(p=>`${color(c.style,p*c.maximum,c.maximum,background,accent)} ${p*100}%`).join(',')})`;
    const W=picture.clientWidth,H=picture.clientHeight,layout=labelLayout(geometry.regions,W,H);
    const svg=shape('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'map-overlay','aria-hidden':'true'},picture);
    const geography=shape('g',{transform:`translate(${layout.left} ${layout.top}) scale(${layout.scale})`},svg);
    const values=new Map(c.values.map(v=>[v.region,v.value]));
    const ordered=[...geometry.regions].sort((a,b)=>(values.get(a.code)??Infinity)-(values.get(b.code)??Infinity)||geometry.regions.indexOf(a)-geometry.regions.indexOf(b));
    const regions=ordered.map(r=>{
      const present=values.has(r.code),amount=present?values.get(r.code):null;
      const node=shape('path',{d:r.d,fill:present?color(c.style,amount,c.maximum,background,accent):background,
        stroke:background,'stroke-width':cfg.stroke,'fill-rule':'evenodd','data-map-region':r.code,
        'data-map-value':present?amount:'missing','data-regional-path':'true'},geography);
      return {...r,node};
    });
    const leaders=shape('g',{'data-regional-leaders':'true'},svg);
    const labels=regions.map(r=>{
      const pos=layout.labels.find(p=>p.code===r.code);
      const line=shape('line',{x1:pos.anchor.x,y1:pos.anchor.y,x2:pos.x,y2:pos.y,stroke:'var(--cyan)','stroke-width':.8},leaders);
      const n=make('span','regional-label',r.code,picture,true);n.dataset.regionalLabel=r.code;
      Object.assign(n.style,{left:`${pos.x-pos.w/2}px`,top:`${pos.y-pos.h/2}px`,width:`${pos.w}px`,height:`${pos.h}px`});
      return {node:n,line,pos};
    });
    return time=>{
      const frame=Math.floor(time*30+1e-7),elapsed=(frame-Math.ceil(onsets[0]*30))/30;
      const active=onsets.reduce((last,onset,i)=>frame>=Math.ceil(onset*30)?i:last,-1),focus=active>0?c.focus[active-1]:null;
      const age=active>0?(frame-Math.ceil(onsets[active]*30))/30:-1,highlight=pulse(age);
      const p=active<0?0:window.ShortCreatorStory.progress(time,onsets[active]);
      board.dataset.mapBeat=String(active);board.dataset.mapProgress=String(p);
      title.style.clipPath=`inset(0 ${100*(1-smooth(elapsed))}% 0 0)`;insight.style.opacity=String(out(span(elapsed,.4,.6)));
      scale.style.opacity=String(out(span(elapsed,cfg.legend,.6)));
      source.style.opacity=reference.style.opacity=String(out(span(elapsed,cfg.source,.5)));
      // Geographic attribution is visible whenever the geometry is visible.
      credit.style.opacity=elapsed>=1?'1':'0';
      regions.forEach((r,index)=>{
        const strength=r.code===focus?highlight:0,alpha=revealAt(c.style,elapsed,index,regions.length);
        set(r.node,{opacity:alpha,stroke:strength>0?'white':background,'stroke-width':cfg.stroke+(2.5-cfg.stroke)*strength});
        r.node.style.filter=`brightness(${1+cfg.brightness*strength}) drop-shadow(0px 0px ${8*strength}px rgba(255,255,255,${.4*strength}))`;
        const item=labels[index],a=revealAt(c.style,elapsed,index,regions.length,true);
        item.node.style.opacity=String(a);set(item.line,{opacity:a*.7});
      });
      label.textContent=focus?`${focus} / ${regions.find(r=>r.code===focus).name}`:'';
      value.textContent=focus?String(values.get(focus))+' '+c.unit:'';
      reveal(callout,active>0?out(p):0,12);
      board.dataset.regionalState=JSON.stringify({elapsed,active,focus,age,highlight,background,accent});
    };
  }
  window.ShortCreatorRegionalMap={config,delay,revealAt,pulse,color,labelLayout,mount};
})();
