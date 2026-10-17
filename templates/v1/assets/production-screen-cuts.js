/* HyperFrames mk-clone-wall-transition, Apache-2.0.
   A verified outgoing still contracts over an explicitly supplied word wall. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,p)=>a+(b-a)*p;
  const inOut=(x,power)=>{const p=clamp(x);return p<.5?2**(power-1)*p**power:1-(-2*p+2)**power/2;};
  function state(progress) {
    if(!Number.isFinite(progress))throw new Error('Invalid clone-wall progress');
    const p=clamp(progress),t=p*2.4,shrink=inOut((t-.2)/.75,4),away=clamp((t-1.35)/.4)**3;
    return {p,x:shrink/3,y:shrink*330/1080,width:mix(1,1/3,shrink),height:mix(1,420/1080,shrink),
      radius:40*shrink,scale:mix(1,.6,away),cardAlpha:1-away,cardVisible:t<1.76,
      sweep:inOut((t-.85)/.65,4),wallAlpha:1-inOut((t-1.9)/.45,3),visible:t<2.36,after:t>=1.75};
  }
  function grid(width,height,wordWidth) {
    if(![width,height,wordWidth].every(n=>Number.isFinite(n)&&n>0))throw new Error('Invalid word wall geometry');
    const fit=Math.min(width/1920,height/1080),font=240*fit,gapX=90*fit,gapY=60*fit,tile=wordWidth+gapX;
    const rows=Math.ceil(height/(font+gapY))+1,columns=Math.ceil(width/tile)+3;
    if(rows*columns>1000)throw new Error('Word wall exceeds bounded tile budget');
    return {fit,font,gapX,gapY,tile,rows,columns};
  }
  function mount(view,images,onsets,word) {
    const width=view.clientWidth,height=view.clientHeight;
    const make=(tag,css,parent,text)=>{const node=document.createElement(tag);node.className=css;if(text!==undefined)node.textContent=text;parent.appendChild(node);return node;};
    const overlay=make('div','clone-wall-overlay',view);overlay.setAttribute('aria-hidden','true');
    const wall=make('div','clone-wall',overlay),normal=make('div','clone-wall-plane',wall),inverted=make('div','clone-wall-plane clone-wall-inverted',wall);
    const probe=make('span','clone-wall-word',normal,word),font=240*Math.min(width/1920,height/1080);
    probe.style.fontSize=font+'px';
    const layout=grid(width,height,probe.offsetWidth);probe.remove();
    for(const plane of [normal,inverted])for(let r=0;r<layout.rows;r++) {
      const row=make('div','clone-wall-row',plane);
      row.style.fontSize=layout.font+'px';row.style.top=r*(layout.font+layout.gapY)-layout.font*.35+'px';
      row.style.left=-(r%2?layout.tile/2:0)-layout.tile+'px';
      for(let c=0;c<layout.columns;c++)make('span','clone-wall-word',row,word).style.marginRight=layout.gapX+'px';
    }
    const card=make('div','clone-wall-card',overlay),copies=images.slice(0,-1).map(image=>{
      const copy=make('img','clone-wall-image',card);copy.alt='';copy.src=image.getAttribute('src');return copy;
    });
    images.forEach(image=>image.classList.add('screen-swap-image'));
    return time=>{
      const frame=Math.floor(time*30+1e-7);let active=0;
      onsets.forEach((at,i)=>{if(frame>=Math.ceil(at*30))active=i;});
      const p=window.ShortCreatorStory.progress(time,onsets[active]),s=state(p);
      const moving=active>0&&p>0&&p<1&&s.visible;
      overlay.style.display=moving?'block':'none';
      const shown=active===0?0:s.after?active:active-1;
      images.forEach((image,i)=>{image.style.visibility=i===shown?'visible':'hidden';image.style.clipPath='none';});
      copies.forEach((copy,i)=>copy.style.visibility=i===active-1&&s.cardVisible?'visible':'hidden');
      wall.style.opacity=String(s.wallAlpha);inverted.style.clipPath=`inset(0 ${(1-s.sweep)*100}% 0 0)`;
      Object.assign(card.style,{left:s.x*width+'px',top:s.y*height+'px',width:s.width*width+'px',height:s.height*height+'px',
        borderRadius:s.radius*layout.fit+'px',transform:`scale(${s.scale})`,opacity:String(s.cardAlpha),visibility:s.cardVisible?'visible':'hidden'});
      view.dataset.screenSwap='clone-wall';view.dataset.swapIndex=String(active);view.dataset.swapProgress=String(p);
      view.dataset.cloneWall=JSON.stringify({...s,word,rows:layout.rows,columns:layout.columns});
    };
  }
  window.ShortCreatorScreenCuts={state,grid,mount};
})();
