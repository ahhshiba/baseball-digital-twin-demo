import './style.css';
import './workbench.css';
import './actor-controls.css';
import { stages, colors, typeNames, getNodes } from './nodes.js';
import { PITCHES, PLATE, BALL_RADIUS, makePitch, makeRecord } from './pitch.js';
import { capabilityHTML } from './capabilities.js';
import { FieldScene } from './scene.js';

const $=s=>document.querySelector(s);
let stage='full',site='pen',nearView=false,selected='cam-a',activePanel='dashboard';
let type='FF',scenario='strike',heightCm=180,playing=false,startTime=0,playPitch=null,playStage=null;
let records=[],storageAvailable=true;
try { const stored=JSON.parse(localStorage.getItem('fieldlab-demo-v2')||'[]');records=Array.isArray(stored)?stored.filter(r=>r?.schema_version==='demo-pitch/2.0'&&r.source==='synthetic'&&Object.hasOwn(PITCHES,r.pitch_type?.label)&&Number.isFinite(r.metrics?.release_speed_kmh)&&['STRIKE','BALL','REVIEW'].includes(r.abs?.call)).slice(-60):[]; }catch{storageAvailable=false}
let pitch=makePitch(type,scenario,heightCm),nodes=getNodes(stage,nearView);

$('#app').innerHTML=`<div class="app">
  <header class="topbar"><div class="identity"><div class="mark">◈</div><div><span class="overline">FIELD LAB / DIGITAL TWIN</span><h1>棒球數位孿生</h1></div></div>
    <div class="header-note"><span class="signal"></span>互動展示 · 模擬資料</div><a class="source-link" href="https://github.com/ahhshiba/baseball-digital-twin-demo" target="_blank" rel="noopener">GitHub ↗</a></header>
  <div class="stagebar"><div class="stagebar-label">部署情境<span>STAGES</span></div><div class="stage-buttons" id="stages"></div>
    <div class="site-toggle" id="site-toggle" hidden><button data-site="lab">室內</button><button data-site="pen">牛棚</button></div>
    <div class="site-toggle" id="scene-toggle" hidden><button data-scene="near">釋球近攝</button><button data-scene="plate">本壘量測</button></div>
    <span class="stage-note">配置示意，覆蓋與性能待驗證</span></div>
  <div class="main"><section class="viewport" aria-label="互動三維球場">
    <div id="scene"></div><div id="labels"></div>
    <div class="scene-caption"><span class="eyebrow">INTERACTIVE FIELD VIEW</span><strong id="scene-title"></strong><span>拖曳旋轉 · 滾輪縮放 · 點選感測器</span></div>
    <div class="scene-options"><button id="light" title="切換日夜" aria-pressed="false">☀ 日間</button><button id="coverage" aria-pressed="false">視野示意</button><button id="clearance" aria-pressed="false">活動區界線</button><button id="labels-toggle" aria-pressed="true">設備標籤</button></div>
    <div class="actor-tools"><button id="ghost-actors" aria-pressed="false" title="一鍵切換投手與捕手半透明">◉ 投捕手半透明</button><details id="actor-filter-options"><summary>過濾設定</summary><div class="actor-filter-body"><label><input type="checkbox" id="fade-pitcher">投手半透明</label><label><input type="checkbox" id="fade-catcher">捕手半透明</label><label class="opacity-control" for="actor-opacity">人物不透明度 <output id="opacity-value">25%</output></label><input id="actor-opacity" type="range" min="10" max="60" step="5" value="25"><small>僅影響畫面，球路與記錄不變。</small></div></details></div>
    <div id="filter-status" class="filter-status" hidden aria-live="polite"></div>
    <div class="scene-stamp">CONCEPT VENUE <span>1 unit = 1 m · 示意場地</span></div>
    <div class="live-strip"><div><small>球種 · 手選</small><strong id="hud-type"></strong></div><div><small>釋球速度 · 模擬</small><strong id="hud-speed"></strong></div><div><small>進壘點 x / 高度</small><strong id="hud-location"></strong></div></div>
    <div class="simulation" id="simulation" hidden><span>慢速回放</span><div class="progress"><div id="progress-fill"></div></div><b id="sim-event">釋球</b></div>
    <div class="toolbar"><button id="play" class="primary">▶ 投一球並記錄</button><button data-view="angle">全景</button><button data-view="plate">本壘近景</button><button data-view="pitcher">投手視角</button><button data-view="top">俯視</button><button data-view="side">側視</button></div>
  </section><aside class="panel"><div class="panel-tabs" role="tablist" aria-label="資料面板">
    <button data-panel="dashboard" role="tab">投球 / ABS</button><button data-panel="nodes" role="tab">設備</button><button data-panel="metrics" role="tab">數據能力</button><button data-panel="flow" role="tab">流程</button>
  </div><div class="panel-scroll">
    <section id="dashboard-panel"><span class="eyebrow">PITCH WORKBENCH</span><h2>一球，從釋球到進壘</h2><p class="lead">切換球路與邊界情境，檢視模擬球路、量測欄位與判讀結果。</p>
      <div class="pitch-types">${Object.entries(PITCHES).map(([id,p])=>`<button data-pitch="${id}" style="--pitch-color:${p.color}"><b>${id}</b><span>${p.name}</span></button>`).join('')}</div>
      <div class="input-row"><label>投球情境<select id="scenario"><option value="strike">帶內球</option><option value="ball">帶外球</option><option value="edge">邊界球</option><option value="occluded">追蹤遮擋</option></select></label><label>示範打者身高<input id="height" type="number" value="180" min="140" max="220" step="1" aria-label="示範打者身高（公分）"><small>cm · 可接球員檔案</small></label></div>
      <div class="zone-card"><div class="zone-heading"><span>本壘中間平面 · 捕手視角</span><b>SIMULATED</b></div><svg id="zone-map" viewBox="0 0 320 242" role="img" aria-label="模擬進壘點與好球帶"></svg><div id="decision" aria-live="polite"></div><div class="zone-meta" id="zone-meta"></div></div>
      <div class="metrics-grid" id="pitch-metrics"></div>
      <p class="mini-note">上方轉速是預設值，球種為手動選擇。球路由簡化運動方程產生，未模擬完整空氣力學或球縫效應。未量測的投打守欄位為空值。</p>
      <details class="rule-note"><summary>判定規則與品質條件</summary><p>示範採 MLB 2026 的身高比例與本壘中間平面：寬 43.18 cm、下緣為身高 27%、上緣為 53.5%。<a href="https://www.mlb.com/interactive/mlb-abs-system-explainer" target="_blank" rel="noopener">規則參考 ↗</a></p><p>本 Demo 以球心圓截面與矩形相交示範。球半徑 3.66 cm；假設位置不確定度半徑 12 mm（非實測）。邊界或追蹤失效顯示待覆核；並非完整官方判決演算法或 CPBL 規則。</p></details>
      <div class="section-heading record-heading"><span>本機逐球記錄</span><small id="record-count"></small></div><div id="record-list"></div>
      <div class="export-row"><button id="export-json">匯出 JSON</button><button id="export-csv">匯出 CSV</button></div><p class="mini-note" id="storage-note"></p>
    </section>
    <section id="nodes-panel" hidden><span class="eyebrow" id="phase-tag"></span><h2 id="phase-name"></h2><p class="lead" id="phase-desc"></p><div class="disclaimer">場內淨空：相機、雷達、機櫃與固定支架均配置於示意活動區外；界外區也可能是球員活動區。支架代表待場勘確認的剛性結構，不能固定在柔性網面。線材沿場外線槽，避免跨越動線。<br>點「活動區界線」查看範圍；綠色圓環為設備投影示意，不是核准安全距離。</div><div class="section-heading"><span>場景節點</span><small id="node-count"></small></div><div id="node-list"></div><article id="detail" class="detail"></article></section>
    <section id="metrics-panel" hidden>${capabilityHTML()}</section>
    <section id="flow-panel" hidden><span class="eyebrow">FROM SENSORS TO INSIGHT</span><h2>可回放的資料流程</h2><p class="lead">每筆輸出都需保留來源、事件 ID、校正／模型版本與品質狀態。示範網站目前沒有硬體連線。</p>
      <div class="flow-list">
      <div><small>01 / ACQUIRE</small><strong>同步取樣</strong><p>全域快門影像、24 GHz I/Q、60 GHz ADC／偵測資料。硬體 trigger／PTP 對時，校正所有節點外參。</p></div>
      <div><small>02 / EDGE</small><strong>FPGA 與擷取端</strong><p>時間戳、ROI 裁切、去噪、事件緩衝。預訓練模型需量化、編譯並驗證相容的推論加速器，不能直接載入圖片運算。</p></div>
      <div><small>03 / FUSION</small><strong>研發電腦先完成演算法</strong><p>球體辨識 → 跨鏡配對 → 三角定位 → 軌跡擬合／濾波 → 雷達殘差檢查 → 不確定度與品質閘門。</p></div>
      <div><small>04 / RECORD</small><strong>事件與版本化儲存</strong><p>球種推論／人工確認、揮棒與正式記錄、ABS 規則。資料庫儲存事件，物件儲存保存影像、I/Q 與校正證據。</p></div>
      <div><small>05 / DISPLAY</small><strong>Dashboard 與數位孿生</strong><p>經授權 API／WebSocket 提供軌跡與結果。3D、表格和好球帶讀取同一筆事件；GitHub Pages 展示前端，擷取與資料庫另行部署。</p></div>
      </div><div class="disclaimer">≤ 1 秒為尚待驗證的「事件完成 → Dashboard 可見」目標，需量測 p95／p99 延遲、丟失率與負載。接球／落點尚未發生時，只能顯示帶標記的預測；完整守備結果要等事件結束。</div>
      <h3>正式 ABS 之前</h3><p class="lead">確認聯盟好球帶規則 → 獨立真值與盲測 → 晴雨／照明／遮擋測試 → 邊界球誤差分析 → 校正漂移監測 → 故障回退 → 聯盟驗收。現階段先做訓練與影子判讀。</p>
    </section>
  </div><div class="panel-foot">模擬展示 · 非實測性能或正式 ABS 判決</div></aside></div></div>`;

