/* HyperFrames telemetry, camcorder, scan-gate and segmentation mechanics.
   Every image, region, label and displayed value is explicitly supplied.
   These overlays do not detect objects or measure the subject. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),out=x=>1-(1-clamp(x))**3;
  const smooth=x=>{const p=clamp(x);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  const back=x=>{const p=clamp(x);if(p===0||p===1)return p;const a=p-1;return 1+2.7*a**3+1.7*a*a;};
  const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
  function shape(tag,attrs,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);set(node,attrs);parent.appendChild(node);return node;
  }
  function cornerPath(r,fraction=.18) {
    const x=r.x,y=r.y,w=r.width,h=r.height,a=w*fraction,b=h*fraction;
    return `M ${x+a} ${y} H ${x} V ${y+b} M ${x+w-a} ${y} H ${x+w} V ${y+b} M ${x} ${y+h-b} V ${y+h} H ${x+a} M ${x+w-a} ${y+h} H ${x+w} V ${y+h-b}`;
  }
  function scanState(p) {
    const q=clamp(p),time=q*1.05,lock=out((time-.68)/.2);
    const pulse=time<.68||time>=1.04?0:time<.86?out((time-.68)/.18):out((1.04-time)/.18);
    return {progress:q,opacity:out(time/.28),corners:(1-.4*back((time-.68)/.22))/.6,
      sweep:out((time-.1)/.4),sweepOpacity:time<.5?1:0,target:lock,label:lock,
      pulseOpacity:.9*pulse,pulseScale:.9+.35*pulse};
  }
  function floodRecipe(index) {
    if(!Number.isInteger(index)||index<0||index>3)throw new Error('Invalid inspection region');
    let seed=0x5e6f100d,recipe;
    const next=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<=index;i++) {
      // Preserve the source random schedule without jittering supplied coordinates.
      for(let j=0;j<4;j++)next();
      recipe={quantum:next()<.5?2:3,rows:11+Math.floor(next()*4)};
    }
    return recipe;
  }
  function floodState(p,recipe) {
    const q=clamp(p),frame=Math.floor(q*24+1e-7),time=q*1.3;
    const quantized=Math.floor(frame/recipe.quantum)*recipe.quantum/24*1.3;
    const visible=q===1?recipe.rows:Math.min(recipe.rows,Math.floor(clamp(quantized)*recipe.rows+1e-6));
    return {progress:q,visible,rows:recipe.rows,quantum:recipe.quantum,
      bracket:out((time-.84)/.22),label:out((time-1)/.3),
      flicker:time>0&&time<1&&Math.floor(frame/2)%2===1?.05:0};
  }
  function prepare(svg,path,style,region,index) {
    const r={x:region.x+3,y:region.y+3,width:Math.max(1,region.width-6),height:Math.max(1,region.height-6)};
    const group=shape('g',{'data-inspection-overlay':style},svg);svg.insertBefore(group,path);group.appendChild(path);
    set(path,{d:cornerPath(r),'stroke-width':3,'stroke-dashoffset':0});
    path.dataset.annotationInspection=style;
    const length=path.getTotalLength(),recipe=floodRecipe(index);
    const layers=[];
    const add=(tag,attrs)=>{const node=shape(tag,attrs,group);group.insertBefore(node,path);return node;};
    let target,pulse,sweep,flash;
    if(style==='scan-gate') {
      target=add('rect',{x:r.x,y:r.y,width:r.width,height:r.height,rx:Math.min(12,r.width*.1,r.height*.1),
        fill:'var(--lime)','fill-opacity':.08,stroke:'var(--lime)','stroke-width':1});
      pulse=add('rect',{fill:'none',stroke:'var(--lime)','stroke-width':2,rx:12});
      sweep=add('line',{x1:r.x,x2:r.x+r.width,stroke:'var(--lime)','stroke-width':3});
    } else {
      for(let i=0;i<recipe.rows;i++)layers.push(add('rect',{x:r.x,width:r.width,
        y:r.y+i*r.height/recipe.rows,height:Math.max(.1,r.height/recipe.rows-1),fill:'var(--lime)'}));
      flash=add('rect',{x:r.x,y:r.y,width:r.width,height:r.height,fill:'white'});
    }
    const state=p=>style==='scan-gate'?scanState(p):floodState(p,recipe);
    return {length,point:()=>({x:r.x,y:r.y}),inspection:true,labelOpacity:p=>state(p).label,
      renderCue(p,opacity) {
        const s=state(p);group.setAttribute('opacity',String(opacity));
        if(style==='scan-gate') {
          const w=r.width*s.corners,h=r.height*s.corners;
          set(path,{d:cornerPath({x:r.x+(r.width-w)/2,y:r.y+(r.height-h)/2,width:w,height:h}),opacity:s.opacity});
          set(sweep,{y1:r.y+r.height*s.sweep,y2:r.y+r.height*s.sweep,opacity:s.sweepOpacity*s.opacity});
          set(target,{opacity:s.target});
          set(pulse,{x:r.x+r.width*(1-s.pulseScale)/2,y:r.y+r.height*(1-s.pulseScale)/2,
            width:r.width*s.pulseScale,height:r.height*s.pulseScale,opacity:s.pulseOpacity});
        } else {
          set(path,{opacity:s.bracket});
          layers.forEach((layer,i)=>set(layer,{opacity:i>=s.visible?0:i===s.visible-1&&s.visible<s.rows?.55:.3}));
          set(flash,{opacity:s.flicker});
        }
        path.dataset.inspectionState=JSON.stringify(s);path.dataset.annotationDraw=String(p);
      }};
  }
  function valueTables(readouts) {
    let seed=0x2c9277b5;
    const next=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
    const groups=['0123456789','ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'];
    return readouts.map(readout=>{
      const chars=Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(readout.value),part=>part.segment);
      return ['--',...Array.from({length:8},(_,i)=>{
        const resolved=i===7?chars.length:Math.floor(chars.length*(i+1)/8);
        return chars.map((ch,k)=>{
          if(k<resolved)return ch;
          const group=ch.length===1?groups.find(group=>group.includes(ch)):null;
          return group?group[Math.floor(next()*group.length)]:ch;
        }).join('');
      })];
    });
  }
  function telemetryState(p,index) {
    const q=clamp(p),t=q*.86;
    return {opacity:out(t/.45),bracket:smooth((t-.12-index*.08)/.5)};
  }
  function readoutState(p,table) {
    const q=clamp(p);return {opacity:1-(1-clamp(q/.7))**2,value:table[Math.min(8,Math.floor(q*8+1e-7))],progress:q};
  }
  function counterState(time,onset,hud) {
    const frame=Math.max(0,Math.floor(time*30+1e-7)-Math.ceil(onset*30));
    const seconds=hud.counter_start+Math.floor(frame/30);
    const counter=[Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
    return {counter,frame,dot:hud.recording?(Math.floor(frame*2/33)%2===0?1:.25):0};
  }
  function mountHud(picture,hud,onsets,profile,make) {
    const host=make('div','image-hud',null,picture);host.dataset.hudStyle=hud.style;
    const W=picture.clientWidth,H=picture.clientHeight;
    const svg=shape('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'image-hud-lines','aria-hidden':'true'},host);
    const corners=[[false,false],[true,false],[false,true],[true,true]];
    if(hud.style==='telemetry') {
      const brackets=corners.map(([right,bottom])=>{
        const x=right?W-14:14,y=bottom?H-14:14,a=right?-36:36,b=bottom?-36:36;
        return shape('path',{d:`M ${x+a} ${y} H ${x} V ${y+b}`,fill:'none',stroke:'var(--lime)',
          'stroke-width':2,'stroke-dasharray':72,'stroke-dashoffset':72},svg);
      });
      const tables=valueTables(hud.readouts),rows=hud.readouts.map((r,i)=>{
        const row=make('div','image-hud-readout image-hud-corner-'+i,null,host);row.dataset.hudEmphasis=String(i===hud.emphasis);
        make('span','image-hud-label',r.label,row,true);const value=make('span','image-hud-value','--',row,true);
        return {row,value};
      });
      return time=>{
        const p=window.ShortCreatorStory.progress(time,onsets[0]);host.style.opacity=String(telemetryState(p,0).opacity);
        brackets.forEach((path,i)=>set(path,{'stroke-dashoffset':72*(1-telemetryState(p,i).bracket)}));
        rows.forEach(({row,value},i)=>{
          const q=window.ShortCreatorStory.progress(time,onsets[i+1]),s=readoutState(q,tables[i]);
          row.style.opacity=String(s.opacity);value.textContent=s.value;row.dataset.hudProgress=String(q);
        });
        host.dataset.hudProgress=String(p);
      };
    }
    const rec=make('div','image-hud-readout image-hud-corner-0',null,host);
    const dot=make('span','image-hud-record-dot',null,rec);make('span','image-hud-label',hud.recording?'REC':'PAUSE',rec,true);
    const battery=make('div','image-hud-battery',null,host);battery.setAttribute('aria-label',`Battery ${hud.battery}%`);
    const fill=make('span','',null,battery);fill.style.width=hud.battery+'%';
    const date=make('div','image-hud-readout image-hud-corner-2',null,host);make('span','image-hud-date',hud.date,date,true);
    const clock=make('div','image-hud-readout image-hud-corner-3',null,host);
    const aspect={landscape:'16:9',portrait:'9:16',square:'1:1','portrait-4x5':'4:5'}[profile];
    make('span','image-hud-mode',hud.mode+' / '+aspect,clock,true);const value=make('span','image-hud-counter','',clock,true);
    return time=>{
      const p=window.ShortCreatorStory.progress(time,onsets[0]),s=counterState(time,onsets[0],hud);
      host.style.opacity=String(out(p));dot.style.opacity=String(s.dot);value.textContent=s.counter;
      host.dataset.hudProgress=String(p);host.dataset.hudState=JSON.stringify(s);
    };
  }
  window.ShortCreatorImageInspection={cornerPath,scanState,floodRecipe,floodState,prepare,valueTables,telemetryState,readoutState,counterState,mountHud};
})();
