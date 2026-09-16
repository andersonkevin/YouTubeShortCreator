import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../tools/visual_library/options.js',import.meta.url),'utf8'),context);
const options=context.window.ShortCreatorVisualOptions;
const chart={kind:'timeline',data:{unit:'seconds',stages:[{label:'Tiny',start:0,end:1e-6},{label:'Large',start:0,end:1e6}]}};
test('axis extremes are compact, labels and raw intervals stay intact',()=>{
  const before=JSON.stringify(chart), result=options(chart,{scene:true});
  const format=result.xAxis.axisLabel.formatter;
  assert.equal(format(1e6),'1e+6');
  assert.equal(format(-1e6),'-1e+6');
  assert.equal(format(1e-6),'1e-6');
  assert.equal(format(0),'0');
  assert.equal(format(1.2),'1.2');
  assert.equal(format('Stage 1'),'Stage 1');
  assert.equal(result.series[1].data[0].value,1e-6);
  assert.equal(result.series[1].data[1].value,1e6);
  assert.equal(JSON.stringify(chart),before);
});
test('tiny positive durations never round to zero',()=>{
  const format=options(chart,{scene:true}).series[1].label.formatter;
  assert.equal(format({value:1e-6}),'1e-6');
  assert.equal(format({value:1e6}),'1e+6');
  assert.equal(format({value:4.7999999999999}),'4.8');
});
