import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/production-chat-exchange.js',import.meta.url),'utf8'),context);
const chat=context.window.ShortCreatorChatExchange,plain=x=>JSON.parse(JSON.stringify(x));
const message=side=>({type:'message',item:{label:'Supplied',body:'Exact supplied text.',side}});
test('typing keeps grapheme boundaries, literal text and a visible final prefix before send',()=>{
  for(const text of ['Read  two spaces','cafe\u0301 क्‍ष <script>','A'.repeat(72),'界'])for(const thread of [false,true]){
    const valid=new Set(['',...[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(text)].map(x=>text.slice(0,x.index+x.segment.length))]);
    assert.equal(chat.typed(text,-.1,thread).text,'');
    for(let frame=0;frame<=60;frame++)assert.ok(valid.has(chat.typed(text,frame/30,thread).text));
    assert.equal(chat.typed(text,1.54,thread).text,text);assert.equal(chat.typed(text,2,thread).caret,false);
  }
});
test('answer streams keep exact whitespace and authored word spacing with a bounded finish',()=>{
  for(const text of ['  One  two\nthree ','One',Array(80).fill('a').join(' ')])for(const research of [false,true]){
    const start=chat.stream(text,0,research),end=chat.stream(text,2,research);
    assert.equal(start.tokens.join(''),text);assert.ok(start.alpha.every(a=>a===0));assert.ok(end.alpha.every(a=>a===1));
    if(text==='  One  two\nthree ')assert.ok(Math.abs(end.times[1]-end.times[0]-(research?.04:.15))<1e-8);
  }
});
test('line growth follows measured line ends, not character-count line estimates',()=>{
  const ends=[40,40,80,80,120],times=[.12,.27,.42,.57,.72];
  assert.equal(chat.growingHeight(180,60,ends,times,0),0);
  assert.equal(chat.growingHeight(180,60,ends,times,.4),100);
  assert.ok(chat.growingHeight(180,60,ends,times,.5)>100);
  assert.equal(chat.growingHeight(180,60,ends,times,2),180);
});
test('activity has two distinct arrivals, collapses to supplied summary and stops its spinner',()=>{
  assert.equal(chat.activity(.4).rows[1],0);assert.equal(chat.activity(.8).rows[1],1);
  const end=chat.activity(2);assert.deepEqual(plain(end),{rows:[0,0],alpha:0,summary:1,spin:0,scale:1});
  assert.ok(chat.activity(.3).spin>0);assert.notEqual(chat.activity(.3).scale,1);
});
test('composer flight and thread arrival retain distinct source mechanics and stable endpoints',()=>{
  for(const variant of chat.variants){
    for(const side of ['sent','received']){
      const entry=message(side),before=chat.pose(entry,-1,variant),end=chat.pose(entry,2,variant);
      assert.equal(before.alpha,0);assert.equal(end.alpha,1);assert.equal(end.height,1);assert.equal(end.scale,1);
      assert.deepEqual(plain(end),plain(chat.pose(entry,600,variant)));
      const frames=Array.from({length:61},(_,f)=>plain(chat.pose(entry,f/30,variant)));
      for(let f=60;f>=0;f--)assert.deepEqual(plain(chat.pose(entry,f/30,variant)),frames[f]);
    }
  }
  assert.equal(chat.pose(message('sent'),1.5,'answer-stream').height,0);
  assert.ok(chat.pose(message('sent'),1.7,'answer-stream').flight>0);
  assert.equal(chat.pose(message('received'),1.3,'message-thread').dots,true);
  assert.equal(chat.pose(message('received'),1.5,'message-thread').dots,false);
});
test('cue clock uses actual 30fps starts, including late ten-minute scenes',()=>{
  const starts=[590.415,593.415,596.415];
  assert.ok(chat.elapsed(17712/30,starts)[0]<0);assert.equal(chat.elapsed(17713/30,starts)[0],0);
  assert.equal(chat.elapsed(17773/30,starts)[0],2);
});
test('conversation plan assigns one cue per message, tool group and explicit table row',()=>{
  const items=[message('sent').item,message('received').item];
  const c={items,variant:'answer-stream',table:{rows:[['A','B','C'],['D','E','F']]}};
  assert.deepEqual(plain(chat.plan(c).map(e=>e.type)),['message','message','table','table']);
  c.variant='research-stream';assert.deepEqual(plain(chat.plan(c).map(e=>e.type)),['message','activity','message']);
  c.variant='message-thread';assert.equal(chat.plan(c).length,2);
});
test('measured stack keeps the latest entry wholly visible in every native viewport',()=>{
  for(const height of [362,928,362,592])for(const count of [2,4,12]){
    const heights=Array.from({length:count},(_,i)=>120+i*8),poses=heights.map(()=>({height:1}));
    const g=chat.layout(heights,poses,height),last=g.tops.at(-1)-g.scroll;
    assert.ok(last>=0);assert.ok(last+heights.at(-1)<=height+1e-8);
    for(let i=1;i<count;i++)assert.equal(g.tops[i]-g.tops[i-1],heights[i-1]+16);
  }
  assert.throws(()=>chat.layout([NaN],[{height:1}],400));
});
