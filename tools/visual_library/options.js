'use strict';
window.ShortCreatorVisualOptions = function(c, config = {}) {
  const {icons = {}, colors = ['#def0a2', '#ade8ed', '#f2b9c9', '#d0bef6']} = config;
  const {font = 'Arial', background = '#000', surface = '#151a1d', scene = false, width = 880, height = 810, chartStyle = 'standard'} = config;
  const formatNumber = value => Math.abs(value)>=1e4 || (value!==0 && Math.abs(value)<.01)
    ? Number(value.toPrecision(3)).toExponential() : String(Number(value.toFixed(2)));
  const axis = () => ({axisLine:{lineStyle:{color:scene?colors[1]:'#70858f'}}, axisLabel:{color:'#e7ecef',fontSize:24,hideOverlap:!scene,...(scene?{width:['heatmap','correlation'].includes(c.kind)?130:105,overflow:'break',lineHeight:24,interval:0,formatter:value=>typeof value==='number'?formatNumber(value):value}:{})}, splitLine:{lineStyle:{color:'#303a40'}}, nameTextStyle:{color:'#e7ecef',fontSize:24}, nameGap:45});
  const label = {show:true,color:'#f8fafc',fontSize:25};
    const d = c.data;
    const common = {animation:false,backgroundColor:background,color:colors,textStyle:{fontFamily:font,fontSize:26},aria:{enabled:true},tooltip:{show:false},grid:{left:115,right:35,top:85,bottom:100},legend:{top:15,textStyle:{color:'#f8fafc',fontSize:25},itemGap:30},series:[]};
    if(scene) common.grid={left:135,right:50,top:90,bottom:105};
    const writeText=(x,y,value,size=32,color='#f8fafc',align='center')=>({type:'text',silent:true,style:{x,y,text:value,font:`${scene?'600 ':''}${size}px ${font}`,fill:color,align,verticalAlign:'middle'}});
    const box=(x,y,width,height,color)=>({type:'rect',silent:true,shape:{x,y,width,height,r:8},style:{fill:surface,stroke:color,lineWidth:2}});
    if(scene && c.kind==='flow') {
      const graphic=[];
      const gap=28, cardHeight=Math.min(132,(height-32-gap*(d.steps.length-1))/d.steps.length);
      const top=(height-(cardHeight*d.steps.length+gap*(d.steps.length-1)))/2;
      d.steps.forEach((step,i)=>{
        const y=top+i*(cardHeight+gap), center=y+cardHeight/2;
        graphic.push(box(20,y,width-40,cardHeight,colors[i%colors.length]),{type:'circle',silent:true,shape:{cx:72,cy:center,r:27},style:{fill:colors[i%colors.length]}},{type:'image',silent:true,style:{image:icons[step.icon],x:52,y:center-20,width:40,height:40}},writeText((width+120)/2,center,step.label,30));
        if(i<d.steps.length-1)graphic.push({type:'line',silent:true,shape:{x1:width/2,y1:y+cardHeight+4,x2:width/2,y2:y+cardHeight+20},style:{stroke:colors[1],lineWidth:3}},{type:'polygon',silent:true,shape:{points:[[width/2-6,y+cardHeight+18],[width/2+6,y+cardHeight+18],[width/2,y+cardHeight+25]]},style:{fill:colors[1]}});
      });
      return {...common,graphic};
    }
    if(scene && c.kind==='metric')return {...common,graphic:[box(20,30,width-40,height-60,colors[0]),writeText(width/2,110,d.label,32),writeText(width/2,height*.45,String(d.value),72,colors[0]),writeText(width/2,height*.65,d.unit,30,colors[1]),writeText(width/2,height-100,d.context,26)]};
    if(scene && c.kind==='comparison') {
      const graphic=[], columnWidth=(width-36)/2;
      [d.left,d.right].forEach((column,i)=>{
        const x=4+i*(columnWidth+28);
        graphic.push(box(x,30,columnWidth,height-60,colors[i]),writeText(x+columnWidth/2,100,column.label,28,colors[i]));
        column.items.forEach((value,j)=>graphic.push(writeText(x+columnWidth/2,210+j*105,value,26)));
      });
      return {...common,graphic};
    }
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
      return {...common,xAxis:{...axis(),type:'category',data:d.categories,axisLabel:{...axis().axisLabel,interval:0}},yAxis:{...axis(),type:'value',name:d.unit,min:0,...(scene?{nameLocation:'middle',nameGap:95}:{})},series:d.series.map((s,i)=>({name:s.label,type:c.kind,data:s.values,stack:chartStyle==='stacked'?'components':undefined,symbol:i?'diamond':'circle',symbolSize:15,lineStyle:{width:5},barMaxWidth:75,label:{...label,show:!scene,position:'top'},itemStyle:{borderRadius:c.kind==='bar'&&chartStyle!=='stacked'?[4,4,0,0]:0},emphasis:{disabled:true}}))};
    }
    if(c.kind === 'pie') {
      if(scene) return {...common,legend:{orient:'vertical',left:465,top:100,itemGap:22,itemWidth:20,itemHeight:20,selectedMode:false,textStyle:{color:'#f8fafc',fontFamily:font,fontSize:24,lineHeight:30},formatter:name=>{const i=d.categories.indexOf(name),total=d.values.reduce((a,b)=>a+b,0);return name+'\n'+d.values[i]+' ('+(d.values[i]/total*100).toFixed(1)+'%)';}},series:[{type:'pie',radius:[100,175],center:[230,270],label:{show:false},data:d.categories.map((name,i)=>({name,value:d.values[i]})),itemStyle:{borderColor:background,borderWidth:4},emphasis:{disabled:true}}]};
      return {...common,legend:{...common.legend,bottom:35,top:undefined},series:[{type:'pie',radius:['29%','57%'],center:['50%','46%'],avoidLabelOverlap:true,label:{color:'#f8fafc',fontSize:25,formatter:'{b}\n{d}%',lineHeight:34},labelLine:{length:18,length2:12,lineStyle:{color:'#b6c4cc'}},data:d.categories.map((name,i)=>({name,value:d.values[i]})),itemStyle:{borderColor:'#000',borderWidth:4},emphasis:{disabled:true}}]};
    }
    if(c.kind === 'scatter') {
      return {...common,xAxis:{...axis(),type:'value',name:d.x_unit,nameLocation:'middle',...(scene?{axisLabel:{...axis().axisLabel,margin:18}}:{})},yAxis:{...axis(),type:'value',name:d.y_unit,...(scene?{nameLocation:'middle',nameGap:95}:{})},series:[{type:'scatter',data:d.points,symbolSize:23,itemStyle:{color:colors[1],opacity:1},emphasis:{disabled:true}}]};
    }
    if(c.kind === 'heatmap' || c.kind === 'correlation') {
      const correlation = c.kind === 'correlation';
      const rows = correlation ? d.labels : d.rows;
      const columns = correlation ? d.labels : d.columns;
      const values = correlation ? c.derived.matrix : d.values;
      return {...common,grid:{left:145,right:35,top:30,bottom:155},xAxis:{...axis(),type:'category',data:columns,splitArea:{show:false},axisLabel:{...axis().axisLabel,interval:0}},yAxis:{...axis(),type:'category',data:rows,inverse:true,splitArea:{show:false}},visualMap:{min:correlation?-1:0,max:correlation?1:100,orient:'horizontal',left:'center',bottom:25,itemWidth:25,itemHeight:270,precision:correlation?1:0,text:correlation?['+1','-1']:['100%','0%'],textStyle:{color:'#f8fafc',fontSize:24},inRange:{color:scene?[colors[2],'#e6e9ed',colors[correlation?1:0]]:correlation?['#f2b9c9','#e6e9ed','#ade8ed']:['#f2b9c9','#e6e9ed','#def0a2']},calculable:false},series:[{type:'heatmap',data:values.flatMap((row,y)=>row.map((v,x)=>[x,y,v])),label:{show:true,color:'#101214',fontSize:scene?24:29,fontWeight:'bold',formatter:p=>correlation?p.value[2].toFixed(2):p.value[2]+'%'},itemStyle:{borderColor:background,borderWidth:4},emphasis:{disabled:true}}]};
    }
    if(c.kind === 'timeline') {
      return {...common,grid:{left:170,right:scene?100:35,top:55,bottom:90},xAxis:{...axis(),type:'value',name:d.unit,min:0,...(scene?{nameLocation:'middle'}:{})},yAxis:{...axis(),type:'category',data:d.stages.map(s=>s.label),inverse:true},series:[{type:'bar',stack:'time',silent:true,itemStyle:{color:'transparent'},data:d.stages.map(s=>s.start),emphasis:{disabled:true}},{type:'bar',stack:'time',barMaxWidth:65,data:d.stages.map((s,i)=>({value:s.end-s.start,itemStyle:{color:colors[i%colors.length]}})),label:{show:true,color:scene?'#f8fafc':'#101214',fontSize:26,fontWeight:'bold',position:scene?'right':'inside',formatter:p=>scene?formatNumber(p.value):Number(p.value.toFixed(2))},emphasis:{disabled:true}}]};
    }
    return {...common,...(scene?{graphic:d.points.map((p,i)=>writeText(25+(i%2)*400,430+Math.floor(i/2)*32,`${i+1}. ${p.label}`,24,'#f8fafc','left'))}:{}),geo:{map:'natural-earth',roam:false,left:30,right:30,top:scene?55:90,bottom:150,silent:true,itemStyle:{areaColor:'#303f46',borderWidth:0},emphasis:{disabled:true},label:{show:false}},series:[{type:'scatter',coordinateSystem:'geo',symbolSize:22,data:d.points.map(p=>({name:p.label,value:[p.lon,p.lat,p.value]})),itemStyle:{color:colors[0],opacity:1,borderWidth:2,borderColor:background},label:{show:true,formatter:scene?p=>String(p.dataIndex+1):'{b}',position:'top',distance:10,color:'#f8fafc',fontSize:22,backgroundColor:background,padding:[4,6]},labelLayout:{hideOverlap:!scene},emphasis:{disabled:true}}]};
};
