/* HyperFrames perspective-marquee, ticker-takeover, shutter-slam and motion-blur
   adaptations (Apache-2.0). Explicit words, fixed brand type and native cues. */
(() => {
  'use strict';
  const styles=Object.freeze(['perspective-marquee','ticker-takeover','shutter-slam','camera-follow','glyph-build']);
  const clamp=x=>Math.max(0,Math.min(1,x)),out=(x,power=3)=>1-(1-clamp(x))**power;
  const cubic=p=>{const x=clamp(p);return x<.5?4*x**3:1-(-2*x+2)**3/2;};
  const expo=p=>{const x=clamp(p);return x===1?1:1-2**(-10*x);};
  function tickerState(progress,count) {
    if(!Number.isInteger(count)||count<1||count>6)throw new Error('Ticker needs one to six supplied options');
    const p=clamp(progress),t=p*3.15,entry=out(t/.35),lock=2.07,promote=2.25;
    const position=(count-1)*(.72*clamp((t-.32)/.82)**5+.28*out((t-1.14)/.93,5));
    const hero=out((t-promote)/.9,4),leave=clamp((t-promote)/(.9*.68))**3;
    return {position,tickerAlpha:entry*(1-leave),tickerScale:(.97+.03*entry)*(1-.04*leave),
      finalScale:1+.14*(1-expo((t-lock)/.3)),flash:t<lock?0:.82*(1-out((t-lock)/.34)),
      heroAlpha:hero,heroScale:.22+.78*hero,heroY:.2*(1-hero)};
  }
  function slamPose(progress,beat,width,height) {
    if(!Number.isInteger(beat)||beat<0||beat>5)throw new Error('Shutter beat must name one of six authored motions');
    const p=clamp(progress),pose={x:0,y:0,scale:1,rx:0,ry:0,rz:0};
    if(p===0||p===1)return pose;
    if(beat<3) {
      const section=Math.min(3,Math.floor(p*4)),q=cubic(p*4-section);
      const values=beat===0?[0,.321*width,-.321*width,.321*width,0]:beat===1?[0,-.305*height,.305*height,-.305*height,0]:[1,4.04,.466,4.04,1];
      pose[beat===0?'x':beat===1?'y':'scale']=values[section]+(values[section+1]-values[section])*q;
    } else pose[['rx','ry','rz'][beat-3]]=360*cubic(p);
    return pose;
  }
  function shutterSamples(progress,beat,width,height) {
    // Source 720-degree shutter, -360-degree phase, 16 sub-intervals and
    // inclusive boundaries: seventeen samples spanning one frame either side.
    return Array.from({length:17},(_,i)=>slamPose(progress-1/24+i/192,beat,width,height));
  }
  function marqueePosition(centers,active,progress,width) {
    if(active<0)return width/2-centers[0];
    const prior=centers[Math.max(0,active-1)];
    return width/2-prior-(centers[active]-prior)*clamp(progress);
  }
  function transform(pose,perspective) {
    return `perspective(${perspective}px) translate(${pose.x}px,${pose.y}px) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotate(${pose.rz}deg) scale(${pose.scale})`;
  }
  function mount(host,c,onsets,make) {
    const style=c.style;
    if(!styles.includes(style))throw new Error('Unknown kinetic preset');
    if(style==='glyph-build')return window.ShortCreatorPromoType.mountGlyphs(host,c,onsets,make);
    if(style==='camera-follow')return window.ShortCreatorKineticCamera.mount(host,c,onsets,make);
    const slot=make('div','kinetic-window kinetic-preset',null,host);slot.dataset.kineticStyle=style;
    const W=slot.clientWidth,H=slot.clientHeight;
    const originals=c.words.map(text=>make('span','kinetic-word kinetic-native-word',text,slot));
    originals.forEach(word=>{word.style.visibility='hidden';word.setAttribute('aria-hidden','true');});
    const widths=originals.map(n=>n.getBoundingClientRect().width),type=getComputedStyle(originals[0]),font=type.font;
    const pitch=Math.max(parseFloat(type.fontSize)*1.4,H*.24);
    if(widths.some(width=>width>W-48))throw new Error('Kinetic word exceeds approved type size');
    const rail=make('i','',null,make('div','kinetic-rail',null,host));
    let strip,pills=[],centers=[],reel,rows=[],flash,ghosts=[];
    if(style==='perspective-marquee') {
      const plane=make('div','kinetic-marquee-plane',null,slot);strip=make('div','kinetic-marquee-strip',null,plane);
      for(let pass=0;pass<2;pass++)for(const text of c.words)pills.push(make('span','kinetic-marquee-pill',text,strip));
      centers=pills.slice(0,c.words.length).map(n=>n.offsetLeft+n.offsetWidth/2);
    }
    if(style==='ticker-takeover') {
      const viewport=make('div','kinetic-ticker-window',null,slot);reel=make('div','kinetic-ticker-reel',null,viewport);
      viewport.style.height=pitch+'px';viewport.style.top=((H-pitch)/2)+'px';
      rows=c.words.map(text=>make('span','kinetic-ticker-item',text,reel));
      rows.forEach(n=>{n.style.font=font;n.style.height=pitch+'px';n.style.lineHeight=pitch+'px';});
      flash=make('div','kinetic-ticker-flash',null,viewport);
    }
    if(style==='shutter-slam') {
      const group=make('div','kinetic-shutter-ghosts',null,slot);group.setAttribute('aria-hidden','true');
      ghosts=Array.from({length:17},()=>make('span','kinetic-word kinetic-native-word',null,group));
      ghosts.forEach(n=>{n.style.opacity=String(1/16);});
    }
    return time=>{
      const frame=Math.floor(time*30+1e-7);
      const active=onsets.reduce((last,at,i)=>frame>=Math.ceil(at*30)?i:last,-1);
      const p=active<0?0:window.ShortCreatorStory.progress(time,onsets[active]);
      const state={style,active,p};
      originals.forEach((word,i)=>{
        word.style.visibility='hidden';word.style.opacity='0';word.style.transform='none';word.removeAttribute('data-fit');
        word.setAttribute('aria-hidden',String(i!==active));
        word.style.left=((W-widths[i])/2)+'px';word.style.top=((H-word.offsetHeight)/2)+'px';
      });
      if(style==='perspective-marquee') {
        const x=marqueePosition(centers,active,p,W);strip.style.transform=`translateX(${x}px)`;
        strip.style.opacity=active<0?'0':'1';pills.forEach((pill,i)=>{pill.dataset.active=String(i===active);});state.x=x;
      } else if(style==='ticker-takeover') {
        const s=tickerState(p,Math.max(1,active+1));Object.assign(state,s);
        reel.style.transform=`translateY(${-s.position*pitch}px)`;state.pitch=pitch;
        reel.parentNode.style.opacity=active<0?'0':String(s.tickerAlpha);
        reel.parentNode.style.transform=`scale(${s.tickerScale})`;
        rows.forEach((row,i)=>{row.style.visibility=i<=active?'visible':'hidden';row.style.transform=`scale(${i===active?s.finalScale:1})`;row.style.color=i===active?'var(--lime)':'white';});
        flash.style.opacity=String(s.flash);
        if(active>=0){const word=originals[active];word.style.visibility=s.heroAlpha>0?'visible':'hidden';word.style.opacity=String(s.heroAlpha);word.style.transform=`translateY(${s.heroY*H}px) scale(${s.heroScale})`;word.dataset.fit='true';}
      } else {
        const pose=slamPose(p,Math.max(0,active),W,H),samples=shutterSamples(p,Math.max(0,active),W,H),moving=active>=0&&p>0&&p<1;
        state.pose=pose;state.samples=moving?samples:[];
        if(active>=0){const word=originals[active];word.style.visibility='visible';word.style.opacity='1';word.style.transform=transform(pose,1.04*W);if(!moving)word.dataset.fit='true';}
        ghosts.forEach((ghost,i)=>{
          ghost.textContent=active>=0?c.words[active]:'';ghost.style.width=active>=0?widths[active]+'px':'0px';
          ghost.style.left=active>=0?((W-widths[active])/2)+'px':'0px';ghost.style.top=active>=0?originals[active].style.top:'0px';
          ghost.style.visibility=moving?'visible':'hidden';ghost.style.transform=transform(samples[i],1.04*W);
        });
      }
      rail.style.transform=`scaleX(${active<0?0:(active+p)/c.words.length})`;
      slot.dataset.kineticPresentation=JSON.stringify(state);
    };
  }
  window.ShortCreatorKineticPresets={styles,tickerState,slamPose,shutterSamples,marqueePosition,mount};
})();
