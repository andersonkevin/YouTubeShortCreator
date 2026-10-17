import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

const context={window:{}};
for(const name of ['production-optical-fields','production-optical-shaders'])
  vm.runInNewContext(fs.readFileSync(new URL('../templates/v1/assets/'+name+'.js',import.meta.url),'utf8'),context);
const api=context.window.ShortCreatorOpticalFields,plain=v=>JSON.parse(JSON.stringify(v));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('focus pull interpolates optical power and holds exact near and far planes',()=>{
  assert.equal(api.focusAt(0),1.2);assert.equal(api.focusAt(1.2),1.2);
  near(api.focusAt(2.8),1/(.5/1.2+.5/80));
  assert.equal(api.focusAt(4.4),80);assert.equal(api.focusAt(600),80);
  let previous=1.2;
  for(let i=0;i<=180;i++){const f=api.focusAt(i/30);assert.ok(f>=previous&&f<=80);previous=f;}
  for(const t of [-1,NaN,Infinity])assert.throws(()=>api.focusAt(t));
});

test('seeded optical scene retains near wire, bulbs, far skyline and midground depths',()=>{
  const lights=plain(api.rackLights());assert.deepEqual(plain(api.rackLights()),lights);
  assert.ok(lights.length>1314&&lights.length<1570);
  const halfW=.5*36*1.2/85,ns=halfW/.25412;
  near(lights[0].position[0],-.42*ns);near(lights[1099].position[0],.42*ns);
  near(lights[0].position[2],1.2-.05*.42/.4);
  assert.deepEqual(lights[0].size,[.0006*ns,1.4]);
  for(let i=1100;i<1144;i+=4){assert.equal(lights[i].size[1],26);for(let j=1;j<4;j++)assert.equal(lights[i+j].size[1],7);}
  for(const light of lights){assert.ok([...light.position,...light.size,...light.color].every(Number.isFinite));assert.ok(light.position[2]>0&&light.size[0]>0);}
  const tail=lights.slice(-90);assert.ok(tail.every(l=>l.position[2]>=2.28&&l.position[2]<=68));
  assert.ok(lights.slice(1144,-170).every(l=>l.position[2]>78&&l.position[2]<87));
  const sign=lights.slice(-170,-90);assert.equal(sign.length,80);assert.ok(sign.every(l=>l.position[2]===79.2&&l.size[1]===7));
});

test('three synthetic traces blank the flyback and use velocity-normalized phosphor decay',()=>{
  assert.deepEqual(plain(api.waves),['sine','square','triangle']);
  for(const kind of api.waves) {
    near(api.wave(kind,0),0);near(api.wave(kind,1/48),kind==='square'?Math.tanh(8):1);
    const first=api.trace(kind,0);assert.equal(first.segments.length,0);assert.deepEqual(plain(first.head),[0,400]);
    const snapshots=[0,.01,.199,.2,.21,1.37,3.2,6].map(t=>plain(api.trace(kind,t)));
    for(const [index,t] of [0,.01,.199,.2,.21,1.37,3.2,6].entries()) {
      const state=api.trace(kind,t),dt=.3/state.samples,lRef=5000*dt;
      assert.deepEqual(plain(state),snapshots[index]);assert.ok(state.samples>=120&&state.samples<=8000);
      for(const segment of state.segments) {
        const {from,to,alpha}=segment;
        assert.ok(to[0]>=from[0]&&to[0]-from[0]<=lRef+1e-8,'Flyback must not connect opposite grid edges');
        assert.ok(from[1]>=100&&from[1]<=700&&to[1]>=100&&to[1]<=700);
        assert.ok(alpha>0&&alpha<=1);
      }
      const last=state.segments.at(-1);
      if(last&&last.to[0]===state.head[0])near(last.alpha,Math.min(1,lRef/Math.hypot(last.to[0]-last.from[0],last.to[1]-last.from[1])));
    }
    for(const t of [-1,NaN,Infinity,6.01])assert.throws(()=>api.trace(kind,t));
  }
  assert.throws(()=>api.trace('data',1));assert.throws(()=>api.wave('constructor',0));
});

