// Concept boundaries only: replace with surveyed playable/foul-territory polygons.
export function activityBoundary(stage) {
  if (stage === 'poc' || stage === 'bullpen') return [[-5,4],[5,4],[5,-22],[-5,-22]];
  const arc=Array.from({length:49},(_,i)=>{
    const a=Math.PI/4-i*Math.PI/2/48;return [111*Math.sin(a),-111*Math.cos(a)];
  });
  return [[-9,5],[9,5],[15,-4],[85,-78],...arc,[-85,-78],[-15,-4]];
}
export function insidePolygon([x,z],polygon){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [ax,az]=polygon[i],[bx,bz]=polygon[j];
    if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
  }
  return inside;
}
export function boundaryDistance([x,z],polygon){
  return Math.min(...polygon.map(([ax,az],i)=>{
    const [bx,bz]=polygon[(i+1)%polygon.length],dx=bx-ax,dz=bz-az;
    const u=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-ax-u*dx,z-az-u*dz);
  }));
}

const fieldMounts={
  'cam-a':{pos:[-8,6.5,7],anchor:[-8,6.5,7.6],place:'本壘後方結構｜左側',name:'相機 A｜後方左側'},
  'cam-b':{pos:[8,6.5,7],anchor:[8,6.5,7.6],place:'本壘後方結構｜右側',name:'相機 B｜後方右側'},
  'cam-c':{pos:[-32,8,-18],anchor:[-32.6,8,-18],place:'三壘側看台結構｜長焦釋球視角',name:'相機 C｜看台釋球'},
  'cam-d':{pos:[0,10,8],anchor:[0,10,8.6],place:'本壘後方高位結構｜斜向補視角',name:'相機 D｜後方高位'},
  'cam-e':{pos:[48,10,-32],anchor:[48.6,10,-32],place:'一壘側看台結構｜交叉視角'},
  'cam-f':{pos:[-48,10,-32],anchor:[-48.6,10,-32],place:'三壘側看台結構｜交叉視角'},
  'cam-g':{pos:[-70,12,-94],anchor:[-70.6,12,-94.6],place:'外野牆後看台結構｜左側'},
  'cam-h':{pos:[70,12,-94],anchor:[70.6,12,-94.6],place:'外野牆後看台結構｜右側'},
  'r24':{pos:[0,4.8,7],anchor:[0,4.8,7.6],place:'本壘後方固定結構｜隔網量測需驗證'},
  'r60':{pos:[-15,4,3],anchor:[-15.6,4,3],place:'三壘側護網外固定點｜可選研究',name:'60 GHz｜場外試驗'},
  'r60-b':{pos:[15,4,3],anchor:[15.6,4,3],place:'一壘側護網外固定點｜可選研究'},
  'edge':{pos:[18,.9,8],anchor:[18,.9,8],place:'場外維護區機櫃'},
  'edge-b':{pos:[-18,.9,8],anchor:[-18,.9,8],place:'場外維護區機櫃'},
  'lidar':{pos:[0,7,10],anchor:[0,7,10.6],place:'本壘後方場外結構'},
};

export function applyMounts(nodes,stage,nearView){
  const field=stage==='pilot'||stage==='full';
  return nodes.map(n=>{
    let mount;
    if(field)mount=fieldMounts[n.id];
    else if(n.id==='cam-a'||n.id==='cam-b'){
      const side=n.id==='cam-a'?-1:1;
      mount=stage==='poc'&&nearView
        ?{pos:[side*5.8,2.5,-16],anchor:[side*6.2,2.5,-16],place:'側網外剛性結構｜釋球近攝',name:`相機 ${side<0?'A':'B'}｜網外近攝`}
        :{pos:[side*3.5,3,5],anchor:[side*3.5,3,5.5],place:'捕手後方網外剛性結構',name:`相機 ${side<0?'A':'B'}｜網外本壘`};
    }else if(n.id==='cam-c')mount={pos:[-5.8,3,-17],anchor:[-6.2,3,-17],place:'投手側網外剛性結構｜隔網釋球',name:'相機 C｜側網外釋球'};
    else if(n.id==='cam-d')mount={pos:[5.8,3.3,-1],anchor:[6.2,3.3,-1],place:'側網外高位結構｜斜向本壘',name:'相機 D｜側網外高位'};
    else if(n.id==='r24')mount={pos:[0,3,5],anchor:[0,3,5.5],place:'捕手後方網外固定點'};
    else if(n.id==='r60')mount={pos:[5.8,2.5,-8],anchor:[6.2,2.5,-8],place:'側網外固定點｜雷達雜波需驗證'};
    else mount={pos:[n.id==='edge'?6.5:-6.5,.9,1],anchor:[n.id==='edge'?6.5:-6.5,.9,1],place:'護網外維護區機櫃'};
    const clearance=boundaryDistance([mount.pos[0],mount.pos[2]],activityBoundary(stage));
    let tradeoff=field?'長距離須重新選焦段、驗證球體像素與交會角；網子、觀眾及結構遮擋需現場確認。':'隔網成像須驗證對焦、網紋遮擋與曝光；固定在剛性結構，不固定在會晃動的網面。';
    if(field&&n.id==='cam-c')tradeoff='約 32 m 的釋球視角，改用長焦與交叉量測；本配置不承諾可看清球縫或直接量轉速。';
    if(field&&n.type==='radar60')tradeoff='移到活動區外後，距離與雜波可能使高速小球不可測；驗證失敗時省略此節點，不移回場內。';
    return {...n,...mount,mountKind:n.type==='edge'?'cabinet':'structure',clearanceM:clearance,tradeoff,
      role:n.id==='cam-d'?'場外高位斜視本壘，補充交叉視角；不是懸掛在打者正上方。':n.role};
  });
}
