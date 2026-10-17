/* HyperFrames hw-* geometry, curvature-weighted pen speed and stroke textures.
   Adapted for bounded image regions and the native seek clock. Apache-2.0. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  function hash(n,seed=1) {
    const value=Math.sin(n*127.1+seed*311.7)*43758.5453;
    return (value-Math.floor(value))*2-1;
  }
  function ellipse(w,h,seed) {
    const points=Array.from({length:14},(_,i)=>{
      const a=i/14*Math.PI*2,r=1+hash(i*13+5,seed)*.04;
      return [w/2+Math.cos(a)*w/2*r,h/2+Math.sin(a)*h/2*r];
    });
    const pair=p=>p.map(n=>n.toFixed(1)).join(' '),mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
    return 'M '+pair(mid(points[0],points[13]))+points.map((p,i)=>' Q '+pair(p)+' '+pair(mid(p,points[(i+1)%14]))).join('');
  }
  function box(w,h,seed,r=Math.min(26,w*.1,h*.2),amp=3.5) {
    const v=n=>hash(n,seed)*amp;
    return `M ${r+v(1)} ${v(2)} L ${w/2+v(3)} ${v(4)} L ${w-r+v(5)} ${v(6)}`+
      ` Q ${w+v(7)} ${v(8)} ${w+v(9)} ${r+v(10)} L ${w+v(11)} ${h/2+v(12)} L ${w+v(13)} ${h-r+v(14)}`+
      ` Q ${w+v(15)} ${h+v(16)} ${w-r+v(17)} ${h+v(18)} L ${w/2+v(19)} ${h+v(20)} L ${r+v(21)} ${h+v(22)}`+
      ` Q ${v(23)} ${h+v(24)} ${v(25)} ${h-r+v(26)} L ${v(27)} ${h/2+v(28)} L ${v(29)} ${r+v(30)}`+
      ` Q ${v(31)} ${v(32)} ${r+v(33)} ${v(34)}`;
  }
  function arrow(w,h,seed,curve='gentle') {
    const bend={swoop:.55,gentle:.28,straight:.06}[curve];
    if(bend===undefined)throw new Error('Unknown annotation curve');
    const v=(value,n,range)=>value+hash(n,seed)*range;
    const x0=v(4,1,3),y0=v(h*.72,2,4),x1=v(w-10,3,4),y1=v(h*.3,4,4);
    const a=v(w*.35,5,10),b=v(h*(.72+bend*.5),6,8),c=v(w*.7,7,10),d=v(h*(.3+bend),8,8);
    const angle=Math.atan2(y1-d,x1-c),f=n=>n.toFixed(1);
    const head=(delta,len)=>` M ${f(x1)} ${f(y1)} l ${f(Math.cos(angle+Math.PI+delta)*len)} ${f(Math.sin(angle+Math.PI+delta)*len)}`;
    return `M ${f(x0)} ${f(y0)} C ${f(a)} ${f(b)}, ${f(c)} ${f(d)}, ${f(x1)} ${f(y1)}`+head(.5,v(34,9,6))+head(-.5,v(34,10,6));
  }
  function mark(w,h,seed,style) {
    const v=(n,range=5)=>hash(n,seed)*range,mid=h/2;
    if(style==='hand-bracket')return `M ${w*.9+v(1,3)} ${2+v(2,3)} Q ${v(3,4)} ${2+v(4)} ${4+v(5,3)} ${h*.5+v(6)} Q ${v(7,4)} ${h-2+v(8)} ${w*.9+v(9,3)} ${h-2+v(10,3)}`;
    if(style==='hand-strike')return `M ${2+v(1,3)} ${mid+v(2)} L ${w-4+v(3,3)} ${mid-3+v(4)} M ${w-10+v(5,4)} ${mid+7+v(6)} L ${8+v(7,4)} ${mid+3+v(8)}`;
    const segments=Math.max(5,Math.round(w/95));let d=`M 2 ${mid+v(0,4)}`;
    for(let i=1;i<=segments;i++) {
      const x=w/segments*i;
      d+=` Q ${x-w/segments/2+v(i*4+1,9)} ${mid+(i%2?-1:1)*(9+v(i*4+2,4))} ${x.toFixed(1)} ${mid+v(i*4+3,4)}`;
    }
    return d;
  }
  function scribble(w,h,seed) {
    let d='';
    for(let i=0;i<11;i++) {
      const y=(i+.5)/11*h,half=Math.sqrt(Math.max(.05,1-((y-h/2)/(h/2))**2));
      const span=w/2*half*.86,a=w/2-span+hash(i*7+2,seed)*8,b=w/2+span+hash(i*7+3,seed)*8;
      d+=`${i?' L ':'M '}${(i%2?a:b).toFixed(1)} ${y.toFixed(1)} L ${(i%2?b:a).toFixed(1)} ${(y+hash(i*7+4,seed)*4).toFixed(1)}`;
    }
    return d;
  }
  function pathData(style,w,h,seed,curve) {
    if(style==='hand-circle')return ellipse(w,h,seed);
    if(style==='hand-box')return box(w,h,seed);
    if(style==='hand-arrow')return arrow(w,h,seed,curve);
    if(style==='hand-scribble')return scribble(w,h,seed);
    if(['hand-underline','hand-strike','hand-bracket'].includes(style))return mark(w,h,seed,style);
    throw new Error('Unknown handwritten annotation');
  }
  function penEase(length,pointAt) {
    if(length<=0)return {ease:clamp,samples:2};
    const PRE=48,points=Array.from({length:PRE+1},(_,i)=>pointAt(length*i/PRE)),curv=[0];
    for(let i=1;i<PRE;i++) {
      const ax=points[i].x-points[i-1].x,ay=points[i].y-points[i-1].y;
      const bx=points[i+1].x-points[i].x,by=points[i+1].y-points[i].y;
      const la=Math.hypot(ax,ay)||1e-6,lb=Math.hypot(bx,by)||1e-6;
      curv.push(Math.acos(Math.max(-1,Math.min(1,(ax*bx+ay*by)/(la*lb))))/((la+lb)/2));
    }
    curv.push(0);
    const count=Math.max(25,Math.min(75,Math.round(25+curv.reduce((a,b)=>a+b,0)*18))),times=[0];
    for(let i=1;i<=count;i++) {
      const u=(i-.5)/count*PRE,j=Math.floor(u),fraction=u-j,c=curv[j]*(1-fraction)+curv[Math.min(j+1,PRE)]*fraction;
      times.push(times.at(-1)+(length/count)/Math.max(1/(1+10*c*14),.22));
    }
    const total=times.at(-1);for(let i=0;i<times.length;i++)times[i]/=total;
    return {samples:count,ease:p=>{
      if(p<=0)return 0;if(p>=1)return 1;
      let lo=0,hi=count;
      while(hi-lo>1){const mid=(lo+hi)>>1;if(times[mid]<=p)lo=mid;else hi=mid;}
      return (lo+(p-times[lo])/(times[hi]-times[lo]||1e-9))/count;
    }};
  }
  function fit(bounds,region,style) {
    const pad=Math.min(10,region.width/4,region.height/4);
    const scale=Math.min((region.width-pad*2)/Math.max(bounds.width,1),(region.height-pad*2)/Math.max(bounds.height,1));
    return {scale,x:region.x+(region.width-bounds.width*scale)/2-bounds.x*scale,
      y:(style==='hand-underline'?region.y+region.height-pad-bounds.height*scale:region.y+(region.height-bounds.height*scale)/2)-bounds.y*scale};
  }
  function penPose(length,point,amount) {
    const p=clamp(amount),step=Math.max(.5/Math.max(length,1),.004);
    const before=point(clamp(p-step)),after=point(clamp(p+step)),position=point(p);
    return {x:position.x,y:position.y,rotation:Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI};
  }
  function maskId(sceneIndex,markIndex) {
    if(!Number.isInteger(sceneIndex)||sceneIndex<0||sceneIndex>=120||!Number.isInteger(markIndex)||markIndex<0||markIndex>=4)throw new Error('Invalid annotation mask identity');
    return `annotation-ink-${sceneIndex}-${markIndex}`;
  }
  function penTravelHeight(width,height) {
    return Math.max(height,(height+width*.0012*58+8)/1.16);
  }
  const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
  function shape(tag,attrs,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);set(node,attrs);parent.appendChild(node);return node;
  }
  function prepare(svg,path,mark,region,id,seed) {
    const style=mark.style,texture=mark.stroke||'plain';
    if(!['plain','soft','sharp','spray'].includes(texture))throw new Error('Unknown annotation stroke');
    // Cap geometry magnification for extremely thin source images.
    const canonical=Math.max(.25,Math.min(1,region.width/160,region.height/100));
    set(path,{d:pathData(style,region.width/canonical,region.height/canonical,seed,mark.curve)});
    const bounds=path.getBBox(),placement=fit(bounds,region,style),s=placement.scale,w=5/s;
    const wrapper=shape('g',{},svg);svg.insertBefore(wrapper,path);wrapper.appendChild(path);
    set(wrapper,{transform:`translate(${placement.x} ${placement.y}) scale(${s})`});
    set(path,{'stroke-width':w,'stroke-linejoin':'round'});
    const length=path.getTotalLength(),pen=penEase(length,d=>path.getPointAtLength(d));
    let draw=path;
    if(texture==='soft')path.style.filter=`blur(${.6/s}px)`;
    if(texture==='sharp'||texture==='spray') {
      const defs=svg.querySelector('defs')||shape('defs',{},svg);
      // Explicit local bounds also contain texture dots and the animated mask.
      const mask=shape('mask',{id,maskUnits:'userSpaceOnUse',x:bounds.x-30/s,y:bounds.y-30/s,width:bounds.width+60/s,height:bounds.height+60/s},defs);
      draw=shape('path',{d:path.getAttribute('d'),fill:'none',stroke:'white','stroke-width':w*(texture==='spray'?2+5.2/w:1.7),'stroke-linecap':'round','stroke-linejoin':'round'},mask);
      const ink=shape('g',{mask:`url(#${id})`},wrapper);ink.appendChild(path);
      if(texture==='sharp')set(path,{'stroke-dasharray':`${(3*w).toFixed(1)} ${(1.55*w).toFixed(1)}`});
      else {
        set(path,{'stroke-opacity':.5});path.style.filter=`blur(${.4/s}px)`;
        const count=Math.round(length*.16),dots=shape('g',{'data-annotation-dots':count},ink);
        for(let i=0;i<count;i++) {
          const t=clamp((i+.5)/count+hash(i*7,seed)*.35/count),p=path.getPointAtLength(t*length),q=path.getPointAtLength(Math.min(length,t*length+.5));
          const dx=q.x-p.x,dy=q.y-p.y,mag=Math.hypot(dx,dy)||1,offset=hash(i*7+1,seed)*(2.6+w*.55);
          shape('circle',{cx:(p.x-dy/mag*offset).toFixed(1),cy:(p.y+dx/mag*offset).toFixed(1),r:(1.1+Math.abs(hash(i*7+2,seed))*1.5).toFixed(2),fill:'var(--lime)'},dots);
        }
      }
    }
    set(draw,{'stroke-dasharray':`${length} ${length}`});
    path.dataset.annotationStyle=style;path.dataset.annotationStroke=texture;
    path.dataset.annotationBounds=JSON.stringify({x:placement.x+bounds.x*s,y:placement.y+bounds.y*s,width:bounds.width*s,height:bounds.height*s});
    return {length,ease:pen.ease,point:p=>{const q=path.getPointAtLength(p*length);return {x:placement.x+q.x*s,y:placement.y+q.y*s};},render:(amount,opacity)=>{
      set(draw,{'stroke-dashoffset':length*(1-amount)});
      wrapper.style.opacity=String(amount>0?opacity:0);
      path.dataset.annotationInk=String(amount);
    }};
  }
  window.ShortCreatorAnnotationInk={hash,box,pathData,penEase,fit,penPose,maskId,penTravelHeight,prepare};
})();
