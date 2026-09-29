// Public routes: #<scene>/<panel>. Legacy v3 links (#build/poc/plan, #poc/spin) still resolve.
export const SCENES=['bullpen','pilot','full'];
export const PANELS=['nodes','theory','replay'];
const legacyPanel={dashboard:'replay',nodes:'nodes',spin:'theory',plan:'theory',metrics:'theory',flow:'theory'};
export function parseRoute(hash=''){
  const parts=hash.replace(/^#/,'').split('/').filter(Boolean);
  if(['build','buy'].includes(parts[0]))parts.shift();
  const scene=parts[0]==='poc'?'bullpen':SCENES.includes(parts[0])?parts[0]:'bullpen';
  const panel=PANELS.includes(parts[1])?parts[1]:legacyPanel[parts[1]]??'nodes';
  return {scene,panel};
}
export const sceneInfo={
  bullpen:{name:'牛棚',title:'牛棚 · 投捕通道'},
  pilot:{name:'局部球場',title:'球場 · 投捕＋打擊區'},
  full:{name:'全場',title:'全場 · 球員與守備'},
};
