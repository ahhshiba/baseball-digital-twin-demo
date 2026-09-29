// v4.2 full-field overlay (handoff report 2026-09-29). Planning data only:
// engineering allowances, proposed contracts and synthetic examples — never measured results.
import { toScene } from './optics.js';

export const FULLFIELD = Object.freeze({version:'4.2', date:'2026-09-29', contract:'full-field-v1', targetScore:85,
  actualScore:null, statcastComparablePerformance:null, supersedes:'v4.1 training-core 84分主目標（已撤回）',
  goal:'全場整體能力：投打、全場球員身分／軌跡、守備事件、OAA-like與跑壘；牛棚只是中繼站'});

// full-field-v1 proposal. Weights must be frozen with the club before testing; never re-weighted after results.
export const capabilityGroups = [
  {id:'pitch_track',name:'投球速度／3D球路／釋球',weight:12,phase:'P1→F2',mustPass:true},
  {id:'direct_spin',name:'普通球直接rpm／三維有向軸',weight:10,phase:'P1→F2',mustPass:true},
  {id:'batted_ball',name:'擊球EV／LA／全程球路與落點',weight:12,phase:'F1→F2',mustPass:true},
  {id:'player_identity',name:'全場球員身分與連續軌跡',weight:18,phase:'F1→F2',mustPass:true},
  {id:'fielding_oaa',name:'守備事件／機會模型／OAA-like',weight:16,phase:'F2',mustPass:true},
  {id:'baserunning',name:'跑壘速度／路徑／壘間事件',weight:6,phase:'F1→F2',mustPass:true},
  {id:'skeleton',name:'全場指定骨架子集研究',weight:5,phase:'F2+',mustPass:false},
  {id:'bat_tracking',name:'球棒軌跡／接觸品質研究',weight:5,phase:'F2+',mustPass:false},
  {id:'abs_training',name:'訓練ABS與邊界審查',weight:4,phase:'P1→F2',mustPass:false},
  {id:'sync_latency',name:'全場同步／800ms／可靠度',weight:8,phase:'F2',mustPass:true},
  {id:'twin_data',name:'孿生／Dashboard／回放與資料權',weight:4,phase:'F1→F2',mustPass:false},
];
export const hardGates = [
  {id:'plain_ball_direct_axis',name:'普通未標記球直接rpm＋三維有向軸'},
  {id:'sample_to_visible_800ms',name:'取樣→本地畫面 ≤800ms（含支持窗、傳輸、渲染）'},
  {id:'field_clearance',name:'場內與界外活動區無突出設備'},
  {id:'data_rights',name:'影像／球員／商用資料權利'},
];
const EVIDENCE_FIELDS=['evidence_id','reference_id','scenario','sample_count','confidence_interval'];
// A group passes only with complete, non-synthetic evidence. Unknown or synthetic never counts.
export function evidenceCounts(e){return Boolean(e&&e.pass===true&&e.source!=='synthetic'&&EVIDENCE_FIELDS.every(k=>e[k]!==null&&e[k]!==undefined&&e[k]!==''))}
export function scoreContract(evidence={},gates={}){
  const rows=capabilityGroups.map(g=>({...g,passed:evidenceCounts(evidence[g.id])}));
  const anyEvidence=rows.some(r=>r.passed);
  const score=rows.reduce((s,r)=>s+(r.passed?r.weight:0),0);
  const mustPassOk=rows.filter(r=>r.mustPass).every(r=>r.passed);
  const gatesOk=hardGates.every(g=>gates[g.id]===true);
  return {rows,verifiedScore:score,actualScore:anyEvidence?score:null,mustPassOk,gatesOk,
    accepted:score>=FULLFIELD.targetScore&&mustPassOk&&gatesOk,statcastComparable:null};
}

// The four "80%" readings that must not be mixed (report p.8).
export const eightyPercentKinds = [
  ['功能覆蓋80%','事先凍結用例、權重及每個用例的測試；不是湊欄位數。'],
  ['精度接近80%','同球、同時間／座標、同誤差統計與參考真值；不同指標不能直接平均。'],
  ['全場覆蓋80%','場地／速度／光照／遮擋包絡下的有效追蹤率與漏失分布。'],
  ['展示相似80%','UI／動畫相似只能算展示，不能當感測技術成果。'],
];
// q = min(1, E_ref / E_ours). Only meaningful when both errors are comparable.
export const precisionScore=(eRef,eOurs)=>Math.min(1,eRef/eOurs);
export const errorForScore=(eRef,q)=>eRef/q;

