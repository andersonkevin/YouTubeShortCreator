/* HyperFrames lottie-character-walk, Apache-2.0. Pinned source data, native SVG.
   No arbitrary Lottie documents, runtime player, font changes or remote assets. */
(()=>{
  'use strict';
  const clamp=p=>Math.max(0,Math.min(1,p)),out=(p,n)=>1-(1-clamp(p))**n;
  const identity=[1,0,0,1,0,0];
  function sample(property,frame) {
    if(!Number.isFinite(frame))throw new Error('Finite character frame required');
    if('value' in property)return property.value;
    if('x' in property)return [sample(property.x,frame),sample(property.y,frame)].flat();
    const keys=property.keys;
    if(frame<=keys[0][0])return keys[0][1];
    for(let i=1;i<keys.length;i++)if(frame<keys[i][0]) {
      const [start,a]=keys[i-1],[end,b]=keys[i],p=(frame-start)/(end-start);
      return a.map((v,j)=>v+(b[j]-v)*p);
    }
    return keys.at(-1)[1];
  }
  const scalar=v=>Array.isArray(v)?v[0]:v;
  function multiply(a,b) {
    return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],
      a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
  }
  function poses(frame) {
    if(!Number.isFinite(frame))throw new Error('Finite character frame required');
    const data=window.ShortCreatorCharacterData,layers=data.layers,t=Math.max(0,Math.min(data.last_frame,frame)),cache=new Map();
    const resolve=layer=>{
      if(cache.has(layer.id))return cache.get(layer.id);
      const k=layer.transform,p=sample(k.p,t),a=sample(k.a,t),s=sample(k.s,t),r=scalar(sample(k.r,t))*Math.PI/180;
      const c=Math.cos(r),sn=Math.sin(r),local=[c*s[0]/100,sn*s[0]/100,-sn*s[1]/100,c*s[1]/100,p[0],p[1]];
      local[4]-=local[0]*a[0]+local[2]*a[1];local[5]-=local[1]*a[0]+local[3]*a[1];
      const parent=layer.parent===null?identity:resolve(layers.find(n=>n.id===layer.parent)).matrix;
      // Lottie transform parenting does not inherit the parent's opacity.
      const value={id:layer.id,matrix:multiply(parent,local),opacity:scalar(sample(k.o,t))/100};cache.set(layer.id,value);return value;
    };
    return layers.filter(n=>n.shapes.length).map(resolve);
  }
  function state(seconds) {
    if(!Number.isFinite(seconds))throw new Error('Finite character time required');
    const t=Math.max(0,Math.min(7.5,seconds)),card=out((t-5.2)/.6,4),title=out((t-5.3)/.5,3),body=out((t-5.4)/.5,3),p=clamp((t-5.5)/.5);
    return {frame:Math.min(224,t*30),card,cardX:40*(1-card),cardScale:.96+.04*card,title,titleY:18*(1-title),
      body,bodyY:18*(1-body),rule:p===0||p===1?p:1-2**(-10*p)};
  }
  function geometry(width,height) {
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<900||height<650)throw new Error('Unsupported character viewport');
    const scale=Math.min(.9,width*.4/480,(height-100)/540),ground=height/2+180;
    const x=width*.33-764*scale,y=ground-906*scale,cardX=width*.33+336*scale;
    return {scale,x,y,ground,card:{x:cardX,y:ground-540*scale,w:Math.min(660*scale,width-cardX-80)}};
  }
  function mount(host,c,onsets,data,make) {
    const W=host.clientWidth,H=host.clientHeight,g=geometry(W,H),board=make('div','character-walk-board',null,host);
    const line=make('i','character-walk-ground',null,board);line.style.top=g.ground+'px';
    const card=make('div','character-walk-card',null,board);
    Object.assign(card.style,{left:g.card.x+'px',top:g.card.y+'px',width:g.card.w+'px'});
    const title=make('h2','character-walk-title',c.heading,card,true),rule=make('i','character-walk-rule',null,card);
    const body=make('p','character-walk-body',c.action,card,true),label=make('p','character-walk-label',c.label,board,true);
    const svg=(tag,attrs,parent)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));parent.appendChild(n);return n;};
    const art=svg('svg',{class:'character-walk-art',viewBox:`0 0 ${W} ${H}`,width:W,height:H,'aria-hidden':'true'},board);
    const stage=svg('g',{transform:`translate(${g.x} ${g.y}) scale(${g.scale})`},art),nodes=new Map();
    const colors={front:'var(--lime)',back:'var(--cyan)',cutout:'var(--purple)'};
    for(const layer of [...window.ShortCreatorCharacterData.layers].reverse()) {
      if(!layer.shapes.length)continue;
      const group=svg('g',{'data-character-layer':layer.id},stage);nodes.set(layer.id,group);
      for(const shape of [...layer.shapes].reverse()) {
        const [cx,cy]=shape.position,[w,h]=shape.size;
        const attributes=shape.type==='el'?{cx,cy,rx:w/2,ry:h/2}:{x:cx-w/2,y:cy-h/2,width:w,height:h,rx:Math.min(shape.radius,w/2,h/2)};
        attributes.fill=colors[shape.fill];
        if(shape.stroke)Object.assign(attributes,{stroke:colors[shape.stroke],'stroke-width':shape.stroke_width,'stroke-linecap':'round','stroke-linejoin':'round'});
        svg(shape.type==='el'?'ellipse':'rect',attributes,group);
      }
    }
    return time=>{
      const clock=window.ShortCreatorCarousels.clock(time,onsets,7.5),s=state(clock.time),p=out(window.ShortCreatorStory.progress(time,onsets[0]),3);
      board.style.opacity=String(p);card.style.opacity=String(s.card);card.style.transform=`translateX(${s.cardX}px) scale(${s.cardScale})`;
      title.style.opacity=String(s.title);title.style.transform=`translateY(${s.titleY}px)`;
      body.style.opacity=String(s.body);body.style.transform=`translateY(${s.bodyY}px)`;rule.style.transform=`scaleX(${s.rule})`;
      label.style.opacity=String(p);
      for(const pose of poses(s.frame)){const n=nodes.get(pose.id);n.setAttribute('transform',`matrix(${pose.matrix.join(' ')})`);n.setAttribute('opacity',String(pose.opacity));}
      board.dataset.characterState=JSON.stringify({clock,...s});
    };
  }
  window.ShortCreatorCharacterWalk={sample,multiply,poses,state,geometry,mount};
})();
