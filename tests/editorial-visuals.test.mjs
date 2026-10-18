import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Element {
  constructor(tag) { this.tag=tag; this.attrs={}; this.children=[]; this.style={}; }
  setAttribute(k,v) { this.attrs[k]=v; }
  append(el) { this.children.push(el); }
  getTotalLength() { return 500; }
  querySelectorAll(tag) { return this.children.flatMap(c=>[...(c.tag===tag?[c]:[]),...c.querySelectorAll(tag)]); }
}
function mount(variant) {
  const context={window:{},document:{createElementNS:(_,tag)=>new Element(tag),
    createElement:()=>({getContext:()=>({measureText:t=>({width:t.length*16})})})}};
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/editorial-visuals.js',import.meta.url),'utf8'),context);
  const host=new Element('host');
  const n=variant==='worlds'?3:2;
  const record={title:'REVIEW',icon:'layers',source:{label:'Synthetic example',as_of:'2026-10-18'},
    data:{variant,labels:['Input','Output','Review'].slice(0,n),details:['First step','Second step','Third step'].slice(0,n),
      values:[2,10,5].slice(0,n),maximum:10,unit:'Example units'}};
  const renderer=context.window.ShortCreatorEditorialVisual(host,record,{motion:{}},
    {colors:{background:'#ffffff',ink:'#16181d',accent:'#155e75',secondary:'#9f1239'},icons:{layers:'local.svg'}});
  return {host,renderer};
}
for(const variant of ['branch','flow','orbit','bars','curve','terrain','matrix','trace','rings','worlds','clock','axes']) {
  test(variant+': explicit data and deterministic backward seeking',()=>{
    const {host,renderer}=mount(variant);
    renderer.renderAt(1.3);const initial=JSON.stringify(host);
    renderer.renderAt(7);renderer.renderAt(1.3);
    assert.equal(JSON.stringify(host),initial);
    assert.ok(host.querySelectorAll('text').some(t=>t.textContent==='REVIEW'));
    assert.equal(host.children[0].attrs.viewBox,'0 0 824 820');
    assert.ok(JSON.stringify(host).includes('#155e75'));
  });
}
test('bar values keep their supplied zero-based ratios',()=>{
  const {host,renderer}=mount('bars');renderer.renderAt(10);
  const bars=host.querySelectorAll('rect');
  assert.equal(+bars[0].attrs.width/+bars[1].attrs.width,.2);
});
