import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FULLFIELD, capabilityGroups, scoreContract, fullFieldTotals, nreTotals, localPackTotals, operationsEstimate, millionAllocation,
  cameraTotal, stationNodes, fieldStations, precisionScore, errorForScore, idf1, salePrice, fullFieldLatency, pixelsAcross } from '../src/fullfield.js';
import { getNodes } from '../src/nodes.js';
import { activityBoundary, insidePolygon, boundaryDistance } from '../src/deployment.js';
import { toScene, toWorld } from '../src/optics.js';
import { fieldingScenarios, FRAMES, SLOTS, outcomeView, applyFault, eventsUntil } from '../src/fielding.js';
import { metricsCatalog, ratio, searchMetrics } from '../src/metrics-catalog.js';
import { claimAudit } from '../src/claim-audit.js';
import { syntheticPitchPackage } from '../src/pitch.js';
import { DATA_FILES } from '../src/datapack.js';
import { parseRoute, SCENES, PANELS } from '../src/route.js';
import { theoryCards } from '../src/theory.js';

test('full-field costs reproduce every figure printed in the v4.2 report',()=>{
  assert.deepEqual(fullFieldTotals(),{low:814000,high:2058000,riskLow:162800,riskHigh:411600,cumulativeLow:1446800,cumulativeHigh:2939600,capGapLow:446800,capGapHigh:1939600});
  assert.deepEqual(nreTotals(),{newManMonths:[26,48],manMonths:[35,62],low:4440000,high:12624000,withHardwareLow:5886800,withHardwareHigh:15563600});
  assert.deepEqual(localPackTotals(),{batting:[67200,105600],pose:[54000,78000],bullpenPlusBatting:[537200,575600],withPose:[591200,653600]});
  assert.deepEqual(operationsEstimate(),{sparesLow:43404,sparesHigh:146980,reviewLow:288000,reviewHigh:720000});
  assert.equal(millionAllocation.reduce((s,r)=>s+r[1],0),1000000);
  assert.deepEqual(cameraTotal(),[14,18]);
  assert.equal(Math.round(salePrice({hardware:1800000,install:200000,warranty:90000,nre:6000000,units:10,margin:.3})),3842857);
  assert.equal(Math.round(salePrice({hardware:1800000,install:200000,warranty:90000,nre:6000000,units:1,margin:.3})),11557143);
  assert.equal(fullFieldLatency.reduce((s,r)=>s+r[1],0),800);
  assert.ok(Math.abs(pixelsAcross(2448,.073,60)-2.978)<.001);
});
test('full-field-v1 contract: 11 groups, weight 100, 7 must-pass, nothing counts without real evidence',()=>{
  assert.equal(capabilityGroups.length,11);assert.equal(capabilityGroups.reduce((s,g)=>s+g.weight,0),100);
  assert.equal(capabilityGroups.filter(g=>g.mustPass).length,7);
  assert.equal(capabilityGroups.filter(g=>['player_identity','fielding_oaa'].includes(g.id)).reduce((s,g)=>s+g.weight,0),34);
  const empty=scoreContract();assert.equal(empty.actualScore,null);assert.equal(empty.accepted,false);assert.equal(FULLFIELD.actualScore,null);
  const good=id=>({pass:true,source:'sensor',evidence_id:'E-'+id,reference_id:'R',scenario:'day',sample_count:300,confidence_interval:[0,1]});
  const synthetic=Object.fromEntries(capabilityGroups.map(g=>[g.id,{...good(g.id),source:'synthetic'}]));
  assert.equal(scoreContract(synthetic).actualScore,null,'synthetic evidence never scores');
  const all=Object.fromEntries(capabilityGroups.map(g=>[g.id,good(g.id)]));
  assert.equal(scoreContract(all).verifiedScore,100);assert.equal(scoreContract(all).accepted,false,'hard gates still pending');
  const noSpin={...all,direct_spin:{...all.direct_spin,sample_count:null}};
  assert.equal(scoreContract(noSpin).mustPassOk,false);
  assert.ok(Math.abs(errorForScore(2.54,.8)-3.175)<1e-9);assert.equal(precisionScore(2.54,20)<.8,true);
  assert.ok(Math.abs(idf1({idtp:900,idfp:50,idfn:100})-.9231)<1e-4);
});
test('F01–F08 stations match report coordinates and stay outside the activity area',()=>{
  const nodes=stationNodes(),poly=activityBoundary('full');
  assert.equal(nodes.length,8);assert.equal(nodes.filter(n=>n.tier==='research6').length,6);
  assert.deepEqual(fieldStations[0].world,[-12,-10,10]);assert.deepEqual(fieldStations[7].world,[40,120,14]);
  for(const n of nodes){
    assert.deepEqual(toWorld(n.pos).map(v=>v+0),n.world);
    for(let i=0;i<=10;i++){const p=[n.pos[0]+(n.anchor[0]-n.pos[0])*i/10,n.pos[2]+(n.anchor[2]-n.pos[2])*i/10];
      assert.equal(insidePolygon(p,poly),false,n.id);assert.ok(boundaryDistance(p,poly)>.65,n.id)}
  }
  const full=getNodes('full');assert.equal(full.filter(n=>n.type==='player').length,8);
  assert.equal(full.some(n=>['cam-g','cam-h'].includes(n.id)),false,'old v3.1 outfield nodes are not purchased twice');
  for(const n of full)assert.ok(n.purpose&&n.purpose.length<60,`${n.id} needs a short public purpose`);
});
test('synthetic fielding: 6 plays × 121 slices × 13 unique players, missing values never fabricated',()=>{
  assert.equal(fieldingScenarios.length,6);
  for(const sc of fieldingScenarios){
    assert.equal(sc.frames.length,FRAMES);assert.equal(sc.measurements.oaa_like,null);assert.equal(sc.illustrative_opportunity.label,'illustrative_not_trained');
    for(const f of sc.frames){
      assert.equal(f.players.length,13);assert.deepEqual(f.players.map(p=>p.slot),SLOTS);
      const ids=f.players.map(p=>p.global_track_id).filter(Boolean);assert.equal(new Set(ids).size,ids.length);
      for(const p of f.players){
        if(['occluded','not-on-field'].includes(p.validity))assert.equal(p.position_world_m,null);
        if(p.position_world_m)assert.equal(p.position_definition,'ground_anchor');
        assert.equal(typeof p.t_support_end_ns,'string');
      }
      if(f.ball.validity==='occluded')assert.equal(f.ball.position_world_m,null);
    }
    const before=outcomeView(sc,sc.outcome_t_s-.05),after=outcomeView(sc,sc.outcome_t_s);
    assert.equal(before.known,false);assert.equal(before.opportunity,null);assert.equal(before.landing.value_origin,'predicted');
    assert.equal(after.known,true);assert.ok(eventsUntil(sc,0).every(e=>e.t_s===0));
  }
  const amb=fieldingScenarios.find(s=>s.id==='id-ambiguity');
  assert.ok(amb.frames.some(f=>f.players.some(p=>p.validity==='ambiguous'&&p.player_id===null&&p.global_track_id)),'ambiguity keeps track, blanks identity');
  const occ=fieldingScenarios.find(s=>s.id==='occlusion');assert.ok(occ.frames.some(f=>f.players.some(p=>p.validity==='occluded')));
  const stale=applyFault(occ.frames[40],'stale');assert.equal(stale.measured_latency_ms,null);assert.ok(stale.players.filter(p=>p.on_field).every(p=>p.position_world_m===null));
});
test('metrics dictionary, claim audit and data package are complete and never claim measurements',()=>{
  assert.equal(metricsCatalog.length,90);assert.equal(new Set(metricsCatalog.map(m=>m.id)).size,90);
  assert.ok(metricsCatalog.every(m=>m.measured_value===null&&m.status==='planned'));
  assert.equal(ratio(1,0),null);assert.equal(searchMetrics('barrel').length,6);
  assert.equal(claimAudit.length,15);
  const pitches=syntheticPitchPackage();assert.equal(pitches.count,32);
  assert.ok(pitches.records.every(r=>r.trajectory.samples.length===241&&r.measurements.spin_rpm===null&&r.measurements.spin_axis_world===null&&r.measurements.sample_to_visible_ms===null));
  assert.equal(new Set(pitches.records.map(r=>r.id)).size,32);
  for(const [name,make] of Object.entries(DATA_FILES)){const text=make();if(name.endsWith('.json'))JSON.parse(text);else assert.equal(text.charCodeAt(0),0xfeff)}
});
test('public routes: three scenes × three panels, legacy v3 links still resolve',()=>{
  for(const s of SCENES)for(const p of PANELS)assert.deepEqual(parseRoute(`#${s}/${p}`),{scene:s,panel:p});
  assert.deepEqual(parseRoute('#build/poc/plan'),{scene:'bullpen',panel:'theory'});
  assert.deepEqual(parseRoute('#buy/full/dashboard'),{scene:'full',panel:'replay'});
  assert.deepEqual(parseRoute('#poc/spin'),{scene:'bullpen',panel:'theory'});
  assert.deepEqual(parseRoute('#nonsense/x'),{scene:'bullpen',panel:'nodes'});assert.deepEqual(parseRoute(''),{scene:'bullpen',panel:'nodes'});
});
test('theory cards point only at devices that exist in some scene',()=>{
  const ids=new Set(SCENES.flatMap(s=>getNodes(s).map(n=>n.id)));
  for(const c of theoryCards){assert.ok(c.title&&c.text&&c.formula);if(c.action.select)assert.ok(ids.has(c.action.select),c.id);if(c.action.scene)assert.ok(SCENES.includes(c.action.scene))}
  assert.deepEqual(toScene([1,2,3]),[1,3,-2]);
});
