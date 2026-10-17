/* HyperFrames closing lockups and channel-card choreography, Apache-2.0.
   Exact supplied text, approved fonts/colors and the native cue clock are retained. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),out=x=>1-(1-clamp(x))**3;
  const expo=x=>{const p=clamp(x);return p===1?1:1-2**(-10*p);};
  const back=(x,a)=>{const p=clamp(x)-1;return 1+(a+1)*p**3+a*p**2;};
  const chars=text=>Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),x=>x.segment);
  function state(style,p,count,period=false) {
    p=clamp(p);
    if(style==='capsule') {
      const t=p*Math.max(1.32,.68+.1*Math.max(0,count-1)),q=clamp((t-.72)/.6),b=back(q,1.5);
      return {units:Array.from({length:count},(_,i)=>1-(1-clamp((t-.06-.1*i)/.62))**4),
        scale:1,action:out((t-.72)/.22),actionScale:.85+.15*b,actionY:.03*(1-b),label:out((t-.9)/.42)};
    }
    if(style==='brand-close') {
      const t=p*2.6,n=count-(period?1:0),q=clamp((t-.95)/.9);
      const action=1-(1-clamp((t-1.35)/.9))**4;
      return {units:Array.from({length:count},(_,i)=>period&&i===count-1?out(q):expo((t-.7*i/Math.max(1,n-1))/1.15)),
        scale:1+.04*(1-expo(t/2.4)),periodScale:.2+.8*back(q,1.8),
        action,actionScale:1,actionY:.9*(1-action),
        label:out((t-1.7)/.85),labelScale:1+.06*(1-out((t-1.7)/.85))};
    }
    if(style==='sting') {
      const t=p*.95,q=clamp((t-.55)/.4),ring=1-(1-q)**4;
      return {units:[],scale:1+.15*(1-expo(t/.55)),action:out((t-.55)/.4),actionScale:1,actionY:0,
        label:out((t-.55)/.4),ringScale:.34+2.06*ring,ringOpacity:t>=.55?.92*(1-ring):0,
        flash:Math.floor(p*24+1e-8)===14?1:0};
    }
    throw new Error('Unknown closing style');
  }
  function channelState(p) {
    const t=clamp(p)*.55,press=out(t/.15),q=clamp((t-.15)/.4);
    const elastic=q===0?0:q===1?1:2**(-10*q)*Math.sin((q-.1)*Math.PI*2/.4)+1;
    return {scale:t<.15?1-.08*press:.92+.08*elastic,before:1-clamp((t-.15)/.08),after:clamp((t-.18)/.08)};
  }
  function mount(host,c,onset,make) {
    const style=c.style;host.classList.add('production-closing');host.dataset.closingStyle=style;
    const title=make('h2','prod-title closing-title',null,host,true),action=make('p','cta-action',c.action,host,true),label=make('p','cta-label',c.label,host,true);
    const units=[];title.setAttribute('aria-label',c.heading);
    if(style==='sting')title.textContent=c.heading;
    else for(const part of c.heading.split(/(\s+)/)) {
      if(/^\s+$/.test(part)){title.appendChild(document.createTextNode(part));continue;}
      const word=make('span','closing-word',null,title);
      if(style==='capsule'){word.textContent=part;units.push(word);}
      else for(const char of chars(part))units.push(make('span','closing-letter',char,word));
    }
    const period=style==='brand-close'&&c.heading.endsWith('.');
    if(period)units.at(-1).classList.add('closing-period');
    // Reserve the entry travel inside the title box at the approved font size.
    title.style.paddingBottom=(style==='capsule'?host.clientHeight*.08:style==='brand-close'?parseFloat(getComputedStyle(title).fontSize)*.62:0)+'px';
    const ring=style==='sting'?make('i','closing-ring',null,host):null,flash=style==='sting'?make('i','closing-flash',null,host):null;
    if(ring){ring.setAttribute('aria-hidden','true');flash.setAttribute('aria-hidden','true');}
    return time=>{
      const p=window.ShortCreatorStory.progress(time,onset),s=state(style,p,units.length,period);
      const entered=Math.floor(time*30+1e-7)>=Math.ceil(onset*30),font=parseFloat(getComputedStyle(title).fontSize);
      title.style.opacity=entered?'1':'0';title.style.transform=p===1?'none':`scale(${s.scale})`;
      units.forEach((unit,i)=>{
        const a=s.units[i],last=period&&i===units.length-1;
        unit.style.opacity=String(a);unit.style.transform=p===1?'none':`translateY(${(style==='capsule'?host.clientHeight*.08:font*(last?.08:.62))*(1-a)}px) scale(${last?s.periodScale:1})`;
      });
      action.style.opacity=String(s.action);action.style.transform=p===1?'none':`translateY(${s.actionY*(style==='capsule'?host.clientHeight:parseFloat(getComputedStyle(action).fontSize))}px) scale(${s.actionScale})`;
      label.style.opacity=String(s.label);label.style.transform=p===1?'none':`scaleX(${s.labelScale||1})`;
      if(ring){ring.style.transform=`translate(-50%,-50%) scale(${s.ringScale})`;ring.style.opacity=String(s.ringOpacity);flash.style.opacity=String(s.flash);}
      host.dataset.closingProgress=String(p);host.dataset.closingState=JSON.stringify(s);
    };
  }
  function channel(host,c,onsets,make,reveal) {
    make('p','prod-kicker',c.heading,host,true);const context=make('p','lower-context resource-lower-context',c.context,host,true);
    const panel=make('div','channel-lower',null,host),logo=make('img','channel-logo',null,panel);logo.src='assets/logo.png';logo.alt='';
    make('p','channel-name',c.name,panel,true);make('p','channel-role',c.role,panel,true);
    const button=make('div','channel-button',null,panel),before=make('span','',c.button.before,button,true),after=make('span','',c.button.after,button,true);
    const travel=Math.min(300,Math.max(0,host.clientHeight-panel.offsetTop-panel.offsetHeight-8));
    return time=>{
      const entry=window.ShortCreatorStory.progress(time,onsets[0]),p=window.ShortCreatorStory.progress(time,onsets[1]),s=channelState(p),amount=1-(1-entry)**4;
      reveal(context,amount,40);panel.style.opacity=String(amount);panel.style.transform=`translateY(${travel*(1-amount)}px)`;
      button.style.transform=`scale(${s.scale})`;before.style.opacity=String(s.before);after.style.opacity=String(s.after);
      panel.dataset.channelProgress=String(p);panel.dataset.channelEntry=String(entry);panel.dataset.channelState=JSON.stringify(s);
    };
  }
  window.ShortCreatorClosings={state,channelState,mount,channel};
})();
