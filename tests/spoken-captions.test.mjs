import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../templates/v1/assets/spoken-captions.js',import.meta.url),'utf8');
function node(){
  let text='';const children=[];const classes=new Set();
  return {children,classes,className:'',classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);}},
    append(child){children.push(child);},get textContent(){return text+children.map(c=>c.textContent).join('');},
    set textContent(value){text=value;children.length=0;}};
}
function mount(highlight=true){
  const output=node();
  const data={duration:5,cues:[{start:1,end:3,text:'A measured segment',firstWord:0,lastWord:1}],
    words:[{text:'A',start:1,end:1.4},{text:'measured segment',start:2,end:3}],highlight:highlight?'measured-segment':undefined};
  const window={__SHORTCREATOR_CAPTURE_MODE__:true,ShortCreatorRenderAt:()=> 'completed'};
  const document={getElementById:()=>({textContent:JSON.stringify(data)}),querySelector:()=>output,
    createElement:()=>node(),createTextNode:text=>({textContent:text})};
  vm.runInNewContext(source,{window,document});
  return {window,output};
}
test('Measured highlighting, silence, exact text, multiword envelopes and backward seek',()=>{
  const {window,output}=mount();
  assert.equal(window.ShortCreatorRenderAt(1.2),'completed');
  assert.equal(output.textContent,'A measured segment');
  assert.ok(output.children[0].classes.has('active'));
  window.ShortCreatorRenderAt(1.7);
  assert.ok(output.children.filter(x=>x.classes).every(x=>!x.classes.has('active')));
  window.ShortCreatorRenderAt(2.5);
  assert.equal(output.children[2].textContent,'measured segment');
  assert.ok(output.children[2].classes.has('active'));
  window.ShortCreatorRenderAt(4);assert.equal(output.textContent,'');
  window.ShortCreatorRenderAt(1.2);assert.ok(output.children[0].classes.has('active'));
  assert.equal(output.textContent,'A measured segment');
});
test('Legacy phrase captions remain unchanged',()=>{
  const {window,output}=mount(false);
  window.ShortCreatorRenderAt(2);assert.equal(output.textContent,'A measured segment');
  assert.equal(output.children.length,0);
});
