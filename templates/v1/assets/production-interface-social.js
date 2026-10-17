/* Apache-2.0 source adaptations: Reddit/X cards, comment typing, follow actions
   and the Slack notification stack. Platform marks, claims and callbacks are
   excluded. Action text is supplied explicitly; no live action is performed. */
(() => {
  'use strict';
  const variants=Object.freeze(['post','discussion','comment','follow','peek-stack']);
  const clamp=p=>Math.max(0,Math.min(1,p));
  const out=(p,n=3)=>1-(1-clamp(p))**n;
  const mix=(a,b,p)=>a+(b-a)*p;
  const back=(p,s=1.6)=>{const q=clamp(p)-1;return 1+(s+1)*q**3+s*q**2;};
  const expo=p=>p>=1?1:p<=0?0:1-2**(-10*p);
  const elastic=p=>p<=0?0:p>=1?1:1+2**(-10*p)*Math.sin((p-.1)*2*Math.PI/.4);
  const progress=(time,onset)=>clamp((Math.floor(time*30+1e-7)-Math.ceil(onset*30))/24);
  const graphemes=text=>Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),s=>s.segment);
  function cardAt(variant,p,count=1) {
    if(!variants.includes(variant)||variant==='peek-stack')throw new Error('Unknown social card');
    const q=clamp(p),follow=variant==='follow';
    if(variant==='comment') {
      if(q===1)return {arrival:1,avatar:1,avatarOpacity:1,meta:1,ink:Array(count).fill(1),footer:1,action:1,changed:false};
      const typing=Math.min(.024,2.2/Math.max(1,count)),end=.4+typing*Math.max(0,count-1)+.02;
      const t=q*(end+.5),ink=Array.from({length:count},(_,i)=>clamp((t-.4-i*typing)/.02));
      return {arrival:1,avatar:back(t/.45),avatarOpacity:out(t/.45),
        meta:out((t-.12)/.4),ink,footer:out((t-end-.15)/.35),action:1,changed:false};
    }
    // Preserve source event ratios while fitting the native 24-frame cue.
    const t=.1+q*(follow?1.45:1.92),press=follow?1:1.5,pressDuration=follow?.15:.12;
    const release=press+pressDuration,depth=follow?.92:.85;
    const action=t<press?1:t<release?mix(1,depth,out((t-press)/pressDuration)):
      mix(depth,1,elastic((t-release)/.4));
    return {arrival:out((t-.1)/(follow?.5:.6),4),avatar:1,avatarOpacity:1,meta:1,
      ink:Array(count).fill(1),footer:1,action:q>=1?1:action,changed:t>=release};
  }
  function peekAt(index,active,p,H,h) {
    const gap=Math.min(8,H*.025),base=(H-h-gap*2)/2;
    if(index>active)return {y:H,scaleX:.97,scaleY:.97,opacity:0,copy:false};
    if(index===active) {
      const q=expo(clamp(p));return {y:mix(H,base,q),scaleX:mix(.97,1,q),scaleY:mix(.97,1,q),
        opacity:clamp(p*.65/.12),copy:p>0&&mix(H,base,q)+h<=H};
    }
    const depth=active-index,q=out(p*.65/.5,4),prior=depth-1;
    return {y:base,scaleX:mix(1-.045*prior,1-.045*depth,q),
      scaleY:mix((h+gap*prior)/h,(h+gap*depth)/h,q),opacity:depth<=2?1:1-q,copy:false};
  }
  function mount(host,c,onsets,make) {
    const variant=c.variant;if(!variants.includes(variant))throw new Error('Unknown social presentation');
    make('h2','prod-heading',c.heading,host,true);
    const board=make('div','interface-board interface-social-cards',null,host);
    board.dataset.interfaceStyle=c.style;board.dataset.interfaceVariant=variant;
    make('p','interface-source',c.source,host,true);
    const W=board.clientWidth,H=board.clientHeight,peek=variant==='peek-stack';
    const h=peek?Math.min(H-48,192):Math.min(H-48,332),w=Math.min(W-64,1060);
    const rows=c.items.map((item,index)=>{
      const shell=make('div','social-shell social-'+variant,null,board);
      Object.assign(shell.style,{left:(W-w)/2+'px',width:w+'px',height:h+'px',zIndex:String(index+1)});
      const row=make('div','interface-row',null,shell);row.dataset.interfaceIndex=String(index);
      const header=make('div','social-header',null,row);
      const avatar=make('span','social-avatar',graphemes(item.label)[0]||'',header);
      avatar.setAttribute('aria-hidden','true');
      const identity=make('div','social-identity',null,header);
      const label=make('h3','interface-label',item.label,identity,true);
      const context=peek?null:make('p','social-context',item.context,identity,true);
      const body=make('p','interface-body',item.body,row,true);
      let action=null;const chars=[];
      if(!peek) {
        const footer=make('div','social-footer',null,row);
        action=make('span','social-action',item.action.before,footer,true);
        if(variant==='comment') {
          body.textContent='';for(const char of graphemes(item.body))chars.push(make('span','',char,body));
        }
      }
      return {shell,row,header,avatar,label,body,context,action,chars,item,index};
    });
    return time=>{
      const active=window.ShortCreatorInterface.activeAt(time,onsets),p=active<0?0:progress(time,onsets[active]);
      const states=[];board.dataset.interfaceActive=String(active);
      for(const {shell,row,header,avatar,action,chars,item,index} of rows) {
        const own=progress(time,onsets[index]);row.dataset.interfaceProgress=String(own);
        if(peek) {
          const s=peekAt(index,active,p,H,h);states.push(s);
          shell.style.visibility=s.opacity>0?'visible':'hidden';shell.style.opacity=String(s.opacity);
          shell.style.transform=`translateY(${s.y}px) scale(${s.scaleX},${s.scaleY})`;
          row.style.visibility=s.copy?'visible':'hidden';
        } else {
          const s=cardAt(variant,own,chars.length||1);states.push(s);
          const travel=Math.min(H*.28,100)*(1-s.arrival),top=(H-h)/2+travel;
          const visible=index===active&&own>0&&top+h<=H;
          shell.style.visibility=visible?'visible':'hidden';shell.style.opacity=String(s.arrival);
          shell.style.transform=`translateY(${top}px)`;row.style.visibility=visible?'visible':'hidden';
          avatar.style.transform=`scale(${s.avatar})`;avatar.style.opacity=String(s.avatarOpacity);
          header.querySelector('.social-identity').style.opacity=String(s.meta);
          chars.forEach((char,i)=>{char.style.opacity=String(s.ink[i]);});
          action.textContent=s.changed?item.action.after:item.action.before;
          action.style.transform=`scale(${s.action})`;action.parentElement.style.opacity=String(s.footer);
          action.dataset.changed=String(s.changed);
        }
      }
      board.dataset.interfacePresentation=JSON.stringify({variant,active,rows:states});
    };
  }
  window.ShortCreatorInterfaceSocial={variants,progress,cardAt,peekAt,mount};
})();
