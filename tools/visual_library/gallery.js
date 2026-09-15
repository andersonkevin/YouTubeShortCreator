(() => {
  'use strict';
  const {charts, icons, world, recipes} = window.visualLibraryData;
  const $ = id => document.getElementById(id);
  const colors = ['#def0a2', '#ade8ed', '#f2b9c9', '#d0bef6'];
  const chart = echarts.init($('chart'), null, {renderer:'svg', width:880, height:810});
  echarts.registerMap('natural-earth', world);
  let index = 0;
  let seconds = 4;
  let playing = false;
  let last = 0;
  const text = (id, value) => { $(id).textContent = value; };
  const axis = () => ({axisLine:{lineStyle:{color:'#70858f'}}, axisLabel:{color:'#e7ecef',fontSize:24,hideOverlap:true}, splitLine:{lineStyle:{color:'#303a40'}}, nameTextStyle:{color:'#e7ecef',fontSize:24}, nameGap:45});
  const label = {show:true,color:'#f8fafc',fontSize:25};
  function options(c) {
    const d = c.data;
    const common = {animation:false,backgroundColor:'#000',color:colors,textStyle:{fontFamily:'Arial',fontSize:26},aria:{enabled:true},tooltip:{show:false},grid:{left:115,right:35,top:85,bottom:100},legend:{top:15,textStyle:{color:'#f8fafc',fontSize:25},itemGap:30},series:[]};
    const writeText=(x,y,value,size=32,color='#f8fafc',align='center')=>({type:'text',silent:true,style:{x,y,text:value,font:`${size}px Arial`,fill:color,align,verticalAlign:'middle'}});
    const box=(x,y,width,height,color)=>({type:'rect',silent:true,shape:{x,y,width,height,r:8},style:{fill:'#151a1d',stroke:color,lineWidth:2}});
    if(c.kind==='flow') {
      const graphic=[];
      d.steps.forEach((step,i)=>{
        const y=40+i*190;
        graphic.push(box(140,y,600,125,colors[i%4]),{type:'circle',silent:true,shape:{cx:190,cy:y+63,r:29},style:{fill:colors[i%4]}},{type:'image',silent:true,style:{image:icons[step.icon],x:170,y:y+43,width:40,height:40}},writeText(490,y+64,step.label,30));
        if(i<d.steps.length-1)graphic.push({type:'line',silent:true,shape:{x1:440,y1:y+132,x2:440,y2:y+167},style:{stroke:colors[1],lineWidth:3}},{type:'polygon',silent:true,shape:{points:[[432,y+165],[448,y+165],[440,y+178]]},style:{fill:colors[1]}});
      });
      return {...common,graphic};
    }
    if(c.kind==='metric')return {...common,graphic:[box(60,150,760,470,colors[0]),writeText(440,230,d.label,34),writeText(440,365,String(d.value),82,colors[0]),writeText(440,450,d.unit,32,colors[1]),writeText(440,550,d.context,28)]};
    if(c.kind==='comparison') {
      const graphic=[];
      [d.left,d.right].forEach((column,i)=>{
        const x=15+i*435;
        graphic.push(box(x,120,410,540,colors[i]),writeText(x+205,200,column.label,32,colors[i]));
        column.items.forEach((value,j)=>graphic.push(writeText(x+205,320+j*110,value,28)));
      });
      return {...common,graphic};
    }
    if(c.kind === 'line' || c.kind === 'bar') {
      return {...common,xAxis:{...axis(),type:'category',data:d.categories,axisLabel:{...axis().axisLabel,interval:0}},yAxis:{...axis(),type:'value',name:d.unit,min:0},series:d.series.map((s,i)=>({name:s.label,type:c.kind,data:s.values,symbol:i?'diamond':'circle',symbolSize:15,lineStyle:{width:5},barMaxWidth:75,label:{...label,position:'top'},itemStyle:{borderRadius:c.kind==='bar'?[4,4,0,0]:0},emphasis:{disabled:true}}))};
    }
    if(c.kind === 'pie') {
      return {...common,legend:{...common.legend,bottom:35,top:undefined},series:[{type:'pie',radius:['29%','57%'],center:['50%','46%'],avoidLabelOverlap:true,label:{color:'#f8fafc',fontSize:25,formatter:'{b}\n{d}%',lineHeight:34},labelLine:{length:18,length2:12,lineStyle:{color:'#b6c4cc'}},data:d.categories.map((name,i)=>({name,value:d.values[i]})),itemStyle:{borderColor:'#000',borderWidth:4},emphasis:{disabled:true}}]};
    }
    if(c.kind === 'scatter') {
      return {...common,xAxis:{...axis(),type:'value',name:d.x_unit,nameLocation:'middle'},yAxis:{...axis(),type:'value',name:d.y_unit},series:[{type:'scatter',data:d.points,symbolSize:23,itemStyle:{color:colors[1],opacity:1},emphasis:{disabled:true}}]};
    }
    if(c.kind === 'heatmap' || c.kind === 'correlation') {
      const correlation = c.kind === 'correlation';
      const rows = correlation ? d.labels : d.rows;
      const columns = correlation ? d.labels : d.columns;
      const values = correlation ? c.derived.matrix : d.values;
      return {...common,grid:{left:145,right:35,top:50,bottom:155},xAxis:{...axis(),type:'category',data:columns,splitArea:{show:false},axisLabel:{...axis().axisLabel,interval:0}},yAxis:{...axis(),type:'category',data:rows,inverse:true,splitArea:{show:false}},visualMap:{min:correlation?-1:0,max:correlation?1:100,orient:'horizontal',left:'center',bottom:35,itemWidth:25,itemHeight:270,precision:correlation?1:0,text:correlation?['+1','-1']:['100%','0%'],textStyle:{color:'#f8fafc',fontSize:24},inRange:{color:correlation?['#f2b9c9','#e6e9ed','#ade8ed']:['#f2b9c9','#e6e9ed','#def0a2']},calculable:false},series:[{type:'heatmap',data:values.flatMap((row,y)=>row.map((v,x)=>[x,y,v])),label:{show:true,color:'#101214',fontSize:29,fontWeight:'bold',formatter:p=>correlation?p.value[2].toFixed(2):p.value[2]+'%'},itemStyle:{borderColor:'#000',borderWidth:4},emphasis:{disabled:true}}]};
    }
    if(c.kind === 'timeline') {
      return {...common,grid:{left:170,right:35,top:55,bottom:90},xAxis:{...axis(),type:'value',name:d.unit,min:0},yAxis:{...axis(),type:'category',data:d.stages.map(s=>s.label),inverse:true},series:[{type:'bar',stack:'time',silent:true,itemStyle:{color:'transparent'},data:d.stages.map(s=>s.start),emphasis:{disabled:true}},{type:'bar',stack:'time',barMaxWidth:65,data:d.stages.map((s,i)=>({value:s.end-s.start,itemStyle:{color:colors[i%colors.length]}})),label:{show:true,color:'#101214',fontSize:26,fontWeight:'bold',position:'inside',formatter:p=>Number(p.value.toFixed(2))},emphasis:{disabled:true}}]};
    }
    return {...common,geo:{map:'natural-earth',roam:false,left:10,right:10,top:90,bottom:150,silent:true,itemStyle:{areaColor:'#303f46',borderWidth:0},emphasis:{disabled:true},label:{show:false}},series:[{type:'scatter',coordinateSystem:'geo',symbolSize:22,data:d.points.map(p=>({name:p.label,value:[p.lon,p.lat,p.value]})),itemStyle:{color:colors[0],opacity:1,borderWidth:2,borderColor:'#000'},label:{show:true,formatter:'{b}',position:'top',distance:10,color:'#f8fafc',fontSize:22,backgroundColor:'#000',padding:[4,6]},labelLayout:{hideOverlap:true},emphasis:{disabled:true}}]};
  }
  function renderAt(t) {
    if(!Number.isFinite(t)) throw new Error('Finite timeline required');
    seconds = Math.max(0,Math.min(8,t));
    $('progress').style.width = seconds/8*100+'%';
    $('time').value = String(seconds);
    text('time-label',seconds.toFixed(1)+' s');
    // Editorial reveal uses a deterministic clip, never interpolated data values.
    const reveal = Math.min(1,seconds/1.6);
    $('chart').style.clipPath = `inset(0 ${(1-reveal)*100}% 0 0)`;
  }
  function select(id) {
    const next = charts.findIndex(c=>c.id===id);
    if(next<0) throw new Error('Unknown chart');
    index = next;
    const c = charts[index];
    text('eyebrow',String(index+1).padStart(2,'0')+' / '+c.kind.toUpperCase());
    text('title',c.title);
    text('insight',c.insight);
    text('source-kind',c.source.kind === 'illustrative'?'ILLUSTRATIVE DATA':'SOURCE REVIEW REQUIRED');
    text('source',c.source.label+' | '+c.source.as_of);
    text('reference',c.source.reference);
    let detail = '';
    if(c.kind==='scatter') detail = `${c.data.x_label} vs ${c.data.y_label}\nPearson r = ${c.derived.r.toFixed(2)} | n = ${c.derived.n} | Not causation`;
    if(c.kind==='correlation') detail = `Pearson correlation | n = ${c.derived.n} | Not causation`;
    if(c.kind==='pie') detail = `Total: ${c.data.values.reduce((a,b)=>a+b,0)} ${c.data.unit}`;
    if(c.kind==='geo') detail = 'Fixed-size location markers | Natural Earth 5.1.2\nNo volume or regional ranking is encoded.';
    text('detail',detail);
    $('chart').setAttribute('aria-label',c.title+'. '+c.insight+'. '+JSON.stringify(c.data));
    chart.setOption(options(c),{notMerge:true,lazyUpdate:false});
    document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));
    renderAt(seconds);
  }
  function icon(name) {
    const image = document.createElement('img');
    image.src = icons[name]; image.alt=''; return image;
  }
  charts.forEach(c=>{
    const button = document.createElement('button');
    button.type='button'; button.dataset.id=c.id;
    button.append(icon(c.icon),document.createTextNode(c.kind === 'timeline'?'Trace / timeline':c.kind[0].toUpperCase()+c.kind.slice(1)));
    button.addEventListener('click',()=>select(c.id));
    $('studies').append(button);
  });
  Object.keys(icons).forEach(name=>{
    const item=document.createElement('span');item.className='icon';item.dataset.name=name;item.tabIndex=0;item.setAttribute('aria-label',name);item.append(icon(name));$('icons').append(item);
  });
  Object.entries(recipes).forEach(([name,recipe])=>{
    const item=document.createElement('span');item.className='icon recipe '+recipe.tone;item.dataset.name=recipe.label;item.tabIndex=0;item.setAttribute('aria-label',recipe.label);item.dataset.recipe=name;
    const badge=document.createElement('span');badge.className='badge';badge.append(icon(recipe.badge));item.append(icon(recipe.base),badge);$('icons').append(item);
  });
  function playState() {
    $('play').replaceChildren(icon(playing?'pause':'arrow-right'));
    $('play').setAttribute('aria-label',playing?'Pause preview':'Play preview');
    $('play').title=playing?'Pause preview':'Play preview';
  }
  $('play').addEventListener('click',()=>{playing=!playing;last=performance.now();if(playing && seconds>=8)renderAt(0);playState();});
  $('time').addEventListener('input',()=>{playing=false;playState();renderAt(Number($('time').value));});
  const resize=()=>{$('frame').style.transform=`scale(${$('frame').parentElement.clientWidth/1080})`;};
  new ResizeObserver(resize).observe($('frame').parentElement);
  window.VisualLibrary={renderAt,select,ids:charts.map(c=>c.id),svg:()=>chart.renderToSVGString(),stop:()=>{playing=false;playState();}};
  select(charts[0].id);resize();playState();
  function tick(now){if(playing){renderAt(seconds+(now-last)/1000);if(seconds>=8){playing=false;playState();}}last=now;requestAnimationFrame(tick);}
  requestAnimationFrame(tick);
})();
