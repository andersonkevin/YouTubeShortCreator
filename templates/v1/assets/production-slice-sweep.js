/* HyperFrames code-slice-hero bounded native headline port, Apache-2.0. */
(()=>{
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{const u=clamp(v);return u*u*u*(10+u*(-15+6*u));};
  function field(W,H,unit){
    if(![W,H].every(v=>Number.isInteger(v)&&v>0&&v<=1920)||!Number.isFinite(unit)||unit<=0||unit>1)throw new Error('Invalid slice field');
    const DURATION=8,SWEEP_START=1.35,direction=1,formationScale=1,sweepPower=4,sweepDuration=4.2,
      flipDuration=.75,cursorRadius=210*unit,tiltStrength=55,cursorDepth=80*unit,cursorFalloff=1.4,
      noiseStrength=2,flipBounce=.15,cursorLeft=-cursorRadius*1.8,cursorSpan=W+cursorRadius*3.6;
    const fieldReach=cursorRadius*Math.sqrt(-Math.log(.06)/cursorFalloff),cellSize=Math.max(16,Math.round(112*unit));
function hash(col, row, a, b) {
  const v = Math.sin(col * a + row * b) * 43758.5453;
  return v - Math.floor(v);
}

// Same Gaussian^falloff + smooth cutoff as the source hover (falloff 1.4).
// Distances are in composition pixels, so the field stays circular even
// when square cell size / grid density changes.
function fieldAt(x, y, cursorX, cursorY) {
  const distanceSquared = (x - cursorX) ** 2 + (y - cursorY) ** 2;
  const raw = Math.exp((-cursorFalloff * distanceSquared) / (cursorRadius * cursorRadius));
  const u = clamp((raw - 0.06) / 0.94);
  return u * u * (3 - 2 * u);
}

// One analytic ease-out and its inverse drive every passage/window time.
// Strength zero preserves linear travel exactly; strength one is quadratic.
const easeSweep = (u) =>
  sweepPower === 1 ? clamp(u) : 1 - Math.pow(1 - clamp(u), sweepPower);
const inverseSweep = (u) =>
  sweepPower === 1 ? clamp(u) : 1 - Math.pow(1 - clamp(u), 1 / sweepPower);
function cursorTimeAtX(x) {
  const rank = (direction === 1 ? x - cursorLeft : W - x - cursorLeft) / cursorSpan;
  return SWEEP_START + sweepDuration * inverseSweep(rank);
}
function cursorAt(time) {
  const progress = easeSweep((time - SWEEP_START) / sweepDuration);
  return {
    x: cursorLeft + cursorSpan * (direction === 1 ? progress : 1 - progress),
    y: H / 2,
    z: cursorDepth,
  };
}

function poseAt(tile, time) {
  const t = clamp(time, 0, DURATION);
  const progress = tile.active ? clamp((t - tile.flipStart) / tile.flipDuration) : 0;
  const turn = smooth(progress / 0.64);
  // Analytic damped oscillation: overshoot, return past 180, settle exactly.
  // The attack/tail both have zero slope, so bounce=0 is a clean half-turn.
  const ringT = clamp((progress - 0.64) / 0.36);
  const ringEnvelope =
    smooth(ringT / 0.12) * Math.exp(-3.3 * ringT) * (1 - smooth((ringT - 0.72) / 0.28));
  const bounce = flipBounce * 36 * Math.sin(ringT * Math.PI * 3.3) * ringEnvelope;
  const flight = Math.sin(Math.PI * progress) ** 0.7;
  const cursor = cursorAt(t);
  const radial = fieldAt(tile.cx, tile.cy, cursor.x, cursor.y);
  const automatic = t >= SWEEP_START && t <= SWEEP_START + sweepDuration;
  // A short approach replaces the long, separate anticipation phase.
  const approach = smooth((t - tile.passTime + 0.2) / 0.16);
  const pull =
    (automatic ? radial * approach * (1 - smooth(progress / 0.32)) : 0) *
    (tile.active ? 1 : 0.55);
  const dx = cursor.x - tile.cx,
    dy = cursor.y - tile.cy;
  const variation = noiseStrength * Math.max(pull, flight * tile.peak);
  // Continuous deterministic oscillations, not random-at-render-time jitter.
  const n1 = Math.sin(t * 5.7 + tile.phase),
    n2 = Math.sin(t * 10.3 + tile.phase * 1.71);
  const jitter = variation * (n1 * 0.7 + n2 * 0.3);
  const formation = Math.max(pull, flight * (0.55 + 0.45 * tile.peak));
  // CSS positive Z points toward the camera. The prior 2D tilt signs
  // depressed the cursor-facing edge despite lifting the tile center.
  // A signed depth field now raises that edge for a positive cursor Z;
  // moving the cursor through the plane smoothly reverses this torque.
  const depthGain = cursor.z / 160;
  const pullTiltX =
    depthGain *
    ((dy / cursorRadius) * tiltStrength * 1.6 * pull +
      tile.seedX * tiltStrength * 0.16 * pull);
  // Ink yaw cannot reverse against its half-turn after cursor passage.
  // Release its seeded torque over 80 ms; blank tiles retain signed pull.
  const yawDx = tile.active ? direction * Math.max(0, -direction * dx) : -dx;
  const yawHandoff = tile.active ? 1 - smooth((t - tile.passTime + 0.04) / 0.12) : 1;
  const pullTiltY =
    depthGain *
    ((yawDx / cursorRadius) * tiltStrength * 1.8 * pull +
      tile.seedY * tiltStrength * 0.12 * pull) *
    yawHandoff;
  const pullZ = (tiltStrength / 30) * cursor.z * 0.45 * pull;
  const rx = pullTiltX + tile.seedX * variation * 3 * flight + jitter;
  const ry = direction * (180 * turn + bounce) + pullTiltY + jitter * 0.7;
  const rz = tile.seedZ * variation * (2.3 * flight + 1.2 * pull) + jitter * 0.35;
  return {
    x: clamp(dx * 0.08 * pull, -tile.width * 0.18, tile.width * 0.18) + jitter * 0.2 * unit,
    y: clamp(dy * 0.07 * pull, -tile.height * 0.11, tile.height * 0.11) + jitter * 0.16 * unit,
    z: pullZ + 17 * unit * flight * tile.peak,
    cursorDepth: cursor.z,
    pullTiltX,
    pullTiltY,
    pullZ,
    rx,
    ry,
    rz,
    turn,
    bounce,
    radial,
    pull,
    peak: tile.peak,
    formation,
    scale: 1 - (1 - formationScale) * formation,
    shade: 1 - 0.12 * Math.abs(Math.sin((ry * Math.PI) / 180)) - 0.018 * formation,
  };
}

    return {poseAt,fieldAt,cursorAt,cursorTimeAtX,hash,fieldReach,cellSize,flipDuration,SWEEP_START,sweepDuration};
  }
  function partition(front,back,W,H,unit) {
    if(!(front instanceof Uint8ClampedArray)||!(back instanceof Uint8ClampedArray)||front.length!==W*H*4||back.length!==front.length)
      throw new Error('Invalid slice ink masks');
    const f=field(W,H,unit),size=f.cellSize,cols=Math.ceil(W/size),rows=Math.ceil(H/size);
    if(cols*rows>1600)throw new Error('Slice tile budget exceeded');
    const gx=Math.floor((W-cols*size)/2),gy=Math.floor((H-rows*size)/2),tiles=[];
    let first=Infinity,last=0,frontInk=0,backInk=0;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++) {
      const x=gx+col*size,y=gy+row*size,cx=x+size/2,cy=y+size/2;
      let a=0,b=0;
      for(let yy=Math.max(0,y);yy<Math.min(H,y+size);yy++)for(let xx=Math.max(0,x);xx<Math.min(W,x+size);xx++) {
        const i=(yy*W+xx)*4+3;a+=front[i]>0?1:0;b+=back[i]>0?1:0;
      }
      frontInk+=a;backInk+=b;
      const peak=f.fieldAt(cx,cy,cx,H/2),passTime=f.cursorTimeAtX(cx);
      const columnSeconds=Math.abs(f.cursorTimeAtX(cx+size/2)-f.cursorTimeAtX(cx-size/2));
      const flipStart=passTime+f.hash(col,row,269.5,183.3)*Math.min(.012,columnSeconds*.08);
      const tile={col,row,x,y,cx,cy,width:size,height:size,active:a+b>0,frontInk:a,backInk:b,peak,passTime,flipStart,
        flipDuration:f.flipDuration*(1+.18*(1-peak)),phase:f.hash(col,row,127.1,311.7)*Math.PI*2,
        seedX:f.hash(col,row,419.2,371.9)*2-1,seedY:f.hash(col,row,37.7,631.5)*2-1,seedZ:f.hash(col,row,97.3,127.9)*2-1};
      const dy=cy-H/2;let enter=Infinity,exit=-Infinity;
      if(Math.abs(dy)<f.fieldReach) {
        const dx=Math.sqrt(f.fieldReach**2-dy**2);
        enter=Math.max(f.SWEEP_START,passTime-.2,f.cursorTimeAtX(cx-dx));
        exit=Math.min(f.SWEEP_START+f.sweepDuration,f.cursorTimeAtX(cx+dx));
      }
      tile.motionStart=Math.min(enter,tile.active?flipStart:Infinity);
      tile.motionEnd=Math.max(exit,tile.active?flipStart+tile.flipDuration:-Infinity);
      first=Math.min(first,tile.motionStart);last=Math.max(last,tile.motionEnd);tiles.push(tile);
    }
    if(!frontInk||!backInk||!Number.isFinite(first)||last<=first)throw new Error('Slice requires two visible headline rasters');
    return {field:f,tiles,first,last,coverage:[frontInk,backInk]};
  }
  let active=null;
  function dispose(){active?.surface.dispose();active=null;}
  function mount(host,c,onsets) {
    const make=(tag,css,parent,text)=>{const n=document.createElement(tag);n.className=css;if(text!==undefined)n.textContent=text;parent.appendChild(n);return n;};
    const slot=make('div','headline-window headline-slice-sweep',host),mask=make('div','headline-mask',slot);
    slot.dataset.headlineSwap=c.swap;mask.style.height='100%';
    const layers=c.phrases.map(text=>{
      const layer=make('div','headline-layer',mask),ink=make('span','headline-ink',layer,text);
      layer.setAttribute('aria-label',text);ink.dataset.fit='true';ink.style.whiteSpace='pre';ink.style.maxWidth='none';
      return {layer,ink,text};
    });
    for(const name of ['caret','cover'])make('i','headline-'+name,mask).style.opacity='0';
    const canvas=make('canvas','headline-slice-canvas',mask);canvas.setAttribute('aria-hidden','true');
    const W=slot.clientWidth,H=slot.clientHeight;canvas.width=W;canvas.height=H;
    let g=null;
    const css=getComputedStyle(layers[0].ink),font=parseFloat(css.fontSize),unit=font/310;
    const ground=getComputedStyle(host).getPropertyValue('--purple').trim();
    if(!/^#[0-9a-f]{6}$/i.test(ground))throw new Error('Approved slice ground unavailable');
    for(const {ink} of layers) {
      if(ink.offsetWidth>W-2*font||ink.offsetHeight>H)throw new Error('Slice headline must fit one line at approved type size');
    }
    const rasterize=index=>{
      const {text}=layers[index];
      const raster=document.createElement('canvas');raster.width=W;raster.height=H;
      const ctx=raster.getContext('2d',{willReadFrequently:true});
      ctx.font=`${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;ctx.letterSpacing=css.letterSpacing;
      ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillStyle=css.color;
      const m=ctx.measureText(text),baseline=H/2+(m.fontBoundingBoxAscent-m.fontBoundingBoxDescent)/2;
      if(!Number.isFinite(baseline))throw new Error('Approved headline font metrics unavailable');
      ctx.fillText(text,W/2,baseline);const pixels=ctx.getImageData(0,0,W,H).data;
      ctx.globalCompositeOperation='destination-over';ctx.fillStyle=ground;ctx.fillRect(0,0,W,H);
      return {canvas:raster,ink:pixels,baseline,font:ctx.font,letterSpacing:ctx.letterSpacing};
    };
    const key={};
    let lastSignature=null;
    return time=>{
      let index=-1;onsets.forEach((t,i)=>{if(time>=t)index=i;});
      const p=index<0?0:window.ShortCreatorStory.progress(time,onsets[index]),moving=index>0&&p>0&&p<1;
      slot.dataset.headlineIndex=String(index);slot.dataset.headlineProgress=String(p);
      layers.forEach(({layer},i)=>{
        const shown=index>=0&&!moving&&(i===(index>0&&p===0?index-1:index));
        layer.style.visibility=shown?'visible':'hidden';layer.style.opacity=shown?String(index===0?p:1):'0';
        layer.setAttribute('aria-hidden',String(!shown));layer.style.transform='none';layer.style.filter='none';
      });
      canvas.style.visibility=moving?'visible':'hidden';
      if(!moving){lastSignature=null;slot.dataset.sliceState=JSON.stringify({moving:false,index,progress:p});return;}
      const signature=`${index}:${p}`;
      if(lastSignature!==signature) {
        if(active?.key!==key||active?.index!==index) {
          dispose();
          // Only the active pair owns full-resolution atlases, even in long films.
          const front=rasterize(index-1),back=rasterize(index),pair=partition(front.ink,back.ink,W,H,unit);
          const surface=window.ShortCreatorSliceSurface(front.canvas,back.canvas,pair.tiles,
            {unit,behindColor:ground,shadowStrength:.19,shadowSoftness:4*unit});
          active={key,index,surface,pair,font:back.font,letterSpacing:back.letterSpacing};
        }
        const pair=active.pair,seconds=pair.first+(pair.last-pair.first)*p;
        let evaluated=0;
        pair.tiles.forEach((tile,i)=>{
          const moving=seconds>=tile.motionStart&&seconds<=tile.motionEnd;
          const rear=tile.active&&seconds>tile.flipStart+tile.flipDuration;
          const pose=moving?pair.field.poseAt(tile,seconds):{x:0,y:0,z:0,rx:0,ry:rear?180:0,rz:0,scale:1,formation:0,shade:1};
          active.surface.set(i,pose);if(moving)evaluated++;
        });
        const calls=active.surface.draw();g??=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
        if(!g)throw new Error('Native slice display unavailable');g.drawImage(active.surface.canvas,0,0);
        const actual=active.surface.data;
        slot.dataset.sliceState=JSON.stringify({moving:true,index,progress:p,seconds,range:[pair.first,pair.last],
          tiles:pair.tiles.length,flips:pair.tiles.filter(t=>t.active).length,coverage:pair.coverage,
          allFinite:actual.every(Number.isFinite),evaluated,calls,shadows:active.surface.shadowStats.shadows,
          font:active.font,letterSpacing:active.letterSpacing,unit});lastSignature=signature;
      }
    };
  }
  window.addEventListener?.('pagehide',dispose);
  window.ShortCreatorSliceSweep={field,partition,mount,dispose};
})();
