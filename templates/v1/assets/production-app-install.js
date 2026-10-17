/* HyperFrames vpn-youtube-spot, Apache-2.0. Native illustrated app discovery.
   Supplied copy and pinned icons; no store access, download or executable controls. */
(()=>{
  'use strict';
  const duration=6.28,clamp=p=>Math.max(0,Math.min(1,p)),out=(p,n=4)=>1-(1-clamp(p))**n;
  const back=(p,a)=>{const t=clamp(p)-1;return 1+(a+1)*t**3+a*t*t;};
  const span=(t,a,d,e=p=>out(p))=>e(clamp((t-a)/d));
  const inOut=p=>{p=clamp(p);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  function yoyo(t,start,d,e=p=>out(p)) {
    const elapsed=t-start;if(elapsed<0||elapsed>=2*d)return 0;
    return e(elapsed<=d?elapsed/d:2-elapsed/d);
  }
  function state(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Finite app installation time required');
    const t=Math.max(0,Math.min(duration,seconds)),enter=span(t,0,.47,p=>back(p,1.6)),exit=span(t,5.44,.48,p=>p**5);
    const row=span(t,1.72,.2,p=>back(p,1.7)),rowReturn=span(t,1.93,.22),tap=span(t,2.02,.42,p=>out(p,3));
    const press=span(t,2.04,.1,p=>p**4),release=span(t,2.14,.14,p=>back(p,2));
    const detail=span(t,2.32,.46,p=>out(p,5)),card=span(t,2.34,.42,p=>back(p,1.2)),icon=span(t,2.47,.32,p=>back(p,1.8));
    const button=span(t,2.66,.24,p=>back(p,2)),panel=span(t,2.92,.38),small=span(t,3.04,1.2,inOut),large=span(t,3.02,1.42,inOut);
    const ringOut=span(t,4.44,.16),status=span(t,4.62,.34,p=>back(p,1.8)),speed=span(t,5.42,.26,p=>p**5),speedOut=span(t,5.74,.2);
    const shadow=span(t,5.35,.16),shadowOut=span(t,5.62,.28),windowAtInterrupt=1+.012*yoyo(1.25,.92,.18,p=>out(p,3));
    const windowScale=t<1.25?1+.012*yoyo(t,.92,.18,p=>out(p,3)):windowAtInterrupt+(1.014-windowAtInterrupt)*yoyo(t,1.25,.14,p=>out(p,3));
    const panelBase=.96+.04*span(3.18,2.92,.38),pulses=[[3.18,1.025],[3.56,1.03],[3.9,1.035],[4.28,1.04]];
    const panelScale=t<3.18?.96+.04*panel:panelBase+pulses.reduce((v,[a,target])=>v+(target-panelBase)*yoyo(t,a,.12,a===4.28?p=>back(p,1.7):p=>out(p)),0);
    return {time:t,phone:{alpha:clamp(enter),y:760*(1-enter)+1050*exit,scale:(.82+.18*enter+.025*yoyo(t,4.7,.18,p=>back(p,1.5)))*(1-.22*exit),rotation:-2.5*(1-enter)-3.5*exit},
      storeTitle:span(t,.28,.28),avatar:span(t,.34,.24,p=>back(p,1.8)),search:span(t,.4,.26),
      rows:Array.from({length:8},(_,i)=>span(t,.48+i*.035,.36)),scroll:span(t,.62,1.2,p=>out(p,5)),windowScale,
      selection:1+.035*row*(1-rowReturn),outline:3*clamp(row),tapAlpha:t<2.02?0:.95*(1-tap),tapScale:.25+1.9*tap,press:1-.18*press*(1-release),
      detail:{alpha:detail,y:620*(1-detail),scale:.92+.08*detail,cardY:56*(1-card),cardScale:.96+.04*card,
        icon:clamp(icon),iconScale:.55+.45*icon,iconRotation:-8*(1-icon),title:span(t,2.54,.28),body:span(t,2.6,.24)},
      button:{alpha:clamp(button),scale:.72+.28*button,label:1-span(t,2.86,.16),labelY:-18*span(t,2.86,.16),
        ring:span(t,2.96,.16)*(1-ringOut),ringScale:1-.65*ringOut,progress:small,ready:span(t,4.5,.18),open:span(t,4.56,.16)},
      facts:Array.from({length:3},(_,i)=>span(t,2.78+i*.05,.3)),panel:{alpha:panel,y:42*(1-panel),scale:panelScale,progress:large,percent:Math.round(large*100)},
      status:{alpha:clamp(status),y:22*(1-status),scale:.9+.1*status},shadow:{alpha:shadow*(1-shadowOut),scale:1-.2*shadow+.8*shadowOut},
      speed:{alpha:speed*(1-speedOut),y:-220+640*speed},wipe:span(t,5.86,.42,p=>out(p,3))};
  }
  function geometry(width,height) {
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<800||height<450)throw new Error('Unsupported app installation board');
    const h=Math.min(760,height-16),w=h*462/952;
    return {width:w,height:h,x:(width-w)/2,y:(height-h)/2,unit:w/232,sourceUnit:h/952};
  }
  function scrollTarget(rowTop,rowHeight,windowHeight,contentHeight) {
    if(![rowTop,rowHeight,windowHeight,contentHeight].every(Number.isFinite)||rowTop<0||rowHeight<=0||windowHeight<rowHeight||contentHeight<windowHeight)
      throw new Error('Invalid app list geometry');
    return Math.max(0,Math.min(contentHeight-windowHeight,rowTop-windowHeight*.2));
  }
  function mount(host,c,onsets,data,make) {
    const heading=make('h2','prod-heading',c.heading,host,true);make('p','interface-source',c.source,host,true);
    const board=make('div','app-install-board',null,host);
    Object.assign(board.style,{top:'0',height:'calc(100% - 54px)'});
    const g=geometry(board.clientWidth,board.clientHeight);
    Object.assign(heading.style,{position:'absolute',left:'0',top:'54px',width:Math.min(480,g.x-32)+'px',maxHeight:host.clientHeight*.65+'px',lineHeight:'1.16',zIndex:'2'});
    board.style.setProperty('--install-unit',g.unit);board.dataset.interfaceVariant='app-install';
    const shadow=make('i','app-install-shadow',null,board);
    Object.assign(shadow.style,{width:g.width*1.2+'px',left:g.x-g.width*.1+'px',top:g.y+g.height-20*g.unit+'px'});
    const phone=make('div','app-install-phone',null,board);
    Object.assign(phone.style,{left:g.x+'px',top:g.y+'px',width:g.width+'px',height:g.height+'px'});
    const screen=make('div','app-install-screen',null,phone),island=make('i','app-install-island',null,screen);
    island.setAttribute('aria-hidden','true');
    const store=make('div','app-install-store',null,screen),top=make('div','app-install-top',null,store);
    const storeTitle=make('h3','app-install-store-title',c.ui.title,top),avatar=make('i','app-install-avatar',null,top);
    const search=make('p','app-install-search',c.ui.query,store),viewport=make('div','app-install-window',null,store),list=make('div','app-install-list',null,viewport);
    const rows=c.items.map((item,i)=>{
      const row=make('div','app-install-row',null,list),icon=make('img','app-install-icon',null,row);icon.src=data.icons[item.icon];icon.alt='';
      const copy=make('div','app-install-row-copy',null,row),label=make('h4','app-install-row-title',item.label,copy),body=make('p','app-install-row-body',item.body,copy);
      const get=make('span','app-install-get',c.ui.get,row);row.dataset.appIndex=String(i);return {row,icon,label,body,get};
    });
    const selected=rows[c.selected],tap=make('i','app-install-tap',null,selected.row);
    const detail=make('div','app-install-detail',null,screen),card=make('div','app-install-card',null,detail),hero=make('div','app-install-hero',null,card);
    const icon=make('img','app-install-detail-icon',null,hero);icon.src=data.icons[c.items[c.selected].icon];icon.alt='';
    const intro=make('div','app-install-intro',null,hero),title=make('h3','app-install-detail-title',c.items[c.selected].label,intro);
    const description=make('p','app-install-description',c.detail.body,intro),button=make('div','app-install-button',null,intro);
    const install=make('span','app-install-install-label',c.ui.get,button),open=make('span','app-install-open-label',c.ui.open,button);
    const svg=(tag,attrs,parent)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));parent.appendChild(n);return n;};
    const ring=(parent,cls,size,radius,stroke)=>{
      const el=svg('svg',{class:cls,viewBox:`0 0 ${size} ${size}`,'aria-hidden':'true'},parent);
      svg('circle',{class:'app-install-ring-track',cx:size/2,cy:size/2,r:radius,fill:'none','stroke-width':stroke},el);
      const arc=svg('circle',{class:'app-install-ring-progress',cx:size/2,cy:size/2,r:radius,fill:'none','stroke-width':stroke,'stroke-linecap':'round'},el);
      const length=arc.getTotalLength();arc.setAttribute('stroke-dasharray',String(length));return {el,arc,length};
    };
    const small=ring(button,'app-install-ring',28,11,4),facts=make('div','app-install-facts',null,card);
    const factNodes=c.detail.facts.map(f=>{const row=make('div','app-install-fact',null,facts);make('p','app-install-fact-label',f.label,row);make('p','app-install-fact-value',f.value,row);return row;});
    const panel=make('div','app-install-progress',null,card),big=ring(panel,'app-install-big-ring',160,70,18),percent=make('span','app-install-percent','0%',panel);
    const ready=make('div','app-install-ready',c.ui.ready,card),check=svg('svg',{viewBox:'0 0 24 24','aria-hidden':'true'},ready);
    svg('path',{d:'M5 12l4 4 10-10',fill:'none',stroke:'currentColor','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'},check);
    const lines=make('div','app-install-speed',null,board);
    [[-310,70,210],[304,130,240],[-232,260,300],[228,220,320]].forEach(([x,y,h])=>{
      const n=make('i','',null,lines);Object.assign(n.style,{left:board.clientWidth/2+x*g.sourceUnit+'px',top:y*g.sourceUnit+'px',height:h*g.sourceUnit+'px'});
    });
    const wipe=make('div','app-install-wipe',null,board);
    const target=scrollTarget(selected.row.offsetTop,selected.row.offsetHeight,viewport.clientHeight,list.scrollHeight);
    const show=(n,alpha,y=0,scale=1)=>{n.style.opacity=String(alpha);n.style.transform=`translateY(${y*g.sourceUnit}px) scale(${scale})`;};
    return time=>{
      const clock=window.ShortCreatorCarousels.clock(time,onsets,duration),s=state(clock.time),p=window.ShortCreatorStory.progress(time,onsets[0]);
      heading.style.opacity=String(out(p));heading.style.transform=`translateY(${24*(1-out(p))}px)`;
      show(phone,s.phone.alpha,s.phone.y,s.phone.scale);phone.style.transform+=` rotate(${s.phone.rotation}deg)`;
      show(storeTitle,s.storeTitle,26*(1-s.storeTitle));show(avatar,clamp(s.avatar),0,.4+.6*s.avatar);show(search,s.search,18*(1-s.search));
      list.style.transform=`translateY(${-target*s.scroll}px)`;viewport.style.transform=`scale(${s.windowScale})`;
      rows.forEach(({row},i)=>{show(row,s.rows[i],44*(1-s.rows[i]),i===c.selected?s.selection:1);});
      selected.row.style.outline=`${s.outline*g.sourceUnit}px solid color-mix(in srgb,var(--cyan),transparent 66%)`;
      selected.get.style.transform=`scale(${s.press})`;
      tap.style.left=selected.get.offsetLeft+selected.get.offsetWidth/2-10*g.unit+'px';tap.style.top=selected.get.offsetTop+selected.get.offsetHeight/2-10*g.unit+'px';
      tap.style.opacity=String(s.tapAlpha);tap.style.transform=`scale(${s.tapScale})`;
      show(detail,s.detail.alpha,s.detail.y,s.detail.scale);show(card,1,s.detail.cardY,s.detail.cardScale);
      show(icon,s.detail.icon,0,s.detail.iconScale);icon.style.transform+=` rotate(${s.detail.iconRotation}deg)`;
      show(title,s.detail.title,20*(1-s.detail.title));show(description,s.detail.body,14*(1-s.detail.body));show(button,s.button.alpha,0,s.button.scale);
      show(install,s.button.label,s.button.labelY);open.style.opacity=String(s.button.open);
      button.style.background=`color-mix(in srgb,var(--cyan),var(--lime) ${100*s.button.ready}%)`;
      small.el.style.opacity=String(s.button.ring);small.el.style.transform=`rotate(-90deg) scale(${s.button.ringScale})`;
      small.arc.setAttribute('stroke-dashoffset',String(small.length*(1-s.button.progress)));
      factNodes.forEach((n,i)=>show(n,s.facts[i],28*(1-s.facts[i])));show(panel,s.panel.alpha,s.panel.y,s.panel.scale);
      big.arc.setAttribute('stroke-dashoffset',String(big.length*(1-s.panel.progress)));percent.textContent=s.panel.percent+'%';
      show(ready,s.status.alpha,s.status.y,s.status.scale);shadow.style.opacity=String(s.shadow.alpha);shadow.style.transform=`scaleX(${s.shadow.scale})`;
      lines.style.opacity=String(s.speed.alpha);lines.style.transform=`translateY(${s.speed.y*g.sourceUnit}px)`;wipe.style.opacity=String(s.wipe);
      board.dataset.appInstall=JSON.stringify({clock,target,unit:g.unit,sourceUnit:g.sourceUnit,...s});
    };
  }
  window.ShortCreatorAppInstall={duration,state,yoyo,geometry,scrollTarget,mount};
})();
