
if(!window.__frostReady)throw new Error('Frost requires a supported local WebGPU adapter');
window.__sourceReady=window.__frostReady.then(()=>{
  const stage=document.getElementById('frost-root').shadowRoot.querySelector('#frost-stage');
  window.__source={canvas:stage.querySelector('canvas'),
    async renderAt(t){window.__frost.renderAt(t);await window.__frost.waitForGpu();
      if(window.__frostRuntimeError)throw new Error(window.__frostRuntimeError);},
    dispose:()=>window.__frostInstance.dispose(),
    inspect:()=>({seconds:Number(stage.dataset.time),
      pose:window.__logoRig.sample(Number(stage.dataset.time)),
      font:'BrandSans',weight:800,cache:false,profile:'studio'})};
});

