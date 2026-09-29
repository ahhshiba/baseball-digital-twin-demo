import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetTotals, latency, PLAN, bullpenBudget, expansionBudget, publicPlan, bomCSV } from '../src/plan.js';
import { getNodes } from '../src/nodes.js';
import { activityBoundary, insidePolygon, boundaryDistance } from '../src/deployment.js';
import { opticsEstimate, observationGeometry, toWorld, toScene, syntheticAxes } from '../src/optics.js';
import { makeRecord, makePitch } from '../src/pitch.js';
import { purchaseProducts, purchaseEstimate, purchaseAssumptions, priceAudit, variantPlan, purchaseCSV, parsePlanHash, getPurchaseNodes } from '../src/procurement.js';

test('v3 budget is identical to the reviewed plan; cumulative stages are not additive',()=>{
  assert.deepEqual(budgetTotals(),{low:133000,high:191000,reserveLow:19950,reserveHigh:28650,totalLow:152950,totalHigh:219650});
  assert.equal(bullpenBudget.reduce((s,r)=>s+r[1],0),470000);
  assert.equal(expansionBudget.reduce((s,r)=>s+r[1],0),1000000);
  assert.equal(PLAN.directSpinRequired,true);assert.equal(PLAN.latencyMs,800);
  assert.equal(latency.reduce((s,r)=>s+r.ms,0),800);
  assert.equal(publicPlan().scope,'planning_only_no_hardware_results');
  assert.match(bomCSV(),/152950/);assert.match(bomCSV(),/219650/);
});
test('first-phase baseline includes two trajectory, two direct spin, lighting, raw radar and sync',()=>{
  for(const stage of ['poc','bullpen']){
    const nodes=getNodes(stage,false);
    assert.equal(nodes.filter(n=>n.type==='camera').length,2);
    assert.equal(nodes.filter(n=>n.type==='spin'&&n.required).length,2);
    assert.equal(nodes.filter(n=>n.type==='light').length,2);
    for(const type of ['radar24','edge','sync'])assert.equal(nodes.filter(n=>n.type===type).length,1);
    assert.equal(nodes.some(n=>['fpga','radar60'].includes(n.type)),false);
    assert.deepEqual(nodes,getNodes(stage,true),'focus mode must not remove or move necessary sensors');
  }
});
test('optional research nodes do not replace baseline sensors and stay outside activity area',()=>{
  for(const stage of ['poc','bullpen','pilot','full'])for(const fpga of [false,true])for(const radar60 of [false,true]){
    const nodes=getNodes(stage,false,{fpga,radar60}),base=getNodes(stage),poly=activityBoundary(stage);
    assert.equal(nodes.length,base.length+Number(fpga)+Number(radar60));
    assert.equal(nodes.filter(n=>n.type==='spin').length,2);
    for(const n of nodes){assert.ok(n.model);assert.ok(n.raw);for(let i=0;i<=10;i++){
      const p=[n.pos[0]+(n.anchor[0]-n.pos[0])*i/10,n.pos[2]+(n.anchor[2]-n.pos[2])*i/10];
      assert.equal(insidePolygon(p,poly),false,`${stage}/${n.id}`);assert.ok(boundaryDistance(p,poly)>.65,`${stage}/${n.id}`);
    }}
  }
});
test('optics example reproduces physical FOV, ball pixels, blur and dwell from v3 plan',()=>{
  const o=opticsEstimate();
  assert.ok(Math.abs(o.fovM-.59616)<1e-8);assert.ok(Math.abs(o.ballPx-88.16425)<.0001);
  assert.ok(Math.abs(o.frames-5.6581)<.0001);assert.ok(Math.abs(o.framesPerRev-10.44)<1e-8);
  assert.ok(o.warnings.some(s=>s.includes('少於8')));
  assert.ok(o.conservativeBlurPx>=o.blurPx);
});
test('ROI is a crop, not magnification; focal length trades resolution against dwell',()=>{
  const full=opticsEstimate(),roi=opticsEstimate({width:320,fps:997}),long=opticsEstimate({focalMm:50});
  assert.ok(Math.abs(full.ballPx-roi.ballPx)<1e-8);assert.ok(roi.frames<full.frames);
  assert.ok(Math.abs(long.ballPx-full.ballPx*2)<1e-8);assert.ok(Math.abs(long.frames-full.frames/2)<1e-8);
  assert.equal(opticsEstimate({transverseFactor:0}).frames,null);
  for(const bad of [{distanceM:0},{focalMm:-1},{rpm:NaN},{transverseFactor:2}])assert.throws(()=>opticsEstimate(bad),RangeError);
});
test('scene/world mapping round trips vectors, and field spin geometry triggers visibility risk',()=>{
  for(const v of [[1,2,3],[0,16,1.7],[-.5,0,1]])assert.deepEqual(toWorld(toScene(v)).map(x=>x+0),v);
  for(const a of Object.values(syntheticAxes))assert.ok(Math.abs(Math.hypot(...a)-1)<1e-10);
  const s=getNodes('full').find(n=>n.id==='cam-c');
  const est=opticsEstimate({...observationGeometry(s),focalMm:s.focalMm});
  assert.ok(est.ballPx<80);assert.ok(est.warnings.length);
});
test('visual spin is synthetic while direct measurements and latency stay null',()=>{
  const r=makeRecord(makePitch('FF'),'poc',1);
  assert.equal(r.plan_version,PLAN.version);assert.equal(r.synthetic_spin.measurement,false);
  assert.equal(r.synthetic_spin.source,'synthetic-preset');assert.equal(r.metrics.spin_axis,null);
  assert.equal(r.measurements.spin_axis_world,null);assert.equal(r.measurements.spin_rpm,null);
  assert.equal(r.measurements.sample_to_visible_ms,null);assert.equal(r.measurements.validity,'not-connected');
  assert.equal(r.measurement_requirements.direct_spin_phase_one,true);
  assert.equal(r.world_trajectory.samples.length,r.trajectory.samples.length);
  assert.deepEqual(r.world_trajectory.samples[0].position_m,toWorld(r.trajectory.samples[0].position_m));
});

