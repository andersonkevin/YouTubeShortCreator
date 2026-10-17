"""Extract two pinned device-glass timelines; prints a candidate, never writes."""
import hashlib
from pathlib import Path

PINS = {'phone': ('ios26-liquid-glass', 'd9cc2176b84958ec83d879b1444445386e6b3a4fc5ae1856a0ff1b82b033becb'),
        'desktop': ('macos-tahoe-liquid-glass', '2496d459511909db05c06f5cba9ae39838fca20b09074cbfd63e2b2bc58127b1')}


def bundle(root):
    root = Path(root)
    parts = []
    for key, (name, pin) in PINS.items():
        path = root / name / (name + '.html')
        if any(p.is_symlink() for p in [path, *path.parents]) or not path.is_file():
            raise ValueError('Regular pinned device-glass source required')
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != pin:
            raise ValueError('Pinned device-glass source mismatch')
        source = raw.decode('utf-8')
        easing = 'function cbz(' + source.split('      function cbz(', 1)[1].split('      // ── Animation State', 1)[0]
        state = source.split('      var S = ', 1)[1].split('      function render()', 1)[0].strip()
        tracks = 'tl.to(S, { p: 1,' + source.split('      tl.to(S, { p: 1,', 1)[1].split('</script>', 1)[0]
        part = '''
  presets.KEY=(()=>{
    const PI=Math.PI;
    EASING
    const S=STATE
    const initial=Object.freeze({...S}),tracks=[],render=()=>{};
    const ease=value=>typeof value==='function'?value:value==='none'?x=>x:
      value==='power3.out'?x=>1-(1-x)**4:value==='power2.out'?x=>1-(1-x)**3:null;
    const tl={to:(target,options,start)=>{
      if(target!==S)return tl;
      const values={...options};delete values.duration;delete values.ease;delete values.onUpdate;
      const curve=ease(options.ease);if(!curve)throw new Error('Unknown pinned device easing');
      tracks.push({start,duration:options.duration,ease:curve,values});return tl;
    },set:(target,values,start)=>{if(target===S)tracks.push({start,duration:0,ease:x=>x,values});return tl;}};
    TRACKS
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
    return {valuesAt,source:'PIN',notification:NOTIFICATION};
  })();
'''
        parts.append(part.replace('KEY', key).replace('EASING', easing).replace('STATE', state)
                     .replace('TRACKS', tracks).replace('PIN', pin)
                     .replace('NOTIFICATION', 'notificationEase' if key == 'phone' else 'null'))
    return '''/* Pinned HyperFrames iOS/macOS device-glass timelines, Apache-2.0. */
(() => {
  'use strict';
  const presets={};
''' + ''.join(parts) + '''
  function pose(name,seconds){
    if(!Object.hasOwn(presets,name)||!Number.isFinite(seconds))throw new Error('Known device preset and finite time required');
    const t=Math.max(0,Math.min(15,seconds)),preset=presets[name];
    return {seconds:t,state:preset.valuesAt(t),source:preset.source};
  }
  window.ShortCreatorDeviceGlassMotion=Object.freeze({pose,notification:p=>presets.phone.notification(Math.max(0,Math.min(1,p)))});
})();
'''


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('blocks', type=Path)
    print(bundle(parser.parse_args().blocks), end='')
