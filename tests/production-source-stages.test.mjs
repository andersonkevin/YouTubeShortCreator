import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const window={addEventListener(){}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-source-stages.js',import.meta.url),'utf8'),{window,btoa:text=>Buffer.from(text).toString('base64')});
const stage=window.ShortCreatorSourceStages;

test('source clock preserves endpoints and is independent of seek order',()=>{
  for(const style of stage.styles){
    const length=stage.duration[style],onsets=[.5,length+.5];
    const forward=[0,.5,2,5,length+.5].map(time=>JSON.stringify(stage.clock(time,onsets,style)));
    const reverse=[length+.5,5,2,.5,0].map(time=>JSON.stringify(stage.clock(time,onsets,style))).reverse();
    assert.deepEqual(forward,reverse);assert.equal(stage.clock(length+.5,onsets,style).seconds,length);
    assert.equal(stage.clock(length+.5,onsets,style).caption,0);
    assert.equal(stage.clock(length+1.3,onsets,style).caption,1);
    assert.throws(()=>stage.clock(2,[.5,length+.4],style));
  }
  assert.throws(()=>stage.clock(NaN,[0,9],'glass-shard'));
  assert.throws(()=>stage.clock(1,[0,9],'unknown'));
});

test('word geometry uses approved supplied glyphs and rejects absent outlines',()=>{
  const font={version:1,units:1000,font_sha256:'a'.repeat(64),glyphs:{A:{advance:500,commands:[['M',0,0],['L',250,700],['L',500,0],['Z']]}}};
  const svg=Buffer.from(stage.wordSvg('AA',font).split(',')[1],'base64').toString();
  assert.match(svg,/viewBox="0 -1100 1000 1600"/);assert.match(svg,/translate\(500 0\)/);
  assert.throws(()=>stage.wordSvg('B',font));assert.throws(()=>stage.wordSvg('A',null));
});

test('source loaders accept exact compiled buffers and reject network or changed payloads',async()=>{
  const uri='data:application/octet-stream;base64,YXBwcm92ZWQ=';
  const child={addEventListener(){}};
  const config={style:'frost-orbit',resources:{texture:uri},bodyFont:uri,displayFont:uri,
    colors:{background:'#140b30'},vars:{}};
  const context={window:child,parent:{ShortCreatorSourceStages:{childConfig:frame=>{
    assert.equal(frame,child);return config;
  }}},addEventListener(){},document:{fonts:{add(){}},head:{appendChild(){}},createElement(){return {}; }},
    FontFace:class {load(){return Promise.resolve(this);}},Response,Uint8Array,atob,Math:Object.create(Math),Set};
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-source-bootstrap.js',import.meta.url),'utf8'),context);
  assert.equal(await (await child.fetch(uri)).text(),'approved');
  await assert.rejects(child.fetch('https://example.invalid/font.ttf'),/Unknown source payload/);
  await assert.rejects(child.fetch('data:application/octet-stream;base64,Y2hhbmdlZA=='),/Unknown source payload/);
  await child.__sourceFontsReady;
});
