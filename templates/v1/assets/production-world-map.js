/* HyperFrames world-map timing and color-scale mechanics, Apache-2.0.
   Natural Earth geometry is projected offline; the episode supplies all values. */
(()=>{
  'use strict';
  const clamp=p=>Math.max(0,Math.min(1,p)),out=(p,n=3)=>1-(1-clamp(p))**n;
  const smooth=(p,n=3)=>p<.5?2**(n-1)*p**n:1-(-2*p+2)**n/2;
  const span=(t,start,duration)=>clamp((t-start)/duration);
  function delay(index,count) {
    if(!Number.isInteger(index)||!Number.isInteger(count)||count<1||index<0||index>=count)throw new Error('Invalid world reveal index');
    if(count===1)return 0;
    const nearest=count%2?0:.5,furthest=(count-1)/2;
    return (Math.abs(index-(count-1)/2)-nearest)/(furthest-nearest||1)*.02*(count-1);
  }
  function revealAt(seconds,index,count) {return out(span(seconds,1+delay(index,count),.3),2);}
  function pulse(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Finite world focus time required');
    if(seconds<0)return 0;
    return seconds<.4?out(seconds/.4):1-smooth(clamp((seconds-.4)/.6));
  }
  function color(value,maximum,background,accent) {
    if(!Number.isFinite(value)||!Number.isFinite(maximum)||maximum<=0||value<0||value>maximum)throw new Error('World value outside its explicit scale');
    if(!/^#[0-9a-f]{6}$/i.test(background)||!/^#[0-9a-f]{6}$/i.test(accent))throw new Error('Approved hex palette required');
    const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),a=rgb(background),b=rgb(accent);
    const stops=[.2,.45,.7,1].map(t=>a.map((v,i)=>Math.round(v+(b[i]-v)*t)));
    const scaled=3*value/maximum,index=Math.min(2,Math.floor(scaled)),local=scaled-index;
    return `rgb(${stops[index].map((v,i)=>Math.round(v+(stops[index+1][i]-v)*local)).join(',')})`;
  }
  const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
  function shape(tag,attrs,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);set(node,attrs);parent.appendChild(node);return node;
  }
  function mount(host,c,onsets,make,reveal) {
    const geometry=window.ShortCreatorWorldGeometry;
    const title=make('h2','prod-heading',c.heading,host,true),insight=make('p','data-insight',c.insight,host,true);
    const source=make('p','data-source',`${c.source.kind.toUpperCase()} / ${c.source.label} / ${c.source.as_of}`,host,true);
    const reference=make('p','data-reference',c.source.reference,host,true);
    const board=make('div','map-board',null,host);board.dataset.mapStyle='world';
    const picture=make('div','map-picture',null,board),callout=make('div','map-callout',null,board);
    const label=make('span','map-label','',callout,true),value=make('span','map-value','',callout,true);
    const scale=make('p','map-scale',`0 / ${c.maximum} ${c.unit} / blank = no data`,board,true);
    const gradient=make('span','world-legend-gradient',null,scale);
    const style=getComputedStyle(host),background=style.getPropertyValue('--purple').trim(),accent=style.getPropertyValue('--lime').trim();
    gradient.style.background=`linear-gradient(90deg,${[0,1/3,2/3,1].map(p=>color(p*c.maximum,c.maximum,background,accent)).join(',')})`;
    const svg=shape('svg',{viewBox:`0 0 ${geometry.width} ${geometry.height}`,width:picture.clientWidth,height:picture.clientHeight,
      class:'map-overlay','aria-hidden':'true',preserveAspectRatio:'xMidYMid meet'},picture);
    shape('path',{d:geometry.graticule,fill:'none',stroke:'var(--cyan)','stroke-width':.3,'stroke-opacity':.4,'data-world-graticule':'true'},svg);
    const values=new Map(c.values.map(v=>[v.region,v.value]));
    const regions=geometry.regions.map(region=>{
      const present=values.has(region.name),amount=present?values.get(region.name):null;
      const fill=present?color(amount,c.maximum,background,accent):background;
      const node=shape('path',{d:region.d,fill,stroke:'var(--purple)','stroke-width':.6,'fill-rule':'evenodd',
        'data-map-region':region.name,'data-map-value':present?amount:'missing','data-world-region':'true'},svg);
      return {node,name:region.name};
    });
    return time=>{
      const frame=Math.floor(time*30+1e-7),elapsed=(frame-Math.ceil(onsets[0]*30))/30;
      const active=onsets.reduce((last,onset,i)=>frame>=Math.ceil(onset*30)?i:last,-1);
      const focus=active>0?c.focus[active-1]:null,age=active>0?(frame-Math.ceil(onsets[active]*30))/30:-1;
      const highlight=pulse(age),p=active<0?0:window.ShortCreatorStory.progress(time,onsets[active]);
      board.dataset.mapBeat=String(active);board.dataset.mapProgress=String(p);
      const titleProgress=smooth(span(elapsed,0,1),4);
      title.style.clipPath=`inset(0 ${100*(1-titleProgress)}% 0 0)`;
      insight.style.opacity=String(out(span(elapsed,.4,.6)));
      scale.style.opacity=String(out(span(elapsed,4,.6)));
      source.style.opacity=reference.style.opacity=String(out(span(elapsed,4.5,.5)));
      regions.forEach(({node,name},index)=>{
        const amount=revealAt(elapsed,index,regions.length),selected=name===focus,brightness=selected?highlight:0;
        set(node,{opacity:amount,stroke:brightness>0?'white':'var(--purple)','stroke-width':.6+1.2*brightness});
        node.style.filter=`brightness(${1+.5*brightness})`;
      });
      label.textContent=focus||'';value.textContent=focus?String(values.get(focus))+' '+c.unit:'';
      reveal(callout,active>0?out(p):0,12);
      board.dataset.worldState=JSON.stringify({elapsed,active,focus,age,highlight,background,accent,titleProgress});
    };
  }
  window.ShortCreatorWorldMap={delay,revealAt,pulse,color,mount};
})();
