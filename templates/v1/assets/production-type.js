/* HyperFrames typography adaptations (Apache-2.0); source hashes in production provenance.
   The approved type, exact supplied text and shared cue clock remain authoritative. */
(() => {
  'use strict';
  const batchKinds=['word-crossfade','shared-axis-y','shared-axis-z','soft-blur','scan-band','accent-glitch','shimmer-sweep','mask-reveal','calm','word-highlight','text-stagger'];
  const readKinds=['marker-sweep','gradient-read','neon-read','kinetic-words','editorial-words','pill-read'];
  const kinds=['bottom-up','top-down','clip-wipe','line-slide','char-slam','headline-slam','text-shimmer','tracking-in','streaming','matrix','focus-resolve','colorama-wipe',...batchKinds,...readKinds,...(window.ShortCreatorAdvancedType?.kinds||[])];
  const clamp=x=>Math.max(0,Math.min(1,x));
  const out=x=>1-(1-clamp(x))**4;
  const back=x=>{const p=clamp(x)-1;return 1+2.7*p**3+1.7*p**2;};
  const graphemes=text=>Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),item=>item.segment);
  const gaps=[.167,.100,0,.367,0,.167,.133,.100,.100,.133,.167,.133,0,.233,.167,.100,0,.133,.133,.100,.167,.133,.100,.133,.167,.100,.133,.100,.133];
  const scatter=[[-0.9,-0.038,0.677],[0.61,0.716,-0.967],[0.418,0.575,0.822],[-0.76,-0.451,0.944],[-0.621,0.579,-0.215],[0.714,0.437,-0.824],[0.577,0.567,0.464],[0.902,0.346,0.016],[-0.526,0.743,-0.275],[-0.571,-0.353,0.954],[-0.666,0.61,-0.075],[-0.122,0.875,-0.783],[-0.141,0.726,-0.659],[0.606,-0.665,-0.713],[-0.962,0.131,0.307],[0.227,0.813,-0.979],[0.264,-0.754,-0.013],[-0.4,0.903,0.573],[0.393,0.542,-0.992],[0.884,-0.313,-0.834],[-0.048,0.707,-0.331],[-0.766,0.226,0.567],[0.207,0.734,-0.714],[-0.677,-0.614,0.462],[0.389,-0.542,-0.384],[0.497,0.716,0.414],[0.729,-0.59,-0.774],[0.665,-0.061,-0.58],[-0.758,-0.546,0.364],[0.113,0.667,-0.202],[0.963,0.171,0.47],[0.662,-0.295,0.912],[0.555,0.548,0.952],[-0.132,-0.677,0.685],[-0.758,0.133,-0.469],[-0.296,0.697,0.61],[-0.27,0.786,-0.677],[-0.781,-0.478,-0.384],[-0.216,-0.633,-0.949],[0.721,-0.452,-0.62],[-0.434,0.816,0.526],[-0.794,0.014,-0.971],[-0.683,-0.158,0.844],[-0.914,0.066,0.396],[0.157,-0.721,-0.188],[0.662,-0.087,0.573],[-0.732,0.651,-0.935],[0.35,0.605,0.152],[-0.317,-0.668,0.206],[0.139,0.822,-0.11],[-0.821,0.464,0.347],[-0.668,-0.527,-0.879],[-0.578,-0.444,0.673],[0.573,0.744,0.819],[-0.52,-0.449,0.256],[-0.053,-0.703,0.258],[-0.646,0.266,-0.551],[-0.728,-0.448,-0.488],[-0.547,-0.5,-0.099],[0.714,0.091,0.084],[-0.114,0.764,-0.357],[0.02,-0.706,-0.59],[0.144,-0.947,-0.95],[-0.851,0.232,-0.445]];
  function streamStarts(length) {
    let time=0;const times=Array.from({length},(_,i)=>{if(i)time+=gaps[i%gaps.length];return time;});
    return times.map(value=>time?value/time*.65:0);
  }
  function stagger(p,index,length) {return clamp((p-.4*index/Math.max(1,length-1))/.6);}
  function shake(p,start=21) {
    const frame=Math.min(24,Math.floor(clamp(p)*24+1e-8))-start;
    return frame===0?{x:4,y:-2}:frame===1?{x:-3,y:1}: {x:0,y:0};
  }
  function glyphState(kind,p,index,length) {
    const q=stagger(p,index,length),a=out(q);
    if(kind==='bottom-up')return {x:0,y:.85*(1-back(q)),scale:1,angle:0,opacity:a};
    if(kind==='top-down')return {x:0,y:-.55*(1-a),scale:1,angle:0,opacity:a};
    if(kind==='tracking-in')return {x:(index-(length-1)/2)*.16*(1-out(p)),y:.08*(1-out(p)),scale:1,angle:0,opacity:out(p)};
    if(kind==='char-slam') {
      const delay=length===1?0:Math.abs(index-(length-1)/2)/((length-1)/2)*.2;
      const progress=clamp((p-.1-delay)/.55),amount=back(progress),s=scatter[index%scatter.length];
      return {x:s[0]*.9*(1-amount),y:s[1]*(1-amount),scale:.82+.18*amount,angle:s[2]*12*(1-amount),opacity:1};
    }
    throw new Error('Unknown glyph animation');
  }
  function headlineState(p) {
    const q=clamp(p/.75),amount=q===1?1:1-2**(-10*q),s=shake(p,18);
    return {scale:1+.6*(1-amount),opacity:amount,...s};
  }
  function matrixState(p,index,length,glyph) {
    const q=stagger(p,index,length),frame=Math.floor(clamp(p)*24+1e-8);
    return {text:q>=.7?glyph:String((index*7+Math.floor(frame/2))%2),opacity:out(q),y:12*(1-out(q))};
  }
  function focusState(p,index,length) {
    const q=out(stagger(p,index,length));
    return {opacity:q,scale:1+.08*(1-q),blur:16*(1-q)};
  }
  function wordState(kind,p,index,length) {
    if(kind==='text-stagger') {
      const time=clamp(p)*Math.max(.89+.09*(length-1),1.77+.04*(length-1));
      const a=out((time-.35-.09*index)/.54),q=clamp((time-1.05-.04*index)/.72);
      const sweep=q<.5?4*q**3:1-(-2*q+2)**3/2;
      return {y:48*(1-a),scale:1,opacity:a,blur:14*(1-a),sweep:100*sweep};
    }
    if(kind==='word-highlight')return {y:0,scale:1,opacity:.32+.68*clamp(clamp(p)*length-index),blur:0};
    const delay=(kind==='shared-axis-y'?.45:.4)*index/Math.max(1,length-1);
    const q=clamp((p-delay)/(kind==='shared-axis-y'?.55:.6));
    const a=kind==='shared-axis-y'?1-(1-q)**3:out(q);
    if(kind==='word-crossfade')return {y:22*(1-a),scale:.92+.08*a,opacity:a,blur:5*(1-a)};
    if(kind==='shared-axis-y')return {y:32*(1-a),scale:1,opacity:a,blur:0};
    if(kind==='shared-axis-z') {const v=q-1,b=1+2.8*v**3+1.8*v**2;return {y:0,scale:.72+.28*b,opacity:a,blur:0};}
    throw new Error('Unknown word motion');
  }
  function treatmentState(kind,p) {
    p=clamp(p);const a=out(p),wave=p<.5?4*p**3:1-(-2*p+2)**3/2;
    if(kind==='soft-blur')return {opacity:a,y:28*(1-a),blur:18*(1-a)};
    if(kind==='scan-band')return {opacity:1-(1-clamp(p/.2))**3,position:-60+220*(1-(1-clamp((p-.15)/.85))**3)};
    if(kind==='accent-glitch') {
      const frame=Math.floor(p*24+1e-8),offset=frame>=3&&frame<15&&Math.floor((frame-3)/2)%2===0?8:0;
      return {opacity:p>0?1:0,offset};
    }
    if(kind==='shimmer-sweep')return {opacity:a,position:-20+140*wave};
    if(kind==='mask-reveal')return {opacity:1,position:-10+110*(1-(1-clamp((p-.1)/.9))**3)};
    if(kind==='calm')return {kicker:1-(1-clamp(p/.35))**3,title:out((p-.15)/.65),subtitle:out((p-.45)/.55)};
    throw new Error('Unknown title treatment');
  }
  function readState(kind,p,index,length) {
    if(!readKinds.includes(kind))throw new Error('Unknown reading treatment');
    p=clamp(p);
    const s={opacity:1,x:0,y:0,scale:1,highlight:0,sweep:100,glow:0,ink:1};
    if(p===1)return s;
    const position=p*length-index,q=clamp(position),active=position>=0&&position<1;
    const cubic=x=>1-(1-clamp(x))**3;
    if(kind==='marker-sweep'&&active) {
      s.highlight=q<.6?cubic(q/.6):1-((q-.6)/.4)**3;
      s.scale=q<.6?cubic(q/.6):1+.02*(q-.6)/.4;
    } else if(kind==='gradient-read'&&active) {
      s.sweep=q<.7?45*(1-q/.7):100;
      s.scale=q<.7?1.04:1+.04*(1-cubic((q-.7)/.3));
    } else if(kind==='neon-read'&&active) {
      s.glow=Math.min(clamp(q/.2),clamp((1-q)/.2));
    } else if(kind==='pill-read') {
      // Source first-word activation, 50 ms lead and 100 ms linear color fade.
      s.ink=index===0?1:clamp((p-.75*index/Math.max(1,length-1)+.05/.8)/(.1/.8));
    } else if(kind==='kinetic-words'||kind==='editorial-words') {
      const local=clamp((p-.55*index/Math.max(1,length-1))/.45);
      if(kind==='editorial-words') {
        const a=cubic(local);s.opacity=a;s.scale=1+.12*(1-a);
      } else {
        const mode=index%4,ratio=[.22,.2,.2,.24][mode]/.24,a=clamp(local/ratio);
        const v=a-1,overshoot=mode===3?2.2:1.7;
        const spring=a===0?0:a===1?1:1+(overshoot+1)*v**3+overshoot*v**2;
        const expo=a===1?1:1-2**(-10*a);
        s.opacity=out(a);
        if(mode===0)s.y=-120*(1-spring);
        else if(mode<3)s.x=(mode===1?-300:300)*(1-expo);
        else s.scale=.4+.6*spring;
      }
    }
    return s;
  }
  function readMount(node,kind,onset) {
    const text=node.textContent,words=[];
    node.setAttribute('aria-label',text);node.dataset.typeReveal=kind;node.dataset.resourceReveal=kind;
    node.classList.add('production-type','type-'+kind);node.textContent='';
    for(const part of text.split(/(\s+)/)) {
      if(!part)continue;
      if(/^\s+$/.test(part)){node.appendChild(document.createTextNode(part));continue;}
      const slot=document.createElement('span'),word=document.createElement('span');
      slot.className='type-read-slot';word.className='type-word';word.textContent=part;
      slot.appendChild(word);node.appendChild(slot);words.push({slot,word});
    }
    return time=>{
      const p=window.ShortCreatorStory.progress(time,onset);node.dataset.revealProgress=String(p);
      node.style.opacity=time<onset?'0':'1';node.style.transform='none';node.style.filter='none';
      words.forEach(({slot,word},i)=>{
        const s=readState(kind,p,i,words.length);slot.dataset.readState=JSON.stringify(s);
        slot.style.setProperty('--read-highlight',String(s.highlight));
        slot.style.setProperty('--read-grow',String(s.scale));
        word.style.opacity=String(s.opacity);word.style.filter='none';
        word.style.transform=p===1||kind==='marker-sweep'?'none':`translate(${s.x}px,${s.y}px) scale(${s.scale})`;
        word.style.backgroundPosition=s.sweep+'% 0';
        word.style.setProperty('--read-glow',String(s.glow));
        word.style.setProperty('--read-ink',(70+30*s.ink)+'%');
      });
    };
  }
  function batchMount(node,kind,onset) {
    const text=node.textContent,words=[];
    node.dataset.typeReveal=kind;node.dataset.resourceReveal=kind;node.setAttribute('aria-label',text);
    node.classList.add('production-type','type-'+kind);node.dataset.typeCopy=text;
    if(['word-crossfade','shared-axis-y','shared-axis-z','word-highlight','text-stagger'].includes(kind)) {
      node.textContent='';
      for(const part of text.split(/(\s+)/)) {
        if(/^\s+$/.test(part)){node.appendChild(document.createTextNode(part));continue;}
        const word=document.createElement('span');word.className='type-word';word.textContent=part;node.appendChild(word);words.push(word);
      }
    }
    const support=kind==='calm'?{kicker:node.parentElement.querySelector('.prod-kicker'),
      subtitle:node.parentElement.querySelector('.prod-subtitle'),rule:node.parentElement.querySelector('.prod-rule')}:null;
    return time=>{
      const p=window.ShortCreatorStory.progress(time,onset);node.dataset.revealProgress=String(p);
      node.style.opacity=time<onset?'0':'1';node.style.transform='none';node.style.filter='none';
      if(words.length)words.forEach((word,i)=>{
        const s=wordState(kind,p,i,words.length);word.style.opacity=String(s.opacity);
        word.style.transform=p===1?'none':`translateY(${s.y}px) scale(${s.scale})`;
        word.style.filter=s.blur?`blur(${s.blur}px)`:'none';
        if(kind==='text-stagger') {
          word.classList.toggle('type-stagger-shimmer',p>0&&p<1);
          word.style.backgroundPosition=s.sweep+'% 0';
        }
      });
      else {
        const s=treatmentState(kind,p);node.style.opacity=time<onset?'0':String(s.opacity??1);
        if(kind==='soft-blur'){node.style.transform=p===1?'none':`translateY(${s.y}px)`;node.style.filter=s.blur?`blur(${s.blur}px)`:'none';}
        if(kind==='scan-band')node.style.setProperty('--type-band',s.position+'%');
        if(kind==='accent-glitch')node.style.setProperty('--type-glitch',s.offset+'px');
        if(kind==='shimmer-sweep')node.style.setProperty('--type-shimmer',s.position+'%');
        if(kind==='mask-reveal')node.style.maskImage=p===1?'none':`linear-gradient(90deg,black calc(${s.position}% - 2%),transparent calc(${s.position}% + 2%))`;
        node.style.setProperty('--type-overlay-visible',p>0&&p<1?'1':'0');
        if(kind==='calm') {
          node.style.opacity=String(s.title);node.style.transform=p===1?'none':`translateY(${32*(1-s.title)}px)`;
          support.kicker.style.opacity=String(s.kicker);support.kicker.style.transform=`translateY(${22*(1-s.kicker)}px)`;
          support.subtitle.style.opacity=String(s.subtitle);support.subtitle.style.transform=`translateY(${24*(1-s.subtitle)}px)`;
          support.rule.style.transform=`scaleX(${s.subtitle})`;
        }
      }
    };
  }
  function mount(node,kind,onset,content={},data={}) {
    if(!kinds.includes(kind))throw new Error('Unknown production typography');
    if(kind==='colorama-wipe')return window.ShortCreatorColorama.mount(node,onset);
    if(window.ShortCreatorAdvancedType?.kinds.includes(kind))return window.ShortCreatorAdvancedType.mount(node,kind,onset,content,data);
    if(readKinds.includes(kind))return readMount(node,kind,onset);
    if(batchKinds.includes(kind))return batchMount(node,kind,onset);
    const text=node.textContent,parts=text.split(/(\s+)/),words=[],letters=[];
    const originalStyle=getComputedStyle(node),font=parseFloat(originalStyle.fontSize);
    node.dataset.resourceReveal=kind;node.dataset.typeReveal=kind;node.setAttribute('aria-label',text);
    node.classList.add('production-type');
    if(kind!=='headline-slam'&&kind!=='text-shimmer') {
      node.textContent='';
      for(const part of parts) {
        if(/^\s+$/.test(part)){node.appendChild(document.createTextNode(part));continue;}
        const word=document.createElement('span');word.className='type-word';word.textContent=part;node.appendChild(word);words.push(word);
        if(['bottom-up','top-down','char-slam','tracking-in','matrix'].includes(kind)) {
          word.textContent='';
          for(const glyph of graphemes(part)) {
            const letter=document.createElement('span');letter.className='type-glyph';letter.textContent=glyph;word.appendChild(letter);letters.push(letter);
          }
          if(kind==='bottom-up'||kind==='top-down')word.classList.add('type-word-mask');
        }
      }
    }
    const rows=[];
    words.forEach(word=>{
      let row=rows.find(row=>Math.abs(row.top-word.offsetTop)<2);
      if(!row){row={top:word.offsetTop,words:[],letters:[]};rows.push(row);}
      row.words.push(word);row.letters.push(...word.querySelectorAll('.type-glyph'));
    });
    rows.forEach((row,i)=>row.words.forEach(word=>word.dataset.typeRow=String(i)));
    const starts=streamStarts(words.length);
    const glyphs=letters.map(letter=>letter.textContent);
    if(kind==='matrix')letters.forEach(letter=>{letter.style.width=letter.getBoundingClientRect().width/(node.getBoundingClientRect().width/node.offsetWidth)+'px';});
    return t=>{
      const p=window.ShortCreatorStory.progress(t,onset);
      node.style.opacity=t<onset?'0':'1';node.style.transform='none';
      node.dataset.revealProgress=String(p);
      if(kind==='headline-slam') {
        const s=headlineState(p);node.style.opacity=t<onset?'0':String(s.opacity);
        node.style.transform=p===1?'none':`translate(${s.x}px,${s.y}px) scale(${s.scale})`;
      } else if(kind==='text-shimmer') {
        node.classList.toggle('type-shimmer-active',p>0&&p<1);
        node.style.backgroundPosition=`${100*(1-(1-Math.cos(Math.PI*p))/2)}% 50%`;
      } else if(kind==='matrix') {
        letters.forEach((letter,i)=>{const s=matrixState(p,i,letters.length,glyphs[i]);letter.textContent=s.text;
          letter.style.opacity=String(s.opacity);letter.style.transform=s.y?`translateY(${s.y}px)`:'none';});
      } else if(kind==='focus-resolve') {
        words.forEach((word,i)=>{const s=focusState(p,i,words.length);word.style.opacity=String(s.opacity);
          word.style.transform=p===1?'none':`scale(${s.scale})`;word.style.filter=s.blur?`blur(${s.blur}px)`:'none';});
      } else if(kind==='clip-wipe') {
        words.forEach((word,i)=>{const q=out(stagger(p,i,words.length));word.style.clipPath=q===1?'none':`inset(0 ${100*(1-q)}% 0 0)`;});
      } else if(kind==='line-slide') {
        rows.forEach((row,i)=>{const q=out(stagger(p,i,rows.length));row.words.forEach(word=>{
          word.style.opacity=String(q);word.style.transform=q===1?'none':`translate(${-36*(1-q)}px,${18*(1-q)}px)`;
          word.style.filter=q===1?'none':`blur(${6*(1-q)}px)`;
        });});
      } else if(kind==='streaming') {
        words.forEach((word,i)=>{
          const q=clamp((p-starts[i])/.35);word.style.visibility=p>=starts[i]?'visible':'hidden';
          word.style.opacity=p>=starts[i]?String(.45+.55*q):'0';
        });
      } else {
        const groups=kind==='tracking-in'?rows.map(row=>row.letters):[letters];
        groups.forEach(group=>group.forEach((letter,i)=>{
          const s=glyphState(kind,p,i,group.length);
          letter.style.opacity=String(s.opacity);
          letter.style.transform=p===1?'none':`translate(${s.x*font}px,${s.y*font}px) rotate(${s.angle}deg) scale(${s.scale})`;
        }));
        if(kind==='char-slam') {const s=shake(p);node.style.transform=s.x||s.y?`translate(${s.x}px,${s.y}px)`:'none';}
      }
    };
  }
  window.ShortCreatorType={kinds,batchKinds,readKinds,graphemes,streamStarts,stagger,shake,glyphState,headlineState,matrixState,focusState,wordState,treatmentState,readState,mount};
})();
