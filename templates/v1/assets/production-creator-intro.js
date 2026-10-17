/* HyperFrames blue-sweater-intro-video, Apache-2.0, credited to Joe Sai.
   Fixed source choreography with native brand slots and supplied profile copy.
   No upstream identity, soundtrack, GSAP, model calls or social actions. */
(()=>{
  'use strict';
  const duration=11.76,clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,p)=>a+(b-a)*p;
  const out=(p,n)=>1-(1-p)**n,inside=(p,n)=>p<.5?(2*p)**n/2:1-(-2*p+2)**n/2;
  const ease={linear:p=>p,o3:p=>out(p,3),o4:p=>out(p,4),o5:p=>out(p,5),i3:p=>p**3,
    io3:p=>inside(p,3),io4:p=>inside(p,4),sine:p=>Math.sin(p*Math.PI/2),sineIO:p=>(1-Math.cos(Math.PI*p))/2,
    expo:p=>p===0||p===1?p:1-2**(-10*p),back:p=>1+2.7*(p-1)**3+1.7*(p-1)**2};
  const base={a:1,x:0,y:0,s:1,sx:1,sy:1,r:0,b:0};
  // Only this module's fixed records reach this helper. Later source tweens capture
  // interrupted values per property, including equal-start overwrite:auto pairs.
  function track(initial,steps) {
    const values={...base,...initial},channels=new Map();
    const at=(key,t)=>{
      const list=channels.get(key)||[];let step;
      for(const item of list)if(item.at<=t)step=item;else break;
      return step?mix(step.from,step.to,step.length?ease[step.ease](clamp((t-step.at)/step.length)):1):values[key];
    };
    for(const [start,length,target,easing='o4'] of [...steps].sort((a,b)=>a[0]-b[0]))for(const [key,to] of Object.entries(target)) {
      const from=at(key,start),list=channels.get(key)||[];
      list.push({at:start,length,from,to,ease:easing});channels.set(key,list);
    }
    return t=>Object.fromEntries(Object.keys(values).map(key=>[key,at(key,t)]));
  }
  const warm=track({a:0,x:-820,sx:.42,b:14},[[.02,.22,{a:1,x:-25,sx:1,b:0},'o3'],[.25,.24,{a:0,x:620,b:18},'i3']]);
  const warmLayer=track({a:0},[[0,.01,{a:1}],[.4,.08,{a:0}]]);
  const intro=track({a:0},[[.44,.1,{a:1}],[1.56,.06,{a:0}]]);
  const title=track({a:0,y:26,b:10},[[.48,.46,{a:1,y:0,b:0},'expo'],[1.43,.03,{a:.26,b:4},'i3'],[1.47,.08,{a:0,y:-8,b:10},'i3']]);
  const remnants=[[-22,-10],[8,5],[32,-18],[-10,28]].map(([x,y],i)=>track({a:0,b:2},[
    [1.435+i*.004,.055,{a:.32,x,y,b:7},'o3'],[1.49,.07,{a:0,b:11},'i3']]));
  const burst=track({a:0},[[1.4,.02,{a:1}],[2.58,.14,{a:0,b:6},'i3']]);
  const star=track({a:0,s:.08,r:-20},[[1.43,.08,{a:1,s:.16,r:-6},'o3'],[1.55,.42,{s:1,r:0},'expo'],
    [2.12,.18,{x:118,y:-62,s:.16,a:.45},'io3'],[2.32,.12,{a:0},'i3']]);
  const paths=[
    {start:[-1,28],scatter:[-160,-96],drift:[-151,-126],select:[-82,-86],squeeze:[19,-68],release:[19,-68],fade:2.17},
    {start:[-11,5],scatter:[165,-123],drift:[153,-126],select:[61,-118],squeeze:[-81,-65],release:[-81,-65],fade:2.17},
    {start:[-3,-8],scatter:[169,-28],drift:[174,-24],select:[127,9],squeeze:[37,70],release:[-78,96],fade:2.33},
    {start:[-9,2],scatter:[-153,80],drift:[-157,76],select:[-133,39],squeeze:[-90,-40],release:[-90,-40],fade:2.17},
    {start:[-7,-13],scatter:[-10,129],drift:[-17,128],select:[-38,83],squeeze:[-67,-18],release:[-92,-87],fade:2.33}];
  const xy=([x,y])=>({x,y});
  const blocks=paths.map((p,i)=>track({a:0,...xy(p.start),s:.78,r:i%2?3:-3,b:8},[
    [1.455,.055,{a:1,s:1,r:0,b:0},'o4'],[1.5,.2,{...xy(p.scatter),r:i%2?2:-2},'sine'],
    [1.7,.2,{...xy(p.drift),r:i%2?1:-1},'sineIO'],[1.9,.2,{...xy(p.select),r:0},'sineIO'],
    [2.1,.07,{...xy(p.squeeze),s:1,r:0,b:.6},'sineIO'],[2.17,.05,{...xy(p.release),s:.84,r:0,b:1.5},'sineIO'],
    [p.fade,.05,{a:0,s:.38,b:7},'i3']]));
  const selection=track({a:0,sx:.06,sy:.1,b:3,w:550,h:176},[
    [1.96,.18,{a:1,sx:1,sy:1,x:42,y:52,b:0},'o3'],[2.16,.2,{x:220,y:158,w:640,h:190},'io3'],[2.33,.16,{a:0,b:5},'i3']]);
  const brand=track({a:0},[[2.08,.04,{a:1}],[2.9,.22,{a:0,y:26,b:9},'i3']]);
  const fragments=[[[112,-118,4],[88,-96],[20,-24],1],[[-12,78,5],[-22,56],[-8,18],1],
    [[38,70,7],[18,48],[6,14],.82],[[-82,-108,4],[-54,-78],[-18,-18],1],[[62,22,5],[38,12],[12,4],1]]
    .map(([from,carry,settle,a],i)=>track({a:0,x:from[0],y:from[1],b:from[2],s:.99},[
      [2.12+i*.004,.16,{a,...xy(carry),s:1,b:1.2},'sine'],[2.28+i*.003,.28,{a,...xy(settle),b:.35},'o4'],
      [2.31+i*.002,.14,{a:0,x:settle[0]+[8,-6,2,-8,6][i],y:settle[1]+[-6,7,4,-5,3][i],b:4},'o3']]));
  const wordmark=track({a:0,x:-12,y:8,s:.995,b:5},[[2.38,.24,{a:1,x:0,y:0,s:1,b:0},'o5']]);
  const ui=track({a:0},[[3.02,.08,{a:1}]]);
  const input=track({a:0,s:.88,y:92,b:14},[[3.05,.66,{a:1,s:1,y:0,b:0},'expo'],
    [4.14,.26,{s:1.32,x:300,y:-100},'io3'],[4.92,.74,{s:1,x:0,y:0},'io3'],[9.5,.4,{a:0,s:.93,y:26,b:12},'io4']]);
  const panelStar=track({a:0,s:.5,r:-16},[[3.18,.38,{a:1,s:1,r:0}],[9.5,.28,{a:0,s:.72,r:12},'io3']]);
  const placeholder=track({a:0,y:12},[[3.3,.34,{a:1,y:0}]]);
  const emptyTools=[0,1].map(i=>track({a:0,y:10},[[3.42+i*.06,.3,{a:1,y:0}]]));
  const empty=track({},[[4.12,.18,{a:0},'io3']]);
  const full=track({a:0},[[4.12,.18,{a:1},'io3'],[8.15,.16,{a:0},'io3']]);
  const thinkingPanel=track({a:0},[[8.15,.18,{a:1},'io3']]);
  const thinking=track({a:0},[[8.25,.3,{a:1}],[8.64,.18,{a:0},'io3']]);
  const result=track({a:0,y:12},[[8.82,.28,{a:1,y:0}],[9.5,.18,{a:0,y:-8},'io3']]);
  const send=track({a:0,s:.84},[[7.32,.24,{a:1,s:1}],[7.9,.08,{s:.86},'i3'],[7.98,.14,{s:1},'back']]);
  const trigger=track({},[[9.34,.08,{s:.88},'i3'],[9.42,.14,{s:1},'back']]);
  const profile=track({a:0,y:34,s:.88,b:12},[[9.86,.6,{a:1,y:0,s:1,b:0},'expo']]);
  // Source elastic release becomes one bounded back-eased release under the
  // approved motion doctrine; the explicit label change retains source timing.
  const follow=track({},[[10.88,.08,{s:.9},'i3'],[10.96,.28,{s:1},'back']]);
  const before=track({},[[10.96,.08,{a:0},'linear']]),after=track({a:0},[[10.99,.08,{a:1},'linear']]);
  const graphemes=text=>Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),p=>p.segment);
  function state(seconds,count) {
    if(!Number.isFinite(seconds)||!Number.isInteger(count)||count<1||count>180)throw new Error('Invalid creator intro state');
    const t=Math.max(0,Math.min(duration,seconds));
    const chars=Array.from({length:count},(_,i)=>clamp((t-4.18-(count===1?0:i*2.85/(count-1)))/.01));
    return {t,warm:warm(t),warmLayer:warmLayer(t),intro:intro(t),title:title(t),remnants:remnants.map(f=>f(t)),
      burst:burst(t),star:star(t),blocks:blocks.map(f=>f(t)),selection:selection(t),brand:brand(t),fragments:fragments.map(f=>f(t)),
      wordmark:wordmark(t),ui:ui(t),input:input(t),panelStar:panelStar(t),placeholder:placeholder(t),emptyTools:emptyTools.map(f=>f(t)),
      empty:empty(t),full:full(t),thinkingPanel:thinkingPanel(t),thinking:thinking(t),result:result(t),send:send(t),trigger:trigger(t),
      profile:profile(t),follow:follow(t),before:before(t),after:after(t),chars};
  }
  function geometry(W,H) {
    if(![W,H].every(Number.isFinite)||W<900||H<600)throw new Error('Creator intro needs a native composition slot');
    const unit=Math.min(W/1920,H/1080),inputW=Math.min(1000,W-160),cardW=Math.min(800,W-64);
    return {W,H,unit,input:{x:(W-inputW)/2,y:(H-340)/2,w:inputW,h:340},card:{x:(W-cardW)/2,y:(H-480)/2,w:cardW,h:480},
      logo:{x:W/2-Math.min(340,W*.3)/2,y:H/2-60,w:Math.min(340,W*.3),h:120},cursor:W*.055};
  }
  function camera(g,raw) {
    // Preserve native font sizes. Limit magnification/translation to the complete
    // panel envelope, including the empty panel's raised top and thinking offset.
    const s=Math.min(raw.s,(g.W-48)/g.input.w,(g.H-48)/(g.input.h+61));
    const l=g.input.x+g.input.w*(1-s)/2,r=l+g.input.w*s;
    const top=g.input.y+g.input.h*(1-s)/2-54*s,bottom=top+(g.input.h+61)*s;
    return {...raw,s,x:Math.max(24-l,Math.min(g.W-24-r,raw.x)),y:Math.max(24-top,Math.min(g.H-24-bottom,raw.y))};
  }
  function cursorTrack(g,targets) {
    const point=(x,y)=>({x:g.W/2+(x-960)*g.unit,y:g.H/2+(y-540)*g.unit});
    const off={x:g.W/2,y:g.H*1.25};
    return track({...off,r:-8},[
      [.44,.84,{...targets.title,r:-3},'o4'],[1.28,.15,{...targets.title,r:-6},'io3'],
      [1.56,.26,{...point(1540,112),r:-9},'io3'],[1.82,.14,{...point(380,252),r:-7},'io3'],
      [1.96,.14,{...point(930,478),r:-4},'io3'],[2.12,.14,{...point(1168,560),r:-4},'io3'],
      [2.34,.3,{...point(1256,587),r:-3},'io3'],[2.64,.46,{x:g.W*1.25},'i3'],
      [6.92,0,{x:targets.send.x,y:g.H*1.25,r:-6}],
      [6.92,.48,{x:targets.send.x,y:Math.min(g.H-80,targets.send.y+100),r:-5},'io3'],
      [7.44,.46,{...targets.send,r:-5},'io3'],[7.94,.28,{x:targets.send.x+42,y:targets.send.y},'o3'],
      [8.74,.6,{...targets.trigger,r:-6},'io3'],[9.96,.42,{x:targets.follow.x+100,y:g.card.y+68,r:-5},'io3'],
      [10.5,.36,{...targets.follow,r:-5},'io3'],[11,.16,{x:targets.follow.x+44,y:targets.follow.y+26},'o3'],
      [11.16,.6,{x:g.W*1.25},'i3']]);
  }
  function tap(t,at) {
    if(t<at||t>=at+.3)return 1;
    return t<at+.1?1-.16*((t-at)/.1)**3:.84+.16*out(clamp((t-at-.1)/.2),3);
  }
  const box=(n,g)=>Object.assign(n.style,{left:g.x+'px',top:g.y+'px',width:g.w+'px',height:g.h+'px'});
  function svg(parent,tag,attrs) {
    const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));parent.appendChild(n);return n;
  }
  function paint(n,p,unit=1) {
    n.style.opacity=String(clamp(p.a));n.style.transform=`translate(${p.x*unit}px,${p.y*unit}px) rotate(${p.r}deg) scale(${p.s*p.sx},${p.s*p.sy})`;
    n.style.filter=`blur(${p.b*unit}px)`;
  }
  function mount(host,c,onsets,data,make) {
    const board=make('div','creator-intro-board',null,host),g=geometry(host.clientWidth,host.clientHeight-54);
    const stage=make('div','creator-intro-stage',null,board);stage.style.height=g.H+'px';
    const label=make('p','creator-intro-label',c.label,board,true);
    const layer=name=>make('div','creator-intro-layer creator-'+name,null,stage);
    const warmNode=layer('warm'),warmBlock=make('div','creator-warm-block',null,warmNode);
    box(warmBlock,{x:g.W/2-360*g.unit,y:g.H/2-77*g.unit,w:720*g.unit,h:154*g.unit});
    const introNode=layer('intro'),titleNode=make('h2','creator-intro-title',c.heading,introNode,true);
    const letters=graphemes(c.heading),remnantNodes=remnants.map((_,i)=>{
      const n=make('span','creator-remnant',letters.slice(Math.floor(i*letters.length/4),Math.floor((i+1)*letters.length/4)).join(''),introNode);
      const [x,y]=[[-220,-44],[-42,-42],[155,-48],[-82,-4]][i];n.style.left=g.W/2+x*g.unit+'px';n.style.top=g.H/2+y*g.unit+'px';return n;
    });
    const burstNode=layer('burst'),mark=make('img','creator-star',null,burstNode);mark.src='assets/logo.png';mark.alt='';
    box(mark,{x:g.W/2-75*g.unit,y:g.H/2-85*g.unit,w:150*g.unit,h:150*g.unit});
    const blockNodes=[[735,418,162,90],[920,414,172,92],[1300,420,96,92],[790,648,172,94],[1042,642,90,96]].map(([x,y,w,h])=>{
      const n=make('div','creator-burst-block',null,burstNode);box(n,{x:g.W/2+(x-960)*g.unit,y:g.H/2+(y-540)*g.unit,w:w*g.unit,h:h*g.unit});return n;
    });
    const select=make('div','creator-selection',null,burstNode);select.style.left=g.W/2+(380-960)*g.unit+'px';select.style.top=g.H/2+(252-540)*g.unit+'px';
    const brandNode=layer('brand'),fragmentNodes=fragments.map((_,i)=>{
      const n=make('div','creator-logo-fragment',null,brandNode),img=make('img','',null,n);img.src='assets/logo.png';img.alt='';
      box(n,{x:g.logo.x+i*g.logo.w/5,y:g.logo.y,w:g.logo.w/5,h:g.logo.h});
      Object.assign(img.style,{width:g.logo.w+'px',height:g.logo.h+'px',left:-i*g.logo.w/5+'px'});return n;
    });
    const logo=make('img','creator-logo-complete',null,brandNode);logo.src='assets/logo.png';logo.alt='';box(logo,g.logo);
    const uiNode=layer('ui'),panelMark=make('img','creator-panel-mark',null,uiNode);panelMark.src='assets/logo.png';panelMark.alt='';
    box(panelMark,{x:g.input.x+24,y:g.input.y-105,w:84,h:42});
    const inputNode=make('div','creator-input',null,uiNode);box(inputNode,g.input);
    const panel=name=>make('div','creator-panel creator-panel-'+name,null,inputNode);
    const emptyNode=panel('empty'),fullNode=panel('full'),thinkingNode=panel('thinking');
    const placeholderNode=make('p','creator-placeholder',c.prompt.placeholder,emptyNode,true);
    const plus=n=>make('i','creator-plus',null,n);
    const model=n=>make('p','creator-model',c.prompt.model,n,true);
    const emptyPlus=plus(emptyNode),emptyModel=model(emptyNode);plus(fullNode);model(fullNode);plus(thinkingNode);model(thinkingNode);
    const prompt=make('p','creator-prompt',null,fullNode,true);prompt.setAttribute('aria-label',c.prompt.text);
    const text=graphemes(c.prompt.text),charNodes=text.map(letter=>make('span','',letter,prompt));
    const button=(parent,className,path)=>{const n=make('div',className,null,parent),art=svg(n,'svg',{viewBox:'0 0 32 32','aria-hidden':'true'});
      svg(art,'path',{d:path,fill:'none',stroke:'currentColor','stroke-width':3.3,'stroke-linecap':'round','stroke-linejoin':'round'});return n;};
    const sendNode=button(fullNode,'creator-send','M16 25V8M16 8L9 15M16 8L23 15');
    button(thinkingNode,'creator-send','M16 25V8M16 8L9 15M16 8L23 15');
    const thinkingLine=make('div','creator-thinking-line',null,thinkingNode),thinkingMark=make('img','',null,thinkingLine);thinkingMark.src='assets/logo.png';thinkingMark.alt='';
    make('p','creator-thinking-copy',c.prompt.thinking,thinkingLine,true);
    const resultNode=make('div','creator-result',null,thinkingNode),triggerNode=button(resultNode,'creator-trigger','M8 24L24 8M10 8H24V22');
    make('p','creator-result-copy',c.action,resultNode,true);
    const profileNode=make('div','creator-profile',null,uiNode);box(profileNode,g.card);
    make('div','creator-profile-cover',null,profileNode);
    const avatar=make('img','creator-avatar',null,profileNode);avatar.src=data.assets[c.profile.image];avatar.alt=c.profile.name;
    make('h3','creator-name',c.profile.name,profileNode,true);make('p','creator-handle',c.profile.handle,profileNode,true);make('p','creator-bio',c.profile.bio,profileNode,true);
    const followNode=make('div','creator-follow',null,profileNode),beforeNode=make('span','creator-before',c.profile.before,followNode,true);
    const afterNode=make('div','creator-after',null,followNode),check=svg(afterNode,'svg',{viewBox:'0 0 24 24','aria-hidden':'true'});
    svg(check,'path',{d:'M20 6L9 17L4 12',fill:'none',stroke:'currentColor','stroke-width':2.4,'stroke-linecap':'round','stroke-linejoin':'round'});
    make('span','',c.profile.after,afterNode,true);
    const cursor=svg(stage,'svg',{class:'creator-cursor',viewBox:'0 0 98 120','aria-hidden':'true'});
    svg(cursor,'path',{d:'M13 6L86 80L51 85L35 114L13 6Z',fill:'var(--cyan)',stroke:'var(--purple)','stroke-width':7,'stroke-linejoin':'round'});
    const ratio=g.cursor/98;Object.assign(cursor.style,{width:g.cursor+'px',height:120*ratio+'px',transformOrigin:`${13*ratio}px ${6*ratio}px`});
    const center=n=>{const a=n.getBoundingClientRect(),b=stage.getBoundingClientRect();return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2};};
    const targets={title:center(titleNode),send:center(sendNode),trigger:center(triggerNode),follow:center(followNode)},cursorAt=cursorTrack(g,targets);
    return seconds=>{
      const clock=window.ShortCreatorCarousels.clock(seconds,onsets,duration),s=state(clock.time,text.length),cam=camera(g,s.input),pointer=cursorAt(s.t);
      board.style.opacity=seconds<onsets[0]?'0':'1';
      paint(warmNode,s.warmLayer);paint(warmBlock,s.warm,g.unit);paint(introNode,s.intro);paint(titleNode,s.title,g.unit);
      remnantNodes.forEach((n,i)=>paint(n,s.remnants[i],g.unit));paint(burstNode,s.burst);paint(mark,s.star,g.unit);
      blockNodes.forEach((n,i)=>paint(n,s.blocks[i],g.unit));paint(select,s.selection,g.unit);select.style.width=s.selection.w*g.unit+'px';select.style.height=s.selection.h*g.unit+'px';
      paint(brandNode,s.brand,g.unit);fragmentNodes.forEach((n,i)=>paint(n,s.fragments[i],g.unit));paint(logo,s.wordmark,g.unit);
      paint(uiNode,s.ui);paint(inputNode,cam);paint(panelMark,s.panelStar);paint(emptyNode,s.empty);paint(fullNode,s.full);paint(thinkingNode,s.thinkingPanel);
      paint(placeholderNode,s.placeholder);paint(emptyPlus,s.emptyTools[0]);paint(emptyModel,s.emptyTools[1]);
      charNodes.forEach((n,i)=>{n.style.opacity=String(s.chars[i]);});paint(thinkingLine,s.thinking);paint(resultNode,s.result);paint(sendNode,s.send);paint(triggerNode,s.trigger);
      paint(profileNode,s.profile);paint(followNode,s.follow);paint(beforeNode,s.before);paint(afterNode,s.after);
      followNode.dataset.active=s.t>=10.96?'true':'false';
      const scale=[1.43,7.9,9.34,10.88].reduce((v,t)=>v*tap(s.t,t),1);
      cursor.style.transform=`translate(${pointer.x-13*ratio}px,${pointer.y-6*ratio}px) rotate(${pointer.r}deg) scale(${scale})`;
      board.dataset.creatorState=JSON.stringify({clock,t:s.t,camera:cam,cursor:{...pointer,scale},targets,typed:s.chars.filter(a=>a>0).length});
    };
  }
  window.ShortCreatorCreatorIntro={duration,graphemes,state,geometry,camera,cursorTrack,tap,mount};
})();
