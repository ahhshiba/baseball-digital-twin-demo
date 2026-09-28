import { PLAN, sources, bom, budgetTotals, bullpenBudget, expansionBudget, latency, acceptance, gates, fmtMoney } from './plan.js';
export const sourceLink=id=>`<a href="${sources[id].url}" target="_blank" rel="noopener">${sources[id].title} ↗</a>`;
const moneyRows=rows=>rows.map(([label,value])=>`<tr><td>${label}</td><td>${fmtMoney(value)}</td></tr>`).join('');
export function planHTML(){const b=budgetTotals();return `
  <span class="eyebrow">OPEN SENSOR PLAN / V${PLAN.version}</span><h2>一期就量旋轉</h2>
  <p class="lead">${PLAN.date} 計畫摘要 · 只公開工程估算與研究配置。精度、交期與價格皆待場測／書面確認。</p>
  <div class="plan-callout"><b>2 球路＋2 球縫＋24GHz</b><span>直接rpm與三維有向軸，不延後、不以球路反推替代。</span></div>
  <div class="budget-hero"><small>完整 PoC 驗證組 · 含15%風險預留</small><strong>15.3–22.0 <em>萬 NTD</em></strong><span>${fmtMoney(b.totalLow)}–${fmtMoney(b.totalHigh)} · 參考儀另借/另計</span></div>
  <details class="plan-detail" open><summary>一期硬體 BOM · 配件已列入</summary><div class="table-wrap"><table class="plan-table"><thead><tr><th>品項</th><th>預留小計 NTD</th></tr></thead><tbody>${bom.map(r=>`<tr><td>${r.item}<small>${r.model}</small></td><td>${(r.qty*r.low).toLocaleString()}–${(r.qty*r.high).toLocaleString()}</td></tr>`).join('')}<tr><td>小計</td><td>${b.low.toLocaleString()}–${b.high.toLocaleString()}</td></tr><tr><td>風險15%</td><td>${b.reserveLow.toLocaleString()}–${b.reserveHigh.toLocaleString()}</td></tr></tbody></table></div></details>
  <div class="disclaimer">這是可行性驗證組，不是直接旋轉已達標的產品報價。新edge主機、高規光學升級、獨立飛行參考儀及永久土木不含在PoC中。</div>
  <details class="plan-detail"><summary>10萬案：增購目標 NT$87,600</summary><p>增購小計73,000＋20%預留14,600。必須借足球路雙機/鏡頭、短脈衝照明、主機介面、治具與獨立參考儀；不是整套系統只值8.76萬。</p><p>借用不足或球縫看不清，就重審預算/工期，不能取消一期直接旋轉驗收。</p></details>
  <details class="plan-detail"><summary>牛棚：累計 NT$470,000</summary><table class="plan-table"><tbody>${moneyRows(bullpenBudget)}</tbody></table><p>不是再加47萬。50萬上限剩3萬；若另購60GHz研究組3–6萬，可能達50–53萬，必須延後或以節餘調整。</p></details>
  <details class="plan-detail"><summary>擴充：總硬體100萬封頂構想</summary><table class="plan-table"><tbody>${moneyRows(expansionBudget)}</tbody></table><p>不等於已買到全場OAA或正式ABS。FPGA新板、介面、工具與認證另評估，不能當免費升級。</p></details>
  <h3>驗收與採購關卡</h3><div class="gate-list">${gates.map(([id,time,title,text])=>`<article><span>${id} / ${time}</span><b>${title}</b><p>${text}</p></article>`).join('')}</div>
  <details class="plan-detail"><summary>一期建議驗收門檻 · 尚未實測</summary><table class="plan-table"><tbody>${acceptance.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table><p>自由飛行、普通未標記球＋獨立真值；試驗數量與誤差門檻須球團簽核。正式ABS另案。</p></details>
  <details class="plan-detail"><summary>公開售價與原廠來源（2026-09-28）</summary><div class="reference-links">${['baslerPrice','spinPrice','radar','spin','rolling','ti','dca','paper'].map(sourceLink).join('')}</div><p>USD×32為編預算假設。裸機公開售價不是到岸價，BOM已含工程價差預留，兩者不可重複加總。</p></details>
  <div class="export-row"><button id="export-bom">下載 BOM CSV</button><button id="export-plan">下載公開計畫 JSON</button></div>
  <p class="mini-note">不含人力NRE、內部報價或球員資料。完整本機PDF／Word未上傳公開repo。</p>`;}

