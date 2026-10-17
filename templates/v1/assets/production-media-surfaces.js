/* HyperFrames surface, light and device mechanics; Apache-2.0 source provenance
   is recorded in the native engine. Only verified still-image pixels are treated. */
(() => {
  'use strict';
  const kinds=['blur-fill','mirror-fill','copy-fill','screen','grain','vignette','light-sweep',
    'light-leak','editorial-flash','beat-accent','feather-focus','lcd','phone','tablet','freeze-paper','phone-dive','drift-accent'];
  const clamp=x=>Math.max(0,Math.min(1,x)),lerp=(a,b,p)=>a+(b-a)*p;
  const out=(p,power=3)=>1-(1-clamp(p))**power;
  const sine=p=>(1-Math.cos(Math.PI*clamp(p)))/2;
  const expo=p=>{p=clamp(p);return p===1?1:1-2**(-10*p);};
  const grainOffsets=[[0,0],[-5,-5],[-10,5],[5,-10],[-5,15],[-10,5],[15,0],[0,10],[-15,0],[10,5]];
  function fit(w,h,iw,ih) {
    if(![w,h,iw,ih].every(n=>Number.isFinite(n)&&n>0))throw new Error('Invalid media surface dimensions');
    const scale=Math.min(w/iw,h/ih),width=iw*scale,height=ih*scale;
    return {x:(w-width)/2,y:(h-height)/2,width,height};
  }
  function devicePose(p) {
    const t=clamp(p)*1.08;
    if(t<=.18)return {y:18,scale:.94};
    if(t<=.9){const q=out((t-.18)/.72);return {y:lerp(18,-1.2,q),scale:lerp(.94,1.01,q)};}
    let q=clamp((t-.9)/.18);q=q<.5?2*q*q:1-(-2*q+2)**2/2;
    return {y:lerp(-1.2,0,q),scale:lerp(1.01,1,q)};
  }
  function state(style,progress) {
    if(!kinds.includes(style)||!Number.isFinite(progress))throw new Error('Unknown media surface state');
    const p=clamp(progress),s={p,alpha:out(p),scale:1,x:0,y:0,flash:0};
    if(style==='drift-accent') {
      const phase=p===1?0:p*2*Math.PI;
      return {...s,rotation:Math.sin(phase+Math.PI/6)*.6,scale:1+Math.sin(phase+Math.PI/2)*.015,
        sweepX:Math.sin(phase-Math.PI/2)*42,sweepAlpha:.12+Math.sin(phase+Math.PI/3)*.08};
    }
    if(style==='freeze-paper') {
      const t=p*4,hit=.96,exit=clamp((t-3.7)/.24)**3;
      const tape=at=>{const a=out((t-at)/.24);return {alpha:a*(1-exit),scale:1.18-.18*a};};
      return {...s,flash:t<1.02?.95*out((t-hit)/.06):.95*(1-clamp((t-1.02)/.24)**3),
        paper:.64*out((t-1)/.18)*(1-exit),tapes:[tape(1.26),tape(1.38)]};
    }
    if(style==='phone-dive') {
      const t=p*2.7,rise=1.05*.78,settle=1.05-rise,dive=1.65*.72,depth=1.65-dive;
      const a=out(t/rise,4),b=out((t-rise)/settle),zoom=clamp((t-1.05)/1.65)**5;
      const spread=clamp((t-1.05)/dive)**5,resolve=out((t-1.05-dive)/depth,5);
      const entry=t<rise?{y:lerp(18,-1,a),scale:lerp(.86,1.02,a)}:{y:-(1-b),scale:1.02-.02*b};
      return {...s,alpha:a,y:entry.y+2.4*zoom,scale:entry.scale+5.4*zoom,cutout:1-out((t-1.05)/(dive*.45)),
        layers:[[-1.2,1.035],[-2.1,1.09],[2.4,1.16]].map(([y,scale])=>({y:y*spread*(1-resolve),scale:1+(scale-1)*spread*(1-resolve)}))};
    }
    if(style.endsWith('-fill')) {
      const t=p*1.344,q=out((t-.32)/1.024,4);
      return {...s,alpha:q,y:34/1080*(1-q),scale:1.05-.05*Math.sin(Math.PI*p/2)};
    }
    if(style==='grain')return {...s,offset:grainOffsets[p===1?0:Math.min(9,Math.floor(p*10))]};
    if(style==='screen')return {...s,scale:.96+.04*out(p)};
    if(style==='light-sweep') {
      const t=p*3.05,x=t<.9?-35:t<=2.5?lerp(-35,118,sine((t-.9)/1.6)):lerp(118,62,out((t-2.5)/.55));
      const band=t<.9||t>=2.5?0:t<1.2?out((t-.9)/.3,2):t<2.15?1:1-clamp((t-2.15)/.35)**2;
      return {...s,lightX:x,band,glow:clamp(1-Math.abs(x-50)/26),ambient:Math.max(0,Math.min(.16,(26-x)/130))};
    }
    if(style==='light-leak') {
      const q=sine(p),alpha=p<.08?0:p<.32?.9*Math.sin(clamp((p-.08)/.24)*Math.PI/2):p<.42?.9:
        p<.62?lerp(.9,.46,sine((p-.42)/.2)):p<.68?.46:p<.94?.46*Math.cos(clamp((p-.68)/.26)*Math.PI/2):0;
      return {...s,alpha,amber:{x:lerp(-20,18,q),scale:lerp(.92,1.1,q),rotation:lerp(-4,2,q)},
        red:{x:lerp(20,-16,q),y:lerp(-8,8,q),scale:lerp(1.08,.94,q)},gold:{x:lerp(-28,24,q),rotation:lerp(-6,4,q)}};
    }
    if(style==='editorial-flash') {
      // Snap the source's short attack peak to native frame 13 so capture
      // cannot step over it; its authored attack/decay durations are retained.
      const t=p*.8,hit=13/30-.04,a=clamp((t-hit)/.04),b=clamp((t-hit+.01)/.05),after=t>=hit+.04;
      return {...s,wash:after?.92*(1-out((t-hit-.04)/.18,4)):.92*a**5,
        core:after?1-out((t-hit-.04)/.34):b**5,coreScale:after?lerp(1,1.18,out((t-hit-.04)/.34)):lerp(.86,1,b**5),
        sweep:after?.9*(1-out((t-hit-.04)/.3)):.9*a**5,sweepX:after?lerp(8,28,out((t-hit-.04)/.3)):lerp(-12,8,a**5)};
    }
    if(style==='beat-accent') {
      const t=p*.9,attack=expo((t-.25)/.12),release=out((t-.37)/.28,4),flashIn=expo((t-.25)/.08),flashOut=out((t-.33)/.28,4);
      let x=0,y=0;
      if(t>=.25&&t<.29){const q=(t-.25)/.04;x=.9*q;y=-.34*q;}
      else if(t<.34&&t>=.29){const q=(t-.29)/.05;x=lerp(.9,-.63,q);y=lerp(-.34,.255,q);}
      else if(t<.39&&t>=.34){const q=(t-.34)/.05;x=lerp(-.63,.27,q);y=lerp(.255,-.119,q);}
      else if(t>=.39){const q=out((t-.39)/.12,4);x=.27*(1-q);y=q===1?0:-.119*(1-q);}
      return {...s,x:x/100,y:y/100,scale:t<.37?lerp(.94,1.18,attack):lerp(1.18,1,release),
        flash:t<.33?.73*flashIn:.73*(1-flashOut),flashScale:t<.33?lerp(.25,1.08,flashIn):lerp(1.08,1.4,flashOut)};
    }
    if(style==='phone'||style==='tablet')return {...s,...devicePose(p)};
    if(style==='lcd')return {...s,y:14*sine(p)};
    return s;
  }
  function mount(picture,image,options,make) {
    const style=options.style;if(!kinds.includes(style))throw new Error('Unknown media surface');
    picture.dataset.mediaSurface=style;picture.classList.add('media-surface');
    const front=make('div','surface-front',null,picture);front.appendChild(image);
    const layer=(name,parent=picture)=>{const n=make('div','surface-'+name,null,parent);n.setAttribute('aria-hidden','true');return n;};
    const copies=[];let overlay=null,parts=[],screen=null;
    if(style.endsWith('-fill')) {
      for(let i=0;i<(style==='blur-fill'?1:2);i++) {
        const box=layer('fill'),copy=make('img','surface-copy',null,box);copy.src=image.src;copy.alt='';copies.push({box,copy});
      }
      layer('fill-scrim');layer('fill-grid');
    } else if(style==='phone'||style==='tablet'||style==='phone-dive') {
      front.classList.add('surface-device');front.dataset.device=style==='phone-dive'?'phone':style;front.dataset.cutout=style==='phone-dive'?'island':options.cutout||'none';
      screen=make('div','surface-device-screen',null,front);
      const safe=make('div','surface-device-safe',null,screen);safe.appendChild(image);
      overlay=layer('device-cutout',screen);
      if(style==='phone-dive') {
        front.style.transformOrigin='center';
        image.style.visibility='hidden';
        parts=[[0,.22],[.22,.61],[.61,1]].map(([top,bottom])=>{
          const part=layer('dive-part',safe),copy=make('img','surface-copy surface-dive-copy',null,part);
          copy.src=image.src;copy.alt='';part.style.clipPath=`inset(${top*100}% 0 ${(1-bottom)*100}% 0)`;
          part.style.transformOrigin=`50% ${(top+bottom)*50}%`;return part;
        });
      }
    } else if(style==='light-leak') {
      overlay=layer('leak');parts=['amber','red','gold'].map(name=>layer(name,overlay));
    } else if(style==='editorial-flash') {
      overlay=layer('editorial');parts=['wash','core','sweep'].map(name=>layer(name,overlay));
    } else if(style==='light-sweep') {
      overlay=layer('light');parts=['ambient','bloom','band'].map(name=>layer(name,overlay));
    } else if(style==='drift-accent')overlay=layer('drift',front);
    else if(style==='freeze-paper') {
      overlay=layer('freeze');parts=[layer('freeze-paper',overlay),layer('freeze-tape-a',overlay),layer('freeze-tape-b',overlay),layer('freeze-flash',overlay)];
    } else if(style==='beat-accent')overlay=layer('beat');
    else if(style==='lcd'){overlay=layer('lcd');parts=[layer('scan',overlay),layer('grid',overlay),layer('lcd-grain',overlay)];}
    else overlay=layer(style);
    return progress=>{
      const s=state(style,progress),w=picture.clientWidth,h=picture.clientHeight;
      if(!image.naturalWidth||!image.naturalHeight)return;
      const fitted=fit(w,h,image.naturalWidth,image.naturalHeight),q=s.p;
      Object.assign(front.style,{left:'0px',top:'0px',width:w+'px',height:h+'px',opacity:'1',transform:'none'});
      if(style.endsWith('-fill')) {
        Object.assign(front.style,{left:fitted.x+'px',top:fitted.y+'px',width:fitted.width+'px',height:fitted.height+'px',opacity:String(s.alpha),transform:`translateY(${s.y*h}px) scale(${s.scale})`});
        const horizontal=fitted.x>1,axis=horizontal?'X':'Y';
        copies.forEach(({box,copy},i)=>{
          const rect=style==='blur-fill'?{x:-w*60/1920,y:-h*60/1080,width:w*1.0625,height:h*(1+120/1080)}:
            horizontal?{x:i===0?0:fitted.x+fitted.width,y:0,width:fitted.x,height:h}:
              {x:0,y:i===0?0:fitted.y+fitted.height,width:w,height:fitted.y};
          Object.assign(box.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px',
            filter:`blur(${(style==='blur-fill'?42:6)*h/1080}px) brightness(${style==='blur-fill'?.75:.72})`});
          copy.style.transform=style==='mirror-fill'?`scale${axis}(-1)`:'none';
        });
      } else if(style==='phone'||style==='tablet'||style==='phone-dive') {
        const phone=style!=='tablet',ratio=phone?9/19.5:3/4,height=Math.min(h*(style==='phone-dive'?.82:phone?.9:.82),w*.86/ratio),width=height*ratio;
        const travel=Math.max(0,(h-height)/2-4),bezel=width*(phone?.02:.024);
        Object.assign(front.style,{left:(w-width)/2+'px',top:(h-height)/2+'px',width:width+'px',height:height+'px',
          padding:bezel+'px',borderRadius:width*(phone?.103:.0723)+'px',transform:`translateY(${style==='phone-dive'?s.y*h/100:s.y/18*travel}px) scale(${s.scale})`});
        screen.style.borderRadius=width*(phone?.083:.0512)+'px';
        if(style==='phone-dive') {
          front.style.opacity=String(s.alpha);overlay.style.opacity=String(s.cutout);
          parts.forEach((part,i)=>part.style.transform=`translateY(${s.layers[i].y*h/100}px) scale(${s.layers[i].scale})`);
        }
      } else if(style==='screen') {
        Object.assign(front.style,{left:w*.04+'px',top:h*.04+'px',width:w*.92+'px',height:h*.92+'px',transform:`perspective(${w*1400/1200}px) rotateY(-3.5deg) rotateX(1.6deg) scale(${s.scale})`});
        overlay.style.opacity=String(s.alpha);
      } else if(style==='grain') {
        overlay.style.opacity=String(.15*s.alpha);overlay.style.transform=`translate(${s.offset[0]}%,${s.offset[1]}%)`;
      } else if(style==='vignette')overlay.style.opacity=String(s.alpha);
      else if(style==='light-sweep') {
        parts[0].style.opacity=String(s.ambient);parts[1].style.opacity=String(s.glow*.32);parts[2].style.opacity=String(s.band);
        parts[2].style.transform=`translateX(${(s.lightX-50)*.014*w}px)`;
        front.style.boxShadow=`${-Math.max(-30,Math.min(30,s.lightX-50))*.0005*w}px ${(0.008+s.glow*.007)*h}px ${(0.022+s.glow*.024)*h}px rgba(0,0,0,.26)`;
      } else if(style==='light-leak') {
        overlay.style.opacity=String(s.alpha);
        parts[0].style.transform=`translateX(${s.amber.x}%) rotate(${s.amber.rotation}deg) scale(${s.amber.scale})`;
        parts[1].style.transform=`translate(${s.red.x}%,${s.red.y}%) scale(${s.red.scale})`;
        parts[2].style.transform=`translateX(${s.gold.x}%) rotate(${s.gold.rotation}deg)`;
      } else if(style==='editorial-flash') {
        parts[0].style.opacity=String(s.wash);parts[1].style.opacity=String(s.core);parts[2].style.opacity=String(s.sweep);
        parts[1].style.transform=`rotate(-5deg) scale(${s.coreScale})`;parts[2].style.transform=`translateX(${s.sweepX}%) rotate(-2deg)`;
      } else if(style==='drift-accent') {
        Object.assign(front.style,{left:w*.08+'px',top:h*.08+'px',width:w*.84+'px',height:h*.84+'px',transform:`rotate(${s.rotation}deg) scale(${s.scale})`});
        overlay.style.opacity=String(s.sweepAlpha);overlay.style.transform=`translateX(${s.sweepX*w/100}px) rotate(14deg)`;
      } else if(style==='freeze-paper') {
        parts[0].style.opacity=String(s.paper);parts[3].style.opacity=String(s.flash);
        parts[1].style.opacity=String(s.tapes[0].alpha);parts[2].style.opacity=String(s.tapes[1].alpha);
        parts[1].style.transform=`rotate(-8deg) scale(${s.tapes[0].scale})`;
        parts[2].style.transform=`rotate(7deg) scale(${s.tapes[1].scale})`;
      } else if(style==='beat-accent') {
        Object.assign(front.style,{left:w*.08+'px',top:h*.08+'px',width:w*.84+'px',height:h*.84+'px',transform:`translate(${s.x*w}px,${s.y*h}px) scale(${s.scale})`});
        overlay.style.opacity=String(s.flash);overlay.style.transform=`translate(-50%,-50%) scale(${s.flashScale})`;
      } else if(style==='feather-focus') {
        const t=options.target,cx=fitted.x+(t.x+t.width/2)*fitted.width,cy=fitted.y+(t.y+t.height/2)*fitted.height;
        overlay.style.maskImage=`radial-gradient(ellipse ${t.width*fitted.width/2}px ${t.height*fitted.height/2}px at ${cx}px ${cy}px,transparent 0%,transparent 52%,black 88%)`;
        overlay.style.opacity=String(s.alpha);picture.dataset.focusGeometry=JSON.stringify({x:cx,y:cy,rx:t.width*fitted.width/2,ry:t.height*fitted.height/2});
      } else if(style==='lcd') {overlay.style.opacity=String(s.alpha);parts[0].style.transform=`translateY(${s.y}px)`;}
      picture.dataset.surfaceProgress=String(q);picture.dataset.surfaceState=JSON.stringify(s);
      picture.dataset.surfaceFit=JSON.stringify(fitted);
    };
  }
  window.ShortCreatorMediaSurfaces={kinds,state,fit,devicePose,mount};
})();
