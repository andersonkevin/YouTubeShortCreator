/* Bounded HyperFrames title layouts and editorial callouts, Apache-2.0.
   Original source hashes and the omitted controls are in production provenance. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),out=x=>1-(1-clamp(x))**3;
  const smooth=x=>{const p=clamp(x);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  const hash=(n,seed)=>window.ShortCreatorAnnotationInk.hash(n,seed);
  const chars=text=>Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text),item=>item.segment);
  const set=(node,attrs)=>{for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));};
  function svgNode(tag,attrs,parent) {
    const n=document.createElementNS('http://www.w3.org/2000/svg',tag);set(n,attrs);parent.appendChild(n);return n;
  }
  function roughUnderline(width) {
    const n=Math.max(6,Math.round(width/90));let d=`M 2 ${(16+hash(0,8)*4).toFixed(1)}`;
    for(let i=1;i<=n;i++) {
      const x=width/n*i,y=16+hash(i*5+1,8)*6,cx=x-width/n/2+hash(i*5+2,8)*10,cy=16+(i%2?-1:1)*(8+hash(i*5+3,8)*4);
      d+=` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }
  function cloudPath(w,h,side='left') {
    if(!['left','right'].includes(side))throw new Error('Unknown cloud tail');
    const cx=w/2,cy=h/2-14,rx=w/2-12,ry=h/2-34,seed=6;
    const points=Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2,r=1+hash(i*11+3,seed)*.06;return [cx+Math.cos(a)*rx*r,cy+Math.sin(a)*ry*r];});
    const pair=p=>p.map(v=>v.toFixed(1)).join(' '),mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
    let d='M '+pair(mid(points[0],points[15]));
    points.forEach((p,i)=>{d+=' Q '+pair(p)+' '+pair(mid(p,points[(i+1)%16]));});
    const left=side==='left',bx=cx+(left?-rx*.45:rx*.45),by=cy+ry*.92,tx=bx+(left?-45:45),ty=by+90;
    d+=` Z M ${(bx-26).toFixed(1)} ${(by-6).toFixed(1)} Q ${(bx-8+hash(31,seed)*6).toFixed(1)} ${((by+ty)/2).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)} Q ${(bx+18).toFixed(1)} ${((by+ty)/2).toFixed(1)} ${(bx+30).toFixed(1)} ${(by-2).toFixed(1)}`;
    return d;
  }
  function wavePath(w,h) {
    // Preserve room for the approved font ascent and rotated glyph corners.
    const amplitude=Math.min(h-260,(w-160)*.28),baseline=(h-amplitude)/2+70;
    const x=v=>80+(v-220)*(w-160)/1560,y=v=>baseline+(v-380)*amplitude/440;
    return `M ${x(220)} ${y(700)} C ${x(520)} ${y(480)}, ${x(900)} ${y(820)}, ${x(1230)} ${y(560)} S ${x(1700)} ${y(380)}, ${x(1780)} ${y(420)}`;
  }
  function typingState(kind,p,count) {
    const cloud=kind==='speech-cloud';
    if(!cloud&&kind!=='path-wave')throw new Error('Unknown typed title layout');
    if(p>=1)return {draw:1,fill:cloud?.94:0,letters:Array(count).fill(1)};
    const delay=cloud?Math.min(.03,1.8/count):Math.min(.05,2.6/count),start=cloud?.9:.7,duration=cloud?.02:.03;
    const t=clamp(p)*(start+delay*Math.max(0,count-1)+duration);
    return {draw:smooth((t-(cloud?0:.2))/(cloud?.8:.9)),fill:cloud?.94*out((t-.55)/.4):0,
      letters:Array.from({length:count},(_,i)=>clamp((t-start-delay*i)/duration))};
  }
  function emphasisState(p) {
    p=clamp(p);return {x:40-100*(1-Math.cos(Math.PI*p))/2,opacity:out(p)};
  }
  function noteState(p) {
    const t=clamp(p)*.96,pop=clamp((t-.42)/.32);
    return {draw:smooth(t/.6),connector:out((t-.36)/.45),note:out((t-.6525)/.3),
      scale:1+.045*(pop<.5?1-(1-pop*2)**2:1-(pop*2-1)**2)};
  }
  function note(node,mark,text) {
    const host=node.closest('.production-content');host.classList.add('production-title-noted');
    const layer=document.createElement('div');layer.className='title-note-layer';host.appendChild(layer);
    const label=document.createElement('p');label.className='title-note';label.textContent=text;label.dataset.fit='true';layer.appendChild(label);
    const x=mark.offsetLeft+mark.offsetWidth/2,left=Math.max(0,Math.min(host.clientWidth-label.offsetWidth-12,x+80));
    layer.style.top=node.offsetTop+node.offsetHeight+6+'px';label.style.left=left+'px';
    const svg=svgNode('svg',{viewBox:`0 0 ${host.clientWidth} 112`,width:host.clientWidth,height:112,'aria-hidden':'true'},layer);
    const dx=left+Math.min(40,label.offsetWidth/2)-x,px=v=>x+(v-10)/208*dx,py=v=>(94-v)/80*48;
    const path=svgNode('path',{d:`M ${px(10)} ${py(94)} C ${px(52)} ${py(82)}, ${px(96)} ${py(52)}, ${px(148)} ${py(32)} C ${px(176)} ${py(21)}, ${px(200)} ${py(16)}, ${px(218)} ${py(14)}`,fill:'none',stroke:'var(--lime)','stroke-width':3,'stroke-linecap':'round'},svg);
    const length=path.getTotalLength();set(path,{'stroke-dasharray':`${length} ${length}`});
    return p=>{
      const s=noteState(p);set(path,{'stroke-dashoffset':length*(1-s.connector),opacity:s.connector>0?.9:0});
      label.style.opacity=String(s.note);label.style.transform=s.note===1?'none':`translateY(${16*(1-s.note)}px)`;
      layer.dataset.noteProgress=String(s.note);layer.dataset.connectorProgress=String(s.connector);
    };
  }
  function emphasis(host,word,onset,make,layout='emphasis') {
    host.classList.add('production-title-emphasis');
    host.dataset.titleLayout=layout;
    const ink=make('div','title-backdrop-word',word,host);ink.setAttribute('aria-hidden','true');
    if(layout==='layered-emphasis') {
      ink.classList.add('title-layered-word');
      const scale=host.clientWidth/ink.scrollWidth;
      return time=>{const p=window.ShortCreatorStory.progress(time,onset);
        ink.style.transform=`scaleX(${scale}) scaleY(2.8)`;ink.style.opacity=String(.08*out(p/(.1/.8)));
        ink.dataset.emphasisProgress=String(p);};
    }
    return time=>{const p=window.ShortCreatorStory.progress(time,onset),s=emphasisState(p);ink.style.transform=`translateX(${s.x}px)`;ink.style.opacity=String(.08*s.opacity);ink.dataset.emphasisProgress=String(p);};
  }
  function mount(host,c,onset,make) {
    host.dataset.titleLayout=c.layout;host.classList.add('production-title-designed');
    const kicker=make('p','prod-kicker',c.kicker,host,true),board=make('div','title-design-board',null,host);
    const subtitle=make('p','prod-subtitle',c.subtitle,host,true),width=board.clientWidth,height=board.clientHeight;
    const svg=svgNode('svg',{viewBox:`0 0 ${width} ${height}`,width,height,class:'title-design-svg'},board);
    let letters,path,fill=null,length;
    if(c.layout==='speech-cloud') {
      const d=cloudPath(width-32,height-48,c.tail||'left');
      const group=svgNode('g',{},svg);
      fill=svgNode('path',{d,fill:'var(--surface)',stroke:'none'},group);
      path=svgNode('path',{d,fill:'none',stroke:'var(--lime)','stroke-width':5,'stroke-linecap':'round','stroke-linejoin':'round'},group);
      const placement=window.ShortCreatorAnnotationInk.fit(path.getBBox(),{x:12,y:12,width:width-24,height:height-24},'cloud');
      set(group,{transform:`translate(${placement.x} ${placement.y}) scale(${placement.scale})`});
      const title=make('h2','prod-title title-cloud-copy',null,board,true),inner=make('span','title-cloud-line',null,title);
      title.setAttribute('aria-label',c.title);
      letters=chars(c.title).map(char=>make('span','title-design-glyph',char,inner));
    } else if(c.layout==='path-wave') {
      const id='title-wave-'+host.closest('[data-production-index]').dataset.productionIndex;
      const defs=svgNode('defs',{},svg);path=svgNode('path',{id,d:wavePath(width,height),fill:'none'},defs);
      const guide=svgNode('path',{d:path.getAttribute('d'),fill:'none',stroke:'var(--line)','stroke-width':3,'stroke-dasharray':'2 14','stroke-linecap':'round'},svg);
      const title=svgNode('text',{class:'prod-title title-path-copy','aria-label':c.title,'data-fit':'true','text-anchor':'middle'},svg);
      const textPath=svgNode('textPath',{href:'#'+id,startOffset:'50%'},title);
      letters=chars(c.title).map(char=>{const span=svgNode('tspan',{class:'title-design-glyph'},textPath);span.textContent=char;return span;});
      if(title.getComputedTextLength()>path.getTotalLength()-40)throw new Error('Path title exceeds the approved font size; shorten the supplied title');
      path=guide;
    } else throw new Error('Unknown designed title layout');
    length=path.getTotalLength();if(c.layout==='speech-cloud')set(path,{'stroke-dasharray':`${length} ${length}`});
    return time=>{
      const p=window.ShortCreatorStory.progress(time,onset),s=typingState(c.layout,p,letters.length);
      board.dataset.titleDesignProgress=String(p);board.dataset.titleDesignState=JSON.stringify(s);
      kicker.style.opacity=subtitle.style.opacity=String(out(p));
      set(path,{'stroke-dashoffset':length*(1-s.draw),opacity:p>0?1:0});
      if(fill)set(fill,{opacity:s.fill});
      letters.forEach((letter,i)=>{letter.style.opacity=String(s.letters[i]);});
    };
  }
  window.ShortCreatorTitleDesigns={roughUnderline,cloudPath,wavePath,typingState,emphasisState,noteState,note,emphasis,mount};
})();
