// Procedurally generated fielding cases (v4.2 p.42): 6 plays × 121 time slices × 13 player states.
// Synthetic interaction/missing-value tests only — not a training set, real players or a validated reconstruction.
// World frame: x right, y toward pitcher, z up (m); origin = rear tip of home plate.
export const PLAYER_SCHEMA='bb-player-state/1.0-proposal',EVENT_SCHEMA='bb-event/1.0-proposal';
export const FRAMES=121,DT=.05;
export const SLOTS=['P','C','1B','2B','SS','3B','LF','CF','RF','BR','R1','R2','R3'];
export const slotNames={P:'投手',C:'捕手','1B':'一壘手','2B':'二壘手',SS:'游擊手','3B':'三壘手',LF:'左外野',CF:'中外野',RF:'右外野',BR:'打者跑者',R1:'一壘跑者',R2:'二壘跑者',R3:'三壘跑者'};
const B={home:[0,0],first:[19.4,19.4],second:[0,38.8],third:[-19.4,19.4]};
const START={P:[0,18.44],C:[0,-1.2],'1B':[17,24],'2B':[8,36],SS:[-9,35],'3B':[-17,22],LF:[-28,75],CF:[0,90],RF:[28,75],BR:[-.9,0],R1:[17.5,21.5],R2:[-2.5,36.5],R3:[-18,17]};
const CONTACT=.45,RELEASE=[.3,16.8,1.8],PLATE=[0,.3,.85];

// Piecewise-linear keyframes [[t,[x,y]],...]
function along(keys,t){
  if(t<=keys[0][0])return keys[0][1];
  for(let i=1;i<keys.length;i++){const [t1,p1]=keys[i],[t0,p0]=keys[i-1];if(t<=t1){const u=(t-t0)/(t1-t0);return p0.map((v,k)=>v+(p1[k]-v)*u)}}
  return keys.at(-1)[1];
}
// Ball segments: line, projectile arc (g=9.81, no drag — synthetic), or carried by a player.
function ballAt(segments,t,playerAt){
  for(const s of segments){
    if(t<s.t0||t>s.t1)continue;const T=s.t1-s.t0,tau=t-s.t0,u=T?tau/T:0;
    if(s.type==='carry'){const [x,y]=playerAt(s.slot,t);return [x,y,1.3]}
    const p=s.from.map((v,i)=>v+(s.to[i]-v)*u);if(s.type==='arc')p[2]+=4.905*tau*(T-tau);return p;
  }
  return null;
}
const pitch={t0:0,t1:CONTACT,type:'line',from:RELEASE,to:PLATE};
const hold=slots=>Object.fromEntries(slots.map(s=>[s,[[0,START[s]]]]));

