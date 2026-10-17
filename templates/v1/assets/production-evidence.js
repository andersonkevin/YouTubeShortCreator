/* Bounded evidence layouts adapted from HyperFrames (Apache-2.0).
   Exact source paths/hashes and removed defaults are in production provenance. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>1-(1-clamp(x))**3;
  const smooth=x=>(1-Math.cos(Math.PI*clamp(x)))/2;
  const phase=(t,start)=>window.ShortCreatorStory.progress(t,start);
  function markState(style,p) {
    const q=clamp(p);
    if(style==='standard')return {opacity:ease(q),scale:1};
    if(style==='avatar-lift')return {opacity:ease(q),scale:1};
    if(style==='logo-wall') {
      const a=ease((q*.7-.15)/.55);return {opacity:a,scale:.94+.06*a};
    }
    if(style==='spring-pop') {
      const a=q-1,back=1+2.7*a**3+1.7*a**2;
      return {opacity:ease(q*2),scale:q===1?1:.9+.1*back};
    }
    throw new Error('Unknown trust presentation');
  }
  const svgNode=(tag,attrs,parent)=>{
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
    parent.appendChild(node);return node;
  };
  function initials(author) {
    return Array.from(author.trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('').toUpperCase()).slice(0,2).join('');
  }
  function starState(value,maximum,p) {
    const time=clamp(p);
    return {fraction:value/maximum*smooth(time),scales:Array.from({length:maximum},(_,i)=>{
      if(i>=Math.ceil(value))return 1;
      const q=clamp((time-.72*i/Math.max(1,value))/.22);
      return q===0||q===1?1:1+.06*Math.sin(Math.PI*q);
    })};
  }
  function badgeState(p) {
    const t=clamp(p);
    if(t<=.35)return {opacity:0,scale:0};
    if(t<.75){const x=(t-.35)/.4-1;return {opacity:ease((t-.35)/.15),scale:1+3.4*x**3+2.4*x**2};}
    const q=(t-.75)/.25;
    return {opacity:1,scale:q===1?1:1+.18*Math.sin(Math.PI*q)};
  }
  function starRow(parent,value,maximum,attrs={}) {
    const width=maximum*110,id='evidence-rating-'+parent.closest('[data-production-index]').dataset.productionIndex;
    const svg=svgNode('svg',{viewBox:`0 0 ${width} 110`,class:'evidence-stars','aria-label':`${value} out of ${maximum} stars`,
      'data-rating-maximum':maximum,'data-rating-value':value,...attrs},parent);
    const defs=svgNode('defs',{},svg),clip=svgNode('clipPath',{id,clipPathUnits:'userSpaceOnUse'},defs);
    const mask=svgNode('rect',{x:0,y:0,width:0,height:110,'data-rating-mask':'true'},clip);
    const base=svgNode('g',{fill:'var(--cyan)','fill-opacity':.35,'data-rating-base':'true'},svg);
    const fill=svgNode('g',{fill:'var(--lime)','clip-path':`url(#${id})`,'data-rating-fill':'true'},svg);
    const path='M50 0 61.8 36.2 100 36.2 69.1 58.6 80.9 95 50 72.4 19.1 95 30.9 58.6 0 36.2 38.2 36.2Z';
    const pairs=Array.from({length:maximum},()=>[svgNode('path',{d:path},base),svgNode('path',{d:path},fill)]);
    return p=>{
      const state=starState(value,maximum,p);mask.setAttribute('width',String(width*state.fraction));
      pairs.forEach((pair,i)=>pair.forEach(node=>node.setAttribute('transform',`translate(${i*110+55} 55) scale(${state.scales[i]}) translate(-50 -50)`)));
      svg.dataset.ratingProgress=String(p);
    };
  }
  function source(host,record,make) {
    make('p','chart-source',`${record.kind.toUpperCase()} / ${record.label} / ${record.as_of}`,host,true);
    make('p','chart-reference',record.reference,host,true);
  }
  function mount(host,spec,onsets,data,make,reveal) {
    const c=spec.content;
    make('h2','prod-heading',c.heading,host,true);source(host,c.source,make);
    if(spec.kind==='trust') {
      const strip=make('div','evidence-trust',null,host);
      const style=c.style||'standard';strip.dataset.trustStyle=style;
      if(style==='logo-wall')strip.classList.add('evidence-logo-wall');
      if(style==='avatar-lift')strip.classList.add('evidence-avatar-lift');
      strip.setAttribute('role','list');
      const marks=c.marks.map(text=>{const node=make('span','evidence-mark',text,strip,true);node.setAttribute('role','listitem');if(style==='avatar-lift')node.dataset.initials=initials(text);return node;});
      return t=>marks.forEach((node,i)=>{
        const p=phase(t,onsets[i]),s=markState(style,p);node.style.opacity=String(s.opacity);
        if(style!=='standard')node.style.transform=s.scale===1?'none':`scale(${s.scale})`;
        if(style==='avatar-lift')node.style.setProperty('--avatar-y',window.ShortCreatorUIPrimitives.avatarLift(p)+'px');
        node.dataset.markProgress=String(p);
      });
    }
    if(spec.kind==='testimonial') {
      const card=make('article','evidence-testimonial',null,host);
      const proof=make('div','evidence-testimony',null,card),rating=make('div','evidence-rating',null,proof);
      const stars=starRow(rating,c.rating,5),value=make('p','evidence-rating-value','',rating,true);
      make('blockquote','evidence-quote',c.quote,proof,true);
      const attribution=make('div','evidence-attribution',null,card);
      const avatar=make('span','evidence-initials',initials(c.author),attribution,true);
      const person=make('div','evidence-person',null,attribution);
      const author=make('p','evidence-author',c.author,person,true),role=make('p','evidence-role',c.role,person,true);
      return t=>{
        const p=phase(t,onsets[0]),q=phase(t,onsets[1]);reveal(proof,ease(p),28);stars(p);
        value.textContent=window.ShortCreatorStory.count(c.rating,p)+' / 5';
        [avatar,author,role].forEach((node,i)=>reveal(node,ease((q-.1*i)/.8),18));
        card.dataset.attributionProgress=String(q);
      };
    }
    if(spec.kind==='proof') {
      const card=make('div','evidence-proof',null,host),rating=make('div','evidence-rating',null,card);
      const stars=starRow(rating,c.rating,5),value=make('p','evidence-rating-value','',rating,true);
      const claim=make('p','evidence-claim',c.claim,card,true);
      const features=make('div','evidence-features',null,card);
      const tiles=c.features.map(feature=>{
        const tile=make('div','evidence-feature',null,features),symbol=make('div','evidence-symbol',null,tile);
        const icon=make('img','',null,symbol);icon.src=data.icons[feature.icon];icon.alt='';
        const badge=feature.badge?make('span','evidence-badge',feature.badge,symbol,true):null;
        make('p','evidence-feature-label',feature.label,tile,true);return {tile,badge};
      });
      const action=make('p','evidence-action',c.action,card,true);
      return t=>{
        const p=phase(t,onsets[0]),q=phase(t,onsets[1]),r=phase(t,onsets[2]);
        reveal(rating,ease(p),20);stars(p);value.textContent=window.ShortCreatorStory.count(c.rating,p)+' / 5';
        reveal(claim,ease(q),18);
        tiles.forEach(({tile,badge},i)=>{
          const progress=clamp((q-.1*i)/.8);reveal(tile,ease(progress),18);
          if(badge){const state=badgeState(progress);badge.style.opacity=String(state.opacity);badge.style.transform=`scale(${state.scale})`;}
        });
        reveal(action,ease(r),0);action.style.transform=`scale(${.85+.15*ease(r)})`;
        card.dataset.proofProgress=[p,q,r].join(',');
      };
    }
    throw new Error('Unknown evidence composition');
  }
  window.ShortCreatorEvidence={initials,starState,badgeState,starRow,markState,mount};
})();
