import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const stages = [
  {id:'poc',name:'概念驗證',short:'P0',subtitle:'室內測試與球路觀測',description:'少量節點，先釐清視線、同步與資料流。相機位置可在近攝與本壘情境間切換。',tag:'測試情境'},
  {id:'bullpen',name:'牛棚',short:'P1',subtitle:'固定安裝與連續測試',description:'增加本壘與投手端觀測角度，觀察遮擋、照明和日常校正。',tag:'訓練情境'},
  {id:'pilot',name:'球場局部',short:'P2',subtitle:'單一區域先導',description:'以局部球路與打擊區為例展示設備連接；不代表全場覆蓋或正式判決。',tag:'先導情境'},
  {id:'full',name:'全場概念',short:'P3',subtitle:'未驗證的擴充方向',description:'示意未來的多視角守備追蹤和可選光達節點；位置與數量仍需場勘。',tag:'研究情境'}
];
const colors={camera:'#63a9ff',radar24:'#f0a967',radar60:'#ca87e9',edge:'#60d6aa',lidar:'#f3d676'};
const label={camera:'光學相機',radar24:'24 GHz 雷達',radar60:'60 GHz 雷達',edge:'FPGA 邊緣節點',lidar:'光達（可選）'};
const node=(id,name,type,pos,target,role,how)=>({id,name,type,pos,target,role,how});
const pocNear=[
  node('cam-a','相機 A｜近攝','camera',[-2.0,1.8,-15.5],[0,1.6,-13],'球體影像與近端軌跡','與相機 B 形成雙視角；近攝為示意場景。'),
  node('cam-b','相機 B｜近攝','camera',[2.0,1.8,-15.5],[0,1.6,-13],'雙視角幾何約束','視線交會角度需要現場校正。'),
  node('r24','24 GHz｜投球軸向','radar24',[0,2.1,3.6],[0,1.4,-17],'徑向速度與事件提示','速度方向與視線夾角需校正。'),
  node('r60','60 GHz｜局部觀測','radar60',[3.5,2.1,-6],[0,1.3,-12],'近場距離與速度實驗','高速小球可偵測性需實測，不能直接當球路真值。'),
  node('edge','FPGA｜場邊','edge',[5.1,0.7,-2],[0,1,-8],'影像事件與時間戳概念','相機資料介面必須先完成相容性驗證。')
];
const pocPlate=pocNear.map(n=>n.id==='cam-a'?{...n,name:'相機 A｜本壘',pos:[-3,2.3,1.8],target:[0,1,-1],role:'本壘局部視角'}:n.id==='cam-b'?{...n,name:'相機 B｜本壘',pos:[3,2.3,1.8],target:[0,1,-1],role:'本壘局部視角'}:n);
const bullpen=[...pocPlate,
  node('cam-c','相機 C｜投手端','camera',[-3.6,2.8,-13],[0,1.4,-17],'釋球事件與遮擋備援','固定支架後量測外參。'),
  node('cam-d','相機 D｜上方','camera',[1.3,4.5,-2],[0,1,0],'本壘近場補充視角','安裝高度與安全距離需場勘。'),
  node('edge-b','FPGA｜第二分區','edge',[-5.0,0.7,1],[0,1,-1],'分區影像前處理','與其他節點共用事件時間軸。')
];
const pilot=[...bullpen,
  node('cam-e','看台相機｜一壘側','camera',[19,9,-17],[0,1,-3],'球路與打擊區補充視角','支架穩定與遮擋需場勘。'),
  node('cam-f','看台相機｜三壘側','camera',[-19,9,-17],[0,1,-3],'交叉觀測與備援','不直接代表已達正式 ABS 準度。'),
  node('r60-b','60 GHz｜打擊區','radar60',[-4,2.2,1.8],[0,1,-2],'近場雷達比較','僅在實測有幫助時納入融合。')
];
const full=[...pilot,
  node('cam-g','外野相機｜左側','camera',[-37,12,-57],[0,2,-37],'落點與守備位置概念','長距離解析度及遮擋需要另行設計。'),
  node('cam-h','外野相機｜右側','camera',[37,12,-57],[0,2,-37],'多視角守備追蹤','展示位置不代表實際球場可架設。'),
  node('lidar','光達｜內野可選','lidar',[0,6,18],[0,1,-24],'人員位置研究用途','不以一般掃描光達追蹤高速棒球。')
];
const app=$('#app');
app.innerHTML=`<div class="app"><header class="topbar"><div class="identity"><div class="mark">◈</div><div><span class="overline">PUBLIC CONCEPT DEMO</span><h1>棒球數位孿生</h1></div></div><div class="header-note"><span class="signal"></span>可互動的設備配置示意</div><a class="source-link" href="https://github.com/ahhshiba/baseball-digital-twin-demo" target="_blank" rel="noopener">GitHub 原始碼 ↗</a></header><div class="stagebar"><div class="stagebar-label">部署階段 <span>STAGES</span></div><div class="stage-buttons" id="stages"></div><div class="site-toggle" id="site-toggle"><button type="button" data-site="lab">室內場景</button><button type="button" data-site="pen">牛棚場景</button></div><div class="site-toggle" id="scene-toggle"><button type="button" data-scene="S">近攝視角</button><button type="button" data-scene="Z">本壘視角</button></div></div><div class="main"><section class="viewport"><div id="scene"></div><div id="labels"></div><div class="scene-caption"><span class="eyebrow">3D FIELD VIEW</span><strong id="scene-title"></strong><span id="scene-subtitle"></span></div><div class="legend"><div><i style="--c:#63a9ff"></i>相機</div><div><i style="--c:#f0a967"></i>24 GHz</div><div><i style="--c:#ca87e9"></i>60 GHz</div><div><i style="--c:#60d6aa"></i>FPGA</div><div><i style="--c:#f3d676"></i>光達</div></div><div class="toolbar"><button id="play" class="primary">▶ 模擬投球</button><button data-view="angle">立體</button><button data-view="side">側視</button><button data-view="top">俯視</button><button id="reset">重設視角</button></div><div class="simulation" id="simulation" hidden><span>模擬路徑</span><div class="progress"><div id="progress-fill"></div></div><b id="sim-event">釋球</b></div></section><aside class="panel"><div class="panel-tabs"><button class="active" data-panel="nodes">設備位置</button><button data-panel="flow">資料流</button></div><div class="panel-scroll"><div id="nodes-panel"><span class="eyebrow" id="phase-tag"></span><h2 id="phase-name"></h2><p class="lead" id="phase-desc"></p><div class="disclaimer">概念模型 · 非實測資料、規格承諾或正式 ABS 判決</div><div class="section-heading"><span>場景節點</span><small id="node-count"></small></div><div id="node-list"></div><article id="detail" class="detail"></article></div><div id="flow-panel" hidden><span class="eyebrow">SENSOR FUSION</span><h2>事件如何流動</h2><p class="lead">以下為架構示意。實際系統須先完成同步、校正、可觀測性與獨立驗證。</p><div class="flow-list"><div><small>01</small><strong>相機擷取</strong><p>多視角影像產生球體候選與影格時間戳。</p></div><div><small>02</small><strong>雷達輔助</strong><p>24 GHz 提供徑向速度線索；60 GHz 試驗近場距離、速度與角度。</p></div><div><small>03</small><strong>邊緣處理</strong><p>FPGA 可做區域裁切、影像前處理及事件封包，實際資料介面需驗證。</p></div><div><small>04</small><strong>融合與呈現</strong><p>對齊時間與場地座標後顯示軌跡；低信心結果應標為不可判定。</p></div></div></div></div><div class="panel-foot">示意球場與節點配置，非實際球團場地。</div></aside></div></div>`;

