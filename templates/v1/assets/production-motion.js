/* Closed scene seams adapted from HyperFrames cut-the-curve and optical cuts.
   Legacy seams keep their original implementation. No content-owned timing. */
(() => {
  'use strict';
  const kinds=Object.freeze(['cut-right','cut-up','cut-down','inverse-zoom','rack-focus','fade-through']);
  function seam(kind,side,amount) {
    if(!kinds.includes(kind)||!['entry','exit'].includes(side)||!Number.isFinite(amount))
      throw new Error('Invalid production seam');
    const entry=side==='entry',p=Math.max(0,Math.min(1,amount)),tail=entry?1-p:p;
    const state={x:0,y:0,scale:1,opacity:1,blur:0};
    if(kind.startsWith('cut-')) {
      const travel=tail**5,sign=kind==='cut-up'?-1:1;
      state[kind==='cut-right'?'x':'y']=travel===0?0:(entry?-1:1)*sign*130*travel;
      state.opacity=1-.68*travel;state.blur=8*travel;
    } else if(kind==='inverse-zoom') {
      const travel=tail**4;
      state.scale=1+(entry?.18:-.18)*travel;
      state.opacity=1-.68*travel;state.blur=10*travel;
    } else if(kind==='rack-focus') {
      const travel=tail**3;
      state.scale=1+(entry?-.06:.06)*travel;state.blur=18*travel;
    } else state.opacity=1-tail*tail*(3-2*tail);
    return state;
  }
  window.ShortCreatorMotion={kinds,seam};
})();
