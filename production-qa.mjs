import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
export async function checkProduction(page,episode,out,report,configuration) {
  const {profile,geometry}=configuration;
  assert.equal(episode.format,profile.id);
  const outputViewport={width:profile.width,height:profile.height};
  assert.ok(episode.duration>1&&episode.duration<=600);
  const cues=JSON.parse(fs.readFileSync(path.join(out,'captions.json'))).cues;
  const scenes=await page.locator('.scene').evaluateAll(nodes=>nodes.map(node=>({start:+node.dataset.start,end:+node.dataset.end,name:node.dataset.name})));
  assert.equal(scenes.length,episode.scenes.length);
  assert.equal(scenes.at(-1).end,episode.duration);
  const exchangeVariants=['answer-stream','research-stream','message-thread'];
  async function inspectGlassParallax(spec,time){
    const o=await page.locator('.scene[aria-hidden="false"] .glass-parallax-board').evaluate(board=>{
      const canvas=board.querySelector('canvas'),im=board.querySelector('img'),css=getComputedStyle(board);
      return {clock:JSON.parse(board.dataset.glassParallax),stats:window.ShortCreatorGlassParallax.stats(),
        source:window.ShortCreatorGlassParallaxMotion.source,size:[canvas.width,canvas.height],image:{src:im.getAttribute('src'),w:im.naturalWidth,h:im.naturalHeight},
        heading:board.parentElement.querySelector('.glass-parallax-heading').textContent,sourceCopy:board.parentElement.querySelector('.interface-source').textContent,
        sourceAlpha:+getComputedStyle(board.parentElement.querySelector('.interface-source')).opacity,visibility:css.visibility,
        colors:['--cyan','--lime'].map(k=>css.getPropertyValue(k).trim()),controls:board.querySelectorAll('button,a,input,form,textarea').length};
    });
    const t=presentationTime(spec,time,20),near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<.00002,'Glass '+a+' != '+b),
      vector=(a,b)=>a.forEach((v,i)=>near(v,b[i])),stats=o.stats,aspect=o.size[0]/o.size[1],horizontal=aspect/(16/9);
    let x=.16,y=.04;
    for(const [start,duration,tx,ty]of [[.5,3.5,.45,-.15],[4,3.5,-.35,.25],[7.5,3,.15,-.35],[10.5,3,-.45,.05],[13.5,3,.3,.2],[16.5,2.5,-.1,-.1],[19,1,.16,.04]]){
      const p=Math.max(0,Math.min(1,(t-start)/duration)),e=start===19?(p<.5?4*p**3:1-4*(1-p)**3):(1-Math.cos(Math.PI*p))/2;
      const a=x+(tx-x)*e,b=y+(ty-y)*e;if(t<start+duration){x=a;y=b;break;}x=tx;y=ty;
    }
    near(o.clock.time,t);vector(stats.camera,[x*.38*horizontal,-y*.27,9.35]);
    vector(stats.textPosition,[-x*.56*horizontal,y*.36,Math.sin(t*.28)*.018]);vector(stats.textRotation,[y*.028,x*.042,0]);
    vector(stats.glassRotation,[-y*.064,x*.078,0]);near(stats.projection[0],1/Math.tan(17*Math.PI/180)/aspect);near(stats.projection[5],1/Math.tan(17*Math.PI/180));
    assert.equal(stats.contexts,1);assert.equal(stats.revision,'185');assert.equal(stats.panes,54);assert.equal(stats.geometries,222);assert.equal(stats.textures,16);
    assert.deepEqual(stats.bloom,{strength:.32,radius:.4,threshold:.86,mips:5});near(stats.uniforms.time,t);near(stats.uniforms.strength,.024);
    const linear=o.colors.map(color=>[1,3,5].map(i=>{const s=parseInt(color.slice(i,i+2),16)/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}));
    for(const sample of stats.samples){
      const d=sample.initial,local=t*d.speed+d.phase,ax=d.basePos.x-x*4.86*horizontal,ay=d.basePos.y-y*2.84,len=Math.max(Math.hypot(ax,ay),.001);
      const reveal=Math.max(0,1-Math.hypot(ax,ay)/2.18)**2,shatter=reveal*.36,spread=reveal*.24,ss=shatter*.68,slide=d.ptrWeight*1.9;
      vector(sample.position,[d.basePos.x+Math.sin(local*.42)*d.drift.x+x*slide+ax/len*(spread+ss),
        d.basePos.y+Math.cos(local*.38)*d.drift.y-y*slide*.72+ay/len*(spread+ss*.84),d.basePos.z+Math.sin(local*.52+sample.index)*d.drift.z+reveal*.32+shatter*.74]);
      vector(sample.rotation,[d.baseRot.x+Math.sin(local*.46)*d.rotDrift.x-y*d.ptrWeight*1.15+reveal*ay/len*.16+shatter*ay/len*.58,
        d.baseRot.y+Math.cos(local*.43)*d.rotDrift.y+x*d.ptrWeight*1.38-reveal*ax/len*.2-shatter*ax/len*.66,
        d.baseRot.z+Math.sin(local*.34)*d.rotDrift.z+reveal*Math.sin(local+sample.index)*.028+shatter*(d.rad.x*ay-d.rad.y*ax)*.18]);
      near(sample.opacity,.76+shatter*.14);near(sample.roughness,Math.min(.14,d.roughness+shatter*.048));
      vector(sample.edges,[d.edgeWBase+shatter*.34,d.edgeCBase+shatter*.22,d.edgePBase+shatter*.2]);
      near(sample.transmission,1);near(sample.ior,1.55);near(sample.thickness,d.thickness);assert.ok(sample.vertices>100);
      vector(sample.color,[1,1,1]);vector(sample.attenuation,linear[0].map(v=>.85+.15*v));
      vector(sample.edgeColors[0],[1,1,1]);vector(sample.edgeColors[1],linear[0]);vector(sample.edgeColors[2],linear[1]);
    }
    for(const [x,y]of stats.imageCorners)assert.ok(x>=-.1&&x<=o.size[0]+.1&&y>=-.1&&y<=o.size[1]+.1,'Glass backdrop crops the supplied image');
    assert.equal(o.source,'1c3d3eeb6d64c59dd8f7d211792de1b9abd73547c07bf3e79bd59e2a2882fa2f');
    assert.equal(o.image.src,configuration.assets[spec.content.image]);assert.ok(o.image.w>=32&&o.image.h>=32);
    const fit=stats.fit,scale=Math.min(o.size[0]/1.36/o.image.w,o.size[1]/1.36/o.image.h);
    near(fit.width,o.image.w*scale);near(fit.height,o.image.h*scale);near(fit.x,(o.size[0]-fit.width)/2);near(fit.y,(o.size[1]-fit.height)/2);
    assert.equal(o.heading,spec.content.heading);assert.equal(o.sourceCopy,spec.content.source);assert.equal(o.controls,0);
    const frame=Math.floor(time*30+1e-7),start=Math.ceil((cues[spec.cues[0]].start+.4)*30),p=Math.max(0,Math.min(1,(frame-Math.ceil((cues[spec.cues[1]].start+.4)*30))/24));
    assert.equal(o.visibility,frame>=start?'visible':'hidden');near(o.sourceAlpha,1-(1-p)**3);
    return {time:t,camera:stats.camera,panes:54,projectedImage:stats.imageCorners,bloom:stats.bloom};
  }
  async function inspectShatterPanels(spec,time,checkPixels=false){
    const o=await page.locator('.scene[aria-hidden="false"] .shatter-panels-board').evaluate((board,pixels)=>{
      const canvas=board.querySelector('canvas'),css=getComputedStyle(board);let image=null;
      if(pixels){
        const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        const reference=document.createElement('canvas');reference.width=canvas.width;reference.height=canvas.height;
        const ctx=reference.getContext('2d',{alpha:false}),still=window.ShortCreatorShaders.verifiedImage(board.querySelectorAll('img')[1]);
        const scale=Math.min(canvas.width/still.naturalWidth,canvas.height/still.naturalHeight),w=still.naturalWidth*scale,h=still.naturalHeight*scale;
        ctx.fillStyle=css.getPropertyValue('--purple').trim();ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(still,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
        const expected=ctx.getImageData(0,0,canvas.width,canvas.height).data;let maximumError=0,squared=0,transparent=0;
        for(let i=0;i<data.length;i++){if(i%4===3){if(data[i]!==255)transparent++;continue;}
          const error=Math.abs(data[i]-expected[i]);maximumError=Math.max(maximumError,error);squared+=error*error;}
        image={transparent,maximumError,rmse:Math.sqrt(squared/(canvas.width*canvas.height*3))};
      }
      return {s:JSON.parse(board.dataset.shatterPanels),stats:window.ShortCreatorShatterPanels.stats(),
        source:window.ShortCreatorShatterShader.source_sha256,size:[canvas.width,canvas.height],
        images:[...board.querySelectorAll('img')].map(n=>({src:n.getAttribute('src'),w:n.naturalWidth,h:n.naturalHeight})),
        heading:board.parentElement.querySelector('.shatter-panels-heading').textContent,
        sourceCopy:board.parentElement.querySelector('.interface-source').textContent,
        sourceAlpha:+getComputedStyle(board.parentElement.querySelector('.interface-source')).opacity,
        visibility:css.visibility,color:css.getPropertyValue('--cyan').trim(),image,
        controls:board.querySelectorAll('button,a,input,form,textarea').length};
    },checkPixels);
    const t=presentationTime(spec,time,12),clamp=p=>Math.max(0,Math.min(1,p)),out=p=>1-(1-p)**3;
    const phase=t<2?0:t<4?1:2,crack=phase===1?clamp((t-2)/2)**2:0,p=clamp((t-4)/1.5);
    const background=phase===2?p*p*(3-2*p):0,opacity=t<=10?1:(12-t)/2;
    const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<.00002,'Shatter '+a+' != '+b),stats=o.stats,u=stats.uniforms;
    near(o.s.clock.time,t);near(o.s.state.time,t);assert.equal(o.s.state.phase,phase);
    near(o.s.state.crack,crack);near(o.s.state.background,background);near(o.s.state.opacity,opacity);
    near(stats.cameraZ,10);near(stats.projection[0],2/(o.size[0]/o.size[1]));near(stats.projection[5],2);
    assert.equal(stats.fullVisible,phase<2);assert.equal(stats.backVisible,phase===2);near(stats.backOpacity,background);
    if(phase<2){near(u.uCrackProgress,crack);near(u.uAspect,o.size[0]/o.size[1]);
      [1,3,5].map(j=>parseInt(o.color.slice(j,j+2),16)/255).forEach((v,j)=>{near(u.uCrackColor[j],v);near(u.uImpactColor[j],v*.6);});
    }else assert.ok(Math.min(Math.abs(u.opacity-opacity),Math.abs(u.opacity-background))<.00002);
    assert.equal(o.source,'8e74692cd23813233ad826ee1ec2379c4f6ec91128b774e8df4b8bf23bff3dbf');
    assert.equal(stats.revision,'185');assert.equal(stats.contexts,1);assert.equal(stats.allocatedGeometries,202);
    assert.ok(stats.geometries>=1&&stats.geometries<=202);assert.ok(stats.textures>=1&&stats.textures<=2);assert.equal(stats.shards,200);
    assert.equal(o.heading,spec.content.heading);assert.equal(o.sourceCopy,spec.content.source);assert.equal(o.controls,0);
    assert.deepEqual(o.images.map(i=>i.src),spec.content.images.map(name=>configuration.assets[name]));
    o.images.forEach((im,i)=>{assert.ok(im.w>=32&&im.h>=32);const fit=stats.fits[i],scale=Math.min(o.size[0]/im.w,o.size[1]/im.h);
      near(fit.width,im.w*scale);near(fit.height,im.h*scale);near(fit.x,(o.size[0]-fit.width)/2);near(fit.y,(o.size[1]-fit.height)/2);});
    for(const sample of stats.samples){
      assert.equal(sample.vertices,96);assert.equal(sample.visible,phase===2&&opacity>0);near(sample.opacity,phase===2?opacity:1);
      near(sample.firstVertex[0],(sample.firstUV[0]-.5)*stats.geometry.aspect);near(sample.firstVertex[1],sample.firstUV[1]-.5);
      const row=sample.initial,position=[0,0,0],rotation=[0,0,0],velocity=[row.vx,row.vy,row.vz],angular=[row.rx,row.ry,row.rz];
      let settled=false;
      for(let step=0;step<Math.floor(Math.max(0,t-4)/(1/30))&&!settled;step++){
        velocity[1]-=2.5/30;
        for(let axis=0;axis<3;axis++){position[axis]+=velocity[axis]/30;rotation[axis]+=angular[axis]/30;}
        if(row.cy+position[1]<-.8&&velocity[1]<0){position[1]=-.8-row.cy;velocity[1]*=-.6;velocity[0]*=.92;velocity[2]*=.92;
          for(let axis=0;axis<3;axis++)angular[axis]*=.92;if(Math.abs(velocity[1])<.05)settled=true;}
      }
      if(phase===2)position[2]+=.01;
      position.forEach((value,i)=>near(sample.position[i],value));rotation.forEach((value,i)=>near(sample.rotation[i],value));
    }
    const frame=Math.floor(time*30+1e-7),start=Math.ceil((cues[spec.cues[0]].start+.4)*30);
    assert.equal(o.visibility,frame>=start?'visible':'hidden');
    near(o.sourceAlpha,out(clamp((frame-Math.ceil((cues[spec.cues[1]].start+.4)*30))/24)));
    if(checkPixels){assert.equal(o.image.transparent,0);assert.ok(o.image.maximumError<=2,'Shatter final image differs from verified still');assert.ok(o.image.rmse<.2,'Shatter final image pixel mismatch');}
    return {time:t,phase,crack,background,opacity,pixels:o.image,geometries:stats.geometries};
  }
  async function inspectPortalPanels(spec,time,checkPixels=false){
    const o=await page.locator('.scene[aria-hidden="false"] .portal-panels-board').evaluate((board,pixels)=>{
      const canvas=board.querySelector('canvas'),css=getComputedStyle(board);let image=null;
      if(pixels){const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();let transparent=0;
        for(let i=0;i<data.length;i+=4)if(data[i+3]!==255)transparent++;
        for(let i=0;i<data.length;i+=4*113)colors.add(data[i]+','+data[i+1]+','+data[i+2]);
        const reference=document.createElement('canvas');reference.width=canvas.width;reference.height=canvas.height;
        const ctx=reference.getContext('2d',{alpha:false}),still=window.ShortCreatorShaders.verifiedImage(board.querySelectorAll('img')[1]);
        const scale=Math.min(canvas.width/still.naturalWidth,canvas.height/still.naturalHeight),w=still.naturalWidth*scale,h=still.naturalHeight*scale;
        ctx.fillStyle=css.getPropertyValue('--purple').trim();ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(still,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
        const expected=ctx.getImageData(0,0,canvas.width,canvas.height).data;let maximumError=0,squared=0;
        for(let i=0;i<data.length;i++)if(i%4!==3){const error=Math.abs(data[i]-expected[i]);maximumError=Math.max(maximumError,error);squared+=error*error;}
        image={transparent,colors:colors.size,maximumError,rmse:Math.sqrt(squared/(canvas.width*canvas.height*3))};}
      return {s:JSON.parse(board.dataset.portalPanels),stats:window.ShortCreatorPortalPanels.stats(),
        source:window.ShortCreatorPortalPanelsShader.source_sha256,size:[canvas.width,canvas.height],
        images:[...board.querySelectorAll('img')].map(n=>({src:n.getAttribute('src'),w:n.naturalWidth,h:n.naturalHeight})),
        heading:board.parentElement.querySelector('.portal-panels-heading').textContent,
        sourceCopy:board.parentElement.querySelector('.interface-source').textContent,
        sourceAlpha:+getComputedStyle(board.parentElement.querySelector('.interface-source')).opacity,
        visibility:css.visibility,colors:['--cyan','--lime'].map(k=>css.getPropertyValue(k).trim()),
        image,controls:board.querySelectorAll('button,a,input,form,textarea').length};
    },checkPixels);
    const t=presentationTime(spec,time,10),clamp=p=>Math.max(0,Math.min(1,p)),q=(a,d)=>clamp((t-a)/d);
    const out=p=>1-(1-p)**3,io=p=>p<.5?4*p**3:1-(-2*p+2)**3/2;
    const expected={portalRadius:t<5?.85*io(q(1.5,3.5)):.85+.95*q(5,2)**4,
      energyIntensity:t<1.5?.3*q(.3,1.2)**3:t<5?.3+.7*(1-(1-q(1.5,.6))**4):t<6.2?1+.5*q(5,.8)**3:1.5*(1-out(q(6.2,1.2))),
      chromaticStrength:t<5.5?.035*q(1.5,2)**3:t<6.8?.035+.025*q(5.5,1)**4:.06*(1-out(q(6.8,1))),
      distortionStrength:t<6.5?.06*io(q(1.5,2.5)):.06*(1-out(q(6.5,1))),
      edgeWidth:.06+.01*(1-Math.cos(Math.PI*q(2,2))),time:t,nativeAspect:o.size[0]/o.size[1]};
    const near=(a,b)=>assert.ok(Math.abs(a-b)<.00002,'Portal '+a+' != '+b),stats=o.stats,u=stats.uniforms;
    near(o.s.clock.time,t);near(o.s.state.time,t);for(const [key,value]of Object.entries(expected))near(u[key],value);
    const z=t<7?2.8-1.4*io(q(3.5,3)):1.4+1.4*out(q(7,2.5));
    near(stats.cameraZ,z);near(stats.frontScale,z/2.8);near(stats.backScale,(z+.01)/2.8);
    near(stats.projection[0],1/Math.tan(25*Math.PI/180)/(o.size[0]/o.size[1]));
    near(stats.projection[5],1/Math.tan(25*Math.PI/180));
    for(const [i,key]of ['glowColor','glowColor2'].entries())
      [1,3,5].map(j=>parseInt(o.colors[i].slice(j,j+2),16)/255).forEach((v,j)=>near(u[key][j],v));
    assert.deepEqual(u.sparkColor,[1,1,1]);assert.deepEqual(u.portalCenter,[.5,.5]);
    assert.equal(o.source,'3a70718be5486fc7936bf4f2ddbd3addf53533048f2e53dee47b5b8de82c2526');
    assert.equal(stats.revision,'185');assert.equal(stats.contexts,1);assert.equal(stats.geometries,2);
    assert.equal(stats.textures,2);assert.equal(stats.triangles,4);
    assert.equal(o.heading,spec.content.heading);assert.equal(o.sourceCopy,spec.content.source);assert.equal(o.controls,0);
    assert.deepEqual(o.images.map(i=>i.src),spec.content.images.map(name=>configuration.assets[name]));
    o.images.forEach((im,i)=>{assert.ok(im.w>=32&&im.h>=32);const fit=stats.fits[i],scale=Math.min(o.size[0]/im.w,o.size[1]/im.h);
      near(fit.width,im.w*scale);near(fit.height,im.h*scale);near(fit.x,(o.size[0]-fit.width)/2);near(fit.y,(o.size[1]-fit.height)/2);});
    const frame=Math.floor(time*30+1e-7),start=Math.ceil((cues[spec.cues[0]].start+.4)*30);
    assert.equal(o.visibility,frame>=start?'visible':'hidden');
    near(o.sourceAlpha,out(clamp((frame-Math.ceil((cues[spec.cues[1]].start+.4)*30))/24)));
    if(checkPixels){assert.equal(o.image.transparent,0);assert.ok(o.image.maximumError<=2,'Portal final image differs from verified still');assert.ok(o.image.rmse<.2,'Portal final image pixel mismatch');}
    if(t>=10-1e-8){near(u.energyIntensity,0);near(u.distortionStrength,0);near(u.chromaticStrength,0);near(z,2.8);}
    return {time:t,uniforms:u,cameraZ:z,pixels:o.image};
  }
  function liquidTime(spec,time) {
    const frame=Math.floor(time*30+1e-7),f=spec.cues.map(c=>Math.ceil((cues[c].start+.4)*30));
    if(frame<f[1])return 5*Math.max(0,Math.min(1,(frame-f[0])/(f[1]-f[0])));
    const elapsed=frame-f[1],gap=f[2]-f[1],p=Math.max(0,Math.min(1,(elapsed-gap)/24));
    return 5+7*(Math.min(elapsed,gap)+24*(p-p**3+.5*p**4))/(gap+12);
  }
  async function inspectLiquidPanels(spec,time,checkPixels=false) {
    const o=await page.locator('.scene[aria-hidden="false"] .liquid-panels-board').evaluate((board,pixels)=>{
      const canvas=board.querySelector('canvas'),g=canvas.getContext('2d'),css=getComputedStyle(board);
      let image=null;
      if(pixels){
        const data=g.getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();let transparent=0;
        for(let i=0;i<data.length;i+=4)if(data[i+3]!==255)transparent++;
        for(let i=0;i<data.length;i+=4*113)colors.add(data[i]+','+data[i+1]+','+data[i+2]);
        image={transparent,colors:colors.size,center:Array.from(g.getImageData(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1).data)};
      }
      return {s:JSON.parse(board.dataset.liquidPanels),stats:window.ShortCreatorLiquidPanels.stats(),
        source:window.ShortCreatorLiquidPanelsShader.source_sha256,size:[canvas.width,canvas.height],
        images:[...board.querySelectorAll('img')].map(n=>n.getAttribute('src')),
        heading:board.parentElement.querySelector('.liquid-panels-heading').textContent,
        sourceCopy:board.parentElement.querySelector('.interface-source').textContent,
        visibility:css.visibility,colors:{background:css.getPropertyValue('--purple').trim(),secondary:css.getPropertyValue('--cyan').trim()},
        image,controls:board.querySelectorAll('button,a,input,form,textarea').length};
    },checkPixels);
    const t=liquidTime(spec,time),frame=Math.floor(time*30+1e-7),start=Math.ceil((cues[spec.cues[0]].start+.4)*30);
    const clamp=p=>Math.max(0,Math.min(1,p)),q=(a,d)=>clamp((t-a)/d),out=p=>1-(1-p)**3;
    const smooth=(p,n=3)=>p<.5?2**(n-1)*p**n:1-(-2*p+2)**n/2,sine=p=>(1-Math.cos(Math.PI*p))/2;
    let wave=out(q(0,2)),ripple=.6*out(q(.5,2.5));
    if(t>=4.5){wave=1+1.5*q(4.5,1)**3;ripple=.6+1.4*q(4.5,1)**3;}
    if(t>=6.5){wave=2.5-1.5*out(q(6.5,2));ripple=2-1.5*out(q(6.5,2));}
    if(t>=9){wave=1-.3*sine(q(9,2));ripple=.5-.2*sine(q(9,2));}
    let rotations=[.06*smooth(q(2,2.5),2)-.09*smooth(q(6.5,2.5),2),-.04*smooth(q(2,2.5),2)+.07*smooth(q(6.5,2.5),2),0];
    if(t>=10.5){const hold=1-smooth(q(10.5,1.5));wave=(1-.3*sine(.75))*hold;ripple=(.5-.2*sine(.75))*hold;rotations=[-.03*hold,.03*hold,0];}
    const near=(a,b)=>assert.ok(Math.abs(a-b)<.00002,'Liquid panels '+a+' != '+b),u=o.stats.uniforms;
    near(o.s.clock.time,t);near(o.s.state.time,t);near(u.uTime,t);near(u.uMix,smooth(q(5,2)));
    near(u.uWaveIntensity,wave);near(u.uRippleIntensity,ripple);rotations.forEach((v,i)=>near(o.stats.cameraRotation[i],v));
    const secondary=[1,3,5].map(i=>parseInt(o.colors.secondary.slice(i,i+2),16)/255*.2);
    secondary.forEach((v,i)=>near(u.uHighlightColor[i],v));
    assert.equal(o.source,'0bdc2d57d292c5d4d937908fb02c9d646ee141014a90637534f331b49a46d5df');
    assert.equal(o.stats.revision,'185');assert.equal(o.stats.contexts,1);assert.equal(o.stats.geometries,1);
    assert.equal(o.stats.textures,2);assert.equal(o.stats.triangles,12000);
    assert.deepEqual(o.images,spec.content.images.map(name=>configuration.assets[name]));
    assert.equal(o.heading,spec.content.heading);assert.equal(o.sourceCopy,spec.content.source);assert.equal(o.controls,0);
    assert.equal(o.visibility,frame>=start?'visible':'hidden');
    const g=o.stats.geometry;assert.deepEqual([g.width,g.height],o.size);
    near(g.planeWidth,4.8);near(g.planeHeight,4.8*o.size[1]/o.size[0]);assert.deepEqual(g.segments,[100,60]);
    near(o.stats.projection[0],g.zoom/Math.tan(Math.PI/8)/(o.size[0]/o.size[1]));
    near(o.stats.projection[5],g.zoom/Math.tan(Math.PI/8));
    if(checkPixels){assert.equal(o.image.transparent,0);assert.ok(o.image.colors>20,'Liquid sheet is blank or uniform');}
    if(t>=12-1e-8){near(wave,0);near(ripple,0);near(u.uMix,1);rotations.forEach(v=>near(v,0));}
    return {time:t,wave,ripple,mix:u.uMix,rotations,geometry:g,pixels:o.image};
  }
  async function inspectUIReveal(spec,time) {
    const o=await page.locator('.scene[aria-hidden="false"] .ui-reveal-board').evaluate(board=>{
      const node=n=>{const css=getComputedStyle(n),b=n.getBoundingClientRect(),m=new DOMMatrix(css.transform);
        return {text:n.textContent,alpha:+css.opacity,font:css.fontFamily,visibility:css.visibility,
          matrix:[m.m11,m.m13,m.m31,m.m33,m.m41,m.m42,m.m43],box:[b.left,b.top,b.right,b.bottom],
          width:n.clientWidth,height:n.clientHeight,scrollWidth:n.scrollWidth,scrollHeight:n.scrollHeight};};
      const pick=selector=>node(board.querySelector(selector)),image=board.querySelector('.ui-reveal-screenshot');
      const parts=selector=>[...board.querySelector(selector).querySelectorAll('g')].map(n=>({
        stroke:+getComputedStyle(n.children[0]).opacity,fill:+getComputedStyle(n.children[1]).opacity,
        href:n.children[1].getAttribute('href')}));
      return {s:JSON.parse(board.dataset.uiReveal),g:JSON.parse(board.dataset.geometry),board:node(board),
        frame:pick('.ui-reveal-frame'),perspective:getComputedStyle(board.querySelector('.ui-reveal-perspective')).perspective,
        scene:pick('.ui-reveal-perspective'),heading:pick('.ui-reveal-heading'),toolbar:pick('.ui-reveal-toolbar'),
        left:pick('.ui-reveal-layers'),right:pick('.ui-reveal-properties'),art:pick('.ui-reveal-artboard'),
        selection:pick('.ui-reveal-selection'),tagline:pick('.ui-reveal-tagline'),action:pick('.ui-reveal-action'),
        selectionStyle:['left','top','width','height'].map(k=>parseFloat(board.querySelector('.ui-reveal-selection').style[k])),
        image:{width:image.naturalWidth,height:image.naturalHeight,src:image.getAttribute('src'),fit:getComputedStyle(image).objectFit},
        rows:[...board.querySelectorAll('.ui-reveal-layer')].map(n=>({...node(n),selected:n.classList.contains('selected')})),
        properties:[...board.querySelectorAll('.ui-reveal-property')].map(n=>[n.children[0].textContent,n.children[1].textContent]),
        copy:[...board.querySelectorAll('[data-ui-reveal-copy]')].map(node),
        intro:parts('.ui-reveal-intro'),outro:parts('.ui-reveal-outro'),outroNode:pick('.ui-reveal-outro'),
        letters:[...board.querySelectorAll('.ui-reveal-tagline span')].map(node),
        pillOffset:+board.querySelector('.ui-reveal-pill-border').getAttribute('stroke-dashoffset'),
        controls:board.querySelectorAll('button,input,form,a,textarea').length,
        uniqueIds:new Set([...document.querySelectorAll('[id]')].map(n=>n.id)).size===document.querySelectorAll('[id]').length};
    });
    const t=presentationTime(spec,time,12.3),c=spec.content,s=o.s,g=o.g;
    const near=(a,b,epsilon=.002)=>assert.ok(Math.abs(a-b)<epsilon,'UI reveal '+a+' != '+b);
    const clamp=p=>Math.max(0,Math.min(1,p)),phase=(a,d)=>clamp((t-a)/d);
    const sine=p=>(1-Math.cos(Math.PI*p))/2,expo=p=>p===1?1:1-2**(-10*p);
    const entry=expo(phase(1.5,.55)),p=phase(3.5,1.3),push=p<.5?8*p**4:1-(-2*p+2)**4/2;
    const scale=.74+.05*entry+.36*push,exit=phase(7.3,.55)**5;
    const angleAtExit=-31-4*sine(clamp(.85/.9));
    const angle=t<5.55?-34*expo(phase(4.2,1.35)):t<6.45?-34+3*sine(phase(5.55,.9))
      :t<7.3?-31-4*sine(phase(6.45,.9)):angleAtExit+(-65-angleAtExit)*exit;
    near(s.time,t);near(s.scale,scale);near(s.rotation,angle);near(s.z,-7500*exit);
    near(o.frame.alpha,entry);near(o.frame.matrix[0],Math.cos(angle*Math.PI/180)*scale);
    near(o.frame.matrix[1],-Math.sin(angle*Math.PI/180)*scale);near(o.frame.matrix[2],Math.sin(angle*Math.PI/180));
    near(o.frame.matrix[3],Math.cos(angle*Math.PI/180));near(o.frame.matrix[5],s.y);near(o.frame.matrix[6],s.z,.02);
    near(o.scene.matrix[4],-2200*exit*o.board.width/1920,.02);assert.equal(o.perspective,'2800px');
    assert.equal(o.frame.visibility,t<7.85&&s.clock.visible?'visible':'hidden');assert.equal(o.controls,0);assert.ok(o.uniqueIds);
    assert.equal(o.heading.text,c.heading);assert.equal(o.tagline.text,c.tagline);assert.equal(o.action.text,c.action);
    assert.deepEqual(o.rows.map(n=>n.text),c.layers);assert.deepEqual(o.rows.map(n=>n.selected),c.layers.map((_,i)=>i===c.selected));
    assert.deepEqual(o.properties,c.properties.map(n=>[n.label,n.value]));
    for(const n of o.copy){assert.ok(n.font.includes('BrandSans'),'Unapproved UI reveal font');
      assert.ok(n.scrollWidth<=n.width+1&&n.scrollHeight<=n.height+1,'UI reveal text overflow: '+n.text);}
    near(o.toolbar.alpha,s.toolbar);near(o.toolbar.matrix[5],-10*(1-s.toolbar));
    near(o.left.alpha,s.left);near(o.left.matrix[4],-16*(1-s.left));
    near(o.right.alpha,s.right);near(o.right.matrix[4],16*(1-s.right));
    near(o.art.matrix[0],.94+.06*s.art);near(o.art.alpha,Math.min(1,s.art));near(o.selection.alpha,s.selection);
    const ratio=Math.min(o.art.width/o.image.width,o.art.height/o.image.height);
    const w=o.image.width*ratio,h=o.image.height*ratio;
    const selection=[(o.art.width-w)/2+w*c.selection.x,(o.art.height-h)/2+h*c.selection.y,w*c.selection.width,h*c.selection.height];
    selection.forEach((value,i)=>near(o.selectionStyle[i],value));assert.equal(o.image.fit,'contain');
    assert.equal(o.image.src,configuration.assets[c.image]);assert.ok(o.image.width>0&&o.image.height>0);
    for(const [key,parts] of [['intro',o.intro],['outro',o.outro]]){
      assert.equal(parts.length,5);parts.forEach((n,i)=>{assert.equal(n.href,'assets/logo.png');near(n.fill,s[key].parts[i].fill);near(n.stroke,s[key].strokeAlpha);});}
    o.letters.forEach((n,i)=>{near(n.alpha,s.letters[i]);near(n.matrix[5],8*(1-s.letters[i]));});
    near(o.pillOffset,500*(1-s.pill.stroke));near(o.action.alpha,s.pill.text);near(o.outroNode.alpha,t>=7.9?1:0);
    if(t>=3&&t<=7.3){const a=o.frame.box,b=o.board.box;
      assert.ok(a[0]>=b[0]&&a[1]>=b[1]&&a[2]<=b[2]&&a[3]<=b[3],'UI reveal camera leaves the approved content slot');}
    if(t>=12.3-1e-8){assert.ok(o.outro.every(n=>n.fill===1));near(o.action.alpha,1);assert.ok(o.letters.every(n=>n.alpha===1));}
    return {time:t,rotation:angle,scale,z:s.z,layers:o.rows.length,selection,compact:g.compact};
  }
  async function inspectHalftone(spec,time,checkPixels=false) {
    const observed=await page.locator('.scene[aria-hidden="false"] .backdrop-art').evaluate((view,checkPixels)=>{
      const canvas=view.querySelector('canvas'),css=getComputedStyle(view);
      const colors=['--purple','--lime','--cyan'].map(key=>css.getPropertyValue(key).trim());
      let pixels=null;
      if(checkPixels){
        const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let transparent=0;const samples=[];
        for(let i=0;i<data.length;i+=4)if(data[i+3]!==255)transparent++;
        for(let y=0;y<canvas.height;y+=17)for(let x=0;x<canvas.width;x+=17){
          const i=(y*canvas.width+x)*4;samples.push([data[i],data[i+1],data[i+2]]);
        }
        pixels={transparent,samples};
      }
      return {clock:JSON.parse(view.dataset.halftoneClock),size:[canvas.width,canvas.height],colors,
        stats:window.ShortCreatorHalftone.stats(),source:window.ShortCreatorHalftoneShader.source_sha256,pixels};
    },checkPixels);
    const frame=Math.floor(time*30+1e-7),start=Math.ceil((cues[spec.cues[0]].start+.4)*30),stop=Math.ceil((cues[spec.cues[1]].start+.4)*30);
    const elapsed=Math.max(0,frame-start),gap=stop-start,q=Math.max(0,Math.min(1,(elapsed-gap)/24));
    const sourceTime=q===1?10:10*(Math.min(elapsed,gap)+24*(q-q**3+.5*q**4))/(gap+12);
    const near=(a,b)=>assert.ok(Math.abs(a-b)<.00002,`Halftone ${a} != ${b}`),s=observed.stats,u=s.uniforms;
    near(observed.clock.sourceTime,sourceTime);assert.equal(observed.clock.settle,q);
    assert.equal(observed.clock.visible,frame>=start);assert.equal(observed.clock.entry,Math.min(1,elapsed/24));
    assert.equal(observed.source,'4b8e56dd736713db5a01274fb4fa5f96cf8ae7f4b3375772abf92d574efd3a08');
    assert.deepEqual([s.contexts,s.programs,s.buffers,s.textures,s.lost],[1,1,1,0,false]);
    assert.deepEqual(u.uRes,observed.size);near(u.uTime,sourceTime);near(u.uFreq,.3+5.7/9);
    near(u.uSpeed,.25);near(u.uCell,6+53*54/99);near(u.uGamma,.5+11*7.5/19);near(u.uBias,.1);
    const rgb=observed.colors.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));
    for(const [name,index] of [['uBg',0],['uPal0',2],['uPal1',1],['uPal2',0],['uPal3',0]])u[name].forEach((v,i)=>near(v,rgb[index][i]));
    if(checkPixels){
      assert.equal(observed.pixels.transparent,0,'Halftone must paint the entire opaque panel');
      const distinct=new Set(observed.pixels.samples.map(pixel=>pixel.join(',')));
      assert.ok(distinct.size>8,'Halftone shader did not produce a varying dot field');
      const low=[0,1,2].map(i=>Math.min(...rgb.map(c=>c[i]))*255),high=[0,1,2].map(i=>Math.max(...rgb.map(c=>c[i]))*255);
      for(const pixel of observed.pixels.samples)pixel.forEach((value,i)=>assert.ok(value>=low[i]-2&&value<=high[i]+2,'Halftone left approved palette bounds'));
    }
    return {source_time:sourceTime,size:observed.size,contexts:s.contexts,pixel_check:checkPixels};
  }
  async function inspectCursorRays(spec,time) {
    const o=await page.locator('.scene[aria-hidden="false"] .cursor-rays-board').evaluate(board=>{
      const rect=n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];};
      const node=n=>{const css=getComputedStyle(n),m=new DOMMatrix(css.transform);return {text:n.textContent,box:rect(n),alpha:+css.opacity,
        font:css.fontFamily,size:parseFloat(css.fontSize),matrix:[m.a,m.b,m.c,m.d,m.e,m.f],overflow:css.overflow,
        client:[n.clientWidth,n.clientHeight],scroll:[n.scrollWidth,n.scrollHeight]};};
      const pick=q=>node(board.querySelector(q)),canvas=board.querySelector('canvas'),logo=board.querySelector('.cursor-rays-source-logo'),style=getComputedStyle(board);
      return {state:JSON.parse(board.dataset.rayState),box:rect(board),W:board.clientWidth,H:board.clientHeight-54,
        card:pick('.cursor-rays-card'),word:pick('.cursor-rays-word'),typed:pick('.cursor-rays-typed'),first:pick('.cursor-rays-first'),second:pick('.cursor-rays-second'),
        supporting:[...board.querySelectorAll('.cursor-rays-support')].map(node),finale:[...board.querySelectorAll('.cursor-rays-final-line')].map(node),
        label:pick('.cursor-rays-label'),caret:{...pick('.cursor-rays-caret'),left:parseFloat(board.querySelector('.cursor-rays-caret').style.left)},
        canvas:{width:canvas.width,height:canvas.height,alpha:+getComputedStyle(canvas).opacity},
        colors:['--purple','--lime','--cyan'].map(key=>style.getPropertyValue(key).trim()),logo:{path:logo.getAttribute('src'),width:logo.naturalWidth,height:logo.naturalHeight},
        source:window.ShortCreatorCursorRayShader.source_sha256,stats:window.ShortCreatorCursorRays.stats(),
        unsafe:board.querySelectorAll('script,iframe,a,button,input,audio,video').length};
    });
    const t=presentationTime(spec,time,8),clamp=p=>Math.max(0,Math.min(1,p)),out=(p,n)=>1-(1-clamp(p))**n;
    const expo=p=>{p=clamp(p);return p===0||p===1?p:1-2**(-10*p);};
    const near=(a,b)=>assert.ok(Math.abs(a-b)<.003,`Cursor rays ${a} != ${b}`),c=spec.content;
    const chars=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(c.heading)].map(s=>s.segment);
    const count=t<3.15?0:Math.min(chars.length,1+Math.floor((t-3.15+1e-9)/.085));
    const typeEnd=3.15+(chars.length-1)*.085,slide=typeEnd+.25,end=slide+.05,exit=end+1,second=exit+.36;
    const ep=clamp((t-2.9)/.2),withdraw=ep===0||ep===1?ep:2**(10*ep-10),p=clamp((t-3.1)/.9),entry=-.806*p*p+1.806*p;
    const scale=t<4?1.45-.57*entry:.88-.04*clamp((t-4)/.4);
    near(o.state.clock.time,t);near(o.state.t,t);assert.equal(o.source,'71834bda1e5a5a45aa137e5b0eca2b9ed408cb7dc9b47a0dd4008eb7b4cfe235');
    assert.equal(o.unsafe,0);assert.equal(o.logo.path,'assets/logo.png');assert.ok(o.logo.width>0&&o.logo.height>0);
    assert.equal(o.canvas.width,o.W);assert.equal(o.canvas.height,o.H);near(o.canvas.alpha,1-withdraw);
    assert.deepEqual([o.stats.contexts,o.stats.textures,o.stats.programs,o.stats.samples,o.stats.lost],[1,2,1,112,false]);
    if(o.canvas.alpha>0) {
      const u=o.stats.uniforms;assert.deepEqual(u.resolution,[o.W,o.H]);near(u.mouse[0],clamp((t-.72)/2.28)*o.W);near(u.mouse[1],o.H*.5);
      near(u.logoY,760*(1-out(t,5))*o.H/1080);near(u.logoScale,1-.6*withdraw);near(u.effectMix,out((t-.72)/.34,4));
      for(const [i,key] of ['ground','accent','secondary'].entries())u[key].forEach((v,j)=>near(v,parseInt(o.colors[i].slice(1+j*2,3+j*2),16)/255));
    }
    near(o.card.alpha,t>=3.1?1:0);near(o.card.matrix[0],scale);near(o.card.matrix[3],scale);assert.equal(o.card.overflow,'hidden');
    const contains=(outer,inner)=>inner[0]>=outer[0]-1&&inner[1]>=outer[1]-1&&inner[2]<=outer[2]+1&&inner[3]<=outer[3]+1;
    assert.ok(contains(o.box,o.card.box),'Ray card exceeds composition');
    assert.equal(o.typed.text,chars.slice(0,count).join(''));near(o.caret.alpha,t>=3.1&&t<typeEnd?1:0);
    near(o.caret.left,o.typed.box[2]===o.typed.box[0]?0:o.state.widths[Math.max(0,count-1)]);
    const moved=out((t-slide)/.05,3);near(o.word.matrix[0],1.8-.8*moved);near(o.word.matrix[4],o.state.offset.x*(1-moved));near(o.word.matrix[5],o.state.offset.y*(1-moved));
    assert.deepEqual(o.supporting.map(n=>n.text),[c.action,c.support]);assert.deepEqual(o.finale.map(n=>n.text),c.finale);assert.equal(o.label.text,c.label);
    for(const n of [...o.supporting,...o.finale]) {
      assert.ok(n.font.includes('BrandSans'));assert.ok(n.scroll[0]<=n.client[0]+2&&n.scroll[1]<=n.client[1]+2,'Ray title text exceeds its native slot');
    }
    assert.ok(o.word.font.includes('BrandSans'));near(o.word.size,56);o.finale.forEach(n=>near(n.size,52));
    o.supporting.forEach((n,i)=>{const progress=expo((t-end-i*.08)/.42);near(n.alpha,progress);near(n.matrix[5],54*(1-progress));near(n.matrix[0],.96+.04*progress);});
    near(o.first.alpha,t<second?1:0);near(o.first.matrix[4],-o.state.travel*clamp((t-exit)/.36)**3);
    near(o.second.alpha,t>=second?1:0);near(o.second.matrix[4],o.state.travel*(1-expo((t-second)/.48)));
    if(t>=end+.5&&t<=exit)for(const n of [o.word,...o.supporting])assert.ok(contains(o.card.box,n.box),'Settled ray title is clipped');
    if(t>=second+.48)for(const n of o.finale)assert.ok(contains(o.card.box,n.box),'Final ray headline is clipped');
    return {source_time:t,typed:count,shader_active:o.canvas.alpha>0,samples:112};
  }
  async function inspectCreatorIntro(spec,time) {
    const o=await page.locator('.scene[aria-hidden="false"] .creator-intro-board').evaluate(board=>{
      const rect=n=>{const b=n.getBoundingClientRect();return [b.left,b.top,b.right,b.bottom];};
      const node=n=>{const c=getComputedStyle(n),m=new DOMMatrix(c.transform);return {text:n.textContent,box:rect(n),alpha:+c.opacity,
        font:c.fontFamily,size:parseFloat(c.fontSize),matrix:[m.a,m.b,m.c,m.d,m.e,m.f],origin:c.transformOrigin.split(' ').map(parseFloat)};};
      const pick=q=>node(board.querySelector(q)),prompt=board.querySelector('.creator-prompt');
      return {state:JSON.parse(board.dataset.creatorState),box:rect(board),width:board.clientWidth,height:board.clientHeight-54,
        title:pick('.creator-intro-title'),label:pick('.creator-intro-label'),input:pick('.creator-input'),profile:pick('.creator-profile'),
        placeholder:pick('.creator-placeholder'),thinking:pick('.creator-thinking-line'),result:pick('.creator-result-copy'),
        name:pick('.creator-name'),handle:pick('.creator-handle'),bio:pick('.creator-bio'),follow:pick('.creator-follow'),
        before:pick('.creator-before'),after:pick('.creator-after'),cursor:pick('.creator-cursor'),send:pick('.creator-panel-full .creator-send'),
        trigger:pick('.creator-trigger'),prompt:node(prompt),letters:[...prompt.children].map(n=>({text:n.textContent,alpha:+getComputedStyle(n).opacity})),
        models:[...board.querySelectorAll('.creator-model')].map(node),thinkingText:board.querySelector('.creator-thinking-copy').textContent,
        images:[...board.querySelectorAll('img')].map(n=>({source:n.getAttribute('src'),complete:n.complete&&n.naturalWidth>0,avatar:n.classList.contains('creator-avatar')})),
        counts:{blocks:board.querySelectorAll('.creator-burst-block').length,fragments:board.querySelectorAll('.creator-logo-fragment').length},
        unsafe:board.querySelectorAll('script,a,button,input,iframe,video,audio').length};
    });
    const t=presentationTime(spec,time,11.76),clamp=p=>Math.max(0,Math.min(1,p)),out=p=>1-(1-clamp(p))**4;
    const near=(a,b)=>assert.ok(Math.abs(a-b)<.002,`Creator intro ${a} != ${b}`),c=spec.content;
    near(o.state.clock.time,t);near(o.state.t,t);assert.equal(o.unsafe,0);assert.deepEqual(o.counts,{blocks:5,fragments:5});
    for(const [n,text] of [[o.title,c.heading],[o.label,c.label],[o.placeholder,c.prompt.placeholder],[o.prompt,c.prompt.text],
      [o.result,c.action],[o.name,c.profile.name],[o.handle,c.profile.handle],[o.bio,c.profile.bio],[o.before,c.profile.before],[o.after,c.profile.after]]) {
      assert.equal(n.text,text);assert.ok(n.font.includes('BrandSans'));
    }
    assert.equal(o.thinkingText,c.prompt.thinking);assert.ok(o.models.every(n=>n.text===c.prompt.model&&n.font.includes('BrandSans')&&n.size===22));
    assert.deepEqual([o.name.size,o.handle.size,o.bio.size,o.prompt.size],[40,26,26,32]);
    assert.ok(o.images.every(n=>n.complete));assert.equal(o.images.filter(n=>n.avatar).length,1);
    assert.ok(o.images.filter(n=>!n.avatar).every(n=>n.source==='assets/logo.png'));
    assert.equal(o.images.find(n=>n.avatar).source,configuration.assets[c.profile.image]);
    const letters=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(c.prompt.text)].map(p=>p.segment);
    assert.deepEqual(o.letters.map(n=>n.text),letters);
    o.letters.forEach((n,i)=>near(n.alpha,clamp((t-4.18-(letters.length===1?0:i*2.85/(letters.length-1)))/.01)));
    const pp=clamp((t-9.86)/.6),profileAlpha=pp===0||pp===1?pp:1-2**(-10*pp);
    near(o.profile.alpha,profileAlpha);near(o.profile.matrix[0],.88+.12*profileAlpha);near(o.profile.matrix[5],34*(1-profileAlpha));
    near(o.before.alpha,1-clamp((t-10.96)/.08));near(o.after.alpha,clamp((t-10.99)/.08));
    const first=out((t-8.25)/.3),captured=out((8.64-8.25)/.3),p=clamp((t-8.64)/.18),fade=p<.5?4*p**3:1-(-2*p+2)**3/2;
    near(o.thinking.alpha,t<8.64?first:captured*(1-fade));
    const w=Math.min(1000,o.width-160),h=340,cam=o.state.camera;
    near(o.input.matrix[0],cam.s);near(o.input.matrix[3],cam.s);near(o.input.matrix[4],cam.x);near(o.input.matrix[5],cam.y);
    const l=(o.width-w)/2+w*(1-cam.s)/2+cam.x,top=(o.height-h)/2+h*(1-cam.s)/2-54*cam.s+cam.y;
    assert.ok(l>=24-.002&&l+w*cam.s<=o.width-24+.002&&top>=24-.002&&top+(h+61)*cam.s<=o.height-24+.002);
    near(o.cursor.matrix[4]+o.cursor.origin[0],o.state.cursor.x);near(o.cursor.matrix[5]+o.cursor.origin[1],o.state.cursor.y);
    if(t<.44||t>=11.76)assert.ok(o.state.cursor.x>o.width||o.state.cursor.y>o.height,'Cursor must remain physically outside at rest');
    // Target coordinates come from pre-animation DOM geometry; compare actual
    // settled boxes on the action frames independently of the renderer's state.
    for(const [at,key,n] of [[7.9,'send',o.send],[9.34,'trigger',o.trigger],[10.88,'follow',o.follow]])if(Math.abs(t-at)<.025) {
      const target=o.state.targets[key],box=n.box,board=o.box;
      near(target.x,(box[0]+box[2])/2-board[0]);near(target.y,(box[1]+box[3])/2-board[1]);
    }
    return {source_time:t,typed:o.letters.filter(n=>n.alpha>0).length,profile_visible:profileAlpha>0};
  }
  async function inspectGooeySplit(spec,time) {
    const o=await page.locator('.scene[aria-hidden="false"] .backdrop-art').evaluate(view=>{
      const root=view.querySelector('.gooey-art'),groups=[...root.querySelectorAll('[data-gooey-part]')];
      const matrix=node=>node.transform.baseVal.consolidate()?.matrix;
      const values=node=>{const m=matrix(node);return m?[m.a,m.b,m.c,m.d,m.e,m.f]:[1,0,0,1,0,0];};
      const css=getComputedStyle(view),filter=root.querySelector('filter');
      return {state:JSON.parse(view.dataset.gooeyState),size:[view.clientWidth,view.clientHeight],viewBox:root.getAttribute('viewBox').split(' ').map(Number),
        approved:{ink:css.getPropertyValue('--lime').trim(),background:css.getPropertyValue('--purple').trim()},
        opacity:+root.style.opacity,threshold:root.querySelector('feColorMatrix').getAttribute('values').split(' ').map(Number),
        blur:+root.querySelector('feGaussianBlur').getAttribute('stdDeviation'),space:filter.getAttribute('color-interpolation-filters'),
        filter:groups[0].parentElement.getAttribute('filter'),id:filter.id,
        parts:groups.map(group=>({isolation:getComputedStyle(group).isolation,
          nodes:[...group.children].map(node=>({matrix:values(node),hidden:node.style.display==='none',alpha:+(node.getAttribute('opacity')||1),blend:node.style.mixBlendMode}))}))};
    });
    const near=(a,b)=>assert.ok(Math.abs(a-b)<.002,`Gooey matrix ${a} != ${b}`),frame=Math.floor(time*30+1e-7);
    const start=Math.ceil((cues[spec.cues[0]].start+.4)*30),stop=Math.ceil((cues[spec.cues[1]].start+.4)*30),gap=stop-start;
    const clock=f=>{const elapsed=Math.max(0,f-start),p=Math.max(0,Math.min(1,(elapsed-gap)/24));return p===1?4.7:4.7*(Math.min(elapsed,gap)+24*(p-p**3+.5*p**4))/(gap+12);};
    const t=clock(frame);near(o.state.sourceTime,t);near(o.state.unit,Math.min(...o.size)/840);
    const expectedBox=[-o.size[0]/(2*o.state.unit),-o.size[1]/(2*o.state.unit),o.size[0]/o.state.unit,o.size[1]/o.state.unit];
    o.viewBox.forEach((v,i)=>near(v,expectedBox[i]));
    assert.equal(o.state.ink,o.approved.ink);assert.equal(o.state.background,o.approved.background);
    assert.equal(o.blur,28);assert.equal(o.space,'sRGB');assert.equal(o.threshold.length,20);
    const [r,g,b]=[1,3,5].map(i=>parseInt(o.approved.ink.slice(i,i+2),16)/255);
    assert.deepEqual(o.threshold,[0,0,0,0,r,0,0,0,0,g,0,0,0,0,b,0,0,0,24,-8.9]);
    assert.equal(o.filter,t<.95||t>=2.67?`url(#${o.id})`:'none');
    near(o.opacity,1-(1-Math.max(0,Math.min(1,(frame-start)/24)))**3);
    assert.equal(o.parts.length,7);assert.equal(o.state.samples.length,17);
    o.state.samples.forEach((sample,i)=>near(sample,clock(frame-.5+i/16)));
    o.parts.forEach((part,i)=>{
      assert.equal(part.isolation,'isolate');assert.equal(part.nodes.length,18);
      const s=o.state.parts[i],moved=s.copies.some(m=>m.some((v,j)=>Math.abs(v-s.current[j])*(j>=4?o.state.unit:1)>(j>=4?.5:.001)));
      assert.equal(s.moving,moved);
      part.nodes.forEach((node,j)=>{
        const expected=j===0?s.current:s.copies[j-1];node.matrix.forEach((v,k)=>near(v,expected[k]));
        assert.equal(node.hidden,j===0?moved:!moved);
        if(j>0){assert.equal(node.alpha,1/16);assert.equal(node.blend,'plus-lighter');}
      });
    });
    if(t===4.7){assert.ok(o.state.parts.every(p=>!p.moving));assert.equal(o.state.tile,0);}
    return {sourceTime:t,shutterSamples:17,movingParts:o.state.parts.filter(p=>p.moving).length,goo:o.state.goo};
  }
  async function inspectChatExchange(spec,time) {
    const c=spec.content,frame=Math.floor(time*30+1e-7);
    const times=spec.cues.map(cue=>(frame-Math.ceil((cues[cue].start+.4)*30))/30);
    const o=await page.locator('.scene[aria-hidden="false"] .exchange-board').evaluate(board=>{
      const view=board.querySelector('.exchange-view'),rail=board.querySelector('.exchange-rail');
      const input=board.querySelector('.exchange-input'),typed=board.querySelector('.exchange-typed'),caret=board.querySelector('.exchange-caret');
      const rect=node=>{const r=node.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];};
      const word=node=>({text:node.textContent,alpha:+getComputedStyle(node).opacity});
      return {variant:board.dataset.exchangeVariant,state:JSON.parse(board.dataset.exchangeState),height:view.clientHeight,
        clip:getComputedStyle(view).overflow,view:rect(view),scroll:-new DOMMatrixReadOnly(getComputedStyle(rail).transform).m42,
        typed:typed.textContent,shift:-new DOMMatrixReadOnly(getComputedStyle(typed).transform).m41,
        caret:{visible:getComputedStyle(caret).visibility==='visible',box:rect(caret)},input:rect(input),
        dots:+getComputedStyle(board.querySelector('.exchange-dots')).opacity,
        rows:[...board.querySelectorAll('.exchange-entry')].map(row=>{
          const body=row.querySelector('.exchange-body'),label=row.querySelector('.exchange-label'),image=row.querySelector('img');
          return {type:row.dataset.exchangeType,top:parseFloat(row.style.top),height:parseFloat(row.style.height),box:rect(row),
            alpha:+getComputedStyle(row).opacity,visible:getComputedStyle(row).visibility==='visible',side:row.dataset.side,
            label:label?.textContent,body:body?.textContent,font:body?getComputedStyle(body).fontFamily:null,size:body?parseFloat(getComputedStyle(body).fontSize):null,
            widthFits:[...row.querySelectorAll('h3,p,b')].every(n=>n.scrollWidth<=n.clientWidth+1),
            words:[...row.querySelectorAll('.exchange-word')].map(word),
            headers:[...row.querySelectorAll('.exchange-table-header b')].map(n=>n.textContent),
            cells:[...row.querySelectorAll('.exchange-cell')].map(n=>n.textContent),
            activity:[...row.querySelectorAll('.exchange-activity-row')].map(n=>({text:n.textContent,alpha:+getComputedStyle(n).opacity})),
            summary:row.querySelector('.exchange-summary')?.textContent,
            summaryAlpha:row.querySelector('.exchange-summary')?+getComputedStyle(row.querySelector('.exchange-summary')).opacity:null,
            image:image?{src:image.getAttribute('src'),fit:getComputedStyle(image).objectFit,loaded:image.complete&&image.naturalWidth>0}:null};
        })};
    });
    const near=(a,b)=>assert.ok(Math.abs(a-b)<.035,`Conversation geometry ${a} != ${b}`);
    const phase=(t,a,b)=>Math.max(0,Math.min(1,(t-a)/(b-a)));
    const entries=[];
    c.items.forEach((item,index)=>{entries.push({type:'message',item});if(c.variant==='research-stream'&&index===0)entries.push({type:'activity'});});
    if(c.variant==='answer-stream')c.table.rows.forEach((cells,index)=>entries.push({type:'table',cells,index}));
    assert.equal(o.variant,c.variant);assert.equal(o.clip,'hidden');assert.equal(o.rows.length,entries.length);
    o.state.times.forEach((t,i)=>near(t,times[i]));
    let bottom=0,activeInput=-1,expectedDots=false;
    o.rows.forEach((row,i)=>{
      const entry=entries[i],t=times[i];assert.equal(row.type,entry.type);near(row.top,bottom);
      near(row.height,o.state.heights[i]*o.state.poses[i].height);
      bottom+=row.height+16*o.state.poses[i].height;
      assert.ok(row.widthFits,'Conversation copy exceeds fixed width');
      if(t<0){assert.equal(row.alpha,0);assert.equal(row.visible,false);near(row.height,0);}
      if(entry.type==='message'){
        assert.equal(row.label,entry.item.label);assert.equal(row.body,entry.item.body);assert.equal(row.side,entry.item.side);
        assert.ok(row.font.includes('BrandSans'));assert.equal(row.size,32);
        assert.equal(row.words.map(w=>w.text).join(''),entry.item.body);
        if(entry.item.image){assert.equal(row.image.src,configuration.assets[entry.item.image]);assert.equal(row.image.fit,'contain');assert.ok(row.image.loaded);}
        else assert.equal(row.image,null);
        if(entry.item.side==='sent'&&t>=0&&t<1.58)activeInput=i;
        if(c.variant==='message-thread'&&entry.item.side==='received'&&t>=0&&t<1.4)expectedDots=true;
        if(entry.item.side==='received'&&c.variant!=='message-thread'){
          const step=Math.min(c.variant==='research-stream'?.04:.15,1.55/Math.max(1,row.words.length-1));
          row.words.forEach((w,j)=>near(w.alpha,phase(t,.12+j*step,.12+j*step+(c.variant==='research-stream'?.08:.1))));
        }
        if(entry.item.side==='sent'&&t<1.58)assert.equal(row.alpha,0);
        if(c.variant==='message-thread'&&entry.item.side==='received'&&t<1.4)assert.equal(row.alpha,0);
      } else if(entry.type==='table'){
        assert.deepEqual(row.cells,entry.cells);assert.deepEqual(row.headers,entry.index===0?c.table.headers:[]);
        row.words.forEach((w,j)=>near(w.alpha,phase(t,.08+j*.028,.17+j*.028)));
      } else {
        assert.deepEqual(row.activity.map(s=>s.text),c.activity.steps);assert.equal(row.summary,c.activity.summary);
        if(t>=2){assert.ok(row.activity.every(s=>s.alpha===0));assert.equal(row.summaryAlpha,1);near(row.height,72);}
      }
      if(t>=2){assert.equal(row.alpha,1);assert.equal(row.visible,true);}
    });
    near(o.scroll,Math.max(0,bottom-16-o.height));assert.equal(o.dots,expectedDots?1:0);
    assert.equal(o.state.activeInput,activeInput);near(o.shift,o.state.shift);
    if(activeInput<0){assert.equal(o.typed,'');assert.equal(o.caret.visible,false);}
    else {
      const chars=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(entries[activeInput].item.body)].map(s=>s.segment);
      const source=[0,.0667,.1334,.2,.2667,.3667,.4,.4667,.5334,.5667,.7667];let total=0;
      const stamps=chars.map((char,i)=>{if(c.variant==='message-thread')return chars.length===1?0:source[Math.floor(i*10/(chars.length-1))];const value=total;total+=char===' '?.16:.05;return value;});
      const thread=c.variant==='message-thread',duration=thread?1.45:1.32,end=thread?.7667:Math.max(.05,total);
      const count=stamps.filter(t=>times[activeInput]>=.08+t/end*duration).length;
      assert.equal(o.typed,chars.slice(0,count).join(''));assert.equal(o.caret.visible,times[activeInput]<1.55);
      if(o.caret.visible)assert.ok(o.caret.box[0]>=o.input[0]&&o.caret.box[2]<=o.input[2],'Composer caret crosses Send boundary');
    }
    const active=times.reduce((n,t,i)=>t>=0?i:n,-1);
    if(active>=0&&times[active]>=2){const box=o.rows[active].box;assert.ok(box[1]>=o.view[1]-.1&&box[3]<=o.view[3]+.1,'Latest message is clipped');}
    return {variant:c.variant,times,scroll:o.scroll,activeInput,rows:o.rows.length};
  }
  function presentationTime(spec,time,duration) {
    const frame=Math.floor(time*30+1e-7),start=Math.ceil((cues[spec.cues[0]].start+.4)*30),stop=Math.ceil((cues[spec.cues[1]].start+.4)*30);
    const elapsed=Math.max(0,frame-start),gap=stop-start,p=Math.max(0,Math.min(1,(elapsed-gap)/24));
    return duration*(Math.min(elapsed,gap)+24*(p-p**3+.5*p**4))/(gap+12);
  }
  function previewTime(spec,time) {
    const frame=Math.floor(time*30+1e-7),start=Math.ceil((cues[spec.cues[0]].start+.4)*30),stop=Math.ceil((cues[spec.cues[1]].start+.4)*30);
    return frame<stop?4.79*Math.max(0,frame-start)/(stop-start):4.79+1.21*Math.max(0,Math.min(1,(frame-stop)/24));
  }
  async function inspectFilmedScreen(spec,time) {
    const starts=spec.cues.map(c=>Math.ceil((cues[c].start+.4)*30)),frame=Math.floor(time*30+1e-7);let active=0;
    starts.forEach((start,i)=>{if(frame>=start)active=i;});
    const elapsed=Math.max(0,frame-starts[active]),p=Math.max(0,Math.min(1,elapsed/24)),q=p*p*p*(p*(p*6-15)+10);
    const o=await page.locator('.scene[aria-hidden="false"] .screen-view').evaluate(view=>{
      const canvas=view.querySelector('.filmed-screen-canvas'),image=view.querySelector('img'),css=getComputedStyle(view);
      const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();let opaque=true;
      for(let y=0;y<8;y++)for(let x=0;x<8;x++) {
        const i=(Math.floor((y+.5)*canvas.height/8)*canvas.width+Math.floor((x+.5)*canvas.width/8))*4;
        colors.add(Array.from(pixels.slice(i,i+3)).join(','));opaque&&=pixels[i+3]===255;
      }
      return {state:JSON.parse(view.dataset.filmedState),stats:JSON.parse(view.dataset.filmedStats),
        width:view.clientWidth,height:view.clientHeight,resolution:[canvas.width,canvas.height],clip:css.overflow,
        image:image.getAttribute('src'),imageWidth:image.naturalWidth,imageHeight:image.naturalHeight,decoded:image.complete,
        canvasVisible:getComputedStyle(canvas).visibility==='visible',imageVisible:getComputedStyle(image).visibility==='visible',
        colors:colors.size,opaque,labels:[...view.closest('.production-content').querySelectorAll('.focus-label')].map(n=>({
          text:n.textContent,alpha:+getComputedStyle(n).opacity,font:getComputedStyle(n).fontFamily,
          fits:n.scrollWidth<=n.clientWidth+1&&n.scrollHeight<=n.clientHeight+1}))};
    });
    const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7,`Filmed lens ${a} != ${b}`);
    assert.equal(o.state.active,active);assert.equal(o.state.p,p);assert.equal(o.state.visible,frame>=starts[0]);
    assert.equal(o.canvasVisible,o.state.visible);assert.equal(o.imageVisible,!o.state.visible);assert.equal(o.clip,'hidden');
    assert.deepEqual(o.resolution,[o.width,o.height]);assert.ok(o.decoded&&o.imageWidth>=32&&o.imageHeight>=32);
    assert.equal(o.image,configuration.assets[spec.content.images[0]]);
    assert.deepEqual(o.stats,{contexts:1,programs:1,textures:1,lost:false,taps:36,glowTaps:16});
    const scale=Math.min(o.width/o.imageWidth,o.height/o.imageHeight),fw=o.imageWidth*scale,fh=o.imageHeight*scale;
    const rotations=[[.08,.14,-.012],[.06,-.24,.02],[.1,.14,-.012]];
    const targets=[{rect:[o.width/2,o.height/2,0,0],center:[o.width/2,o.height/2],zoom:1,rot:[0,0,0]},
      ...spec.content.focus.map((r,i)=>{
        const rect=[(o.width-fw)/2+r.x*fw,(o.height-fh)/2+r.y*fh,r.width*fw,r.height*fh];
        return {rect,center:[rect[0]+rect[2]/2,rect[1]+rect[3]/2],zoom:r.zoom,rot:rotations[i]};
      })];
    const from=targets[Math.max(0,active-1)],to=targets[active],rect=[0,0,0,0];let total=0;
    for(let i=0;i<12;i++) {
      const historical=frame-9*i/11,w=.5-.5*Math.cos(2*Math.PI*(i+.5)/12);let selected=0;
      starts.forEach((start,j)=>{if(historical>=start)selected=j;});
      targets[selected].rect.forEach((value,j)=>{rect[j]+=(value+(selected?[-8,-6,16,12][j]:0))*w;});total+=w;
    }
    rect.forEach((value,i)=>near(o.state.rect[i],value/total));
    const center=from.center.map((v,i)=>v+(to.center[i]-v)*q),focus=[rect[0]/total+rect[2]/total/2,rect[1]/total+rect[3]/total/2];
    center.forEach((v,i)=>{near(o.state.center[i],v);near(o.state.focus[i],focus[i]);near(o.state.aim[i],v*.35+focus[i]*.65);});
    from.rot.forEach((v,i)=>near(o.state.rot[i],v+(to.rot[i]-v)*q));near(o.state.zoom,from.zoom+(to.zoom-from.zoom)*q);
    near(o.state.time,(starts[active]+Math.min(elapsed,24)-starts[0])/30);assert.equal(o.state.seed,active*31+Math.min(elapsed,24));
    o.labels.forEach((label,i)=>{assert.equal(label.text,`${String(i+1).padStart(2,'0')} / ${spec.content.focus[i].label}`);
      near(label.alpha,active===i+1?1:.4);assert.ok(label.font.includes('BrandMono')&&label.fits);});
    if(o.state.visible)assert.ok(o.opaque&&o.colors>1,'Filmed shader must paint opaque optical pixels');
    if(active>0&&p===1) {
      const [rx,ry,rz]=to.rot,cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
      const u=[cz*cy,sz*cy,-sy],v=[cz*sy*sx-sz*cx,sz*sy*sx+cz*cx,cy*sx],K=1.7*o.height/to.zoom;
      const [x,y,w,h]=to.rect;
      for(const point of [[x,y],[x+w,y],[x+w,y+h],[x,y+h]]) {
        const a=(point[0]-focus[0])/K,b=(point[1]-focus[1])/K,hit=u.map((value,i)=>value*a+v[i]*b+(i===2?1:0));
        assert.ok(hit[2]>0);const plane=[1.7*hit[0]/hit[2],1.7*hit[1]/hit[2]],length=Math.hypot(...plane);
        const ground=1+.15*((o.width/o.height/2)**2+.25);let low=0,high=Math.max(1,length*ground);
        for(let j=0;j<48;j++){const radius=(low+high)/2;if(radius*(1+.15*radius*radius)<length*ground)low=radius;else high=radius;}
        const ratio=length?(low+high)/2/length:0,px=o.width/2+plane[0]*ratio*o.height,py=o.height/2+plane[1]*ratio*o.height;
        assert.ok(px>=-1&&px<=o.width+1&&py>=-1&&py<=o.height+1,'Filmed focus clips at its destination');
      }
    }
    return {active,p,zoom:o.state.zoom,focus:o.state.focus,colors:o.colors,renderer:o.stats};
  }
  async function inspectColorama(spec,time) {
    const onset=Math.ceil((cues[spec.cues[0]].start+.4)*30),frame=Math.floor(time*30+1e-7);
    const p=Math.max(0,Math.min(1,(frame-onset)/24)),local=p*1.0625;
    const o=await page.locator('.scene[aria-hidden="false"] .prod-title').evaluate(node=>{
      const css=getComputedStyle(node),copy=node.querySelector('.type-colorama-copy');
      return {text:node.textContent,original:node.getAttribute('aria-label'),state:JSON.parse(node.dataset.coloramaState),
        font:css.fontFamily,size:parseFloat(css.fontSize),line:parseFloat(css.lineHeight),copyAlpha:+getComputedStyle(copy).opacity,
        overrides:[node.style.fontFamily,node.style.fontSize,node.style.fontWeight,node.style.letterSpacing],
        words:[...node.querySelectorAll('.type-word')].map(n=>({font:getComputedStyle(n).fontFamily,size:parseFloat(getComputedStyle(n).fontSize),
          fits:n.offsetLeft>=0&&n.offsetLeft+n.offsetWidth<=node.clientWidth+1,top:n.offsetTop})),
        canvases:[...node.querySelectorAll('.type-colorama-line')].map(c=>{
          const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0,tinted=0;
          for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]){ink++;if(pixels[i]!==pixels[i+1]||pixels[i+1]!==pixels[i+2])tinted++;}
          return {width:c.width,height:c.height,cssWidth:parseFloat(c.style.width),cssHeight:parseFloat(c.style.height),ink,tinted};
        })};
    });
    assert.equal(o.text,spec.content.title);assert.equal(o.original,spec.content.title);assert.equal(o.state.p,p);
    assert.ok(o.font.includes('BrandSans'));assert.deepEqual(o.overrides,['','','','']);
    assert.ok(o.words.every(w=>w.font===o.font&&w.size===o.size&&w.fits));assert.ok(o.state.rows.length>0);
    assert.equal(o.canvases.length,o.state.rows.length);
    const clamp=x=>Math.max(0,Math.min(1,x)),u=clamp(local/.75),curve=u<.5?4*u*u*u:1-4*(1-u)**3;
    assert.ok(Math.abs(o.copyAlpha-clamp((local-.7125)/.35))<1e-5);
    o.state.rows.forEach((row,i)=>{
      const F=2.4*o.size,blur=.15*o.size,pad=Math.ceil(F*.6+blur*3),c=o.canvases[i];
      assert.ok(Math.abs(row.front-(-F*.4+(row.width+F*1.7)*curve))<1e-8);
      assert.equal(row.feather,F);assert.equal(row.blur,blur);assert.equal(row.pad,pad);assert.equal(row.frame,Math.round(local*30));
      assert.equal(c.width,Math.round((row.width+2*pad)*.5));assert.equal(c.cssWidth,c.width*2);assert.equal(c.cssHeight,c.height*2);
      if(p===0||p===1)assert.equal(c.ink,0,'Colorama must clear at native endpoints');
    });
    if(p>=.4&&p<=.6)assert.ok(o.canvases.some(c=>c.ink>0&&c.tinted>0),'Compound wipe did not paint real colored glyph pixels');
    return {p,rows:o.state.rows.length,ink:o.canvases.reduce((sum,c)=>sum+c.ink,0)};
  }
  async function inspectBeatFreeze(spec,time) {
    const frame=Math.floor(time*30+1e-7),starts=spec.cues.map(c=>Math.ceil((cues[c].start+.4)*30));let active=0;
    starts.forEach((start,i)=>{if(frame>=start)active=i;});
    const p=active===0?1:Math.max(0,Math.min(1,(frame-starts[active])/69)),t=p*2.29;
    const shown=active===0?0:t>=1.79?active:active-1;
    const o=await page.locator('.scene[aria-hidden="false"] .screen-view').evaluate(view=>({
      kind:view.dataset.screenSwap,state:JSON.parse(view.dataset.beatFreezeState),W:view.clientWidth,H:view.clientHeight,
      clipped:getComputedStyle(view).overflow==='hidden',
      images:[...view.querySelectorAll('img')].map(n=>{const css=getComputedStyle(n),m=new DOMMatrix(css.transform);
        return {src:n.getAttribute('src'),fit:css.objectFit,decoded:n.complete&&n.naturalWidth>=32,visible:css.visibility==='visible',
          matrix:[m.a,m.b,m.c,m.d,m.e,m.f],filter:css.filter,alpha:+css.opacity};}),
      layers:['outline','flash','contour','streak'].map(name=>+getComputedStyle(view.querySelector('.beat-freeze-'+name)).opacity)
    }));
    const near=(a,b,tolerance=1e-4)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<tolerance,`Freeze cut ${a} != ${b}`);
    assert.equal(o.kind,'beat-freeze');assert.equal(o.state.active,active);assert.equal(o.state.p,p);near(o.state.t,t);
    assert.equal(o.clipped,true);assert.deepEqual(o.images.map((im,i)=>im.visible?i:-1).filter(i=>i>=0),[shown]);
    o.images.forEach((im,i)=>{assert.equal(im.src,configuration.assets[spec.content.images[i]]);assert.equal(im.fit,'contain');assert.ok(im.decoded);assert.equal(im.alpha,1);});
    const s=o.state,im=o.images[shown];
    near(im.matrix[0],s.scale*s.sx);near(im.matrix[3],s.scale*s.sy);near(im.matrix[4],s.x*o.W/1920);near(im.matrix[5],s.y*o.H/1080);
    near(im.matrix[1],0);near(im.matrix[2],0);o.layers.forEach((v,i)=>near(v,s[['outline','flash','contour','streak'][i]]));
    if(t>=.85&&t<1.65){near(s.scale,1.28);near(s.x,28);near(s.y,-12);near(s.blur,0);assert.equal(s.incoming,false);}
    if(t>=1.77&&t<1.79){near(s.blur,14);near(s.sx,1.35);assert.ok(s.streak>.9);}
    if(p===0||p===1){assert.equal(im.filter,'none');assert.deepEqual(im.matrix,[1,0,0,1,0,0]);assert.deepEqual(o.layers,[0,0,0,0]);}
    return {active,p,shown,freeze:t>=.85&&t<1.65};
  }
  async function inspectCursorScene(spec,time) {
    const clamp=x=>Math.max(0,Math.min(1,x)),phase=(t,a,b)=>clamp((t-a)/(b-a));
    const frame=Math.floor(time*30+1e-7),onsets=spec.cues.map(i=>Math.ceil((cues[i].start+.4)*30));
    const progress=onsets.map(start=>clamp((frame-start)/24));
    const near=(a,b,tolerance=1e-3)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<tolerance,`Cursor ${a} != ${b}`);
    const contains=(outer,inner)=>inner[0]>=outer[0]-1&&inner[1]>=outer[1]-1&&inner[2]<=outer[2]+1&&inner[3]<=outer[3]+1;
    const overlaps=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
    if(spec.kind==='media-grid') {
      const o=await page.locator('.scene[aria-hidden="false"] .collaboration-board').evaluate(board=>{
        const view=board.querySelector('.collaboration-view'),image=view.querySelector('img');
        const rect=n=>{const b=n.getBoundingClientRect();return [b.left,b.top,b.right,b.bottom];};
        return {W:view.clientWidth,H:view.clientHeight,area:rect(view),clip:getComputedStyle(view).overflow,
          image:image.getAttribute('src'),fit:getComputedStyle(image).objectFit,decoded:image.complete&&image.naturalWidth>=32,
          heading:board.parentNode.querySelector('.prod-heading').textContent,source:board.parentNode.querySelector('.resource-source').textContent,
          label:board.querySelector('.collaboration-label').textContent,
          actors:[...view.querySelectorAll('.collaboration-actor')].map(actor=>{
            const name=actor.querySelector('.collaboration-name'),arrow=actor.querySelector('.collaboration-arrow'),m=new DOMMatrix(actor.style.transform);
            const style=getComputedStyle(name),a=getComputedStyle(arrow);
            return {name:name.textContent,rect:rect(name),font:style.fontFamily,size:parseFloat(style.fontSize),
              fits:name.scrollWidth<=name.clientWidth+1&&name.scrollHeight<=name.clientHeight+1,
              alpha:+getComputedStyle(actor).opacity,matrix:[m.a,m.b,m.c,m.d,m.e,m.f],
              arrow:[parseFloat(a.width),parseFloat(a.height),parseFloat(a.left),parseFloat(a.top)]};})};
      });
      const paths=[[[10,16],[42,40],[-10,2]],[[66,12],[52,38],[8,-3]],[[76,38],[57,49],[12,3]],
        [[64,76],[53,59],[-8,4]],[[20,76],[43,60],[9,-4]],[[7,46],[38,50],[-12,3]]];
      assert.equal(o.heading,spec.content.heading);assert.equal(o.source,spec.content.source);assert.equal(o.label,spec.content.items[0].label);
      assert.equal(o.image,configuration.assets[spec.content.items[0].image]);assert.equal(o.fit,'contain');assert.ok(o.decoded);assert.equal(o.clip,'hidden');
      assert.deepEqual(o.actors.map(a=>a.name),spec.content.actors);
      const seconds=progress[0]*2.05;
      o.actors.forEach((actor,i)=>{
        const [start,end,angles]=paths[i],reveal=1-(1-phase(seconds,i*.055,i*.055+.26))**4;
        const gather=(1-Math.cos(Math.PI*phase(seconds,.7+Math.min(i*.035,1.35*.35),2.05)))/2;
        const x=o.W*(start[0]+(end[0]-start[0])*gather)/100;
        const initialY=o.H*(start[1]<50?-.22:1.22),startY=o.H*start[1]/100;
        const y=seconds<.7?initialY+(startY-initialY)*reveal:o.H*(start[1]+(end[1]-start[1])*gather)/100;
        const angle=(angles[0]+(angles[1]-angles[0])*gather)*Math.PI/180,scale=.92+.08*reveal;
        [Math.cos(angle)*scale,Math.sin(angle)*scale,-Math.sin(angle)*scale,Math.cos(angle)*scale,x,y+(o.H*1.28-y)*progress[1]**3]
          .forEach((v,j)=>near(actor.matrix[j],v));
        [o.W*.055,o.W*.055,-o.W*.055*5.5/24,-o.W*.055*3.21/24].forEach((v,j)=>near(actor.arrow[j],v,.02));
        assert.equal(actor.alpha,1);assert.ok(actor.font.includes('BrandMono'));assert.equal(actor.size,22);assert.ok(actor.fits);
        if(progress[0]===1&&progress[1]===0) {
          assert.ok(contains(o.area,actor.rect),'Collaborator name is clipped');
          o.actors.slice(i+1).forEach(other=>assert.ok(!overlaps(actor.rect,other.rect),'Collaborator names overlap'));
        }
        if(progress[0]===0)assert.ok(actor.matrix[5]<0||actor.matrix[5]>o.H);
        if(progress[1]===1)assert.ok(actor.matrix[5]>o.H);
      });
      return o;
    }
    const o=await page.locator('.scene[aria-hidden="false"] .document-board').evaluate(board=>{
      const box=n=>{let left=0,top=0;for(let p=n;p&&p!==board;p=p.offsetParent){left+=p.offsetLeft;top+=p.offsetTop;}
        return {left,top,right:left+n.offsetWidth,bottom:top+n.offsetHeight,width:n.offsetWidth,height:n.offsetHeight};};
      const matrix=n=>{const m=new DOMMatrix(n.style.transform);return [m.a,m.b,m.c,m.d,m.e,m.f];};
      return {W:board.clientWidth,H:board.clientHeight,clip:getComputedStyle(board).overflow,rows:[...board.querySelectorAll('.document-row')].map(row=>{
        const para=row.querySelector('.document-paragraph'),toolbar=row.querySelector('.document-toolbar'),cursor=row.querySelector('.document-cursor');
        const arrow=row.querySelector('.document-arrow'),beam=row.querySelector('.document-beam'),button=row.querySelector('.document-button');
        return {visible:getComputedStyle(row).visibility==='visible',body:para.textContent,label:row.querySelector('.interface-label').textContent,
          geometry:JSON.parse(row.dataset.textGeometry),card:box(row.querySelector('.document-card')),para:box(para),
          fits:para.scrollHeight<=para.clientHeight+1&&para.scrollWidth<=para.clientWidth+1,font:getComputedStyle(para).fontFamily,
          chars:[...row.querySelectorAll('.document-char')].map(n=>({text:n.textContent,selected:n.classList.contains('document-selected'),weight:getComputedStyle(n).fontWeight,box:box(n)})),
          toolbar:{x:parseFloat(toolbar.style.left),y:parseFloat(toolbar.style.top),width:toolbar.offsetWidth,height:toolbar.offsetHeight,
            alpha:+toolbar.style.opacity,matrix:matrix(toolbar)},button:{x:button.offsetLeft,y:button.offsetTop,width:button.offsetWidth,height:button.offsetHeight,
            active:button.classList.contains('document-bold'),matrix:matrix(button)},cursor:matrix(cursor),alpha:+getComputedStyle(cursor).opacity,
          arrowAlpha:+arrow.style.opacity,beamAlpha:+beam.style.opacity,arrow:[arrow.style.width,arrow.style.left,arrow.style.top].map(parseFloat)};})};
    });
    assert.equal(o.clip,'hidden');assert.equal(o.rows.length,spec.content.items.length);
    const active=onsets.reduce((last,start,i)=>frame>=start?i:last,-1);
    o.rows.forEach((row,i)=>{
      const item=spec.content.items[i],t=progress[i]*4.2,g=row.geometry,n=row.chars.length,u=o.W/1920;
      const ease=p=>p<.5?4*p**3:1-(-2*p+2)**3/2,out=p=>1-(1-p)**4;
      const fraction=n*.9*ease(phase(t,.65,1.6)),selected=t>=1.65?n:Math.round(fraction),bold=t>=2.77;
      assert.equal(row.visible,i===active);assert.equal(row.body,item.body);assert.equal(row.label,item.label);
      assert.equal(row.chars.map(c=>c.text).join(''),item.selection);assert.ok(row.font.includes('BrandSans'));assert.ok(row.fits);
      const graphemes=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(item.selection)].map(s=>s.segment);
      assert.deepEqual(row.chars.map(c=>c.text),graphemes);assert.equal(g.W,o.W);assert.equal(g.H,o.H);
      assert.deepEqual(g.card,row.card);
      if(!bold)assert.deepEqual(g.para,row.para);
      else for(const key of ['left','top','right','width'])assert.equal(g.para[key],row.para[key]);
      row.chars.forEach((c,j)=>{assert.equal(c.selected,j<selected);assert.equal(c.weight,bold?'800':'600');if(!bold)assert.deepEqual(c.box,g.chars[j]);});
      const point=f=>{const b=g.chars[Math.min(n-1,Math.floor(f))],q=clamp(f-Math.min(n-1,Math.floor(f)));return {x:b.left+(b.right-b.left)*q,y:b.top+b.height/2};};
      const first=g.chars[0];let right=first.right;for(let j=1;j<n&&g.chars[j].top===first.top;j++)right=g.chars[j].right;
      const bx=Math.max(g.card.left+16*u,Math.min((first.left+right)/2-row.toolbar.width/2,g.card.right-16*u-row.toolbar.width));
      const by=first.top-12*u-row.toolbar.height,bar=out(phase(t,1.75,1.93));
      near(row.toolbar.x,bx);near(row.toolbar.y,by);near(row.toolbar.alpha,bar);near(row.toolbar.matrix[0],.96+.04*bar);near(row.toolbar.matrix[5],4*u*(1-bar));
      assert.equal(row.button.active,bold);near(row.button.matrix[0],t>=2.7&&t<2.82?.92:1);
      if(row.visible&&bar>0){assert.ok(bx>=g.card.left&&bx+row.toolbar.width<=g.card.right);assert.ok(by>=g.card.top&&by+row.toolbar.height<=first.top);}
      const target={x:bx+row.button.x+row.button.width*.55,y:by+row.button.y+row.button.height*.6},aside={x:g.card.right+80*u,y:target.y+140*u};
      const blend=(a,b,p)=>({x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p});
      let tip=t<.5?blend({x:o.W*1.08,y:o.H*.34},point(0),out(t/.5)):t<.65?point(0):t<2?point(fraction):
        t<2.5?blend(point(n*.9),target,out(phase(t,2,2.5))):t<2.95?target:blend(target,aside,ease(phase(t,2.95,3.4)));
      if(t>3.4)tip=blend(aside,{x:o.W*1.16,y:aside.y},phase(t,3.4,4.2)**3);
      const dip=at=>t<at||t>at+.231?1:t<at+.07?1-.12*phase(t,at,at+.07):.88+.12*out(phase(t,at+.07,at+.231));
      near(row.cursor[4],tip.x);near(row.cursor[5],tip.y);near(row.cursor[0],dip(.6)*dip(2.7));near(row.cursor[3],row.cursor[0]);assert.equal(row.alpha,1);
      const overBar=bar>0&&tip.x>bx-10*u&&tip.x<bx+row.toolbar.width+10*u&&tip.y>by-10*u&&tip.y<by+row.toolbar.height+10*u;
      const beam=overBar?0:phase(Math.min(tip.x-g.para.left,g.para.right-tip.x,tip.y-g.para.top,g.para.bottom-tip.y),-24*u,0);
      near(row.beamAlpha,beam);near(row.arrowAlpha,1-beam);
      [o.W*.055,-o.W*.055*5/24,-o.W*.055*3/24].forEach((v,j)=>near(row.arrow[j],v));
      if(progress[i]===0||progress[i]===1)assert.ok(row.cursor[4]>o.W,'Text cursor must enter and leave physically');
    });
    return o;
  }
  async function inspectAnswerRank(spec,time) {
    const o=await page.locator('.scene[aria-hidden="false"] .answer-board').evaluate(board=>{
      const css=n=>getComputedStyle(n),matrix=n=>{const m=new DOMMatrix(n.style.transform);return [m.a,m.b,m.c,m.d,m.e,m.f];};
      const rect=n=>{const b=n.getBoundingClientRect();return [b.left,b.top,b.right,b.bottom];};
      const fit=n=>n.scrollWidth<=n.clientWidth+1&&n.scrollHeight<=n.clientHeight+1;
      const list=board.querySelector('.answer-list'),prompt=board.querySelector('.answer-prompt'),lead=board.querySelector('.answer-lead-copy');
      const check=board.querySelector('.answer-check'),path=check.querySelector('path');
      return {W:board.clientWidth,H:board.clientHeight,alpha:+board.style.opacity,matrix:matrix(board),
        heading:board.parentNode.querySelector('.prod-heading').textContent,source:board.parentNode.querySelector('.interface-source').textContent,
        list:{box:rect(list),height:parseFloat(list.style.height),clip:css(list).overflow,mask:css(list).maskImage},
        prompt:{text:board.querySelector('.answer-typed').textContent,complete:board.querySelector('.answer-prompt-sizer').textContent,
          box:rect(prompt),fits:fit(prompt),alpha:+prompt.style.opacity,matrix:matrix(prompt),caret:css(board.querySelector('.answer-caret')).visibility},
        lead:{text:lead.textContent,words:[...lead.children].map(n=>+n.style.opacity),fits:fit(lead),star:matrix(board.querySelector('.answer-star')),
          thinking:+board.querySelector('.answer-thinking').style.opacity,dots:[...board.querySelectorAll('.answer-thinking>i')].map(n=>matrix(n)[5])},
        ranks:[...board.querySelectorAll('.answer-number')].map(n=>({text:n.textContent,top:parseFloat(n.style.top),alpha:+n.style.opacity})),
        rows:[...board.querySelectorAll('.answer-pick')].map(n=>({label:n.querySelector('.answer-name').textContent,body:n.querySelector('.answer-detail').textContent,
          matrix:matrix(n),alpha:+n.style.opacity,visible:css(n).visibility==='visible',meta:css(n.querySelector('.answer-meta')).visibility==='visible',
          top:parseFloat(n.style.top),height:parseFloat(n.style.height),box:rect(n),
          copy:[...n.querySelectorAll('.answer-name,.answer-detail,.answer-tile')].map(t=>({box:rect(t),font:css(t).fontFamily,fits:fit(t)}))})),
        highlight:+board.querySelector('.answer-highlight').style.opacity,check:{alpha:+check.style.opacity,matrix:matrix(check),length:path.getTotalLength(),dash:+path.style.strokeDashoffset}};
    });
    const c=spec.content,clamp=x=>Math.max(0,Math.min(1,x)),phase=(t,a,b)=>clamp((t-a)/(b-a)),out=(p,n=4)=>1-(1-clamp(p))**n;
    const back=(p,s)=>p===0?0:p===1?1:1+(s+1)*(p-1)**3+s*(p-1)**2;
    const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-3,`Ranked answer ${a} != ${b}`);
    const frame=Math.floor(time*30+1e-7),p=spec.cues.map(i=>clamp((frame-Math.ceil((cues[i].start+.4)*30))/24));
    const slot=Math.min(144,(o.H-158-24-32)/3),row=slot-12;
    assert.equal(o.heading,c.heading);assert.equal(o.source,c.source);assert.equal(o.list.clip,'hidden');assert.ok(o.list.mask.includes('linear-gradient'));near(o.list.height,slot*3+32);
    const gaps=[.05,.035,.06,.04,.03,.055,.045,.07,.035,.05,.04,.065],chars=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(c.prompt)].map(s=>s.segment);
    const raw=chars.slice(1).reduce((n,_,i)=>n+gaps[(i+1)%gaps.length],0),squeeze=Math.min(1,1.8/Math.max(raw,.001)),t=p[0]*3;
    let at=.8,count=0;for(let i=1;i<=chars.length;i++){if(t>=at)count=i;at+=gaps[i%gaps.length]*squeeze;}
    assert.equal(o.prompt.complete,c.prompt);assert.equal(o.prompt.text,chars.slice(0,count).join(''));
    assert.equal(o.prompt.caret,t>=.65&&t<at+.2?'visible':'hidden');assert.ok(o.prompt.fits);
    const card=out(phase(t,.1,.7));near(o.alpha,card);near(o.matrix[5],40*(1-card));
    near(o.prompt.alpha,phase(t,.5,.8));near(o.prompt.matrix[0],.9+.1*back(phase(t,.5,.8),1.6));
    const words=c.lead.match(/\S+\s*/gu)||[],lt=p[1]*(1.2+words.length*.07);
    assert.equal(o.lead.text,c.lead);assert.ok(o.lead.fits);assert.deepEqual(o.lead.words,words.map((_,i)=>lt>=.97+i*.07?1:0));
    near(o.lead.thinking,phase(lt,0,.15)*(1-phase(lt,.73,.85)));
    o.lead.dots.forEach((y,i)=>{let wanted=0;for(let b=0;b<2;b++){const start=.1+b*.32+i*.08;
      if(lt>=start&&lt<start+.14)wanted=-9*Math.sin(Math.PI/2*phase(lt,start,start+.14));
      else if(lt>=start+.14&&lt<start+.28)wanted=-9*Math.cos(Math.PI/2*phase(lt,start+.14,start+.28));}near(y,wanted);});
    const star=back(phase(lt,.85,1.3),2),angle=-90*(1-star)*Math.PI/180;near(o.lead.star[0],(.3+.7*star)*Math.cos(angle));
    const it=p[3]*1.44,q=phase(it,0,.55),shift=q<.5?8*q**4:1-(-2*q+2)**4/2,incoming=out(phase(it,.34,.89));
    near(o.highlight,out(phase(it,.9,1.2),2));const check=back(phase(it,.95,1.37),2.2);
    near(o.check.alpha,clamp(check));near(o.check.matrix[0],.4+.6*check);near(o.check.dash,o.check.length*(1-out(phase(it,1.1,1.44),3)));
    assert.equal(o.rows.length,4);assert.deepEqual(o.ranks.map(r=>r.text),['1','2','3']);
    o.rows.forEach((r,i)=>{
      const entry=i===3?1:out(phase(p[2]*.77,i*.16,i*.16+.45));
      const alpha=i===3?incoming:entry*(i===2?1-phase(it,.1,.5)**2:1),x=i===3?96*(1-incoming):0;
      const y=i===3?0:24*(1-entry)+(i>=c.rank-1?slot*shift:0);
      assert.equal(r.label,c.items[i].label);assert.equal(r.body,c.items[i].body);near(r.height,row);near(r.top,(i===3?c.rank-1:i)*slot);
      near(r.matrix[4],x);near(r.matrix[5],y);near(r.alpha,alpha);assert.equal(r.visible,alpha>0);
      assert.equal(r.meta,alpha>0&&(i===3||i*slot+y+row<=o.list.height));
      assert.ok(r.copy.every(t=>t.font.includes('BrandSans')||t.font.includes('BrandMono')));assert.ok(r.copy.every(t=>t.fits),'Ranked copy overflows');
      if(i<3){near(o.ranks[i].top,i*slot);near(o.ranks[i].alpha,phase(p[2]*.77,i*.16,i*.16+.3));}
    });
    if(p[3]===1) {
      const visible=o.rows.map((r,i)=>({r,i})).filter(({r})=>r.visible).sort((a,b)=>a.r.box[1]-b.r.box[1]);
      assert.deepEqual(visible.map(({i})=>i),[[3,0,1],[0,3,1],[0,1,3]][c.rank-1]);
      visible.forEach(({r},i)=>{
        const a=r.box,b=o.list.box;assert.ok(a[0]>=b[0]-1&&a[1]>=b[1]-1&&a[2]<=b[2]+1&&a[3]<=b[3]+1,'Final ranked row is clipped');
        if(i)assert.ok(visible[i-1].r.box[3]<=a[1],'Final ranked rows overlap');
      });
    }
    return o;
  }
  async function inspectNoteScroll(spec,time) {
    const o=await page.locator('.scene[aria-hidden="false"] .note-scroll-board').evaluate(board=>{
      const view=board.querySelector('.note-scroll-view'),doc=board.querySelector('.note-scroll-document'),caret=board.querySelector('.note-scroll-caret'),title=board.querySelector('.note-scroll-title');
      const style=n=>getComputedStyle(n),fit=n=>n.scrollWidth<=n.clientWidth+1&&n.scrollHeight<=n.clientHeight+1;
      const rect=n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];};
      const m=new DOMMatrix(doc.style.transform),tip=new DOMMatrix(caret.style.transform);
      return {H:view.clientHeight,area:rect(view),clip:style(view).overflow,scroll:-m.f,
        source:board.parentNode.querySelector('.interface-source').textContent,heading:board.parentNode.querySelector('.prod-heading').textContent,
        title:{text:title.textContent,top:title.offsetTop,height:title.offsetHeight,visible:style(title).visibility==='visible',font:style(title).fontFamily,size:parseFloat(style(title).fontSize),fits:fit(title)},
        caret:{x:tip.e,y:tip.f,width:caret.offsetWidth,height:caret.offsetHeight,visible:style(caret).visibility==='visible'},
        rows:[...board.querySelectorAll('.note-scroll-line')].map(row=>({text:row.textContent,top:parseFloat(row.style.top),height:row.offsetHeight,
          box:rect(row),visible:style(row).visibility==='visible',font:style(row).fontFamily,size:parseFloat(style(row).fontSize),fits:fit(row),
          chars:[...row.children].map(char=>({text:char.textContent,alpha:+char.style.opacity,x:char.offsetLeft,y:char.offsetTop,width:char.offsetWidth}))}))};
    });
    const c=spec.content,frame=Math.floor(time*30+1e-7),starts=spec.cues.map(i=>Math.ceil((cues[i].start+.4)*30));
    const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-3,`Note scroll ${a} != ${b}`);
    const sourceTimes=[
      [40,42,46,48,50,53,56,59,60,62,66,68,72,74,77,80],
      [106,108,110,114,116,119,120,122,125,127,131,132,134,137,139,142,144],
      [167,170,172,174,176,180,182,185,187,190,192,194,196,198,200,203,205,208,210,212,216,218,221],
      [256,258,262,264,266,269,271,274,275,277,280,281,282,284,287,288,290,293,295,298,299,301,304,306,310,311,313,316,318,320],
      [349,352,354,356,359,361,364,366,368,371,372,374,378,380,382,385,388,389,390,394,395,397,400,401,403,406,408,410,412,414,416,419,421,424,425],
      [449,450,452,455,457,460,462,466,468,469,472,474,476,479,481,482,485,487,490,492,493,496,497,499,502,504,506,509,510,512,515,517,520,522,523,526,528,530,532],
      [558,560,563,565,568,571,574,575,577,580,581,584,587,589,592,593,595,599,602,604,606]
    ];
    const curves=[
      [21.74,53.93,77.33,77.33,94.06,102.95,111.73,115.18,118.01,118.01,119.35,119.87,119.87,119.87,119.87,119.87,120],
      [9.29,44.61,74.77,102.53,102.53,117.91,133.34,140.03,145.24,148.87,148.87,149.85,149.95,149.95,149.95,149.95,149.95,150],
      [9.11,9.11,31.8,73,100.53,118.84,131.65,131.65,140.05,144.79,148.7,149.91,149.95,149.95,149.95,149.95,150],
      [28.09,60.69,92.33,113.98,113.98,125.5,136.13,143.99,147.13,149.17,149.17,149.97,149.97,149.97,149.97,149.97,150],
      [25.26,61.96,93.98,105,122.63,122.63,138.9,144.2,147.27,149.63,149.95,149.95,149.95,149.95,149.95,149.95,150]
    ];
    let scroll=0,current=0;const step=o.H/4,first=o.H/2;
    for(let i=1;i<starts.length;i++)if(frame>=starts[i]-18)current=i;
    for(let i=2;i<starts.length;i++){
      const elapsed=frame-starts[i]+18,samples=curves[i-2],distance=i===2?step*.8:step,total=i===2?120:150;
      scroll+=distance*(elapsed<1?0:elapsed>samples.length?1:samples[elapsed-1]/total);
    }
    near(o.scroll,scroll);assert.equal(o.clip,'hidden');assert.equal(o.heading,c.heading);assert.equal(o.source,c.source);assert.equal(o.title.text,c.title);
    assert.ok(o.title.fits);assert.ok(o.title.font.includes('BrandSans'));assert.equal(o.title.size,40);
    assert.equal(o.title.visible,o.title.top-scroll>=0&&o.title.top+o.title.height-scroll<=o.H);
    assert.equal(o.rows.length,c.items.length);const counts=[];
    o.rows.forEach((row,i)=>{
      assert.equal(row.text,c.items[i]);assert.ok(row.font.includes('BrandMono'));assert.equal(row.size,28);assert.ok(row.fits,'Note line overflows');
      const chars=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(c.items[i])].map(s=>s.segment),table=sourceTimes[i];
      assert.deepEqual(row.chars.map(char=>char.text),chars);near(row.top,first+i*step);
      const elapsed=frame-starts[i];
      const count=chars.filter((_,j)=>elapsed>=(chars.length===table.length?Math.round((table[j]-table[0])*24/(table.at(-1)-table[0])):chars.length===1?0:Math.round(24*j/(chars.length-1)))).length;
      counts.push(count);assert.deepEqual(row.chars.map(char=>char.alpha),chars.map((_,j)=>j<count?1:0));
      assert.equal(row.visible,count>0&&row.top-scroll>=0&&row.top+row.height-scroll<=o.H);
      if(row.visible){const a=row.box,b=o.area;assert.ok(a[0]>=b[0]-1&&a[1]>=b[1]-1&&a[2]<=b[2]+1&&a[3]<=b[3]+1,'Visible note text is clipped');}
    });
    const row=o.rows[current],last=counts[current]?row.chars[counts[current]-1]:null;
    near(o.caret.x,34+(last?last.x+last.width:0));near(o.caret.y,first+current*step+(last?last.y:4));
    assert.equal(o.caret.width,3);assert.equal(o.caret.height,32);assert.equal(o.caret.visible,o.caret.y-scroll>=0&&o.caret.y+32-scroll<=o.H);
    return {counts,current,scroll,tip:o.caret,visible:o.rows.map(row=>row.visible)};
  }
  async function inspectGradeSplit(spec,time) {
    const o=await page.locator('.scene[aria-hidden="false"] .grade-board').evaluate(board=>{
      const plate=board.querySelector('.grade-plate'),crop=board.querySelector('.grade-crop'),edge=board.querySelector('.grade-edge');
      const image=board.querySelector('.grade-source'),tags=[...board.querySelectorAll('.grade-tag')];
      const m=new DOMMatrix(plate.style.transform);
      return {state:JSON.parse(board.dataset.gradeState),width:board.clientWidth,height:board.clientHeight,
        visible:getComputedStyle(board).visibility,plate:[plate.offsetLeft,plate.offsetTop,plate.clientWidth,plate.clientHeight],
        scale:[m.a,m.d],crop:parseFloat(crop.style.width),overflow:getComputedStyle(crop).overflow,
        canvases:[...plate.querySelectorAll('canvas')].map(n=>[n.width,n.height]),
        edge:{width:parseFloat(edge.style.width),display:getComputedStyle(edge).display,alpha:+edge.style.opacity,x:new DOMMatrix(edge.style.transform).e},
        tags:tags.map(n=>({text:n.textContent,font:getComputedStyle(n).fontFamily,display:getComputedStyle(n).display,
          alpha:+n.style.opacity,y:new DOMMatrix(n.style.transform).f,fit:n.scrollWidth<=n.clientWidth+1&&n.scrollHeight<=n.clientHeight+1})),
        src:image.getAttribute('src'),decoded:image.complete&&image.naturalWidth>=32,size:[image.naturalWidth,image.naturalHeight],
        heading:board.parentNode.querySelector('.prod-heading').textContent,source:board.parentNode.querySelector('.resource-source').textContent,
        label:board.querySelector('.grade-label').textContent,stats:window.ShortCreatorGradeSplit.stats()};
    });
    const c=spec.content,grade=c.grade,t=presentationTime(spec,time,6),clamp=x=>Math.max(0,Math.min(1,x));
    const near=(a,b,epsilon=.0002)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<epsilon,'Grade split '+a+' != '+b);
    const curve=(p,x1,y1,x2,y2)=>{
      p=clamp(p);if(p===0||p===1)return p;let lo=0,hi=1;
      for(let i=0;i<50;i++){const u=(lo+hi)/2,x=3*(1-u)**2*u*x1+3*(1-u)*u*u*x2+u**3;if(x<p)lo=u;else hi=u;}
      const u=(lo+hi)/2;return 3*(1-u)**2*u*y1+3*(1-u)*u*u*y2+u**3;
    };
    const ease=(p,kind)=>curve(p,...({plate:[.16,.84,.24,1],wipe:[.62,0,.14,1],commit:[.4,0,.05,1],tag:[.22,.8,.3,1],fade:[.4,0,.7,1]})[kind]);
    const phase=(a,d)=>clamp((t-a)/d),W=o.plate[2],H=o.plate[3],hold=Math.round(W*grade.split/100);
    const x=t<3.1?hold*ease(phase(.7,1.6),'wipe'):hold+(W-hold)*ease(phase(3.1,1.2),'commit');
    const scale=t<3.1?1.05-.05*ease(phase(0,.62),'plate'):1+.03*ease(phase(3.1,1.5),'commit');
    near(o.state.clock.time,t);near(o.state.state.width,x,.001);
    // Chromium serializes these CSS lengths to six significant digits.
    near(o.crop,x,.006);near(o.edge.x,x,.006);near(o.scale[0],scale);near(o.scale[1],scale);
    assert.equal(o.overflow,'hidden');assert.deepEqual(o.canvases,[[W,H],[W,H]]);
    assert.ok(o.plate[0]-W*(scale-1)/2>=-.6&&o.plate[0]+W*(scale+1)/2<=o.width+.6,'Graded plate clipped horizontally');
    assert.ok(o.plate[1]-H*(scale-1)/2>=-.6&&o.plate[1]+H*(scale+1)/2<=o.height-52+.6,'Graded plate clipped vertically');
    assert.equal(o.heading,c.heading);assert.equal(o.source,c.source);assert.equal(o.label,c.items[0].label);
    assert.equal(o.src,configuration.assets[c.items[0].image]);assert.ok(o.decoded);
    assert.deepEqual(o.tags.map(n=>n.text),['Flat preview',{'warm-cinematic':'Warm Cinematic','cool-teal':'Cool Teal','bleach-bypass':'Bleach Bypass'}[grade.look]]);
    o.tags.forEach(n=>{assert.ok(n.font.includes('BrandMono'));assert.equal(n.display,grade.labels?'block':'none');assert.ok(n.fit);});
    near(o.tags[0].alpha,.82*ease(phase(.36,.34),'tag')*(1-ease(phase(3.1,.5),'fade')));
    near(o.tags[1].alpha,ease(phase(1.16,.34),'tag'));
    near(o.tags[0].y,10*(1-ease(phase(.36,.34),'tag')));near(o.tags[1].y,10*(1-ease(phase(1.16,.34),'tag')));
    near(o.edge.alpha,t<4.05?ease(phase(.7,.2),'fade'):1-ease(phase(4.05,.3),'fade'));
    assert.equal(o.edge.width,{hairline:2,bold:6,hidden:0}[grade.edge]);assert.equal(o.edge.display,grade.edge==='hidden'?'none':'block');
    const frame=Math.floor(time*30+1e-7),first=Math.ceil((cues[spec.cues[0]].start+.4)*30);
    assert.equal(o.visible,frame>=first?'visible':'hidden');
    const keys=['exposure','contrast','highlights','shadows','whites','blacks','temperature','tint','vibrance','saturation'];
    const expected={'warm-cinematic':[.02,.28,-.16,.08,.06,-.16,.18,-.04,.26,.1],
      'cool-teal':[0,.32,-.2,.14,.04,-.2,-.26,.08,.22,.04],'bleach-bypass':[.08,.54,.12,-.1,.18,-.28,.04,0,-.18,-.46]}[grade.look];
    keys.forEach((key,i)=>near(o.stats.uniforms['u_'+key],expected[i]));
    const detailKeys=['vignette','vignetteMidpoint','vignetteRoundness','vignetteFeather','grain','grainSize','grainRoughness'];
    const details={'warm-cinematic':[.3,.5,0,.7,.1,.3,.5],'cool-teal':[.34,.5,0,.68,.1,.3,.5],'bleach-bypass':[.24,.5,0,.72,.18,.34,.5]}[grade.look];
    detailKeys.forEach((key,i)=>near(o.stats.uniforms['u_'+key],details[i]));
    let seed=2166136261;for(const char of 'gs-img-after')seed=Math.imul(seed^char.charCodeAt(0),16777619);
    near(o.stats.uniforms.u_grainSeed,(seed>>>0)%10000+Math.floor(t*60),.001);
    const fitScale=Math.min(W/o.size[0],H/o.size[1]),fw=o.size[0]*fitScale,fh=o.size[1]*fitScale;
    near(o.stats.uniforms.u_uvScale[0],fw/W);near(o.stats.uniforms.u_uvScale[1],fh/H);
    near(o.stats.uniforms.u_uvOffset[0],(W-fw)/W/2);near(o.stats.uniforms.u_uvOffset[1],(H-fh)/H/2);
    assert.equal(o.stats.lost,false);assert.equal(o.stats.contexts,1);assert.equal(o.stats.textures,1);
    assert.equal(o.stats.programs,1);assert.equal(o.stats.look,grade.look);assert.equal(o.stats.width,W);assert.equal(o.stats.height,H);
    if(t===6){near(o.crop,W);near(o.edge.alpha,0);near(o.tags[0].alpha,0);near(o.tags[1].alpha,1);}
    return {time:t,width:x,hold,scale,look:grade.look,canvas:[W,H],fit:o.stats.fit};
  }
  async function inspectPresentation(spec,time) {
    if(spec.content.treatment==='grade-split')return inspectGradeSplit(spec,time);
    if(spec.content.treatment==='steam-window')return inspectSteam(spec,time);
    const o=await page.locator('.scene[aria-hidden="false"] .presentation-board').evaluate(board=>{
      const panel=board.querySelector('.presentation-panel'),m=new DOMMatrix(panel.style.transform),label=board.querySelector('.presentation-label');
      const rect=n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];};
      return {state:JSON.parse(board.dataset.presentationState),height:board.clientHeight,alpha:+panel.style.opacity,matrix:[m.m11,m.m22,m.m41,m.m42],
        source:board.parentNode.querySelector('.resource-source').textContent,label:label.textContent,
        detail:board.querySelector('.presentation-detail')?.textContent,counter:board.querySelector('.presentation-counter')?.textContent,
        panel:rect(panel),copy:rect(board.querySelector('.presentation-copy')),picture:rect(board.querySelector('.presentation-picture')),
        text:[...board.querySelectorAll('[data-fit]')].map(n=>({rect:rect(n),shown:getComputedStyle(n).visibility==='visible',font:getComputedStyle(n).fontFamily})),
        images:[...board.querySelectorAll('.presentation-image')].map(n=>({src:n.getAttribute('src'),fit:getComputedStyle(n).objectFit,
          visible:getComputedStyle(n).visibility==='visible',decoded:n.complete&&n.naturalWidth>=32})),
        grounds:[...board.querySelectorAll('.presentation-ground')].map(n=>({src:n.getAttribute('src'),alpha:+n.style.opacity,decorative:n.getAttribute('aria-hidden')}))};
    });
    const c=spec.content,s=o.state,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`),clamp=x=>Math.max(0,Math.min(1,x));
    const out=(p,n=3)=>1-(1-clamp(p))**n;
    assert.equal(s.style,c.treatment);assert.equal(o.source,c.source);assert.equal(o.images.length,c.items.length);
    o.images.forEach((image,i)=>{assert.equal(image.src,configuration.assets[c.items[i].image]);assert.equal(image.fit,'contain');assert.ok(image.decoded);});
    assert.ok(o.text.every(n=>n.font.includes('BrandSans')||n.font.includes('BrandMono')));
    if(c.treatment==='preview-sheet') {
      const seconds=previewTime(spec,time),cuts=[.99,1.356667,1.69,2.023333,2.356667,2.69,3.09,3.456667,3.79,4.123333,4.456667,4.79,5.156667];
      const rows=[[.056667,1198,.13],[.09,903,.21],[.123333,648,.36],[.156667,437,.43],[.19,262,.5],[.223333,120,.62],
        [.256667,8,.78],[.29,-76,.89],[.323333,-138,1],[.356667,-175,1],[.39,-191,1],[.423333,-192,1],
        [.456667,-181,1],[.49,-159,1],[.523333,-131,1],[.556667,-100,1],[.59,-68,1],[.623333,-41,1],
        [.656667,-18,1],[.69,-5,1],[.723333,0,1]];
      const sample=rows.filter(row=>row[0]<=seconds).at(-1)||[0,1450,0],index=cuts.filter(cut=>seconds>=cut).length%4;
      near(s.clock.time,seconds);near(s.y,sample[1]);near(o.alpha,sample[2]);near(o.matrix[3],sample[1]*s.geometry.unit);near(o.matrix[0],1);
      assert.equal(s.index,index);assert.equal(o.label,c.items[index].label);assert.equal(o.counter,`${index+1} / 4`);
      assert.deepEqual(o.images.map(i=>i.visible),c.items.map((_,i)=>i===index));assert.equal(o.grounds.length,4);
      o.grounds.forEach((image,i)=>{assert.equal(image.src,configuration.assets[c.items[i].image]);assert.equal(image.alpha,i===index?1:0);assert.equal(image.decorative,'true');});
      const fits=s.geometry.y+sample[1]*s.geometry.unit>=0&&s.geometry.y+sample[1]*s.geometry.unit+s.geometry.h<=o.height;
      assert.ok(o.text.every(n=>n.shown===(fits&&sample[2]>0)));
    } else {
      const p=clamp((Math.floor(time*30+1e-7)-Math.ceil((cues[spec.cues[0]].start+.4)*30))/24),t=p*1.25,q=out((t-.1)/.7,4);
      near(s.p,p);near(o.alpha,q);near(o.matrix[0],.94+.06*q);near(o.matrix[1],o.matrix[0]);near(o.matrix[3],60*(1-q)*s.geometry.unit);
      near(s.title,out((t-.55)/.5));near(s.detail,out((t-.7)/.45));assert.equal(o.label,c.items[0].label);assert.equal(o.detail,c.items[0].detail);
      assert.equal(o.grounds.length,0);assert.ok(o.images[0].visible);
    }
    for(const text of o.text.filter(n=>n.shown)) {
      const [x,y,r,b]=text.rect,[px,py,pr,pb]=o.panel;
      assert.ok(x>=px-1&&y>=py-1&&r<=pr+1&&b<=pb+1,'Presentation copy is clipped by its own panel');
      const [ix,iy,ir,ib]=o.picture;assert.ok(r<=ix||x>=ir||b<=iy||y>=ib,'Presentation text overlaps the verified image');
    }
    return o;
  }
  async function inspectSteam(spec,time) {
    const o=await page.locator('.scene[aria-hidden="false"] .steam-board').evaluate(board=>{
      const image=board.querySelector('.steam-image'),canvas=board.querySelector('canvas'),picture=board.querySelector('.steam-picture');
      const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let painted=0,colored=0;
      for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>0){painted++;if(pixels[i]!==255||pixels[i+1]!==255||pixels[i+2]!==255)colored++;}
      return {state:JSON.parse(board.dataset.steamState),source:board.parentNode.querySelector('.resource-source').textContent,
        label:board.querySelector('.steam-label').textContent,font:getComputedStyle(board.querySelector('.steam-label')).fontFamily,
        src:image.getAttribute('src'),fit:getComputedStyle(image).objectFit,filter:getComputedStyle(image).filter,
        transform:getComputedStyle(image).transform,dimensions:[image.naturalWidth,image.naturalHeight],
        viewport:[picture.clientWidth,picture.clientHeight],canvas:[canvas.width,canvas.height],
        box:[canvas.style.left,canvas.style.top,canvas.style.width,canvas.style.height].map(parseFloat),
        mask:getComputedStyle(canvas).maskImage,painted,colored};
    });
    const c=spec.content,s=o.state,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`),seconds=presentationTime(spec,time,10);
    assert.equal(o.src,configuration.assets[c.items[0].image]);assert.equal(o.label,c.items[0].label);assert.equal(o.source,c.source);
    assert.equal(o.fit,'contain');assert.equal(o.filter,'none');assert.equal(o.transform,'none');assert.ok(o.font.includes('BrandMono'));
    assert.deepEqual(o.canvas,[340,420]);assert.ok(o.painted>0,'Steam canvas is empty');assert.equal(o.colored,0,'Steam must use native white');
    assert.ok(o.mask.includes('ellipse')&&o.mask.includes('55%')&&o.mask.includes('78%'),'Steam feather mask is missing');
    const [W,H]=o.viewport,[iw,ih]=o.dimensions,fit=Math.min(W/iw,H/ih),w=iw*fit,h=ih*fit,r=c.region;
    const box=[(W-w)/2+r.x*w,(H-h)/2+r.y*h,r.width*w,r.height*h];
    box.forEach((v,i)=>assert.ok(Math.abs(v-o.box[i])<.01,'Steam region differs from the contained image'));near(s.clock.time,seconds);
    let seed=1897;const random=()=>{seed=(seed+0x6d2b79f5)|0;let n=Math.imul(seed^(seed>>>15),1|seed);n=(n+Math.imul(n^(n>>>7),61|n))^n;return ((n^(n>>>14))>>>0)/4294967296;};
    assert.equal(s.poses.length,14);
    s.poses.forEach(pose=>{
      const x0=90+random()*160,cycles=1+Math.floor(random()*2),phase=random(),amplitude=14+random()*26,
        frequency=1+Math.floor(random()*2),width=10+random()*22,rise=300+random()*80,alpha=.05+random()*.09;
      const at=seconds%10/10*cycles+phase,p=at-Math.floor(at),sway=Math.sin(2*Math.PI*(p*frequency+phase))*amplitude*p;
      const expected={x:x0+sway,y:380-p*rise,alpha:Number((alpha*Math.sin(Math.PI*p)).toFixed(4)),radius:width*(.7+p*1.6),angle:sway*.004};
      Object.keys(expected).forEach(key=>near(pose[key],expected[key]));
    });
    return o;
  }
  async function inspectNewsTicker(spec,time) {
    const o=await page.locator('.scene[aria-hidden="false"] .news-ticker-board').evaluate(board=>{
      const shell=board.querySelector('.news-ticker-shell'),header=board.querySelector('.news-ticker-header'),track=board.querySelector('.news-ticker-track');
      const rectangle=n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];};
      return {s:JSON.parse(board.dataset.tickerState),source:board.parentNode.querySelector('.resource-source').textContent,
        name:board.querySelector('.news-ticker-brand').textContent,role:board.querySelector('.news-ticker-title').textContent,
        items:[...track.children].map(n=>n.textContent),alpha:+shell.style.opacity,y:new DOMMatrix(shell.style.transform).m42,
        trackX:new DOMMatrix(track.style.transform).m41,clip:board.querySelector('.news-ticker-title').style.clipPath,
        shell:rectangle(shell),shown:getComputedStyle(header).visibility==='visible',
        copy:[...header.children].map(n=>({box:rectangle(n),font:getComputedStyle(n).fontFamily})),
        window:rectangle(board.querySelector('.news-ticker-window')),last:rectangle(track.lastElementChild)};
    });
    const c=spec.content,s=o.s,t=presentationTime(spec,time,6.67),clamp=x=>Math.max(0,Math.min(1,x)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5);
    const out=(x,n)=>1-(1-clamp(x))**n;
    assert.equal(o.name,c.name);assert.equal(o.role,c.role);assert.equal(o.source,c.context);assert.deepEqual(o.items,c.items);
    near(s.time,t);near(o.alpha,out(t/.52,5));near(o.y,260*(1-out(t/.52,5)));
    near(s.brand,out((t-.08)/.42,4));near(s.title,out((t-.18)/.62,4));
    near(o.trackX,s.width+(Math.min(0,s.width-32-s.trackWidth)-s.width)*clamp((t-.62)/6.05));
    assert.ok(o.copy.every(n=>n.font.includes('BrandSans')));
    if(o.shown)for(const n of o.copy){const [x,y,r,b]=n.box,[sx,sy,sr,sb]=o.shell;assert.ok(x>=sx-1&&r<=sr+1&&y>=sy-1&&b<=sb+1,'Ticker header clipped');}
    if(t>=6.67-1e-8)assert.ok(o.last[0]>=o.window[0]-1&&o.last[2]<=o.window[2]+1,'Final ticker item must remain fully readable');
    return o;
  }
  async function inspectBrandLockup(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .brand-lockup-board').evaluate(board=>{
      const rect=n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];};
      const pose=n=>{const m=new DOMMatrix(getComputedStyle(n).transform);return [m.m11,m.m41,m.m42];};
      const logo=board.querySelector('.brand-lockup-logo'),arrow=board.querySelector('.brand-lockup-arrow'),glow=board.querySelector('.brand-lockup-glow');
      return {state:JSON.parse(board.dataset.lockupState),width:board.clientWidth,height:board.clientHeight,
        root:+getComputedStyle(board).opacity,heading:board.querySelector('.brand-lockup-title').textContent,
        action:board.querySelector('.brand-lockup-action').textContent,label:board.querySelector('.brand-lockup-label').textContent,
        text:[...board.querySelectorAll('[data-fit]')].map(n=>({box:rect(n),font:getComputedStyle(n).fontFamily,
          shown:+getComputedStyle(n).opacity>0,alpha:+getComputedStyle(n).opacity,pose:pose(n),height:n.offsetHeight})),
        logo:logo?{src:logo.getAttribute('src'),decoded:logo.complete&&logo.naturalWidth>0,fit:getComputedStyle(logo).objectFit,
          visible:getComputedStyle(logo).visibility,alpha:+getComputedStyle(logo).opacity,pose:pose(logo)}:null,
        arrow:arrow?{alpha:+arrow.style.opacity,pose:pose(arrow),path:arrow.querySelector('path').getAttribute('d')}:null,
        glow:glow?{alpha:+glow.style.opacity,pose:pose(glow)}:null,
        ring:board.querySelector('.brand-collision-ring')?{alpha:+board.querySelector('.brand-collision-ring').style.opacity,pose:pose(board.querySelector('.brand-collision-ring'))}:null,
        lines:[...board.querySelectorAll('.brand-lockup-line')].map(n=>({top:parseFloat(n.style.top),angle:new DOMMatrix(n.style.transform).m12})),
        pieces:[...board.querySelectorAll('.brand-logo-piece')].map(n=>({alpha:+n.style.opacity,pose:pose(n),clip:n.style.clipPath,
          visible:getComputedStyle(n).visibility,src:n.firstChild.getAttribute('src'),fit:getComputedStyle(n.firstChild).objectFit})),
        badges:[...board.querySelectorAll('.brand-destination')].map(n=>({box:rect(n),alpha:+n.style.opacity,pose:pose(n),height:n.offsetHeight,
          icon:n.querySelector('img').getAttribute('src'),copy:[...n.querySelectorAll('[data-fit]')].map(q=>({text:q.textContent,box:rect(q)}))}))};
    });
    const c=spec.content,s=observed.state,clamp=x=>Math.max(0,Math.min(1,x)),out=(x,n=3)=>1-(1-clamp(x))**n;
    const back=(x,a)=>{const p=clamp(x)-1;return 1+(a+1)*p**3+a*p*p;},near=(a,b,epsilon=1e-5)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
    const frame=Math.floor(time*30+1e-7),starts=spec.cues.map(cue=>Math.ceil((cues[cue].start+.4)*30));
    const index=starts.length===2&&frame>=starts[1]?1:0,p=clamp((frame-starts[index])/24);
    const t=c.style==='badge-pair'?1.2*p:c.style==='logo-intro'?(index?2.3+1.05*p:1.188*p):c.style==='logo-collide'?(index?1.2+.3*p:1.2*p):(index?2+1.2*p:1.9*p);
    assert.equal(s.style,c.style);assert.equal(s.clock.index,index);near(s.clock.p,p);near(s.clock.seconds,t);
    assert.equal(observed.heading,c.heading);assert.equal(observed.action,c.action);assert.equal(observed.label,c.label);
    assert.ok(observed.text.every(n=>n.font.includes('BrandSans')||n.font.includes('BrandMono')));
    if(c.style==='badge-pair') {
      assert.equal(observed.logo,null);assert.equal(observed.badges.length,c.badges.length);near(s.title,out((t-.05)/.48));
      near(observed.text[0].alpha,s.title);near(observed.text[0].pose[2],.22*(1-s.title)*observed.text[0].height,.001);
      observed.badges.forEach((badge,i)=>{
        const q=out((t-.22-i*.1)/.68);near(badge.alpha,q);near(badge.pose[2],.28*(1-q)*badge.height,.001);
        assert.equal(badge.icon,configuration.icons[c.badges[i].icon]);assert.deepEqual(badge.copy.map(n=>n.text),[c.badges[i].eyebrow,c.badges[i].label]);
        for(const item of badge.copy){const [x,y,r,b]=item.box,[px,py,pr,pb]=badge.box;assert.ok(x>=px-1&&r<=pr+1&&y>=py-1&&b<=pb+1,'Destination copy clipped');}
      });
      if(p===1){near(s.title,1);near(s.footer,1);}
    } else {
      assert.equal(observed.logo.src,'assets/logo.png');assert.equal(observed.logo.fit,'contain');assert.ok(observed.logo.decoded);
      if(c.style==='logo-collide') {
        const ring=out((t-.8)/.4);near(observed.ring.alpha,t<.8?0:1-ring);near(observed.ring.pose[0],.2+2.3*ring);
        assert.equal(observed.logo.visible,t>=.8?'visible':'hidden');near(observed.logo.pose[0],s.scale);
        assert.equal(observed.pieces.length,5);
        observed.pieces.forEach((piece,i)=>{
          const [x,y]=[[-960,-540],[960,-540],[-960,0],[960,0],[-960,540]][i],q=back((t-i*.05)/.6,1.1);
          assert.equal(piece.src,'assets/logo.png');assert.equal(piece.fit,'contain');near(piece.pose[0],1);
          near(piece.pose[1],x*(1-q)*observed.width/1920,.005);near(piece.pose[2],y*(1-q)*observed.height/1080,.005);
          assert.equal(piece.visible,t>=.8?'hidden':'visible');
        });
        observed.text.forEach(copy=>near(copy.alpha,out((t-.8)/.4)));
        if(index===1&&p===1){near(observed.logo.pose[0],0);near(observed.ring.alpha,0);}
      } else if(c.style==='logo-intro') {
        const q=back((t-.288)/.55,1.5),arrow=back((t-2.9)/.45,1.6);
        near(observed.root,out(t/.48));near(observed.logo.alpha,clamp(q));near(observed.logo.pose[0],.55+.45*q);near(observed.logo.pose[2],24*(1-q));
        near(s.kicker,out((t-.738)/.45)*(1-clamp((t-2.3)/.3)**3));near(s.title,out((t-2.66)/.5,4));
        near(observed.text[0].alpha,s.title);near(observed.text[2].alpha,s.kicker);near(observed.text[0].pose[2],14*(1-s.title));
        near(observed.arrow.alpha,clamp(arrow));near(observed.arrow.pose[0],.5+.5*arrow);near(observed.arrow.pose[1],-14*(1-arrow));
        assert.equal(observed.arrow.path,'M4 12h15M13 5l7 7-7 7');assert.equal(observed.lines.length,12);
        observed.lines.forEach((line,i)=>{near(line.top,Math.round((i+1)*1080/13+Math.sin((i+1)*2.399)*10)/1080*100);
          near(line.angle,Math.sin(Number((Math.sin((i+1)*1.7)*.35).toFixed(2))*Math.PI/180));});
      } else {
        assert.equal(observed.logo.visible,t>=1.9?'visible':'hidden');assert.equal(observed.pieces.length,5);
        observed.pieces.forEach((piece,i)=>{
          const q=out((t-i*.08)/1.2,5),a=1+.15*back((1.5-1.2-i*.02)/.5,1.7),u=clamp((t-1.5)/.4),settle=u<.5?4*u**3:1-(-2*u+2)**3/2;
          const scale=t<1.5?1+.15*back((t-1.2-i*.02)/.5,1.7):a+(1-a)*settle;
          assert.equal(piece.src,'assets/logo.png');assert.equal(piece.fit,'contain');near(piece.alpha,q);near(piece.pose[0],scale);near(piece.pose[1],observed.width*(1-q),.005);
          assert.equal(piece.visible,t>=1.9?'hidden':'visible');
          assert.ok(piece.clip.startsWith('inset('));const values=piece.clip.slice(6,-1).trim().split(/\s+/);
          const edges=values.length===4?values:values.length===3?[...values,values[1]]:values.length===2?[...values,...values]:Array(4).fill(values[0]);
          [0,(4-i)*20,0,i*20].forEach((value,j)=>near(parseFloat(edges[j]),value));
          assert.ok(edges.every((value,j)=>parseFloat(value)===0||[1,3].includes(j)&&value.endsWith('%')));
        });
        near(s.glow,out((t-1.2)/.4)*(1-out((t-1.6)/1.2)));near(s.title,out((t-2)/1,4));near(s.action,out((t-2.4)/.8,4));
        near(observed.glow.alpha,s.glow);near(observed.glow.pose[0],s.glowScale);
        near(observed.text[0].alpha,s.title);near(observed.text[1].alpha,s.action);near(observed.text[2].alpha,s.action);
      }
    }
    const copy=observed.text.filter(n=>n.shown);
    for(let i=0;i<copy.length;i++)for(let j=i+1;j<copy.length;j++){
      const [ax,ay,ar,ab]=copy[i].box,[bx,by,br,bb]=copy[j].box;
      assert.ok(ar<=bx||br<=ax||ab<=by||bb<=ay,'Readable lockup text overlaps');
    }
    return observed;
  }
  async function inspectSourceStage(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .source-stage-board').evaluate(board=>{
      const canvas=board.querySelector('canvas'),state=JSON.parse(board.dataset.sourceState);
      const frame=[...document.querySelectorAll('iframe')].find(n=>n.contentWindow?.__source);
      return {state,width:canvas.width,height:canvas.height,
        failure:frame?.contentWindow.__sourceFailure??null,
        font:window.ShortCreatorSourceFonts[ state.style==='glass-shard'?'body_sha256':'display_sha256'],
        frames:document.querySelectorAll('iframe').length};
    });
    assert.equal(observed.failure,null);assert.equal(observed.frames,1);
    assert.equal(observed.state.style,spec.content.style);assert.equal(observed.state.font_sha256,observed.font);
    assert.match(observed.font,/^[a-f0-9]{64}$/);
    const duration=spec.content.style==='glass-shard'?9:22.5;
    const first=Math.ceil((cues[spec.cues[0]].start+.4)*30),last=Math.ceil((cues[spec.cues[1]].start+.4)*30);
    const seconds=duration*Math.max(0,Math.min(1,(Math.floor(time*30+1e-7)-first)/(last-first)));
    assert.ok(Math.abs(observed.state.clock.seconds-seconds)<1e-7);
    assert.ok(Math.abs(observed.state.rig.seconds-seconds)<.00011);
    if(spec.content.style==='glass-shard'){
      assert.equal(observed.state.rig.headline,spec.content.heading);
      assert.ok(observed.state.rig.shards>0&&observed.state.rig.shards<=8);
      assert.ok(observed.state.rig.fontPixels>=40);assert.equal(observed.state.rig.weight,600);
    }else{
      assert.equal(observed.state.rig.cache,false);assert.equal(observed.state.rig.profile,'studio');
      assert.equal(observed.state.rig.weight,800);
    }
    return observed;
  }
  async function inspectSpatialObject(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .spatial-object-board').evaluate(board=>{
      const canvas=board.querySelector('canvas'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let painted=0;
      for(let y=1;y<16;y++)for(let x=1;x<16;x++)painted+=pixels[(Math.floor(canvas.height*y/16)*canvas.width+Math.floor(canvas.width*x/16))*4+3]>0?1:0;
      // The source contact shadow can lie between coarse samples before letters flip up.
      if(!painted&&board.dataset.objectStyle==='extruded-logo')for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0){painted=1;break;}
      const state=JSON.parse(board.dataset.objectState);
      const titleInk=board.dataset.objectStyle==='cuboid-carousel'?(state.rig?.readable||[]).filter(row=>row.weight===800).map(row=>{
        const [left,top,right,bottom]=row.box;let count=0;
        for(let y=Math.max(0,Math.floor(top));y<Math.min(canvas.height,Math.ceil(bottom));y++)
          for(let x=Math.max(0,Math.floor(left));x<Math.min(canvas.width,Math.ceil(right));x++){
            const i=(y*canvas.width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
            if(Math.min(r,g,b)>128&&Math.max(r,g,b)-Math.min(r,g,b)<64)count++;
          }
        return count;
      }):[];
      return {state,width:canvas.width,height:canvas.height,painted,titleInk,
        stats:window.ShortCreatorSpatialObjects.stats(),caption:board.parentNode.querySelector('.spatial-object-caption').textContent,
        source:board.parentNode.querySelector('.spatial-object-source').textContent,
        images:[...board.querySelectorAll('[data-object-input]')].map(n=>({src:n.getAttribute('src'),ready:n.complete&&n.naturalWidth>0,
          path:n.dataset.objectPath??null,verified:n.dataset.objectPath?n.getAttribute('src')===window.ShortCreatorShaderImages?.[n.dataset.objectPath]:null})),
        labels:[...board.querySelectorAll('[data-layer-label]')].map(n=>({text:n.lastElementChild.textContent,
          index:n.firstElementChild.textContent,font:getComputedStyle(n).fontFamily,size:parseFloat(getComputedStyle(n).fontSize),
          opacity:+n.style.opacity,visible:getComputedStyle(n).visibility==='visible',matrix:Array.from(new DOMMatrix(n.style.transform).toFloat64Array())})),
        lines:[...board.querySelectorAll('line')].map(n=>['x1','x2','y1','y2'].map(a=>+n.getAttribute(a)))};
    });
    const c=spec.content,s=observed.state,clamp=x=>Math.max(0,Math.min(1,x)),out=x=>1-(1-clamp(x))**3;
    const smooth=x=>{const p=clamp(x);return p<.5?4*p**3:1-(-2*p+2)**3/2;};
    const frame=Math.floor(time*30+1e-7),starts=spec.cues.map(cue=>Math.ceil((cues[cue].start+.4)*30));
    assert.equal(s.style,c.style);assert.equal(observed.caption,c.caption);assert.equal(observed.source,c.source);
    assert.equal(observed.stats.revision,'185');assert.equal(observed.stats.contexts,1);
    const geometryLimit=c.style==='device-review'?73:['phone-glass','desktop-glass'].includes(c.style)?38:c.style==='canopy-part-title'?s.rig.geometryCount+10:c.style==='wireframe-portal-title'?16+2*[c.word,c.phrase,c.heading,c.caption].join('').replaceAll(' ','').length:32;
    const textureLimit=c.style==='device-review'?18:c.style==='canopy-part-title'?26:16;
    assert.ok(observed.stats.geometries>0&&observed.stats.geometries<=geometryLimit);assert.ok(observed.stats.textures>0&&observed.stats.textures<=textureLimit);
    assert.ok(observed.painted>0,'Spatial renderer produced an empty canvas');assert.ok(observed.images.every(image=>image.ready));
    if(c.style==='exploded-stack') {
      assert.deepEqual(observed.images.map(i=>i.src),c.layers.map(layer=>configuration.icons[layer.icon]));
      const index=starts.reduce((last,start,i)=>frame>=start?i:last,-1),p=index<0?0:clamp((frame-starts[index])/24);
      const a=index>0?1.25+(index-1)*.7:0,b=index===4?5:1.25+index*.7,t=index<0?0:a+(b-a)*p;
      assert.equal(s.clock.index,index);assert.equal(s.clock.progress,p);assert.ok(Math.abs(s.clock.seconds-t)<1e-8);
      assert.equal(s.layers.length,4);assert.equal(observed.labels.length,4);
      const fit=Math.min(observed.width/1920,observed.height/1080),px=1080/(2*5.9)*fit;
      observed.labels.forEach((label,i)=>{
        const land=1.25+i*.7,arrival=out((t-land+.3)/.3),shown=arrival*(1-clamp((t-4.05)/.2));
        const open=out(clamp((t-.3-i*.06)/.9)**1.4)-smooth((t-4.1-(3-i)*.05)/.6);
        const focus=arrival*(1-smooth((t-land-.4)/.3)),y=(3-i)*(.24+1.55*open)-2.2+.08*focus;
        assert.ok(Math.abs(s.layers[i].y-y)<1e-8);assert.ok(Math.abs(label.opacity-shown)<.00001);
        assert.equal(label.visible,shown>0);assert.equal(label.text,c.layers[i].label);assert.equal(label.index,String(i+1).padStart(2,'0'));
        assert.ok(label.font.includes('BrandSans'));assert.equal(label.size,28);assert.ok(label.matrix.every(Number.isFinite));
        const ax=observed.width/2+.4/Math.sqrt(2)*px,ay=observed.height/2-(2*y-1.4)/Math.sqrt(6)*px;
        assert.ok(Math.abs(s.anchors[i].x-ax)<.00001&&Math.abs(s.anchors[i].y-ay)<.00001,'Layer label anchor does not project its actual plate');
        assert.equal(label.matrix[12],Math.round(ax+(114+(1-shown)*16)*fit));assert.equal(label.matrix[13],Math.round(ay-18));
        const line=observed.lines[i];assert.ok(Math.abs(line[0]-ax)<.00001&&Math.abs(line[1]-ax-90*fit*shown)<.00001);
      });
    } else if(['phone-glass','desktop-glass'].includes(c.style)) {
      const phone=c.style==='phone-glass',r=s.rig,near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7);
      const elapsed=Math.max(0,frame-starts[0]),gap=starts[1]-starts[0],settle=clamp((elapsed-gap)/24);
      const seconds=settle===1?15:15*(Math.min(elapsed,gap)+24*(settle-settle**3+.5*settle**4))/(gap+12);
      near(s.seconds,seconds);near(r.seconds,seconds);assert.equal(r.idleDrift,false);
      const expected=await page.evaluate(({name,seconds})=>window.ShortCreatorDeviceGlassMotion.pose(name,seconds),{name:phone?'phone':'desktop',seconds});
      assert.deepEqual(r.state,expected.state);assert.equal(r.source,expected.source);
      assert.equal(r.model.sha256,phone?'20b926be3ab68ad773af8ef83949561f1f93bc22777688efd89bc38f0840614e':'12749c742f3bf67d14650eb831ab6c02104fba59074034c8ed42ce2c5c37c02b');
      assert.equal(r.model.nodes,phone?31:105);assert.equal(r.model.geometries,phone?31:34);
      assert.equal(r.model.screen,phone?'front-glass':'display');near(r.model.alignment,phone?Math.PI:0);
      const p=expected.state,prefix=phone?'ph':'lp';assert.ok(r.fit>=1&&r.fit<4);near(r.camera.fov,34);
      for(const [i,key]of ['X','Y','Z'].entries()){
        near(r.model.position[i],p[prefix+key]);near(r.model.rotation[i],p[prefix+'R'+key]);
        near(r.camera.position[i],p['cl'+key]+(p['c'+key]-p['cl'+key])*r.fit);
      }
      assert.ok(r.bounds.every(n=>Number.isFinite(n)&&Math.abs(n)<=1/1.06+1e-7),'Glass device clips the native board');
      assert.deepEqual(r.canvas,phone?[390,844]:[1440,900]);near(r.backdropTime,p.drift);
      assert.equal(r.screenSource,configuration.assets[c.image]);assert.equal(observed.images[0].path,r.screenSource);
      assert.ok(observed.images[0].verified&&observed.images[0].src.startsWith('data:image/'));
      const ids=[...new Set(phone?c.notifications.map(n=>n.icon):[c.notification.icon,...c.desktop.window.sidebar.map(n=>n.icon),...c.desktop.dock])];
      assert.deepEqual(r.iconIds,ids);assert.deepEqual(observed.images.slice(1).map(n=>n.src),ids.map(id=>configuration.icons[id]));
      const records=phone?c.notifications:[c.notification];assert.equal(r.overlay.notifications.length,records.length);
      for(const [i,row]of r.overlay.notifications.entries()){
        for(const key of ['icon','title','time','body'])assert.equal(row[key],records[i][key]);
        if(phone){const q=await page.evaluate(p=>window.ShortCreatorDeviceGlassMotion.notification(p),p['iosN'+(i+1)]),lift=Math.sin(q*Math.PI);
          near(row.q,q);near(row.x,13);near(row.y,106+i*68+(1-q)*-58+lift*6);near(row.h,66+lift*2);near(row.w,364);
        }else{near(row.q,p.macToastOpacity);near(row.x,p.macToastX);near(row.y,p.macToastY);near(row.w,390);near(row.h,96);}
      }
      assert.ok(r.overlay.copy.every(row=>row.font.includes('BrandSans')&&row.width<=row.limit+.01),'Device glass copy exceeds its readable slot');
      if(phone)assert.equal(r.overlay.calendar,null);
      else{
        const date=c.desktop.calendar;
        assert.equal(r.overlay.calendar.selected,date.day);assert.equal(r.overlay.calendar.days,new Date(Date.UTC(date.year,date.month,0)).getUTCDate());
        assert.equal(r.overlay.calendar.first,new Date(Date.UTC(date.year,date.month-1,1)).getUTCDay());
      }
    } else if(c.style==='device-review') {
      assert.deepEqual(observed.images.map(image=>image.path),[configuration.assets[c.phone],configuration.assets[c.laptop]]);
      assert.ok(observed.images.every(image=>image.verified&&image.src.startsWith('data:image/')));
      const elapsed=Math.max(0,frame-starts[0]),gap=starts[1]-starts[0],settle=clamp((elapsed-gap)/24);
      const seconds=settle===1?15:15*(Math.min(elapsed,gap)+24*(settle-settle**3+.5*settle**4))/(gap+12);
      assert.ok(Math.abs(s.seconds-seconds)<1e-8);assert.equal(s.rig.seconds,s.seconds);assert.equal(s.rig.idleDrift,false);
      const expected=await page.evaluate(t=>window.ShortCreatorDeviceMotion.pose(t),seconds);
      assert.deepEqual(s.rig.state,expected.state);
      const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7);
      const p=expected.state;
      for(const [model,prefix,nodes,geometries,sha]of [
        [s.rig.phone,'ph',31,31,'20b926be3ab68ad773af8ef83949561f1f93bc22777688efd89bc38f0840614e'],
        [s.rig.laptop,'lp',105,34,'12749c742f3bf67d14650eb831ab6c02104fba59074034c8ed42ce2c5c37c02b']]){
        assert.equal(model.sha256,sha);assert.equal(model.nodes,nodes);assert.equal(model.geometries,geometries);
        for(const [i,key]of ['X','Y','Z'].entries()){near(model.position[i],p[prefix+key]);near(model.rotation[i],p[prefix+'R'+key]);}
        assert.ok(model.scale.every(v=>v>0&&v===model.scale[0]));
      }
      near(s.rig.phone.alignment,Math.PI);near(s.rig.turn,p.turn);
      assert.equal(s.rig.framing,'mesh-bounds-dolly');assert.ok(s.rig.fit>=1&&s.rig.fit<4);
      const pull=clamp((seconds-11)/1.5),dolly=1+(s.rig.fit-1)*pull*pull*(3-2*pull);near(s.rig.dolly,dolly);
      for(const [i,key]of ['X','Y','Z'].entries())near(s.rig.camera.position[i],p['cl'+key]+(p['c'+key]-p['cl'+key])*dolly);
      if(seconds>=12.5)assert.ok(s.rig.closingBounds.every(v=>Number.isFinite(v)&&Math.abs(v)<=1/1.06+1e-7),'Closing device orbit clips the native board');
      else assert.equal(s.rig.closingBounds,null);
      near(s.rig.camera.fov,34);
      assert.deepEqual(s.rig.lens,expected.lens);assert.deepEqual(s.rig.screens.map(row=>row.name),['front-glass','display']);
      for(const [i,row]of s.rig.screens.entries()){
        assert.equal(row.source,configuration.assets[i?c.laptop:c.phone]);assert.equal(row.material,'MeshBasicMaterial');
        assert.deepEqual(row.canvas,i?[1440,900]:[390,844]);assert.deepEqual(row.uvRange,[0,1]);
        const box=await page.evaluate(({row,scroll,travel})=>window.ShortCreatorDeviceReview.screenPlacement(...row.image,...row.canvas,scroll,travel),
          {row,scroll:p.scroll,travel:i?300:500});assert.deepEqual(row.placement,box);
      }
    } else if(c.style==='cuboid-carousel') {
      assert.deepEqual(observed.images,[]);assert.deepEqual(observed.labels,[]);
      const sourceFrame=frame<starts[1]?150*Math.max(0,frame-starts[0])/(starts[1]-starts[0]):Math.min(200,150+frame-starts[1]);
      const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7);
      near(s.seconds,sourceFrame/30);near(s.rig.frame,sourceFrame);assert.equal(s.rig.handheld,0);
      const proof=await page.evaluate(({time,count,hero})=>window.ShortCreatorCuboidMotion.create(window.ShortCreatorThree,count,hero,0).sample(time),
        {time:sourceFrame/30,count:c.cards.length,hero:c.hero});
      assert.equal(s.rig.hero,c.hero);assert.equal(s.rig.heroSlot,proof.heroSlot);near(s.rig.heroFill,proof.heroFill);
      assert.deepEqual(s.rig.geometry,{vertices:80552,indices:102948});assert.deepEqual(s.rig.textureSize,[540,756]);
      assert.deepEqual(s.rig.shadowMapSize,[2048,2048]);s.rig.root.forEach((n,i)=>near(n,proof.root[i]));
      assert.equal(s.rig.tiles.length,18);
      s.rig.tiles.forEach((tile,i)=>{
        const expected=proof.tiles[i];assert.equal(tile.visible,expected.visible);assert.equal(tile.item,expected.item);assert.equal(tile.heroMaterial,expected.heroMaterial);
        for(const key of ['position','quaternion','scale'])tile[key].forEach((n,j)=>near(n,expected[key][j]));
      });
      for(const key of ['position','quaternion'])s.rig.camera[key].forEach((n,i)=>near(n,proof.camera[key][i]));
      near(s.rig.camera.fov,2*Math.atan(Math.tan(proof.camera.fov*Math.PI/360)*.72)*180/Math.PI);
      assert.equal(s.rig.copy.length,c.cards.length);
      s.rig.copy.forEach((card,i)=>{
        const expected=c.cards[i];assert.equal(card.category,expected.category);assert.equal(card.title,expected.title);assert.deepEqual(card.pills,expected.pills);
        assert.equal(card.rows[0].text,expected.category);assert.equal(card.rows.filter(row=>row.weight===800).map(row=>row.text).join(' '),expected.title);
        assert.deepEqual(card.rows.slice(-expected.pills.length).map(row=>row.text),expected.pills);
        for(const row of card.rows){assert.equal(row.font,`${row.weight} ${row.size}px BrandSans`);assert.ok([600,800].includes(row.weight));
          const [l,t,r,b]=row.box;assert.ok(row.box.every(Number.isFinite)&&l>=0&&t>=0&&r<=495&&b<=756);}
      });
      if(sourceFrame>=90&&sourceFrame<=150){
        assert.ok(s.rig.readable.length>=3);const [l,t,r,b]=s.rig.heroBounds;
        assert.ok(l>=0&&t>=0&&r<=observed.width&&b<=observed.height);
        for(const row of s.rig.readable)assert.ok(row.size>=(row.weight===800?28:14));
        assert.ok(observed.titleInk.length>0&&observed.titleInk.every(count=>count>8),'Cuboid title has no visible letter ink');
      }else assert.deepEqual(s.rig.readable,[]);
    } else if(c.style==='canopy-part-title') {
      assert.deepEqual(observed.images.map(image=>image.path),[configuration.assets[c.surface],configuration.assets[c.normal]]);
      assert.ok(observed.images.every(image=>image.verified&&image.src.startsWith('data:image/')));
      assert.deepEqual(observed.labels,[]);assert.equal(s.rig.leaves.length,340);assert.equal(s.rig.dustCount,800);
      assert.equal(s.rig.retainedBreeze,0);assert.equal(s.rig.focus,16.4);assert.equal(s.rig.passes,6);
      assert.deepEqual(s.rig.shadowMapSize,[2048,2048]);assert.ok(s.rig.geometryCount>0&&s.rig.geometryCount<=340);
      const elapsed=Math.max(0,frame-starts[0]),gap=starts[1]-starts[0],settle=clamp((elapsed-gap)/24);
      const t=settle===1?10.5:10.5*(Math.min(elapsed,gap)+24*(settle-settle**3+.5*settle**4))/(gap+12);
      assert.ok(Math.abs(s.seconds-t)<1e-8);assert.ok(Math.abs(s.rig.seconds-t)<1e-8);
      const proof=await page.evaluate(({time,width,height})=>({
        font:window.ShortCreatorPortalOutlines.font_sha256,
        pose:window.ShortCreatorCanopyMotion.create(window.ShortCreatorThree,0,width/height).sample(time)
      }),{time:t,width:observed.width,height:observed.height});
      const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7);
      near(s.rig.camera.fov,proof.pose.camera.fov);
      for(const key of ['position','rotation'])s.rig.camera[key].forEach((n,i)=>near(n,proof.pose.camera[key][i]));
      s.rig.leaves.forEach((leaf,i)=>{
        const expected=proof.pose.leaves[i];assert.equal(leaf.visible,expected.visible);assert.equal(leaf.vertices,299);near(leaf.scale,expected.scale);
        if(leaf.visible)for(const key of ['position','rotation'])leaf[key].forEach((n,j)=>near(n,expected[key][j]));
        else {assert.equal(leaf.position,null);assert.equal(leaf.rotation,null);}
      });
      assert.deepEqual(s.rig.species.map(row=>row.kind),['monstera','alocasia','lance','calathea','fern']);
      for(const row of s.rig.species){near(row.windTime,proof.pose.windTime);assert.equal(row.alphaTest,.42);assert.equal(row.depthSharesWind,true);}
      s.rig.dustSample.forEach((n,i)=>near(n,proof.pose.dust.positions[i]));s.rig.dustRotation.forEach((n,i)=>near(n,proof.pose.dust.rotation[i]));
      const blurScale=Math.min(observed.width/1920,observed.height/1080)*1920/observed.width;
      near(s.rig.aperture,proof.pose.aperture*blurScale);near(s.rig.maxblur,proof.pose.maxblur*blurScale);
      assert.deepEqual(s.rig.titles.map(row=>row.text),[c.heading,c.caption]);
      for(const [i,row]of s.rig.titles.entries()){
        assert.equal(row.font,proof.font);assert.ok(row.size>=44);const [l,top,r,b]=row.box;
        assert.ok(row.box.every(Number.isFinite)&&l>=0&&top>=0&&r<=observed.width&&b<=observed.height,'Canopy title escapes its board');
        for(const [key,value]of Object.entries(proof.pose.wipes[i]))near(row.wipe[key],value);
      }
    } else if(c.style==='wireframe-portal-title') {
      assert.deepEqual(observed.images,[]);assert.deepEqual(observed.labels,[]);
      const elapsed=Math.max(0,frame-starts[0]),gap=starts[1]-starts[0],settle=clamp((elapsed-gap)/24);
      const t=settle===1?8:8*(Math.min(elapsed,gap)+24*(settle-settle**3+.5*settle**4))/(gap+12);
      assert.ok(Math.abs(s.seconds-t)<1e-8);assert.equal(s.rig.word,c.word);assert.equal(s.rig.phrase,c.phrase);
      assert.equal(s.rig.heading,c.heading);assert.equal(s.rig.caption,c.caption);assert.equal(s.rig.normalization,'nonzero');
      assert.equal(s.rig.gridSegments,3675);assert.equal(s.rig.warpCount,1000);assert.equal(s.rig.lineWidth,1.5);assert.equal(s.rig.passes,9);
      assert.equal(s.rig.sourceLetters,[...c.word].filter(ch=>ch!==' ').length);
      assert.equal(s.rig.targetLetters,[...c.phrase].filter(ch=>ch!==' ').length);
      assert.equal(s.rig.details.length,s.rig.sourceLetters+s.rig.targetLetters);
      assert.ok(s.rig.details.every(g=>g.vertices>0&&g.shapes>0&&g.segments>0));
      assert.ok(s.rig.titleSize>=44&&s.rig.phraseSize>=36);
      assert.deepEqual(s.rig.flatRows.map(row=>row.text),[c.heading,c.word,c.caption]);
      for(const row of s.rig.flatRows){const [left,top,right,bottom]=row.box;
        assert.ok(row.size>=20&&row.box.every(Number.isFinite));
        assert.ok(left>=0&&top>=0&&right<=observed.width&&bottom<=observed.height,'Portal flat copy escapes its board');}
      for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
        const [a,b]=[s.rig.flatRows[i].box,s.rig.flatRows[j].box];
        assert.ok(a[2]<=b[0]||b[2]<=a[0]||a[3]<=b[1]||b[3]<=a[1],'Portal flat copy overlaps');}
      const proof=await page.evaluate(({time,rig,width,height})=>{
        const M=window.ShortCreatorWireframeMotion,T=window.ShortCreatorThree,state=M.timeline(time),pose=M.cameraPose(time);
        const camera=new T.PerspectiveCamera(2*Math.atan(Math.tan(pose.fov*Math.PI/360)*Math.max(1,(16/9)/(width/height)))*180/Math.PI,width/height,.1,500);
        camera.position.set(...pose.position);camera.rotation.set(...pose.rotation);camera.updateMatrixWorld();
        const random=M.seeded(20260831);for(let i=0;i<rig.targetLetters*2;i++)random();
        const slots=M.matchLetters(rig.sourceData,rig.targetData,random);
        return {font:window.ShortCreatorPortalOutlines.font_sha256,state,pose:{fov:camera.fov,position:camera.position.toArray(),rotation:camera.rotation.toArray().slice(0,3)},
          handoff:M.handoff(time,slots,rig.targetLetters,(x,y,z)=>new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse).z)};
      },{time:t,rig:s.rig,width:observed.width,height:observed.height});
      assert.equal(s.rig.font,proof.font);assert.ok(Math.abs(s.rig.portal-proof.state.portal)<1e-8);
      assert.ok(Math.abs(s.rig.plate-proof.state.plate)<1e-8);assert.ok(Math.abs(s.rig.camera.fov-proof.pose.fov)<1e-8);
      for(const key of ['position','rotation'])s.rig.camera[key].forEach((n,i)=>assert.ok(Math.abs(n-proof.pose[key][i])<1e-8));
      s.rig.letters.forEach((slot,i)=>{for(const role of ['from','to']){
        const actual=slot[role],expected=proof.handoff.letters[i][role];if(!expected){assert.equal(actual,null);continue;}
        assert.equal(actual.visible,expected.visible);assert.equal(actual.opacity,expected.opacity);assert.equal(actual.outlineOpacity,expected.outlineOpacity);
        for(const key of ['position','rotation','scale'])actual[key].forEach((n,j)=>assert.ok(Math.abs(n-expected[key][j])<1e-8));
      }});
    } else if(c.style==='extruded-logo') {
      assert.deepEqual(observed.images,[]);assert.deepEqual(observed.labels,[]);
      const elapsed=Math.max(0,frame-starts[0]),gap=starts[1]-starts[0],settle=clamp((elapsed-gap)/24);
      const t=settle===1?4.3:4.3*(Math.min(elapsed,gap)+24*(settle-settle**3+.5*settle**4))/(gap+12);
      assert.ok(Math.abs(s.seconds-t)<1e-8);
      const font=await page.evaluate(()=>window.ShortCreatorFontOutlines);
      assert.equal(s.rig.font,font.font_sha256);assert.equal(s.rig.word,c.word);assert.equal(s.rig.finish,c.finish);
      const letters=[...c.word].filter(ch=>ch!==' ');assert.equal(s.rig.details.length,letters.length);
      const p=clamp((t-.9)/3.4),swing=p<.5?4*p**3:1-(-2*p+2)**3/2;
      assert.ok(Math.abs(s.rig.rotation[0]-(.04-.04*swing))<1e-8);
      assert.ok(Math.abs(s.rig.rotation[1]-(-.42+.42*swing))<1e-8);
      const span=[...c.word].reduce((n,ch)=>n+font.glyphs[ch].advance*.0015+.08,0)-.08;
      assert.equal(s.rig.scale,Math.min(1,7.4/span));
      letters.forEach((ch,i)=>{
        const u=clamp((t-.1-i*.13)/.9)-1,back=1+2.2*u**3+1.2*u**2;
        const letter=s.rig.letters[i],detail=s.rig.details[i];
        assert.equal(detail.character,ch);assert.ok(detail.vertices>0&&detail.shapes>0);
        assert.equal(detail.advance,font.glyphs[ch].advance*.0015);
        assert.ok(Math.abs(letter.rotation-(1-back)*(-Math.PI/2))<1e-8);
        assert.ok(Math.abs(letter.y-(1-clamp(back))*-.2)<1e-8);
        assert.equal(letter.visible,t>=.1+i*.13);
      });
      if(s.rig.bounds){const [left,top,right,bottom]=s.rig.bounds;
        assert.ok(s.rig.bounds.every(Number.isFinite));
        assert.ok(left>=-1&&top>=-1&&right<=observed.width+1&&bottom<=observed.height+1,'Extruded title escapes its native board');}
    } else {
      assert.deepEqual(observed.images.map(i=>i.src),[configuration.assets[c.image]]);
      assert.equal(observed.labels.length,0);
      const elapsed=Math.max(0,frame-starts[0]),gap=starts[1]-starts[0],settle=clamp((elapsed-gap)/24);
      const progress=settle===1?1:(Math.min(elapsed,gap)+24*(settle-settle**3+.5*settle**4))/(gap+12);
      assert.ok(Math.abs(s.progress-progress)<1e-8);
      if(c.style==='orbit-card') {
        const seconds=2.8+4*progress,frame=1+seconds*30,u=clamp((frame-150)/30),orbit=2*Math.PI*u*u*(3-2*u);
        assert.ok(Math.abs(s.seconds-seconds)<1e-8&&Math.abs(s.orbit-orbit)<1e-8);
        assert.deepEqual(s.rig.camera,s.camera);assert.deepEqual(s.rig.position,s.position);
        assert.equal(s.rig.rotation,s.rotation);assert.equal(s.rig.orbit,s.orbit);
        assert.equal(s.rig.spin,seconds*.5);assert.deepEqual(s.rig.scale,[s.scale,s.scale,s.scale]);
        assert.equal(s.rig.dots,640);assert.ok(s.scale>=.85&&s.scale<=1.001);
        const [left,top,right,bottom]=s.rig.bounds;
        assert.ok([left,top,right,bottom,...s.rig.camera].every(Number.isFinite));
        assert.ok(left>=-1&&top>=-1&&right<=observed.width+1&&bottom<=observed.height+1,'Orbit card escapes its native board');
      } else assert.ok(Math.abs(s.rotation-(progress===1?-Math.PI/2:-Math.PI/2+2*Math.PI*progress))<1e-8);
    }
    return {style:c.style,clock:s.clock,painted:observed.painted,stats:observed.stats};
  }
  async function inspectValueLanes(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .data-board').evaluate(board=>({
      state:JSON.parse(board.dataset.laneState),period:board.querySelector('[data-data-period]').textContent,
      rows:[...board.querySelectorAll('[data-value-lane]')].map(row=>{
        const marker=row.querySelector('[data-lane-marker]'),m=marker.transform.baseVal.consolidate().matrix;
        return {label:row.querySelector('[data-lane-label]').textContent,value:row.querySelector('[data-lane-value]').textContent,
          x:m.e,y:m.f,font:getComputedStyle(row.querySelector('text')).fontFamily};})}));
    const c=spec.content,starts=spec.cues.map(cue=>Math.ceil((cues[cue].start+.4)*30)/30);
    const t=Math.floor(time*30+1e-7)/30,index=starts.reduce((last,at,i)=>t>=at?i:last,-1);
    const s=observed.state,maximum=Math.max(0,...c.series.flatMap(row=>row.values));
    const order=c.series.map((row,i)=>i).sort((a,b)=>c.series[b].values[0]-c.series[a].values[0]||a-b);
    assert.equal(s.index,index);assert.equal(observed.period,c.categories[Math.max(0,index)]);
    assert.equal(observed.rows.length,c.series.length);assert.ok(s.span>0&&s.pitch>=50);
    observed.rows.forEach((row,i)=>{
      const values=c.series[i].values,value=values[Math.max(0,index)];
      const distance=starts.reduce((sum,start,j)=>sum+(maximum?300*values[j]/maximum*s.span/532:0)*
        Math.max(0,Math.min(t,starts[j+1]??t)-start),0);
      const phase=distance%(2*s.span),position=Math.min(phase,2*s.span-phase);
      assert.equal(row.label,c.series[i].label);assert.equal(row.value,String(value));assert.ok(row.font.includes('BrandSans'));
      assert.equal(s.values[i],value);assert.ok(Math.abs(s.distance[i]-distance)<1e-7);
      assert.ok(Math.abs(row.x-s.left-s.diameter/2-position)<.002);
      assert.ok(Math.abs(row.y-(58+order.indexOf(i)*s.pitch+s.pitch/2))<.002);
      assert.ok(position>=0&&position<=s.span);if(value===0)assert.equal(s.speeds[i],0);
    });
    return {index,positions:s.positions,values:s.values};
  }
  async function inspectEditor(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .interface-editor').evaluate(board=>{
      const rect=n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];};
      return {variant:board.dataset.editorVariant,active:+board.dataset.interfaceActive,box:rect(board),
        rows:[...board.children].map(row=>{
          const path=row.querySelector('.vector-rig > path'),mock=row.querySelector('.pinned-mock'),copy=row.querySelector('.pinned-copy');
          return {visible:getComputedStyle(row).visibility==='visible',p:+row.dataset.interfaceProgress,
            label:row.querySelector('.interface-label').textContent,body:row.querySelector('.interface-body').textContent,
            text:[...row.querySelectorAll('[data-fit]')].map(n=>({box:rect(n),font:getComputedStyle(n).fontFamily,size:parseFloat(getComputedStyle(n).fontSize)})),
            vector:path?{length:path.getTotalLength(),offset:parseFloat(path.style.strokeDashoffset),fill:+path.style.fillOpacity,
              selection:+row.querySelector('.vector-selection').style.opacity,
              nodes:[...row.querySelectorAll('[data-vector-anchor]')].map(n=>+n.style.opacity),
              tool:row.querySelector('.vector-tool[data-active="true"]').getAttribute('aria-label')}:null,
            sticky:mock?{box:rect(mock),opacity:+mock.style.opacity,layout:+mock.dataset.layout,copy:+copy.style.opacity,
              transform:Array.from(new DOMMatrix(getComputedStyle(copy).transform).toFloat64Array())}:null};
        })};
    });
    const clamp=x=>Math.max(0,Math.min(1,x)),cubic=x=>1-(1-clamp(x))**3;
    const frame=Math.floor(time*30+1e-7),starts=spec.cues.map(c=>Math.ceil((cues[c].start+.4)*30));
    const active=starts.reduce((a,f,i)=>frame>=f?i:a,-1);
    assert.equal(observed.variant,spec.content.variant);assert.equal(observed.active,active);
    observed.rows.forEach((row,i)=>{
      const item=spec.content.items[i],p=clamp((frame-starts[i])/24);
      assert.equal(row.label,item.label);assert.equal(row.body,item.body);assert.equal(row.p,p);
      assert.ok(row.text.every(n=>(n.font.includes('BrandSans')||n.font.includes('BrandMono'))&&n.size>=24));
      if(row.vector) {
        assert.equal(row.visible,i===active);assert.equal(row.vector.tool,item.tool);
        const t=p*1.2,selection=cubic((t-.82)/.23);
        assert.ok(Math.abs(row.vector.offset-row.vector.length*(1-clamp((t-.1)/.95)))<.001);
        assert.equal(row.vector.selection,selection);assert.equal(row.vector.fill,.08*selection);
        [.25,.48,.7,.9,1.05].forEach((at,n)=>assert.equal(row.vector.nodes[n],cubic((t-at+.16)/.16)));
      } else {
        const next=starts[i+1],out=next===undefined?0:clamp((frame-next)/24*.38/.28)**3;
        assert.equal(row.visible,frame>=starts[i]&&out<1);assert.equal(row.sticky.layout,i%3);
        assert.equal(row.sticky.opacity,(i===0?1:cubic(p*.38/.28))*(1-out));
        assert.deepEqual(row.sticky.box,observed.rows[0].sticky.box,'Mock must remain pinned');
        assert.ok(row.sticky.transform.every(Number.isFinite));
        if(next!==undefined&&frame>=next)assert.equal(row.sticky.copy,0);
      }
      if(row.visible&&p===1&&(row.vector||row.sticky.copy===1))for(const text of row.text) {
        const [l,t,r,b]=text.box,[L,T,R,B]=observed.box;
        assert.ok(l>=L-1&&t>=T-1&&r<=R+1&&b<=B+1,'Editor text exceeds composition');
      }
    });
    return {variant:observed.variant,active};
  }
  let characterData=null;
  async function inspectCharacterWalk(spec,time) {
    if(!characterData)characterData=await page.evaluate(()=>window.ShortCreatorCharacterData);
    assert.equal(characterData.source_sha256,'b17f487d93636827be00a53124dca0ddb4d16907c1225670d75cb966f5963b9b');
    const o=await page.locator('.scene[aria-hidden="false"] .character-walk-board').evaluate(board=>{
      const rect=n=>{const b=n.getBoundingClientRect();return [b.left,b.top,b.right,b.bottom];};
      const node=n=>{const c=getComputedStyle(n),m=new DOMMatrix(c.transform);return {text:n.textContent,box:rect(n),alpha:+c.opacity,
        font:c.fontFamily,size:parseFloat(c.fontSize),matrix:[m.a,m.b,m.c,m.d,m.e,m.f]};};
      const pick=q=>node(board.querySelector(q));
      return {state:JSON.parse(board.dataset.characterState),box:rect(board),card:pick('.character-walk-card'),
        title:pick('.character-walk-title'),body:pick('.character-walk-body'),label:pick('.character-walk-label'),rule:pick('.character-walk-rule'),
        layers:[...board.querySelectorAll('[data-character-layer]')].map(n=>{const m=n.transform.baseVal.consolidate().matrix;
          return {id:+n.dataset.characterLayer,opacity:+n.getAttribute('opacity'),box:rect(n),matrix:[m.a,m.b,m.c,m.d,m.e,m.f],
            shapes:[...n.children].map(q=>({type:q.tagName,fill:q.getAttribute('fill'),stroke:q.getAttribute('stroke')}))};}),
        remote:board.querySelectorAll('image,img,script,iframe,video,a,button,input').length};
    });
    const t=presentationTime(spec,time,7.5),frame=Math.min(224,t*30),clamp=p=>Math.max(0,Math.min(1,p)),out=(p,n)=>1-(1-clamp(p))**n;
    const near=(a,b)=>assert.ok(Math.abs(a-b)<.002,`Character ${a} != ${b}`);
    near(o.state.frame,frame);near(o.state.clock.time,t);assert.equal(o.remote,0);
    assert.equal(o.title.text,spec.content.heading);assert.equal(o.body.text,spec.content.action);assert.equal(o.label.text,spec.content.label);
    for(const n of [o.title,o.body,o.label])assert.ok(n.font.includes('BrandSans'));
    assert.deepEqual([o.title.size,o.body.size,o.label.size],[38,28,24]);
    const card=out((t-5.2)/.6,4),title=out((t-5.3)/.5,3),body=out((t-5.4)/.5,3),rp=clamp((t-5.5)/.5);
    near(o.card.alpha,card);near(o.card.matrix[0],.96+.04*card);near(o.card.matrix[4],40*(1-card));
    near(o.title.alpha,title);near(o.title.matrix[5],18*(1-title));near(o.body.alpha,body);near(o.body.matrix[5],18*(1-body));
    near(o.rule.matrix[0],rp===0||rp===1?rp:1-2**(-10*rp));
    const value=p=>{
      if('value' in p)return p.value;
      if(p.x)return [value(p.x),value(p.y)].flat();
      const next=p.keys.findIndex(k=>k[0]>frame);
      if(next===0)return p.keys[0][1];if(next<0)return p.keys.at(-1)[1];
      const [a,u]=p.keys[next-1],[b,v]=p.keys[next];return u.map((n,i)=>n+(v[i]-n)*(frame-a)/(b-a));
    };
    const scalar=p=>[value(p)].flat()[0];
    const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
    assert.deepEqual(o.layers.map(l=>l.id),characterData.layers.filter(l=>l.shapes.length).map(l=>l.id).reverse());
    for(const layer of o.layers) {
      const source=characterData.layers.find(l=>l.id===layer.id),chain=[];let ancestor=source;
      while(ancestor){chain.unshift(ancestor);ancestor=characterData.layers.find(l=>l.id===ancestor.parent);}
      let expected=[1,0,0,1,0,0];
      for(const item of chain) {
        const k=item.transform,p=value(k.p),a=value(k.a),scale=value(k.s),r=scalar(k.r)*Math.PI/180,c=Math.cos(r),sn=Math.sin(r);
        const m=[c*scale[0]/100,sn*scale[0]/100,-sn*scale[1]/100,c*scale[1]/100,p[0],p[1]];
        m[4]-=m[0]*a[0]+m[2]*a[1];m[5]-=m[1]*a[0]+m[3]*a[1];expected=mul(expected,m);
      }
      layer.matrix.forEach((n,i)=>near(n,expected[i]));near(layer.opacity,scalar(source.transform.o)/100);
      assert.equal(layer.shapes.length,source.shapes.length);
      assert.ok(layer.shapes.every(n=>['rect','ellipse'].includes(n.type)&&['var(--lime)','var(--cyan)','var(--purple)'].includes(n.fill)));
      if(o.state.clock.settle===1) {
        const [l,top,r,b]=layer.box,[L,T,R,B]=o.box;
        assert.ok(l>=L-1&&top>=T-1&&r<=R+1&&b<=B+1,'Settled character exceeds its board');
        assert.ok(r<=o.card.box[0]+1||b<=o.card.box[1]+1||top>=o.card.box[3]-1,'Character overlaps its explanation');
      }
    }
    if(o.state.clock.settle===1) {
      const [L,T,R,B]=o.card.box;
      for(const n of [o.title,o.body]){const [l,t,r,b]=n.box;assert.ok(l>=L&&t>=T&&r<=R&&b<=B,'Character copy exceeds card');}
      assert.ok(o.title.box[3]<o.body.box[1]);assert.ok(B<o.label.box[1]);
    }
    return {frame,layers:o.layers.length,shapes:o.layers.reduce((n,l)=>n+l.shapes.length,0),settled:o.state.clock.settle===1};
  }
  async function inspectAppInstall(spec,time) {
    const o=await page.locator('.scene[aria-hidden="false"] .app-install-board').evaluate(board=>{
      const rect=n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];};
      const node=n=>{const c=getComputedStyle(n),m=new DOMMatrix(c.transform);return {text:n.textContent,alpha:+c.opacity,
        matrix:[m.a,m.b,m.c,m.d,m.e,m.f],box:rect(n),font:c.fontFamily,size:parseFloat(c.fontSize),
        width:n.clientWidth,height:n.clientHeight,overflow:n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2};};
      const pick=q=>node(board.querySelector(q)),list=board.querySelector('.app-install-list'),viewport=board.querySelector('.app-install-window');
      const payload=JSON.parse(document.getElementById('production-scene-data').textContent);
      return {state:JSON.parse(board.dataset.appInstall),box:rect(board),phone:pick('.app-install-phone'),detail:pick('.app-install-detail'),
        card:pick('.app-install-card'),heading:node(board.parentElement.querySelector('.prod-heading')),source:board.parentElement.querySelector('.interface-source').textContent,
        query:pick('.app-install-search'),storeTitle:pick('.app-install-store-title'),title:pick('.app-install-detail-title'),description:pick('.app-install-description'),
        button:pick('.app-install-button'),install:pick('.app-install-install-label'),open:pick('.app-install-open-label'),ready:pick('.app-install-ready'),
        panel:pick('.app-install-progress'),percent:board.querySelector('.app-install-percent').textContent,wipe:pick('.app-install-wipe'),
        list:node(list),viewport:node(viewport),contentHeight:list.scrollHeight,icons:payload.icons,
        rows:[...list.children].map(n=>({node:node(n),offset:n.offsetTop,height:n.offsetHeight,icon:n.querySelector('img').getAttribute('src'),
          label:node(n.querySelector('h4')),body:node(n.querySelector('p')),get:node(n.querySelector('.app-install-get'))})),
        facts:[...board.querySelectorAll('.app-install-fact')].map(n=>({node:node(n),label:node(n.children[0]),value:node(n.children[1])})),
        rings:[...board.querySelectorAll('.app-install-ring-progress')].map(n=>({length:n.getTotalLength(),dash:+n.getAttribute('stroke-dashoffset'),array:+n.getAttribute('stroke-dasharray')})),
        ring:pick('.app-install-ring'),detailIcon:board.querySelector('.app-install-detail-icon').getAttribute('src'),
        activeControls:board.querySelectorAll('a,button,input,iframe,script,audio,video,[onclick]').length,
        tap:pick('.app-install-tap'),tapCenter:(()=>{const tap=board.querySelector('.app-install-tap');return [tap.offsetLeft+tap.offsetWidth/2,tap.offsetTop+tap.offsetHeight/2];})(),
        getCenters:[...list.querySelectorAll('.app-install-get')].map(n=>[n.offsetLeft+n.offsetWidth/2,n.offsetTop+n.offsetHeight/2])};
    });
    const c=spec.content,t=presentationTime(spec,time,6.28),near=(a,b,e=.002)=>assert.ok(Math.abs(a-b)<e,`App installation ${a} != ${b}`);
    const clamp=p=>Math.max(0,Math.min(1,p)),out=(p,n=4)=>1-(1-clamp(p))**n,back=(p,a)=>{p=clamp(p)-1;return 1+(a+1)*p**3+a*p*p;};
    const span=(a,d,e=p=>out(p))=>e(clamp((t-a)/d)),inOut=p=>p<.5?4*p**3:1-(-2*p+2)**3/2;
    const yoyo=(a,d,e=p=>out(p))=>{const p=(t-a)/d;return p<0||p>=2?0:e(p<=1?p:2-p);};
    near(o.state.clock.time,t);assert.equal(o.activeControls,0);assert.equal(o.rows.length,8);assert.equal(o.facts.length,3);
    assert.equal(o.heading.text,c.heading);assert.equal(o.source,c.source);assert.equal(o.query.text,c.ui.query);assert.equal(o.storeTitle.text,c.ui.title);
    assert.equal(o.title.text,c.items[c.selected].label);assert.equal(o.description.text,c.detail.body);assert.equal(o.install.text,c.ui.get);assert.equal(o.open.text,c.ui.open);assert.equal(o.ready.text,c.ui.ready);
    const selected=o.rows[c.selected],target=Math.max(0,Math.min(o.contentHeight-o.viewport.height,selected.offset-o.viewport.height*.2));
    near(o.state.target,target);near(o.list.matrix[5],-target*span(.62,1.2,p=>out(p,5)));
    const entry=span(0,.47,p=>back(p,1.6)),exit=span(5.44,.48,p=>p**5),rotation=(-2.5*(1-entry)-3.5*exit)*Math.PI/180;
    const scale=(.82+.18*entry+.025*yoyo(4.7,.18,p=>back(p,1.5)))*(1-.22*exit);
    near(o.phone.alpha,clamp(entry));near(o.phone.matrix[0],scale*Math.cos(rotation));near(o.phone.matrix[1],scale*Math.sin(rotation));
    near(o.phone.matrix[5],(760*(1-entry)+1050*exit)*o.state.sourceUnit,.02);
    const detail=span(2.32,.46,p=>out(p,5));near(o.detail.alpha,detail);near(o.detail.matrix[5],620*(1-detail)*o.state.sourceUnit,.02);near(o.detail.matrix[0],.92+.08*detail);
    const card=span(2.34,.42,p=>back(p,1.2));near(o.card.matrix[5],56*(1-card)*o.state.sourceUnit,.02);near(o.card.matrix[0],.96+.04*card);
    const capturedWindow=1+.012*out(2-(1.25-.92)/.18,3);
    near(o.viewport.matrix[0],t<1.25?1+.012*yoyo(.92,.18,p=>out(p,3)):capturedWindow+(1.014-capturedWindow)*yoyo(1.25,.14,p=>out(p,3)));
    const panel=span(2.92,.38),capturedPanel=.96+.04*out((3.18-2.92)/.38);
    const panelScale=t<3.18?.96+.04*panel:capturedPanel+[[3.18,1.025],[3.56,1.03],[3.9,1.035],[4.28,1.04]].reduce((v,[a,b])=>v+(b-capturedPanel)*yoyo(a,.12,a===4.28?p=>back(p,1.7):p=>out(p)),0);
    near(o.panel.alpha,panel);near(o.panel.matrix[0],panelScale);near(o.panel.matrix[5],42*(1-panel)*o.state.sourceUnit,.02);
    near(selected.get.matrix[0],1-.18*span(2.04,.1,p=>p**4)*(1-span(2.14,.14,p=>back(p,2))));
    const large=span(3.02,1.42,inOut),small=span(3.04,1.2,inOut);
    assert.equal(o.percent,Math.round(large*100)+'%');near(o.rings[0].dash,o.rings[0].length*(1-small));near(o.rings[1].dash,o.rings[1].length*(1-large));
    o.rings.forEach(r=>{assert.ok(r.length>0);near(r.array,r.length);});
    near(o.ring.alpha,span(2.96,.16)*(1-span(4.44,.16)));near(o.open.alpha,span(4.56,.16));near(o.ready.alpha,clamp(span(4.62,.34,p=>back(p,1.8))));
    near(o.wipe.alpha,span(5.86,.42,p=>out(p,3)));near(o.tap.alpha,t<2.02?0:.95*(1-span(2.02,.42,p=>out(p,3))));
    o.tapCenter.forEach((v,i)=>near(v,o.getCenters[c.selected][i],1.1));
    for(const [i,row] of o.rows.entries()) {
      assert.equal(row.label.text,c.items[i].label);assert.equal(row.body.text,c.items[i].body);assert.equal(row.get.text,c.ui.get);
      assert.equal(row.icon,o.icons[c.items[i].icon]);assert.ok(row.icon.startsWith('data:image/svg+xml;base64,'));
      const p=span(.48+i*.035,.36);near(row.node.alpha,p);
      const reading=[row.label,row.body,row.get];
      for(const n of reading){assert.ok(n.font.includes('BrandSans'));assert.ok(!n.overflow,'App row copy exceeds its fixed slot');}
      near(row.label.size,14*o.state.unit,.02);near(row.body.size,12*o.state.unit,.02);
    }
    assert.equal(o.detailIcon,o.icons[c.items[c.selected].icon]);
    for(const [i,fact] of o.facts.entries()) {
      assert.equal(fact.label.text,c.detail.facts[i].label);assert.equal(fact.value.text,c.detail.facts[i].value);
      near(fact.node.alpha,span(2.78+i*.05,.3));
      assert.ok(!fact.label.overflow&&!fact.value.overflow,'Supplied app facts exceed their slots');
    }
    for(const n of [o.storeTitle,o.query,o.title,o.description,o.install,o.open,o.ready]){assert.ok(n.font.includes('BrandSans'));assert.ok(!n.overflow,'App detail text exceeds its slot');}
    if(t>=3.4&&t<5.44) {
      const [L,T,R,B]=o.card.box;
      for(const n of [o.title,o.description,o.button,o.panel,o.ready]) {
        const [l,top,r,b]=n.box;assert.ok(l>=L-1&&top>=T-1&&r<=R+1&&b<=B+1,'Readable app detail exceeds the card');
      }
      assert.ok(o.heading.box[2]<o.phone.box[0],'Main heading overlaps the phone');
    }
    if(t>=1.82&&t<2.32) {
      const [L,T,R,B]=o.viewport.box;
      for(const n of [selected.label,selected.body,selected.get]){const [l,top,r,b]=n.box;assert.ok(l>=L-1&&r<=R+1&&top>=T-1&&b<=B+1,'Selected app copy is outside the scroll window');}
    }
    if(o.state.clock.settle===1){near(o.wipe.alpha,1);near(o.state.phone.y,1050);assert.equal(o.percent,'100%');}
    return {selected:c.selected,sourceTime:t,illustratedPercent:Math.round(large*100),settled:o.state.clock.settle===1};
  }
  async function inspectProductCanvas(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .product-canvas-board').evaluate(board=>{
      const node=n=>{const css=getComputedStyle(n),b=n.getBoundingClientRect(),m=new DOMMatrix(css.transform);
        return {text:n.textContent,alpha:+css.opacity,font:css.fontFamily,matrix:[m.a,m.b,m.c,m.d,m.e,m.f],box:[b.left,b.top,b.right,b.bottom]};};
      const pick=selector=>node(board.querySelector(selector));
      return {state:JSON.parse(board.dataset.productCanvas),geometry:JSON.parse(board.dataset.productGeometry),board:node(board),
        frame:pick('.product-canvas-frame'),hero:pick('.product-canvas-hero'),title:pick('.product-canvas-title'),
        body:pick('.product-canvas-body'),action:pick('.product-canvas-action'),selection:pick('.product-canvas-selection'),
        comment:pick('.product-canvas-comment'),bubble:pick('.product-canvas-bubble'),pin:pick('.product-canvas-pin'),check:pick('.product-canvas-pin svg'),
        panel:pick('.product-canvas-assets'),dragged:pick('.product-canvas-dragged'),
        labels:[...board.querySelectorAll('.product-canvas-dimension')].map(n=>n.textContent),
        cards:[...board.querySelectorAll('.product-canvas-frame>.product-canvas-card')].map(n=>({card:node(n),label:node(n.querySelector('h3')),body:node(n.querySelector('p'))})),
        actors:[...board.querySelectorAll('.product-canvas-cursor')].map(n=>({node:node(n),name:n.querySelector('span').textContent})),
        assets:[...board.querySelectorAll('.product-canvas-asset')].map(n=>n.textContent),
        controls:board.querySelectorAll('button,input,form,a,textarea').length};
    });
    const s=observed.state,g=observed.geometry,t=presentationTime(spec,time,11.9),c=spec.content;
    const near=(a,b)=>assert.ok(Math.abs(a-b)<.002,`Product canvas ${a} != ${b}`);
    near(s.t,t);assert.equal(observed.controls,0);assert.equal(observed.title.text,c.hero.title);assert.equal(observed.body.text,c.hero.body);assert.equal(observed.action.text,c.hero.action);
    assert.deepEqual(observed.actors.map(n=>n.name),c.actors);assert.deepEqual(observed.assets,c.items.map(n=>n.label));
    assert.deepEqual(observed.labels,[String(Math.round(g.frame.w)),String(Math.round(g.frame.h))]);
    const letters=Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(c.comment.text),part=>part.segment);
    const typed=Math.min(letters.length,Math.max(0,Math.ceil((t-7.1)*30-1e-9)));
    assert.equal(s.typed,typed);assert.equal(observed.bubble.text,letters.slice(0,typed).join(''));
    near(observed.frame.alpha,s.frame);near(observed.frame.matrix[0],s.scale);near(observed.hero.matrix[0],s.heroScale);
    near(observed.hero.matrix[5],(g.hero.endY-g.hero.y)*s.reflow);near(observed.panel.matrix[4],-g.panel.w*(1-s.panel));
    near(observed.selection.alpha,s.selection);near(observed.comment.alpha,s.comment);near(observed.bubble.alpha,s.bubble);near(observed.check.matrix[0],s.check);
    near(observed.dragged.alpha,s.dragged);
    for(const [i,name] of ['designer','engineer','reviewer'].entries()) {
      near(observed.actors[i].node.matrix[4],s.cursors[name].x);near(observed.actors[i].node.matrix[5],s.cursors[name].y);
    }
    observed.cards.forEach((row,i)=>{
      assert.equal(row.label.text,c.items[i].label);assert.equal(row.body.text,c.items[i].body);
      near(row.card.alpha,s.cards[i].alpha);near(row.card.matrix[5],s.cards[i].y);
      assert.ok(row.label.font.includes('BrandSans')&&row.body.font.includes('BrandSans'));
    });
    if(!c.comment.resolved)assert.equal(s.check,0);
    if(s.clock.settle===1) {
      assert.equal(observed.panel.matrix[4],-g.panel.w);assert.equal(observed.dragged.alpha,0);assert.equal(observed.bubble.text,c.comment.text);
      assert.equal(s.check,c.comment.resolved?1:0);
      for(const row of observed.cards)for(const copy of [row.label,row.body]) {
        const [l,top,r,b]=copy.box,[L,T,R,B]=row.card.box;
        assert.ok(l>=L-1&&top>=T-1&&r<=R+1&&b<=B+1,'Product card copy exceeds its native slot');
      }
    }
    return observed;
  }
  async function inspectPromoTitle(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .promo-type-board').evaluate(board=>{
      const part=n=>{const css=getComputedStyle(n),b=n.getBoundingClientRect(),m=new DOMMatrix(css.transform);
        return {text:n.textContent,alpha:+css.opacity,font:css.fontFamily,matrix:[m.a,m.b,m.c,m.d,m.e,m.f],box:[b.left,b.top,b.right,b.bottom]};};
      return {state:JSON.parse(board.dataset.promoTypeState),board:part(board),copy:part(board.querySelector('.promo-type-copy')),
        kicker:part(board.querySelector('.prod-kicker')),title:part(board.querySelector('.prod-title')),
        subtitle:part(board.querySelector('.prod-subtitle')),rule:part(board.querySelector('.promo-type-rule')),
        circle:part(board.querySelector('.promo-type-circle')),square:part(board.querySelector('.promo-type-square')),
        words:[...board.querySelectorAll('.promo-grid-word')].map(part)};
    });
    const frame=Math.floor(time*30+1e-7),start=Math.ceil((cues[spec.cues[0]].start+.4)*30);
    const p=Math.max(0,Math.min(1,(frame-start)/24)),s=observed.state;
    assert.equal(s.p,p);assert.equal(observed.title.text,spec.content.title);
    assert.equal(observed.kicker.text,spec.content.kicker);assert.equal(observed.subtitle.text,spec.content.subtitle);
    assert.ok(observed.title.font.includes('BrandSans'));assert.ok(observed.kicker.font.includes('BrandMono'));
    for(const name of ['kicker','title','subtitle'])assert.ok(Math.abs(observed[name].alpha-s[name])<.00001);
    const near=(a,b)=>assert.ok(Math.abs(a-b)<.002,`Promotional title property differs: ${a} / ${b}`);
    near(observed.title.matrix[0],s.titleScale);near(observed.title.matrix[5],s.titleY);
    near(observed.kicker.matrix[5],s.kickerY);near(observed.subtitle.matrix[4],s.subtitleX);near(observed.subtitle.matrix[5],s.subtitleY);
    near(observed.rule.matrix[0],s.rule);near(observed.circle.alpha,s.circle);near(observed.square.alpha,s.square);
    for(const name of ['copy','kicker','title','subtitle','rule','circle','square'])assert.ok(observed[name].matrix.every(Number.isFinite));
    if(p===1) {
      for(const name of ['kicker','title','subtitle']) {
        assert.equal(observed[name].alpha,1);const [l,t,r,b]=observed[name].box,[L,T,R,B]=observed.board.box;
        assert.ok(l>=L-1&&t>=T-1&&r<=R+1&&b<=B+1,'Promotional copy exceeds the native board');
      }
      assert.ok(observed.words.every(word=>word.alpha===1));near(observed.title.matrix[0],1);
      near(observed.copy.matrix[4],0);
    }
    return observed;
  }
  async function inspectKineticPreset(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .kinetic-preset').evaluate(slot=>{
      const box=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
      const original=[...slot.querySelectorAll(':scope > .kinetic-native-word,.kinetic-camera-word,.promo-glyph-word')];
      const visible=n=>getComputedStyle(n).visibility==='visible'&&+getComputedStyle(n).opacity>0;
      const state=JSON.parse(slot.dataset.kineticPresentation),plane=slot.querySelector('.kinetic-marquee-plane'),reel=slot.querySelector('.kinetic-ticker-reel');
      return {state,width:slot.clientWidth,box:box(slot),overflow:getComputedStyle(slot).overflow,contain:getComputedStyle(slot).contain,
        original:original.map(n=>({text:n.textContent,font:getComputedStyle(n).fontFamily,visible:visible(n),box:box(n)})),
        finite:[...slot.querySelectorAll('*')].every(n=>{const css=getComputedStyle(n),matrix=new DOMMatrix(css.transform);return Number.isFinite(+css.opacity)&&Array.from(matrix.toFloat64Array()).every(Number.isFinite);}),
        marquee:plane?{perspective:getComputedStyle(plane).perspective,transform:getComputedStyle(plane).transform,
          x:new DOMMatrix(getComputedStyle(plane.firstChild).transform).m41,
          centers:[...plane.querySelectorAll('.kinetic-marquee-pill')].slice(0,original.length).map(n=>n.offsetLeft+n.offsetWidth/2),
          pills:[...plane.querySelectorAll('.kinetic-marquee-pill')].map(n=>({text:n.textContent,active:n.dataset.active,box:box(n),font:getComputedStyle(n).fontFamily}))}:null,
        ticker:reel?{words:[...reel.children].map(n=>n.textContent),y:new DOMMatrix(getComputedStyle(reel).transform).m42,
          alpha:+getComputedStyle(reel.parentNode).opacity,flash:+getComputedStyle(slot.querySelector('.kinetic-ticker-flash')).opacity}:null,
        camera:slot.querySelector('.kinetic-camera-world')?{
          matrix:Array.from(new DOMMatrix(getComputedStyle(slot.querySelector('.kinetic-camera-world')).transform).toFloat64Array()),
          filters:original.map(n=>getComputedStyle(n).filter)}:null,
        glyphs:[...slot.querySelectorAll('.promo-glyph-item')].map(n=>({alpha:+getComputedStyle(n).opacity,
          matrix:Array.from(new DOMMatrix(getComputedStyle(n.querySelector('.promo-glyph-inner')).transform).toFloat64Array()),
          lines:[...n.querySelectorAll('.promo-glyph-line')].map(line=>new DOMMatrix(getComputedStyle(line).transform).a)})),
        ghosts:[...slot.querySelectorAll('.kinetic-shutter-ghosts .kinetic-word')].map(n=>({text:n.textContent,visible:visible(n),alpha:+getComputedStyle(n).opacity,font:getComputedStyle(n).fontFamily}))};
    });
    const frame=Math.floor(time*30+1e-7),starts=spec.cues.map(c=>Math.ceil((cues[c].start+.4)*30));
    const active=starts.reduce((last,start,i)=>frame>=start?i:last,-1),p=active<0?0:Math.max(0,Math.min(1,(frame-starts[active])/24));
    assert.equal(observed.state.style,spec.content.style);assert.equal(observed.state.active,active);assert.equal(observed.state.p,p);
    assert.deepEqual(observed.original.map(n=>n.text),spec.content.words);assert.ok(observed.original.every(n=>n.font.includes('BrandSans')));
    assert.ok(observed.finite);assert.equal(observed.overflow,'hidden');assert.ok(observed.contain.includes('paint'));
    const contains=box=>box.left>=observed.box.left-1&&box.right<=observed.box.right+1&&box.top>=observed.box.top-1&&box.bottom<=observed.box.bottom+1;
    if(observed.glyphs.length) {
      assert.equal(observed.glyphs.length,3);
      observed.glyphs.forEach((glyph,i)=>{
        const q=Math.max(0,Math.min(1,(frame-starts[i])/24)),t=q*(i===0?2:i===1?1:1.1);
        assert.ok(Math.abs(glyph.alpha-(1-(1-Math.min(1,t/.6))**2))<.00001);
        assert.equal(observed.original[i].visible,glyph.alpha>0);
        if(q===1) {
          assert.ok(contains(observed.original[i].box),'Glyph label exceeds the native board');
          if(i===0){assert.ok(Math.abs(glyph.matrix[0]+Math.SQRT1_2)<.00001);assert.ok(Math.abs(glyph.matrix[1]+Math.SQRT1_2)<.00001);}
          if(i===1)assert.equal(glyph.matrix[0],1);
          if(i===2)assert.deepEqual(glyph.lines,[1,1,1]);
        }
      });
    } else if(observed.marquee) {
      const m=observed.marquee;assert.equal(m.perspective,'900px');assert.deepEqual(m.pills.map(n=>n.text),[...spec.content.words,...spec.content.words]);
      assert.ok(m.pills.every(n=>n.font.includes('BrandSans')));
      const previous=m.centers[Math.max(0,active-1)],expected=observed.width/2-previous-(active>=0?m.centers[active]-previous:0)*p;
      assert.ok(Math.abs(m.x-expected)<.001,'Marquee must follow measured source pill centers');
      if(active>=0&&p===1){assert.ok(contains(m.pills[active].box),'Current marquee word must be fully readable');assert.equal(m.pills[active].active,'true');}
    } else if(observed.ticker) {
      const ticker=observed.ticker;assert.deepEqual(ticker.words,spec.content.words);
      assert.ok(Math.abs(ticker.y+observed.state.position*observed.state.pitch)<.001);
      if(p===1){assert.equal(ticker.alpha,0);assert.equal(ticker.flash,0);assert.equal(observed.state.heroScale,1);}
    } else if(observed.camera) {
      const matrix=observed.camera.matrix,s=observed.state;
      assert.ok(Math.abs(matrix[0]-s.camera.scale)<.001&&Math.abs(matrix[12]-s.camera.x)<.001&&Math.abs(matrix[13]-s.camera.y)<.001);
      if(p===1) {
        assert.deepEqual(observed.original.flatMap((n,i)=>n.visible?[i]:[]),Array.from({length:active+1},(_,i)=>i));
        assert.ok(observed.original.slice(0,active+1).every(n=>contains(n.box)),'Settled camera words must all remain inside the frame');
        assert.ok(s.blur.every(v=>v===0));assert.ok(observed.camera.filters.every(v=>v==='none'));
      }
    } else {
      const moving=active>=0&&p>0&&p<1;assert.equal(observed.ghosts.length,17);
      observed.ghosts.forEach(n=>{assert.equal(n.text,active<0?'':spec.content.words[active]);assert.equal(n.visible,moving);assert.equal(n.alpha,1/16);assert.ok(n.font.includes('BrandSans'));});
      if(p===1)assert.deepEqual(observed.state.pose,{x:0,y:0,scale:1,rx:0,ry:0,rz:0});
    }
    if(!observed.marquee&&!observed.camera&&!observed.glyphs.length&&p===1){assert.deepEqual(observed.original.flatMap((n,i)=>n.visible?[i]:[]),[active]);assert.ok(contains(observed.original[active].box),'Settled kinetic copy exceeds frame');}
    return observed;
  }
  async function inspectPrimitives(spec,time) {
    const frame=Math.floor(time*30+1e-7),clamp=x=>Math.max(0,Math.min(1,x));
    const progress=spec.cues.map(c=>clamp((frame-Math.ceil((cues[c].start+.4)*30))/24));
    const observed=await page.locator('.scene[aria-hidden="false"]').evaluate(node=>{
      const finite=n=>{const s=getComputedStyle(n),m=new DOMMatrix(s.transform);return Number.isFinite(+s.opacity)&&Array.from(m.toFloat64Array()).every(Number.isFinite);};
      const board=node.querySelector('.interface-primitives'),diagram=node.querySelector('[data-path-style]');
      const box=n=>{const b=n.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};};
      return {finite:[...node.querySelectorAll('.interface-primitives *,.resource-check-mark *,.resource-diagram-links *')].every(finite),
        controls:node.querySelectorAll('.interface-primitives input,.interface-primitives button,.interface-primitives a,.interface-primitives form').length,
        presentation:board?JSON.parse(board.dataset.interfacePresentation):null,
        rows:board?[...board.querySelectorAll('.interface-row')].map(row=>({
          p:+row.dataset.interfaceProgress,visible:getComputedStyle(row).visibility==='visible',label:row.querySelector('.interface-label').textContent,body:row.querySelector('.interface-body').textContent,
          badge:row.querySelector('.primitive-badge')?.textContent,checked:row.dataset.checked,
          check:row.querySelector('.primitive-check path')?+row.querySelector('.primitive-check path').getAttribute('stroke-dashoffset'):null,
          stat:row.querySelector('.primitive-stat')?[row.querySelector('.primitive-stat-value').textContent,row.querySelector('.primitive-stat-label').textContent]:null,
          box:box(row),text:[...row.querySelectorAll('[data-fit]')].map(box)})):[],
        statuses:[...node.querySelectorAll('[data-status-presentation]')].map(row=>({state:JSON.parse(row.dataset.statusPresentation),checked:row.dataset.checked,alpha:+getComputedStyle(row.querySelector('path')).opacity,dash:+row.querySelector('path').getAttribute('stroke-dashoffset'),d:row.querySelector('path').getAttribute('d')})),
        avatars:[...node.querySelectorAll('.evidence-avatar-lift .evidence-mark')].map(n=>({text:n.textContent,initials:n.dataset.initials,y:parseFloat(n.style.getPropertyValue('--avatar-y'))})),
        paths:diagram?{state:JSON.parse(diagram.dataset.pathPresentation),lengths:[...diagram.querySelectorAll('path')].map(n=>n.getTotalLength()),
          movers:[...diagram.querySelectorAll('polygon,circle')].map(n=>+getComputedStyle(n).opacity),beams:[...diagram.querySelectorAll('path')].filter(n=>n.getAttribute('stroke-width')==='7').map(n=>+getComputedStyle(n).opacity)}:null};
    });
    assert.ok(observed.finite,'UI/path transform must be finite');assert.equal(observed.controls,0,'Illustrated UI cannot create live controls');
    if(observed.presentation) {
      const variant=spec.content.variant,stacked=['signup-flow','beat-sequence'].includes(variant);
      const active=spec.cues.reduce((last,c,i)=>frame>=Math.ceil((cues[c].start+.4)*30)?i:last,-1);
      assert.equal(observed.presentation.active,active);assert.equal(observed.presentation.variant,variant);
      observed.rows.forEach((row,i)=>{
        const item=spec.content.items[i],p=progress[i];assert.equal(row.p,p);
        assert.equal(row.visible,p>0&&(stacked||i===active));assert.equal(row.label,item.label);assert.equal(row.body,item.body);
        if(variant==='micro-badge')assert.equal(row.badge,item.badge);
        if(variant==='micro-check') {
          assert.equal(row.checked,String(item.checked));const q=1-(1-clamp(p*.9/.5))**4;
          assert.ok(Math.abs(row.check-42*(1-(item.checked?q:0)))<1e-6);
        }
        if(variant==='profile-count')assert.deepEqual(row.stat,[item.stat.value,item.stat.label]);
        if(row.visible)for(const [j,b] of row.text.entries()) {
          assert.ok(b.left>=row.box.left-1&&b.right<=row.box.right+1&&b.top>=row.box.top-1&&b.bottom<=row.box.bottom+1,'Primitive copy exceeds card');
          for(const other of row.text.slice(j+1))assert.ok(!(b.left<other.right&&b.right>other.left&&b.top<other.bottom&&b.bottom>other.top),'Primitive text overlaps');
        }
      });
    }
    observed.statuses.forEach((row,i)=>{
      const checked=spec.content.items[i].checked;assert.equal(row.checked,String(checked));
      if(!checked){assert.equal(row.alpha,0);assert.equal(row.dash,100);}
      if(progress[i]===1){assert.equal(row.alpha,checked?1:0);assert.equal(row.dash,checked?0:100);assert.equal(row.state.scale,1);assert.equal(row.state.blur,0);}
      if(spec.content.style==='icon-morph'&&checked&&progress[i]===1)assert.equal(row.d,'M 16 50 L 20 46 L 24 42 L 34 52 L 44 62 L 52 54 L 60 46 L 68 38 L 76 30 L 80 34 L 84 38 L 74 48 L 64 58 L 54 68 L 44 78 L 34 68 Z');
    });
    observed.avatars.forEach((mark,i)=>{assert.equal(mark.text,spec.content.marks[i]);assert.ok(mark.y>=-20&&mark.y<=0);if(progress[i]===0||progress[i]===1)assert.equal(Math.abs(mark.y),0);});
    if(observed.paths){assert.equal(observed.paths.state.style,spec.content.style);assert.equal(observed.paths.state.links.length,spec.content.steps.length-1);assert.ok(observed.paths.lengths.every(n=>Number.isFinite(n)&&n>0));if(progress.at(-1)===1)assert.ok([...observed.paths.movers,...observed.paths.beams].every(n=>n===0));}
    return observed;
  }
  async function inspectCloneWall(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .screen-view').evaluate(view=>({
      state:JSON.parse(view.dataset.cloneWall),index:+view.dataset.swapIndex,p:+view.dataset.swapProgress,
      size:[view.clientWidth,view.clientHeight],display:getComputedStyle(view.querySelector('.clone-wall-overlay')).display,
      shown:[...view.querySelectorAll('.screen-swap-image')].flatMap((n,i)=>getComputedStyle(n).visibility==='visible'?[i]:[]),
      images:[...view.querySelectorAll('.screen-swap-image')].map(n=>n.getAttribute('src')),
      words:[...view.querySelectorAll('.clone-wall-word')].map(n=>({text:n.textContent,font:getComputedStyle(n).fontFamily})),
      copies:[...view.querySelectorAll('.clone-wall-image')].map(n=>({src:n.getAttribute('src'),fit:getComputedStyle(n).objectFit,ready:n.complete&&n.naturalWidth>=32})),
      card:(()=>{const n=view.querySelector('.clone-wall-card');return {x:parseFloat(n.style.left),y:parseFloat(n.style.top),w:parseFloat(n.style.width),h:parseFloat(n.style.height),alpha:+n.style.opacity,scale:new DOMMatrix(n.style.transform).a};})(),
      wall:+view.querySelector('.clone-wall').style.opacity,clip:view.querySelector('.clone-wall-inverted').style.clipPath
    }));
    const frame=Math.floor(time*30+1e-7),starts=spec.cues.map(c=>Math.ceil((cues[c].start+.4)*30));
    const active=starts.reduce((last,start,i)=>frame>=start?i:last,0),p=Math.max(0,Math.min(1,(frame-starts[active])/24)),t=p*2.4;
    assert.equal(observed.index,active);assert.equal(observed.p,p);assert.equal(observed.state.word,spec.content.word);
    assert.equal(observed.words.length,2*observed.state.rows*observed.state.columns);assert.ok(observed.words.length<=2000);
    assert.ok(observed.words.every(n=>n.text===spec.content.word&&n.font.includes('BrandSans')));
    assert.deepEqual(observed.images,spec.content.images.map(id=>configuration.assets[id]));
    assert.deepEqual(observed.copies.map(n=>n.src),observed.images.slice(0,-1));assert.ok(observed.copies.every(n=>n.ready&&n.fit==='contain'));
    assert.deepEqual(observed.shown,[active===0?0:t>=1.75?active:active-1]);
    assert.equal(observed.display,active>0&&p>0&&p<1&&t<2.36?'block':'none');
    const [w,h]=observed.size,s=observed.state;
    for(const [key,expected] of [['x',s.x*w],['y',s.y*h],['w',s.width*w],['h',s.height*h],['scale',s.scale],['alpha',s.cardAlpha]])
      assert.ok(Math.abs(observed.card[key]-expected)<.001);
    assert.ok(s.x>=0&&s.y>=0&&s.x+s.width<=1+1e-10&&s.y+s.height<=1+1e-10);
    assert.equal(observed.wall,s.wallAlpha);assert.ok(observed.clip.startsWith('inset('));
    if(active>0&&t>=1.75&&t<1.9){assert.equal(observed.wall,1);assert.equal(observed.card.alpha,0);}
    return observed;
  }
  async function inspectPaper(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .screen-view').evaluate(view=>({
      kind:view.dataset.paperSwap,index:+view.dataset.swapIndex,p:+view.dataset.swapProgress,
      displayed:getComputedStyle(view.querySelector('.paper-swap-overlay')).display!=='none',
      visible:[...view.querySelectorAll('.screen-swap-image')].flatMap((n,i)=>getComputedStyle(n).visibility==='visible'?[i]:[]),
      images:[...view.querySelectorAll('.screen-swap-image')].map(n=>n.getAttribute('src')),
      copies:[...view.querySelectorAll('.paper-swap-copy')].map(n=>({src:n.getAttribute('src'),fit:getComputedStyle(n).objectFit,decoded:n.complete&&n.naturalWidth>=32})),
      solid:view.querySelector('.paper-swap-solid')?+getComputedStyle(view.querySelector('.paper-swap-solid')).opacity:null,
      paths:[...view.querySelectorAll('.paper-swap-overlay path')].map(n=>({length:n.getTotalLength(),offset:+getComputedStyle(n).strokeDashoffset})),
      layers:[...view.querySelectorAll('.paper-swap-layer')].map(n=>({transform:getComputedStyle(n).transform,
        clips:[...n.querySelectorAll('.paper-swap-scrap,.paper-swap-sheet,.paper-swap-rim')].map(p=>getComputedStyle(p).clipPath)}))
    }));
    const frame=Math.floor(time*30+1e-7),onsets=spec.cues.map(c=>Math.ceil((cues[c].start+.4)*30));
    const active=onsets.reduce((a,f,i)=>frame>=f?i:a,0),p=Math.max(0,Math.min(1,(frame-onsets[active])/24));
    assert.equal(observed.kind,spec.content.swap);assert.equal(observed.index,active);assert.equal(observed.p,p);
    assert.equal(observed.displayed,active>0&&p>0&&p<1);
    assert.deepEqual(observed.images,spec.content.images.map(id=>configuration.assets[id]));
    const shown=active===0?0:observed.kind==='scribble'?(p<.5?active-1:active):p===0?active-1:active;
    assert.deepEqual(observed.visible,[shown]);
    assert.ok(observed.copies.every(c=>c.fit==='contain'&&c.decoded&&observed.images.includes(c.src)));
    if(observed.kind==='scribble') {
      assert.equal(observed.paths.length,7);
      observed.paths.forEach((path,i)=>{
        const t=p*2.2,clamp=x=>Math.max(0,Math.min(1,x)),draw=clamp((t-i*.04)/.55)**3,clear=1-(1-clamp((t-1.42-i*.035)/.5))**3;
        assert.ok(Math.abs(path.offset/path.length-(i%2?-1:1)*(1-draw-clear))<1e-5);
      });
      if(active>0&&p===.5)assert.equal(observed.solid,1,'Scribble must fully cover the image cut');
    } else {
      assert.equal(observed.layers.length,spec.content.images.length-1);
      const count=observed.kind==='paper-rip'?2:6;
      assert.ok(observed.layers.every(l=>!l.transform.includes('NaN')&&l.clips.length===count&&l.clips.every(c=>c.startsWith('polygon('))));
    }
    return observed;
  }
  async function inspectSpatial(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .spatial-board').evaluate(board=>({
      kind:board.dataset.spatialStyle,p:+board.dataset.spatialProgress,entrance:+board.dataset.spatialEntrance,
      states:JSON.parse(board.dataset.spatialState),perspective:parseFloat(getComputedStyle(board.querySelector('.spatial-stage')).perspective),
      labels:[...board.querySelectorAll('.spatial-label')].map(n=>({text:n.textContent,font:getComputedStyle(n).fontFamily,size:getComputedStyle(n).fontSize})),
      depths:[...board.querySelectorAll('.spatial-arch')].map(n=>+n.dataset.depth),
      cards:[...board.querySelectorAll('.spatial-card')].map(n=>{
        const m=new DOMMatrix(n.style.transform),image=n.querySelector('img');
        return {matrix:[m.m11,m.m12,m.m22,m.m41,m.m42,m.m43],alpha:+getComputedStyle(n).opacity,
          src:image.getAttribute('src'),fit:getComputedStyle(image).objectFit,decoded:image.complete&&image.naturalWidth>=32};
      })
    }));
    const clamp=v=>Math.max(0,Math.min(1,v));
    const frame=Math.floor(time*30+1e-7),progress=i=>clamp((frame-Math.ceil((cues[spec.cues[i]].start+.4)*30))/24);
    const p=progress(1),kind=spec.content.treatment,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
    assert.equal(observed.kind,kind);near(observed.p,p);near(observed.entrance,progress(0));
    assert.deepEqual(observed.labels.map(l=>l.text),spec.content.items.map(i=>i.label));
    assert.ok(observed.labels.every(l=>l.font.includes('BrandMono')&&l.size==='24px'));
    assert.equal(observed.cards.length,spec.content.items.length);
    observed.cards.forEach((card,i)=>{
      const s=observed.states[i];assert.ok(Object.values(s).every(Number.isFinite));near(s.p,p);
      assert.equal(card.src,configuration.assets[spec.content.items[i].image]);assert.equal(card.fit,'contain');assert.ok(card.decoded);
      [s.x,s.y,s.z].forEach((v,k)=>near(v,card.matrix[k+3]));near(s.alpha,card.alpha);
      if(kind==='depth-card') {
        const q=1-(1-p)**4;near(s.rx,12-16*q);near(s.ry,-20+30*q);near(s.z,-80+160*q);
        near(card.matrix[0],Math.cos(s.ry*Math.PI/180));near(card.matrix[2],Math.cos(s.rx*Math.PI/180));
      } else if(kind==='phone-trio') {
        const t=p*1.6,start=[.3,.2,.4][i],u=clamp((t-start)/.7)-1,arrival=1+2.4*u**3+1.4*u*u;
        near(s.alpha,clamp(arrival));
        if(i===1){near(s.scale,.85+.15*arrival);near(s.x,0);near(s.rz,0);}
        else {const q=clamp((t-start)/1.2),fan=q===1?1:1-2**(-10*q),direction=i===0?-1:1;
          near(s.x,direction*340*fan);near(s.rz,direction*12*fan);}
        near(card.matrix[0],s.scale*Math.cos(s.rz*Math.PI/180));
      } else if(kind==='scrub-stack'||kind==='device-splay') {
        const local=clamp((p*(kind==='scrub-stack'?.72:1.14)-i*.12)/(kind==='scrub-stack'?.48:.9));
        const overshoot=kind==='scrub-stack'?1.6:1.7,t=local-1,q=1+(overshoot+1)*t*t*t+overshoot*t*t;
        near(s.alpha,local);
        if(kind==='scrub-stack'){near(s.y,42+(i*26-42)*q);near(s.scale,.88+(.12-i*.04)*q);}
        else {near(s.x,[-300,-50,240][i]*q);near(s.rz,[-12,0,12][i]*q);near(s.scale,.9+.1*q);}
        near(card.matrix[0],s.scale*Math.cos(s.rz*Math.PI/180));
      } else {
        const q=p<.5?4*p**3:1-(-2*p+2)**3/2,d=1400+((kind.endsWith('-in')?700:2800)-1400)*q;
        near(s.distance,d);near(observed.perspective,d);near(s.subjectScale,s.perspective/s.distance);
        assert.deepEqual(observed.depths,[-3200,-2360,-1720,-1120,-560,0]);near(card.matrix[0],1);near(s.z,0);
      }
    });
    return observed;
  }
  const inspect=()=>page.evaluate(()=>{
    const film=document.getElementById('film').getBoundingClientRect();
    const scene=document.querySelector('.scene[aria-hidden="false"]');
    const host=scene.querySelector('.production-content').getBoundingClientRect();
    const narration=document.querySelector('.spoken-caption').getBoundingClientRect();
    const failures=[];
    for(const node of scene.querySelectorAll('[data-fit]')) {
      let visible=true;
      for(let parent=node;parent&&parent!==scene;parent=parent.parentElement) {
        const style=getComputedStyle(parent);
        if(parent.getAttribute('aria-hidden')==='true'||Number(style.opacity)===0||style.visibility==='hidden')visible=false;
      }
      if(!visible)continue;
      const box=node.getBoundingClientRect();
      if(box.left<host.left-1||box.right>host.right+1||box.top<host.top-1||box.bottom>host.bottom+1)
        failures.push('Text outside composition: '+node.textContent);
      if(node.scrollWidth>node.clientWidth+2||node.scrollHeight>node.clientHeight+2)
        failures.push('Text overflow: '+node.textContent);
    }
    if(host.bottom>narration.top)failures.push('Composition overlaps narration');
    if(host.left<film.left||host.right>film.right+1)failures.push('Composition outside film');
    const lettering=scene.querySelector('.lettering-board');
    if(lettering) {
      const active=[...lettering.querySelectorAll('.lettering-layer')].filter(n=>getComputedStyle(n).visibility==='visible');
      if(active.length!==1||!Number.isFinite(Number(lettering.dataset.letteringTime)))failures.push('Lettering active state invalid');
      for(const layer of active) {
        for(const svg of layer.querySelectorAll('svg')) {
          const box=svg.getBoundingClientRect();
          if(box.left<host.left-1||box.right>host.right+1||box.top<host.top-1||box.bottom>host.bottom+1)failures.push('Lettering outside composition');
          if(svg.querySelector('text,image,script,foreignObject')||!svg.querySelector('path'))failures.push('Lettering must use retained glyph paths');
          for(const path of svg.querySelectorAll('[stroke-dashoffset]'))
            if(!Number.isFinite(Number(path.getAttribute('stroke-dashoffset'))))failures.push('Lettering stroke state invalid');
        }
        const stage=layer.querySelector('.difference-stage');
        if(stage) {
          const text=stage.querySelector('.difference-copy'),field=stage.querySelector('.difference-field');
          if(getComputedStyle(stage).isolation!=='isolate'||getComputedStyle(stage).backgroundColor!=='rgb(0, 0, 0)'||
             getComputedStyle(field).backgroundColor!=='rgb(255, 255, 255)'||getComputedStyle(text).color!=='rgb(255, 255, 255)'||
             getComputedStyle(text).mixBlendMode!=='difference')failures.push('Difference typography lost its controlled contrast fields');
        }
      }
    }
    const variable=scene.querySelector('.variable-board');
    if(variable) {
      const font=window.ShortCreatorVariableFont;
      if(!font||!document.fonts.check('64px BrandVariable'))failures.push('Variable font failed to load');
      if(!Number.isFinite(Number(variable.dataset.variableTime)))failures.push('Variable typography clock missing');
      const visible=[...variable.querySelectorAll('.variable-word')].filter(n=>getComputedStyle(n).visibility==='visible');
      if(visible.length!==1)failures.push('Variable typography requires one active phrase');
      for(const word of visible)for(const node of word.children) {
        const style=getComputedStyle(node),box=node.getBoundingClientRect();
        if(!style.fontFamily.includes('BrandVariable'))failures.push('Variable typography lost its approved font');
        if(box.left<host.left-1||box.right>host.right+1||box.top<host.top-1||box.bottom>host.bottom+1)
          failures.push('Variable glyph outside composition');
        const values=[...style.fontVariationSettings.matchAll(/"([a-z]{4})"\s+(-?[\d.]+)/g)];
        if(values.length!==font.axes.length)failures.push('Variable axes incomplete');
        for(const [,tag,raw] of values) {
          const axis=font.axes.find(a=>a.tag===tag),value=Number(raw);
          if(!axis||!Number.isFinite(value)||value<axis.minimum||value>axis.maximum)failures.push('Variable axis exceeds real font range');
        }
      }
    }
    const cinema=scene.querySelector('.cinema-board');
    if(cinema) {
      const copy=[...cinema.querySelectorAll('[data-fit]')].filter(n=>{
        for(let p=n;p&&p!==cinema;p=p.parentElement)if(+getComputedStyle(p).opacity===0)return false;
        return true;
      });
      if(cinema.querySelector('script,iframe,a,input,button'))failures.push('Unexpected cinema control');
      if(!Number.isFinite(Number(cinema.dataset.cinemaTime)))failures.push('Cinema clock missing');
      for(const [i,node] of copy.entries()) {
        const style=getComputedStyle(node),a=node.getBoundingClientRect();
        if(!style.fontFamily.includes('BrandSans')&&!style.fontFamily.includes('BrandMono'))failures.push('Cinema font is not bound to brand');
        if(parseFloat(style.fontSize)<18)failures.push('Cinema copy below minimum size');
        for(const other of copy.slice(i+1)) {
          const b=other.getBoundingClientRect();
          if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)failures.push('Cinema text collision: '+node.textContent+' / '+other.textContent);
        }
      }
      for(const art of scene.querySelectorAll('.cinema-art')) {
        if(!art.complete||art.naturalWidth<32||!art.getAttribute('src').startsWith('assets/still-'))failures.push('Cinema image did not load from a declared asset');
      }
      if(cinema.dataset.shotState) {
        const state=JSON.parse(cinema.dataset.shotState),pose=state.pose;
        const frames=[...scene.querySelectorAll('.photographic-frame')];
        const active=frames.filter(n=>getComputedStyle(n).visibility==='visible');
        const stage=document.getElementById('film');
        const width=Number(stage.dataset.width),height=Number(stage.dataset.height);
        if(active.length!==1||active[0]!==frames[state.index])failures.push('Photographic cut has the wrong visible shot');
        if(![width,height].every(n=>Number.isFinite(n)&&n>0)||!Object.values(pose).every(Number.isFinite)||pose.x>0.01||pose.y>0.01||pose.x+pose.w<width-.01||pose.y+pose.h<height-.01)
          failures.push('Photographic camera exposes the stage');
        const air=scene.querySelector('.cinema-atmosphere');
        if(air.width!==width/2||air.height!==height/2)failures.push('Photographic atmosphere does not match the output profile');
        if(active.length===1) {
          const matrix=new DOMMatrix(active[0].style.transform);
          if(Math.abs(matrix.m41-pose.x)>.02||Math.abs(matrix.m42-pose.y)>.02||Math.abs(parseFloat(active[0].style.width)-pose.w)>.02)
            failures.push('Photographic camera differs from its frame state');
        }
      }
      if(getComputedStyle(document.querySelector('.spoken-caption')).textTransform!=='none')failures.push('Cinema captions must preserve sentence case');
    }
    const editorial=scene.querySelector('.editorial-board');
    if(editorial) {
      if(editorial.viewBox.baseVal.width!==1720||editorial.viewBox.baseVal.height!==690)failures.push('Editorial viewbox changed');
      if(editorial.querySelectorAll('path,rect,circle').length<10)failures.push('Editorial graphic is incomplete');
      if(editorial.querySelector('image,foreignObject,script,a'))failures.push('Editorial drawing contains an unapproved element');
      const labels=[...editorial.querySelectorAll('[data-editorial-text]')].filter(n=>n.textContent);
      const visible=labels.filter(n=>{for(let p=n;p&&p!==editorial;p=p.parentElement)if(+getComputedStyle(p).opacity===0)return false;return true;});
      visible.forEach((node,index)=>{
        const style=getComputedStyle(node),box=node.getBoundingClientRect();
        if(!style.fontFamily.includes('BrandSans')&&!style.fontFamily.includes('BrandMono'))failures.push('Editorial font changed');
        if(parseFloat(style.fontSize)<24)failures.push('Editorial text is too small');
        for(const other of visible.slice(index+1)){
          const b=other.getBoundingClientRect();
          if(box.left<b.right-1&&box.right>b.left+1&&box.top<b.bottom-1&&box.bottom>b.top+1)failures.push('Editorial text collision: '+node.textContent+' / '+other.textContent);
        }
      });
    }
    const dataHeading=scene.querySelector('.prod-heading');
    const dataInsight=scene.querySelector('.data-insight');
    const dataBoard=scene.querySelector('.regional-board .map-picture')||scene.querySelector('.data-board,.map-board,.annotation-board,.specs-board,.interface-board,.code-story-board,.interaction-board,.spatial-object-board,.app-install-phone');
    const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    if(dataHeading&&dataBoard) {
      const title=dataHeading.getBoundingClientRect(),board=dataBoard.getBoundingClientRect();
      if(overlaps(title,board))failures.push('Heading overlaps composition artwork');
      if(dataInsight) {
        const insight=dataInsight.getBoundingClientRect();
        if(overlaps(title,insight))failures.push('Heading overlaps data explanation');
        if(overlaps(insight,board))failures.push('Data explanation overlaps composition artwork');
      }
    }
    if(scene.querySelector('.regional-board')) {
      const parts=[...scene.querySelectorAll('.prod-heading,.data-insight,.map-picture,.map-scale,.map-callout,.regional-credit,.data-source,.data-reference')];
      for(const [i,node] of parts.entries())for(const other of parts.slice(i+1))
        if(overlaps(node.getBoundingClientRect(),other.getBoundingClientRect()))failures.push('Regional map elements overlap');
    }
    for(const node of scene.querySelectorAll('.screen-device,.prod-grid,.walk-window,.resource-code,.resource-carousel,.resource-diagram,.resource-lower,.resource-checklist,.evidence-trust,.evidence-testimonial,.evidence-proof,.media-board,.media-camera-board,.hand-frame-board,.channel-lower,.headline-window,.interface-board,.data-board,.annotation-board,.code-story-board,.map-board,.specs-board,.interaction-board,.title-design-board,.spatial-object-board,.news-ticker-board,.brand-lockup-board,.character-walk-board,.app-install-board,.creator-intro-board,.cursor-rays-board')) {
      const box=node.getBoundingClientRect();
      if(box.left<host.left-1||box.right>host.right+1||box.top<host.top-1||box.bottom>host.bottom+1)
        failures.push('Visual container outside composition');
    }
    const titleNote=scene.querySelector('.title-note');
    if(titleNote&&+getComputedStyle(titleNote).opacity>0) {
      for(const other of scene.querySelectorAll('.prod-kicker,.prod-title,.prod-rule,.prod-subtitle'))
        if(overlaps(titleNote.getBoundingClientRect(),other.getBoundingClientRect()))failures.push('Title note overlaps primary content');
    }
    const closing=scene.querySelector('.production-closing');
    if(closing) {
      const parts=[...closing.querySelectorAll('.prod-title,.cta-action,.cta-label')].filter(n=>+getComputedStyle(n).opacity>0);
      for(const [i,node] of parts.entries())for(const other of parts.slice(i+1))
        if(overlaps(node.getBoundingClientRect(),other.getBoundingClientRect()))failures.push('Closing text overlaps');
    }
    for(const container of scene.querySelectorAll('.data-board')) {
      const area=container.getBoundingClientRect();
      const nodes=[...container.querySelectorAll('.network-node,.data-svg text')].filter(node=>{
        for(let parent=node;parent&&parent!==scene;parent=parent.parentElement) {
          const css=getComputedStyle(parent);if(+css.opacity===0||css.visibility==='hidden')return false;
        }
        return Boolean(node.textContent);
      });
      const boxes=nodes.map(node=>node.getBoundingClientRect());
      for(const [i,a] of boxes.entries()) {
        if(a.left<area.left-1||a.right>area.right+1||a.top<area.top-1||a.bottom>area.bottom+1)failures.push('Data element exceeds board');
        for(const b of boxes.slice(i+1))if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)
          failures.push('Data labels overlap');
      }
    }
    const interaction=scene.querySelector('.interaction-board');
    const presentation=scene.querySelector('.interface-presets');
    const social=scene.querySelector('.interface-social-cards');
    if(social) {
      const area=social.getBoundingClientRect(),state=JSON.parse(social.dataset.interfacePresentation);
      const finite=v=>typeof v==='number'?Number.isFinite(v):v&&typeof v==='object'?Object.values(v).every(finite):true;
      if(!finite(state))failures.push('Non-finite social presentation');
      for(const row of social.querySelectorAll('.interface-row')) {
        if(getComputedStyle(row).visibility!=='visible')continue;
        const b=row.getBoundingClientRect();
        if(b.left<area.left-1||b.right>area.right+1||b.top<area.top-1||b.bottom>area.bottom+1)failures.push('Social copy exceeds board');
        const boxes=[...row.querySelectorAll('[data-fit]')].filter(n=>getComputedStyle(n).visibility==='visible').map(n=>n.getBoundingClientRect());
        for(const [i,r] of boxes.entries()) {
          if(r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1)failures.push('Social copy exceeds card');
          for(const other of boxes.slice(i+1))if(r.left<other.right&&r.right>other.left&&r.top<other.bottom&&r.bottom>other.top)failures.push('Social text overlaps');
        }
      }
    }
    const motionInterface=scene.querySelector('.interface-motion');
    if(motionInterface) {
      const state=JSON.parse(motionInterface.dataset.interfacePresentation),area=motionInterface.getBoundingClientRect();
      const finite=v=>typeof v==='number'?Number.isFinite(v):v&&typeof v==='object'?Object.values(v).every(finite):true;
      if(!finite(state))failures.push('Non-finite interface motion');
      if(getComputedStyle(motionInterface).overflow!=='hidden')failures.push('Interface motion must clip to its board');
      for(const row of motionInterface.querySelectorAll('.interface-row')) {
        if(getComputedStyle(row).visibility!=='visible')continue;
        const shell=row.parentElement.getBoundingClientRect(),b=row.getBoundingClientRect();
        if(b.left<shell.left-1||b.right>shell.right+1||b.top<shell.top-1||b.bottom>shell.bottom+1)failures.push('Motion copy exceeds its card');
        if(b.left<area.left-1||b.right>area.right+1||b.top<area.top-1||b.bottom>area.bottom+1)failures.push('Readable motion copy is clipped');
      }
    }
    if(presentation) {
      const state=JSON.parse(presentation.dataset.interfacePresentation);
      const finite=value=>typeof value==='number'?Number.isFinite(value):value&&typeof value==='object'?Object.values(value).every(finite):true;
      if(!finite(state))failures.push('Non-finite interface presentation');
      for(const row of presentation.querySelectorAll('.interface-row')) {
        if(getComputedStyle(row).visibility==='hidden'||+row.style.opacity===0)continue;
        const area=row.getBoundingClientRect();
        for(const item of row.querySelectorAll('[data-fit]')) {
          let visible=true;for(let parent=item;parent&&parent!==row;parent=parent.parentElement)
            if(+getComputedStyle(parent).opacity===0)visible=false;
          if(!visible)continue;
          const b=item.getBoundingClientRect();
          if(b.left<area.left-1||b.right>area.right+1||b.top<area.top-1||b.bottom>area.bottom+1)
            failures.push('Interface text exceeds its card');
        }
      }
    }
    if(interaction) {
      const state=JSON.parse(interaction.dataset.interactionState),area=interaction.getBoundingClientRect();
      const menu=interaction.querySelector('.interaction-menu');
      if(menu&&+menu.style.opacity>0) {
        const box=menu.getBoundingClientRect();
        if(box.left<area.left-1||box.right>area.right+1||box.top<area.top-1||box.bottom>area.bottom+1)
          failures.push('Interaction menu exceeds image board');
      }
      if(![state.tip.x,state.tip.y,state.scale,state.carry.x,state.carry.y,state.tilt,state.contactOpacity].every(Number.isFinite))
        failures.push('Non-finite interaction state');
      const after=interaction.querySelector('.interaction-result');
      if(after&&(after.style.visibility==='visible')!==state.result)failures.push('Interaction result state disagrees with image');
      const tag=interaction.querySelector('.pointer-agent');
      if(tag&&+tag.style.opacity>0){const box=tag.getBoundingClientRect();
        if(box.left<area.left-1||box.right>area.right+1||box.top<area.top-1||box.bottom>area.bottom+1)failures.push('Actor label exceeds image board');
        if(menu&&+menu.style.opacity>0){const m=menu.getBoundingClientRect();
          if(box.left<m.right&&box.right>m.left&&box.top<m.bottom&&box.bottom>m.top)failures.push('Actor label obscures menu');}}
      const metadata=JSON.parse(interaction.dataset.pointerStyle||'{}');
      const finite=value=>typeof value==='number'?Number.isFinite(value):value&&typeof value==='object'?Object.values(value).every(finite):true;
      if(!finite(metadata))failures.push('Non-finite pointer presentation');
      if(interaction.dataset.interactionCamera){const view=JSON.parse(interaction.dataset.interactionCamera);
        const W=interaction.clientWidth,H=interaction.clientHeight;
        if(!finite(view)||view.z<1||view.z>1.8||view.x>1e-6||view.y>1e-6||view.x+W*view.z<W-1e-6||view.y+H*view.z<H-1e-6)
          failures.push('Interaction camera exposes an outside edge');}
    }
    const handFrame=scene.querySelector('.hand-frame-board');
    if(handFrame) {
      const area=handFrame.getBoundingClientRect();
      for(const node of handFrame.querySelectorAll('path')) {
        const b=node.getBoundingClientRect(),length=node.getTotalLength(),offset=+node.getAttribute('stroke-dashoffset');
        if(b.left<area.left-1||b.right>area.right+1||b.top<area.top-1||b.bottom>area.bottom+1)failures.push('Hand frame ink exceeds board');
        if(!Number.isFinite(length)||length<=0||offset<0||offset>length)failures.push('Invalid hand frame stroke');
      }
    }
    const channel=scene.querySelector('.channel-lower');
    if(channel) {
      const area=channel.getBoundingClientRect(),parts=[...channel.querySelectorAll('.channel-logo,.channel-name,.channel-role,.channel-button')];
      for(const [i,node] of parts.entries()) {
        const b=node.getBoundingClientRect();
        if(b.left<area.left-1||b.right>area.right+1||b.top<area.top-1||b.bottom>area.bottom+1)failures.push('Channel content exceeds card');
        for(const other of parts.slice(i+1))if(overlaps(b,other.getBoundingClientRect()))failures.push('Channel content overlaps');
      }
    }
    const camera=scene.querySelector('.media-camera-board');
    if(camera) {
      const area=camera.getBoundingClientRect(),state=JSON.parse(camera.dataset.cameraState);
      const finite=value=>typeof value==='number'?Number.isFinite(value):value&&typeof value==='object'?Object.values(value).every(finite):true;
      if(!finite(state))failures.push('Non-finite media camera');
      if(getComputedStyle(camera).overflow!=='hidden')failures.push('Media camera must clip to its board');
      for(const card of camera.querySelectorAll('.media-camera-card')) {
        const i=+card.dataset.cameraIndex,b=card.getBoundingClientRect(),picture=card.querySelector('.media-camera-picture'),label=card.querySelector('.media-camera-label'),image=card.querySelector('img');
        // Parallax deliberately sends the two image layers beyond the clipped board.
        // Their labels are hidden during travel; the focal card remains fully contained.
        if((!state.style.startsWith('parallax-')||i===1)&&
          (b.left<area.left-1||b.right>area.right+1||b.top<area.top-1||b.bottom>area.bottom+1))failures.push('Camera focal card exceeds board');
        if(picture.offsetTop+picture.offsetHeight>label.offsetTop)failures.push('Camera image overlaps its label');
        if(!image.complete||!image.naturalWidth||getComputedStyle(image).objectFit!=='contain')failures.push('Camera requires a loaded contain-fit still');
        if(getComputedStyle(picture).overflow!=='hidden')failures.push('Camera image must clip to its picture');
      }
    }
    const spatial=scene.querySelector('.spatial-board');
    if(spatial) {
      const viewport=spatial.querySelector('.spatial-viewport').getBoundingClientRect();
      const labels=spatial.querySelector('.spatial-labels').getBoundingClientRect();
      if(viewport.bottom>labels.top+1)failures.push('Spatial artwork overlaps its labels');
      for(const card of spatial.querySelectorAll('.spatial-card')) {
        const box=card.getBoundingClientRect(),image=card.querySelector('img');
        if(+getComputedStyle(card).opacity>0&&(box.left<viewport.left-1||box.right>viewport.right+1||box.top<viewport.top-1||box.bottom>viewport.bottom+1))
          failures.push('Spatial image exceeds its viewport');
        if(getComputedStyle(image).objectFit!=='contain')failures.push('Spatial image must retain contain fit');
      }
    }
    const board=scene.querySelector('.media-board');
    if(board) {
      const area=board.getBoundingClientRect(),cards=[...board.querySelectorAll('.media-card')].filter(card=>Number(getComputedStyle(card).opacity)>0);
      const boxes=cards.map(card=>card.getBoundingClientRect());
      for(const [i,card] of cards.entries()) {
        const box=boxes[i];
        if(box.left<area.left-1||box.top<area.top-1||box.right>area.right+1||box.bottom>area.bottom+1)failures.push('Media card exceeds its board');
        for(const child of card.querySelectorAll('.media-label,.media-picture')) {
          const r=child.getBoundingClientRect();
          if(r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1)failures.push('Media content exceeds its card');
        }
        // Both regions share one projected card plane; compare their local boxes
        // because perspective can overlap their screen-space bounding rectangles.
        const picture=card.querySelector('.media-picture'),label=card.querySelector('.media-label');
        if(picture.offsetTop+picture.offsetHeight>label.offsetTop)failures.push('Media image overlaps its label');
        if(picture.dataset.mediaSurface) {
          const image=picture.querySelector('.media-image'),state=JSON.parse(picture.dataset.surfaceState);
          const finite=value=>typeof value==='number'?Number.isFinite(value):value&&typeof value==='object'?Object.values(value).every(finite):true;
          if(!finite(state)||state.p<0||state.p>1)failures.push('Invalid media surface state');
          if(getComputedStyle(picture).overflow!=='hidden')failures.push('Media surface must clip to its picture');
          if(!image.complete||!image.naturalWidth||getComputedStyle(image).objectFit!=='contain')failures.push('Surface requires a loaded contain-fit still');
          if(picture.querySelector('.media-label'))failures.push('Surface must not alter the image label');
          for(const copy of picture.querySelectorAll('.surface-copy')) {
            if(!copy.complete||copy.src!==image.src||copy.naturalWidth!==image.naturalWidth||copy.naturalHeight!==image.naturalHeight)failures.push('Surface fill differs from its verified image');
          }
        }
        for(let j=i+1;j<boxes.length;j++) {
          const b=boxes[j];
          if(box.left<b.right&&box.right>b.left&&box.top<b.bottom&&box.bottom>b.top)failures.push('Media cards overlap');
        }
      }
    }
    for(const card of scene.querySelectorAll('.evidence-testimonial,.evidence-proof')) {
      const box=card.getBoundingClientRect();
      for(const child of card.querySelectorAll('[data-fit]')) {
        const r=child.getBoundingClientRect();
        if(r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1)
          failures.push('Evidence copy exceeds its card');
      }
      const parts=[...card.children];
      for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++) {
        const a=parts[i].getBoundingClientRect(),b=parts[j].getBoundingClientRect();
        if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)failures.push('Evidence groups overlap');
      }
    }
    for(const card of scene.querySelectorAll('.resource-diagram-card,.resource-check-row,.resource-lower')) {
      if(Number(getComputedStyle(card).opacity)===0)continue;
      const parent=card.getBoundingClientRect();
      for(const child of card.querySelectorAll('[data-fit]')) {
        const box=child.getBoundingClientRect();
        if(box.left<parent.left-1||box.top<parent.top-1||box.right>parent.right+1||box.bottom>parent.bottom+1)
          failures.push('Resource copy exceeds its container');
      }
    }
    const insight=scene.querySelector('.chart-insight'),plot=scene.querySelector('.production-plot');
    if(insight&&plot) {
      const a=insight.getBoundingClientRect(),b=plot.getBoundingClientRect();
      if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)failures.push('Chart overlaps its explanation');
    }
    const labels=[...scene.querySelectorAll('[data-chart-label]')].map(node=>node.getBoundingClientRect());
    for(let i=1;i<labels.length;i++)if(labels[i].left<labels[i-1].right+2)failures.push('Chart category labels overlap');
    const chartText=[...scene.querySelectorAll('.production-plot text')].filter(node=>{
      for(let parent=node;parent&&parent!==scene;parent=parent.parentElement)
        if(Number(getComputedStyle(parent).opacity)===0||getComputedStyle(parent).visibility==='hidden')return false;
      const reel=node.closest('[data-metric-reel]');
      if(reel) {
        const a=node.getBoundingClientRect(),b=reel.querySelector('[data-metric-viewport]').getBoundingClientRect();
        if(a.bottom<=b.top||a.top>=b.bottom)return false;
      }
      return Boolean(node.textContent);
    }).map(node=>node.getBoundingClientRect());
    for(let i=0;i<chartText.length;i++)for(let j=i+1;j<chartText.length;j++) {
      const a=chartText[i],b=chartText[j];
      if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)failures.push('Chart text collision');
    }
    const rating=plot?.querySelector('.evidence-stars');
    if(rating) {
      const a=rating.getBoundingClientRect();
      for(const b of chartText)if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)
        failures.push('Rating graphic overlaps chart text');
    }
    const matched=scene.querySelector('[data-match-carrier]');
    if(matched&&matched.scrollWidth>matched.clientWidth+2)failures.push('Matched headline must fit one line at approved type size');
    const world=scene.querySelector('.screen-world');
    if(world&&+world.dataset.focusIndex>=0&&+world.dataset.focusProgress===1) {
      const region=world.querySelector('.screen-focus-region').getBoundingClientRect();
      const view=world.parentElement.getBoundingClientRect();
      if(region.left<view.left-1||region.top<view.top-1||region.right>view.right+1||region.bottom>view.bottom+1)
        failures.push('Focus region clipped at its destination');
    }
    const codeBoard=scene.querySelector('.code-story-board');
    if(codeBoard) {
      const view=codeBoard.querySelector('.code-story-viewport'),box=view.getBoundingClientRect();
      if(getComputedStyle(view).overflow!=='hidden')failures.push('Code viewport lost its clipping boundary');
      for(const text of codeBoard.querySelectorAll('.code-story-text')) {
        if(text.scrollWidth>text.clientWidth+2)failures.push('Code exceeds approved font width');
        if(!getComputedStyle(text).fontFamily.includes('BrandMono'))failures.push('Code changed approved font');
      }
      if(codeBoard.dataset.codeStyle!=='scroll')for(const doc of codeBoard.querySelectorAll('.code-story-document,.code-story-diff')) {
        if(getComputedStyle(doc).visibility!=='visible')continue;
        const rows=[...doc.querySelectorAll('.code-story-row-wrap')],last=rows.at(-1)?.getBoundingClientRect();
        if(last&&last.bottom>box.bottom+1)failures.push('Code exceeds viewport height');
      }
    }
    for(const row of scene.querySelectorAll('.specs-row')) {
      if(+getComputedStyle(row).opacity===0)continue;
      const area=row.getBoundingClientRect();
      for(const part of row.querySelectorAll('[data-fit]')) {
        const box=part.getBoundingClientRect();
        if(box.left<area.left-1||box.right>area.right+1||box.top<area.top-1||box.bottom>area.bottom+1)
          failures.push('Specification copy exceeds its row');
      }
    }
    const map=scene.querySelector('.map-picture');
    if(map) {
      const area=map.getBoundingClientRect(),labels=[...map.querySelectorAll('[data-map-label]')].filter(node=>{
        for(let parent=node;parent&&parent!==map;parent=parent.parentElement)if(+getComputedStyle(parent).opacity===0)return false;
        return true;
      });
      const boxes=labels.map(node=>node.getBoundingClientRect());
      boxes.forEach((a,i)=>{
        if(a.left<area.left-1||a.right>area.right+1||a.top<area.top-1||a.bottom>area.bottom+1)failures.push('Map label exceeds viewport');
        for(const b of boxes.slice(i+1))if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)failures.push('Map labels overlap');
      });
    }
    return failures;
  });
  for(const viewport of [outputViewport,{width:1440,height:900},{width:390,height:844},{width:375,height:667}]) {
    await page.setViewportSize(viewport);
    await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
    for(const [i,scene] of scenes.entries()) {
      const times=[scene.end-.5,...episode.scenes[i].cues.map(cue=>cues[cue].start+1.21)];
      for(const t of times.filter(t=>t<scene.end-.4)) {
        await page.evaluate(time=>window.ShortCreatorRenderAt(time),t);
        assert.deepEqual(await inspect(),[],scene.name+' at '+t+' '+JSON.stringify(viewport));
      }
    }
    for(const cue of cues) {
      await page.evaluate(t=>window.ShortCreatorRenderAt(t),(cue.start+cue.end)/2);
      const state=await page.locator('.spoken-caption').evaluate(node=>({text:node.textContent,
        overflow:node.scrollWidth>node.clientWidth+2||node.scrollHeight>node.clientHeight+2}));
      assert.equal(state.text,cue.text);assert.equal(state.overflow,false,'Caption overflow');
    }
    report.viewports.push(viewport);
  }
  await page.setViewportSize(outputViewport);
  await page.reload();
  await page.evaluate(async()=>{
    window.dispatchEvent(new Event('resize'));await document.fonts.ready;await window.ShortCreatorVisualReady;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
  async function seekCheck(t,reset,label) {
    await page.evaluate(time=>window.ShortCreatorRenderAt(time),t);
    const pixels=await page.screenshot();
    await page.evaluate(time=>window.ShortCreatorRenderAt(time),reset);
    await page.evaluate(time=>window.ShortCreatorRenderAt(time),t);
    const repeat=await page.screenshot();
    if(sha(pixels)!==sha(repeat)&&!fs.existsSync(path.join(out,'seek-mismatch.png'))) {
      fs.writeFileSync(path.join(out,'seek-original.png'),pixels,{flag:'wx'});
      fs.writeFileSync(path.join(out,'seek-mismatch.png'),repeat,{flag:'wx'});
    }
    assert.equal(sha(pixels),sha(repeat),'Non-deterministic production seek: '+label);
    return pixels;
  }
  report.beats=[];report.seams=[];
  async function inspectAdvancedTitle(spec,time) {
    const onset=Math.ceil((cues[spec.cues[0]].start+.4)*30),frame=Math.floor(time*30+1e-7);
    const p=Math.max(0,Math.min(1,(frame-onset)/24)),kind=spec.content.reveal;
    const observed=await page.locator('.scene[aria-hidden="false"] .prod-title').evaluate((node,settled)=>{
      const copy=node.querySelector('.type-advanced-copy'),canvas=node.querySelector('canvas'),css=getComputedStyle(node);
      const state=JSON.parse(node.dataset.advancedState),copyStyle=getComputedStyle(copy);
      return {text:node.textContent,original:node.getAttribute('aria-label'),state,
        font:css.fontFamily,size:css.fontSize,filter:css.filter,transform:css.transform,
        shadow:copyStyle.textShadow,overrides:[node.style.fontFamily,node.style.fontSize,node.style.fontWeight],
        dimensions:[canvas.width,canvas.height,node.clientWidth,node.clientHeight],
        copy:{opacity:+copyStyle.opacity,mask:copyStyle.maskImage,clip:copyStyle.clipPath,transform:copyStyle.transform},
        words:[...node.querySelectorAll('.type-word')].map(n=>({text:n.textContent,font:getComputedStyle(n).fontFamily,
          size:getComputedStyle(n).fontSize,width:n.clientWidth,overflow:n.scrollWidth>n.clientWidth+2})),
        clear:settled?canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.every((v,i)=>i%4!==3||v===0):null};
    },p===1);
    assert.equal(observed.original,spec.content.title);assert.equal(observed.state.kind,kind);
    assert.equal(observed.state.p,p);assert.ok(observed.font.includes('BrandSans'));assert.deepEqual(observed.overrides,['','','']);
    assert.deepEqual(observed.dimensions.slice(0,2),observed.dimensions.slice(2));
    assert.ok(observed.words.every(word=>word.font===observed.font&&word.size===observed.size));
    const source=spec.content.title.split(/\s+/).filter(Boolean);
    if(kind==='decode-read') {
      const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const expected=source.map((word,i)=>{
        const q=Math.max(0,Math.min(1,(p-.55*i/Math.max(1,source.length-1))/.45));
        if(q>=2/3||p===1)return word;
        let seed=i*1000+(q<1/3?0:1);
        return Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(word),()=>{
          seed=(seed+0x6d2b79f5)|0;let n=Math.imul(seed^(seed>>>15),1|seed);
          n=(n+Math.imul(n^(n>>>7),61|n))^n;return alphabet[Math.floor(((n^(n>>>14))>>>0)/4294967296*alphabet.length)];
        }).join('');
      });
      assert.deepEqual(observed.words.map(w=>w.text),expected);
    } else assert.equal(observed.text,spec.content.title);
    if(['neon-accent','particle-burst'].includes(kind))assert.equal(observed.state.accent,source.indexOf(spec.content.accent_word));
    for(const state of observed.state.states)for(const value of Object.values(state))
      assert.ok(typeof value==='boolean'||Number.isFinite(value),'Title state must be finite');
    if(kind==='particle-assemble')assert.ok(observed.state.particleCount>0,'Approved title raster must produce real glyph targets');
    if(kind==='texture-read')assert.equal(observed.copy.mask!=='none',p<1);
    if(kind==='prism-bow') {
      const t=Math.min(1,p/.85)*1.252,clamp=x=>Math.max(0,Math.min(1,x)),out=x=>1-(1-clamp(x))**3;
      const focus=out((t-.1)/1.152),clear=out((p-.85)/.15),s=observed.state.states[0];
      const expected={alpha:out((t-.1)/.672),blur:(18-15.5*focus)*(1-clear),offset:(18-14*focus)*(1-clear),ghost:(.45+.4*focus)*(1-clear),tilt:6*(1-clear)};
      for(const key of Object.keys(expected))assert.ok(Math.abs(s[key]-expected[key])<1e-8);
      assert.ok(Math.abs(observed.copy.opacity-s.alpha)<1e-5);
      if(p===1){assert.equal(observed.filter,'none');assert.equal(observed.transform,'none');assert.equal(observed.shadow,'none');}
      else {assert.ok(Math.abs(parseFloat(observed.filter.slice(5))-s.blur)<1e-4);assert.notEqual(observed.transform,'none');assert.notEqual(observed.shadow,'none');}
    }
    if(p===1) {
      assert.equal(observed.text,spec.content.title);assert.equal(observed.clear,true,'Title effect must leave no residual canvas pixels');
      assert.equal(observed.copy.opacity,1);assert.equal(observed.copy.mask,'none');assert.equal(observed.copy.clip,'none');
      assert.equal(observed.copy.transform,'none');assert.ok(observed.words.every(word=>!word.overflow));
    }
    return observed;
  }
  async function inspectCanvasBackdrop(spec,time) {
    const style=spec.content.style,frame=Math.floor(time*30+1e-7);
    const start=Math.ceil((cues[spec.cues[0]].start+.4)*30),stop=Math.ceil((cues[spec.cues[1]].start+.4)*30);
    const elapsed=Math.max(0,frame-start),gap=stop-start,q=Math.max(0,Math.min(1,(elapsed-gap)/24));
    const observed=await page.locator('.scene[aria-hidden="false"] .backdrop-art').evaluate(view=>{
      const css=getComputedStyle(view),canvas=view.querySelector('canvas');
      return {state:JSON.parse(view.dataset.canvasState),palette:JSON.parse(view.dataset.canvasPalette),size:[canvas.width,canvas.height],
        approved:{background:css.getPropertyValue('--purple').trim(),accent:css.getPropertyValue('--lime').trim(),secondary:css.getPropertyValue('--cyan').trim(),foreground:'#ffffff'}};
    });
    assert.deepEqual(observed.palette,observed.approved);
    const s=observed.state;assert.equal(s.entry,Math.min(1,elapsed/24));assert.equal(s.visible,frame>=start);
    if(style.startsWith('scope-')) {
      const expected=q===1?6:6*(Math.min(elapsed,gap)+24*(q-q**3+.5*q**4))/(gap+12);
      assert.ok(Math.abs(s.sourceTime-expected)<1e-10);assert.equal(s.emitters,0);assert.equal(s.poses,null);
      assert.equal(s.optical.waveform,style.slice(6));assert.equal(s.optical.synthetic,true);
      assert.ok(Number.isInteger(s.optical.samples)&&s.optical.samples>=120&&s.optical.samples<=8000);
      assert.ok(Number.isInteger(s.optical.segments)&&s.optical.segments>=0&&s.optical.segments<=s.optical.samples);
      assert.ok(s.optical.head.every(Number.isFinite));
      assert.ok(s.optical.head[0]>=0&&s.optical.head[0]<1000&&s.optical.head[1]>=100&&s.optical.head[1]<=700);
    } else if(style==='facet-morph'||style==='soft-blob-touch') {
      const duration=style==='facet-morph'?4.1025:3.1625;
      const expected=q===1?duration:duration*(Math.min(elapsed,gap)+24*(q-q**3+.5*q**4))/(gap+12);
      assert.ok(Math.abs(s.sourceTime-expected)<1e-10);assert.equal(s.emitters,0);
      if(style==='facet-morph') {
        assert.equal(s.organic.facets,36);assert.ok(s.organic.progress>=0&&s.organic.progress<=2);
        if(q===1){assert.equal(s.organic.progress,2);assert.equal(s.organic.amplitude,0);}
      } else {
        assert.equal(s.organic.grains,1500);
        if(q===1)for(const key of ['bulge','lean','dot'])assert.equal(s.organic[key],0);
      }
    } else if(style==='anamorphic-flare'||style==='mesh-card') {
      const duration=style==='mesh-card'?8.6:10;
      const expected=q===1?duration:duration*(Math.min(elapsed,gap)+24*(q-q**3+.5*q**4))/(gap+12);
      assert.ok(Math.abs(s.sourceTime-expected)<1e-10);assert.equal(s.emitters,style==='mesh-card'?0:140);assert.equal(s.poses,null);
      if(style==='mesh-card') {
        const c=s.card;assert.ok(c.x>=0&&c.y>=0&&c.width>=.75&&c.height>=800/1080);
        assert.ok(c.x+c.width<=1+1e-10&&c.y+c.height<=1+1e-10);
        if(q===1)assert.deepEqual(c,{x:0,y:0,width:1,height:1,radius:0,scale:1});
      }
    } else {
      const fps=Number(style.slice(12)),seconds=Math.min(3,elapsed/30),step=Math.floor(seconds*fps+1e-6);
      assert.equal(s.sourceTime,seconds);assert.equal(s.cadence,fps);assert.equal(s.emitters,0);assert.equal(s.poses.length,4);
      for(const [i,pose] of s.poses.entries()) {
        assert.equal(pose.step,step);assert.equal(pose.visible,step/fps>=[.15,.6,1.25,1.8][i]);
        const d=step-Math.round([1,1.5,2,2.55][i]*fps);
        assert.equal(pose.sparkle.visible,d>=0&&d<[2,3,2,3][i]);
        if(seconds===3) {
          assert.equal(pose.settled,true);assert.equal(pose.sx,1);assert.equal(pose.sy,1);assert.equal(pose.sparkle.visible,false);
          assert.equal(pose.rotation,[8,-6,5,-12][i]);
          assert.ok(Math.abs(pose.x-[.3,.56,.72,.43][i]*observed.size[0])<1e-8);
          assert.ok(Math.abs(pose.y-.72*observed.size[1])<1e-8);
        }
      }
    }
    return observed;
  }
  async function inspectGpuBackdrop(spec,time,checkPixels=false) {
    const spatial=spec.content.style.startsWith('three-');
    const frame=Math.floor(time*30+1e-7),start=Math.ceil((cues[spec.cues[0]].start+.4)*30),stop=Math.ceil((cues[spec.cues[1]].start+.4)*30);
    const elapsed=Math.max(0,frame-start),gap=stop-start,q=Math.max(0,Math.min(1,(elapsed-gap)/24));
    const seconds=q===1?2:2*(Math.min(elapsed,gap)+24*(q-q*q*q+.5*q*q*q*q))/(gap+12);
    const observed=await page.locator('.scene[aria-hidden="false"] .backdrop-art').evaluate((view,{checkPixels,spatial})=>{
      const canvas=view.querySelector('canvas'),css=getComputedStyle(view),colors=JSON.parse(view.dataset.gpuPalette);
      const approved={background:css.getPropertyValue('--purple').trim(),accent:css.getPropertyValue('--lime').trim(),secondary:css.getPropertyValue('--cyan').trim()};
      let outsidePalette=0;
      if(checkPixels) {
        const stops=['background','secondary','accent'].map(key=>[1,3,5].map(i=>parseInt(approved[key].slice(i,i+2),16))),allowed=new Set();
        for(let i=0;i<256;i++) {
          const phase=i/255*2,side=Math.min(1,Math.floor(phase)),fraction=phase-side;
          const rgb=stops[side].map((v,j)=>Math.round(v+(stops[side+1][j]-v)*fraction));
          allowed.add(rgb[0]*65536+rgb[1]*256+rgb[2]);
        }
        const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]!==255||!allowed.has(pixels[i]*65536+pixels[i+1]*256+pixels[i+2]))outsidePalette++;
      }
      return {clock:JSON.parse(spatial?view.dataset.threeClock:view.dataset.gpuClock),
        rendered:JSON.parse(spatial?view.dataset.threePose:view.dataset.gpuFrame),colors,approved,
        stats:spatial?window.ShortCreatorThreeBackdrops.stats():window.ShortCreatorGpuRuntime.stats(),
        width:canvas.width,height:canvas.height,outsidePalette};
    },{checkPixels,spatial});
    assert.ok(Math.abs(observed.clock.seconds-seconds)<1e-10);assert.equal(observed.clock.settle,q);
    assert.equal(observed.clock.visible,frame>=start);assert.equal(observed.clock.entry,Math.max(0,Math.min(1,elapsed/24)));
    assert.equal(observed.stats.contexts,1);
    if(spatial) {
      assert.equal(observed.stats.revision,'185');
      assert.ok(observed.stats.geometries<=7&&observed.stats.textures<=8,'Shared spatial renderer must release previous scene resources');
      const orbit=spec.content.style==='three-orbiting-cards',galaxy=spec.content.style==='three-galaxy',tunnel=spec.content.style==='three-gallery-tunnel';
      const cosmic=spec.content.style==='three-cosmic-orb',rack=spec.content.style==='three-rack-focus';
      assert.ok(Math.abs(observed.rendered.seconds-seconds/2*(orbit?4:galaxy||cosmic?10:tunnel?12:rack?6:5))<1e-10);
      if(orbit&&q===1) {assert.deepEqual(observed.rendered.rotation,[0,0,0]);assert.equal(observed.rendered.cameraZ,6.4);}
      if(rack) {
        const p=Math.max(0,Math.min(1,(observed.rendered.seconds-1.2)/3.2)),e=p<.5?4*p**3:1-(-2*p+2)**3/2;
        assert.ok(Math.abs(observed.rendered.focus-(p===1?80:1/(1/1.2+(1/80-1/1.2)*e)))<1e-10);
        if(q===1)assert.equal(observed.rendered.focus,80);
      }
      if(!orbit&&!galaxy&&!tunnel&&!cosmic&&!rack) {assert.ok(observed.rendered.scale>=.62&&observed.rendered.scale<=.76);assert.equal(observed.rendered.position[2],1.2);}
    } else {
      const name=spec.content.style==='gpu-chrome-orb'?'Chrome':spec.content.style.slice(4).split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join('');
      assert.equal(observed.rendered.shader,name);assert.ok(Math.abs(observed.rendered.seconds-seconds)<1e-10);
      assert.equal(observed.rendered.animatedTime,observed.rendered.seconds*observed.rendered.speed);
      assert.equal(observed.rendered.width,observed.width);assert.equal(observed.rendered.height,observed.height);
      assert.equal(observed.stats.nodes,2);assert.equal(observed.stats.failed,false);
    }
    assert.deepEqual(observed.colors,observed.approved);assert.equal(observed.outsidePalette,0,'GPU pixels must use the approved palette');
    return observed;
  }
  async function inspectStatCard(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .production-plot').evaluate(plot=>{
      const card=plot.querySelector('[data-stat-card]'),value=card.querySelector('[data-chart-metric]');
      const unit=card.querySelector('[data-stat-unit]'),m=card.transform.baseVal.consolidate().matrix;
      const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};};
      return {style:card.dataset.statCard,value:value.textContent,unit:unit.textContent,
        alpha:+card.getAttribute('opacity'),matrix:[m.a,m.b,m.c,m.d,m.e,m.f],
        W:plot.viewBox.baseVal.width,H:plot.viewBox.baseVal.height,plot:rect(plot),card:rect(card),
        font:getComputedStyle(value).fontFamily,overflow:getComputedStyle(plot).overflow};
    });
    const style=spec.content.metric_style,onset=Math.ceil((cues[spec.cues[0]].start+.4)*30);
    const p=Math.max(0,Math.min(1,(Math.floor(time*30+1e-7)-onset)/24));
    const cx=observed.W/2,cy=observed.H*.46,width=style==='soft-stat'?observed.H*.64:Math.min(observed.W*.72,820);
    let alpha=1,x=0,y=0,scale=1,angle=0;
    if(style==='grid-stat'){const q=1-(1-p)**3;alpha=q;x=-200*(1-q);}
    if(style==='soft-stat'){const q=1+2.7*(p-1)**3+1.7*(p-1)**2;alpha=Math.max(0,Math.min(1,q));x=40*(1-q);y=15*(1-q);scale=.8+.2*q;}
    if(style==='sticker-stat'){scale=p===0?0:p===1?1:1+2**(-10*p)*Math.sin((p-.15)*2*Math.PI/.6);alpha=Math.max(0,Math.min(1,scale));angle=8*Math.PI/180;}
    if(style==='rail-stat')x=-(p===1?0:2**(-10*p))*((observed.W-width)/2+width+4);
    const a=Math.cos(angle)*scale,b=Math.sin(angle)*scale;
    const expected=[a,b,-b,a,x+cx-a*cx+b*cy,y+cy-b*cx-a*cy];
    expected.forEach((v,i)=>assert.ok(Math.abs(observed.matrix[i]-v)<.001,'Statistic card transform differs from its source curve'));
    assert.ok(Math.abs(observed.alpha-alpha)<1e-8);assert.equal(observed.style,style);
    assert.equal(observed.value,String(spec.content.record.data.value));assert.equal(observed.unit,spec.content.record.data.unit);
    assert.ok(observed.font.includes('BrandSans'));assert.equal(observed.overflow,'hidden');
    if(p===1)assert.ok(observed.card.left>=observed.plot.left-1&&observed.card.right<=observed.plot.right+1&&
      observed.card.top>=observed.plot.top-1&&observed.card.bottom<=observed.plot.bottom+1,'Settled statistic card exceeds its native plot');
    return {style,progress:p,value:observed.value};
  }
  async function inspectDecline(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .data-board').evaluate(board=>{
      const ambient=board.querySelector('[data-decline-ambient]'),gloom=board.querySelector('[data-decline-gloom]');
      return {state:JSON.parse(board.dataset.declineState),filter:ambient.style.filter,gloom:+gloom.getAttribute('opacity'),
        alpha:+board.style.opacity,y:new DOMMatrix(board.style.transform).f,height:board.clientHeight,
        legend:board.querySelector('[data-data-legend]').textContent,
        dots:[...board.querySelectorAll('circle[data-data-series]')].map(n=>({alpha:+n.getAttribute('opacity'),
          scale:n.transform.baseVal.numberOfItems?n.transform.baseVal.consolidate().matrix.a:1})),
        paths:[...board.querySelectorAll('path')].map(n=>({length:n.getTotalLength(),offset:+n.getAttribute('stroke-dashoffset')}))};
    });
    const starts=spec.cues.map(cue=>Math.ceil((cues[cue].start+.4)*30)),frame=Math.floor(time*30+1e-7);
    const phases=starts.map(at=>Math.max(0,Math.min(1,(frame-at)/24))),index=starts.reduce((last,at,i)=>frame>=at?i:last,-1);
    const cubic=p=>1-(1-Math.max(0,Math.min(1,p)))**3,values=spec.content.series[0].values,current=Math.max(0,index);
    const q=cubic(phases[current]*(current===values.length-1?1.15:1)),before=values[Math.max(0,current-1)];
    const value=index<=0?values[0]:phases[current]===1?values[current]:before+(values[current]-before)*q;
    const progress=(values[0]-value)/(values[0]-values.at(-1));
    assert.ok(Math.abs(observed.state.value-value)<1e-8);assert.ok(Math.abs(observed.state.progress-progress)<1e-8);
    const filter=/^saturate\(([^)]+)\) brightness\(([^)]+)\)$/.exec(observed.filter);assert.ok(filter);
    assert.ok(Math.abs(+filter[1]-(1-.72*progress))<.00001&&Math.abs(+filter[2]-(1-.52*progress))<.00001);
    assert.ok(Math.abs(observed.gloom-.46*progress)<1e-8);assert.ok(Math.abs(observed.alpha-cubic(phases[0]))<1e-8);
    assert.ok(Math.abs(observed.y-observed.height*.025*(1-cubic(phases[0])))<.001);
    assert.equal(observed.legend,spec.content.series[0].label+' / '+String(phases[current]===1?values[current]:Number(value.toFixed(2))));
    assert.equal(observed.dots.length,values.length);assert.equal(observed.paths.length,values.length-1);
    phases.forEach((p,i)=>{const last=i===phases.length-1,draw=cubic(p*(last?1.15:1));
      assert.ok(Math.abs(observed.dots[i].alpha-(last?Math.max(0,Math.min(1,(draw-.94)/.06)):draw))<1e-8);
      if(i)assert.ok(Math.abs(observed.paths[i-1].offset-observed.paths[i-1].length*(1-draw))<.001);
      if(last)assert.ok(Math.abs(observed.dots[i].scale-(.72+.28*cubic((p-3/3.45)/(.45/3.45))))<.00001);
    });
    return {value,progress,index};
  }
  async function inspectLiquidGlass(spec,time) {
    const observed=await page.locator('.scene[aria-hidden="false"] .liquid-interface').evaluate(board=>{
      const canvas=board.querySelector('canvas'),area=board.getBoundingClientRect();
      return {state:JSON.parse(board.dataset.interfacePresentation),image:board.dataset.glassImage,
        imageSize:JSON.parse(board.dataset.glassImageSize),width:canvas.width,height:canvas.height,
        clientWidth:board.clientWidth,clientHeight:board.clientHeight,stats:window.ShortCreatorLiquidGlass.stats(),
        rows:[...board.querySelectorAll('.interface-row')].map(row=>{
          const rect=row.getBoundingClientRect();return {visible:getComputedStyle(row).visibility==='visible',
            label:row.querySelector('.interface-label').textContent,body:row.querySelector('.interface-body').textContent,
            font:getComputedStyle(row.querySelector('.interface-label')).fontFamily,
            contained:rect.left>=area.left-1&&rect.top>=area.top-1&&rect.right<=area.right+1&&rect.bottom<=area.bottom+1};
        })};
    });
    assert.equal(observed.image,spec.content.image);assert.ok(observed.imageSize.every(v=>v>=32&&v<=4096));
    assert.equal(observed.width,observed.clientWidth);assert.equal(observed.height,observed.clientHeight);
    assert.deepEqual(observed.stats,{contexts:1,targets:observed.stats.targets,failed:false,uniformBuffers:4});
    assert.ok(observed.stats.targets<=1);assert.equal(observed.state.variant,spec.content.variant);
    const frame=Math.floor(time*30+1e-7);
    const active=spec.cues.reduce((last,c,i)=>frame>=Math.ceil((cues[c].start+.4)*30)?i:last,-1);
    assert.equal(observed.state.active,active);
    observed.rows.forEach((row,i)=>{
      const progress=Math.max(0,Math.min(1,(frame-Math.ceil((cues[spec.cues[i]].start+.4)*30))/24)),state=observed.state.rows[i];
      assert.equal(state.progress,progress);assert.equal(row.visible,state.copyVisible);
      assert.equal(row.label,spec.content.items[i].label);assert.equal(row.body,spec.content.items[i].body);
      assert.ok(row.font.includes('BrandSans'));if(row.visible)assert.ok(row.contained,'Glass copy must clear its board before becoming readable');
      if(progress===1){assert.equal(state.opacity,1);assert.equal(row.visible,true);}
    });
    return observed;
  }
  async function inspectHud(spec,time) {
    const hud=spec.content.hud,frame=Math.floor(time*30+1e-7);
    const phases=spec.cues.map(cue=>Math.max(0,Math.min(1,(frame-Math.ceil((cues[cue].start+.4)*30))/24)));
    const state=await page.locator('.scene[aria-hidden="false"] .image-hud').evaluate(host=>{
      const r=host.getBoundingClientRect();
      return {style:host.dataset.hudStyle,progress:+host.dataset.hudProgress,
        rows:[...host.querySelectorAll('.image-hud-readout')].map(row=>{
          const b=row.getBoundingClientRect();return {label:row.querySelector('.image-hud-label')?.textContent,
            value:row.querySelector('.image-hud-value')?.textContent,opacity:+getComputedStyle(row).opacity,
            progress:+row.dataset.hudProgress,emphasis:row.dataset.hudEmphasis,
            contained:b.left>=r.left&&b.right<=r.right&&b.top>=r.top&&b.bottom<=r.bottom,
            font:getComputedStyle(row).fontFamily};
        }),brackets:[...host.querySelectorAll('path')].map(p=>+p.getAttribute('stroke-dashoffset')),
        counter:host.querySelector('.image-hud-counter')?.textContent,clock:host.dataset.hudState?JSON.parse(host.dataset.hudState):null,
        date:host.querySelector('.image-hud-date')?.textContent,mode:host.querySelector('.image-hud-mode')?.textContent,
        battery:host.querySelector('.image-hud-battery')?.getAttribute('aria-label'),
        batteryWidth:host.querySelector('.image-hud-battery>span')?.style.width,
        dot:host.querySelector('.image-hud-record-dot')?+getComputedStyle(host.querySelector('.image-hud-record-dot')).opacity:null};
    });
    assert.equal(state.style,hud.style);assert.ok(Math.abs(state.progress-phases[0])<1e-8);
    assert.ok(state.rows.every(row=>row.contained&&row.font.includes('BrandMono')),'HUD copy must stay in its approved image slot');
    if(hud.style==='telemetry') {
      assert.equal(state.rows.length,hud.readouts.length);
      state.rows.forEach((row,i)=>{
        assert.equal(row.label,hud.readouts[i].label);assert.equal(row.emphasis,String(i===hud.emphasis));
        assert.ok(Math.abs(row.progress-phases[i+1])<1e-8);
        if(phases[i+1]===1){assert.equal(row.value,hud.readouts[i].value);assert.equal(row.opacity,1);}
        if(phases[i+1]===0){assert.equal(row.value,'--');assert.equal(row.opacity,0);}
      });
      if(phases[0]===1)assert.ok(state.brackets.every(offset=>offset===0));
    } else {
      const elapsed=Math.max(0,frame-Math.ceil((cues[spec.cues[0]].start+.4)*30)),seconds=hud.counter_start+Math.floor(elapsed/30);
      const expected=[Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
      assert.equal(state.counter,expected);assert.equal(state.clock.frame,elapsed);
      assert.equal(state.dot,hud.recording?(Math.floor(elapsed*2/33)%2===0?1:.25):0);
      assert.equal(state.date,hud.date);assert.equal(state.battery,`Battery ${hud.battery}%`);assert.equal(state.batteryWidth,hud.battery+'%');
      assert.equal(state.mode,hud.mode+' / '+{landscape:'16:9',portrait:'9:16',square:'1:1','portrait-4x5':'4:5'}[configuration.profile.id]);
    }
    return state;
  }
  async function inspectCarousel(spec,time) {
    const state=await page.locator('.scene[aria-hidden="false"] .carousel-art').evaluate(node=>({
      preset:node.dataset.carouselPreset,time:+node.dataset.carouselTime,settle:+node.dataset.carouselSettle,
      visibility:getComputedStyle(node.querySelector('.carousel-scaler')).visibility,
      centers:[...node.querySelectorAll('.carousel-phrase')].map(n=>({text:n.textContent,font:getComputedStyle(n).fontFamily})),
      cards:[...node.querySelectorAll('.carousel-card')].map(card=>{
        const image=card.querySelector('img'),style=getComputedStyle(card),matrix=new DOMMatrix(style.transform);
        return {image:image.getAttribute('src'),fit:getComputedStyle(image).objectFit,decoded:image.complete&&image.naturalWidth>=32,
          finite:Array.from(matrix.toFloat64Array()).every(Number.isFinite),alpha:+style.opacity,position:[matrix.m41,matrix.m42]};
      })
    }));
    const c=spec.content,slots=c.preset.startsWith('orbit-')||['path-1','path-4','path-5'].includes(c.preset)?24:12;
    const duration=c.preset==='promo-belt'?10:c.preset.startsWith('text-circle-')?5:6;
    const first=Math.ceil((cues[spec.cues[0]].start+.4)*30),stop=Math.ceil((cues[spec.cues[1]].start+.4)*30);
    const frame=Math.floor(time*30+1e-7),elapsed=Math.max(0,frame-first),gap=stop-first;
    const p=Math.max(0,Math.min(1,(elapsed-gap)/24));
    const expected=duration*(Math.min(elapsed,gap)+24*(p-p**3+.5*p**4))/(gap+12);
    assert.equal(state.preset,c.preset);assert.ok(Math.abs(state.time-expected)<1e-9);assert.equal(state.settle,p);
    assert.equal(state.visibility,frame<first?'hidden':'visible');assert.equal(state.cards.length,slots);
    state.cards.forEach((card,index)=>{
      assert.equal(card.image,configuration.assets[c.images[index%c.images.length]]);assert.equal(card.fit,'contain');
      assert.ok(card.decoded&&card.finite);assert.ok(card.alpha>=0&&card.alpha<=1);
      if(c.preset==='promo-belt') {
        const entry=[0,-11.39,-21.64,-30.9,-39.04,-46.29,-52.55,-57.98,-62.72,-66.71,-69.99,-72.75,
          -74.86,-76.52,-77.85,-78.8,-79.36,-79.75,-79.87,-79.94,-80];
        const frame=Math.min(20,expected*25),i=Math.min(19,Math.floor(frame)),u=frame-i;
        const x=[139.1,523.4,907.7,1292,1676.3,2060.6][index%6]+181-93.601*expected+entry[i]+(entry[i+1]-entry[i])*u;
        assert.ok(Math.abs(card.position[0]-x)<.006);assert.equal(card.position[1],190+Math.floor(index/6)*404);
        assert.equal(card.alpha,1);
      }
    });
    assert.equal(state.centers.length,c.center_text?2:0);
    for(const center of state.centers){assert.equal(center.text,c.center_text);assert.ok(center.font.includes('BrandSans'));}
    return {preset:state.preset,time:state.time,settle:state.settle,cards:slots};
  }
  async function inspectDataExtras(spec,time) {
    const c=spec.content,frame=Math.floor(time*30+1e-7);
    const phases=spec.cues.map(cue=>Math.max(0,Math.min(1,(frame-Math.ceil((cues[cue].start+.4)*30))/24)));
    const active=spec.cues.reduce((last,cue,i)=>frame>=Math.ceil((cues[cue].start+.4)*30)?i:last,-1);
    const state=await page.locator('.scene[aria-hidden="false"]').evaluate(scene=>{
      const map=scene.querySelector('.map-board'),combo=scene.querySelector('.combo-board'),picture=scene.querySelector('.map-picture');
      const image=picture?.querySelector('img');
      const flightPlane=map?.querySelector('[data-flight-plane]')?.transform.baseVal.consolidate()?.matrix;
      return {source:scene.querySelector('.data-source,.resource-source').textContent,reference:scene.querySelector('.data-reference')?.textContent,
        specs:[...scene.querySelectorAll('.specs-row')].map(row=>({label:row.querySelector('.specs-label').textContent,
          value:row.querySelector('.specs-value').textContent,progress:+row.dataset.specProgress,alpha:+getComputedStyle(row).opacity,
          rule:new DOMMatrix(getComputedStyle(row.querySelector('.specs-rule')).transform).a})),
        combo:combo?{index:+combo.dataset.comboBeat,width:combo.clientWidth,height:combo.clientHeight,
          bars:[...combo.querySelectorAll('[data-combo-bar]')].map(n=>({value:+n.dataset.comboValue,p:+n.dataset.comboProgress,y:+n.getAttribute('y'),height:+n.getAttribute('height')})),
          line:[...combo.querySelectorAll('[data-combo-line]')].map(n=>({value:+n.dataset.comboValue,p:+n.dataset.comboProgress,y:+n.getAttribute('cy'),alpha:+n.getAttribute('opacity')})),
          legends:[...combo.querySelectorAll('[data-combo-legend]')].map(n=>n.textContent)}:null,
        map:map?{style:map.dataset.mapStyle,index:+map.dataset.mapBeat,progress:+map.dataset.mapProgress,
          spotlight:map.dataset.spotlightState?{state:JSON.parse(map.dataset.spotlightState),
            camera:Array.from(new DOMMatrix(getComputedStyle(map.querySelector('.map-spotlight-camera')).transform).toFloat64Array()),
            strokes:[...map.querySelectorAll('[data-spotlight-stroke]')].map(n=>({length:n.getTotalLength(),offset:+n.getAttribute('stroke-dashoffset')})),
            ink:(()=>{const n=map.querySelector('.map-spotlight-ink');return {x:parseFloat(n.style.left),y:parseFloat(n.style.top),w:parseFloat(n.style.width),h:parseFloat(n.style.height),alpha:+n.style.opacity};})(),
            label:(()=>{const n=map.querySelector('.map-spotlight-label');return {x:n.offsetLeft,y:n.offsetTop,w:n.offsetWidth,h:n.offsetHeight,alpha:+n.style.opacity};})(),
            wash:+map.querySelector('.map-spotlight-wash').style.opacity,scan:+map.querySelector('.map-spotlight-lines').style.opacity,
            corners:[...map.querySelectorAll('[data-spotlight-corner]')].map(n=>+n.getAttribute('opacity')),
          }:null,
          regional:map.dataset.regionalState?{state:JSON.parse(map.dataset.regionalState),
            regions:[...map.querySelectorAll('[data-regional-path]')].map(n=>({code:n.dataset.mapRegion,
              dMatches:n.getAttribute('d')===window.ShortCreatorRegionalGeometry[map.dataset.mapStyle].regions.find(r=>r.code===n.dataset.mapRegion).d,
              fill:n.getAttribute('fill'),alpha:+n.getAttribute('opacity'),stroke:n.getAttribute('stroke'),width:+n.getAttribute('stroke-width'),filter:n.style.filter})),
            labels:[...map.querySelectorAll('[data-regional-label]')].map(n=>({code:n.dataset.regionalLabel,text:n.textContent,
              x:parseFloat(n.style.left),y:parseFloat(n.style.top),w:n.offsetWidth,h:n.offsetHeight,alpha:+n.style.opacity,font:getComputedStyle(n).fontFamily})),
            geometry:window.ShortCreatorRegionalGeometry[map.dataset.mapStyle].regions.map(r=>({code:r.code,name:r.name})),
            credits:[...map.querySelectorAll('.regional-credit-line')].map(n=>n.textContent),
            creditAlpha:+map.querySelector('.regional-credit').style.opacity,
            legend:map.querySelector('.map-scale').textContent,legendAlpha:+map.querySelector('.map-scale').style.opacity,
            sourceAlpha:+scene.querySelector('.data-source').style.opacity,
          }:null,
          world:map.dataset.worldState?{state:JSON.parse(map.dataset.worldState),
            viewBox:picture.querySelector('svg').getAttribute('viewBox'),
            regions:[...map.querySelectorAll('[data-world-region]')].map((n,i)=>({name:n.dataset.mapRegion,value:n.dataset.mapValue,
              dMatches:n.getAttribute('d')===window.ShortCreatorWorldGeometry.regions[i].d,fill:n.getAttribute('fill'),alpha:+n.getAttribute('opacity'),stroke:n.getAttribute('stroke'),
              width:+n.getAttribute('stroke-width'),filter:n.style.filter})),
            geometry:window.ShortCreatorWorldGeometry.regions.map(r=>r.name),
            legend:map.querySelector('.map-scale').textContent,
          }:null,
          flight:map.dataset.flightState?{
            state:JSON.parse(map.dataset.flightState),
            camera:Array.from(new DOMMatrix(getComputedStyle(map.querySelector('.map-flight-plane')).transform).toFloat64Array()),
            plane:[flightPlane.a,flightPlane.b,flightPlane.c,flightPlane.d,flightPlane.e,flightPlane.f],
            routes:[...map.querySelectorAll('[data-flight-route]')].map(n=>({d:n.getAttribute('d'),length:n.getTotalLength(),offset:+n.getAttribute('stroke-dashoffset')})),
            doodles:[...map.querySelectorAll('[data-flight-doodle]')].map(n=>({length:n.getTotalLength(),offset:+n.getAttribute('stroke-dashoffset')})),
            ticks:[...map.querySelectorAll('[data-flight-tick]')].map(n=>({alpha:+n.getAttribute('opacity'),scale:n.transform.baseVal.consolidate().matrix.a})),
            pins:[...map.querySelectorAll('[data-flight-pin]')].map(n=>({alpha:+n.getAttribute('opacity'),scale:n.transform.baseVal.consolidate().matrix.a})),
            pulseAlpha:+map.querySelector('[data-flight-pulse]').getAttribute('opacity'),
            planeAlpha:+map.querySelector('[data-flight-plane]').getAttribute('opacity'),
            position:(()=>{const p=map.querySelector('[data-flight-route="1"]'),s=JSON.parse(map.dataset.flightState),at=p.getPointAtLength(s.travel*p.getTotalLength());return [at.x,at.y];})(),
            tangent:(()=>{const p=map.querySelector('[data-flight-route="1"]'),s=JSON.parse(map.dataset.flightState),length=p.getTotalLength(),distance=s.travel*length;
              const a=p.getPointAtLength(Math.max(0,distance-.5)),b=p.getPointAtLength(Math.min(length,distance+.5));return Math.atan2(b.y-a.y,b.x-a.x);})(),
          }:null,
          label:map.querySelector('.map-label').textContent,value:map.querySelector('.map-value').textContent,
          regions:[...map.querySelectorAll('[data-map-region]')].map(n=>({id:n.dataset.mapRegion,value:n.dataset.mapValue})),
          points:[...map.querySelectorAll('[data-map-point] circle')].map(n=>({r:+n.getAttribute('r'),value:n.dataset.mapValue,p:+n.dataset.mapProgress})),
          flows:[...map.querySelectorAll('[data-map-flow]')].map(n=>({value:+n.dataset.mapValue,p:+n.dataset.mapProgress,
            offset:+n.getAttribute('stroke-dashoffset'),length:n.getTotalLength(),width:+n.getAttribute('stroke-width')})),
          travelers:[...map.querySelectorAll('[data-map-traveler]')].map(n=>({x:+n.getAttribute('cx'),y:+n.getAttribute('cy'),alpha:+n.getAttribute('opacity')})),
          image:image?{src:image.getAttribute('src'),width:image.naturalWidth,height:image.naturalHeight,fit:getComputedStyle(image).objectFit}:null,
          width:picture.clientWidth,height:picture.clientHeight}:null};
    });
    if(spec.kind==='specs') {
      assert.equal(state.source,c.source);
      assert.deepEqual(state.specs.map(r=>({label:r.label,value:r.value})),c.rows);
      state.specs.forEach((row,i)=>{assert.equal(row.progress,phases[i]);if(phases[i]===1){assert.equal(row.alpha,1);assert.equal(row.rule,1);}});
    } else {
      assert.equal(state.reference,c.source.reference);
      assert.equal(state.source,`${c.source.kind.toUpperCase()} / ${c.source.label} / ${c.source.as_of}`);
    }
    if(spec.kind==='combo-chart') {
      const chart=state.combo,n=c.categories.length,base=chart.height-44,span=base-110;assert.equal(chart.index,active);
      chart.bars.forEach((bar,i)=>{
        const height=c.bars.values[i]/c.bars.maximum*span*(1-(1-phases[i])**3);
        assert.equal(bar.value,c.bars.values[i]);assert.equal(bar.p,phases[i]);
        assert.ok(Math.abs(bar.height-height)<1e-7&&Math.abs(bar.y-(base-height))<1e-7);
      });
      chart.line.forEach((dot,i)=>{
        assert.equal(dot.value,c.line.values[i]);assert.equal(dot.p,phases[n+i]);assert.equal(dot.alpha,phases[n+i]);
        assert.ok(Math.abs(dot.y-(base-c.line.values[i]/c.line.maximum*span))<1e-7);
      });
      if(phases.every(p=>p===1))assert.deepEqual(chart.legends,[`${c.bars.label} / ${c.bars.values.at(-1)} ${c.bars.unit}`,`${c.line.label} / ${c.line.values.at(-1)} ${c.line.unit}`]);
    }
    if(spec.kind==='map-story') {
      const map=state.map;assert.equal(map.style,c.style);assert.equal(map.index,active);
      if(['us-hex','world','spain','us'].includes(c.style)) {
        assert.equal(map.regions.length,c.style==='world'?177:c.style==='spain'?19:c.style==='us'?50:51);
        const values=new Map(c.values.map(v=>[v.region,String(v.value)]));
        for(const region of map.regions)assert.equal(region.value,values.get(region.id)??'missing');
        if(c.style==='spain'||c.style==='us') {
          const o=map.regional,s=o.state,es=c.style==='spain',count=es?19:50;
          const elapsed=(frame-Math.ceil((cues[spec.cues[0]].start+.4)*30))/30;
          const age=active>0?(frame-Math.ceil((cues[spec.cues[active]].start+.4)*30))/30:-1;
          const clamp=p=>Math.max(0,Math.min(1,p)),out=p=>1-(1-clamp(p))**3;
          const pulse=age<0?0:age<.5?out(age/.5):1-clamp((age-.5)/.5)**3;
          assert.equal(s.elapsed,elapsed);assert.equal(s.active,active);assert.equal(s.focus,active>0?c.focus[active-1]:null);
          assert.ok(Math.abs(s.highlight-pulse)<1e-9);
          assert.equal(o.legend,`0 / ${c.maximum} ${c.unit} / blank = no data`);
          assert.equal(o.creditAlpha,elapsed>=1?1:0);
          // CSSOM serializes opacity to six significant digits; SVG numbers retain double precision.
          assert.ok(Math.abs(o.legendAlpha-out((elapsed-(es?5.5:5))/.6))<=.0000005);
          assert.ok(Math.abs(o.sourceAlpha-out((elapsed-(es?6:5.5))/.5))<=.0000005);
          assert.deepEqual(o.credits,es?[
            'Derived IGN administrative boundaries / es-atlas 0.6.0 / edition unspecified',
            'CC BY 4.0 / ign.es / creativecommons.org/licenses/by/4.0']:[
            'Geometry: 2017 U.S. Census boundaries / adapted via us-atlas 3.0.1',
            'Albers USA projection / Alaska and Hawaii insets']);
          const order=[...o.geometry].sort((a,b)=>(values.has(a.code)?+values.get(a.code):Infinity)-(values.has(b.code)?+values.get(b.code):Infinity)||o.geometry.indexOf(a)-o.geometry.indexOf(b));
          assert.deepEqual(o.regions.map(r=>r.code),order.map(r=>r.code));
          const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),base=rgb(s.background),accent=rgb(s.accent);
          const breaks=es?[0,.5,1]:[0,.33,.66,1],mixes=es?[.2,.6,1]:[.2,.45,.7,1];
          const stops=mixes.map(t=>base.map((v,i)=>Math.round(v+(accent[i]-v)*t)));
          o.regions.forEach((r,i)=>{
            assert.equal(r.dMatches,true);
            const rank=(Math.abs(i-(count-1)/2)-(count%2?0:.5))/((count-1)/2-(count%2?0:.5));
            const p=clamp((elapsed-1-rank*(count-1)*(es?.08:.06))/.4);
            assert.ok(Math.abs(r.alpha-clamp(1+2.4*(p-1)**3+1.4*(p-1)**2))<1e-9);
            const strength=r.code===s.focus?pulse:0,stroke=es?.8:1.2;
            assert.ok(Math.abs(r.width-(stroke+(2.5-stroke)*strength))<1e-9);
            assert.equal(r.stroke,strength>0?'white':s.background);
            assert.ok(Math.abs(Number(r.filter.match(/^brightness\(([^)]+)\)/)[1])-(1+(es?.5:.6)*strength))<1e-5);
            if(values.has(r.code)) {
              const t=+values.get(r.code)/c.maximum,index=t<=breaks[1]?0:t<=breaks[2]?1:2,p=(t-breaks[index])/(breaks[index+1]-breaks[index]);
              assert.equal(r.fill,`rgb(${stops[index].map((v,j)=>Math.round(v+(stops[index+1][j]-v)*p)).join(',')})`);
            } else assert.equal(r.fill,s.background);
            const n=o.labels[i];assert.equal(n.code,r.code);assert.equal(n.text,r.code);assert.ok(n.font.includes('BrandSans'));
            assert.ok(Math.abs(n.alpha-out((elapsed-(es?4:3.5)-rank*(count-1)*(es?.05:.04))/.3))<=.0000005);
            assert.ok(n.x>=0&&n.y>=0&&n.x+n.w<=map.width&&n.y+n.h<=map.height,'Regional labels stay within the map surface');
            for(const other of o.labels.slice(0,i))assert.ok(n.x+n.w<=other.x||other.x+other.w<=n.x||n.y+n.h<=other.y||other.y+other.h<=n.y,'Regional labels do not overlap');
          });
        }
        if(c.style==='world') {
          const world=map.world,s=world.state,elapsed=(frame-Math.ceil((cues[spec.cues[0]].start+.4)*30))/30;
          assert.equal(world.viewBox,'0 0 1380 700');assert.equal(s.elapsed,elapsed);assert.equal(s.active,active);
          assert.equal(s.focus,active>0?c.focus[active-1]:null);
          assert.equal(world.legend,`0 / ${c.maximum} ${c.unit} / blank = no data`);
          const clamp=p=>Math.max(0,Math.min(1,p)),out=(p,n=3)=>1-(1-clamp(p))**n;
          const smooth=p=>p<.5?4*p**3:1-(-2*p+2)**3/2;
          const age=active>0?(frame-Math.ceil((cues[spec.cues[active]].start+.4)*30))/30:-1;
          const pulse=age<0?0:age<.4?out(age/.4):1-smooth(clamp((age-.4)/.6));
          assert.ok(Math.abs(s.highlight-pulse)<1e-9);
          const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),base=rgb(s.background),accent=rgb(s.accent);
          world.regions.forEach((region,i)=>{
            assert.equal(region.name,world.geometry[i]);assert.equal(region.dMatches,true);
            const delay=Math.abs(i-88)*.04,entry=out((elapsed-1-delay)/.3,2);
            assert.ok(Math.abs(region.alpha-entry)<1e-9,'Source center-out region stagger');
            const strength=region.name===s.focus?pulse:0;
            assert.ok(Math.abs(region.width-(.6+1.2*strength))<1e-9);
            assert.equal(region.stroke,strength>0?'white':'var(--purple)');
            assert.ok(Math.abs(Number(region.filter.slice(11,-1))-(1+.5*strength))<1e-5);
            if(values.has(region.name)) {
              const stops=[.2,.45,.7,1].map(t=>base.map((v,j)=>Math.round(v+(accent[j]-v)*t)));
              const at=3*Number(region.value)/c.maximum,index=Math.min(2,Math.floor(at)),p=at-index;
              const expected=stops[index].map((v,j)=>Math.round(v+(stops[index+1][j]-v)*p));
              assert.equal(region.fill,`rgb(${expected.join(',')})`);
            } else assert.equal(region.fill,s.background);
          });
        }
      } else {
        assert.equal(map.image.src,configuration.assets[c.image]);assert.equal(map.image.fit,'contain');assert.ok(map.image.width>=32&&map.image.height>=32);
        const fit=Math.min(map.width/map.image.width,map.height/map.image.height),extent=Math.min(map.image.width,map.image.height)*fit;
        if(c.style==='bubbles')map.points.forEach((point,i)=>{
          assert.equal(+point.value,c.points[i].value);assert.equal(point.p,phases[i+1]);
          if(phases[i+1]===0||phases[i+1]===1)assert.ok(Math.abs(point.r-extent*.06*Math.sqrt(c.points[i].value/c.maximum)*phases[i+1])<1e-7);
        });
        else if(c.style==='flows')map.flows.forEach((flow,i)=>{
          assert.equal(flow.value,c.flows[i].value);assert.equal(flow.p,phases[i+1]);
          assert.ok(Math.abs(flow.width-(1.5+c.flows[i].value/c.maximum*2.5))<1e-7);
          assert.ok(flow.offset>=0&&flow.offset<=flow.length+1e-7);
          const dot=map.travelers[i];assert.ok(Number.isFinite(dot.x)&&Number.isFinite(dot.y)&&dot.alpha>=0&&dot.alpha<=1);
          if(phases[i+1]===1){assert.equal(flow.offset,0);assert.equal(dot.alpha,0);}
        });
      }
      let label='',value='';
      if(c.style==='flight') {
        const flight=map.flight,s=flight.state,at=presentationTime(spec,time,5.62);
        assert.ok(Math.abs(s.time-at)<1e-8,'Flight follows the shared finite caption clock');
        const local=(start,duration)=>Math.max(0,Math.min(1,(at-start)/duration));
        assert.ok(Math.abs(s.travel-(1-Math.cos(Math.PI*local(1.17,3.25)))/2)<1e-9);
        assert.equal(flight.routes.length,3);assert.equal(flight.doodles.length,2);assert.equal(flight.ticks.length,6);assert.equal(flight.pins.length,2);
        const size=Math.min(map.width/map.image.width,map.height/map.image.height),w=size*map.image.width,h=size*map.image.height;
        for(const [key,index] of [['from',0],['to',1]]) {
          assert.ok(Math.abs(s.curve[key].x-((map.width-w)/2+c.points[index].x*w))<1e-7);
          assert.ok(Math.abs(s.curve[key].y-((map.height-h)/2+c.points[index].y*h))<1e-7);
        }
        for(const p of Object.values(s.curve))assert.ok(p.x>=s.box.x&&p.x<=s.box.x+s.box.width&&p.y>=s.box.y&&p.y<=s.box.y+s.box.height);
        flight.routes.forEach((route,i)=>assert.ok(Math.abs(route.offset-route.length*(1-s.draw[i]))<1e-6));
        flight.doodles.forEach((ring,i)=>assert.ok(Math.abs(ring.offset-ring.length*(1-s.doodles[i]))<1e-6));
        flight.ticks.forEach((tick,i)=>{assert.equal(tick.alpha,s.ticks[i].alpha);assert.ok(Math.abs(tick.scale-s.unit*s.ticks[i].scale)<1e-6);});
        flight.pins.forEach((pin,i)=>{assert.equal(pin.alpha,s.pins[i].alpha);assert.ok(Math.abs(pin.scale-s.unit*s.pins[i].scale)<1e-6);});
        assert.ok(Math.abs(flight.plane[4]-flight.position[0])<1e-4&&Math.abs(flight.plane[5]-flight.position[1])<1e-4);
        assert.ok(Math.abs(Math.hypot(flight.plane[0],flight.plane[1])-s.unit*s.plane.scale)<1e-6);
        assert.ok(Math.abs(Math.atan2(flight.plane[1],flight.plane[0])-flight.tangent)<1e-6,'Plane follows the path tangent');
        assert.equal(flight.planeAlpha,s.plane.alpha);assert.equal(flight.pulseAlpha,s.pulse.alpha);
        assert.ok(Math.abs(flight.camera[0]-s.camera.scale)<1e-5&&Math.abs(flight.camera[12]-s.camera.x*s.unit)<1e-4);
        if(s.time>=4.42)assert.ok(Math.hypot(flight.position[0]-s.curve.to.x,flight.position[1]-s.curve.to.y)<.001);
        if(s.time>=5.62-1e-8){assert.equal(s.travel,1);assert.equal(s.pulse.alpha,0);assert.ok(Math.abs(s.badge.scale-1)<1e-8);}
        label=active<0?'':`${c.points[0].label} → ${c.points[1].label}`;value=s.time<5.02?'':c.arrival;
      } else if(c.style==='spotlight') {
        const o=map.spotlight,s=o.state,g=s.geometry,at=presentationTime(spec,time,6.55);
        assert.ok(Math.abs(s.time-at)<1e-8,'Spotlight uses the shared native clock');
        const scale=Math.min(map.width/map.image.width,map.height/map.image.height),w=map.image.width*scale,h=map.image.height*scale;
        assert.ok(Math.abs(g.region.width-c.region.width*w*s.camera.scale)<1e-7&&Math.abs(g.region.height-c.region.height*h*s.camera.scale)<1e-7);
        assert.ok(Math.abs(g.region.x-(((map.width-w)/2+c.region.x*w)*s.camera.scale+g.camera.x))<1e-7);
        assert.ok(Math.abs(g.region.y-(((map.height-h)/2+c.region.y*h)*s.camera.scale+g.camera.y))<1e-7);
        assert.ok(Math.abs(o.camera[0]-s.camera.scale)<1e-5&&Math.abs(o.camera[12]-g.camera.x)<.01&&Math.abs(o.camera[13]-g.camera.y)<.01);
        for(const [key,target] of [['x',g.ink.x],['y',g.ink.y],['w',g.ink.width],['h',g.ink.height]])assert.ok(Math.abs(o.ink[key]-target)<.01);
        assert.ok(Math.abs(o.ink.alpha-s.annotation.alpha)<1e-6);
        assert.equal(o.strokes.length,2);o.strokes.forEach((p,i)=>assert.ok(Math.abs(p.offset-p.length*(1-s.draw[i]))<1e-6));
        assert.ok(Math.abs(o.label.alpha-s.label.alpha)<1e-6&&Math.abs(o.wash-s.wash)<1e-6&&Math.abs(o.scan-s.scan)<1e-6);
        assert.equal(o.corners.length,4);o.corners.forEach((alpha,i)=>assert.ok(Math.abs(alpha-s.corners[i].alpha)<1e-6));
        if(o.label.alpha>0)assert.ok(o.label.x>=0&&o.label.y>=0&&o.label.x+o.label.w<=map.width&&o.label.y+o.label.h<=map.height,'Spotlight label stays in the native map slot');
        label=c.label;
      } else if(active>0) {
        if(['us-hex','world','spain','us'].includes(c.style)){
          const code=c.focus[active-1];value=c.values.find(v=>v.region===code).value;
          label=map.regional?`${code} / ${map.regional.geometry.find(r=>r.code===code).name}`:code;
        }
        else if(c.style==='bubbles'){label=`${active}. ${c.points[active-1].label}`;value=c.points[active-1].value;}
        else {const flow=c.flows[active-1];label=`${c.points[flow.from].label} → ${c.points[flow.to].label}`;value=flow.value;}
        value=String(value)+' '+c.unit;
      }
      assert.equal(map.label,label);assert.equal(map.value,value);
    }
    return {kind:spec.kind,active,phases};
  }
  for(const [i,scene] of scenes.entries()) {
    const pixels=await seekCheck(scene.end-.5,scene.start,scene.name);
    fs.writeFileSync(path.join(out,`scene-${i+1}.png`),pixels,{flag:'wx'});
    report.scenes.push({...scene,composition:episode.scenes[i].kind,sha256:sha(pixels)});
    if(episode.scenes[i].kind==='chart') {
      const record=episode.scenes[i].content.record;
      const observed=await page.locator('.scene[aria-hidden="false"]').evaluate(node=>({
        progress:node.querySelector('[data-chart-progress]').dataset.chartProgress,
        values:[...node.querySelectorAll('[data-chart-value]')].map(label=>label.textContent),
        metric:node.querySelector('[data-metric-final]')?[...node.querySelectorAll('[data-metric-final]')].map(n=>n.textContent).join(''):
          node.querySelector('[data-chart-metric]')?.textContent,
        marks:[...node.querySelectorAll('[data-chart-mark]')].map(mark=>({
          height:+mark.getAttribute('height'),y:+mark.getAttribute('y'),cy:+mark.getAttribute('cy'),opacity:mark.getAttribute('opacity')})),
        callout:node.querySelector('[data-chart-callout]')?.textContent,
        source:node.querySelector('.chart-source').textContent,reference:node.querySelector('.chart-reference').textContent
      }));
      assert.ok(observed.progress.split(',').every(value=>+value===1),'Chart did not finish');
      assert.equal(observed.reference,record.source.reference);
      assert.equal(observed.source,`${record.source.kind.toUpperCase()} / ${record.source.label} / ${record.source.as_of}`);
      if(record.kind==='metric')assert.equal(observed.metric,String(record.data.value));
      if(record.kind==='bar'||record.kind==='line') {
        assert.deepEqual(observed.values,record.data.series[0].values.map(String));
        assert.equal(observed.callout,String(record.data.series[0].values.at(-1))+' '+record.data.unit);
        const values=record.data.series[0].values,maximum=Math.max(1,...values);
        observed.marks.forEach((mark,index)=>{
          const base=geometry.plot[3]-92,expected=values[index]/maximum*(base-96);
          if(record.kind==='bar'){
            assert.ok(Math.abs(mark.height-expected)<1e-6);assert.ok(Math.abs(mark.y-(base-expected))<1e-6);
          } else {assert.ok(Math.abs(mark.cy-(base-expected))<1e-6);assert.equal(mark.opacity,'1');}
        });
      }
      report.scenes.at(-1).data_check=observed;
    }
    const spec=episode.scenes[i];
    if(spec.kind==='screen'&&spec.content.lens==='filmed')report.scenes.at(-1).filmed_screen=await inspectFilmedScreen(spec,scene.end-.5);
    if(spec.kind==='title'&&spec.content.reveal==='colorama-wipe')report.scenes.at(-1).colorama=await inspectColorama(spec,scene.end-.5);
    if(spec.kind==='screen'&&spec.content.swap==='beat-freeze')report.scenes.at(-1).beat_freeze=await inspectBeatFreeze(spec,scene.end-.5);
    if(spec.kind==='interface'&&exchangeVariants.includes(spec.content.variant))report.scenes.at(-1).chat_exchange=await inspectChatExchange(spec,scene.end-.5);
    if(spec.kind==='interface'&&spec.content.variant==='note-scroll')report.scenes.at(-1).note_scroll=await inspectNoteScroll(spec,scene.end-.5);
    if(spec.kind==='interface'&&spec.content.variant==='answer-rank')report.scenes.at(-1).answer_rank=await inspectAnswerRank(spec,scene.end-.5);
    if((spec.kind==='interface'&&spec.content.variant==='text-select')||(spec.kind==='media-grid'&&spec.content.treatment==='collaborators'))
      report.scenes.at(-1).cursor_scene=await inspectCursorScene(spec,scene.end-.5);
    if(spec.kind==='chart'&&['grid-stat','soft-stat','sticker-stat','rail-stat'].includes(spec.content.metric_style))
      report.scenes.at(-1).stat_card=await inspectStatCard(spec,scene.end-.5);
    if(spec.kind==='data-story'&&spec.content.style==='decline')report.scenes.at(-1).decline=await inspectDecline(spec,scene.end-.5);
    if(spec.kind==='cta'&&spec.content.style==='character-walk')report.scenes.at(-1).character_walk=await inspectCharacterWalk(spec,scene.end-.5);
    if(spec.kind==='cta'&&spec.content.style==='creator-intro')report.scenes.at(-1).creator_intro=await inspectCreatorIntro(spec,scene.end-.5);
    if(spec.kind==='cta'&&spec.content.style==='cursor-rays')report.scenes.at(-1).cursor_rays=await inspectCursorRays(spec,scene.end-.5);
    if(spec.kind==='cta'&&['logo-intro','logo-assemble','badge-pair','logo-collide'].includes(spec.content.style))
      report.scenes.at(-1).brand_lockup=await inspectBrandLockup(spec,scene.end-.5);
    if(spec.kind==='media-grid'&&['album-card','preview-sheet','steam-window','grade-split'].includes(spec.content.treatment))
      report.scenes.at(-1).presentation=await inspectPresentation(spec,scene.end-.5);
    if(spec.kind==='lower-third'&&spec.content.variant==='news-ticker')
      report.scenes.at(-1).ticker=await inspectNewsTicker(spec,scene.end-.5);
    if(spec.kind==='source-stage')report.scenes.at(-1).source_stage=await inspectSourceStage(spec,scene.end-.5);
    if(spec.kind==='spatial-stage')report.scenes.at(-1).spatial_object=await inspectSpatialObject(spec,scene.end-.5);
    if(spec.kind==='kinetic'&&spec.content.style&&spec.content.style!=='standard')report.scenes.at(-1).kinetic_preset=await inspectKineticPreset(spec,scene.end-.5);
    if(['map-story','combo-chart','specs'].includes(spec.kind))report.scenes.at(-1).data_extras=await inspectDataExtras(spec,scene.end-.5);
    if(spec.kind==='media-grid'&&['depth-card','scrub-stack','device-splay','dolly-depth-in','dolly-depth-out','phone-trio'].includes(spec.content.treatment))
      report.scenes.at(-1).spatial_check=await inspectSpatial(spec,scene.end-.5);
    if(spec.kind==='media-carousel') {
      report.scenes.at(-1).carousel_check=await inspectCarousel(spec,scene.end-.5);
      const first=Math.ceil((cues[spec.cues[0]].start+.4)*30),last=Math.ceil((cues[spec.cues[1]].start+.4)*30)+24;
      const trajectory=[];
      for(let frame=first;frame<=last;frame+=15) {
        const time=frame/30;if(time>=scene.end-.4)continue;
        const pixels=await seekCheck(time,scene.start,scene.name+' carousel trajectory frame '+frame);
        assert.deepEqual(await inspect(),[],scene.name+' carousel trajectory');
        trajectory.push({frame,sha256:sha(pixels),...await inspectCarousel(spec,time)});
      }
      report.scenes.at(-1).carousel_trajectory=trajectory;
    }
    if(spec.kind==='data-story'||spec.kind==='network') {
      const c=spec.content;
      const state=await page.locator('.scene[aria-hidden="false"]').evaluate(node=>({
        style:node.querySelector('.data-board').dataset.dataStyle,
        source:node.querySelector('.data-source').textContent,reference:node.querySelector('.data-reference').textContent,
        index:Number(node.querySelector('.data-board').dataset.dataIndex),
        progress:Number(node.querySelector('.data-board').dataset.dataProgress),
        period:node.querySelector('[data-data-period]')?.textContent,
        series:[...node.querySelectorAll('g[data-data-series]')].map(n=>({
          label:n.querySelector('[data-data-label]').textContent,value:n.querySelector('[data-data-value]').textContent,
          rank:Number(n.dataset.dataRank),width:Number(n.querySelector('rect').getAttribute('width'))})),
        dots:[...node.querySelectorAll('circle[data-data-series]')].map(n=>({series:+n.dataset.dataSeries,index:+n.dataset.dataIndex,
          value:+n.dataset.dataValue,cy:+n.getAttribute('cy'),opacity:+n.getAttribute('opacity')})),
        legends:[...node.querySelectorAll('[data-data-legend]')].map(n=>n.textContent),
        nodes:[...node.querySelectorAll('[data-network-node]')].map(n=>({text:n.textContent,progress:+n.dataset.networkProgress,visible:getComputedStyle(n).visibility==='visible'})),
        links:[...node.querySelectorAll('[data-network-parent]')].map(n=>({parent:+n.dataset.networkParent,offset:+n.getAttribute('stroke-dashoffset')})),
        width:node.querySelector('.data-board').clientWidth,height:node.querySelector('.data-board').clientHeight
      }));
      assert.equal(state.style,c.style);assert.equal(state.reference,c.source.reference);
      assert.equal(state.source,`${c.source.kind.toUpperCase()} / ${c.source.label} / ${c.source.as_of}`);
      if(spec.kind==='network') {
        assert.deepEqual(state.nodes.map(n=>n.text),c.nodes.map(n=>n.label));assert.ok(state.nodes.every(n=>n.progress===1));
        assert.ok(state.nodes.every(n=>n.visible),'Every supplied network label must be readable at rest');
        assert.deepEqual(state.links.map(n=>n.parent),c.nodes.slice(1).map(n=>n.parent));assert.ok(state.links.every(n=>n.offset===0));
      } else {
        assert.equal(state.index,c.categories.length-1);assert.equal(state.progress,1);
        const maximum=Math.max(1,...c.series.flatMap(s=>s.values));
        if(c.style==='ranking') {
          assert.equal(state.period,c.categories.at(-1));
          const order=c.series.map((s,j)=>({index:j,value:s.values.at(-1)})).sort((a,b)=>b.value-a.value||a.index-b.index);
          state.series.forEach((row,j)=>{
            assert.equal(row.label,c.series[j].label);assert.equal(row.value,String(c.series[j].values.at(-1)));
            assert.equal(row.rank,order.findIndex(item=>item.index===j));
            assert.ok(Math.abs(row.width-c.series[j].values.at(-1)/maximum*(state.width-410))<1e-6);
          });
        } else if(c.style==='value-lanes') {
          await inspectValueLanes(spec,scene.end-.5);
          assert.equal(state.period,c.categories.at(-1));
        } else {
          assert.deepEqual(state.legends,c.series.map(s=>s.label+' / '+String(s.values.at(-1))));
          assert.equal(state.dots.length,c.series.length*c.categories.length);
          state.dots.forEach(dot=>{
            const value=c.series[dot.series].values[dot.index],base=state.height-62;
            assert.equal(dot.value,value);assert.equal(dot.opacity,1);
            assert.ok(Math.abs(dot.cy-(base-value/maximum*(base-94)))<1e-6);
          });
        }
      }
      report.scenes.at(-1).data_story_check=state;
    }
    if(spec.kind==='annotation') {
      const state=await page.locator('.scene[aria-hidden="false"]').evaluate(node=>({
        image:node.querySelector('.annotation-board>img').getAttribute('src'),label:node.querySelector('.annotation-label').textContent,
        index:+node.querySelector('.annotation-board').dataset.annotationIndex,progress:+node.querySelector('.annotation-board').dataset.annotationProgress,
        draws:[...node.querySelectorAll('[data-annotation-draw]')].map(n=>+n.dataset.annotationDraw),
        handwritten:[...node.querySelectorAll('[data-annotation-ink]')].map(n=>({
          style:n.dataset.annotationStyle,stroke:n.dataset.annotationStroke,ink:+n.dataset.annotationInk,
          bounds:JSON.parse(n.dataset.annotationBounds),region:JSON.parse(n.dataset.annotationRegion)})),
        pointer:node.querySelector('[data-annotation-cursor]').dataset.annotationPointer,
        penExited:node.querySelector('[data-annotation-cursor]').getBoundingClientRect().top>=node.querySelector('.annotation-board').getBoundingClientRect().bottom,
        masks:[...document.querySelectorAll('.annotation-overlay mask')].map(n=>n.id),
        tip:JSON.parse(node.querySelector('[data-annotation-cursor]').dataset.annotationTip),height:node.querySelector('.annotation-board').clientHeight
      }));
      assert.equal(state.image,configuration.assets[spec.content.image]);assert.equal(state.label,spec.content.marks.at(-1).label);
      assert.equal(state.index,spec.content.marks.length-1);assert.equal(state.progress,1);assert.ok(state.draws.every(p=>p===1));
      const lastMark=spec.content.marks.at(-1),inspection=['scan-gate','segmentation-flood'].includes(lastMark.style);
      assert.equal(state.pointer,inspection?'none':lastMark.pointer||'cursor');
      assert.equal(new Set(state.masks).size,state.masks.length,'Annotation mask IDs must be unique across scenes');
      if(state.pointer==='pen')assert.ok(state.penExited,'Entire pen must exit the board');
      const handwritten=spec.content.marks.filter(mark=>mark.style.startsWith('hand-'));
      assert.equal(state.handwritten.length,handwritten.length);
      state.handwritten.forEach((mark,i)=>{
        assert.equal(mark.style,handwritten[i].style);assert.equal(mark.stroke,handwritten[i].stroke||'plain');assert.equal(mark.ink,1);
        const b=mark.bounds,r=mark.region;
        assert.ok(Object.values(b).every(Number.isFinite));
        assert.ok(b.x>=r.x&&b.y>=r.y&&b.x+b.width<=r.x+r.width+1e-6&&b.y+b.height<=r.y+r.height+1e-6,'Ink geometry must fit the supplied region');
      });
      assert.ok(state.tip.y>state.height,'Cursor must exit physically');report.scenes.at(-1).annotation_check=state;
      const inspections=await page.locator('.scene[aria-hidden="false"] [data-inspection-state]').evaluateAll(paths=>paths.map(path=>{
        const b=path.getBBox();return {style:path.dataset.annotationInspection,state:JSON.parse(path.dataset.inspectionState),
          region:JSON.parse(path.dataset.annotationRegion),bounds:{x:b.x,y:b.y,width:b.width,height:b.height}};
      }));
      assert.equal(inspections.length,spec.content.marks.filter(mark=>['scan-gate','segmentation-flood'].includes(mark.style)).length);
      for(const {style,state:s,region:r,bounds:b} of inspections) {
        assert.equal(s.progress,1);assert.equal(s.label,1);
        assert.ok(b.x>=r.x&&b.y>=r.y&&b.x+b.width<=r.x+r.width&&b.y+b.height<=r.y+r.height,'Inspection must finish on the supplied region');
        if(style==='scan-gate'){assert.equal(s.corners,1);assert.equal(s.sweepOpacity,0);assert.equal(s.pulseOpacity,0);}
        else {assert.equal(s.visible,s.rows);assert.equal(s.bracket,1);assert.equal(s.flicker,0);}
      }
      report.scenes.at(-1).inspection_checks=inspections;
    }
    if(spec.kind==='media-grid'&&spec.content.hud)report.scenes.at(-1).hud_check=await inspectHud(spec,scene.end-.5);
    if(spec.kind==='interaction') {
      const observed=await page.locator('.scene[aria-hidden="false"] .interaction-board').evaluate(node=>({
        state:JSON.parse(node.dataset.interactionState),geometry:JSON.parse(node.dataset.interactionGeometry),
        before:node.querySelector('.interaction-still').getAttribute('src'),
        after:node.querySelector('.interaction-result')?.getAttribute('src'),
        afterVisible:node.querySelector('.interaction-result')?.style.visibility,
        menu:node.querySelector('.interaction-menu')?.style.opacity,
        pointer:JSON.parse(node.dataset.pointerStyle||'{}'),camera:JSON.parse(node.dataset.interactionCamera||'null'),
        actor:node.querySelector('.pointer-agent-name')?.textContent,actorStatus:node.querySelector('.pointer-agent-status')?.textContent,
        items:[...node.querySelectorAll('.interaction-menu-item')].map(row=>row.textContent)
      }));
      const {state,geometry}=observed,c=spec.content;
      assert.equal(observed.before,configuration.assets[c.image]);assert.equal(state.exit,1);
      assert.equal(state.result,c.style!=='marquee');
      if(c.style==='marquee')assert.deepEqual(state.rect,geometry.r);
      else {assert.equal(observed.after,configuration.assets[c.result]);assert.equal(observed.afterVisible,'visible');}
      if(state.touch)assert.equal(state.contactOpacity,0);else assert.ok(state.tip.y>geometry.H,'Interaction cursor must exit physically');
      if(c.style==='menu'){assert.equal(observed.menu,'0');assert.deepEqual(observed.items,c.items);}
      if(c.pointer&&c.pointer!=='arrow')assert.equal(observed.pointer.style,c.pointer);
      if(c.pointer==='echo')assert.ok(observed.pointer.echoes.every(e=>e.opacity===0));
      if(c.pointer==='agent'){assert.equal(observed.actor,c.actor);assert.equal(observed.actorStatus,c.label);assert.equal(observed.pointer.tag.opacity,0);}
      if(c.camera)assert.deepEqual(observed.camera,{x:0,y:0,z:1});
      report.scenes.at(-1).interaction_check=observed;
    }
    if(spec.kind==='interface'&&spec.content.variant==='app-install')report.scenes.at(-1).app_install=await inspectAppInstall(spec,scene.end-.5);
    if(spec.kind==='interface'&&spec.content.variant==='product-canvas')report.scenes.at(-1).product_canvas=await inspectProductCanvas(spec,scene.end-.5);
    if(spec.kind==='interface'&&spec.content.variant==='ui-3d-reveal')report.scenes.at(-1).ui_reveal=await inspectUIReveal(spec,scene.end-.5);
    if(spec.kind==='interface'&&spec.content.variant==='liquid-panels')report.scenes.at(-1).liquid_panels=await inspectLiquidPanels(spec,scene.end-.5,true);
    if(spec.kind==='interface'&&spec.content.variant==='portal-panels')report.scenes.at(-1).portal_panels=await inspectPortalPanels(spec,scene.end-.5,true);
    if(spec.kind==='interface'&&spec.content.variant==='shatter-panels')report.scenes.at(-1).shatter_panels=await inspectShatterPanels(spec,scene.end-.5,true);
    if(spec.kind==='interface'&&spec.content.variant==='glass-parallax')report.scenes.at(-1).glass_parallax=await inspectGlassParallax(spec,scene.end-.5);
    if(spec.kind==='interface'&&!['answer-rank','note-scroll','product-canvas','app-install','ui-3d-reveal','liquid-panels','portal-panels','shatter-panels','glass-parallax',...exchangeVariants].includes(spec.content.variant)) {
      const observed=await page.locator('.scene[aria-hidden="false"]').evaluate(node=>({
        style:node.querySelector('.interface-board').dataset.interfaceStyle,
        heading:node.querySelector('.prod-heading').textContent,source:node.querySelector('.interface-source').textContent,
        typing:JSON.parse(node.querySelector('.interface-board').dataset.typingState||'null'),
        presentation:JSON.parse(node.querySelector('.interface-board').dataset.interfacePresentation||'null'),
        rows:[...node.querySelectorAll('.interface-row')].map(row=>({
          label:row.querySelector('.interface-label').textContent,body:row.querySelector('.interface-body').textContent,
          progress:Number(row.dataset.interfaceProgress),side:row.dataset.side,enabled:row.dataset.enabled,
          feedback:row.dataset.feedbackState,badge:row.querySelector('.interface-feedback-badge')?.textContent,
          context:row.querySelector('.social-context')?.textContent,action:row.querySelector('.social-action')?.textContent,
          visible:getComputedStyle(row).visibility==='visible',caret:row.querySelector('.interface-caret')?.style.visibility}))}));
      assert.equal(observed.style,spec.content.style);assert.equal(observed.heading,spec.content.heading);assert.equal(observed.source,spec.content.source);
      assert.equal(observed.rows.length,spec.content.items.length);
      if(spec.content.typing_indicator){assert.equal(observed.typing.index,-1);assert.equal(observed.typing.opacity,0);}
      observed.rows.forEach((row,j)=>{
        const item=spec.content.items[j];
        assert.equal(row.label,(spec.content.style==='terminal'?'$ ':'')+item.label);assert.equal(row.body,item.body);
        const currentOnly=(['steps','social'].includes(spec.content.style)&&!['signup-flow','beat-sequence','liquid-widgets'].includes(spec.content.variant))||['peek-stack','text-select'].includes(spec.content.variant);
        assert.equal(row.progress,1);assert.equal(row.visible,!currentOnly||j===observed.rows.length-1);
        if(spec.content.style==='social') {
          assert.equal(row.context,item.context);assert.equal(row.action,item.action.after);
        }
        if(spec.content.style==='settings')assert.equal(row.enabled,String(item.enabled));
        if(spec.content.style==='chat')assert.equal(row.side,item.side);
        if(spec.content.style==='terminal')assert.equal(row.caret,'hidden');
        if(spec.content.style==='notes'&&spec.content.variant!=='text-select')assert.equal(row.caret,'hidden');
        if(spec.content.style==='feedback'){assert.equal(row.feedback,item.state);assert.equal(row.badge,item.state.toUpperCase());}
      });
      if(spec.content.variant||['notes','feedback'].includes(spec.content.style)) {
        assert.equal(observed.presentation.variant,spec.content.variant||spec.content.style);
        assert.equal(observed.presentation.active,spec.content.items.length-1);
        if(observed.presentation.navigation)assert.equal(observed.presentation.navigation.position,spec.content.items.length-1);
        if(spec.content.variant==='skeleton')assert.deepEqual(observed.presentation.rows.at(-1).skeleton,{shimmer:1,gone:1,ink:1});
        if(spec.content.style==='feedback')assert.ok(observed.presentation.rows.every(r=>r.feedback.hint===1&&r.feedback.badge===1&&r.feedback.x===0));
      }
      report.scenes.at(-1).interface_check=observed;
      if(['liquid-glass','liquid-widgets'].includes(spec.content.variant))report.scenes.at(-1).liquid_glass=await inspectLiquidGlass(spec,scene.end-.5);
    }
    if(spec.kind==='backdrop') {
      const observed=await page.locator('.scene[aria-hidden="false"] .backdrop-art').evaluate(node=>{
        const vector=node.querySelector('.gooey-art'),canvas=node.querySelector('canvas');
        return {style:node.dataset.backdrop,progress:Number(node.dataset.backdropProgress),
          width:vector?Number(vector.getAttribute('width')):canvas.width,height:vector?Number(vector.getAttribute('height')):canvas.height,
          clientWidth:node.clientWidth,clientHeight:node.clientHeight};
      });
      assert.equal(observed.style,spec.content.style);assert.equal(observed.progress,1);
      assert.equal(observed.width,observed.clientWidth);assert.equal(observed.height,observed.clientHeight);
      report.scenes.at(-1).backdrop_check=observed;
      if(spec.content.style==='gooey-split')report.scenes.at(-1).gooey_split=await inspectGooeySplit(spec,scene.end-.5);
      if(spec.content.style==='halftone-field')report.scenes.at(-1).halftone=await inspectHalftone(spec,scene.end-.5,true);
      if(/^(gpu|three)-/.test(spec.content.style))report.scenes.at(-1).gpu_backdrop=await inspectGpuBackdrop(spec,scene.end-.5,true);
      if(/^(anamorphic-flare|mesh-card|facet-morph|soft-blob-touch|scope-(sine|square|triangle)|stop-motion-(8|10|12))$/.test(spec.content.style))report.scenes.at(-1).canvas_backdrop=await inspectCanvasBackdrop(spec,scene.end-.5);
    }
    if(['trust','testimonial','proof'].includes(spec.kind)) {
      const content=spec.content;
      const observed=await page.locator('.scene[aria-hidden="false"]').evaluate(node=>({
        heading:node.querySelector('.prod-heading').textContent,
        source:node.querySelector('.chart-source').textContent,reference:node.querySelector('.chart-reference').textContent,
        marks:[...node.querySelectorAll('.evidence-mark')].map(n=>({text:n.textContent,opacity:+getComputedStyle(n).opacity})),
        quote:node.querySelector('.evidence-quote')?.textContent,author:node.querySelector('.evidence-author')?.textContent,
        role:node.querySelector('.evidence-role')?.textContent,rating:node.querySelector('.evidence-rating-value')?.textContent,
        claim:node.querySelector('.evidence-claim')?.textContent,action:node.querySelector('.evidence-action')?.textContent,
        features:[...node.querySelectorAll('.evidence-feature-label')].map(n=>n.textContent),
        badges:[...node.querySelectorAll('.evidence-badge')].map(n=>({text:n.textContent,opacity:+getComputedStyle(n).opacity,scale:new DOMMatrixReadOnly(getComputedStyle(n).transform).a}))}));
      assert.equal(observed.heading,content.heading);
      assert.equal(observed.source,`${content.source.kind.toUpperCase()} / ${content.source.label} / ${content.source.as_of}`);
      assert.equal(observed.reference,content.source.reference);
      if(spec.kind==='trust') {
        assert.deepEqual(observed.marks.map(n=>n.text),content.marks);assert.ok(observed.marks.every(n=>n.opacity===1));
        if(content.style&&content.style!=='standard') {
          const transforms=await page.locator('.scene[aria-hidden="false"] .evidence-mark').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).transform));
          assert.ok(transforms.every(transform=>transform==='none'),'Trust marks must settle without residual scaling');
        }
      } else {
        assert.equal(observed.rating,`${content.rating} / 5`);
        if(spec.kind==='testimonial')for(const key of ['quote','author','role'])assert.equal(observed[key],content[key]);
        else {
          for(const key of ['claim','action'])assert.equal(observed[key],content[key]);
          assert.deepEqual(observed.features,content.features.map(f=>f.label));
          assert.deepEqual(observed.badges.map(n=>n.text),content.features.filter(f=>f.badge).map(f=>f.badge));
          assert.ok(observed.badges.every(n=>n.opacity===1&&n.scale===1));
        }
      }
      report.scenes.at(-1).evidence_check=observed;
    }
    if(spec.kind==='lower-third'&&spec.content.variant&&!['side-rule','channel-card','news-ticker'].includes(spec.content.variant)) {
      const state=await page.locator('.scene[aria-hidden="false"] .resource-lower').evaluate(panel=>({
        variant:panel.dataset.variant,progress:panel.dataset.lowerProgress,
        name:panel.querySelector('.resource-lower-name').textContent,role:panel.querySelector('.resource-lower-role').textContent,
        hidden:[...panel.querySelectorAll('[data-fit]')].some(n=>Number(getComputedStyle(n).opacity)!==1),
        rail:panel.querySelector('.resource-lower-neon')?.dataset.railProgress,
        arcs:[...panel.querySelectorAll('.resource-lower-neon path:not([data-lower-rail])')].map(n=>Number(getComputedStyle(n).opacity))}));
      assert.equal(state.variant,spec.content.variant);assert.equal(state.progress,'1');
      assert.equal(state.name,spec.content.name);assert.equal(state.role,spec.content.role);assert.equal(state.hidden,false);
      if(spec.content.variant==='neon-border'){assert.equal(state.rail,'1');assert.ok(state.arcs.length>0&&state.arcs.every(n=>n===0));}
      const settled=await page.locator('.scene[aria-hidden="false"] .resource-lower').screenshot();
      await page.evaluate(t=>window.ShortCreatorRenderAt(t),scene.end-.8);
      assert.equal(sha(settled),sha(await page.locator('.scene[aria-hidden="false"] .resource-lower').screenshot()),'Attribution must hold after its entrance');
    }
    if(spec.kind==='checklist') {
      assert.equal(await page.locator('.scene[aria-hidden="false"] .prod-heading').textContent(),spec.content.heading);
      assert.equal(await page.locator('.scene[aria-hidden="false"] .resource-source').textContent(),spec.content.source);
      for(const [beat,cue] of spec.cues.entries()) {
        await page.evaluate(t=>window.ShortCreatorRenderAt(t),cues[cue].start+1.21);
        const rows=await page.locator('.scene[aria-hidden="false"] .resource-check-row').evaluateAll(nodes=>nodes.map(node=>({
          opacity:Number(getComputedStyle(node).opacity),label:node.querySelector('.resource-check-label').textContent,
          value:node.querySelector('.resource-check-value').textContent,
          offset:+node.querySelector('path').getAttribute('stroke-dashoffset'),checkOpacity:Number(getComputedStyle(node.querySelector('path')).opacity)})));
        rows.forEach((row,j)=>{
          assert.equal(row.label,spec.content.items[j].label);assert.equal(row.value,spec.content.items[j].value);
          assert.equal(row.opacity,j<=beat?1:0);
          const checked=j<=beat&&spec.content.items[j].checked;
          assert.equal(row.offset,checked?0:100);assert.equal(row.checkOpacity,checked?1:0);
        });
        if(spec.content.style==='success-ring') {
          const states=await page.locator('.scene[aria-hidden="false"] [data-success-state]').evaluateAll(nodes=>nodes.map(n=>({
            state:JSON.parse(n.dataset.successState),transform:getComputedStyle(n.querySelector('svg')).transform,
            filter:getComputedStyle(n.querySelector('svg')).filter})));
          states.slice(0,beat+1).forEach(({state,transform,filter},j)=>{
            assert.equal(state.draw,spec.content.items[j].checked?1:0);assert.equal(state.scale,1);
            assert.equal(transform,'none');assert.equal(filter,'none');
          });
        }
      }
      if(spec.content.emphasis)assert.equal(await page.locator('.scene[aria-hidden="false"] .resource-check-emphasis ellipse').getAttribute('stroke-dashoffset'),'0');
    }
    if(['code','carousel','diagram'].includes(spec.kind)) {
      const source=await page.locator('.scene[aria-hidden="false"] .resource-source').textContent();
      assert.equal(source,spec.content.source,'Resource source changed');
      for(const [beat,cue] of spec.cues.entries()) {
        await page.evaluate(t=>window.ShortCreatorRenderAt(t),cues[cue].start+1.21);
        const state=await page.locator('.scene[aria-hidden="false"]').evaluate(node=>{
          const code=node.querySelector('.resource-code'),carousel=node.querySelector('.resource-carousel');
          const box=n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};};
          return {line:code?.dataset.activeLine,highlight:code?.dataset.highlightProgress,
            highlightBox:code?box(code.querySelector('.resource-code-highlight')):null,
            rows:code?[...code.querySelectorAll('.resource-code-row')].map(box):[],
            text:[...node.querySelectorAll('[data-code-line]')].map(n=>n.textContent),
            screen:carousel?.dataset.activeScreen,position:carousel?.dataset.carouselPosition,
            carouselBox:carousel?box(carousel):null,
            cards:carousel?[...carousel.querySelectorAll('.resource-carousel-card')].map(box):[],
            imageSources:carousel?[...carousel.querySelectorAll('img')].map(n=>n.getAttribute('src')):[],
            caption:node.querySelector('.resource-carousel-caption')?.textContent,
            steps:[...node.querySelectorAll('[data-step-progress]')].map(n=>n.dataset.stepProgress),
            paths:[...node.querySelectorAll('[data-trace-progress]')].map(n=>({progress:n.dataset.traceProgress,offset:+n.getAttribute('stroke-dashoffset')}))};
        });
        if(spec.kind==='code') {
          assert.equal(state.line,String(spec.content.highlights[beat]));assert.equal(state.highlight,'1');
          assert.deepEqual(state.text,spec.content.lines.map(line=>line||' '));
          const row=state.rows[spec.content.highlights[beat]];
          for(const key of ['left','top','width','height'])assert.ok(Math.abs(state.highlightBox[key]-row[key])<1,'Code highlight misses its measured line');
        } else if(spec.kind==='carousel') {
          assert.equal(state.screen,String(beat));assert.equal(state.position,String(beat));assert.equal(state.caption,spec.content.screens[beat].label);
          const view=state.carouselBox,card=state.cards[beat];
          assert.ok(Math.abs(card.left+card.width/2-view.left-view.width/2)<1,'Active screen is not centered');
          assert.ok(card.left>=view.left&&card.left+card.width<=view.left+view.width,'Active screen is clipped');
          assert.deepEqual(state.imageSources,spec.content.screens.map(screen=>configuration.assets[screen.image]));
        } else {
          state.steps.forEach((p,j)=>assert.equal(p,j<=beat?'1':'0'));
          state.paths.forEach((p,j)=>{assert.equal(p.progress,j<beat?'1':'0');if(j<beat)assert.equal(p.offset,0);});
        }
      }
    }
    if(spec.kind==='title'&&spec.content.layout&&spec.content.layout!=='standard') {
      const state=await page.locator('.scene[aria-hidden="false"] .production-content').evaluate(node=>({
        layout:node.dataset.titleLayout,text:node.querySelector('.prod-title').textContent,
        progress:+(node.querySelector('.title-design-board')?.dataset.titleDesignProgress??node.querySelector('.title-backdrop-word')?.dataset.emphasisProgress),
        glyphs:[...node.querySelectorAll('.title-design-glyph')].map(n=>+getComputedStyle(n).opacity),
        backdrop:node.querySelector('.title-backdrop-word')?.textContent,
        paths:[...document.querySelectorAll('.title-design-svg defs path[id]')].map(n=>n.id)
      }));
      assert.equal(state.layout,spec.content.layout);assert.equal(state.text,spec.content.title);assert.equal(state.progress,1);
      assert.ok(state.glyphs.every(p=>p===1));assert.equal(new Set(state.paths).size,state.paths.length);
      if(['emphasis','layered-emphasis'].includes(spec.content.layout))assert.equal(state.backdrop,spec.content.backdrop_word);
      report.scenes.at(-1).title_design=state;
      if(spec.content.layout.startsWith('promo-'))report.scenes.at(-1).promo_title=await inspectPromoTitle(spec,scene.end-.5);
    }
    if(spec.kind==='title'&&spec.content.reveal&&spec.content.reveal!=='rise') {
      await page.evaluate(t=>window.ShortCreatorRenderAt(t),scene.end-.5);
      const title=await page.locator('.scene[aria-hidden="false"] .prod-title').evaluate(node=>({text:node.textContent,progress:node.dataset.revealProgress,
        hidden:[...node.querySelectorAll('.resource-character')].some(n=>getComputedStyle(n).visibility==='hidden')}));
      assert.equal(title.text,spec.content.title);assert.equal(title.progress,'1');assert.equal(title.hidden,false);
      if(await page.locator('.scene[aria-hidden="false"] [data-type-reveal]').count()) {
        const end=await page.locator('.scene[aria-hidden="false"] .prod-title').evaluate(node=>{
          const style=getComputedStyle(node);
          return {text:node.textContent,font:style.fontFamily,color:style.color,background:style.backgroundImage,
            overrides:[node.style.fontSize,node.style.fontFamily,node.style.fontWeight,node.style.letterSpacing],
            parts:[node,...node.querySelectorAll('.type-word,.type-glyph')].map(n=>{
              const s=getComputedStyle(n),m=new DOMMatrix(s.transform);
              return {opacity:Number(s.opacity),visibility:s.visibility,blur:s.filter,clip:s.clipPath,
                matrix:[m.a,m.b,m.c,m.d,m.e,m.f]};})};
        });
        assert.equal(end.text,spec.content.title);assert.ok(end.font.includes('BrandSans'));
        assert.deepEqual(end.overrides,['','','','']);assert.equal(end.color,'rgb(255, 255, 255)');assert.equal(end.background,'none');
        for(const part of end.parts) {
          assert.equal(part.opacity,1);assert.equal(part.visibility,'visible');assert.equal(part.blur,'none');
          assert.deepEqual(part.matrix,[1,0,0,1,0,0]);
          assert.ok(part.clip==='none'||part.clip==='inset(0px -8px)','Headline retains an incomplete word wipe');
        }
      }
      if(await page.locator('.scene[aria-hidden="false"] [data-advanced-state]').count())
        report.scenes.at(-1).advanced_type=await inspectAdvancedTitle(spec,scene.end-.5);
    }
    if(spec.kind==='screen'&&spec.content.swap==='iris') {
      for(const [index,cue] of spec.cues.entries()) {
        await page.evaluate(t=>window.ShortCreatorRenderAt(t),cues[cue].start+1.21);
        const state=await page.locator('.scene[aria-hidden="false"] .screen-view').evaluate(view=>({index:view.dataset.swapIndex,progress:view.dataset.swapProgress,
          shown:[...view.querySelectorAll('img')].filter(n=>getComputedStyle(n).visibility==='visible').map(n=>n.getAttribute('src'))}));
        assert.equal(state.index,String(index));assert.equal(state.progress,'1');
        assert.deepEqual(state.shown,[configuration.assets[spec.content.images[index]]]);
        if(index>0) {
          await page.evaluate(t=>window.ShortCreatorRenderAt(t),cues[cue].start+.8);
          const middle=await page.locator('.scene[aria-hidden="false"] .screen-view').evaluate(view=>({
            radius:+view.dataset.irisRadius,ring:+view.querySelector('circle').getAttribute('r'),
            clips:[...view.querySelectorAll('img')].map(n=>n.style.clipPath),
            visible:[...view.querySelectorAll('img')].map(n=>getComputedStyle(n).visibility)}));
          assert.ok(middle.radius>0);assert.equal(middle.ring,middle.radius);
          const clip=/^circle\(([\d.]+)px at 50% 50%\)$/.exec(middle.clips[index]);
          assert.ok(clip,'Iris clip does not use a centered pixel radius');
          assert.ok(Math.abs(Number(clip[1])-middle.radius)<.001,'Iris rim and clip diverge');
          assert.equal(middle.visible[index-1],'visible');assert.equal(middle.visible[index],'visible');
        }
      }
    }
    if(spec.kind==='screen'&&spec.content.swap?.startsWith('shader-')) {
      for(const [index,cue] of spec.cues.entries())for(const offset of [0,6,12,18,24]) {
        const onset=Math.ceil((cues[cue].start+.4)*30);
        await seekCheck((onset+offset)/30,scene.end-.5,`${scene.name} shader ${index} frame ${offset}`);
        const state=await page.locator('.scene[aria-hidden="false"] .screen-view').evaluate(view=>{
          const canvas=view.querySelector('canvas.screen-shader');
          return {kind:view.dataset.screenSwap,index:+view.dataset.swapIndex,p:+view.dataset.swapProgress,
            width:view.clientWidth,height:view.clientHeight,canvas:[canvas.width,canvas.height],visible:getComputedStyle(canvas).visibility,
            shown:[...view.querySelectorAll('img')].filter(img=>getComputedStyle(img).visibility==='visible').map(img=>img.getAttribute('src')),
            stats:window.ShortCreatorShaders.stats()};
        });
        assert.equal(state.kind,spec.content.swap);assert.equal(state.index,index);assert.equal(state.p,offset/24);
        assert.deepEqual(state.canvas,[state.width,state.height]);assert.equal(state.stats.contexts,1);assert.equal(state.stats.textures,2);
        const selectedShaders=new Set(configuration.scenes.filter(row=>row.kind==='screen'&&row.content.swap?.startsWith('shader-')).map(row=>row.content.swap));
        assert.equal(state.stats.lost,false);assert.ok(state.stats.programs>=1&&state.stats.programs<=selectedShaders.size);
        const moving=index>0&&offset>0&&offset<24;
        assert.equal(state.visible,moving?'visible':'hidden');
        assert.deepEqual(state.shown,moving?[]:[configuration.assets[spec.content.images[index>0&&offset===0?index-1:index]]]);
      }
    }
    if(spec.kind==='screen'&&['scribble','paper-collage','paper-rip'].includes(spec.content.swap))
      report.scenes.at(-1).paper_check=await inspectPaper(spec,scene.end-.5);
    if(spec.kind==='screen'&&spec.content.swap==='clone-wall')
      report.scenes.at(-1).clone_wall=await inspectCloneWall(spec,scene.end-.5);
    if(spec.kind==='screen'&&['curtain','grid','halftone','fade-through','whip-pan'].includes(spec.content.swap)) {
      const kind=spec.content.swap;
      for(const [index,cue] of spec.cues.entries()) {
        for(const offset of [0,6,12,18,24]) {
          const onset=Math.ceil((cues[cue].start+.4)*30),t=(onset+offset)/30;
          await seekCheck(t,scene.end-.5,`${scene.name} ${kind} transition ${index} frame ${offset}`);
          const state=await page.locator('.scene[aria-hidden="false"] .screen-view').evaluate(view=>{
            const imgs=[...view.querySelectorAll('img')],svg=view.querySelector('svg.screen-swap-overlay');
            const strip=view.querySelector('.screen-swap-strip'),overlay=view.querySelector('.screen-swap-overlay');
            return {kind:view.dataset.screenSwap,index:+view.dataset.swapIndex,p:+view.dataset.swapProgress,
              w:view.clientWidth,h:view.clientHeight,shown:imgs.filter(n=>getComputedStyle(n).visibility==='visible').map(n=>n.getAttribute('src')),
              clips:imgs.map(n=>n.style.clipPath),radii:svg?[...svg.querySelectorAll('clipPath circle')].map(n=>+n.getAttribute('r')):[],
              ink:svg?[...svg.querySelectorAll(':scope > circle')].map(n=>+n.getAttribute('r')):[],
              cells:[...view.querySelectorAll('.screen-swap-cell')].map(n=>new DOMMatrix(getComputedStyle(n).transform).a),
              folds:[...view.querySelectorAll('.screen-swap-fold')].map(n=>new DOMMatrix(getComputedStyle(n).transform).a),
              // CSS matrix serialization rounds large translations; measure painted geometry instead.
              x:strip?(strip.getBoundingClientRect().left-view.getBoundingClientRect().left)*view.clientWidth/view.getBoundingClientRect().width:null,
              blur:view.querySelector('feGaussianBlur')?.getAttribute('stdDeviation'),
              filter:strip?strip.style.filter:null,overlay:overlay?getComputedStyle(overlay).visibility:null,
              opacity:overlay?Number(getComputedStyle(overlay).opacity):null};
          });
          assert.equal(state.kind,kind);assert.equal(state.index,index);assert.equal(state.p,offset/24);
          const actual=configuration.assets[spec.content.images[index]];
          if(offset===24||index===0)assert.deepEqual(state.shown,[actual]);
          if(index===0)continue;
          if(offset===24) {
            if(kind==='whip-pan'){assert.equal(state.x,-index*state.w);assert.equal(state.filter,'none');}
            else assert.equal(state.overlay,'hidden');
            if(kind==='halftone')assert.equal(state.clips[index],'none');
          }
          if(kind==='curtain') {
            assert.equal(state.folds.length,22);
            if(offset===12)assert.ok(state.folds.every(scale=>scale===1),'Curtain must fully close before switching');
            if(offset===0||offset===24)assert.ok(state.folds.every(scale=>scale===0));
          } else if(kind==='grid') {
            assert.ok(state.cells.length>=64&&state.cells.length<=640);
            if(offset===12)assert.ok(state.cells.every(scale=>scale>=1),'Grid leaves uncovered cells at image swap');
            if(offset===0||offset===24)assert.ok(state.cells.every(scale=>scale===0));
          } else if(kind==='fade-through') {
            if(offset===12)assert.equal(state.opacity,1,'Image switch must be hidden by the brand ground');
            if(offset===0||offset===24)assert.equal(state.opacity,0);
          } else if(kind==='whip-pan') {
            const p=offset/24,ease=p<.5?8*p**4:1-8*(1-p)**4;
            assert.ok(Math.abs(state.x+(index-1+ease)*state.w)<.001,'Screens must share the same strip');
            const [x,y]=state.blur.split(' ').map(Number);assert.equal(y,0);assert.ok(x>=0&&x<=16);
            if(offset===12)assert.equal(x,16);
          } else {
            assert.ok(state.radii.length>100);assert.equal(state.radii.length,state.ink.length);
            assert.ok(state.ink.every((radius,i)=>radius>=state.radii[i]),'Ink must lead the incoming windows');
            if(offset===0)assert.ok(state.radii.every(radius=>radius===0));
            if(offset===12)assert.ok(state.radii.some(radius=>radius>0)&&state.radii.some(radius=>radius===0));
          }
        }
      }
    }
    for(const cue of episode.scenes[i].cues) {
      const onset=Math.ceil((cues[cue].start+.4)*30),samples=[];
      const readingType=spec.kind==='title'&&['marker-sweep','gradient-read','neon-read','kinetic-words','editorial-words','pill-read'].includes(spec.content.reveal);
      const advancedType=spec.kind==='title'&&['glitch-read','decode-read','neon-accent','particle-burst','tile-resolve','ascii-trail','cadenced-type','particle-assemble','texture-read','prism-bow'].includes(spec.content.reveal);
      const batchType=readingType||(spec.kind==='title'&&['word-crossfade','shared-axis-y','shared-axis-z','soft-blur','scan-band','accent-glitch','shimmer-sweep','mask-reveal','calm','word-highlight','text-stagger'].includes(spec.content.reveal));
      const titleDesign=spec.kind==='title'&&spec.content.layout&&spec.content.layout!=='standard';
      const type=spec.kind==='title'&&['bottom-up','top-down','clip-wipe','line-slide','char-slam','headline-slam','text-shimmer','tracking-in','streaming','matrix','focus-resolve'].includes(spec.content.reveal);
      const headline=spec.kind==='headline'||(spec.kind==='title'&&(spec.content.marker||['matrix','focus-resolve'].includes(spec.content.reveal)));
      const mediaLight=spec.kind==='media-grid'&&['gloss','spotlight'].includes(spec.content.treatment);
      const mediaCamera=spec.kind==='media-grid'&&Boolean(spec.content.camera);
      const mediaSpatial=spec.kind==='media-grid'&&['depth-card','scrub-stack','device-splay','dolly-depth-in','dolly-depth-out','phone-trio'].includes(spec.content.treatment);
      const mediaPresentation=spec.kind==='media-grid'&&['album-card','preview-sheet','steam-window','grade-split'].includes(spec.content.treatment);
      const cursorScene=(spec.kind==='interface'&&spec.content.variant==='text-select')||(spec.kind==='media-grid'&&spec.content.treatment==='collaborators');
      const newsTicker=spec.kind==='lower-third'&&spec.content.variant==='news-ticker';
      const mediaSurface=spec.kind==='media-grid'&&Boolean(spec.content.surface);
      const mediaHud=spec.kind==='media-grid'&&Boolean(spec.content.hud);
      const handFrame=spec.kind==='media-grid'&&spec.content.treatment==='hand-frame';
      const brandLockup=spec.kind==='cta'&&['logo-intro','logo-assemble','badge-pair','logo-collide'].includes(spec.content.style);
      const editorial=handFrame||(spec.kind==='cta'&&spec.content.style&&spec.content.style!=='standard')||(spec.kind==='lower-third'&&spec.content.variant==='channel-card')||(spec.kind==='diagram'&&spec.content.style==='hand-drawn');
      const catalogSwap=spec.kind==='screen'&&spec.content.swap?.startsWith('catalog-');
      const paperSwap=spec.kind==='screen'&&['scribble','paper-collage','paper-rip'].includes(spec.content.swap);
      const cloneWall=spec.kind==='screen'&&spec.content.swap==='clone-wall';
      const beatFreeze=spec.kind==='screen'&&spec.content.swap==='beat-freeze';
      const colorama=spec.kind==='title'&&spec.content.reveal==='colorama-wipe';
      const filmedScreen=spec.kind==='screen'&&spec.content.lens==='filmed';
      const canvasBackdrop=spec.kind==='backdrop'&&/^(anamorphic-flare|mesh-card|facet-morph|soft-blob-touch|scope-(sine|square|triangle)|stop-motion-(8|10|12))$/.test(spec.content.style);
      const editor=spec.kind==='interface'&&['vector-editor','sticky-mock'].includes(spec.content.variant);
      const statusMotion=['trust','checklist'].includes(spec.kind)&&spec.content.style&&spec.content.style!=='standard';
      const kineticPreset=spec.kind==='kinetic'&&spec.content.style&&spec.content.style!=='standard';
      const spatialObject=spec.kind==='spatial-stage';
      const metricBurst=spec.kind==='chart'&&spec.content.metric_style==='count-burst';
      const statCard=spec.kind==='chart'&&['grid-stat','soft-stat','sticker-stat','rail-stat'].includes(spec.content.metric_style);
      const primitive=(spec.kind==='interface'&&['micro-badge','micro-dropdown','micro-modal','micro-tabs','micro-tooltip','micro-check','signup-flow','beat-sequence','profile-count'].includes(spec.content.variant))||(spec.kind==='checklist'&&['icon-swap','icon-morph'].includes(spec.content.style))||(spec.kind==='trust'&&spec.content.style==='avatar-lift')||(spec.kind==='diagram'&&['separated','arc-route','offset-traveler','tracing-beam'].includes(spec.content.style));
      const offsets=headline||batchType||advancedType||titleDesign||catalogSwap||paperSwap||cloneWall||mediaCamera||mediaSpatial||mediaPresentation||cursorScene||newsTicker||mediaSurface||mediaHud||editorial||statusMotion||primitive||kineticPreset||metricBurst||statCard||spatialObject||['backdrop','interface','data-story','network','annotation','media-carousel','code-story','map-story','combo-chart','specs','interaction'].includes(spec.kind)?Array.from({length:27},(_,i)=>i-1):type?[-1,0,1,6,12,18,19,20,21,22,23,24,25]:mediaLight?[-1,0,1,12,14,16,18,23,24,25]:[-1,0,1,12,23,24,25];
      if(beatFreeze||colorama||filmedScreen) {
        offsets.length=0;for(let f=-1;f<=(beatFreeze&&cue!==spec.cues[0]?70:25);f++)offsets.push(f);
      }
      if(spec.kind==='map-story'&&spec.content.style==='flight'&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        // Sample source event boundaries throughout the journey without duration-proportional work.
        const events=[.16,.7,.86,1.08,1.16,1.17,1.2,1.26,1.28,4.06,4.18,4.25,4.26,4.36,4.42,4.48,4.64,4.72,4.96,5.02,5.12,5.24,5.3,5.46,5.62];
        for(let i=0;i<6;i++)events.push(1.34+i*.44,1.48+i*.44,1.82+i*.44);
        for(const event of events) {
          let low=0,high=last;
          while(low<high){const mid=Math.floor((low+high)/2);if(presentationTime(spec,(onset+mid)/30,5.62)<event-1e-9)low=mid+1;else high=mid;}
          for(const f of [low-1,low,low+1])if(f>=0&&f<=last&&!offsets.includes(f))offsets.push(f);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='map-story'&&spec.content.style==='world') {
        const events=cue===spec.cues[0]?[29,30,31,44,45,46,59,60,61,89,90,91,119,120,121,137,138,139,144,145,146,149,150,151]:[26,27,28,29,30,31];
        for(const f of events)if(!offsets.includes(f))offsets.push(f);
        offsets.sort((a,b)=>a-b);
      }
      if(spatialObject&&['extruded-logo','wireframe-portal-title','canopy-part-title'].includes(spec.content.style)&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const portal=spec.content.style==='wireframe-portal-title',canopy=spec.content.style==='canopy-part-title',duration=canopy?10.5:portal?8:4.3;
        const events=canopy?[0,.4,1.36,2.1,3.024,3.6,5.2,5.36,6,6.096,6.48,6.576,7.184,7.504,8.4,10.5,12]:portal?[.03,.22,.45,1.45,1.475,1.5,2.5,2.65,2.7,2.85,3.8,3.89,4.13,4.7,5.2,5.29,5.53,6,6.4,6.9,7.6,7.85,8]:[.1,.23,.36,.49,.62,.75,.88,1.01,1.7,2.3,3,4.3];
        for(const event of events) {
          let low=0,high=last;
          while(low<high){const mid=Math.floor((low+high)/2);if(presentationTime(spec,(onset+mid)/30,duration)<event-1e-9)low=mid+1;else high=mid;}
          for(const f of [low-1,low,low+1])if(f>=0&&f<=last&&!offsets.includes(f))offsets.push(f);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='map-story'&&['spain','us'].includes(spec.content.style)) {
        const events=cue===spec.cues[0]?[29,30,31,41,42,43,59,60,61,89,90,91,104,105,106,119,120,121,149,150,151,164,165,166,172,173,174,179,180,181,194,195,196]:[14,15,16,29,30,31];
        for(const f of events)if(!offsets.includes(f))offsets.push(f);
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='map-story'&&spec.content.style==='spotlight'&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const events=[0,.42,.525,.7,.805,1.59,3.12,3.18,3.24,3.28,3.46,3.6,3.78,3.82,3.86,3.9,4.04,4.06,4.1,4.2,4.24,4.38,5.82,6.54,6.55];
        for(const event of events) {
          let low=0,high=last;
          while(low<high){const mid=Math.floor((low+high)/2);if(presentationTime(spec,(onset+mid)/30,6.55)<event-1e-9)low=mid+1;else high=mid;}
          for(const f of [low-1,low,low+1])if(f>=0&&f<=last&&!offsets.includes(f))offsets.push(f);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(mediaPresentation&&spec.content.treatment==='grade-split'&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        for(const event of [0,.36,.62,.7,.9,1.16,1.5,2.3,2.7,3.1,3.6,4.05,4.3,4.35,4.6,6]) {
          let low=0,high=last;
          while(low<high){const mid=Math.floor((low+high)/2);if(presentationTime(spec,(onset+mid)/30,6)<event-1e-9)low=mid+1;else high=mid;}
          for(const f of [low-1,low,low+1])if(f>=0&&f<=last&&!offsets.includes(f))offsets.push(f);
        }
        offsets.sort((a,b)=>a-b);
      }
      if((newsTicker||(mediaPresentation&&['preview-sheet','steam-window'].includes(spec.content.treatment)))&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const steam=spec.content.treatment==='steam-window';
        const events=newsTicker?Array.from({length:33},(_,i)=>i*6.67/32):steam?Array.from({length:25},(_,i)=>i*10/24):
          [.056667,.09,.123333,.156667,.19,.223333,.256667,.29,.323333,.356667,.39,.423333,.456667,.49,.523333,.556667,.59,.623333,.656667,.69,.723333,
            .99,1.356667,1.69,2.023333,2.356667,2.69,3.09,3.456667,3.79,4.123333,4.456667,4.79,5.156667,6];
        // Sample both sides of source events without scaling QA cost with film length.
        for(const event of events) {
          let low=0,high=last;
          while(low<high){const mid=Math.floor((low+high)/2),t=(onset+mid)/30;
            if((newsTicker||steam?presentationTime(spec,t,steam?10:6.67):previewTime(spec,t))<event-1e-9)low=mid+1;else high=mid;}
          for(const f of [low-1,low,low+1])if(f>=0&&f<=last&&!offsets.includes(f))offsets.push(f);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(spatialObject&&['product-turntable','orbit-card'].includes(spec.content.style)&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        for(let i=1;i<=24;i++){const f=Math.round(i*last/24);if(!offsets.includes(f))offsets.push(f);}
        offsets.sort((a,b)=>a-b);
      }
      if(spatialObject&&spec.content.style==='cuboid-carousel') {
        const gap=Math.ceil((cues[spec.cues[1]].start+.4)*30)-Math.ceil((cues[spec.cues[0]].start+.4)*30);
        const events=cue===spec.cues[0]?[28,31,36,40,70,90,106.53791809082031,107,120,150].map(f=>Math.ceil(f*gap/150)):[30,39,40,41,49,50,51];
        for(const f of events)for(const offset of [f-1,f,f+1])if(!offsets.includes(offset))offsets.push(offset);
        offsets.sort((a,b)=>a-b);
      }
      if(spatialObject&&['device-review','phone-glass','desktop-glass'].includes(spec.content.style)&&cue===spec.cues[0]){
        const gap=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset;
        const events=spec.content.style==='phone-glass'?[.85,1.57,1.7,2.44,2.55,3.31,4.5,8.5,12.5,15]:
          spec.content.style==='desktop-glass'?[.45,.83,.99,1.55,4.25,4.43,4.65,5,9,12.5,13,15]:[1.5,3.3,3.5,5.5,7,8,9,9.5,11,12.5,13,13.5,15];
        for(let f=0;f<=gap+24;f++){
          const before=presentationTime(spec,(onset+f-1)/30,15),at=presentationTime(spec,(onset+f)/30,15);
          if(events.some(event=>before<event&&at>=event))for(const sample of [f-1,f,f+1])if(!offsets.includes(sample))offsets.push(sample);
        }
        offsets.sort((a,b)=>a-b);
      }
      const valueLanes=spec.kind==='data-story'&&spec.content.style==='value-lanes';
      if(valueLanes) {
        const next=spec.cues[spec.cues.indexOf(cue)+1];
        const last=Math.floor((next===undefined?scene.end-.5:cues[next].start+.4)*30)-onset;
        for(let step=1;step<=12;step++){const f=Math.floor(last*step/12);if(!offsets.includes(f))offsets.push(f);}
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='cta'&&spec.content.style==='character-walk'&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const events=[127/30,145/30,149/30,5.2,5.3,5.4,5.5,5.8,5.9,6,224/30];
        for(let f=0;f<=last;f++) {
          const before=presentationTime(spec,(onset+f-1)/30,7.5),at=presentationTime(spec,(onset+f)/30,7.5);
          if(f%8===0||events.some(e=>before<e&&at>=e))for(const v of [f-1,f,f+1])if(!offsets.includes(v))offsets.push(v);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='cta'&&spec.content.style==='creator-intro'&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const events=[.02,.25,.44,.48,1.28,1.43,1.455,1.49,1.5,1.55,1.7,1.82,1.9,1.96,2.08,2.1,2.12,2.16,2.17,2.28,2.31,2.33,2.38,2.58,2.9,3.02,3.05,3.18,3.3,3.42,4.12,4.14,4.18,4.4,4.92,5.66,6.92,7.04,7.32,7.44,7.9,7.98,8.15,8.25,8.64,8.74,8.82,9.34,9.42,9.5,9.86,9.96,10.46,10.5,10.88,10.96,10.99,11.16,11.76];
        for(let f=0;f<=last;f++) {
          const before=presentationTime(spec,(onset+f-1)/30,11.76),at=presentationTime(spec,(onset+f)/30,11.76);
          if(f%12===0||events.some(e=>before<e&&at>=e))for(const v of [f-1,f,f+1])if(!offsets.includes(v))offsets.push(v);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='cta'&&spec.content.style==='cursor-rays'&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const count=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(spec.content.heading)].length;
        const slide=3.15+(count-1)*.085+.25,end=slide+.05,exit=end+1,second=exit+.36;
        const events=[.72,1,1.06,2.9,3,3.1,3.15,4,4.4,slide,end,end+.08,end+.42,end+.5,exit,second,second+.48,8,
          ...Array.from({length:count},(_,i)=>3.15+i*.085)];
        for(let f=0;f<=last;f++) {
          const before=presentationTime(spec,(onset+f-1)/30,8),at=presentationTime(spec,(onset+f)/30,8);
          if(f%8===0||events.some(e=>before<e&&at>=e))for(const v of [f-1,f,f+1])if(!offsets.includes(v))offsets.push(v);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(editor&&spec.content.variant==='sticky-mock')offsets.unshift(...Array.from({length:24},(_,i)=>i-25));
      if(spec.kind==='interface'&&spec.content.variant==='app-install'&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const events=[.28,.34,.4,.47,.48,.62,.92,1.25,1.53,1.72,1.82,1.93,2.02,2.04,2.14,2.28,2.32,2.34,2.47,2.54,2.6,2.66,2.78,2.86,2.92,3.02,3.04,3.18,3.56,3.9,4.24,4.28,4.44,4.5,4.52,4.56,4.62,4.7,5.06,5.35,5.42,5.44,5.62,5.74,5.86,5.92,6.28];
        for(let f=0;f<=last;f++) {
          const before=presentationTime(spec,(onset+f-1)/30,6.28),at=presentationTime(spec,(onset+f)/30,6.28);
          if(f%12===0||events.some(e=>before<e&&at>=e))for(const v of [f-1,f,f+1])if(!offsets.includes(v))offsets.push(v);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='interface'&&spec.content.variant==='product-canvas'&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const events=[.5,1,1.1,1.2,1.4,1.7,1.9,2,3.5,3.7,4.5,5.3,5.5,6.5,6.9,7.1,8,8.3,8.9,9.1,9.9,10.1,10.3,10.5,10.7,11.1,11.5,11.9];
        for(let f=0;f<=last;f++) {
          const before=presentationTime(spec,(onset+f-1)/30,11.9),at=presentationTime(spec,(onset+f)/30,11.9);
          if(f%12===0||events.some(event=>before<event&&at>=event))for(const offset of [f-1,f,f+1])if(!offsets.includes(offset))offsets.push(offset);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='interface'&&spec.content.variant==='ui-3d-reveal'&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const events=[.24,.5,.74,1,1.35,1.5,1.73,1.85,1.87,1.95,2,2.07,2.75,3,3.5,4.2,4.8,5.55,6.45,7.3,7.6,7.85,7.9,9.3,9.7,10.2,10.4,10.6,10.7,11.7,12.05,12.1,12.3];
        for(let f=0;f<=last;f++){
          const before=presentationTime(spec,(onset+f-1)/30,12.3),at=presentationTime(spec,(onset+f)/30,12.3);
          if(f%12===0||events.some(event=>before<event&&at>=event))for(const offset of [f-1,f,f+1])if(!offsets.includes(offset))offsets.push(offset);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='interface'&&spec.content.variant==='glass-parallax'&&cue===spec.cues[0]){
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const events=[.5,2.25,4,7.5,10.5,13.5,16.5,19,19.5,20];
        for(let f=0;f<=last;f++){
          const before=presentationTime(spec,(onset+f-1)/30,20),at=presentationTime(spec,(onset+f)/30,20);
          if(f%30===0||events.some(e=>before<e&&at>=e))for(const offset of [f-1,f,f+1])if(!offsets.includes(offset))offsets.push(offset);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='interface'&&spec.content.variant==='shatter-panels'&&cue===spec.cues[0]){
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const events=[2,3,4,4.5,5.5,7,10,11,12];
        for(let f=0;f<=last;f++){
          const before=presentationTime(spec,(onset+f-1)/30,12),at=presentationTime(spec,(onset+f)/30,12);
          if(f%15===0||events.some(e=>before<e&&at>=e))for(const offset of [f-1,f,f+1])if(!offsets.includes(offset))offsets.push(offset);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='interface'&&spec.content.variant==='portal-panels'&&cue===spec.cues[0]){
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const events=[.3,1.5,2,2.1,3.25,3.5,4,5,5.5,5.8,6.2,6.5,6.8,7,7.4,7.5,7.8,9.5,10];
        for(let f=0;f<=last;f++){
          const before=presentationTime(spec,(onset+f-1)/30,10),at=presentationTime(spec,(onset+f)/30,10);
          if(f%15===0||events.some(e=>before<e&&at>=e))for(const offset of [f-1,f,f+1])if(!offsets.includes(offset))offsets.push(offset);
        }
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='interface'&&spec.content.variant==='liquid-panels'&&cue===spec.cues[0]){
        const last=Math.ceil((cues[spec.cues[2]].start+.4)*30)-onset+24;
        const events=[.5,2,3,4.5,5,5.5,6,6.5,7,8.5,9,10.5,11.25,12];
        for(let f=0;f<=last;f++){
          const before=liquidTime(spec,(onset+f-1)/30),at=liquidTime(spec,(onset+f)/30);
          if(f%15===0||events.some(e=>before<e&&at>=e))for(const offset of [f-1,f,f+1])if(!offsets.includes(offset))offsets.push(offset);
        }
        offsets.sort((a,b)=>a-b);
      }
      if((spec.kind==='title'&&spec.content.layout?.startsWith('promo-'))||(spec.kind==='kinetic'&&spec.content.style==='glyph-build')) {
        for(let f=0;f<=24;f++)if(!offsets.includes(f))offsets.push(f);
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='interface'&&spec.content.variant==='note-scroll')offsets.unshift(...Array.from({length:17},(_,i)=>i-18));
      if(spec.kind==='interface'&&exchangeVariants.includes(spec.content.variant)){
        for(let f=0;f<=61;f++)if(!offsets.includes(f))offsets.push(f);
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='backdrop'&&spec.content.style==='gooey-split'&&cue===spec.cues[0]){
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        for(let f=0;f<=last;f++)if(!offsets.includes(f))offsets.push(f);
        offsets.sort((a,b)=>a-b);
      }
      if((canvasBackdrop||(spec.kind==='backdrop'&&['three-cosmic-orb','three-rack-focus','halftone-field'].includes(spec.content.style)))&&cue===spec.cues[0]) {
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset+24;
        const fps=spec.content.style.startsWith('stop-motion-')?Number(spec.content.style.slice(12)):null;
        const checkpoints=fps?Array.from({length:3*fps+1},(_,i)=>Math.ceil(i*30/fps-1e-6)):
          Array.from({length:31},(_,i)=>Math.round(i*last/30));
        for(const value of checkpoints)for(const f of [value-1,value])if(!offsets.includes(f))offsets.push(f);
        offsets.sort((a,b)=>a-b);
      }
      if(spec.kind==='source-stage'&&cue===spec.cues[0]){
        const last=Math.ceil((cues[spec.cues[1]].start+.4)*30)-onset;
        for(const fraction of [.2,.4,.6,.8,1]){
          const offset=Math.round(last*fraction);if(!offsets.includes(offset))offsets.push(offset);
        }
        offsets.sort((a,b)=>a-b);
      }
      for(const offset of offsets) {
        const t=(onset+offset)/30;
        if(t<scene.start||t>=scene.end-.4)continue;
        const frame=await seekCheck(t,scene.end-.5,scene.name+' beat '+cue+' frame '+(onset+offset));
        if(valueLanes)await inspectValueLanes(spec,t);
        if(spec.kind==='data-story'&&spec.content.style==='decline')await inspectDecline(spec,t);
        if(spatialObject)await inspectSpatialObject(spec,t);
        // Crop actual full-frame pixels so progress/captions cannot disguise a static composition.
        const central=await page.evaluate(async ({encoded,box})=>{
          const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();
          const [x,y,w,h]=box,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
          canvas.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);
          return canvas.toDataURL();
        },{encoded:frame.toString('base64'),box:geometry.content});
        samples.push({frame:onset+offset,sha256:sha(frame),composition_sha256:sha(central)});
        if(spec.kind==='cta'&&spec.content.style==='character-walk')samples.at(-1).character_walk=await inspectCharacterWalk(spec,t);
        if(spec.kind==='cta'&&spec.content.style==='creator-intro')samples.at(-1).creator_intro=await inspectCreatorIntro(spec,t);
        if(spec.kind==='cta'&&spec.content.style==='cursor-rays')samples.at(-1).cursor_rays=await inspectCursorRays(spec,t);
        if(editor)samples.at(-1).editor=await inspectEditor(spec,t);
        if(spec.kind==='interface'&&spec.content.variant==='app-install')samples.at(-1).app_install=await inspectAppInstall(spec,t);
        if(spec.kind==='interface'&&spec.content.variant==='product-canvas')samples.at(-1).product_canvas=await inspectProductCanvas(spec,t);
        if(spec.kind==='interface'&&spec.content.variant==='ui-3d-reveal')samples.at(-1).ui_reveal=await inspectUIReveal(spec,t);
        if(spec.kind==='interface'&&spec.content.variant==='liquid-panels')samples.at(-1).liquid_panels=await inspectLiquidPanels(spec,t);
        if(spec.kind==='interface'&&spec.content.variant==='portal-panels')samples.at(-1).portal_panels=await inspectPortalPanels(spec,t);
        if(spec.kind==='interface'&&spec.content.variant==='shatter-panels')samples.at(-1).shatter_panels=await inspectShatterPanels(spec,t);
        if(spec.kind==='interface'&&spec.content.variant==='glass-parallax')samples.at(-1).glass_parallax=await inspectGlassParallax(spec,t);
        if(kineticPreset){samples.at(-1).kinetic_preset=await inspectKineticPreset(spec,t);assert.deepEqual(await inspect(),[],scene.name+' kinetic frame '+(onset+offset));}
        if(spec.kind==='title'&&spec.content.layout?.startsWith('promo-'))samples.at(-1).promo_title=await inspectPromoTitle(spec,t);
        if(primitive){samples.at(-1).primitive=await inspectPrimitives(spec,t);assert.deepEqual(await inspect(),[],scene.name+' primitive frame '+(onset+offset));}
        if(mediaHud)samples.at(-1).hud=await inspectHud(spec,t);
        if(mediaSpatial)samples.at(-1).spatial=await inspectSpatial(spec,t);
        if(brandLockup)samples.at(-1).brand_lockup=await inspectBrandLockup(spec,t);
        if(mediaPresentation)samples.at(-1).presentation=await inspectPresentation(spec,t);
        if(cursorScene)samples.at(-1).cursor_scene=await inspectCursorScene(spec,t);
        if(spec.kind==='interface'&&spec.content.variant==='answer-rank')samples.at(-1).answer_rank=await inspectAnswerRank(spec,t);
        if(spec.kind==='interface'&&spec.content.variant==='note-scroll')samples.at(-1).note_scroll=await inspectNoteScroll(spec,t);
        if(spec.kind==='interface'&&exchangeVariants.includes(spec.content.variant))samples.at(-1).chat_exchange=await inspectChatExchange(spec,t);
        if(spec.kind==='backdrop'&&spec.content.style==='gooey-split')samples.at(-1).gooey_split=await inspectGooeySplit(spec,t);
        if(spec.kind==='backdrop'&&spec.content.style==='halftone-field')samples.at(-1).halftone=await inspectHalftone(spec,t);
        if(newsTicker)samples.at(-1).ticker=await inspectNewsTicker(spec,t);
        if(paperSwap)samples.at(-1).paper=await inspectPaper(spec,t);
        if(cloneWall)samples.at(-1).clone_wall=await inspectCloneWall(spec,t);
        if(advancedType)samples.at(-1).advanced_type=await inspectAdvancedTitle(spec,t);
        if(colorama)samples.at(-1).colorama=await inspectColorama(spec,t);
        if(filmedScreen)samples.at(-1).filmed_screen=await inspectFilmedScreen(spec,t);
        if(beatFreeze)samples.at(-1).beat_freeze=await inspectBeatFreeze(spec,t);
        if(spec.kind==='backdrop'&&/^(gpu|three)-/.test(spec.content.style))samples.at(-1).gpu=await inspectGpuBackdrop(spec,t);
        if(canvasBackdrop)samples.at(-1).canvas_backdrop=await inspectCanvasBackdrop(spec,t);
        if(spec.kind==='interface'&&['liquid-glass','liquid-widgets'].includes(spec.content.variant)) {
          samples.at(-1).liquid_glass=await inspectLiquidGlass(spec,t);
          assert.deepEqual(await inspect(),[],scene.name+' liquid glass frame '+(onset+offset));
        }
        if(spec.kind==='interface'&&await page.locator('.scene[aria-hidden="false"] .interface-motion').count()) {
          const observed=await page.locator('.scene[aria-hidden="false"] .interface-motion').evaluate(board=>({
            state:JSON.parse(board.dataset.interfacePresentation),
            rows:[...board.querySelectorAll('.interface-row')].map(row=>({label:row.querySelector('.interface-label').textContent,
              body:row.querySelector('.interface-body').textContent,visible:getComputedStyle(row).visibility==='visible',progress:+row.dataset.interfaceProgress})),
            toggles:[...board.querySelectorAll('.im-toggle')].map(n=>n.dataset.enabled),
            chips:[...board.querySelectorAll('.im-chip')].map(n=>n.dataset.state)}));
          const expected=spec.cues.reduce((last,c,index)=>(onset+offset)>=Math.ceil((cues[c].start+.4)*30)?index:last,-1);
          assert.equal(observed.state.active,expected);assert.equal(observed.state.variant,spec.content.variant);
          assert.deepEqual(observed.rows.map(r=>[r.label,r.body]),spec.content.items.map(item=>[item.label,item.body]));
          if(offset>=24) {
            if(spec.content.style==='steps')assert.deepEqual(observed.rows.flatMap((r,i)=>r.visible?[i]:[]),[expected]);
            else observed.toggles.slice(0,expected+1).forEach((state,i)=>assert.equal(state,String(spec.content.items[i].enabled)));
            if(observed.chips.length)assert.deepEqual(observed.chips,spec.content.items.map((_,i)=>i<expected?'done':i===expected?'active':'pending'));
            if(spec.content.variant.startsWith('pull-to-refresh')){assert.equal(observed.state.gesture.y,0);assert.equal(observed.state.gesture.alpha,0);}
          }
          assert.deepEqual(await inspect(),[],scene.name+' interface motion frame '+(onset+offset));
          samples.at(-1).interface_motion=observed;
        }
        if(spec.kind==='media-carousel')samples.at(-1).carousel=await inspectCarousel(spec,t);
        if(['map-story','combo-chart','specs'].includes(spec.kind))samples.at(-1).data_extras=await inspectDataExtras(spec,t);
        if(spec.kind==='code-story') {
          const state=await page.locator('.scene[aria-hidden="false"] .code-story-board').evaluate(node=>{
            const view=node.querySelector('.code-story-viewport').getBoundingClientRect();
            return {style:node.dataset.codeStyle,index:+node.dataset.codeBeat,progress:+node.dataset.codeProgress,
              filename:node.querySelector('.code-story-file').textContent,
              spatial:node.querySelector('.code-story-viewport').dataset.spatialCode?{
                state:JSON.parse(node.querySelector('.code-story-viewport').dataset.spatialCode),
                stats:window.ShortCreatorSpatialCode.stats(),visible:getComputedStyle(node.querySelector('.code-spatial-canvas')).visibility,
                alpha:+getComputedStyle(node.querySelector('.code-spatial-canvas')).opacity,
                fonts:[...node.querySelectorAll('.code-story-text')].map(n=>getComputedStyle(n).fontFamily)}:null,
              caret:getComputedStyle(node.querySelector('.code-story-caret')).visibility,
              documents:[...node.querySelectorAll('.code-story-document')].map(doc=>({
                visible:getComputedStyle(doc).visibility==='visible',
                rows:[...doc.querySelectorAll('.code-story-row')].map(row=>{
                  const box=row.getBoundingClientRect();
                  return {text:row.querySelector('code').textContent,alpha:+getComputedStyle(row).opacity,
                    tokens:[...row.querySelectorAll('.code-story-token')].map(token=>+getComputedStyle(token).opacity),
                    contained:box.top>=view.top-1&&box.bottom<=view.bottom+1};
                })
              })),finite:[...node.querySelectorAll('*')].every(child=>{
                const css=getComputedStyle(child),matrix=new DOMMatrix(css.transform);
                return Number.isFinite(+css.opacity)&&Array.from(matrix.toFloat64Array()).every(Number.isFinite);
              })};
          });
          const expected=spec.cues.reduce((last,c,index)=>(onset+offset)>=Math.ceil((cues[c].start+.4)*30)?index:last,-1);
          assert.equal(state.style,spec.content.style);assert.equal(state.filename,spec.content.filename);
          assert.equal(state.index,expected);assert.ok(state.finite);
          assert.deepEqual(state.documents.map(doc=>doc.rows.map(row=>row.text)),spec.content.documents);
          if(offset>=24) {
            assert.equal(state.progress,1);assert.equal(state.caret,'hidden');
            const version=['diff','morph','particles','dissolve','extrude'].includes(state.style)?expected:0;
            assert.deepEqual(state.documents.map((doc,index)=>doc.visible?index:-1).filter(index=>index>=0),[version]);
            if(['typing','workbench','terminal'].includes(state.style))state.documents[0].rows.forEach((row,index)=>{
              assert.equal(row.alpha,index<=expected?1:0);
              if(state.style!=='terminal'||index===0)assert.ok(row.tokens.every(alpha=>alpha===(index<=expected?1:0)));
            });
            if(state.style==='scroll')assert.ok(state.documents[0].rows[spec.content.focus[expected]].contained,'Focus line is clipped');
            assert.deepEqual(await inspect(),[],scene.name+' settled code');
          }
          if(state.spatial) {
            const s=state.spatial;
            assert.equal(s.state.index,expected);assert.equal(s.state.progress,state.progress);assert.equal(s.state.style,state.style);
            assert.ok(s.fonts.every(font=>font.includes('BrandMono')));assert.ok(Object.values(s.state).filter(v=>typeof v==='number').every(Number.isFinite));
            assert.equal(s.visible,s.state.moving?'visible':'hidden');assert.equal(s.alpha,1-s.state.native);
            assert.equal(s.stats.revision,'185');assert.ok(s.stats.contexts<=1&&s.stats.geometries<=1&&s.stats.textures<=1&&s.stats.particles<=80000);
            if(s.state.moving)assert.equal(s.stats.contexts,1);
            if(state.progress===1){assert.equal(s.state.native,1);assert.equal(s.state.rx,0);assert.equal(s.state.ry,0);assert.equal(s.state.cameraOffset,0);}
          }
          samples.at(-1).code_story={style:state.style,index:state.index,progress:state.progress};
        }
        if(catalogSwap) {
          const observed=await page.locator('.scene[aria-hidden="false"] .screen-view').evaluate(node=>({
            kind:node.dataset.screenSwap,index:+node.dataset.swapIndex,progress:+node.dataset.swapProgress,
            clipped:getComputedStyle(node).overflow==='hidden',burn:+node.dataset.catalogBurn,
            images:[...node.querySelectorAll('.catalog-swap-image')].map(image=>{
              const style=getComputedStyle(image),matrix=new DOMMatrix(style.transform);
              return {src:image.getAttribute('src'),fit:style.objectFit,decoded:image.complete&&image.naturalWidth>=32,
                visible:style.visibility==='visible',alpha:+style.opacity,clip:style.clipPath,filter:style.filter,
                identity:matrix.isIdentity,finite:Array.from(matrix.toFloat64Array()).every(Number.isFinite)};
            }),layers:[...node.querySelectorAll('.catalog-swap-layer')].filter(n=>getComputedStyle(n).display!=='none').map(n=>({
              color:n.dataset.color,alpha:+getComputedStyle(n).opacity,box:[n.offsetLeft,n.offsetTop,n.offsetWidth,n.offsetHeight]}))
          }));
          const cueIndex=spec.cues.indexOf(cue),active=offset<0?Math.max(0,cueIndex-1):cueIndex;
          const p=offset<0?Math.max(0,Math.min(1,((onset+offset)-Math.ceil((cues[spec.cues[active]].start+.4)*30))/24)):
            Math.max(0,Math.min(1,offset/24));
          assert.equal(observed.kind,spec.content.swap);assert.equal(observed.index,active);assert.equal(observed.progress,p);
          assert.ok(observed.clipped);assert.equal(observed.images.length,spec.content.images.length);
          observed.images.forEach((image,index)=>{
            assert.equal(image.src,configuration.assets[spec.content.images[index]]);assert.equal(image.fit,'contain');
            assert.ok(image.decoded&&image.finite);assert.ok(image.alpha>=0&&image.alpha<=1);
            if(image.visible)assert.ok(index===active||(active>0&&index===active-1),'Unrelated still leaked into catalog swap');
          });
          assert.ok(observed.layers.length<=12&&observed.layers.every(l=>['accent','secondary','ground'].includes(l.color)&&
            l.alpha>=0&&l.alpha<=1&&l.box.every(Number.isFinite)));
          if(active===0||p===0||p===1) {
            const visible=active>0&&p===0?active-1:active;
            assert.equal(observed.layers.length,0);assert.equal(observed.burn,0);
            assert.deepEqual(observed.images.map((image,index)=>image.visible?index:-1).filter(index=>index>=0),[visible]);
            const image=observed.images[visible];assert.equal(image.alpha,1);assert.equal(image.clip,'none');
            assert.equal(image.filter,'none');assert.ok(image.identity,'Catalog endpoint must restore the complete original still');
          }
          samples.at(-1).catalog_swap={kind:observed.kind,index:observed.index,progress:p,layers:observed.layers.length};
        }
        if(spec.kind==='headline') {
          const state=await page.locator('.scene[aria-hidden="false"] .headline-window').evaluate(node=>({
            index:+node.dataset.headlineIndex,progress:+node.dataset.headlineProgress,kind:node.dataset.headlineSwap,
            caret:Number(getComputedStyle(node.querySelector('.headline-caret')).opacity),
            cover:Number(getComputedStyle(node.querySelector('.headline-cover')).opacity),
            layers:[...node.querySelectorAll('.headline-layer')].map(n=>({text:n.textContent,original:n.getAttribute('aria-label'),
              visible:getComputedStyle(n).visibility==='visible',opacity:Number(getComputedStyle(n).opacity),
              blur:getComputedStyle(n).filter,transform:getComputedStyle(n).transform,font:getComputedStyle(n.querySelector('span')).fontFamily}))
          }));
          const index=spec.cues.indexOf(cue);
          assert.equal(state.kind,spec.content.swap);assert.equal(state.index,offset<0?index-1:index);
          assert.deepEqual(state.layers.map(l=>l.original),spec.content.phrases);
          assert.ok(state.layers.every(l=>l.font.includes('BrandSans')),'Headline changed the approved font');
          assert.ok(state.layers.every((l,n)=>!l.visible||n===state.index||n===state.index-1),'Future headline leaked');
          if(offset>=24) {
            assert.equal(state.progress,1);assert.equal(state.caret,0);assert.equal(state.cover,0);
            const visible=state.layers.filter(l=>l.visible);assert.equal(visible.length,1);
            assert.equal(visible[0].text,spec.content.phrases[index]);assert.equal(visible[0].opacity,1);assert.equal(visible[0].blur,'none');
            assert.deepEqual(await inspect(),[],scene.name+' settled headline');
          }
          samples.at(-1).headline={kind:state.kind,index:state.index,progress:state.progress};
          if(spec.content.swap==='slice-sweep') {
            const slice=await page.locator('.scene[aria-hidden="false"] .headline-window').evaluate(slot=>{
              const canvas=slot.querySelector('canvas'),s=JSON.parse(slot.dataset.sliceState);let varied=0;
              if(s.moving) {
                const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
                for(let i=0;i<data.length;i+=28)if(Math.abs(data[i]-data[0])+Math.abs(data[i+1]-data[1])+Math.abs(data[i+2]-data[2])>15)varied++;
              }
              return {s,varied,visible:getComputedStyle(canvas).visibility==='visible'};
            });
            const moving=state.index>0&&state.progress>0&&state.progress<1;
            assert.equal(slice.visible,moving);assert.equal(slice.s.moving,moving);
            assert.equal(slice.s.index,state.index);assert.equal(slice.s.progress,state.progress);
            if(moving) {
              assert.ok(slice.s.tiles>0&&slice.s.tiles<=1600&&slice.s.flips>0&&slice.s.flips<=slice.s.tiles);
              assert.ok(slice.s.coverage.every(n=>n>0));assert.equal(slice.s.allFinite,true);
              assert.ok(slice.s.calls>=1&&slice.s.calls<=2);assert.ok(slice.s.font.includes('BrandSans'));
              assert.ok(slice.varied>0,'Slice shader lost all headline ink');
              assert.ok(state.layers.every(layer=>!layer.visible),'A flat headline leaked under the moving tile surface');
            }
            samples.at(-1).headline.slice=slice.s;
          }
          if(spec.content.swap==='circle-match') {
            const circle=await page.locator('.scene[aria-hidden="false"] .headline-window').evaluate(slot=>{
              const node=slot.querySelector('.headline-circle-carrier'),m=new DOMMatrix(node.style.transform);
              return {state:JSON.parse(slot.dataset.circleState),scale:[m.a,m.d],size:[node.offsetWidth,node.offsetHeight],
                matrix:Array.from(m.toFloat64Array()),visible:getComputedStyle(node).visibility};
            });
            assert.equal(state.layers.length,2);assert.ok(circle.matrix.every(Number.isFinite));assert.equal(circle.size[0],circle.size[1]);
            for(const value of circle.scale)assert.ok(Math.abs(value-circle.state.scale)<1e-6);
            assert.equal(circle.visible,state.index<0?'hidden':'visible');
            if(state.index===1) {
              const t=state.progress*2.35,after=t>=1.4;assert.equal(circle.state.after,after);
              const expected=after?1:0;
              assert.ok(state.layers.every((layer,i)=>!layer.visible||i===expected));
              if(state.progress===1){assert.equal(circle.state.scale,1.26);assert.equal(circle.state.copy,1);assert.equal(circle.state.y,0);}
            } else assert.equal(circle.state.scale,.54);
            samples.at(-1).headline.circle=circle.state;
          }
          if(spec.content.swap==='split-panel') {
            const panel=await page.locator('.scene[aria-hidden="false"] .headline-window').evaluate(slot=>({
              state:JSON.parse(slot.dataset.panelState),width:slot.clientWidth,height:slot.clientHeight,
              layers:[...slot.querySelectorAll('.headline-layer')].map(layer=>({
                matrix:Array.from(new DOMMatrix(getComputedStyle(layer).transform).toFloat64Array()),
                radius:parseFloat(layer.style.borderRadius),ink:+layer.querySelector('.headline-ink').style.opacity,
                text:layer.textContent,halves:[...layer.querySelectorAll('.headline-half')].map(half=>({
                  text:half.textContent,x:new DOMMatrix(getComputedStyle(half).transform).m41,y:new DOMMatrix(getComputedStyle(half).transform).m42}))}))
            }));
            assert.ok(panel.layers.every(l=>l.matrix.every(Number.isFinite)&&l.halves.map(h=>h.text).join('')===l.text));
            if(state.index>0) {
              const current=panel.layers[state.index],previous=panel.layers[state.index-1],p=state.progress;
              const t=p*2.2,clamp=x=>Math.max(0,Math.min(1,x)),a=1-(1-clamp((t-.58)/.47))**4;
              const exit=clamp((t-1.05)/1.15),grow=1-(1-exit)**5;
              assert.ok(Math.abs(current.matrix[0]-(.02+.44*a+(1-.02-.44*a)*grow))<1e-5);
              assert.ok(Math.abs(current.matrix[5]-(.02+.12*a+(1-.02-.12*a)*grow))<1e-5);
              assert.ok(Math.abs(previous.halves[0].x+previous.halves[1].x)<.001);
              assert.ok(Math.abs(previous.halves[0].y+previous.halves[1].y)<.001);
              if(p===1){assert.equal(current.radius,0);assert.equal(current.ink,1);}
            }
            samples.at(-1).headline.panel=panel.state;
          }
          if(['morph','strike','flap'].includes(spec.content.swap)) {
            const observed=await page.locator('.scene[aria-hidden="false"] .headline-window').evaluate(node=>({
              filter:getComputedStyle(node.querySelector('.headline-mask')).filter,
              leaves:[...node.querySelectorAll('.headline-flap-leaf')].map(n=>({visible:getComputedStyle(n).visibility,
                transform:n.style.transform,filter:n.style.filter,copy:n.firstElementChild.dataset.copy})),
              strikes:[...node.querySelectorAll('.headline-strike-rule')].map(n=>new DOMMatrix(getComputedStyle(n).transform).a)
            }));
            const p=state.progress;
            if(spec.content.swap==='morph')assert.equal(observed.filter!=='none',state.index>=0&&p>0&&p<1);
            if(spec.content.swap==='strike') {
              observed.strikes.forEach((amount,n)=>assert.ok(amount>=0&&amount<=1&&(n===state.index-1||amount===0)));
            }
            if(spec.content.swap==='flap') {
              assert.equal(observed.leaves.length,2);
              if(state.index<0||p===0||p===1)assert.ok(observed.leaves.every(n=>n.visible==='hidden'&&n.copy===''&&n.transform==='none'&&n.filter==='none'));
              else observed.leaves.forEach((leaf,j)=>{
                const visible=(j===0?p*p<.5&&state.index>0:p*p>=.5);
                assert.equal(leaf.visible==='visible',visible);
                if(visible)assert.equal(leaf.copy,spec.content.phrases[state.index-(j===0?1:0)]);
              });
            }
            samples.at(-1).headline.treatment=observed;
          }
        }
        if(batchType) {
          const state=await page.locator('.scene[aria-hidden="false"] .prod-title').evaluate(node=>({
            text:node.textContent,progress:+node.dataset.revealProgress,mask:node.style.maskImage,
            overlay:node.style.getPropertyValue('--type-overlay-visible'),font:getComputedStyle(node).fontFamily,
            parts:[node,...node.querySelectorAll('.type-word')].map(n=>({opacity:+getComputedStyle(n).opacity,filter:n.style.filter,transform:n.style.transform}))
          }));
          const p=Math.max(0,Math.min(1,offset/24));assert.equal(state.progress,p);assert.equal(state.text,spec.content.title);
          assert.ok(state.font.includes('BrandSans'));
          if(p===1) {
            assert.ok(state.parts.every(n=>n.opacity===1&&n.filter==='none'&&n.transform==='none'));
            if(spec.content.reveal==='mask-reveal')assert.equal(state.mask,'none');
            if(['scan-band','accent-glitch','shimmer-sweep'].includes(spec.content.reveal))assert.equal(state.overlay,'0');
          }
          samples.at(-1).typography={kind:spec.content.reveal,progress:p};
          if(readingType) {
            const words=await page.locator('.scene[aria-hidden="false"] .type-read-slot').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,state:JSON.parse(n.dataset.readState)})));
            assert.deepEqual(words.map(w=>w.text),spec.content.title.split(/\s+/));
            for(const word of words)assert.ok(Object.values(word.state).every(Number.isFinite));
            if(p===1)for(const word of words)assert.deepEqual(word.state,{opacity:1,x:0,y:0,scale:1,highlight:0,sweep:100,glow:0,ink:1});
            samples.at(-1).typography.words=words;
          }
        }
        if(spec.kind==='title'&&spec.content.marker) {
          const state=await page.locator('.scene[aria-hidden="false"] .prod-title').evaluate(node=>{
            const mark=node.querySelector('.title-marker'),svg=mark.querySelector('svg'),path=mark.querySelector('path');
            const box=svg.getBoundingClientRect(),title=node.getBoundingClientRect();
            return {text:node.textContent,target:mark.textContent,kind:mark.dataset.markerStyle,progress:+mark.dataset.markerProgress,
              length:path.getTotalLength(),offset:parseFloat(path.style.strokeDashoffset),opacity:Number(path.style.opacity),
              contained:box.left>=title.left-1&&box.right<=title.right+1&&box.top>=title.top-1&&box.bottom<=title.bottom+1};
          });
          assert.equal(state.text,spec.content.title);assert.equal(state.target,spec.content.marker.text);assert.equal(state.kind,spec.content.marker.style);
          assert.equal(state.contained,true,'Marker outside title bounds');
          assert.ok(state.offset>=0&&state.offset<=state.length);
          if(cue===spec.cues[0]||offset<=0){assert.equal(state.progress,0);assert.equal(state.opacity,0);}
          if(cue===spec.cues[1]&&offset>=24){assert.equal(state.progress,1);assert.equal(state.offset,0);assert.ok(state.opacity>0);}
          samples.at(-1).marker=state;
          if(spec.content.marker.note) {
            const note=await page.locator('.scene[aria-hidden="false"] .title-note-layer').evaluate(n=>({
              text:n.querySelector('.title-note').textContent,progress:+n.dataset.noteProgress,connector:+n.dataset.connectorProgress}));
            assert.equal(note.text,spec.content.marker.note);assert.ok(note.progress>=0&&note.progress<=1&&note.connector>=0&&note.connector<=1);
            if(cue===spec.cues[1]&&offset>=24){assert.equal(note.progress,1);assert.equal(note.connector,1);}
            samples.at(-1).title_note=note;
          }
        }
        if(editorial) {
          const observed=await page.locator('.scene[aria-hidden="false"] .production-content').evaluate(host=>{
            const frame=host.querySelector('.hand-frame-board'),channel=host.querySelector('.channel-lower'),pipeline=host.querySelector('[data-diagram-style]');
            return {closing:host.dataset.closingStyle?{style:host.dataset.closingStyle,p:+host.dataset.closingProgress,state:JSON.parse(host.dataset.closingState),
              heading:host.querySelector('.prod-title').textContent,action:host.querySelector('.cta-action').textContent,label:host.querySelector('.cta-label').textContent}:null,
              frame:frame?{p:+frame.dataset.handFrameProgress,state:JSON.parse(frame.dataset.handFrameState),label:frame.querySelector('.hand-frame-label').textContent,
                image:frame.querySelector('img').getAttribute('src'),fit:getComputedStyle(frame.querySelector('img')).objectFit}:null,
              channel:channel?{p:+channel.dataset.channelProgress,entry:+channel.dataset.channelEntry,state:JSON.parse(channel.dataset.channelState),
                name:channel.querySelector('.channel-name').textContent,role:channel.querySelector('.channel-role').textContent,logo:channel.querySelector('img').getAttribute('src'),
                labels:[...channel.querySelectorAll('.channel-button span')].map(n=>n.textContent)}:null,
              pipeline:pipeline?{style:pipeline.dataset.diagramStyle,labels:[...pipeline.querySelectorAll('h3')].map(n=>n.textContent),
                bodies:[...pipeline.querySelectorAll('.resource-diagram-body')].map(n=>n.textContent),
                boxes:[...pipeline.querySelectorAll('.hand-pipeline-border path')].map(n=>({length:n.getTotalLength(),offset:+n.getAttribute('stroke-dashoffset')}))}:null};
          });
          const finite=value=>typeof value==='number'?Number.isFinite(value):value&&typeof value==='object'?Object.values(value).every(finite):true;
          assert.ok(finite(observed));
          if(observed.closing) {
            const c=observed.closing;assert.equal(c.style,spec.content.style);assert.equal(c.heading,spec.content.heading);assert.equal(c.action,spec.content.action);assert.equal(c.label,spec.content.label);
            const p=Math.max(0,Math.min(1,offset/24));assert.ok(Math.abs(c.p-p)<1e-8);
            if(p===1){assert.equal(c.state.scale,1);assert.equal(c.state.action,1);assert.equal(c.state.label,1);assert.ok(c.state.units.every(a=>a===1));}
            if(c.style==='sting')assert.equal(c.state.flash,Math.floor(p*24+1e-8)===14?1:0);
          }
          if(observed.frame) {
            const f=observed.frame;assert.equal(f.image,configuration.assets[spec.content.items[0].image]);assert.equal(f.label,spec.content.items[0].label);assert.equal(f.fit,'contain');
            if(offset>=24){assert.equal(f.p,1);assert.equal(f.state.border,1);assert.equal(f.state.media,1);assert.equal(f.state.caption,1);assert.ok(f.state.doodles.every(a=>a===1));}
          }
          if(observed.channel) {
            const c=observed.channel;assert.equal(c.name,spec.content.name);assert.equal(c.role,spec.content.role);assert.equal(c.logo,'assets/logo.png');
            assert.deepEqual(c.labels,[spec.content.button.before,spec.content.button.after]);
            const start=Math.ceil((cues[spec.cues[1]].start+.4)*30),p=Math.max(0,Math.min(1,(onset+offset-start)/24));assert.ok(Math.abs(c.p-p)<1e-8);
            if(p===0){assert.equal(c.state.before,1);assert.equal(c.state.after,0);}
            if(p===1){assert.equal(c.state.before,0);assert.equal(c.state.after,1);assert.equal(c.state.scale,1);}
          }
          if(observed.pipeline) {
            assert.equal(observed.pipeline.style,'hand-drawn');assert.deepEqual(observed.pipeline.labels,spec.content.steps.map(s=>s.label));assert.deepEqual(observed.pipeline.bodies,spec.content.steps.map(s=>s.body));
            assert.ok(observed.pipeline.boxes.every(b=>b.length>0&&b.offset>=0&&b.offset<=b.length));
          }
          assert.deepEqual(await inspect(),[],scene.name+' editorial frame '+(onset+offset));samples.at(-1).editorial=observed;
        }
        if(mediaCamera) {
          const observed=await page.locator('.scene[aria-hidden="false"] .media-camera-board').evaluate(node=>({
            state:JSON.parse(node.dataset.cameraState),labels:[...node.querySelectorAll('.media-camera-label')].map(n=>n.textContent),
            heading:node.parentElement.querySelector('.prod-heading').textContent,source:node.parentElement.querySelector('.resource-source').textContent,
            images:[...node.querySelectorAll('img')].map(n=>({src:n.getAttribute('src'),fit:getComputedStyle(n).objectFit,dimensions:[n.naturalWidth,n.naturalHeight],transform:getComputedStyle(n).transform}))}));
          assert.equal(observed.state.style,spec.content.camera.style);
          assert.deepEqual(observed.labels,spec.content.items.map(item=>item.label));
          assert.equal(observed.heading,spec.content.heading);assert.equal(observed.source,spec.content.source);
          assert.ok(observed.images.every(image=>image.fit==='contain'));
          observed.images.forEach((image,index)=>{
            assert.equal(image.src,configuration.assets[spec.content.items[index].image]);assert.ok(image.dimensions.every(n=>n>=32));
          });
          assert.ok(observed.state.progress>=0&&observed.state.progress<=1);
          const returnStart=spec.content.camera.style==='punch-reset'?Math.ceil((cues[spec.cues[2]].start+.4)*30):Infinity;
          const returning=onset+offset>=returnStart;
          const motionStart=returning?returnStart:Math.ceil((cues[spec.cues[1]].start+.4)*30);
          assert.equal(observed.state.reset,returning);
          assert.ok(Math.abs(observed.state.progress-Math.max(0,Math.min(1,(onset+offset-motionStart)/24)))<1e-8,'Camera must follow its caption cue');
          const last=spec.cues.at(-1),lastStart=Math.ceil((cues[last].start+.4)*30);
          if(onset+offset>=lastStart+24) {
            assert.equal(observed.state.progress,1);
            if(spec.content.camera.style==='punch-reset') {
              assert.equal(observed.state.reset,true);assert.equal(observed.state.poses[0].scale,1);assert.equal(observed.state.poses[0].pulse,0);
            }
            if(spec.content.camera.style==='pull-back')assert.equal(observed.state.poses[0].scale,1);
            if(['handheld-','rig-','pendulum-','extended-'].some(prefix=>spec.content.camera.style.startsWith(prefix))) {
              for(const pose of observed.state.poses)for(const [key,value] of Object.entries({scale:1,x:0,y:0,rx:0,ry:0,roll:0}))assert.equal(pose[key],value);
              assert.ok(observed.images.every(image=>image.transform==='none'),'Finite camera recipe must restore the original still');
            }
          }
          assert.deepEqual(await inspect(),[],scene.name+' camera frame '+(onset+offset));
          samples.at(-1).media_camera=observed;
        }
        if(spec.kind==='media-grid'&&!mediaCamera&&!mediaSpatial&&!mediaPresentation&&!cursorScene&&!handFrame) {
          const state=await page.locator('.scene[aria-hidden="false"]').evaluate(node=>({
            source:node.querySelector('.resource-source').textContent,
            layout:node.querySelector('.media-board').dataset.mediaLayout,
            treatment:node.querySelector('.media-board').dataset.mediaTreatment,
            cards:[...node.querySelectorAll('.media-card')].map(card=>{
              const s=getComputedStyle(card),w=getComputedStyle(card.parentElement),image=card.querySelector('img'),m=new DOMMatrix(s.transform);
              const light=card.querySelector('.media-gloss,.media-spot');
              return {progress:+card.dataset.mediaProgress,opacity:+s.opacity,wing:w.transform,
                rotation:[m.m11,m.m13],image:image.getAttribute('src'),fit:getComputedStyle(image).objectFit,
                dimensions:[image.naturalWidth,image.naturalHeight],label:card.querySelector('.media-label').textContent,
                light:light?+getComputedStyle(light).opacity:0,
                sweep:light?.classList.contains('media-gloss')?+light.style.getPropertyValue('--media-sweep'):null};})
          }));
          const treatment=spec.content.treatment||'box';
          assert.equal(state.source,spec.content.source);assert.equal(state.layout,spec.content.layout);assert.equal(state.treatment,treatment);
          assert.equal(state.cards.length,spec.content.items.length);
          state.cards.forEach((card,index)=>{
            const p=Math.max(0,Math.min(1,((onset+offset)-Math.ceil((cues[spec.cues[index]].start+.4)*30))/24));
            assert.ok(Math.abs(card.progress-p)<1e-8,'Media item must follow its own cue');
            assert.ok(Math.abs(card.opacity-(1-(1-p)**4))<1e-6,'Media item revealed without its cue');
            assert.equal(card.image,configuration.assets[spec.content.items[index].image]);assert.equal(card.fit,'contain');
            assert.equal(card.label,spec.content.items[index].label);assert.ok(card.dimensions.every(n=>n>=32));
            const angle=treatment==='book-open'?(index===0?18:-18):0;
            assert.ok(Math.abs(card.rotation[0]-Math.cos(angle*Math.PI/180))<1e-6);
            assert.ok(Math.abs(card.rotation[1]+Math.sin(angle*Math.PI/180))<1e-6);
            if(p===1){assert.equal(card.wing,'matrix(1, 0, 0, 1, 0, 0)');assert.equal(card.light,0);}
            if(treatment==='gloss') {
              assert.equal(card.light,p>=.65/1.35&&p<1?1:0);
              const q=Math.max(0,Math.min(1,(p-.65/1.35)/(.7/1.35)));
              assert.ok(Math.abs(card.sweep-(-30+160*(1-(1-q)**3)))<1e-8);
            }
            if(treatment==='spotlight')assert.ok(Math.abs(card.light-(p>0&&p<1?Math.sin(Math.PI*p):0))<1e-6);
          });
          samples.at(-1).media_check={layout:state.layout,treatment:state.treatment,progress:state.cards.map(card=>card.progress)};
        }
        if(mediaSurface) {
          const observed=await page.locator('.scene[aria-hidden="false"] .media-picture').evaluate(picture=>{
            const image=picture.querySelector('.media-image'),device=picture.querySelector('.surface-device'),raster=picture.querySelector('.media-raster');
            return {style:picture.dataset.mediaSurface,progress:+picture.dataset.surfaceProgress,
              state:JSON.parse(picture.dataset.surfaceState),fit:JSON.parse(picture.dataset.surfaceFit),
              area:[picture.clientWidth,picture.clientHeight],image:[image.naturalWidth,image.naturalHeight],
              focus:picture.dataset.focusGeometry?JSON.parse(picture.dataset.focusGeometry):null,
              device:device?{width:parseFloat(device.style.width),height:parseFloat(device.style.height),cutout:device.dataset.cutout}:null,
              freeze:picture.querySelector('.surface-freeze')?[...picture.querySelector('.surface-freeze').children].map(n=>({alpha:+n.style.opacity,matrix:Array.from(new DOMMatrix(n.style.transform||'none').toFloat64Array())})):null,
              drift:picture.querySelector('.surface-drift')?{
                card:Array.from(new DOMMatrix(picture.querySelector('.surface-front').style.transform).toFloat64Array()),
                sweep:Array.from(new DOMMatrix(picture.querySelector('.surface-drift').style.transform).toFloat64Array()),
                alpha:+picture.querySelector('.surface-drift').style.opacity}:null,
              dive:picture.querySelector('.surface-dive-part')?{
                cutout:+picture.querySelector('.surface-device-cutout').style.opacity,
                origin:getComputedStyle(device).transformOrigin,
                matrix:Array.from(new DOMMatrix(device.style.transform).toFloat64Array()),
                copies:[...picture.querySelectorAll('.surface-dive-part')].map(n=>({matrix:Array.from(new DOMMatrix(n.style.transform).toFloat64Array()),
                  clip:n.style.clipPath,src:n.firstChild.getAttribute('src'),fit:getComputedStyle(n.firstChild).objectFit,ready:n.firstChild.complete&&n.firstChild.naturalWidth>=32})),
                src:image.getAttribute('src')}:null,
              raster:raster?{ready:raster.dataset.rasterReady,style:raster.dataset.rasterStyle,width:raster.width,height:raster.height,
                visibility:image.style.visibility,opacity:+image.style.opacity,transform:image.style.transform,clip:image.style.clipPath,
                clear:+picture.dataset.surfaceProgress===1&&!picture.dataset.mediaSurface.startsWith('ascii-')
                  ?raster.getContext('2d').getImageData(0,0,raster.width,raster.height).data.every((v,i)=>i%4!==3||v===0):null}:null};
          });
          const p=Math.max(0,Math.min(1,offset/24)),style=spec.content.surface.style;
          assert.equal(observed.style,style);assert.ok(Math.abs(observed.progress-p)<1e-8);
          if(observed.raster) {
            const r=observed.raster;assert.equal(r.ready,'true');assert.equal(r.style,style);
            assert.deepEqual([r.width,r.height],observed.area);
            if(p===1) {
              if(style.startsWith('ascii-')){assert.equal(observed.state.step,4);assert.equal(r.visibility,'hidden');}
              else {assert.equal(r.clear,true);assert.equal(r.visibility,'visible');assert.equal(r.opacity,1);assert.equal(r.transform,'none');assert.equal(r.clip,'none');}
            }
          }
          const [w,h]=observed.area,[iw,ih]=observed.image,scale=Math.min(w/iw,h/ih),f=observed.fit;
          for(const [key,value] of Object.entries({x:(w-iw*scale)/2,y:(h-ih*scale)/2,width:iw*scale,height:ih*scale}))assert.ok(Math.abs(f[key]-value)<1e-6,'Surface must retain contained image geometry');
          if(observed.focus) {
            const t=spec.content.surface.target,expected={x:f.x+(t.x+t.width/2)*f.width,y:f.y+(t.y+t.height/2)*f.height,rx:t.width*f.width/2,ry:t.height*f.height/2};
            for(const [key,value] of Object.entries(expected))assert.ok(Math.abs(observed.focus[key]-value)<1e-6,'Focus must follow the source image');
          }
          if(observed.device) {
            assert.ok(Math.abs(observed.device.width/observed.device.height-(style==='tablet'?3/4:9/19.5))<1e-6);
            assert.equal(observed.device.cutout,style==='phone-dive'?'island':spec.content.surface.cutout||'none');
          }
          if(observed.freeze) {
            const s=observed.state;assert.deepEqual(observed.freeze.map(n=>n.alpha),[s.paper,s.tapes[0].alpha,s.tapes[1].alpha,s.flash]);
            assert.ok(observed.freeze.every(n=>n.matrix.every(Number.isFinite)));
          }
          if(observed.drift) {
            const d=observed.drift,s=observed.state,angle=s.rotation*Math.PI/180;
            assert.ok([...d.card,...d.sweep].every(Number.isFinite));assert.equal(d.alpha,s.sweepAlpha);
            assert.ok(Math.abs(d.card[0]-s.scale*Math.cos(angle))<1e-6);assert.ok(Math.abs(d.card[1]-s.scale*Math.sin(angle))<1e-6);
            assert.ok(Math.abs(d.sweep[12]-s.sweepX*observed.area[0]/100)<.001);
            if(p===1){assert.equal(s.scale,1.015);assert.equal(s.sweepX,-42);}
          }
          if(observed.dive) {
            const d=observed.dive,s=observed.state;assert.equal(d.cutout,s.cutout);assert.equal(d.copies.length,3);
            assert.ok(d.matrix.every(Number.isFinite));assert.ok(Math.abs(d.matrix[0]-s.scale)<1e-6);
            assert.ok(Math.abs(d.matrix[13]-s.y*observed.area[1]/100)<.001);
            d.copies.forEach((copy,i)=>{
              assert.equal(copy.src,d.src);assert.equal(copy.fit,'contain');assert.ok(copy.ready);assert.ok(copy.clip.startsWith('inset('));
              assert.ok(copy.matrix.every(Number.isFinite));assert.ok(Math.abs(copy.matrix[0]-s.layers[i].scale)<1e-6);
              assert.ok(Math.abs(copy.matrix[13]-s.layers[i].y*observed.area[1]/100)<.001);
            });
          }
          if(p===1) {
            const s=observed.state;
            if(style.endsWith('-fill')){assert.equal(s.alpha,1);assert.equal(s.y,0);assert.equal(s.scale,1);}
            if(observed.device){assert.equal(s.y,style==='phone-dive'?2.4:0);assert.equal(s.scale,style==='phone-dive'?6.4:1);}
            if(style==='phone-dive'){assert.equal(s.cutout,0);assert.equal(s.alpha,1);s.layers.forEach(l=>{assert.equal(l.y,0);assert.equal(l.scale,1);});}
            if(style==='freeze-paper'){assert.equal(s.paper,0);assert.equal(s.flash,0);s.tapes.forEach(l=>assert.equal(l.alpha,0));}
            if(style==='editorial-flash'){assert.equal(s.wash,0);assert.equal(s.core,0);assert.equal(s.sweep,0);}
            if(style==='light-leak')assert.equal(s.alpha,0);
            if(style==='beat-accent'){assert.equal(s.flash,0);assert.equal(s.scale,1);}
            if(style==='light-sweep'){assert.equal(s.band,0);assert.equal(s.lightX,62);}
            if(style==='grain')assert.deepEqual(s.offset,[0,0]);
          }
          assert.deepEqual(await inspect(),[],scene.name+' surface frame '+(onset+offset));
          samples.at(-1).media_surface=observed;
        }
        if(type) {
          const p=Math.max(0,Math.min(1,offset/24));
          const state=await page.locator('.scene[aria-hidden="false"] .prod-title').evaluate(node=>{
            const s=getComputedStyle(node),matrix=new DOMMatrix(s.transform);
            return {text:node.textContent,progress:+node.dataset.revealProgress,background:s.backgroundImage,
              x:matrix.e,y:matrix.f,scale:matrix.a,
              units:[...node.querySelectorAll('.type-word')].map(word=>({text:word.textContent,row:word.dataset.typeRow,
                opacity:Number(getComputedStyle(word).opacity),visible:getComputedStyle(word).visibility,clip:getComputedStyle(word).clipPath})),
              glyphs:[...node.querySelectorAll('.type-glyph')].map(n=>({text:n.textContent,opacity:Number(getComputedStyle(n).opacity)}))};
          });
          if(spec.content.reveal!=='matrix'||p===1)assert.equal(state.text,spec.content.title);
          assert.equal(state.progress,p);
          if(spec.content.reveal==='text-shimmer')assert.equal(state.background==='none',p===0||p===1);
          if(spec.content.reveal==='clip-wipe'&&p===0)assert.ok(state.units.every(n=>n.clip==='inset(0px 100% 0px 0px)'));
          if(spec.content.reveal==='streaming') {
            let hidden=false;
            for(const unit of state.units){if(unit.visible==='hidden')hidden=true;else assert.equal(hidden,false,'Streaming words must arrive in reading order');}
          }
          if(spec.content.reveal==='headline-slam'||spec.content.reveal==='char-slam') {
            const start=spec.content.reveal==='headline-slam'?18:21;
            const x=offset===start?4:offset===start+1?-3:0,y=offset===start?-2:offset===start+1?1:0;
            assert.equal(state.x,x);assert.equal(state.y,y);
            if(offset>=start)assert.equal(state.scale,1);
          }
          samples.at(-1).typography={kind:spec.content.reveal,progress:p,word_count:state.units.length,glyph_count:state.glyphs.length};
        }
        if(spec.kind==='testimonial'||spec.kind==='proof'||(spec.kind==='chart'&&spec.content.metric_style==='star-rating')) {
          const value=spec.kind==='chart'?spec.content.record.data.value:spec.content.rating;
          const maximum=spec.kind==='chart'?spec.content.maximum:5;
          const p=Math.max(0,Math.min(1,((onset+offset)-Math.ceil((cues[spec.cues[0]].start+.4)*30))/24));
          const stars=await page.locator('.scene[aria-hidden="false"] .evidence-stars').evaluate(svg=>({
            maximum:+svg.dataset.ratingMaximum,value:+svg.dataset.ratingValue,progress:+svg.dataset.ratingProgress,
            width:+svg.querySelector('[data-rating-mask]').getAttribute('width'),total:svg.viewBox.baseVal.width,
            base:[...svg.querySelectorAll('[data-rating-base] path')].map(n=>({path:n.getAttribute('d'),transform:n.getAttribute('transform')})),
            fill:[...svg.querySelectorAll('[data-rating-fill] path')].map(n=>({path:n.getAttribute('d'),transform:n.getAttribute('transform')}))}));
          assert.equal(stars.maximum,maximum);assert.equal(stars.value,value);assert.equal(stars.base.length,maximum);
          assert.deepEqual(stars.base,stars.fill,'Star paint layers must share geometry');
          assert.ok(Math.abs(stars.progress-p)<1e-8);
          assert.ok(Math.abs(stars.width/stars.total-value/maximum*(1-Math.cos(Math.PI*p))/2)<1e-8,'Rating mask misrepresents its value');
          if(p===1)assert.ok(stars.base.every(n=>n.transform.includes('scale(1)')),'Stars did not settle');
          samples.at(-1).rating_check={value,maximum,progress:p,fraction:stars.width/stars.total};
        }
        if(spec.kind==='trust') {
          const marks=await page.locator('.scene[aria-hidden="false"] .evidence-mark').evaluateAll(nodes=>nodes.map(n=>+getComputedStyle(n).opacity));
          spec.cues.forEach((anchor,index)=>{
            const p=Math.max(0,Math.min(1,((onset+offset)-Math.ceil((cues[anchor].start+.4)*30))/24));
            const style=spec.content.style||'standard';
            const phase=style==='logo-wall'?Math.max(0,Math.min(1,(p*.7-.15)/.55)):style==='spring-pop'?Math.min(1,p*2):p;
            assert.ok(Math.abs(marks[index]-(1-(1-phase)**3))<.00001,'Trust mark revealed without its cue');
          });
        }
        if(spec.kind==='chart'&&spec.content.metric_style&&spec.content.metric_style!=='count') {
          const state=await page.locator('.scene[aria-hidden="false"] .production-plot').evaluate(plot=>{
            const gauge=plot.querySelector('[data-metric-gauge]');
            return {progress:plot.dataset.chartProgress.split(',').map(Number),
              gauge:gauge?{tag:gauge.tagName,r:+gauge.getAttribute('r'),offset:+gauge.getAttribute('stroke-dashoffset'),width:+gauge.getAttribute('width')}:null,
              reels:[...plot.querySelectorAll('[data-metric-reel]')].map(frame=>{
                const strip=frame.querySelector('g'),final=strip.lastElementChild,box=final.getBoundingClientRect();
                // A nested SVG bounding box includes off-mask children; measure its viewport rectangle.
                const clip=frame.querySelector('[data-metric-viewport]').getBoundingClientRect();
                return {index:+frame.dataset.metricReel,rows:strip.childElementCount,row:+frame.getAttribute('height'),
                  y:strip.transform.baseVal.consolidate().matrix.f,final:final.textContent,
                  clipped:getComputedStyle(frame).overflow==='hidden',
                  contained:box.left>=clip.left-1&&box.right<=clip.right+1&&box.top>=clip.top-1&&box.bottom<=clip.bottom+1};}),
              finals:[...plot.querySelectorAll('[data-metric-final]')].map(node=>({text:node.textContent,
                visible:getComputedStyle(node).visibility==='visible',filter:getComputedStyle(node).filter,
                transform:node.getAttribute('transform')}))};
          });
          const p=Math.max(0,Math.min(1,offset/24)),style=spec.content.metric_style;
          assert.ok(Math.abs(state.progress[spec.cues.indexOf(cue)]-p)<1e-8,'Metric must use the shared quantized clock');
          if(statCard)samples.at(-1).stat_card=await inspectStatCard(spec,(onset+offset)/30);
          if(style==='count-burst') {
            const burst=await page.locator('.scene[aria-hidden="false"] .production-plot').evaluate(plot=>({
              state:JSON.parse(plot.dataset.burstState),value:plot.querySelector('[data-chart-metric]').textContent,
              icons:[...plot.querySelectorAll('[data-metric-burst]')].map(icon=>{
                const m=icon.transform.baseVal.consolidate().matrix;
                return {opacity:+icon.getAttribute('opacity'),matrix:[m.a,m.b,m.c,m.d,m.e,m.f]};})}));
            const first=state.progress[0],q=state.progress[1],value=spec.content.record.data.value;
            assert.equal(burst.value,first===1?String(value):String(Number((value*first).toFixed(2))));
            assert.equal(burst.icons.length,62);assert.equal(burst.state.icons.length,62);
            burst.icons.forEach((icon,i)=>{
              assert.ok(icon.matrix.every(Number.isFinite));assert.ok(icon.opacity>=0&&icon.opacity<=1);
              assert.equal(icon.opacity,burst.state.icons[i].opacity);
            });
            if(q===0||q===1){assert.ok(burst.icons.every(icon=>icon.opacity===0));assert.equal(burst.state.flash,0);assert.equal(burst.state.scale,1);}
            samples.at(-1).metric_burst={progress:q,icons:burst.icons.length};
          }
          if(state.gauge) {
            const fraction=spec.content.record.data.value/spec.content.maximum*(style==='conic-ring'?1-(1-p)**3:(1-Math.cos(Math.PI*p))/2);
            const actual=style==='usage-arc'||style==='conic-ring'?1-state.gauge.offset/(2*Math.PI*state.gauge.r):state.gauge.width/geometry.plot[2];
            assert.ok(Math.abs(actual-fraction)<1e-8,'Gauge does not encode value / explicit maximum');
          }
          for(const reel of state.reels) {
            assert.ok(reel.clipped,'Metric reel viewport must clip its off-row digits');
            const q=Math.max(0,Math.min(1,(p-.22*reel.index/Math.max(1,state.finals.length-1))/.78));
            const travel=style==='wheel'?1-(1-q)**3:(1-Math.cos(Math.PI*q))/2;
            assert.ok(Math.abs(reel.y+(reel.rows-1)*reel.row*travel)<.002,'Reel failed to reach its digit row');
            if(p===1)assert.ok(reel.contained,'Final metric digit is clipped');
          }
          if(p===1&&state.finals.length) {
            assert.equal(state.finals.map(n=>n.text).join(''),String(spec.content.record.data.value));
            assert.ok(state.finals.every(n=>n.visible&&n.filter==='none'),'Metric did not settle to readable type');
          }
          samples.at(-1).metric_check={style,progress:p,reels:state.reels.length,gauge:state.gauge};
        }
      }
      assert.ok(new Set(samples.map(item=>item.composition_sha256)).size>1,'Static visual beat: '+scene.name);
      report.beats.push({scene:scene.name,cue,samples});
    }
  }
  for(let i=1;i<scenes.length;i++) {
    const cut=scenes[i].start,frame=Math.ceil(cut*30),kind=episode.scenes[i-1].transition,samples=[];
    for(const offset of [-12,-6,-3,-2,-1,0,1,2,3,6,12]) {
      const t=(frame+offset)/30,pixels=await seekCheck(t,scenes[i].end-.5,'seam '+i+' frame '+(frame+offset));
      const state=await page.evaluate(kind=>{
        const visible=[...document.querySelectorAll('.scene')].filter(node=>getComputedStyle(node).visibility==='visible');
        const box=visible[0].querySelector(kind==='text-match'?'[data-match-carrier]':'.production-stage').getBoundingClientRect();
        const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [r.left,r.top,r.width,r.height];};
        const style=getComputedStyle(visible[0].querySelector('.production-stage'));
        return {visible:visible.length,center:(box.left+box.right)/2,centerY:(box.top+box.bottom)/2,width:box.width,
          stageOpacity:Number(style.opacity),filter:style.filter,
          caption:rect('.spoken-caption'),logo:rect('.logo'),ground:getComputedStyle(document.getElementById('film')).backgroundColor};
      },kind);
      assert.equal(state.visible,1);assert.deepEqual(state.caption,geometry.caption);
      assert.deepEqual(state.logo,geometry.logo);
      assert.notEqual(state.ground,'rgba(0, 0, 0, 0)');
      if(samples.length){assert.deepEqual(state.logo,samples[0].logo);assert.equal(state.ground,samples[0].ground);}
      samples.push({frame:frame+offset,offset,sha256:sha(pixels),...state});
    }
    const before=samples.filter(s=>s.offset<0),after=samples.filter(s=>s.offset>=0);
    const scaled=['zoom-through','inverse-zoom','rack-focus'].includes(kind),vertical=['cut-up','cut-down'].includes(kind);
    const property=scaled?'width':vertical?'centerY':'center',direction=['zoom-through','rack-focus','cut-right','cut-down'].includes(kind)?1:-1;
    const outgoing=before.at(-1)[property]-before.at(-2)[property],incoming=after[1][property]-after[0][property];
    let ratio=null;
    if(kind==='fade-through') {
      const tail=1-Math.max(0,Math.min(1,(after[0].frame/30-cut)/.4));
      assert.ok(Math.abs(after[0].stageOpacity-(1-tail*tail*(3-2*tail)))<1e-5,'Fade must cut on the opaque brand ground');
      assert.ok(before.at(-1).stageOpacity<before.at(-2).stageOpacity&&after[1].stageOpacity>after[0].stageOpacity,'Fade envelope reverses');
      assert.ok(samples.every(s=>Math.abs(s.width-profile.width)<.01&&Math.abs(s.center-profile.width/2)<.01),'Fade unexpectedly moves the composition');
    } else {
      assert.ok(outgoing*direction>1&&incoming*direction>1,'Seam direction mismatch');
      ratio=Math.abs(incoming/outgoing);assert.ok(ratio>=.4&&ratio<=2.5,'Seam velocity mismatch');
      if(kind==='rack-focus') {
        const tail=1-Math.max(0,Math.min(1,(after[0].frame/30-cut)/.4));
        assert.ok(Math.abs(parseFloat(after[0].filter.slice(5))-18*tail**3)<.001,'Rack focus must cut at peak blur');
      }
    }
    if(kind==='text-match') {
      assert.ok(Math.abs(after[0].center-profile.width/2)<1,'Headline carrier misses the shared cut position');
      assert.ok(after[0].center<before.at(-1).center,'Headline carrier reverses at the cut');
    }
    report.seams.push({kind,cut,speed_ratio:ratio,samples});
  }
  report.profile={id:profile.id,width:profile.width,height:profile.height,fps:30};
}