let stage='poc',site='lab',pocScene='S',selected='cam-a',nodes=[],pickables=[],markers=[],animateBall=false,ballStart=0;
const stageData=()=>stages.find(x=>x.id===stage);
const getNodes=()=>stage==='poc'?(pocScene==='S'?pocNear:pocPlate):stage==='bullpen'?bullpen:stage==='pilot'?pilot:full;
function renderUI(){
  $('#stages').innerHTML=stages.map(x=>`<button type="button" data-stage="${x.id}" class="${stage===x.id?'active':''}"><small>${x.short}</small>${x.name}</button>`).join('');
  document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{stage=b.dataset.stage;selected=getNodes()[0].id;renderUI();rebuild()});
  $('#site-toggle').hidden=stage!=='poc';document.querySelectorAll('[data-site]').forEach(b=>{b.classList.toggle('active',b.dataset.site===site);b.onclick=()=>{site=b.dataset.site;renderUI();rebuild()}});
  $('#scene-toggle').hidden=stage!=='poc';document.querySelectorAll('[data-scene]').forEach(b=>{b.classList.toggle('active',b.dataset.scene===pocScene);b.onclick=()=>{pocScene=b.dataset.scene;selected='cam-a';renderUI();rebuild()}});
  $('#phase-tag').textContent=stageData().tag;$('#phase-name').textContent=`${stageData().short} · ${stageData().name}`;$('#phase-desc').textContent=stageData().description;
  $('#scene-title').textContent=stageData().subtitle;$('#scene-subtitle').textContent=stage==='poc'?`${site==='lab'?'室內':'牛棚'} · ${pocScene==='S'?'近攝視角':'本壘視角'}`:'拖曳旋轉 · 點選設備';
  nodes=getNodes();$('#node-count').textContent=`${nodes.length} 個節點`;
  $('#node-list').innerHTML=nodes.map(n=>`<button class="node ${selected===n.id?'chosen':''}" data-node="${n.id}"><i style="--c:${colors[n.type]}"></i><span><b>${n.name}</b><small>${label[n.type]}</small></span><em>→</em></button>`).join('');
  document.querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>selectNode(b.dataset.node));
  updateDetail();
}
function updateDetail(){const n=nodes.find(x=>x.id===selected);if(!n)return;$('#detail').innerHTML=`<div class="detail-title"><i style="--c:${colors[n.type]}"></i><span>${n.name}</span></div><div class="detail-type">${label[n.type]}</div><dl><dt>用途</dt><dd>${n.role}</dd><dt>部署考量</dt><dd>${n.how}</dd><dt>概念位置</dt><dd>x ${n.pos[0]} m · 高 ${n.pos[1]} m · z ${n.pos[2]} m</dd></dl>`;document.querySelectorAll('[data-node]').forEach(b=>b.classList.toggle('chosen',b.dataset.node===selected));for(const m of markers)m.material.emissiveIntensity=m.userData.node.id===selected?.65:.12;}
function selectNode(id){selected=id;updateDetail()}
document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-panel]').forEach(x=>x.classList.toggle('active',x===b));$('#nodes-panel').hidden=b.dataset.panel!=='nodes';$('#flow-panel').hidden=b.dataset.panel!=='flow'});