test('phosphor painters restore canvas state and reproduce draw calls after reverse seeks',()=>{
  const colors={background:'#140b30',accent:'#beda61',secondary:'#7acbd7',foreground:'#ffffff'};
  let calls=[];
  const ctx=new Proxy({}, {set:(o,k,v)=>{o[k]=v;calls.push([k,v]);return true;},get:(o,k)=>{
    if(k in o)return o[k];
    if(k==='createRadialGradient')return (...args)=>{calls.push([k,...args]);return {addColorStop:(...a)=>calls.push(['stop',...a])};};
    return (...args)=>{assert.ok(args.filter(a=>typeof a==='number').every(Number.isFinite));calls.push([k,...args.filter(a=>typeof a!=='object')]);};
  }});
  for(const [w,h] of [[1720,494],[940,1060],[960,494],[960,724]])for(const kind of api.waves) {
    const draw=t=>{calls=[];const state=api.paintScope(ctx,w,h,t,colors,kind);return JSON.stringify([state,calls]);};
    const reference=draw(.17);draw(6);assert.equal(draw(.17),reference);
    assert.equal(ctx.globalCompositeOperation,'source-over');assert.equal(ctx.filter,'none');assert.equal(ctx.globalAlpha,1);
    assert.deepEqual(calls[0],['setTransform',1,0,0,1,0,0]);
    assert.ok(calls.some(c=>c[0]==='scale'&&c[1]===Math.min(w/1100,h/900)&&c[1]===c[2]));
  }
});

test('optical shaders preserve source GLSL with defined smoothstep edges',t=>{
  const upstream=new URL('../../../registry/blocks/',import.meta.url);
  const changes={
    'cosmic-orb':[['smoothstep(rad, 0.0, d)','(1.0 - smoothstep(0.0, rad, d))'],
      ['smoothstep(1.0 + aa, 1.0 - aa, r)','(1.0 - smoothstep(1.0 - aa, 1.0 + aa, r))'],
      ['smoothstep(1.0, 0.90, r)','(1.0 - smoothstep(0.90, 1.0, r))']],
    'rack-focus':[['smoothstep(bound, bound - vAA, r)','(1.0 - smoothstep(bound - vAA, bound, r))'],
      ['smoothstep(1.0, 1.0 - vAA, length(vQ - vRadial * cut))','(1.0 - smoothstep(1.0 - vAA, 1.0, length(vQ - vRadial * cut)))'],
      ['smoothstep(1.0, 1.0 - vAA, length(vQ + vRadial * cut))','(1.0 - smoothstep(1.0 - vAA, 1.0, length(vQ + vRadial * cut)))']]
  };
  for(const [name,prefix] of [['cosmic-orb','orb'],['rack-focus','rack']]) {
    const file=new URL(name+'/'+name+'.html',upstream);
    if(!fs.existsSync(file)){t.skip('Upstream checkout optional for consumers');return;}
    const html=fs.readFileSync(file,'utf8');
    for(const [variable,suffix] of [['VERT','Vertex'],['FRAG','Fragment']]) {
      const body=html.match(new RegExp('var '+variable+' = \\[([\\s\\S]*?)\\]\\.join\\("\\\\n"\\)'))[1];
      let source=[...body.matchAll(/^\s*("(?:[^"\\]|\\.)*")\s*,?\s*(?:\/\/.*)?$/gm)].map(m=>JSON.parse(m[1])).join('\n');
      if(variable==='FRAG')for(const [before,after] of changes[name]){assert.ok(source.includes(before));source=source.replace(before,after);}
      assert.equal(context.window.ShortCreatorOpticalShaders[prefix+suffix],source);
    }
  }
});
