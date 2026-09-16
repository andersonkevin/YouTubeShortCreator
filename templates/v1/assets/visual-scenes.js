(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('visual-scene-data').textContent);
  const mounted = [];
  const clamp = value => Math.max(0, Math.min(1, value));
  const mixWhite = (hex, amount) => '#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*(1-amount)+255*amount).toString(16).padStart(2,'0')).join('');
  window.ShortCreatorVisualRenderAt = seconds => {
    for (const item of mounted) {
      const local = seconds - Number(item.scene.dataset.start);
      const amount = clamp((local-item.motion.fill[0])/item.motion.fill[1]);
      const preset = item.presentation.reveal;
      const eased = amount * amount * (3 - 2 * amount);
      const remaining = Number(item.scene.dataset.end) - seconds;
      const exit = item.presentation.exit === 'fade' ? clamp(remaining/item.presentation.exit_duration) : 1;
      const vector = {'slide-left':[56,0], 'slide-right':[-56,0], 'slide-up':[0,42], 'slide-down':[0,-42]}[preset] || [0,0];
      item.chartNode.style.clipPath = preset === 'wipe-right' ? `inset(0 ${(1-amount)*100}% 0 0)` : 'none';
      item.chartNode.style.transform = `translate(${vector[0]*(1-eased)}px,${vector[1]*(1-eased)}px)`;
      item.chartNode.style.opacity = String((local >= item.motion.enter ? 1 : 0) * (preset === 'wipe-right' ? 1 : eased) * exit);
    }
  };
  window.ShortCreatorVisualReady = (async () => {
    await document.fonts.ready;
    await Promise.all([...Object.values(data.icons), ...Object.values(data.symbols)].map(async source=>{
      const image = new Image(); image.src=source; await image.decode();
    }));
    const theme = {icons:data.icons, colors:[data.colors.accent,data.colors.secondary,'#ef9cab','#d4cce3'],
      background:data.colors.background, surface:mixWhite(data.colors.background,.07), font:'BrandSans',
      scene:true, width:824, height:560};
    if (data.world) echarts.registerMap('natural-earth',data.world);
    for (const spec of data.scenes) {
      const scene = [...document.querySelectorAll('.visual-library-scene')].find(node=>node.dataset.visualId===spec.id);
      if (!scene) throw new Error('Missing visual scene: '+spec.id);
      const record = data.records[spec.id];
      const set = (selector,value) => {scene.querySelector(selector).textContent=value;};
      set('.visual-title',record.title);
      set('.visual-insight',record.insight);
      let detail = '';
      if(record.kind==='scatter') detail = `${record.data.x_label} vs ${record.data.y_label}\nr = ${record.derived.r.toFixed(2)} | n = ${record.derived.n} | Correlation is not causation`;
      if(record.kind==='correlation') detail = `Pearson r | n = ${record.derived.n} | Correlation is not causation`;
      if(record.kind==='pie') detail = `Total: ${record.data.values.reduce((a,b)=>a+b,0)} ${record.data.unit}`;
      if(record.kind==='geo') detail = 'Natural Earth 5.1.2 | Fixed-size location markers\nNo volume or regional ranking is encoded.';
      if(spec.presentation.chart_style==='stacked') detail = 'Stacked components | Additive values, not percentages';
      set('.visual-detail',detail);
      set('.visual-source',`${record.source.kind==='illustrative'?'ILLUSTRATIVE DATA':'SOURCE REVIEW REQUIRED'} | ${record.source.label} | ${record.source.as_of}`);
      const symbol = scene.querySelector('.visual-symbol');
      symbol.src = data.symbols[spec.symbol]; symbol.alt = spec.symbol.replace(':',': ');
      await symbol.decode();
      const chartNode = scene.querySelector('.visual-chart');
      chartNode.setAttribute('aria-label',record.title+'. '+record.insight);
      const chart = echarts.init(chartNode,null,{renderer:'svg',width:824,height:560});
      chart.setOption(window.ShortCreatorVisualOptions(record,{...theme,chartStyle:spec.presentation.chart_style}),{notMerge:true,lazyUpdate:false});
      mounted.push({scene, chartNode, chart, motion:spec.motion, presentation:spec.presentation});
    }
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    window.ShortCreatorRenderAt(0);
  })();
})();
