/* Source-backed HyperFrames camera recipes, Apache-2.0. See production provenance.
   Cards use verified stills; movement never changes the caption or brand layers. */
(() => {
  'use strict';
  // Source camera-shake measurement table: three octaves, degrees/Hz per axis.
  const profiles=Object.freeze({
    'handheld-normal-mild':{lens:50,rot:[[[7,.15],[5,.1],null],[[4,.8],[2,.75],null],[[1,1.2],[.8,1.5],null]]},
    'handheld-normal-strong':{lens:50,rot:[[[10,.4],[10,.06],null],[[5,1.44],[3,.73],null],[[3,2.49],[1,2],null]]},
    'handheld-normal-extreme':{lens:50,rot:[[[15,.2],[7,.25],null],[[5,.9],[3,1],null],[[2,2],null,null]]},
    'handheld-wideangle-mild':{lens:28,rot:[[[12,.15],[5,.1],null],[[5,.6],[4,.45],null],[[1,1.5],[1,1.2],null]]},
    'handheld-wideangle-strong':{lens:28,rot:[[[17.46,.5],[5,.25],null],[[12.47,.94],[4,.5],[1,.4]],[[4,1.2],[2,1.3],null]]},
    'handheld-tele-mild':{lens:85,rot:[[[4,.2],[2,.15],null],[[2,.4],[2,.5],null],[[1,.7],[1,.6],null]]},
    'handheld-tele-strong':{lens:85,rot:[[[6.19,.39],[4,.15],[1,.1]],[[1.84,1.75],[.5,.9],null],[[2.3,2],[.5,1.4],null]]},
    'rig-6d-shake':{lens:50,rot:[[[.09,5.83],[.059,1.8],[.017,2.38]],[[.14,9.17],[.041,11.35],[.009,10.52]],[[.15,57.17],[.048,54.17],[.016,63.76]]],
      pos:[[[.011,3.2,1],[.059,1.9,1],[.021,3.33,1]],[[.009,7.7,1],[.04,9.1,0],[.009,9.22,1]],[[.002,51.51,1],[.05,55.54,1],[.017,58.55,1]]]},
    'rig-6d-wobble':{lens:50,rot:[[[.987,5.2],[1.34,5.39],[2,2.23]],[[.73,9.17],[.86,11.35],[.51,8.31]],[[.78,13.52],[.55,27.66],[.28,18.91]]]}
  });
  const kinds=['push-in','pull-back','punch-in','punch-reset','tilt','focus-rack','parallax-zoom','parallax-unzoom',
    ...Object.keys(profiles),'pendulum-left','pendulum-right','extended-left','extended-right','extended-up','extended-down'];
  const clamp=x=>Math.max(0,Math.min(1,x)),lerp=(a,b,p)=>a+(b-a)*p;
  const sine=p=>(1-Math.cos(Math.PI*clamp(p)))/2;
  const cubic=p=>{p=clamp(p);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  const quartic=p=>{p=clamp(p);return p<.5?8*p**4:1-(-2*p+2)**4/2;};
  const out=p=>1-(1-clamp(p))**3;
  function noiseHash(i,seed) {
    let h=Math.imul(i|0,374761393)+Math.imul(seed|0,668265263);
    h=(h^(h>>>13))>>>0;h=Math.imul(h,1274126177)>>>0;
    return ((h^(h>>>16))>>>0)/4294967296;
  }
  function noise(x,seed) {
    const i=Math.floor(x),f=x-i,u=f*f*f*(f*(f*6-15)+10);
    return noiseHash(i,seed)*(1-u)+noiseHash(i+1,seed)*u;
  }
  function channel(amplitude,frequency,time,seed,constant) {
    const u=frequency*time+seed*7.13;
    return (constant?Math.cos(u*2*Math.PI)*.5:noise(u,seed)-.5)*amplitude;
  }
  function sample(profile,time) {
    const result={rot:[0,0,0],pos:[0,0,0]};
    for(const field of ['rot','pos'])for(const [octave,axes] of (profile[field]||[]).entries())
      for(const [axis,ch] of axes.entries())if(ch)
        result[field][axis]+=channel(ch[0],ch[1],time,(field==='pos'?32:0)+octave*3+axis,ch[2]||0);
    return result;
  }
  function shake(style,p,W,H) {
    const profile=profiles[style];if(!profile||!Number.isFinite(p)||W<=0||H<=0)throw new Error('Invalid camera profile');
    const q=clamp(p),rad=Math.PI/180,D=H/2/Math.tan(Math.PI/6)*profile.lens/50;
    if(q===0||q===1)return {x:0,y:0,rx:0,ry:0,roll:0,scale:1,perspective:D};
    // A cue owns one finite impact, with real profile frequencies and no idle loop.
    const gain=Math.sin(Math.PI*q)**2,s=sample(profile,q*.8);
    const [pitch,yaw,roll]=s.rot.map(v=>v*gain),[px,py,pz]=s.pos.map(v=>v*gain);
    const maxTilt=Math.asin(Math.min(.9,.25*D/Math.hypot(W/2,H/2)))/rad;
    const tilt=v=>Math.max(-maxTilt,Math.min(maxTilt,v));
    const x=-D*Math.tan(yaw*rad)+px*240,y=D*Math.tan(pitch*rad)+py*240;
    const rx=tilt(pitch),ry=-tilt(yaw),r=tilt(roll),dolly=1+pz*240/D,rr=Math.abs(r)*rad;
    // Source coverage equation, evaluated per frame for the finite impact envelope.
    const need=Math.max((W*Math.cos(rr)+H*Math.sin(rr))/W,(H*Math.cos(rr)+W*Math.sin(rr))/H)*
      Math.max(1+2*Math.abs(x)/W,1+2*Math.abs(y)/H)*
      (1+(H/2+Math.abs(y))/D*Math.sin(Math.abs(rx)*rad)+(W/2+Math.abs(x))/D*Math.sin(Math.abs(ry)*rad))/Math.max(.5,dolly);
    const overscan=1+(Math.max(1,need)-1)*1.02;
    return {x,y,rx,ry,roll:r,scale:overscan*dolly,perspective:D};
  }
  // The extended-keyframe source solves its fast/slow velocity mixture once.
  function extendedTable() {
    const N=512,at=Math.round(.2*N);
    function table(tau) {
      const v=new Float64Array(N+1),sum=new Float64Array(N+1),c=.1/.9*tau/.29;
      for(let i=0;i<=N;i++){const t=i/N;v[i]=(1-Math.exp(-t/.04))*(Math.exp(-t/tau)+c*Math.exp(-t/.29));}
      for(let i=1;i<=N;i++)sum[i]=sum[i-1]+(v[i-1]+v[i])/2;
      const total=sum[N];for(let i=0;i<=N;i++)sum[i]/=total;return sum;
    }
    let lo=.005,hi=5;
    for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(table(mid)[at]>.87)lo=mid;else hi=mid;}
    return table((lo+hi)/2);
  }
  const extendedSamples=extendedTable();
  function extended(p) {
    const q=clamp(p);if(q===0||q===1)return q;
    const f=q*512,i=Math.floor(f);return lerp(extendedSamples[i],extendedSamples[i+1],f-i);
  }
  function state(style,progress,index=0,width=1920,height=1080,options={}) {
    if(!kinds.includes(style)||!Number.isFinite(progress))throw new Error('Unknown media camera state');
    const p=clamp(progress),s={scale:1,x:0,y:0,rx:0,ry:0,roll:0,dim:1,blur:0,pulse:0,glowX:0,glowY:0};
    if(style==='push-in') {
      const amount={subtle:.08,standard:.12,bold:.18}[options.intensity||'standard'];
      if(amount===undefined)throw new Error('Unknown push intensity');
      const t=p*3.35,part=t<=.8?.24*sine(t/.8):.24+.76*clamp((t-.8)/2.55);
      s.scale=1+amount*part;
    } else if(style==='pull-back') {
      const t=p*2.4;
      if(t<1.75){const a=1-(1-clamp((t-.55)/1.2))**5;s.scale=lerp(2.2,1.055,a);s.y=height*.007*a;}
      else {const a=sine((t-1.75)/.65);s.scale=lerp(1.055,1,a);s.y=height*.007*(1-a);}
      if(p===1){s.scale=1;s.y=0;}
    } else if(style==='punch-in'||style==='punch-reset') {
      const a=cubic(p),q=options.reset?1-a:a;
      s.scale=1+.11*q;s.y=-26/1080*height*q;s.rx=3*q;s.ry=-2*q;
      s.pulse=p===0||p===1?0:p<=.45?out(p/.45):1-clamp((p-.45)/.55)**3;
    } else if(style==='tilt') {
      const a=quartic(p);s.rx=-7*a;s.ry=10*a;s.glowX=12*a;s.glowY=10*a;
    } else if(style==='focus-rack') {
      const a=sine(p);
      if(index===0){s.scale=lerp(1.045,.94,a);s.x=-width*.014*a;s.y=height*lerp(-.005,.008,a);s.roll=lerp(-3,-1.6,a);s.dim=lerp(1,.5,a);s.blur=.0048*Math.min(width,height)*a;}
      else {s.scale=lerp(.93,1.04,a);s.x=width*lerp(.016,-.016,a);s.y=height*lerp(.008,-.004,a);s.roll=lerp(2.4,1.3,a);s.dim=lerp(.52,1,a);s.blur=.0048*Math.min(width,height)*(1-a);}
    } else if(profiles[style])Object.assign(s,shake(style,p,width,height));
    else if(style.startsWith('pendulum-'))s.roll=p===1?0:(style==='pendulum-left'?-1:1)*18*Math.exp(-2.3*p)*Math.cos(3.5*Math.PI*p);
    else if(style.startsWith('extended-')) {
      const direction=style.slice(9),remaining=1-extended(p);
      if(direction==='left'||direction==='right')s.x=(direction==='left'?-1:1)*width*.22*remaining;
      else s.y=(direction==='up'?-1:1)*height*.22*remaining;
    }
    return s;
  }
  function parallax(style,p,boxes,width,height,stacked) {
    if(!['parallax-zoom','parallax-unzoom'].includes(style))throw new Error('Unknown parallax direction');
    const travel=cubic(p),q=style==='parallax-zoom'?travel:1-travel;
    const target={x:32,y:32,w:width-64,h:height-64};
    return boxes.map((box,i)=>{
      if(i===1)return {...Object.fromEntries(Object.keys(target).map(k=>[k,lerp(box[k],target[k],q)])),alpha:1,scale:1,label:1,z:2};
      return {...box,x:box.x+(stacked?0:(i-1)*width*900/1920*q),
        y:box.y+(stacked?(i-1)*height*900/1080*q:0),alpha:1-q,
        scale:style==='parallax-zoom'?1-.4*q:.7+.3*travel,label:q===0?1:0,z:1};
    });
  }
  function mount(host,spec,onsets,data,make,reveal) {
    const c=spec.content,style=c.camera.style,stacked=['portrait','portrait-4x5'].includes(data.profile.id);
    const heading=make('h2','prod-heading',c.heading,host,true),board=make('div','media-camera-board',null,host);
    const source=make('p','resource-source',c.source,host,true);
    board.dataset.mediaCamera=style;
    const width=board.clientWidth,height=board.clientHeight,isParallax=style.startsWith('parallax-');
    const boxes=window.ShortCreatorMedia.rects(c.layout,width,height,stacked,style==='focus-rack'?80:style==='tilt'?72:32,style==='focus-rack'?80:24);
    board.style.perspective=width*1.2+'px';
    const cards=c.items.map((item,i)=>{
      const card=make('div','media-camera-card',null,board),picture=make('div','media-camera-picture',null,card);
      const image=make('img','media-camera-image',null,picture);image.src=data.assets[item.image];image.alt=item.label;
      const label=make('p','media-camera-label',item.label,card,true);card.dataset.cameraIndex=String(i);
      let light=null;
      if(style==='tilt') {
        light=make('div','media-camera-glow',null,picture);light.style.inset={tight:'-18%',standard:'-30%',wide:'-46%'}[c.camera.glow||'standard'];
      } else if(style.startsWith('punch-'))light=make('div','media-camera-defocus',null,picture);
      if(light)light.setAttribute('aria-hidden','true');
      return {card,picture,image,label,light};
    });
    return time=>{
      const entry=window.ShortCreatorStory.progress(time,onsets[0]),p=window.ShortCreatorStory.progress(time,onsets[1]);
      const reset=style==='punch-reset'&&Math.floor(time*30+1e-7)>=Math.ceil(onsets[2]*30);
      const progress=reset?window.ShortCreatorStory.progress(time,onsets[2]):p;
      const entered=Math.floor(time*30+1e-7)>=Math.ceil(onsets[0]*30),alpha=entered?out(entry):0;
      reveal(heading,out(entry),20);source.style.opacity=String(out(entry));
      const placement=isParallax?parallax(style,p,boxes,width,height,stacked):boxes.map(box=>({...box,scale:1,alpha:1,label:1,z:1}));
      const poses=[];
      cards.forEach(({card,picture,image,label,light},i)=>{
        const box=placement[i];
        Object.assign(card.style,{left:box.x+'px',top:box.y+'px',width:box.w+'px',height:box.h+'px',zIndex:String(box.z),opacity:String(alpha*box.alpha)});
        const recipe=Boolean(profiles[style])||style.startsWith('pendulum-')||style.startsWith('extended-');
        const s=state(style,progress,i,recipe?picture.clientWidth:width,recipe?picture.clientHeight:height,{...c.camera,reset});poses.push(s);
        card.style.transform=isParallax?`scale(${box.scale})`:style==='focus-rack'?`translate(${s.x}px,${s.y}px) rotate(${s.roll}deg) scale(${s.scale})`:
          style==='tilt'?`rotateX(${s.rx}deg) rotateY(${s.ry}deg)`:'none';
        label.style.opacity=String(box.label);
        const movingImage=['push-in','pull-back','punch-in','punch-reset'].includes(style);
        image.style.transform=movingImage?`perspective(${width*1200/1920}px) translateY(${s.y}px) rotateX(${s.rx}deg) rotateY(${s.ry}deg) scale(${s.scale})`:'none';
        if(recipe) {
          image.style.transformOrigin=style.startsWith('pendulum-')?'50% 0%':'50% 50%';
          picture.style.perspective=s.perspective?s.perspective+'px':'none';
          image.style.transform=progress>=1?'none':`translate(${s.x}px,${s.y}px) rotate(${s.roll}deg) rotateX(${s.rx}deg) rotateY(${s.ry}deg) scale(${s.scale})`;
        }
        image.style.filter=s.blur?`blur(${s.blur}px)`:'none';image.style.opacity=String(s.dim);
        if(light&&style==='tilt')light.style.transform=`translate(${s.glowX}%,${s.glowY}%)`;
        if(light&&style.startsWith('punch-'))light.style.opacity=String(s.pulse);
        picture.dataset.cameraCrop=String((movingImage||recipe)&&s.scale>1);
      });
      board.dataset.cameraProgress=String(progress);board.dataset.cameraPhase=reset?'return':'move';
      board.dataset.cameraState=JSON.stringify({style,progress,reset,placement,poses});
    };
  }
  window.ShortCreatorMediaCamera={kinds,profiles,noiseHash,noise,sample,shake,extended,state,parallax,mount};
})();
