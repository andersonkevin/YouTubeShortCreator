/* HyperFrames grid, grain, mesh, aurora, cue pulse, star and snow mechanics.
   Colors come from the approved brand. Motion builds once on the scene cue;
   no ambient timers, unseeded randomness, network or mutable simulation. */
(() => {
  'use strict';
  const kinds=Object.freeze(['grid','grain','mesh','aurora','beat-pulse','starfield','snow','stagger-lattice','line-trace','confetti']);
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>1-(1-clamp(x))**5;
  const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  function particles(count,kind='starfield') {
    if(!Number.isInteger(count)||count<1||count>200)throw new Error('Invalid backdrop particle count');
    if(!['starfield','snow'].includes(kind))throw new Error('Unknown particle field');
    return Array.from({length:count},(_,i)=>{
      const depth=hash(i),tier=hash(i+7000),snow=kind==='snow';
      return {x:snow?(i*.6180339887498949+.07)%1:hash(i+5000),
        y:snow?(i*.4142135623730951+.37)%1:hash(i+6000),
        size:snow?1+depth*depth*8:(tier<.7?1:tier<.95?1.6:2.6),
        phase:hash(i+3000)*Math.PI*2,weight:snow?(depth>.85?.5:.35+depth*.55):.75+hash(i+2000)*.25};
    });
  }
  function rgb(hex) {
    if(!/^#[\da-f]{6}$/i.test(hex))throw new Error('Backdrop requires approved hex colors');
    return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  }
  const rgba=(color,alpha)=>`rgba(${color.join(',')},${clamp(alpha)})`;
  const latticeDistances=Array.from({length:40},(_,i)=>Math.hypot(i%8-3.5,Math.floor(i/8)-2));
  const latticeMin=Math.min(...latticeDistances),latticeMax=Math.max(...latticeDistances);
  function latticeState(index,p) {
    if(!Number.isInteger(index)||index<0||index>=40||!Number.isFinite(p))throw new Error('Invalid lattice cell');
    const delay=(latticeDistances[index]-latticeMin)/(latticeMax-latticeMin)*.018*39;
    const q=clamp((clamp(p)*(.28+.018*39)-delay)/.28),a=1-(1-q)**3;
    return {x:index%8*56,y:Math.floor(index/8)*56+24*(1-a),scale:.72+.28*a,opacity:a};
  }
  function lineTrace(p) {
    const q=clamp(p),a=q<.5?8*q**4:1-(-2*q+2)**4/2;
    return 900*(1-a);
  }
  function confettiState(index,progress) {
    if(!Number.isInteger(index)||index<0||index>=22||!Number.isFinite(progress))throw new Error('Invalid confetti particle');
    const onset=(.2+index*.015)/1.315;
    const p=progress<=onset?0:progress>=1?1:clamp((progress-onset)*1.315/.8),q=1-(1-p)**3;
    return {x:Math.cos(index*.83)*250*q,y:(-120-Math.sin(index*.61)*120)*q,
      rotation:(180+index*37)*q,opacity:q};
  }
  function paint(ctx,width,height,kind,progress,colors,points) {
    if(!kinds.includes(kind)||!Number.isFinite(progress)||![width,height].every(n=>Number.isFinite(n)&&n>0))
      throw new Error('Invalid backdrop frame');
    const p=clamp(progress),q=ease(p),unit=Math.min(width,height),accent=rgb(colors.accent),secondary=rgb(colors.secondary);
    rgb(colors.background);
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    ctx.filter='none';ctx.clearRect(0,0,width,height);ctx.fillStyle=colors.background;ctx.fillRect(0,0,width,height);
    const glow=(x,y,r,color,alpha)=>{
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,rgba(color,alpha));g.addColorStop(.48,rgba(color,alpha*.42));g.addColorStop(1,rgba(color,0));
      ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
    };
    if(kind==='grid'||kind==='grain') {
      const cell=unit/(kind==='grid'?10:30),shift=cell*q;
      glow(width*.28,height*.2,unit,accent,.18*q);
      ctx.strokeStyle=rgba(secondary,.28*q);ctx.lineWidth=2;ctx.fillStyle=rgba(accent,.35*q);
      for(let x=-cell+shift;x<=width+cell;x+=cell) {
        if(kind==='grid') {ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
        else for(let y=-cell+shift;y<=height+cell;y+=cell){ctx.beginPath();ctx.arc(x,y,Math.max(1.6,cell*.07),0,Math.PI*2);ctx.fill();}
      }
      if(kind==='grid')for(let y=-cell+shift;y<=height+cell;y+=cell){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    } else if(kind==='mesh'||kind==='aurora') {
      const centers=kind==='mesh'?[[.18+.16*q,.28+.14*q],[.78-.16*q,.46+.14*q],[.44+.14*q,.8-.16*q]]:
        [[.20+.046*Math.sin(q*Math.PI/2),.14+.032*Math.cos(q*Math.PI/2)],
         [.84+.041*Math.sin(q*Math.PI/2+2*Math.PI/3),.45+.038*Math.cos(q*Math.PI/2+2*Math.PI/3)],
         [.52+.036*Math.sin(q*Math.PI/2+4*Math.PI/3),.95+.03*Math.cos(q*Math.PI/2+4*Math.PI/3)]];
      centers.forEach(([x,y],i)=>glow(x*width,y*height,unit*(kind==='mesh'?.85:1.1),i===1?secondary:accent,(i===0?.68:.48)*q));
    } else if(kind==='beat-pulse') {
      const attack=clamp(p/.1),decay=clamp((p-.1)/.45),pulse=p<.1?1-2**(-10*attack):1-decay**3;
      glow(width*.24,height*.3,unit,accent,.2*q+.3*Math.max(0,pulse));
      glow(width*.76,height*.68,unit,secondary,.14*q+.22*Math.max(0,pulse));
    } else if(kind==='confetti') {
      const scale=Math.min(width/760,height/428);
      glow(width*.5,height*.54,unit,secondary,.16*q);
      for(let i=0;i<22;i++) {
        const s=confettiState(i,p);
        ctx.save();ctx.translate(width/2+s.x*scale,height*.54+s.y*scale);ctx.rotate(s.rotation*Math.PI/180);
        ctx.fillStyle=rgba(i%2?secondary:accent,s.opacity);ctx.beginPath();
        ctx.roundRect(0,0,12*scale,20*scale,3*scale);ctx.fill();ctx.restore();
      }
    } else if(kind==='stagger-lattice') {
      const scale=Math.min(width*.86/438,height*.8/270),x=(width-438*scale)/2,y=(height-270*scale)/2;
      ctx.setTransform(scale,0,0,scale,x,y);
      for(let i=0;i<40;i++) {
        const s=latticeState(i,p),size=46*s.scale,pad=(46-size)/2;
        ctx.fillStyle=rgba(i%3===0?secondary:accent,s.opacity*.5);
        ctx.beginPath();ctx.roundRect(s.x+pad,s.y+pad,size,size,14*s.scale);ctx.fill();
      }
      ctx.setTransform(1,0,0,1,0,0);
    } else if(kind==='line-trace') {
      const scale=Math.min(width*.9/520,height*.8/220);
      ctx.setTransform(scale,0,0,scale,(width-520*scale)/2,(height-220*scale)/2);
      ctx.strokeStyle=rgba(accent,.7);ctx.lineWidth=14;ctx.lineCap='round';
      ctx.setLineDash([900,900]);ctx.lineDashOffset=lineTrace(p);
      ctx.beginPath();ctx.moveTo(24,160);ctx.bezierCurveTo(90,28,188,40,228,128);
      ctx.bezierCurveTo(268,216,356,234,494,68);ctx.stroke();
      ctx.setLineDash([]);ctx.lineDashOffset=0;ctx.lineCap='butt';ctx.setTransform(1,0,0,1,0,0);
    } else {
      glow(width*.5,height*.5,unit,secondary,.14*q);
      for(const dot of points) {
        const x=dot.x*width+(kind==='snow'?Math.sin(dot.phase+q*Math.PI)*unit*.025:unit*.06*(1-q));
        const y=dot.y*height-(kind==='snow'?(1-q)*height*.18:0);
        const a=q*dot.weight*(kind==='snow'?.78:1),radius=dot.size*unit/620;
        ctx.fillStyle=rgba(kind==='snow'?secondary:accent,a);ctx.beginPath();ctx.arc(x,y,Math.max(1.5,radius),0,Math.PI*2);ctx.fill();
      }
    }
    const shade=ctx.createRadialGradient(width/2,height/2,unit*.2,width/2,height/2,Math.hypot(width,height)*.6);
    shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.5)');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
    ctx.globalAlpha=1;ctx.filter='none';
  }
  function mount(host,content,onset,make,reveal) {
    const copy=make('div','screen-copy',null,host);
    const heading=make('h2','prod-heading',content.heading,copy,true),caption=make('p','screen-caption',content.caption,copy,true);
    const view=make('div','screen-device backdrop-art',null,host),canvas=make('canvas','backdrop-canvas',null,view);
    canvas.setAttribute('aria-hidden','true');canvas.width=view.clientWidth;canvas.height=view.clientHeight;
    canvas.style.width='100%';canvas.style.height='100%';canvas.style.display='block';
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Cannot paint production backdrop');
    const style=getComputedStyle(host),colors={background:style.getPropertyValue('--purple').trim(),
      accent:style.getPropertyValue('--lime').trim(),secondary:style.getPropertyValue('--cyan').trim()};
    const points=particles(content.style==='snow'?100:140,content.style==='snow'?'snow':'starfield');
    view.dataset.backdrop=content.style;
    return time=>{
      const p=window.ShortCreatorStory.progress(time,onset);
      reveal(heading,ease(p),32);reveal(caption,ease(p),24);
      paint(ctx,canvas.width,canvas.height,content.style,p,colors,points);
      view.dataset.backdropProgress=String(p);
    };
  }
  window.ShortCreatorBackdrops={kinds,particles,latticeState,lineTrace,confettiState,paint,mount};
})();
