/* Adapted from HyperFrames colorama-wipe (Apache-2.0).
   Approved-font rows use the source compound blur and tilted mask; native text owns the hold. */
(() => {
  'use strict';
  const levels=Object.freeze([.04,.14,.3,.55,1]),scale=.5;
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=p=>{p=clamp(p);return p<.5?4*p**3:1-4*(1-p)**3;};
  function state(progress,width,size) {
    if(![progress,width,size].every(Number.isFinite)||width<=0||size<=0)throw new Error('Invalid colorama geometry');
    const p=clamp(progress),time=p*1.0625,feather=2.4*size,blur=.15*size;
    return {p,time,feather,blur,pad:Math.ceil(feather*.6+blur*3),
      front:-feather*.4+(width+feather*1.7)*ease(time/.75),
      crisp:clamp((time-.7125)/.35),frame:Math.round(time*30)};
  }
  function hash(x,y,frame) {
    let h=(x*374761393+y*668265263+frame*2147483647)|0;
    h=(h^(h>>>13))*1274126177;
    return ((h^(h>>>16))>>>0)/4294967296;
  }
  function lut(colors) {
    if(colors.length!==4||!colors.every(color=>/^#[a-f\d]{6}$/i.test(color)))throw new Error('Approved colorama palette required');
    const rgb=colors.map(color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)));
    const cycle=[[0,rgb[0]],[.18,rgb[0]],[.5,rgb[1]],[.76,rgb[2]],[1,rgb[3]]];
    const table=new Uint8ClampedArray(768);
    for(let i=0;i<256;i++) {
      const value=i/255;let k=0;while(k<cycle.length-2&&cycle[k+1][0]<value)k++;
      const [a,ca]=cycle[k],[b,cb]=cycle[k+1],u=clamp((value-a)/(b-a));
      for(let j=0;j<3;j++)table[i*3+j]=ca[j]+(cb[j]-ca[j])*u;
    }
    return table;
  }
  function pixels(map,blurred,width,height,s,table,centerY) {
    const length=width*height*4;
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||map.length!==length||
      blurred.length!==5||blurred.some(row=>row.length!==length)||table.length!==768)throw new Error('Invalid colorama raster');
    const output=new Uint8ClampedArray(length),dx=Math.cos(40*Math.PI/180),dy=Math.sin(40*Math.PI/180);
    const front=(s.front+s.pad)*scale,F=s.feather*scale;
    for(let y=0,p=0;y<height;y++)for(let x=0;x<width;x++,p+=4) {
      const m=clamp(map[p]/255+(y/height-.5)*.5)*4,index=Math.min(3,Math.floor(m)),u=m-index;
      const coverage=(blurred[index][p+3]*(1-u)+blurred[index+1][p+3]*u)/255;
      if(coverage<.002)continue;
      const white=clamp((-(x-front)*dx-(y-centerY*scale)*dy-F*.6)/(F*.5));
      const lum=coverage+(hash(x,y,s.frame)-.5)*.03,indexColor=lum<=0?0:lum>=1?255:(lum*255)|0;
      const grey=white>=1?255:indexColor;
      for(let j=0;j<3;j++)output[p+j]=table[indexColor*3+j]+(grey-table[indexColor*3+j])*white;
      output[p+3]=Math.min(255,coverage*255*(white>=1?1:4));
    }
    return output;
  }
  function surface(width,height,read=false) {
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d',{willReadFrequently:read});
    if(!context)throw new Error('Colorama canvas unavailable');
    return {canvas,context};
  }
  function mount(node,onset) {
    const text=node.textContent,words=[],rows=[];
    node.classList.add('production-type','type-colorama');node.dataset.typeReveal='colorama-wipe';
    node.dataset.resourceReveal='colorama-wipe';node.setAttribute('aria-label',text);node.textContent='';
    const copy=document.createElement('span');copy.className='type-colorama-copy';node.appendChild(copy);
    for(const part of text.split(/(\s+)/)) {
      if(!part)continue;
      if(/^\s+$/.test(part)){copy.appendChild(document.createTextNode(part));continue;}
      const word=document.createElement('span');word.className='type-word';word.textContent=part;copy.appendChild(word);words.push(word);
    }
    for(const word of words) {
      let row=rows.find(row=>Math.abs(row.top-word.offsetTop)<2);
      if(!row){row={top:word.offsetTop,words:[]};rows.push(row);}row.words.push(word);
    }
    const css=getComputedStyle(node),size=parseFloat(css.fontSize),line=parseFloat(css.lineHeight);
    const table=lut(['--purple','--cyan','--lime'].map(key=>css.getPropertyValue(key).trim()).concat('#ffffff'));
    const records=rows.map(row=>{
      const left=Math.min(...row.words.map(w=>w.offsetLeft)),right=Math.max(...row.words.map(w=>w.offsetLeft+w.offsetWidth));
      const initial=state(0,right-left,size),padY=Math.ceil(initial.blur*3+line*.25);
      const width=Math.round((right-left+2*initial.pad)*scale),height=Math.round((line+2*padY)*scale);
      const source=surface(width,height),masked=surface(width,height),map=surface(width,height,true);
      const buffers=levels.map(()=>surface(width,height,true)),output=surface(width,height,true),ctx=source.context;
      if(!('letterSpacing' in ctx))throw new Error('Colorama needs approved letter-spacing support');
      ctx.scale(scale,scale);ctx.font=`${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      ctx.letterSpacing=css.letterSpacing;ctx.fillStyle='white';ctx.textBaseline='alphabetic';
      for(const word of row.words) {
        const m=ctx.measureText(word.textContent),fontHeight=m.fontBoundingBoxAscent+m.fontBoundingBoxDescent;
        ctx.fillText(word.textContent,initial.pad+word.offsetLeft-left,padY+(line-fontHeight)/2+m.fontBoundingBoxAscent);
      }
      output.canvas.className='type-colorama-line';output.canvas.setAttribute('aria-hidden','true');
      Object.assign(output.canvas.style,{position:'absolute',pointerEvents:'none',left:(left-initial.pad)+'px',top:(row.top-padY)+'px',
        width:(width/scale)+'px',height:(height/scale)+'px'});node.appendChild(output.canvas);
      return {left,width,height,textWidth:right-left,padY,centerY:padY+line/2,source,masked,map,buffers,output};
    });
    return time=>{
      const p=window.ShortCreatorStory.progress(time,onset),s=state(p,1,size);
      node.style.opacity=time<onset?'0':'1';node.style.transform='none';node.style.filter='none';
      node.dataset.revealProgress=String(p);copy.style.opacity=String(p===1?1:s.crisp);
      const states=[];
      for(const row of records) {
        const s=state(p,row.textWidth,size),{width,height}=row;
        row.output.context.clearRect(0,0,width,height);states.push({width:row.textWidth,...s});
        if(p===0||p===1)continue;
        const gradient=(ctx,front,length,from,to)=>{
          const x=front*scale,y=row.centerY*scale,angle=40*Math.PI/180;
          const g=ctx.createLinearGradient(x,y,x+Math.cos(angle)*length*scale,y+Math.sin(angle)*length*scale);
          g.addColorStop(0,from);g.addColorStop(1,to);return g;
        };
        const m=row.masked.context;m.clearRect(0,0,width,height);m.globalCompositeOperation='source-over';m.drawImage(row.source.canvas,0,0);
        m.globalCompositeOperation='destination-in';m.fillStyle=gradient(m,s.pad+s.front-s.feather,s.feather,'#000','transparent');
        m.fillRect(0,0,width,height);m.globalCompositeOperation='source-over';
        for(let i=0;i<levels.length;i++) {
          const b=row.buffers[i].context;b.clearRect(0,0,width,height);b.filter=`blur(${s.blur*levels[i]*scale}px)`;
          b.drawImage(row.masked.canvas,0,0);b.filter='none';
        }
        const map=row.map.context,trail=row.textWidth*.55;
        map.fillStyle=gradient(map,s.pad+s.front-trail-s.feather,trail+s.feather*.8,'#000','#fff');map.fillRect(0,0,width,height);
        const output=row.output.context.createImageData(width,height);
        output.data.set(pixels(map.getImageData(0,0,width,height).data,row.buffers.map(b=>b.context.getImageData(0,0,width,height).data),
          width,height,s,table,row.centerY));row.output.context.putImageData(output,0,0);
      }
      node.dataset.coloramaState=JSON.stringify({p,rows:states});
    };
  }
  window.ShortCreatorColorama=Object.freeze({levels,ease,state,hash,lut,pixels,mount});
})();
