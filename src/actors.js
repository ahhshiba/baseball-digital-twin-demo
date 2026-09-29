import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Procedural generic athletes: articulated reference poses, not motion capture.
export function makeAthlete(role, number) {
  const root=new THREE.Group();root.name=`athlete-${role}`;root.userData={role,number};
  const kit=role==='batter'?'#ded5bd':'#ece9dc',navy='#183f52',trim='#c2984e',skin='#be8d6f';
  const materials=new Map();
  const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:color===skin?.72:.91}));return materials.get(color)};
  const mesh=(geo,color,pos,parent=root)=>{const o=new THREE.Mesh(geo,mat(color));o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
  const ellipsoid=(pos,scale,color,parent=root)=>{const o=mesh(new THREE.SphereGeometry(1,20,14),color,pos,parent);o.scale.set(...scale);return o};
  const segment=(a,b,r0,r1,color,parent=root)=>{
    const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const o=mesh(new THREE.CylinderGeometry(r1,r0,delta.length(),14),color,a,parent);
    o.position.addScaledVector(delta,.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;
  };
  const stitch=(pts,color,parent=root,r=.003)=>{const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,16,r,5,false),color,[0,0,0],parent)};
  const glove=(p,catcher=false)=>{
    const g=new THREE.Group();g.position.set(...p);root.add(g);g.rotation.x=catcher?-.2:.2;
    ellipsoid([0,0,0],[.115,.125,.045],'#865031',g);ellipsoid([0,0,-.025],[.077,.089,.025],'#432e24',g);
    for(let i=0;i<5;i++){const a=(i-2)*.35;ellipsoid([Math.sin(a)*.10,Math.cos(a)*.08,-.008],[.027,.07,.032],'#a46c41',g)}
    for(let i=-2;i<=2;i++)stitch([[i*.022,.04,-.04],[i*.024,.095,-.032]],'#c5a179',g,.0025);
    return g;
  };
  const catcher=role==='catcher',pitcher=role==='pitcher',batter=role==='batter',fielder=role==='fielder';
  // Role-specific reference poses. Coordinates are metres in the local athlete frame.
  // Keeping pelvis/chest/feet in one coherent chain avoids detached-looking limbs.
  const poses={
    catcher:{pelvis:[0,.58,.08],chest:[0,.97,-.13],head:[0,1.21,-.18],
      knees:[[-.34,.38,-.20],[.34,.38,-.20]],ankles:[[-.38,.09,.02],[.38,.09,.02]],
      elbows:[[-.29,.81,-.30],[.28,.80,-.18]],hands:[[-.10,.76,-.52],[.12,.72,-.10]]},
    pitcher:{pelvis:[0,.86,.36],chest:[.04,1.27,.72],head:[.08,1.55,.80],
      knees:[[-.24,.50,.88],[.18,.50,.02]],ankles:[[-.30,.09,1.15],[.21,.09,-.18]],
      elbows:[[-.30,1.10,.99],[.37,1.43,1.10]],hands:[[-.12,1.06,1.20],[.34,1.40,1.43]]},
    batter:{pelvis:[0,.93,0],chest:[0,1.39,-.02],head:[0,1.70,-.02],
      knees:[[-.23,.50,.08],[.23,.50,-.08]],ankles:[[-.29,.09,.16],[.29,.09,-.16]],
      elbows:[[-.32,1.22,-.06],[.31,1.22,.04]],hands:[[-.11,1.36,-.28],[.15,1.42,-.18]]},
    fielder:{pelvis:[0,.91,0],chest:[0,1.34,-.03],head:[0,1.65,-.03],
      knees:[[-.24,.53,.12],[.22,.50,-.10]],ankles:[[-.32,.09,.18],[.29,.09,-.15]],
      elbows:[[-.32,1.15,-.10],[.30,1.13,-.02]],hands:[[-.42,1.00,-.20],[.40,1.01,-.05]]},
  };
  const pose=poses[role]||poses.fielder;
  const pelvis=pose.pelvis;
  const chest=pose.chest;
  const torso=new THREE.Group();torso.position.set(...pelvis);root.add(torso);
  const trunk=new THREE.Vector3(...chest).sub(new THREE.Vector3(...pelvis));torso.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),trunk.clone().normalize());
  const length=trunk.length();
  const profile=[[.0,0],[.15,.015],[.165,length*.28],[.205,length*.76],[.22,length*.9],[.15,length],[.08,length+.035]].map(([r,y])=>new THREE.Vector2(r,y));
  const jersey=mesh(new THREE.LatheGeometry(profile,24),kit,[0,0,0],torso);jersey.scale.z=.72;
  ellipsoid([0,.005,0],[.17,.1,.115],kit,torso);
  const belt=mesh(new THREE.CylinderGeometry(.163,.163,.033,24),navy,[0,.052,0],torso);belt.scale.z=.74;
  mesh(new THREE.BoxGeometry(.045,.033,.015),trim,[0,.052,-.129],torso);
  for(const x of [-.02,.02])stitch([[x,.11,-.125],[x,length*.55,-.15],[x,length*.91,-.145]],'#c0c5be',torso,.0025);
  for(let y=.13;y<length-.05;y+=.073)ellipsoid([0,y,-.153],[.006,.006,.003],'#9da99f',torso);
  // Jersey number as a decal, isolated in the athlete group so it fades too.
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,128,128);ctx.fillStyle=navy;ctx.font='bold 92px sans-serif';ctx.textAlign='center';ctx.fillText(String(number),64,100);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const badge=new THREE.Mesh(new THREE.PlaneGeometry(.18,.20),new THREE.MeshStandardMaterial({map:texture,roughness:1,transparent:true,alphaTest:.01,depthWrite:false}));badge.position.set(0,length*.65,.152);torso.add(badge);
  }
  const headPos=pose.head;
  segment([chest[0],chest[1],chest[2]],headPos,.054,.052,skin);
  const head=new THREE.Group();head.position.set(...headPos);if(pitcher)head.rotation.y=Math.PI;root.add(head);
  ellipsoid([0,0,0],[.095,.127,.091],skin,head);
  ellipsoid([0,-.048,-.012],[.08,.07,.077],skin,head);
  ellipsoid([0,.0,-.092],[.018,.025,.025],skin,head);
  for(const s of [-1,1]){
    ellipsoid([s*.094,-.005,0],[.016,.028,.017],skin,head);
    ellipsoid([s*.034,.027,-.081],[.010,.006,.004],'#323838',head);
    stitch([[s*.052,.046,-.08],[s*.023,.048,-.09]],'#453b32',head,.004);
  }
  const helmet=mesh(new THREE.SphereGeometry(.103,22,14,0,Math.PI*2,0,Math.PI*.58),navy,[0,.042,0],head);helmet.scale.z=1.08;
  ellipsoid([0,.06,-.10],[.105,.012,.085],navy,head);
  if(batter)ellipsoid([.102,.005,0],[.018,.095,.083],navy,head);
  const hips=[[-.10+pelvis[0],pelvis[1],pelvis[2]],[.10+pelvis[0],pelvis[1],pelvis[2]]];
  const knees=pose.knees;
  const ankles=pose.ankles;
  for(let i=0;i<2;i++){
    segment(hips[i],knees[i],.099,.077,kit);ellipsoid(knees[i],[.078,.085,.078],kit);segment(knees[i],ankles[i],.075,.048,kit);
    const shoe=ellipsoid([ankles[i][0],ankles[i][1]-.03,ankles[i][2]-.045],[.066,.052,.145],navy);
    if(pitcher)shoe.position.z+=.085;
    stitch([[ankles[i][0]-.04,ankles[i][1]-.037,shoe.position.z-.08],[ankles[i][0]+.04,ankles[i][1]-.037,shoe.position.z-.08]],'#eee8d5',root,.006);
  }
  const shoulders=[[-.19+chest[0],chest[1]-.01,chest[2]],[.19+chest[0],chest[1]-.01,chest[2]]];
  const elbows=pose.elbows;
  const hands=pose.hands;
  for(let i=0;i<2;i++){
    ellipsoid(shoulders[i],[.095,.089,.085],kit);segment(shoulders[i],elbows[i],.076,.058,kit);
    ellipsoid(elbows[i],[.055,.055,.055],skin);segment(elbows[i],hands[i],.052,.032,skin);ellipsoid(hands[i],[.038,.055,.025],skin);
  }
  glove(hands[0],catcher||fielder);
  if(catcher){
    const armor=ellipsoid([0,.81,-.237],[.185,.255,.055],navy);armor.rotation.x=-.16;
    for(let y=.65;y<1.0;y+=.055)stitch([[-.13,y,-.27],[0,y-.014,-.302],[.13,y,-.27]],'#355e6c',root,.013);
    for(let i=0;i<2;i++){
      ellipsoid([knees[i][0],knees[i][1],knees[i][2]-.063],[.087,.105,.042],navy);
      const shin=segment([knees[i][0],knees[i][1]-.05,knees[i][2]-.06],[ankles[i][0],ankles[i][1]+.04,ankles[i][2]-.055],.066,.05,navy);shin.scale.z=.75;
    }
    for(let y=-.085;y<=.095;y+=.045)stitch([[-.108,y,-.07],[-.09,y,-.14],[0,y-.005,-.16],[.09,y,-.14],[.108,y,-.07]],'#859a9b',head,.006);
    for(const x of [-.07,0,.07])stitch([[x,-.09,-.135],[x,.025,-.164],[x,.105,-.123]],'#9eb0ad',head,.005);
  }
  // The bat follows the batter's hands and rests over the back shoulder instead
  // of floating vertically through the torso.
  if(batter){segment(hands[1],[.58,1.93,.06],.013,.031,'#b68450');segment(hands[0],hands[1],.016,.017,'#243b3c')}
  // The reference pose is static: batch body parts by material to keep the full
  // field inexpensive to render. Filtering still includes every piece of gear.
  root.updateMatrixWorld(true);const batches=new Map(),originals=new Set();let partCount=0;
  root.traverse(o=>{if(!o.isMesh)return;partCount++;originals.add(o.geometry);const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(geometry)});
  root.clear();for(const [material,parts] of batches){const combined=mergeGeometries(parts);const m=new THREE.Mesh(combined,material);m.castShadow=true;m.receiveShadow=true;root.add(m);parts.forEach(p=>p.dispose())}
  originals.forEach(g=>g.dispose());root.userData.partCount=partCount;
  return root;
}