export function spinHTML(){return `
  <span class="eyebrow">DIRECT OPTICAL SPIN / REQUIRED IN P0</span><h2>球縫 → 姿態 → 旋轉軸</h2>
  <p class="lead">兩個不同球面視角，共同曝光時間。球心追蹤或單顆CW雷達，不能替代三維球面姿態。</p>
  <div class="requirement-card"><small>第一期必要驗收</small><strong>直接 rpm ＋ 三維有向軸</strong><p>普通未加人工標記球。標記球可除錯，但不能代替驗收。</p></div>
  <div class="spin-demo-card"><div><small>畫面轉軸 · 合成預設</small><strong id="spin-axis-vector"></strong><span id="spin-preset-label"></span></div><div class="measurement-empty"><small>實測轉速 / 轉軸</small><b>— / —</b><span>未連接感測器</span></div></div>
  <p class="mini-note">紫色方向箭頭與球面自轉只是模擬示意，不是直接量測結果。半透明人物只改善觀看遮擋，不能讓真相機穿透人體。</p>
  <div class="formula-card">ΔR = R<sub>k+1</sub>R<sub>k</sub><sup>T</sup> → ω = vee(log ΔR)/Δt<br>rpm = 60‖ω‖/(2π) · axis = ω/‖ω‖</div>
  <h3>這個位置能拍清球縫嗎？</h3><p class="lead">依場景S1/S2的位置做針孔/橫越試算。沒有模擬景深、網紋、噪聲與球縫解算；數值過門檻也不代表實拍通過。</p>
  <div class="optics-controls">
    <label>觀測相機<select id="optics-camera"><option value="cam-c">S1 球縫左</option><option value="cam-d">S2 球縫右</option></select></label>
    <label>讀出模式<select id="optics-mode"><option value="full">720×540 · 522fps</option><option value="roi">320×240 ROI · 997fps</option></select></label>
    <label>焦距 mm<input id="optics-focal" type="number" min="8" max="300" step="1" value="50"></label>
    <label>曝光 μs<input id="optics-exposure" type="number" min="4" max="100" step="1" value="5"></label>
    <label>球速 m/s<input id="optics-speed" type="number" min="20" max="55" step="1" value="55"></label>
    <label>轉速 rpm<input id="optics-rpm" type="number" min="500" max="3500" step="100" value="3000"></label>
  </div>
  <p id="optics-geometry" class="mini-note"></p><div class="optics-results" id="optics-results" aria-live="polite"></div><div id="optics-warnings" class="optics-warning" aria-live="polite"></div>
  <p class="mini-note">ROI只裁切，不放大球像。長焦能增加球像，卻縮小視野；50mm是試算起點，非已核可鏡頭。更長焦段需重新詢價。物理視野示意不會隨此計算器變成實測標定。</p>
  <details class="plan-detail"><summary>哪些結果必須拒收？</summary><p>球縫模糊、對稱姿態歧義、低旋轉軸不確定、遮擋、同步失效或逾時：實測rpm/axis=null，保留原始ROI與原因。不可用預設或球路推估填洞後稱達標。</p><p>有向軸誤差 θ=acos(a_est·a_ref)，不取絕對值消掉反向錯誤。獨立參考儀亦須有誤差預算。</p></details>
  <div class="reference-links">${sourceLink('spin')}${sourceLink('paper')}</div>`;}

export function flowHTML(){return `
  <span class="eyebrow">SAMPLE TO PHOTON / 800 MS TARGET</span><h2>取樣到畫面 ≤ 0.8 秒</h2>
  <p class="lead">包含觀測窗、傳輸、演算法與渲染。以下為工程分配，不是本網站或硬體已測得的延遲。</p>
  <div class="budget-hero latency-hero"><small>最早納入的感測取樣 → 螢幕實際可見</small><strong>800 <em>ms 上限目標</em></strong><span>實測：—　 /　GitHub Pages不提供即時SLA</span></div>
  <div class="latency-segments" aria-label="800毫秒工程分配">${latency.map(s=>`<span style="flex:${s.ms};background:${s.color}" title="${s.name} ${s.ms}ms"></span>`).join('')}</div>
  <div class="latency-list">${latency.map(s=>`<div><i style="background:${s.color}"></i><span>${s.name}<small>${s.detail}</small></span><b>${s.ms}<em>ms</em></b></div>`).join('')}</div>
  <div class="disclaimer">報P50/P95/P99、最大值與逾時率；只測平均或requestAnimationFrame不夠。用共同trigger / LED與高速攝影或光電方式驗到畫面發光。</div>
  <div class="flow-list">
    <div><small>01 / L0 ACQUIRE</small><strong>相機與雷達原始資料</strong><p>T1/T2球路＋S1/S2球縫 → 相機ADC → Mono8；24GHz RF → 混頻I/Q → 模組ADC → USB事件窗。I/Q本來就是電訊號，ADC才轉成數字。</p></div>
    <div><small>02 / L1 OBSERVE</small><strong>本地擷取、同步與觀測</strong><p>共同trigger、曝光檢查、clock map；ROI球心/球縫與STFT頻譜候選。FPGA只在剖析後平行移植，不阻塞一期交付。</p></div>
    <div><small>03 / L2 ESTIMATE</small><strong>球路與直接旋轉分工</strong><p>雙目三角化；球縫多視角R(t) → ω/rpm/有向軸；雷達v_r與相機速度投影配對。失效保留null與不確定度。</p></div>
    <div><small>04 / L3 RECORD</small><strong>指標、事件與可追溯證據</strong><p>pitch_id、來源、原始檔索引、校正/算法/規則版本。投打守進階率仍需完整事件分母，OAA-like需全場軌跡與基準模型。</p></div>
    <div><small>05 / LOCAL DISPLAY</small><strong>小封包 → 本地孿生 / Dashboard</strong><p>原始高流量留節點；WebSocket送狀態。4公頃是否可布線尚待確認，先以本地有線顯示驗收；落點未發生時只可標預測。</p></div>
  </div>
  <h3>共同契約，不把影像與I/Q相加</h3>
  <div class="contract-grid"><div><b>L0</b><span>raw像素 / IQ / real ADC</span></div><div><b>L1</b><span>像素、球縫、頻譜候選</span></div><div><b>L2</b><span>位置、速度、姿態、ω</span></div><div><b>L3</b><span>指標 / 事件 / 品質</span></div></div>
  <p class="mini-note">共同封套：sensor/node/seq、clock_epoch、取樣起中終、covariance、calibration/config/model版本、validity。ns整數在JSON用字串，raw用二進位與索引，不塞base64。</p>
  <div class="formula-card">計畫座標 (x右, y投手, z上)<br>→ 3D場景 (x右, y上, z捕手)<br>world [x,y,z] → scene [x,z,−y]</div>
  <p class="mini-note">800ms不是曝光同步容忍值；55m/s × 1ms = 55mm。兩機曝光差初始目標≤50μs，須實測。現有2.4秒慢動作回放與端到端延遲無關。</p>`;}