test('purchase prices keep quantity, annual fees and multi-year arithmetic explicit',()=>{
  const expected={'pro2-pitch':[199200,232400,295200,328400],'pro2-combo':[234400,270800,330400,366800],pro3:[375200,424400,471200,520400],x3b:[604864,666048,668544,729728]};
  for(const p of purchaseProducts.filter(p=>p.hardwareUsd!==null)){
    const e=purchaseEstimate(p);
    assert.deepEqual([e.firstYearLow,e.firstYearHigh,e.threeYearLow,e.threeYearHigh],expected[p.id]);
    assert.equal(e.annualTwd,p.annualUsd*32);assert.equal(e.complete,false);
  }
  assert.equal(purchaseAssumptions.fx,32);assert.equal(priceAudit.length,3);
  assert.throws(()=>purchaseEstimate(purchaseProducts[1],0),RangeError);
});
test('unknown B1 hardware and API costs are never converted to free or a turnkey total',()=>{
  const p=purchaseProducts.find(p=>p.id==='b1'),e=purchaseEstimate(p);
  for(const k of ['hardwareTwd','annualTwd','firstYearLow','firstYearHigh','threeYearLow','threeYearHigh'])assert.equal(e[k],null);
  assert.equal(p.subscriptionReferenceUsd,2500);assert.equal(p.annualUsd,null);
  const data=variantPlan('buy');assert.equal(data.allRequirementsVerified,false);assert.equal(data.sample_to_visible_measured_ms,null);
  assert.equal(data.products[0].estimate.firstYearLow,null);assert.ok(data.excludedCosts.includes('integration_NRE'));
  const csv=purchaseCSV();assert.equal(csv.charCodeAt(0),0xfeff);assert.equal(csv.split('\r\n').length,6);assert.match(csv,/待報價/);
});
test('legacy and variant-specific deep links preserve separate modes',()=>{
  assert.deepEqual(parsePlanHash('#poc/plan'),{variant:'build',stage:'poc',panel:'plan'});
  assert.deepEqual(parsePlanHash('#buy/bullpen/flow'),{variant:'buy',stage:'bullpen',panel:'flow'});
  assert.deepEqual(parsePlanHash('#build/full/spin'),{variant:'build',stage:'full',panel:'spin'});
  assert.deepEqual(parsePlanHash('#buy/bad/bad'),{variant:'buy',stage:'poc',panel:'nodes'});
  assert.equal(variantPlan().solution_variant,'build');assert.equal(variantPlan('buy').solution_variant,'buy');
  assert.throws(()=>variantPlan('free'),RangeError);
});
test('purchase concept stays outside the activity area without placing Rapsodo between players',()=>{
  for(const stage of ['poc','bullpen','pilot','full']){
    const nodes=getPurchaseNodes(stage),poly=activityBoundary(stage);
    assert.equal(nodes.length,2);assert.equal(nodes.filter(n=>n.type==='vendor').length,1);
    for(const n of nodes)for(let i=0;i<=10;i++){
      const p=[n.pos[0]+(n.anchor[0]-n.pos[0])*i/10,n.pos[2]+(n.anchor[2]-n.pos[2])*i/10];
      assert.equal(insidePolygon(p,poly),false);assert.ok(boundaryDistance(p,poly)>.65);
    }
  }
  assert.throws(()=>getPurchaseNodes('invalid'),RangeError);
});
test('buy-mode recordings remain synthetic and do not claim raw or measured rotation',()=>{
  const r=makeRecord(makePitch('SL'),'poc',1,'buy');
  assert.equal(r.solution_variant,'buy');assert.equal(r.source,'synthetic');
  assert.equal(r.measurements.spin_axis_world,null);assert.equal(r.measurements.sample_to_visible_ms,null);
  assert.equal(r.measurement_requirements.direct_spin_phase_one,true);assert.deepEqual(r.acquisition.radar_iq,[]);
});
