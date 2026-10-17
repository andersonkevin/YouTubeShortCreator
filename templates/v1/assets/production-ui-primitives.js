/* HyperFrames UI primitives, adapted under Apache-2.0. Fixed brand geometry,
   explicit supplied states and absolute caption time; no live form actions. */
(() => {
  'use strict';
  const variants=Object.freeze(['micro-badge','micro-dropdown','micro-modal','micro-tabs','micro-tooltip','micro-check','signup-flow','beat-sequence','profile-count']);
  const clamp=x=>Math.max(0,Math.min(1,x));
  const out=(x,power=3)=>1-(1-clamp(x))**power;
  const back=(x,amount)=>{const t=clamp(x)-1;return 1+(amount+1)*t**3+amount*t**2;};
  const inOut=x=>{const t=clamp(x);return t<.5?2*t*t:1-(-2*t+2)**2/2;};
  function state(variant,progress,last=false) {
    if(!variants.includes(variant))throw new Error('Unknown UI primitive');
    const p=clamp(progress),t=p*.9,q=out(t/.5,4);
    const s={alpha:q,x:0,y:0,scale:1,body:1,tab:out((t-.55)/.35,4),check:q};
    if(variant==='micro-badge'){s.x=-7*(1-q);s.y=10*(1-q);s.scale=.25+.75*q;}
    if(variant==='micro-dropdown'){s.y=-12*(1-q);s.scale=.95+.05*q;}
    if(variant==='micro-modal'){s.y=18*(1-q);s.scale=.96+.04*q;}
    if(variant==='micro-tabs')s.y=14*(1-q);
    if(variant==='micro-tooltip'){s.y=6*(1-q);s.scale=.96+.04*q;}
    if(variant==='signup-flow') {
      const time=p*1.19,a=out(time/.36),b=out((time-.23)/.24);
      const down=inOut((time-.95)/.12),up=inOut((time-1.07)/.12);
      Object.assign(s,{alpha:a,y:26*(1-a),body:b,bodyY:14*(1-b),scale:last?1-.03*(down-up):1});
    }
    if(variant==='beat-sequence') {
      const a=out(p*.8/.4);Object.assign(s,{alpha:a,y:10*(1-a),scale:.98+.02*a});
    }
    if(variant==='profile-count') {
      const time=p*.64,a=back(time/.46,1.6);
      Object.assign(s,{alpha:out(time/.28),y:0,statY:28*(1-a),statAlpha:clamp(a),avatars:[0,1,2].map(i=>out((time-.22-.05*i)/.28))});
    }
    return s;
  }
  const svgNode=(tag,attrs,parent)=>{
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
    parent.appendChild(node);return node;
  };
  function mount(host,c,onsets,make) {
    const variant=c.variant,stacked=['signup-flow','beat-sequence'].includes(variant);
    make('h2','prod-heading',c.heading,host,true);
    const board=make('div','interface-board interface-primitives interface-'+c.style,null,host);
    board.dataset.interfaceStyle=c.style;board.dataset.primitive=variant;
    make('p','interface-source',c.source,host,true);
    let indicator;
    if(variant==='micro-tabs') {
      const rail=make('div','primitive-tabs',null,board);
      rail.style.gridTemplateColumns=`repeat(${c.items.length},1fr)`;
      indicator=make('i','primitive-tab-indicator',null,rail);indicator.style.width=(100/c.items.length)+'%';
      c.items.forEach(item=>make('span','primitive-tab-label',item.label,rail,true));
    }
    const inset=24,top=variant==='micro-tabs'?94:24;
    const height=stacked?(board.clientHeight-48-14*(c.items.length-1))/c.items.length:board.clientHeight-top-24;
    const rows=c.items.map((item,index)=>{
      const row=make('div','interface-row primitive-row',null,board);
      row.style.left=inset+'px';row.style.width=`calc(100% - ${2*inset}px)`;
      row.style.top=(stacked?24+index*(height+14):top)+'px';row.style.height=height+'px';
      row.dataset.interfaceIndex=String(index);
      const label=make('h3','interface-label',item.label,row,true),body=make('p','interface-body',item.body,row,true);
      let badge,check,stat,avatars=[],action;
      if(variant==='micro-badge')badge=make('span','primitive-badge',item.badge,row,true);
      if(variant==='micro-check') {
        row.dataset.checked=String(item.checked);
        const svg=svgNode('svg',{viewBox:'0 0 48 48',class:'primitive-check','aria-hidden':'true'},row);
        svgNode('rect',{x:2,y:2,width:44,height:44,rx:10,fill:'none',stroke:'var(--line)','stroke-width':2},svg);
        check=svgNode('path',{d:'M12 24l8 8 16-18',pathLength:42,fill:'none',stroke:'var(--lime)','stroke-width':3,'stroke-dasharray':42},svg);
      }
      if(variant==='profile-count') {
        make('p','social-context',item.context,row,true);
        stat=make('div','primitive-stat',null,row);
        make('strong','primitive-stat-value',item.stat.value,stat,true);
        make('span','primitive-stat-label',item.stat.label,stat,true);
        const group=make('div','primitive-avatar-group',null,row);group.setAttribute('aria-hidden','true');
        avatars=[0,1,2].map(()=>make('i','primitive-avatar',null,group));
        action=make('span','social-action',item.action.before,row,true);
      }
      return {row,label,body,badge,check,stat,avatars,action,item};
    });
    return time=>{
      const active=window.ShortCreatorInterface.activeAt(time,onsets),states=[];
      rows.forEach(({row,body,badge,check,stat,avatars,action,item},i)=>{
        const p=window.ShortCreatorStory.progress(time,onsets[i]),s=state(variant,p,i===rows.length-1);
        row.dataset.interfaceProgress=String(p);row.style.visibility=(stacked?p>0:i===active&&p>0)?'visible':'hidden';
        row.style.opacity=String(s.alpha);row.style.transform=`translate(${s.x}px,${s.y}px) scale(${s.scale})`;
        if(badge){row.style.transform='none';badge.style.transform=`translate(${s.x}px,${s.y}px) scale(${s.scale})`;}
        body.style.opacity=String(s.body);body.style.transform=`translateY(${s.bodyY||0}px)`;
        if(check){check.setAttribute('stroke-dashoffset',String(42*(1-(item.checked?s.check:0))));check.style.opacity=item.checked&&p>0?'1':'0';}
        if(stat){stat.style.transform=`translateY(${s.statY}px)`;stat.style.opacity=String(s.statAlpha);avatars.forEach((n,j)=>{n.style.transform=`translateY(${18*(1-s.avatars[j])}px)`;n.style.opacity=String(s.avatars[j]);});action.textContent=p===1?item.action.after:item.action.before;}
        states.push(s);
      });
      if(indicator){const position=active<0?0:Math.max(0,active-1)+(active>0?states[active].tab:0);indicator.style.transform=`translateX(${100*position}%)`;}
      board.dataset.interfacePresentation=JSON.stringify({variant,active,rows:states});
    };
  }
  // Matched source point sets, not a font glyph or an inferred completion.
  const play=[[28,18],[36,23],[44,28],[52,33],[60,38],[68,43],[76,48],[80,50],[76,52],[68,57],[60,62],[52,67],[44,72],[36,77],[28,82],[28,50]];
  const tick=[[16,50],[20,46],[24,42],[34,52],[44,62],[52,54],[60,46],[68,38],[76,30],[80,34],[84,38],[74,48],[64,58],[54,68],[44,78],[34,68]];
  function statusState(style,progress,checked) {
    const p=clamp(progress);
    if(style==='icon-swap') {
      const time=p*.38,a=clamp(time/.18)**3,b=back((time-.12)/.26,1.7),opacity=clamp(b);
      return {neutralAlpha:1-a,neutralScale:1-.45*a,neutralBlur:8*a,neutralTurn:-18*a,
        alpha:checked?opacity:0,scale:1.35-.35*b,blur:Math.max(0,8*(1-b)),turn:18*(1-b),draw:checked&&time>.12?1:0,morph:0};
    }
    if(style==='icon-morph') {
      const time=p*1.2,q=out((time-.35)/.55,4),up=out((time-.9)/.12,4),down=out((time-1.02)/.18);
      return {neutralAlpha:0,neutralScale:1,neutralBlur:0,neutralTurn:0,alpha:checked&&p>0?1:0,
        scale:1+.08*(up-down),blur:0,turn:0,draw:checked&&p>0?1:0,morph:checked?q:0};
    }
    throw new Error('Unknown status primitive');
  }
  function morphPath(q) {
    return play.map((point,i)=>(i?'L':'M')+' '+point.map((v,j)=>v+(tick[i][j]-v)*clamp(q)).join(' ')).join(' ')+' Z';
  }
  const bounce=x=>{let t=clamp(x);const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d){t-=1.5/d;return n*t*t+.75;}if(t<2.5/d){t-=2.25/d;return n*t*t+.9375;}t-=2.625/d;return n*t*t+.984375;};
  function avatarLift(progress) {
    if(progress<=0||progress>=1)return 0;
    const time=clamp(progress)*.78;
    return time<=.36?-18*back(time/.28,1.8):-18*(1-bounce((time-.36)/.42));
  }
  window.ShortCreatorUIPrimitives={variants,state,statusState,morphPath,avatarLift,mount};
})();
