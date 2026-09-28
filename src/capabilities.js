export const capabilities = [
  { name: '球種與逐球身分', phase: 'P1', raw: '球員 ID、投打慣用手、球速、釋球點、位移、旋轉特徵、教練球種標註。',
    sensor: '高速同步相機＋軸向雷達；球種先人工確認，再訓練分類器。', formula: 'P(球種 | 特徵、投手)；保留模型版本、機率與人工修正。Demo 球種是手選，非 AI 辨識。' },
  { name: '球速、進壘點、VAA、延伸', phase: 'P0–P1', raw: '每筆時間戳、球心像素與半徑、相機內外參、三維球心軌跡、投手板與本壘控制點。',
    sensor: '至少兩個可用且同步的視角＋24 GHz 徑向速度輔助。', formula: 'v = dp/dt；球速 = 3.6‖v‖；VAA = atan2(vy, √(vx²+vz²))；解 z(t)=指定判定平面。' },
  { name: '轉速、三維有向轉軸、有效旋轉', phase: 'P0 一期必驗 · 不可延後', raw: '未加人工標記球的雙視角球縫影像、曝光時間戳、球體姿態 q(t)、速度向量與品質；不能只留球心。',
    sensor: 'S1/S2短曝光高速機＋兩側補光；24GHz只作速度輔助。獨立參考儀驗證，失效保留null。', formula: 'rpm = 60‖ω‖/(2π)；axis=ω/‖ω‖（右手定則）。幾何有效分量 = ‖ω × v̂‖/‖ω‖；球路反推不可替代直接量測驗收。' },
  { name: '水平／垂直位移與球路品質', phase: 'P1', raw: '完整球路、初始速度、氣象、空氣密度、比較軌跡的起訖平面與定義。',
    sensor: '投球全程多視角追蹤；氣象站可補充環境值。', formula: '位移 = 實測軌跡 − 同初始條件之基準軌跡。IVB 要排除重力並定義阻力模型；不能把總下墜當 IVB。' },
  { name: '擊球初速、仰角、方向、距離', phase: 'P2–P3', raw: '擊球時刻、擊球後三維軌跡、接球／落地／出牆時刻與位置、打者左右打。',
    sensor: '打擊區高速相機＋可追擊出球的全場相機；遠距雷達需另驗證。', formula: 'EV = 3.6‖v出球‖；LA = atan2(vy, √(vx²+vz²))；方向 = atan2(vx, −vz)。落地實距與推估飛行距離分欄。' },
  { name: '擊球分布、強擊球、Barrel', phase: 'P2＋事件', raw: '每筆 BBE 的初速、仰角、方向、球種、擊球型態、場內外與正式結果。',
    sensor: '擊球追蹤＋記錄系統／人工覆核。', formula: '比例 = 符合條件事件 / 定義好的母體；門檻、單位、缺值率、版本一起保存。Barrel 使用版本化初速－仰角分類表。' },
  { name: '揮空、追打、好球帶紀律', phase: 'P2＋事件', raw: '逐球好球數、壞球數、打席 ID、進壘位置、好球帶、揮棒／接觸／界外旗標。',
    sensor: '打擊區影像＋揮棒事件標註；僅有球路不足以判定有沒有揮棒。', formula: 'Whiff% = 揮空 / 揮棒；Zone% = 帶內球 / 有效投球。追打區與邊線區須先取得球團採用的幾何定義。' },
  { name: '打擊成績、wOBA、預期成績', phase: '事件＋模型', raw: '安打種類、BB、HBP、SF、AB、PA、K、HR、聯盟球季權重；預期數據另需訓練樣本。',
    sensor: '正式比賽記錄介接；結果不能全靠感測器推斷。', formula: 'AVG=H/AB；SLG=TB/AB；ISO=SLG−AVG；wOBA=ΣwᵢNᵢ/D。xBA/xwOBA 是經驗模型，非單一物理公式。' },
  { name: '跑壘、守備、傳球、Pop Time', phase: 'P3', raw: '全場球員 ID 與位置時間序列、球軌跡、擊球／起跑／接球／出手／觸壘時刻、成敗標籤。',
    sensor: '多台廣角全場同步相機；局部投球鏡頭無法涵蓋外野。', formula: '路徑長 = Σ‖pᵢ−pᵢ₋₁‖；自研OAA-like=Σ(yᵢ−pᵢ)，p為當地基準守備成功率，按機會/場地校準；非官方Statcast。' },
  { name: 'ABS 輔助判讀', phase: 'P1 影子測試', raw: '本壘幾何、球半徑、球心與不確定度、身高／姿態規則、同步誤差、校正版本、可回放證據。',
    sensor: '本壘交叉視角、穩固支架與獨立真值設備；雷達作交叉檢查。', formula: '指定平面上球截面與矩形相交；依規則也可能需要三維區域。品質不足／誤差跨界 → 待覆核；正式使用需聯盟規則與驗收。' },
];

export function capabilityHTML() {
  return `<span class="eyebrow">MEASUREMENT ROADMAP</span><h2>每個數據從哪裡來</h2>
    <p class="lead">一期直接旋轉必驗，其餘投打守按覆蓋擴充。所有公式下方若未特別標註，沿用3D場景座標(x右,y上,z捕手)；計畫world座標需轉換。沒有量到的欄位保留空值。</p>
    ${capabilities.map(c => `<details class="capability"><summary>${c.name}<small>${c.phase}</small></summary><dl><dt>原始資料</dt><dd>${c.raw}</dd><dt>設備／來源</dt><dd>${c.sensor}</dd><dt>計算與限制</dt><dd>${c.formula}</dd></dl></details>`).join('')}
    <div class="disclaimer">CPBL 指標需逐項確認母體、門檻、球季權重與定義。擊球仰角描述球的離棒方向，與球棒攻擊角不同；兩者要使用不同軌跡。</div>
    <div class="reference-links"><a href="https://stats.cpbl.com.tw/news/1vrRUWdz8zWv6bWMz0xiazeJUJl8q1c2lxg_uAg122hc" target="_blank" rel="noopener">CPBL 指標清單 ↗</a><a href="https://baseballsavant.mlb.com/csv-docs" target="_blank" rel="noopener">Statcast 欄位定義 ↗</a><a href="https://www.mlb.com/glossary/statcast/launch-angle" target="_blank" rel="noopener">擊球仰角定義 ↗</a></div>`;
}