// Candidate full-field player stations F01–F08, world [x right, y toward pitcher, z up] m. Not surveyed.
const station=(id,world,targetWorld,tier)=>({id,world,targetWorld,tier});
export const fieldStations = [
  station('F01',[-12,-10,10],[0,28,1],'research6'),station('F02',[12,-10,10],[0,28,1],'research6'),
  station('F03',[-60,30,12],[18,58,1],'research6'),station('F04',[60,30,12],[-18,58,1],'research6'),
  station('F05',[-90,85,14],[-5,88,1],'research6'),station('F06',[90,85,14],[5,88,1],'research6'),
  station('F07',[-40,120,14],[0,45,1],'addon'),station('F08',[40,120,14],[0,45,1],'addon'),
];
export const stationTiers = {research6:'六機研究起步',addon:'追加候選（6機不足時）'};
export const playerCameraCandidates = [
  {model:'Basler a2A2048-114g5cBAS',mp:3.2,sensor:'IMX900 · 2064×1552 · global shutter',fps:'預設94.6fps（8-bit設定115fps）',usd:659,source:'graftek3'},
  {model:'Basler a2A2448-105g5cBAS',mp:5,sensor:'IMX547 · 2448×2048 · global shutter',fps:'預設106.9fps',usd:1119,source:'graftek5'},
];
export function stationNodes(){
  return fieldStations.map(s=>{
    const pos=toScene(s.world),h=Math.hypot(pos[0],pos[2]),out=.6/h;
    return {id:s.id.toLowerCase(),station:s.id,name:`${s.id}｜全場球員${s.tier==='addon'?'追加':'研究'}`,type:'player',tier:s.tier,
      pos,anchor:[pos[0]*(1+out),pos[1],pos[2]*(1+out)],target:toScene(s.targetWorld),world:s.world,required:s.tier==='research6',
      model:'3.2MP a2A2048-114g5cBAS 或 5MP a2A2448-105g5cBAS（借測候選，未選定）',
      purpose:'高處廣角看全場球員，追蹤每位球員的位置與身分（不負責看清小球）。',
      role:'球員位置／跨鏡身分候選視角；看得見人不等於追得準球（60m寬、2448px時棒球約3px）。',
      raw:'彩色影像、曝光戳、frame_id／丟幀計數、內外參；人物框、腳點、球衣特徵獨立保存',
      lens:'鏡頭預留 NT$8,000–15,000；逐區FOV、低照、像素重算',power:'5GigE／GVSP；12–24V I/O供電，非PoE，不可硬接PoE',
      cost:'機身預留 NT$25,000–50,000（Graftek裸機 USD659／1,119 ×32 = 21,088／35,808）',
      place:`高度 ${s.world[2]}m 候選站｜概念活動區外，結構與載重待場勘`,mountKind:'structure',source:'baslerFF'};
  });
}
// Ground sampling: horizontal pixels a small object occupies across a scene width W.
export const pixelsAcross=(pixels,objectM,sceneWidthM)=>pixels*objectM/sceneWidthM;
export const cameraCount = {pitch:[4,4],players:[6,8],batting:[2,2],farBall:[2,4]};
export const cameraTotal = ()=>Object.values(cameraCount).reduce(([a,b],[c,d])=>[a+c,b+d],[0,0]);

