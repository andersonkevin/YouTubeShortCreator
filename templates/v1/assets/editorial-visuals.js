/* Open, deterministic editorial graphics. Data never becomes executable markup. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  window.ShortCreatorEditorialVisual=(host,record,spec,payload)=>{
    const C={ink:payload.colors.ink||'#ffffff',muted:payload.colors.ink||'#ffffff',
      purple:payload.colors.accent,pink:payload.colors.secondary,teal:payload.colors.secondary,
      line:payload.colors.secondary,lime:payload.colors.accent};
    const make=(parent,tag,attributes={},value)=>{
      const element=document.createElementNS(NS,tag);
      for(const [key,val] of Object.entries(attributes)) element.setAttribute(key,String(val));
      if(value!==undefined)element.textContent=String(value);
      parent.append(element);return element;
    };
    const svg=make(host,'svg',{width:824,height:820,viewBox:'0 0 824 820','data-editorial-variant':record.data.variant});
    const text=(p,x,y,value,size=30,color=C.ink,anchor='start')=>make(p,'text',{x,y,fill:color,'font-family':'BrandSans','font-weight':600,'font-size':size,'text-anchor':anchor,'dominant-baseline':'hanging'},value);
    const context=document.createElement('canvas').getContext('2d');
    const wrap=(p,x,y,value,width=680,size=28,color=C.muted,anchor='start')=>{
      context.font=`600 ${size}px BrandSans`;
      const lines=[];let line='';
      for(const word of value.split(/\s+/)){
        const candidate=line?line+' '+word:word;
        if(line&&context.measureText(candidate).width>width){lines.push(line);line=word;}else line=candidate;
      }
      if(line)lines.push(line);
      lines.forEach((value,index)=>text(p,x,y+index*(size+8),value,size,color,anchor));
      return lines.length*(size+8);
    };
    const line=(p,x1,y1,x2,y2,color=C.line,width=3)=>make(p,'line',{x1,y1,x2,y2,stroke:color,'stroke-width':width});
    const circle=(p,cx,cy,r,fill='none',stroke=C.line,width=3)=>make(p,'circle',{cx,cy,r,fill,stroke,'stroke-width':width});
    const icon=(p,x,y,name=record.icon,size=48)=>make(p,'image',{x,y,width:size,height:size,href:(payload.editorial_icons||payload.icons)[name]});
    const groups=[],animations=[];
    const group=()=>{const g=make(svg,'g');groups.push(g);return g;};
    const data=record.data,n=data.labels.length;
    const accent=index=>[C.purple,C.pink,C.teal,C.purple][index%4];
    text(svg,0,8,record.title,26,C.purple);
    const title=(g,i,x,y,width,size=32,anchor='start')=>wrap(g,x,y,data.labels[i],width,size,C.ink,anchor);
    const detail=(g,i,x,y,width,anchor='start')=>wrap(g,x,y,data.details[i],width,25,C.muted,anchor);
    const number=value=>String(value);
    // The shared visual-source slot retains full provenance outside this graphic.

    if(data.variant==='flow'||data.variant==='trace'){
      const trace=data.variant==='trace';
      const gap=150;
      const first=100,cx=46,cy=first+(35);
      line(svg,cx,cy,cx,cy+(n-1)*gap);
      for(let i=0;i<n;i++){
        const g=group(),y=first+i*gap;
        circle(g,cx,y+(35),31,payload.colors.background,accent(i),3);
        if(trace)text(g,cx,y+(17),String(i+1).padStart(2,'0'),28,accent(i),'middle');
        else icon(g,27,y+(16),record.icon,38);
        const h=title(g,i,106,y+2,690,32);
        detail(g,i,106,y+49,690);
      }
      const pulse=circle(svg,cx,cy,7,C.pink,C.pink);
      animations.push(t=>pulse.setAttribute('cy',cy+((Math.max(0,t)*(45))%((n-1)*gap))));
    }else if(data.variant==='branch'){
      const root=group();icon(root,382,93,record.icon,60);
      title(root,0,412,166,650,38,'middle');detail(root,0,412,220,650,'middle');
      for(let i=1;i<n;i++){
        const x= n===2?412:110+(i-1)*604/(n-2),g=group();
        make(g,'path',{d:`M412 282 C412 345 ${x} 345 ${x} 395`,fill:'none',stroke:accent(i),'stroke-width':3});
        circle(g,x,412,9,accent(i),accent(i));
        const h=title(g,i,x,455,210,29,'middle');detail(g,i,x,472+h,210,'middle');
      }
    }else if(data.variant==='orbit'){
      circle(svg,412,365,210,'none',C.line,2);
      const points=[[412,95],[685,350],[412,615],[140,350]];
      for(let i=0;i<n;i++){
        const [x,y]=points[i],g=group();
        icon(g,x-23,y-60,record.icon,46);
        const h=title(g,i,x,y,240,30,'middle');detail(g,i,x,y+h+9,240,'middle');
      }
      const pointer=circle(svg,622,365,10,C.pink,C.pink);
      animations.push(t=>{const angle=Math.max(0,t)*.45;pointer.setAttribute('cx',412+210*Math.cos(angle));pointer.setAttribute('cy',365+210*Math.sin(angle));});
      icon(svg,372,325,record.icon,80);
    }else if(data.variant==='bars'){
      text(svg,0,65,data.unit+' / zero-based scale',23,C.muted);
      data.labels.forEach((_,i)=>{
        const g=group(),y=(123)+i*(142);
        title(g,i,0,y,650,30);
        line(g,0,y+(59),680,y+(59),C.line,2);
        const bar=make(g,'rect',{x:0,y:y+(44),width:0,height:30,fill:accent(i),rx:3});
        text(g,805,y+(42),number(data.values[i]),32,accent(i),'end');
        detail(g,i,0,y+88,790);
        animations.push(t=>bar.setAttribute('width',(680)*data.values[i]/data.maximum*ease((t-(spec.motion.beats?.[i]??.1))/1.2)));
      });
    }else if(data.variant==='curve'||data.variant==='axes'){
      text(svg,0,70,data.unit,25,C.muted);
      const bottom=605,left=100,right=748,top=165;
      line(svg,left,top,left,bottom,C.muted,2);line(svg,left,bottom,right,bottom,C.muted,2);
      [0,.5,1].forEach(f=>{const y=bottom-(bottom-top)*f;line(svg,left,y,right,y,C.line,1);text(svg,left-16,y-11,number(data.maximum*f),22,C.muted,'end');});
      const coords=data.values.map((v,i)=>[left+i*(right-left)/(n-1),bottom-(bottom-top)*v/data.maximum]);
      const path=make(svg,'path',{d:coords.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' '),fill:'none',stroke:C.purple,'stroke-width':5});
      const length=path.getTotalLength();path.style.strokeDasharray=String(length);
      animations.push(t=>path.style.strokeDashoffset=String(length*(1-ease((t-.2)/2.5))));
      coords.forEach(([x,y],i)=>{
        const g=group();circle(g,x,y,8,accent(i),accent(i));
        text(g,x,y-42,number(data.values[i]),29,accent(i),'middle');
        const h=title(g,i,x,639,156,25,'middle');
        if(data.variant==='axes')detail(g,i,x,644+h,156,'middle');
      });
    }else if(data.variant==='clock'){
      text(svg,0,68,data.unit,24,C.muted);
      data.labels.forEach((_,i)=>{
        const g=group(),x=205+i*414,y=335,r=132,circumference=2*Math.PI*r;
        circle(g,x,y,r,'none',C.line,10);
        const arc=circle(g,x,y,r,'none',accent(i),13);
        arc.setAttribute('transform',`rotate(-90 ${x} ${y})`);arc.style.strokeDasharray=String(circumference);
        animations.push(t=>arc.style.strokeDashoffset=String(circumference*(1-data.values[i]/data.maximum*ease((t-(spec.motion.beats?.[i]??.1))/1.3))));
        text(g,x,y-(35),number(data.values[i]),72,accent(i),'middle');
        const h=title(g,i,x,505,355,32,'middle');
        detail(g,i,x,521+h,345,'middle');
      });
    }else if(data.variant==='terrain'){
      const g=group();
      for(let k=0;k<19;k++){
        const radius=28+k*12,points=[];
        for(let i=0;i<=120;i++){
          const a=i/120*Math.PI*2,rr=radius*(1+.09*Math.sin(3*a+k*.35)+.06*Math.cos(5*a));
          points.push([412+rr*Math.cos(a),345+rr*.75*Math.sin(a)]);
        }
        make(g,'path',{d:points.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ')+'Z',fill:'none',stroke:k%3?C.purple:C.pink,'stroke-width':k%3?1.3:2.5,opacity:.4+k*.025});
      }
      const scan=line(g,170,110,170,560,C.teal,3);
      animations.push(t=>{const x=170+(Math.max(0,t)*44)%484;scan.setAttribute('x1',x);scan.setAttribute('x2',x);});
      for(let i=0;i<n;i++){
        const item=group(),x=50+i*(724/(n-1));
        const anchor=i===0?'start':i===n-1?'end':'middle';
        const h=title(item,i,x,570,340,34,anchor);detail(item,i,x,580+h,340,anchor);
      }
    }else if(data.variant==='matrix'){
      for(let y=0;y<9;y++)for(let x=0;x<13;x++)circle(svg,65+x*56,130+y*42,3,C.line,C.line,0);
      const marker=circle(svg,65,130,15,'none',C.pink,3);
      animations.push(t=>{const step=Math.floor(Math.max(0,t)*5)%117;marker.setAttribute('cx',65+(step%13)*56);marker.setAttribute('cy',130+Math.floor(step/13)*42);});
      data.labels.forEach((_,i)=>{
        const g=group(),x=n===2?i*424:0,y=n===2?575:440+i*80;
        title(g,i,x,y,n===2?390:310,30);
        detail(g,i,n===2?x:330,n===2?y+52:y,n===2?380:470);
      });
    }else if(data.variant==='rings'){
      for(let i=0;i<n;i++){

        const g=group(),y=110+i*160;
        circle(g,75,y+35,35,'none',accent(i),4);
        icon(g,55,y+15,record.icon,40);
        const h=title(g,i,145,y,655,28);detail(g,i,145,y+h+12,650);
        const ring=circle(g,75,y+35,44,'none',accent(i),1);
        animations.push(t=>ring.setAttribute('r',44+6*Math.sin(Math.max(0,t)*2+i)));
      }
    }else if(data.variant==='worlds'){
      data.labels.forEach((_,i)=>{

        const g=group(),x=135+i*(554/(n-1)),y=295;
        make(g,'path',{d:`M${x-95} ${y} l95 -55 l95 55 l-95 55 Z`,fill:payload.colors.background,stroke:accent(i),'stroke-width':2});
        for(let j=0;j<3;j++){
          const bx=x-45+j*34,by=y-j*5;
          make(g,'path',{d:`M${bx} ${by} v-72 l23 -13 l24 13 v72 l-24 14 Z`,fill:payload.colors.background,stroke:accent(i),'stroke-width':2});
          line(g,bx,by-72,bx+24,by-58,accent(i),1);line(g,bx+24,by-58,bx+24,by+14,accent(i),1);
        }
        const point=circle(g,x,y+60,8,C.pink,C.pink);
        animations.push(t=>point.setAttribute('cx',x+60*Math.sin(Math.max(0,t)*.7+i)));
        const h=title(g,i,x,443,220,31,'middle');detail(g,i,x,462+h,220,'middle');
      });
    }else throw new Error('Unsupported editorial composition');
    return {renderAt(seconds){
      const beats=spec.motion.beats||[];
      groups.forEach((g,i)=>{
        const start=beats[Math.min(i,beats.length-1)]??(.12+i*.7);
        const amount=ease((seconds-start)/.65);
        g.setAttribute('opacity',String(amount));
        g.setAttribute('transform',`translate(0 ${18*(1-amount)})`);
      });
      animations.forEach(update=>update(seconds));
    }};
  };
})();
