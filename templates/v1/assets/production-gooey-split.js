/* HyperFrames gooey-split, adapted under Apache-2.0. Authored trajectories,
   SVG alpha threshold and a finite shutter; no GSAP polling or timeline mutation. */
(() => {
  'use strict';
  const clamp=p=>Math.max(0,Math.min(1,p)),rad=a=>a*Math.PI/180;
  const pieces=Object.freeze([
    {from:-90,menuR:190,spinIn:360,spinOut:360},
    {from:180,menuR:0,spinIn:330,spinOut:390},
    {from:90,menuR:190,spinIn:300,spinOut:420},
  ]);
  const curve=(p,a,b)=>window.ShortCreatorHeadlines.bezier(p,a,0,b,1);
  const swift=p=>curve(p,.25,.2),settle=p=>curve(p,.43,.39),split=p=>curve(p,.4,.2);
  const cubic=p=>p<.5?4*p**3:1-(-2*p+2)**3/2;
  const span=(t,a,b,e=p=>p)=>e(clamp((t-a)/(b-a)));
  function spread(t) {
    if(t<2.69)return span(t,.33,.73,split);
    if(t<3.43)return 1-span(t,2.69,3.03,settle);
    if(t<4.2)return span(t,3.43,3.83,split);
    return 1-span(t,4.2,4.54,settle);
  }
  function piece(index,time) {
    if(!Number.isInteger(index)||index<0||index>2||!Number.isFinite(time))throw new Error('Invalid gooey piece');
    const t=Math.max(0,Math.min(4.7,time)),p=pieces[index],enter=span(t,1.03,1.6,swift),exit=span(t,2.075,2.67,swift);
    const angle=p.from+p.spinIn*enter+p.spinOut*exit,radius=p.menuR*spread(t)+(197-p.menuR)*(enter-exit);
    const swell=[[1.12,1.29,1.47],[2.1,2.24,2.45]].reduce((s,[a,b,c])=>s+span(t,a,b,cubic)-span(t,b,c,cubic),0);
    return {x:radius*Math.cos(rad(angle)),y:radius*Math.sin(rad(angle)),rotation:angle,turn:angle-(p.from+p.spinIn),
      sx:1+.15*swell,sy:1+.7*swell,radius};
  }
  function bladeScale(t){return span(t,1.24,1.52,p=>1-(1-p)**4)-span(t,2.1,2.4);}
  function centreScale(t){return span(t,1.3,1.5,p=>1-(1-p)**2)-span(t,2.115,2.28,p=>Math.sqrt(1-(p-1)**2));}
  function bladePath(index) {
    if(!Number.isInteger(index)||index<0||index>2)throw new Error('Invalid gooey blade');
    const mid=pieces[index].from+pieces[index].spinIn;
    const edge=(side,r)=>{
      const theta=rad(mid+side*60-18*(r-197)/(298-118))-side*(44/2+10)/r;
      return (r*Math.cos(theta)).toFixed(2)+','+(r*Math.sin(theta)).toFixed(2);
    };
    const lo=[],hi=[];for(let k=0;k<=16;k++){const r=128+160*k/16;lo.push(edge(-1,r));hi.unshift(edge(1,r));}
    return ['M'+lo.join(' L'),'A288,288 0 0 1 '+hi[0],'L'+hi.join(' L'),'A128,128 0 0 0 '+lo[0],'Z'].join(' ');
  }
  function matrix(part,time) {
    if(!Number.isInteger(part)||part<0||part>6||!Number.isFinite(time))throw new Error('Invalid gooey shutter target');
    const t=Math.max(0,Math.min(4.7,time));
    if(part===6){const s=centreScale(t);return [s,0,0,s,0,0];}
    const i=part%3,p=piece(i,t),blade=part>=3,angle=rad(blade?p.turn:p.rotation);
    const sx=blade?bladeScale(t):p.sx,sy=blade?sx:p.sy,c=Math.cos(angle),s=Math.sin(angle),m=[c*sx,s*sx,-s*sy,c*sy,p.x,p.y];
    if(blade){const rest=rad(pieces[i].from+pieces[i].spinIn),x=197*Math.cos(rest),y=197*Math.sin(rest);m[4]-=m[0]*x+m[2]*y;m[5]-=m[1]*x+m[3]*y;}
    return m;
  }
  function sourceAt(frame,onsets) {
    const start=Math.ceil(onsets[0]*30),stop=Math.ceil(onsets[1]*30),elapsed=Math.max(0,frame-start),gap=stop-start,q=clamp((elapsed-gap)/24);
    return q===1?4.7:4.7*(Math.min(elapsed,gap)+24*(q-q**3+.5*q**4))/(gap+12);
  }
  function state(time,onsets,unit=1) {
    const base=window.ShortCreatorGpuBackdrops.clock(time,onsets),frame=Math.floor(time*30+1e-7);
    if(Math.ceil(onsets[1]*30)-Math.ceil(onsets[0]*30)<150||!Number.isFinite(unit)||unit<=0)throw new Error('Gooey motion requires five seconds and a positive viewport scale');
    const t=sourceAt(frame,onsets),samples=Array.from({length:17},(_,i)=>sourceAt(frame-.5+i/16,onsets));
    const parts=Array.from({length:7},(_,part)=>{
      const current=matrix(part,t),copies=samples.map(sample=>matrix(part,sample));
      const moving=copies.some(m=>m.some((value,i)=>Math.abs(value-current[i])*(i>=4?unit:1)>(i>=4?.5:.001)));
      return {current,copies,moving};
    });
    const quad=p=>p<.5?2*p*p:1-(-2*p+2)**2/2;
    let tile=0,tileScale=1;
    for(const [a,b] of [[.32,2.08],[3.42,4.2]])if(t>=a){const p=span(t,a,a+.15,quad);tile=p*(1-span(t,b,b+.15,quad));tileScale=.975+.025*p;}
    const press=span(t,.93,.98,p=>1-(1-p)**2)-span(t,1.03,1.1,p=>1-(1-p)**2);
    return {...base,sourceTime:t,samples,parts,goo:t<.95||t>=2.67,tile,tileScale,tileAlpha:.07+.03*press};
  }
  function svg(tag,attributes,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));parent.appendChild(node);return node;
  }
  function mount(host,content,onsets,make,reveal) {
    const copy=make('div','screen-copy',null,host),heading=make('h2','prod-heading',content.heading,copy,true),caption=make('p','screen-caption',content.caption,copy,true);
    const view=make('div','screen-device backdrop-art',null,host);view.dataset.backdrop='gooey-split';
    const css=getComputedStyle(host),ink=css.getPropertyValue('--lime').trim(),background=css.getPropertyValue('--purple').trim();
    if(![ink,background].every(color=>/^#[\da-f]{6}$/i.test(color)))throw new Error('Gooey requires approved colors');
    view.style.background=background;
    const scale=Math.min(view.clientWidth,view.clientHeight)/840,uid='gooey-'+host.closest('.scene').dataset.productionIndex;
    const root=svg('svg',{viewBox:`${-view.clientWidth/(2*scale)} ${-view.clientHeight/(2*scale)} ${view.clientWidth/scale} ${view.clientHeight/scale}`,
      width:view.clientWidth,height:view.clientHeight,'aria-hidden':'true',class:'gooey-art'},view);
    Object.assign(root.style,{width:'100%',height:'100%',display:'block',overflow:'hidden'});
    const defs=svg('defs',{},root),filter=svg('filter',{id:uid,'color-interpolation-filters':'sRGB',filterUnits:'userSpaceOnUse',x:-420,y:-420,width:840,height:840},defs);
    svg('feGaussianBlur',{stdDeviation:28},filter);
    const [r,g,b]=[1,3,5].map(i=>parseInt(ink.slice(i,i+2),16)/255);
    svg('feColorMatrix',{values:`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 24 -8.9`},filter);
    const tile=svg('rect',{x:-379,y:-379,width:758,height:758,rx:80,fill:ink},root);
    const dotGroup=svg('g',{},root);
    const parts=Array.from({length:7},(_,part)=>{
      const group=svg('g',{},part<3?dotGroup:root);group.style.isolation='isolate';
      const draw=parent=>part<3?svg('circle',{cx:0,cy:0,r:54,fill:ink},parent):part===6?svg('circle',{cx:0,cy:0,r:70,fill:ink},parent):
        svg('path',{d:bladePath(part-3),fill:ink,stroke:ink,'stroke-width':20,'stroke-linejoin':'round'},parent);
      const original=draw(group),copies=Array.from({length:17},()=>{const node=draw(group);node.style.mixBlendMode='plus-lighter';node.setAttribute('opacity',1/16);return node;});
      group.dataset.gooeyPart=String(part);return {group,original,copies};
    });
    return time=>{
      const s=state(time,onsets,scale),entry=1-(1-s.entry)**3;
      reveal(heading,entry,32);reveal(caption,entry,24);root.style.opacity=String(entry);
      dotGroup.setAttribute('filter',s.goo?`url(#${uid})`:'none');
      tile.setAttribute('opacity',s.tile*s.tileAlpha);tile.setAttribute('transform',`scale(${s.tileScale})`);
      parts.forEach((part,i)=>{
        part.original.setAttribute('transform',`matrix(${s.parts[i].current.join(' ')})`);part.original.style.display=s.parts[i].moving?'none':'';
        part.copies.forEach((node,j)=>{node.setAttribute('transform',`matrix(${s.parts[i].copies[j].join(' ')})`);node.style.display=s.parts[i].moving?'':'none';});
      });
      view.dataset.backdropProgress=String(s.entry);view.dataset.gooeyState=JSON.stringify({...s,unit:scale,ink,background});
    };
  }
  window.ShortCreatorGooeySplit={pieces,piece,spread,bladeScale,centreScale,bladePath,matrix,sourceAt,state,mount};
})();
