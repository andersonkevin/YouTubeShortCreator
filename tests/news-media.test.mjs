import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Element {
 constructor(tag){this.tag=tag;this.attrs={};this.children=[];}
 setAttribute(k,v){this.attrs[k]=v;}
 appendChild(n){this.children.push(n);}
 querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tag===tag?[c]:[]),...c.querySelectorAll(tag)]);}
}
async function mount(variant,broken=false,fit='contain'){
 const context={window:{},Image:class{naturalWidth=1200;naturalHeight=1800;async decode(){if(broken)throw Error('Broken image');}},
  document:{createElementNS:(_,tag)=>new Element(tag),createElement:()=>({getContext:()=>({measureText:t=>({width:t.length*16})})})}};
 vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/news-media.js',import.meta.url),'utf8'),context);
 const host=new Element('host');
 const renderer=await context.window.ShortCreatorNewsMedia(host,{id:'news-1',title:'NEWS',local_media:'assets/news-1.png',
  data:{variant,fit,asset:{alt:'Official image'},label:'COMPANY',headline:'A new release',detail:'Plans remain plans.',items:['Verify first','Approve changes']}},
  {motion:{fill:[.12,.75],beats:[1,3]}},{colors:{background:'#fff',ink:'#16181d',accent:'#155e75',secondary:'#9f1239'}});
 return {host,renderer};
}
for(const variant of ['image','person','image-metric']){
 test(variant+': local media, safe slot and deterministic seeking',async()=>{
  const {host,renderer}=await mount(variant);
  assert.equal(host.querySelectorAll('svg').length,1);
  assert.equal(host.children[0].attrs.viewBox,'0 0 880 940');
  const image=host.querySelectorAll('image')[0];
  assert.equal(image.attrs.href,'assets/news-1.png');
  assert.equal(image.attrs.preserveAspectRatio,'xMidYMid meet');
  assert.equal(image.attrs.width/image.attrs.height,variant==='person'?2/3:16/9);
  assert.ok(!host.querySelectorAll('rect').some(node=>node.attrs.y===897),'No duplicate progress rail');
  renderer.renderAt(1.5);const first=JSON.stringify(host);
  renderer.renderAt(12);assert.notEqual(JSON.stringify(host),first);
  renderer.renderAt(1.5);assert.equal(JSON.stringify(host),first);
});
}
test('landscape photos fill the complete 16:9 aperture without stretching',async()=>{
 const {host}=await mount('image-metric',false,'cover');
 const image=host.querySelectorAll('image')[0];
 assert.equal(image.attrs.preserveAspectRatio,'xMidYMid slice');
 assert.equal(image.attrs.width,828);
 assert.equal(image.attrs.height,465.75);
});
test('broken media fails before capture instead of producing a blank window',async()=>{
 await assert.rejects(()=>mount('image',true),/Broken image/);
});
