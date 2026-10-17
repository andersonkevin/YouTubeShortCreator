/* HyperFrames vector-editor-rig and sticky-mock-swap, adapted under Apache-2.0.
   Illustrated interfaces use explicit copy, approved fonts and native cue frames. */
(() => {
  'use strict';
  const variants=Object.freeze(['vector-editor','sticky-mock']);
  const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,p)=>a+(b-a)*p,cubic=x=>1-(1-clamp(x))**3;
  const path='M 140 350 C 165 235 235 150 320 145 C 415 140 520 195 565 285 C 600 360 535 415 445 425 C 350 440 260 430 210 405 C 175 390 150 370 140 350 Z';
  const anchors=Object.freeze([[140,350],[320,145],[565,285],[445,425],[210,405]]);
  const handles=Object.freeze([null,[[235,150],[405,138]],[[520,195],[600,360]],[[535,415],[350,440]],null]);
  function vectorState(progress) {
    if(!Number.isFinite(progress))throw new Error('Invalid vector progress');
    const p=clamp(progress),t=p*1.2,selection=cubic((t-.82)/.23);
    return {p,entry:cubic(t/.28),draw:clamp((t-.1)/.95),selection,fill:.08*selection,
      nodes:[.25,.48,.7,.9,1.05].map(at=>cubic((t-at+.16)/.16))};
  }
  function captionArc(progress,exiting=false) {
    if(!Number.isFinite(progress))throw new Error('Invalid pinned caption progress');
    const p=clamp(progress),split=exiting?.32:.72,first=p<=split;
    const q=first?p/split:(p-split)/(1-split),e=exiting?q**3:cubic(q);
    if(exiting)return {x:first?mix(0,.42,e):mix(.42,-1.1,e),y:first?mix(0,-.9,e):mix(-.9,-4.5,e),opacity:first?1:1-e};
    return {x:first?mix(-1.2,.45,e):mix(.45,0,e),y:first?mix(3.6,-.28,e):mix(-.28,0,e),opacity:first?e:1};
  }
  function stickyState(time,onsets,index) {
    if(!Number.isFinite(time)||!Array.isArray(onsets)||!onsets.every(Number.isFinite)||
       !Number.isInteger(index)||index<0||index>=onsets.length)throw new Error('Invalid pinned scene clock');
    const frame=Math.floor(time*30+1e-7),start=Math.ceil(onsets[index]*30),next=index+1<onsets.length?Math.ceil(onsets[index+1]*30):null;
    const p=clamp((frame-start)/24),exit=next===null?0:clamp((frame-(next-24))/24);
    const swap=cubic(p*.38/.28),out=next===null?0:clamp((frame-next)/24*.38/.28)**3;
    return {p,visible:frame>=start&&out<1,copy:exit>0?captionArc(exit,true):captionArc(p),
      exit,mockOpacity:(index===0?1:swap)*(1-out),layout:index%3};
  }
  function shape(tag,attributes,parent) {
    const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attributes))el.setAttribute(key,String(value));parent.appendChild(el);return el;
  }
  function vectorRow(row,item,make) {
    const top=make('div','vector-top',null,row),label=make('h3','interface-label',item.label,top,true);
    make('p','interface-body',item.body,row,true);
    const tools=make('div','vector-tools',null,row);
    for(const name of ['pen','shape','type']) {
      const icon=make('div','vector-tool',null,tools);icon.dataset.active=String(item.tool===name);icon.setAttribute('aria-label',name);
      const svg=shape('svg',{viewBox:'0 0 24 24','aria-hidden':'true'},icon);
      const props={fill:'none',stroke:'currentColor','stroke-width':1.8};
      if(name==='pen')shape('path',{...props,d:'M4 20l4.3-1.1L19 8.2 15.8 5 5.1 15.7 4 20Z M13.8 7l3.2 3.2 M5.1 15.7l3.2 3.2'},svg);
      else if(name==='shape'){shape('rect',{...props,x:4.5,y:4.5,width:15,height:15,rx:2},svg);shape('circle',{...props,cx:12,cy:12,r:3.5},svg);}
      else shape('path',{...props,d:'M5 6h14 M12 6v13 M8.5 19h7'},svg);
    }
    const viewport=make('div','vector-artboard',null,row),svg=shape('svg',{viewBox:'0 0 720 500',class:'vector-rig','aria-label':'Illustrated vector path'},viewport);
    const stroke=shape('path',{d:path,fill:'var(--lime)',stroke:'var(--lime)','stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round'},svg);
    const selection=shape('g',{class:'vector-selection'},svg);
    shape('rect',{x:105,y:100,width:500,height:370,rx:4,fill:'none',stroke:'var(--lime)','stroke-width':1.5},selection);
    for(const [x,y] of [[99,94],[599,94],[599,464],[99,464]])shape('rect',{x,y,width:12,height:12,rx:1,fill:'var(--surface)',stroke:'var(--lime)','stroke-width':2},selection);
    const nodes=anchors.map(([x,y],i)=>{
      const g=shape('g',{'data-vector-anchor':i},svg);
      if(handles[i]) {
        const [[x1,y1],[x2,y2]]=handles[i];shape('line',{x1,y1,x2,y2,stroke:'var(--cyan)','stroke-width':1.5},g);
        for(const [hx,hy] of handles[i])shape('rect',{x:hx-6,y:hy-6,width:12,height:12,transform:`rotate(45 ${hx} ${hy})`,fill:'var(--surface)',stroke:'var(--lime)','stroke-width':2},g);
      }
      shape('circle',{cx:x,cy:y,r:12,fill:'var(--lime)','fill-opacity':.12,stroke:'var(--lime)','stroke-opacity':.55,'stroke-width':1.5},g);
      shape('circle',{cx:x,cy:y,r:6,fill:'white',stroke:'var(--lime)','stroke-width':3},g);return g;
    });
    const inspector=make('div','vector-inspector',null,row);
    for(const [key,value] of [['Layer','Path'],['Fill','8%'],['Stroke','4'],['Nodes','5']]) {
      const entry=make('div','vector-property',null,inspector);make('span','',key,entry,true);make('b','',value,entry,true);
    }
    const length=stroke.getTotalLength();if(!Number.isFinite(length)||length<=0)throw new Error('Cannot measure vector rig');
    stroke.style.strokeDasharray=String(length);
    return s=>{
      row.style.opacity=String(s.entry);row.style.transform=`translateY(${1.8*(1-s.entry)}%)`;
      stroke.style.strokeDashoffset=String(length*(1-s.draw));stroke.style.fillOpacity=String(s.fill);selection.style.opacity=String(s.selection);
      nodes.forEach((node,i)=>{const [x,y]=anchors[i];node.style.opacity=String(s.nodes[i]);node.setAttribute('transform',`translate(${x} ${y}) scale(${s.nodes[i]}) translate(${-x} ${-y})`);});
      row.dataset.vectorState=JSON.stringify({...s,length,tool:item.tool,label:label.textContent});
    };
  }
  function stickyRow(row,item,index,make) {
    const mock=make('div','pinned-mock',null,row);mock.setAttribute('aria-hidden','true');mock.dataset.layout=String(index%3);
    const toolbar=make('div','pinned-toolbar',null,mock),dots=make('span','',null,toolbar);
    for(let i=0;i<3;i++)make('i','',null,dots);make('b','',null,toolbar);
    const window=make('div','pinned-window',null,mock),sidebar=make('div','pinned-sidebar',null,window);
    for(let i=0;i<4;i++)make('i','',null,sidebar);
    const main=make('div','pinned-main',null,window);make('i','pinned-title',null,main);make('i','pinned-subtitle',null,main);
    const blocks=make('div','pinned-blocks',null,main);for(let i=0;i<4;i++)make('i','',null,blocks);
    const copy=make('div','pinned-copy',null,row);
    make('h3','interface-label',item.label,copy,true);make('p','interface-body',item.body,copy,true);
    return s=>{
      mock.style.opacity=String(s.mockOpacity);copy.style.opacity=String(s.copy.opacity);
      copy.style.transform=`translate(${s.copy.x*row.clientWidth/100}px,${s.copy.y*row.clientHeight/100}px)`;
      row.dataset.stickyState=JSON.stringify(s);
    };
  }
  function mount(host,c,onsets,make) {
    if(!variants.includes(c.variant))throw new Error('Unknown editor composition');
    make('h2','prod-heading',c.heading,host,true);make('p','interface-source',c.source,host,true);
    const board=make('div','interface-board interface-steps interface-editor',null,host);board.dataset.interfaceStyle='steps';board.dataset.editorVariant=c.variant;
    const rows=c.items.map((item,i)=>{
      const row=make('div','interface-row',null,board);row.dataset.interfaceIndex=String(i);
      return {row,update:c.variant==='vector-editor'?vectorRow(row,item,make):stickyRow(row,item,i,make)};
    });
    return time=>{
      const active=window.ShortCreatorInterface.activeAt(time,onsets),states=[];
      rows.forEach(({row,update},i)=>{
        const p=window.ShortCreatorStory.progress(time,onsets[i]),s=c.variant==='vector-editor'?vectorState(p):stickyState(time,onsets,i);
        row.dataset.interfaceProgress=String(p);row.style.visibility=(c.variant==='vector-editor'?active===i:s.visible)?'visible':'hidden';
        update(s);states.push(s);
      });
      board.dataset.interfaceActive=String(active);board.dataset.interfacePresentation=JSON.stringify({variant:c.variant,active,rows:states});
    };
  }
  window.ShortCreatorEditorScenes={variants,path,anchors,handles,vectorState,captionArc,stickyState,mount};
})();
