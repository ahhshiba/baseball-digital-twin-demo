// World [right, pitcher, up] -> Three.js [right, up, catcher], both right-handed.
export const toScene = ([x,y,z])=>[x,z,-y];
export const toWorld = ([x,y,z])=>[x,-z,y];
export function unit(v){const len=Math.hypot(...v);if(!len)throw new RangeError('Non-zero direction required');return v.map(x=>x/len);}
// Illustrative axes only; not inferred from the trajectory or used to fit its forces.
export const syntheticAxes = {FF:unit([-1,.08,-.18]),SL:unit([.30,.80,.52]),CU:unit([.90,.10,.38]),CH:unit([-.86,.37,-.35])};
export function opticsEstimate({distanceM=3,focalMm=25,exposureUs=5,speedMps=55,rpm=3000,width=720,pixelUm=6.9,fps=522,transverseFactor=1,ballDiameterM=.073}={}){
  const positive=[distanceM,focalMm,exposureUs,speedMps,rpm,width,pixelUm,fps,ballDiameterM];
  if(positive.some(x=>!Number.isFinite(x)||x<=0)||!Number.isFinite(transverseFactor)||transverseFactor<0||transverseFactor>1)throw new RangeError('Invalid optics parameters');
  const fovM=width*pixelUm*1e-6*distanceM/(focalMm*1e-3),ballPx=ballDiameterM*width/fovM,transverseSpeed=speedMps*transverseFactor;
  const dwellMs=transverseSpeed>.1?fovM/transverseSpeed*1000:null,frames=dwellMs===null?null:fps*dwellMs/1000;
  const blurPx=transverseSpeed*exposureUs*1e-6*ballPx/ballDiameterM,rotationSurfaceSpeed=Math.PI*ballDiameterM*rpm/60;
  const conservativeBlurPx=(transverseSpeed+rotationSurfaceSpeed)*exposureUs*1e-6*ballPx/ballDiameterM;
  const warnings=[];
  if(ballPx<80)warnings.push('球像低於80px：球縫可辨識度風險');
  if(blurPx>.5)warnings.push('平移拖影高於0.5px：縮短曝光 / 驗證照明');
  if(frames!==null&&frames<8)warnings.push('橫越可見影格少於8張：視野與fps互相制約');
  if(frames===null)warnings.push('近軸向：此橫越公式不適用，需計算景深與遮擋');
  return {fovM,ballPx,dwellMs,frames,blurPx,conservativeBlurPx,framesPerRev:fps*60/rpm,warnings};
}
export function observationGeometry(node){const d=node.target.map((x,i)=>x-node.pos[i]),distanceM=Math.hypot(...d),axial=Math.abs(d[2])/distanceM;return {distanceM,transverseFactor:Math.sqrt(Math.max(0,1-axial*axial))};}
