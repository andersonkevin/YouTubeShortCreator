/* Bounded adapters for HyperFrames message, terminal, stepper, settings and
   notification primitives. Supplied text is displayed, never executed. */
(() => {
  'use strict';
  const kinds=Object.freeze(['chat','terminal','steps','settings','notifications','notes','feedback','social']);
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>1-(1-clamp(x))**4;
  function activeAt(time,onsets) {let active=-1;onsets.forEach((t,i)=>{if(Math.floor(time*30+1e-7)>=Math.ceil(t*30))active=i;});return active;}
  function typingAt(time,onsets,items) {
    const frame=Math.floor(time*30+1e-7);
    for(let index=0;index<items.length;index++) {
      const end=Math.ceil(onsets[index]*30),begin=index?Math.ceil(onsets[index-1]*30)+24:Math.max(0,end-12);
      if(items[index].side!=='received'||frame<begin||frame>=end)continue;
      const elapsed=frame-begin,p=clamp(elapsed/3),q=1-(1-p)**3;
      return {index,opacity:.4+.6*q,scale:.6+.4*q,dots:[0,1,2].map(i=>{
        const phase=elapsed-3-i*4;if(phase<0||phase>=48)return 0;
        return -3*(1-Math.cos(2*Math.PI*(phase%16)/16));
      })};
    }
    return {index:-1,opacity:0,scale:1,dots:[0,0,0]};
  }
  function notificationY(index,active,progress,rowHeight,gap) {
    if(active<index)return -rowHeight;
    if(active===index)return progress>=1?0:-rowHeight*(1-ease(progress));
    return (active-1-index+ease(progress))*(rowHeight+gap);
  }
  function typed(text,progress) {
    const chars=Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),part=>part.segment);
    return chars.slice(0,Math.floor(clamp(progress)*chars.length)).join('');
  }
  function mount(host,content,onsets,make,reveal,data) {
    if(!kinds.includes(content.style))throw new Error('Unknown interface composition');
    if(content.variant==='app-install')return window.ShortCreatorAppInstall.mount(host,content,onsets,data,make);
    if(content.variant==='product-canvas')return window.ShortCreatorProductCanvas.mount(host,content,onsets,make);
    if(content.variant==='text-select')return window.ShortCreatorCursorScenes.mountText(host,content,onsets,make);
    if(content.variant==='answer-rank')return window.ShortCreatorAnswerRank.mount(host,content,onsets,make);
    if(content.variant==='note-scroll')return window.ShortCreatorNoteScroll.mount(host,content,onsets,make);
    if(window.ShortCreatorChatExchange?.variants.includes(content.variant))return window.ShortCreatorChatExchange.mount(host,content,onsets,make,data);
    if(window.ShortCreatorEditorScenes?.variants.includes(content.variant))return window.ShortCreatorEditorScenes.mount(host,content,onsets,make);
    if(window.ShortCreatorUIPrimitives?.variants.includes(content.variant))return window.ShortCreatorUIPrimitives.mount(host,content,onsets,make);
    if(content.style==='social'||content.variant==='peek-stack')return window.ShortCreatorInterfaceSocial.mount(host,content,onsets,make);
    if(window.ShortCreatorInterfaceMotion?.variants.includes(content.variant))return window.ShortCreatorInterfaceMotion.mount(host,content,onsets,make);
    if(content.variant||['notes','feedback'].includes(content.style))return window.ShortCreatorInterfacePresets.mount(host,content,onsets,make);
    make('h2','prod-heading',content.heading,host,true);
    const board=make('div','interface-board interface-'+content.style,null,host);
    make('p','interface-source',content.source,host,true);
    board.dataset.interfaceStyle=content.style;
    let rail;
    if(content.style==='steps')rail=make('div','interface-step-rail',null,board);
    const gap=16,rowHeight=(board.clientHeight-gap*(content.items.length-1))/content.items.length;
    const rows=content.items.map((item,index)=>{
      const row=make('div','interface-row',null,board);row.dataset.interfaceIndex=String(index);
      row.style.height=rowHeight+'px';row.style.top=index*(rowHeight+gap)+'px';
      const label=make('h3','interface-label',item.label,row,true),body=make('p','interface-body',item.body,row,true);
      let control=null;
      if(content.style==='settings') {
        row.dataset.enabled=String(item.enabled);control=make('i','interface-toggle',null,row);
        control.setAttribute('aria-label',item.enabled?'Enabled':'Disabled');make('b','interface-thumb',null,control);
      } else if(content.style==='chat') {
        row.dataset.side=item.side;row.style.transformOrigin=item.side==='sent'?'right bottom':'left bottom';
      } else if(content.style==='steps') {
        control=make('span','interface-step',String(index+1),rail);
        row.style.top='94px';row.style.height=(board.clientHeight-94)+'px';
      } else if(content.style==='terminal')control=make('i','interface-caret',null,label);
      return {row,label,body,control,item,index};
    });
    const indicator=content.typing_indicator?make('div','interface-typing',null,board):null;
    const dots=indicator?[0,1,2].map(()=>make('i','',null,indicator)):[];
    if(indicator)indicator.setAttribute('aria-label','Typing indicator in the illustrated conversation');
    return time=>{
      const active=activeAt(time,onsets),current=active>=0?window.ShortCreatorStory.progress(time,onsets[active]):0;
      board.dataset.interfaceActive=String(active);
      if(indicator){const s=typingAt(time,onsets,content.items);
        indicator.style.visibility=s.index<0?'hidden':'visible';indicator.style.opacity=String(s.opacity);
        indicator.style.top=(Math.max(0,s.index)*(rowHeight+gap)+12)+'px';indicator.style.transform=`scale(${s.scale})`;
        dots.forEach((dot,i)=>{dot.style.transform=s.dots[i]===0?'none':`translateY(${s.dots[i]}px)`;});
        board.dataset.typingState=JSON.stringify(s);}
      for(const {row,label,body,control,item,index} of rows) {
        const p=window.ShortCreatorStory.progress(time,onsets[index]),q=ease(p);
        row.dataset.interfaceProgress=String(p);row.style.visibility=p>0?'visible':'hidden';
        row.style.opacity=String(q);row.style.transform='none';
        if(content.style==='chat') {
          const pop=ease(p/.15);row.style.transform=`scale(${.75+.25*pop})`;row.style.opacity=p>0?String(.6+.4*pop):'0';
        } else if(content.style==='terminal') {
          label.textContent='$ '+typed(item.label,p/.55);label.appendChild(control);
          control.style.visibility=p>0&&p<.55?'visible':'hidden';
          body.style.opacity=String(clamp((p-.55)/.45));
        } else if(content.style==='steps') {
          row.style.visibility=index===active?'visible':'hidden';
          row.style.transform=`translateY(${24*(1-q)}px)`;
          control.dataset.state=index<active?'done':index===active?'active':'pending';
        } else if(content.style==='notifications') {
          row.style.top='0';row.style.transform=`translateY(${notificationY(index,active,current,rowHeight,gap)}px)`;
        } else {
          row.style.transform=`translateY(${20*(1-q)}px)`;control.style.transform=`scale(${.8+.2*q})`;
        }
      }
    };
  }
  window.ShortCreatorInterface={kinds,activeAt,notificationY,typed,typingAt,mount};
})();
