import './style.css';
import './workbench.css';
import './actor-controls.css';
import './planning.css';
import { PLAN } from './plan.js';
import { buyStages, getPurchaseNodes, parsePlanHash } from './procurement.js';
import { buySpinHTML, buyFlowHTML } from './procurement-ui.js';
import { spinHTML, flowHTML, sourceLink } from './planning-ui.js';
import { opticsEstimate, observationGeometry, syntheticAxes, toWorld } from './optics.js';
import { stages, colors, typeNames, getNodes } from './nodes.js';
import { PITCHES, PLATE, BALL_RADIUS, makePitch, makeRecord } from './pitch.js';
import { capabilityHTML } from './capabilities.js';
import { fullFieldHTML, setupFullFieldPanel } from './fullfield.js';
import { FieldScene } from './scene.js';

const $=s=>document.querySelector(s);
const panels=['dashboard','nodes','fullfield','spin','metrics','flow'];
const requestedRoute=parsePlanHash(location.hash);
const requested={...requestedRoute,panel:requestedRoute.panel==='plan'?'nodes':requestedRoute.panel};
let variant=requested.variant,stage=requested.stage,site='pen',nearView=false,selected='cam-c',activePanel=requested.panel;
const options={fpga:false,radar60:false};
let type='FF',scenario='strike',heightCm=180,playing=false,startTime=0,playPitch=null,playStage=null,playVariant=null;
let records=[],storageAvailable=true;
try { const stored=JSON.parse(localStorage.getItem('fieldlab-demo-v2')||'[]');records=Array.isArray(stored)?stored.filter(r=>r?.schema_version==='demo-pitch/2.0'&&r.source==='synthetic'&&Object.hasOwn(PITCHES,r.pitch_type?.label)&&Number.isFinite(r.metrics?.release_speed_kmh)&&['STRIKE','BALL','REVIEW'].includes(r.abs?.call)).slice(-60):[]; }catch{storageAvailable=false}
const activeNodes=()=>variant==='buy'?getPurchaseNodes(stage):getNodes(stage,nearView,options);
let pitch=makePitch(type,scenario,heightCm),nodes=activeNodes();

