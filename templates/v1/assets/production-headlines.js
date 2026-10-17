/* Adapted from HyperFrames caret-swap, line-swap, text-state-swap and marker-highlight.
   Apache-2.0; retained source hashes and bounded changes are in production provenance. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const out=x=>1-(1-clamp(x))**5;
  const cubic=x=>clamp(x)**3;
  const smooth=x=>{const p=clamp(x);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  const shapes={
    highlight:{view:'0 0 100 40',d:'M 3 24 C 22 20.5, 47 25.5, 68 22.5 C 79 21, 90 23, 97 21.5',width:26,opacity:.5},
    circle:{view:'0 0 100 40',d:'M 22 7 C 58 1, 95 8, 97 20 C 99 31, 74 38, 44 37 C 16 36, 2 29, 3 19 C 4 10, 22 4, 52 4.5',width:2.8,opacity:1},
    underline:{view:'0 0 100 12',d:'M 2 7 C 20 4.5, 46 8.5, 66 6 C 80 4.5, 92 7.5, 98 5.5',width:4.5,opacity:1},
    scribble:{view:'0 0 100 40',d:'M 6 13 C 34 9.5, 66 11, 94 9 C 60 15, 26 16, 7 20 C 36 18, 68 21, 93 18 C 62 25, 28 27, 8 29',width:5,opacity:.65},
  };
  function bezier(x,a,b,c,d) {
    const p=clamp(x);if(p===0||p===1)return p;
    let lo=0,hi=1;
    for(let i=0;i<28;i++){const t=(lo+hi)/2,v=3*(1-t)**2*t*a+3*(1-t)*t*t*c+t**3;if(v<p)lo=t;else hi=t;}
    const t=(lo+hi)/2;return 3*(1-t)**2*t*b+3*(1-t)*t*t*d+t**3;
  }
  function swapState(kind,p) {
    p=clamp(p);
    if(kind==='line')return {fromY:-115*cubic(p/.4375),fromOpacity:p<.4375?1:0,fromBlur:0,
      toY:115*(1-out((p-.275)/.625)),toOpacity:p>=.275?1:0,toBlur:0,underline:out((p-.9)/.1)};
    if(kind==='state') {
      const a=cubic(p/(.18/.38)),b=1-(1-clamp((p-.12/.38)/(.26/.38)))**3;
      return {fromY:-18*a,fromOpacity:1-a,fromBlur:8*a,toY:18*(1-b),toOpacity:b,toBlur:8*(1-b),underline:0};
    }
    throw new Error('Unknown headline swap');
  }
  const typeElapsed=count=>(1-.96**count)/.04;
  function caretState(p,length) {
    p=clamp(p);let count=0;
    if(p>=.5)while(count<length&&typeElapsed(count+1)/typeElapsed(length)<=(p-.5)/.45+1e-10)count++;
    return {count,fromVisible:p<.36,coverVisible:p>=.2&&p<.5,
      expand:bezier((p-.2)/.16,.6,0,.8,.4),collapse:bezier((p-.36)/.14,.2,.7,.3,1),
      caretVisible:p>=.5&&p<1};
  }
  function markerState(p) {
    p=clamp(p);const pop=clamp((p-.525)/.4);
    return {draw:smooth(p/.75),scale:1+.045*(pop<.5?1-(1-pop*2)**2:1-(pop*2-1)**2)};
  }
  function fitPop(scale,box,width,height) {
    const [x,y,w,h]=box,ex=w*(scale-1)/2,ey=h*(scale-1)/2;
    return {x:Math.max(0,ex-x)+Math.min(0,width-x-w-ex),y:Math.max(0,ey-y)+Math.min(0,height-y-h-ey)};
  }
  function morphState(p) {
    p=clamp(p);
    return {fromOpacity:1-p,toOpacity:p,fromBlur:p===1?0:Math.min(8/(1-p)-8,100),
      toBlur:p===0?0:Math.min(8/p-8,100),threshold:p>0&&p<1};
  }
  function strikeState(p) {
    p=clamp(p);const replace=1-(1-clamp((p-4/9)/(5/9)))**3;
    return {draw:1-(1-clamp(p/(14/27)))**3,fromOpacity:1-replace,toOpacity:replace,fromY:-18*replace,toY:14*(1-replace)};
  }
  function flapState(p) {
    p=clamp(p);const angle=180*p*p;
    return {angle,front:p>0&&p<1&&angle<90,back:p>0&&p<1&&angle>=90,
      frontAngle:-angle,backAngle:180-angle,shade:1-.5*Math.sin(angle*Math.PI/180)};
  }
  const make=(tag,css,parent,text)=>{const n=document.createElement(tag);n.className=css;if(text!==undefined)n.textContent=text;parent.appendChild(n);return n;};
  function mountBatch(host,content,onsets) {
    const kind=content.swap,slot=make('div','headline-window headline-'+kind,host),mask=make('div','headline-mask',slot);
    slot.dataset.headlineSwap=kind;
    const layers=content.phrases.map(text=>{
      const layer=make('div','headline-layer',mask),ink=make('span','headline-ink',layer,text);
      ink.dataset.fit='true';layer.setAttribute('aria-label',text);
      const strike=kind==='strike'?make('i','headline-strike-rule',ink):null;
      return {layer,ink,text,strike};
    });
    const font=parseFloat(getComputedStyle(layers[0].ink).fontSize),height=Math.max(...layers.map(({ink})=>ink.offsetHeight));
    if(height+font*.12>slot.clientHeight)throw new Error('Headline exceeds approved type height');
    mask.style.height=height+font*.12+'px';
    // These dormant controls retain the same inspection contract as other swaps.
    const caret=make('i','headline-caret',mask),cover=make('i','headline-cover',mask);
    caret.style.opacity=cover.style.opacity='0';
    let filterId=null,leaves=[];
    if(kind==='morph') {
      const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),defs=document.createElementNS(ns,'defs');
      const filter=document.createElementNS(ns,'filter'),matrix=document.createElementNS(ns,'feColorMatrix');
      filterId='headline-morph-'+host.closest('[data-production-index]').dataset.productionIndex;
      svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');
      filter.id=filterId;matrix.setAttribute('in','SourceGraphic');matrix.setAttribute('type','matrix');
      matrix.setAttribute('values','1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 255 -100');
      filter.appendChild(matrix);defs.appendChild(filter);svg.appendChild(defs);host.appendChild(svg);
    }
    if(kind==='flap')leaves=['front','back'].map(side=>{
      const leaf=make('div','headline-flap-leaf headline-flap-'+side,mask);
      leaf.setAttribute('aria-hidden','true');const ink=make('span','headline-flap-copy',leaf);return {leaf,ink};
    });
    return time=>{
      let active=-1;onsets.forEach((at,i)=>{if(time>=at)active=i;});
      const p=active<0?0:window.ShortCreatorStory.progress(time,onsets[active]);
      slot.dataset.headlineIndex=String(active);slot.dataset.headlineProgress=String(p);mask.style.filter='none';
      layers.forEach(({layer,strike})=>{
        layer.style.visibility='hidden';layer.style.opacity='0';layer.style.transform='none';layer.style.filter='none';layer.style.clipPath='none';
        layer.setAttribute('aria-hidden','true');if(strike)strike.style.transform='scaleX(0)';
      });
      leaves.forEach(({leaf,ink})=>{leaf.style.visibility='hidden';leaf.style.transform='none';leaf.style.filter='none';ink.dataset.copy='';});
      if(active<0)return;
      const current=layers[active],previous=layers[active-1];
      const show=(entry,opacity,y=0,blur=0)=>{
        if(!entry)return;entry.layer.style.visibility=opacity?'visible':'hidden';entry.layer.style.opacity=String(opacity);
        entry.layer.setAttribute('aria-hidden',String(!opacity));entry.layer.style.transform=y?`translateY(${y}px)`:'none';
        entry.layer.style.filter=blur?`blur(${blur}px)`:'none';
      };
      if(kind==='morph') {
        const s=morphState(p);show(previous,s.fromOpacity,0,s.fromBlur);show(current,s.toOpacity,0,s.toBlur);
        if(s.threshold)mask.style.filter=`url(#${filterId})`;
      } else if(kind==='strike') {
        const s=strikeState(p);show(previous,s.fromOpacity,s.fromY);show(current,s.toOpacity,s.toY);
        if(previous)previous.strike.style.transform=`scaleX(${s.draw})`;
      } else {
        const s=flapState(p);show(current,p>0?1:0);show(previous,p<1?1:0);
        if(p>0&&p<1) {
          current.layer.style.clipPath='inset(0 0 50%)';if(previous)previous.layer.style.clipPath='inset(50% 0 0)';
          const values=[{visible:s.front&&Boolean(previous),text:previous?.text||'',angle:s.frontAngle},
            {visible:s.back,text:current.text,angle:s.backAngle}];
          leaves.forEach(({leaf,ink},i)=>{
            const state=values[i];if(!state.visible)return;
            leaf.style.visibility='visible';leaf.style.transform=`rotateX(${state.angle}deg)`;
            leaf.style.filter=`brightness(${s.shade})`;ink.dataset.copy=state.text;
          });
        }
      }
    };
  }
  function marker(node,record,onset) {
    const text=node.textContent,index=text.indexOf(record.text),shape=record.style==='rough-underline'?{view:'0 0 100 34',d:'M 0 16 H 100',width:5,opacity:1}:shapes[record.style];
    if(index<0||!shape)throw new Error('Invalid title marker');
    node.textContent='';node.setAttribute('aria-label',text);node.classList.add('marked-title');
    node.appendChild(document.createTextNode(text.slice(0,index)));
    const mark=make('span','title-marker',node);mark.dataset.markerStyle=record.style;
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
    svg.setAttribute('viewBox',shape.view);svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
    for(const [key,value] of Object.entries({d:shape.d,fill:'none','stroke-width':shape.width,'stroke-linecap':'round','stroke-linejoin':'round'}))path.setAttribute(key,String(value));
    svg.appendChild(path);mark.appendChild(svg);make('span','title-marker-text',mark,record.text);
    node.appendChild(document.createTextNode(text.slice(index+record.text.length)));
    if(record.style==='rough-underline') {
      const width=mark.offsetWidth;svg.setAttribute('viewBox',`0 0 ${width} 34`);
      path.setAttribute('d',window.ShortCreatorTitleDesigns.roughUnderline(width));
    }
    const updateNote=record.note?window.ShortCreatorTitleDesigns.note(node,mark,record.note):null;
    const length=path.getTotalLength();path.style.strokeDasharray=String(length);
    const parent=node.getBoundingClientRect(),bounds=mark.getBoundingClientRect(),ratio=parent.width/node.offsetWidth;
    const box=[(bounds.left-parent.left)/ratio,(bounds.top-parent.top)/ratio,bounds.width/ratio,bounds.height/ratio];
    return t=>{
      const p=window.ShortCreatorStory.progress(t,onset),s=updateNote?window.ShortCreatorTitleDesigns.noteState(p):markerState(p);
      const shift=fitPop(s.scale,box,node.offsetWidth,node.offsetHeight);
      mark.dataset.markerProgress=String(p);path.style.strokeDashoffset=String(length*(1-s.draw));
      path.style.opacity=t<=onset?'0':String(shape.opacity);
      mark.style.transform=s.scale===1?'none':`translate(${shift.x}px,${shift.y}px) scale(${s.scale})`;
      if(updateNote)updateNote(p);
    };
  }
  function mount(host,content,onsets) {
    if(content.swap==='slice-sweep')return window.ShortCreatorSliceSweep.mount(host,content,onsets);
    if(content.swap==='circle-match')return window.ShortCreatorHeadlinePanels.mountCircle(host,content,onsets);
    if(content.swap==='split-panel')return window.ShortCreatorHeadlinePanels.mount(host,content,onsets);
    if(['morph','strike','flap'].includes(content.swap))return mountBatch(host,content,onsets);
    if(!['line','state','caret'].includes(content.swap))throw new Error('Unknown headline swap');
    const slot=make('div','headline-window',host);slot.dataset.headlineSwap=content.swap;
    const mask=make('div','headline-mask',slot);
    const layers=content.phrases.map(text=>{
      const layer=make('div','headline-layer',mask),ink=make('span','headline-ink',layer,text);
      ink.dataset.fit='true';layer.setAttribute('aria-label',text);return {layer,ink,text};
    });
    const font=parseFloat(getComputedStyle(layers[0].ink).fontSize),height=Math.max(...layers.map(({ink})=>ink.offsetHeight));
    if(height+font*.12>slot.clientHeight)throw new Error('Headline exceeds approved type height');
    mask.style.height=height+font*.12+'px';
    const caret=make('i','headline-caret',mask),cover=make('i','headline-cover',mask),rule=make('i','headline-rule',slot);
    const segments=content.phrases.map(window.ShortCreatorType.graphemes);
    const metrics=layers.map(({ink,text},i)=>{
      if(content.swap!=='caret')return null;
      ink.style.whiteSpace='pre';ink.style.maxWidth='none';
      const width=ink.offsetWidth;
      if(width+font*.3>slot.clientWidth)throw new Error('Caret headline must fit one line at approved type size');
      const prefixes=segments[i].map((_,n)=>{ink.textContent=segments[i].slice(0,n+1).join('');return ink.offsetWidth;});
      ink.textContent=text;return {width,prefixes};
    });
    return t=>{
      let active=-1;onsets.forEach((onset,i)=>{if(t>=onset)active=i;});
      const p=active<0?0:window.ShortCreatorStory.progress(t,onsets[active]);
      slot.dataset.headlineIndex=String(active);slot.dataset.headlineProgress=String(p);
      caret.style.opacity='0';cover.style.opacity='0';rule.style.transform='scaleX(0)';
      layers.forEach(({layer,ink,text},i)=>{layer.style.visibility='hidden';layer.style.opacity='0';layer.style.transform='none';layer.style.filter='none';layer.setAttribute('aria-hidden','true');ink.textContent=text;ink.style.transform='none';});
      if(active<0)return;
      const current=layers[active],previous=layers[active-1];
      const show=(entry,opacity,y,blur,percent)=>{
        if(!entry)return;entry.layer.style.visibility=opacity?'visible':'hidden';entry.layer.style.opacity=String(opacity);
        entry.layer.style.transform=y?`translateY(${y}${percent?'%':'px'})`:'none';entry.layer.style.filter=blur?`blur(${blur}px)`:'none';
        entry.layer.setAttribute('aria-hidden',String(!opacity));
      };
      if(content.swap!=='caret') {
        const s=swapState(content.swap,p);show(previous,s.fromOpacity,s.fromY,s.fromBlur,content.swap==='line');
        show(current,s.toOpacity,s.toY,s.toBlur,content.swap==='line');rule.style.transform=`scaleX(${s.underline})`;
      } else {
        const s=caretState(p,segments[active].length),target=metrics[active],before=previous?metrics[active-1]:{width:0};
        const fromX=(slot.clientWidth-before.width)/2,toX=(slot.clientWidth-target.width)/2,cw=font*.08;
        show(previous,s.fromVisible?1:0,0,0,false);show(current,p>=.5?1:0,0,0,false);
        current.ink.textContent=segments[active].slice(0,s.count).join('');
        const typed=s.count?target.prefixes[s.count-1]:0,x=fromX+(toX-fromX)*s.count/segments[active].length;
        current.ink.style.transform=`translateX(${x-(slot.clientWidth-typed)/2}px)`;
        const expanded=cw+(Math.max(cw,before.width)-cw)*s.expand,width=expanded+(cw-expanded)*s.collapse;
        cover.style.opacity=s.coverVisible?'1':'0';cover.style.width=width+'px';cover.style.left=(fromX+Math.max(0,before.width-expanded))+'px';
        caret.style.opacity=s.caretVisible?'1':'0';caret.style.width=cw+'px';caret.style.left=(x+typed+font*.06)+'px';
        if(p===1)current.ink.style.transform='none';
      }
    };
  }
  window.ShortCreatorHeadlines={bezier,swapState,caretState,markerState,fitPop,morphState,strikeState,flapState,shapes,mount,marker};
})();
