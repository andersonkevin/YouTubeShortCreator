import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const window={};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-chart-extras.js',import.meta.url),'utf8'),{window});
const a=window.ShortCreatorChartExtras;
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-resources.js',import.meta.url),'utf8'),{window});

test('combo chart uses independently declared axes without changing input values',()=>{
  const c={categories:['A','B','C'],bars:{maximum:100,values:[0,25,100]},line:{maximum:5,values:[5,2.5,0]}};
  const original=JSON.stringify(c);
  for(const [w,h] of [[1720,398],[940,920],[960,398],[960,628]]) {
    const g=a.comboLayout(c,w,h),range=g.base-g.top;
    assert.ok(range>0&&g.pitch>g.width);
    assert.equal(g.bars[0].height,0);assert.equal(g.bars[2].height,range);
    assert.equal(g.line[0].y,g.top);assert.equal(g.line[2].y,g.base);
    assert.equal(g.bars[1].height/range,.25);assert.equal((g.base-g.line[1].y)/range,.5);
    assert.equal(g.bars[1].x,g.line[1].x);
  }
  assert.equal(JSON.stringify(c),original);
});

test('specification rows retain delayed rule timing and clean endpoints on reverse evaluation',()=>{
  assert.equal(a.specsState(0).alpha,0);assert.equal(a.specsState(0).x,-36);assert.equal(a.specsState(0).rule,0);
  assert.equal(a.specsState(.15/.95).rule,0);
  assert.equal(a.specsState(1).alpha,1);assert.equal(a.specsState(1).x,0);assert.equal(a.specsState(1).rule,1);
  const samples=Array.from({length:25},(_,i)=>JSON.stringify(a.specsState(i/24)));
  for(let i=24;i>=0;i--)assert.equal(JSON.stringify(a.specsState(i/24)),samples[i]);
});

test('conic ring keeps value and fill in phase and fits its complete stroke inside the slot',()=>{
  for(const H of [470,600,360,440])for(const value of [0,12.5,100,1e-7]) {
    const nodes=[],create=attributes=>{const node={...attributes,dataset:{}};nodes.push(node);return node;};
    const update=window.ShortCreatorResources.metric({label:'Items',value,unit:'items',context:'Fixture'},
      {metric_style:'conic-ring',maximum:100},{svg:{dataset:{}},W:940,H,wide:false,
        label:(x,y,textContent)=>create({x,y,textContent}),shape:(tag,attributes)=>create({tag,...attributes}),
        set:(node,attributes)=>Object.assign(node,attributes),count:()=>{throw new Error('Ring must use its own synchronized cubic count');}});
    const ring=nodes.find(node=>node.dataset.metricGauge==='conic-ring'),number=nodes.find(node=>node.dataset.chartMetric==='true');
    assert.ok(ring.cx-ring.r-ring['stroke-width']/2>=0);
    for(const p of [0,.25,.5,.75,1]) {
      update([p]);const ratio=1-ring['stroke-dashoffset']/(2*Math.PI*ring.r);
      assert.ok(Math.abs(ratio-value/100*(1-(1-p)**3))<1e-12);
      if(p===1)assert.equal(number.textContent,String(value));
    }
  }
});
