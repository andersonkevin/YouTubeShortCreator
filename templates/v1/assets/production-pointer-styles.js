/* Source-backed HyperFrames pointer presentation and camera primitives.
   All paths, trails and spring samples are functions of the native cue clock. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{const p=clamp(x);return p*p*(3-2*p);};
  const out=x=>1-(1-clamp(x))**4,cubic=x=>1-(1-clamp(x))**3;
  const inOut=x=>{const p=clamp(x);return p<.5?8*p**4:1-8*(1-p)**4;};
  const mix=(a,b,p)=>a+(b-a)*p;
  const arrow='M5 3 L5 19 L9 15 L12 22 L15 20.5 L11.5 14 L18 14 Z';
  const wrap=angle=>(((angle+180)%360+360)%360)-180;
  function keyed(keys,p) {
    if(p<=keys[0][0])return keys[0][1];
    for(let i=1;i<keys.length;i++)if(p<=keys[i][0])return mix(keys[i-1][1],keys[i][1],smooth((p-keys[i-1][0])/(keys[i][0]-keys[i-1][0])));
    return keys.at(-1)[1];
  }
  function dartAt(time,g,stateAt) {
    const current=stateAt(time),a=stateAt(time-1/30).tip,b=stateAt(time+1/30).tip;
    const vx=(b.x-a.x)*15,vy=(b.y-a.y)*15,speed=Math.hypot(vx,vy)/(g.W/1920);
    const direction=Math.atan2(vy,vx)*180/Math.PI,rotation=smooth((speed-150)/950)*wrap(direction+106);
    const depth=current.approach<1?keyed([[0,1.3],[.4,1.8],[.78,1.06],[1,1]],current.approach):current.scale;
    return {tip:current.tip,rotation,depth,direction,smear:Math.min(current.exit>0?36:12,(current.exit>0?.28:.16)*speed/30)};
  }
  function echoesAt(time,g,stateAt) {
    const lead=stateAt(time);
    return Array.from({length:4},(_,i)=>{
      const past=stateAt(time-(i+1)*3/30),distance=Math.hypot((past.tip.x-lead.tip.x)/g.W*100,(past.tip.y-lead.tip.y)/g.H*100);
      const alpha=.55*(1-i/4)*clamp(distance/2.2);
      return {tip:past.tip,scale:past.scale*(1-.015*(i+1)),opacity:lead.exit===1||alpha<.002?0:alpha};
    });
  }
  // Original 48-segment quadratic length table used by cursor-glyph-trail.
  function leg(a,b) {
    if(a.x===b.x&&a.y===b.y)return {points:Array.from({length:49},()=>({x:a.x,y:a.y})),lengths:Array(49).fill(0),total:0};
    const dx=b.x-a.x,dy=b.y-a.y,c={x:(a.x+b.x)/2-dy*.12,y:(a.y+b.y)/2+dx*.12};
    const points=[],lengths=[0];
    for(let i=0;i<=48;i++) {
      const p=i/48,q=1-p;points.push({x:q*q*a.x+2*q*p*c.x+p*p*b.x,y:q*q*a.y+2*q*p*c.y+p*p*b.y});
      if(i)lengths.push(lengths.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
    }
    return {points,lengths,total:lengths.at(-1)};
  }
  function atDistance(path,length) {
    const distance=Math.max(0,Math.min(path.total,length));let i=1;
    while(i<48&&path.lengths[i]<distance)i++;
    const p=(distance-path.lengths[i-1])/(path.lengths[i]-path.lengths[i-1]||1);
    return {i,x:mix(path.points[i-1].x,path.points[i].x,p),y:mix(path.points[i-1].y,path.points[i].y,p)};
  }
  function trailAt(path,progress,W) {
    const to=out(progress)*path.total,from=22*W/1920;
    if(to<=from)return [];
    const a=atDistance(path,from),b=atDistance(path,to),points=[{x:a.x,y:a.y}];
    for(let i=a.i;i<b.i;i++)points.push(path.points[i]);
    points.push({x:b.x,y:b.y});return points;
  }
  function magneticAt(s,g) {
    const width=g.r.width,height=g.r.height,dot=width*.5;
    const m=clamp((s.approach-.65)/.35)*(1-clamp((s.action-.875)/.125)),p=smooth(m);
    const squash=clamp((1-s.scale)/.1),x=m-1,snap=1+2.15*x*x*x+1.15*x*x;
    const pull=m>0?p*.95:.35*smooth(1-Math.hypot(g.anchor.x-s.tip.x,g.anchor.y-s.tip.y)/(width*1.1));
    const cx=mix(s.tip.x,g.anchor.x,pull),cy=mix(s.tip.y,g.anchor.y,pull);
    const w=Math.max(0,mix(dot,width,snap)*(1+.04*p)*(1-.06*squash)),h=Math.max(0,mix(dot,height,snap)*(1+.04*p)*(1-.1*squash));
    return {x:cx-w/2,y:cy-h/2,width:w,height:h,radius:Math.min(mix(dot/2,width*.26,p),w/2,h/2),opacity:mix(.55,.14,p)+.08*squash};
  }
  function agentTagAt(time,g,stateAt,width,height) {
    const state=stateAt(time);let side=0;
    for(let i=0;i<30;i++)side+=stateAt(time-i*.01).tip.x>g.W*.6?1:0;
    const flip=inOut(side/30),margin=.01*g.W;
    return {x:Math.max(margin,Math.min(g.W-margin-width,state.tip.x+(1-flip)*.016*g.W-flip*(.005*g.W+width))),
      y:Math.max(margin,Math.min(g.H-margin-height,state.tip.y+(.021-.013*flip)*g.W)),flip,
      scale:.9+.1*out(state.approach),opacity:state.menuOpacity>0?0:clamp((state.approach-.15)/.2)*(1-clamp(state.exit/.5)),
      typed:clamp(state.approach/.6)};
  }
  function makeCamera(onsets,g,stateAt) {
    const begin=Math.max(0,onsets[0]-.4),end=onsets.at(-1)+.8;
    const aim=time=>{const s=stateAt(time),target=s.acting?g.end:g.anchor;
      return s.result?s.tip:{x:mix(s.tip.x,target.x,.6),y:mix(s.tip.y,target.y,.6)};};
    const samples=[],position=aim(begin),velocity={x:0,y:0},dt=1/240;
    const frames=Math.ceil((end-begin)*60)+1;
    // Source critically damped spring: omega 6, four substeps per 60 Hz sample.
    for(let frame=0;frame<=frames;frame++) {
      samples.push({x:position.x,y:position.y});
      for(let sub=0;sub<4;sub++) {
        const target=aim(begin+(frame*4+sub)*dt);
        for(const axis of ['x','y']){velocity[axis]+=(36*(target[axis]-position[axis])-12*velocity[axis])*dt;position[axis]+=velocity[axis]*dt;}
      }
    }
    return time=>{
      const state=stateAt(time),z=1+.8*inOut(state.approach)*(1-inOut(state.exit));
      if(z===1)return {x:0,y:0,z:1};
      const p=Math.max(0,Math.min(frames,(time-begin)*60)),i=Math.floor(p),a=samples[i],b=samples[Math.min(frames,i+1)];
      const cx=Math.max(g.W/(2*z),Math.min(g.W-g.W/(2*z),mix(a.x,b.x,p-i)));
      const cy=Math.max(g.H/(2*z),Math.min(g.H-g.H/(2*z),mix(a.y,b.y,p-i)));
      return {x:g.W/2-cx*z,y:g.H/2-cy*z,z};
    };
  }
  const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
  function shape(tag,attrs,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);set(node,attrs);parent.appendChild(node);return node;
  }
  const arrowTransform=(tip,size,scale)=>`translate(${tip.x} ${tip.y}) scale(${size/24*scale}) translate(-5 -3)`;
  function mount(svg,board,c,g,stateAt,cursor) {
    const kind=c.pointer||'arrow',size=g.W*.07;
    if(kind==='arrow')return ()=>{};
    let trail,ghosts,dart,heading,unheading,smear,plate,tag,status,path;
    if(kind==='echo')ghosts=Array.from({length:4},()=>{const node=shape('path',{d:arrow,fill:'var(--lime)',stroke:'var(--purple)','stroke-width':1.4},svg);svg.insertBefore(node,cursor);return node;});
    if(kind==='glyph-trail'){
      path=leg({x:g.anchor.x,y:g.H*1.16},g.anchor);
      trail=shape('polyline',{fill:'none',stroke:'var(--lime)','stroke-width':6*g.W/1920,'stroke-dasharray':`0 ${21*g.W/1920}`,'stroke-linecap':'round'},svg);
      svg.insertBefore(trail,cursor);
    }
    if(kind==='dart') {
      const id='interaction-dart-'+svg.closest('.scene').dataset.productionIndex;
      const filter=shape('filter',{id,x:'-100%',y:'-100%',width:'300%',height:'300%','color-interpolation-filters':'sRGB'},shape('defs',{},svg));
      smear=shape('feGaussianBlur',{stdDeviation:'0 0'},filter);
      dart=shape('g',{},svg);heading=shape('g',{filter:`url(#${id})`},dart);unheading=shape('g',{},heading);
      shape('polygon',{points:'-5,1 -14,82 -11,83 6,64 20,58 34,57 53,62 49,52 0,0',fill:'white',stroke:'var(--purple)','stroke-width':5,'stroke-linejoin':'round',transform:'scale(1.09 1)'},unheading);
    }
    if(kind==='magnetic')plate=shape('rect',{fill:'var(--lime)'},svg);
    if(kind==='agent') {
      tag=document.createElement('div');tag.className='pointer-agent';board.appendChild(tag);
      const name=document.createElement('div');name.className='pointer-agent-name';name.dataset.fit='true';name.textContent=c.actor;tag.appendChild(name);
      status=document.createElement('p');status.className='pointer-agent-status';status.dataset.fit='true';tag.appendChild(status);
    }
    return (time,state)=>{
      let metadata={style:kind};
      if(ghosts){const echoes=echoesAt(time,g,stateAt);ghosts.forEach((node,i)=>set(node,{transform:arrowTransform(echoes[i].tip,size,echoes[i].scale),opacity:echoes[i].opacity}));metadata.echoes=echoes;}
      if(trail){const points=trailAt(path,state.approach,g.W),tip=atDistance(path,out(state.approach)*path.total);
        set(trail,{points:points.map(p=>`${p.x},${p.y}`).join(' '),opacity:(1-clamp(state.action/.625))**2});
        if(!state.acting)set(cursor,{transform:arrowTransform(tip,size,state.scale)});metadata.trail_points=points;}
      if(dart){const s=dartAt(time,g,stateAt),local=wrap(s.direction-s.rotation);
        set(cursor,{opacity:0});set(dart,{transform:`translate(${s.tip.x} ${s.tip.y}) rotate(${s.rotation}) scale(${size/105*s.depth})`});
        set(heading,{transform:`rotate(${local})`});set(unheading,{transform:`rotate(${-local})`});set(smear,{stdDeviation:`${s.smear} 0`});metadata.dart=s;}
      if(plate){const s=magneticAt(state,g);set(cursor,{opacity:0});set(plate,{x:s.x,y:s.y,width:s.width,height:s.height,rx:s.radius,opacity:s.opacity});metadata.plate=s;}
      if(tag){const s=agentTagAt(time,g,stateAt,tag.offsetWidth,tag.offsetHeight);
        Object.assign(tag.style,{transformOrigin:`${s.flip*100}% 0`,transform:`translate(${s.x}px,${s.y}px) scale(${s.scale})`,opacity:String(s.opacity)});
        const chars=Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(c.label),part=>part.segment);
        status.textContent=chars.slice(0,Math.floor(s.typed*chars.length)).join('');metadata.tag=s;}
      board.dataset.pointerStyle=JSON.stringify(metadata);
    };
  }
  window.ShortCreatorPointerStyles={dartAt,echoesAt,leg,atDistance,trailAt,magneticAt,agentTagAt,makeCamera,mount};
})();
