/* HyperFrames raster passes and image reveals, adapted under Apache-2.0.
   Source hashes and bounded changes are recorded in production provenance. */
(() => {
  'use strict';
  const kinds=Object.freeze(['ascii-coarse','ascii-medium','ascii-fine','dither-2','dither-4','dither-8',
    'particle-left','particle-center','ink-bleed','slit-rows','slit-columns']);
  const clamp=x=>Math.max(0,Math.min(1,x)),cubic=x=>1-(1-clamp(x))**3;
  const smooth=x=>{x=clamp(x);return x<.5?2*x*x:1-2*(1-x)**2;};
  const lcg=seed=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  function hash(x,y,step) {
    let h=Math.imul(x+1,0x9e3779b1)^Math.imul(y+1,0x85ebca6b)^Math.imul(step+1,0xc2b2ae35);
    h=Math.imul(h^(h>>>15),0x27d4eb2f);return ((h^(h>>>13))>>>0)/4294967296;
  }
  function bayer(size) {
    if(![2,4,8].includes(size))throw new Error('Invalid Bayer matrix');
    let m=[[0]],n=1;
    while(n<size) {
      const next=Array.from({length:n*2},()=>Array(n*2));
      for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
        const v=4*m[y][x];next[y][x]=v;next[y][x+n]=v+2;next[y+n][x]=v+3;next[y+n][x+n]=v+1;
      }
      m=next;n*=2;
    }
    return m.flat().map(v=>(v+.5)/(size*size));
  }
  function summedLuma(data,w,h) {
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||data.length!==w*h*4)throw new Error('Invalid source raster');
    const table=new Float64Array((w+1)*(h+1));
    for(let y=0;y<h;y++) {
      let row=0;
      for(let x=0;x<w;x++) {
        const i=(y*w+x)*4;row+=(.299*data[i]+.587*data[i+1]+.114*data[i+2])/255;
        table[(y+1)*(w+1)+x+1]=table[y*(w+1)+x+1]+row;
      }
    }
    return table;
  }
  function cellLuma(table,w,x0,y0,x1,y1) {
    if(x1<=x0||y1<=y0)return 0;
    const s=w+1;return (table[y1*s+x1]-table[y0*s+x1]-table[y1*s+x0]+table[y0*s+x0])/((x1-x0)*(y1-y0));
  }
  function ditherPixel(source,threshold,amount,background,accent) {
    if(amount<=0)return source.slice();
    if(amount>=1)return (threshold<.5?accent:background).slice();
    const contrast=clamp((1-amount)*1.6),clean=clamp((1-amount-.55)/.45),duo=clamp((amount-.55)/.45);
    const v=source.map(c=>.5+(c/255-.5)*contrast),tone=.299*v[0]+.587*v[1]+.114*v[2]>threshold?1:0;
    return v.map((c,i)=>{
      const quant=clamp(Math.floor(c+threshold))*255,ink=background[i]+(accent[i]-background[i])*tone;
      const mixed=quant+(ink-quant)*duo;return mixed+(source[i]-mixed)*clean;
    });
  }
  function particles(direction) {
    if(!['left','center'].includes(direction))throw new Error('Unknown particle direction');
    const next=lcg(0x50a71c1e);
    return Array.from({length:640},()=>{
      const tx=next(),ty=next(),key=direction==='center'?Math.min(1,Math.hypot(tx-.5,ty-.5)/.7071):tx;
      const arrive=Math.min(.94,.24+.66*key+.04*next()),travel=.2+.12*next(),fade=.05+.04*next();
      const angle=direction==='center'?Math.atan2(ty-.5,tx-.5):Math.PI+(next()-.5)*Math.PI/2;
      return {tx,ty,arrive,birth:Math.max(0,arrive-travel),fade,offset:.06+.14*next(),ox:Math.cos(angle),oy:Math.sin(angle),radius:(.28+.62*next())/100,dim:.55+.45*next()};
    });
  }
  function particlePose(row,p,w,h) {
    const u=clamp((p-row.birth)/(row.arrive-row.birth)),settled=clamp((p-row.arrive)/row.fade),unit=Math.min(w,h);
    const alpha=clamp(u/.14)*(1-settled)*clamp((1-p)/.05)*(1-.4*clamp((p-.72)/.28))*row.dim*.92;
    return {x:row.tx*w+row.ox*row.offset*unit*(1-cubic(u)),y:row.ty*h+row.oy*row.offset*unit*(1-cubic(u)),
      radius:row.radius*unit*(.6+.4*(1-settled)),alpha};
  }
  function blobs() {
    const next=lcg(0x1b1eedca);
    return Array.from({length:5},(_,i)=>{
      const angle=i/5*Math.PI*2+next()*.9;
      return {dx:Math.cos(angle),dy:Math.sin(angle),spread:.16+.16*next(),size:i===0?.34:.14+.12*next(),
        birth:i===0?0:.04+.3*next(),die:.5+.16*next(),wobble:.02+.03*next(),phase:next()*Math.PI*2,frequency:2+Math.floor(next()*3)};
    });
  }
  function blobPose(row,p,w,h) {
    const grow=cubic((p-row.birth)/.34),die=smooth((p-row.die)/(.97-row.die)),unit=Math.min(w,h);
    const reach=row.spread*unit*grow*(1-die),wob=Math.sin(p*Math.PI*2*row.frequency+row.phase)*row.wobble*unit*grow*(1-die);
    return {x:w/2+row.dx*reach+wob*row.dy,y:h/2+row.dy*reach-wob*row.dx,radius:row.size*unit/2*grow*(1-die)};
  }
  function slitPose(time,rows) {
    const u=clamp((time-.25)/(2.1-.25)),e=cubic(u),decay=(1-u)**2,travel=-.16+.66*e;
    const bob=.5+.15*Math.sin(Math.PI*4*u)*decay;
    return {x:rows?travel:bob,y:rows?bob:travel,rotation:.5*Math.sin(Math.PI*2*u)*decay,scale:.82+.18*e,alpha:clamp(u/.12)};
  }
  function state(style,progress) {
    if(!kinds.includes(style)||!Number.isFinite(progress))throw new Error('Unknown raster surface');
    const p=clamp(progress),s={p,alpha:1,scale:1,clip:1,canvas:1,step:0,amount:0};
    if(style.startsWith('ascii-')) {
      const t=clamp((p-.15)/.85),resolve=t*t*(3-2*t);s.step=Math.min(4,Math.floor(resolve*4+1e-6));s.alpha=1-(1-clamp(p/.2))**2;
    } else if(style.startsWith('dither-')) {s.amount=1-smooth((p-.2)/.8);s.canvas=p===1?0:1;}
    else if(style.startsWith('particle-')) {s.alpha=cubic((p-.18)/.42);s.clip=smooth((p-.22)/.74);s.canvas=clamp((1-p)/.05);}
    else if(style==='ink-bleed') {s.alpha=cubic((p-.52)/.34);s.scale=.94+.06*cubic((p-.52)/.4);s.canvas=1-clamp((p-.86)/.12);}
    else {s.canvas=p===1?0:1;s.clip=smooth(1-clamp((p*2.8-2.2)/.6));}
    return s;
  }
  function mount(picture,image,options,make) {
    const style=options.style;if(!kinds.includes(style))throw new Error('Unknown raster surface');
    const rasterImage=window.ShortCreatorShaders.verifiedImage(image);
    picture.classList.add('media-surface');picture.dataset.mediaSurface=style;
    const canvas=make('canvas','media-raster',null,picture);canvas.setAttribute('aria-hidden','true');
    Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});
    canvas.width=picture.clientWidth;canvas.height=picture.clientHeight;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Raster surface canvas unavailable');
    const w=canvas.width,h=canvas.height,unit=Math.min(w,h),css=getComputedStyle(picture);
    const background=css.getPropertyValue('--purple').trim(),accent=css.getPropertyValue('--lime').trim();
    const rgb=hex=>{if(!/^#[\da-f]{6}$/i.test(hex))throw new Error('Raster surface requires approved colors');return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));};
    const bg=rgb(background),fg=rgb(accent),ascii=style.startsWith('ascii-'),dither=style.startsWith('dither-');
    const buffer=document.createElement('canvas');buffer.width=ascii?Math.min(1280,w):Math.max(8,Math.min(640,Math.round(w/3)));
    buffer.height=Math.max(8,Math.round(buffer.width*h/w));
    const work=buffer.getContext('2d',{willReadFrequently:true});if(!work)throw new Error('Source raster unavailable');
    const ink=document.createElement('canvas');ink.width=Math.ceil(w/3);ink.height=Math.ceil(h/3);
    const inkCtx=ink.getContext('2d',{willReadFrequently:true});if(!inkCtx)throw new Error('Ink raster unavailable');
    const points=style.startsWith('particle-')?particles(style.slice(9)):[],drops=style==='ink-bleed'?blobs():[];
    const next=lcg(0x51175c4e),jitter=Array.from({length:96},()=>.96+.08*next());
    const matrix=dither?bayer(Number(style.slice(-1))):[],size=dither?Number(style.slice(-1)):0;
    let source=null,sat=null,output=null,fitted=null;
    function prepare() {
      if(source)return;
      fitted=window.ShortCreatorMediaSurfaces.fit(w,h,image.naturalWidth,image.naturalHeight);
      work.fillStyle=background;work.fillRect(0,0,buffer.width,buffer.height);
      const k=buffer.width/w;work.drawImage(rasterImage,fitted.x*k,fitted.y*k,fitted.width*k,fitted.height*k);
      source=work.getImageData(0,0,buffer.width,buffer.height).data.slice();
      if(ascii)sat=summedLuma(source,buffer.width,buffer.height);
      if(dither)output=work.createImageData(buffer.width,buffer.height);
    }
    function drawSubject(pose) {
      ctx.save();ctx.translate(pose.x*w,pose.y*h);ctx.rotate(pose.rotation);ctx.scale(pose.scale,pose.scale);ctx.globalAlpha=pose.alpha;
      ctx.drawImage(rasterImage,fitted.x-w/2,fitted.y-h/2,fitted.width,fitted.height);ctx.restore();
    }
    return progress=>{
      const s=state(style,progress),p=s.p;
      if(!image.complete||!image.naturalWidth)return;
      prepare();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.filter='none';ctx.clearRect(0,0,w,h);
      image.style.visibility=ascii||((dither||style.startsWith('slit-'))&&p<1)?'hidden':'visible';
      image.style.opacity=String(s.alpha);image.style.transform=s.scale===1?'none':`scale(${s.scale})`;image.style.clipPath='none';
      canvas.style.opacity='1';
      if(ascii) {
        ctx.fillStyle=background;ctx.fillRect(0,0,w,h);ctx.fillStyle=accent;
        const cell=Math.max(4,h/({'ascii-coarse':22,'ascii-medium':36,'ascii-fine':54}[style]))*[4,2.83,2,1.41,1][s.step];
        ctx.font=`600 ${cell*.92}px BrandMono`;ctx.textAlign='center';ctx.textBaseline='middle';
        const k=buffer.width/w;
        for(let y=0;y<Math.ceil(h/cell);y++)for(let x=0;x<Math.ceil(w/cell);x++) {
          const luma=clamp(cellLuma(sat,buffer.width,Math.min(buffer.width,Math.round(x*cell*k)),Math.min(buffer.height,Math.round(y*cell*k)),
            Math.min(buffer.width,Math.round((x+1)*cell*k)),Math.min(buffer.height,Math.round((y+1)*cell*k))));
          const glyph=' .:-=+*#%@'[Math.round(luma*9)];if(glyph===' ')continue;
          ctx.globalAlpha=(.3+.7*luma)*s.alpha*(p===1?1:.84+.16*hash(x,y,s.step));ctx.fillText(glyph,(x+.5)*cell,(y+.5)*cell);
        }
      } else if(dither&&p<1) {
        for(let y=0;y<buffer.height;y++)for(let x=0;x<buffer.width;x++) {
          const i=(y*buffer.width+x)*4,values=ditherPixel([source[i],source[i+1],source[i+2]],matrix[(y%size)*size+x%size],s.amount,bg,fg);
          output.data[i]=values[0];output.data[i+1]=values[1];output.data[i+2]=values[2];output.data[i+3]=255;
        }
        work.putImageData(output,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(buffer,0,0,w,h);ctx.imageSmoothingEnabled=true;
      } else if(points.length) {
        image.style.clipPath=s.clip===1?'none':style==='particle-left'?`inset(0 ${100*(1-s.clip)}% 0 0)`:`circle(${75*s.clip}% at 50% 50%)`;
        ctx.fillStyle=accent;
        for(const row of points) {
          const v=particlePose(row,p,w,h);if(v.alpha<=.002)continue;
          ctx.globalAlpha=v.alpha;ctx.beginPath();ctx.arc(v.x,v.y,v.radius,0,Math.PI*2);ctx.fill();
        }
      } else if(drops.length&&s.canvas>0) {
        inkCtx.filter='none';inkCtx.clearRect(0,0,ink.width,ink.height);inkCtx.filter=`blur(${Math.max(2,unit*.028/3)}px)`;inkCtx.fillStyle=accent;
        for(const row of drops) {
          const v=blobPose(row,p,w,h);if(v.radius<=.01)continue;
          inkCtx.beginPath();inkCtx.arc(v.x/3,v.y/3,v.radius/3,0,Math.PI*2);inkCtx.fill();
        }
        inkCtx.filter='none';const pixels=inkCtx.getImageData(0,0,ink.width,ink.height);
        for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=Math.round(clamp(pixels.data[i]/255*22-9)*255);
        inkCtx.putImageData(pixels,0,0);ctx.globalAlpha=s.canvas;ctx.drawImage(ink,0,0,w,h);
      } else if(style.startsWith('slit-')&&p<1) {
        const rows=style==='slit-rows',band=(rows?h:w)/96;
        for(let i=0;i<96;i++) {
          const pose=slitPose(p*2.8-.45*i/95*jitter[i]*s.clip,rows);if(!pose.alpha)continue;
          ctx.save();ctx.beginPath();ctx.rect(rows?0:i*band,rows?i*band:0,rows?w:band+1,rows?band+1:h);ctx.clip();drawSubject(pose);ctx.restore();
        }
      }
      ctx.globalAlpha=1;picture.dataset.surfaceProgress=String(p);picture.dataset.surfaceState=JSON.stringify(s);
      picture.dataset.surfaceFit=JSON.stringify(fitted);canvas.dataset.rasterStyle=style;canvas.dataset.rasterReady='true';
    };
  }
  window.ShortCreatorMediaRaster={kinds,bayer,summedLuma,cellLuma,ditherPixel,particles,particlePose,blobs,blobPose,slitPose,state,mount};
})();
