import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-cursor-scenes.js',import.meta.url),'utf8'),context);
const {phraseParts,boundary,textState,collaborator,waypoints}=context.window.ShortCreatorCursorScenes;
const plain=value=>JSON.parse(JSON.stringify(value));
const geometry={W:960,H:494,card:{left:44,right:916},para:{left:78,right:880,top:220,bottom:322},
  toolbar:{width:226,height:64},button:{left:8,top:8,width:48,height:48},
  chars:[{left:150,right:172,top:220,height:38},{left:172,right:192,top:220,height:38},
    {left:192,right:214,top:220,height:38},{left:78,right:100,top:271,height:38}]};
test('selected text must be unique and preserve complete Unicode graphemes',()=>{
  const text='Review e\u0301 and 👩‍💻 today.';
  const parts=phraseParts(text,'e\u0301 and 👩‍💻');
  assert.equal(parts.before+parts.chars.join('')+parts.after,text);
  assert.equal(parts.chars[0],'e\u0301');assert.equal(parts.chars.at(-1),'👩‍💻');
  for(const [body,selection] of [['aaa','aa'],[text,'e'],[text,'👩'],[text,'missing'],[text,'']])assert.throws(()=>phraseParts(body,selection));
});
test('drag boundary follows the measured characters across a line break',()=>{
  assert.deepEqual(plain(boundary(geometry.chars,.5)),{x:161,y:239});
  assert.deepEqual(plain(boundary(geometry.chars,3)),{x:78,y:290});
  assert.deepEqual(plain(boundary(geometry.chars,4)),{x:100,y:290});
});
test('selection, toolbar and bold happen in the source order, followed by a physical exit',()=>{
  const at=t=>textState(t,geometry);
  assert.ok(at(0).tip.x>geometry.W);assert.equal(at(.64).selected,0);
  assert.ok(at(1.2).selected>0);assert.equal(at(1.65).selected,geometry.chars.length);
  assert.equal(at(1.75).bar,0);assert.equal(at(1.93).bar,1);
  assert.equal(at(2.76).bold,false);assert.equal(at(2.77).bold,true);
  assert.equal(at(2.7).buttonScale,.92);assert.equal(at(2.83).buttonScale,1);
  assert.ok(at(4.2).tip.x>geometry.W);assert.equal(at(4.2).beam,0);
  assert.deepEqual(plain(at(4.2)),plain(at(600)));
  const frames=Array.from({length:127},(_,f)=>plain(at(f/30)));
  for(let f=126;f>=0;f--)assert.deepEqual(plain(at(f/30)),frames[f]);
});
test('six authored collaborator paths enter, gather exactly and exit in every native board',()=>{
  for(const [W,H] of [[1672,363],[892,798],[912,348],[912,508]])for(let i=0;i<6;i++){
    const first=collaborator(i,0,0,W,H),end=collaborator(i,1,0,W,H),exit=collaborator(i,1,1,W,H);
    assert.ok(first.tip.y<0||first.tip.y>H);
    assert.equal(end.tip.x,W*waypoints[i].gather[0]/100);assert.equal(end.tip.y,H*waypoints[i].gather[1]/100);
    assert.equal(end.rotation,waypoints[i].rotation[1]);assert.equal(end.scale,1);assert.ok(exit.tip.y>H);
    const frames=Array.from({length:25},(_,f)=>plain(collaborator(i,f/24,0,W,H)));
    for(let f=24;f>=0;f--)assert.deepEqual(plain(collaborator(i,f/24,0,W,H)),frames[f]);
  }
  assert.throws(()=>collaborator(6,0,0,960,494));
});
