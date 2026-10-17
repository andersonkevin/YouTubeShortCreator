/* HyperFrames text-selection and collaborator cursor mechanics, Apache-2.0.
   Illustrated actions only: exact supplied copy and verified local stills. */
(() => {
  'use strict';
  const clamp=p=>Math.max(0,Math.min(1,p)),seg=(t,a,b)=>clamp((t-a)/(b-a));
  const out=p=>1-(1-clamp(p))**4;
  const smooth=p=>{const q=clamp(p);return q<.5?4*q**3:1-(-2*q+2)**3/2;};
  const mix=(a,b,p)=>p===0?{...a}:p===1?{...b}:({x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p});
  const waypoints=Object.freeze([
    {start:[10,16],gather:[42,40],rotation:[-10,2]},
    {start:[66,12],gather:[52,38],rotation:[8,-3]},
    {start:[76,38],gather:[57,49],rotation:[12,3]},
    {start:[64,76],gather:[53,59],rotation:[-8,4]},
    {start:[20,76],gather:[43,60],rotation:[9,-4]},
    {start:[7,46],gather:[38,50],rotation:[-12,3]}
  ]);
  function phraseParts(text,phrase) {
    const at=text.indexOf(phrase),end=at+phrase.length;
    if(!phrase||at<0||text.indexOf(phrase,at+1)>=0)throw new Error('Selection must occur exactly once');
    const all=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text)];
    const edges=new Set([...all.map(part=>part.index),text.length]);
    if(!edges.has(at)||!edges.has(end))throw new Error('Selection must contain complete graphemes');
    return {before:text.slice(0,at),chars:all.filter(part=>part.index>=at&&part.index<end).map(part=>part.segment),after:text.slice(end)};
  }
  function boundary(boxes,fraction) {
    const i=Math.max(0,Math.min(boxes.length-1,Math.floor(fraction))),b=boxes[i],p=clamp(fraction-i);
    return {x:b.left+(b.right-b.left)*p,y:b.top+b.height/2};
  }
  function textState(seconds,g) {
    if(!Number.isFinite(seconds)||!g.chars.length)throw new Error('Invalid text selection geometry');
    const t=Math.max(0,Math.min(4.2,seconds)),n=g.chars.length,u=g.W/1920;
    const selected=t>=1.65?n:Math.round(n*.9*smooth(seg(t,.65,1.6)));
    const f=t<.65?0:n*.9*smooth(seg(t,.65,1.6));
    const first=g.chars[0];let lineRight=first.right;
    for(let i=1;i<n&&g.chars[i].top===first.top;i++)lineRight=g.chars[i].right;
    const barX=Math.max(g.card.left+16*u,Math.min((first.left+lineRight)/2-g.toolbar.width/2,g.card.right-16*u-g.toolbar.width));
    const barY=first.top-12*u-g.toolbar.height,bar=out(seg(t,1.75,1.93));
    const target={x:barX+g.button.left+g.button.width*.55,y:barY+g.button.top+g.button.height*.6};
    const start={x:g.W*1.08,y:g.H*.34},press=boundary(g.chars,0),release=boundary(g.chars,n*.9);
    const aside={x:g.card.right+80*u,y:target.y+140*u};
    let tip=t<.5?mix(start,press,out(t/.5)):t<.65?press:t<2?boundary(g.chars,f):
      t<2.5?mix(release,target,out(seg(t,2,2.5))):t<2.95?target:mix(target,aside,smooth(seg(t,2.95,3.4)));
    if(t>3.4)tip=mix(aside,{x:g.W*1.16,y:aside.y},seg(t,3.4,4.2)**3);
    const inside=Math.min(tip.x-g.para.left,g.para.right-tip.x,tip.y-g.para.top,g.para.bottom-tip.y);
    const overBar=bar>0&&tip.x>barX-10*u&&tip.x<barX+g.toolbar.width+10*u&&tip.y>barY-10*u&&tip.y<barY+g.toolbar.height+10*u;
    const beam=overBar?0:seg(inside,-24*u,0);
    const dip=at=>t<at||t>at+.231?1:t<at+.07?1-.12*seg(t,at,at+.07):.88+.12*out(seg(t,at+.07,at+.231));
    return {selected,bold:t>=2.77,tip,beam,scale:dip(.6)*dip(2.7),barX,barY,bar,barScale:.96+.04*bar,buttonScale:t>=2.7&&t<2.82?.92:1};
  }
  function collaborator(index,entry,exit,W,H) {
    const path=waypoints[index];
    if(!path||![entry,exit,W,H].every(Number.isFinite)||W<=0||H<=0)throw new Error('Invalid collaborator state');
    const t=clamp(entry)*2.05,reveal=out(seg(t,index*.055,index*.055+.26));
    const start={x:W*path.start[0]/100,y:H*path.start[1]/100};
    const outside={x:start.x,y:path.start[1]<50?-H*.22:H*1.22};
    const delay=Math.min(index*.035,1.35*.35),gather=(1-Math.cos(Math.PI*seg(t,.7+delay,2.05)))/2;
    let tip=t<.7?mix(outside,start,reveal):mix(start,{x:W*path.gather[0]/100,y:H*path.gather[1]/100},gather);
    const q=clamp(exit)**3;
    tip=mix(tip,{x:tip.x,y:H*1.28},q);
    return {tip,rotation:path.rotation[0]+(path.rotation[1]-path.rotation[0])*gather,scale:.92+.08*reveal};
  }
  function shape(tag,attrs,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));parent.appendChild(node);return node;
  }
  function offset(node,root) {
    let x=0,y=0;while(node&&node!==root){x+=node.offsetLeft;y+=node.offsetTop;node=node.offsetParent;}
    return {left:x,top:y};
  }
  function box(node,root) {const p=offset(node,root);return {...p,right:p.left+node.offsetWidth,bottom:p.top+node.offsetHeight,width:node.offsetWidth,height:node.offsetHeight};}
  function mountText(host,c,onsets,make) {
    make('h2','prod-heading',c.heading,host,true);make('p','interface-source',c.source,host,true);
    const board=make('div','interface-board document-board',null,host);board.dataset.interfaceStyle=c.style;
    const rows=c.items.map((item,index)=>{
      const row=make('div','interface-row document-row',null,board);row.dataset.interfaceIndex=String(index);
      const card=make('div','document-card',null,row);make('h3','interface-label',item.label,card,true);
      const para=make('p','interface-body document-paragraph',null,card,true),parts=phraseParts(item.body,item.selection);
      para.appendChild(document.createTextNode(parts.before));
      const chars=parts.chars.map(char=>make('span','document-char',char,para));para.appendChild(document.createTextNode(parts.after));
      const toolbar=make('div','document-toolbar',null,row);
      const buttons=['M7 4h6.5a4 4 0 0 1 0 8H7zM7 12h7.5a4 4 0 0 1 0 8H7z','M14 4h-4M14 20h-4M13.5 4 10.5 20',
        'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1','M5 5h14v10H10l-5 4z'].map((d,i)=>{
        const node=make('span','document-button',null,toolbar);node.setAttribute('aria-label',['Bold','Italic','Link','Comment'][i]);
        const svg=shape('svg',{viewBox:'0 0 24 24','aria-hidden':'true'},node);shape('path',{d,fill:'none',stroke:'currentColor','stroke-width':2.2,'stroke-linecap':'round','stroke-linejoin':'round'},svg);return node;
      });
      const cursor=make('div','document-cursor',null,row),arrow=shape('svg',{viewBox:'0 0 24 24',class:'document-arrow'},cursor);
      shape('path',{d:'M5 3 L5 19 L9 15 L12 22 L15 20.5 L11.5 14 L18 14 Z',fill:'white',stroke:'var(--purple)','stroke-width':1.4,'stroke-linejoin':'round'},arrow);
      const beam=shape('svg',{viewBox:'0 0 12 32',class:'document-beam'},cursor);
      for(const [stroke,width] of [['white',3.4],['var(--purple)',1.3]])shape('path',{d:'M2.5 2Q6 2 6 4.5Q6 2 9.5 2M2.5 30Q6 30 6 27.5Q6 30 9.5 30M6 4.5V27.5',fill:'none',stroke,'stroke-width':width,'stroke-linecap':'round'},beam);
      const arrowSize=board.clientWidth*.055,beamSize=1.2*arrowSize*(19/24)*32/28;
      Object.assign(arrow.style,{width:arrowSize+'px',height:arrowSize+'px',left:-5/24*arrowSize+'px',top:-3/24*arrowSize+'px'});
      Object.assign(beam.style,{height:beamSize+'px',width:beamSize*.375+'px',left:-beamSize*.1875+'px',top:-beamSize/2+'px'});
      return {row,card,para,chars,toolbar,buttons,cursor,arrow,beam};
    });
    return time=>{
      const active=window.ShortCreatorInterface.activeAt(time,onsets),states=[];
      rows.forEach(({row,card,para,chars,toolbar,buttons,cursor,arrow,beam},i)=>{
        const p=window.ShortCreatorStory.progress(time,onsets[i]);
        row.style.visibility=active===i?'visible':'hidden';row.dataset.interfaceProgress=String(p);
        chars.forEach(node=>{node.style.fontWeight='600';});
        const g={W:board.clientWidth,H:board.clientHeight,card:box(card,board),para:box(para,board),chars:chars.map(node=>box(node,board)),
          toolbar:{width:toolbar.offsetWidth,height:toolbar.offsetHeight},button:box(buttons[0],toolbar)};
        const s=textState(p*4.2,g);
        chars.forEach((node,j)=>{node.classList.toggle('document-selected',j<s.selected);node.style.fontWeight=s.bold?'800':'600';});
        Object.assign(toolbar.style,{left:s.barX+'px',top:s.barY+'px',opacity:String(s.bar),transform:`translateY(${4*g.W/1920*(1-s.bar)}px) scale(${s.barScale})`});
        buttons[0].classList.toggle('document-bold',s.bold);buttons[0].style.transform=`scale(${s.buttonScale})`;
        cursor.style.transform=`translate(${s.tip.x}px,${s.tip.y}px) scale(${s.scale})`;
        arrow.style.opacity=String(1-s.beam);beam.style.opacity=String(s.beam);
        row.dataset.textSelection=JSON.stringify(s);row.dataset.textGeometry=JSON.stringify(g);states.push(s);
      });
      board.dataset.interfaceActive=String(active);board.dataset.interfacePresentation=JSON.stringify({variant:'text-select',active,rows:states});
    };
  }
  function mountCollaboration(host,spec,onsets,data,make) {
    const c=spec.content;make('h2','prod-heading',c.heading,host,true);make('p','resource-source',c.source,host,true);
    const board=make('div','media-board collaboration-board',null,host),view=make('div','collaboration-view',null,board);
    const image=make('img','collaboration-image',null,view);image.src=data.assets[c.items[0].image];image.alt=c.items[0].label;
    make('p','collaboration-label',c.items[0].label,board,true);
    const actors=c.actors.map((name,i)=>{
      const actor=make('div','collaboration-actor',null,view);actor.dataset.actor=String(i);
      actor.style.setProperty('--actor-color',i%2?'var(--cyan)':'var(--lime)');
      make('i','collaboration-glow',null,actor);
      const svg=shape('svg',{viewBox:'0 0 24 24',class:'collaboration-arrow'},actor);
      shape('path',{d:'M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L5.94 2.47a.5.5 0 0 0-.44.74Z',fill:'var(--actor-color)',stroke:'white','stroke-width':1.35,'stroke-linejoin':'round'},svg);
      make('span','collaboration-name',name,actor);return actor;
    });
    return time=>{
      const entry=window.ShortCreatorStory.progress(time,onsets[0]),exit=window.ShortCreatorStory.progress(time,onsets[1]),W=view.clientWidth,H=view.clientHeight;
      actors.forEach((actor,i)=>{const s=collaborator(i,entry,exit,W,H);
        actor.style.transform=`translate(${s.tip.x}px,${s.tip.y}px) rotate(${s.rotation}deg) scale(${s.scale})`;
        actor.dataset.actorState=JSON.stringify(s);});
      board.dataset.collaborationState=JSON.stringify({entry,exit,W,H});
    };
  }
  window.ShortCreatorCursorScenes={waypoints,phraseParts,boundary,textState,collaborator,mountText,mountCollaboration};
})();
