/* HyperFrames gesture and panel mechanics, mapped to native caption cues.
   Apache-2.0 source hashes and per-adaptation omissions are in provenance. */
(() => {
  'use strict';
  const variants=['swipe-rail','velocity-throw-snap','spring-stack-shuffle','scroll-feed',
    'state-chip-rail','card-resize','modal-morph','modal-morph-snappy',
    'pull-to-refresh','pull-to-refresh-arrow','pull-to-refresh-dots','toggle-flip',
    'pan-stations','panel-reveal'];
  const clamp=p=>Math.max(0,Math.min(1,p)),mix=(a,b,p)=>a+(b-a)*p;
  const out=(p,n=3)=>1-(1-clamp(p))**n;
  const back=(p,s=1.7)=>{const q=clamp(p)-1;return 1+(s+1)*q**3+s*q**2;};
  const smooth=p=>{p=clamp(p);return p*p*(3-2*p);};
  const inOut=(p,n=3)=>{p=clamp(p);return p<.5?(2*p)**n/2:1-(2-2*p)**n/2;};
  const at=(t,start,duration)=>clamp((t-start)/duration);
  function rubberBand(distance){return distance*.55/(distance*.55/640+1);}
  function land(p,overshoot){p=clamp(p);return p<.62?(1+overshoot)*smooth(p/.62):1+overshoot-overshoot*smooth((p-.62)/.38);}
  function rect(a,b,p){return Object.fromEntries(['x','y','w','h'].map(k=>[k,mix(a[k],b[k],p)]));}
  function flip(home,away,p) {
    const r=rect(away,home,p),sx=r.w/home.w,sy=r.h/home.h;
    // Parent FLIP plus inverse child scale keeps the approved glyph size.
    return {r,sx,sy,copyX:28/sx-28,copyY:28/sy-28,copyScaleX:1/sx,copyScaleY:1/sy};
  }
  function gesture(style,progress) {
    if(!variants.includes(style)||!Number.isFinite(progress))throw new Error('Invalid interface motion');
    const p=clamp(progress),s={p,travel:0,y:0,tilt:0,scale:1,alpha:1,contact:0,contactX:0,contactY:0,contactScale:1};
    if(style==='swipe-rail') {
      const t=p*2.2;
      s.travel=t<.66?0:t<1.28?23/50*out(at(t,.66,.62),4):t<1.56?mix(23/50,38/50,out(at(t,1.28,.28))):mix(38/50,1,back(at(t,1.56,.64)));
      s.contact=out(at(t,.4,.18))*(1-out(at(t,1.28,.24)));
      s.contactX=-.28*out(at(t,.66,.62),4);s.contactY=-.05*out(at(t,1.28,.24));
      s.contactScale=mix(.86,1,out(at(t,.4,.18)))*mix(1,.82,out(at(t,1.28,.24)));
      s.select=back(at(t,1.56,.64));s.deselect=out(at(t,1.5,.48));
    } else if(style==='velocity-throw-snap') {
      const t=p*1.4,q=out(t/.78,5),settle=back(at(t,.78,.62));
      s.travel=t<.78?mix(1,.16/1.4,q):mix(.16/1.4,0,settle);
      s.y=t<.78?mix(.07,-.014,q):mix(-.014,0,settle);
      s.tilt=t<.78?mix(.8,-.22,q):mix(-.22,0,settle);
      s.select=settle;s.aura=.58*out(at(t,.78+.62*.3,.62*.7));
    } else if(style==='spring-stack-shuffle') {
      const t=p*1.18;s.t=t;s.rise=smooth(t/.34);s.land=land((t-.34)/.51,.06);
      s.scaleLand=land((t-.34)/.51,.04);s.shift=smooth(t/.55);
      s.bump=t<.8?0:t<.96?.012*smooth((t-.8)/.16):.012*(1-smooth((t-.96)/.22));
    } else if(style==='pan-stations')s.travel=p===1?1:(1-Math.cos(Math.PI*p))/2;
    else if(style==='panel-reveal'){s.open=inOut(p,4);s.body=s.open;}
    else if(style==='scroll-feed')s.travel=out(p/.625,4);
    else if(style==='state-chip-rail'){s.alpha=out(at(p,.12,.45),4);s.y=.025*(1-s.alpha);}
    else if(style==='card-resize') {
      const t=p*1.1;s.expand=inOut(at(t,.35,.68),4);s.alpha=s.expand;s.y=24*(1-s.expand);
      s.body=out(at(t,.82,.28));s.bodyY=12*(1-s.body);
    } else if(style.startsWith('modal-morph')) {
      const duration=style==='modal-morph-snappy'?.6:.95,t=p*(1.2+duration+.15),q=at(t,1.2,duration);
      s.expand=style==='modal-morph-snappy'?back(q,.7):inOut(q);
      s.alpha=at(t,0,.3);s.body=out(at(q,.55,.45),2);s.bodyY=12*(1-s.body);
      s.handoff=at(q,0,.3);
    } else if(style.startsWith('pull-to-refresh')) {
      const t=p*2.45,raw=120*out(at(t,.12,.7)),peak=rubberBand(120)/640;
      const held=Math.min(peak,Math.max(.058,peak*.76));
      s.y=t<.82?rubberBand(raw)/640:t<1.8?mix(peak,held,out(at(t,.82,.22),4)):held*(1-back(at(t,1.8,.65)));
      s.fill=out(at(t,.12,.7));s.alpha=s.fill*(1-at(t,1.8,.2)**3);
      s.rotation=720*at(t,.82,.98);s.replace=out(at(t,1.8+.65*.32,.28));
      s.dots=[0,1,2].map(i=>{const q=clamp((t-.82-i*.1)/.44);return {y:-.0115*Math.sin(Math.PI*q)**2,scale:1+.28*Math.sin(Math.PI*q)**2};});
    } else if(style==='toggle-flip') {
      const t=p*.9,press=t<.4?inOut(at(t,.3,.1),2):1-inOut(at(t,.4,.1),2);
      const pulse=t<.6125?out(at(t,.5,.1125),2):1-out(at(t,.6125,.1125),2);
      const glow=t<.825?out(at(t,.75,.075),2):1-out(at(t,.825,.075),2);
      s.alpha=out(t/.4);s.pressX=1-.06*press;s.pressY=1+.06*press;
      s.mix=back(at(t,.5,.25),1.9);s.knobScale=1+.08*pulse;s.glow=glow;s.done=t>=.75;
    }
    return s;
  }
  function cardPose(style,index,active,p,count,W,H) {
    const g=gesture(style,p),compact=W<1100,w=W*(compact?.82:.46),h=H*.68;
    let s={x:(W-w)/2,y:(H-h)/2,w,h,scale:1,rotation:0,opacity:1,z:1,veil:0,ring:0,copy:index===active,body:1};
    if(active<0)return {...s,opacity:0,copy:false};
    if(style==='swipe-rail'||style==='velocity-throw-snap') {
      const pitch=w+W*.04,focus=style==='swipe-rail'?Math.max(0,active-1)+(active?g.travel:0):active-g.travel*1.4*W/pitch;
      s.x+=pitch*(index-focus);s.y+=g.y*H;s.rotation=g.tilt;
      s.scale=style==='swipe-rail'?index===active?mix(.94,1.02,active?g.select:out(p)):index===active-1?mix(1.02,.94,g.deselect):.94:
        index===active?mix(.97,1.04,g.select):mix(.97,.95,out(at(p*1.4,.78,.62)));
      s.opacity=index===active?1:.62;s.ring=index===active?clamp(g.select??p):0;
      s.copy=index===active||(index===active-1&&p<1);
    } else if(style==='pan-stations') {
      s.w=W*.78;s.h=H*.64;s.y=H*.18;
      const focus=Math.max(0,active-1)+(active?g.travel:0);
      s.x=W*.11+(index-focus)*W*.84;
      s.copy=index===active||(index===active-1&&p<1);
    } else if(style==='panel-reveal') {
      s.w=W*.82;s.h=mix(104,H*.78,g.open);s.x=(W-s.w)/2;s.y=H*.11;
      s.opacity=index===active?1:0;s.body=g.body;s.panelOpen=g.open;
    } else if(style==='scroll-feed') {
      s.w=W*.76;s.x=(W-s.w)/2;s.h=H*.64;const pitch=s.h+H*.08;
      s.y=(H-s.h)/2+(index-Math.max(0,active-1)-(active?g.travel:0))*pitch;
      s.copy=index===active||(index===active-1&&p<1);
    } else if(style==='spring-stack-shuffle') {
      s.h=H*.52;s.y=H*.59-s.h/2;
      const depth=(a,i)=>(a-i+count)%count,d=depth(active,index),prior=depth(Math.max(0,active-1),index),target=-.055*H*d;
      let y=target,scale=1-.05*d,veil=Math.min(.5,d*.15);
      if(active>0&&index===active) {
        const apex=-.055*H*(count-1)-.09*H;
        y=g.t<.34?mix(-.055*H*prior,apex,g.rise):mix(apex,0,g.land);
        const kick=Math.min(.12*W,Math.max(0,(W-1.05*w)/2-8));
        s.x+=g.t<.34?kick*g.rise:kick*(1-smooth((g.t-.34)/.51));
        scale=g.t<.34?mix(1-.05*prior,1.05,g.rise):mix(1.05,1,g.scaleLand);
        veil=mix(Math.min(.5,prior*.15),0,smooth(g.t/.85));s.z=g.t<.85?60:40;
      } else if(active>0) {
        y=mix(-.055*H*prior,target,g.shift)+g.bump*H;scale=mix(1-.05*prior,1-.05*d,g.shift);veil=mix(Math.min(.5,prior*.15),veil,g.shift);s.z=40-d;
      } else {y+=.05*H*(1-out(p,4));scale*=.985+.015*out(p,4);s.z=40-d;}
      s.y+=y;s.scale=scale;s.veil=veil;s.ring=index===active?1:0;s.copy=index===active;
    } else if(style==='card-resize'||style.startsWith('modal-morph')) {
      s.w=W*.82;s.h=H*.78;s.x=(W-s.w)/2;s.y=(H-s.h)/2;
      const home={x:s.x,y:s.y,w:s.w,h:s.h},away={x:W*.5-s.w*(style==='card-resize'?330/560:.62)/2,
        y:H*.5-s.h*(style==='card-resize'?132/210:.46)/2,w:s.w*(style==='card-resize'?330/560:.62),h:s.h*(style==='card-resize'?132/210:.46)};
      s.flip=flip(home,away,g.expand);s.opacity=index===active?g.alpha:0;s.body=g.body;s.bodyY=g.bodyY;
    } else if(style.startsWith('pull-to-refresh')) {
      s.w=W*.84;s.h=H*.72;s.x=(W-s.w)/2;s.y=(H-s.h)/2+g.y*H;
      s.opacity=index===active?g.replace:index===active-1?1-g.replace:0;
      if(active===0)s.opacity=index===0?out(p):0;
      s.copy=s.opacity>0;s.z=index===active?2:1;
    } else if(style==='state-chip-rail') {
      s.w=W*.88;s.h=H*.6;s.x=(W-s.w)/2;s.y=H*.34;
      s.opacity=index===active?out(p):0;
    }
    if(active===0&&!style.startsWith('modal-morph')&&style!=='card-resize')s.opacity*=out(p,4);
    return s;
  }
  function mount(host,c,onsets,make) {
    const style=c.variant;if(!variants.includes(style))throw new Error('Unknown interface motion variant');
    const api=window.ShortCreatorInterface;
    make('h2','prod-heading',c.heading,host,true);
    const board=make('div','interface-board interface-motion',null,host);
    make('p','interface-source',c.source,host,true);
    board.dataset.interfaceStyle=c.style;board.dataset.interfaceVariant=style;
    const W=board.clientWidth,H=board.clientHeight,N=c.items.length;
    if(style==='pan-stations')make('i','im-station-rail',null,board);
    let contact=null,indicator=null,dots=[],chips=[];
    if(style==='swipe-rail')contact=make('i','im-contact',null,board);
    if(style.startsWith('pull-to-refresh')) {
      indicator=make('div','im-refresh',null,board);indicator.dataset.indicator=style.endsWith('dots')?'dots':style.endsWith('arrow')?'arrow':'ring';
      if(style.endsWith('dots'))dots=[0,1,2].map(()=>make('i','im-refresh-dot',null,indicator));
      else make('i',style.endsWith('arrow')?'im-refresh-arrow':'im-refresh-ring',null,indicator);
    }
    if(style==='state-chip-rail') {
      const nav=make('div','im-chip-rail',null,board);nav.style.gridTemplateColumns=`repeat(${W<1100?Math.min(2,N):N},1fr)`;
      chips=c.items.map(item=>{const chip=make('div','im-chip',null,nav);make('i','im-chip-dot',null,chip);make('span','im-chip-label',item.label,chip,true);return chip;});
    }
    const rows=c.items.map((item,index)=>{
      const shell=make('div','im-card',null,board);shell.dataset.motionIndex=String(index);
      make('i','im-card-rule',null,shell);
      const row=make('div','interface-row im-copy',null,shell);row.dataset.interfaceIndex=String(index);
      make('h3','interface-label',item.label,row,true);const body=make('p','interface-body',item.body,row,true);
      const veil=make('div','im-veil',null,shell),ring=make('div','im-ring',null,shell);
      let toggle=null,knob=null,glow=null;
      if(style==='toggle-flip') {
        row.dataset.enabled=String(item.enabled);shell.classList.add('im-setting');
        toggle=make('div','im-toggle',null,shell);toggle.setAttribute('role','img');toggle.setAttribute('aria-label',item.label);
        glow=make('i','im-toggle-glow',null,toggle);knob=make('i','im-toggle-knob',null,toggle);
      }
      const trails=style==='scroll-feed'?[0,1].map(i=>{const trail=make('div','im-feed-trail im-feed-trail-'+i,null,board);trail.setAttribute('aria-hidden','true');return trail;}):[];
      return {shell,row,body,veil,ring,item,index,toggle,knob,glow,trails};
    });
    return time=>{
      const active=api.activeAt(time,onsets),p=active<0?0:window.ShortCreatorStory.progress(time,onsets[active]),g=gesture(style,p),states=[];
      board.dataset.interfaceActive=String(active);
      for(const {shell,row,body,veil,ring,item,index,toggle,knob,glow,trails} of rows) {
        const own=window.ShortCreatorStory.progress(time,onsets[index]);row.dataset.interfaceProgress=String(own);
        let s=cardPose(style,index,active,p,N,W,H);
        if(toggle) {
          const q=gesture(style,own),gap=20,h=(H-gap*(N-1))/N;
          s={x:28,y:index*(h+gap),w:W-56,h,scale:1,rotation:0,opacity:index<=active?q.alpha:0,z:1,veil:0,ring:0,copy:index<=active,body:1};
          const value=item.enabled?q.mix:1-q.mix;
          toggle.style.transform=`scale(${q.pressX},${q.pressY})`;toggle.style.setProperty('--im-toggle-mix',String(clamp(value)*100));
          knob.style.transform=`translateX(${value*150}%) scale(${q.knobScale})`;glow.style.opacity=String(q.glow);
          toggle.dataset.enabled=String(q.done?item.enabled:!item.enabled);s.toggle={...q,value,enabled:q.done?item.enabled:!item.enabled};
        }
        Object.assign(shell.style,{left:s.x+'px',top:s.y+'px',width:s.w+'px',height:s.h+'px',opacity:String(s.opacity),zIndex:String(s.z),
          transformOrigin:'center',transform:`rotate(${s.rotation}deg) scale(${s.scale})`,visibility:s.opacity>0?'visible':'hidden'});
        Object.assign(row.style,{left:'28px',top:'28px',width:(s.w-56)+'px',height:(s.h-56)+'px',transform:'none',transformOrigin:'0 0'});
        if(toggle)Object.assign(row.style,{left:'20px',top:'12px',width:(s.w-180)+'px',height:(s.h-24)+'px'});
        if(s.flip) {
          const f=s.flip;
          shell.style.transformOrigin='0 0';shell.style.transform=`translate(${f.r.x-s.x}px,${f.r.y-s.y}px) scale(${f.sx},${f.sy})`;
          row.style.width=(f.r.w-56)+'px';row.style.height=(f.r.h-56)+'px';
          row.style.transform=`translate(${f.copyX}px,${f.copyY}px) scale(${f.copyScaleX},${f.copyScaleY})`;
        }
        body.style.opacity=String(s.body);body.style.transform=`translateY(${s.bodyY||0}px)`;
        veil.style.opacity=String(s.veil);ring.style.opacity=String(s.ring);
        // Traveling silhouettes may cross the clip; readable copy remains wholly
        // inside it. At rest every selected item is shown in full, at fixed type size.
        const b=shell.getBoundingClientRect(),a=board.getBoundingClientRect();
        const contained=b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom;
        const copyFits=!s.flip||(s.flip.r.w>=s.w*.78&&s.flip.r.h>=s.h*.75);
        row.style.visibility=s.copy&&s.opacity>0&&contained&&copyFits?'visible':'hidden';
        s.copyVisible=row.style.visibility==='visible';
        for(const [i,trail] of trails.entries())Object.assign(trail.style,{left:(s.x+(i?1:-1)*W*.0045)+'px',top:(s.y+(i?1:-1)*H*.008)+'px',width:s.w+'px',height:s.h+'px',opacity:String(s.opacity*.1)});
        states.push(s);
      }
      if(contact){contact.style.opacity=String(active>0?g.contact:0);contact.style.transform=`translate(${g.contactX*W}px,${g.contactY*H}px) scale(${g.contactScale})`;}
      if(indicator) {
        indicator.style.opacity=String(active>0?g.alpha:0);indicator.style.setProperty('--im-refresh-fill',String(g.fill*100));
        const spin=indicator.firstElementChild;if(!dots.length)spin.style.transform=`rotate(${g.rotation+(style.endsWith('arrow')?g.fill*180:0)}deg)`;
        dots.forEach((dot,i)=>{dot.style.transform=`translateY(${g.dots[i].y*H}px) scale(${g.dots[i].scale})`;dot.style.opacity=String(Math.max(.2,clamp((g.fill*100-i*30)/30)));});
      }
      chips.forEach((chip,index)=>{
        const first=window.ShortCreatorStory.progress(time,onsets[0]),q=out(at(first,.12+index*.08,.45),4);
        chip.style.opacity=String(q);chip.style.transform=`translateY(${.025*H*(1-q)}px)`;
        chip.dataset.state=index<active?'done':index===active?'active':'pending';
      });
      board.dataset.interfacePresentation=JSON.stringify({variant:style,active,progress:p,rows:states,gesture:g});
    };
  }
  window.ShortCreatorInterfaceMotion={variants,rubberBand,land,rect,flip,gesture,cardPose,mount};
})();
