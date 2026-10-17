/* HyperFrames ui-3d-reveal, Apache-2.0. Native caption-clock adaptation.
   Approved logo/still and explicit episode copy replace the source identities. */
(()=>{
  'use strict';
  const duration=12.3,clamp=p=>Math.max(0,Math.min(1,p));
  const out=(p,n=3)=>1-(1-p)**n,inOut=(p,n=3)=>p<.5?2**(n-1)*p**n:1-(-2*p+2)**n/2;
  const expo=p=>p===1?1:1-2**(-10*p),sine=p=>(1-Math.cos(Math.PI*p))/2;
  const phase=(t,a,d,e=out)=>e(clamp((t-a)/d));
  const back=p=>1+2.4*(p-1)**3+1.4*(p-1)**2;
  function state(seconds,count,letters) {
    if(!Number.isFinite(seconds)||!Number.isInteger(count)||count<3||count>9||
       !Number.isInteger(letters)||letters<1||letters>32)throw new Error('Invalid UI reveal state');
    const t=Math.max(0,Math.min(duration,seconds)),entry=phase(t,1.5,.55,expo);
    const push=phase(t,3.5,1.3,p=>inOut(p,4)),first=phase(t,5.55,.9,sine),second=phase(t,6.45,.9,sine);
    const angle=t<5.55?-34*phase(t,4.2,1.35,expo):t<6.45?-34+3*first:-31-4*second;
    const exit=phase(t,7.3,.55,p=>p**5),angleAtExit=-31-4*phase(7.3,6.45,.9,sine);
    const y=t<5.55?24*(1-entry)-16*phase(t,4.3,1.1):t<6.45?-16+8*first:-8-12*second;
    const glowBefore=u=>u<5.55?.5*phase(u,1.55,.8)+.35*phase(u,3.5,1.2,inOut)
      :u<6.45?.85-.15*phase(u,5.55,.9,sine):.7+.15*phase(u,6.45,.9,sine);
    const logo=(start,drawStep,drawLength,fillStart,fillStep,fillLength)=>Array.from({length:5},(_,i)=>({
      stroke:phase(t,start+i*drawStep,drawLength,p=>inOut(p,2)),
      fill:phase(t,fillStart+i*fillStep,fillLength,p=>out(p,2))}));
    return {time:t,alpha:entry,scale:.74+.05*entry+.36*push,y,
      rotation:t<7.3?angle:angleAtExit+(-65-angleAtExit)*exit,x:-2200*exit,z:-7500*exit,
      visible:t<7.85,glow:t<7.3?glowBefore(t):glowBefore(7.3)*(1-phase(t,7.3,.3,p=>p**4)),
      glowScale:1+.25*phase(t,3.5,1.2,inOut),toolbar:phase(t,1.73,.4),left:phase(t,1.85,.45,expo),
      right:phase(t,1.87,.45,expo),canvas:phase(t,1.95,.4),art:phase(t,2,.55,back),
      layers:Array.from({length:count},(_,i)=>phase(t,2.07+(count-1)*.045*(i/(count-1))**2,.35)),
      selection:phase(t,2.75,.25),
      intro:{scale:1-phase(t,1,.35,p=>p**3),strokeAlpha:t<1?1-.7*phase(t,.6,.15,p=>out(p,2)):.3*(1-phase(t,1,.2,p=>out(p,2))),
        parts:logo(0,.06,.4,.5,.04,.08)},
      outro:{alpha:t>=7.9?1:0,scale:1+.04*phase(t,10.2,.2)-.04*phase(t,10.4,.2,inOut),
        strokeAlpha:1-.7*phase(t,9.7,.4,p=>p),parts:logo(7.9,.15,.8,9.3,.15,.15)},
      letters:Array.from({length:letters},(_,i)=>phase(t,10.7+i*.025,.12)),
      pill:{stroke:phase(t,11.7,.35,p=>inOut(p,2)),fill:phase(t,12.05,.15,p=>out(p,2)),text:phase(t,12.1,.2,p=>out(p,2))}};
  }
  function geometry(width,height) {
    if(![width,height].every(Number.isFinite)||width<900||height<600)throw new Error('Unsupported UI reveal geometry');
    const w=Math.min(1100,(width-64)/1.15),h=Math.floor(Math.min(680,(height-80)*(1-w*.575*Math.sin(35*Math.PI/180)/2800)/1.15));
    return {w,h,x:(width-w)/2,y:(height-h)/2,compact:width<1000,perspective:2800};
  }
  function contain(width,height,imageWidth,imageHeight,region) {
    if(![width,height,imageWidth,imageHeight].every(v=>Number.isFinite(v)&&v>0))throw new Error('UI reveal image is not ready');
    const scale=Math.min(width/imageWidth,height/imageHeight),w=imageWidth*scale,h=imageHeight*scale,x=(width-w)/2,y=(height-h)/2;
    return {x,y,w,h,selection:{x:x+w*region.x,y:y+h*region.y,w:w*region.width,h:h*region.height}};
  }
  function mount(host,c,onsets,data,make) {
    const board=make('div','ui-reveal-board',null,host),g=geometry(host.clientWidth,host.clientHeight-54);
    board.dataset.geometry=JSON.stringify(g);board.dataset.interfaceVariant='ui-3d-reveal';
    make('p','interface-source',c.source,host,true);
    const text=(tag,css,value,parent)=>{const n=make(tag,css,value,parent);n.dataset.uiRevealCopy='';return n;};
    const svg=(tag,attrs,parent)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
      for(const [key,value] of Object.entries(attrs))n.setAttribute(key,String(value));parent.appendChild(n);return n;};
    const prefix='scene-'+host.closest('.scene').dataset.productionIndex+'-ui-reveal';
    const logo=(parent,name)=>{
      const root=svg('svg',{class:'ui-reveal-logo',viewBox:'0 0 420 140','aria-hidden':'true'},parent),defs=svg('defs',{},root);
      const filter=svg('filter',{id:prefix+'-'+name+'-edge',x:'-5%',y:'-10%',width:'110%',height:'120%'},defs);
      svg('feMorphology',{in:'SourceAlpha',operator:'dilate',radius:1.2,result:'expanded'},filter);
      svg('feComposite',{in:'expanded',in2:'SourceAlpha',operator:'out',result:'edge'},filter);
      svg('feFlood',{'flood-color':'var(--lime)',result:'color'},filter);
      svg('feComposite',{in:'color',in2:'edge',operator:'in'},filter);
      const parts=Array.from({length:5},(_,i)=>{
        const id=prefix+'-'+name+'-'+i,clip=svg('clipPath',{id,clipPathUnits:'userSpaceOnUse'},defs);
        svg('rect',{x:84*i,y:0,width:84,height:140},clip);
        const group=svg('g',{'clip-path':'url(#'+id+')'},root);
        const drawId=id+'-draw',draw=svg('clipPath',{id:drawId,clipPathUnits:'userSpaceOnUse'},defs);
        const reveal=svg('rect',{x:0,y:0,width:420,height:0},draw);
        const stroke=svg('image',{href:'assets/logo.png',x:4,y:4,width:412,height:132,preserveAspectRatio:'xMidYMid meet',
          filter:'url(#'+prefix+'-'+name+'-edge)','clip-path':'url(#'+drawId+')'},group);
        const fill=svg('image',{href:'assets/logo.png',x:4,y:4,width:412,height:132,preserveAspectRatio:'xMidYMid meet'},group);
        return {reveal,stroke,fill};
      });
      return {root,parts};
    };
    const preload=make('img','ui-reveal-logo-ready',null,board);preload.src='assets/logo.png';preload.alt='';
    const intro=make('div','ui-reveal-intro',null,board),introLogo=logo(intro,'intro');
    const glow=make('div','ui-reveal-glow',null,board),scene=make('div','ui-reveal-perspective',null,board);
    const frame=make('div','ui-reveal-frame',null,scene);
    Object.assign(frame.style,{left:g.x+'px',top:g.y+'px',width:g.w+'px',height:g.h+'px'});
    const depth=make('div','ui-reveal-depth',null,frame);
    const card=make('div','ui-reveal-card'+(g.compact?' compact':''),null,frame);
    const toolbar=make('div','ui-reveal-toolbar',null,card),mark=make('img','ui-reveal-toolbar-logo',null,toolbar);
    mark.src='assets/logo.png';mark.alt='';text('h3','ui-reveal-heading',c.heading,toolbar);
    const layers=make('div','ui-reveal-layers',null,card);
    const rows=c.layers.map((label,i)=>{
      const row=make('div','ui-reveal-layer'+(i===c.selected?' selected':''),null,layers);
      make('i','ui-reveal-layer-icon',null,row);text('span','ui-reveal-layer-copy',label,row);return row;
    });
    const canvas=make('div','ui-reveal-canvas',null,card),artboard=make('div','ui-reveal-artboard',null,canvas);
    const image=make('img','ui-reveal-screenshot',null,artboard);image.src=data.assets[c.image];image.alt='';
    const selection=make('div','ui-reveal-selection',null,artboard);
    for(let i=0;i<4;i++)make('i','ui-reveal-handle',null,selection);
    const properties=make('div','ui-reveal-properties',null,card);
    c.properties.forEach(item=>{const row=make('div','ui-reveal-property',null,properties);
      text('p','ui-reveal-property-label',item.label,row);text('p','ui-reveal-property-value',item.value,row);});
    const outro=make('div','ui-reveal-outro',null,board),outroLogo=logo(outro,'outro');
    const tagline=text('p','ui-reveal-tagline','',outro);
    const letters=Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(c.tagline),part=>make('span','',part.segment,tagline));
    const pill=make('div','ui-reveal-pill',null,outro),pillSVG=svg('svg',{viewBox:'0 0 420 68','aria-hidden':'true'},pill);
    const fill=svg('rect',{class:'ui-reveal-pill-fill',x:2,y:2,width:416,height:64,rx:32},pillSVG);
    const border=svg('rect',{class:'ui-reveal-pill-border',x:2,y:2,width:416,height:64,rx:32,pathLength:500,'stroke-dasharray':500},pillSVG);
    const action=text('p','ui-reveal-action',c.action,pill);
    const show=(node,alpha,x=0,y=0,scale=1)=>{node.style.opacity=String(clamp(alpha));node.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';};
    const paintLogo=(nodes,s)=>{nodes.root.style.transform='scale('+s.scale+')';
      nodes.parts.forEach((part,i)=>{part.reveal.setAttribute('height',String(140*s.parts[i].stroke));part.stroke.style.opacity=String(s.strokeAlpha);part.fill.style.opacity=String(s.parts[i].fill);});};
    return time=>{
      if(!preload.complete||!preload.naturalWidth||!image.complete||!image.naturalWidth)throw new Error('UI reveal assets are not decoded');
      const clock=window.ShortCreatorCarousels.clock(time,onsets,duration),s=state(clock.time,c.layers.length,letters.length);
      board.style.visibility=clock.visible?'visible':'hidden';
      paintLogo(introLogo,s.intro);paintLogo(outroLogo,s.outro);outro.style.opacity=String(s.outro.alpha);
      glow.style.opacity=String(s.glow);glow.style.transform='scale('+s.glowScale+')';
      scene.style.transform='translateX('+(s.x*board.clientWidth/1920)+'px)';
      frame.style.visibility=s.visible&&clock.visible?'visible':'hidden';frame.style.opacity=String(s.alpha);
      frame.style.transform='translate3d(0,'+s.y+'px,'+s.z+'px) rotateY('+s.rotation+'deg) scale('+s.scale+')';
      show(toolbar,s.toolbar,0,-10*(1-s.toolbar));show(layers,s.left,-16*(1-s.left));show(properties,s.right,16*(1-s.right));
      show(canvas,s.canvas);show(artboard,s.art,0,0,.94+.06*s.art);
      rows.forEach((row,i)=>show(row,s.layers[i],-8*(1-s.layers[i])));
      const imageBox=contain(artboard.clientWidth,artboard.clientHeight,image.naturalWidth,image.naturalHeight,c.selection),r=imageBox.selection;
      Object.assign(selection.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px',opacity:String(s.selection)});
      letters.forEach((letter,i)=>show(letter,s.letters[i],0,8*(1-s.letters[i])));
      border.setAttribute('stroke-dashoffset',String(500*(1-s.pill.stroke)));fill.style.opacity=String(s.pill.fill);action.style.opacity=String(s.pill.text);
      board.dataset.uiReveal=JSON.stringify({clock,...s,imageBox});
    };
  }
  window.ShortCreatorUIReveal={duration,state,geometry,contain,mount};
})();
