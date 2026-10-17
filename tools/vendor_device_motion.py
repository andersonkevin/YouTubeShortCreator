"""Extract the pinned six-act device choreography without GSAP or DOM effects."""
import hashlib
from pathlib import Path

PIN = '62eee0ecca585e708b32b747b6ea5251619fdf5a46fc7d868c32abc364950ba7'


def bundle(path):
    path = Path(path)
    if any(p.is_symlink() for p in [path, *path.parents]) or not path.is_file():
        raise ValueError('Regular device source required')
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != PIN:
        raise ValueError('Pinned device choreography mismatch')
    source = raw.decode('utf-8')
    easing = source.split('      function cbz(', 1)[1].split('      // ── Animation State', 1)[0]
    state = source.split('      var S = ', 1)[1].split('      function render()', 1)[0].strip()
    tracks = source.split('      tl.to(S, { p: 1,', 1)[1].split('      // __timelines registered', 1)[0]
    body = '''/* HyperFrames vfx-iphone-device choreography, Apache-2.0. */
(() => {
  'use strict';
  const PI=Math.PI,clamp=x=>Math.max(0,Math.min(1,x));
  function cbz(EASING
  const S=STATE
  const initial=Object.freeze({...S}),tracks=[];
  const render=()=>{};
  const tl={to:(_target,options,start)=>{const values={...options};delete values.duration;delete values.ease;delete values.onUpdate;
    tracks.push({start,duration:options.duration,ease:options.ease==='none'?x=>x:options.ease,values});return tl;}};
  tl.to(S, { p: 1,TRACKS
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
  window.ShortCreatorDeviceMotion=Object.freeze({pose,cbz,source:'PIN',duration:15,trackCount:tracks.length});
})();
'''
    return body.replace('EASING', easing).replace('STATE', state).replace('TRACKS', tracks).replace('PIN', PIN)
