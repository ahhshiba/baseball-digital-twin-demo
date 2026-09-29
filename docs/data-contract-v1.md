# 共同資料契約與Demo狀態

目前只有模擬/回放，無硬體擷取後端。`demo-pitch/2.0`記錄保留相容，v3增加`plan_version`、`synthetic_spin`、`measurements`、`measurement_requirements`與`world_trajectory`。

v3.1新增`solution_variant='build'|'buy'`供展示方案追溯。兩版`source`仍為`synthetic`，不是vendor真實資料。成品adapter未實作；未來的vendor payload須與sensor raw分開保存，method/座標定義不明時不產生direct_spin_axis，API接收時間不當成曝光時間。

## 座標與來源

原點：本壘後尖端。plan world為x右、y朝投手、z上；Three.js場景為x右、y上、z朝捕手。world→scene為`[x,z,-y]`，scene→world為`[x,-z,y]`。位置、速度與有向轉軸皆套用同一正交轉換，單位SI。

`synthetic_spin.source='synthetic-preset'`且`measurement=false`，僅供動畫。`measurements.spin_rpm`、`spin_axis_world`、`method`、`sample_to_visible_ms`均為null，`validity='not-connected'`。既有`metrics.spin_rpm`明列synthetic來源，`metrics.spin_axis`仍null。

請勿把合成球縫圖、動畫軸、`trajectory.samples`與實際曝光/ADC樣本混為一談。模擬影片可測試資料管線，不足以證明普通球的直接量測精度。

## 正式接口應包含（尚未連線）

- 封套：schema/version、sensor/node/stream/seq、session、clock_epoch、ticks。
- 時間：取樣/曝光起中終、接收、觀測支持窗、time-map版本、同步不確定度；ns整數以JSON字串輸出。
- L0：Mono像素格式/stride/ROI/曝光，或ADC位元、fs、載頻、通道I/Q/real layout；raw用二進位與索引。
- L1：像素球心/球縫、頻譜峰/徑向速度，附時間、品質與covariance。
- L2：P/V、球面R或quaternion、ω、有向spin axis、校正與算法版本。
- L3：球速、進壘點、球種/手動來源、事件與指標分母；預測、直接量測、衍生值分開。
- 延遲：取樣至畫面≤800ms目標，實測以光學端到端方法驗證；過期/模糊/歧義回null及原因，不用預設補洞。

公開GitHub只保存合成/獲准資料與公開規劃；真實球員資料、原始影片/IQ與金鑰放授權本地或後端系統。
