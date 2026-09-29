import { PLAN, sources, publicPlan } from './plan.js';
import { activityBoundary, boundaryDistance } from './deployment.js';

// USD prices are public references, not Taiwan delivered quotes. Null is unknown, never free.
export const priceAudit = [
  {id:'T01',model:'Basler a2A1920-160umBAS',usd:395,status:'經銷頁明列USD；backorder，交期待確認',source:'baslerPrice'},
  {id:'S01',model:'FLIR BFS-U3-04S2M-CS',usd:361,status:'公開PDF搜尋索引價；本次動態頁未提供可確認售價，須重報',source:'spinPrice'},
  {id:'R01',model:'OPS243-A（非WiFi版）',usd:224,status:'官方目錄價；與USD244 WiFi版不同',source:'radarPrice'},
];
export const purchaseAssumptions = Object.freeze({fx:32,landedLow:1.10,landedHigh:1.20,checked:'2026-09-29',
  note:'匯率是編預算假設，非即期匯率。1.10–1.20為運保/稅費/匯差整體預留係數，不是法定稅率或正式到岸報價。'});
export const purchaseProducts = [
  {id:'b1',name:'TrackMan Portable B1',hardwareUsd:null,annualUsd:null,subscriptionReferenceUsd:2500,source:'b1',feeSource:'b1Shop',
    accessoriesLow:28000,accessoriesHigh:50000,accessories:'相容iPad 18–30k＋網路/基本安裝防護10–20k，特殊固定工程另計',
    status:'優先借測／索取報價，未符合全部硬條件',data:'付費Data Access Package / API提供球事件與解算數據；不是感測器I/Q或raw球縫影格。',
    spin:'原廠列spin rate / axis；有向軸座標、直接量測方法與誤差須書面確認及盲測。',
    placement:'可評估捕手後方固定結構，須遵守原廠距離/高度/網面條件；不是任意移位。',
    latency:'官方Live Feed目標是iPad結果可用後約3秒內；不能據此承諾取樣→自製畫面≤0.8秒。',
    sources:['b1Specs','b1API','b1Live','b1Mount']},
  {id:'pro2-pitch',name:'Rapsodo PRO 2.0｜投球單功能',hardwareUsd:3500,annualUsd:1500,source:'pro2',feeSource:'rapMembership',
    accessoriesLow:28000,accessoriesHigh:50000,accessories:'相容iPad 18–30k＋基本防護/線材/安裝10–20k',
    status:'場內淨空條件不符；僅可列為另准許場地的訓練比較案',data:'解算指標與報表；CSV方案/商用授權需確認，未確認可用raw或本地即時API。',
    spin:'有轉速/旋轉相關指標；不得把2D tilt當成已取得三維有向軸，直接量測驗收另查。',
    placement:'官方要求本壘前20ft（6.096m），位於投捕之間；不可擅移到場邊後仍假設有效。',
    latency:'未取得取樣到自製畫面的≤800ms介面承諾。',sources:['rapFAQ','rapPricing']},
  {id:'pro2-combo',name:'Rapsodo PRO 2.0｜投打雙功能',hardwareUsd:4500,annualUsd:1500,source:'rapPricing',feeSource:'rapMembership',
    accessoriesLow:28000,accessoriesHigh:50000,accessories:'相容iPad 18–30k＋基本防護/線材/安裝10–20k',
    status:'場內淨空條件不符；雙功能價依官方方案表，職業隊需重報',data:'多了投打功能授權，不等於多了raw或即時API權利。',
    spin:'三維有向軸/直接量測定義與誤差待證；不當成完整驗收保證。',
    placement:'與PRO 2.0相同的投捕間20ft位置要求。',latency:'沒有已確認的自製畫面≤800ms資料通道。',sources:['rapFAQ']},
  {id:'pro3',name:'Rapsodo PRO 3.0｜投打整合',hardwareUsd:8500,annualUsd:1500,source:'pro3',feeSource:'rapMembership',
    accessoriesLow:28000,accessoriesHigh:50000,accessories:'相容iPad 18–30k＋基本防護/線材/安裝10–20k',
    status:'場內淨空條件不符；不是直接替代場邊架構',data:'三相機＋雙雷達整機；球縫/解算指標不等於開放原始感測資料。',
    spin:'原廠列球縫姿態與旋轉指標；可作採購驗證候選，但需確認三維軸API欄位及方法。',
    placement:'原廠指南要求本壘前17ft（約5.18m），投捕之間。',latency:'未公開確認取樣→自製畫面800ms保證。',sources:['rapMount','rapFAQ']},
  {id:'x3b',name:'FlightScope X3B｜棒球專用套裝',hardwareUsd:15995,annualUsd:995,source:'x3b',feeSource:'x3b',
    accessoriesLow:10000,accessoriesHigh:20000,accessories:'局部網路/安裝防護10–20k；套裝已列Windows PC、腳架與雷射測距，不再重買一套PC',
    status:'可詢價比較；以×32假設，套裝裸價已逾牛棚50萬上限',data:'原廠CSV需FS Cloud；USD995/年，預付兩年以上為750/年。本表採一年一付，不混用折扣。',
    spin:'列spin rate / direction / tilt；不能僅由欄位名稱推定直接三維有向軸，需查證。',
    placement:'依原廠場地setup驗證後方位置/淨空；不把高爾夫Mevo+協定套來用。',latency:'CSV/Cloud不能證明本地即時raw或800ms交付。',sources:['x3b']},
];
export function purchaseEstimate(product,fx=purchaseAssumptions.fx){
  if(!Number.isFinite(fx)||fx<=0)throw new RangeError('Positive exchange-rate assumption required');
  if(product.hardwareUsd===null)return {hardwareTwd:null,annualTwd:null,firstYearLow:null,firstYearHigh:null,threeYearLow:null,threeYearHigh:null,complete:false};
  const hardwareTwd=product.hardwareUsd*fx,annualTwd=product.annualUsd*fx;
  const firstYearLow=Math.round(hardwareTwd*purchaseAssumptions.landedLow+product.accessoriesLow+annualTwd);
  const firstYearHigh=Math.round(hardwareTwd*purchaseAssumptions.landedHigh+product.accessoriesHigh+annualTwd);
  return {hardwareTwd,annualTwd,firstYearLow,firstYearHigh,threeYearLow:firstYearLow+annualTwd*2,threeYearHigh:firstYearHigh+annualTwd*2,complete:false};
}
export const buyStages = [
  {id:'poc',short:'B0',name:'成品借測',subtitle:'成品 · 介面與場地查核',budget:'B1硬體 / API 待報價',timing:'W1–2先取得借樣與權限',description:'先用球團現有/借用B1驗證輸出。場景只畫B1後方固定概念，不代表已採購或原廠核准。'},
  {id:'bullpen',short:'B1',name:'牛棚應用',subtitle:'成品 · 資料應用驗證',budget:'不能直接沿用A版47萬',timing:'權限到位後W3–6試接',description:'自研adapter、座標/單位對照、事件儲存、Dashboard與回放；逐項實測，不承諾800ms。'},
  {id:'pilot',short:'B2',name:'投打擴充',subtitle:'成品 · 投打功能與授權',budget:'加購功能 / 授權另報',timing:'依採購與場勘排程',description:'先查整機投打模式、資料缺值與事件欄位；買成品不代表能拿到所有原始信號。'},
  {id:'full',short:'B3',name:'全場另案',subtitle:'成品 · 非全場交付承諾',budget:'全場 / OAA / ABS 另案',timing:'完整覆蓋另驗證',description:'B1只是安裝概念；此圖不代表Portable系統能取代正式球場V3或全場守備追蹤。'},
];
export function parsePlanHash(hash){
  const parts=hash.replace(/^#/,'').split('/');
  const variant=['build','buy'].includes(parts[0])?parts.shift():'build';
  return {variant,stage:['poc','bullpen','pilot','full'].includes(parts[0])?parts[0]:'poc',panel:['dashboard','nodes','fullfield','spin','plan','metrics','flow'].includes(parts[1])?parts[1]:'nodes'};
}
export function getPurchaseNodes(stage){
  if(!buyStages.some(s=>s.id===stage))throw new RangeError('Unknown purchase stage');
  const full=['pilot','full'].includes(stage),pos=full?[0,6.5,7]:[0,3.66,5],anchor=[pos[0],pos[1],pos[2]+.7];
  const nodes=[
    {id:'vendor-b1',name:'B1｜整合式成品候選',type:'vendor',pos,anchor,target:[0,1.3,-9],required:true,model:'TrackMan Portable B1 · 示意外形',source:'b1Mount',mountKind:'structure',
      place:'捕手後方場外剛性結構｜待原廠場勘確認',tradeoff:'原廠投球最佳設定示例為距本壘12ft、高12ft；本圖為避開概念活動區而採自訂位置，需custom calibration與原廠驗證，非合規施工圖。',
      role:'廠商完成感測與量測解算；我們只接授權結果，不假裝已開放raw。',raw:'目前無raw授權。候選L2/L3球事件、vendor schema、單位、原廠座標、來源與方法標記。'},
    {id:'vendor-edge',name:'APP｜授權介接 / 顯示端',type:'edge',pos:full?[18,.9,8]:[6.5,.9,1],anchor:full?[18,.9,8]:[6.5,.9,1],target:[0,1,-8],required:true,model:'原廠相容iPad＋自研後端/既有PC',source:'b1Live',mountKind:'cabinet',
      place:'場外維護與顯示區',tradeoff:'盒體代表邏輯應用節點，非iPad可直接塞進機櫃；網路/散熱/防護另設計。',
      role:'HTTPS webhook → adapter → 權限與去重 → 統一資料 → 本地WebSocket / 孿生。API金鑰不放GitHub Pages。',raw:'B1官方feed為iPad後約3秒目標；資料接收時間不是原始曝光時間，無法自行證明800ms。'},
  ];
  return nodes.map(n=>({...n,clearanceM:boundaryDistance([n.pos[0],n.pos[2]],activityBoundary(stage))}));
}
export function variantPlan(variant='build'){
  if(!['build','buy'].includes(variant))throw new RangeError('Unknown solution variant');
  const shared={auditDate:PLAN.priceChecked,priceAudit,priceStatus:'planning_only_not_supplier_quote',allRequirementsVerified:false};
  return variant==='build'?{...publicPlan(),...shared}:{plan:PLAN,solution_variant:'buy',...shared,scope:'vendor_results_integration_not_raw_acquisition',assumptions:purchaseAssumptions,
    products:purchaseProducts.map(p=>({...p,estimate:purchaseEstimate(p)})),sources,excludedCosts:['integration_NRE','API_licenses_if_unquoted','support_and_repairs','data_export_upgrades','permanent_civil_work'],sample_to_visible_measured_ms:null};
}
export function purchaseCSV(){
  const rows=[['型號/版本','查核日','硬體USD','年度公開訂閱USD','首年已知基礎估算低NTD','首年已知基礎估算高NTD','三年已知基礎估算低NTD','三年已知基礎估算高NTD','來源','限制','金額性質'],
    ...purchaseProducts.map(p=>{const e=purchaseEstimate(p);return [p.name,PLAN.priceChecked,p.hardwareUsd??'待報價',p.annualUsd??'週期/條件待確認',e.firstYearLow??'待報價',e.firstYearHigh??'待報價',e.threeYearLow??'待報價',e.threeYearHigh??'待報價',sources[p.source].url,p.status,'非完整總價；NRE/API/維修等未知另計'];})];
  return '\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