$('#app').innerHTML=`<div class="app" data-plan-version="${PLAN.version}" data-variant="${variant}">
  <header class="topbar"><div class="identity"><div class="mark">◈</div><div><span class="overline">FIELD LAB / DIGITAL TWIN</span><h1>棒球數位孿生</h1></div></div>
    <div class="header-note"><span class="signal"></span>設備位置與基本理論 · 模擬資料</div><a class="source-link" href="https://github.com/ahhshiba/baseball-digital-twin-demo" target="_blank" rel="noopener">GitHub ↗</a></header>
  <div class="stagebar"><div class="solution-switch" role="group" aria-label="方案版本"><button data-variant="build" aria-pressed="false"><b>A 自研量測</b><span>開放感測器＋自研演算法</span></button><button data-variant="buy" aria-pressed="false"><b>B 成品應用</b><span>購買整機＋授權資料整合</span></button><p id="variant-note"></p></div><div class="stagebar-label">部署情境<span>STAGES</span></div><div class="stage-buttons" id="stages"></div>
    <div class="site-toggle" id="site-toggle" hidden><button data-site="lab">室內</button><button data-site="pen">牛棚</button></div>
    <div class="site-toggle" id="scene-toggle" hidden><button data-scene="near">球縫觀測區</button><button data-scene="plate">本壘量測</button></div>
    <span class="stage-note">0.8 秒：取樣 → 畫面 · 工程目標</span></div>
  <div class="main"><section class="viewport" aria-label="互動三維球場">
    <div id="scene"></div><div id="labels"></div>
    <div class="scene-caption"><span class="eyebrow">INTERACTIVE FIELD VIEW</span><strong id="scene-title"></strong><span class="plan-line">球路、旋轉與人物追蹤示意</span><span>拖曳旋轉 · 滾輪縮放 · 點選設備</span></div>
    <div class="scene-options"><button id="light" title="切換日夜" aria-pressed="false">☀ 日間</button><button id="coverage" aria-pressed="false">視野示意</button><button id="clearance" aria-pressed="false">活動區界線</button><button id="labels-toggle" aria-pressed="true">設備標籤</button></div>
    <div class="actor-tools"><button id="ghost-actors" aria-pressed="false" title="一鍵切換投手與捕手半透明">◉ 投捕手半透明</button><details id="actor-filter-options"><summary>過濾設定</summary><div class="actor-filter-body"><label><input type="checkbox" id="fade-pitcher">投手半透明</label><label><input type="checkbox" id="fade-catcher">捕手半透明</label><label class="opacity-control" for="actor-opacity">人物不透明度 <output id="opacity-value">25%</output></label><input id="actor-opacity" type="range" min="10" max="60" step="5" value="25"><small>僅影響畫面，球路與記錄不變。</small></div></details></div>
    <div id="filter-status" class="filter-status" hidden aria-live="polite"></div>
    <div class="spin-tools"><button id="axis-toggle" aria-pressed="true">模擬轉軸</button><button id="measurement-zone" aria-pressed="true">球縫觀測區</button><button id="spin-focus">聚焦旋轉區</button></div><div class="scene-stamp">CONCEPT VENUE <span>1 unit = 1 m · 示意場地</span></div>
    <div class="live-strip"><div><small>球種 · 手選</small><strong id="hud-type"></strong></div><div><small>釋球速度 · 模擬</small><strong id="hud-speed"></strong></div><div><small>進壘點 x / 高度</small><strong id="hud-location"></strong></div></div>
    <div class="simulation" id="simulation" hidden><span>慢速回放</span><div class="progress"><div id="progress-fill"></div></div><b id="sim-event">釋球</b></div>
    <div class="toolbar"><button id="play" class="primary">▶ 投一球並記錄</button><button data-view="angle">全景</button><button data-view="plate">本壘近景</button><button data-view="pitcher">投手視角</button><button data-view="top">俯視</button><button data-view="side">側視</button></div>
  </section><aside class="panel"><div class="panel-tabs" role="tablist" aria-label="資料面板">
    <button data-panel="dashboard" role="tab">投球 / ABS</button><button data-panel="nodes" role="tab">設備配置</button><button data-panel="fullfield" role="tab">全場追蹤</button><button data-panel="spin" role="tab">直接旋轉</button><button data-panel="metrics" role="tab">數據能力</button><button data-panel="flow" role="tab">0.8秒流程</button>
  </div><div class="panel-scroll"><div id="stage-brief" hidden></div>
    <section id="dashboard-panel"><span class="eyebrow">PITCH WORKBENCH</span><h2>一球，從釋球到進壘</h2><p class="lead">切換球路與邊界情境，檢視模擬球路、量測欄位與判讀結果。</p>
      <div class="pitch-types">${Object.entries(PITCHES).map(([id,p])=>`<button data-pitch="${id}" style="--pitch-color:${p.color}"><b>${id}</b><span>${p.name}</span></button>`).join('')}</div>
      <div class="input-row"><label>投球情境<select id="scenario"><option value="strike">帶內球</option><option value="ball">帶外球</option><option value="edge">邊界球</option><option value="occluded">追蹤遮擋</option></select></label><label>示範打者身高<input id="height" type="number" value="180" min="140" max="220" step="1" aria-label="示範打者身高（公分）"><small>cm · 可接球員檔案</small></label></div>
      <div class="zone-card"><div class="zone-heading"><span>本壘中間平面 · 捕手視角</span><b>SIMULATED</b></div><svg id="zone-map" viewBox="0 0 320 242" role="img" aria-label="模擬進壘點與好球帶"></svg><div id="decision" aria-live="polite"></div><div class="zone-meta" id="zone-meta"></div></div>
      <div class="metrics-grid" id="pitch-metrics"></div>
      <p class="mini-note">上方轉速與紫色三維軸皆是合成預設，實測旋轉仍為空值；一期目標必須直接量測。球種為手動選擇。球路由簡化運動方程產生，未模擬完整空氣力學或球縫效應。未量測的投打守欄位為空值。</p>
      <details class="rule-note"><summary>判定規則與品質條件</summary><p>示範採 MLB 2026 的身高比例與本壘中間平面：寬 43.18 cm、下緣為身高 27%、上緣為 53.5%。<a href="https://www.mlb.com/interactive/mlb-abs-system-explainer" target="_blank" rel="noopener">規則參考 ↗</a></p><p>本 Demo 以球心圓截面與矩形相交示範。球半徑 3.66 cm；假設位置不確定度半徑 12 mm（非實測）。邊界或追蹤失效顯示待覆核；並非完整官方判決演算法或 CPBL 規則。</p></details>
      <div class="section-heading record-heading"><span>本機逐球記錄</span><small id="record-count"></small></div><div id="record-list"></div>
      <div class="export-row"><button id="export-json">匯出 JSON</button><button id="export-csv">匯出 CSV</button></div><p class="mini-note" id="storage-note"></p>
    </section>
    <section id="nodes-panel" hidden><span class="eyebrow" id="phase-tag"></span><h2 id="phase-name"></h2><p class="lead" id="phase-desc"></p><div class="section-heading"><span>場景節點</span><small id="node-count"></small></div><div id="node-list"></div><article id="detail" class="detail"></article></section>
    <section id="fullfield-panel" hidden>${fullFieldHTML()}</section>
    <section id="metrics-panel" hidden><p id="metrics-variant" class="disclaimer"></p>${capabilityHTML()}</section>
    <section id="spin-panel" hidden><div data-version-content="build">${spinHTML()}</div><div data-version-content="buy" hidden>${buySpinHTML()}</div></section>
    <section id="flow-panel" hidden><div data-version-content="build">${flowHTML()}</div><div data-version-content="buy" hidden>${buyFlowHTML()}</div></section>
  </div><div class="panel-foot">設備位置概念展示 · 模擬資料 · 未連感測器 / 非正式ABS</div></aside></div></div>`;

