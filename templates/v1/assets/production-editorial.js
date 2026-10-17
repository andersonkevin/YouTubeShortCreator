/* Original vector artwork, using the existing caption clock and HyperFrames-derived
   seam engine. No user SVG, executable content, external assets or random state. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>1-(1-clamp(x))**4;
  function mount(host,c,onsets){
    const light=c.design==='atlas';
    const P=light?'var(--cyan)':'var(--purple)',L=light?'var(--purple)':'var(--lime)',C=light?'var(--purple)':'var(--cyan)',W=light?'var(--purple)':'white';
    const svg=document.createElementNS(NS,'svg');
    svg.classList.add('editorial-board');svg.setAttribute('viewBox','0 0 1720 690');
    svg.setAttribute('role','img');svg.setAttribute('aria-label',c.headline.join(' '));
    svg.dataset.design=c.design;svg.dataset.layout=c.layout;host.appendChild(svg);
    const animations=[];
    let drawing=svg;
    function shape(tag,attrs,parent=drawing){
      const n=document.createElementNS(NS,tag);
      for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));parent.appendChild(n);return n;
    }
    const group=(attrs={},parent=drawing)=>shape('g',attrs,parent);
    const rect=(x,y,w,h,fill,rx=0,parent=drawing,stroke='none',sw=0)=>shape('rect',{x,y,width:w,height:h,rx,fill,stroke,'stroke-width':sw},parent);
    const circle=(x,y,r,fill,parent=drawing,stroke='none',sw=0)=>shape('circle',{cx:x,cy:y,r,fill,stroke,'stroke-width':sw},parent);
    function path(d,color=L,width=10,parent=drawing,fill='none'){
      return shape('path',{d,stroke:color,'stroke-width':width,fill,class:'ed-rule'},parent);
    }
    function txt(x,y,value,size=32,color=W,parent=drawing,style='',anchor='start'){
      const n=shape('text',{x:x===0?4:x,y,fill:color,'font-size':size,'text-anchor':anchor,'dominant-baseline':'middle',class:style,'data-fit':'true','data-editorial-text':'true'},parent);
      n.textContent=value;return n;
    }
    const entry=(node,delay=0,travel=35)=>animations.push((t,p)=>{const q=ease((t-onsets[0]-delay)/.65);node.setAttribute('opacity',q);node.setAttribute('transform',`translate(0 ${travel*(1-q)})`);});
    const trace=(node,delay=0)=>{const length=node.getTotalLength();node.style.strokeDasharray=String(length);animations.push((t,p)=>{node.style.strokeDashoffset=String(length*(1-ease((t-onsets[0]-delay)/1.1)));});};
    function chip(x,y,w,h,label,parent=drawing,color=L){
      const g=group({},parent);rect(x,y,w,h,P,26,g,color,8);
      for(let i=0;i<5;i++){const a=x+30+i*(w-60)/4,b=y+25+i*(h-50)/4;path(`M${a} ${y-20}v20 M${a} ${y+h}v20`,color,6,g);path(`M${x-20} ${b}h20 M${x+w} ${b}h20`,color,6,g);}
      txt(x+w/2,y+h/2,label,40,color,g,'ed-display','middle');return g;
    }
    function drawDocument(x,y,w,h,parent=drawing,marked=false){
      const g=group({},parent);rect(x+22,y+22,w,h,P,10,g,C,3);rect(x,y,w,h,C,10,g);
      rect(x+30,y+30,62,12,P,0,g);rect(x+30,y+65,w-60,18,P,0,g);
      for(let i=0;i<5;i++)rect(x+30,y+115+i*35,w-60-(i%2)*50,8,P,0,g);
      if(marked){const s=group({},g);rect(x+24,y+h-104,w-48,72,L,2,s);path(`M${x+44} ${y+h-70}l14 15 29-32`,P,8,s);txt(x+101,y+h-66,'FUENTE',26,P,s,'ed-mono');}
      return g;
    }
    function laptop(x,y,w,h,parent=drawing){
      const g=group({},parent);rect(x,y,w,h,P,16,g,C,9);rect(x+17,y+17,w-34,h-34,C,5,g);
      path(`M${x-35} ${y+h+15}H${x+w+35}l-28 24H${x-7}Z`,C,6,g,P);
      for(let i=0;i<3;i++){rect(x+42,y+43+i*30,70+i*22,8,P,0,g);}
      return g;
    }
    function server(x,y,w,parent=drawing){
      const g=group({},parent);for(let i=0;i<3;i++){
        rect(x,y+i*69,w,56,P,9,g,L,6);circle(x+25,y+28+i*69,6,L,g);path(`M${x+w-75} ${y+28+i*69}h45`,L,7,g);
      }return g;
    }
    function orbit(cx,cy,r,parent=drawing){
      const ring=circle(cx,cy,r,'none',parent,C,5);ring.setAttribute('stroke-dasharray','10 17');
      const dot=circle(cx+r,cy,13,L,parent);
      animations.push((t,p)=>{const a=(.12+.68*p)*Math.PI*2;dot.setAttribute('cx',cx+Math.cos(a)*r);dot.setAttribute('cy',cy+Math.sin(a)*r);});
    }
    function arrow(x1,y1,x2,y2,color=L,parent=drawing){
      const line=path(`M${x1} ${y1}L${x2} ${y2}`,color,10,parent);trace(line,.2);
      const a=Math.atan2(y2-y1,x2-x1),len=19;
      path(`M${x2-len*Math.cos(a-.65)} ${y2-len*Math.sin(a-.65)}L${x2} ${y2}L${x2-len*Math.cos(a+.65)} ${y2-len*Math.sin(a+.65)}`,color,8,parent);
    }
    function heading(compact=false){
      const g=group();txt(0,28,c.kicker.toUpperCase(),24,C,g,'ed-mono');
      if(compact){txt(0,108,c.headline.join(' '),62,W,g,'ed-display');}
      else{txt(0,190,c.headline[0],100,W,g,'ed-display');txt(0,335,c.headline[1],100,L,g,'ed-display');}
      entry(g,0,28);return g;
    }
    function footer(y=658){txt(0,y,c.deck,30,C,drawing);}
    function plate(x,y,label,detail,width=455,parent=drawing){
      txt(x,y,label,41,W,parent,'ed-display');txt(x,y+65,detail,25,C,parent);path(`M${x} ${y+104}h${width}`,L,9,parent);
    }
    if(light){rect(0,0,1720,690,'var(--cyan)',24);drawing=group({transform:'translate(35 16) scale(.955)'},svg);}
    if(c.design==='circuit'){
      const grid=group({opacity:.15});
      for(let x=25;x<1720;x+=75)for(let y=18;y<690;y+=75)circle(x,y,2,C,grid);
    }
    const isD=c.design==='dossier',isC=c.design==='circuit';
    if(c.layout==='hero'||c.layout==='close'){
      heading();const art=group();entry(art,.12,45);
      path('M4 428H620',L,14);txt(0,490,c.labels[0],29,C,drawing,'ed-mono');
      txt(0,551,c.details[0],30,W);footer();
      if(isD){
        drawDocument(970,58,395,480,art,true);
        const lens=group({},art);circle(1372,430,125,P,lens,L,15);path('M1460 518l116 116',L,30,lens);
        if(c.layout==='close')path('M1300 430l49 51 96-110',L,17,lens);
        else txt(1372,438,'?',145,L,lens,'ed-display','middle');
        animations.push((t,p)=>lens.setAttribute('transform',`translate(${-50+50*p} ${-18+18*p})`));
        txt(1190,622,c.labels[2],27,C,art,'ed-mono','middle');
      }else if(isC){
        orbit(1270,330,265,art);chip(1130,215,280,215,c.layout==='close'?'':c.labels[1],art);
        const points=[[970,140],[1560,160],[1530,548]];
        points.forEach(([x,y],i)=>{circle(x,y,68,P,art,i===2?L:C,8);txt(x,y,String(i+1).padStart(2,'0'),45,i===2?L:C,art,'ed-mono','middle');});
        if(c.layout==='close'){path('M1212 323l40 44 81-92',L,15,art);}
        txt(1260,664,c.labels[2],30,C,art,'ed-mono','middle');
      }else{
        const left=laptop(915,305,310,220,art);server(1428,92,235,art);
        arrow(1245,400,1538,400,L,art);path('M1538 400V309',L,10,art);
        txt(1070,590,c.labels[1],30,C,art,'ed-mono','middle');txt(1546,39,c.labels[2],30,L,art,'ed-mono','middle');
        const packet=rect(1240,381,38,38,L,8,art);animations.push((t,p)=>packet.setAttribute('x',1240+260*p));
        path('M955 244l105-61 106 61-106 61Z',C,6,art,P);path('M1060 183v122',C,6,art);
      }
    }else if(c.layout==='mechanism'){
      heading(true);
      if(isD){
        const xs=[40,625,1210];
        xs.forEach((x,i)=>{const g=group();entry(g,.1+i*.15);txt(x,230,String(i+1).padStart(2,'0'),60,L,g,'ed-mono');
          if(i<2){for(let j=0;j<5;j++)rect(x,307+j*33,390-j%3*55,14,i?L:C,0,g);}
          else{circle(x+165,367,107,'none',g,L,12);txt(x+165,373,'?',134,L,g,'ed-display','middle');}
          plate(x,530,c.labels[i],c.details[i],390,g);
          if(i<2)arrow(x+425,374,x+535,374,C);
          if(i===2){const ring=circle(x+165,367,127,'none',g,C,7);ring.style.strokeDasharray=String(2*Math.PI*127);animations.push((t,p)=>ring.style.strokeDashoffset=String(2*Math.PI*127*(1-p)));}
        });
      }else if(isC){
        const positions=[[70,255],[680,255],[1290,255]];
        positions.forEach(([x,y],i)=>{const g=group();entry(g,.12*i);chip(x,y,350,200,c.labels[i],g,i===1?C:L);txt(x+175,510,c.details[i],25,C,g,'','middle');});
        arrow(450,355,640,355);arrow(1060,355,1250,355);const back=path('M1465 560V610H245V560',C,9);trace(back,.6);
        const cursor=circle(460,355,17,W);animations.push((t,p)=>cursor.setAttribute('cx',460+780*p));
        txt(855,657,'OBSERVAR → DECIDIR → VOLVER A ACTUAR',24,C,drawing,'ed-mono','middle');
      }else{
        const g=group();entry(g,.1);laptop(40,260,460,290,g);server(1265,270,380,g);
        arrow(580,405,1180,405,L,g);txt(870,326,c.labels[1],34,L,g,'ed-display','middle');
        txt(270,635,c.labels[0],36,C,g,'ed-display','middle');txt(1455,635,c.labels[2],36,L,g,'ed-display','middle');
        txt(870,478,c.details[1],26,C,g,'','middle');
        const point=circle(600,405,15,W,g);animations.push((t,p)=>point.setAttribute('cx',600+560*p));
      }
    }else if(c.layout==='comparison'){
      heading(true);const a=group(),b=group();entry(a,.08);entry(b,.25);
      const left=rect(0,195,790,440,C,20,a),right=rect(930,195,790,440,P,20,b,L,8);
      txt(42,253,c.labels[0],38,P,a,'ed-display');txt(972,253,c.labels[1],38,L,b,'ed-display');
      txt(42,578,c.details[0],28,P,a);txt(972,578,c.details[1],28,C,b);
      path('M826 414h70',L,12);path('M854 391l24 23-24 23',L,10);
      if(isD){
        txt(54,410,'“',110,P,a,'ed-display');txt(175,384,'Parece real.',59,P,a,'ed-display');
        path('M180 447h490',P,12,a);drawDocument(1250,300,185,210,b,false);
        circle(1138,411,60,'none',b,L,10);path('M1109 411l22 24 39-49',L,10,b);
      }else if(isC){
        [140,350,560].forEach((x,i)=>{circle(x,399,46,P,a);txt(x,399,String(i+1),36,C,a,'ed-mono','middle');if(i<2)path(`M${x+55} 399h100`,P,10,a);});
        circle(1110,404,48,L,b);path('M1160 404h90l80-60h210 M1250 404l80 60h210',L,9,b);
        [344,464].forEach(y=>circle(1550,y,29,C,b));
      }else{
        chip(230,326,310,170,'CPU / RAM',a,L);server(1150,320,330,b);
      }
      animations.push((t,p)=>{a.setAttribute('opacity',1-.38*p);right.setAttribute('stroke-width',8+8*p);});
      txt(860,675,c.labels[2],28,C,drawing,'ed-mono','middle');
    }else if(c.layout==='process'){
      heading(true);
      if(isD){
        for(let i=0;i<3;i++){
          const g=group();entry(g,.12*i);const y=238+145*i;
          txt(0,y,String(i+1).padStart(2,'0'),66,L,g,'ed-mono');txt(140,y,c.labels[i],49,W,g,'ed-display');
          txt(800,y,c.details[i],33,C,g);path(`M140 ${y+68}H1665`,C,5,g);
          circle(680,y,36,'none',g,C,5);
          if(i===0){circle(680,y-8,10,C,g);path(`M663 ${y+17}q17-18 34 0`,C,5,g);}
          else if(i===1){rect(663,y-15,34,31,'none',4,g,C,4);path(`M663 ${y-5}h34`,C,4,g);}
          else{path(`M665 ${y-12}h30 M665 ${y}h30 M665 ${y+12}h20`,C,5,g);}
          const check=path(`M1580 ${y-7}l22 22 43-47`,L,11,g);animations.push((t,p)=>check.setAttribute('opacity',ease((p-.15*i)*2)));
        }footer(650);
      }else if(isC){
        const routes=group();entry(routes,.1);chip(655,255,410,240,'CONTROL',routes);
        [0,1,2].forEach(i=>{const x=60+i*575;txt(x,200,c.labels[i],34,L,routes,'ed-display');txt(x,603,c.details[i],27,C,routes);
          if(i!==1){path(`M${x+190} 250V375H${i?1095:625}`,C,10,routes);circle(x+190,250,15,L,routes);}
          path(`M${x} 650h450`,L,12,routes);
        });
        const gate=path('M860 300v150',L,18,routes);animations.push((t,p)=>gate.setAttribute('transform',`rotate(${-65*p} 860 450)`));
      }else{
        const xs=[260,860,1460];
        xs.forEach((x,i)=>{const g=group();entry(g,.1+i*.12);circle(x,345,120,P,g,i===1?C:L,12);
          if(i===0)path(`M${x-57} 345l38 40 80-89`,L,17,g);
          if(i===1){path(`M${x-53} 391V327h32v64 M${x-3} 391V286h32v105 M${x+47} 391V311h32v80`,C,13,g);}
          if(i===2){rect(x-53,327,106,89,L,8,g);path(`M${x-32} 327v-30a32 32 0 0 1 64 0v30`,L,12,g);}
          const underline=path(`M${x-70} 485h140`,L,8,g);underline.style.strokeDasharray='140';animations.push((t,p)=>underline.style.strokeDashoffset=String(140*(1-clamp(p*1.6-i*.3))));
          txt(x,525,c.labels[i],42,W,g,'ed-display','middle');txt(x,590,c.details[i],27,C,g,'','middle');
        });footer(650);
      }
    }
    return time=>{
      const progress=ease((time-onsets[1])/.8);
      for(const animation of animations)animation(time,progress);
      svg.dataset.editorialProgress=String(progress);
      svg.dataset.editorialClock=String(Math.floor(time*30+1e-7));
    };
  }
  window.ShortCreatorEditorial=Object.freeze({mount});
})();
