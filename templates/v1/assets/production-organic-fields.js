/* HyperFrames facet-morph and soft-blob-touch, adapted under Apache-2.0.
   Authored shapes and seeded fields; no external assets or free episode code. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,p)=>a+(b-a)*p,TAU=2*Math.PI;
  const smooth=p=>.5-.5*Math.cos(Math.PI*clamp(p));
  const forms=[
    {outerR:[34,39,31,36,41,33,29,37,40,32,35,30,38,34,28,36,39,33],outerJ:[3,-5,6,-2,4,-6,2,5,-4,3,-3,6,-5,2,4,-2,-6,5],innerR:[16,19,14,20,17,13,18,15,19],innerJ:[8,-10,12,-6,9,-12,7,11,-8],cx:50,cy:51,rot:0},
    {outerR:[48,40,28,22,19,17,16,17,19,21,23,22,19,17,19,25,34,44],outerJ:[-2,6,-8,4,-3,5,-6,2,4,-5,3,-4,6,-2,5,-7,3,-4],innerR:[20,13,10,8,9,8,10,11,15],innerJ:[-6,9,-11,7,-8,10,-7,6,-9],cx:50,cy:56,rot:-7},
    {outerR:[36,37,35,34,33,30,27,25,24,33,24,25,27,30,33,34,35,37],outerJ:[0,2,-2,1,-1,2,-2,1,3,0,-3,-1,2,-2,1,-1,2,-2],innerR:[18,17,16,13,12,12,13,16,17],innerJ:[4,-5,6,-4,5,-6,4,-5,6],cx:50,cy:49,rot:5},
  ];
  const random=seed=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  function facetFrame(time) {
    if(!Number.isFinite(time)||time<0)throw new Error('Invalid facet time');
    const t=Math.min(4.1025,time),local=t-.3025;
    const p=local<=0?0:local<1.45?smooth(local/1.45):local<1.8?1:1+smooth((local-1.8)/1.45);
    const k=Math.min(2,Math.floor(p)),a=forms[k],b=forms[Math.min(2,k+1)],q=p-k;
    const amplitude=1.6*smooth(t/.55)*(1-smooth((t-3.5525)/.55));
    const cx=mix(a.cx,b.cx,q),cy=mix(a.cy,b.cy,q),rot=mix(a.rot,b.rot,q)*Math.PI/180;
    const next=random(0x0f4c37ed),outerPhase=Array.from({length:18},next),innerPhase=Array.from({length:9},next);
    const ring=(count,key,phases,start,step,amp)=>Array.from({length:count},(_,i)=>{
      const r=mix(a[key+'R'][i],b[key+'R'][i],q)+amp*Math.sin(TAU*(.42*t+phases[i]));
      const angle=(start+i*step+mix(a[key+'J'][i],b[key+'J'][i],q))*Math.PI/180+rot;
      return [cx+r*Math.cos(angle),cy+r*Math.sin(angle)];
    });
    const outer=ring(18,'outer',outerPhase,-90,20,amplitude),inner=ring(9,'inner',innerPhase,-70,40,amplitude*.7);
    const center=[cx,cy+amplitude*.4*Math.sin(TAU*(.42*t+.31))],triangles=[];
    for(let i=0;i<9;i++)triangles.push([outer[2*i],outer[2*i+1],inner[i]],
      [outer[2*i+1],outer[(2*i+2)%18],inner[i]],[outer[(2*i+2)%18],inner[i],inner[(i+1)%9]]);
    for(let i=0;i<9;i++)triangles.push([inner[i],inner[(i+1)%9],center]);
    return {progress:p,amplitude,triangles:triangles.map(points=>{
      const x=points.reduce((sum,v)=>sum+v[0],0)/3-cx,y=points.reduce((sum,v)=>sum+v[1],0)/3-cy,len=Math.hypot(x,y)||1;
      return {points,shade:Math.max(-1,Math.min(1,-.62*x/len-.78*y/len+(next()-.5)*.62))};
    })};
  }
  function touchState(time) {
    if(!Number.isFinite(time)||time<0)throw new Error('Invalid touch time');
    const t=Math.min(time,3.1625),touch=1.6,cut=2.0125,recover=1.15,bCut=.9375,vCut=.5/.55;
    const spring=(lambda,omega)=>{
      const s=t-cut,c2=(vCut/bCut+lambda)/omega;
      const x=u=>Math.exp(-lambda*u)*(Math.cos(omega*u)+c2*Math.sin(omega*u));
      return s>=recover?0:bCut*(x(s)-s/recover*x(recover));
    };
    const attack=t<=touch?0:1-(1-clamp((t-touch)/.55))**2;
    const arrive=1-(1-clamp((t-.75)/.85))**4,leave=clamp((t-cut)/.55)**3;
    return {time:t,bulge:t<cut?attack:spring(4.2,TAU*2.2),lean:t<cut?attack:spring(3.6,TAU*1.5),
      dot:arrive*(1-leave),away:t<cut?1-arrive:leave,drift:clamp(t/3.1625)};
  }
  function grainTable() {
    const next=random(0x50f7b10b);
    return Array.from({length:1500},()=>{
      const r=next()**.55*.26*1.16,angle=next()*TAU;
      return {x:Math.cos(angle)*r,y:Math.sin(angle)*r*.94,size:.0055*(.5+.9*next()),
        dim:(.3+.7*next())*clamp((1.16-r/.26)/.42),tone:next(),driftAmp:.008+.014*next(),
        cycles:next()<.5?1:2,px:next()*TAU,py:next()*TAU};
    });
  }
  const grains=grainTable();
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const color=(a,b,p)=>a.map((v,i)=>mix(v,b[i],p));
  const css=(c,a=1)=>`rgba(${c.map(v=>Math.round(v)).join(',')},${clamp(a)})`;
  function paint(ctx,w,h,time,colors,style) {
    const unit=Math.min(w,h),accent=rgb(colors.accent),white=rgb(colors.foreground),bg=rgb(colors.background);
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';
    ctx.fillStyle=colors.background;ctx.fillRect(0,0,w,h);
    if(style==='facet-morph') {
      const state=facetFrame(time),base=color(white,bg,.24),lit=color(white,accent,.2);
      ctx.save();ctx.translate((w-unit)/2,(h-unit)/2);ctx.scale(unit/100,unit/100);
      for(const {points,shade} of state.triangles) {
        ctx.fillStyle=css(shade>=0?color(base,lit,shade*.85):color(base,bg,-shade*.78));
        ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.35;ctx.beginPath();
        points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();
      }
      ctx.restore();return {progress:state.progress,amplitude:state.amplitude,facets:state.triangles.length};
    }
    if(style!=='soft-blob-touch')throw new Error('Unknown organic field');
    const state=touchState(time),R=unit*.26,tx=w*.66,ty=h*.38,dist=Math.hypot(tx-w*.5,ty-h*.5);
    const dx=(tx-w*.5)/dist,dy=(ty-h*.5)/dist,cx=w*.5+unit*.045*state.lean*dx,cy=h*.5+unit*.045*state.lean*dy;
    const body=color(accent,white,.18),soft=color(accent,white,.55);
    const glow=(x,y,r,c,stops)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);for(const [p,a] of stops)g.addColorStop(p,css(c,a));ctx.fillStyle=g;ctx.fillRect(0,0,w,h);};
    glow(cx,cy,R*1.9,accent,[[0,.16],[.55,.06],[1,0]]);
    glow(cx,cy,R*1.12,body,[[0,.34],[.62,.16],[1,0]]);
    const core=ctx.createRadialGradient(cx-R*.12,cy-R*.14,0,cx,cy,R*.62);
    core.addColorStop(0,css(soft,.4));core.addColorStop(1,css(soft,0));ctx.fillStyle=core;ctx.fillRect(0,0,w,h);
    if(state.bulge>.001)glow(cx+dx*R*.72,cy+dy*R*.72,R*(.22+.5*state.bulge),soft,[[0,.34*state.bulge],[1,0]]);
    for(const g of grains) {
      const drift=(phase)=>state.drift===1?0:g.driftAmp*unit*(Math.sin(TAU*g.cycles*state.drift+phase)-Math.sin(phase));
      let x=cx+g.x*unit+drift(g.px),y=cy+g.y*unit+drift(g.py);
      const d=Math.hypot(tx-x,ty-y);
      if(state.bulge>.001&&d>.5){const pull=R*.62*state.bulge*Math.exp(-d/(R*.85))/d;x+=(tx-x)*pull;y+=(ty-y)*pull;}
      ctx.fillStyle=css(g.tone<.62?soft:white,g.dim*.85);ctx.beginPath();ctx.arc(x,y,g.size*unit,0,TAU);ctx.fill();
    }
    if(state.dot>0) {
      const away=Math.hypot(w,h)*.7*state.away;
      ctx.fillStyle=css(white,state.dot);ctx.beginPath();ctx.arc(tx+dx*away,ty+dy*away,unit*.012,0,TAU);ctx.fill();
    }
    return {...state,grains:grains.length};
  }
  window.ShortCreatorOrganicFields={facetFrame,touchState,grainTable,paint};
})();
