/* HyperFrames caption-camera-follow adapted to explicit composition words.
   The spoken-caption rail is independent and is never moved or restyled. */
(() => {
  'use strict';
  const clamp=p=>Math.max(0,Math.min(1,p)),mix=(a,b,p)=>a+(b-a)*p;
  const ease=(p,curve)=>window.ShortCreatorHeadlines.bezier(p,...curve);
  const curves=Object.freeze({step:[.31,0,.11,1],wide:[.42,0,.14,1],ink:[.2,.7,.3,1],up:[.2,.8,.4,1],down:[.5,0,.2,1]});
  const union=(a,b)=>a?{x0:Math.min(a.x0,b.x0),y0:Math.min(a.y0,b.y0),x1:Math.max(a.x1,b.x1),y1:Math.max(a.y1,b.y1)}:{...b};
  function layout(sizes,width,height) {
    if(!Array.isArray(sizes)||sizes.length<2||sizes.length>6||![width,height].every(v=>Number.isFinite(v)&&v>0))throw new Error('Invalid camera word layout');
    let box=null;
    return sizes.map(([w,h])=>{
      if(![w,h].every(v=>Number.isFinite(v)&&v>0))throw new Error('Invalid measured word');
      const font=box?(box.y1-box.y0)*.72:Math.max(width,height)*.16,scale=font/90;
      const gap=font*.07,wordWidth=w*scale,wordHeight=h*scale;
      let x=0,y=0;
      if(box) {
        if((box.x1-box.x0)/(box.y1-box.y0)<width/height){x=box.x1+gap;y=box.y1-wordHeight;}
        else {x=box.x0;y=box.y1+gap;}
      }
      const bounds={x0:x,y0:y,x1:x+wordWidth,y1:y+wordHeight};box=union(box,bounds);
      return {x,y,scale,bounds,prefix:{...box}};
    });
  }
  function fit(box,width,height,margin=1.36) {
    const scale=Math.min(width/((box.x1-box.x0)*margin),height/((box.y1-box.y0)*margin));
    return {x:width/2-scale*(box.x0+box.x1)/2,y:height/2-scale*(box.y0+box.y1)/2,scale};
  }
  function state(words,width,height,active,progress) {
    if(!Number.isInteger(active)||active< -1||active>=words.length||!Number.isFinite(progress))throw new Error('Invalid camera word state');
    const p=clamp(progress),index=Math.max(0,active),last=index===words.length-1;
    const sourceTime=p*(last?1.56:.4),from=fit(words[Math.max(0,index-1)].prefix,width,height),to=fit(words[index].prefix,width,height);
    let destination=to,start=from,t=sourceTime,duration=.4,up=.096,down=.176,peak=width*.026,curve=curves.step;
    if(last&&sourceTime>=.62){start=to;destination=fit(words[index].prefix,width,height,1.2);t=sourceTime-.62;duration=.94;up=.3;down=.58;peak*=.8;curve=curves.wide;}
    const q=ease(t/duration,curve),camera={x:mix(start.x,destination.x,q),y:mix(start.y,destination.y,q),scale:mix(start.scale,destination.scale,q)};
    const amount=active<=0?0:t<up?peak/destination.scale*ease(t/up,curves.up):peak/destination.scale*(1-ease((t-up)/down,curves.down));
    const b=words[index].prefix,cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,diagonal=Math.hypot(width,height)/2;
    const blur=words.map(word=>{
      const x=(word.bounds.x0+word.bounds.x1)/2,y=(word.bounds.y0+word.bounds.y1)/2;
      const distance=destination.scale*Math.hypot(x-cx,y-cy)/diagonal;
      const weight=Number((.2+1.15*Math.min(1,distance)).toFixed(3));
      return amount*weight/word.scale;
    });
    return {style:'camera-follow',active,p,camera,blur,ink:active<0?0:ease(sourceTime/.16,curves.ink),sourceTime};
  }
  function mount(host,content,onsets,make) {
    const slot=make('div','kinetic-window kinetic-preset kinetic-camera',null,host);slot.dataset.kineticStyle='camera-follow';
    const world=make('div','kinetic-camera-world',null,slot),width=slot.clientWidth,height=slot.clientHeight;
    const nodes=content.words.map(text=>make('span','kinetic-word kinetic-native-word kinetic-camera-word',text,world));
    const words=layout(nodes.map(n=>{const b=n.getBoundingClientRect();return [b.width,b.height];}),width,height);
    nodes.forEach((node,i)=>{
      const word=words[i];node.style.left=word.x+'px';node.style.top=word.y+'px';node.style.transform=`scale(${word.scale})`;
    });
    const origin=world.getBoundingClientRect();let accumulated=null;
    nodes.forEach((node,i)=>{
      const b=node.getBoundingClientRect();words[i].bounds={x0:b.left-origin.left,y0:b.top-origin.top,x1:b.right-origin.left,y1:b.bottom-origin.top};
      accumulated=union(accumulated,words[i].bounds);words[i].prefix={...accumulated};
    });
    const final=fit(accumulated,width,height,1.2);
    if(words.some(word=>90*word.scale*final.scale<24))throw new Error('Camera phrase becomes too small; shorten the supplied words');
    const rail=make('i','',null,make('div','kinetic-rail',null,host));
    return time=>{
      const frame=Math.floor(time*30+1e-7),active=onsets.reduce((previous,onset,i)=>frame>=Math.ceil(onset*30)?i:previous,-1);
      const progress=active<0?0:clamp((frame-Math.ceil(onsets[active]*30))/24),s=state(words,width,height,active,progress);
      world.style.transform=`translate(${s.camera.x}px,${s.camera.y}px) scale(${s.camera.scale})`;
      nodes.forEach((node,i)=>{
        const visible=i<=active,alpha=i===active?s.ink:1;
        node.style.visibility=visible?'visible':'hidden';node.style.opacity=visible?String(alpha):'0';
        node.style.filter=s.blur[i]===0?'none':`blur(${s.blur[i]}px)`;
        node.setAttribute('aria-hidden',String(!visible));
        if(visible&&progress===1)node.dataset.fit='true';else node.removeAttribute('data-fit');
      });
      rail.style.transform=`scaleX(${active<0?0:(active+progress)/nodes.length})`;
      slot.dataset.kineticPresentation=JSON.stringify(s);
    };
  }
  window.ShortCreatorKineticCamera={layout,fit,state,mount,curves};
})();