const field=new FieldScene($('#scene'),$('#labels'),id=>{selected=id;field.select(id);updateDetail();setPanel('nodes')});
setupFullFieldPanel();
function setPanel(name){
  if(!panels.includes(name))return;activePanel=name;
  document.querySelectorAll('[data-panel]').forEach(b=>{const active=b.dataset.panel===name;b.classList.toggle('active',active);b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1;b.id='tab-'+b.dataset.panel;b.setAttribute('aria-controls',b.dataset.panel+'-panel')});
  for(const p of panels){const section=$(`#${p}-panel`);section.hidden=p!==name;section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby','tab-'+p)}
  $('.panel-scroll').scrollTop=0;history.replaceState(null,'',`#${variant}/${stage}/${name}`);
}
document.querySelectorAll('[data-panel]').forEach(b=>{
  b.onclick=()=>setPanel(b.dataset.panel);
  b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=panels.indexOf(b.dataset.panel),j=e.key==='Home'?0:e.key==='End'?panels.length-1:(i+(e.key==='ArrowRight'?1:-1)+panels.length)%panels.length;setPanel(panels[j]);document.querySelector(`[data-panel="${panels[j]}"]`).focus()};
});
document.querySelectorAll('button[data-variant]').forEach(b=>b.onclick=()=>{
  stopPlayback();variant=b.dataset.variant;renderStage();setPanel(activePanel);
});
window.addEventListener('hashchange',()=>{
  const route=parsePlanHash(location.hash);stopPlayback();variant=route.variant;stage=route.stage;activePanel=route.panel==='plan'?'nodes':route.panel;renderStage();setPanel(activePanel);
});
for(const id of ['camera','mode','focal','exposure','speed','rpm'])$(`#optics-${id}`).addEventListener('input',renderOptics);
$('#axis-toggle').onclick=()=>{field.showSpinAxis=!field.showSpinAxis;field.spinAxis.visible=field.showSpinAxis;$('#axis-toggle').setAttribute('aria-pressed',field.showSpinAxis)};
$('#measurement-zone').onclick=()=>{field.measurementZone.visible=!field.measurementZone.visible;$('#measurement-zone').setAttribute('aria-pressed',field.measurementZone.visible)};
$('#spin-focus').onclick=()=>{field.setView('spin');setPanel('spin')};
function renderStage(){
  const buying=variant==='buy',activeStages=buying?buyStages:stages,info=activeStages.find(s=>s.id===stage);
  $('.app').dataset.variant=variant;
  document.querySelectorAll('button[data-variant]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.variant===variant));
  document.querySelectorAll('[data-version-content]').forEach(el=>el.hidden=el.dataset.versionContent!==variant);
  $('#variant-note').textContent=buying?'成品解算結果 ≠ 開放raw；目前無全部硬需求達標保證':'買開放感測器、自研核心量測；不是低價自製RF晶片/整機';
  $('.plan-line').textContent='球路、旋轉與人物追蹤示意';
  $('.stage-note').textContent=buying?'800ms仍是需求，成品API未證明符合':'0.8 秒：取樣 → 畫面 · 工程目標';
  $('#metrics-variant').textContent=buying?'B版：下列為共同資料需求，不代表成品已輸出所有欄位。未授權raw、缺失3D軸、場外事件一律留空。':'A版：由L0/L1自行完成量測；計畫預算不是精度或完整投打守的交付保證。';
  $('[data-panel="flow"]').textContent=buying?'成品介接':'0.8秒流程';
  $('[data-panel="spin"]').textContent=buying?'旋轉驗收':'直接旋轉';
  $('#measurement-zone').disabled=$('#spin-focus').disabled=buying;
  field.measurementZone.visible=!buying&&$('#measurement-zone').getAttribute('aria-pressed')==='true';
  $('#stages').innerHTML=activeStages.map(s=>`<button data-stage="${s.id}" aria-pressed="${s.id===stage}" class="${s.id===stage?'active':''}"><small>${s.short}</small>${s.name}</button>`).join('');
  document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{stopPlayback();stage=b.dataset.stage;renderStage();setPanel(activePanel)});
  $('#site-toggle').hidden=stage!=='poc';$('#scene-toggle').hidden=buying||!['poc','bullpen'].includes(stage);
  document.querySelectorAll('[data-site]').forEach(b=>{b.classList.toggle('active',b.dataset.site===site);b.onclick=()=>{stopPlayback();site=b.dataset.site;renderStage()}});
  document.querySelectorAll('[data-scene]').forEach(b=>{b.onclick=()=>{nearView=b.dataset.scene==='near';field.setView(nearView?'spin':'plate')}});
  $('#scene-title').textContent=buying?info.subtitle:stage==='poc'?`${site==='lab'?'室內':'牛棚'} · 一期直接旋轉 PoC`:info.subtitle;
  $('#stage-brief').innerHTML=`<small>PLAN v${PLAN.version} / ${buying?'B成品':'A自研'} / ${info.short} / ${info.timing}</small><strong>${info.budget}</strong><p>${buying?'B1公開feed約iPad後3秒目標 · 非800ms · 不是raw':stage==='poc'||stage==='bullpen'?'直接旋轉一期必驗 · 工程預留非報價 · 尚未實測':'全場球員／守備研究 · 合成展示 · 尚未實測'}</p>`;
  $('#phase-tag').textContent=`${info.short} / ${buying?'PURCHASED':'SELF-DEVELOPED'}`;$('#phase-name').textContent=info.name;$('#phase-desc').textContent=buying?'成品設備場外安裝示意':stage==='poc'?'投捕區量測設備位置示意':stage==='bullpen'?'牛棚量測設備位置示意':'場外相機與追蹤節點示意';
  nodes=activeNodes();if(!nodes.some(n=>n.id===selected))selected=nodes[0].id;
  const sensorCount=nodes.filter(n=>['camera','spin','radar24','radar60','vendor'].includes(n.type)).length;
  $('#node-count').textContent=buying?'1 整合式量測系統 / 1 應用節點':`${sensorCount} 感測來源 / ${nodes.length} 設備盒體`;
  $('#node-list').innerHTML=nodes.map(n=>`<button class="node" data-node="${n.id}"><i style="--c:${colors[n.type]}"></i><span><b>${n.name}</b><small class="${n.required?'':'node-option'}">${typeNames[n.type]}${n.required?'':' · 待驗擴充'}</small></span><em>→</em></button>`).join('');
  document.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>{selected=b.dataset.node;field.select(selected);updateDetail()});
  field.rebuild(stage,site,nodes);field.setPitch(pitch);field.select(selected);updateDetail();renderOptics();
}
function updateDetail(){
  const n=nodes.find(n=>n.id===selected);if(!n)return;
  document.querySelectorAll('[data-node]').forEach(b=>b.classList.toggle('chosen',b.dataset.node===selected));
  const range=Math.hypot(...n.pos.map((v,i)=>v-n.target[i])),world=toWorld(n.pos);
  $('#detail').innerHTML=`<div class="detail-title"><i style="--c:${colors[n.type]}"></i>${n.name}</div><p class="node-model">${n.model}</p><dl><dt>安裝位置</dt><dd>${n.place}。${n.mountKind==='cabinet'?'場外可維護盒體':'短支架固定；場內無落地腳架'}。</dd><dt>移位後的量測取捨</dt><dd>${n.tradeoff}</dd><dt>用途與限制</dt><dd>${n.role}</dd><dt>原始資料 / 統一封套</dt><dd>${n.raw}</dd><dt>場景座標（公尺）</dt><dd>x ${n.pos[0]} · 高 ${n.pos[1]} · z ${n.pos[2]}<br>計畫world [x,y,z] = [${world.map(v=>v.toFixed(1)).join(', ')}]<br>觀測距離約 ${range.toFixed(1)} m；距活動區邊界約 ${n.clearanceM.toFixed(1)} m（非安全核准距離）。</dd></dl>${n.source?`<div class="reference-links">${sourceLink(n.source)}</div>`:''}${n.type==='spin'?'<div class="export-row"><button id="inspect-spin">檢查球像 / 曝光 / 幀數 →</button></div>':''}`;
  if(n.type==='spin'){$('#optics-camera').value=n.id;renderOptics();$('#inspect-spin').onclick=()=>{setPanel('spin');field.setView('spin')}};
}
function renderSpin(){
  $('#spin-axis-vector').textContent='['+syntheticAxes[type].map(v=>v.toFixed(3)).join(', ')+']';
  $('#spin-preset-label').textContent=`${type} · ${PITCHES[type].rpm}rpm · world座標 · 非實測`;
}
function renderOptics(){
  const n=nodes.find(n=>n.id===$('#optics-camera').value);if(!n)return;
  const read=(id,min,max,fallback)=>Math.max(min,Math.min(max,Number($(id).value)||fallback));
  const geometry=observationGeometry(n),roi=$('#optics-mode').value==='roi';
  const values=opticsEstimate({...geometry,focalMm:read('#optics-focal',8,300,50),exposureUs:read('#optics-exposure',4,100,5),speedMps:read('#optics-speed',20,55,55),rpm:read('#optics-rpm',500,3500,3000),width:roi?320:720,fps:roi?997:522});
  $('#optics-geometry').textContent=`${n.name} → 觀測區 ${geometry.distanceM.toFixed(2)}m；橫向速度比例 ${geometry.transverseFactor.toFixed(2)}。假設直線沿投球方向，球徑73mm、像素6.9μm。`;
  const tiles=[['球徑像素',values.ballPx.toFixed(1),'px'],['水平視野',values.fovM.toFixed(2),'m'],['平移拖影',values.blurPx.toFixed(2),'px'],['可見影格',values.frames===null?'—':values.frames.toFixed(1),'張']];
  $('#optics-results').innerHTML=tiles.map(([name,value,unit])=>`<div><small>${name}</small><strong>${value}<em>${unit}</em></strong></div>`).join('');
  $('#optics-warnings').classList.toggle('neutral',!values.warnings.length);
  $('#optics-warnings').innerHTML=values.warnings.length?`<ul>${values.warnings.map(s=>`<li>${s}</li>`).join('')}</ul>`:'<p>簡化幾何門檻未觸發警告；仍需球縫對比、景深、姿態歧義與未標記實球盲測，不能據此判定達標。</p>';
  $('#optics-warnings').innerHTML+=`<p>含球面旋轉的保守拖影估計 ${values.conservativeBlurPx.toFixed(2)}px；每圈 ${values.framesPerRev.toFixed(1)}張，不代表球在視野內待滿一圈。</p>`;
}

