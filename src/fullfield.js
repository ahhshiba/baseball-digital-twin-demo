// v4.2 full-field planning overlay. Synthetic cases only; no measured player data.
import { PLAN, sources } from './plan.js';
import { purchaseProducts, purchaseEstimate, purchaseAssumptions } from './procurement.js';
export const FULLFIELD_BENCHMARK = [
  ['投球速度／3D球路／釋球',12,'P1→F2','必過'],
  ['普通球直接rpm／三維有向軸',10,'P1→F2','必過'],
  ['擊球EV／LA／全程球路與落點',12,'F1→F2','必過'],
  ['全場球員身分與連續軌跡',18,'F1→F2','必過'],
  ['守備事件／機會模型／OAA-like',16,'F2','必過'],
  ['跑壘速度／路徑／壘間事件',6,'F1→F2','必過'],
  ['全場指定骨架子集研究',5,'F2+','研究'],
  ['球棒軌跡／接觸品質研究',5,'F2+','研究'],
  ['訓練ABS與邊界審查',4,'P1→F2','研究'],
  ['全場同步／800ms／可靠度',8,'F2','必過'],
  ['孿生／Dashboard／回放與資料權',4,'F1→F2','研究'],
];

export const FIELDING_CASES = [
  {id:'fly_catch',name:'飛球接殺',event:'接殺候選 → confirmed',detail:'球員軌跡、球路與接球事件可回放。'},
  {id:'fly_drop',name:'飛球漏接',event:'接殺候選 → drop',detail:'結果未確認前不得提前當成成功。'},
  {id:'ground_throw_out',name:'滾地接傳',event:'ground ball → throw → out',detail:'分開標記接球、傳球、接傳與出局。'},
  {id:'runner_safe',name:'跑者安全',event:'throw → safe',detail:'跑者、壘包、接傳時序保留證據。'},
  {id:'id_switch_review',name:'跨鏡身分歧義',event:'identity → review',detail:'track_id 與 player_id 分離，禁止猜補。'},
  {id:'occlusion_review',name:'遮擋缺段',event:'occlusion → review',detail:'缺觀測顯示 null，不用插值冒充實測。'},
];

export const FIELD_NODES = [
  ['F01','全場人物左後高位',[-48,-32,10],[0,25,1],false,'本壘與內野'],
  ['F02','全場人物右後高位',[48,-32,10],[0,25,1],false,'本壘與內野'],
  ['F03','三壘側界外結構',[-60,30,12],[-15,50,1],false,'左內／外野'],
  ['F04','一壘側界外結構',[60,30,12],[15,50,1],false,'右內／外野'],
  ['F05','左外野牆外',[-90,85,14],[-25,75,1],false,'左中外野'],
  ['F06','右外野牆外',[90,85,14],[25,75,1],false,'右中外野'],
  ['F07','中外野牆外左',[-40,120,14],[-10,85,1],true,'追加補位'],
  ['F08','中外野牆外右',[40,120,14],[10,85,1],true,'追加補位'],
];

const money=n=>`NT$${n.toLocaleString('en-US')}`;
const usd=n=>n==null?'待詢價':`USD ${n.toLocaleString('en-US')}`;
const sourceAnchor=(key,label='公開來源')=>sources[key]?`<a href="${sources[key].url}" target="_blank" rel="noreferrer">${label}</a>`:'';