export const SCENARIOS = [
  {id:'fly-catch',name:'飛球接殺',desc:'中外野手追到左中間飛球接殺；一壘跑者回壘。',runners:['R1'],outcomeT:4.6,outcome:'out',
    paths:{...hold(['P','C','1B','2B','SS','3B','LF','RF']),CF:[[0,START.CF],[.9,START.CF],[4.45,[6,84]],[6,[4,82]]],
      BR:[[0,START.BR],[.75,START.BR],[3.2,[12,12]],[6,[9,9]]],R1:[[0,START.R1],[.5,[20.5,23.5]],[4.6,[22,25]],[6,[19.4,19.6]]]},
    ball:[pitch,{t0:CONTACT,t1:4.6,type:'arc',from:[0,.5,1],to:[6,84,1.5]},{t0:4.6,t1:5.2,type:'carry',slot:'CF'},{t0:5.2,t1:6,type:'arc',from:[5,83,1.8],to:[-2,45,1.6]}],
    predicted:[6,84],opportunity:{slot:'CF',p:.62,y:1},
    events:[['pitch',0,['P']],['contact',CONTACT,['BR']],['flight',.5,[]],['catch_candidate',4.6,['CF']],['possession_confirmed',4.8,['CF']],['out',4.8,['CF'],'provisional'],['throw',5.2,['CF']]]},
  {id:'fly-drop',name:'飛球漏接',desc:'右外野手追到落點但漏接，球彈地後再撿起回傳二壘。',runners:[],outcomeT:4.2,outcome:'hit',
    paths:{...hold(['P','C','1B','2B','SS','3B','LF','CF']),RF:[[0,START.RF],[.8,START.RF],[4.2,[36.5,70.5]],[5.3,[41.5,77.5]],[6,[41,77]]],
      BR:[[0,START.BR],[.7,START.BR],[3.9,[19.4,19.4]],[6,[14,31]]]},
    ball:[pitch,{t0:CONTACT,t1:4.2,type:'arc',from:[0,.5,1],to:[38,70,0]},{t0:4.2,t1:5.3,type:'arc',from:[38,70,0],to:[42,78,0]},{t0:5.3,t1:5.5,type:'carry',slot:'RF'},{t0:5.5,t1:6,type:'arc',from:[41,77,1.8],to:[20,57,1.8]}],
    predicted:[38,70],opportunity:{slot:'RF',p:.78,y:0},
    events:[['pitch',0,['P']],['contact',CONTACT,['BR']],['flight',.5,[]],['catch_candidate',4.2,['RF'],'review'],['bounce',4.2,[]],['possession_confirmed',5.3,['RF']],['throw',5.5,['RF']]]},
  {id:'grounder-throw',name:'滾地接傳',desc:'游擊手接滾地球傳一壘，打者跑者出局（守備動作≠正式判決）。',runners:[],outcomeT:2.7,outcome:'out',
    paths:{...hold(['P','C','2B','3B','LF','CF','RF']),SS:[[0,START.SS],[.6,START.SS],[1.5,[-8.6,33.2]],[6,[-8.6,33.2]]],'1B':[[0,START['1B']],[.7,START['1B']],[1.9,[19,20.3]],[6,[19,20.3]]],
      BR:[[0,START.BR],[.75,START.BR],[4.3,[19.4,19.4]],[6,[24,24]]]},
    ball:[pitch,{t0:CONTACT,t1:1.6,type:'line',from:[0,.5,.2],to:[-9,33,.1]},{t0:1.6,t1:2.1,type:'carry',slot:'SS'},{t0:2.1,t1:2.7,type:'line',from:[-8.6,33.2,1.8],to:[19,20.3,1.3]},{t0:2.7,t1:6,type:'carry',slot:'1B'}],
    predicted:[-9,33],opportunity:{slot:'SS',p:.91,y:1},
    events:[['pitch',0,['P']],['contact',CONTACT,['BR']],['ground_ball',.5,[]],['catch_candidate',1.6,['SS']],['possession_confirmed',1.7,['SS']],['throw',2.1,['SS']],['reception',2.7,['1B']],['out',2.7,['1B','BR'],'provisional']]},
  {id:'runner-safe',name:'跑者Safe',desc:'三壘手衝前處理軟弱滾地球，傳一壘晚到；差距小於不確定度 → review。',runners:['R2'],outcomeT:3.95,outcome:'safe',
    paths:{...hold(['P','C','2B','SS','LF','CF','RF']),'3B':[[0,START['3B']],[.6,START['3B']],[2.1,[-14,15]],[6,[-14,15]]],'1B':[[0,START['1B']],[.8,START['1B']],[2,[19,20.3]],[6,[19,20.3]]],
      BR:[[0,START.BR],[.6,START.BR],[3.9,[19.4,19.4]],[6,[24.5,24.5]]],R2:[[0,START.R2],[.5,START.R2],[3.4,[-19.4,19.4]],[6,[-19.4,19.4]]]},
    ball:[pitch,{t0:CONTACT,t1:2.2,type:'line',from:[0,.5,.1],to:[-14,14,.05]},{t0:2.2,t1:2.4,type:'line',from:[-14,14,.05],to:[-14,14.6,.05]},{t0:2.4,t1:3.3,type:'carry',slot:'3B'},{t0:3.3,t1:4,type:'line',from:[-14,15,1.7],to:[19,20.3,1.3]},{t0:4,t1:6,type:'carry',slot:'1B'}],
    predicted:[-14,14],opportunity:{slot:'3B',p:.55,y:0},
    events:[['pitch',0,['P']],['contact',CONTACT,['BR']],['ground_ball',.5,[]],['catch_candidate',2.2,['3B'],'review'],['possession_confirmed',2.4,['3B']],['throw',3.3,['3B']],['safe',3.95,['BR'],'review'],['reception',4,['1B']]]},
  {id:'id-ambiguity',name:'ID錯配待覆核',desc:'左外野與中外野外觀相近、交叉跑位；系統保留兩條移動軌跡，但身分標為待覆核，不自動補名。',runners:[],outcomeT:4.8,outcome:'out',ambiguity:{slots:['LF','CF'],radiusM:4},
    paths:{...hold(['P','C','1B','2B','SS','3B','RF']),LF:[[0,START.LF],[.8,START.LF],[4.7,[-13,89]],[6,[-10,90]]],CF:[[0,START.CF],[.8,START.CF],[4.6,[-17,85]],[6,[-20,82]]],
      BR:[[0,START.BR],[.75,START.BR],[3.4,[13,13]],[6,[10,10]]]},
    ball:[pitch,{t0:CONTACT,t1:4.8,type:'arc',from:[0,.5,1],to:[-14,88,1.5]},{t0:4.8,t1:6,type:'carry',slot:'LF'}],
    predicted:[-14,88],opportunity:{slot:'LF',p:.7,y:1,assignment:'ambiguous'},
    events:[['pitch',0,['P']],['contact',CONTACT,['BR']],['flight',.5,[]],['catch_candidate',4.8,['LF'],'review'],['possession_confirmed',5,['LF'],'review']]},
  {id:'occlusion',name:'遮擋缺段',desc:'二壘跑者穿越視線，游擊手與球在1.25–2.2秒缺觀測；不以內插補成實測點。',runners:['R2'],outcomeT:3,outcome:'out',occlusion:{slots:['SS'],t:[1.25,2.2],ball:true},
    paths:{...hold(['P','C','2B','3B','LF','CF','RF']),SS:[[0,START.SS],[.6,START.SS],[1.6,[-7,31.5]],[6,[-7,31.5]]],'1B':[[0,START['1B']],[.7,START['1B']],[1.9,[19,20.3]],[6,[19,20.3]]],
      BR:[[0,START.BR],[.75,START.BR],[4.3,[19.4,19.4]],[6,[24,24]]],R2:[[0,START.R2],[.5,START.R2],[3,[-19.4,19.4]],[6,[-19.4,19.4]]]},
    ball:[pitch,{t0:CONTACT,t1:1.7,type:'line',from:[0,.5,.2],to:[-7,31,.1]},{t0:1.7,t1:2.4,type:'carry',slot:'SS'},{t0:2.4,t1:3,type:'line',from:[-7,31.5,1.8],to:[19,20.3,1.3]},{t0:3,t1:6,type:'carry',slot:'1B'}],
    predicted:[-7,31],opportunity:{slot:'SS',p:.88,y:1},
    events:[['pitch',0,['P']],['contact',CONTACT,['BR']],['ground_ball',.5,[]],['catch_candidate',1.7,['SS'],'review'],['possession_confirmed',2.3,['SS'],'review'],['throw',2.4,['SS']],['reception',3,['1B']],['out',3,['1B','BR'],'provisional']]},
];
const ns=t=>String(Math.round(t*1000))+'000000';
const trackId=slot=>'gt-'+String(SLOTS.indexOf(slot)+1).padStart(2,'0');
const role=slot=>slot==='BR'||slot.startsWith('R')?'runner':'fielder';
const cameras=([,y])=>y<45?['F01','F02','F03','F04']:['F03','F04','F05','F06'];

