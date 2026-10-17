/* Source-backed UI presentations. All state is reconstructed from caption frames;
   supplied messages and feedback states are illustrations, never live actions. */
(() => {
  'use strict';
  const variants=Object.freeze({chat:['bottom-stack','side-stack','token-stream'],
    notifications:['spring','pileup','cascade','slide'],steps:['tabs','sheet','skeleton','menu']});
  const clamp=p=>Math.max(0,Math.min(1,p)),mix=(a,b,p)=>a+(b-a)*p;
  const out=(p,n=4)=>1-(1-clamp(p))**n;
  const expo=p=>p>=1?1:1-2**(-10*clamp(p));
  const inOut=p=>{const q=clamp(p);return q<.5?8*q**4:1-8*(1-q)**4;};
  const back=(p,s=1.7)=>{const q=clamp(p)-1;return 1+(s+1)*q**3+s*q**2;};
  const frame=t=>Math.floor(t*30+1e-7);
  const progress=(time,onset)=>clamp((frame(time)-Math.ceil(onset*30))/24);
  // Retained measured tables; geometry/timing are normalized to the native board/cue.
  const sheet=Object.freeze([[0,1450,0],[.057,1198,.13],[.090,903,.21],[.123,648,.36],
    [.157,437,.43],[.190,262,.50],[.223,120,.62],[.257,8,.78],[.290,-76,.89],
    [.323,-138,1],[.357,-175,1],[.390,-191,1],[.423,-192,1],[.457,-181,1],
    [.490,-159,1],[.523,-131,1],[.557,-100,1],[.590,-68,1],[.623,-41,1],
    [.657,-18,1],[.690,-5,1],[.723,0,1]]);
  const keyGaps=Object.freeze([.1,.033,.2,.133,.2,.033,.067,.033,.1,.067,.033,.067,.067,
    .067,.133,.067,.033,.067,.1,.1,.067,.133,.1,.033,.1,.033,.167,.033,.1,.1]);
  const wordGaps=Object.freeze([.167,.1,0,.367,0,.167,.133,.1,.1,.133,.167,.133,0,.233,
    .167,.1,0,.133,.133,.1,.167,.133,.1,.133,.167,.1,.133,.1,.133]);
  function sheetAt(p,travel) {
    const t=clamp(p)*.723;let key=sheet[0];
    for(const item of sheet)if(item[0]<=t+1e-9)key=item;
    return {y:key[1]/1450*travel,opacity:key[2]};
  }
  function springAt(p) {
    if(p>=1)return 0;
    const omega=15,zeta=.74,wd=omega*Math.sqrt(1-zeta*zeta),t=clamp(p)*.9;
    return Math.exp(-zeta*omega*t)*(Math.cos(wd*t)+zeta*omega/wd*Math.sin(wd*t));
  }
  function schedule(parts,gaps) {
    let total=0;const times=parts.map((_,i)=>{const start=total;total+=gaps[i%gaps.length];return start;});
    return times.map(t=>total?t/total:0);
  }
  function noteAt(text,p) {
    const chars=Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),s=>s.segment);
    const times=schedule(chars,keyGaps),q=clamp(p/.78);
    return chars.filter((_,i)=>p>0&&(q>=1||times[i]<=q)).join('');
  }
  function tokenState(text,p) {
    const parts=text.match(/\S+\s*|\s+/gu)||[],times=schedule(parts,wordGaps);
    return parts.map((text,i)=>{const at=times[i]*2/3;return {text,visible:p>0&&p>=at,ink:clamp((p-at)*3)};});
  }
  function waitAdvance(time,onsets,items,index,enabled) {
    if(!enabled||index<1||items[index]?.side!=='received')return 0;
    const start=Math.ceil(onsets[index-1]*30)+24,end=Math.ceil(onsets[index]*30);
    return end>start?out((frame(time)-start)/Math.min(24,end-start)):0;
  }
  function stackY(index,active,p,H,h,gap,prior=0,next=0,entry=0) {
    if(index>active)return H-h;
    if(index===active)return H-h+entry*(1-expo(p));
    return H-h-(active-1-index)*(h+gap)-(h+gap)*(prior+(1-prior)*expo(p))-(h+gap)*next;
  }
  function notificationAt(kind,index,active,p,own,H,h,gap) {
    const state={x:0,y:index*(h+gap),scale:1,rotation:0,opacity:out(own)};
    if(kind==='spring')state.y-=Math.min(72,h+4)*springAt(own);
    if(kind==='slide'){state.x=32*(1-out(own));state.opacity=out(own);}
    if(kind==='pileup') {
      const q=back(own),push=out(p/.63,3);
      state.y=active===index?-h*(1-q):(active-1-index+push)*(h+gap);
      state.scale=mix(.94,1,q);state.rotation=mix(-1.2,0,q);state.opacity=clamp(q);
    }
    if(kind==='cascade'){state.y=stackY(index,active,p,H,h,gap,0,0,22);state.opacity=clamp(own/.4167);}
    return state;
  }
  function feedbackAt(p,state) {
    const u=clamp((p-.3)/.3)*6,n=Math.min(5,Math.floor(u)),part=u-n;
    const shake=u<=0||u>=6?0:-12*(n%2?1-part:part);
    return {x:state==='error'?shake:0,y:22*(1-out(p/.3,3)),
      opacity:out(p/.3,3),badge:back((p-.66)/.28,2),hint:out((p-.76)/.24,3)};
  }
  function mount(host,c,onsets,make) {
    if(c.variant&&!variants[c.style]?.includes(c.variant))throw new Error('Unknown interface variant');
    const api=window.ShortCreatorInterface;
    make('h2','prod-heading',c.heading,host,true);
    const board=make('div','interface-board interface-'+c.style+' interface-presets',null,host);
    make('p','interface-source',c.source,host,true);
    board.dataset.interfaceStyle=c.style;board.dataset.interfaceVariant=c.variant||c.style;
    const W=board.clientWidth,H=board.clientHeight,gap=Math.max(16,H*.035);
    const h=(H-gap*(c.items.length-1))/c.items.length,step=h+gap;
    let nav=null,pill=null,bars=[],tabs=[];
    if(c.style==='steps'&&['tabs','menu'].includes(c.variant)) {
      nav=make('div','interface-nav interface-nav-'+c.variant,null,board);
      if(c.variant==='menu') {
        const button=make('div','interface-menu-button',null,nav);
        bars=[0,1,2].map(()=>make('i','',null,button));
      }
      const track=make('div','interface-nav-track',null,nav);
      pill=make('i','interface-nav-indicator',null,track);
      tabs=c.items.map(item=>make('span','interface-tab-label',item.label,track,true));
      track.style.gridTemplateColumns=`repeat(${c.items.length},1fr)`;
    }
    const rows=c.items.map((item,index)=>{
      // Independent clips keep each fixed-slot notification inside its own row.
      const slotted=c.style==='notifications'&&['spring','slide'].includes(c.variant);
      const slot=slotted?make('div','interface-slot',null,board):null;
      if(slot)Object.assign(slot.style,{top:index*step+'px',height:h+'px'});
      const row=make('div','interface-row',null,slot||board);
      row.dataset.interfaceIndex=String(index);row.style.height=h+'px';row.style.top='0';
      const label=make('h3','interface-label',item.label,row,true),body=make('p','interface-body',item.body,row,true);
      let caret=null,content=null,skeleton=null,badge=null,words=[];
      if(c.style==='chat') {
        row.dataset.side=item.side;row.style.transformOrigin=item.side==='sent'?'right bottom':'left bottom';
        if(c.variant==='token-stream') {
          body.textContent='';words=tokenState(item.body,0).map(s=>make('span','interface-token',s.text,body));
        }
      }
      if(c.style==='steps') {
        const navigation=Boolean(nav),height=navigation?H-140:H*.65;
        row.style.height=height+'px';row.dataset.panelHeight=String(height);
        if(c.variant==='skeleton') {
          content=make('div','interface-panel-copy',null,row);content.append(label,body);
          skeleton=make('div','interface-skeleton',null,row);
          [72,93,57].forEach(width=>{const line=make('i','',null,skeleton);line.style.width=width+'%';});
        }
      }
      if(c.style==='notes') {
        body.textContent='';content=document.createTextNode('');body.appendChild(content);
        caret=make('i','interface-caret',null,body);
      }
      if(c.style==='feedback') {
        row.dataset.feedbackState=item.state;badge=make('span','interface-feedback-badge',item.state.toUpperCase(),row,true);
      }
      return {row,label,body,item,index,slot,caret,content,skeleton,badge,words};
    });
    const indicator=c.typing_indicator?make('div','interface-typing',null,board):null;
    const dots=indicator?[0,1,2].map(()=>make('i','',null,indicator)):[];
    if(indicator)indicator.setAttribute('aria-label','Typing indicator in the illustrated conversation');
    return time=>{
      const active=api.activeAt(time,onsets),p=active<0?0:progress(time,onsets[active]);
      const typing=api.typingAt(time,onsets,c.items),bottom=['bottom-stack','side-stack'].includes(c.variant);
      const next=waitAdvance(time,onsets,c.items,active+1,c.typing_indicator);
      const prior=active>0?waitAdvance(Math.ceil(onsets[active]*30)/30,onsets,c.items,active,c.typing_indicator):0;
      board.dataset.interfaceActive=String(active);
      if(indicator){const clear=typing.index>=0&&(!bottom||active<0||next>=h/step);
        indicator.style.visibility=clear?'visible':'hidden';indicator.style.opacity=String(clear?typing.opacity:0);
        indicator.style.top=(bottom?H-h+8:Math.max(0,typing.index)*step+8)+'px';
        indicator.style.transform=`scale(${typing.scale})`;dots.forEach((dot,i)=>{dot.style.transform=`translateY(${typing.dots[i]}px)`;});
        board.dataset.typingState=JSON.stringify(typing);}
      const states=[];
      for(const parts of rows) {
        const {row,label,body,item,index}=parts,own=progress(time,onsets[index]);
        const state={x:0,y:index*step,scale:1,rotation:0,opacity:out(own),visible:own>0};
        row.dataset.interfaceProgress=String(own);
        if(c.style==='chat') {
          if(bottom){state.y=stackY(index,active,p,H,h,gap,prior,next);
            if(index===active)state.y-=(h+gap)*next;}
          const pop=out(own/.15,3);
          state.scale=c.variant==='side-stack'?mix(.94,1,back(own/.35,1.45)):.75+.25*pop;
          state.opacity=own>0?.6+.4*pop:0;
          if(c.variant==='side-stack')state.x=(item.side==='sent'?1:-1)*34*(1-back(own/.35,1.45));
          if(c.variant==='token-stream')tokenState(item.body,own).forEach((s,i)=>{
            parts.words[i].style.visibility=s.visible?'visible':'hidden';parts.words[i].style.opacity=String(.45+.55*s.ink);
          });
        } else if(c.style==='notifications') {
          Object.assign(state,notificationAt(c.variant,index,active,p,own,H,h,gap));
          if(parts.slot)state.y-=index*step;
        } else if(c.style==='steps') {
          state.visible=index===active&&own>0;
          const height=+row.dataset.panelHeight,rest=nav?116:(H-height)/2;
          state.y=rest;state.opacity=1;
          if(c.variant==='sheet'){const sample=sheetAt(own,(H-height)/2);state.y+=sample.y;state.opacity=sample.opacity;}
          else if(c.variant==='skeleton') {
            const shimmer=clamp(own/.7),gone=clamp((own-.72)/.22),ink=clamp((own-.78)/.22);
            parts.skeleton.style.backgroundPosition=`${shimmer*100}% 0`;parts.skeleton.style.opacity=String(1-gone);
            parts.content.style.opacity=String(ink);state.skeleton={shimmer,gone,ink};
          } else {state.y+=20*(1-out(own));state.opacity=out(own);}
        } else if(c.style==='notes') {
          parts.content.textContent=noteAt(item.body,own);parts.caret.style.visibility=own>0&&own<1&&frame(time)%10<5?'visible':'hidden';
          state.typed=parts.content.textContent;state.y+=12*(1-out(own));
        } else if(c.style==='feedback') {
          const f=feedbackAt(own,item.state);state.x=f.x;state.y+=f.y;state.opacity=f.opacity;
          parts.badge.style.opacity=String(clamp((own-.66)/.1));parts.badge.style.transform=`scale(${f.badge})`;
          body.style.opacity=String(f.hint);state.feedback=f;
        }
        row.style.visibility=state.visible?'visible':'hidden';row.style.opacity=String(state.opacity);
        row.style.transform=`translate(${state.x}px,${state.y}px) rotate(${state.rotation}deg) scale(${state.scale})`;
        states.push(state);
      }
      let navigation=null;
      if(nav) {
        const width=pill.parentElement.clientWidth/c.items.length;
        const position=Math.max(0,active-1+inOut(p));pill.style.width=width+'px';pill.style.transform=`translateX(${position*width}px)`;
        nav.style.visibility=active<0?'hidden':'visible';
        tabs.forEach((tab,i)=>{
          const start=Math.max(0,Math.min(width,(position-i)*width)),end=Math.max(0,Math.min(width,(position+1-i)*width));
          tab.style.backgroundImage=`linear-gradient(to right,white 0 ${start}px,var(--purple) ${start}px ${end}px,white ${end}px 100%)`;
          if(c.variant==='menu'){const q=clamp((progress(time,onsets[0])-.57-i*.045)/.28);
            tab.style.opacity=String(q);tab.style.transform=`translateY(${28*(1-back(q,1.6))}px) scale(${.86+.14*back(q,1.6)})`;}
        });
        if(bars.length){const q=clamp((progress(time,onsets[0])-.3)/.3),m=q<.5?4*q**3:1-4*(1-q)**3;
          bars[0].style.transform=`translateY(${8*m}px) rotate(${45*m}deg)`;bars[1].style.opacity=String(1-q);
          bars[2].style.transform=`translateY(${-8*m}px) rotate(${-45*m}deg)`;
          bars[0].parentElement.style.transform=`scale(${.72+.28*back(progress(time,onsets[0])/.3,1.8)})`;}
        navigation={position,width};
      }
      board.dataset.interfacePresentation=JSON.stringify({variant:c.variant||c.style,active,rows:states,navigation});
    };
  }
  window.ShortCreatorInterfacePresets={variants,progress,sheetAt,springAt,noteAt,tokenState,
    waitAdvance,stackY,notificationAt,feedbackAt,mount};
})();
