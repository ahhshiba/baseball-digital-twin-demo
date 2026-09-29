import './style.css';
import './workbench.css';
import './actor-controls.css';
import './planning.css';
import './fullfield.css';
import { toWorld, toScene } from './optics.js';
import { colors, typeNames, getNodes, groups } from './nodes.js';
import { PITCHES, PLATE, BALL_RADIUS, makePitch, makeRecord } from './pitch.js';
import { fieldingScenarios, FRAMES, DT, outcomeView, eventsUntil } from './fielding.js';
import { parseRoute, PANELS, sceneInfo, SCENES } from './route.js';
import { theoryHTML, theoryCards } from './theory.js';
import { FieldScene } from './scene.js';

const $=s=>document.querySelector(s);
const route=parseRoute(location.hash);
let scene=route.scene,activePanel=route.panel,selected='cam-a',nodes=[];
let type='FF',situation='strike',heightCm=180,playing=false,startTime=0,playPitch=null;
let scenarioId=fieldingScenarios[0].id,fieldFrame=0,fieldPlaying=false,fieldClock=0,lastFieldFrame=-1;
let pitch=makePitch(type,situation,heightCm);
const eventNames={pitch:'投球',contact:'擊球',flight:'飛行',ground_ball:'滾地',catch_candidate:'接球候選',possession_confirmed:'確認持球',out:'出局',throw:'傳球',reception:'接到傳球',bounce:'落地彈跳',safe:'Safe'};
const statusNames={confirmed:'確認',provisional:'暫定',review:'待覆核'};

