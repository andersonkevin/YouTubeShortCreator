import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const file of ['production-character-data.js','production-character-walk.js'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+file,import.meta.url),'utf8'),context);
const data=context.window.ShortCreatorCharacterData,{sample,multiply,poses,state,geometry}=context.window.ShortCreatorCharacterWalk;
const plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('all source layers, shapes and keyframe endpoints survive the bounded conversion',()=>{
  assert.equal(data.source_sha256,'b17f487d93636827be00a53124dca0ddb4d16907c1225670d75cb966f5963b9b');
  assert.equal(data.layers.length,15);assert.equal(data.layers.reduce((n,l)=>n+l.shapes.length,0),16);
  assert.equal(poses(0).length,14);
  const check=p=>{
    if(p.x){check(p.x);check(p.y);return;}
    if(p.keys)for(const [frame,value] of p.keys)assert.deepEqual(plain(sample(p,frame)),plain(value));
  };
  for(const layer of data.layers)for(const p of Object.values(layer.transform))check(p);
  near(sample(data.layers.find(l=>l.id===1).transform.p,0)[0],-140);
  near(sample(data.layers.find(l=>l.id===1).transform.p,146)[0],764);
  near(sample(data.layers.find(l=>l.id===5).transform.r,225)[0],-117);
});
test('linear keys and independent transform parenting retain subframe and articulated motion',()=>{
  assert.deepEqual(plain(sample({keys:[[0,[10,20]],[2,[14,30]]]},.5)),[11,22.5]);
  assert.deepEqual(plain(multiply([0,1,-1,0,10,20],[1,0,0,1,4,5])),[0,1,-1,0,5,24]);
  const at=poses(0),torso=at.find(l=>l.id===2),head=at.find(l=>l.id===3),eye=at.find(l=>l.id===4);
  near(torso.matrix[4],-140);near(torso.matrix[5],736);
  near(head.matrix[4],-140+6*Math.cos(5*Math.PI/180)+158*Math.sin(5*Math.PI/180));
  assert.notEqual(eye.matrix[4],46,'The eye inherits head and torso transforms');
  near(at.find(l=>l.id===15).opacity,.1);
});
test('all frames remain finite, rewind exactly and hold the last visible source frame',()=>{
  for(let f=0;f<=224;f+=.5) {
    const expected=plain(poses(f));poses(224);poses(0);assert.deepEqual(plain(poses(f)),expected);
    assert.ok(expected.every(l=>l.matrix.every(Number.isFinite)&&l.opacity>=0&&l.opacity<=1));
  }
  assert.deepEqual(plain(poses(18000)),plain(poses(224)));assert.deepEqual(plain(poses(-1)),plain(poses(0)));
  for(const bad of [NaN,Infinity,-Infinity]){assert.throws(()=>poses(bad));assert.throws(()=>state(bad));}
});
test('the pointing card retains source stagger, easing and final supplied-copy hold',()=>{
  near(state(5.2).card,0);near(state(5.5).card,.9375);near(state(5.3).title,0);near(state(5.4).body,0);
  near(state(5.75).rule,1-2**-5);near(state(6).rule,1);
  const end=state(7.5);assert.equal(end.frame,224);near(end.card,1);near(end.cardX,0);near(end.cardScale,1);near(end.title,1);near(end.body,1);
  assert.deepEqual(plain(state(600)),plain(end));
});
test('four native boards keep a useful character scale and room for card entry and footer',()=>{
  for(const [w,h] of [[1720,690],[940,1300],[960,690],[960,920]]) {
    const g=geometry(w,h);assert.ok(g.scale>=.78&&g.scale<=.9);
    assert.ok(g.card.w>=280&&g.card.x+g.card.w+40<w&&g.card.y>=24);
    assert.ok(g.ground<h-70);assert.ok(g.card.y+400<h-60);
    assert.ok(g.x-140*g.scale<0,'The original walk begins outside the board');
  }
  assert.throws(()=>geometry(400,600));
});
test('the settled articulated silhouette and its strokes fit without covering the card',()=>{
  for(const [w,h] of [[1720,690],[940,1300],[960,690],[960,920]]) {
    const g=geometry(w,h);
    for(const pose of poses(224))for(const shape of data.layers.find(l=>l.id===pose.id).shapes) {
      const [cx,cy]=shape.position,[sw,sh]=shape.size,m=pose.matrix,half=(shape.stroke_width||0)/2;
      for(const u of [-1,1])for(const v of [-1,1]) {
        const x=cx+u*(sw/2+half),y=cy+v*(sh/2+half);
        const px=g.x+g.scale*(m[0]*x+m[2]*y+m[4]),py=g.y+g.scale*(m[1]*x+m[3]*y+m[5]);
        assert.ok(px>=0&&px<g.card.x&&py>=0&&py<h-60,`Layer ${pose.id} exceeds its illustration region`);
      }
    }
  }
});