export function buildScenario(def){
  const present=s=>!s.startsWith('R')||def.runners.includes(s);
  const playerAt=(slot,t)=>along(def.paths[slot],t);
  const ambiguousFrom=def.ambiguity?Array.from({length:FRAMES},(_,i)=>i*DT).find(t=>{const [a,b]=def.ambiguity.slots.map(s=>playerAt(s,t));return Math.hypot(a[0]-b[0],a[1]-b[1])<def.ambiguity.radiusM}):null;
  const occluded=(slot,t)=>def.occlusion&&def.occlusion.slots.includes(slot)&&t>=def.occlusion.t[0]&&t<=def.occlusion.t[1];
  const frames=Array.from({length:FRAMES},(_,i)=>{
    const t=+(i*DT).toFixed(3),ballOccluded=def.occlusion?.ball&&t>=def.occlusion.t[0]&&t<=def.occlusion.t[1],b=ballAt(def.ball,t,playerAt);
    const players=SLOTS.map(slot=>{
      const base={source:'synthetic',session_id:`syn-${def.id}`,frame_id:i,slot,role:role(slot),global_track_id:trackId(slot),player_id:`SYN-${slot}`,
        t_support_start_ns:ns(Math.max(0,t-DT)),t_support_end_ns:ns(t),clock_id:'synthetic-clock',coordinate_frame:'world-home-rear-tip-m',position_definition:'ground_anchor',
        covariance_m2:null,calibration_id:null,algorithm_version:'synthetic-generator-1',identity_confidence:1,reason_codes:[],revision:0,on_field:present(slot)};
      if(!present(slot))return {...base,player_id:null,global_track_id:null,position_world_m:null,velocity_mps:null,camera_ids:[],validity:'not-on-field',identity_confidence:null};
      const p=playerAt(slot,t),q=playerAt(slot,Math.max(0,t-DT)),v=t?[(p[0]-q[0])/DT,(p[1]-q[1])/DT,0]:[0,0,0];
      const state={...base,position_world_m:[+p[0].toFixed(3),+p[1].toFixed(3),0],velocity_mps:v.map(x=>+x.toFixed(3)),camera_ids:cameras(p),validity:'valid'};
      if(occluded(slot,t))return {...state,position_world_m:null,velocity_mps:null,validity:'occluded',reason_codes:['OCCLUDED_BY_RUNNER']};
      if(ambiguousFrom!==null&&def.ambiguity.slots.includes(slot)&&t>=ambiguousFrom){
        const [a,b2]=def.ambiguity.slots.map(s=>playerAt(s,t)),crossing=Math.hypot(a[0]-b2[0],a[1]-b2[1])<def.ambiguity.radiusM;
        return {...state,player_id:null,identity_confidence:.5,validity:crossing?'ambiguous':'valid',reason_codes:['ID_AMBIGUOUS_NEEDS_REVIEW','SAME_TEAM_APPEARANCE']};
      }
      return state;
    });
    return {frame_id:i,t_s:t,t_ns:ns(t),ball:{track_id:`ball-${def.id}`,position_world_m:ballOccluded||!b?null:b.map(x=>+x.toFixed(3)),validity:ballOccluded?'occluded':b?'valid':'no-observation',value_origin:'synthetic'},players};
  });
  const events=def.events.map(([type,t,slots,status='confirmed'],k)=>({event_id:`${def.id}-e${k+1}`,play_id:def.id,type,t_event_ns:ns(t),t_s:t,
    actor_ids:slots.map(s=>ambiguousFrom!==null&&def.ambiguity.slots.includes(s)&&t>=ambiguousFrom?trackId(s):`SYN-${s}`),ball_track_id:`ball-${def.id}`,
    status,evidence_refs:[],parent_event_ids:k?[`${def.id}-e${k}`]:[],confidence:null,revision:0,source:'synthetic'}));
  const o=def.opportunity;
  return {id:def.id,name:def.name,desc:def.desc,schema_version:PLAYER_SCHEMA,event_schema:EVENT_SCHEMA,source:'synthetic',frame_count:FRAMES,dt_s:DT,
    contact_t_s:CONTACT,outcome_t_s:def.outcomeT,outcome:def.outcome,predicted_landing_world_m:def.predicted,
    illustrative_opportunity:{fielder_slot:o.slot,assignment:o.assignment??'single',p:o.p,y:o.y,contribution:+(o.y-o.p).toFixed(3),
      label:'illustrative_not_trained',measured:false,available_after_t_s:def.outcomeT},
    measurements:{oaa_like:null,catch_prob:null,sample_to_visible_ms:null},frames,events};
}
export const fieldingScenarios=SCENARIOS.map(buildScenario);

