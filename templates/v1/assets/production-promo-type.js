/* HyperFrames kinetic-type example, Apache-2.0. Six reusable compositions:
   fixed brand typography, explicit copy, native cue clock and shared scene seams. */
(() => {
  'use strict';
  const layouts=Object.freeze(['promo-hook','promo-grid','promo-offset','promo-pair','promo-close']);
  const clamp=x=>Math.max(0,Math.min(1,x));
  const out=(x,n=3)=>1-(1-clamp(x))**n;
  const expo=x=>{const p=clamp(x);return p===1?1:1-2**(-10*p);};
  const back=(x,s=1.7)=>{const p=clamp(x)-1;return 1+(s+1)*p**3+s*p*p;};
  const smooth=x=>{const p=clamp(x);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
  function titleState(layout,progress) {
    if(!layouts.includes(layout)||!Number.isFinite(progress))throw new Error('Invalid promotional title state');
    const p=clamp(progress),s={p,boardX:0,kicker:1,kickerY:0,title:1,titleY:0,titleScale:1,
      subtitle:1,subtitleX:0,subtitleY:0,rule:0,circle:0,circleScale:1,square:0,squareRotation:0};
    if(layout==='promo-hook') {
      const t=p*1.5;s.kicker=out((t-.2)/.8,4);s.kickerY=-30*s.kicker;
      s.title=t>.5?1:0;s.titleScale=back((t-.5)/.8);s.subtitle=out((t-.9)/.6);
      s.subtitleX=100*(1-s.subtitle);
    } else if(layout==='promo-grid') {
      const t=p*1.8;s.boardX=1-expo((t-.1)/.8);s.kicker=out((t-.3)/.1,2);
      s.title=out((t-.5)/.4,2);s.subtitle=1;
      s.circle=out((t-1)/.6,2);s.circleScale=1+.2*back((t-1)/.6);
      s.square=out((t-1.2)/.6,2);s.squareRotation=45*back((t-1.2)/.6);
    } else if(layout==='promo-offset') {
      const t=p*1.1;s.kicker=out(t/.1,2);s.titleY=200*(1-expo((t-.1)/.6));
      s.title=out(t/.1,2);s.subtitle=out((t-.6)/.5,2);s.subtitleX=-50*back((t-.6)/.5);
    } else if(layout==='promo-pair') {
      const t=p*1.5;s.kicker=out(t/.1,2);s.titleY=-100*(1-back((t-.3)/.6,1.2));
      s.title=out((t-.3)/.1,2);s.rule=out((t-.6)/.6,2);
      s.subtitle=out((t-.9)/.1,2);s.subtitleY=100*(1-back((t-.9)/.6,1.2));
    } else {
      const t=p*1.1;s.kicker=out(t/.4,2);s.title=out((t-.3)/.5,2);
      s.subtitle=out((t-.5)/.5,2);s.rule=out((t-.7)/.4,2);
    }
    return s;
  }
  function glyphState(progress,index) {
    if(!Number.isFinite(progress)||!Number.isInteger(index)||index<0||index>2)throw new Error('Invalid promotional glyph');
    const p=clamp(progress),t=p*(index===0?2:index===1?1:1.1);
    return {p,alpha:out(t/.6,2),rotation:45+180*smooth(t/2),wipe:smooth(t),
      lines:Array.from({length:3},(_,i)=>out((t-.2-.2*i)/.5,2))};
  }
  function mountTitle(host,c,onset,make) {
    host.dataset.titleLayout=c.layout;host.classList.add('production-promo-title');
    const board=make('div','title-design-board promo-type-board '+c.layout,null,host);
    const backdrop=make('div','promo-type-decoration',null,board);backdrop.setAttribute('aria-hidden','true');
    const circle=make('i','promo-type-circle',null,backdrop),square=make('i','promo-type-square',null,backdrop);
    const copy=make('div','promo-type-copy',null,board),kicker=make('p','prod-kicker',c.kicker,copy,true);
    const title=make('h2','prod-title',c.title,copy,true),rule=make('i','promo-type-rule',null,copy);
    const subtitle=make('p','prod-subtitle',c.layout==='promo-grid'?null:c.subtitle,copy,true);
    // Words retain original whitespace; source stagger is applied without HTML input.
    const words=c.layout==='promo-grid'?c.subtitle.split(/(\s+)/u).map(part=>make('span','promo-grid-word',part,subtitle)):[];
    return time=>{
      const p=window.ShortCreatorStory.progress(time,onset),s=titleState(c.layout,p);
      board.dataset.titleDesignProgress=String(p);board.dataset.promoTypeState=JSON.stringify(s);
      board.style.visibility=p>0?'visible':'hidden';copy.style.transform=`translateX(${s.boardX*board.clientWidth}px)`;
      backdrop.style.transform=copy.style.transform;
      kicker.style.opacity=String(s.kicker);kicker.style.transform=`translateY(${s.kickerY}px)`;
      title.style.opacity=String(s.title);title.style.transform=`translateY(${s.titleY}px) scale(${s.titleScale})`;
      subtitle.style.opacity=String(s.subtitle);subtitle.style.transform=`translate(${s.subtitleX}px,${s.subtitleY}px) rotate(${c.layout==='promo-offset'?-5:0}deg)`;
      if(words.length){let i=0;const count=words.filter(n=>n.textContent.trim()).length;
        words.forEach(n=>{if(n.textContent.trim()){const delay=count>1?.15*i++/(count-1):0;n.style.opacity=String(out((p*1.8-.8-delay)/.5));}});}
      rule.style.transform=`scaleX(${s.rule})`;circle.style.opacity=String(s.circle);circle.style.transform=`scale(${s.circleScale})`;
      square.style.opacity=String(s.square);square.style.transform=`rotate(${s.squareRotation}deg)`;
    };
  }
  function mountGlyphs(host,c,onsets,make) {
    const slot=make('div','kinetic-window kinetic-preset promo-glyph-board',null,host);slot.dataset.kineticStyle='glyph-build';
    const items=c.words.map((text,i)=>{
      const item=make('div','promo-glyph-item',null,slot),glyph=make('div','promo-glyph promo-glyph-'+i,null,item);
      glyph.setAttribute('aria-hidden','true');const shape=make('i','promo-glyph-shape',null,glyph);
      const inner=make('i','promo-glyph-inner',null,glyph),lines=i===2?Array.from({length:3},()=>make('i','promo-glyph-line',null,inner)):[];
      const word=make('span','promo-glyph-word',text,item,true);
      return {item,shape,inner,lines,word};
    });
    return time=>{
      const frame=Math.floor(time*30+1e-7),starts=onsets.map(at=>Math.ceil(at*30));
      const active=starts.reduce((last,at,i)=>frame>=at?i:last,-1),p=active<0?0:clamp((frame-starts[active])/24);
      const states=items.map((_,i)=>glyphState(clamp((frame-starts[i])/24),i));
      slot.dataset.kineticPresentation=JSON.stringify({style:'glyph-build',active,p,glyphs:states});
      items.forEach(({item,inner,lines},i)=>{
        const s=states[i];item.style.opacity=String(s.alpha);item.style.visibility=s.alpha>0?'visible':'hidden';item.setAttribute('aria-hidden',String(s.alpha===0));
        if(i===0)inner.style.transform=`rotate(${s.rotation}deg)`;
        if(i===1)inner.style.transform=`scaleX(${s.wipe})`;
        lines.forEach((line,j)=>line.style.transform=`scaleX(${s.lines[j]})`);
      });
    };
  }
  window.ShortCreatorPromoType={layouts,titleState,glyphState,mountTitle,mountGlyphs};
})();
