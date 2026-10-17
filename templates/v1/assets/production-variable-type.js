/* HyperFrames variable-axis-type, variable-font-flex, weight-wave and
   caption-weight-shift (Apache-2.0). Numeric painters use the engine cue clock;
   font ranges come from the approved local binary, never episode style input. */
(() => {
  'use strict';
  const styles=Object.freeze(['axis-weight','weight-wave','font-flex','weight-shift']);
  const clamp=x=>Math.max(0,Math.min(1,x));
  const expo=p=>p<=0?0:p>=1?1:1-2**(-10*p);
  function state(style,time,index,count,axes) {
    if(!styles.includes(style)||!Number.isFinite(time)||!Number.isInteger(index)||index<0||index>=count)
      throw new Error('Invalid variable typography state');
    const weight=axes.find(a=>a.tag==='wght'),slant=axes.find(a=>a.tag==='slnt');
    if(!weight||weight.maximum-weight.minimum<100)throw new Error('Missing real weight axis');
    const low=weight.minimum,high=weight.maximum;
    let p=0,opacity=1,rise=0,scale=1;
    if(style==='axis-weight')p=expo(clamp(time/1.1));
    else if(style==='weight-wave'){
      if(!slant||slant.minimum>=0)throw new Error('Weight wave requires real slant');
      const crest=-3+clamp(time/1.1)*(count-1+6);
      p=clamp(1-Math.abs(index-crest)/3);
    }else if(style==='font-flex'){
      const u=clamp((time-.06-index*.018)/.72),x=u-1;
      const carve=u<=0?0:u>=1?1:1+1.9*x*x*x+.9*x*x;
      p=clamp(carve);opacity=clamp(u/.22);rise=(1-p)*.14;scale=1-.08*p;
    }else p=clamp(time/1.1)**2*(3-2*clamp(time/1.1));
    const values=axes.map(a=>[a.tag,a.tag==='wght'?low+(high-low)*p:
      a.tag==='slnt'&&style==='weight-wave'?Math.max(a.minimum,-12)*p:a.default]);
    return {values,opacity,rise,scale};
  }
  let loading=null;
  function ready() {
    if(!loading){
      const font=window.ShortCreatorVariableFont,w=font.axes.find(a=>a.tag==='wght');
      const face=new FontFace('BrandVariable',`url("${font.url}")`,{weight:`${w.minimum} ${w.maximum}`,display:'block'});
      loading=face.load().then(loaded=>{
        document.fonts.add(loaded);
        if(loaded.status!=='loaded')throw new Error('Variable display font failed to load');
        return document.fonts.ready;
      });
    }
    return loading;
  }
  function mount(host,c,onsets,make) {
    const board=make('div','variable-board',null,host),axes=window.ShortCreatorVariableFont.axes;
    board.dataset.variableStyle=c.style;
    const layers=c.phrases.map(phrase=>{
      const word=make('div','variable-word',null,board,true);
      const chars=Array.from(phrase).map(letter=>make('span','variable-char',letter,word));
      return {word,chars};
    });
    make('p','variable-label',c.label,board,true);
    return t=>{
      const active=t>=onsets[1]?1:0;
      layers.forEach(({word,chars},i)=>{
        word.style.visibility=i===active?'visible':'hidden';
        chars.forEach((node,index)=>{
          const s=state(c.style,t-onsets[i],index,chars.length,axes);
          node.style.fontVariationSettings=s.values.map(([tag,v])=>`"${tag}" ${v.toFixed(3)}`).join(',');
          node.style.opacity=String(s.opacity);node.style.transform=`translateY(${s.rise}em) scale(${s.scale})`;
        });
      });
      board.dataset.variableActive=String(active);board.dataset.variableTime=String(t);
    };
  }
  const api={styles,state,mount,ready};
  if(typeof window!=='undefined')window.ShortCreatorVariableType=api;
  if(typeof module!=='undefined')module.exports=api;
})();
