// Short public explanations. Each card can point the 3D view at the devices it describes.
// Full derivations, error budgets and acceptance criteria are in the v4.2 PDF.
export const theoryCards = [
  {id:'frame',title:'座標與場地',
    text:'原點在本壘後尖端，x向右、y朝投手、z向上（公尺）。3D畫面使用 y 朝上，兩者以固定旋轉互換，所有設備座標都用同一套。',
    formula:'world [x, y, z] → 畫面 [x, z, −y]',action:{view:'top',label:'俯視看座標'}},
  {id:'stereo',title:'雙相機三角定位',
    text:'兩台球路相機在同一時刻各看到球的一個像素位置，兩條視線的交會點就是球的3D位置；逐幀連起來就是球路與進壘點。',
    formula:'[u, v, 1] ∝ K · (R·P + t)　→　求讓兩台重投影誤差最小的 P',action:{select:'cam-a',coverage:true,label:'看T1／T2視野'}},
  {id:'spin',title:'球縫直接量轉速與轉軸',
    text:'高速相機以微秒級曝光拍下球縫，比較相鄰影格球體姿態的變化，直接得到角速度；兩個視角可分辨轉軸的正反方向。不是從球路彎曲反推。',
    formula:'ΔR = R₍ₖ₊₁₎·R₍ₖ₎ᵀ　ω = log(ΔR)/Δt<br>rpm = 60‖ω‖/2π　轉軸 = ω/‖ω‖',action:{select:'cam-c',view:'spin',label:'看球縫觀測區'}},
  {id:'radar',title:'24 GHz 都卜勒雷達',
    text:'球朝雷達移動時，反射波頻率會偏移。偏移量只反映沿雷達視線的速度分量，因此用來與相機球路交叉比對，而不是單獨給出3D球路或轉軸。',
    formula:'f_d = 2·v_r / λ　（24 GHz：λ ≈ 12.5 mm，40 m/s → 6.4 kHz）',action:{select:'r24',label:'看雷達位置'}},
  {id:'sync',title:'同步曝光與補光',
    text:'球速55 m/s時，兩台相機只要差1 ms，球就差55 mm。同步盒讓所有相機同一時刻曝光並記錄時間戳；脈衝補光讓極短曝光仍然夠亮。',
    formula:'位置誤差 ≈ 球速 × 時間差　55 m/s × 1 ms = 55 mm',action:{select:'sync',label:'看同步盒'}},
  {id:'abs',title:'好球帶判定',
    text:'取球心通過本壘中間平面的位置，與依打者身高決定的好球帶比較。球有半徑，所以邊角用「圓角」判斷；太接近邊界或追蹤品質不足時標為待覆核。',
    formula:'球觸及好球帶 ⇔ 球心到矩形的距離 ≤ 球半徑（3.66 cm）',action:{view:'plate',label:'看本壘近景'}},
  {id:'players',title:'全場球員追蹤',
    text:'高處廣角相機追蹤場上13人（9守備＋打者＋最多3跑者）。軌跡編號與球員身分分開記錄：交錯或被擋住時保留軌跡，身分標為待覆核，不自動補名。',
    formula:'60 m 寬畫面、2448 像素 → 棒球只有約 3 px，追球需另設專用相機',action:{scene:'full',panel:'replay',label:'看全場回放'}},
  {id:'latency',title:'取樣到畫面 ≤ 0.8 秒',
    text:'從最早被使用的那一格曝光開始計時，經過傳輸、解算、融合，到螢幕實際亮出結果，總共不超過0.8秒。原始影像留在場邊主機，只把結果送到畫面。',
    formula:'觀測窗 → 讀出 → 前處理 → 旋轉解算 → 融合 → 傳輸 → 顯示',bar:[205,50,90,180,40,40,40,155],action:{select:'edge',label:'看場邊主機'}},
];
export function theoryHTML(){
  const colors=['#b39bf2','#689ff2','#60c6d3','#bc93e0','#66c9a3','#c1c97a','#efb969','#607c90'];
  return `<div class="theory-list">${theoryCards.map((c,i)=>`<article class="theory-card" id="theory-${c.id}"><div class="theory-head"><span>${String(i+1).padStart(2,'0')}</span><h3>${c.title}</h3></div><p>${c.text}</p><div class="formula-card">${c.formula}</div>${c.bar?`<div class="latency-segments">${c.bar.map((ms,k)=>`<span style="flex:${ms};background:${colors[k]}"></span>`).join('')}</div>`:''}<button type="button" class="theory-action" data-theory="${c.id}">${c.action.label} →</button></article>`).join('')}</div>`;
}
