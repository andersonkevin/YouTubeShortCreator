/* Original diagram-led compositions using the existing HyperFrames-derived seam
   clock. Every frame is a pure function of measured narration time. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>1-(1-clamp(x))**4;
  function mount(host,c,onsets,data,make,end){
    if(c.layout==='photographic')return window.ShortCreatorCinemaShots.mount(host,c,onsets,data,make,end);
    const stage=host.parentElement,bg=make('div','cinema-backdrop',null,stage);
    stage.insertBefore(bg,host);
    const light=c.layout==='contrast';
    bg.style.background=light?'var(--signal)':'var(--ink)';
    const ink=light?'var(--ink)':'var(--paper)',signal=light?'var(--ink)':'var(--signal)',dark=light?'var(--signal)':'var(--ink)';
    const board=document.createElementNS(NS,'svg');board.classList.add('cinema-board');board.dataset.layout=c.layout;
    board.setAttribute('viewBox','0 0 1760 780');board.setAttribute('role','img');board.setAttribute('aria-label',c.headline.join(' '));host.appendChild(board);
    const updates=[];
    function shape(tag,attrs,parent=board){const node=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));parent.appendChild(node);return node;}
    const group=(attrs={},parent=board)=>shape('g',attrs,parent);
    const circle=(x,y,r,color=signal,parent=board,sw=0)=>shape('circle',{cx:x,cy:y,r,fill:sw?'none':color,stroke:color,'stroke-width':sw},parent);
    const path=(d,color=signal,width=5,parent=board)=>shape('path',{d,fill:'none',stroke:color,'stroke-width':width},parent);
    function text(x,y,value,size=38,color=ink,parent=board,style='',anchor='middle'){
      const node=shape('text',{x,y,fill:color,'font-size':size,'text-anchor':anchor,'dominant-baseline':'middle',class:style,'data-fit':'true'},parent);node.textContent=value;return node;
    }
    function arrive(node,delay=0,travel=32){updates.push(t=>{const q=ease((t-onsets[0]-delay)/.7);node.setAttribute('opacity',q);node.setAttribute('transform',`translate(0 ${travel*(1-q)})`);});}
    function trace(node,start,duration){const length=node.getTotalLength();node.style.strokeDasharray=String(length);updates.push(t=>{node.style.strokeDashoffset=String(length*(1-ease((t-start)/duration)));});return length;}
    function pointOn(node,start,duration,r=10){const dot=circle(0,0,r,signal),length=node.getTotalLength();updates.push(t=>{const p=clamp((t-start)/duration),q=node.getPointAtLength(p*length);dot.setAttribute('cx',q.x);dot.setAttribute('cy',q.y);dot.setAttribute('opacity',t>=start&&p<1?1:0);});}
    function annotation(x,y,value,color=ink,anchor='middle'){return text(x,y,value,24,color,board,'story-mono',anchor);}
    if(c.layout==='opening'){
      // A sentence is surrounded by its alternatives, then isolated as a claim.
      const field=group();
      for(let row=0;row<5;row++){
        const rx=480+row*73,ry=206+row*28;
        const orbit=shape('ellipse',{cx:880,cy:360,rx,ry,fill:'none',stroke:ink,'stroke-width':3,opacity:.25},field);
        const length=orbit.getTotalLength();orbit.style.strokeDasharray=`${length*.14} ${length*.86}`;
        updates.push(t=>{const p=clamp((t-onsets[0])/(end-onsets[0]));orbit.style.strokeDashoffset=String(-length*(row*.19+p*.42));});
      }
      const placements=[[230,214],[536,108],[1244,102],[1532,220],[1550,540],[1230,655],[490,661],[205,535]];
      placements.forEach(([x,y],i)=>{const g=group();circle(x,y,6,i%3?ink:signal,g);text(x,y+(y<360?-28:34),c.labels[i%3],23,ink,g,'story-mono');arrive(g,.1+i*.035,15);});
      const claim=group();
      text(880,275,c.headline[0],134,ink,claim,'story-display');text(880,465,c.headline[1],126,signal,claim,'story-display');arrive(claim,.08,42);
      const underline=path('M610 552H1150',signal,9);trace(underline,onsets[1],.9);
      annotation(880,738,c.kicker);
      updates.push(t=>{const q=ease((t-onsets[1])/.8);field.setAttribute('opacity',1-q*.55);const s=1+.065*q;claim.setAttribute('transform',`translate(${880*(1-s)} ${375*(1-s)}) scale(${s})`);});
    }else if(c.layout==='prediction'){
      const origin=group();text(335,325,c.headline[0],83,ink,origin,'story-display');text(335,452,c.headline[1],83,ink,origin,'story-display');arrive(origin,0,22);
      const targets=[[1250,127],[1370,375],[1220,632]];
      targets.forEach(([x,y],i)=>{
        const line=path(`M555 390C805 390 825 ${y} ${x-230} ${y}`,i===1?signal:ink,i===1?9:6);
        if(i!==1)line.setAttribute('opacity',.42);
        trace(line,onsets[0]+.2+i*.16,1.6);pointOn(line,onsets[0]+.3+i*.18,2.6,10);
        const branch=group();circle(x-206,y,8,i===1?signal:ink,branch);
        text(x,y,c.labels[i],i===1?98:70,i===1?signal:ink,branch,'story-display');arrive(branch,.4+i*.14,20);
        if(i!==1)updates.push(t=>branch.setAttribute('opacity',ease((t-onsets[0]-.4-i*.14)/.7)*(1-.3*ease((t-onsets[1])/.8))));
        else updates.push(t=>{const q=ease((t-onsets[1])/.8),s=1+.08*q;branch.setAttribute('transform',`translate(${x*(1-s)} ${y*(1-s)}) scale(${s})`);});
      });
      const chosen=path('M1135 455H1600',signal,11);trace(chosen,onsets[1],.7);
      const caption=text(1360,510,c.note,29,signal);updates.push(t=>caption.setAttribute('opacity',ease((t-onsets[1]-.2)/.6)));
      annotation(335,565,c.kicker,ink);
    }else if(c.layout==='contrast'){
      // One connection visibly breaks: fluent text does not establish a source.
      const left=group(),right=group();
      shape('ellipse',{cx:631,cy:309,rx:242,ry:116,fill:'none',stroke:ink,'stroke-width':48,transform:'rotate(24 631 309)'},left);
      shape('ellipse',{cx:1117,cy:462,rx:242,ry:116,fill:'none',stroke:ink,'stroke-width':48,transform:'rotate(24 1117 462)'},right);
      text(300,100,c.labels[0],69,ink,board,'story-display');text(1480,680,c.labels[1],69,ink,board,'story-display');
      const gap=shape('rect',{x:830,y:268,width:90,height:260,fill:dark,transform:'rotate(24 875 398)'});
      const mark=group();path('M863 332l42-65 M850 463l-42 65',ink,9,mark);
      annotation(1340,107,c.headline[0]);annotation(380,675,c.headline[1]);
      const verdict=text(880,745,c.note,34,ink);arrive(verdict,.4,15);
      arrive(left,0,24);arrive(right,.1,24);
      updates.push(t=>{const q=ease((t-onsets[1])/.75);left.setAttribute('transform',`translate(${-55*q} ${-17*q})`);right.setAttribute('transform',`translate(${55*q} ${17*q})`);gap.setAttribute('opacity',q);mark.setAttribute('opacity',q);});
    }else if(c.layout==='verification'){
      const center=group();
      shape('rect',{x:709,y:258,width:342,height:288,rx:5,fill:ink},center);
      shape('rect',{x:735,y:283,width:110,height:9,fill:signal},center);
      text(880,365,c.headline[0],59,dark,center,'story-display');text(880,438,c.headline[1],59,dark,center,'story-display');
      for(let i=0;i<3;i++)path(`M750 ${482+i*15}h${[246,190,225][i]}`,dark,3,center);
      arrive(center,0,28);
      const nodes=[[880,125],[325,577],[1435,577]],starts=[onsets[1],onsets[1]+1.1,onsets[1]+2.2];
      nodes.forEach(([x,y],i)=>{
        const g=group();circle(x,y,64,dark,g);circle(x,y,64,signal,g,5);
        const number=text(x,y,String(i+1).padStart(2,'0'),37,ink,g,'story-mono');
        text(x,i?y+112:35,c.labels[i],32,ink,g);
        const stop=i===0?[880,258]:i===1?[709,461]:[1051,461];
        const link=path(`M${stop[0]} ${stop[1]}Q${x} ${stop[1]} ${x} ${i===0?y+65:y-65}`,ink,4);
        trace(link,onsets[0]+.25+i*.15,1);pointOn(link,starts[i],.75,9);
        const check=path(`M${x-19} ${y}l12 12 27-31`,signal,6,g);trace(check,starts[i]+.75,.4);
        updates.push(t=>number.setAttribute('opacity',1-ease((t-starts[i]-.7)/.25)));
        arrive(g,.2+i*.12,20);
      });
      annotation(880,708,c.note);
    }else{
      const ring=circle(880,350,226,signal,board,32);trace(ring,onsets[0],1.5);
      const tick=path('M770 350l77 82 151-168',signal,30);trace(tick,onsets[1],.65);
      const left=text(360,323,c.labels[0],42,ink),right=text(1410,323,c.labels[1],42,ink);
      path('M520 350H620',ink,3);path('M1140 350H1240',ink,3);arrive(left,.25,20);arrive(right,.4,20);
      const title=text(880,676,c.headline.join(' '),84,ink,board,'story-display');arrive(title,.3,25);
      annotation(880,54,c.kicker);
      updates.push(t=>{const q=ease((t-onsets[1])/.8);ring.setAttribute('stroke-width',32-17*q);});
    }
    return t=>{
      document.querySelector('#film .logo').style.filter=light?'brightness(0)':'none';
      updates.forEach(update=>update(t));board.dataset.cinemaTime=String(t);
    };
  }
  window.ShortCreatorFolio={mount};
})();
