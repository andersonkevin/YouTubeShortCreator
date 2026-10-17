/* HyperFrames-derived motion integration, Apache-2.0; changes documented in
   docs/HYPERFRAMES-PILOT.md. No independent playback clock or runtime downloads. */
(() => {
  'use strict';
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => 1 - (1 - clamp(value)) ** 3;
  function progress(seconds, cueStart, frames) {
    if (![seconds,cueStart,frames].every(Number.isFinite) || frames <= 0) throw new Error('Invalid effect timing');
    const start = Math.ceil(cueStart * 30);
    return clamp((seconds * 30 - start) / frames);
  }
  function cascade(groups, amount) {
    const result = structuredClone(groups);
    for (const [index, group] of result.entries()) {
      // Move each semantic card together; preserve its icon, text and connector.
      const offset = result.length > 1 ? .4 * index / (result.length - 1) : 0;
      const p = ease((amount - offset) / .6);
      group.y = (group.y || 0) + (1-p) * 24;
      for (const child of group.children) child.style = {...child.style,
        opacity:(child.style?.opacity ?? 1) * p};
    }
    return result;
  }
  function mount({chart,chartNode,options,record,effects,cues,colors}) {
    const active = effects.map(effect => {
      const cue = cues[effect.cue];
      if (!cue) throw new Error('Missing visual effect cue');
      if (effect.preset === 'cascade-v1') return {effect,cue,previous:null};
      const overlay = document.createElement('div');
      overlay.setAttribute('aria-hidden','true');
      overlay.dataset.effect = effect.preset;
      overlay.style.setProperty('--ysc-effect-color',colors.accent);
      if (effect.preset === 'outline-v1') {
        const panel = options.graphic[0].shape;
        overlay.className='ysc-motion-outline';
        Object.assign(overlay.style,{left:panel.x+'px',top:panel.y+'px',width:panel.width+'px',height:panel.height+'px'});
      } else if (effect.preset === 'highlight-v1') {
        // The target is the right column heading in the checked comparison renderer.
        const title = options.graphic.find(item=>item.type==='text' && item.style.x > 412 && item.style.y === 100);
        if (!title || title.style.text !== record.data.right.label) throw new Error('Missing comparison title');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = title.style.font;
        const width = context.measureText(title.style.text).width;
        overlay.className='ysc-motion-highlight';
        Object.assign(overlay.style,{left:(title.style.x-width/2)+'px',top:'124px',width:width+'px'});
      } else throw new Error('Unknown visual effect preset');
      chartNode.appendChild(overlay);
      return {effect,cue,overlay};
    });
    return {renderAt(seconds) {
      for (const entry of active) {
        const {effect,cue,overlay} = entry;
        const p = progress(seconds,cue.start,effect.duration_frames);
        if (effect.preset === 'cascade-v1') {
          if (p !== entry.previous) {
            chart.setOption({...options,graphic:cascade(options.graphic,p)},{notMerge:true,lazyUpdate:false});
            // Commit the SVG before capture instead of waiting for ZRender's next paint tick.
            chart.getZr().flush();
            entry.previous = p;
          }
        } else {
          overlay.style.setProperty('--ysc-effect-progress',String(ease(p)));
          overlay.style.visibility = p > 0 ? 'visible' : 'hidden';
        }
      }
    }};
  }
  window.ShortCreatorEffects = {progress,cascade,mount};
})();
