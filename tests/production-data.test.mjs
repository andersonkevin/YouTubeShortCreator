import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
for(const file of ['production-data','production-annotations'])vm.runInNewContext(
  fs.readFileSync(new URL('../templates/v1/assets/'+file+'.js',import.meta.url),'utf8'),context);
const {rankingAt,networkPositions}=context.window.ShortCreatorData;
const {regionPixels,pointerState}=context.window.ShortCreatorAnnotations;
const plain=value=>JSON.parse(JSON.stringify(value));
test('decline retains supplied data and couples atmosphere to the actual drop',()=>{
  const {declineState}=context.window.ShortCreatorData,values=[80,60,20];
  assert.deepEqual(plain(declineState(values,0,1)),{value:80,progress:0});
  assert.deepEqual(plain(declineState(values,1,.5)),{value:62.5,progress:17.5/60});
  assert.deepEqual(plain(declineState(values,2,1)),{value:20,progress:1});
  assert.deepEqual(plain(declineState([25.5,25.5,.125],2,1)),{value:.125,progress:1});
  for(let index=0;index<values.length;index++) {
    const frames=Array.from({length:25},(_,i)=>plain(declineState(values,index,i/24)));
    for(let i=24;i>=0;i--){assert.deepEqual(plain(declineState(values,index,i/24)),frames[i]);
      assert.ok(frames[i].value>=values[index]&&frames[i].value<=values[Math.max(0,index-1)]);}
  }
});
test('ranking preserves exact values, stable ties and continuous crossing ranks',()=>{
  const before=[100,20,20],after=[0,120,20];
  assert.deepEqual(plain(rankingAt(before,after,0).rows),[0,1,2]);
  assert.deepEqual(plain(rankingAt(before,after,1).rows),[2,0,1]);
  assert.deepEqual(plain(rankingAt(before,after,1).values),after);
  const frames=Array.from({length:101},(_,i)=>plain(rankingAt(before,after,i/100)));
  for(let i=100;i>=0;i--)assert.deepEqual(plain(rankingAt(before,after,i/100)),frames[i]);
  for(let i=0;i<frames.length;i++) {
    assert.equal(frames[i].leader,i/100>.4?1:0);
    frames[i].values.forEach((v,j)=>assert.ok(Math.abs(v-(before[j]+(after[j]-before[j])*i/100))<1e-8));
    assert.ok(frames[i].rows.every(r=>Number.isFinite(r)&&r>=0&&r<=2));
  }
  for(let k=1;k<10;k++) {
    const a=rankingAt(before,after,k/10-1e-8),b=rankingAt(before,after,k/10+1e-8);
    a.rows.forEach((v,i)=>assert.ok(Math.abs(v-b.rows[i])<1e-7));
  }
});
test('tree geometry uses explicit parent structure in each output aspect',()=>{
  const nodes=[{parent:null},{parent:0},{parent:0},{parent:1},{parent:1},{parent:2},{parent:2}];
  for(const [w,h] of [[1720,443],[940,990],[960,443],[960,673]]) {
    const positions=networkPositions(nodes,'branch',w,h);
    positions.forEach((point,i)=>{
      assert.ok(point.x>0&&point.x<w&&point.y>0&&point.y<h);
      if(i)assert.ok(point.y>positions[nodes[i].parent].y);
    });
    assert.ok(positions[3].x<positions[4].x&&positions[4].x<positions[5].x&&positions[5].x<positions[6].x);
    const hub=networkPositions(nodes,'hub',w,h);
    assert.equal(hub[0].x,w/2);assert.equal(hub[0].y,h/2);
    assert.equal(new Set(hub.map(p=>p.x+','+p.y)).size,7);
  }
});
test('annotation regions follow contain-fit coordinates including letterboxing',()=>{
  const region={x:.25,y:.25,width:.5,height:.5};
  assert.deepEqual(plain(regionPixels(1000,1000,2000,1000,region)),{x:250,y:375,width:500,height:250});
  assert.deepEqual(plain(regionPixels(1000,500,500,1000,region)),{x:437.5,y:125,width:125,height:250});
  assert.throws(()=>regionPixels(100,100,0,0,region));
});
test('cursor enters and exits physically and its tip follows the revealed stroke',()=>{
  const path=p=>({x:100+300*p,y:150+100*p}),height=500;
  assert.equal(pointerState(0,height,path).y,height*1.16);
  assert.ok(pointerState(1,height,path).y>height);
  const click=pointerState(.3,height,path);assert.equal(click.x,100);assert.equal(click.y,150);
  assert.equal(click.draw,0);assert.equal(click.rings[0].opacity,1);
  for(let i=0;i<=100;i++) {
    const p=i/100,state=pointerState(p,height,path);
    assert.ok(Object.values(state).slice(0,4).every(Number.isFinite));
    assert.ok(state.scale>=.84&&state.scale<=1);
    if(p>=.3&&p<=.8)assert.deepEqual({x:state.x,y:state.y},path(state.draw));
    assert.deepEqual(plain(pointerState(p,height,path)),plain(state));
  }
  assert.ok(pointerState(1,height,path).rings.every(r=>r.opacity===0));
});

test('annotation cursor reads prototype coordinates returned by SVG geometry',()=>{
  const path=p=>Object.create({x:100+300*p,y:150+100*p});
  assert.equal(Object.keys(path(.5)).length,0);
  for(const p of [.3,.4,.5,.6,.7,.8]) {
    const state=pointerState(p,500,path),expected=path(state.draw);
    assert.equal(state.x,expected.x);assert.equal(state.y,expected.y);
    assert.ok(Number.isFinite(state.x)&&Number.isFinite(state.y));
  }
});
