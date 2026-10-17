/* HyperFrames transition catalog adaptations, Apache-2.0. See production provenance.
   Fixed internal recipes only: local stills, approved palette, 24-frame cue clock. */
(() => {
  'use strict';
  const groups=Object.freeze({
    push:['push-slide','vertical-push','elastic-push','squeeze'],
    cover:['staggered-blocks','horizontal-blinds','vertical-blinds'],
    radial:['circle-iris','diamond-iris','diagonal-split'],
    grid:['grid-dissolve'], '3d':['card-flip'], mechanical:['shutter','clock-wipe'],
    destruction:['page-burn'], distortion:['glitch','chromatic','ripple'],
    light:['light-leak','overexposure','film-burn'], other:['flash-cut','gravity-drop','morph-circle'],
    blur:['blur-through','directional-blur','calm-blur'],
    dissolve:['crossfade','blur-crossfade','focus-pull','color-dip'],scale:['zoom-through','zoom-out'],
    physical:['physical-toss','physical-drop','physical-slide'],rubber:['rubber-left','rubber-up'],
    morph:['condense','reshape'],page:['page-slide'],spectral:['spectral-left','spectral-right','spectral-up','spectral-down']
  });
  const kinds=Object.freeze(Object.values(groups).flat().map(name=>'catalog-'+name));
  const clamp=x=>Math.max(0,Math.min(1,x)),lerp=(a,b,p)=>a+(b-a)*p;
  function activeAt(time,onsets) {
    const frame=Math.floor(time*30+1e-7);
    let active=0;
    onsets.forEach((onset,i)=>{if(frame>=Math.ceil(onset*30))active=i;});
    return active;
  }
  function ease(name,value) {
    const p=clamp(value);
    if(name==='linear')return p;
    if(name==='sine-inout')return (1-Math.cos(Math.PI*p))/2;
    if(name==='sine-out')return Math.sin(Math.PI*p/2);
    const match=/^(in|out|inout)([2-5])$/.exec(name);
    if(!match)throw new Error('Unknown catalog easing');
    const power=+match[2];
    return match[1]==='in'?p**power:match[1]==='out'?1-(1-p)**power:
      p<.5?(2*p)**power/2:1-(2*(1-p))**power/2;
  }
  function track(initial,steps,time) {
    let value=initial;
    for(let i=0;i<steps.length;i++) {
      const [start,duration,target,curve='linear']=steps[i];if(time<start)break;
      const until=Math.min(time,steps[i+1]?.[0]??Infinity);
      value=lerp(value,target,duration===0?1:ease(curve,(until-start)/duration));
    }
    return value;
  }
  const tween=(t,start,duration,curve='linear')=>ease(curve,(t-start)/duration);
  const back=(p,s=1.7)=>{const q=clamp(p)-1;return 1+(s+1)*q**3+s*q**2;};
  const pose=(alpha=1)=>({x:0,y:0,scale:1,sx:1,rotation:0,rotationY:0,skew:0,alpha,blur:0,brightness:1,
    origin:'50% 50%',clip:'none',z:1});
  const polygon=points=>'polygon('+points.map(([x,y])=>`${100*x}% ${100*y}%`).join(',')+')';
  function clockPoints(p) {
    const rim=[[.5,0],[1,0],[1,.5],[1,1],[.5,1],[0,1],[0,.5],[0,0],[.5,0]];
    const travel=clamp(p)*8,index=Math.min(7,Math.floor(travel)),f=travel-index;
    return [[.5,.5],...rim.slice(0,index+1),rim[index].map((v,j)=>lerp(v,rim[index+1][j],f))];
  }
  const noise=x=>{
    const i=Math.floor(x),f=x-i,s=f*f*(3-2*f),hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
    return lerp(hash(i),hash(i+1),s);
  };
  function burnPoints(p,width,height) {
    const unit=Math.hypot(width,height)/Math.hypot(1920,1080);
    return Array.from({length:61},(_,i)=>{
      const angle=i/60*Math.PI*2,r=(p*1400+noise(angle*3+p*4)*80+noise(angle*8+p*9)*30)*unit;
      return [width/2+Math.cos(angle)*r,height/2+Math.sin(angle)*r];
    });
  }

  function state(kind,progress) {
    if(!kinds.includes(kind)||!Number.isFinite(progress))throw new Error('Invalid catalog transition');
    const p=clamp(progress),name=kind.slice(8),a=pose(),b=pose(0),layers=[];
    b.z=2;
    const result={a,b,layers,burn:0};
    if(p===0)return result;
    if(p===1){a.alpha=0;b.alpha=1;return result;}
    const swap=(t,at)=>{a.alpha=t<at?1:0;b.alpha=t<at?0:1;};
    const rect=(x,y,w,h,alpha=1,color='accent')=>layers.push({type:'rect',x,y,w,h,alpha,color});
    const flash=alpha=>rect(0,0,1,1,alpha,'accent');
    const glow=(mode,x,y,w,h,alpha,color='accent')=>layers.push({type:mode,x,y,w,h,alpha,color});
    if(name==='push-slide'||name==='vertical-push') {
      const q=ease('inout4',p),axis=name==='push-slide'?'x':'y';a[axis]=-q;b[axis]=1-q;b.alpha=1;
    } else if(name==='elastic-push') {
      const t=p*.75;a.x=-tween(t,0,.5,'in4');a.alpha=t>=.5?0:1;b.alpha=t>=.1?1:0;
      b.x=track(1,[[.1,.4,30/1920,'out5'],[.5,.15,-15/1920,'sine-inout'],[.65,.1,0,'sine-out']],t);
    } else if(name==='squeeze') {
      const t=p*.5;a.sx=1-tween(t,0,.4,'inout4');a.origin='0% 50%';
      b.sx=tween(t,.1,.4,'inout4');b.origin='100% 50%';b.alpha=1;
    } else if(name==='staggered-blocks') {
      const t=p*.59;swap(t,.32);
      rect(track(-1,[[.06,.25,0,'inout4'],[.34,.25,1,'inout4']],t),0,1,1,1,'secondary');
      rect(track(-1,[[0,.25,0,'inout4'],[.28,.25,1,'inout4']],t),0,1,1);
    } else if(name==='horizontal-blinds'||name==='vertical-blinds') {
      const t=p*.96;swap(t,.5);
      for(let i=0;i<8;i++) {
        const v=track(-1,[[i*.03,.2,0,'inout4'],[.55+i*.03,.2,1,'inout4']],t);
        if(name==='horizontal-blinds')rect(v,i/8,1,1/8,1,i%2?'secondary':'accent');
        else rect(i/8,v,1/8,1,1,i%2?'secondary':'accent');
      }
    } else if(name==='circle-iris'||name==='diamond-iris') {
      const q=ease('out3',p);b.alpha=1;
      b.clip=name==='circle-iris'?`circle(${75*q}% at 50% 50%)`:
        polygon([[.5,.5-q],[.5+q,.5],[.5,.5+q],[.5-q,.5]]);
    } else if(name==='diagonal-split') {
      const t=p*.55,q=tween(t,0,.5,'inout4'),tail=tween(t,.5,.05);
      const from=[[0,0],[1,0],[1,1],[0,1]],to=[[.6,0],[1,0],[1,.4],[.6,0]];
      a.clip=polygon(from.map((point,i)=>point.map((v,j)=>lerp(lerp(v,to[i][j],q),j===0?.6:0,tail))));
      a.z=3;b.alpha=1;
    } else if(name==='grid-dissolve') {
      const t=p*1.24;swap(t,.62);
      const cells=Array.from({length:12},(_,i)=>({i,dist:Math.hypot(i%4-1.5,Math.floor(i/4)-1)})).sort((a,b)=>a.dist-b.dist||a.i-b.i);
      cells.forEach(({i},order)=>rect(i%4/4,Math.floor(i/4)/3,1/4,1/3,
        track(0,[[order*.04,.15,1,'out3'],[.65+order*.04,.15,0,'in3']],t),i%2?'secondary':'accent'));
    } else if(name==='card-flip') {
      const q=ease('inout3',p);a.rotationY=180*q;b.rotationY=-180*(1-q);b.alpha=1;
    } else if(name==='shutter') {
      const t=p*.55,q=track(0,[[0,.25,1,'in4'],[.3,.25,0,'out4']],t);swap(t,.25);
      rect(0,-.5+.5*q,1,.5,1,'ground');rect(0,1-.5*q,1,.5,1,'ground');
    } else if(name==='clock-wipe') {
      b.alpha=1;b.clip=polygon(clockPoints(p));
    } else if(name==='page-burn') {
      const t=p*3,q=p*p;a.z=3;a.clip=`circle(${Math.max(0,75-q*80)}% at 50% 50%)`;
      b.alpha=tween(t,.5,2,'out2');result.burn=q;
    } else if(name==='glitch') {
      const t=p*.15,i=Math.min(3,Math.floor(t/.03));swap(t,.12);
      const red=[[40,-8],[-30,15],[60,-20],[-20,5]][i],blue=[[-30,12],[50,-10],[-40,8],[35,-15]][i];
      a.x=[-15,20,-25,-25][i]/1920;
      layers.push({type:'ghost',x:red[0]/1920,y:red[1]/1080,w:1,h:1,alpha:1,color:'accent'},
        {type:'ghost',x:blue[0]/1920,y:blue[1]/1080,w:1,h:1,alpha:1,color:'secondary'});
    } else if(name==='chromatic') {
      const t=p*.6;swap(t,.3);
      const x=track(0,[[0,.3,80/1920,'in3'],[.3,.3,0,'out3']],t);
      const alpha=track(.6,[[0,.3,.8,'in3'],[.3,.3,0,'out3']],t);
      for(const [sign,color] of [[-1,'accent'],[1,'secondary']])layers.push({type:'ghost',x:sign*x,y:0,w:1,h:1,alpha,color});
    } else if(name==='ripple') {
      const t=p*.4;
      a.x=track(0,[[0,.04,30],[.04,.04,-25],[.08,.04,20],[.12,.04,-15],[.16,.04,10]],t)/1920;
      a.scale=track(1,[[0,.04,1.02],[.04,.04,.98],[.08,.04,1.01],[.12,.04,.99]],t);
      a.blur=track(0,[[.04,.04,4],[.08,.04,6],[.12,.04,8],[.16,.04,10]],t);
      a.alpha=1-tween(t,.16,.04);const q=tween(t,.2,.2,'out3');
      b.alpha=t>=.16?1:0;b.x=-15/1920*(1-q);b.scale=1.02-.02*q;b.blur=8*(1-q);
    } else if(name==='light-leak') {
      const t=p*.9;swap(t,.45);
      glow('warm',0,0,1,1,track(0,[[0,.3,.4,'in2'],[.35,.15,.6,'in3'],[.5,.4,0,'out3']],t));
      glow('leak-a',(-400+track(0,[[.05,.5,300,'sine-inout'],[.5,.35,600,'out2']],t))/1920,-200/1080,2400/1920,1500/1080,
        track(0,[[.05,.5,.9,'sine-inout'],[.5,.35,0,'out2']],t));
      glow('leak-b',(-200+track(0,[[.1,.6,200,'sine-inout'],[.55,.35,400,'out2']],t))/1920,-100/1080,2400/1920,1400/1080,
        track(0,[[.1,.6,.8,'sine-inout'],[.55,.35,0,'out2']],t),'secondary');
    } else if(name==='overexposure') {
      const t=p*.9;swap(t,.55);a.brightness=track(1,[[0,.2,1.5,'in2'],[.2,.2,3,'in3']],t);
      a.scale=track(1,[[0,.2,1.03,'in2'],[.2,.2,1.06,'in3']],t);
      flash(track(0,[[.15,.25,.5,'in2'],[.4,.15,1,'in3'],[.55,.35,0,'out3']],t));
    } else if(name==='film-burn') {
      const t=p*.85;swap(t,.35);
      for(const [mode,start,travel,initialX,y,w,h,color] of [
        ['burn-a',0,-300,320,-300,2400,1800,'accent'],['burn-b',.05,-500,120,-200,2400,1600,'secondary'],
        ['burn-c',.1,-200,220,-100,2200,1400,'accent']]) {
        const duration=mode==='burn-a'?.4:mode==='burn-b'?.5:.45;
        const fade=mode==='burn-a'?.45:mode==='burn-b'?.5:.55;
        glow(mode,(initialX+track(0,[[start,duration,travel,'in2']],t))/1920,y/1080,w/1920,h/1080,
          track(0,[[start,duration,1,'in2'],[fade,.3,0,'out3']],t),color);
      }
    } else if(name==='flash-cut') {
      const t=p*.15;swap(t,.03);flash(track(0,[[0,.03,1,'out5'],[.05,.1,0,'out3']],t));
    } else if(name==='gravity-drop') {
      const q=ease('in4',p);a.y=1200/1080*q;a.rotation=4*q;a.z=3;b.alpha=1;
    } else if(name==='morph-circle') {
      const t=p*.7,q=tween(t,0,.5,'in4');swap(t,.5);
      layers.push({type:'circle',x:.5,y:.5,w:3000/1920*q,h:3000/1920*q,alpha:1-tween(t,.5,.15,'out3'),color:'accent'});
    } else if(['blur-through','directional-blur','calm-blur','blur-crossfade'].includes(name)) {
      const duration={'blur-through':.6,'directional-blur':.55,'calm-blur':1.4,'blur-crossfade':.6}[name],t=p*duration;
      if(name==='calm-blur') {
        a.blur=30*tween(t,0,.5,'in2');a.scale=1+.08*tween(t,0,.5,'in2');a.alpha=1-tween(t,.3,.3,'in2');
        b.alpha=tween(t,.5,.2);const q=tween(t,.7,.7,'out2');b.blur=30*(1-q);b.scale=.92+.08*q;
      } else {
        const directional=name==='directional-blur',cross=name==='blur-crossfade';
        const d=cross?.5:.4,delay=directional?.15:cross?.1:.2;
        const qa=tween(t,0,d,cross?'inout3':directional?'in4':'in3'),qb=tween(t,delay,d,cross?'inout3':directional?'out4':'out3');
        a.alpha=1-qa;b.alpha=qb;const blur=directional?12:cross?10:15;a.blur=blur*qa;b.blur=blur*(1-qb);
        if(directional){a.x=-200/1920*qa;b.x=200/1920*(1-qb);a.skew=-8*qa;b.skew=8*(1-qb);}
        else {const delta=cross?.03:.05;a.scale=1+delta*qa;b.scale=1-delta*(1-qb);}
      }
    } else if(name==='crossfade') {
      const q=ease('inout3',p);a.alpha=1-q;b.alpha=q;
    } else if(name==='focus-pull') {
      const t=p*.55;a.blur=15*tween(t,0,.5,'in2');a.alpha=1-tween(t,.25,.3,'in3');b.alpha=tween(t,.25,.3,'out3');
    } else if(name==='color-dip') {
      const t=p*.45;a.alpha=1-tween(t,0,.2,'in3');b.alpha=tween(t,.25,.2,'out3');
    } else if(name==='zoom-through') {
      const t=p*.55,qa=tween(t,0,.4,'in4'),qb=tween(t,.15,.4,'out4');
      a.scale=1+1.5*qa;a.alpha=1-qa;a.blur=8*qa;b.scale=.5+.5*qb;b.alpha=qb;b.blur=8*(1-qb);
    } else if(name==='zoom-out') {
      const q=ease('in4',p);a.z=3;b.alpha=1;a.scale=1-.7*q;a.alpha=1-q;
    } else if(name.startsWith('physical-')) {
      a.z=3;b.alpha=1;
      if(name==='physical-drop'){const q=ease('in3',p);a.y=1.7*q;a.rotation=9*q;}
      else if(name==='physical-slide') {
        const q=p<.72?ease('in5',p/.72):ease('out5',(p-.72)/.28);
        a.x=p<.72?.9*q:lerp(.9,1.6,q);a.skew=p<.72?-12*q:lerp(-12,-3,q);
        a.sx=p<.72?1+.08*q:lerp(1.08,1,q);a.rotation=p<.72?-2*q:lerp(-2,-5,q);
      } else {
        const q=p<.42?ease('out4',p/.42):ease('in3',(p-.42)/.58);
        a.x=p<.42?.34*q:lerp(.34,1.6,q);a.y=p<.42?-.36*q:lerp(-.36,.86,q);
        a.rotation=p<.42?8*q:lerp(8,18,q);
      }
    } else if(name.startsWith('rubber-')) {
      const t=p*2.5,axis=name==='rubber-left'?'x':'y',cross=axis==='x'?'y':'x';
      const positions=[.05,.085,.105,.1175,.1225],pull=track(0,positions.map((v,i)=>[i*.25,.25,v,'out3']),t);
      const release=clamp((t-1.55)/(.95*.84)),settle=clamp((t-1.55)/(.95*.78));
      const q=back(release),r=back(settle),arc=x=>Math.sin(Math.PI*clamp(x))**2;
      a.z=3;b.z=1;a[axis]=t<1.55?pull:lerp(.1225,-1.12,q);
      a[cross]=(axis==='x'?-.03:.03)*arc(release);
      b[axis]=-.05*(1-r);b[cross]=(axis==='x'?.016:-.016)*arc(settle);
      b.scale=lerp(.985,1,r);b.alpha=clamp(lerp(.82,1,r));
      const band=lerp(.08+pull/.14,.04,ease('out5',(t-1.55)/(.95*.28)));
      const alpha=.7*(1-ease('out5',(t-1.55)/(.95*.28)));
      for(const at of [.34,.66])if(axis==='x')rect(0,at,.14*band,.006,alpha);else rect(at,0,.006,.14*band,alpha);
    } else if(name==='condense') {
      const t=p*.75,qa=tween(t,0,.35,'in3'),qb=back((t-.2)/.55,1.6);
      a.scale=lerp(1,.72,qa);a.alpha=1-qa;b.scale=lerp(.72,1,qb);b.alpha=clamp(qb);
    } else if(name==='reshape') {
      const t=p*1.05,qa=tween(t,0,.6,'inout3'),qb=tween(t,.4,.65,'out3');
      a.sx=lerp(1,.68,qa);a.sy=lerp(1,1.34,qa);a.alpha=1-tween(t,.15,.45,'in2');
      b.sx=lerp(.68,1,qb);b.sy=lerp(1.34,1,qb);b.alpha=qb;
    } else if(name==='page-slide') {
      const q=ease('inout4',p);a.x=-.28*q;a.scale=1-.06*q;b.x=1-q;b.alpha=1;
    } else if(name.startsWith('spectral-')) {
      const direction=name.slice(9),vertical=['up','down'].includes(direction),axis=vertical?'y':'x';
      const sign=['right','down'].includes(direction)?-1:1,t=p*.9,q=ease('inout4',p);
      a[axis]=-70/760*q*sign;a.scale=1-.04*q;a.blur=5*q;
      b[axis]=60/760*(1-q)*sign;b.scale=1+.04*(1-q);b.alpha=1;
      const clip=[0,0,0,0],edge={left:1,right:3,up:0,down:2}[direction];clip[edge]=100*(1-q);
      b.clip='inset('+clip.map(x=>x+'%').join(' ')+')';
      layers.push({type:'spectral-sweep',x:lerp(-1.1,1.1,tween(t,.18,.58,'inout3')),y:0,w:1,h:1,alpha:1,color:'accent'});
      const elapsed=t-.32,step=Math.floor(elapsed/.07),strobe=elapsed>=0&&elapsed<.28&&step%2===1;
      if(strobe)layers.push({type:'spectral-fringe',x:16/760,y:0,w:1,h:1,alpha:1,color:'accent'});
    } else throw new Error('Unimplemented catalog transition');
    return result;
  }

  function paintBurn(canvas,p,colors) {
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Cannot paint local burn overlay');
    const w=canvas.width,h=canvas.height,unit=Math.hypot(w,h)/Math.hypot(1920,1080);
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,w,h);
    if(p<=0||p>=1)return;
    const points=burnPoints(p,w,h);ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
    const radius=p*1400*unit,g=ctx.createRadialGradient(w/2,h/2,radius*.8,w/2,h/2,radius*1.1);
    const rgba=(hex,alpha)=>`rgba(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(',')},${alpha})`;
    g.addColorStop(0,rgba(colors.accent,0));g.addColorStop(.7,rgba(colors.accent,.6));
    g.addColorStop(.9,rgba(colors.secondary,.8));g.addColorStop(1,rgba(colors.accent,.4));ctx.fillStyle=g;ctx.fill();
    for(let i=0;i<Math.floor(p*40);i++) {
      const angle=noise(i*.7+p*2)*Math.PI*2,r=radius*(.85+noise(i*1.3+p*5)*.15);
      ctx.beginPath();ctx.arc(w/2+Math.cos(angle)*r,h/2+Math.sin(angle)*r,(2+noise(i*2.1)*4)*unit,0,Math.PI*2);
      ctx.fillStyle=rgba(i%2?colors.secondary:colors.accent,.4+noise(i*1.7)*.4);ctx.fill();
    }
  }

  function mount(view,images,onsets,kind) {
    if(!kinds.includes(kind))throw new Error('Unknown catalog swap');
    const w=view.clientWidth,h=view.clientHeight;
    view.classList.add('catalog-swap-view');view.dataset.screenSwap=kind;
    view.style.perspective=(1200*w/1920)+'px';
    images.forEach(image=>image.classList.add('catalog-swap-image'));
    const make=(tag,css)=>{const node=document.createElement(tag);node.className=css;view.appendChild(node);return node;};
    const overlay=make('div','catalog-swap-overlay'),nodes=Array.from({length:12},()=>{
      const n=document.createElement('div');n.className='catalog-swap-layer';overlay.appendChild(n);return n;
    });
    overlay.setAttribute('aria-hidden','true');
    const canvas=kind==='catalog-page-burn'?make('canvas','catalog-swap-burn'):null;
    if(canvas){canvas.width=w;canvas.height=h;canvas.setAttribute('aria-hidden','true');}
    const style=getComputedStyle(view),colors={accent:style.getPropertyValue('--lime').trim(),secondary:style.getPropertyValue('--cyan').trim()};
    if(!Object.values(colors).every(color=>/^#[\da-f]{6}$/i.test(color)))throw new Error('Catalog swaps need approved colors');
    function apply(image,pose) {
      const s=image.style;s.opacity=String(pose.alpha);s.visibility=pose.alpha>0?'visible':'hidden';s.zIndex=String(pose.z);
      s.transformOrigin=pose.origin;s.clipPath=pose.clip;
      const sy=pose.sy??1;
      const settled=pose.x===0&&pose.y===0&&pose.rotation===0&&pose.rotationY===0&&pose.skew===0&&pose.scale===1&&pose.sx===1&&sy===1;
      s.transform=settled?'none':`translate(${pose.x*w}px,${pose.y*h}px) rotate(${pose.rotation}deg) rotateY(${pose.rotationY}deg) skewX(${pose.skew}deg) scale(${pose.scale*pose.sx},${pose.scale*sy})`;
      s.filter=pose.blur===0&&pose.brightness===1?'none':`blur(${pose.blur*w/1920}px) brightness(${pose.brightness})`;
    }
    return time=>{
      const active=activeAt(time,onsets);
      const p=window.ShortCreatorStory.progress(time,onsets[active]),frame=state(kind,active?p:1);
      images.forEach(image=>apply(image,pose(0)));
      if(active)apply(images[active-1],frame.a);apply(images[active],frame.b);
      nodes.forEach((node,i)=>{
        const layer=frame.layers[i];node.style.display=layer?'block':'none';if(!layer)return;
        node.dataset.layerType=layer.type;node.dataset.color=layer.color;
        const s=node.style;s.opacity=String(layer.alpha);s.left=layer.x*w+'px';s.top=layer.y*h+'px';
        s.width=layer.w*(layer.type==='circle'?Math.max(w,h):w)+'px';
        s.height=layer.h*(layer.type==='circle'?Math.max(w,h):h)+'px';s.transform=layer.type==='circle'?'translate(-50%,-50%)':'none';
        s.backgroundImage=layer.type==='ghost'?`linear-gradient(color-mix(in srgb,var(--catalog-color),transparent 65%),color-mix(in srgb,var(--catalog-color),transparent 65%)),url("${images[Math.max(0,active-1)].src}")`:'';
      });
      if(canvas)paintBurn(canvas,frame.burn,colors);
      view.dataset.swapIndex=String(active);view.dataset.swapProgress=String(p);view.dataset.catalogLayers=String(frame.layers.length);
      view.dataset.catalogBurn=String(frame.burn);
    };
  }
  window.ShortCreatorSwapCatalog={groups,kinds,activeAt,ease,track,clockPoints,noise,burnPoints,state,mount};
})();
