import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { colors } from './nodes.js';
import { PLATE, BALL_RADIUS, positionAt } from './pitch.js';
import { activityBoundary } from './deployment.js';

export class FieldScene {
  constructor(host, labels, onSelect) {
    this.host=host;this.labels=labels;this.onSelect=onSelect;this.nodes=[];this.picks=[];
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(46,1,.2,550);
    this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
    host.appendChild(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;
    this.controls.minDistance=1.5;this.controls.maxDistance=260;this.controls.maxPolarAngle=Math.PI*.485;
    this.ambient=new THREE.HemisphereLight('#daeaff','#445639',2.1);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight('#fff0d6',3.2);this.sun.position.set(-42,65,26);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-65,right:65,top:55,bottom:-90,near:.5,far:230});
    this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.025;this.scene.add(this.sun);
    this.root=new THREE.Group();this.scene.add(this.root);this.fx=new THREE.Group();this.scene.add(this.fx);
    this.fovs=new THREE.Group();this.scene.add(this.fovs);this.zoneGroup=new THREE.Group();this.scene.add(this.zoneGroup);
    this.clearanceGroup=new THREE.Group();this.scene.add(this.clearanceGroup);this.clearanceGroup.visible=false;
    this.grass=this.texture('grass');this.dirt=this.texture('dirt');this.netTexture=this.texture('net');
    this.ball=new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS,20,12),this.material('#f9f2e3'));
    const seamMat=new THREE.LineBasicMaterial({color:'#b72825'});
    for(let k=0;k<2;k++){
      const pts=Array.from({length:81},(_,i)=>{const a=i/80*Math.PI*2;return new THREE.Vector3(Math.cos(a)*.028,Math.sin(a)*.028,Math.sin(a*2+k*Math.PI)*.014+(k?-.012:.012)).normalize().multiplyScalar(BALL_RADIUS*1.015)});
      this.ball.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),seamMat));
    }
    this.ball.visible=false;this.scene.add(this.ball);
    // The halo is a screen aid, not an enlarged measurement ball.
    this.halo=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),new THREE.MeshBasicMaterial({color:'#ffd785',transparent:true,opacity:.18,depthWrite:false}));
    this.ball.add(this.halo);
    this.night=false;this.showCoverage=false;this.showLabels=true;this.selected='cam-a';
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();
    this.renderer.domElement.addEventListener('click',e=>{
      const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
      this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObjects(this.picks)[0];if(hit)this.onSelect(hit.object.userData.id);
    });
    new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h)}).observe(host);
    this.setLight(false);this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
  }
  material(color,map=null){return new THREE.MeshStandardMaterial({color,map,roughness:.88})}
  texture(kind){
    const c=document.createElement('canvas');c.width=c.height=kind==='net'?64:512;const ctx=c.getContext('2d');
    let seed=12345;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    if(kind==='net'){ctx.clearRect(0,0,64,64);ctx.strokeStyle='rgba(125,143,148,.65)';ctx.lineWidth=1.4;ctx.strokeRect(0,0,64,64)}
    else {ctx.fillStyle=kind==='grass'?'#567a40':'#b88865';ctx.fillRect(0,0,512,512);for(let i=0;i<24000;i++){ctx.fillStyle=kind==='grass'?`rgba(${50+rnd()*85},${80+rnd()*80},${25+rnd()*40},.22)`:`rgba(${105+rnd()*100},${65+rnd()*85},${35+rnd()*70},.2)`;ctx.fillRect(rnd()*512,rnd()*512,kind==='grass'?1:2,kind==='grass'?4:2)}}
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(kind==='net'?1:kind==='grass'?35:4,kind==='net'?1:kind==='grass'?35:4);tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return tex;
  }
  mesh(geo,mat,pos,parent=this.root){const o=new THREE.Mesh(geo,mat);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
  box(w,h,d,color,pos,parent=this.root){return this.mesh(new THREE.BoxGeometry(w,h,d),this.material(color),pos,parent)}
  line(points,color,parent=this.root,opacity=1){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(o);return o}
  rod(a,b,r,color,parent=this.root){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const o=this.mesh(new THREE.CylinderGeometry(r,r,v.length(),8),this.material(color),a,parent);o.position.addScaledVector(v,.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o}
  patch(points,color,y=.02,map=null){const shape=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z)));const mesh=this.mesh(new THREE.ShapeGeometry(shape),this.material(color,map),[0,y,0]);mesh.rotation.x=-Math.PI/2;mesh.castShadow=false;return mesh}
  disk(r,color,x,z,y=.025,map=null){const o=this.mesh(new THREE.CircleGeometry(r,80),this.material(color,map),[x,y,z]);o.rotation.x=-Math.PI/2;o.castShadow=false;return o}
  arcPatch(inner,outer,a0,a1,color,y=.01){const pts=[];for(let i=0;i<=70;i++){const a=a0+(a1-a0)*i/70;pts.push([Math.sin(a)*outer,-Math.cos(a)*outer])}for(let i=70;i>=0;i--){const a=a0+(a1-a0)*i/70;pts.push([Math.sin(a)*inner,-Math.cos(a)*inner])}return this.patch(pts,color,y)}
  net(a,b,height){
    const len=Math.hypot(b[0]-a[0],b[1]-a[1]);const tex=this.netTexture.clone();tex.repeat.set(len*5,height*5);tex.needsUpdate=true;
    const mesh=this.mesh(new THREE.PlaneGeometry(len,height),new THREE.MeshStandardMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false,roughness:1}),[(a[0]+b[0])/2,height/2,(a[1]+b[1])/2]);
    mesh.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);mesh.castShadow=false;
    for(let i=0;i<=Math.ceil(len/4);i++){const u=i/Math.ceil(len/4);this.rod([a[0]+(b[0]-a[0])*u,0,a[1]+(b[1]-a[1])*u],[a[0]+(b[0]-a[0])*u,height,a[1]+(b[1]-a[1])*u],.045,'#73878a')}
    this.rod([a[0],height,a[1]],[b[0],height,b[1]],.035,'#73878a');
  }
  textSign(text,w,h,pos,rotation=0){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#102c35';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#5c857a';ctx.lineWidth=6;ctx.strokeRect(8,8,1008,240);ctx.textAlign='center';ctx.fillStyle='#e9dfbd';ctx.font='bold 66px sans-serif';ctx.fillText(text,512,153);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const mesh=this.mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}),pos);mesh.rotation.y=rotation;return mesh;
  }
  drawField(){
    const isField=['pilot','full'].includes(this.stage),lab=this.stage==='poc'&&this.site==='lab';
    if(isField){
      this.patch([[-145,45],[145,45],[145,-145],[-145,-145]],'#677961',-.12);
      for(let i=0;i<15;i++)this.arcPatch(i*7.35,(i+1)*7.35,-Math.PI/4,Math.PI/4,i%2?'#527e45':'#619052',.004);
      // Apply texture to individual bands; avoid overlapping transparent ground planes.
      for(const band of this.root.children.slice(-15)){band.material.map=this.grass;band.material.color.set(band.material.color.getHex()===0x527e45?'#dce9cb':'#ffffff')}
      this.arcPatch(105,111,-Math.PI/4,Math.PI/4,'#ad8262',.014);
      this.disk(27.4,'#dcc09e',0,-18.44,.018,this.dirt);
      this.patch([[0,-4.4],[15.5,-19.4],[0,-34.4],[-15.5,-19.4]],'#eef4d7',.045,this.grass);
      const side=27.432/Math.sqrt(2);
      for(const [x,z] of [[side,-side],[0,-2*side],[-side,-side]]){this.disk(2.25,'#d4b18a',x,z,.035,this.dirt);const base=this.box(.4572,.075,.4572,'#eeeada',[x,.09,z]);base.rotation.y=Math.PI/4}
      for(const s of [-1,1]){
        this.rod([s*.08,.042,-.08],[s*78.49,.042,-78.49],.033,'#f9f3df');
        this.rod([s*78.49,0,-78.49],[s*78.49,15,-78.49],.10,'#efc651');
        const boxX=s*7.8;this.line([[boxX,.05,-7],[boxX+s*2,.05,-9],[boxX+s*7,.05,-14],[boxX+s*5,.05,-12],[boxX,.05,-7]],'#eee9d5');
      }
      for(let i=0;i<56;i++){
        const a=-Math.PI/4+(i+.5)*Math.PI/2/56;const x=Math.sin(a)*111,z=-Math.cos(a)*111;
        const wall=this.box(3.18,3.3,.55,i%7===0?'#284d4d':'#214947',[x,1.65,z]);wall.rotation.y=-a;
      }
      for(let row=0;row<9;row++){
        this.arcPatch(113+row*1.25,114+row*1.25,-Math.PI/4-.08,Math.PI/4+.08,row%2?'#84939c':'#a9b0ae',.5+row*.62);
        const count=140,geo=new THREE.BoxGeometry(.67,.4,.6),mat=this.material(row%3===0?'#395c72':'#597784');const chairs=new THREE.InstancedMesh(geo,mat,count);const dummy=new THREE.Object3D();
        for(let j=0;j<count;j++){const a=-Math.PI/4-.07+(Math.PI/2+.14)*j/(count-1),r=113.5+row*1.25;dummy.position.set(Math.sin(a)*r,1+row*.62,-Math.cos(a)*r);dummy.rotation.y=-a;dummy.updateMatrix();chairs.setMatrixAt(j,dummy.matrix)}this.root.add(chairs);
      }
      // Low grandstands and dugouts along both foul sides.
      for(const s of [-1,1]){
        const stands=new THREE.Group();stands.position.set(s*25,0,-11);stands.rotation.y=s*Math.PI/4;this.root.add(stands);
        for(let row=0;row<7;row++)this.box(30,.5,1.25,row%2?'#638091':'#8e9da4',[0,.5+row*.6,row*1.3],stands);
        this.box(12,2.4,.3,'#31545a',[s*14,1.2,-7]);this.box(12,.18,3,'#879b9b',[s*14,2.45,-5.6]);this.box(10,.18,.6,'#a68a64',[s*14,.6,-6]);
      }
      this.textSign('FIELD LAB  /  DIGITAL TWIN',26,5,[0,10,-112]);this.textSign('110 m',5,1.5,[0,1.8,-110.65]);
      for(const [x,z] of [[-68,-38],[68,-38],[-38,-112],[38,-112]]){
        this.rod([x,0,z],[x,29,z],.22,'#9eabad');this.box(5,1.8,.5,'#cad5cf',[x,29,z]);
        const bulbs=this.box(4.6,1.4,.08,'#fff6d7',[x,29,z+.28]);bulbs.material.emissive=new THREE.Color('#fff0c9');bulbs.material.emissiveIntensity=1;
      }
      this.net([-9,5],[9,5],5);this.net([-9,5],[-15,-4],5);this.net([9,5],[15,-4],5);
      if(this.stage==='full')for(const [i,x,z] of [[3,18,-23],[4,11,-35],[5,-19,-24],[6,-12,-34],[7,-36,-66],[8,0,-84],[9,36,-66]])this.player([x,0,z],'fielder',i);
    }else{
      this.patch([[-10,7],[10,7],[10,-24],[-10,-24]],lab?'#b2b8b5':'#657c59',-.04);
      this.patch([[-3,4],[3,4],[3,-21],[-3,-21]],'#6b915a',0,this.grass);
      this.patch([[-1.15,2],[1.15,2],[1.15,-19.8],[-1.15,-19.8]],'#bea57d',.014,this.dirt);
      this.net([-5,4],[-5,-22],3.5);this.net([5,4],[5,-22],3.5);this.net([-5,4],[5,4],3.5);
      if(lab){
        for(const x of [-8,8]){this.box(.2,4.5,29,'#a7afb1',[x,2.25,-9]);for(let z=-20;z<5;z+=6){this.box(.28,5,.28,'#4f6570',[x,2.5,z]);this.rod([-8,4.9,z],[8,4.9,z],.07,'#71878e')}}
        this.textSign('PITCH LAB  /  CALIBRATION',6,1.1,[0,2.5,-22]);
      }else{this.box(5,.15,.5,'#b2986b',[7,.6,-8]);this.textSign('BULLPEN  /  TRACKING',6,1.1,[0,2.5,-22])}
    }
    // A gently raised mound with a flat rubber area; regulation-inspired dimensions.
    const mound=this.mesh(new THREE.CylinderGeometry(.85,2.74,.254,64),this.material('#c9ab86',this.dirt),[0,.127,PLATE.rubberZ]);
    this.box(.6096,.035,.1524,'#eee8d6',[0,.275,PLATE.rubberZ]);
    this.disk(2.5,'#d3b38b',0,.0,.034,this.dirt);
    this.patch([[0,0],[-.2159,-.2159],[-.2159,-.4318],[.2159,-.4318],[.2159,-.2159]],'#fff5da',.048);
    for(const x of [-1,1])this.line([[x-.3,.05,.38],[x+.3,.05,.38],[x+.3,.05,-1.45],[x-.3,.05,-1.45],[x-.3,.05,.38]],'#f4edda');
    this.player([0,.26,PLATE.rubberZ],'pitcher',17);this.player([0,0,1.1],'catcher',2);
    if(isField)this.player([-.95,0,-.2],'batter',8);
  }
  player(pos,role,num){
    const g=new THREE.Group();g.position.set(...pos);this.root.add(g);const crouch=role==='catcher';
    const hips=crouch?.48:.94,shoulder=crouch?.92:1.45;const kit=role==='batter'?'#c3a477':'#f0e8d4',dark='#234758',skin='#c89571';
    this.mesh(new THREE.CylinderGeometry(.19,.16,shoulder-hips,12),this.material(kit),[0,(shoulder+hips)/2,0],g);
    this.mesh(new THREE.CylinderGeometry(.055,.06,.16,10),this.material(skin),[0,shoulder+.055,0],g);
    this.mesh(new THREE.SphereGeometry(.13,14,10),this.material(skin),[0,shoulder+.2,crouch?-.05:0],g);
    this.mesh(new THREE.SphereGeometry(.142,12,8,0,Math.PI*2,0,Math.PI/2),this.material(dark),[0,shoulder+.23,0],g);
    for(const s of [-1,1]){
      const knee=[s*(crouch?.27:.12),crouch?.22:.48,crouch?-.22:0],foot=[s*.19,.08,.12];
      this.rod([s*.1,hips,0],knee,.085,kit,g);this.rod(knee,foot,.065,kit,g);this.box(.13,.1,.25,dark,[foot[0],.055,foot[2]+.05],g);
      const elbow=[s*.3,shoulder-.25,role==='pitcher'?.18:-.14],hand=[s*.15,shoulder-.2,role==='pitcher'?.4:-.38];
      this.rod([s*.2,shoulder-.06,0],elbow,.057,kit,g);this.rod(elbow,hand,.05,skin,g);
      if(s===-1)this.mesh(new THREE.SphereGeometry(.10,10,8),this.material('#9c643b'),hand,g);
    }
    if(crouch){this.box(.30,.34,.07,dark,[0,.8,-.17],g);for(let y=.93;y<1.18;y+=.055)this.rod([-.13,y,-.18],[.13,y,-.18],.008,'#9ba7a3',g)}
    if(role==='batter')this.rod([.14,1.15,-.3],[.43,1.95,-.4],.033,'#c99455',g);
    g.userData={role,num};if(role==='pitcher')this.pitcher=g;
  }
  device(n){
    const g=new THREE.Group();g.position.set(...n.pos);g.lookAt(new THREE.Vector3(...n.target));this.root.add(g);
    const c=colors[n.type],body=this.box(n.type==='edge'?.48:.28,n.type==='edge'?.64:.19,n.type==='edge'?.35:.42,c,[0,0,0],g);
    body.material.roughness=.38;body.material.metalness=.25;body.userData.id=n.id;this.picks.push(body);n.body=body;
    if(n.type==='camera'){
      const lens=this.mesh(new THREE.CylinderGeometry(.068,.068,.2,20),this.material('#1b252e'),[0,0,.28],g);lens.rotation.x=Math.PI/2;
      const glass=this.mesh(new THREE.CircleGeometry(.061,20),new THREE.MeshStandardMaterial({color:'#426b83',metalness:.8,roughness:.1}),[0,0,.385],g);glass.userData.id=n.id;this.picks.push(glass);
    }else if(n.type==='edge'){
      for(let y=-.2;y<.25;y+=.08)this.box(.35,.02,.025,'#263b3e',[0,y,.19],g);
      this.box(.04,.04,.02,'#b8ffb4',[.12,.25,.19],g);
    }else{this.box(.21,.14,.035,'#edf0e9',[0,0,.23],g)}
    if(n.mountKind==='cabinet'){
      this.box(.65,.8,.55,'#607777',[n.pos[0],.45,n.pos[2]]);
    }
    else{
      // Existing structure is schematic; all columns and brackets remain outside
      // the activity boundary. No sensor tripod or mast stands on the playing surface.
      const [ax,ay,az]=n.anchor;
      this.box(.24,ay+.45,.24,'#667d81',[ax,(ay+.45)/2,az]);
      this.box(.45,.28,.14,'#869b9c',n.anchor);
      this.rod(n.anchor,n.pos,.036,'#bac4c2');
      this.line([[ax,.08,az],[ax,ay,az]],'#7dc5b6',this.root,.35);
      const o=new THREE.Vector3(...n.pos),t=new THREE.Vector3(...n.target),d=t.clone().sub(o),len=d.length();
      if(n.type==='camera'){
        const right=new THREE.Vector3().crossVectors(d.clone().normalize(),new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(right,d.clone().normalize()).normalize();
        const w=Math.min(12,len*.24),h=w*.6,cs=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>t.clone().addScaledVector(right,w*a).addScaledVector(up,h*b));
        for(const p of cs)this.line([o.toArray(),p.toArray()],c,this.fovs,.35);this.line([...cs,cs[0]].map(v=>v.toArray()),c,this.fovs,.5);
      }else{
        const cone=this.mesh(new THREE.ConeGeometry(Math.min(6,len*.20),len,24,1,true),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.065,side:THREE.DoubleSide,depthWrite:false}),o.clone().addScaledVector(d,.5).toArray(),this.fovs);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),d.normalize());
      }
      this.line([n.pos,n.target],c,this.fovs,.35);
    }
    const pin=document.createElement('button');pin.type='button';pin.className='pin';pin.style.setProperty('--c',c);pin.textContent=n.name;pin.onclick=()=>this.onSelect(n.id);this.labels.appendChild(pin);n.pin=pin;
  }
  clear(group){
    const geometries=new Set(),materials=new Set(),textures=new Set();
    group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m.map&&![this.grass,this.dirt,this.netTexture].includes(m.map))textures.add(m.map)}});
    group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  }
  rebuild(stage,site,nodes){
    this.stage=stage;this.site=site;this.nodes=nodes;this.picks=[];this.clear(this.root);this.clear(this.fovs);this.clear(this.clearanceGroup);this.labels.innerHTML='';
    this.drawField();nodes.forEach(n=>this.device(n));
    const boundary=activityBoundary(stage),points=[...boundary,boundary[0]].map(([x,z])=>[x,.12,z]);
    this.line(points,'#85ffce',this.clearanceGroup);
    for(const n of nodes){
      const ring=this.mesh(new THREE.RingGeometry(.65,.72,32),new THREE.MeshBasicMaterial({color:'#85ffce',side:THREE.DoubleSide,transparent:true,opacity:.85}),[n.pos[0],.12,n.pos[2]],this.clearanceGroup);ring.rotation.x=-Math.PI/2;
    }
    this.fovs.visible=this.showCoverage;this.select(this.selected);this.setView('angle');
  }
  select(id){this.selected=id;for(const n of this.nodes){n.body.material.emissive.set(n.id===id?colors[n.type]:'#000000');n.body.material.emissiveIntensity=.32;n.pin.classList.toggle('selected',n.id===id)}}
  setLight(night){this.night=night;const sky=night?'#152a41':'#abc3ce';this.scene.background=new THREE.Color(sky);this.scene.fog=new THREE.Fog(sky,170,470);this.ambient.intensity=night?.85:2.1;this.sun.intensity=night?1.8:3.2;this.sun.color.set(night?'#b5d9ff':'#fff0d6');this.renderer.toneMappingExposure=night?.95:1.1}
  setView(kind){
    const field=['pilot','full'].includes(this.stage);let target=[0,.5,field?-42:-9],pos=[field?82:24,field?88:21,field?88:23];
    if(kind==='top')pos=[0,field?153:35,target[2]+.02];
    if(kind==='side')pos=[field?85:28,field?32:8,target[2]+7];
    if(kind==='plate'){pos=[1.4,2.0,5.2];target=[0,.8,-1.7]}
    if(kind==='pitcher'){pos=[2,3,-21.5];target=[0,.8,-.2]}
    this.controls.target.set(...target);this.camera.position.set(...pos);this.controls.update();
  }
  setPitch(pitch){
    this.pitch=pitch;this.clear(this.fx);this.clear(this.zoneGroup);const z=pitch.zone;
    const zone=this.mesh(new THREE.PlaneGeometry(z.right-z.left,z.top-z.bottom),new THREE.MeshBasicMaterial({color:'#ffd885',transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false}),[0,(z.top+z.bottom)/2,z.planeZ],this.zoneGroup);
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(zone.geometry),new THREE.LineBasicMaterial({color:'#ffe2a2'}));edges.position.copy(zone.position);this.zoneGroup.add(edges);
    for(let i=1;i<3;i++){
      const x=z.left+(z.right-z.left)*i/3,y=z.bottom+(z.top-z.bottom)*i/3;
      this.line([[x,z.bottom,z.planeZ],[x,z.top,z.planeZ]],'#ffe2a2',this.zoneGroup,.5);
      this.line([[z.left,y,z.planeZ],[z.right,y,z.planeZ]],'#ffe2a2',this.zoneGroup,.5);
    }
    const pts=Array.from({length:121},(_,i)=>new THREE.Vector3(...positionAt(pitch,pitch.duration*i/120)));
    const curve=new THREE.CatmullRomCurve3(pts);
    this.mesh(new THREE.TubeGeometry(curve,120,.015,6,false),new THREE.MeshBasicMaterial({color:pitch.profile.color,transparent:true,opacity:.6}),[0,0,0],this.fx);
    const marker=this.mesh(new THREE.RingGeometry(BALL_RADIUS*.9,BALL_RADIUS*1.15,32),new THREE.MeshBasicMaterial({color:pitch.decision.call==='STRIKE'?'#70f4bc':pitch.decision.call==='BALL'?'#ff927a':'#ffdb87',side:THREE.DoubleSide}),pitch.target,this.fx);
    marker.position.z+=.008;this.ball.position.set(...pitch.release);this.ball.visible=true;
  }
  moveBall(u){if(!this.pitch)return;this.ball.position.set(...positionAt(this.pitch,this.pitch.duration*u));this.ball.rotation.set(u*9,u*13,u*3);if(this.pitcher)this.pitcher.rotation.x=-Math.sin(u*Math.PI)*.14}
  frame(){
    requestAnimationFrame(this.frame);this.controls.update();const w=this.host.clientWidth,h=this.host.clientHeight,placed=[];
    // Give the selected label priority, suppress overlaps in wide stadium views.
    for(const n of [...this.nodes].sort((a,b)=>(b.id===this.selected)-(a.id===this.selected))){
      const p=new THREE.Vector3(...n.pos).add(new THREE.Vector3(0,.45,0)).project(this.camera),x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h;
      const overlap=placed.some(q=>Math.abs(q.x-x)<118&&Math.abs(q.y-y)<25);
      const visible=this.showLabels&&p.z<1&&p.z>-1&&x>35&&x<w-35&&y>16&&y<h-65&&!overlap;
      n.pin.style.display=visible?'block':'none';if(visible){n.pin.style.left=`${x}px`;n.pin.style.top=`${y}px`;placed.push({x,y})}
    }
    if(this.onFrame)this.onFrame(performance.now());this.renderer.render(this.scene,this.camera);
  }
}
