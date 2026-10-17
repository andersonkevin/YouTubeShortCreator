/* HyperFrames product-promo canvas, Apache-2.0. Native illustrative collaboration
   with explicit content, measured targets and deterministic source choreography. */
(() => {
  'use strict';
  const duration=11.9,clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,p)=>a+(b-a)*p;
  const out=(x,n=3)=>1-(1-clamp(x))**n;
  const back=(x,s=1.2)=>{const p=clamp(x)-1;return 1+(s+1)*p**3+s*p*p;};
  const smooth=x=>{const p=clamp(x);return p<.5?8*p**4:1-(-2*p+2)**4/2;};
  const point=(a,b,p)=>({x:mix(a.x,b.x,p),y:mix(a.y,b.y,p)});
  const chars=text=>Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),part=>part.segment);
  function tap(t,at) {
    if(t<at||t>=at+.32)return 1;
    return t<at+.1?1-.16*((t-at)/.1)**3:.84+.16*out((t-at-.1)/.22);
  }
  function state(seconds,count,resolved) {
    if(!Number.isFinite(seconds)||!Number.isInteger(count)||count<1||count>60||typeof resolved!=='boolean')throw new Error('Invalid product canvas state');
    const t=seconds>=duration-1e-9?duration:Math.max(0,seconds),reflow=smooth((t-9.1)/.8);
    return {t,frame:out((t-.5)/.6,2),scale:back((t-.5)/.6,1.4),ui:out((t-1)/.4,2),
      title:out((t-1.2)/.7,2),body:out((t-1.4)/.58),action:out((t-1.7)/.5,2),
      widthLabel:back((t-1.9)/.4,1.6),heightLabel:back((t-2)/.4,1.6),
      selection:out((t-5.3)/.2,2),comment:out((t-6.5)/.1,2),pin:back((t-6.5)/.5),
      bubble:out((t-6.9)/.4,2),bubbleX:-10*(1-back((t-6.9)/.4,1.5)),
      typed:Math.min(count,Math.max(0,Math.ceil((t-7.1)*30-1e-9))),
      panel:out((t-8)/.4,4)*(1-clamp((t-11.5)/.4)**4),
      dragged:out((t-8.9)/.2,2)*(1-out((t-10.5)/.2,2)),
      dragScale:(.9+.1*out((t-8.9)/.2,2))*(1-.2*out((t-10.5)/.2,2)),
      reflow,heroScale:1-.2*reflow,
      cards:[9.9,10.1,10.3].map(at=>({alpha:out((t-at)/.6,2),y:50*(1-back((t-at)/.6,1.5))})),
      resolved:resolved?out((t-10.7)/.3,2):0,check:resolved?back((t-10.7)/.4,1.6):0,
      designerTap:tap(t,.5),engineerTap:tap(t,5.3)*tap(t,8.9)*tap(t,9.9),reviewerTap:tap(t,6.5)};
  }
  function geometry(W,H) {
    if(![W,H].every(Number.isFinite)||W<800||H<450)throw new Error('Product canvas needs a native composition slot');
    const frame={x:32,y:24,w:W-64,h:H-48},stacked=H>W*.9;
    const hero={x:stacked?48:24,y:frame.h*(stacked?.12:.22),w:frame.w*(stacked?1:.48)-(stacked?96:0),endY:44};
    const cardY=frame.h*(stacked?.54:.64),cardW=stacked?frame.w-48:(frame.w-72)/3;
    const cardH=stacked?(frame.h-cardY-48)/3:frame.h-cardY-24;
    const cards=Array.from({length:3},(_,i)=>({x:24+(stacked?0:i*(cardW+12)),y:cardY+(stacked?i*(cardH+12):0),w:cardW,h:cardH}));
    const comment={x:frame.x+(stacked?48:frame.w*.55),y:frame.y+(stacked?frame.h*.38:70),w:stacked?frame.w-96:frame.w*.43};
    const panel={x:0,y:0,w:Math.min(320,W*.34),h:H};
    const pick={x:panel.w*.5,y:96},drop={x:frame.x+2+cards[0].x+cards[0].w/2,y:frame.y+2+cards[0].y+cards[0].h/2};
    return {W,H,frame,hero,cards,comment,panel,pick,drop,stacked};
  }
  function cursors(t,g,action) {
    const center={x:g.W/2,y:g.H/2},aside={x:g.frame.x+8,y:g.frame.y+50};
    let designer=t<.5?point({x:center.x,y:g.H*1.22},center,back(t/.5)):
      t<1.1?center:point(center,aside,out((t-1.1)/.9));
    const entry={x:-g.W*.22,y:g.H*.42},stage={x:g.frame.x+g.frame.w*.2,y:g.frame.y+g.frame.h*.4};
    // Source overwrite:auto interrupts the first cursor tween before it finishes.
    const interrupted=point(entry,stage,back(1/1.2));
    let engineer=t<4.5?point(entry,stage,back((t-3.5)/1.2)):
      t<8.3?point(interrupted,action,back((t-4.5)/.8)):
      t<9.1?point(action,g.pick,back((t-8.3)/.6)):
      point(g.pick,g.drop,back((t-9.1)/.8));
    const reviewStart={x:g.W*1.16,y:g.H*1.16},reviewStage={x:g.frame.x+g.frame.w*.8,y:g.frame.y+g.frame.h*.8};
    const pin={x:g.comment.x,y:g.comment.y};
    let reviewer=t<5.5?point(reviewStart,reviewStage,back((t-3.7)/1.5)):
      t<7.1?point(reviewStage,pin,back((t-5.5)/1)):
      point(pin,{x:g.W-50,y:g.H-50},out((t-7.1)/.7));
    if(t>=11.1) {
      const p=clamp((t-11.1)/.8)**3;
      designer=point(designer,{x:-g.W*.25,y:designer.y},p);
      engineer=point(engineer,{x:g.W*1.25,y:engineer.y},p);
      reviewer=point(reviewer,{x:reviewer.x,y:g.H*1.3},p);
    }
    return {designer,engineer,reviewer};
  }
  function svg(parent,tag,attrs) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));parent.appendChild(node);return node;
  }
  const box=(node,g)=>Object.assign(node.style,{left:g.x+'px',top:g.y+'px',width:g.w+'px',height:g.h===undefined?'auto':g.h+'px'});
  function mount(host,c,onsets,make) {
    make('h2','prod-heading',c.heading,host,true);make('p','interface-source',c.source,host,true);
    const board=make('div','interface-board product-canvas-board',null,host);board.dataset.interfaceStyle='steps';
    const g=geometry(board.clientWidth,board.clientHeight),frame=make('div','product-canvas-frame',null,board);box(frame,g.frame);
    const nav=make('div','product-canvas-nav',null,frame);nav.setAttribute('aria-hidden','true');for(let i=0;i<4;i++)make('i','',null,nav);
    const hero=make('div','product-canvas-hero',null,frame);box(hero,g.hero);
    const title=make('h3','product-canvas-title',c.hero.title,hero,true),body=make('p','product-canvas-body',c.hero.body,hero,true);
    const action=make('div','product-canvas-action',c.hero.action,hero,true);
    const selection=make('div','product-canvas-selection',null,action);selection.setAttribute('aria-hidden','true');for(let i=0;i<4;i++)make('i','',null,selection);
    const card=(parent,item)=>{const node=make('div','product-canvas-card',null,parent);make('h3','product-canvas-card-label',item.label,node,true);make('p','product-canvas-card-body',item.body,node,true);return node;};
    const cards=c.items.map((item,i)=>{const node=card(frame,item);box(node,g.cards[i]);return node;});
    const widthLabel=make('span','product-canvas-dimension product-canvas-width',String(Math.round(g.frame.w)),board);
    const heightLabel=make('span','product-canvas-dimension product-canvas-height',String(Math.round(g.frame.h)),board);
    widthLabel.style.left=(g.frame.x+g.frame.w/2)+'px';heightLabel.style.top=g.H/2+'px';
    const comment=make('div','product-canvas-comment',null,board);box(comment,g.comment);
    const pin=make('div','product-canvas-pin',null,comment),check=svg(pin,'svg',{viewBox:'0 0 24 24','aria-hidden':'true'});
    svg(check,'path',{d:'M5 12l4 4 10-10',fill:'none',stroke:'var(--purple)','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'});
    const bubble=make('p','product-canvas-bubble',null,comment,true),text=chars(c.comment.text);
    bubble.setAttribute('aria-label',c.comment.text);
    const panel=make('div','product-canvas-assets',null,board);box(panel,g.panel);
    const panelItems=c.items.map(item=>make('div','product-canvas-asset',item.label,panel,true));
    const dragged=card(board,c.items[0]);dragged.classList.add('product-canvas-dragged');
    box(dragged,{x:0,y:0,w:g.cards[0].w,h:g.cards[0].h});dragged.setAttribute('aria-hidden','true');
    const actors=c.actors.map((name,i)=>{
      const actor=make('div','product-canvas-cursor',null,board);actor.setAttribute('aria-hidden','true');
      actor.style.setProperty('--actor-color',i===1?'var(--cyan)':'var(--lime)');
      const size=board.clientWidth*.055,pointer=svg(actor,'svg',{viewBox:'0 0 24 24',width:size,height:size});
      svg(pointer,'path',{d:'M5 3 L5 19 L9 15 L12 22 L15 20.5 L11.5 14 L18 14 Z',fill:'var(--actor-color)',stroke:'white','stroke-width':1.4,'stroke-linejoin':'round'});
      pointer.style.left=-5/24*size+'px';pointer.style.top=-3/24*size+'px';make('span','product-canvas-cursor-label',name,actor);
      return actor;
    });
    const actionBox=action.getBoundingClientRect(),origin=board.getBoundingClientRect();
    const target={x:actionBox.left-origin.left+actionBox.width/2,y:actionBox.top-origin.top+actionBox.height/2};
    if(g.hero.endY+hero.offsetHeight*.8>g.cards[0].y-12)throw new Error('Product canvas hero exceeds its approved type layout; shorten the supplied copy');
    if(g.stacked&&g.hero.y+hero.offsetHeight>g.comment.y-g.frame.y-12)throw new Error('Product canvas hero overlaps the supplied comment');
    board.dataset.productGeometry=JSON.stringify({...g,action:target});
    return time=>{
      const clock=window.ShortCreatorCarousels.clock(time,onsets,duration),s=state(clock.time,text.length,c.comment.resolved),p=cursors(s.t,g,target);
      board.dataset.productCanvas=JSON.stringify({...s,cursors:p,clock});
      frame.style.opacity=String(s.frame);frame.style.transform=`scale(${s.scale})`;nav.style.opacity=String(s.ui);
      title.style.opacity=String(s.title*s.ui);body.style.opacity=String(s.body*s.ui);action.style.opacity=String(s.action*s.ui);
      hero.style.transform=`translateY(${(g.hero.endY-g.hero.y)*s.reflow}px) scale(${s.heroScale})`;
      action.style.outline=s.selection>0?'2px solid var(--cyan)':'none';selection.style.opacity=String(s.selection);
      widthLabel.style.transform=`translateX(-50%) scale(${s.widthLabel})`;heightLabel.style.transform=`rotate(90deg) scale(${s.heightLabel})`;
      comment.style.opacity=String(s.comment);pin.style.transform=`scale(${s.pin})`;pin.style.background=s.resolved>0?'var(--lime)':'var(--cyan)';check.style.transform=`scale(${s.check})`;
      bubble.textContent=text.slice(0,s.typed).join('');bubble.style.opacity=String(s.bubble);bubble.style.transform=`translateX(${s.bubbleX}px)`;
      panel.style.transform=`translateX(${-g.panel.w*(1-s.panel)}px)`;panelItems.forEach(n=>n.style.visibility=s.panel>0?'visible':'hidden');
      dragged.style.opacity=String(s.dragged);dragged.style.transform=`translate(${p.engineer.x-g.cards[0].w/2}px,${p.engineer.y-g.cards[0].h/2}px) scale(${s.dragScale})`;
      cards.forEach((node,i)=>{node.style.opacity=String(s.cards[i].alpha);node.style.transform=`translateY(${s.cards[i].y}px)`;});
      actors.forEach((node,i)=>{const name=['designer','engineer','reviewer'][i],tip=p[name];node.style.transform=`translate(${tip.x}px,${tip.y}px) scale(${s[name+'Tap']})`;});
    };
  }
  window.ShortCreatorProductCanvas={duration,chars,tap,state,geometry,cursors,mount};
})();
