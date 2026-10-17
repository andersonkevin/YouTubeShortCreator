/* Bounded adaptations of HyperFrames us-map-hex, us-map-bubble and us-map-flow.
   Apache-2.0 source hashes/modifications are retained in production provenance. */
(() => {
  'use strict';
  const grid={ME:[10,0],VT:[9,1],NH:[10,1],WA:[0,2],MT:[1,2],ND:[2,2],MN:[3,2],WI:[4,2],MI:[7,2],NY:[8,2],MA:[9,2],RI:[10,2],ID:[0,3],WY:[1,3],SD:[2,3],IA:[3,3],IL:[4,3],IN:[5,3],OH:[6,3],PA:[7,3],NJ:[8,3],CT:[9,3],OR:[0,4],NV:[1,4],CO:[2,4],NE:[3,4],MO:[4,4],KY:[5,4],WV:[6,4],VA:[7,4],MD:[8,4],DE:[9,4],CA:[0,5],UT:[1,5],NM:[2,5],KS:[3,5],AR:[4,5],TN:[5,5],NC:[6,5],SC:[7,5],DC:[8,5],AZ:[1,6],OK:[3,6],LA:[4,6],MS:[5,6],AL:[6,6],GA:[7,6],HI:[0,7],TX:[3,7],FL:[7,7],AK:[0,8]};
  const clamp=x=>Math.max(0,Math.min(1,x)),out=x=>1-(1-clamp(x))**3;
  const smooth=x=>{const p=clamp(x);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  function pop(value,overshoot=1.7) {const p=clamp(value);if(p===0||p===1)return p;const x=p-1;return 1+(overshoot+1)*x**3+overshoot*x*x;}
  function hexLayout(width,height) {
    // Retain the source grid; point-up geometry corrects its overlapping flat-up cells.
    const raw=Object.entries(grid).map(([id,[col,row]])=>({id,x:Math.sqrt(3)*(col+(row%2)/2),y:1.5*row}));
    const minX=Math.min(...raw.map(p=>p.x))-Math.sqrt(3)/2,maxX=Math.max(...raw.map(p=>p.x))+Math.sqrt(3)/2;
    const minY=-1,maxY=13,r=Math.min((width-24)/(maxX-minX),(height-16)/(maxY-minY));
    const left=(width-(maxX-minX)*r)/2,top=(height-(maxY-minY)*r)/2;
    const cells=raw.map(p=>({...p,x:left+(p.x-minX)*r,y:top+(p.y-minY)*r,r:r*.92}));
    const cx=cells.reduce((sum,p)=>sum+p.x,0)/cells.length,cy=cells.reduce((sum,p)=>sum+p.y,0)/cells.length;
    const order=[...cells].sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy));
    return cells.map(cell=>({...cell,rank:order.findIndex(p=>p.id===cell.id)}));
  }
  function hexPoints(cell) {
    return Array.from({length:6},(_,i)=>{const angle=(-90+i*60)*Math.PI/180;return {x:cell.x+Math.cos(angle)*cell.r,y:cell.y+Math.sin(angle)*cell.r};});
  }
  function contained(width,height,imageWidth,imageHeight) {
    const scale=Math.min(width/imageWidth,height/imageHeight),w=imageWidth*scale,h=imageHeight*scale;
    return {x:(width-w)/2,y:(height-h)/2,width:w,height:h};
  }
  function arc(from,to,top=0) {
    return {from,to,control:{x:(from.x+to.x)/2,y:Math.max(top,Math.min(from.y,to.y)-Math.abs(to.x-from.x)*.15)}};
  }
  function arcPoint(path,t) {
    const p=clamp(t),q=1-p;
    return {x:q*q*path.from.x+2*q*p*path.control.x+p*p*path.to.x,
      y:q*q*path.from.y+2*q*p*path.control.y+p*p*path.to.y};
  }
  const bubbleRadius=(value,maximum,extent)=>extent*.06*Math.sqrt(value/maximum);
  const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
  function shape(tag,attrs,parent) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);set(node,attrs);parent.appendChild(node);return node;
  }
  function text(svg,x,y,value,size=22) {
    const node=shape('text',{x,y,fill:'white','font-size':size,'text-anchor':'middle','dominant-baseline':'middle'},svg);
    node.textContent=value;return node;
  }
  function mount(host,c,onsets,data,make,reveal) {
    if(c.style==='spain'||c.style==='us')return window.ShortCreatorRegionalMap.mount(host,c,onsets,make,reveal);
    if(c.style==='flight')return window.ShortCreatorMapFlight.mount(host,c,onsets,data,make,reveal);
    if(c.style==='world')return window.ShortCreatorWorldMap.mount(host,c,onsets,make,reveal);
    if(c.style==='spotlight')return window.ShortCreatorMapSpotlight.mount(host,c,onsets,data,make,reveal);
    const title=make('h2','prod-heading',c.heading,host,true),insight=make('p','data-insight',c.insight,host,true);
    make('p','data-source',`${c.source.kind.toUpperCase()} / ${c.source.label} / ${c.source.as_of}`,host,true);
    make('p','data-reference',c.source.reference,host,true);
    const board=make('div','map-board',null,host);board.dataset.mapStyle=c.style;
    const picture=make('div','map-picture',null,board);
    const callout=make('div','map-callout',null,board);
    const label=make('span','map-label','',callout,true),value=make('span','map-value','',callout,true);
    const scale=make('p','map-scale',`0 / ${c.maximum} ${c.unit}`+(c.style==='us-hex'?' / blank = no data':''),board,true);
    let image=null;
    if(c.style!=='us-hex') {image=make('img','map-image',null,picture);image.src=data.assets[c.image];image.alt='';}
    const W=picture.clientWidth,H=picture.clientHeight,svg=shape('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,class:'map-overlay'},picture);
    let initialized=false,items=[];
    function init() {
      if(c.style==='us-hex') {
        const values=new Map(c.values.map(item=>[item.region,item.value]));
        items=hexLayout(W,H).map(cell=>{
          const present=values.has(cell.id),amount=present?values.get(cell.id):null;
          const points=hexPoints(cell).map(point=>`${point.x},${point.y}`).join(' ');
          const group=shape('g',{'data-map-region':cell.id,'data-map-value':present?amount:'missing'},svg);
          const poly=shape('polygon',{points,fill:present?'var(--lime)':'var(--surface)',
            'fill-opacity':present?.08+.28*amount/c.maximum:1,stroke:'var(--cyan)','stroke-width':1.5},group);
          const name=text(group,cell.x,cell.y,cell.id);name.dataset.mapLabel='true';
          return {cell,group,poly,name};
        });
      } else {
        if(!image.complete||!image.naturalWidth)throw new Error('Map base image must decode before rendering');
        const box=contained(W,H,image.naturalWidth,image.naturalHeight);
        const points=c.points.map(point=>({x:box.x+point.x*box.width,y:box.y+point.y*box.height}));
        const markers=points.map((point,i)=>{
          const group=shape('g',{'data-map-point':i},svg);
          const r=c.style==='bubbles'?bubbleRadius(c.points[i].value,c.maximum,Math.min(box.width,box.height)):5;
          const circle=shape('circle',{cx:point.x,cy:point.y,r,fill:'var(--lime)','fill-opacity':.55,stroke:'var(--lime)','stroke-width':1.5},group);
          if(c.style==='bubbles')circle.dataset.mapValue=String(c.points[i].value);
          const name=text(group,point.x,point.y-r-16,String(i+1));name.dataset.mapLabel='true';
          return {group,circle,name,point,r};
        });
        if(c.style==='bubbles')items=markers;
        else {
          const routes=shape('g',{'data-map-routes':'true'},svg);svg.insertBefore(routes,svg.firstChild);
          items=c.flows.map((flow,i)=>{
            const curve=arc(points[flow.from],points[flow.to],box.y+Math.min(6,box.height*.05));
            const d=`M ${curve.from.x} ${curve.from.y} Q ${curve.control.x} ${curve.control.y} ${curve.to.x} ${curve.to.y}`;
            const path=shape('path',{d,fill:'none',stroke:'var(--lime)','stroke-width':1.5+flow.value/c.maximum*2.5,
              'data-map-flow':i,'data-map-value':flow.value},routes),length=path.getTotalLength();
            set(path,{'stroke-dasharray':`${length} ${length}`});
            const dot=shape('circle',{r:4,fill:'white','data-map-traveler':i},routes);
            return {path,length,dot,curve};
          });
        }
      }
      initialized=true;
    }
    return time=>{
      if(!initialized)init();
      const amounts=onsets.map(onset=>window.ShortCreatorStory.progress(time,onset));
      let active=-1;onsets.forEach((onset,i)=>{if(Math.floor(time*30+1e-7)>=Math.ceil(onset*30))active=i;});
      const p=active<0?0:amounts[active];board.dataset.mapBeat=String(active);board.dataset.mapProgress=String(p);
      reveal(title,out(amounts[0]),24);reveal(insight,out(amounts[0]),18);board.style.opacity=String(out(amounts[0]));
      scale.style.opacity=String(out(amounts[0]));
      if(c.style==='us-hex') {
        items.forEach(({cell,group,poly,name})=>{
          const q=clamp((amounts[0]*(.4+.03*(items.length-1))-cell.rank*.03)/.4),size=pop(q,1.4);
          const selected=active>0&&cell.id===c.focus[active-1];
          set(group,{opacity:q,transform:`translate(${cell.x} ${cell.y}) scale(${size}) translate(${-cell.x} ${-cell.y})`});
          set(poly,{stroke:selected?'var(--lime)':'var(--cyan)','stroke-width':selected?3.5:1.5});
          name.style.opacity=String(out(q));
        });
      } else if(c.style==='bubbles')items.forEach(({circle,name,point,r},i)=>{
        const q=amounts[i+1],size=pop(q);set(circle,{opacity:q,r:r*size});
        name.style.opacity=String(out(q));circle.dataset.mapProgress=String(q);
        set(name,{y:point.y-r-16});
      });
      else items.forEach(({path,length,dot},i)=>{
        const q=amounts[i+1],draw=smooth(q/.6),travel=clamp((q-.4)/.55);
        const eased=travel<.5?2*travel*travel:1-(-2*travel+2)**2/2,point=path.getPointAtLength(eased*length);
        set(path,{opacity:q===0?0:.4+.6*c.flows[i].value/c.maximum,'stroke-dashoffset':length*(1-draw)});
        set(dot,{cx:point.x,cy:point.y,opacity:q>.4&&q<1?Math.min(1,(1-q)/.05)*.9:0});
        path.dataset.mapProgress=String(q);
      });
      label.textContent='';value.textContent='';
      if(active>0) {
        let titleText,number;
        if(c.style==='us-hex') {titleText=c.focus[active-1];number=c.values.find(item=>item.region===titleText).value;}
        else if(c.style==='bubbles') {titleText=`${active}. ${c.points[active-1].label}`;number=c.points[active-1].value;}
        else {const flow=c.flows[active-1];titleText=`${c.points[flow.from].label} → ${c.points[flow.to].label}`;number=flow.value;}
        label.textContent=titleText;value.textContent=String(number)+' '+c.unit;
      }
      reveal(callout,active>0?out(p):0,12);
    };
  }
  window.ShortCreatorMaps={grid,hexLayout,hexPoints,contained,arc,arcPoint,bubbleRadius,pop,mount};
})();
