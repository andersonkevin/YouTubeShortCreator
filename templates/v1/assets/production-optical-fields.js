/* HyperFrames rack-focus and oscilloscope-trace, Apache-2.0.
   Fixed optical recipes and synthetic waveforms; no measurement claims. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),TAU=2*Math.PI;
  function focusAt(time) {
    if(!Number.isFinite(time)||time<0)throw new Error('Invalid focus time');
    const p=clamp((time-1.2)/3.2),e=p<.5?4*p**3:1-(-2*p+2)**3/2;
    return p===1?80:1/(1/1.2+(1/80-1/1.2)*e);
  }
  function rackLights() {
    let seed=0x5eed1a3;
    const random=()=>{seed|=0;seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
    const rr=(lo,hi)=>lo+(hi-lo)*random(),lights=[];
    const light=(x,y,z,r,b,color)=>lights.push({position:[x,y,z],size:[r,b],color});
    const tungsten=[1,.74,.45],filament=[1,.9,.74],wire=[.86,.74,.6],warm=[1,.79,.52],cool=[.6,.75,1];
    const halfW=z=>.5*36*z/85,ns=halfW(1.2)/.25412,fs=halfW(80)/16.941,cosh=Math.cosh(.4/.3);
    const stringY=x=>.075-.1*(cosh-Math.cosh(x/.3))/(cosh-1)-.035*x/.4;
    const stringZ=x=>1.2+.05*x/.4;
    for(let i=0;i<1100;i++){const x=-.42+.84*i/1099;light(x*ns,stringY(x)*ns,stringZ(x),.0006*ns,1.4,wire);}
    for(let k=-5;k<=5;k++) {
      const x=k*.085,y=stringY(x)-.011,z=stringZ(x);
      light(x*ns,y*ns,z,.006*ns,26,tungsten);
      light((x-.0022)*ns,y*ns,z,.0006*ns,7,filament);
      light(x*ns,(y-.0022)*ns,z,.0006*ns,7,filament);
      light((x+.0022)*ns,y*ns,z,.0006*ns,7,filament);
    }
    const tower=(cx,hw,top,bottom,cols,rows,z,lit)=>{
      for(let c=0;c<cols;c++)for(let r=0;r<rows;r++) {
        if(random()>lit)continue;
        const x=cx-hw+2*hw*(c+.5)/cols,y=bottom+(top-bottom)*(r+.5)/rows,isCool=random()<.28;
        light(x,y,z+rr(-.4,.4)*fs,.24*fs,rr(9,20),isCool?cool:warm);
      }
    };
    tower(-9.5*fs,3.5*fs,9.6*fs,-4*fs,6,14,80*1.03,.34);
    tower(2*fs,4.5*fs,6.4*fs,-4*fs,8,12,80*.98,.3);
    tower(12.5*fs,3*fs,11*fs,-4*fs,5,15,80*1.08,.36);
    for(let i=0;i<40;i++) {
      const x=(-5.5+11*i/39)*fs,p=i/39,color=[.35+.65*p,.95-.53*p,1-.28*p];
      light(x,-5*fs,80*.99,.1*fs,7,color);light(x,-5.55*fs,80*.99,.1*fs,7,color);
    }
    for(let i=0;i<90;i++) {
      const z=1.2*1.9*(80*.85/(1.2*1.9))**random(),hw=halfW(z),hh=hw*1080/1920,isWarm=random()<.66;
      light(rr(-1.05,1.05)*hw,rr(-1,.75)*hh,z,rr(.006,.05)*(z/12),rr(5,18),isWarm?warm:cool);
    }
    return lights;
  }
  const waves=Object.freeze(['sine','square','triangle']);
  function wave(kind,time) {
    if(!waves.includes(kind)||!Number.isFinite(time))throw new Error('Invalid synthetic waveform');
    const phase=TAU*12*time;
    return kind==='square'?Math.tanh(8*Math.sin(phase)):kind==='triangle'?2/Math.PI*Math.asin(Math.sin(phase)):Math.sin(phase);
  }
  function trace(kind,time) {
    if(!waves.includes(kind)||!Number.isFinite(time)||time<0||time>6)throw new Error('Invalid scope time');
    const slope=kind==='square'?8*TAU*12:kind==='triangle'?4*12:TAU*12;
    const K=Math.max(120,Math.min(8000,Math.round(.3*Math.hypot(5000,slope*300)/3))),dt=.3/K,lRef=5000*dt;
    const segments=[];let previous=null;
    for(let k=K;k>=0;k--) {
      const t=time-k*dt;if(t<0){previous=null;continue;}
      const u=t*5-Math.floor(t*5),point=[u*1000,400-wave(kind,t)*300];
      if(previous&&u>=previous.u) {
        const distance=Math.hypot(point[0]-previous.point[0],point[1]-previous.point[1]);
        const alpha=Math.exp(-k*dt/.1)*(distance>1e-6?Math.min(1,lRef/distance):1);
        if(alpha>.002)segments.push({from:previous.point,to:point,alpha});
      }
      previous={u,point};
    }
    return {samples:K,segments,head:[(time*5-Math.floor(time*5))*1000,400-wave(kind,time)*300]};
  }
  const rgba=(hex,a)=>`rgba(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(',')},${a.toFixed(4)})`;
  function paintScope(ctx,w,h,time,colors,kind) {
    const state=trace(kind,time),scale=Math.min(w/1100,h/900),x=(w-1000*scale)/2,y=(h-800*scale)/2;
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';
    ctx.fillStyle=colors.background;ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    const line=(a,b,color,width)=>{ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
    const grid=rgba(colors.secondary,.16),axis=rgba(colors.secondary,.32),tick=rgba(colors.secondary,.42);
    for(let i=1;i<10;i++)line([100*i+.5,0],[100*i+.5,800],grid,1);
    for(let i=1;i<8;i++)line([0,100*i+.5],[1000,100*i+.5],grid,1);
    line([500.5,0],[500.5,800],axis,1);line([0,400.5],[1000,400.5],axis,1);
    for(let i=1;i<50;i++)line([20*i+.5,391.5],[20*i+.5,409.5],tick,1);
    for(let i=1;i<40;i++)line([491.5,20*i+.5],[509.5,20*i+.5],tick,1);
    ctx.strokeStyle=rgba(colors.secondary,.55);ctx.lineWidth=2;ctx.strokeRect(1,1,998,798);
    ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(const {from,to,alpha:a} of state.segments) {
      line(from,to,rgba(colors.accent,a*.13),13);line(from,to,rgba(colors.accent,a*.9),3);
      if(a>.55)line(from,to,rgba(colors.foreground,(a-.55)/.45*.7),1.4);
    }
    const [hx,hy]=state.head,glow=ctx.createRadialGradient(hx,hy,0,hx,hy,22);
    glow.addColorStop(0,rgba(colors.foreground,.95));glow.addColorStop(.22,rgba(colors.accent,.85));glow.addColorStop(1,rgba(colors.accent,0));
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(hx,hy,22,0,TAU);ctx.fill();ctx.restore();ctx.globalCompositeOperation='source-over';
    return {waveform:kind,samples:state.samples,segments:state.segments.length,head:state.head,synthetic:true};
  }
  window.ShortCreatorOpticalFields={focusAt,rackLights,waves,wave,trace,paintScope};
})();
