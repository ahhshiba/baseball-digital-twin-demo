// v4.2 data package, generated from the same modules the page renders (single source of truth).
import { PLAN } from './plan.js';
import { FULLFIELD, capabilityGroups, hardGates, fieldStations, stationTiers, cameraCount, cameraTotal, fullFieldBom, fullFieldTotals,
  millionAllocation, millionPrerequisites, unpricedGaps, localPackTotals, nreWorkPackages, nreAssumptions, nreTotals, operationsEstimate,
  schedule, fullFieldAcceptance, fullFieldLatency, scoreContract } from './fullfield.js';
import { metricsCatalog, definitionAmbiguities } from './metrics-catalog.js';
import { claimAudit, statcastHistory, auditSources } from './claim-audit.js';
import { syntheticPitchPackage } from './pitch.js';
import { syntheticFieldingPackage } from './fielding.js';
import { toScene } from './optics.js';

export const requirements = () => ({schema_version:'requirements/4.2',report_version:FULLFIELD.version,date:FULLFIELD.date,goal:FULLFIELD.goal,
  superseded:[FULLFIELD.supersedes,'80ms／一般1秒 → 取樣到畫面≤0.8秒','第一期先不做旋轉 → 一期直接量測必驗','10萬必可全新購足 → 借用條件案','100萬全場／正式ABS → 僅總硬體分配目標'],
  frozen:{direct_spin_phase_one:{plain_unmarked_ball:true,rpm:true,signed_3d_axis:true},sample_to_visible_ms_max:PLAN.latencyMs,
    no_equipment_in_activity_area:true,player_height:'已建檔，來源／量測方法版本化',player_weight:'不收集',unmeasured_value:null},
  hard_gates:hardGates.map(g=>({...g,status:'pending'})),contract:{id:FULLFIELD.contract,target_score:FULLFIELD.targetScore,actual_score:null,groups:capabilityGroups},
  precedence:['本報告需求凍結','資料包 requirements','最新價格查核','既有網站','舊文件']});

export const fullfieldPlan = () => ({schema_version:'fullfield-plan/4.2',price_basis:'engineering_allowance_not_quote',currency:'TWD',
  camera_count:{...cameraCount,total:cameraTotal()},bom:fullFieldBom,totals:fullFieldTotals(),million_cap:{allocation:millionAllocation,prerequisites:millionPrerequisites},
  unpriced_gaps:unpricedGaps,local_packs:localPackTotals(),nre:{work_packages:nreWorkPackages,assumptions:nreAssumptions,totals:nreTotals()},
  operations:operationsEstimate(),schedule,acceptance:fullFieldAcceptance,latency_budget_ms:fullFieldLatency,verified:false});

export const fullfieldPlacements = () => ({schema_version:'fullfield-placements/4.2',surveyed:false,coverage_proven:false,
  note:'F01–F08為球員視角概念站；舊v3.1 placements保留追溯，不與F01–F08重複採購。遠球補盲2–4機位置未定。',
  frames:{world:'x right, y toward pitcher, z up; m',scene:'world[x,y,z] → scene[x,z,−y]'},
  stations:fieldStations.map(s=>({...s,tier_label:stationTiers[s.tier],scene:toScene(s.world)}))});

export function benchmarkCSV(){
  const r=scoreContract(),rows=[['group_id','name','weight','phase','must_pass','status','evidence_id','reference_id','sample_count','confidence_interval','passed'],
    ...r.rows.map(g=>[g.id,g.name,g.weight,g.phase,g.mustPass,'pending','','','','',g.passed]),
    ['TOTAL','full-field-v1',100,'','','actual_score=null','','','','',r.verifiedScore]];
  return '﻿'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
export const claimAuditJSON = () => ({schema_version:'statcast-claim-audit/4.2',checked:'2026-09-29',claims:claimAudit,history:statcastHistory,sources:auditSources});
export const metricsCatalogJSON = () => ({schema_version:'metrics-catalog/4.2',count:metricsCatalog.length,measured_count:0,metrics:metricsCatalog,ambiguities:definitionAmbiguities});

export const DATA_FILES = {
  'requirements.json':()=>JSON.stringify(requirements(),null,2),
  'fullfield_plan.json':()=>JSON.stringify(fullfieldPlan(),null,2),
  'fullfield_placements.json':()=>JSON.stringify(fullfieldPlacements(),null,2),
  'fullfield_benchmark.csv':benchmarkCSV,
  'metrics_catalog.json':()=>JSON.stringify(metricsCatalogJSON(),null,2),
  'statcast_claim_audit.json':()=>JSON.stringify(claimAuditJSON(),null,2),
  'synthetic_pitches.json':()=>JSON.stringify(syntheticPitchPackage()),
  'synthetic_fielding.json':()=>JSON.stringify(syntheticFieldingPackage()),
};
export const mimeFor = name => name.endsWith('.csv')?'text/csv;charset=utf-8':'application/json';
