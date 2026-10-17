/* Pinned HyperFrames iOS/macOS device-glass timelines, Apache-2.0. */
(() => {
  'use strict';
  const presets={};

  presets.phone=(()=>{
    const PI=Math.PI;
    function cbz(p1x, p1y, p2x, p2y) {
        var ax = 3 * p1x - 3 * p2x + 1,
          bx = 3 * p2x - 6 * p1x,
          cx = 3 * p1x;
        var ay = 3 * p1y - 3 * p2y + 1,
          by = 3 * p2y - 6 * p1y,
          cy = 3 * p1y;
        return function (t) {
          var s = t;
          for (var i = 0; i < 12; i++) {
            var x = ((ax * s + bx) * s + cx) * s - t;
            var dx = (3 * ax * s + 2 * bx) * s + cx;
            if (Math.abs(dx) < 1e-10) break;
            s -= x / dx;
          }
          s = Math.max(0, Math.min(1, s));
          return ((ay * s + by) * s + cy) * s;
        };
      }

      var enterEase = cbz(0.16, 1.0, 0.3, 1.0);
      var notificationEase = cbz(0.22, 0.0, 0.16, 1.0);
      var spinEase = cbz(0.76, 0.0, 0.18, 1.0);
      var driftEase = cbz(0.45, 0.0, 0.15, 1.0);
      var snapEase = cbz(0.22, 1.15, 0.36, 1.0);
      var breatheEase = cbz(0.37, 0.0, 0.63, 1.0);


    const S={
        phX: 0,
        phY: 0.1,
        phZ: 0.5,
        phRX: 0,
        phRY: PI,
        phRZ: 0,
        lpX: 10,
        lpY: -0.2,
        lpZ: -0.6,
        lpRX: 0,
        lpRY: 0,
        lpRZ: 0,
        cX: 0,
        cY: 0.18,
        cZ: 6.15,
        clX: 0,
        clY: 0.1,
        clZ: 0,
        drift: 0,
        turn: 0,
        cardReveal: 0,
        titleFade: 0,
        counter: 0,
        iosN1: 0,
        iosN2: 0,
        iosN3: 0,
        p: 0,
      };
    const initial=Object.freeze({...S}),tracks=[],render=()=>{};
    const ease=value=>typeof value==='function'?value:value==='none'?x=>x:
      value==='power3.out'?x=>1-(1-x)**4:value==='power2.out'?x=>1-(1-x)**3:null;
    const tl={to:(target,options,start)=>{
      if(target!==S)return tl;
      const values={...options};delete values.duration;delete values.ease;delete values.onUpdate;
      const curve=ease(options.ease);if(!curve)throw new Error('Unknown pinned device easing');
      tracks.push({start,duration:options.duration,ease:curve,values});return tl;
    },set:(target,values,start)=>{if(target===S)tracks.push({start,duration:0,ease:x=>x,values});return tl;}};
    tl.to(S, { p: 1, drift: 15, duration: 15, ease: "none" }, 0);

      // ── iOS 26 Showcase: full-device hero with a subtle drift-in ──
      tl.to(S, { cZ: 6.45, duration: 12, ease: driftEase }, 0.5);
      tl.to(S, { cY: 0.16, duration: 12, ease: driftEase }, 0.5);

      // Very gentle tilt — shows the glass icon refraction from slightly different angles
      tl.to(S, { phRY: PI + 0.04, phRX: 0.01, duration: 4, ease: breatheEase }, 0.5);
      tl.to(S, { phRY: PI - 0.03, phRX: -0.008, duration: 4, ease: breatheEase }, 4.5);
      tl.to(S, { phRY: PI + 0.02, phRX: 0.005, duration: 4, ease: breatheEase }, 8.5);

      // No scroll — keep the home screen static
      // No 360° turntable — just the gentle zoom out

      // Move MacBook off screen so it doesn't appear
      tl.set(S, { lpX: 10 }, 0);
      tl.to(S, { iosN1: 1, duration: 0.72, ease: "none" }, 0.85);
      tl.to(S, { iosN2: 1, duration: 0.74, ease: "none" }, 1.7);
      tl.to(S, { iosN3: 1, duration: 0.76, ease: "none" }, 2.55);
      tl.to({}, { duration: 15, ease: "none", onUpdate: render }, 0);
    
    tracks.sort((a,b)=>a.start-b.start);
    function valuesAt(time,limit=tracks.length){
      const result={...initial};
      for(let i=0;i<limit;i++){
        const track=tracks[i];if(time<track.start)continue;
        // GSAP rounds each tween's local time to seven decimals before easing.
        const local=Math.round((time-track.start)*1e7)/1e7;
        const p=track.duration?track.ease(Math.max(0,Math.min(1,local/track.duration))):1;
        for(const [key,end]of Object.entries(track.values))result[key]=Math.round((track.from[key]+(end-track.from[key])*p)*1e6)/1e6;
      }
      return result;
    }
    tracks.forEach((track,i)=>{track.from=valuesAt(track.start,i);});
    return {valuesAt,source:'d9cc2176b84958ec83d879b1444445386e6b3a4fc5ae1856a0ff1b82b033becb',notification:notificationEase};
  })();

  presets.desktop=(()=>{
    const PI=Math.PI;
    function cbz(p1x, p1y, p2x, p2y) {
        var ax = 3 * p1x - 3 * p2x + 1,
          bx = 3 * p2x - 6 * p1x,
          cx = 3 * p1x;
        var ay = 3 * p1y - 3 * p2y + 1,
          by = 3 * p2y - 6 * p1y,
          cy = 3 * p1y;
        return function (t) {
          var s = t;
          for (var i = 0; i < 12; i++) {
            var x = ((ax * s + bx) * s + cx) * s - t;
            var dx = (3 * ax * s + 2 * bx) * s + cx;
            if (Math.abs(dx) < 1e-10) break;
            s -= x / dx;
          }
          s = Math.max(0, Math.min(1, s));
          return ((ay * s + by) * s + cy) * s;
        };
      }

      var enterEase = cbz(0.16, 1.0, 0.3, 1.0);
      var spinEase = cbz(0.76, 0.0, 0.18, 1.0);
      var driftEase = cbz(0.45, 0.0, 0.15, 1.0);
      var snapEase = cbz(0.22, 1.15, 0.36, 1.0);
      var breatheEase = cbz(0.37, 0.0, 0.63, 1.0);


    const S={
        phX: 0,
        phY: 0.1,
        phZ: 0.5,
        phRX: 0,
        phRY: PI,
        phRZ: 0,
        lpX: 10,
        lpY: -0.2,
        lpZ: -0.6,
        lpRX: 0,
        lpRY: 0,
        lpRZ: 0,
        cX: 0,
        cY: 0.15,
        cZ: 2.8,
        clX: 0,
        clY: 0.1,
        clZ: 0,
        drift: 0,
        turn: 0,
        cardReveal: 0,
        titleFade: 0,
        counter: 0,
        macToastOpacity: 0,
        macToastX: 1464,
        macToastY: 62,
        macPanel: 0,
        p: 0,
      };
    const initial=Object.freeze({...S}),tracks=[],render=()=>{};
    const ease=value=>typeof value==='function'?value:value==='none'?x=>x:
      value==='power3.out'?x=>1-(1-x)**4:value==='power2.out'?x=>1-(1-x)**3:null;
    const tl={to:(target,options,start)=>{
      if(target!==S)return tl;
      const values={...options};delete values.duration;delete values.ease;delete values.onUpdate;
      const curve=ease(options.ease);if(!curve)throw new Error('Unknown pinned device easing');
      tracks.push({start,duration:options.duration,ease:curve,values});return tl;
    },set:(target,values,start)=>{if(target===S)tracks.push({start,duration:0,ease:x=>x,values});return tl;}};
    tl.to(S, { p: 1, drift: 15, duration: 15, ease: "none", onUpdate: render }, 0);

      // ── macOS Tahoe: MacBook hero — zoomed close, slow pull-back ──
      // Move iPhone off screen immediately
      tl.set(S, { phX: 10 }, 0);
      // Start MacBook centered and close
      tl.set(S, { lpX: 0, lpRY: 0 }, 0);
      tl.set(S, { cX: 0, clX: 0, cZ: 4.5, cY: 0.4, clY: -0.1 }, 0);

      // Slow zoom out
      tl.to(S, { cZ: 7, cY: 0.6, duration: 12, ease: driftEase }, 0.5);

      // Gentle breathing tilt
      tl.to(S, { lpRY: 0.04, duration: 4, ease: breatheEase }, 1);
      tl.to(S, { lpRY: -0.03, duration: 4, ease: breatheEase }, 5);
      tl.to(S, { lpRY: 0.02, duration: 4, ease: breatheEase }, 9);

      // ── Live HTML Animations (captured to 3D textures every frame) ──
      // Title fade in
      tl.to(S, { titleFade: 1, duration: 0.8, ease: breatheEase }, 0.3);
      // Counter animates up
      tl.to(S, { counter: 43, duration: 2, ease: driftEase }, 0.5);
      // Cards stagger in (0→1 reveals all cards sequentially)
      tl.to(S, { cardReveal: 1, duration: 3, ease: breatheEase }, 0.8);
      tl.set(S, { macToastX: 1464, macToastY: 62, macToastOpacity: 0 }, 0);
      tl.to(S, { macToastX: 988, macToastOpacity: 1, duration: 0.38, ease: "power3.out" }, 0.45);
      tl.to(S, { macToastX: 1002, duration: 0.16, ease: "power2.out" }, 0.83);
      tl.to(S, { macToastY: 72, duration: 0.18, ease: "power2.out" }, 4.25);
      tl.to(S, { macToastY: 62, duration: 0.22, ease: "power2.out" }, 4.43);
      tl.to(S, { macPanel: 1, duration: 1.1, ease: breatheEase }, 0.45);
    
    tracks.sort((a,b)=>a.start-b.start);
    function valuesAt(time,limit=tracks.length){
      const result={...initial};
      for(let i=0;i<limit;i++){
        const track=tracks[i];if(time<track.start)continue;
        // GSAP rounds each tween's local time to seven decimals before easing.
        const local=Math.round((time-track.start)*1e7)/1e7;
        const p=track.duration?track.ease(Math.max(0,Math.min(1,local/track.duration))):1;
        for(const [key,end]of Object.entries(track.values))result[key]=Math.round((track.from[key]+(end-track.from[key])*p)*1e6)/1e6;
      }
      return result;
    }
    tracks.forEach((track,i)=>{track.from=valuesAt(track.start,i);});
    return {valuesAt,source:'2496d459511909db05c06f5cba9ae39838fca20b09074cbfd63e2b2bc58127b1',notification:null};
  })();

  function pose(name,seconds){
    if(!Object.hasOwn(presets,name)||!Number.isFinite(seconds))throw new Error('Known device preset and finite time required');
    const t=Math.max(0,Math.min(15,seconds)),preset=presets[name];
    return {seconds:t,state:preset.valuesAt(t),source:preset.source};
  }
  window.ShortCreatorDeviceGlassMotion=Object.freeze({pose,notification:p=>presets.phone.notification(Math.max(0,Math.min(1,p)))});
})();
