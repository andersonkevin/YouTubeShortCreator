import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{},Intl};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-image-inspection.js',import.meta.url),'utf8'),context);
const {scanState,floodRecipe,floodState,valueTables,telemetryState,readoutState,counterState,cornerPath}=context.window.ShortCreatorImageInspection;
const plain=value=>JSON.parse(JSON.stringify(value));

test('scan gate sweeps before locking and clears its transient pulse at rest',()=>{
  assert.equal(scanState(0).opacity,0);assert.equal(scanState(.5/1.05).sweepOpacity,0);
  assert.equal(scanState(.68/1.05).target,0);assert.ok(scanState(.86/1.05).pulseOpacity>.899);
  const end=scanState(1);assert.equal(end.corners,1);assert.equal(end.target,1);assert.equal(end.label,1);
  assert.equal(end.sweepOpacity,0);assert.equal(end.pulseOpacity,0);
  for(let f=0;f<=24;f++) {
    const s=scanState(f/24);assert.ok(Object.values(s).every(Number.isFinite));
    assert.ok(s.corners>.9&&s.corners<=1/.6);assert.ok(s.opacity>=0&&s.opacity<=1);
    scanState(1);assert.deepEqual(plain(s),plain(scanState(f/24)));
  }
});

test('flood preserves source seeded row schedules and quantizes only native frame arrivals',()=>{
  assert.deepEqual([0,1,2,3].map(i=>plain(floodRecipe(i))),[
    {quantum:2,rows:13},{quantum:2,rows:11},{quantum:3,rows:14},{quantum:2,rows:12}]);
  for(let i=0;i<4;i++) {
    const recipe=floodRecipe(i);let prior=0;
    for(let frame=0;frame<=24;frame++) {
      const s=floodState(frame/24,recipe);assert.ok(s.visible>=prior&&s.visible<=recipe.rows);
      if(frame%recipe.quantum&&frame<24)assert.equal(s.visible,prior);
      if(frame>=19)assert.equal(s.flicker,0);
      assert.ok([0,.05].includes(s.flicker));prior=s.visible;
      floodState(1,recipe);assert.deepEqual(plain(s),plain(floodState(frame/24,recipe)));
    }
    const end=floodState(1,recipe);assert.equal(end.visible,recipe.rows);assert.equal(end.label,1);assert.equal(end.bracket,1);
  }
  for(const index of [-1,4,.5])assert.throws(()=>floodRecipe(index));
});

test('telemetry decodes exact supplied graphemes without changing labels or final values',()=>{
  const records=[{label:'A',value:'12 Ab!'},{label:'B',value:'Cafe\u0301 👩🏽‍💻'}],before=JSON.stringify(records);
  const tables=valueTables(records);assert.equal(JSON.stringify(records),before);
  assert.deepEqual(plain(tables[0]),['--','57 Ja!','19 An!','12 Xl!','12 Nm!','12 Jk!','12 Ai!','12 Ab!','12 Ab!']);
  assert.equal(tables[1].at(-1),records[1].value);assert.deepEqual(plain(tables),plain(valueTables(records)));
  for(const [i,table] of tables.entries()) {
    assert.equal(readoutState(0,table).value,'--');assert.equal(readoutState(0,table).opacity,0);
    assert.equal(readoutState(1,table).value,records[i].value);assert.equal(readoutState(1,table).opacity,1);
    for(let f=0;f<=24;f++)assert.equal(readoutState(f/24,table).value,table[Math.floor(f/3)]);
  }
  for(let i=0;i<4;i++){assert.equal(telemetryState(0,i).bracket,0);assert.equal(telemetryState(1,i).bracket,1);}
});

test('camcorder reads the native frame clock, supplied offset and recording flag on reverse seeks',()=>{
  const hud={counter_start:3599,recording:true},onset=.507,start=Math.ceil(onset*30);
  assert.equal(counterState((start+29)/30,onset,hud).counter,'00:59:59');
  assert.equal(counterState((start+30)/30,onset,hud).counter,'01:00:00');
  assert.equal(counterState((start+16)/30,onset,hud).dot,1);assert.equal(counterState((start+17)/30,onset,hud).dot,.25);
  for(const frame of [18000,0,31,17,300,16,18000,1]) {
    const s=counterState((start+frame)/30,onset,hud);assert.equal(s.frame,frame);
    counterState(1000,onset,hud);assert.deepEqual(plain(s),plain(counterState((start+frame)/30,onset,hud)));
    assert.equal(counterState((start+frame)/30,onset,{...hud,recording:false}).dot,0);
  }
});

test('inspection corners are generated from the supplied region without an arbitrary path input',()=>{
  const d=cornerPath({x:10,y:20,width:100,height:50});
  assert.equal(d,'M 28 20 H 10 V 29 M 92 20 H 110 V 29 M 10 61 V 70 H 28 M 92 70 H 110 V 61');
});
