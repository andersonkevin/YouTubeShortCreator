/* Bounded HyperFrames typography mechanics, Apache-2.0.
   Native title copy, approved fonts and caption frames own the presentation. */
(() => {
  'use strict';
  const kinds=Object.freeze(['glitch-read','decode-read','neon-accent','particle-burst',
    'tile-resolve','ascii-trail','cadenced-type','particle-assemble','texture-read','prism-bow']);
  const preparations=[];
  const clamp=x=>Math.max(0,Math.min(1,x)),out=(x,n=3)=>1-(1-clamp(x))**n;
  const smooth=x=>(1-Math.cos(Math.PI*clamp(x)))/2;
  const quadratic=x=>{const p=clamp(x);return p<.5?2*p*p:1-2*(1-p)**2;};
  const chars=text=>Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),x=>x.segment);
  const lcg=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function mulberry(seed) {
    return ()=>{seed|=0;seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
  }
  const phase=(p,i,n)=>clamp((clamp(p)-.55*i/Math.max(1,n-1))/.45);
  function prismState(progress) {
    if(!Number.isFinite(progress))throw new Error('Finite prism progress required');
    const p=clamp(progress),t=Math.min(1,p/.85)*1.252,focus=out((t-.1)/1.152),clear=out((p-.85)/.15);
    return {alpha:out((t-.1)/.672),blur:(18-15.5*focus)*(1-clear),offset:(18-14*focus)*(1-clear),
      ghost:(.45+.4*focus)*(1-clear),tilt:6*(1-clear)};
  }
  function wordState(kind,p,index,count,accent=false) {
    if(!['glitch-read','decode-read','neon-accent','particle-burst'].includes(kind)||!Number.isFinite(p))throw new Error('Unknown advanced word treatment');
    const q=phase(p,index,count),s={opacity:1,x:0,scale:1,shadow:0,glow:0,accent:0,decode:2};
    if(p>=1)return s;
    if(kind==='glitch-read') {
      const next=mulberry(index*777+13),travel=-(8+next()*8),shadow=5+next()*7;
      const pulse=q<.35?q/.35:1-out((q-.35)/.65,4);
      s.x=travel*pulse;s.shadow=Number(shadow.toFixed(1))*pulse;s.opacity=out(p/.15);
    } else if(kind==='decode-read') {
      s.decode=q<1/3?0:q<2/3?1:2;s.opacity=q>0?1:0;
    } else if(kind==='neon-accent') {
      const enter=out(q);s.scale=.65+.35*enter;s.opacity=enter;
      s.glow=accent?enter*(1-out((q-.7)/.3)):0;s.accent=s.glow;
    } else {
      const t=q*.7,attack=out(t/.08),release=out((t-.35)/.1);
      s.scale=1+(accent?.12:.05)*attack*(1-release);s.opacity=out(p/.2);
      s.accent=accent?attack*(1-release):0;
    }
    return s;
  }
  function decodeRows(text,index) {
    const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return [0,1].map(step=>{const next=mulberry(index*1000+step);return chars(text).map(()=>alphabet[Math.floor(next()*alphabet.length)]).join('');});
  }
  function burst(index) {
    const next=mulberry(index*137+99);
    return Array.from({length:10},(_,i)=>{const angle=i/10*Math.PI*2+next()*.6,distance=120+next()*200;
      return {x:Math.cos(angle)*distance,y:-Math.sin(angle)*distance,size:4+next()*8,delay:i*.018};});
  }
  function burstPose(row,p) {
    const t=clamp(p)*.7,a=out((t-row.delay)/.12,4),fade=clamp((t-.12-row.delay)/.45);
    return {x:row.x*a,y:row.y*a,alpha:p>=1?0:a*(1-fade*fade)};
  }
  function tileTable() {
    const next=lcg(0x57a7c1e),rows=Array.from({length:60},(_,i)=>{
      const row=Math.floor(i/12),column=i%12;
      return {row,column,variant:Math.floor(next()*3),alpha:.72+next()*.28,
        wave:column+row*.68+Math.sin(row*1.7+column*.42)*2.15};
    });
    [...rows].sort((a,b)=>a.wave-b.wave).forEach((row,rank)=>{row.rank=rank;});return rows;
  }
  function tileState(row,p) {
    const t=clamp(p)*(.2+59*.04+.5),q=out((t-.2-row.rank*.04)/.5);
    return {resolve:q,scale:.82+.18*q,noise:row.alpha*(1-q),noiseScale:1+.18*q,stage:out(t/.38)};
  }
  function curve(p) {
    const u=1-p;return {x:u**3*-80+3*u*u*p*340+3*u*p*p*660+p**3*1080,
      y:u**3*460+3*u*u*p*460+3*u*p*p*140+p**3*140};
  }
  function asciiTable() {
    const glyphs=' .:-=+*#%@01/\\<>[]{}';
    return Array.from({length:336},(_,i)=>{const row=Math.floor(i/24),column=i%24,p=(column+.5)/24;
      return {row,column,glyph:glyphs[(i*17+row*11+column*7)%glyphs.length],
        at:.42+p*1.92+Math.abs((row+.5)/14*600-curve(p).y)/600*.8+(i*37%11)*.009,
        duration:.2+(i*13%5)*.018};});
  }
  function asciiState(row,p) {
    const q=clamp((clamp(p)*3.2-row.at)/row.duration),flip=q**3;
    return {opacity:1-flip,scale:(1-.7*flip)*Math.cos(88*Math.PI/180*flip)};
  }
  function typingTable(text) {
    const next=lcg(0x7f4a7c15),rows=[{at:0,count:0}],glyphs=chars(text);let time=.35,count=0,wordIndex=0;
    for(const part of text.split(/(\s+)/)) {
      if(!part)continue;
      const letters=chars(part);
      if(/^\s+$/.test(part)){count+=letters.length;continue;}
      if(wordIndex++)time+=.1+next()*.1;
      const chunks=[];
      for(let i=0;i<letters.length;){const n=1+Math.floor(next()*3);chunks.push(letters.slice(i,i+n));i+=n;}
      for(const chunk of chunks){time+=chunk.length*(.05+next()*.04);count+=chunk.length;rows.push({at:time,count});}
    }
    rows.at(-1).count=glyphs.length;
    return {rows:rows.map(row=>({...row,at:row.at/time})),cycles:Math.max(1,Math.round(time/.9)),length:glyphs.length};
  }
  function typingState(table,p) {
    const q=clamp(p),row=[...table.rows].reverse().find(row=>row.at<=q+1e-10);
    return {count:q===1?table.length:row.count,caret:q<1&&Math.sin(q*Math.PI*2*table.cycles)>=0};
  }
  function particleTable(pixels,width,height) {
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||pixels.length!==width*height*4)throw new Error('Invalid title raster');
    const next=lcg(0x9d1550f7),unit=Math.min(width,height),step=Math.max(2,Math.round(unit/260)),cells=[];
    let min=Infinity,max=-Infinity;
    for(let y=0;y<height;y+=step)for(let x=0;x<width;x+=step)if(pixels[(y*width+x)*4+3]>127){cells.push({x,y});min=Math.min(min,x);max=Math.max(max,x);}
    const span=Math.max(1,max-min),keep=Math.min(1,1700/Math.max(1,cells.length)),rows=[];
    for(const cell of cells) {
      if(next()>=keep)continue;
      const at=.2+.62*(cell.x-min)/span+.05*next(),travel=.18+.1*next(),fade=.05+.04*next(),angle=next()*Math.PI*2;
      rows.push({tx:cell.x,ty:cell.y,at:Math.min(.9,at),travel,fade,offset:(.1+.22*next())*unit,
        ox:Math.cos(angle),oy:Math.sin(angle),radius:(.26+.5*next())*(unit/200)*step*.5,dim:.5+.5*next()});
    }
    return rows;
  }
  function particlePose(row,p) {
    p=clamp(p);const birth=Math.max(0,row.at-row.travel),u=clamp((p-birth)/(row.at-birth)),settled=clamp((p-row.at)/row.fade);
    const alpha=clamp(u/.16)*(1-settled)*row.dim*clamp((1-p)/.04)*.92,distance=row.offset*(1-out(u));
    return {x:row.tx+row.ox*distance,y:row.ty+row.oy*distance,radius:row.radius,alpha};
  }
  function raster(node,words) {
    const canvas=document.createElement('canvas');canvas.width=node.clientWidth;canvas.height=node.clientHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx||!canvas.width||!canvas.height||!('letterSpacing' in ctx))throw new Error('Approved title raster is unavailable');
    ctx.textBaseline='alphabetic';ctx.fillStyle='white';
    const style=getComputedStyle(node);
    ctx.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.letterSpacing=style.letterSpacing;
    for(const word of words) {
      const m=ctx.measureText(word.textContent),line=parseFloat(style.lineHeight),height=m.fontBoundingBoxAscent+m.fontBoundingBoxDescent;
      ctx.fillText(word.textContent,word.offsetLeft,word.offsetTop+(line-height)/2+m.fontBoundingBoxAscent);
    }
    return canvas;
  }
  function mount(node,kind,onset,content,data) {
    if(!kinds.includes(kind))throw new Error('Unknown advanced typography');
    const text=node.textContent,words=[],letters=[],rawParts=text.split(/(\s+)/);
    node.setAttribute('aria-label',text);node.dataset.typeReveal=kind;node.dataset.resourceReveal=kind;
    node.classList.add('production-type','type-advanced','type-'+kind);node.textContent='';
    const copy=document.createElement('span');copy.className='type-advanced-copy';node.appendChild(copy);
    for(const part of rawParts) {
      if(!part)continue;
      if(/^\s+$/.test(part)){copy.appendChild(document.createTextNode(part));letters.push(...chars(part).map(()=>null));continue;}
      const word=document.createElement('span');word.className='type-word';word.textContent=part;copy.appendChild(word);words.push(word);
      if(kind==='cadenced-type') {
        word.textContent='';for(const char of chars(part)){const letter=document.createElement('span');letter.className='type-glyph';letter.textContent=char;word.appendChild(letter);letters.push(letter);}
      }
    }
    const original=words.map(word=>word.textContent),decode=original.map(decodeRows),typing=typingTable(text);
    if(kind==='decode-read')for(const word of words){word.style.width=word.offsetWidth+'px';word.style.overflow='clip';}
    const css=getComputedStyle(node),colors=[css.getPropertyValue('--purple').trim(),css.getPropertyValue('--lime').trim(),css.getPropertyValue('--cyan').trim()];
    const canvas=document.createElement('canvas');canvas.className='type-advanced-canvas';canvas.setAttribute('aria-hidden','true');
    canvas.width=node.clientWidth;canvas.height=node.clientHeight;node.appendChild(canvas);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Title canvas unavailable');
    const source=['tile-resolve','particle-assemble'].includes(kind)?raster(node,words):null;
    const tiles=kind==='tile-resolve'?tileTable():[],ascii=kind==='ascii-trail'?asciiTable():[];
    const particles=kind==='particle-assemble'?particleTable(source.getContext('2d').getImageData(0,0,source.width,source.height).data,source.width,source.height):[];
    const accent=original.indexOf(content.accent_word),dots=kind==='particle-burst'?burst(accent):[];
    if(['particle-burst','neon-accent'].includes(kind)&&accent<0)throw new Error('Missing explicit title accent word');
    let texture=null;
    if(kind==='texture-read') {
      const path=data.assets[content.texture];texture=window.ShortCreatorShaderImages?.[path];
      if(typeof texture!=='string'||!/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(texture))throw new Error('Missing verified local title texture');
      const image=new Image();image.src=texture;preparations.push(image.decode());
    }
    return time=>{
      const p=window.ShortCreatorStory.progress(time,onset),W=canvas.width,H=canvas.height;
      node.dataset.revealProgress=String(p);node.dataset.advancedProgress=String(p);
      node.style.opacity=time<onset?'0':'1';node.style.transform='none';node.style.filter='none';
      copy.style.opacity='1';copy.style.clipPath='none';copy.style.transform='none';copy.style.maskImage='none';
      ctx.clearRect(0,0,W,H);ctx.globalAlpha=1;const states=[];
      if(['glitch-read','decode-read','neon-accent','particle-burst'].includes(kind))words.forEach((word,i)=>{
        const s=wordState(kind,p,i,words.length,i===accent);states.push(s);
        word.style.opacity=String(s.opacity);word.style.transform=p===1?'none':`translateX(${s.x}px) scale(${s.scale})`;
        const glow=(color,alpha)=>`color-mix(in srgb,${color} ${100*s.glow*alpha}%,transparent)`;
        word.style.textShadow=s.shadow?`${s.shadow}px 0 ${colors[1]},${-s.shadow}px 0 ${colors[2]}`:
          s.glow?`0 0 4px ${glow(colors[1],1)},0 0 10px ${glow(colors[1],.9)},0 0 20px ${glow(colors[2],.7)},0 0 40px ${glow(colors[2],.4)}`:'none';
        word.style.color=s.accent>0?`color-mix(in srgb,${colors[1]} ${s.accent*100}%,white)`:'white';
        if(kind==='decode-read')word.textContent=s.decode===2?original[i]:decode[i][s.decode];
      });
      if(kind==='prism-bow') {
        const s=prismState(p);states.push(s);copy.style.opacity=String(s.alpha);
        node.style.filter=p===1?'none':`blur(${s.blur}px)`;
        node.style.transform=p===1?'none':`perspective(950px) rotateX(${s.tilt}deg)`;
        copy.style.textShadow=p===1?'none':`${-s.offset}px 0 color-mix(in srgb,${colors[1]} ${100*s.ghost}%,transparent),${s.offset}px 0 color-mix(in srgb,${colors[2]} ${100*s.ghost}%,transparent)`;
      } else if(kind==='particle-burst'&&p<1) {
        const word=words[accent],q=phase(p,accent,words.length),x=word.offsetLeft+word.offsetWidth/2,y=word.offsetTop+word.offsetHeight/2;
        dots.forEach((row,i)=>{const s=burstPose(row,q);ctx.globalAlpha=s.alpha;ctx.fillStyle=colors[1+i%2];
          ctx.beginPath();ctx.arc(x+s.x,y+s.y,row.size/2,0,Math.PI*2);ctx.fill();});
      } else if(kind==='cadenced-type') {
        const s=typingState(typing,p);states.push(s);
        letters.forEach((letter,i)=>{if(letter){letter.style.visibility=i<s.count?'visible':'hidden';letter.style.boxShadow=s.caret&&i===s.count-1?'3px 0 '+colors[1]:'none';}});
      } else if(kind==='texture-read') {
        const a=out(p/.225,4);copy.style.opacity=String(a);copy.style.transform=p===1?'none':`scale(${.88+.12*a})`;
        copy.style.maskImage=p===1?'none':`url("${texture}")`;copy.style.maskPosition=`${100*smooth(p)}% 50%`;
        states.push({position:100*smooth(p),mask:p<1,opacity:a});
      } else if(kind==='tile-resolve'&&p<1) {
        copy.style.opacity='0';const w=W/12,h=H/5;
        for(const row of tiles) {
          const s=tileState(row,p),x=row.column*w,y=row.row*h;states.push(s);
          ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
          ctx.globalAlpha=s.stage*s.resolve;ctx.drawImage(source,x,y,w,h,x+w*(1-s.scale)/2,y+h*(1-s.scale)/2,w*s.scale,h*s.scale);
          ctx.globalAlpha=s.stage*s.noise;ctx.fillStyle=colors[row.variant];
          ctx.fillRect(x+w*(1-s.noiseScale)/2,y+h*(1-s.noiseScale)/2,w*s.noiseScale,h*s.noiseScale);ctx.restore();
        }
      } else if(kind==='ascii-trail'&&p<1) {
        const w=W/24,h=H/14;ctx.font=`400 ${Math.max(8,Math.min(w,h)*.85)}px BrandMono`;ctx.textAlign='center';ctx.textBaseline='middle';
        for(const row of ascii) {
          const s=asciiState(row,p),x=(row.column+.5)*w,y=(row.row+.5)*h;states.push(s);
          ctx.globalAlpha=s.opacity;ctx.fillStyle=colors[0];ctx.fillRect(x-w/2,y-h/2,w,h);
          ctx.save();ctx.translate(x,y);ctx.scale(s.scale,1);ctx.fillStyle=colors[1];ctx.fillText(row.glyph,0,0);ctx.restore();
        }
      } else if(kind==='particle-assemble'&&p<1) {
        copy.style.opacity=String(out((p-.16)/.3));copy.style.clipPath=`inset(0 ${100*(1-quadratic((p-.18)/.76))}% 0 0)`;
        ctx.fillStyle=colors[1];
        for(const row of particles){const s=particlePose(row,p);if(s.alpha<=.002)continue;ctx.globalAlpha=s.alpha;ctx.beginPath();ctx.arc(s.x,s.y,s.radius,0,Math.PI*2);ctx.fill();}
      }
      ctx.globalAlpha=1;node.dataset.advancedState=JSON.stringify({kind,p,states,particleCount:particles.length,accent});
    };
  }
  window.ShortCreatorAdvancedType={kinds,mulberry,prismState,wordState,decodeRows,burst,burstPose,tileTable,tileState,
    curve,asciiTable,asciiState,typingTable,typingState,particleTable,particlePose,mount,ready:()=>Promise.all(preparations)};
})();
