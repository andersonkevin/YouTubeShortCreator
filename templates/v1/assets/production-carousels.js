/* HyperFrames carousel adapter, Apache-2.0 source mechanics. See production provenance.
   Closed presets, verified local stills and the existing 30fps caption clock only. */
(() => {
  'use strict';
  const R=window.ShortCreatorCarouselRig,presets=window.ShortCreatorCarouselPresets;
  const clamp=x=>Math.max(0,Math.min(1,x)),out=x=>1-(1-clamp(x))**4;
  const properties={'Move Carousel':'moveCarousel','Depth Angle':'depthAngle','Rotation Follow':'rotationFollow',
    'Rotation X':'rotationX','Rotation Y':'rotationY','Rotation Z':'rotationZ'};
  // The promo source's measured 25fps entry table is sampled at absolute time.
  const beltEntry=Object.freeze([0,-11.39,-21.64,-30.9,-39.04,-46.29,-52.55,-57.98,-62.72,-66.71,
    -69.99,-72.75,-74.86,-76.52,-77.85,-78.8,-79.36,-79.75,-79.87,-79.94,-80]);
  function belt(time) {
    if(!Number.isFinite(time))throw new Error('Invalid belt time');
    const t=Math.max(0,Math.min(10,time)),frame=Math.min(20,t*25),i=Math.min(19,Math.floor(frame)),p=frame-i;
    const entry=beltEntry[i]+(beltEntry[i+1]-beltEntry[i])*p,travel=-93.601*t+entry;
    const left=[139.1,523.4,907.7,1292,1676.3,2060.6];
    return Array.from({length:12},(_,i)=>({x:left[i%6]+181+travel,y:190+Math.floor(i/6)*404,z:0,
      scale:1,rotX:0,rotY:0,rotZ:0,alpha:1,entry:1,entryScale:1}));
  }

  function clock(time,onsets,duration) {
    if(!Number.isFinite(time)||onsets.length!==2||!onsets.every(Number.isFinite)||onsets[1]-onsets[0]<6-1e-7)
      throw new Error('Carousel needs two caption anchors at least six seconds apart');
    const frame=Math.floor(time*30+1e-7),start=Math.ceil(onsets[0]*30),stop=Math.ceil(onsets[1]*30);
    const elapsed=Math.max(0,frame-start),gap=stop-start,settle=clamp((elapsed-gap)/24);
    // Integral of smoothstep velocity: continuous deceleration over the final 24 frames.
    const travel=Math.min(elapsed,gap)+24*(settle-settle**3+.5*settle**4);
    return {time:duration*travel/(gap+12),visible:frame>=start,settle,frame:Math.min(stop+24,Math.max(start,frame))};
  }

  function create(preset,wordCount=0) {
    if(!Object.hasOwn(presets,preset))throw new Error('Unknown media carousel preset');
    const d=presets[preset],{family,comp,controls:ctl,motion,look,n}=d;
    if(family==='belt')return belt;
    const path=d.path?R.buildPath(d.path.vertices,d.path.closed,64,look.centerPath?[comp.width/2,comp.height/2]:null):null;
    const drives=Object.fromEntries(Object.entries(d.keys).map(([key,keys])=>[key,R.chainedDrive(keys,
      /^(Move Carousel|Rotation [XYZ])$/.test(key)&&Math.abs(keys.at(-1).value-keys[0].value)>1e-6?'accumulate':'pingpong')]));
    const baseSpeed=(ctl.speed||0)/1000,speedScale=motion.speedScale??1;
    const progress=R.buildProgress({duration:comp.duration,cruise:family==='orbit'?(motion.orbitSpinDegPerSec||24)/360:baseSpeed,...motion});
    const hasSpin=['Rotation X','Rotation Y','Rotation Z'].some(key=>drives[key]);
    const ringStart=d.text?Math.max(0,wordCount-1)*d.text.wordStagger:0;
    return time=>{
      if(!Number.isFinite(time))throw new Error('Invalid carousel time');
      const t=Math.max(0,Math.min(comp.duration,time)),c={...ctl};
      for(const [key,drive] of Object.entries(drives))c[properties[key]]=drive.at(t*speedScale);
      if(family==='orbit')c.spinTurns={x:0,y:0,z:0};
      const u=family==='orbit'?(hasSpin?0:progress.at(t)):(drives['Move Carousel']?baseSpeed*t*speedScale:progress.at(t));
      const poses=family==='orbit'?R.orbitRig(c,comp,n,u):R.pathRig(path,c,comp,n,u);
      return poses.map((pose,index)=>{
        const p={...pose};
        if(d.ring) {
          const q=out((t-ringStart-index*d.ring.stagger/n)/d.ring.duration),f=1+(d.ring.from-1)*(1-q);
          p.x=comp.width/2+(p.x-comp.width/2)*f;p.y=comp.height/2+(p.y-comp.height/2)*f;
        }
        const edge=path&&!path.closed?clamp(Math.min(p.pct,1-p.pct)/look.endFade):1;
        const entry=d.ring?1:out((t-ringStart-index*motion.entryStaggerTotal/n+(d.text?0:motion.entryLead||0))/motion.entryDuration);
        return {...p,alpha:p.visible===false?0:edge,entry,entryScale:.72+.28*entry};
      });
    };
  }

  function mount(host,content,onsets,data,make,reveal) {
    const d=presets[content.preset],{comp,look}=d,is3d=['orbit','vision'].includes(d.family);
    const copy=make('div','screen-copy',null,host),heading=make('h2','prod-heading',content.heading,copy,true);
    const source=make('p','screen-caption',content.source,copy,true);
    const view=make('div','screen-device carousel-art',null,host);
    view.dataset.carouselPreset=content.preset;
    const width=view.clientWidth,height=view.clientHeight,fit=Math.min(width/comp.width,height/comp.height);
    const center=content.center_text||'',wordCount=center.split(/\s+/).filter(Boolean).length;
    const layer=position=>{
      const line=make('div','carousel-center carousel-center-'+position,null,view);
      if(position==='above')line.setAttribute('aria-hidden','true');
      line.dataset.cardsOver=d.text.cardsOverOn;
      const phrase=make('span','carousel-phrase',null,line,true),words=[];
      for(const token of center.split(/(\s+)/).filter(Boolean)) {
        if(/^\s+$/.test(token)) {phrase.appendChild(document.createTextNode(token));continue;}
        const box=make('span','carousel-word',null,phrase),inner=make('span','carousel-word-inner',token,box);
        words.push(inner);
      }
      return {line,words};
    };
    const layers=d.text?[layer('below')]:[];
    const scaler=make('div','carousel-scaler',null,view);
    Object.assign(scaler.style,{width:comp.width+'px',height:comp.height+'px',left:(width-comp.width*fit)/2+'px',
      top:(height-comp.height*fit)/2+'px',transform:`scale(${fit})`});
    const stage=make('div','carousel-stage',null,scaler);
    const group=make('div','carousel-stage carousel-group',null,stage);
    if(is3d){stage.style.perspective=comp.cameraZoom+'px';stage.style.transformStyle='preserve-3d';group.style.transformStyle='preserve-3d';}
    group.style.transform=`scale(${look.zoom}) translateZ(${-(comp.cameraDistance-comp.cameraZoom)}px)`;
    if(d.text)layers.push(layer('above'));
    const cards=Array.from({length:d.n},(_,index)=>{
      const item=content.images[index%content.images.length],card=make('div','carousel-card',null,group);
      const inner=make('div','carousel-card-inner',null,card),image=make('img','carousel-image',null,inner);
      image.src=data.assets[item];image.alt='';card.dataset.carouselImage=item;card.dataset.carouselIndex=String(index);
      if(!is3d)card.style.zIndex=String(d.n-index);
      return {card,inner,image};
    });
    const posesAt=create(content.preset,wordCount);
    let measured=false;
    return time=>{
      if(!measured) {
        if(cards.some(({image})=>!image.complete||!image.naturalWidth||!image.naturalHeight))
          throw new Error('Carousel stills must decode before rendering');
        for(const {card,image} of cards) {
          const scale=look.fitBox/Math.max(image.naturalWidth,image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
          Object.assign(card.style,{width:w+'px',height:h+'px',marginLeft:-w/2+'px',marginTop:-h/2+'px'});
        }
        measured=true;
      }
      const tick=clock(time,onsets,comp.duration),poses=posesAt(tick.time),entrance=window.ShortCreatorStory.progress(time,onsets[0]);
      reveal(heading,out(entrance),24);reveal(source,out(entrance),18);
      view.dataset.carouselTime=String(tick.time);view.dataset.carouselSettle=String(tick.settle);
      scaler.style.visibility=tick.visible?'visible':'hidden';
      cards.forEach(({card,inner},index)=>{
        const p=poses[index];card.style.opacity=String(p.alpha);
        card.style.transform=`translate3d(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px,${(-p.z).toFixed(2)}px) rotateY(${p.rotY.toFixed(3)}deg) rotateX(${p.rotX.toFixed(3)}deg) rotateZ(${p.rotZ.toFixed(3)}deg) scale(${p.scale.toFixed(5)})`;
        inner.style.opacity=String(p.entry);inner.style.transform=`scale(${p.entryScale})`;
      });
      for(const {line,words} of layers) {
        line.style.visibility=tick.visible?'visible':'hidden';
        words.forEach((word,index)=>word.style.transform=`translateX(${110*(1-out((tick.time-index*d.text.wordStagger)/d.text.wordDuration))}%)`);
      }
    };
  }
  window.ShortCreatorCarousels={clock,create,mount,belt,beltEntry};
})();
