import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},console};
for(const name of ['production-three-runtime','production-wireframe-motion','production-wireframe-shaders'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorWireframeMotion,T=context.window.ShortCreatorThree;
const plain=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const letter=(char,x,y=0)=>({char,baseX:x,baseY:y,xyScale:1,targetZ:0,depthScale:.5});

test('portal retains original opening, handoff, rush and empty-plate timing',()=>{
  const start=api.timeline(0,18),open=api.timeline(2.5),end=api.timeline(8);
  assert.equal(start.portal,0);assert.equal(start.travel,0);assert.equal(start.plate,0);
  near(api.timeline(1.475).portal,.5);assert.equal(open.portal,1);assert.equal(open.cardVisible,false);
  near(api.timeline(2.7).warp,.28);near(api.timeline(6).travel,22);
  near(api.timeline(3.89).glitch,.55);near(api.timeline(5.29).glitch,.55);
  assert.equal(end.portal,1);assert.equal(end.push,1);assert.equal(end.plate,1);
  near(end.travel,38);near(end.warp,.85);near(end.transition,.85);
  near(api.phraseEase(.62),.5);assert.equal(api.phraseEase(0),0);assert.equal(api.phraseEase(1),1);
  assert.deepEqual(plain(api.timeline(600)),plain(end));
  for(const bad of [NaN,Infinity,'1'])assert.throws(()=>api.timeline(bad));
  for(const count of [0,19,1.1])assert.throws(()=>api.timeline(0,count));
});

test('absolute source state, camera, triangles and warp replay without accumulated motion',()=>{
  const frames=Array.from({length:241},(_,i)=>plain({timeline:api.timeline(i/30,18),camera:api.cameraPose(i/30),
    triangle:api.trianglePose(i/30,3),warp:api.warpDots(i/30)}));
  for(let i=240;i>=0;i--)assert.deepEqual(plain({timeline:api.timeline(i/30,18),camera:api.cameraPose(i/30),
    triangle:api.trianglePose(i/30,3),warp:api.warpDots(i/30)}),frames[i]);
  const start=api.cameraPose(0);assert.deepEqual(plain(start.position),[0,0,22]);assert.equal(start.fov,100);
  assert.equal(api.gridPositions().length,3675*6);assert.equal(api.warpDots(0).length,0);
  for(const dots of frames.map(f=>f.warp))for(const dot of dots){
    assert.ok(dot.x>=-10&&dot.x<=1930&&dot.y>=-10&&dot.y<=1090);
    assert.ok(dot.size>=.3&&dot.alpha>=0&&dot.alpha<=.7&&dot.streak>=0);
  }
});

test('whole-word layout preserves exact spelling and fits the original safe rectangle',()=>{
  const measure=c=>c===' '?40:c==='i'?38:110;
  for(const text of ['B8O Café','Keep the exact CASE','ABCDEFGHIJKLMNOPQRSTUVWXYZ','One two three four five six']){
    const layout=api.layoutPhrase(text,measure);
    assert.equal(layout.lines.join(' '),text);
    assert.equal(layout.glyphs.map(g=>g.char).join(''),text.replaceAll(' ',''));
    for(const {rect:r} of layout.glyphs){assert.ok(r.left>=200-1e-8&&r.left+r.width<=1720+1e-8);
      assert.ok(r.top>=230-1e-8&&r.top+r.height<=850+1e-8);}
  }
  for(const text of ['', ' Outer','Outer ','Two  spaces','Two\nlines','A'.repeat(49)])assert.throws(()=>api.layoutPhrase(text,measure));
  for(const bad of [0,-1,NaN,Infinity,2000])assert.throws(()=>api.layoutPhrase('A',()=>bad));
});

test('matching glyph identity precedes distance and consumes each source once',()=>{
  const sources=[letter('A',100),letter('B',0),letter('A',-100)],targets=[letter('A',1),letter('B',99),letter('A',-99)];
  const slots=api.matchLetters(sources,targets,api.seeded(20260831));
  assert.deepEqual(plain(slots.map(s=>s.from)),[0,1,2]);assert.ok(slots.every(s=>s.sameGlyph));
  assert.deepEqual(plain(sources),[letter('A',100),letter('B',0),letter('A',-100)]);
  const tie=api.matchLetters([letter('A',-1),letter('A',1)],[letter('A',0)],api.seeded(20260831));
  assert.equal(tie[0].from,0);assert.equal(tie[1].to,null);
  const extra=api.matchLetters([letter('A',0)],[letter('A',0),letter('B',10)],api.seeded(20260831));
  assert.equal(extra[1].from,null);assert.ok(extra[1].start.targetZ<=-60&&extra[1].start.targetZ>-125);
});

test('handoff retains shared objects, hides unused glyphs and retires only beyond the camera',()=>{
  const targets=[letter('A',0),letter('C',3)],slots=api.matchLetters(
    [letter('A',0),letter('B',3),letter('Z',100)],targets,api.seeded(20260831));
  const start=api.handoff(2.5,slots,2,()=>-20);
  assert.equal(start.letters[0].from.visible,true);assert.equal(start.letters[0].to.visible,false);
  assert.equal(start.letters[1].from.visible,true);assert.equal(start.letters[1].to.visible,false);
  const end=api.handoff(5,slots,2,()=>-20);
  assert.equal(end.letters[0].from.visible,true);assert.equal(end.letters[0].to.visible,false);
  assert.equal(end.letters[1].from.visible,false);assert.equal(end.letters[1].to.visible,true);
  assert.equal(end.letters[2].from.visible,false);
  const atLens=api.handoff(6,slots,2,()=>4),pastLens=api.handoff(6,slots,2,()=>4.001);
  assert.equal(atLens.letters[0].from.visible,true);assert.equal(pastLens.letters[0].from.visible,false);
  const extra=api.matchLetters([letter('A',0)],targets,api.seeded(20260831));
  assert.equal(api.handoff(2.5,extra,2,()=>-20).letters[1].to.visible,false);
  assert.equal(api.handoff(5,extra,2,()=>-20).letters[1].to.visible,true);
  const recorded=Array.from({length:241},(_,i)=>plain(api.handoff(i/30,slots,2,()=>-20)));
  for(let i=240;i>=0;i--)assert.deepEqual(plain(api.handoff(i/30,slots,2,()=>-20)),recorded[i]);
  assert.throws(()=>api.handoff(3,slots,2,()=>NaN));
  assert.equal(api.supportingPose(4.2,0).visible,false);assert.equal(api.supportingPose(4.2,1).z,-145);
});

test('geometry preparation preserves approved advances and source perspective correction',()=>{
  const random=api.seeded(20260824),data=api.letterData('B',{left:800,top:400,width:100,height:176},8,10,random);
  assert.equal(data.char,'B');assert.ok(data.targetZ>=-2&&data.targetZ<2);assert.ok(data.depthScale>=.14&&data.depthScale<1);
  const corrected=api.perspectiveCorrect(data),p=(36-data.targetZ)/36;
  near(corrected.baseX,data.baseX*p);near(corrected.baseY,data.baseY*p);near(corrected.xyScale,data.xyScale*p);
  assert.equal(corrected.depthScale,data.depthScale);assert.equal(corrected.targetZ,data.targetZ);
});

test('all six shaders retain local uniforms and independent per-surface state',()=>{
  const shader=context.window.ShortCreatorWireframeShaders;
  const colors={surface:'#16102a',foreground:'#ffffff'};
  const a=shader.create(T,1720,390,colors),b=shader.create(T,940,860,colors);
  assert.equal(Object.keys(a).length,6);assert.notEqual(a.GridLineShader.uniforms,b.GridLineShader.uniforms);
  a.PortalCompositeShader.uniforms.uTime.value=5;assert.equal(b.PortalCompositeShader.uniforms.uTime.value,0);
  assert.equal(a.EdgeBlurShader.uniforms.uResolution.value.x,1720);assert.equal(b.EdgeBlurShader.uniforms.uResolution.value.y,860);
  assert.ok(a.PortalCompositeShader.fragmentShader.includes('1.0 - smoothstep(starShape - feather, starShape + feather, dist)'));
  assert.ok(a.PortalCompositeShader.fragmentShader.includes('1.0 - smoothstep(0.0, feather * 3.0, edgeDist)'));
  for(const [w,h] of [[0,1],[4097,1],[1.1,20],[NaN,20]])assert.throws(()=>shader.create(T,w,h,colors));
  assert.throws(()=>shader.create(T,100,100,{surface:'url(remote)',foreground:'#ffffff'}));
});
