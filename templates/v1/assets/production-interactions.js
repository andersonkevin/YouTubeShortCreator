/* HyperFrames cursor, drag, marquee, context-menu and touch mechanics.
   Native frame clock; verified before/after stills supply every screen result. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const out=x=>1-(1-clamp(x))**4, cubic=x=>1-(1-clamp(x))**3;
  const inOut=x=>{const p=clamp(x);return p<.5?8*p**4:1-8*(1-p)**4;};
  const seg=(p,a,b)=>clamp((p-a)/(b-a));
  const mix=(a,b,p)=>({x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p});
  const back=(p,s)=>{const x=clamp(p)-1;return 1+(s+1)*x**3+s*x*x;};
  const reached=(time,onset)=>Math.floor(time*30+1e-7)>=Math.ceil(onset*30);

  // Same quadratic control point as cursor-drag-drop and cursor-marquee-select.
  function arc(a,b,bend,p) {
    const u=clamp(p),v=1-u,cx=(a.x+b.x)/2-(b.y-a.y)*bend,cy=(a.y+b.y)/2+(b.x-a.x)*bend;
    return {x:v*v*a.x+2*v*u*cx+u*u*b.x,y:v*v*a.y+2*v*u*cy+u*u*b.y};
  }
  function press(p,depth=.1) {
    return p<1/3?1-depth*(p*3)**3:1-depth+depth*cubic((p-1/3)*1.5);
  }
  function menuBox(anchor,W,H,count) {
    const width=Math.min(W-24,Math.max(360,W*.32)),height=count*52+24,gap=6;
    const left=anchor.x+width+gap>W-12,up=anchor.y+height+gap>H-12;
    return {x:Math.max(12,Math.min(W-width-12,anchor.x+(left?-width-gap:gap))),
      y:Math.max(12,Math.min(H-height-12,anchor.y+(up?-height-gap:gap))),width,height,left,up};
  }
  function geometry(c,W,H,imageWidth,imageHeight) {
    const fit=window.ShortCreatorAnnotations.regionPixels(W,H,imageWidth,imageHeight,{x:0,y:0,width:1,height:1});
    const r=window.ShortCreatorAnnotations.regionPixels(W,H,imageWidth,imageHeight,c.target);
    const anchor=c.style==='marquee'?{x:r.x,y:r.y}:{x:r.x+r.width/2,y:r.y+r.height/2};
    const end=c.style==='drag'?{x:fit.x+c.drop.x*fit.width+r.width/2,y:fit.y+c.drop.y*fit.height+r.height/2}
      :c.style==='swipe'?{x:anchor.x,y:fit.y+c.to_y*fit.height}
      :c.style==='marquee'?{x:r.x+r.width,y:r.y+r.height}:anchor;
    const menu=c.style==='menu'?menuBox(anchor,W,H,c.items.length):null;
    const item=menu?{x:menu.x+menu.width*.34,y:menu.y+12+c.pick*52+52*.55}:null;
    return {W,H,fit,r,anchor,end,menu,item};
  }
  function state(c,time,onsets,g) {
    const phase=i=>window.ShortCreatorStory.progress(time,onsets[i]);
    const approach=phase(1),action=phase(2),exit=phase(onsets.length-1);
    const acting=reached(time,onsets[2]),touch=c.style==='tap'||c.style==='swipe';
    const start={x:g.anchor.x,y:g.H*1.16};
    let tip=mix(start,g.anchor,out(approach)),scale=1,result=false,selection=0;
    let contactOpacity=touch?.68*out(approach):0,contactScale=.82+.18*cubic(approach),pulseOpacity=0,pulseScale=.76;
    let carry={x:0,y:0},lift=0,cardScale=1,tilt=0,menuOpacity=0,menuScale=.95,rows=[],selected=-1;
    let end=g.end,aside;
    if(acting) {
      if(c.style==='drag') {
        const travel=seg(action,.125,.75),delta={x:g.end.x-g.anchor.x,y:g.end.y-g.anchor.y};
        const carryAt=p=>arc({x:0,y:0},delta,-.12,inOut(seg(p,.125,.75)));
        carry=carryAt(action);tip={x:g.anchor.x+carry.x,y:g.anchor.y+carry.y};
        lift=action<.75?seg(action,0,.125):1-seg(action,.75,1);
        const smooth=lift*lift*(3-2*lift);
        cardScale=action<.75?1+.04*smooth:1.04-.04*back(seg(action,.75,1),2.2);
        const lag=carryAt(action-.06),ahead=carryAt(action+.02);
        tilt=Math.max(-3,Math.min(3,(ahead.x-lag.x)/.08/g.W*4.8))*lift;
        scale=action<.75?1-.1*cubic(seg(action,0,.125)):.9+.1*cubic(seg(action,.75,.875));
        result=travel===1;
      } else if(c.style==='marquee') {
        const p=cubic(seg(action,.125,.875));tip=arc(g.anchor,g.end,.06,p);
        selection=p;scale=action<.25?1-.1*Math.sin(Math.PI*action/.25):1;
      } else if(c.style==='menu') {
        const select=phase(3),selecting=reached(time,onsets[3]);
        const bloom=action===1?1:1-2**(-10*action),shut=selecting?seg(select,.8,1):0;
        menuOpacity=Math.min(1,action*3)*(1-shut);menuScale=.95+.05*bloom-.03*shut;
        rows=c.items.map((_,i)=>out(seg(action,i*.04,i*.04+.72)));
        tip=selecting?mix(g.anchor,g.item,inOut(seg(select,0,.6))):g.anchor;
        selected=selecting&&select>=.6&&shut===0?c.pick:-1;
        scale=selecting?press(seg(select,.6,.93),.12):press(action);
        result=selecting&&select>=.75;end=g.item;
      } else if(c.style==='swipe') {
        const p=seg(action,.075,.75),travel=p<.41?.41*(p/.41)**3:.41+.59*out((p-.41)/.59);
        tip=mix(g.anchor,g.end,travel);scale=1;
        contactScale=1;contactOpacity=.68*(1-seg(action,.75,1)**2);result=action>=.75;
      } else {
        tip=g.anchor;scale=press(action,c.style==='tap'?.22:.1);
        if(c.style==='tap') {
          const release=seg(action,.25,.71),pulse=seg(action,.25,1);
          contactScale=action<.25?1-.22*(action/.25)**5:.78+.26*release**3;
          contactOpacity=.68*(1-release**3);tip={x:g.anchor.x,y:g.anchor.y-g.H*.05*release**3};
          pulseOpacity=action<.25?0:.58*(1-cubic(pulse));pulseScale=.76+.38*cubic(pulse);
          result=action>=.25;
        } else {contactOpacity=0;result=action>=1/3;}
      }
      // Move away from the result, then physically leave the image board.
      const finish=c.style==='menu'?phase(3):action;
      aside={x:Math.max(24,Math.min(g.W-24,end.x+g.W*.045)),y:Math.max(24,Math.min(g.H-24,end.y+g.W*.035))};
      if(!touch&&finish>.875)tip=mix(end,aside,out(seg(finish,.875,1)));
      if(!touch&&exit>0)tip=mix(aside,{x:aside.x,y:g.H*1.16},exit**3);
    }
    if(touch){tip=acting?tip:g.anchor;contactOpacity*=1-exit;}
    const rect={x:Math.min(g.anchor.x,tip.x),y:Math.min(g.anchor.y,tip.y),
      width:Math.abs(g.anchor.x-tip.x),height:Math.abs(g.anchor.y-tip.y)};
    if(c.style==='marquee'&&selection===1)Object.assign(rect,g.r);
    return {approach,action,exit,acting,tip,scale,result,selection,rect,carry,lift,cardScale,tilt,
      contactOpacity,contactScale,pulseOpacity,pulseScale,menuOpacity,menuScale,rows,selected,touch};
  }
  const set=(node,attrs)=>{for(const [name,value] of Object.entries(attrs))node.setAttribute(name,String(value));};
  function shape(tag,attrs,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);set(node,attrs);parent.appendChild(node);return node;
  }
  function mount(host,c,onsets,data,make) {
    make('h2','prod-heading',c.heading,host,true);
    const board=make('div','interaction-board',null,host);
    const world=c.camera?make('div','interaction-world',null,board):board;
    const before=make('img','interaction-still',null,world);
    before.src=data.assets[c.image];before.alt='';
    const after=c.result?make('img','interaction-still interaction-result',null,world):null;
    if(after){after.src=data.assets[c.result];after.alt='';}
    const crop=c.style==='drag'?make('div','interaction-crop',null,world):null;
    const copy=crop?make('img','',null,crop):null;
    if(copy){copy.src=data.assets[c.image];copy.alt='';}
    const svg=shape('svg',{class:'interaction-overlay'},world);
    const selection=shape('rect',{fill:'var(--lime)','fill-opacity':.13,stroke:'var(--lime)','stroke-width':3},svg);
    const pulse=shape('circle',{fill:'none',stroke:'var(--lime)','stroke-width':4},svg);
    const contact=shape('circle',{fill:'var(--lime)',stroke:'white','stroke-width':2},svg);
    const cursor=shape('g',{'data-interaction-cursor':'true'},svg);
    shape('path',{d:'M5 3 L5 19 L9 15 L12 22 L15 20.5 L11.5 14 L18 14 Z',fill:'white',stroke:'var(--purple)','stroke-width':1.4},cursor);
    const menu=c.style==='menu'?make('div','interaction-menu',null,board):null;
    const rows=menu?c.items.map(item=>make('div','interaction-menu-item',item,menu,true)):[];
    // Menu sits below the pointer; SVG coordinates always refer to the same board.
    if(menu)board.appendChild(svg);
    const label=make('p','interaction-label',c.label,host,true);
    make('p','interaction-source',c.source,host,true);
    let g=null,pointerUpdate=null,camera=null;
    return time=>{
      if(!g) {
        g=geometry(c,board.clientWidth,board.clientHeight,before.naturalWidth,before.naturalHeight);
        set(svg,{viewBox:`0 0 ${g.W} ${g.H}`,width:g.W,height:g.H});
        if(crop){
          Object.assign(crop.style,{left:g.r.x+'px',top:g.r.y+'px',width:g.r.width+'px',height:g.r.height+'px',transformOrigin:'50% 50%'});
          Object.assign(copy.style,{width:g.fit.width+'px',height:g.fit.height+'px',left:(g.fit.x-g.r.x)+'px',top:(g.fit.y-g.r.y)+'px'});
        }
        if(menu)Object.assign(menu.style,{left:g.menu.x+'px',top:g.menu.y+'px',width:g.menu.width+'px',height:g.menu.height+'px',
          transformOrigin:`${g.menu.left?'100%':'0'} ${g.menu.up?'100%':'0'}`});
        const stateAt=t=>state(c,t,onsets,g);
        pointerUpdate=window.ShortCreatorPointerStyles.mount(svg,board,c,g,stateAt,cursor);
        if(c.camera)camera=window.ShortCreatorPointerStyles.makeCamera(onsets,g,stateAt);
      }
      const s=state(c,time,onsets,g),size=g.W*.07;
      board.style.opacity=String(out(window.ShortCreatorStory.progress(time,onsets[0])));
      if(after)after.style.visibility=s.result?'visible':'hidden';
      if(crop){crop.style.visibility=s.acting&&!s.result?'visible':'hidden';
        crop.style.transform=`translate(${s.carry.x}px,${s.carry.y}px) rotate(${s.tilt}deg) scale(${s.cardScale})`;
        crop.style.boxShadow=`0 ${12*s.lift}px ${24*s.lift}px rgba(0,0,0,.4)`;}
      const r=c.style==='marquee'?s.rect:g.r;
      set(selection,{x:r.x,y:r.y,width:r.width,height:r.height,opacity:c.style==='marquee'&&s.acting?1:0});
      set(cursor,{transform:`translate(${s.tip.x} ${s.tip.y}) scale(${size/24*s.scale}) translate(-5 -3)`,opacity:s.touch?0:1});
      set(contact,{cx:s.tip.x,cy:s.tip.y,r:size*.32*s.contactScale,opacity:s.contactOpacity});
      set(pulse,{cx:g.anchor.x,cy:g.anchor.y,r:Math.max(size*.5,g.r.height/2)*s.pulseScale,opacity:s.pulseOpacity});
      if(menu){menu.style.opacity=String(s.menuOpacity);menu.style.transform=`scale(${s.menuScale})`;
        rows.forEach((row,i)=>{row.style.opacity=String(s.rows[i]??0);row.style.transform=`translateY(${-4*(1-(s.rows[i]??0))}px)`;
          row.classList.toggle('interaction-selected',i===s.selected);});}
      label.style.opacity=s.acting?'1':'0';
      pointerUpdate(time,s);
      if(camera){const view=camera(time);world.style.transform=view.z===1?'none':`translate(${view.x}px,${view.y}px) scale(${view.z})`;
        board.dataset.interactionCamera=JSON.stringify(view);}
      board.dataset.interactionState=JSON.stringify(s);
      board.dataset.interactionGeometry=JSON.stringify(g);
    };
  }
  window.ShortCreatorInteractions={arc,press,menuBox,geometry,state,mount};
})();
