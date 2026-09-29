// Public planning estimates from 2026-09-28 v3.0, not measured performance.
export const PLAN = Object.freeze({version:'3.1', date:'2026-09-28', updated:'2026-09-29', priceChecked:'2026-09-29', latencyMs:800,
  directSpinRequired:true, source:'public-planning-summary', fxUsdTwd:32});
export const sources = {
  basler:{title:'Basler 原廠規格',url:'https://docs.baslerweb.com/a2a1920-160umbas'},
  baslerPrice:{title:'Soda Vision · USD 395',url:'https://www.sodavision.com/product/basler-a2a1920-160umbas/'},
  spin:{title:'FLIR 幀率 / 曝光表',url:'https://softwareservices.flir.com/BFS-U3-04S2/latest/Model/spec.html'},
  spinPrice:{title:'Edmund PDF索引 · USD 361（現價待確認）',url:'https://www.edmundoptics.com/p/BFS-U3-04S2M-CS-USB3-Blackflyreg-S-Monochrome-Camera/40161?PrintPDF=true'},
  radar:{title:'OPS243-A · USD 224',url:'https://omnipresense.com/product/ops243-doppler-radar-sensor/'},
  rolling:{title:'Rolling Buffer · Rev C (2026)',url:'https://omnipresense.com/wp-content/uploads/2026/09/AN-027-C_Rolling-Buffer.pdf'},
  ti:{title:'TI IWR6843ISK',url:'https://www.ti.com/tool/IWR6843ISK'},
  dca:{title:'TI DCA1000 raw ADC 擷取',url:'https://www.ti.com/tool/DCA1000EVM'},
  paper:{title:'無標記棒球旋轉研究 · 2017',url:'https://doi.org/10.1007/s11760-017-1075-x'},
  radarPrice:{title:'OmniPreSense 官方目錄 · USD 224',url:'https://omnipresense.com/product-category/sensor/'},
  pro2:{title:'Rapsodo PRO 2.0 · USD 3,500起',url:'https://rapsodo.com/products/pro-2-ball-flight-monitor'},
  pro3:{title:'Rapsodo PRO 3.0 · USD 8,500',url:'https://rapsodo.com/products/rapsodo-pro-3-ball-flight-monitor'},
  rapPricing:{title:'Rapsodo 官方方案價表',url:'https://rapsodo.com/blogs/baseball/rapsodo-demystified-for-coaches'},
  rapMembership:{title:'Rapsodo 必要會員 · Team USD 1,500/年',url:'https://rapsodo.com/pages/rapsodo-baseball-pro-series-membership'},
  rapFAQ:{title:'Rapsodo 安裝與資料匯出 FAQ',url:'https://rapsodo.com/pages/baseball-frequently-asked-questions-faq'},
  rapMount:{title:'Rapsodo Japan 官方 PRO 3.0 安裝',url:'https://note-rapsodojp.rapsodo.com/n/n715565f9db54'},
  b1:{title:'TrackMan B1 · 硬體需詢價',url:'https://www.trackman.com/baseball/Portable-B1/get-your-own'},
  b1Specs:{title:'TrackMan B1 原廠規格 · 2026',url:'https://support.trackmanbaseball.com/hc/en-us/articles/47739391155099-B1-Unit-Technical-Specifications'},
  b1Shop:{title:'TrackMan B1 軟體訂閱 · USD 2,500/期',url:'https://shop.trackmangolf.com/collections/baseball'},
  b1API:{title:'TrackMan Data API · 另購授權',url:'https://support.trackmanbaseball.com/hc/en-us/articles/5089419125403-Data-Data-API-Introduction'},
  b1Live:{title:'B1 Live Feed · iPad後約3秒目標（2026-05）',url:'https://support.trackmanbaseball.com/hc/en-us/articles/5089771759003-B1-App-Trackman-Data-Feeds-Live-Play-by-Play'},
  b1Mount:{title:'B1 官方安裝與校正 · 2026',url:'https://support.trackmanbaseball.com/hc/en-us/articles/48455405166747-B1-App-Pitching-Calibration-Steps'},
  x3b:{title:'FlightScope X3B · USD 15,995套裝 / Cloud另計',url:'https://flightscope.com/pages/baseball'},
};
export const bom = [
  {id:'T01',item:'球路相機 ×2',qty:2,low:15000,high:19000,model:'a2A1920-160umBAS',source:'baslerPrice'},
  {id:'S01',item:'球縫相機 ×2',qty:2,low:15000,high:21000,model:'BFS-U3-04S2M-CS',source:'spinPrice'},
  {id:'O01',item:'鏡頭 / 接環 ×4',qty:4,low:3500,high:6000,model:'依距離 / 像圈詢價'},
  {id:'L01',item:'雙通道脈衝照明 / 驅動',qty:1,low:16000,high:24000,model:'需實拍與安全評估'},
  {id:'R01',item:'24GHz I/Q 雷達',qty:1,low:9000,high:12000,model:'OPS243-A',source:'radar'},
  {id:'Y01',item:'同步 MCU / 隔離 / trigger',qty:1,low:5000,high:8000,model:'開發板＋同步盒'},
  {id:'D01',item:'USB / 線材 / NVMe 增補',qty:1,low:8000,high:12000,model:'沿用研發PC'},
  {id:'M01',item:'安全支架 / 基本防護',qty:1,low:8000,high:12000,model:'PoC非全天候認證'},
  {id:'C01',item:'標定板 / 旋轉治具',qty:1,low:8000,high:12000,model:'自由飛行參考儀另借'},
  {id:'P01',item:'電源 / 保護 / 配線',qty:1,low:5000,high:7000,model:'不含土木工程'},
];
export function budgetTotals(){
  const low=bom.reduce((s,r)=>s+r.qty*r.low,0),high=bom.reduce((s,r)=>s+r.qty*r.high,0);
  return {low,high,reserveLow:Math.round(low*.15),reserveHigh:Math.round(high*.15),totalLow:Math.round(low*1.15),totalHigh:Math.round(high*1.15)};
}
export const bullpenBudget = [['沿用完整 PoC（保守取整）',220000],['Edge PC / 儲存介面',55000],['旋轉光學 / 光源改善',40000],['局部網路 / 固定防護',40000],['必要備品',35000],['校正 / 重裝驗證',15000],['升級 / 未知風險預留',65000]];
export const expansionBudget = [['沿用牛棚',470000],['場邊感測擴充',250000],['60GHz 研究',50000],['運算 / 儲存',70000],['網路 / 防護',60000],['風險保留',100000]];
export const latency = [
  {name:'必要觀測窗',ms:205,color:'#b39bf2',detail:'從最早納入的取樣算起，含多幀與事件窗等待'},
  {name:'讀出 / USB',ms:50,color:'#689ff2',detail:'擷取完成 → 主機 buffer 可用'},
  {name:'ROI / 球縫前處理',ms:90,color:'#60c6d3',detail:'原始影像 → 球心 / 球縫候選'},
  {name:'直接旋轉解算',ms:180,color:'#bc93e0',detail:'雙視角、多幀球面姿態 → rpm / 有向軸'},
  {name:'融合 / 指標',ms:40,color:'#66c9a3',detail:'依觀測時間對齊，不用接收時刻假冒取樣'},
  {name:'LAN / 傳輸',ms:40,color:'#c1c97a',detail:'狀態封包，不搬整段 raw 影像到瀏覽器'},
  {name:'渲染 / 顯示',ms:40,color:'#efb969',detail:'瀏覽器收到 → 螢幕實際可見'},
  {name:'負載 / 抖動餘裕',ms:155,color:'#607c90',detail:'總額度內的保留，不是額外再加800ms'},
];
export const acceptance = [
  ['直接轉速','P95誤差 ≤ max(100rpm, 參考值5%)'],['三維有向軸','500–3500rpm適用域，P95角誤差 ≤10°'],
  ['旋轉有效率','合格測試包絡 ≥90%，失敗/逾時仍計入分母'],['球速 / 位置','P95 ≤1km/h / 指定區域位置 ≤20mm，僅訓練PoC起點'],
  ['曝光同步','雙機曝光差初始目標 ≤50μs，實測 ExposureActive'],['取樣 → 畫面','有效交付 ≤800ms；最大值、P99、deadline miss均須報告'],
];
export const gates = [
  ['G0','W1–2','借樣與資源','安全安裝點、原始介面、獨立參考儀與測試時段。'],
  ['G1','W2–3','先拍清球縫','檢查像素、曝光、可見幀數；不過就停止擴購。'],
  ['G2','W3–4','同步與資料','雙機曝光、內外參、raw擷取與可重播檔案。'],
  ['G3','W5–7','直接旋轉','未加人工標記實球，三維有向軸與獨立真值比對。'],
  ['G4','W8–9','本地顯示','CPU管線、融合、800ms端到端負載測試。'],
  ['G5','W10–12','盲測與凍結','跨日與光照驗證；spin、位置、延遲全部過才交付。'],
  ['牛棚','W13–20','固定化與維護','防護、局部網路、重裝校正與操作SOP。'],
];
export const fmtMoney = value => 'NT$'+value.toLocaleString('en-US');
export function publicPlan(){return {plan:PLAN,solution_variant:'build',scope:'planning_only_no_hardware_results',price_basis:'engineering_allowance_not_turnkey_quote',bom,budget:budgetTotals(),bullpen:bullpenBudget,expansion:expansionBudget,latency,acceptance,gates,sources};}
export function bomCSV(){const t=budgetTotals();const rows=[['ID','品項','型號/備註','數量','預留低單價NTD','預留高單價NTD','低小計','高小計','基準日','狀態'],...bom.map(r=>[r.id,r.item,r.model,r.qty,r.low,r.high,r.qty*r.low,r.qty*r.high,PLAN.date,'工程預留非正式報價']),['TOTAL','含15%風險預留','','','','',t.totalLow,t.totalHigh,PLAN.date,'參考儀另借/另計，性能待驗證']];return '\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');}