export const bullpenCumulative = 470000;
export const fullFieldBom = [
  {id:'FF-CAM',item:'全場球員彩色global-shutter相機',qty:[6,8],unit:[25000,50000],note:'3.2–5MP候選預留；需實拍、詢價，不含鏡頭'},
  {id:'FF-LENS',item:'球員相機鏡頭',qty:[6,8],unit:[8000,15000],note:'逐區FOV、低照及像素重算'},
  {id:'FF-BAT',item:'局部打擊雙機完整增量包',qty:[1,1],unit:[56000,88000],note:'含兩機、鏡頭、燈、防護、I/O；本列未含風險'},
  {id:'FF-FAR',item:'遠端小球補盲相機',qty:[2,4],unit:[30000,70000],note:'較高解析／ROI機種待試拍；非已選定型號'},
  {id:'FF-FARLENS',item:'遠端小球長焦鏡頭',qty:[2,4],unit:[10000,20000],note:'不能假設廣角球員相機即可辨識3px棒球'},
  {id:'FF-EDGE',item:'分區edge擷取／推論盒',qty:[2,3],unit:[45000,80000],note:'不含牛棚既有edge；GPU／NIC／散熱需壓測'},
  {id:'FF-CORE',item:'全場核心GPU主機',qty:[1,1],unit:[90000,150000],note:'既有研發PC仍保留；可借用抵減'},
  {id:'FF-NET',item:'交換、光模組、時鐘傳送與可拆光纖',qty:[1,1],unit:[80000,200000],note:'非挖溝、永久管道、私有5G價格'},
  {id:'FF-MOUNT',item:'結構支架、防水、配電、UPS／防突波',qty:[1,1],unit:[80000,200000],note:'現有安全結構可固定；結構改造另報'},
  {id:'FF-STORE',item:'NVMe、備份儲存與網路介面',qty:[1,1],unit:[80000,180000],note:'事件raw＋較低碼率全景；不是整季全raw'},
  {id:'FF-SYNC',item:'同步分配、校正治具、設備備品',qty:[1,1],unit:[60000,120000],note:'不含獨立自由飛行真值系統與人力'},
];
export function fullFieldTotals(){
  const low=fullFieldBom.reduce((s,r)=>s+r.qty[0]*r.unit[0],0),high=fullFieldBom.reduce((s,r)=>s+r.qty[1]*r.unit[1],0);
  const riskLow=Math.round(low*.2),riskHigh=Math.round(high*.2);
  const cumulativeLow=bullpenCumulative+low+riskLow,cumulativeHigh=bullpenCumulative+high+riskHigh;
  return {low,high,riskLow,riskHigh,cumulativeLow,cumulativeHigh,capGapLow:cumulativeLow-1000000,capGapHigh:cumulativeHigh-1000000};
}
// 100萬 cap: a research allocation that only holds if the club lends structure, power, GPU, NAS and references.
export const millionAllocation = [
  ['牛棚主線累計（含其原風險）',470000],['6台球員機身×25,000',150000],['6個鏡頭×7,000，低價／借用混合前提',42000],
  ['分區擷取盒增量（推論GPU須借用）',70000],['可拆網路／光纖配件',60000],['場外支架／防護／配電增量',60000],
  ['事件儲存增量（長存NAS須借用）',50000],['同步／校正增量',30000],['研究風險餘額',68000],
];
export const millionPrerequisites = '球團提供既有安全結構／升降作業、線路與電源、GPU、長存NAS、參考儀；不足的遠球／旋轉光學借測。借不到就停止宣稱100萬可完成全場80%，按缺口重報。';
export const unpricedGaps = [
  ['全場普通球直接rpm／軸光學改版','既有牛棚機移到場外32m後可觀測性未證實；可能需要新高速高解析、長焦與照明。'],
  ['獨立自由飛行參考儀','租借／球團借用／購買的費用及授權尚未確認。'],
  ['永久施工／結構改造','可拆光纖與既有結構假設不等於挖溝、架桿、拉電與安全認證全部含。'],
  ['API、正式ABS、量產RF／FPGA','屬授權或新產品工程，並非本次通用候選BOM。'],
  ['稅費及供貨調整','零件預留與正式到岸／發票金額不同，採購當次統一重算。'],
];
// Local batting / pose research packs (p.16): an intermediate milestone, never the full-field price.
export const localPacks = {batting:[56000,88000],pose:[45000,65000],risk:.2};
export function localPackTotals(){
  const r=v=>Math.round(v*(1+localPacks.risk)),bat=localPacks.batting.map(r),pose=localPacks.pose.map(r);
  return {batting:bat,pose,bullpenPlusBatting:bat.map(v=>bullpenCumulative+v),withPose:bat.map((v,i)=>bullpenCumulative+v+pose[i])};
}
export const nreWorkPackages = [
  ['CV／球路／跨鏡ID／機會模型',10,18,'資料集、模型、融合與不確定度、OAA-like校準'],
  ['服務／前端／資料工程',6,10,'連續球員與事件schema、回放、修訂、Dashboard／權限'],
  ['硬體整合／同步／部署',4,8,'多站擷取、光學驗證、網路、機構／熱與可維護性'],
  ['測試／標註／驗收',6,12,'場景標註、獨立真值、全流量與故障測試'],
];
export const nreAssumptions = {existingManMonths:[9,14],costPerManMonth:[100000,160000],externalValidation:[200000,600000],overhead:1.2};
export function nreTotals(){
  const a=nreAssumptions,newMM=[nreWorkPackages.reduce((s,r)=>s+r[1],0),nreWorkPackages.reduce((s,r)=>s+r[2],0)];
  const mm=[newMM[0]+a.existingManMonths[0],newMM[1]+a.existingManMonths[1]];
  const low=Math.round((mm[0]*a.costPerManMonth[0]+a.externalValidation[0])*a.overhead),high=Math.round((mm[1]*a.costPerManMonth[1]+a.externalValidation[1])*a.overhead);
  const hw=fullFieldTotals();
  return {newManMonths:newMM,manMonths:mm,low,high,withHardwareLow:low+hw.cumulativeLow,withHardwareHigh:high+hw.cumulativeHigh};
}
export function operationsEstimate(){
  const hw=fullFieldTotals();
  return {sparesLow:Math.round(hw.cumulativeLow*.03),sparesHigh:Math.round(hw.cumulativeHigh*.05),
    reviewLow:16*1500*12,reviewHigh:40*1500*12};
}
export const salePrice=({hardware,install,warranty,nre,units=1,license=0,margin})=>(hardware+install+warranty+nre/units+license)/(1-margin);
export const schedule = [
  ['M0','約1–2週','Claude全場概念、資料／成本／證據板、投球與守備合成回放','只是Demo；不算硬體PoC或Statcast達標。'],
  ['P0','W1–3','普通球縫G1借測；同步做全場CAD、安裝與網路資源盤點','不做客製RF板；場勘可與牛棚並行。'],
  ['P1','W4–12','四相機＋24GHz；直接rpm／軸、球路、800ms基線','對應原2–3月PoC；不是全場驗收。'],
  ['P2','W13–20，必要時W24','固定牛棚可靠性；全場挑2–3區做ID、遠球與光照試拍','全場光學另過G-F1。'],
  ['F1','第6–9月','全場研究beta：球員連續ID、球路／事件初版、raw回放、人工覆核','需場地有線或等效實測連線、硬體擴充與獨立真值；OAA仍可未校準。'],
  ['F2','第9–15月','全場候選驗收：多場日夜、身份／事件、跑壘、OAA-like校準、可靠度','依資料量與失敗模式決定，不按日曆自動取得85分。'],
];
export const fullFieldAcceptance = [
  ['球員位置／速度','地面錨點誤差P95≤0.20m；速度P95≤0.3m/s；同步殘差≤2ms','已測量場地與獨立同步多視角標註，報真值本身誤差。'],
  ['身分／連續性','IDF1≥0.95、HOTA≥0.80；單鏡及全域分開；每類場景有效ID時間比例≥95%','固定官方評估工具版本與匹配距離；同時報ID switches、漏追、人工修正量。'],
  ['全場小球','可見飛行區位置P95≤0.30m；落點≤0.50m；完整有效play比例≥95%','借用獨立參考或多視角人工重建；球縫／進壘仍用更嚴格獨立門檻。'],
  ['守備事件','各事件precision／recall及F1≥0.90；時間P95≤0.10s','雙人標註仲裁；不能只報所有類別平均掩蓋接球漏判。'],
  ['OAA-like','校準ECE≤0.05作起點；相同holdout Brier不劣於位置／難度分層基線','固定特徵時點與分箱；分層樣本不足不通過，以分組區間評估。'],
  ['覆蓋／延遲','全指定活動區須有工程覆蓋；逐場景有效／準時交付比例另驗≥95%','不以只取80%草地當全場；800ms超時明記miss，不能從分母刪掉。'],
];
export const idf1=({idtp,idfp,idfn})=>{const d=2*idtp+idfp+idfn;return d?2*idtp/d:null};
export const hotaAlpha=(detA,assA)=>Math.sqrt(detA*assA);
export const fullFieldLatency = [['支持窗',100],['擷取／傳輸',80],['偵測',180],['跨鏡關聯',120],['事件／指標',80],['匯流／渲染',60],['餘額',180]];
export const rawRate=(cams,w,h,fps,bytes=1)=>cams*w*h*fps*bytes;
export const buyFullFieldRFQ = ['現場示範','schema樣例','時鐘／修訂機制','資料權','每球與每影格欄位','完整xyzω','無設備侵入','sample→visible延遲證據','維護SLA'];
