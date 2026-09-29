import { applyMounts } from './deployment.js';
import { stationNodes } from './fullfield.js';
export const stages = [
  {id:'poc',name:'一期 PoC',short:'P0',subtitle:'一期 · 球路＋直接旋轉',budget:'15.3–22.0萬',timing:'W1–12',description:'2顆球路＋2顆球縫相機＋24GHz I/Q。直接轉速與三維有向軸為一期必驗，不能以球路反推值替代。'},
  {id:'bullpen',name:'牛棚驗證',short:'P1',subtitle:'牛棚 · 固定化與訓練驗證',budget:'累計47萬',timing:'W13–20',description:'沿用一期感測器，增加運算、防護、備品與重裝校正；50萬上限仍需獨立參考儀與場地資源。'},
  {id:'pilot',name:'局部擴充',short:'P2',subtitle:'球場局部 · 擊球研究',budget:'總硬體100萬內分配',timing:'一期通過後',description:'增加打擊視角，60GHz / FPGA以選配研究呈現。全場場外長距離的球縫可觀測性須重新驗證。'},
  {id:'full',name:'全場主目標',short:'F',subtitle:'全場 · 球員身分／守備／跑壘',budget:'100萬借用研究｜145–294萬自購候選',timing:'F1 第6–9月／F2 第9–15月',description:'v4.2主目標：投打＋全場球員身分／軌跡、守備事件、OAA-like與跑壘。F01–F06為六機研究起步、F07–F08追加候選；遠球補盲2–4機位置未定。候選站非場勘、非覆蓋證明。'},
];
export const colors={camera:'#63a9ff',spin:'#c29eff',radar24:'#f0a967',radar60:'#ca87e9',edge:'#60d6aa',fpga:'#75d4d7',sync:'#9ebcc8',light:'#f7d483',vendor:'#75d3c0',player:'#7fb7ff'};
export const typeNames={camera:'球路光學相機',spin:'球縫高速相機 · 一期必要',radar24:'24 GHz · 原始 I/Q',radar60:'60 GHz · 選配研究',edge:'PC / 應用節點',fpga:'FPGA · 平行研發',sync:'同步 / 隔離觸發',light:'短脈衝照明',vendor:'整合式成品 · 非raw介面',player:'全場球員相機 · 候選站'};
const n=(id,name,type,target,model,role,raw,extra={})=>({id,name,type,pos:[0,0,0],target,model,role,raw,required:true,...extra});
const spinTarget=[0,1.7,-16];
const core=[
  n('cam-a','T1｜球路左視角','camera',[0,1.2,-8],'Basler a2A1920-160umBAS','球心定位與全程球路候選；需要與T2時間/幾何配對。','L0 Mono8影格；曝光、frame_seq、時間戳、內外參',{source:'basler'}),
  n('cam-b','T2｜球路交叉視角','camera',[0,1.2,-8],'Basler a2A1920-160umBAS','立體定位與進壘位置；不是球縫量測鏡頭。','像素/半徑、可見性、sync_sigma、校正ID',{source:'basler'}),
  n('cam-c','S1｜球縫高速左','spin',spinTarget,'FLIR BFS-U3-04S2M-CS','第一期直接旋轉主觀測；球像、幀數、曝光未過門檻不得宣稱達標。','未壓縮球面ROI、球縫、曝光起/中/終、球面姿態候選',{source:'spin',focalMm:50}),
  n('cam-d','S2｜球縫高速右','spin',spinTarget,'FLIR BFS-U3-04S2M-CS','第二球面視角，處理對稱/半倍/倍頻與三維軸歧義；普通未標記球驗收。','同時刻雙視角影格、原始索引、R(t)、有向ω與品質',{source:'spin',focalMm:50}),
  n('r24','R24｜I/Q 雷達','radar24',[0,1.4,-12],'OmniPreSense OPS243-A','CW徑向速度輔助；rolling buffer有輸出/再武裝死時間，不直接保證spin。','I/Q ADC code、fs、載頻、樣本窗、trigger、丟失/飽和',{source:'rolling'}),
  n('light-a','L1｜球縫補光','light',spinTarget,'市售脈衝LED＋合規驅動器','比較球縫對比、光量、安全與短曝光；不是場內落地燈。','曝光/光脈衝時序、亮度設定、溫度、配置版本'),
  n('light-b','L2｜交叉補光','light',spinTarget,'市售脈衝LED＋合規驅動器','補足另一視角；近紅外不一定看得清紅球縫。','照明配置、脈寬、觸發延遲、維護狀態'),
  n('sync','SYNC｜觸發盒','sync',[0,1,-8],'MCU開發板＋隔離 I/O','共同trigger與曝光實測；0.8秒期限不代表可以放寬微秒級同步。','clock_epoch、ticks、clock map、ExposureActive偏差'),
  n('edge','EDGE｜PC 節點','edge',[0,1,-8],'PoC沿用/借用主機；牛棚升級','先CPU建立可回放算法；就地保存raw、送小型狀態封包。不是必購FPGA。','L0索引、L1觀測、L2位置/ω、品質、queue age、版本'),
];
const additions=[
  n('cam-e','T3｜打擊一壘側','camera',[0,1,-2],'依場勘詢價','擊球後球心、接觸事件；需重新驗出球速度包絡。','接觸時間、球/球棒像素、初始速度與事件ID',{required:false}),
  n('cam-f','T4｜打擊三壘側','camera',[0,1,-2],'依場勘詢價','擊球交叉視角；兩機不保證完整落點。','同步影像、配對、初速/仰角/方向及covariance',{required:false}),
];
// v4.2: the v3.1 outfield placeholders (cam-g / cam-h) are superseded by F01–F08; never purchase both.
const optional=[
  n('fpga','FPGA｜平行研發','fpga',[0,1,-8],'先用現有開發板，介面另驗','同步/ROI/FFT/DMA逐項移植；不能將工業USB相機直接視為AXI像素輸入。','valid/ready、時間戳、overflow、固定點誤差、版本',{required:false,option:'fpga'}),
  n('r60','R60｜ADC 研究','radar60',[0,1.3,-8],'TI IWR6843ISK＋DCA1000EVM','raw需擷取板；高速小球、chirp速度模糊與場外距離均待驗。','LVDS ADC、chirp slope、TX/RX排程、range-Doppler、UDP loss',{required:false,option:'radar60',source:'ti'}),
];
// One-line public descriptions shown when a device is clicked; engineering detail stays in the PDF.
export const purposes={
  'cam-a':'從捕手後方看球，與T2同時拍攝，交會求出球的3D位置與球路。',
  'cam-b':'側面交叉視角，和T1配對做三角定位，決定進壘點。',
  'cam-c':'高速短曝光拍球縫，由連續影格的球體姿態變化直接算轉速與轉軸。',
  'cam-d':'第二個球縫視角，補另一面球縫，消除轉軸方向的歧義。',
  'r24':'量測球沿雷達視線的速度（都卜勒），與相機球路交叉比對。',
  'light-a':'與相機同步的短脈衝補光，讓微秒級曝光仍看得清球縫。',
  'light-b':'另一側補光，照亮第二個球縫視角。',
  'sync':'送出共同觸發訊號，讓所有相機同一時刻曝光、統一時間戳。',
  'edge':'在場邊擷取原始影像與雷達資料，本地解算後送結果到畫面。',
  'cam-e':'一壘側打擊視角，量擊球後初速、仰角與方向。',
  'cam-f':'三壘側打擊視角，與一壘側交叉定位擊出的球。',
  'fpga':'研究用硬體加速板。','r60':'60GHz 研究雷達。',
};
export const groups=[['camera','球路相機'],['spin','球縫高速相機'],['radar24','雷達'],['light','補光'],['sync','同步'],['edge','運算主機'],['player','全場球員相機'],['radar60','研究設備'],['fpga','研究設備']];
export function getNodes(stage,nearView=false,options={}){
  if(!stages.some(s=>s.id===stage))throw new RangeError('Unknown stage');
  const list=[...core,...(['pilot','full'].includes(stage)?additions:[]),...(stage==='full'?stationNodes():[]),...optional.filter(n=>options[n.option])];
  return applyMounts(structuredClone(list),stage,nearView).map(n=>({...n,purpose:n.purpose??purposes[n.id]??n.role}));
}
