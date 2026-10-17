/* HyperFrames anamorphic field, mesh card and stop-motion time law, Apache-2.0.
   Fixed source recipes, approved colors and absolute native cue frames. */
(() => {
  'use strict';
  const kinds=Object.freeze(['anamorphic-flare','mesh-card','stop-motion-8','stop-motion-10','stop-motion-12','facet-morph','soft-blob-touch','scope-sine','scope-square','scope-triangle']);
  const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,p)=>a+(b-a)*p,TAU=Math.PI*2;
  const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  function emitters() {
    let seed=1337;
    const next=()=>{seed|=0;seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
    // Keep source PRNG draw order, including the hue/saturation slots now
    // replaced by the approved palette. Normalize only pixel coordinates.
    return Array.from({length:140},()=>({x0:next(),y0:next(),ax:(24+next()*90)/1920,ay:(12+next()*48)/1080,
      fx:.018+next()*.05,fy:.015+next()*.045,px:next(),py:next(),r:3+next()**1.6*10,
      hue:next(),saturation:.62+next()*.38,v:.7+next()*.3,fb:.03+next()*.09,pb:next()}));
  }
  function emitterPose(e,t,w,h) {
    if(![t,w,h].every(Number.isFinite)||t<0||t>10||w<=0||h<=0)throw new Error('Invalid flare frame');
    const tau=t*.5;
    return {x:(e.x0+e.ax*Math.sin(TAU*(e.fx*tau+e.px)))*w,y:(e.y0+e.ay*Math.sin(TAU*(e.fy*tau+e.py)))*h,
      radius:e.r*Math.min(w/1920,h/1080),brightness:Math.max(0,e.v*(.62+.38*Math.sin(TAU*(e.fb*tau+e.pb)))),
      gain:.75+.35*Math.sin(Math.PI*t/10)};
  }
  function highpass(color,brightness,tint,gain) {
    const hp=color.map((v,i)=>Math.max(0,v*brightness-.3)*tint[i]),peak=Math.max(...hp);
    return {alpha:peak*5*gain/(80/3),hue:peak>0?hp.map(v=>v/peak):[0,0,0]};
  }
  const throws=Object.freeze([
    {t0:.15,t1:1,fromX:-.12,fromY:.28,to:.3,arc:.3,rot0:-170,rot1:8,squash:.3,life:2,w:.13,h:.13},
    {t0:.6,t1:1.5,fromX:1.12,fromY:.2,to:.56,arc:.34,rot0:150,rot1:-6,squash:.34,life:3,w:.15,h:.15},
    {t0:1.25,t1:2,fromX:.78,fromY:-.12,to:.72,arc:.06,rot0:-120,rot1:5,squash:.26,life:2,w:.16,h:.14},
    {t0:1.8,t1:2.55,fromX:-.08,fromY:.1,to:.43,arc:.4,rot0:200,rot1:-12,squash:.22,life:3,w:.09,h:.09},
  ]);
  function stopPose(index,time,fps,w,h) {
    if(!Number.isInteger(index)||index<0||index>=4||![8,10,12].includes(fps)||
       ![time,w,h].every(Number.isFinite)||w<=0||h<=0)throw new Error('Invalid stop-motion frame');
    const step=Math.floor(Math.max(0,Math.min(3,time))*fps+1e-6),ts=step/fps,th=throws[index];
    const land=Math.round(th.t1*fps),d=step-land,unit=Math.min(w,h),visible=ts>=th.t0;
    const u=d>=0?1:clamp((ts-th.t0)/(th.t1-th.t0)),x=mix(th.fromX,th.to,u)*w;
    const y=(mix(th.fromY,.72,u)-th.arc*4*u*(1-u))*h,rot=mix(th.rot0,th.rot1,1-(1-u)**2);
    const a=d<0||d>=5?0:[1,.55,-.3,.1,0][d]*th.squash,boil=Math.floor(step/2);
    // Edge jitter performs the throw/landing only. The source's continuing
    // idle boil is stopped after all four shapes have recovered.
    const moving=step<Math.round(2.55*fps)+4;
    const bx=moving&&visible?(hash(boil*13+index*101)-.5)*.008*unit:0;
    const by=moving&&visible?(hash(boil*29+index*211)-.5)*.008*unit:0;
    const br=moving&&visible?(hash(boil*47+index*331)-.5)*1.6:0;
    const height=clamp((.72*h-y)/(.45*h)),shadowScale=mix(1.05,.55,height);
    return {step,visible,x:x+bx,y:y+by,rotation:rot+br,sx:1+a,sy:1-a*.85,width:th.w*unit,height:th.h*unit,
      shadow:{x:x-.06*unit,y:.72*h-.01*unit,sx:shadowScale*(d>=0?1+a:1),sy:shadowScale*.9,alpha:visible?mix(.85,.25,height):0},
      sparkle:{visible:d>=0&&d<th.life,x:x+(index%2===0?-1:1)*th.w*unit*.62,y:.72*h-th.h*unit*.9+.0275*unit,
        scale:d%2===0?1:.62,rotation:d%2===0?0:45},settled:!moving};
  }
  function clock(style,time,onsets) {
    if(!kinds.includes(style))throw new Error('Unknown canvas backdrop');
    const base=window.ShortCreatorGpuBackdrops.clock(time,onsets);
    if(style.startsWith('scope-'))return {...base,sourceTime:base.seconds*3};
    if(style==='facet-morph'||style==='soft-blob-touch')return {...base,sourceTime:base.seconds/2*(style==='facet-morph'?4.1025:3.1625)};
    if(style==='anamorphic-flare'||style==='mesh-card')return {...base,sourceTime:base.seconds*(style==='mesh-card'?4.3:5)};
    if(onsets[1]-onsets[0]<3-1e-8)throw new Error('Stop motion requires three seconds before its settle cue');
    const frame=Math.floor(time*30+1e-7),start=Math.ceil(onsets[0]*30),elapsed=Math.max(0,frame-start)/30;
    return {...base,sourceTime:Math.min(3,elapsed),cadence:Number(style.slice(12))};
  }
  const rgb=hex=>{if(!/^#[\da-f]{6}$/i.test(hex))throw new Error('Canvas backdrop requires approved colors');return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);};
  const rgba=(color,a)=>`rgba(${color.map(v=>Math.round(clamp(v)*255)).join(',')},${clamp(a)})`;
  function polygon(ctx,points,w,h) {
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*w-w/2,y*h-h):ctx.moveTo(x*w-w/2,y*h-h));ctx.closePath();
  }
  const star=[[.5,0],[.63,.34],[.98,.35],[.7,.57],[.81,.91],[.5,.7],[.19,.91],[.3,.57],[.02,.35],[.37,.34]];
  const sparkle=[[.5,0],[.6,.4],[1,.5],[.6,.6],[.5,1],[.4,.6],[0,.5],[.4,.4]];
  function meshCardPose(t) {
    if(!Number.isFinite(t)||t<0||t>8.6)throw new Error('Invalid mesh-card frame');
    const quartic=p=>{p=clamp(p);return p<.5?8*p**4:1-(-2*p+2)**4/2;};
    const inset=quartic((t-3.8)/1.1)*(1-quartic(t-7.6));
    return {x:240/1920*inset,y:140/1080*inset,width:1-.25*inset,height:1-280/1080*inset,
      radius:40*inset,scale:1+.14*(1-clamp(t/1.2))**4};
  }
  function paintMeshCard(ctx,w,h,t,colors) {
    const pose=meshCardPose(t),unit=Math.min(w/1920,h/1080),bg=rgb(colors.background);
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';
    ctx.fillStyle=colors.background;ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(pose.x*w,pose.y*h);
    ctx.beginPath();ctx.roundRect(0,0,pose.width*w,pose.height*h,pose.radius*unit);ctx.clip();
    ctx.fillStyle=rgba(bg.map(v=>v*.93+.07),1);ctx.fillRect(0,0,w,h);
    for(const [x,y,r,opacity,color] of [[.28,.32,950,.85,colors.accent],[.74,.66,1100,.8,colors.secondary]]) {
      const radius=r*unit*pose.scale,g=ctx.createRadialGradient(x*w,y*h,0,x*w,y*h,radius);
      g.addColorStop(0,rgba(rgb(color),opacity));g.addColorStop(.72,rgba(rgb(color),0));g.addColorStop(1,rgba(rgb(color),0));
      ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    }
    ctx.restore();return pose;
  }
  function paintStop(ctx,w,h,t,fps,colors) {
    const unit=Math.min(w,h),accent=rgb(colors.accent),fg=rgb(colors.foreground);
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';
    ctx.fillStyle=colors.background;ctx.fillRect(0,0,w,h);
    ctx.fillStyle=rgba(fg,.22);ctx.fillRect(w*.14,h*.72,w*.72,unit*.0035);
    const poses=throws.map((_,i)=>stopPose(i,t,fps,w,h));
    poses.forEach((s,i)=>{
      const sh=s.shadow;ctx.save();ctx.translate(sh.x+unit*.06,sh.y+unit*.01);ctx.scale(sh.sx,sh.sy);
      ctx.fillStyle=rgba(fg,.14*sh.alpha);ctx.beginPath();ctx.ellipse(0,0,.06*unit,.01*unit,0,0,TAU);ctx.fill();ctx.restore();
      if(!s.visible)return;
      ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rotation*Math.PI/180);ctx.scale(s.sx,s.sy);
      ctx.fillStyle=i===0?colors.accent:i===1?rgba(fg,.72):i===2?rgba(fg,.45):rgba(fg.map((v,j)=>v*.82+accent[j]*.18),1);
      ctx.beginPath();
      if(i===0)ctx.arc(0,-s.height/2,s.width/2,0,TAU);
      else if(i===1)ctx.roundRect(-s.width/2,-s.height,s.width,s.height,unit*.016);
      else polygon(ctx,i===2?[[.5,0],[1,1],[0,1]]:star,s.width,s.height);
      ctx.fill();ctx.restore();
      const sp=s.sparkle;
      if(sp.visible){ctx.save();ctx.translate(sp.x,sp.y);ctx.rotate(sp.rotation*Math.PI/180);ctx.scale(sp.scale,sp.scale);
        ctx.translate(0,unit*.0275);polygon(ctx,sparkle,unit*.055,unit*.055);ctx.fillStyle=colors.foreground;ctx.fill();ctx.restore();}
    });
    return poses;
  }
  function paintFlare(ctx,buffer,w,h,t,colors,points) {
    const accent=rgb(colors.accent),secondary=rgb(colors.secondary),white=rgb(colors.foreground);
    const work=buffer.getContext('2d');if(!work)throw new Error('Cannot paint flare buffer');
    const sw=buffer.width,sh=buffer.height,sx=sw/w,sy=sh/h,halfLen=w*.125;
    work.setTransform(1,0,0,1,0,0);work.globalAlpha=1;work.clearRect(0,0,sw,sh);work.globalCompositeOperation='lighter';
    const rows=points.map(e=>({pose:emitterPose(e,t,w,h),color:e.hue<.5?accent:secondary}));
    for(const {pose:s,color} of rows) {
      const pass=highpass(color,s.brightness,secondary,s.gain);if(pass.alpha<.003)continue;
      const bx=s.x*sx,by=s.y*sy,bh=Math.max(1,s.radius*2*sy),bl=halfLen*sx;
      const g=work.createLinearGradient(bx-bl,0,bx+bl,0);
      g.addColorStop(0,rgba(pass.hue,0));g.addColorStop(.5,rgba(pass.hue,pass.alpha));g.addColorStop(1,rgba(pass.hue,0));
      work.fillStyle=g;work.fillRect(bx-bl,by-bh/2,bl*2,bh);
    }
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.filter='none';ctx.globalCompositeOperation='source-over';
    ctx.fillStyle=colors.background;ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(buffer,0,0,sw,sh,0,0,w,h);
    for(const {pose:s,color} of rows) {
      const col=color.map(v=>v*s.brightness),g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.radius);
      g.addColorStop(0,rgba(col.map((v,i)=>v*.88+white[i]*.12),1));g.addColorStop(.72,rgba(col,.96));g.addColorStop(1,rgba(col,0));
      ctx.fillStyle=g;ctx.fillRect(s.x-s.radius,s.y-s.radius,s.radius*2,s.radius*2);
    }
    ctx.globalCompositeOperation='source-over';
  }
  function mount(host,content,onsets,make,reveal) {
    clock(content.style,0,onsets);
    const copy=make('div','screen-copy',null,host),heading=make('h2','prod-heading',content.heading,copy,true);
    const caption=make('p','screen-caption',content.caption,copy,true),view=make('div','screen-device backdrop-art',null,host);
    const canvas=make('canvas','backdrop-canvas',null,view);canvas.setAttribute('aria-hidden','true');
    canvas.width=view.clientWidth;canvas.height=view.clientHeight;Object.assign(canvas.style,{width:'100%',height:'100%',display:'block'});
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Cannot paint canvas backdrop');
    const css=getComputedStyle(host),colors={background:css.getPropertyValue('--purple').trim(),accent:css.getPropertyValue('--lime').trim(),
      secondary:css.getPropertyValue('--cyan').trim(),foreground:'#ffffff'};
    Object.values(colors).forEach(rgb);
    const buffer=document.createElement('canvas');buffer.width=Math.max(1,Math.round(canvas.width*.25));buffer.height=Math.max(1,Math.round(canvas.height*.25));
    const points=content.style==='anamorphic-flare'?emitters():[];let last=null,poses=null,card=null,organic=null,optical=null;
    view.dataset.backdrop=content.style;
    return time=>{
      const s=clock(content.style,time,onsets),e=1-(1-s.entry)**3;
      reveal(heading,e,32);reveal(caption,e,24);canvas.style.opacity=String(e);
      if(s.sourceTime!==last) {
        if(points.length)paintFlare(ctx,buffer,canvas.width,canvas.height,s.sourceTime,colors,points);
        else if(content.style==='mesh-card')card=paintMeshCard(ctx,canvas.width,canvas.height,s.sourceTime,colors);
        else if(content.style==='facet-morph'||content.style==='soft-blob-touch')organic=window.ShortCreatorOrganicFields.paint(ctx,canvas.width,canvas.height,s.sourceTime,colors,content.style);
        else if(content.style.startsWith('scope-'))optical=window.ShortCreatorOpticalFields.paintScope(ctx,canvas.width,canvas.height,s.sourceTime,colors,content.style.slice(6));
        else poses=paintStop(ctx,canvas.width,canvas.height,s.sourceTime,s.cadence,colors);
        last=s.sourceTime;
      }
      view.dataset.backdropProgress=String(s.entry);view.dataset.canvasState=JSON.stringify({...s,poses,card,organic,optical,emitters:points.length});
      view.dataset.canvasPalette=JSON.stringify(colors);
    };
  }
  window.ShortCreatorCanvasBackdrops={kinds,emitters,emitterPose,highpass,throws,stopPose,clock,meshCardPose,paintMeshCard,paintFlare,paintStop,mount};
})();
