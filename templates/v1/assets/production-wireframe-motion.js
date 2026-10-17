/* HyperFrames wireframe-portal-title, Apache-2.0. Source choreography expressed
   as absolute-time functions; no GSAP, DOM mutations, font substitution or loop. */
(() => {
  'use strict';
  const source='75a830c267bf298c5bb8a6695c462e45238f58e774ea33e797b4c7bd43c86866';
  const clamp=x=>Math.max(0,Math.min(1,x)),lerp=(a,b,p)=>a+(b-a)*p;
  const smooth=x=>{const p=clamp(x);return p*p*(3-2*p);};
  const cubic=x=>{const p=clamp(x);return p<.5?4*p*p*p:1-(-2*p+2)**3/2;};
  const sine=x=>(1-Math.cos(Math.PI*clamp(x)))/2;
  const out=x=>1-(1-clamp(x))**4;
  const transition=Object.freeze({start:2.85,duration:1.85,easing:8,glitch:.2,fog:true});
  const parameters=Object.freeze({
    gridSpacing:29,gridSize:500,gridOpacity:.15,gridFadeStart:1,gridFadeEnd:175,
    gridOffsetX:-14.5,gridGlowSpeed:8.7,gridGlowIntensity:1.3,
    textDepthMin:.28,textDepthMax:2,letterZSpread:4,outlineWidth:1.5,
    starburstPoints:24,portalChromatic:0,portalEdgeBlur:.15,portalIrregularity:1,
    portalScale:.8,portalColorSpeed:1.7,warpDotCount:1000,warpDotSize:2,warpDotOpacity:.7,
    transChromatic:.01,transZoomBlur:3.2,transDistortion:.05,transBrightness:1.6,
    transContrast:1.25,transSaturation:0,cameraDistance:22,initialFOV:100,
    cameraDistance3D:66,finalFOV:72,contentZOffset:30,vignetteIntensity:1.7,
    chromaticAberration:.006,scanlineIntensity:.25,edgeBlur:50,edgeBlurSpread:.15,
    glitchPower:.2,glitchSpeed:3,glitchBlockSize:15,glitchColorRate:.009,
    ambientIntensity:.5,keyLightIntensity:4.25,keyLightX:2,keyLightY:-2.5,keyLightZ:4.5,
  });
  function time(value) {
    if(!Number.isFinite(value))throw new Error('Finite portal time required');
    return Math.max(0,Math.min(8,value));
  }
  function seeded(seed) {
    if(!Number.isInteger(seed))throw new Error('Integer portal seed required');
    let a=seed;
    return ()=>{a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);
      t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
  }
  function timeline(seconds,count=1) {
    if(!Number.isInteger(count)||count<1||count>18)throw new Error('Portal title requires 1-18 characters');
    const t=time(seconds),portal=cubic((t-.45)/2.05),push=clamp((t-6)/1.6)**3;
    const glitch=at=>t<at?0:t<at+.09?.55*clamp((t-at)/.09)**2:.55*(1-clamp((t-at-.09)/.24))**3;
    const warp=t<1.5?1-Math.cos(clamp((t-.45)/1)*Math.PI/2):t<6?
      lerp(1,.28,Math.sin(clamp((t-1.5)/1.2)*Math.PI/2)):lerp(.28,.85,clamp((t-6)/.8)**2);
    const travel=t<2.5?16*sine((t-.45)/2.05):t<6?lerp(16,22,clamp((t-2.5)/3.5)):
      lerp(22,38,clamp((t-6)/2)**3);
    const exitFx=clamp((t-6.4)/1.6)**3;
    return {seconds:t,portal,push,glitch:glitch(3.8)+glitch(5.2),warp,travel,exitFx,
      plate:sine((t-6.9)/.95),transition:Math.min(1,Math.max(1-Math.abs(portal*2-1),exitFx*.85)),
      cardVisible:t<2.5,kicker:out(t/.45),subtitle:out((t-.22)/.45),
      letters:Array.from({length:count},(_,i)=>out((t-.03-i*.025)/.5))};
  }
  function cameraPose(seconds) {
    const s=timeline(seconds),t=s.seconds,p=s.portal,push=s.push,drift=p*(1-.7*push);
    return {fov:lerp(100,72,p)+push*10,
      position:[Math.sin(t*.41)*1.4*drift,Math.cos(t*.29)*drift,
        lerp(22,66,p)-push*52+Math.sin(t*.34)*1.6*p*(1-push)],
      rotation:[Math.cos(t*.47)*.04*drift,Math.sin(t*.62+1.2)*.06*drift,0]};
  }
  const triangles=Object.freeze([[1.8,-8,5,2],[1.4,7,-3,1],[1,-6,-6,3],[1.2,9,6,2]].map(Object.freeze));
  function trianglePose(seconds,index) {
    if(!Number.isInteger(index)||index<0||index>=triangles.length)throw new Error('Unknown portal triangle');
    const {seconds:t,portal}=timeline(seconds),[size,x,y,z]=triangles[index],phase=index*2.17;
    return {size,position:[x+Math.sin(t*.15+phase)*1.2+Math.sin(t*.07+phase*3)*.5,
      y+Math.sin(t*.12+phase*1.4)*.8+Math.cos(t*.09+phase*2)*.3,
      z+Math.sin(t*.1+phase*.7)*.6+30*portal],rotation:[Math.sin(t*.08+phase)*.4,
      t*.05*(index%2===0?1:-1)+phase,Math.sin(t*.06+phase*1.3)*.3]};
  }
  function phraseEase(progress) {
    if(!Number.isFinite(progress))throw new Error('Finite phrase progress required');
    const x=clamp(progress),a=(x*.38)**transition.easing,b=((1-x)*.62)**transition.easing;
    return a/(a+b);
  }
  function layoutPhrase(text,measure) {
    if(typeof text!=='string'||text.length<1||text.length>48||text!==text.trim()||
      /\s{2}|[^\S ]/u.test(text)||typeof measure!=='function')throw new Error('Invalid portal phrase');
    const tracking=176*.03,advances=new Map();
    for(const char of text){const width=measure(char);
      if(!Number.isFinite(width)||width<=0||width>1760)throw new Error('Invalid portal font metric');
      advances.set(char,width+tracking);}
    const advance=char=>advances.get(char),width=line=>Array.from(line).reduce((sum,ch)=>sum+advance(ch),-tracking);
    const words=text.split(' '),widest=Math.max(...words.map(width)),total=width(text);
    const candidates=new Set([total,widest]);let best=null;
    for(let first=0;first<words.length;first++){
      let line='';for(let last=first;last<words.length;last++){line+=(line?' ':'')+words[last];candidates.add(width(line));}
    }
    for(const limit of candidates){
      if(limit<widest)continue;
      const lines=[];let line='';
      for(const word of words){const next=line?line+' '+word:word;
        if(line&&width(next)>limit+.01){lines.push(line);line=word;}else line=next;}
      if(line)lines.push(line);
      const widths=lines.map(width),scale=Math.min(1,1520/Math.max(...widths),620/(lines.length*176*1.18));
      const balance=Math.min(...widths)/Math.max(...widths),score=scale*(.94+.06*balance);
      if(!best||score>best.score)best={lines,widths,scale,score};
    }
    const glyphs=[],lineHeight=176*1.18*best.scale;
    best.lines.forEach((line,row)=>{
      let left=(1920-best.widths[row]*best.scale)/2;
      for(const char of line){const step=advance(char)*best.scale;
        if(char!==' ')glyphs.push({char,row,rect:{left,top:540+(row-(best.lines.length-1)/2)*lineHeight-88*best.scale,
          width:(advance(char)-tracking)*best.scale,height:176*best.scale}});
        left+=step;}
    });
    return {...best,glyphs};
  }
  function rectToWorld(rect) {
    if(!rect||!['left','top','width','height'].every(k=>Number.isFinite(rect[k]))||rect.width<=0||rect.height<=0)
      throw new Error('Invalid portal letter rectangle');
    const h=44*Math.tan(50*Math.PI/180),w=h*16/9;
    return {x:((rect.left+rect.width/2)/1920-.5)*w,y:(.5-(rect.top+rect.height/2)/1080)*h,
      w:rect.width/1920*w,h:rect.height/1080*h};
  }
  function letterData(char,rect,geometryWidth,geometryHeight,random) {
    if(typeof char!=='string'||[...char].length!==1||char===' '||
      ![geometryWidth,geometryHeight].every(n=>Number.isFinite(n)&&n>0)||typeof random!=='function')
      throw new Error('Invalid portal letter geometry');
    const wr=rectToWorld(rect),a=random(),b=random();
    if(![a,b].every(n=>Number.isFinite(n)&&n>=0&&n<1))throw new Error('Invalid seeded portal sample');
    return {char,baseX:wr.x,baseY:wr.y,xyScale:Math.min(wr.w/geometryWidth,wr.h/geometryHeight),
      targetZ:(a-.5)*4,depthScale:.14+b*.86};
  }
  function perspectiveCorrect(letter) {
    const scale=(36-letter.targetZ)/36;
    return {...letter,baseX:letter.baseX*scale,baseY:letter.baseY*scale,xyScale:letter.xyScale*scale};
  }
  function matchLetters(sourceLetters,targetLetters,random) {
    if(!Array.isArray(sourceLetters)||!Array.isArray(targetLetters)||sourceLetters.length<1||sourceLetters.length>18||
      targetLetters.length<1||targetLetters.length>48||typeof random!=='function')throw new Error('Invalid portal handoff');
    for(const letter of [...sourceLetters,...targetLetters]){
      if(!letter||typeof letter.char!=='string'||[...letter.char].length!==1||
        !['baseX','baseY','xyScale','targetZ','depthScale'].every(k=>Number.isFinite(letter[k]))||
        letter.xyScale<=0||letter.depthScale<=0)throw new Error('Invalid portal glyph data');
    }
    const slots=targetLetters.map((_,to)=>({from:null,to})),remaining=new Set(sourceLetters.map((_,i)=>i));
    for(const exactOnly of [true,false])for(const slot of slots){
      if(slot.from!==null)continue;
      const target=targetLetters[slot.to];let closest=null,cost=Infinity;
      for(const index of remaining){const letter=sourceLetters[index];
        if(exactOnly&&letter.char!==target.char)continue;
        const d=Math.hypot(letter.baseX-target.baseX,letter.baseY-target.baseY);
        if(d<cost){closest=index;cost=d;}}
      if(closest!==null){slot.from=closest;remaining.delete(closest);}
    }
    for(const from of remaining)slots.push({from,to:null});
    return slots.map((slot,i)=>{
      const from=slot.from===null?null:sourceLetters[slot.from],to=slot.to===null?null:targetLetters[slot.to];
      const end=to||from;let start=from;
      if(!start){const r=random();if(!Number.isFinite(r)||r<0||r>=1)throw new Error('Invalid seeded portal sample');
        start={baseX:end.baseX*1.25,baseY:end.baseY*1.25,targetZ:-60-r*65,xyScale:end.xyScale};}
      return {...slot,start:{...start},end:{...end},delay:clamp(i/Math.max(1,targetLetters.length-1))*1.85*.26,
        sameGlyph:!!(from&&to&&from.char===to.char)};
    });
  }
  function fade(amount,baseOpacity=1) {
    const opacity=1-smooth((amount-.005)/.13),haze=1-smooth(amount/.15);
    return {opacity,outlineOpacity:baseOpacity*opacity,haze,visible:opacity>.001};
  }
  function handoff(seconds,slots,targetCount,cameraZ) {
    if(!Array.isArray(slots)||!Number.isInteger(targetCount)||targetCount<1||targetCount>48||
      slots.length<targetCount||slots.length>66||typeof cameraZ!=='function')throw new Error('Invalid portal handoff state');
    const {seconds:t,portal}=timeline(seconds);let envelope=0;
    const letters=slots.map((slot,i)=>{
      const progress=clamp((t-2.85-slot.delay)/(1.85*.74)),motion=phraseEase(progress),incoming=motion>=.5;
      const start=slot.start,end=slot.end;
      if(slot.to===null){
        const depart=smooth((t-2.85-(i%3)*.025)/Math.min(.75,1.85*.45));
        return {progress,motion,from:{...fade(depart),position:[start.baseX,start.baseY,start.targetZ*portal-depart*125],
          rotation:[0,depart*.3,0],scale:[start.xyScale,start.xyScale,lerp(.01,start.depthScale,portal)]},to:null};
      }
      const x=lerp(start.baseX,end.baseX,motion),y=lerp(start.baseY,end.baseY,motion)+Math.sin(t*.6+i*.7)*.12*portal;
      const flyPast=clamp((t-6-i/Math.max(1,targetCount-1)*.2)/1.25)**3;
      const z=lerp(start.targetZ,end.targetZ,motion)*portal-Math.sin(Math.PI*motion)*1.8+flyPast*38;
      const depth=cameraZ(x,y,z+30*portal);
      if(!Number.isFinite(depth))throw new Error('Invalid portal camera projection');
      const passed=depth>4,edge=Math.abs(2*motion-1)**.65;
      const swapPulse=Math.exp(-(((progress-.62)/.045)**2)),settlePulse=Math.exp(-(((progress-.86)/.065)**2));
      envelope=Math.max(envelope,swapPulse*.65,settlePulse);
      const tick=Math.sin(Math.floor(t*36)*17.1+i*4.7)*settlePulse*.2,extra=slot.from===null;
      const opacity=extra?smooth(motion/.34):1,xyScale=lerp(start.xyScale,end.xyScale,motion);
      const object=isIncoming=>({opacity,outlineOpacity:opacity,haze:1,
        visible:(extra||(slot.sameGlyph?!isIncoming:incoming===isIncoming))&&opacity>.001&&!passed,
        position:[x+tick*.12,y+tick*.04,z],rotation:[0,slot.sameGlyph?Math.sin(Math.PI*motion)*.55:
          extra?-Math.PI*.75*(1-motion):incoming?-Math.PI*(1-motion):Math.PI*motion,tick*.012],
        scale:[xyScale,xyScale,lerp(.01,end.depthScale,portal)*(extra||slot.sameGlyph?1:.015+.985*edge)]});
      return {progress,motion,from:slot.from===null?null:object(false),to:object(true)};
    });
    const glitch=Math.max(timeline(t).glitch*.5,envelope*.35)*.2;
    return {letters,envelope,glitch,shakePower:.2*glitch,shakeRate:glitch>.001?1:0,shakeColorRate:.009*glitch*1.8};
  }
  function supportingPose(seconds,index) {
    if(!Number.isInteger(index)||index<0||index>1)throw new Error('Unknown portal supporting line');
    const travel=smooth((time(seconds)-2.65-index*.09)/1.3);
    return {travel,z:-145*travel,...fade(travel,.6)};
  }
  function gridPositions() {
    const positions=[];
    for(let a=-17;a<=17;a++)for(let b=-17;b<=17;b++){
      const ca=a*29,cb=b*29;positions.push(-500,ca,cb,500,ca,cb,ca,-500,cb,ca,500,cb,ca,cb,-500,ca,cb,500);}
    return positions;
  }
  const dots=[];
  for(let iz=0;iz<20&&dots.length<1000;iz++)for(let iy=0;iy<8&&dots.length<1000;iy++)
    for(let ix=0;ix<8&&dots.length<1000;ix++)dots.push(Object.freeze({x:ix-3.5,y:iy-3.5,z:iz+.5}));
  Object.freeze(dots);
  function warpDots(seconds) {
    const s=timeline(seconds),result=[];
    if(s.warp<.01)return result;
    for(const d of dots){
      let z=(((d.z-s.travel)%20)+20)%20;if(z<.05)z+=20;
      const x=960+d.x*300/z,y=540+d.y*300/z,size=6/z;
      if(size<.3||x< -10||x>1930||y< -10||y>1090)continue;
      const alpha=Math.min(1,2/z)*s.warp*.7,streak=z<2&&size>1?(2-z)*20*s.warp:0;
      const dx=x-960,dy=y-540,distance=Math.hypot(dx,dy)||1;
      result.push({x,y,size,alpha,streak,endX:x+dx/distance*streak,endY:y+dy/distance*streak});
    }
    return result;
  }
  window.ShortCreatorWireframeMotion=Object.freeze({source,parameters,transition,timeline,cameraPose,trianglePose,
    seeded,phraseEase,layoutPhrase,rectToWorld,letterData,perspectiveCorrect,matchLetters,handoff,
    supportingPose,gridPositions,warpDots});
})();