$('#app').innerHTML=`<div class="app">
  <header class="topbar"><div class="identity"><div class="mark">◈</div><div><span class="overline">FIELD LAB / DIGITAL TWIN</span><h1>棒球數位孿生</h1></div></div>
    <nav class="scene-tabs" id="scenes" aria-label="場景">${SCENES.map(id=>`<button data-scene="${id}">${sceneInfo[id].name}</button>`).join('')}</nav>
    <div class="header-note"><span class="signal"></span>合成展示 · 未連接感測器</div><a class="source-link" href="https://github.com/ahhshiba/baseball-digital-twin-demo" target="_blank" rel="noopener">GitHub ↗</a></header>
  <div class="main"><section class="viewport" aria-label="互動三維球場">
    <div id="scene"></div><div id="labels"></div>
    <div class="scene-caption"><strong id="scene-title"></strong><span>拖曳旋轉 · 滾輪縮放 · 點選設備</span></div>
    <div class="scene-options"><button id="light" aria-pressed="false">☀ 日間</button><button id="coverage" aria-pressed="false">相機視野</button><button id="clearance" aria-pressed="false">活動區界線</button><button id="labels-toggle" aria-pressed="true">設備標籤</button><button id="axis-toggle" aria-pressed="true">轉軸示意</button></div>
    <div class="actor-tools"><button id="ghost-actors" aria-pressed="false">◉ 投捕手半透明</button><details id="actor-filter-options"><summary>設定</summary><div class="actor-filter-body"><label><input type="checkbox" id="fade-pitcher">投手半透明</label><label><input type="checkbox" id="fade-catcher">捕手半透明</label><label class="opacity-control" for="actor-opacity">不透明度 <output id="opacity-value">25%</output></label><input id="actor-opacity" type="range" min="10" max="60" step="5" value="25"><small>只改畫面，不改球路或資料。</small></div></details></div>
    <div id="filter-status" class="filter-status" hidden aria-live="polite"></div>
    <div class="live-strip"><div><small>球種</small><strong id="hud-type"></strong></div><div><small>釋球速度</small><strong id="hud-speed"></strong></div><div><small>進壘點 x / 高度</small><strong id="hud-location"></strong></div></div>
    <div class="field-timeline" id="field-timeline" hidden><button type="button" id="field-play" aria-label="播放守備回放">▶</button><button type="button" id="field-prev" aria-label="上一幀">⟨</button><button type="button" id="field-next" aria-label="下一幀">⟩</button><div class="timeline-track"><input type="range" id="field-scrub" min="0" max="${FRAMES-1}" step="1" value="0" aria-label="守備回放時間"><div id="field-ticks" class="field-ticks"></div></div><span id="field-time"></span></div>
    <div class="simulation" id="simulation" hidden><span>慢速回放</span><div class="progress"><div id="progress-fill"></div></div><b id="sim-event">釋球</b></div>
    <div class="toolbar"><button id="play" class="primary">▶ 投一球</button><button data-view="angle">全景</button><button data-view="plate">本壘</button><button data-view="pitcher">投手視角</button><button data-view="spin" class="near-only">球縫區</button><button data-view="field" class="full-only">守備視角</button><button data-view="top">俯視</button><button data-view="side">側視</button></div>
  </section><aside class="panel"><div class="panel-tabs" role="tablist" aria-label="資料面板">
    <button data-panel="nodes" role="tab">設備</button><button data-panel="theory" role="tab">原理</button><button data-panel="replay" role="tab">回放</button>
  </div><div class="panel-scroll">
    <section id="nodes-panel"><span class="eyebrow">EQUIPMENT</span><h2 id="nodes-title"></h2><p class="lead" id="nodes-count"></p><div id="node-list"></div><article id="detail" class="detail spec-sheet"></article></section>
    <section id="theory-panel" hidden><span class="eyebrow">HOW IT WORKS</span><h2>量測原理</h2><p class="lead">每張卡片可在3D中對照相關設備。完整推導與驗收標準見規劃報告PDF。</p>${theoryHTML()}</section>
    <section id="replay-panel" hidden>
      <div id="fielding-block"><span class="eyebrow">FIELDING REPLAY</span><h2>全場守備回放</h2>
        <div class="scenario-grid">${fieldingScenarios.map(s=>`<button type="button" data-scenario="${s.id}">${s.name}</button>`).join('')}</div>
        <p id="fielding-desc" class="mini-note"></p><div id="fielding-outcome" class="fielding-outcome" aria-live="polite"></div>
        <div class="fielding-filters"><label><input type="checkbox" id="show-trails" checked>移動軌跡</label><label><input type="checkbox" id="show-predicted" checked>預測落點</label></div>
        <p id="fielding-summary" class="mini-note"></p><ol id="fielding-events" class="event-list"></ol></div>
      <div id="pitch-block"><span class="eyebrow">PITCH REPLAY</span><h2>一球：釋球到進壘</h2>
        <div class="pitch-types">${Object.entries(PITCHES).map(([id,p])=>`<button data-pitch="${id}" style="--pitch-color:${p.color}"><b>${id}</b><span>${p.name}</span></button>`).join('')}</div>
        <div class="input-row"><label>情境<select id="situation"><option value="strike">帶內球</option><option value="ball">帶外球</option><option value="edge">邊界球</option><option value="occluded">追蹤遮擋</option></select></label><label>打者身高<input id="height" type="number" value="180" min="140" max="220" step="1" aria-label="打者身高（公分）"><small>cm</small></label></div>
        <div class="zone-card"><div class="zone-heading"><span>本壘中間平面 · 捕手視角</span><b>合成</b></div><svg id="zone-map" viewBox="0 0 320 242" role="img" aria-label="進壘點與好球帶"></svg><div id="decision" aria-live="polite"></div></div>
        <div class="metrics-grid" id="pitch-metrics"></div></div>
      <p class="mini-note">回放資料為程序合成，用來展示3D邏輯，不是實測結果。</p>
    </section>
  </div><div class="panel-foot">合成展示 · 設備位置為候選示意，待場勘確認</div></aside></div></div>`;

const field=new FieldScene($('#scene'),$('#labels'),id=>{selected=id;field.select(id);updateDetail();setPanel('nodes')});
const writeHash=()=>history.replaceState(null,'',`#${scene}/${activePanel}`);
function setPanel(name){
  if(!PANELS.includes(name))return;activePanel=name;
  document.querySelectorAll('[data-panel]').forEach(b=>{const on=b.dataset.panel===name;b.classList.toggle('active',on);b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;b.id='tab-'+b.dataset.panel;b.setAttribute('aria-controls',b.dataset.panel+'-panel')});
  for(const p of PANELS){const el=$(`#${p}-panel`);el.hidden=p!==name;el.setAttribute('role','tabpanel');el.setAttribute('aria-labelledby','tab-'+p)}
  $('.panel-scroll').scrollTop=0;writeHash();if(name==='replay')renderFielding(true);
}
document.querySelectorAll('[data-panel]').forEach(b=>{
  b.onclick=()=>setPanel(b.dataset.panel);
  b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=PANELS.indexOf(b.dataset.panel),j=e.key==='Home'?0:e.key==='End'?PANELS.length-1:(i+(e.key==='ArrowRight'?1:-1)+PANELS.length)%PANELS.length;setPanel(PANELS[j]);document.querySelector(`[data-panel="${PANELS[j]}"]`).focus()};
});
function setScene(id){if(!SCENES.includes(id))return;stopPlayback();pauseFielding();scene=id;renderScene();writeHash()}
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>setScene(b.dataset.scene));
window.addEventListener('hashchange',()=>{const r=parseRoute(location.hash);if(r.scene!==scene)setScene(r.scene);setPanel(r.panel)});

