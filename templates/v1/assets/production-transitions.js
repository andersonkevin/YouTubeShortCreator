/* Screen transitions adapted from HyperFrames (Apache-2.0).
   Source hashes and removed options are recorded in production provenance. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{const p=clamp(x);return p*p*(3-2*p);};
  const ramp=x=>{const p=clamp(x);return p<.5?8*p**4:1-8*(1-p)**4;};
  const cover=p=>smooth(2*Math.min(clamp(p),1-clamp(p)));
  const folds=[[88,124,70,106,136,80,112,62,98,130,69],[104,66,128,84,120,62,100,134,76,112,89]];
  function curtainPose(open,side) {
    let x=51-folds[side].reduce((a,b)=>a+b,0)*100/1920;
    return folds[side].map((width,i)=>{
      const u=i/(folds[side].length-1),sx=(1-open*(.86-.16*u))*(1-open**5);
      const state={x:(side?-1:1)*x,sx,sy:1-open*.07*u*u,width:width*100/1920};
      x+=state.width*sx;return state;
    });
  }
  function gridCells(width,height) {
    const cols=16,rows=Math.max(4,Math.min(40,Math.round(cols*height/width))),max=Math.hypot(cols/2,rows/2);
    return Array.from({length:cols*rows},(_,i)=>{
      const col=i%cols,row=Math.floor(i/cols);
      return {col,row,cols,rows,delay:Math.hypot(col+.5-cols/2,row+.5-rows/2)/max*.45};
    });
  }
  function gridScale(p,delay) {
    const q=p<=.5?p*2:2*(1-p);
    return 1.04*smooth((q-delay)/(1-delay));
  }
  function halftoneDots(width,height) {
    const cell=Math.max(8,width/30),cols=Math.ceil(width/cell)+3,rows=Math.ceil(height/cell)+3;
    let seed=0x4a17f03d;
    return Array.from({length:cols*rows},(_,i)=>{
      // Include an outside ring so shifted rows cover the left/top corners too.
      const row=Math.floor(i/cols)-1,x=(i%cols-1+(row%2===0?.25:.75))*cell,y=(row+.5)*cell;
      seed=(Math.imul(1664525,seed)+1013904223)>>>0;
      return {x,y,threshold:clamp(x/width+(seed/4294967296-.5)*.22)*.62,maximum:cell*.78};
    });
  }
  function dotRadius(dot,p,ink=false) {return dot.maximum*smooth((p+(ink?.07:0)-dot.threshold)/.38);}
  function whipState(p,width) {
    const value=clamp(p),tail=value<=.5?value*2:(1-value)*2;
    return {x:value===0?0:-width*ramp(value),blur:16*tail**4};
  }
  const svgNode=(tag,attrs,parent)=>{
    const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
    parent.appendChild(node);return node;
  };
  function mount(view,images,onsets,kind) {
    if(window.ShortCreatorPaperTransitions.kinds.includes(kind))
      return window.ShortCreatorPaperTransitions.mount(view,images,onsets,kind);
    const supported=['curtain','grid','halftone','fade-through','whip-pan'];
    if(!supported.includes(kind))throw new Error('Unknown screen transition');
    const w=view.clientWidth,h=view.clientHeight,index=view.closest('[data-production-index]').dataset.productionIndex;
    const make=(tag,css,parent=view)=>{const n=document.createElement(tag);n.className=css;parent.appendChild(n);return n;};
    view.dataset.screenSwap=kind;
    images.forEach(image=>image.classList.add('screen-swap-image'));
    let animate=()=>{};
    if(kind==='whip-pan') {
      const definitions=svgNode('svg',{width:0,height:0,'aria-hidden':'true',class:'screen-swap-defs'},view);
      const id='screen-whip-'+index,filter=svgNode('filter',{id,x:'-50%',y:'-20%',width:'200%',height:'140%'},svgNode('defs',{},definitions));
      const blur=svgNode('feGaussianBlur',{in:'SourceGraphic',stdDeviation:'0 0'},filter);
      const strip=make('div','screen-swap-strip');
      images.forEach((image,i)=>{strip.appendChild(image);image.style.left=i*w+'px';});
      const seam=make('div','screen-swap-seam',strip);
      animate=(p,active)=>{
        const state=whipState(active?p:0,w),x=active?-(active-1)*w+state.x:0;
        strip.style.transform=x===0?'none':`translateX(${x}px)`;
        strip.style.filter=state.blur===0?'none':`url(#${id})`;
        blur.setAttribute('stdDeviation',`${state.blur} 0`);
        seam.style.left=active*w+'px';seam.style.opacity=active&&p>0&&p<1?String(Math.sin(Math.PI*p)):'0';
        images.forEach((image,i)=>{image.style.visibility=i===active||(active>0&&p<1&&i===active-1)?'visible':'hidden';});
      };
    } else if(kind==='halftone') {
      const svg=svgNode('svg',{class:'screen-swap-overlay',viewBox:`0 0 ${w} ${h}`,width:w,height:h,'aria-hidden':'true'},view);
      const id='screen-halftone-'+index,clip=svgNode('clipPath',{id,clipPathUnits:'userSpaceOnUse'},svgNode('defs',{},svg));
      const dots=halftoneDots(w,h).map(dot=>({dot,window:svgNode('circle',{cx:dot.x,cy:dot.y,r:0},clip),
        ink:svgNode('circle',{cx:dot.x,cy:dot.y,r:0,fill:'var(--lime)'},svg)}));
      animate=(p,active)=>{
        svg.style.visibility=active&&p>0&&p<1?'visible':'hidden';
        images.forEach((image,i)=>{
          image.style.zIndex=i===active?'2':'0';
          image.style.clipPath=i===active&&active>0&&p<1?`url(#${id})`:'none';
          image.style.visibility=i===active||(active>0&&p<1&&i===active-1)?'visible':'hidden';
        });
        dots.forEach(({dot,window,ink})=>{window.setAttribute('r',String(dotRadius(dot,p)));ink.setAttribute('r',String(dotRadius(dot,p,true)));});
      };
    } else {
      const overlay=make('div','screen-swap-overlay');overlay.setAttribute('aria-hidden','true');
      if(kind==='curtain') {
        const panels=folds.map((widths,side)=>widths.map((_,i)=>{
          const fold=make('div','screen-swap-fold'+(side?' right':''),overlay);
          fold.style.setProperty('--crest',44+(i*5)%13+'%');return fold;
        }));
        animate=p=>panels.forEach((panel,side)=>curtainPose(1-cover(p),side).forEach((state,i)=>{
          const fold=panel[i];fold.style.width=(state.width+.2)+'%';
          fold.style.transform=`translateX(${state.x*w/100}px) scale(${state.sx},${state.sy})`;
          fold.style.setProperty('--shade',String(.34*(1-state.sx)));
        }));
      } else if(kind==='grid') {
        const cells=gridCells(w,h).map(cell=>{
          const node=make('div','screen-swap-cell',overlay);
          node.style.left=cell.col/cell.cols*100+'%';node.style.top=cell.row/cell.rows*100+'%';
          node.style.width=100/cell.cols+'%';node.style.height=100/cell.rows+'%';return {cell,node};
        });
        animate=p=>cells.forEach(({cell,node})=>{node.style.transform=`scale(${gridScale(p,cell.delay)})`;});
      } else {
        overlay.classList.add('screen-swap-wash');animate=p=>{overlay.style.opacity=String(cover(p));};
      }
      const paint=animate;
      animate=(p,active)=>{
        overlay.style.visibility=active&&p>0&&p<1?'visible':'hidden';paint(active?p:0);
        const shown=active>0&&p<.5?active-1:active;
        images.forEach((image,i)=>{image.style.visibility=i===shown?'visible':'hidden';});
      };
    }
    return t=>{
      let active=0;onsets.forEach((onset,i)=>{if(t>=onset)active=i;});
      const p=window.ShortCreatorStory.progress(t,onsets[active]);
      animate(p,active);view.dataset.swapIndex=String(active);view.dataset.swapProgress=String(p);
    };
  }
  window.ShortCreatorTransitions={cover,curtainPose,gridCells,gridScale,halftoneDots,dotRadius,whipState,mount};
})();
