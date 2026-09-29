# 價格查核與自研／成品兩版 v3.1

查核日：2026-09-29。幣別NTD，除非標USD；USD×32為編預算假設，非當日匯率。未向廠商詢價或下單。本頁不公開球團私人合約或本機完整報告。

## 先回答：原本金額正確嗎？

算術正確；但不應視為可用該價買到「已達標」整套系統。

- A版十項BOM數量×預留單價 = 133,000–191,000；加15% = **152,950–219,650**。
- 牛棚**470,000是累計預算分配**，已含PoC，不是另加47萬，也沒有供應商簽署整案報價。
- **1,000,000是封頂規劃**，不是全部OAA/正式ABS採購保證。
- 87,600是借足指定設備的增購條件案；借不到、高規光學升級或spin觀測關卡失敗，都需重審預算，不能撤除一期直接旋轉驗收。

| 零件 | 公開裸機單價 | ×32台幣單價 | 證據狀態 |
| --- | ---: | ---: | --- |
| Basler a2A1920-160umBAS | USD395 | 12,640 | 經銷頁明列USD，backorder，交期待報 |
| FLIR BFS-U3-04S2M-CS | USD361 | 11,552 | 公開PDF搜尋索引；本次動態商品頁未取得可確認售價，**現價待報** |
| OPS243-A 非WiFi | USD224 | 7,168 | 官方感測器目錄；WiFi版244不可混用 |

