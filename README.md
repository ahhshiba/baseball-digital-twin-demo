# 棒球數位孿生｜公開展示版

這是可公開分享的互動 3D 概念展示，參考使用者提供的 `twin.html` 操作方式重新製作。它與私人研發 repo 分離，**不包含**內部設備報價、球團文件、原始逐球資料、未公開演算法或正式 ABS 判決功能。

## 本機啟動

```sh
npm ci
npm run dev
```

`npm run build` 會產生 `dist/`；推送 `main` 後由 GitHub Actions 發佈至 GitHub Pages。

## 展示範圍（第二版）

- 切換概念驗證、牛棚、球場局部、全場概念四個情境。
- 點選節點查看用途與示意安裝位置；拖曳旋轉、縮放、切換視角。
- 草皮紋理、投手丘、五角本壘板、看台、護網、投捕手、設備支架與日夜光照；切換本壘／投手近景。
- 四種手選球路、可調身高、帶內／帶外／邊界／遮擋情境，3D 與 2D 進壘點共用同一筆模擬事件。
- 本機保留最近 60 筆模擬投球，JSON 包含軌跡，CSV 提供摘要。球種不是自動辨識，轉速是預設值，沒有硬體原始影像或 I/Q。
- 數據能力頁說明投打守、球種、旋轉、比賽事件和 ABS 所需的原始資料及設備。這是需求分類，並非已實作所有進階指標。
- 所有數字及覆蓋範圍皆為示意，並非量測或已驗證性能。未知指標為 `null`，不偽裝成量測結果。
- 網站是純靜態頁面；即時感測資料需另接授權後端，請勿在前端放入金鑰或球員個資。

## 維護

來源檔在 `src/`：`nodes.js` 為節點資料，`scene.js` 為程序化場景，`pitch.js` 為模擬與示範幾何判讀，`capabilities.js` 為資料需求。所有公開內容應先檢查不含內部價格、機密文件或個資。

安裝座標由 `deployment.js` 依階段覆寫；所有感測器、支架與機櫃均移至示意活動區外。可開啟「活動區界線」並在設備頁查看固定方式、觀測距離和移位取捨。詳見[場內淨空安裝方案](docs/perimeter-installation.md)。

## 座標與判讀

公尺座標的原點為本壘後尖端，x 為捕手視角向右、y 向上、z 向捕手。本壘前緣 z = −0.4318 m，中間平面 z = −0.2159 m。這不是 Statcast 的座標軸，介接時需要明確轉換。

示範好球帶採 MLB 2026 參考比例，並非 CPBL 規則。球心通過平面時，使用圓與矩形相交；以圓角矩形的 signed distance 避免角落誤判。12 mm 不確定度是**任意示範假設**，沒有信賴水準或量測驗證。邊界／失效進入 REVIEW；此演算法不是完整官方 ABS。身高輸入僅改變好球帶，場上人物為通用示意模型。

投球採固定加速度簡化模型，釋球速度由時間求根維持一致；不根據預設轉速推算 Magnus 或球縫作用。回放為慢動作，沒有量測端到端延遲。球上光暈為觀看輔助，實際幾何半徑仍為 3.66 cm。

## 驗證

`npm test` 驗證球路速度／終點、球半徑與邊界／角落、遮擋回退、模擬與實測欄位區分。`npm run build` 建置網站。可另外用 Playwright 執行 `tests/browser-smoke.mjs` 檢查四階段、逐球記錄、下載、手機版及瀏覽器錯誤（使用 Edge；可透過 `PLAYWRIGHT_MODULE` 指定模組位置）。

## 資料來源

完整的[量測能力、原始資料與上線前置條件](docs/measurement-readiness.md)另列於文件中。

- [MLB ABS 規則說明](https://www.mlb.com/interactive/mlb-abs-system-explainer)：好球帶參考比例與判定平面。
- [Statcast CSV 欄位](https://baseballsavant.mlb.com/csv-docs)：正式介接時須保留座標、單位及年份定義。
- [CPBL 指標介紹](https://stats.cpbl.com.tw/news/1vrRUWdz8zWv6bWMz0xiazeJUJl8q1c2lxg_uAg122hc)：後續逐項對照的需求來源。
- [MLB 擊球仰角](https://www.mlb.com/glossary/statcast/launch-angle)：描述球離棒方向，不是球棒攻擊角。