// Public list prices and planning references, not Taiwan delivered quotations.
// Product data is deliberately separated from measured performance claims.
export const FULLFIELD_PRODUCTS = [
  ...purchaseProducts.map(p=>({
    model:p.name,
    price:p.hardwareUsd==null?`硬體待詢價；訂閱參考 ${usd(p.subscriptionReferenceUsd)}／期（約 ${money(p.subscriptionReferenceUsd*purchaseAssumptions.fx)}，非年費）`:`${usd(p.hardwareUsd)}（約 ${money(p.hardwareUsd*purchaseAssumptions.fx)}）＋年費 ${usd(p.annualUsd)}（約 ${money(p.annualUsd*purchaseAssumptions.fx)}）`,
    function:p.id==='b1'?'整合式棒球球路量測、投打結果與廠商資料介面；適合快速取得供應商已解算數據。':p.id==='pro3'?'投球與擊球量測；三相機＋雙雷達資料融合（依公開產品資料），適合牛棚／固定打擊席。':p.id==='x3b'?'棒球球路、旋轉率、旋轉方向／傾角與 FlightScope Cloud 匯出；適合專業牛棚。':p.id==='pro2-combo'?'投球＋擊球量測；取得初速、球路與部分旋轉／角度結果，適合 PoC。':'投球量測；取得球速、球路與部分旋轉相關結果，適合先做球路基準。',
    limit:p.id==='b1'?'硬體、API／Data Access 與即時延遲需向供應商確認；不等於原始 IQ 或直接三維旋轉量測。':p.id==='x3b'?'價格高於牛棚 PoC；通常取得廠商結果而非 raw IQ；不負責全場人物追蹤。':'需依原廠位置與距離安裝；不負責全場人物／守備追蹤，且不得放在投捕活動區中央。',
    stage:p.id==='b1'?'P0／P1 快速基準':p.id==='x3b'?'P1 專業基準':'P0／P1 快速基準',source:p.source
  })),
  {model:'Basler a2A2048-114g5cBAS',price:'公開參考約 USD 659（約 NT$21,088；未含鏡頭、稅運、同步與配線）',function:'3.2MP、global shutter、約 114 fps、5GigE；作為全場人物／守備追蹤節點。',limit:'需另外選鏡頭、供電、網路與硬體同步；不是直接的球速／旋轉量測器。',stage:'F1 全場先導',source:'fieldCameraPrice'},
  {model:'Basler a2A2448-105g5cBAS',price:'公開參考約 USD 1,119（約 NT$35,808；未含鏡頭、稅運、同步與配線）',function:'5MP、global shutter、約 106 fps、5GigE；用於較遠距離的場員身分與軌跡。',limit:'資料量與鏡頭要求較高；需做曝光、遮擋、網路與校正驗收。',stage:'F1／F2 全場擴充',source:'fieldCamera5mp'},
  {model:'FLIR BFS-U3-04S2M-CS',price:'公開參考約 USD 361（約 NT$11,552；現價需再詢價）',function:'720×540 黑白、最高約 522 fps，ROI 可提高；用於近距離球縫／旋轉影像研究。',limit:'USB3 短距離與資料吞吐限制；不能單獨完成三維球路或全場人物追蹤。',stage:'P1 直接旋轉升級',source:'spinPrice'},
  {model:'OmniPreSense OPS243-A',price:'公開參考約 USD 224（約 NT$7,168）',function:'24GHz CW Doppler／I-Q 類型雷達；提供徑向速度與觸發輔助，降低相機搜尋範圍。',limit:'單節點主要是徑向速度；不能單獨給出完整 3D 球路、直接旋轉軸或全場追蹤。',stage:'P0／P1 雷達輔助',source:'radarPrice'},
  {model:'TI IWR6843ISK＋DCA1000EVM',price:'開發套件價格依通路與庫存變動，列為待詢價；不以零元計算',function:'FMCW 60GHz 研究平台＋raw ADC 擷取；可研究 range-Doppler、角度與 FPGA 前處理。',limit:'需要天線、韌體、DCA 擷取、校正與安全外殼；不是即插即用的成品球類追蹤器。',stage:'P1 自研雷達研究',source:'ti'},
];

function productCatalogHTML(){
  return `<div class="fullfield-products">${FULLFIELD_PRODUCTS.map(p=>`<article class="product-mini-card"><div class="product-mini-head"><b>${p.model}</b><span>${p.stage}</span></div><div class="product-price">${p.price}</div><p><strong>功能：</strong>${p.function}</p><p><strong>限制：</strong>${p.limit}</p><small>${sourceAnchor(p.source,'公開規格／價格參考')} · 查核日 ${PLAN.priceChecked} · 匯率假設 USD 1 = NT$${purchaseAssumptions.fx}</small></article>`).join('')}</div>`;
}

