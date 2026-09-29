// v4.2 full-field planning overlay. Synthetic cases only; no measured player data.
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

export function fullFieldHTML(){
  return `<span class="eyebrow">FULL-FIELD / PLAYER + DEFENSE TRACKING / SYNTHETIC</span>
    <h2>全場整體能力</h2>
    <p class="lead">這一頁把「超過 Statcast 80%」拆成可驗收的球路、球員身分、守備事件、跑壘、OAA-like 與可靠度；目前沒有任何實測分數。</p>
    <div class="fullfield-hero"><div><small>專案驗收門檻</small><strong>≥85 / 100</strong><span>7 個必過能力群＋直接旋轉＋800ms＋場內淨空</span></div><div><small>目前實測</small><strong>—</strong><span>actual_score = null · 合成展示不計分</span></div></div>
    <div class="fullfield-switch" role="tablist" aria-label="全場資料情境">${FIELDING_CASES.map((c,i)=>`<button data-field-case="${c.id}" class="${i===0?'active':''}">${c.name}</button>`).join('')}</div>
    <article id="field-case-detail" class="field-case-detail"></article>
    <h3>11 群能力權重</h3><div class="fullfield-benchmark">${FULLFIELD_BENCHMARK.map(r=>`<div><span>${r[0]}</span><b>${r[1]}</b><small>${r[2]} · ${r[3]}</small></div>`).join('')}</div>
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
