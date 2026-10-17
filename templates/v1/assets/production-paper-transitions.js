/* HyperFrames scribble and torn-paper source mechanics, Apache-2.0.
   Closed presets affect verified image pixels inside the native screen only. */
(() => {
  'use strict';
  const kinds=Object.freeze(['scribble','paper-collage','paper-rip']);
  const clamp=p=>Math.max(0,Math.min(1,p));
  const seeded=initial=>{let s=initial;return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};};
  function scribbles() {
    const hash=n=>{const x=Math.sin(n*127.1+17*311.7)*43758.5453;return (x-Math.floor(x))*2-1;};
    const height=1080/7;
    return Array.from({length:7},(_,b)=>{
      const points=[[-80,b*height+height/2+hash(b*17)*20]];
      for(let i=1;i<=7;i++)points.push([2080*i/7-80,b*height+height/2+(i%2?-1:1)*height*.32+hash(b*17+i)*16]);
      return {path:points.map(([x,y],i)=>(i?'L ':'M ')+x.toFixed(1)+' '+y.toFixed(1)).join(' '),width:Math.ceil(height*.85)};
    });
  }
  function scribbleState(progress,index) {
    const p=clamp(progress),t=p*2.2,sign=index%2?-1:1;
    const draw=clamp((t-index*.04)/.55)**3,clear=1-(1-clamp((t-1.42-index*.035)/.5))**3;
    return {offset:sign*(1-draw-clear),solid:clamp((t-.8)/.12)*(1-clamp((t-1.42)/.15)),hidden:t>=2.17};
  }
  function scraps() {
    const next=seeded(0x2c6b8f19),range=(lo,hi)=>lo+next()*(hi-lo),sides=[[0,0,100,0,0,1],[100,0,100,100,-1,0],[100,100,0,100,0,-1],[0,100,0,0,1,0]];
    range(75,105); // Retain the source RNG sequence even for its outward preset.
    return Array.from({length:6},(_,i)=>{
      const w=100/3+6.4,h=50+6.4,x=i%3*100/3-3.2+range(-1,1),y=Math.floor(i/3)*50-3.2+range(-1,1),poly=[];
      for(const s of sides)for(let k=0;k<6;k++) {
        const t=(k===0?0:k+range(-.3,.3))/6,d=range(-1.1,1.1);
        poly.push([(s[0]+(s[2]-s[0])*t+s[4]*d*100/w).toFixed(2),(s[1]+(s[3]-s[1])*t+s[5]*d*100/h).toFixed(2)]);
      }
      const tone=Math.floor(next()*3),angle=Math.atan2(y+h/2-50,x+w/2-50),ux=Math.cos(angle),uy=Math.sin(angle),arc=ux>0?-9:9;
      const rotation=range(8,15)*(next()<.5?-1:1),start=i===0?.1:.1+(i-range(0,.4))*.16;
      return {x,y,w,h,poly,tone,exitX:ux*130,exitY:uy*130,arcX:-uy*arc,arcY:ux*arc,rotation,start};
    });
  }
  function scrapState(scrap,progress,width,height) {
    const p=clamp((clamp(progress)*1.35-scrap.start)/.45),q=p**3,arc=1-(1-p)**2;
    return {x:scrap.exitX/100*width*q+scrap.arcX/100*Math.min(width,height)*arc,
      y:scrap.exitY/100*height*q+scrap.arcY/100*Math.min(width,height)*arc,rotation:scrap.rotation*q,p};
  }
  function tearTable() {
    const next=seeded(0x7a9e11cf),noise=count=>{
      const knots=Array.from({length:count+1},()=>next()*2-1);
      return v=>{const f=v*count,i=Math.min(count-1,Math.floor(f)),u=f-i,q=u*u*(3-2*u);return knots[i]+(knots[i+1]-knots[i])*q;};
    };
    const wander=noise(6),core=noise(14),px=100/1920;
    const edge=Array.from({length:181},(_,i)=>{
      const v=i/180,rim=Math.min(14,Math.max(6,6+8*(core(v)*.5+.5)+(next()*2-1)*3));
      return {y:v*100,offset:(v-.5)*3+(wander(v)*40+(next()*2-1)*3)*px,rim:rim*px};
    });
    return {edge,margin:Math.max(...edge.map(r=>Math.abs(r.offset)))+14*px+.5};
  }
  function tearState(table,progress) {
    const p=clamp(progress),q=p<.3?.2*(p/.3)**2:.2+.8*(1-(1-(p-.3)/.7)**3),boundary=-table.margin+(100+2*table.margin)*q;
    return {q,boundary,x:3*q,rotation:1.5*q,
      edge:table.edge.map(r=>({y:r.y,x:boundary+r.offset,rimX:boundary+r.offset-r.rim}))};
  }
  function mount(view,images,onsets,kind) {
    if(!kinds.includes(kind))throw new Error('Unknown paper transition');
    const width=view.clientWidth,height=view.clientHeight;
    const make=(tag,css,parent=view)=>{const n=document.createElement(tag);n.className=css;parent.appendChild(n);return n;};
    const svgNode=(tag,attrs,parent)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));parent.appendChild(n);return n;};
    const overlay=make('div','paper-swap-overlay');overlay.setAttribute('aria-hidden','true');
    view.dataset.screenSwap=kind;images.forEach(n=>n.classList.add('screen-swap-image'));
    let animate;
    if(kind==='scribble') {
      const solid=make('div','paper-swap-solid',overlay),svg=svgNode('svg',{viewBox:'0 0 1920 1080',width:'100%',height:'100%',preserveAspectRatio:'none'},overlay);
      const paths=scribbles().map(s=>{const n=svgNode('path',{d:s.path,fill:'none',stroke:'var(--lime)','stroke-width':s.width,'stroke-linecap':'round','stroke-linejoin':'round'},svg),length=n.getTotalLength();n.style.strokeDasharray=String(length);return {n,length};});
      animate=p=>paths.forEach(({n,length},i)=>{const s=scribbleState(p,i);n.style.strokeDashoffset=String(s.offset*length);solid.style.opacity=String(s.solid);});
    } else {
      const table=kind==='paper-rip'?tearTable():scraps();
      const layers=images.slice(0,-1).map(image=>{
        const layer=make('div','paper-swap-layer',overlay);
        const copy=(parent,left=0,top=0)=>{const n=make('img','paper-swap-copy',parent);n.src=image.getAttribute('src');n.alt='';Object.assign(n.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});return n;};
        if(kind==='paper-collage')return {layer,parts:table.map((s,i)=>{
          const n=make('div','paper-swap-scrap',layer);Object.assign(n.style,{left:s.x/100*width+'px',top:s.y/100*height+'px',width:s.w/100*width+'px',height:s.h/100*height+'px',zIndex:String(6-i),clipPath:'polygon('+s.poly.map(([x,y])=>x+'% '+y+'%').join(',')+')'});
          copy(n,-s.x/100*width,-s.y/100*height);return n;
        })};
        const rim=make('div','paper-swap-rim',layer),sheet=make('div','paper-swap-sheet',layer);copy(sheet);return {layer,rim,sheet};
      });
      animate=(p,active)=>{
        layers.forEach((l,i)=>{
          l.layer.style.visibility=i===active-1?'visible':'hidden';
          if(kind==='paper-collage')l.parts.forEach((n,j)=>{const s=scrapState(table[j],p,width,height);n.style.transform=`translate(${s.x}px,${s.y}px) rotate(${s.rotation}deg)`;});
          else {
            const s=tearState(table,p),points=s.edge.slice().reverse();
            l.layer.style.transform=`translateX(${s.x}%) rotate(${s.rotation}deg)`;
            l.layer.style.filter=p===0||p===1?'none':`drop-shadow(0 ${height*.01111*s.q}px ${height*.02222*s.q}px rgba(0,0,0,.25))`;
            const poly=key=>'polygon(100% 0%, 100% 100%, '+points.map(r=>r[key].toFixed(2)+'% '+r.y.toFixed(2)+'%').join(',')+')';
            l.sheet.style.clipPath=poly('x');l.rim.style.clipPath=poly('rimX');
          }
        });
      };
    }
    return time=>{
      let active=0;onsets.forEach((t,i)=>{if(time>=t)active=i;});
      const p=window.ShortCreatorStory.progress(time,onsets[active]);
      overlay.style.display=active>0&&p>0&&p<1?'block':'none';
      const shown=active===0?0:kind==='scribble'?(p<.5?active-1:active):p===0?active-1:active;
      images.forEach((image,i)=>{image.style.visibility=i===shown?'visible':'hidden';image.style.clipPath='none';});
      animate(p,active);view.dataset.swapIndex=String(active);view.dataset.swapProgress=String(p);view.dataset.paperSwap=kind;
    };
  }
  window.ShortCreatorPaperTransitions=Object.freeze({kinds,scribbles,scribbleState,scraps,scrapState,tearTable,tearState,mount});
})();