const field=new FieldScene($('#scene'),$('#labels'),id=>{selected=id;field.select(id);updateDetail();setPanel('nodes')});
function setPanel(name){activePanel=name;document.querySelectorAll('[data-panel]').forEach(b=>{const active=b.dataset.panel===name;b.classList.toggle('active',active);b.setAttribute('aria-selected',active)});for(const p of ['dashboard','nodes','metrics','flow'])$(`#${p}-panel`).hidden=p!==name;$('.panel-scroll').scrollTop=0}
document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>setPanel(b.dataset.panel));

function renderStage(){
  const info=stages.find(s=>s.id===stage);$('#stages').innerHTML=stages.map(s=>`<button data-stage="${s.id}" class="${s.id===stage?'active':''}"><small>${s.short}</small>${s.name}</button>`).join('');
  document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{stopPlayback();stage=b.dataset.stage;renderStage()});
  $('#site-toggle').hidden=stage!=='poc';$('#scene-toggle').hidden=stage!=='poc';
  document.querySelectorAll('[data-site]').forEach(b=>{b.classList.toggle('active',b.dataset.site===site);b.onclick=()=>{stopPlayback();site=b.dataset.site;renderStage()}});
  document.querySelectorAll('[data-scene]').forEach(b=>{b.classList.toggle('active',(b.dataset.scene==='near')===nearView);b.onclick=()=>{stopPlayback();nearView=b.dataset.scene==='near';renderStage()}});
  $('#scene-title').textContent=stage==='poc'?`${site==='lab'?'室內':'牛棚'} · ${nearView?'釋球近攝':'本壘量測'}`:info.subtitle;
  $('#phase-tag').textContent=`${info.short} / DEPLOYMENT`;$('#phase-name').textContent=info.name;$('#phase-desc').textContent=info.description;
  nodes=getNodes(stage,nearView);if(!nodes.some(n=>n.id===selected))selected=nodes[0].id;
  $('#node-count').textContent=`${nodes.length} 個示意節點`;
  $('#node-list').innerHTML=nodes.map(n=>`<button class="node" data-node="${n.id}"><i style="--c:${colors[n.type]}"></i><span><b>${n.name}</b><small>${typeNames[n.type]}</small></span><em>→</em></button>`).join('');
  document.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>{selected=b.dataset.node;field.select(selected);updateDetail()});
  field.rebuild(stage,site,nodes);field.setPitch(pitch);field.select(selected);updateDetail();
}
function updateDetail(){const n=nodes.find(n=>n.id===selected);if(!n)return;document.querySelectorAll('[data-node]').forEach(b=>b.classList.toggle('chosen',b.dataset.node===selected));const range=Math.hypot(...n.pos.map((v,i)=>v-n.target[i]));$('#detail').innerHTML=`<div class="detail-title"><i style="--c:${colors[n.type]}"></i>${n.name}</div><dl><dt>安裝位置</dt><dd>${n.place}。${n.mountKind==='cabinet'?'場外機櫃':'短支架固定；場內無落地脚架'}。</dd><dt>移位後的量測取捨</dt><dd>${n.tradeoff}</dd><dt>用途與限制</dt><dd>${n.role}</dd><dt>必須保留的原始欄位</dt><dd>${n.raw}</dd><dt>示意位置（公尺）</dt><dd>x ${n.pos[0]} · 高 ${n.pos[1]} · z ${n.pos[2]}<br>至觀測目標約 ${range.toFixed(1)} m；至活動區邊界約 ${n.clearanceM.toFixed(1)} m（中心點距離，非安全驗收）。</dd></dl>`}

