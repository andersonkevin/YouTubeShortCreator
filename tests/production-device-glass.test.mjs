import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context=vm.createContext({window:{},console});
for(const name of ['motion',''])vm.runInContext(fs.readFileSync(new URL('../templates/v1/assets/production-device-glass'+(name?'-'+name:'')+'.js',import.meta.url),'utf8'),context);
const M=context.window.ShortCreatorDeviceGlassMotion,G=context.window.ShortCreatorDeviceGlass,plain=value=>JSON.parse(JSON.stringify(value));
const notification={icon:'file-text',title:'Review',time:'now',body:'The draft is ready.'};
const phone={style:'phone-glass',notifications:[notification,{...notification,icon:'code'},{...notification,icon:'check'}]};
const desktop={style:'desktop-glass',notification,desktop:{menu:{app:'Workspace',items:['File','Edit','View','Go','Window','Help'],status:'Local preview'},
  window:{title:'Review assets',sidebar:['One','Two','Three','Four','Five','Six'].map(label=>({label,icon:'code'})),files:Array.from({length:8},(_,i)=>({label:'File '+i,kind:i%2?'document':'folder'}))},
  calendar:{year:2024,month:2,day:29},status:{label:'Local',value:'Ready',detail:'Offline',note:'Review'},media:{title:'Preview',detail:'Local episode'},dock:Array(9).fill('check')}};
const colors={background:'#100b2c',surface:'#2a1848',secondary:'#8ad4de',accent:'#d1ef71'};
function canvas(){
  const calls=[];const g={canvas:{},font:'',measureText(value){return {width:value.length*parseFloat(this.font.split(' ')[1])*.52};},
    createLinearGradient(){return {addColorStop(){}};}};
  for(const name of ['clearRect','fillRect','fillText','drawImage','save','restore','beginPath','roundRect','clip','fill','stroke','moveTo','bezierCurveTo','arc'])g[name]=(...args)=>calls.push({name,args});
  return {g,c:g.canvas,calls};
}
const image={naturalWidth:900,naturalHeight:900},icons=new Map(['file-text','code','check'].map(id=>[id,{complete:true,naturalWidth:24}]));

test('both retained device-glass timelines preserve absolute state across reverse seeks',()=>{
  for(const style of ['phone','desktop']){
    const rows=Array.from({length:901},(_,i)=>plain(M.pose(style,i/60)));
    for(let i=900;i>=0;i--)assert.deepEqual(plain(M.pose(style,i/60)),rows[i]);
  }
  const mac=M.pose('desktop',0).state;assert.equal(mac.lpX,0);assert.equal(mac.phX,10);assert.equal(mac.cZ,4.5);assert.equal(mac.macToastX,1464);
  assert.equal(M.pose('desktop',1).state.macToastX,1002);assert.equal(M.pose('desktop',15).state.cZ,7);
  assert.equal(M.pose('phone',0).state.iosN1,0);assert.equal(M.pose('phone',3.31).state.iosN3,1);
  assert.throws(()=>M.pose('other',1));assert.throws(()=>M.pose('phone',Infinity));
});

test('calendar uses the supplied date with UTC weekday and leap-year handling',()=>{
  assert.deepEqual(plain(G.calendar({year:2024,month:2,day:29})),{first:4,days:29,selected:29,label:'FEBRUARY'});
  assert.deepEqual(plain(G.calendar({year:2025,month:2,day:28})),{first:6,days:28,selected:28,label:'FEBRUARY'});
});

test('phone notifications retain original glass geometry, stagger and exact caller copy',()=>{
  const output=canvas(),buffer=canvas();
  const before=G.paint(output.g,buffer,image,icons,phone,M.pose('phone',0).state,colors);assert.equal(before.copy.length,0);
  const after=G.paint(output.g,buffer,image,icons,phone,M.pose('phone',4).state,colors);
  assert.deepEqual(plain(after.notifications.map(n=>[n.q,n.x,n.y,n.w,n.h])),[[1,13,106,364,66],[1,13,174,364,66],[1,13,242,364,66]]);
  assert.equal(after.copy.length,9);assert.ok(after.copy.every(n=>n.font.endsWith('BrandSans')&&n.width<=n.limit));
  assert.deepEqual(plain(G.iconIds(phone)),['file-text','code','check']);assert.ok(buffer.calls.some(c=>c.name==='drawImage'));
});

test('desktop glass paints supplied windows, files, dock, widgets and notification',()=>{
  const output=canvas(),result=G.paint(output.g,canvas(),image,icons,desktop,M.pose('desktop',5).state,colors);
  assert.equal(result.calendar.days,29);assert.equal(result.notifications[0].q,1);assert.equal(result.notifications[0].x,1002);
  const copy=result.copy.map(row=>row.text);assert.ok(copy.includes('Workspace')&&copy.includes('File 7')&&copy.includes('The draft is ready.'));
  assert.ok(!copy.includes('HyperFrames')&&!copy.includes('San Francisco')&&!copy.includes('53°'));
  assert.ok(output.calls.filter(c=>c.name==='drawImage').length>=17);
});

test('text overflow and undecoded icons fail instead of shrinking or disappearing',()=>{
  const bad=structuredClone(phone);bad.notifications[0].body='W'.repeat(60);
  assert.throws(()=>G.paint(canvas().g,canvas(),image,icons,bad,M.pose('phone',4).state,colors),/readable/);
  assert.throws(()=>G.paint(canvas().g,canvas(),image,new Map(),phone,M.pose('phone',4).state,colors),/icon is not decoded/);
});
