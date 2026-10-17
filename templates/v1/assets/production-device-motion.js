/* HyperFrames vfx-iphone-device choreography, Apache-2.0. */
(() => {
  'use strict';
  const PI=Math.PI,clamp=x=>Math.max(0,Math.min(1,x));
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
        scroll: 0,
        cardReveal: 0,
        titleFade: 0,
        counter: 0,
        p: 0,
      };
  const initial=Object.freeze({...S}),tracks=[];
  const render=()=>{};
  const tl={to:(_target,options,start)=>{const values={...options};delete values.duration;delete values.ease;delete values.onUpdate;
    tracks.push({start,duration:options.duration,ease:options.ease==='none'?x=>x:options.ease,values});return tl;}};
  tl.to(S, { p: 1, drift: 15, duration: 15, ease: "none", onUpdate: render }, 0);

      // ── Act 1 (0–3.5s): iPhone FRONT — hero close-up showing hyperframes.dev
      tl.to(S, { phRY: PI + 0.06, phRX: 0.015, duration: 1.5, ease: breatheEase }, 0.3);
      tl.to(S, { phRY: PI - 0.04, phRX: -0.01, duration: 1.5, ease: breatheEase }, 1.8);

      // ── Act 2 (3.5–7s): iPhone spins 180° to show BACK (camera, titanium, Apple logo)
      tl.to(S, { phRY: PI * 2, duration: 2.2, ease: spinEase }, 3.5);
      tl.to(S, { cZ: 4.8, cY: 0.25, duration: 2, ease: driftEase }, 3.5);
      // Hold back view — slight orbit to appreciate hardware
      tl.to(
        S,
        { phRY: PI * 2 + 0.15, phRX: 0.04, cX: 0.15, duration: 1.5, ease: breatheEase },
        5.5,
      );

      // ── Act 3 (7–9s): iPhone spins back to front, then exits LEFT off screen
      tl.to(S, { phRY: PI * 3, duration: 1.8, ease: snapEase }, 7);
      tl.to(S, { cZ: 3.5, cY: 0.2, duration: 1.5, ease: driftEase }, 7);
      tl.to(S, { phX: -6, phZ: 0.3, duration: 2, ease: spinEase }, 8);

      // ── Act 4 (9–11s): MacBook enters from right, hero close-up
      tl.to(S, { lpX: 0, duration: 2, ease: enterEase }, 9);
      tl.to(S, { cX: 0, clX: 0, cZ: 5, cY: 0.3, clY: -0.1, duration: 2, ease: driftEase }, 9);
      tl.to(S, { lpRY: 0.06, duration: 1.5, ease: breatheEase }, 10);

      // ── Act 5 (11–12.5s): iPhone returns, both settle for turntable
      tl.to(S, { phX: -2.0, duration: 1.5, ease: enterEase }, 11);
      tl.to(S, { lpX: 2.2, duration: 1.5, ease: breatheEase }, 11);
      tl.to(
        S,
        { cX: 0.1, clX: 0.1, cZ: 7.5, cY: 0.5, clY: -0.1, duration: 1.5, ease: driftEase },
        11,
      );
      tl.to(S, { phRY: PI * 3, lpRY: 0, duration: 1, ease: breatheEase }, 11);

      // ── Act 6 (12.5–15s): 360° turntable — both devices rotate together
      tl.to(S, { turn: PI * 2, duration: 2.5, ease: spinEase }, 12.5);

      // ── Live HTML Animations (captured to 3D textures every frame) ──
      // Title fade in
      tl.to(S, { titleFade: 1, duration: 0.8, ease: breatheEase }, 0.3);
      // Counter animates up
      tl.to(S, { counter: 43, duration: 2, ease: driftEase }, 0.5);
      // Cards stagger in (0→1 reveals all cards sequentially)
      tl.to(S, { cardReveal: 1, duration: 3, ease: breatheEase }, 0.8);
      // Scroll during hero shots
      tl.to(S, { scroll: 0.6, duration: 3, ease: breatheEase }, 1.5);
      tl.to(S, { scroll: 0, duration: 1.5, ease: driftEase }, 7);
      // Scroll on MacBook reveal
      tl.to(S, { scroll: 0.8, duration: 3, ease: breatheEase }, 9.5);
      tl.to(S, { scroll: 0.3, duration: 2, ease: driftEase }, 13);


  tracks.sort((a,b)=>a.start-b.start);
  function valuesAt(time,limit=tracks.length){
    const result={...initial};
    for(let i=0;i<limit;i++){
      const track=tracks[i];if(time<track.start)continue;
      const progress=track.ease(clamp((time-track.start)/track.duration));
      for(const [key,end]of Object.entries(track.values))result[key]=Math.round((track.from[key]+(end-track.from[key])*progress)*1e6)/1e6;
    }
    return result;
  }
  tracks.forEach((track,i)=>{track.from=valuesAt(track.start,i);});
  function pose(seconds){
    if(!Number.isFinite(seconds))throw new Error('Finite device source time required');
    const t=Math.max(0,Math.min(15,seconds)),s=valuesAt(t),d=s.drift;
    let position;
    if(t<7)position=[s.phX+Math.sin(d*1.4)*.35,s.phY+Math.cos(d*1.1)*.6,s.phZ+.15];
    else if(t<11)position=[s.lpX+Math.sin(d*1.2)*1.2,s.lpY+.3+Math.cos(d*.9)*.6,s.lpZ+.2];
    else position=[(s.phX+s.lpX)*.5+Math.sin(d)*1.5,(s.phY+s.lpY)*.5+.2+Math.cos(d*.8)*.5,.3];
    return {seconds:t,state:s,lens:{shape:Math.floor(d*.8)%6,position,rotation:[d*.7,d*.9,d*.4],
      visible:t<3.3||(t>=9.5&&t<12.5)||t>=13.5}};
  }
  window.ShortCreatorDeviceMotion=Object.freeze({pose,cbz,source:'62eee0ecca585e708b32b747b6ea5251619fdf5a46fc7d868c32abc364950ba7',duration:15,trackCount:tracks.length});
})();