function renderScene(){
  const full=scene==='full';$('.app').dataset.stage=scene;
  document.querySelectorAll('[data-scene]').forEach(b=>{const on=b.dataset.scene===scene;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on)});
  $('#scene-title').textContent=sceneInfo[scene].title;
  nodes=getNodes(scene);if(!nodes.some(n=>n.id===selected))selected=nodes[0].id;
  $('#nodes-title').textContent=sceneInfo[scene].title;
  const count=t=>nodes.filter(n=>t.includes(n.type)).length;
  $('#nodes-count').textContent=`${count(['camera','spin','player'])} 台相機 · ${count(['radar24'])} 台雷達 · ${nodes.length} 項設備，全部裝在活動區外。`;
  $('#node-list').innerHTML=groups.filter(([t],i)=>groups.findIndex(g=>g[1]===groups[i][1])===i).map(([,label])=>{
    const items=nodes.filter(n=>groups.find(g=>g[0]===n.type)?.[1]===label);if(!items.length)return '';
    return `<div class="node-group"><div class="section-heading"><span>${label}</span><small>${items.length}</small></div>${items.map(n=>`<button class="node" data-node="${n.id}"><i style="--c:${n.tier==='addon'?'#e39a4c':colors[n.type]}"></i><span><b>${n.name}</b><small>${n.tier==='addon'?'追加候選 · ':''}離地 ${n.pos[1].toFixed(1)} m</small></span><em>→</em></button>`).join('')}</div>`;
  }).join('');
  document.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>{selected=b.dataset.node;field.select(selected);updateDetail()});
  field.rebuild(scene,'pen',nodes);field.setPitch(pitch);field.select(selected);updateDetail();
  $('#field-timeline').hidden=!full;$('#fielding-block').hidden=!full;lastFieldFrame=-1;renderFielding(true);
}
const relatedTheory={camera:'stereo',spin:'spin',radar24:'radar',light:'sync',sync:'sync',edge:'latency',player:'players'};
function updateDetail(){
  const n=nodes.find(n=>n.id===selected);if(!n)return;
  document.querySelectorAll('[data-node]').forEach(b=>b.classList.toggle('chosen',b.dataset.node===selected));
  const range=Math.hypot(...n.pos.map((v,i)=>v-n.target[i])),world=toWorld(n.pos),theory=relatedTheory[n.type];
  $('#detail').innerHTML=`<div class="detail-title"><i style="--c:${n.tier==='addon'?'#e39a4c':colors[n.type]}"></i>${n.name}</div><span class="type-chip">${typeNames[n.type]}</span>
    <p class="purpose">${n.purpose}</p>
    <dl><dt>候選型號</dt><dd>${n.model}</dd><dt>安裝位置</dt><dd>${n.place}</dd>
    <dt>位置</dt><dd>world (${world.map(v=>v.toFixed(1)).join(', ')}) m · 離地 ${n.pos[1].toFixed(1)} m<br>觀測距離約 ${range.toFixed(1)} m · 距活動區邊界約 ${n.clearanceM.toFixed(1)} m</dd></dl>
    ${theory?`<button type="button" class="theory-action" id="detail-theory">原理：${theoryCards.find(c=>c.id===theory).title} →</button>`:''}`;
  if(theory)$('#detail-theory').onclick=()=>{setPanel('theory');document.getElementById('theory-'+theory)?.scrollIntoView({block:'start'})};
}
document.querySelectorAll('[data-theory]').forEach(b=>b.onclick=()=>{
  const a=theoryCards.find(c=>c.id===b.dataset.theory).action;
  if(a.scene&&a.scene!==scene)setScene(a.scene);
  if(a.select&&!nodes.some(n=>n.id===a.select))setScene('bullpen');
  if(a.coverage&&!field.showCoverage)$('#coverage').click();
  if(a.select){selected=a.select;field.select(selected);updateDetail()}
  if(a.view)field.setView(a.view);
  if(a.panel)setPanel(a.panel);
});

