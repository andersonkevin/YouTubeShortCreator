/* HyperFrames radial, avatar, orbit and pressure mechanics, Apache-2.0.
   Native records supply every label and relationship. No sample identities or
   statistics are imported. Silhouettes may pass; readable labels cannot overlap. */
(() => {
  'use strict';
  const kinds=Object.freeze(['avatar-cloud','radial-surround','nucleus-orbit','pressure-surround']);
  const clamp=p=>Math.max(0,Math.min(1,p)),mix=(a,b,p)=>a+(b-a)*p;
  const out=(p,n=3)=>1-(1-clamp(p))**n;
  const inOut=p=>{const q=clamp(p);return q<.5?4*q**3:1-(-2*q+2)**3/2;};
  const back=(p,s=1.7)=>{const q=clamp(p)-1;return 1+(s+1)*q**3+s*q**2;};
  function pose(style,index,count,p,W,H) {
    if(!kinds.includes(style)||!Number.isFinite(p))throw new Error('Unknown radial presentation');
    const q=clamp(p),s={x:W/2,y:H/2,scale:mix(.94,1,out(q,4)),rotation:0,opacity:out(q,4),line:out(q)};
    if(index===0)return s;
    const i=index-1,n=count-1,angle=-Math.PI/2+i/n*Math.PI*2;
    if(style==='avatar-cloud') {
      s.x+=Math.cos(angle)*W*(.356+Math.sin((i+1)*2.37)*.024);
      s.y+=Math.sin(angle)*H*(194/600+Math.sin((i+1)*1.61)*18/600);
      s.scale=mix(.92,1,out(q/.55));s.opacity=out(q/.55);s.line=out((q-.55)/.45);
    } else if(style==='radial-surround') {
      const a=(-90+Math.ceil(i/2)*360/n*(i%2===1?1:-1))*Math.PI/180;
      const close=inOut((q-.55/1.3)/(.75/1.3));
      s.x+=Math.cos(a)*W*mix(.39,.30,close);s.y+=Math.sin(a)*H*mix(.38,.30,close);
      s.scale=out(q/(.55/1.3),4);s.opacity=s.scale;s.line=out(q);
    } else if(style==='nucleus-orbit') {
      const r=[23,29,35][i%3]/35,a=angle-(210+i%3*70)*Math.PI/180*(1-out(q));
      s.x+=Math.cos(a)*W*.36*r;s.y+=Math.sin(a)*H*.35*r;
      s.scale=mix(.82,1,back(q/(.45/2.2)));s.opacity=clamp(out(q/(.45/2.2)));
      s.line=out(q);
    } else {
      const dx=Math.cos(angle),dy=Math.sin(angle),edge=.64/Math.max(Math.abs(dx),Math.abs(dy));
      const band=((i*5)%7)/6,pressure=1/3,travel=out(q);
      const rx=(27+band*9-pressure*(12+band*6))/100,ry=(25+band*10-pressure*(11+band*6))/100;
      s.x+=dx*W*mix(edge,Math.min(.39,rx*1.4),travel);
      s.y+=dy*H*mix(edge,ry*1.15,travel);
      s.scale=mix(.94,1,travel);s.opacity=travel;s.rotation=((i*29)%17-8)*mix(1.8,1,travel);s.line=travel;
    }
    if(q===1){s.scale=1;s.opacity=1;s.line=1;}
    return s;
  }
  function bounds(s,w,h) {
    const angle=Math.abs(s.rotation)*Math.PI/180,W=(w*Math.cos(angle)+h*Math.sin(angle))*s.scale;
    const H=(h*Math.cos(angle)+w*Math.sin(angle))*s.scale;
    return {left:s.x-W/2,right:s.x+W/2,top:s.y-H/2,bottom:s.y+H/2};
  }
  const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  function readable(states,progresses,w,h,W,H) {
    const order=states.map((_,i)=>i).sort((a,b)=>Number(progresses[b]===1)-Number(progresses[a]===1)||a-b);
    const boxes=[],visible=states.map(()=>false);
    for(const i of order) {
      const b=bounds(states[i],w,h);
      if(progresses[i]<=0||b.left<1||b.right>W-1||b.top<1||b.bottom>H-1||boxes.some(other=>overlaps(b,other)))continue;
      boxes.push(b);visible[i]=true;
    }
    return visible;
  }
  function mount(board,c,onsets,make) {
    const W=board.clientWidth,H=board.clientHeight,w=Math.min(220,W*.19),h=c.style==='avatar-cloud'?112:78;
    board.classList.add('network-layouts');board.dataset.networkLayout=c.style;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('width',W);svg.setAttribute('height',H);svg.classList.add('network-lines');board.appendChild(svg);
    const rings=[];
    if(c.style==='nucleus-orbit')for(const r of [23,29,35]) {
      const ring=document.createElementNS(svg.namespaceURI,'ellipse');
      for(const [key,value] of Object.entries({cx:W/2,cy:H/2,rx:W*.36*r/35,ry:H*.35*r/35,fill:'none',stroke:'var(--line)','stroke-width':1}))ring.setAttribute(key,String(value));
      svg.appendChild(ring);rings.push({ring,r});
    }
    const nodes=c.nodes.map((node,i)=>{
      const shell=make('div','network-shell',null,board),card=make('div','network-node',node.label,shell,true);
      Object.assign(shell.style,{width:w+'px',height:h+'px'});
      Object.assign(card.style,{width:w+'px',height:h+'px'});card.dataset.networkNode=String(i);
      if(c.style==='avatar-cloud')card.dataset.initial=Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(node.label))[0]?.segment||'';
      let line=null;
      if(i) {
        line=document.createElementNS(svg.namespaceURI,'path');
        for(const [key,value] of Object.entries({fill:'none',stroke:'var(--lime)','stroke-width':2,'data-network-parent':node.parent}))line.setAttribute(key,String(value));
        svg.appendChild(line);
      }
      return {shell,card,line};
    });
    return time=>{
      const progress=onsets.map(onset=>window.ShortCreatorStory.progress(time,onset));
      const states=progress.map((p,i)=>pose(c.style,i,c.nodes.length,p,W,H));
      const visible=readable(states,progress,w,h,W,H);
      for(const {ring,r} of rings) {
        const entry=out(progress[0]),scale=mix(.86,1,entry);
        ring.setAttribute('rx',String(W*.36*r/35*scale));ring.setAttribute('ry',String(H*.35*r/35*scale));
        ring.setAttribute('opacity',String(.38*entry));
      }
      nodes.forEach(({shell,card,line},i)=>{
        const s=states[i];Object.assign(shell.style,{left:s.x-w/2+'px',top:s.y-h/2+'px',
          opacity:String(s.opacity),transform:`rotate(${s.rotation}deg) scale(${s.scale})`,visibility:progress[i]>0?'visible':'hidden'});
        card.style.visibility=visible[i]?'visible':'hidden';card.dataset.networkProgress=String(progress[i]);
        if(line) {
          const start=states[c.nodes[i].parent],length=Math.hypot(s.x-start.x,s.y-start.y);
          line.setAttribute('d',`M ${start.x} ${start.y} L ${s.x} ${s.y}`);
          line.setAttribute('stroke-dasharray',`${length} ${length}`);line.setAttribute('stroke-dashoffset',String(length*(1-s.line)));
          line.setAttribute('opacity',String(progress[i]>0?s.line:0));
        }
      });
      board.dataset.networkState=JSON.stringify({style:c.style,progress,states,visible,width:w,height:h});
    };
  }
  window.ShortCreatorNetworkLayouts={kinds,pose,bounds,readable,mount};
})();
