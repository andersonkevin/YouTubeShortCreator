// Vertical kit stage engine: deterministic window.setTime(t) for frame-by-frame capture (no wall clock, no requestAnimationFrame).
// Attributes: data-at/data-fx (entrances), data-on/off, data-count, data-flow, data-tx/ty, data-rot, data-pulse, data-spin.
// Scenes enter with a blur rise and leave with a fade; the camera holds still in between so text never steps a pixel.
// Also: counters with prefix/suffix/decimals, comet trails on flows, the ambient light layer and the global --t clock.
(()=>{const S=window.STAGE,cl=v=>Math.max(0,Math.min(1,v)),eo=p=>1-Math.pow(1-p,3),eio=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2,
 eb=p=>{const c=1.70158;return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2)},
 sp=p=>p>=1?1:1-Math.exp(-6.5*p)*Math.cos(10.5*p),Q=s=>[...document.querySelectorAll(s)],root=document.documentElement;
const scenes=Q('.v-scene'),fx=Q('[data-at][data-fx]'),ons=Q('[data-on]'),counts=Q('[data-count]'),spins=Q('[data-spin]'),
 flows=Q('[data-flow]'),tys=Q('[data-ty]'),txs=Q('[data-tx]'),rots=Q('[data-rot]'),pulses=Q('[data-pulse]'),
 cap=document.querySelector('.v-caption'),bar=document.querySelector('.v-progress span'),logo=document.querySelector('.v-logo'),
 amb=Q('.v-amb i');let lastCue=-2;
const steps=a=>a.split(',').map(s=>s.split(':').map(Number));
// Comet trails: data-trail="N" clones N fading ghosts that follow the token along its path.
for(const f of flows){const n=+(f.dataset.trail||0);f._ghosts=[];for(let k=1;k<=n;k++){const g=f.cloneNode();g.removeAttribute('data-flow');g.removeAttribute('data-trail');
 g.classList.add('v-ghost');g.setAttribute('r',(+f.getAttribute('r')*(1-k/(n+1.5))).toFixed(2));f.parentNode.insertBefore(g,f);f._ghosts.push(g);}}
const paths=new Map(flows.map(f=>{const p=document.querySelector(f.dataset.flow);return [f,{p,L:p.getTotalLength()}]}));
const tyS=tys.map(c=>steps(c.dataset.ty)),txS=txs.map(c=>steps(c.dataset.tx)),rotS=rots.map(c=>steps(c.dataset.rot)),cntS=counts.map(c=>steps(c.dataset.count));
const ramp=(st,t,d,ease=eo)=>{let v=st[0][1],prev=st[0][1];for(const [a,to] of st.slice(1)){v=prev+(to-prev)*ease(cl((t-a)/d));if(t<a)break;prev=to;}return v;};
window.setTime=t=>{
 root.style.setProperty('--t',t.toFixed(3));
 // Ambient background: two soft brand blobs drifting on slow, deterministic paths.
 amb.forEach((b,k)=>{const ph=k*2.1;b.style.transform=`translate(${(Math.sin(t*.23+ph)*120).toFixed(1)}px,${(Math.cos(t*.17+ph)*160).toFixed(1)}px) scale(${(1+.08*Math.sin(t*.31+ph)).toFixed(3)})`;});
 // Scenes: blur-in rise, gentle push-in with drift, fade-out with slight shrink.
 for(const s of scenes){const a=+s.dataset.start,b=+s.dataset.end,last=s===scenes[scenes.length-1],cam=s.querySelector('.v-cam');
  const inP=eo(cl((t-a)/.5)),outP=last?0:cl((t-(b-.3))/.3),o=t<a||t>=b?0:Math.min(inP,1-outP);
  s.style.opacity=o;s.style.visibility=o>0?'visible':'hidden';if(o<=0)continue;
  const k=cl((t-a)/(b-a)),blur=(1-inP)*10+outP*6;
  cam.style.transform=`translateY(${((1-inP)*50-outP*30).toFixed(1)}px) scale(${(1-.03*outP).toFixed(4)})`;  // no drift during the hold: sub-pixel drift made text step 1 px every ~0.45 s
  cam.style.filter=blur>.05?`blur(${blur.toFixed(2)}px)`:'none';}
 for(const e of fx){const d=+(e.dataset.dur||.5),r=cl((t-(+e.dataset.at))/d),p=eo(r),k=e.dataset.fx;
  if(k==='rise'){e.style.opacity=p;e.style.transform=p<1?`translateY(${(36*(1-p)).toFixed(2)}px)`:'';}
  else if(k==='word'){e.style.opacity=r>0?1:0;e.style.transform=`translateY(${(105*(1-p)).toFixed(2)}%)`;}
  else if(k==='pop'){e.style.opacity=cl(r*2.5);e.style.transform=`scale(${(.6+.4*eb(r)).toFixed(4)})`;}
  else if(k==='spring'){e.style.opacity=cl(r*3);e.style.transform=`scale(${(.4+.6*sp(r*1.4)).toFixed(4)})`;}
  else if(k==='blur'){e.style.opacity=p;e.style.filter=p<1?`blur(${(14*(1-p)).toFixed(2)}px)`:'none';e.style.transform=p<1?`scale(${(1.06-.06*p).toFixed(4)})`:'';}
  else if(k==='slide-l'||k==='slide-r'){const s=k==='slide-l'?-1:1;e.style.opacity=p;e.style.transform=p<1?`translateX(${(s*90*(1-p)).toFixed(2)}px)`:'';}
  else if(k==='mask'){e.style.opacity=r>0?1:0;e.style.clipPath=`inset(0 ${(100*(1-eio(r))).toFixed(2)}% 0 0 round 24px)`;}
  else if(k==='zoom'){e.style.opacity=p;e.style.transform=`scale(${(1.35-.35*p).toFixed(4)})`;}
  else if(k==='draw'){e.style.opacity=r>0?1:0;e.style.strokeDashoffset=(1-eio(r)).toFixed(4);}
  else if(k==='grow'){e.style.opacity=r>0?1:0;e.style.transform=`scaleX(${eio(r).toFixed(4)})`;}
  else if(k==='growy'){e.style.opacity=r>0?1:0;e.style.transform=`scaleY(${sp(r*1.15).toFixed(4)})`;}
  else if(k==='type'){const f=e.dataset.text;e.style.opacity=r>0?1:0;e.textContent=f.slice(0,Math.round(f.length*r));}
  else if(k==='flip'){e.style.opacity=cl(r*3);e.style.transform=`perspective(1200px) rotateY(${(80*(1-p)).toFixed(2)}deg)`;}
  else{e.style.opacity=p;}}
 for(const e of ons){const a=+e.dataset.on,b=e.dataset.off?+e.dataset.off:1e9,p=eo(cl((t-a)/.35))*(1-eo(cl((t-b)/.3)));
  e.style.setProperty('--on',p.toFixed(3));e.classList.toggle('is-on',p>.5);if(e.classList.contains('hl'))e.style.opacity=p;}
 // Counters: data-count="t:value,..." plus optional data-dec, data-pre, data-suf; thousands separators added.
 counts.forEach((c,i)=>{const v=ramp(cntS[i],t,+(c.dataset.cd||.9)),dec=+(c.dataset.dec||0);
  c.textContent=(c.dataset.pre||'')+v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})+(c.dataset.suf||'');;
  c.style.visibility=cntS[i].length>1&&t<cntS[i][1][0]?'hidden':'';});  // a number shows only once it starts counting (no "0" on early skeleton cards)
 tys.forEach((e,i)=>{e.style.transform=`translateY(${ramp(tyS[i],t,+(e.dataset.tyd||.55)).toFixed(2)}px)`;});
 txs.forEach((e,i)=>{e.style.transform=`translateX(${ramp(txS[i],t,+(e.dataset.txd||.9),eio).toFixed(2)}px)`;});
 rots.forEach((e,i)=>{e.setAttribute('transform',`rotate(${ramp(rotS[i],t,+(e.dataset.rotd||.6),eb).toFixed(2)} ${e.dataset.cx} ${e.dataset.cy})`);});
 for(const e of spins){const a=+e.dataset.at,deg=(+e.dataset.spin)*Math.max(0,t-a);e.setAttribute('transform',`rotate(${deg.toFixed(2)} ${e.dataset.cx} ${e.dataset.cy})`);}
 for(const f of flows){const {p,L}=paths.get(f),a=+f.dataset.at,per=+f.dataset.period,ph=+(f.dataset.phase||0);
  const hide=t<a||(f.dataset.once&&t-a>=per);
  const place=(el,u,fade)=>{const pt=p.getPointAtLength(u*L);el.setAttribute('cx',pt.x);el.setAttribute('cy',pt.y);el.style.opacity=fade;};
  if(hide){f.style.opacity=0;f._ghosts.forEach(g=>g.style.opacity=0);continue;}
  const u=(((t-a)/per)+ph)%1,base=Math.min(cl((t-a)/.3),cl(u/.08),cl((1-u)/.08));place(f,u,base);
  f._ghosts.forEach((g,k)=>{const ug=u-.022*(k+1);ug<0?g.style.opacity=0:place(g,ug,base*(.55-.1*k));});}
 for(const e of pulses){const a=+e.dataset.at;if(t<a){e.style.opacity=0;continue;}const u=(((t-a)/(+e.dataset.pulse))+(+(e.dataset.phase||0)))%1;
  e.style.opacity=(.6*(1-u)).toFixed(3);e.style.transform=`scale(${(1+3.6*u).toFixed(3)})`;}
 bar.style.width=(100*cl(t/S.duration)).toFixed(3)+'%';
 {const o=t>=+scenes[scenes.length-1].dataset.start?0:1;logo.style.opacity=o;const nw=document.querySelector('.v-news');if(nw)nw.style.opacity=o;}
 const i=S.captions.findIndex(c=>t>=c.start&&t<c.end);
 if(i!==lastCue){cap.innerHTML=i<0?'':S.captions[i].words.map(w=>`<b data-s="${w.s}">${w.t.replace(/[<&]/g,'')}</b>`).join(' ');lastCue=i;}
 if(i>=0){const ws=[...cap.children];let k=-1;ws.forEach((w,j)=>{if(t>=+w.dataset.s)k=j;});
  ws.forEach((w,j)=>{w.classList.toggle('on',j===k);const r=j===k?eo(cl((t-(+w.dataset.s))/.18)):0;w.style.transform=`scale(${(1+.06*r).toFixed(3)})`;});
  const cr=eo(cl((t-S.captions[i].start)/.2));cap.style.opacity=cr;cap.style.transform=`translateY(${(18*(1-cr)).toFixed(1)}px)`;}
 return true;};
window.setTime(0);})();
