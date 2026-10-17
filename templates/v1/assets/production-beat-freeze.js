/* HyperFrames beat-freeze-cut (Apache-2.0): ramp, held frame, exposure and hard cut.
   Only verified stills are transformed. Branding and captions stay outside the viewport. */
(() => {
  'use strict';
  const frames=69,clamp=x=>Math.max(0,Math.min(1,x)),out=(x,n=3)=>1-(1-clamp(x))**n;
  function state(progress) {
    if(!Number.isFinite(progress))throw new Error('Finite freeze-cut progress required');
    const p=clamp(progress),t=p*2.29;
    const result={p,t,incoming:t>=1.79,x:0,y:0,scale:1,sx:1,sy:1,blur:0,brightness:1,outline:0,flash:0,contour:0,streak:0,streakX:0,streakScale:.35};
    if(p===0||p===1)return {...result,incoming:p===1};
    if(t<1.79) {
      const ramp=clamp(t/.85);result.scale=1+.28*ramp**4;
      result.x=28*ramp**4;result.y=-12*ramp**4;
      result.brightness=1+.08*ramp**3;
      if(t>=.85) {
        result.brightness=1.08+.07*out((t-.85)/.05,5);
        const settle=Math.sin(clamp((t-1.2)/.35)*Math.PI/2);
        result.outline=1-.25*settle;result.contour=.85-.1*settle;
        result.flash=.55*(1-out((t-.85)/.28));
      }
      const cut=clamp((t-1.65)/.12);result.sx=1+.35*cut**4;result.sy=1-.08*cut**4;
      result.blur=14*cut**4;result.brightness+=(1.35-1.15)*cut**4;
    } else {
      const recover=1-out((t-1.79)/.18,4);result.sx=1+.35*recover;result.sy=1-.08*recover;
      result.blur=14*recover;result.brightness=1+.35*recover;result.x=24*(1-out((t-1.79)/.5,4));
    }
    if(t>=1.65&&t<1.99) {
      const attack=clamp((t-1.65)/.12)**5,release=out((t-1.81)/.16);
      result.streak=.95*attack*(1-release);result.streakScale=.35+1.25*attack;
      result.streakX=t<1.81?-280+400*attack:120+240*release;
    }
    return result;
  }
  function frameState(time,onsets) {
    if(!Number.isFinite(time)||!onsets.length||!onsets.every(Number.isFinite))throw new Error('Finite freeze-cut clock required');
    const frame=Math.floor(time*30+1e-7);let active=0;
    onsets.forEach((onset,i)=>{if(frame>=Math.ceil(onset*30))active=i;});
    const p=active===0?1:clamp((frame-Math.ceil(onsets[active]*30))/frames);
    return {active,...state(p)};
  }
  function mount(view,images,onsets) {
    const layers=['outline','flash','contour','streak'].map(name=>{
      const node=document.createElement('div');node.className='beat-freeze-'+name;node.setAttribute('aria-hidden','true');view.appendChild(node);return node;
    });
    view.dataset.screenSwap='beat-freeze';
    return time=>{
      const s=frameState(time,onsets),shown=s.active===0?0:s.incoming?s.active:s.active-1;
      images.forEach((image,i)=>{
        image.style.visibility=i===shown?'visible':'hidden';image.style.clipPath='none';image.style.opacity='1';
        image.style.transform=s.p===0||s.p===1?'none':`translate(${s.x*view.clientWidth/1920}px,${s.y*view.clientHeight/1080}px) scale(${s.scale*s.sx},${s.scale*s.sy})`;
        image.style.filter=s.p===0||s.p===1?'none':`blur(${s.blur}px) brightness(${s.brightness})`;
      });
      layers.forEach((node,i)=>{node.style.opacity=String(s[['outline','flash','contour','streak'][i]]);});
      layers[3].style.transform=`translateX(${s.streakX*view.clientWidth/1920}px) scaleX(${s.streakScale})`;
      view.dataset.swapIndex=String(s.active);view.dataset.swapProgress=String(s.p);view.dataset.beatFreezeState=JSON.stringify(s);
    };
  }
  window.ShortCreatorBeatFreeze=Object.freeze({frames,state,frameState,mount});
})();