來源：[Soda Vision](https://www.sodavision.com/product/basler-a2a1920-160umbas/)、[Edmund公開PDF索引對應頁](https://www.edmundoptics.com/p/BFS-U3-04S2M-CS-USB3-Blackflyreg-S-Monochrome-Camera/40161?PrintPDF=true)、[OmniPreSense官方目錄](https://omnipresense.com/product-category/sensor/)。這些是裸機價，不包含鏡頭/線材等；BOM台幣單價已是較高的工程預留，不能再把裸機價加一次。

其餘鏡頭、照明、同步盒、支架/防護、儲存、治具、配電並無完整書面報價。到岸、保固、現場安裝、高規旋轉光學、獨立真值設備、EMC/RF驗證、自製FPGA載板及人力NRE不能假設免費。15%是未知風險預算，不是精度或時程保證。

## A與B到底自研什麼？

| | A 自研量測 | B 成品應用 |
| --- | --- | --- |
| 購買 | 工業相機、開放雷達、光學/照明/同步配件 | 廠商整機量測引擎＋相容主機＋使用/資料授權 |
| 自研 | L0/L1擷取、同步、球縫姿態、融合、加速、全部資料管線 | 授權adapter、座標/單位、事件、分析、孿生 |
| 原始資料 | 依設備SDK/ADC介面取得，須實測 | 公開API/CSV不等於sensor raw；未取得raw授權 |
| 風險 | 未標記普通球直接旋轉尚未達標 | 原廠黑盒、介面/權利、延遲、安裝位置 |

A不等於從零製造CMOS、RF IC或全部PCB；後者另編NRE與測試。B不因購買成品而免除一期直接有向三維軸、800ms及場內淨空需求。

## B公開參考價與已知基礎成本

| 型號/授權版本 | 裸機USD | 本表年度訂閱USD | 首年已知基礎NTD | 三年已知基礎NTD |
| --- | ---: | ---: | ---: | ---: |
| TrackMan Portable B1 | 待報價 | 待確認 | 待報價 | 待報價 |
| Rapsodo PRO 2.0 投球單功能 | 3,500 | 1,500 | 199,200–232,400 | 295,200–328,400 |
| Rapsodo PRO 2.0 投打雙功能 | 4,500 | 1,500 | 234,400–270,800 | 330,400–366,800 |
| Rapsodo PRO 3.0 | 8,500 | 1,500 | 375,200–424,400 | 471,200–520,400 |
| FlightScope X3B棒球套裝 | 15,995 | 995 | 604,864–666,048 | 668,544–729,728 |

算法：首年 = 裸機USD×32×(1.10–1.20)＋配件預留＋年度訂閱基準。三年 = 首年＋兩次續費。1.10–1.20是運保/稅費/匯差的**工程預留係數，不是稅率**。

Rapsodo配件預留28–50k（相容iPad18–30k＋基本防護/線材/安裝10–20k）。X3B套裝原廠已列Windows PC、腳架、測距等，只另編10–20k局部網路/防護；不重複購PC。硬體與會員方案資格、商用/職業隊授權、地區及稅費必須書面確認。

**以上不是完整TCO/整合交付價**：尚無報價的API/CSV升級權利、應用整合NRE、重大維修/RMA、永久工程與會員稅費/匯差另計。不可把缺價填成0。A只有硬體預留，B含首年必要訂閱基準，成本口徑不同，不直接以數字大小判定全面優劣。

來源：[PRO 2.0目前商品頁](https://rapsodo.com/products/pro-2-ball-flight-monitor)、[官方單/雙功能價表](https://rapsodo.com/blogs/baseball/rapsodo-demystified-for-coaches)、[PRO 3.0商品頁](https://rapsodo.com/products/rapsodo-pro-3-ball-flight-monitor)、[Rapsodo必要會員](https://rapsodo.com/pages/rapsodo-baseball-pro-series-membership)、[FlightScope X3B官方套裝/Cloud](https://flightscope.com/pages/baseball)。Rapsodo本表採Team1500美元/年，不以個人/學校低價套用職業隊；職業隊實際合約待詢。X3B Cloud一年995美元，兩年以上預付750美元/年，本表不混用折扣；CSV需要Cloud。

B1官方[硬體頁需詢價](https://www.trackman.com/baseball/Portable-B1/get-your-own)，[軟體商店](https://shop.trackmangolf.com/collections/baseball)列USD2500/期，**未確認週期與地區合約，故不擅作年費**。[Data Access Package/API另購](https://support.trackmanbaseball.com/hc/en-us/articles/5089419125403-Data-Data-API-Introduction)，不是硬體價已含的免費功能。

## 買成品仍不能跨過的限制

- B1公開Live Feed的目標為iPad已有資料後約3秒內交付自製應用，並非感測→畫面800ms；公開通道無法據以承諾原需求。該文件也指出訊息沒有重送/緩衝，需要監測缺漏及事後對帳。[原廠2026-05文件](https://support.trackmanbaseball.com/hc/en-us/articles/5089771759003-B1-App-Trackman-Data-Feeds-Live-Play-by-Play)
- Rapsodo PRO2需要本壘前20ft，PRO3約17ft，位於投捕之間，不符場內無突起設備條件；除非球團另准許特定訓練場地，不作主配置。不能自行搬至場邊或埋地後仍聲稱原廠精度有效。[PRO2官方FAQ](https://rapsodo.com/pages/baseball-frequently-asked-questions-faq)、[PRO3官方日本安裝指南](https://note-rapsodojp.rapsodo.com/n/n715565f9db54)
- B1場景是後方固定概念；原廠投球校正提供12ft距離與12ft高度的最佳設定示例。本圖為避開概念活動區的自訂位置，需custom calibration及原廠確認，非施工核准。[B1安裝/校正](https://support.trackmanbaseball.com/hc/en-us/articles/48455405166747-B1-App-Pitching-Calibration-Steps)
- 產品列spin/tilt不等於已驗明普通球的直接三維有向軸與完整API。要索取方法、座標、品質、真實樣本與獨立盲測；只給2D角度不可造出3D軸。未找到公開raw保證不等於宣稱原廠絕不可能另簽研發授權。

## 維護、採購順序

先盤點球團現有硬體/會員/API/校正工具與授權樣本，能借先借。權限到位後先用2–6週做B版匯入/adapter應用原型，與A版raw量測平行；這不是800ms或直接旋轉已達標的交付承諾。

完整TCO = 硬體到岸＋安裝＋NRE＋Σ年(訂閱/API＋儲存/網路＋維護/校正)。NRE = 人月×全成本月薪＋試驗/認證。自研硬體年度備品可先編實際硬體採購額3–5%＋校正材料/治具5–15k作內部預算，非服務合約；人力和重大故障另計。

軟體先共享事件schema與UI，分開source/method/clock。真正縮短研發風險的順序是借成品供球團使用/對照，同時讓A版逐關卡取得raw與直接旋轉能力；不是把成品結果當成自研算法的第一層原始資料。

原始數值以 `src/plan.js`、`src/procurement.js` 為單一來源；JSON/CSV與畫面共用計算。正式報價取得後再更新，不把本頁數字當採購承諾。
