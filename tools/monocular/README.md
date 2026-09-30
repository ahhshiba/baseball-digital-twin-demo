# 單鏡輔助層（monocular）

一支手機或單台相機就能跑的輔助工具，對應兩個用途：

1. **標註加速器**：把影片轉成「待覆核」的事件候選（投球釋出、進壘、追蹤中斷、疑似遮擋），並附覆核用 CSV 與截圖拼貼。人工只需確認或修正，不必從零標註。
2. **對照組**：把單鏡估計與參考值逐球比較，量出誤差、失敗率，並檢查不確定度是否誠實。

**邊界**：這是輔助層，不是主線量測。它不提供直接轉速、三維有向轉軸，也不能證明 800ms 交付。所有輸出都標記 `measured: false`、`counts_toward_acceptance: false`，不計入 full-field-v1 驗收。

## 安裝

```sh
cd tools/monocular
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
(cd ../.. && npm run export-data)   # 產生 data/synthetic_pitches.json（測試與 benchmark 的參考值）
.venv/bin/python -m unittest tests.test_mono
```

## 用法

```sh
# 1) 真實影片 → 候選事件（需要相機校正，見下方）
.venv/bin/python -m mono.cli analyze --video clip.mp4 --camera calib.json --out out/
#   out/candidates.json  事件候選（bb-event 形狀，status = needs_review）＋逐幀球候選
#   out/review.csv       覆核表：reviewer_decision / corrected_t_s 欄位留給人填
#   out/contact_sheet.png 球附近的截圖拼貼，數秒內就能確認

# 2) 合成影片（已知答案，用來測試流程）
.venv/bin/python -m mono.cli synth --pitch syn-build-SL-edge --view side --fps 240 --out demo/

# 3) 單鏡 vs 參考值：視角 × fps × 方法
.venv/bin/python -m mono.cli benchmark --out reports/
```

### 相機校正 `calib.json`

在影片畫面上點出至少 4 個場地點的像素座標（點越多、分布越開越好），名稱見 `mono/camera.py` 的 `FIELD_POINTS`（本壘各角、投手板兩端、壘包），或直接給 `world` 座標。這些預設座標是規則尺寸，實際使用請換成場勘量測值。

```json
{"width":1920,"height":1080,"hfov_deg":70,
 "points":[{"name":"plate_rear_tip","px":[962,801]},{"name":"rubber_left","px":[1480,512]},
           {"name":"rubber_right","px":[1502,515]},{"name":"first_base","px":[250,640]},
           {"world":[0,18.44,0],"px":[1490,540]}]}
```

校正結果會輸出重投影誤差 `reprojection_rmse_px`。超過 2px 時應重新點選，或檢查鏡頭畸變（廣角手機請先去畸變）。

## 方法

| 步驟 | 做法 |
|---|---|
| 偵測 | 背景相減＋連通區塊；用加權二階矩取球的短軸半徑（拖影會拉長長軸） |
| 追蹤 | 等速度預測＋門控，允許短缺口；缺口本身會成為 `tracking_gap` 候選 |
| 3D 估計 | 單鏡只有一條視線，需再加一個約束：**plane** 假設球在本壘—投手板的垂直平面內；**size** 由球的視半徑推深度；**model** 直接對 2D 軌跡擬合等加速度飛行（重投影＋視半徑＋弱物理先驗），附不確定度，不合物理就退回 plane／size |
| 預設 `best` | 側向視角用 model，沿軸視角（本壘後方）用 size：依下方 benchmark 選定 |

需要真實影片的球員框時，`tracking.detect_people_yolo` 可接 Ultralytics YOLO（選配、AGPL、尚未在棒球影片上驗證）。

## 合成 benchmark 結果（`reports/monocular_benchmark.md`）

16 球（4 球種 × 4 情境，含遮擋）× 3 視角 × 3 fps，1280×720、曝光 1 ms。參考值是合成真值，屬理想條件：沒有滾動快門、壓縮、畸變、光線變化與校正誤差，真實影片只會更差。

| 視角（`best`） | 球速誤差 P95 | 進壘高度 P95 | 進壘左右 | 判讀 |
|---|---|---|---|---|
| 側面三壘側，60–240fps | 2.9–4.1 km/h | 0.8–2.2 cm | 不可觀測（不回報） | 適合當對照與事件候選 |
| 本壘後方，60–240fps | 9.4–11.3 km/h（偏慢約 6–8） | 3.2–15 cm | 0.3–0.8 cm | 左右位置可用，球速不可信 |
| 高處 F01 類，60–240fps | 7.2–11.2 km/h | 28–66 cm | 不可觀測 | 不適合投球指標，屬球員相機 |

一期多相機目標是球速 P95 ≤ 1 km/h、位置 P95 ≤ 20 mm。以上沒有任何一組達到，這在預期之內：單鏡的角色是降低標註成本、提供對照，不是替代多相機。

其他發現：

- 解析度降到 640×360 時，側面視角的球只剩約 1 px，model 法會失去球徑線索、比 plane 法更差（測試裡有記錄）。
- 沿著投球方向拍攝時，飛行模型擬合對深度幾乎沒有約束，且自報的進壘高度不確定度偏樂觀（高度的 2σ 涵蓋率只有 38–90%，球速為 62–100%），因此 `best` 在該視角不採用。
- 60fps 仍能追到大部分球路；fps 對球速誤差的影響遠小於視角。

## 接上真實參考

`mono/compare.py` 的 `compare_clip(estimate, reference)` 接受任何含 `release_speed_kmh`、`plate_x_m`、`plate_height_m` 的參考值。之後有多相機或參考儀的逐球結果時，直接換掉合成真值即可；表格與 JSON 格式不變，仍標記不計入驗收。
