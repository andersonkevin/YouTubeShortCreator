/* HyperFrames chatgpt-exchange, claude-exchange and message-thread-reveal,
   adapted under Apache-2.0. Supplied conversations are illustrations, not live tools. */
(() => {
  'use strict';
  const variants=Object.freeze(['answer-stream','research-stream','message-thread']);
  const clamp=x=>Math.max(0,Math.min(1,x)),phase=(t,a,b)=>clamp((t-a)/(b-a));
  const out=(p,n=3)=>1-(1-clamp(p))**n;
  const inOut=p=>{p=clamp(p);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  const graphemes=text=>[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text)].map(s=>s.segment);
  const words=text=>text.match(/\s*\S+\s*/gu)||[];
  // The authored irregular send rhythm from message-thread-reveal's first input.
  const threadTimes=Object.freeze([0,.0667,.1334,.2,.2667,.3667,.4,.4667,.5334,.5667,.7667]);
  function typed(text,seconds,thread=false) {
    const chars=graphemes(text);let total=0;
    const times=chars.map((char,i)=>{
      if(thread)return chars.length===1?0:threadTimes[Math.floor(i*(threadTimes.length-1)/(chars.length-1))];
      const time=total;total+=char===' '?.16:.05;return time;
    });
    const end=thread?.7667:Math.max(.05,total),duration=thread?1.45:1.32;
    const count=times.filter(t=>seconds>=.08+t/end*duration).length;
    return {text:chars.slice(0,count).join(''),count,caret:seconds>=0&&seconds<1.55};
  }
  function stream(text,seconds,research=false) {
    const tokens=words(text),step=Math.min(research?.04:.15,1.55/Math.max(1,tokens.length-1));
    return {tokens,times:tokens.map((_,i)=>.12+i*step),
      alpha:tokens.map((_,i)=>phase(seconds,.12+i*step,.12+i*step+(research?.08:.1)))};
  }
  function activity(seconds) {
    const collapse=inOut(phase(seconds,1.41,1.71)),summary=out(phase(seconds,1.53,1.79));
    const alpha=1-phase(seconds,1.35,1.51),cycle=Math.floor(Math.max(0,seconds)/.5),p=phase(seconds,cycle*.5,(cycle+1)*.5);
    return {rows:[out(phase(seconds,0,.26)),out(phase(seconds,.5,.76))].map(x=>x*(1-collapse)),
      alpha,summary,spin:seconds<1.51?15*(cycle+(p<.5?2*p*p:1-(-2*p+2)**2/2)):0,
      scale:seconds<1.51?(cycle%2?.78+.22*(1-Math.cos(Math.PI*p))/2:1-.22*(1-Math.cos(Math.PI*p))/2):1};
  }
  function plan(content) {
    const entries=[];
    content.items.forEach((item,index)=>{
      entries.push({type:'message',item,index});
      if(content.variant==='research-stream'&&index===0)entries.push({type:'activity'});
    });
    if(content.variant==='answer-stream')content.table.rows.forEach((cells,index)=>entries.push({type:'table',cells,index}));
    return entries;
  }
  function elapsed(time,onsets) {
    const frame=Math.floor(time*30+1e-7);
    return onsets.map(onset=>(frame-Math.ceil(onset*30))/30);
  }
  function pose(entry,seconds,variant) {
    const t=Math.max(-1,Math.min(2,seconds)),thread=variant==='message-thread';
    if(entry.type==='activity')return {height:1,alpha:t<0?0:1,flight:1,scale:1,activity:activity(t)};
    if(entry.type==='table')return {height:out(phase(t,0,.22)),alpha:phase(t,0,.14),flight:1,scale:1};
    const sent=entry.item.side==='sent';
    if(sent) {
      const flight=out(phase(t,1.58,1.92),4);
      return {height:thread?(t>=1.58?1:0):flight,alpha:phase(t,1.58,thread?1.6467:1.92),flight,
        scale:thread?1:.94+.06*flight,typed:typed(entry.item.body,t,thread)};
    }
    if(thread){const pop=out(phase(t,1.4,1.52));return {height:t>=1.4?1:0,
      alpha:t<1.4?0:.6+.4*pop,scale:.75+.25*pop,flight:1,dots:t>=0&&t<1.4};}
    return {height:out(phase(t,0,.16)),alpha:phase(t,0,.1),scale:1,flight:1,
      stream:stream(entry.item.body,t,variant==='research-stream')};
  }
  function layout(heights,poses,viewHeight) {
    if(!Number.isFinite(viewHeight)||viewHeight<=0||heights.some(h=>!Number.isFinite(h)||h<=0))throw new Error('Invalid conversation geometry');
    let bottom=0;
    const tops=heights.map((height,i)=>{const top=bottom;bottom+=(height+16)*poses[i].height;return top;});
    return {tops,scroll:Math.max(0,bottom-16-viewHeight),bottom};
  }
  function growingHeight(full,base,lineEnds,times,seconds) {
    let height=base*out(phase(seconds,0,.16)),previous=0;
    lineEnds.forEach((end,i)=>{
      if(end>previous){height+=(end-previous)*out(phase(seconds,times[i],times[i]+.16));previous=end;}
    });
    return Math.min(full,height);
  }
  function mount(host,c,onsets,make,data) {
    make('h2','prod-heading',c.heading,host,true);make('p','interface-source',c.source,host,true);
    const board=make('div','interface-board exchange-board',null,host);board.dataset.interfaceStyle='chat';board.dataset.exchangeVariant=c.variant;
    const view=make('div','exchange-view',null,board),rail=make('div','exchange-rail',null,view);
    const composer=make('div','exchange-composer',null,board),input=make('div','exchange-input',null,composer);
    const ink=make('span','exchange-typed','',input),caret=make('i','exchange-caret',null,input);
    const send=make('i','exchange-send',null,composer);send.setAttribute('aria-hidden','true');
    const dots=make('div','exchange-dots',null,view);[0,1,2].forEach(()=>make('i','',null,dots));
    const entries=plan(c),nodes=entries.map((entry,i)=>{
      const box=make('div','exchange-entry',null,rail);box.dataset.exchangeIndex=String(i);box.dataset.exchangeType=entry.type;
      let copy=null,tokens=[],lines=[],base=0,rows=[],summary=null,spinner=null;
      if(entry.type==='message'){
        box.dataset.side=entry.item.side;
        make('h3','exchange-label',entry.item.label,box,true);
        if(entry.item.image){const image=make('img','exchange-image',null,box);image.src=data.assets[entry.item.image];image.alt=entry.item.label;}
        copy=make('p','exchange-body',null,box);
        tokens=words(entry.item.body).map(word=>make('span','exchange-word',word,copy));
      } else if(entry.type==='table') {
        box.classList.add('exchange-table');
        if(entry.index===0){const header=make('div','exchange-table-header',null,box);c.table.headers.forEach(text=>make('b','',text,header,true));}
        const row=make('div','exchange-table-row',null,box);
        entry.cells.forEach(text=>{const cell=make('p','exchange-cell',null,row);words(text).forEach(word=>tokens.push(make('span','exchange-word',word,cell)));});
      } else {
        box.classList.add('exchange-activity');
        rows=c.activity.steps.map(text=>make('div','exchange-activity-row',text,box,true));
        summary=make('div','exchange-summary',c.activity.summary,box,true);
        spinner=make('i','exchange-spinner',null,box);
      }
      const height=box.offsetHeight;
      if(height>view.clientHeight)throw new Error('Conversation entry exceeds its native viewport');
      if(copy){
        const r=copy.getBoundingClientRect();
        lines=tokens.map(token=>Math.min(copy.offsetHeight,40*Math.ceil(Math.max(...[...token.getClientRects()].map(rect=>rect.bottom-r.top))/40)));
        base=height-copy.offsetHeight;
      }
      box.style.height=height+'px';
      return {box,copy,tokens,lines,base,height,rows,summary,spinner,guarded:[...box.querySelectorAll('[data-fit]')]};
    });
    return time=>{
      const times=elapsed(time,onsets),poses=entries.map((entry,i)=>pose(entry,times[i],c.variant));
      const heights=nodes.map(n=>n.height);
      poses.forEach((p,i)=>{
        if(p.stream)p.height=growingHeight(heights[i],nodes[i].base,nodes[i].lines,p.stream.times,times[i])/heights[i];
        if(entries[i].type==='activity'){
          const a=p.activity;
          heights[i]=72;
          p.height=times[i]<0?0:Math.max(a.summary,2-a.summary)*Math.max(a.rows[0],a.summary);
        }
      });
      const geometry=layout(heights,poses,view.clientHeight);rail.style.transform=`translateY(${-geometry.scroll}px)`;
      const viewport=view.getBoundingClientRect();
      let activeInput=-1,showDots=false;
      nodes.forEach((node,i)=>{
        const p=poses[i],entry=entries[i],t=Math.min(2,times[i]);
        node.box.style.top=geometry.tops[i]+'px';node.box.style.height=heights[i]*p.height+'px';
        node.box.style.opacity=String(p.alpha);node.box.style.visibility=p.alpha>0?'visible':'hidden';
        const dy=entry.type==='message'&&entry.item.side==='sent'&&c.variant!=='message-thread'?
          Math.max(0,view.clientHeight-(geometry.tops[i]-geometry.scroll+node.height))*(1-p.flight):0;
        node.box.style.transform=`translateY(${dy}px) scale(${p.scale})`;
        if(p.stream)node.tokens.forEach((word,j)=>word.style.opacity=String(p.stream.alpha[j]));
        if(entry.type==='table')node.tokens.forEach((word,j)=>word.style.opacity=String(phase(t,.08+j*.028,.17+j*.028)));
        if(entry.type==='activity'){
          node.rows.forEach((row,j)=>{row.style.opacity=String(p.activity.rows[j]*p.activity.alpha);row.style.transform=`translateY(${12*(1-p.activity.rows[j])}px)`;});
          node.summary.style.opacity=String(p.activity.summary);
          node.spinner.style.opacity=times[i]<0?'0':String(p.activity.alpha);
          node.spinner.style.transform=`rotate(${p.activity.spin}deg) scale(${p.activity.scale})`;
        }
        if(p.typed&&t>=0&&t<1.58)activeInput=i;
        if(p.dots)showDots=true;
        node.guarded.forEach(part=>{
          const r=part.getBoundingClientRect();
          part.style.visibility=r.top>=viewport.top&&r.bottom<=viewport.bottom?'visible':'hidden';
        });
      });
      const typing=activeInput>=0?poses[activeInput].typed:null;
      ink.textContent=typing?.text||'';caret.style.visibility=typing?.caret?'visible':'hidden';
      send.style.opacity=typing?'1':'0';
      // Measure the actual prefix with the approved face; keep the caret clear of Send.
      const shift=Math.max(0,ink.offsetWidth+12-input.clientWidth);
      ink.style.transform=`translateX(${-shift}px)`;caret.style.left=(ink.offsetWidth-shift+3)+'px';
      dots.style.opacity=showDots?'1':'0';
      board.dataset.exchangeState=JSON.stringify({times,poses,heights,geometry,activeInput,shift,showDots});
    };
  }
  window.ShortCreatorChatExchange={variants,graphemes,words,typed,stream,activity,plan,elapsed,pose,layout,growingHeight,mount};
})();
