/* HyperFrames code-story mechanics adapted under Apache-2.0; see production provenance.
   Display text only. No interpreter, syntax package, network or episode-supplied styling. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const out=x=>1-(1-clamp(x))**3;
  const smooth=x=>{const p=clamp(x);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  const graphemes=text=>Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),s=>s.segment);
  const lexemes=text=>text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu)||[];

  // Source lineDiff LCS, with deletion winning ties. Indices also match repeated tokens.
  function diff(before,after) {
    const n=before.length,m=after.length,dp=Array.from({length:n+1},()=>new Uint16Array(m+1));
    for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)
      dp[i][j]=before[i]===after[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);
    const result=[];let i=0,j=0;
    while(i<n||j<m) {
      if(i<n&&j<m&&before[i]===after[j])result.push({type:'same',before:i++,after:j++});
      else if(i<n&&(j===m||dp[i+1][j]>=dp[i][j+1]))result.push({type:'del',before:i++,after:null});
      else result.push({type:'add',before:null,after:j++});
    }
    return result;
  }

  function diffState(operations,value) {
    const p=clamp(value),deleted=operations.filter(op=>op.type==='del').length,added=operations.filter(op=>op.type==='add').length;
    // Preserve source .55/.6 durations and .08/.12 stagger ratios, with a closed deletion/addition handoff.
    const delSpan=.55+Math.max(0,deleted-1)*.08,addSpan=.6+Math.max(0,added-1)*.12;
    let di=0,ai=0,y=0;
    return operations.map(op=>{
      let height=1;
      if(op.type==='del')height=1-smooth((p/.45*delSpan-di++*.08)/.55);
      if(op.type==='add')height=out(((p-.55)/.45*addSpan-ai++*.12)/.6);
      const row={...op,y,height,opacity:height};y+=height;return row;
    });
  }

  function typingState(text,value,style='typing') {
    const discrete=style==='workbench'||style==='terminal';
    const chars=graphemes(text),p=clamp(value),per=discrete?.012:.028,total=Math.max(per,chars.length*per+(discrete?0:.12));
    const time=p*total;
    const travel=clamp(time/Math.max(per,chars.length*per))*chars.length;
    return {chars,alphas:chars.map((char,i)=>discrete?Number(time>i*per):1-(1-clamp((time-i*per)/(char===' '?.01:.12)))**2),
      caret:discrete?Math.ceil(travel):travel,active:p>0&&p<1};
  }

  function scrollTarget(index,lineHeight,height,count) {
    return Math.min(0,Math.max(Math.min(0,height-count*lineHeight),height/2-(index+.5)*lineHeight));
  }

  function mount(host,content,onsets,make,reveal) {
    const heading=make('h2','prod-heading',content.heading,host,true);
    const source=make('p','resource-source',content.source,host,true);
    const board=make('div','code-story-board',null,host);board.dataset.codeStyle=content.style;
    const bar=make('div','code-story-bar',null,board);
    const dots=make('span','code-story-dots',null,bar);dots.setAttribute('aria-hidden','true');
    for(let i=0;i<3;i++)make('i','',null,dots);
    make('span','code-story-file',content.filename,bar,true);
    if(content.style==='workbench') {
      const rail=make('aside','code-story-files',null,board);
      make('span','code-story-file-label',content.filename,rail,true);
    }
    const viewport=make('div','code-story-viewport',null,board),caret=make('div','code-story-caret',null,viewport);
    caret.setAttribute('aria-hidden','true');
    const rowHeight=parseFloat(getComputedStyle(board).getPropertyValue('--code-row'));
    const characterMode=['typing','workbench','terminal'].includes(content.style);
    const document=(lines,index)=>{
      const node=make('div','code-story-document',null,viewport);node.dataset.document=String(index);
      const tokens=[],rows=lines.map((text,line)=>{
        const wrap=make('div','code-story-row-wrap',null,node),row=make('div','code-story-row',null,wrap);
        make('span','code-story-number',String(line+1).padStart(2,'0'),row);
        const code=make('code','code-story-text',null,row);
        const spans=(characterMode?graphemes(text):lexemes(text)).map(token=>{
          const span=make('span','code-story-token',token,code);tokens.push(span);return span;
        });
        return {wrap,row,code,spans,text};
      });
      return {node,rows,tokens};
    };
    const documents=content.documents.map(document),transitions=[];
    const position=node=>{
      let x=0,y=0;
      for(let parent=node;parent&&parent!==viewport;parent=parent.offsetParent) {x+=parent.offsetLeft;y+=parent.offsetTop;}
      return {x,y};
    };
    if(content.style==='diff')for(let i=1;i<documents.length;i++) {
      const operations=diff(content.documents[i-1],content.documents[i]);
      const layer=make('div','code-story-diff',null,viewport);
      const rows=operations.map(op=>{
        const wrap=make('div','code-story-row-wrap',null,layer),row=make('div','code-story-row',null,wrap);
        const sign=make('span','code-story-number',op.type==='del'?'-':op.type==='add'?'+':'',row);
        sign.classList.add('code-story-'+op.type);
        const text=make('code','code-story-text',content.documents[op.type==='del'?i-1:i][op.type==='del'?op.before:op.after],row);
        wrap.dataset.operation=op.type;return {wrap,text};
      });
      transitions.push({layer,operations,rows});
    }
    if(content.style==='morph')for(let i=1;i<documents.length;i++) {
      const before=documents[i-1],after=documents[i],layer=make('div','code-story-ghosts',null,viewport);
      const operations=diff(before.tokens.map(t=>t.textContent),after.tokens.map(t=>t.textContent));
      const matches=operations.filter(op=>op.type==='same').map(op=>{
        const a=position(before.tokens[op.before]),b=position(after.tokens[op.after]);
        return {node:after.tokens[op.after],x:a.x-b.x,y:a.y-b.y};
      });
      const added=operations.filter(op=>op.type==='add').map(op=>after.tokens[op.after]);
      const removed=operations.filter(op=>op.type==='del').map(op=>{
        const original=before.tokens[op.before],point=position(original);
        const ghost=make('span','code-story-ghost',original.textContent,layer);
        ghost.style.left=point.x+'px';ghost.style.top=point.y+'px';return ghost;
      });
      transitions.push({layer,matches,added,removed});
    }
    const highlight=make('div','code-story-highlight',null,viewport);highlight.setAttribute('aria-hidden','true');
    // Font metrics are final here (the engine mounts after fonts.ready). Reject, never shrink.
    for(const doc of documents)for(const row of doc.rows)
      if(row.code.scrollWidth>row.code.clientWidth+2)throw new Error('Code text exceeds approved font geometry');
    if(content.style!=='scroll'&&documents.some(doc=>doc.rows.length*rowHeight>viewport.clientHeight))
      throw new Error('Code document exceeds its viewport');
    const spatial=['particles','dissolve','extrude'].includes(content.style);
    const spatialUpdate=spatial?window.ShortCreatorSpatialCode.mount(viewport,documents,content.style):null;
    const progress=(t,onset)=>window.ShortCreatorStory.progress(t,onset);
    const show=(node,value)=>{node.style.visibility=value?'visible':'hidden';node.setAttribute('aria-hidden',String(!value));};
    return time=>{
      const amounts=onsets.map(onset=>progress(time,onset));
      let active=-1;
      onsets.forEach((onset,i)=>{if(Math.floor(time*30+1e-7)>=Math.ceil(onset*30))active=i;});
      const p=active<0?0:amounts[active];
      board.dataset.codeBeat=String(active);board.dataset.codeProgress=String(p);
      reveal(heading,out(amounts[0]),24);reveal(source,out(amounts[0]),18);reveal(board,out(amounts[0]),24);
      for(const doc of documents) {
        show(doc.node,false);doc.node.style.transform='none';doc.node.style.opacity='1';
        for(const row of doc.rows) {row.row.style.opacity='1';row.row.style.transform='none';}
        for(const token of doc.tokens) {token.style.transform='none';token.style.opacity='1';}
      }
      for(const item of transitions)show(item.layer,false);
      show(highlight,false);show(caret,false);
      if(spatial) {
        const native=spatialUpdate(active,p);
        if(active>=0) {
          const index=p===0?Math.max(0,active-1):active;
          const alpha=p===0||p===1?1:native;
          show(documents[index].node,alpha>0);documents[index].node.style.opacity=String(alpha);
        }
      } else if(characterMode) {
        const doc=documents[0];show(doc.node,true);
        doc.rows.forEach((row,i)=>{
          const amount=amounts[i];row.row.style.opacity=time<onsets[i]?'0':'1';
          if(content.style==='terminal'&&i>0) {
            row.row.style.opacity=String(out(amount));row.row.style.transform=`translateY(${16*(1-out(amount))}px)`;
          } else {
            const state=typingState(row.text,amount,content.style);
            row.spans.forEach((span,j)=>span.style.opacity=String(state.alphas[j]));
            if(i===active&&state.active) {
              const index=Math.min(row.spans.length-1,Math.floor(state.caret)),token=row.spans[index];
              const origin=token?position(token):position(row.code);
              const fraction=index<0?0:Math.min(1,state.caret-index),x=origin.x+(token?token.offsetWidth*fraction:0);
              caret.style.left=x+'px';caret.style.top=origin.y+'px';show(caret,true);
            }
          }
        });
        if(['workbench','terminal'].includes(content.style)&&active>=0) {
          highlight.style.top=active*rowHeight+'px';highlight.style.opacity=String(p<1?1:0);show(highlight,p<1);
        }
      } else if(content.style==='scroll') {
        const doc=documents[0],index=Math.max(0,active),target=content.focus[index];show(doc.node,true);
        const y=scrollTarget(target,rowHeight,viewport.clientHeight,doc.rows.length);
        const previous=active>0?scrollTarget(content.focus[active-1],rowHeight,viewport.clientHeight,doc.rows.length):0;
        const dy=previous+(y-previous)*smooth(p),focus=out((p-.7)/.3);
        doc.node.style.transform=`translateY(${dy}px)`;board.dataset.codeScroll=String(dy);
        doc.rows.forEach((row,i)=>{
          const from=active>0?(i===content.focus[active-1]?1:.35):1,to=i===target?1:.35;
          row.row.style.opacity=String(from+(to-from)*focus);
        });
        highlight.style.top=(target*rowHeight+dy)+'px';highlight.style.opacity=String(focus);show(highlight,active>=0);
      } else {
        const index=Math.max(0,active);
        if(index===0||p===1)show(documents[index].node,true);
        else if(p===0)show(documents[index-1].node,true);
        else if(content.style==='diff') {
          const transition=transitions[index-1];show(transition.layer,true);
          const states=diffState(transition.operations,p);
          transition.rows.forEach(({wrap},i)=>{
            wrap.style.height=states[i].height*rowHeight+'px';wrap.style.opacity=String(states[i].opacity);
          });
        } else {
          const transition=transitions[index-1],amount=smooth(p);show(documents[index].node,true);show(transition.layer,true);
          transition.matches.forEach(({node,x,y})=>node.style.transform=`translate(${x*(1-amount)}px,${y*(1-amount)}px)`);
          transition.added.forEach(node=>node.style.opacity=String(1-(1-clamp((p-.45)/.5))**2));
          transition.removed.forEach(node=>node.style.opacity=String(1-clamp(p/.5)**2));
        }
      }
    };
  }
  window.ShortCreatorCode={graphemes,lexemes,diff,diffState,typingState,scrollTarget,mount};
})();
