// Audit of AI-generated Statcast / low-cost shortcut claims (v4.2 pp.8–13), checked 2026-09-29.
// "Unverified" means not enough to commit purchase, schedule or performance — not "impossible".
export const verdictKinds = {
  overreach:{label:'過度擴張',tone:'warn'},official:{label:'有官方依據',tone:'ok'},partial:{label:'有部分依據',tone:'ok'},
  unverified:{label:'未證實',tone:'warn'},wrong:{label:'錯誤',tone:'bad'},vendorClaim:{label:'原廠宣稱',tone:'note'},
};
export const claimAudit = [
  {claim:'所有Statcast數據完全免費',verdict:'overreach',fix:'公開CSV可查下載，但不含所有原始影像、全身軌跡、I/Q、商用即時權利；公開spin_axis仍是2D定義。',refs:['R33']},
  {claim:'官方Sportradar合作',verdict:'official',fix:'2025公告合作延伸至2032，包含Statcast；Base、Push與Statcast套件需分開確認。',refs:['R34','R35']},
  {claim:'API每月USD500–5000+',verdict:'unverified',fix:'不將推測區間列正式價；需針對欄位、延遲、商用再散布、使用者及地域詢價。',refs:['R35']},
  {claim:'Big Balls已可免費用Statcast',verdict:'unverified',fix:'其Statcast頁明列endpoint in development；頁面250/500次與比較頁1000/2000次不一致。',refs:['R37']},
  {claim:'MLM2PRO是棒球投打方案',verdict:'wrong',fix:'是高爾夫產品；USD599.99促銷／699.99原價，旋轉依RPT高爾夫球。排除於棒球採購清單。',refs:['R38']},
  {claim:'STRIKE約3000–4000元',verdict:'partial',fix:'官方方案列NT$3,899；硬體＋軟體條件、庫存與帳戶功能須確認；不是普通無電子棒球。',refs:['R39','R40']},
  {claim:'STRIKE進壘點等於ABS座標',verdict:'wrong',fix:'進壘點位移是相對參考球路的解算量，不能當本壘座標絕對位置精度證明。',refs:['R39']},
  {claim:'Hawk-Eye約±0.1英吋',verdict:'vendorClaim',fix:'Sony 2020發布有此數字；未附P95、測試包絡與原始誤差分布，不能當每球最大誤差保證。',refs:['R30']},
  {claim:'所有12機全面升300fps',verdict:'wrong',fix:'2023升級的是五台高幀率投球／球棒相機，不是全數12台。',refs:['R32']},
  {claim:'2026 ABS約14秒',verdict:'wrong',fix:'13.8秒是2025春訓挑戰平均流程，不是sensor→顯示演算法耗時。',refs:['R48']},
  {claim:'Hawk-Eye單場USD50–100萬',verdict:'unverified',fix:'2015報導為聯盟層級數千萬美元投入，不能轉成2026單場硬體施工單價。',refs:['R31']},
  {claim:'兩手機幾乎等同Statcast 3D',verdict:'unverified',fix:'單眼先驗推論、同步多視角三角化、全場相機系統是不同量測條件。',refs:[]},
  {claim:'MediaPipe與YOLO都輸出33點XYZ',verdict:'wrong',fix:'MediaPipe模型估計33點；COCO預訓練YOLO pose通常17個2D點，第三分量可能是visibility。',refs:['R41','R42']},
  {claim:'便攜設備一律誤差<1%',verdict:'unverified',fix:'需依型號、指標與場景驗證；高爾夫產品宣稱不得移植成棒球spin／位置誤差保證。',refs:['R38']},
  {claim:'開源骨架已等同Vicon醫療級',verdict:'unverified',fix:'需特定動作、速度、遮擋與關節定義的獨立驗證，不能由動畫像人推定。',refs:[]},
];
export const statcastHistory = [
  ['2013下半年–2015','報導：2013下半年原型測試，2015全30場部署；初代TrackMan＋ChyronHego。','不能改寫成2014才立項；也不能推出完整研發工時。'],
  ['2020 · Sony官方','12台同步高解析相機，球與球員光學追蹤。','未提供可採購BOM、單場價與演算法源碼。'],
  ['2020 · MLB說明','投球五機100fps；球員／擊球七機50fps。','當年配置，不能不標年份當2026全部規格。'],
  ['2023 · MLB Glossary','五台高幀率相機升級至300fps。','不是12台全升，也不保證低價300fps相機同等球縫能力。'],
  ['2026 · T-Mobile官方','ABS用於例行賽，美國球場部署使用私有5G。','不代表本案必須買私有5G。'],
];
export const auditSources = {
  R30:'https://sony.mediaroom.com/2020-08-20-Hawk-Eye-Innovations-and-MLB-Introduce-Next-Gen-Baseball-Tracking-and-Analytics-Platform',
  R31:'https://phys.org/news/2015-04-deluge-mlb-statcast-analytics-tuesday.html',R32:'https://www.mlb.com/glossary/statcast',
  R33:'https://baseballsavant.mlb.com/csv-docs',R34:'https://investors.sportradar.com/news-releases/news-release-details/major-league-baseball-and-sportradar-announce-expanded-exclusive',
  R35:'https://developer.sportradar.com/getting-started/docs/your-account',R37:'https://bigballsdata.com/mlb-statcast-api',
  R38:'https://rapsodo.com/products/mlm2pro-mobile-launch-monitor-golf-simulator',R39:'https://shop.jingletek.com/products/strike-2-0-scientific-baseball-training-system',
  R40:'https://shop.jingletek.com/products/strike-2-0-software-subscription-plan',R41:'https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker',
  R42:'https://docs.ultralytics.com/tasks/pose/',R48:'https://www.mlb.com/amp/news/abs-challenge-system-mlb-2026.html',
  R51:'https://docs.baslerweb.com/a2a2048-114g5cbas',R52:'https://docs.baslerweb.com/a2a2448-105g5cbas',
  R53:'https://graftek.com/product/a2a2048-114g5cbas/',R54:'https://graftek.com/product/a2a2448-105g5cbas/',
  R56:'https://github.com/JonathonLuiten/TrackEval',R57:'https://arxiv.org/abs/2009.07736',R25:'https://www.mlb.com/glossary/statcast/outs-above-average',
};
