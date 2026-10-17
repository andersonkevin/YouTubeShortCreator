/* HyperFrames yt-logo-intro, logo-outro and store-badge-lockup, Apache-2.0.
   Approved logo bytes and pinned icons replace source marks; no external destinations. */
(()=>{
  'use strict';
  const kinds=Object.freeze(['logo-intro','logo-assemble','badge-pair','logo-collide']);
  const clamp=x=>Math.max(0,Math.min(1,x)),out=(p,n=3)=>1-(1-clamp(p))**n;
  const back=(p,a)=>{const t=clamp(p)-1;return 1+(a+1)*t**3+a*t*t;};
  const smooth=p=>{p=clamp(p);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  function clock(style,time,onsets) {
    if(!kinds.includes(style)||!Number.isFinite(time)||onsets.length!==(style==='badge-pair'?1:2)||!onsets.every(Number.isFinite))
      throw new Error('Invalid brand lockup clock');
    const frame=Math.floor(time*30+1e-7),starts=onsets.map(t=>Math.ceil(t*30));
    if(starts.length===2&&starts[1]-starts[0]<24)throw new Error('Brand cues overlap');
    const index=starts.length===2&&frame>=starts[1]?1:0,p=clamp((frame-starts[index])/24);
    const seconds=style==='badge-pair'?1.2*p:style==='logo-intro'?(index?2.3+1.05*p:1.188*p):style==='logo-collide'?(index?1.2+.3*p:1.2*p):(index?2+1.2*p:1.9*p);
    return {index,p,seconds,visible:frame>=starts[0]};
  }
  function intro(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Invalid logo intro time');
    const t=Math.max(0,Math.min(3.35,seconds)),logo=back((t-.288)/.55,1.5),kicker=out((t-.738)/.45),leave=clamp((t-2.3)/.3)**3;
    const title=out((t-2.66)/.5,4),arrow=back((t-2.9)/.45,1.6);
    return {root:out(t/.48),logo:clamp(logo),scale:.55+.45*logo,y:24*(1-logo),kicker:kicker*(1-leave),kickerY:14*(1-kicker)-12*leave,
      title,titleY:14*(1-title),arrow:clamp(arrow),arrowScale:.5+.5*arrow,arrowX:-14*(1-arrow)};
  }
  function assembly(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Invalid logo assembly time');
    const t=Math.max(0,Math.min(3.2,seconds)),bloom=out((t-1.2)/.4),fade=out((t-1.6)/1.2);
    return {pieces:Array.from({length:5},(_,i)=>{
      const enter=out((t-i*.08)/1.2,5),start=1.2+i*.02;
      const peak=1+.15*back((1.5-start)/.5,1.7),close=smooth((t-1.5)/.4);
      return {alpha:enter,x:1920*(1-enter),scale:t<1.5?1+.15*back((t-start)/.5,1.7):peak+(1-peak)*close};
    }),glow:bloom*(1-fade),glowScale:t<1.6?.5+.7*bloom:1.2+.6*fade,
    title:out((t-2)/1,4),titleY:20*(1-out((t-2)/1,4)),action:out((t-2.4)/.8,4),actionY:15*(1-out((t-2.4)/.8,4)),assembled:t>=1.9};
  }
  function collision(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Invalid logo collision time');
    const t=Math.max(0,Math.min(1.5,seconds)),ring=out((t-.8)/.4),exit=clamp((t-1.2)/.3);
    const shrink=exit===0?0:exit===1?1:2**(10*exit-10);
    const pulse=t<.95?1+.05*out((t-.8)/.15):1.05-.05*clamp((t-.95)/.15)**3;
    return {pieces:[[-960,-540],[960,-540],[-960,0],[960,0],[-960,540]].map(([x,y],i)=>{
      const p=back((t-i*.05)/.6,1.1);return {x:x*(1-p),y:y*(1-p)};
    }),assembled:t>=.8,scale:pulse*(1-shrink),ring:t<.8?0:1-ring,ringScale:.2+2.3*ring,copy:out((t-.8)/.4)};
  }
  function badges(progress,count) {
    if(!Number.isFinite(progress)||!Number.isInteger(count)||count<1||count>2)throw new Error('Invalid destination badge state');
    const t=clamp(progress)*1.2,title=out((t-.05)/.48);
    return {title,titleY:.22*(1-title),items:Array.from({length:count},(_,i)=>{
      const alpha=out((t-.22-i*.1)/.68);return {alpha,y:.28*(1-alpha)};
    }),footer:out((t-.53)/.47)};
  }
  function lines() {
    return Array.from({length:12},(_,i)=>({y:Math.round((i+1)*1080/13+Math.sin((i+1)*2.399)*10)/1080,
      angle:Number((Math.sin((i+1)*1.7)*.35).toFixed(2))}));
  }
  function badgeGeometry(width,height,tall,count) {
    if(![width,height].every(v=>Number.isFinite(v)&&v>=500)||![1,2].includes(count))throw new Error('Invalid badge viewport');
    const w=Math.floor(tall?Math.min(width*.72,height*.52):Math.min((width-96)/2,height*.67)),h=Math.floor(w/3.12),gap=24;
    const totalW=tall?w:count*w+(count-1)*gap,totalH=tall?count*h+(count-1)*gap:h;
    return Array.from({length:count},(_,i)=>({x:Math.floor((width-totalW)/2)+(tall?0:i*(w+gap)),
      y:Math.floor((height-totalH)/2)+(tall?i*(h+gap):0),w,h}));
  }
  function mount(host,c,onsets,data,make) {
    if(!kinds.includes(c.style))throw new Error('Unknown brand lockup');
    const board=make('div','brand-lockup-board',null,host);board.dataset.brandLockup=c.style;
    const W=host.clientWidth,H=host.clientHeight,tall=['portrait','portrait-4x5'].includes(data.profile.id);
    const title=make('h2','brand-lockup-title',c.heading,board,true),action=make('p','brand-lockup-action',c.action,board,true);
    const label=make('p','brand-lockup-label',c.label,board,true);
    let logo=null,kicker=null,arrow=null,glow=null,ring=null,pieces=[],badgeNodes=[];
    if(c.style==='badge-pair') {
      const boxes=badgeGeometry(W,H,tall,c.badges.length);
      badgeNodes=c.badges.map((badge,i)=>{
        const panel=make('div','brand-destination',null,board),b=boxes[i];
        Object.assign(panel.style,{left:b.x+'px',top:b.y+'px',width:b.w+'px',height:b.h+'px'});
        const icon=make('img','brand-destination-icon',null,panel);icon.src=data.icons[badge.icon];icon.alt='';
        const copy=make('div','brand-destination-copy',null,panel);
        make('p','brand-destination-eyebrow',badge.eyebrow,copy,true);make('p','brand-destination-label',badge.label,copy,true);
        return panel;
      });
      title.style.top='20px';
    } else {
      const art=make('div','brand-lockup-art',null,board),w=Math.min(420,W*.55),h=Math.min(210,H*.24);
      const top=Math.round(Math.max(16,(H-150-h-48-184)/2)),textTop=top+h+48;
      Object.assign(art.style,{width:w+'px',height:h+'px',left:(W-w)/2+'px',top:top+'px'});
      logo=make('img','brand-lockup-logo',null,art);logo.src='assets/logo.png';logo.alt='';
      title.style.top=textTop+'px';
      if(c.style==='logo-intro') {
        lines().forEach(s=>{const line=make('i','brand-lockup-line',null,board);line.style.top=s.y*100+'%';line.style.transform=`rotate(${s.angle}deg)`;line.setAttribute('aria-hidden','true');});
        kicker=label;kicker.classList.add('brand-lockup-kicker');kicker.style.top=textTop+28+'px';
        arrow=make('span','brand-lockup-arrow',null,board);arrow.setAttribute('aria-hidden','true');arrow.style.top=textTop+12+'px';
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','path');
        svg.setAttribute('viewBox','0 0 24 24');path.setAttribute('d','M4 12h15M13 5l7 7-7 7');svg.appendChild(path);arrow.appendChild(svg);
        title.style.right='140px';title.style.left='64px';
      } else {
        glow=make('i','brand-lockup-glow',null,art);glow.setAttribute('aria-hidden','true');
        pieces=Array.from({length:5},(_,i)=>{
          const panel=make('div','brand-logo-piece',null,art),image=make('img','',null,panel);image.src='assets/logo.png';image.alt='';
          panel.style.clipPath=`inset(0 ${(4-i)*20}% 0 ${i*20}%)`;panel.style.transformOrigin=`${i*20+10}% 50%`;return panel;
        });
        if(c.style==='logo-collide') {
          glow.style.display='none';ring=make('i','brand-collision-ring',null,art);ring.setAttribute('aria-hidden','true');
        }
      }
    }
    return time=>{
      const at=clock(c.style,time,onsets);let s;
      if(c.style==='logo-intro') {
        s=intro(at.seconds);board.style.opacity=String(s.root);
        logo.style.opacity=String(s.logo);logo.style.transform=`translateY(${s.y}px) scale(${s.scale})`;
        kicker.style.opacity=String(s.kicker);kicker.style.transform=`translateY(${s.kickerY}px)`;
        title.style.opacity=String(s.title);title.style.transform=`translateY(${s.titleY}px)`;
        arrow.style.opacity=String(s.arrow);arrow.style.transform=`translateX(${s.arrowX}px) scale(${s.arrowScale})`;
        action.style.opacity=String(s.title);
      } else if(c.style==='logo-collide') {
        s=collision(at.seconds);logo.style.visibility=s.assembled?'visible':'hidden';logo.style.transform=`scale(${s.scale})`;
        pieces.forEach((piece,i)=>{piece.style.visibility=s.assembled?'hidden':'visible';piece.style.opacity=at.visible?'1':'0';
          piece.style.transform=`translate(${s.pieces[i].x*W/1920}px,${s.pieces[i].y*H/1080}px)`;});
        ring.style.opacity=String(s.ring);ring.style.transform=`translate(-50%,-50%) scale(${s.ringScale})`;
        title.style.opacity=action.style.opacity=label.style.opacity=String(s.copy);
      } else if(c.style==='logo-assemble') {
        s=assembly(at.seconds);logo.style.visibility=s.assembled?'visible':'hidden';
        pieces.forEach((piece,i)=>{const q=s.pieces[i];piece.style.visibility=s.assembled?'hidden':'visible';piece.style.opacity=String(q.alpha);
          piece.style.transform=`translateX(${q.x*W/1920}px) scale(${q.scale})`;});
        glow.style.opacity=String(s.glow);glow.style.transform=`translate(-50%,-50%) scale(${s.glowScale})`;
        title.style.opacity=String(s.title);title.style.transform=`translateY(${s.titleY}px)`;
        action.style.opacity=label.style.opacity=String(s.action);action.style.transform=`translateY(${s.actionY}px)`;
      } else {
        s=badges(at.p,badgeNodes.length);title.style.opacity=String(s.title);title.style.transform=`translateY(${s.titleY*100}%)`;
        badgeNodes.forEach((panel,i)=>{const q=s.items[i];panel.style.opacity=String(q.alpha);panel.style.transform=`translateY(${q.y*100}%)`;});
        action.style.opacity=label.style.opacity=String(s.footer);
      }
      board.dataset.lockupState=JSON.stringify({style:c.style,clock:at,...s});
    };
  }
  window.ShortCreatorBrandLockups={kinds,clock,intro,assembly,collision,badges,lines,badgeGeometry,mount};
})();