const callText={STRIKE:'好球',BALL:'壞球',REVIEW:'待覆核'};
function updatePitch(){stopPlayback();pitch=makePitch(type,situation,heightCm);field.setPitch(pitch);renderPitch()}
function renderPitch(){
  document.querySelectorAll('[data-pitch]').forEach(b=>b.classList.toggle('active',b.dataset.pitch===type));
  const m=makeRecord(pitch,scene,0).metrics;
  $('#hud-type').textContent=`${type} · ${PITCHES[type].name}`;$('#hud-speed').innerHTML=`${m.release_speed_kmh.toFixed(1)} <em>km/h</em>`;
  $('#hud-location').innerHTML=`${(m.plate_x_m*100).toFixed(1)} / ${(m.plate_height_m*100).toFixed(1)} <em>cm</em>`;
  const values=[['釋球速度',m.release_speed_kmh.toFixed(1),'km/h'],['進壘速度',m.plate_speed_kmh.toFixed(1),'km/h'],['飛行時間',(m.flight_time_s*1000).toFixed(0),'ms'],['垂直進壘角',m.vaa_deg.toFixed(1),'°']];
  $('#pitch-metrics').innerHTML=values.map(([name,v,unit])=>`<div><small>${name}</small><strong>${v}<em>${unit}</em></strong></div>`).join('');
  drawZone();
}
function drawZone(){
  const z=pitch.zone,scale=170,x=v=>160+v*scale,y=v=>220-v*scale;
  let svg=`<defs><pattern id="map-grid" width="17" height="17" patternUnits="userSpaceOnUse"><path d="M 17 0 L 0 0 0 17" fill="none" stroke="#8ca5b3" stroke-opacity=".10"/></pattern></defs><rect width="320" height="242" fill="url(#map-grid)"/><line x1="30" y1="220" x2="290" y2="220" stroke="#607783"/><rect x="${x(z.left)}" y="${y(z.top)}" width="${PLATE.width*scale}" height="${(z.top-z.bottom)*scale}" fill="#d9b864" fill-opacity=".07" stroke="#f5ce78" stroke-width="1.6"/>`;
  for(let i=1;i<3;i++){const xx=x(z.left+PLATE.width*i/3),yy=y(z.bottom+(z.top-z.bottom)*i/3);svg+=`<path d="M${xx} ${y(z.top)}V${y(z.bottom)} M${x(z.left)} ${yy}H${x(z.right)}" stroke="#f5ce78" stroke-opacity=".35"/>`}
  for(const h of [z.top,z.bottom])svg+=`<text x="${x(z.right)+15}" y="${y(h)+3}" fill="#9fb8c4" font-size="10">${(h*100).toFixed(1)} cm</text>`;
  const [px,py]=pitch.target,c=pitch.decision.call==='STRIKE'?'#71e6b1':pitch.decision.call==='BALL'?'#ff9a82':'#f6ce7e';
  svg+=`<circle cx="${x(px)}" cy="${y(py)}" r="${(BALL_RADIUS+pitch.decision.uncertaintyM)*scale}" fill="${c}" fill-opacity=".10" stroke="${c}" stroke-dasharray="3 3"/><circle cx="${x(px)}" cy="${y(py)}" r="${BALL_RADIUS*scale}" fill="${c}" stroke="#fff" stroke-width="1"/><path d="M123 229H197L183 239H137Z" fill="#8ea2ab" fill-opacity=".5"/>`;
  $('#zone-map').innerHTML=svg;$('#decision').className=`decision ${pitch.decision.call.toLowerCase()}`;
  $('#decision').innerHTML=`<b>${callText[pitch.decision.call]}</b><span>${pitch.decision.call==='REVIEW'?(situation==='occluded'?'追蹤被遮擋，不判定':'太接近邊界'):'依球半徑的圓角判定'}</span>`;
}
document.querySelectorAll('[data-pitch]').forEach(b=>b.onclick=()=>{type=b.dataset.pitch;updatePitch()});
$('#situation').onchange=e=>{situation=e.target.value;updatePitch()};
$('#height').onchange=e=>{heightCm=Math.max(140,Math.min(220,Number(e.target.value)||180));e.target.value=heightCm;updatePitch()};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>field.setView(b.dataset.view));
$('#light').onclick=()=>{field.setLight(!field.night);$('#light').textContent=field.night?'☾ 夜間':'☀ 日間';$('#light').setAttribute('aria-pressed',field.night)};
$('#coverage').onclick=()=>{field.showCoverage=!field.showCoverage;field.fovs.visible=field.showCoverage;$('#coverage').setAttribute('aria-pressed',field.showCoverage)};
$('#clearance').onclick=()=>{field.clearanceGroup.visible=!field.clearanceGroup.visible;$('#clearance').setAttribute('aria-pressed',field.clearanceGroup.visible)};
$('#labels-toggle').onclick=()=>{field.showLabels=!field.showLabels;$('#labels-toggle').setAttribute('aria-pressed',field.showLabels)};
$('#axis-toggle').onclick=()=>{field.showSpinAxis=!field.showSpinAxis;field.spinAxis.visible=field.showSpinAxis;$('#axis-toggle').setAttribute('aria-pressed',field.showSpinAxis)};
function syncActorControls(){
  const {pitcher,catcher}=field.actorFilters,both=pitcher&&catcher,any=pitcher||catcher;
  $('#ghost-actors').setAttribute('aria-pressed',both?'true':any?'mixed':'false');$('#ghost-actors').textContent=both?'◉ 恢復投捕手':'◉ 投捕手半透明';
  $('#fade-pitcher').checked=pitcher;$('#fade-catcher').checked=catcher;$('#opacity-value').textContent=`${Math.round(field.ghostOpacity*100)}%`;
  $('#filter-status').hidden=!any;$('#filter-status').textContent=`${[pitcher?'投手':'',catcher?'捕手':''].filter(Boolean).join('＋')}半透明`;
}
$('#ghost-actors').onclick=()=>{const on=!(field.actorFilters.pitcher&&field.actorFilters.catcher);field.setActorFilter('pitcher',on);field.setActorFilter('catcher',on);syncActorControls()};
for(const role of ['pitcher','catcher'])$(`#fade-${role}`).onchange=e=>{field.setActorFilter(role,e.target.checked);syncActorControls()};
$('#actor-opacity').oninput=e=>{field.setGhostOpacity(Number(e.target.value)/100);syncActorControls()};
function stopPlayback(){playing=false;$('#play').disabled=false;$('#play').textContent='▶ 投一球';$('#simulation').hidden=true}
$('#play').onclick=()=>{pauseFielding();playing=true;startTime=performance.now();playPitch=pitch;$('#play').disabled=true;$('#play').textContent='回放中…';$('#simulation').hidden=false;$('#progress-fill').style.width='0%'};