const callText={STRIKE:'示範好球',BALL:'示範壞球',REVIEW:'待覆核'};
function updatePitch(){stopPlayback();pitch=makePitch(type,scenario,heightCm);field.setPitch(pitch);renderPitch()}
function renderPitch(){
  document.querySelectorAll('[data-pitch]').forEach(b=>b.classList.toggle('active',b.dataset.pitch===type));
  const r=makeRecord(pitch,stage,0),m=r.metrics;
  $('#hud-type').textContent=`${type} · ${PITCHES[type].name}`;$('#hud-speed').innerHTML=`${m.release_speed_kmh.toFixed(1)} <em>km/h</em>`;
  $('#hud-location').innerHTML=`${(m.plate_x_m*100).toFixed(1)} / ${(m.plate_height_m*100).toFixed(1)} <em>cm</em>`;
  const values=[['釋球速度',m.release_speed_kmh.toFixed(1),'km/h'],['預設轉速',m.spin_rpm,'rpm'],['飛行時間',(m.flight_time_s*1000).toFixed(0),'ms'],['垂直進壘角',m.vaa_deg.toFixed(1),'°'],['釋球延伸',m.release_extension_m.toFixed(2),'m'],['進壘速度',m.plate_speed_kmh.toFixed(1),'km/h']];
  $('#pitch-metrics').innerHTML=values.map(([name,v,unit])=>`<div><small>${name}</small><strong>${v}<em>${unit}</em></strong></div>`).join('');
  drawZone();renderSpin();
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
$('#play').onclick=()=>{playing=true;startTime=performance.now();playPitch=pitch;playStage=stage;playVariant=variant;$('#play').disabled=true;$('#play').textContent='投球回放中…';$('#simulation').hidden=false;$('#progress-fill').style.width='0%'};
field.onFrame=t=>{if(!playing)return;const u=Math.min((t-startTime)/2400,1);field.moveBall(u);$('#progress-fill').style.width=`${u*100}%`;$('#sim-event').textContent=u<.14?'釋球':u<.95?'飛行中':'通過判定平面';if(u===1){records.push(makeRecord(playPitch,playStage,records.length+1,playVariant));records=records.slice(-60);try{localStorage.setItem('fieldlab-demo-v2',JSON.stringify(records))}catch{storageAvailable=false}stopPlayback();renderRecords()}};
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