// Before the outcome happens only a sourced prediction may be shown.
export function outcomeView(sc,t){
  const known=t>=sc.outcome_t_s;
  return {known,status:known?sc.outcome:'pending',landing:{position_world_m:sc.predicted_landing_world_m,value_origin:known?'synthetic':'predicted'},
    opportunity:known?sc.illustrative_opportunity:null};
}
export const eventsUntil=(sc,t)=>sc.events.filter(e=>e.t_s<=t+1e-9);

// Fault injection for D09: degrade quality and hide values; never fabricate replacements.
export const FAULTS={none:'無',offline:'F05節點斷線',stale:'資料過期（>800ms）',drop:'丟幀'};
export function applyFault(frame,fault='none'){
  if(fault==='none')return frame;
  const f=structuredClone(frame);
  if(fault==='drop'&&frame.frame_id%4===2){
    f.ball={...f.ball,position_world_m:null,validity:'dropped'};
    for(const p of f.players)if(p.on_field)Object.assign(p,{position_world_m:null,velocity_mps:null,validity:'dropped',reason_codes:[...p.reason_codes,'FRAME_DROPPED']});
  }
  if(fault==='stale'){
    f.simulated_age_ms=1200;f.deadline_miss=true;f.ball={...f.ball,position_world_m:null,validity:'stale'};
    for(const p of f.players)if(p.on_field)Object.assign(p,{position_world_m:null,velocity_mps:null,validity:'stale',reason_codes:[...p.reason_codes,'DEADLINE_MISS']});
  }
  if(fault==='offline')for(const p of f.players)if(p.camera_ids.includes('F05')){
    p.camera_ids=p.camera_ids.filter(c=>c!=='F05');p.reason_codes=[...p.reason_codes,'NODE_OFFLINE:F05'];if(p.validity==='valid')p.validity='degraded';
  }
  f.fault=fault;f.measured_latency_ms=null;return f;
}
export function syntheticFieldingPackage(){
  return {schema_version:'synthetic-fielding/1.0',source:'synthetic',generated_by:'src/fielding.js',
    note:'程序合成案例；不是守備模型訓練集、真實球員資料或經物理驗證的比賽重建。player_id為合成名冊代號。',
    coordinate_frame:'world x right, y toward pitcher, z up; m; origin rear tip of home plate',scenarios:fieldingScenarios};
}
