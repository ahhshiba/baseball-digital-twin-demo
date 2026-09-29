# 棒球數位孿生｜公開展示版

給球團與工程團隊看的互動 3D：**預想設備安裝在哪裡、每台設備做什麼、背後的基本原理**，以及投球與全場守備的合成回放。
完整工程說明（需求凍結、成本、排程、驗收契約、指標字典）在規劃報告 PDF（v4.2，2026-09-29）與本 repo 原始碼中，不放在展示頁上。

線上：https://ahhshiba.github.io/baseball-digital-twin-demo/

## 頁面內容

- **三個場景**：牛棚（投捕通道）、局部球場（投捕＋打擊區）、全場（球員與守備）。可分享 `#bullpen/nodes`、`#full/replay` 等連結；舊版 `#build/poc/plan` 仍可開啟。
- **設備**：依類別列出場景內所有設備；點清單或 3D 模型看一句話用途、候選型號、安裝位置與座標。全場場景加入 F01–F08 球員相機候選站（橘色 F07／F08 為追加候選）。
- **原理**：8 張短卡片（座標、雙相機三角定位、球縫直接量轉速、都卜勒雷達、同步曝光、好球帶判定、全場球員追蹤、0.8 秒流程），每張可一鍵在 3D 中對照相關設備。
- **回放**：四種球路 × 四種情境的投球回放與好球帶判定；全場場景另有 6 個守備情境（飛球接殺、漏接、滾地接傳、跑者 Safe、ID 錯配待覆核、遮擋缺段），13 位球員以時間軸播放、可逐幀。
- 畫面工具：日夜、相機視野、活動區界線、設備標籤、轉軸示意、投捕手半透明。

所有設備位置是**候選示意、未場勘**；回放資料是**程序合成**，不是實測。未量到的值一律為 `null`。

## 本機啟動

```sh
npm ci
npm run dev        # 開發
npm test           # 單元測試
npm run build      # 產生 dist/，推送 main 後由 GitHub Actions 發佈
npm run export-data  # 產生 v4.2 工程資料包到 data/（不公開在頁面）
```

瀏覽器驗收：`npm run build && npx vite preview --port 5174`，另開終端 `node tests/browser-smoke.mjs`（需要 Playwright；可用 `PLAYWRIGHT_MODULE` 指定模組路徑、`DEMO_URL` 指定網址、`BROWSER_CHANNEL=msedge` 使用 Edge）。

## 原始碼地圖

| 檔案 | 內容 |
|---|---|
| `src/main.js` | 頁面組裝、場景／面板切換、回放控制 |
| `src/scene.js`、`src/actors.js` | Three.js 球場、設備支架、球員模型、守備圖層 |
| `src/nodes.js`、`src/deployment.js` | 設備清單、一句話用途、安裝座標與活動區淨空 |
| `src/theory.js` | 原理卡片 |
| `src/pitch.js`、`src/fielding.js` | 投球與守備合成資料（32 球、6 × 121 時間片 × 13 人） |
| `src/fullfield.js` | v4.2 全場：F01–F08、full-field-v1 驗收契約、BOM／NRE／排程（工程資料，不上頁面） |
| `src/metrics-catalog.js`、`src/claim-audit.js` | 90 項指標字典、Statcast 說法查核 |
| `src/plan.js`、`src/procurement.js` | v3.1 一期 BOM、A/B 成品比較（保留追溯） |
| `src/datapack.js` | 由以上模組產生 `data/*.json` |

## 座標

world：原點本壘後尖端，x 向右、y 朝投手、z 向上（公尺）。Three.js 畫面：`world[x,y,z] → scene[x,z,−y]`。好球帶示範採 MLB 2026 參考比例（非 CPBL 規則），以圓角矩形判定球半徑 3.66 cm。

## 驗證

`npm test` 覆蓋：球路與好球帶圓角、半透明材質還原、所有設備在活動區外、v3.1 與 v4.2 報告中的每個金額重算一致、full-field-v1 無實證不計分、守備資料遮擋／ID 歧義不補值、90 項指標與資料包格式、路由相容。