// ---- full-field fielding replay (synthetic) ----
const currentScenario=()=>fieldingScenarios.find(s=>s.id===scenarioId);
const trailColor=p=>p.player_id===null?[1,.36,.36]:p.role==='runner'?[1,.68,.36]:[.5,.82,1];
function heading(p){
  const v=p.velocity_mps;
  if(!v||Math.hypot(v[0],v[1])<.4){const s=toScene(p.position_world_m);return Math.atan2(s[0],s[2])}
  const d=toScene(v);return Math.atan2(-d[0],-d[2]);
}
function renderFielding(force=false){
  if(scene!=='full')return;
  const sc=currentScenario(),i0=Math.floor(fieldFrame),i1=Math.min(FRAMES-1,i0+1),u=fieldFrame-i0,a=sc.frames[i0],b=sc.frames[i1],t=fieldFrame*DT,view=outcomeView(sc,t);
  const lerp=(p,q)=>p&&q?p.map((v,k)=>v+(q[k]-v)*u):p;
  const players=a.players.map((p,k)=>{const w=lerp(p.position_world_m,b.players[k].position_world_m),v=p.velocity_mps;
    return {slot:p.slot,onField:p.on_field,validity:p.validity,pos:w?toScene(w):null,heading:w?heading(p):null,speed:v?Math.hypot(v[0],v[1]):0,
      label:`${p.slot}${p.player_id===null&&p.on_field?' · 身分待覆核':''}${p.validity==='occluded'?' · 遮擋':''}`}});
  const trails=[];if($('#show-trails').checked)for(let i=1;i<=i0;i++)sc.frames[i].players.forEach((p,k)=>{const q=sc.frames[i-1].players[k];if(p.position_world_m&&q.position_world_m)trails.push([toScene(q.position_world_m).map((v,j)=>j===1?.1:v),toScene(p.position_world_m).map((v,j)=>j===1?.1:v),trailColor(p)])});
  const ball=lerp(a.ball.position_world_m,b.ball.position_world_m);
  const predicted=$('#show-predicted').checked&&t>=sc.contact_t_s&&!view.known?toScene([...sc.predicted_landing_world_m,0]):null;
  field.updateFielding({players,ball:ball?toScene(ball):null,predicted,trails});
  $('#field-scrub').value=i0;$('#field-time').textContent=`${t.toFixed(2)} s`;
  if(!force&&i0===lastFieldFrame)return;lastFieldFrame=i0;
  document.querySelectorAll('[data-scenario]').forEach(x=>x.classList.toggle('active',x.dataset.scenario===scenarioId));
  $('#fielding-desc').textContent=sc.desc;
  $('#fielding-outcome').className=`fielding-outcome ${view.known?'known':'pending'}`;
  $('#fielding-outcome').innerHTML=t<sc.contact_t_s?'<b>投球中</b><span>尚未擊球</span>':!view.known?'<b>結果尚未發生</b><span>黃色虛線圈為預測落點；接球或落地後才確定結果。</span>'
    :`<b>${{out:'出局',hit:'未接到',safe:'Safe（待覆核）'}[sc.outcome]}</b><span>${sc.outcome==='out'?'守備動作判出局，正式判決仍以記錄員為準。':'結果於事件發生後確定。'}</span>`;
  const on=a.players.filter(p=>p.on_field),n=k=>on.filter(p=>p.validity===k).length,unknown=on.filter(p=>p.player_id===null).length;
  $('#fielding-summary').textContent=`場上 ${on.length} 人 · 可見 ${on.length-n('occluded')} · 遮擋 ${n('occluded')} · 身分待覆核 ${unknown}`;
  $('#fielding-events').innerHTML=eventsUntil(sc,t).map(e=>`<li><b>${eventNames[e.type]||e.type}</b>${e.status==='confirmed'?'':` <span class="status-chip ${e.status}">${statusNames[e.status]}</span>`}<small>${e.t_s.toFixed(2)} s</small></li>`).join('')||'<li class="empty">尚無事件</li>';
  $('#field-ticks').innerHTML=sc.events.map(e=>`<i class="${e.status}" style="left:${e.t_s/((FRAMES-1)*DT)*100}%" title="${eventNames[e.type]||e.type}"></i>`).join('');
}
function pauseFielding(){fieldPlaying=false;$('#field-play').textContent='▶';$('#field-play').setAttribute('aria-label','播放守備回放')}
function playFielding(){stopPlayback();if(fieldFrame>=FRAMES-1)fieldFrame=0;fieldPlaying=true;fieldClock=performance.now()-fieldFrame*DT*1000;$('#field-play').textContent='❚❚';$('#field-play').setAttribute('aria-label','暫停守備回放')}
$('#field-play').onclick=()=>fieldPlaying?pauseFielding():playFielding();
$('#field-prev').onclick=()=>{pauseFielding();fieldFrame=Math.max(0,Math.floor(fieldFrame)-1);renderFielding()};
$('#field-next').onclick=()=>{pauseFielding();fieldFrame=Math.min(FRAMES-1,Math.floor(fieldFrame)+1);renderFielding()};
$('#field-scrub').oninput=e=>{pauseFielding();fieldFrame=Number(e.target.value);renderFielding()};
document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>{field.setView('field');scenarioId=b.dataset.scenario;fieldFrame=0;lastFieldFrame=-1;playFielding();renderFielding(true)});
for(const id of ['show-trails','show-predicted'])$('#'+id).onchange=()=>renderFielding(true);

field.onFrame=t=>{
  if(fieldPlaying){fieldFrame=Math.min(FRAMES-1,(t-fieldClock)/1000/DT);renderFielding();if(fieldFrame>=FRAMES-1)pauseFielding()}
  if(!playing)return;const u=Math.min((t-startTime)/2400,1);field.moveBall(u);$('#progress-fill').style.width=`${u*100}%`;
  $('#sim-event').textContent=u<.14?'釋球':u<.95?'飛行中':'通過判定平面';if(u===1){if(playPitch===pitch)field.moveBall(1);stopPlayback()}
};
renderScene();renderPitch();setPanel(activePanel);
