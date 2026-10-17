/* HyperFrames ai-answer-rank, adapted under Apache-2.0.
   Four explicit cue phases; supplied rankings are illustrated, never inferred. */
(() => {
  'use strict';
  const clamp=p=>Math.max(0,Math.min(1,p)),phase=(t,a,b)=>clamp((t-a)/(b-a));
  const out=(p,n=4)=>1-(1-clamp(p))**n;
  const back=(p,s)=>{const q=clamp(p)-1;return p<=0?0:p>=1?1:1+(s+1)*q**3+s*q**2;};
  const gaps=Object.freeze([.05,.035,.06,.04,.03,.055,.045,.07,.035,.05,.04,.065]);
  function monogram(text) {
    const words=text.trim().split(/\s+/u),first=word=>[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(word)][0].segment;
    return (first(words[0])+(words.length>1?first(words.at(-1)):'')).toUpperCase();
  }
  function typing(text,progress) {
    if(typeof text!=='string'||!text||!Number.isFinite(progress))throw new Error('Invalid ranked prompt');
    const chars=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text)].map(p=>p.segment);
    let raw=0;for(let n=1;n<chars.length;n++)raw+=gaps[n%gaps.length];
    const squeeze=Math.min(1,1.8/Math.max(raw,.001)),t=clamp(progress)*3;
    let at=.8,count=0;for(let n=1;n<=chars.length;n++){if(t>=at)count=n;at+=gaps[n%gaps.length]*squeeze;}
    return {text:chars.slice(0,count).join(''),count,end:at,caret:t>=.65&&t<at+.2,
      card:out(phase(t,.1,.7)),bubble:back(phase(t,.5,.8),1.6)};
  }
  function leadState(lead,progress) {
    if(typeof lead!=='string'||!lead||!Number.isFinite(progress))throw new Error('Invalid ranked lead');
    const words=lead.match(/\S+\s*/gu)||[],t=clamp(progress)*(1.2+words.length*.07);
    const dot=i=>{let y=0;for(let b=0;b<2;b++){
      const at=.1+b*.32+i*.08;
      if(t>=at&&t<at+.14)y=-9*Math.sin(Math.PI/2*phase(t,at,at+.14));
      else if(t>=at+.14&&t<at+.28)y=-9*Math.cos(Math.PI/2*phase(t,at+.14,at+.28));
    }return y;};
    return {words:words.map((_,i)=>t>=.97+i*.07),dots:[0,1,2].map(dot),
      thinking:phase(t,0,.15)*(1-phase(t,.73,.85)),star:back(phase(t,.85,1.3),2)};
  }
  function rowState(progress,index) {
    if(!Number.isFinite(progress)||!Number.isInteger(index)||index<0||index>2)throw new Error('Invalid ranked row');
    const t=clamp(progress)*.77;
    return {rank:phase(t,index*.16,index*.16+.3),entry:out(phase(t,index*.16,index*.16+.45))};
  }
  function insertion(progress,slot) {
    if(!Number.isFinite(progress)||!Number.isInteger(slot)||slot<0||slot>2)throw new Error('Invalid rank insertion');
    const t=clamp(progress)*1.44,p=phase(t,0,.55),shift=p<.5?8*p**4:1-(-2*p+2)**4/2;
    return {shift,incoming:out(phase(t,.34,.89)),last:1-phase(t,.1,.5)**2,
      highlight:out(phase(t,.9,1.2),2),check:back(phase(t,.95,1.37),2.2),draw:out(phase(t,1.1,1.44),3),
      order:[0,1,2].map((_,i)=>i<slot?i:i===slot?3:i-1)};
  }
  function layout(W,H) {
    if(![W,H].every(Number.isFinite)||W<900||H<490)throw new Error('Ranked answer needs a native interface board');
    const slot=Math.min(144,(H-158-24-32)/3);
    return {slot,row:slot-12,listHeight:slot*3+32};
  }
  function shape(tag,attributes,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));parent.appendChild(node);return node;
  }
  function mount(host,c,onsets,make) {
    make('h2','prod-heading',c.heading,host,true);make('p','interface-source',c.source,host,true);
    const board=make('div','interface-board answer-board',null,host);board.dataset.interfaceStyle='steps';
    const prompt=make('div','answer-prompt',null,board),sizer=make('span','answer-prompt-sizer',c.prompt,prompt);
    sizer.setAttribute('aria-hidden','true');const ink=make('span','answer-typing',null,prompt);
    const typed=make('span','answer-typed','',ink),caret=make('i','answer-caret',null,ink);
    const lead=make('div','answer-lead',null,board),star=shape('svg',{viewBox:'0 0 24 24',class:'answer-star','aria-hidden':'true'},lead);
    shape('path',{d:'M12 0 C12.9 7 17 11.1 24 12 C17 12.9 12.9 17 12 24 C11.1 17 7 12.9 0 12 C7 11.1 11.1 7 12 0 Z',fill:'white'},star);
    const copy=make('span','answer-lead-copy',null,lead,true),words=(c.lead.match(/\S+\s*/gu)||[]).map(word=>make('span','',word,copy));
    const thinking=make('div','answer-thinking',null,board),dots=[0,1,2].map(()=>make('i','',null,thinking));
    const list=make('div','answer-list',null,board),geometry=layout(board.clientWidth,board.clientHeight);
    list.style.height=geometry.listHeight+'px';
    const ranks=[0,1,2].map(i=>{const n=make('div','answer-number',String(i+1),list);n.style.top=i*geometry.slot+'px';n.style.height=geometry.row+'px';return n;});
    const rows=c.items.map((item,i)=>{
      const row=make('div','answer-pick',null,list);row.dataset.answerIndex=String(i);
      row.style.top=(i===3?c.rank-1:i)*geometry.slot+'px';row.style.height=geometry.row+'px';
      const tile=make('div','answer-tile',null,row);make('span','',monogram(item.label),tile);
      const meta=make('div','answer-meta',null,row);make('h3','answer-name',item.label,meta,true);make('p','answer-detail',item.body,meta,true);
      return {row,tile,meta};
    });
    const incoming=rows[3].row,highlight=make('div','answer-highlight',null,incoming);
    const check=shape('svg',{viewBox:'0 0 56 56',class:'answer-check','aria-hidden':'true'},incoming);
    shape('circle',{cx:28,cy:28,r:28,fill:'var(--lime)'},check);
    const path=shape('path',{d:'M17 29 L24.5 36.5 L39 21',fill:'none',stroke:'var(--purple)','stroke-width':5,'stroke-linecap':'round','stroke-linejoin':'round'},check);
    const length=path.getTotalLength();if(!Number.isFinite(length)||length<=0)throw new Error('Cannot measure insertion check');path.style.strokeDasharray=String(length);
    return time=>{
      const p=onsets.map(onset=>window.ShortCreatorStory.progress(time,onset)),text=typing(c.prompt,p[0]),leadPose=leadState(c.lead,p[1]);
      const moved=insertion(p[3],c.rank-1),entries=[0,1,2].map(i=>rowState(p[2],i));
      board.style.opacity=String(text.card);board.style.transform=`translateY(${40*(1-text.card)}px)`;
      prompt.style.opacity=String(phase(p[0]*3,.5,.8));prompt.style.transform=`scale(${.9+.1*text.bubble})`;
      typed.textContent=text.text;caret.style.visibility=text.caret?'visible':'hidden';
      thinking.style.opacity=String(leadPose.thinking);dots.forEach((dot,i)=>dot.style.transform=`translateY(${leadPose.dots[i]}px)`);
      star.style.opacity=String(clamp(leadPose.star));star.style.transform=`scale(${.3+.7*leadPose.star}) rotate(${-90*(1-leadPose.star)}deg)`;
      words.forEach((word,i)=>word.style.opacity=leadPose.words[i]?'1':'0');
      rows.forEach(({row,tile,meta},i)=>{
        const alpha=i===3?moved.incoming:entries[i].entry*(i===2?moved.last:1);
        const x=i===3?96*(1-moved.incoming):0,y=i===3?0:24*(1-entries[i].entry)+(i>=c.rank-1?geometry.slot*moved.shift:0);
        row.style.opacity=String(alpha);row.style.visibility=alpha>0?'visible':'hidden';row.style.transform=`translate(${x}px,${y}px)`;
        meta.style.visibility=alpha>0&&(i===3||i*geometry.slot+y+geometry.row<=geometry.listHeight)?'visible':'hidden';
        const accented=i===3&&moved.highlight>0;
        tile.style.background=accented?'var(--lime)':'var(--line)';tile.style.color=accented?'var(--purple)':'white';
        if(i<3)ranks[i].style.opacity=String(entries[i].rank);
      });
      highlight.style.opacity=String(moved.highlight);check.style.opacity=String(clamp(moved.check));check.style.transform=`scale(${.4+.6*moved.check})`;
      path.style.strokeDashoffset=String(length*(1-moved.draw));
      board.dataset.answerState=JSON.stringify({p,text,lead:leadPose,entries,insertion:moved,geometry,length});
    };
  }
  window.ShortCreatorAnswerRank={monogram,typing,leadState,rowState,insertion,layout,mount};
})();
