/* Local source bridge. The parent's CSP stays intact: no inline script or network fetch. */
(() => {
  'use strict';
  const config=parent.ShortCreatorSourceStages.childConfig(window);
  window.__sourceConfig=config;
  window.__sourceFailure=null;
  addEventListener('error',event=>{window.__sourceFailure=event.message;});
  addEventListener('unhandledrejection',event=>{window.__sourceFailure=String(event.reason);});
  const allowed=new Set([...Object.values(config.resources),config.bodyFont,config.displayFont,config.wordSvg].filter(Boolean));
  function bytes(uri) {
    if(!allowed.has(uri)||!/^data:[^,]*;base64,/.test(uri))throw new Error('Unknown source payload');
    return Uint8Array.from(atob(uri.slice(uri.indexOf(',')+1)),character=>character.charCodeAt(0));
  }
  // Source loaders receive only the exact compiled payloads already in memory.
  window.fetch=async input=>{
    const uri=typeof input==='string'?input:input?.url;
    return new Response(bytes(uri),{status:200,headers:{'Content-Type':uri.slice(5,uri.indexOf(';'))}});
  };
  window.__sourceFontsReady=Promise.all([[config.bodyFont,'600'],[config.displayFont,'800']].map(([uri,weight])=>{
    const face=new FontFace('BrandSans',bytes(uri),{weight});document.fonts.add(face);return face.load();
  }));
  let seed=11;
  Math.random=()=>{seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
  window.__hyperframes={getVariables:()=>config.vars};window.__timelines={};
  const css=document.createElement('style');
  css.textContent=`html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${config.colors.background}}canvas{display:block;width:100%;height:100%}`;
  document.head.appendChild(css);
  if(config.style==='glass-shard'){
    window.gstMulberry32=seed=>()=>{let s=seed=(seed+0x6d2b79f5)|0,t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
    window.__GST={st:{time:0,tin:0,tout:0,thickness:.5,roughness:.07,ior:1.52},
      vars:{headline:config.vars.headline,tileCount:8,roundness:.4,bevel:.35,meshSmooth:.6,
        flyInTime:2.3,flyOutTime:2.4,stagger:.27,flyInRotation:5,flyOutRotation:6,chaos:.25,
        padding:1,sizeVariance:.35,gap:.03,easePow:10,sideDist:3,zDist:-42,zOut:14,fog:36}};
  }
})();
