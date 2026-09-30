# 全場 v4.2 摘要（工程團隊）

依規劃報告 v4.2（2026-09-29）。完整推導、價格來源與驗收細節見 PDF；本頁只列 repo 中對應的原始碼與數字，所有數字由 `npm test` 對照報告重算。

## 目標
全場整體能力：投打、全場球員身分／軌跡、守備事件、OAA-like 與跑壘。牛棚是中繼站；v4.1「training-core 84 分」已撤回。
硬門檻不因新目標放寬：普通未標記球直接 rpm＋三維有向軸、取樣→本地畫面 ≤800 ms、活動區內無設備、資料權利。

## 驗收契約 full-field-v1（`src/fullfield.js`）
11 個能力群、權重合計 100、7 個必過群；球員身分 18＋守備／OAA-like 16 = 34。專案驗收分數 ≥85 且必過群與硬門檻全過。
目前 `actual_score = null`：只有帶 evidence_id、獨立參考、場景、樣本數、信賴區間且非合成的證據才計分（`scoreContract`）。這是自訂工程驗收，不是 MLB 認證或 Statcast 相對性能。

## 設備
- 相機候選 14–18 台：球路／球縫 4 ＋ 球員 6–8 ＋ 局部打擊 2 ＋ 遠球補盲 2–4。
- 球員相機候選站 F01–F08（world 座標見 `fieldStations`）；F01–F06 為六機研究起步，F07／F08 為追加候選。取代 v3.1 外野 F1／F2，不重複採購。遠球補盲位置未定。
- 60 m 寬、2448 px 時棒球約 3 px：球員追蹤與小球／球縫是不同光學任務。

## 成本（工程預留，非報價）
| 項目 | NTD |
|---|---|
| 全場新增器材 | 814,000–2,058,000 |
| 新增部分 20% 風險 | 162,800–411,600 |
| 含牛棚累計 470,000 | 1,446,800–2,939,600 |
| 100 萬研究案 | 需球團借結構、電源、GPU、NAS、參考儀 |
| NRE（35–62 人月） | 4,440,000–12,624,000 |
| 硬體＋NRE | 5,886,800–15,563,600 |
未報價缺口：全場直接旋轉光學改版、自由飛行參考儀、永久施工、API／正式 ABS／量產 RF、稅費。

## 排程
M0 Demo（本 repo）→ P0 G1 借測 → P1 W4–12 PoC → P2 W13–20 牛棚＋全場試拍 → F1 第 6–9 月研究 beta → F2 第 9–15 月候選驗收。

## 資料
`npm run export-data` 產生 `data/`：requirements、fullfield_plan、fullfield_placements、fullfield_benchmark.csv、metrics_catalog（90 項）、statcast_claim_audit（15 項）、synthetic_pitches（32 球 × 241 點）、synthetic_fielding（6 play × 121 時間片 × 13 人）。合成資料不是訓練集或實測；實測欄位全為 `null`。

## 單鏡輔助層
`tools/monocular/`（Python，不打包進網站）：一支手機或單台相機的影片 → 待覆核事件候選（標註加速），以及單鏡估計 vs 參考值的對照 benchmark。只做輔助，`counts_toward_acceptance = false`。合成測試結果：側面視角球速 P95 約 3–4 km/h、進壘高度 P95 ≤ 2.2 cm；本壘後方與高處視角不適合投球指標；皆未達一期多相機目標（1 km/h、20 mm）。詳見該資料夾 README。
