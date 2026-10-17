/* HyperFrames spotify-card, share-sheet-carousel and cinemagraph mechanics, Apache-2.0.
   Verified stills and explicit native copy replace platform marks and examples. */
(()=>{
  'use strict';
  const kinds=Object.freeze(['album-card','preview-sheet','steam-window']),clamp=x=>Math.max(0,Math.min(1,x));
  const out=(x,n=3)=>1-(1-clamp(x))**n;
  const rng=window.ShortCreatorAdvancedType.mulberry(1897);
  const wisps=Object.freeze(Array.from({length:14},()=>Object.freeze({x0:90+rng()*160,cycles:1+Math.floor(rng()*2),phase:rng(),
    sway:14+rng()*26,swayFreq:1+Math.floor(rng()*2),width:10+rng()*22,rise:300+rng()*80,alpha:.05+rng()*.09})));
  function steam(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Finite steam time required');
    const t=Math.max(0,Math.min(10,seconds))%10;
    return wisps.map(w=>{
      const at=t/10*w.cycles+w.phase,p=at-Math.floor(at),sway=Math.sin(2*Math.PI*(p*w.swayFreq+w.phase))*w.sway*p;
      return {x:w.x0+sway,y:380-p*w.rise,alpha:Number((w.alpha*Math.sin(Math.PI*p)).toFixed(4)),
        radius:w.width*(.7+p*1.6),angle:sway*.004};
    });
  }
  function windowBox(width,height,imageWidth,imageHeight,region) {
    if(![width,height,imageWidth,imageHeight].every(v=>Number.isFinite(v)&&v>0)||
      !['x','y','width','height'].every(k=>Number.isFinite(region[k]))||region.x<0||region.y<0||region.width<.05||region.width>.6||
      region.height<.05||region.height>.6||region.x+region.width>1||region.y+region.height>1)throw new Error('Invalid steam image region');
    const scale=Math.min(width/imageWidth,height/imageHeight),w=imageWidth*scale,h=imageHeight*scale;
    return {x:(width-w)/2+region.x*w,y:(height-h)/2+region.y*h,w:region.width*w,h:region.height*h,
      image:{x:(width-w)/2,y:(height-h)/2,w,h}};
  }
  function mountSteam(host,c,onsets,data,make,reveal) {
    const heading=make('h2','prod-heading',c.heading,host,true),board=make('div','media-board steam-board',null,host);
    board.dataset.mediaTreatment='steam-window';board.dataset.mediaLayout='solo';
    const picture=make('div','steam-picture',null,board),image=make('img','steam-image',null,picture);
    image.src=data.assets[c.items[0].image];image.alt=c.items[0].label;
    const canvas=make('canvas','steam-window',null,picture);canvas.width=340;canvas.height=420;canvas.setAttribute('aria-hidden','true');
    const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Steam canvas is unavailable');
    make('p','steam-label',c.items[0].label,board,true);const source=make('p','resource-source',c.source,host,true);
    return time=>{
      if(!image.complete||image.naturalWidth<32)throw new Error('Verified steam still is not decoded');
      const at=window.ShortCreatorCarousels.clock(time,onsets,10),poses=steam(at.time);
      const box=windowBox(picture.clientWidth,picture.clientHeight,image.naturalWidth,image.naturalHeight,c.region);
      Object.assign(canvas.style,{left:box.x+'px',top:box.y+'px',width:box.w+'px',height:box.h+'px'});
      ctx.clearRect(0,0,340,420);
      poses.forEach(s=>{
        const gradient=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.radius*2.4);
        gradient.addColorStop(0,`rgba(255,255,255,${s.alpha})`);gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;
        ctx.beginPath();ctx.ellipse(s.x,s.y,s.radius*1.1,s.radius*2.2,s.angle,0,Math.PI*2);ctx.fill();
      });
      const p=window.ShortCreatorStory.progress(time,onsets[0]);reveal(heading,out(p),20);board.style.opacity=source.style.opacity=String(out(p));
      board.dataset.steamState=JSON.stringify({clock:at,box,poses});
    };
  }
  const spring=Object.freeze([[.056667,1198,.13],[.09,903,.21],[.123333,648,.36],[.156667,437,.43],
    [.19,262,.5],[.223333,120,.62],[.256667,8,.78],[.29,-76,.89],[.323333,-138,1],
    [.356667,-175,null],[.39,-191,null],[.423333,-192,null],[.456667,-181,null],
    [.49,-159,null],[.523333,-131,null],[.556667,-100,null],[.59,-68,null],[.623333,-41,null],
    [.656667,-18,null],[.69,-5,null],[.723333,0,null]].map(Object.freeze));
  const cuts=Object.freeze([.99,1.356667,1.69,2.023333,2.356667,2.69,3.09,3.456667,3.79,4.123333,4.456667,4.79,5.156667]);
  function sheetState(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Finite preview-sheet time required');
    const t=Math.max(0,Math.min(6,seconds));let y=1450,alpha=0;
    for(const row of spring){if(t<row[0])break;y=row[1];if(row[2]!==null)alpha=row[2];}
    return {time:t,y,alpha,index:cuts.filter(cut=>t>=cut).length%4};
  }
  function albumState(progress) {
    if(!Number.isFinite(progress))throw new Error('Finite album progress required');
    const p=clamp(progress),t=p*1.25,card=out((t-.1)/.7,4),title=out((t-.55)/.5),detail=out((t-.7)/.45);
    return {p,alpha:card,y:60*(1-card),scale:.94+.06*card,title,detail,source:out((t-.85)/.4),
      titleY:20*(1-title),detailY:16*(1-detail)};
  }
  function sheetClock(time,onsets) {
    const clock=window.ShortCreatorCarousels.clock(time,onsets,6);
    const start=Math.ceil(onsets[0]*30),stop=Math.ceil(onsets[1]*30);
    // The last two source cuts belong to the settle cue, including on long scenes.
    const seconds=clock.frame<stop?4.79*(clock.frame-start)/(stop-start):4.79+1.21*clock.settle;
    return {...clock,time:seconds};
  }
  function geometry(width,height,tall,sheet) {
    if(![width,height].every(v=>Number.isFinite(v)&&v>=300))throw new Error('Media presentation viewport too small');
    const h=Math.floor(height*(sheet?.68:.86)),w=Math.floor(Math.min(width-64,tall?h*(sheet?668/974:.82):h*2.5));
    const x=Math.floor((width-w)/2),y=Math.floor((height-h)/2),pad=24;
    const picture=tall?{x:pad,y:sheet?110:pad,w:w-2*pad,h:h-(sheet?170:260)}:
      {x:pad,y:pad,w:Math.floor(w*.56)-pad,h:h-2*pad};
    const text=tall?{x:pad,y:sheet?20:h-212,w:w-2*pad,h:sheet?80:188}:
      {x:picture.x+picture.w+24,y:32,w:w-picture.w-3*pad,h:h-64};
    if(picture.w<64||picture.h<64||text.w<120)throw new Error('Media presentation has no readable content area');
    return {x,y,w,h,picture,text,unit:h/(sheet?974:990)};
  }
  function mount(host,spec,onsets,data,make,reveal) {
    const c=spec.content,sheet=c.treatment==='preview-sheet';
    if(!kinds.includes(c.treatment))throw new Error('Unknown media presentation');
    if(c.treatment==='steam-window')return mountSteam(host,c,onsets,data,make,reveal);
    const heading=make('h2','prod-heading',c.heading,host,true),board=make('div','media-board presentation-board',null,host);
    board.dataset.presentation=c.treatment;board.dataset.mediaLayout=c.layout;board.dataset.mediaTreatment=c.treatment;
    const source=make('p','resource-source',c.source,host,true);
    const b=geometry(board.clientWidth,board.clientHeight,['portrait','portrait-4x5'].includes(data.profile.id),sheet);
    const backgrounds=sheet?c.items.map(item=>{
      const image=make('img','presentation-ground',null,board);image.src=data.assets[item.image];image.alt='';
      image.setAttribute('aria-hidden','true');return image;
    }):[];
    const panel=make('div','presentation-panel '+(sheet?'presentation-sheet':'presentation-album'),null,board);
    Object.assign(panel.style,{left:b.x+'px',top:b.y+'px',width:b.w+'px',height:b.h+'px'});
    const picture=make('div','presentation-picture',null,panel);
    Object.assign(picture.style,{left:b.picture.x+'px',top:b.picture.y+'px',width:b.picture.w+'px',height:b.picture.h+'px'});
    const images=c.items.map(item=>{
      const image=make('img','presentation-image',null,picture);image.src=data.assets[item.image];image.alt=item.label;return image;
    });
    const copy=make('div','presentation-copy',null,panel);
    Object.assign(copy.style,{left:b.text.x+'px',top:b.text.y+'px',width:b.text.w+'px',height:b.text.h+'px'});
    const label=make('p','presentation-label',c.items[0].label,copy,true);
    const detail=sheet?null:make('p','presentation-detail',c.items[0].detail,copy,true);
    const counter=sheet?make('p','presentation-counter','1 / 4',panel,true):null;
    if(sheet)Object.assign(counter.style,{left:'24px',right:'24px',bottom:'16px'});
    return time=>{
      const p=window.ShortCreatorStory.progress(time,onsets[0]);reveal(heading,out(p),20);
      let s,clock=null;
      if(sheet) {
        clock=sheetClock(time,onsets);s=sheetState(clock.time);
        panel.style.transform=`translateY(${s.y*b.unit}px)`;panel.style.opacity=String(s.alpha);
        const fits=b.y+s.y*b.unit>=0&&b.y+s.y*b.unit+b.h<=board.clientHeight;
        label.textContent=c.items[s.index].label;counter.textContent=`${s.index+1} / 4`;
        copy.style.visibility=counter.style.visibility=fits&&s.alpha>0?'visible':'hidden';source.style.opacity=String(out(p));
        backgrounds.forEach((image,i)=>image.style.opacity=i===s.index?'1':'0');
      } else {
        s=albumState(p);panel.style.transform=`translateY(${s.y*b.unit}px) scale(${s.scale})`;panel.style.opacity=String(s.alpha);
        label.style.transform=`translateY(${s.titleY*b.unit}px)`;label.style.opacity=String(s.title);
        detail.style.transform=`translateY(${s.detailY*b.unit}px)`;detail.style.opacity=String(s.detail);source.style.opacity=String(s.source);
      }
      images.forEach((image,i)=>image.style.visibility=i===(sheet?s.index:0)?'visible':'hidden');
      board.dataset.presentationState=JSON.stringify({style:c.treatment,clock,...s,geometry:b});
    };
  }
  window.ShortCreatorMediaPresentations={kinds,wisps,steam,windowBox,spring,cuts,sheetState,albumState,sheetClock,geometry,mount};
})();