export function fullFieldHTML(){
  return `<span class="eyebrow">FULL-FIELD / PLAYER + DEFENSE TRACKING / SYNTHETIC</span>
    <h2>全場整體能力</h2>
    <p class="lead">這一頁把「超過 Statcast 80%」拆成可驗收的球路、球員身分、守備事件、跑壘、OAA-like 與可靠度；目前沒有任何實測分數。</p>
    <div class="fullfield-hero"><div><small>專案驗收門檻</small><strong>≥85 / 100</strong><span>7 個必過能力群＋直接旋轉＋800ms＋場內淨空</span></div><div><small>目前實測</small><strong>—</strong><span>actual_score = null · 合成展示不計分</span></div></div>
    <div class="fullfield-switch" role="tablist" aria-label="全場資料情境">${FIELDING_CASES.map((c,i)=>`<button data-field-case="${c.id}" class="${i===0?'active':''}">${c.name}</button>`).join('')}</div>
    <article id="field-case-detail" class="field-case-detail"></article>
    <h3>11 群能力權重</h3><div class="fullfield-benchmark">${FULLFIELD_BENCHMARK.map(r=>`<div><span>${r[0]}</span><b>${r[1]}</b><small>${r[2]} · ${r[3]}</small></div>`).join('')}</div>
    <h3>成品型號、價格與功能</h3><p class="product-catalog-note">以下是可先買來整合的成品與研究硬體。價格是公開參考值，不是台灣代理正式報價；鏡頭、曝光、同步、支架、網路、稅運、API 與施工另計。成品量測結果不得直接宣稱等同 Statcast。</p>${productCatalogHTML()}
    <div class="disclaimer">這是本專案自訂驗收契約，不是 MLB 認證，也不是 Statcast 相對性能百分比。IDF1、HOTA、事件 F1、位置 P95、延遲 P99 與 OAA-like 校準必須分開報告。</div>
    <h3>全場成本口徑</h3><div class="fullfield-cost-grid"><div><small>100 萬研究案</small><strong>${money(1000000)}</strong><span>前提：借用 GPU、光纖、NAS、參考儀與安全結構</span></div><div><small>自購候選硬體</small><strong>${money(1446800)}–${money(2939600)}</strong><span>14–18 台候選相機／分區 edge／網路，不含未知項</span></div><div><small>全場 NRE</small><strong>${money(4440000)}–${money(12624000)}</strong><span>人力情境另計，不是正式報價</span></div></div>
    <details class="plan-detail"><summary>全場必收資料</summary><p>每位球員的 track_id、player_id、地面錨點、協方差、速度、相機來源、時間戳、校正版本、身分信心、缺段原因與修訂版本；球、球棒、壘包與守備事件分開儲存。unknown、review、predicted 不能改成 measured。</p></details>`;
}

export function renderFieldCase(id){
  const c=FIELDING_CASES.find(x=>x.id===id)||FIELDING_CASES[0];
  const isReview=id.includes('review');
  const result=id==='fly_catch'?'y=1，p=0.65 → 示意貢獻 +0.35':id==='fly_drop'?'y=0，p=0.80 → 示意貢獻 −0.80':'OAA-like = null（示意機率未訓練）';
  return `<div class="field-case-heading"><b>${c.name}</b><span>${c.event}</span></div><p>${c.detail}</p><div class="field-case-grid"><span>球員數<b>13</b><small>9 守備＋打者＋最多 3 跑者</small></span><span>身分狀態<b>${isReview?'REVIEW':'synthetic'}</b><small>track_id / player_id 分離</small></span><span>事件結果<b>${result}</b><small>不得視為量測 OAA</small></span></div>`;
}

export function setupFullFieldPanel(){
  const root=document.querySelector('#fullfield-panel');if(!root)return;
  const detail=root.querySelector('#field-case-detail');
  const set=id=>{detail.innerHTML=renderFieldCase(id);root.querySelectorAll('[data-field-case]').forEach(b=>b.classList.toggle('active',b.dataset.fieldCase===id))};
  root.querySelectorAll('[data-field-case]').forEach(b=>b.onclick=()=>set(b.dataset.fieldCase));
  set('fly_catch');
}
