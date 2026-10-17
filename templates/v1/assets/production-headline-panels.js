/* HyperFrames type-match-cut and match-cut, Apache-2.0: whole-word split,
   two exit arcs and a geometric circle carrier.
   A supplied next headline replaces the source's example editor panel. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,p)=>a+(b-a)*p;
  function state(progress) {
    if(!Number.isFinite(progress))throw new Error('Invalid split-panel progress');
    const p=clamp(progress),t=p*2.2,split=1-(1-clamp((t-.14)/.58))**4;
    const panel=1-(1-clamp((t-.58)/.47))**4,exit=clamp((t-1.05)/1.15),grow=1-(1-exit)**5;
    const first=exit<=.42,q=(first?exit/.42:(exit-.42)/.58)**3;
    const x=exit===0?0:first?.03*q:mix(.03,-.05,q);
    const y=exit===0?-.2*split:first?mix(-.2,-.42,q):mix(-.42,-1.25,q);
    return {p,exit,x,y,sx:mix(.02+.44*panel,1,grow),sy:mix(.02+.12*panel,1,grow),
      radius:mix(12-6*panel,0,grow),ink:1-(1-clamp((exit-.3)/.7))**3,oldVisible:p<1};
  }
  function splitText(text) {
    const words=[...text.matchAll(/\S+/gu)],at=words[Math.ceil(words.length/2)]?.index??text.length;
    return [text.slice(0,at),text.slice(at)];
  }
  function circleState(progress) {
    if(!Number.isFinite(progress))throw new Error('Invalid circle-match progress');
    const p=clamp(progress),t=p*2.35,after=t>=1.4;
    const scale=after?1+.26*(1-(1-clamp((t-1.4)/.65))**5):t<.45?.54+.1*(1-(1-t/.45)**4):.64+.36*clamp((t-.45)/.95)**5;
    // Continue the incoming Z vector instead of reversing the source's scale sign.
    const copy=after?1-(1-clamp((t-1.5)/.55))**4:0;
    return {p,after,scale,copy,y:.024*(1-copy)};
  }
  const make=(tag,css,parent,text)=>{const node=document.createElement(tag);node.className=css;if(text!==undefined)node.textContent=text;parent.appendChild(node);return node;};
  function mountCircle(host,c,onsets) {
    const slot=make('div','headline-window headline-circle-match',host),mask=make('div','headline-mask',slot);
    slot.dataset.headlineSwap='circle-match';
    const circle=make('i','headline-circle-carrier',mask);circle.setAttribute('aria-hidden','true');
    circle.style.width=circle.style.height=Math.min(slot.clientWidth,slot.clientHeight)*.72+'px';
    const layers=c.phrases.map(text=>{
      const layer=make('div','headline-layer',mask),ink=make('span','headline-ink',layer,text);
      ink.dataset.fit='true';layer.setAttribute('aria-label',text);
      if(ink.offsetHeight+24>slot.clientHeight||ink.scrollWidth>slot.clientWidth)throw new Error('Circle-match headline exceeds approved type geometry');
      return layer;
    });
    for(const css of ['headline-caret','headline-cover'])make('i',css,mask).style.opacity='0';
    return time=>{
      const frame=Math.floor(time*30+1e-7);let active=-1;
      onsets.forEach((at,i)=>{if(frame>=Math.ceil(at*30))active=i;});
      const p=active<0?0:window.ShortCreatorStory.progress(time,onsets[active]);
      const s=active<1?{p,after:false,scale:.54,copy:0,y:0}:circleState(p);
      slot.dataset.headlineIndex=String(active);slot.dataset.headlineProgress=String(p);slot.dataset.circleState=JSON.stringify(s);
      circle.style.visibility=active<0?'hidden':'visible';circle.style.opacity=active===0?String(1-(1-p)**3):'1';
      circle.style.transform=`translate(-50%,-50%) scale(${s.scale})`;
      const shown=active<0?-1:active===0||!s.after?0:1,alpha=active===0?1-(1-p)**3:!s.after?1:s.copy;
      layers.forEach((layer,i)=>{
        const visible=i===shown&&alpha>0;layer.style.visibility=visible?'visible':'hidden';layer.style.opacity=String(visible?alpha:0);
        layer.style.transform=i===1?`translateY(${s.y*slot.clientHeight}px)`:'none';layer.style.filter='none';layer.setAttribute('aria-hidden',String(!visible));
      });
    };
  }
  function mount(host,c,onsets) {
    const slot=make('div','headline-window headline-split-panel',host),mask=make('div','headline-mask',slot);
    slot.dataset.headlineSwap='split-panel';
    const layers=c.phrases.map(text=>{
      const layer=make('div','headline-layer',mask),ink=make('span','headline-ink',layer);
      const halves=splitText(text).map(part=>make('span','headline-half',ink,part));
      ink.dataset.fit='true';layer.setAttribute('aria-label',text);
      if(ink.offsetWidth+32>slot.clientWidth||ink.offsetHeight+24>slot.clientHeight)
        throw new Error('Split-panel headline must fit one line at the approved type size; shorten the phrase');
      return {layer,ink,halves};
    });
    for(const css of ['headline-caret','headline-cover'])make('i',css,mask).style.opacity='0';
    return time=>{
      const frame=Math.floor(time*30+1e-7);let active=-1;
      onsets.forEach((at,i)=>{if(frame>=Math.ceil(at*30))active=i;});
      const p=active<0?0:window.ShortCreatorStory.progress(time,onsets[active]),s=state(p);
      slot.dataset.headlineIndex=String(active);slot.dataset.headlineProgress=String(p);slot.dataset.panelState=JSON.stringify(s);
      mask.style.background=active>1?(active%2?'var(--purple)':'var(--surface)'):'var(--purple)';
      layers.forEach(({layer,ink,halves})=>{
        Object.assign(layer.style,{visibility:'hidden',opacity:'0',transform:'none',filter:'none',background:'transparent',borderRadius:'0',zIndex:'0'});
        layer.setAttribute('aria-hidden','true');ink.style.opacity='1';halves.forEach(part=>part.style.transform='none');
      });
      if(active<0)return;
      const current=layers[active],previous=layers[active-1];
      current.layer.style.visibility=p>0?'visible':'hidden';current.layer.style.opacity=active===0?String(1-(1-p)**3):'1';
      current.layer.setAttribute('aria-hidden',String(p===0));
      if(active===0)return;
      Object.assign(current.layer.style,{transform:p===1?'none':`scale(${s.sx},${s.sy})`,
        borderRadius:s.radius*Math.min(slot.clientWidth,slot.clientHeight)/100+'px',background:active%2?'var(--surface)':'var(--purple)'});
      current.ink.style.opacity=String(s.ink);
      if(s.oldVisible) {
        Object.assign(previous.layer.style,{visibility:'visible',opacity:'1',zIndex:'2'});previous.layer.setAttribute('aria-hidden','false');
        previous.halves.forEach((part,i)=>{const sign=i===0?1:-1;part.style.transform=`translate(${sign*s.x*slot.clientWidth}px,${sign*s.y*slot.clientHeight}px)`;});
      }
    };
  }
  window.ShortCreatorHeadlinePanels={state,splitText,mount,circleState,mountCircle};
})();
