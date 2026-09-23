import { applyMounts } from './deployment.js';
export const stages = [
  {id:'poc',name:'概念驗證',short:'P0',subtitle:'室內 · 幾何與同步驗證',description:'兩個相機視角驗證球心定位、時間同步與雷達速度。近攝模式只涵蓋局部，不代表可量進壘點。'},
  {id:'bullpen',name:'牛棚',short:'P1',subtitle:'牛棚 · 投球追蹤與 ABS 研究',description:'釋球端與本壘交叉視角，研究完整球路與訓練輔助判讀。轉速仍需另外驗證球縫解析度。'},
  {id:'pilot',name:'球場局部',short:'P2',subtitle:'球場 · 投打區域先導',description:'增加擊球後軌跡與打擊事件。此階段並未驗證全場守備或正式 ABS 判決。'},
  {id:'full',name:'全場概念',short:'P3',subtitle:'球場 · 全場追蹤構想',description:'展示投打守的空間關係。遠端節點、焦段與數量仍需場勘及可觀測性測試；不代表已具完整覆蓋。'},
];
export const colors={camera:'#63a9ff',radar24:'#f0a967',radar60:'#ca87e9',edge:'#60d6aa',lidar:'#f3d676'};
export const typeNames={camera:'光學相機',radar24:'24 GHz Doppler',radar60:'60 GHz FMCW',edge:'FPGA 邊緣節點',lidar:'光達（選配研究）'};
const n=(id,name,type,pos,target,role,raw)=>({id,name,type,pos,target,role,raw});
const near=[
 n('cam-a','相機 A｜近攝','camera',[-2,1.8,-15.5],[0,1.6,-16],'釋球附近影像；球縫辨識需短曝光和足夠像素。','影格、曝光時間、時間戳、球心／球縫像素'),
 n('cam-b','相機 B｜近攝','camera',[2,1.8,-15.5],[0,1.6,-16],'提供第二視角，配對同步影格進行三角定位。','影格、同步狀態、相機內外參、候選信心'),
 n('r24','24 GHz｜軸向','radar24',[0,2.5,4.5],[0,1.3,-17],'量測沿視線的徑向速度；單一 CW 雷達不提供絕對距離。','I/Q、取樣率、頻譜、Doppler 峰值、SNR'),
 n('r60','60 GHz｜近場','radar60',[3.5,2.1,-6],[0,1.3,-12],'測試高速小球的 range–Doppler；須確認最大不模糊速度與雜波。','chirp 設定、ADC/IQ、距離－速度圖、角度與協方差'),
 n('edge','FPGA｜邊緣箱','edge',[5.1,.7,-2],[0,1,-8],'時間戳、ROI、前處理與事件封包；融合及資料庫先由研發電腦承接。','事件 ID、硬體時間戳、丟幀率、溫度、版本'),
];
const plate=near.map(n=>n.id==='cam-a'?{...n,name:'相機 A｜本壘',pos:[-3,2.3,2],target:[0,.8,-.22],role:'本壘球心與接近軌跡；需避免捕手遮擋。'}:n.id==='cam-b'?{...n,name:'相機 B｜本壘',pos:[3,2.3,2],target:[0,.8,-.22],role:'交叉定位進壘點與量測不確定度。'}:n);
const bullpen=[...plate,
 n('cam-c','相機 C｜釋球','camera',[-3.6,2.8,-13],[0,1.6,-16.7],'釋球位置、延伸及球路起點。','短曝光影格、釋球事件、像素位置與時間戳'),
 n('cam-d','相機 D｜上方','camera',[1.3,4.5,-2],[0,.8,-.22],'降低本壘的遮擋，補充獨立視角。','頂視球心、可見性、內外參、校正誤差'),
 n('edge-b','FPGA｜本壘箱','edge',[-5,.7,1],[0,1,-1],'本壘 ROI 前處理與同步。','同步偏移、佇列時間、版本、丟幀率'),
];
const pilot=[...bullpen,
 n('cam-e','相機 E｜一壘側','camera',[24,9,-17],[0,1,-3],'打擊事件與局部擊出球軌跡。','擊球前後影格、接觸時刻、球／球棒像素'),
 n('cam-f','相機 F｜三壘側','camera',[-24,9,-17],[0,1,-3],'交叉追蹤初速、仰角與方向。','多視角配對、時間戳、可見性與校正版本'),
 n('r60-b','60 GHz｜打擊區','radar60',[-4,2.2,2],[0,1,-2],'實測有增益後才融合；不能假設現成人員追蹤韌體適用棒球。','range–Doppler、SNR、速度模糊狀態'),
];
const full=[...pilot,
 n('cam-g','相機 G｜左外野','camera',[-60,13,-83],[0,2,-48],'外野球員追蹤研究；高速小球解析度需另驗證。','全場球員 ID、二維位置、時間戳'),
 n('cam-h','相機 H｜右外野','camera',[60,13,-83],[0,2,-48],'交叉守備視角；節點數量只是展示。','球員轨跡、遮擋與重識別信心'),
 n('lidar','光達｜人員研究','lidar',[0,6,14],[0,1,-24],'研究人員定位與靜態場地建模；一般掃描光達不保證能追棒球。','點雲、逐點時間戳、反射強度與外參'),
];
export const getNodes=(stage,nearView)=>applyMounts(structuredClone(stage==='poc'?(nearView?near:plate):stage==='bullpen'?bullpen:stage==='pilot'?pilot:full),stage,nearView);
