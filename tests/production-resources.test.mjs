import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-resources.js',import.meta.url),'utf8'),context);
const {scrambleTable,carouselTravel,irisRadius}=context.window.ShortCreatorResources;
const {lowerThirdState,roundedRail,cornerHead}=context.window.ShortCreatorResources;
const {metricColumns,metricPhase}=context.window.ShortCreatorResources;
test('metric reels preserve negative, fractional and scientific values without formatting claims',()=>{
  for(const value of [0,-999999.125,1000000,1e-7,0.123456789])for(const style of ['wheel','slot','pop']) {
    const columns=metricColumns(value,style);
    assert.equal(columns.map(c=>c.rows.at(-1)).join(''),String(value));
    for(const c of columns) {
      assert.equal(c.rows.length,c.stops+1);
      if(/\d/.test(c.char)) {
        assert.equal(c.rows[0],'0');
        assert.equal(c.stops,style==='wheel'?10+Number(c.char):1);
      } else {assert.equal(c.stops,0);assert.equal(c.rows[0],c.char);}
    }
  }
});
test('metric column cascade fits the caption beat and is seek independent',()=>{
  for(let n=1;n<=18;n++)for(let i=0;i<n;i++) {
    assert.equal(metricPhase(0,i,n),0);assert.equal(metricPhase(1,i,n),1);
    let prior=0;
    for(let f=0;f<=24;f++) {const p=metricPhase(f/24,i,n);assert.ok(p>=prior&&p<=1);prior=p;}
    for(const p of [1,.25,0,.75]) {const before=metricPhase(p,i,n);metricPhase(1,i,n);assert.equal(metricPhase(p,i,n),before);}
  }
});
test('attribution phases settle exactly and hold without clock state',()=>{
  for(const value of Object.values(lowerThirdState(0)))assert.equal(value,0);
  for(const value of Object.values(lowerThirdState(1)))assert.equal(value,1);
  assert.equal(JSON.stringify(lowerThirdState(1)),JSON.stringify(lowerThirdState(10)));
  for(const p of [.8,.1,1,0,.5]) {
    const before=lowerThirdState(p);lowerThirdState(1);assert.equal(JSON.stringify(before),JSON.stringify(lowerThirdState(p)));
    for(const value of Object.values(before))assert.ok(value>=0&&value<=1);
  }
});
test('paired neon heads traverse one measured rounded-rectangle lap then stop',()=>{
  for(const [width,height] of [[504,209],[924,284],[944,244]]) {
    const rail=roundedRail(width,height,20),r=20;
    assert.ok(Math.abs(rail.length-(2*width+2*height-8*r+2*Math.PI*r))<1e-8);
    assert.equal(cornerHead(rail.corners,rail.length,0),rail.corners[0]);
    assert.equal(cornerHead(rail.corners,rail.length,1),rail.corners[0]+rail.length);
    assert.equal(cornerHead(rail.corners,rail.length,2),cornerHead(rail.corners,rail.length,1));
    let previous=-Infinity;
    for(let frame=0;frame<=240;frame++) {const head=cornerHead(rail.corners,rail.length,frame/240);assert.ok(head>=previous);previous=head;}
  }
});
test('scramble locks exact unicode source, preserves whitespace and repeats without random state',()=>{
  for(const text of ['A  clear idea.','Review → approve','Café & code']) {
    const a=scrambleTable(text),b=scrambleTable(text);assert.equal(JSON.stringify(a),JSON.stringify(b));
    assert.equal(a.at(-1).join(''),text);assert.notEqual(a[0].join(''),text);
    const chars=Array.from(text);
    for(const row of a)for(let i=0;i<chars.length;i++)if(/\s/.test(chars[i]))assert.equal(row[i],chars[i]);
    for(let i=0;i<chars.length;i++) {
      const first=a.findIndex(row=>row[i]===chars[i]);
      assert.ok(a.slice(first).every(row=>row[i]===chars[i]));
    }
  }
});
test('carousel motion reaches exact centers without overshoot or history dependence',()=>{
  assert.equal(carouselTravel(0),0);assert.equal(carouselTravel(1),1);assert.equal(carouselTravel(.42),.86);
  let previous=0;
  for(let frame=0;frame<=240;frame++) {const p=carouselTravel(frame/240);assert.ok(p>=previous&&p<=1);previous=p;}
  for(const p of [1,.3,.8,0,.42]){const value=carouselTravel(p);carouselTravel(1);assert.equal(carouselTravel(p),value);}
});
test('iris contains every corner at completion in all profile-sized windows',()=>{
  for(const [w,h] of [[1040,520],[900,600],[900,330],[900,450]]) {
    assert.equal(irisRadius(w,h,0),0);assert.ok(irisRadius(w,h,1)>Math.hypot(w/2,h/2));
    assert.ok(irisRadius(w,h,.8)>irisRadius(w,h,.2));
  }
});
