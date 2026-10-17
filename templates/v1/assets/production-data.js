/* Closed adaptations of HyperFrames bar-chart-race, mk-line-graph,
   constellation-hub and flowchart. Source records live in production provenance. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{const p=clamp(x);return p*p*(3-2*p);};
  function declineState(values,index,amount) {
    const p=clamp(amount),current=Math.max(0,index),before=values[Math.max(0,current-1)];
    const q=1-(1-clamp(p*(current===values.length-1?1.15:1)))**3;
    const value=index<=0?values[0]:p===1?values[current]:before+(values[current]-before)*q;
    return {value,progress:clamp((values[0]-value)/(values[0]-values.at(-1)))};
  }
  // week-in-merges: integrate proportional travel, then reflect at lane ends.
  // True zero is stationary; period changes preserve distance instead of jumping.
  function laneState(series,onsets,time,span) {
    if(!Number.isFinite(time)||!Number.isFinite(span)||span<=0)throw new Error('Invalid lane clock or extent');
    const starts=onsets.map(at=>Math.ceil(at*30)/30),t=Math.floor(time*30+1e-7)/30;
    if(starts.some((at,i)=>!Number.isFinite(at)||(i>0&&at<=starts[i-1]))||series.some(values=>
      values.length!==starts.length||values.some(v=>!Number.isFinite(v)||v<0)))throw new Error('Invalid lane data');
    const maximum=Math.max(0,...series.flat()),index=starts.reduce((last,at,i)=>t>=at?i:last,-1);
    const speeds=series.map(values=>maximum===0?0:300*values[Math.max(0,index)]/maximum*span/532);
    const distance=series.map(values=>starts.reduce((sum,start,i)=>sum+
      (maximum===0?0:300*values[i]/maximum*span/532)*Math.max(0,Math.min(t,starts[i+1]??t)-start),0));
    return {index,values:series.map(values=>values[Math.max(0,index)]),speeds,distance,
      positions:distance.map(d=>{const phase=d%(2*span);return phase<=span?phase:2*span-phase;})};
  }
  function rankingAt(before,after,amount) {
    const p=clamp(amount),step=Math.min(9,Math.floor(p*10)),mix=smooth(p*10-step);
    const values=before.map((v,i)=>v+(after[i]-v)*p);
    const ranks=f=>{
      const result=Array(before.length);
      before.map((v,i)=>({i,v:v+(after[i]-v)*f})).sort((a,b)=>b.v-a.v||a.i-b.i)
        .forEach((item,rank)=>{result[item.i]=rank;});
      return result;
    };
    const a=ranks(step/10),b=ranks((step+1)/10);
    const rows=a.map((v,i)=>v+(b[i]-v)*mix);
    const leader=values.reduce((best,v,i)=>v>values[best]?i:best,0);
    return {values,rows,leader};
  }
  function networkPositions(nodes,style,width,height) {
    const count=nodes.length;
    if(style==='hub')return nodes.map((_,i)=>{
      if(!i)return {x:width/2,y:height/2};
      const angle=-Math.PI/2+(i-1)/(count-1)*Math.PI*2;
      return {x:width*(.5+Math.cos(angle)*.38),y:height*(.5+Math.sin(angle)*.39)};
    });
    if(style!=='branch')throw new Error('Unknown network style');
    const children=nodes.map(()=>[]),depth=[0];
    nodes.forEach((n,i)=>{if(i){children[n.parent].push(i);depth[i]=depth[n.parent]+1;}});
    const slots=[],leaves=[];
    function visit(i) {
      if(!children[i].length){slots[i]=leaves.length;leaves.push(i);return;}
      children[i].forEach(visit);slots[i]=(slots[children[i][0]]+slots[children[i].at(-1)])/2;
    }
    visit(0);
    const levels=Math.max(...depth);
    return slots.map((slot,i)=>({x:width*(.1+.8*(leaves.length===1?.5:slot/(leaves.length-1))),
      y:height*(.12+.76*depth[i]/Math.max(1,levels))}));
  }
  const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
  function shape(tag,attrs,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);set(node,attrs);parent.appendChild(node);return node;
  }
  function text(svg,x,y,value,size=24,anchor='start',color='white') {
    const node=shape('text',{x,y,'font-size':size,'text-anchor':anchor,'dominant-baseline':'middle',fill:color,'data-fit':'true'},svg);
    node.textContent=value;return node;
  }
  function clock(time,onsets) {
    let index=-1;onsets.forEach((t,i)=>{if(time>=t)index=i;});
    return {index,p:index<0?0:window.ShortCreatorStory.progress(time,onsets[index])};
  }
  function source(host,record,make) {
    make('p','data-source',`${record.kind.toUpperCase()} / ${record.label} / ${record.as_of}`,host,true);
    make('p','data-reference',record.reference,host,true);
  }
  function ranking(board,c,onsets) {
    const W=board.clientWidth,H=board.clientHeight,top=58,pitch=(H-top)/c.series.length,left=280,right=W-130;
    const maximum=Math.max(1,...c.series.flatMap(s=>s.values));
    const svg=shape('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'data-svg'},board);
    const period=text(svg,0,22,'',26),unit=text(svg,W-6,22,c.unit,24,'end','var(--cyan)');
    unit.dataset.dataUnit='true';period.dataset.dataPeriod='true';
    const rows=c.series.map((series,index)=>{
      const group=shape('g',{'data-data-series':index},svg);
      const bar=shape('rect',{x:left,y:0,width:0,height:pitch*.65,fill:'var(--cyan)'},group);
      const label=text(group,0,pitch*.325,series.label),value=text(group,W-6,pitch*.325,'',24,'end');
      label.dataset.dataLabel=String(index);value.dataset.dataValue=String(index);
      return {group,bar,label,value};
    });
    return time=>{
      const {index,p}=clock(time,onsets),current=Math.max(0,index),before=Math.max(0,current-1);
      const state=rankingAt(c.series.map(s=>s.values[before]),c.series.map(s=>s.values[current]),index<=0?1:p);
      board.style.opacity=index<0?'0':'1';board.dataset.dataProgress=String(p);board.dataset.dataIndex=String(index);
      period.textContent=c.categories[current];
      rows.forEach(({group,bar,label,value},i)=>{
        const y=top+state.rows[i]*pitch,amount=index===0?smooth(p):1;
        set(group,{transform:`translate(0 ${y})`});
        set(bar,{width:state.values[i]/maximum*(right-left)*amount,fill:i===state.leader?'var(--lime)':'var(--cyan)'});
        // Hide colliding row labels only during overtakes; settle to exact copy.
        const clear=state.rows.every((row,j)=>j===i||Math.abs(row-state.rows[i])*pitch>=34);
        label.style.visibility=value.style.visibility=clear?'visible':'hidden';
        value.textContent=String(index<=0||p===1?state.values[i]:Number(state.values[i].toFixed(2)));
        group.dataset.dataValue=String(state.values[i]);group.dataset.dataRank=String(state.rows[i]);
      });
    };
  }
  function lines(board,c,onsets) {
    const W=board.clientWidth,H=board.clientHeight,left=90,right=W-60,top=94,base=H-62;
    const decline=c.style==='decline',cubic=p=>1-(1-clamp(p))**3;
    const maximum=Math.max(1,...c.series.flatMap(s=>s.values));
    const svg=shape('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'data-svg'},board);
    const ambient=decline?shape('rect',{x:left,y:top,width:right-left,height:base-top,fill:'var(--surface)','data-decline-ambient':'true'},svg):null;
    const gloom=decline?shape('rect',{x:left,y:top,width:right-left,height:base-top,fill:'var(--purple)',opacity:0,'data-decline-gloom':'true'},svg):null;
    const legends=c.series.map((s,i)=>text(svg,0,20+i*32,'',24,'start',i?'var(--cyan)':'var(--lime)'));
    text(svg,W-6,20,c.unit,24,'end','var(--cyan)');
    for(let i=0;i<=4;i++) {
      const y=base-(base-top)*i/4;
      shape('line',{x1:left,x2:right,y1:y,y2:y,stroke:'var(--cyan)','stroke-opacity':i?.2:.6},svg);
      text(svg,left-16,y,String(Number((maximum*i/4).toPrecision(3))),22,'end','var(--cyan)');
    }
    c.categories.forEach((label,i)=>text(svg,left+(right-left)*i/(c.categories.length-1),H-22,label,24,'middle'));
    const tracks=c.series.map((series,s)=>{
      const color=s?'var(--cyan)':'var(--lime)';
      const points=series.values.map((value,i)=>({x:left+(right-left)*i/(series.values.length-1),y:base-value/maximum*(base-top)}));
      return points.map((point,i)=>{
        let segment=null,length=0;
        if(i){const previous=points[i-1];segment=shape('path',{d:`M ${previous.x} ${previous.y} L ${point.x} ${point.y}`,fill:'none',stroke:color,'stroke-width':5},svg);
          length=segment.getTotalLength();set(segment,{'stroke-dasharray':`${length} ${length}`});}
        const dot=shape('circle',{cx:point.x,cy:point.y,r:7,fill:color,'data-data-series':s,'data-data-index':i,'data-data-value':series.values[i]},svg);
        return {dot,segment,length};
      });
    });
    return time=>{
      const {index,p}=clock(time,onsets);board.dataset.dataIndex=String(index);board.dataset.dataProgress=String(p);
      const first=window.ShortCreatorStory.progress(time,onsets[0]);
      board.style.opacity=decline?String(cubic(first)):index<0?'0':'1';
      if(decline)board.style.transform=`translateY(${H*.025*(1-cubic(first))}px)`;
      tracks.forEach((track,s)=>{
        track.forEach(({dot,segment,length},i)=>{
          const progress=window.ShortCreatorStory.progress(time,onsets[i]),last=i===track.length-1;
          const q=decline?cubic(progress*(last?1.15:1)):smooth(progress);
          set(dot,{opacity:decline&&last?clamp((q-.94)/.06):q});
          if(decline&&last){const s=.72+.28*cubic((progress-3/3.45)/(.45/3.45)),x=+dot.getAttribute('cx'),y=+dot.getAttribute('cy');
            set(dot,{transform:`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`});}
          if(segment)set(segment,{'stroke-dashoffset':length*(1-q)});
        });
        const current=Math.max(0,index),values=c.series[s].values,before=values[Math.max(0,current-1)];
        const declinePose=decline?declineState(values,index,p):null;
        const value=decline?declinePose.value:index<=0?values[0]:before+(values[current]-before)*smooth(p);
        if(decline){const {progress}=declinePose;
          ambient.style.filter=`saturate(${1-.72*progress}) brightness(${1-.52*progress})`;
          set(gloom,{opacity:.46*progress});board.dataset.declineState=JSON.stringify({value,progress});}
        legends[s].textContent=c.series[s].label+' / '+String(p===1?values[current]:Number(value.toFixed(2)));
        legends[s].dataset.dataLegend=String(s);
      });
    };
  }
  function lanes(board,c,onsets) {
    const W=board.clientWidth,H=board.clientHeight,pitch=(H-58)/c.series.length,left=280;
    const diameter=Math.min(62,pitch*.72),span=W-left-diameter-12;
    if(span<=0||pitch<50)throw new Error('Value lanes do not fit the approved geometry');
    const svg=shape('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'data-svg'},board);
    const period=text(svg,0,22,'',26);period.dataset.dataPeriod='true';
    text(svg,W-6,22,c.unit,24,'end','var(--cyan)');
    const order=c.series.map((s,i)=>i).sort((a,b)=>c.series[b].values[0]-c.series[a].values[0]||a-b);
    const rows=c.series.map((series,i)=>{
      const y=58+order.indexOf(i)*pitch,group=shape('g',{'data-value-lane':i},svg);
      text(group,0,y+pitch*.28,series.label,24).dataset.laneLabel='true';
      const value=text(group,0,y+pitch*.73,'',20,'start','var(--cyan)');value.dataset.laneValue='true';
      shape('line',{x1:left+diameter/2,x2:left+span+diameter/2,y1:y+pitch/2,y2:y+pitch/2,stroke:'var(--cyan)','stroke-opacity':.22},group);
      const marker=shape('g',{'data-lane-marker':i},group);
      const circle=shape('circle',{cx:0,cy:0,r:diameter/2,fill:'var(--lime)'},marker);
      text(marker,0,0,window.ShortCreatorEvidence.initials(series.label),20,'middle','var(--purple)');
      return {group,value,marker,circle,y};
    });
    return time=>{
      const s=laneState(c.series.map(row=>row.values),onsets,time,span),maximum=Math.max(...s.values);
      const p=s.index<0?0:window.ShortCreatorStory.progress(time,onsets[s.index]);
      board.dataset.dataIndex=String(s.index);board.dataset.dataProgress=String(p);
      board.dataset.laneState=JSON.stringify({...s,span,left,diameter,pitch});board.style.opacity=s.index<0?'0':'1';
      period.textContent=c.categories[Math.max(0,s.index)];
      rows.forEach((row,i)=>{
        row.value.textContent=String(s.values[i]);row.group.dataset.laneDistance=String(s.distance[i]);
        set(row.marker,{transform:`translate(${left+diameter/2+s.positions[i]} ${row.y+pitch/2})`});
        set(row.circle,{fill:s.values[i]===maximum?'var(--lime)':'var(--cyan)'});
      });
    };
  }
  function network(board,c,onsets,make) {
    if(window.ShortCreatorNetworkLayouts?.kinds.includes(c.style))return window.ShortCreatorNetworkLayouts.mount(board,c,onsets,make);
    const W=board.clientWidth,H=board.clientHeight,points=networkPositions(c.nodes,c.style,W,H);
    const svg=shape('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'network-lines'},board);
    const width=c.style==='hub'?Math.min(220,W*.22):Math.min(220,W*.19),height=78;
    const nodes=c.nodes.map((node,i)=>{
      const point=points[i],card=make('div','network-node',node.label,board,true);
      card.style.width=width+'px';card.style.height=height+'px';card.style.left=(point.x-width/2)+'px';card.style.top=(point.y-height/2)+'px';
      card.dataset.networkNode=String(i);let path=null,length=0;
      if(i){const from=points[node.parent];
        const d=c.style==='hub'?`M ${from.x} ${from.y} L ${point.x} ${point.y}`:
          `M ${from.x} ${from.y+height/2} V ${(from.y+point.y)/2} H ${point.x} V ${point.y-height/2}`;
        path=shape('path',{d,fill:'none',stroke:'var(--lime)','stroke-width':3,'data-network-parent':node.parent},svg);
        length=path.getTotalLength();set(path,{'stroke-dasharray':`${length} ${length}`});}
      return {card,path,length};
    });
    return time=>nodes.forEach(({card,path,length},i)=>{
      const p=window.ShortCreatorStory.progress(time,onsets[i]),q=smooth(p/.65);
      const pop=p<.7?.92+.135*smooth(p/.7):1.055-.055*smooth((p-.7)/.3);
      card.style.opacity=String(q);card.style.transform=`scale(${pop})`;card.dataset.networkProgress=String(p);
      if(path)set(path,{'stroke-dashoffset':length*(1-q)});
    });
  }
  function mount(host,spec,onsets,data,make) {
    const c=spec.content;make('h2','prod-heading',c.heading,host,true);source(host,c.source,make);
    if(spec.kind==='data-story')make('p','data-insight',c.insight,host,true);
    const board=make('div','data-board'+(spec.kind==='network'?' network-board':''),null,host);
    board.dataset.dataStyle=c.style;
    if(spec.kind==='network')return network(board,c,onsets,make);
    if(c.style==='ranking')return ranking(board,c,onsets);
    if(c.style==='lines'||c.style==='decline')return lines(board,c,onsets);
    if(c.style==='value-lanes')return lanes(board,c,onsets);
    throw new Error('Unknown data composition');
  }
  window.ShortCreatorData={rankingAt,networkPositions,laneState,declineState,mount};
})();
