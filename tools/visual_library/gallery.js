(() => {
  'use strict';
  const {charts, icons, world, recipes} = window.visualLibraryData;
  const $ = id => document.getElementById(id);
  const colors = ['#def0a2', '#ade8ed', '#f2b9c9', '#d0bef6'];
  const chart = echarts.init($('chart'), null, {renderer:'svg', width:880, height:810});
  echarts.registerMap('natural-earth', world);
  let index = 0;
  let seconds = 4;
  let playing = false;
  let last = 0;
  const text = (id, value) => { $(id).textContent = value; };
  const options = c => window.ShortCreatorVisualOptions(c, {icons, colors});
  function renderAt(t) {
    if(!Number.isFinite(t)) throw new Error('Finite timeline required');
    seconds = Math.max(0,Math.min(8,t));
    $('progress').style.width = seconds/8*100+'%';
    $('time').value = String(seconds);
    text('time-label',seconds.toFixed(1)+' s');
    // Editorial reveal uses a deterministic clip, never interpolated data values.
    const reveal = Math.min(1,seconds/1.6);
    $('chart').style.clipPath = `inset(0 ${(1-reveal)*100}% 0 0)`;
  }
  function select(id) {
    const next = charts.findIndex(c=>c.id===id);
    if(next<0) throw new Error('Unknown chart');
    index = next;
    const c = charts[index];
    text('eyebrow',String(index+1).padStart(2,'0')+' / '+c.kind.toUpperCase());
    text('title',c.title);
    text('insight',c.insight);
    text('source-kind',c.source.kind === 'illustrative'?'ILLUSTRATIVE DATA':'SOURCE REVIEW REQUIRED');
    text('source',c.source.label+' | '+c.source.as_of);
    text('reference',c.source.reference);
    let detail = '';
    if(c.kind==='scatter') detail = `${c.data.x_label} vs ${c.data.y_label}\nPearson r = ${c.derived.r.toFixed(2)} | n = ${c.derived.n} | Not causation`;
    if(c.kind==='correlation') detail = `Pearson correlation | n = ${c.derived.n} | Not causation`;
    if(c.kind==='pie') detail = `Total: ${c.data.values.reduce((a,b)=>a+b,0)} ${c.data.unit}`;
    if(c.kind==='geo') detail = 'Fixed-size location markers | Natural Earth 5.1.2\nNo volume or regional ranking is encoded.';
    text('detail',detail);
    $('chart').setAttribute('aria-label',c.title+'. '+c.insight+'. '+JSON.stringify(c.data));
    chart.setOption(options(c),{notMerge:true,lazyUpdate:false});
    document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));
    renderAt(seconds);
  }
  function icon(name) {
    const image = document.createElement('img');
    image.src = icons[name]; image.alt=''; return image;
  }
  charts.forEach(c=>{
    const button = document.createElement('button');
    button.type='button'; button.dataset.id=c.id;
    button.append(icon(c.icon),document.createTextNode(c.kind === 'timeline'?'Trace / timeline':c.kind[0].toUpperCase()+c.kind.slice(1)));
    button.addEventListener('click',()=>select(c.id));
    $('studies').append(button);
  });
  Object.keys(icons).forEach(name=>{
    const item=document.createElement('span');item.className='icon';item.dataset.name=name;item.tabIndex=0;item.setAttribute('aria-label',name);item.append(icon(name));$('icons').append(item);
  });
  Object.entries(recipes).forEach(([name,recipe])=>{
    const item=document.createElement('span');item.className='icon recipe '+recipe.tone;item.dataset.name=recipe.label;item.tabIndex=0;item.setAttribute('aria-label',recipe.label);item.dataset.recipe=name;
    const badge=document.createElement('span');badge.className='badge';badge.append(icon(recipe.badge));item.append(icon(recipe.base),badge);$('icons').append(item);
  });
  function playState() {
    $('play').replaceChildren(icon(playing?'pause':'arrow-right'));
    $('play').setAttribute('aria-label',playing?'Pause preview':'Play preview');
    $('play').title=playing?'Pause preview':'Play preview';
  }
  $('play').addEventListener('click',()=>{playing=!playing;last=performance.now();if(playing && seconds>=8)renderAt(0);playState();});
  $('time').addEventListener('input',()=>{playing=false;playState();renderAt(Number($('time').value));});
  const resize=()=>{$('frame').style.transform=`scale(${$('frame').parentElement.clientWidth/1080})`;};
  new ResizeObserver(resize).observe($('frame').parentElement);
  window.VisualLibrary={renderAt,select,ids:charts.map(c=>c.id),svg:()=>chart.renderToSVGString(),stop:()=>{playing=false;playState();}};
  select(charts[0].id);resize();playState();
  function tick(now){if(playing){renderAt(seconds+(now-last)/1000);if(seconds>=8){playing=false;playState();}}last=now;requestAnimationFrame(tick);}
  requestAnimationFrame(tick);
})();