const callText={STRIKE:'示範好球',BALL:'示範壞球',REVIEW:'待覆核'};
function updatePitch(){stopPlayback();pitch=makePitch(type,scenario,heightCm);field.setPitch(pitch);renderPitch()}
function renderPitch(){
  document.querySelectorAll('[data-pitch]').forEach(b=>b.classList.toggle('active',b.dataset.pitch===type));
  const r=makeRecord(pitch,stage,0),m=r.metrics;
  $('#hud-type').textContent=`${type} · ${PITCHES[type].name}`;$('#hud-speed').innerHTML=`${m.release_speed_kmh.toFixed(1)} <em>km/h</em>`;
  $('#hud-location').innerHTML=`${(m.plate_x_m*100).toFixed(1)} / ${(m.plate_height_m*100).toFixed(1)} <em>cm</em>`;
  const values=[['釋球速度',m.release_speed_kmh.toFixed(1),'km/h'],['預設轉速',m.spin_rpm,'rpm'],['飛行時間',(m.flight_time_s*1000).toFixed(0),'ms'],['垂直進壘角',m.vaa_deg.toFixed(1),'°'],['釋球延伸',m.release_extension_m.toFixed(2),'m'],['進壘速度',m.plate_speed_kmh.toFixed(1),'km/h']];
  $('#pitch-metrics').innerHTML=values.map(([name,v,unit])=>`<div><small>${name}</small><strong>${v}<em>${unit}</em></strong></div>`).join('');
  drawZone();
}
function drawZone(){
  const z=pitch.zone,scale=170,x=v=>160+v*scale,y=v=>220-v*scale;
  let svg=`<defs><pattern id="map-grid" width="17" height="17" patternUnits="userSpaceOnUse"><path d="M 17 0 L 0 0 0 17" fill="none" stroke="#8ca5b3" stroke-opacity=".10"/></pattern></defs><rect width="320" height="242" fill="url(#map-grid)"/><line x1="30" y1="220" x2="290" y2="220" stroke="#607783"/><rect x="${x(z.left)}" y="${y(z.top)}" width="${PLATE.width*scale}" height="${(z.top-z.bottom)*scale}" fill="#d9b864" fill-opacity=".07" stroke="#f5ce78" stroke-width="1.6"/>`;
  for(let i=1;i<3;i++){const xx=x(z.left+PLATE.width*i/3),yy=y(z.bottom+(z.top-z.bottom)*i/3);svg+=`<path d="M${xx} ${y(z.top)}V${y(z.bottom)} M${x(z.left)} ${yy}H${x(z.right)}" stroke="#f5ce78" stroke-opacity=".35"/>`}
  for(const h of [z.top,z.bottom])svg+=`<text x="${x(z.right)+15}" y="${y(h)+3}" fill="#9fb8c4" font-size="10">${(h*100).toFixed(1)} cm</text>`;
  const [px,py]=pitch.target,c=pitch.decision.call==='STRIKE'?'#71e6b1':pitch.decision.call==='BALL'?'#ff9a82':'#f6ce7e';
  svg+=`<circle cx="${x(px)}" cy="${y(py)}" r="${(BALL_RADIUS+pitch.decision.uncertaintyM)*scale}" fill="${c}" fill-opacity=".10" stroke="${c}" stroke-dasharray="3 3"/><circle cx="${x(px)}" cy="${y(py)}" r="${BALL_RADIUS*scale}" fill="${c}" stroke="#fff" stroke-width="1"/><path d="M123 229H197L183 239H137Z" fill="#8ea2ab" fill-opacity=".5"/><text x="12" y="18" fill="#829da9" font-size="10">球心 x ${(px*100).toFixed(1)} cm</text><text x="12" y="33" fill="#829da9" font-size="10">高度 ${(py*100).toFixed(1)} cm</text>`;
  $('#zone-map').innerHTML=svg;$('#decision').className=`decision ${pitch.decision.call.toLowerCase()}`;$('#decision').innerHTML=`<b>${callText[pitch.decision.call]}</b><span>${pitch.decision.call==='REVIEW'?(scenario==='occluded'?'追蹤品質不足':'不確定度跨越邊界'):'幾何示範 · 非正式判決'}</span>`;
  $('#zone-meta').textContent=`判定平面 z = ${z.planeZ.toFixed(4)} m · 身高 ${heightCm} cm`;
}
document.querySelectorAll('[data-pitch]').forEach(b=>b.onclick=()=>{type=b.dataset.pitch;updatePitch()});
$('#scenario').onchange=e=>{scenario=e.target.value;updatePitch()};
$('#height').onchange=e=>{heightCm=Math.max(140,Math.min(220,Number(e.target.value)||180));e.target.value=heightCm;updatePitch()};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>field.setView(b.dataset.view));
$('#light').onclick=()=>{field.setLight(!field.night);$('#light').textContent=field.night?'☾ 夜間':'☀ 日間';$('#light').setAttribute('aria-pressed',field.night)};
$('#coverage').onclick=()=>{field.showCoverage=!field.showCoverage;field.fovs.visible=field.showCoverage;$('#coverage').setAttribute('aria-pressed',field.showCoverage)};
$('#clearance').onclick=()=>{field.clearanceGroup.visible=!field.clearanceGroup.visible;$('#clearance').setAttribute('aria-pressed',field.clearanceGroup.visible)};
function syncActorControls(){
  const {pitcher,catcher}=field.actorFilters,both=pitcher&&catcher,any=pitcher||catcher;
  $('#ghost-actors').setAttribute('aria-pressed',both?'true':any?'mixed':'false');
  $('#ghost-actors').textContent=both?'◉ 恢復投捕手實體':'◉ 投捕手半透明';
  $('#fade-pitcher').checked=pitcher;$('#fade-catcher').checked=catcher;
  $('#opacity-value').textContent=`${Math.round(field.ghostOpacity*100)}%`;
  $('#filter-status').hidden=!any;$('#filter-status').textContent=`${[pitcher?'投手':'',catcher?'捕手':''].filter(Boolean).join('＋')}半透明 · 球路保持顯示`;
}
$('#ghost-actors').onclick=()=>{const enabled=!(field.actorFilters.pitcher&&field.actorFilters.catcher);field.setActorFilter('pitcher',enabled);field.setActorFilter('catcher',enabled);syncActorControls()};
for(const role of ['pitcher','catcher'])$(`#fade-${role}`).onchange=e=>{field.setActorFilter(role,e.target.checked);syncActorControls()};
$('#actor-opacity').oninput=e=>{field.setGhostOpacity(Number(e.target.value)/100);syncActorControls()};
$('#labels-toggle').onclick=()=>{field.showLabels=!field.showLabels;$('#labels-toggle').setAttribute('aria-pressed',field.showLabels)};
function stopPlayback(){playing=false;$('#play').disabled=false;$('#play').textContent='▶ 投一球並記錄';$('#simulation').hidden=true}
$('#play').onclick=()=>{playing=true;startTime=performance.now();playPitch=pitch;playStage=stage;$('#play').disabled=true;$('#play').textContent='投球回放中…';$('#simulation').hidden=false;$('#progress-fill').style.width='0%'};
field.onFrame=t=>{if(!playing)return;const u=Math.min((t-startTime)/2400,1);field.moveBall(u);$('#progress-fill').style.width=`${u*100}%`;$('#sim-event').textContent=u<.14?'釋球':u<.95?'飛行中':'通過判定平面';if(u===1){records.push(makeRecord(playPitch,playStage,records.length+1));records=records.slice(-60);try{localStorage.setItem('fieldlab-demo-v2',JSON.stringify(records))}catch{storageAvailable=false}stopPlayback();renderRecords()}};
function renderRecords(){
  $('#record-count').textContent=`${records.length} 球 · 模擬`;
  $('#record-list').innerHTML=records.length?`<table class="record-table"><thead><tr><th>#</th><th>球種</th><th>km/h</th><th>判讀</th></tr></thead><tbody>${records.slice(-6).reverse().map((r,i)=>`<tr><td>${records.length-i}</td><td>${r.pitch_type.label}</td><td>${r.metrics.release_speed_kmh.toFixed(1)}</td><td class="${r.abs.call.toLowerCase()}">${callText[r.abs.call]}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-records">按「投一球並記錄」開始。每球含軌跡取樣、球種來源、規則與品質欄位。</div>';
  $('#storage-note').textContent=storageAvailable?'最近 60 球只保存在此瀏覽器。JSON 含完整模擬軌跡；CSV 為逐球摘要。未接資料庫或感測器。':'瀏覽器儲存不可用；記錄暫存在記憶體，離開前請匯出。';
  $('#export-json').disabled=$('#export-csv').disabled=!records.length;
}
function download(text,name,mime){const url=URL.createObjectURL(new Blob([text],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('#export-json').onclick=()=>download(JSON.stringify({source:'synthetic',export_version:2,records},null,2),'fieldlab-demo-pitches.json','application/json');
$('#export-csv').onclick=()=>{
  const keys=['id','source','type','type_source','release_speed_kmh','spin_rpm','spin_source','plate_x_m','plate_height_m','plane_z_m','vaa_deg','call','uncertainty_m'];
  const rows=records.map(r=>[r.id,r.source,r.pitch_type.label,r.pitch_type.source,r.metrics.release_speed_kmh.toFixed(3),r.metrics.spin_rpm,r.metrics.spin_source,r.metrics.plate_x_m,r.metrics.plate_height_m,r.metrics.plate_plane_z_m,r.metrics.vaa_deg.toFixed(3),r.abs.call,r.abs.uncertaintyM]);
  download('\uFEFF'+[keys,...rows].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n'),'fieldlab-demo-pitches.csv','text/csv;charset=utf-8');
};
renderStage();renderPitch();renderRecords();setPanel(activePanel);
