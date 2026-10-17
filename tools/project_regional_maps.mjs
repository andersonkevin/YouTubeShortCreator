/* Offline regional geometry compiler. No downloads, file writes or browser code.
   Supply the pinned local D3 script container and two exact atlas JSON files. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

export const pins=Object.freeze({
  d3:'4532cbe107e25ffe955d109e6cce1a6bbdf36192058d2546e3430c0aee4c7861',
  spain:'c99ec36ed214619ab680de4dca8c5aefe36753f20cfe3efe10051d4d1e10b6dc',
  us:'d76b391ccfa8bff601d51e3e3da5d43a89fa46cd5caca72ce731b383be5596d0',
});
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function regularFile(filename) {
  const absolute=path.resolve(filename);
  for(let p=absolute;;p=path.dirname(p)) {
    assert.ok(!fs.lstatSync(p).isSymbolicLink(),'Symbolic links are not source inputs');
    if(path.dirname(p)===p)break;
  }
  assert.ok(fs.statSync(absolute).isFile(),'Regular source file required');
  return fs.readFileSync(absolute,'utf8');
}
export function decode(topology,objectName) {
  assert.equal(topology.type,'Topology');
  const {scale,translate}=topology.transform;
  assert.ok([...scale,...translate].every(Number.isFinite));
  const arcs=topology.arcs.map(arc=>{
    let x=0,y=0;
    return arc.map(point=>{
      assert.ok(point.length===2&&point.every(Number.isFinite));
      x+=point[0];y+=point[1];return [x*scale[0]+translate[0],y*scale[1]+translate[1]];
    });
  });
  function ring(indices) {
    const points=[];
    for(const index of indices) {
      assert.ok(Number.isInteger(index));
      const arc=arcs[index<0?~index:index];assert.ok(arc&&arc.length>=2,'Valid topology arc required');
      const ordered=index<0?[...arc].reverse():arc;
      if(points.length){assert.deepEqual(points.at(-1),ordered[0]);points.pop();}
      points.push(...ordered);
    }
    assert.ok(points.length>=2);assert.deepEqual(points[0],points.at(-1),'Closed polygon ring required');
    // TopoJSON preserves quantized, degenerate rings by padding the first point.
    while(points.length<4)points.push(points[0]);
    return points;
  }
  assert.equal(topology.objects[objectName].type,'GeometryCollection');
  return {type:'FeatureCollection',features:topology.objects[objectName].geometries.map(g=>{
    assert.ok(['Polygon','MultiPolygon'].includes(g.type));
    return {type:'Feature',id:String(g.id).padStart(2,'0'),properties:g.properties,
      geometry:{type:g.type,coordinates:g.type==='Polygon'?g.arcs.map(ring):g.arcs.map(p=>p.map(ring))}};
  })};
}
const ES='AND ARA AST BAL CAN CNT CYL CLM CAT VAL EXT GAL MAD MUR NAV PVA RIO CEU MEL'.split(' ');
const US={'01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','12':'FL','13':'GA',
  '15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA',
  '26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM',
  '36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD',
  '47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY'};
export function compile(html,spainBytes,usBytes) {
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/g)].map(m=>m[1]).filter(s=>sha(s)===pins.d3);
  assert.equal(scripts.length,1,'Exactly one pinned D3 script required; composition scripts are never run');
  assert.equal(sha(spainBytes),pins.spain);assert.equal(sha(usBytes),pins.us);
  const context=vm.createContext({});vm.runInContext(scripts[0],context,{timeout:1500});
  const d3=context.d3;assert.equal(d3.version,'7.9.0');
  function project(bytes,style) {
    const es=style==='spain',all=decode(JSON.parse(bytes),es?'autonomous_regions':'states');
    const projection=es?d3.geoConicConformal().center([0,39.5]).rotate([3.5,0]).fitSize([1200,750],all):d3.geoAlbersUsa().fitSize([1380,800],all);
    const draw=d3.geoPath(projection).digits(3);
    const regions=all.features.flatMap(feature=>{
      const code=es?ES[Number(feature.id)-1]:US[feature.id];if(!code)return [];
      const d=draw(feature),bounds=draw.bounds(feature),centroid=draw.centroid(feature);
      assert.ok(d&&/^[MLZ0-9.,\-]+$/.test(d));assert.ok([...bounds.flat(),...centroid].every(Number.isFinite));
      assert.ok(bounds[0][0]>=-.01&&bounds[0][1]>=-.01&&bounds[1][0]<=1380.01&&bounds[1][1]<=800.01);
      return [{code,id:feature.id,name:feature.properties.name,d,bounds,centroid}];
    });
    assert.equal(regions.length,es?19:50);
    return {width:1400,height:820,regions};
  }
  return {spain:project(spainBytes,'spain'),us:project(usBytes,'us')};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.equal(process.argv.length,5,'Usage: node tools/project_regional_maps.mjs pinned-d3.html spain.json us.json');
  process.stdout.write(JSON.stringify(compile(...process.argv.slice(2).map(regularFile)))+'\n');
}