const host=$('#scene'),scene=new THREE.Scene();scene.background=new THREE.Color('#16283c');scene.fog=new THREE.Fog('#16283c',65,230);const camera=new THREE.PerspectiveCamera(44,1,.1,400);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=7;controls.maxDistance=190;controls.target.set(0,0,-16);scene.add(new THREE.HemisphereLight('#f7fbff','#2b5941',2));const sun=new THREE.DirectionalLight('#fff6dd',2.6);sun.position.set(-25,40,28);scene.add(sun);let stageGroup=new THREE.Group();scene.add(stageGroup);const ball=new THREE.Mesh(new THREE.SphereGeometry(.28,12,10),new THREE.MeshStandardMaterial({color:'#fff6d9',emissive:'#ffdfa1',emissiveIntensity:.45}));ball.visible=false;scene.add(ball);
function mat(color,transparent=false,opacity=1){return new THREE.MeshStandardMaterial({color,roughness:.85,transparent,opacity,side:THREE.DoubleSide,depthWrite:!transparent})}
function box(w,h,d,color,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);stageGroup.add(m);return m}
function line(points,color,opacity=1){const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));stageGroup.add(l);return l}
function floor(w,d,color,z){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat(color));mesh.rotation.x=-Math.PI/2;mesh.position.set(0,-.05,z);stageGroup.add(mesh)}
function drawGround(){
  const field=stage==='pilot'||stage==='full';
  if(field){floor(220,220,'#315c49',-55);const dirt=new THREE.Mesh(new THREE.CircleGeometry(28,64),mat('#a37454'));dirt.rotation.x=-Math.PI/2;dirt.position.set(0,.01,-17);stageGroup.add(dirt);const sh=new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(19.4,19.4),new THREE.Vector2(0,38.8),new THREE.Vector2(-19.4,19.4)]);const diamond=new THREE.Mesh(new THREE.ShapeGeometry(sh),mat('#b18461'));diamond.rotation.x=-Math.PI/2;diamond.position.y=.02;stageGroup.add(diamond);line([[0,.07,0],[75,.07,-75]],'#f4eee2');line([[0,.07,0],[-75,.07,-75]],'#f4eee2');for(const [x,z] of [[0,0],[19.4,-19.4],[0,-38.8],[-19.4,-19.4]])box(.75,.05,.75,'#f7f8ef',x,.09,z)}
  else{floor(stage==='poc'&&site==='lab'?15:34,stage==='poc'&&site==='lab'?28:42,stage==='poc'&&site==='lab'?'#818c98':'#457655',-10);floor(3.8,22,'#567d61',-9);for(let z=-18;z<=0;z+=4)line([[-1.9,.01,z],[1.9,.01,z]],'#d4d9d4',.4);if(site==='lab'&&stage==='poc'){box(.14,3.5,27,'#637384',-7.5,1.75,-10);box(.14,3.5,27,'#637384',7.5,1.75,-10)}}
  box(.62,.06,.62,'#fffaf0',0,.08,0);box(.68,.12,.25,'#fff8ee',0,.16,-18.44);const grid=new THREE.GridHelper(field?160:42,field?24:20,'#47706b','#47706b');grid.position.set(0,.025,field?-35:-10);grid.material.transparent=true;grid.material.opacity=.2;stageGroup.add(grid);
  const zone=new THREE.Mesh(new THREE.BoxGeometry(.72,.95,.12),new THREE.MeshBasicMaterial({color:'#ffd76f',transparent:true,opacity:.12,depthWrite:false}));zone.position.set(0,1.13,0);stageGroup.add(zone);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(zone.geometry),new THREE.LineBasicMaterial({color:'#fbd877'}));edge.position.copy(zone.position);stageGroup.add(edge);
}
function drawNode(n){const color=colors[n.type];let geo=n.type==='camera'?new THREE.BoxGeometry(.88,.55,1.05):n.type==='edge'?new THREE.BoxGeometry(1.2,.55,.95):n.type==='lidar'?new THREE.CylinderGeometry(.4,.4,.46,14):new THREE.SphereGeometry(.5,16,12);const material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:n.id===selected?.65:.12,metalness:.12,roughness:.33});const mesh=new THREE.Mesh(geo,material);mesh.position.set(...n.pos);mesh.userData.node=n;stageGroup.add(mesh);pickables.push(mesh);markers.push(mesh);const pole=box(.075,Math.max(.05,n.pos[1]),.075,'#b0b8b9',n.pos[0],n.pos[1]/2,n.pos[2]);pole.material.transparent=true;pole.material.opacity=.45;const target=new THREE.Vector3(...n.target),origin=new THREE.Vector3(...n.pos);if(n.type!=='edge'){const dir=target.clone().sub(origin),length=dir.length();const cone=new THREE.Mesh(new THREE.ConeGeometry(Math.min(7,length*.26),length,20,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false}));cone.position.copy(origin).addScaledVector(dir,.5);cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());stageGroup.add(cone);line([n.pos,n.target],color,.3)}const pin=document.createElement('button');pin.className='pin';pin.type='button';pin.dataset.id=n.id;pin.style.setProperty('--c',color);pin.textContent=n.name;pin.onclick=()=>selectNode(n.id);$('#labels').appendChild(pin);n.pin=pin;}
function rebuild(){scene.remove(stageGroup);stageGroup=new THREE.Group();scene.add(stageGroup);pickables=[];markers=[];$('#labels').innerHTML='';drawGround();nodes.forEach(drawNode);ball.visible=false;animateBall=false;$('#simulation').hidden=true;setView('angle')}
function setView(kind){const target=stage==='pilot'||stage==='full'?new THREE.Vector3(0,0,-23):new THREE.Vector3(0,0,-10);controls.target.copy(target);if(kind==='top')camera.position.set(0,stage==='pilot'||stage==='full'?88:35,target.z+1);else if(kind==='side')camera.position.set(stage==='pilot'||stage==='full'?65:28,12,target.z+8);else camera.position.set(stage==='pilot'||stage==='full'?52:27,stage==='pilot'||stage==='full'?48:25,stage==='pilot'||stage==='full'?38:22);camera.lookAt(target);controls.update()}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('#reset').onclick=()=>setView('angle');$('#play').onclick=()=>{animateBall=true;ballStart=performance.now();ball.visible=true;$('#simulation').hidden=false;$('#sim-event').textContent='釋球';$('#progress-fill').style.width='0%'};
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();renderer.domElement.addEventListener('pointerdown',e=>{const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(pickables)[0];if(hit)selectNode(hit.object.userData.node.id)});
function frame(t){requestAnimationFrame(frame);if(animateBall){const u=Math.min((t-ballStart)/2600,1);ball.position.set(.14*Math.sin(u*5),1.78-.86*u+.13*u*u,-18.44+18.44*u);$('#progress-fill').style.width=`${Math.round(u*100)}%`;$('#sim-event').textContent=u<.18?'釋球':u<.82?'飛行中':'通過本壘';if(u===1){animateBall=false;setTimeout(()=>{ball.visible=false;$('#simulation').hidden=true},1300)}}controls.update();const rect=host.getBoundingClientRect();for(const n of nodes){if(!n.pin)continue;const p=new THREE.Vector3(...n.pos).add(new THREE.Vector3(0,.9,0)).project(camera);const visible=p.z<1&&p.z>-1&&Math.abs(p.x)<1.1&&Math.abs(p.y)<1.1;n.pin.style.display=visible?'block':'none';if(visible){n.pin.style.left=`${(p.x*.5+.5)*rect.width}px`;n.pin.style.top=`${(-p.y*.5+.5)*rect.height}px`;n.pin.classList.toggle('selected',n.id===selected)}}renderer.render(scene,camera)}
new ResizeObserver(()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight)}).observe(host);
renderUI();rebuild();requestAnimationFrame(frame);
