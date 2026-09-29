import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { colors } from './nodes.js';
import { PLATE, BALL_RADIUS, positionAt } from './pitch.js';
import { activityBoundary } from './deployment.js';
import { makeAthlete } from './actors.js';
import { setActorOpacity } from './actor-visibility.js';
import { syntheticAxes, toScene } from './optics.js';

export class FieldScene {
  constructor(host, labels, onSelect) {
    this.host=host;this.labels=labels;this.onSelect=onSelect;this.nodes=[];this.picks=[];
    this.actors=[];this.actorFilters={pitcher:false,catcher:false};this.ghostOpacity=.25;
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
    this.sun.shadow.bias=-.00015;this.sun.shadow.normalBias=.018;this.scene.add(this.sun);
    this.fill=new THREE.DirectionalLight('#c9e2ed',.55);this.fill.position.set(36,24,-60);this.scene.add(this.fill);
    this.sky=new THREE.Mesh(new THREE.SphereGeometry(440,24,16),new THREE.ShaderMaterial({
      uniforms:{top:{value:new THREE.Color('#779eb8')},bottom:{value:new THREE.Color('#d4dedc')}},
      vertexShader:'varying vec3 vDir; void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 vDir;void main(){float t=smoothstep(-0.12,0.85,normalize(vDir).y);gl_FragColor=vec4(mix(bottom,top,t),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
      side:THREE.BackSide,depthWrite:false,depthTest:false}));this.sky.renderOrder=-10;this.scene.add(this.sky);
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
    this.showSpinAxis=true;
    this.spinAxis=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.65,'#bf92ff',.14,.085);
    this.scene.add(this.spinAxis);
    // A virtual observation region, not an object installed on the playing surface.
    this.measurementZone=new THREE.Group();this.scene.add(this.measurementZone);
    const regionGeometry=new THREE.BoxGeometry(.85,.70,1.4);
    const region=new THREE.Mesh(regionGeometry,new THREE.MeshBasicMaterial({color:'#bb9af1',transparent:true,opacity:.065,depthWrite:false}));
    region.position.set(0,1.7,-16);this.measurementZone.add(region);
    const regionEdges=new THREE.LineSegments(new THREE.EdgesGeometry(regionGeometry),new THREE.LineBasicMaterial({color:'#bf9ef5',transparent:true,opacity:.7}));
    regionEdges.position.copy(region.position);this.measurementZone.add(regionEdges);
    this.night=false;this.showCoverage=false;this.showLabels=true;this.selected='cam-a';
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();
    this.renderer.domElement.addEventListener('click',e=>{
      const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
      this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObjects(this.picks)[0];if(hit)this.onSelect(hit.object.userData.id);
    });
    new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h)}).observe(host);
    this.setLight(false);this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
  }
  material(color,map=null){return new THREE.MeshStandardMaterial({color,map,roughness:.94,bumpMap:map,bumpScale:map?.012:0})}
  texture(kind){
    const c=document.createElement('canvas');c.width=c.height=kind==='net'?64:512;const ctx=c.getContext('2d');
    let seed=12345;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    if(kind==='net'){ctx.clearRect(0,0,64,64);ctx.strokeStyle='rgba(125,143,148,.65)';ctx.lineWidth=1.4;ctx.strokeRect(0,0,64,64)}
    else {ctx.fillStyle=kind==='grass'?'#567a40':'#b88865';ctx.fillRect(0,0,512,512);for(let i=0;i<24000;i++){ctx.fillStyle=kind==='grass'?`rgba(${50+rnd()*85},${80+rnd()*80},${25+rnd()*40},.22)`:`rgba(${105+rnd()*100},${65+rnd()*85},${35+rnd()*70},.2)`;ctx.fillRect(rnd()*512,rnd()*512,kind==='grass'?1:2,kind==='grass'?4:2)}}
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(kind==='net'?1:kind==='grass'?.45:1.4,kind==='net'?1:kind==='grass'?.45:1.4);tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return tex;
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
      this.disk(600,'#ccd6bb',0,-42,-.12,this.grass);
      for(let i=0;i<15;i++)this.arcPatch(i*7.35,(i+1)*7.35,-Math.PI/4,Math.PI/4,i%2?'#527e45':'#619052',.004);
      // Apply texture to individual bands; avoid overlapping transparent ground planes.
      for(const band of this.root.children.slice(-15)){band.material.map=this.grass;band.material.bumpMap=this.grass;band.material.bumpScale=.012;band.material.color.set(band.material.color.getHex()===0x527e45?'#bdcfb1':'#e1e8cb')}
      this.arcPatch(125,137,-Math.PI/4-.10,Math.PI/4+.10,'#89918b',.015);
      this.arcPatch(105,111,-Math.PI/4,Math.PI/4,'#ad8262',.014);
      this.disk(27.4,'#dcc09e',0,-18.44,.018,this.dirt);
      this.patch([[0,-4.4],[15.5,-19.4],[0,-34.4],[-15.5,-19.4]],'#eef4d7',.045,this.grass);
      const side=27.432/Math.sqrt(2);
      for(const [x,z] of [[side,-side],[0,-2*side],[-side,-side]]){this.disk(2.25,'#d4b18a',x,z,.035,this.dirt);const base=this.box(.4572,.075,.4572,'#eeeada',[x,.09,z]);base.rotation.y=Math.PI/4}
      for(const s of [-1,1]){
        this.patch([[s*.05,-.05],[s*78.52,-78.52],[s*78.47,-78.57],[s*.00,-.10]],'#eee8d6',.061);
        this.rod([s*78.49,0,-78.49],[s*78.49,15,-78.49],.10,'#efc651');
        const boxX=s*7.8;this.line([[boxX,.05,-7],[boxX+s*2,.05,-9],[boxX+s*7,.05,-14],[boxX+s*5,.05,-12],[boxX,.05,-7]],'#eee9d5');
      }
      for(let i=0;i<56;i++){
        const a=-Math.PI/4+(i+.5)*Math.PI/2/56;const x=Math.sin(a)*111,z=-Math.cos(a)*111;
        const wall=this.box(3.18,3.3,.55,i%7===0?'#284d4d':'#214947',[x,1.65,z]);wall.rotation.y=-a;
      }
      for(let row=0;row<9;row++){
        this.arcPatch(113+row*1.25,114+row*1.25,-Math.PI/4-.08,Math.PI/4+.08,row%2?'#84939c':'#a9b0ae',.5+row*.62);
        const count=140,geo=new THREE.BoxGeometry(.67,.13,.6),mat=this.material(row%3===0?'#294f62':'#4d7587');const chairs=new THREE.InstancedMesh(geo,mat,count),backs=new THREE.InstancedMesh(new THREE.BoxGeometry(.67,.57,.10),mat,count);const dummy=new THREE.Object3D();
        for(let j=0;j<count;j++){const a=-Math.PI/4-.07+(Math.PI/2+.14)*j/(count-1),r=113.5+row*1.25;dummy.scale.setScalar(j%20===0?.001:1);dummy.position.set(Math.sin(a)*r,1+row*.62,-Math.cos(a)*r);dummy.rotation.y=-a;dummy.updateMatrix();chairs.setMatrixAt(j,dummy.matrix);dummy.position.set(Math.sin(a)*(r+.25),1.26+row*.62,-Math.cos(a)*(r+.25));dummy.updateMatrix();backs.setMatrixAt(j,dummy.matrix)}this.root.add(chairs,backs);
      }
      // Low grandstands and dugouts along both foul sides.
      for(const s of [-1,1]){
        const stands=new THREE.Group();stands.position.set(s*25,0,-11);stands.rotation.y=s*Math.PI/4;this.root.add(stands);
        for(let row=0;row<7;row++){
          this.box(30,.5,1.25,'#99a4a2',[0,.5+row*.6,row*1.3],stands);
          const material=this.material(row%2?'#315b6f':'#53798b'),seats=new THREE.InstancedMesh(new THREE.BoxGeometry(.67,.12,.60),material,32),backs=new THREE.InstancedMesh(new THREE.BoxGeometry(.67,.55,.09),material,32),dummy=new THREE.Object3D();
          for(let seat=0;seat<32;seat++){dummy.scale.setScalar(seat%11===0?.001:1);dummy.position.set(-14+seat*.87,.89+row*.6,row*1.3);dummy.updateMatrix();seats.setMatrixAt(seat,dummy.matrix);dummy.position.set(-14+seat*.87,1.18+row*.6,row*1.3+.25);dummy.updateMatrix();backs.setMatrixAt(seat,dummy.matrix)}stands.add(seats,backs);
        }
        this.rod([-15,5.6,8.5],[15,5.6,8.5],.04,'#afbcbb',stands);
        for(const x of [-15,-7,0,7,15])this.rod([x,4.4,8.5],[x,5.6,8.5],.035,'#afbcbb',stands);
        this.box(12,2.4,.3,'#31545a',[s*14,1.2,-7]);this.box(12,.18,3,'#879b9b',[s*14,2.45,-5.6]);this.box(10,.18,.6,'#a68a64',[s*14,.6,-6]);
      }
      this.textSign('FIELD LAB  /  DIGITAL TWIN',26,5,[0,10,-112]);this.textSign('110 m',5,1.5,[0,1.8,-110.65]);
      for(const [a,text] of [[-.5,'HOME CLUB'],[.5,'VISITOR CLUB']])this.textSign(text,13,1.8,[Math.sin(a)*110.6,1.7,-Math.cos(a)*110.6],-a);
      for(const [x,z] of [[-68,-38],[68,-38],[-38,-112],[38,-112]]){
        this.rod([x,0,z],[x,29,z],.22,'#9eabad');this.box(5,1.8,.5,'#cad5cf',[x,29,z]);
        for(let col=0;col<8;col++)for(let row=0;row<2;row++){const bulbs=this.box(.43,.48,.08,'#fff6d7',[x-2+col*.57,28.65+row*.72,z+.28]);bulbs.material.emissive=new THREE.Color('#fff0c9');bulbs.material.emissiveIntensity=1.2}
      }
      this.net([-9,5],[9,5],5);this.net([-9,5],[-15,-4],5);this.net([9,5],[15,-4],5);
      if(isField){
        const defenders=[[18,22],[12,38],[-12,38],[-20,22],[-43,72],[0,94],[43,72]];
        defenders.forEach(([x,z],i)=>this.player([x,0,z],'fielder',i+1));
      }
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
    const g=makeAthlete(role,num);g.position.set(...pos);this.root.add(g);this.actors.push(g);
    const originals=new Set();g.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])originals.add(m)});
    setActorOpacity(g,this.actorFilters[role]?this.ghostOpacity:1);originals.forEach(m=>m.dispose());
    if(role==='pitcher')this.pitcher=g;
    return g;
  }
  setActorFilter(role,enabled){this.actorFilters[role]=Boolean(enabled);this.applyActorFilters()}
  setGhostOpacity(value){this.ghostOpacity=Math.max(.1,Math.min(.6,Number(value)||.25));this.applyActorFilters()}
  applyActorFilters(){
    for(const actor of this.actors)setActorOpacity(actor,this.actorFilters[actor.userData.role]?this.ghostOpacity:1);
    for(const role of ['pitcher','catcher'])this.host.dataset[`${role}Opacity`]=String(this.actors.find(a=>a.userData.role===role)?.userData.displayOpacity??1);
  }
  device(n){
    const g=new THREE.Group();g.position.set(...n.pos);g.lookAt(new THREE.Vector3(...n.target));this.root.add(g);
    const c=colors[n.type],body=this.box(n.type==='edge'?.48:.28,n.type==='edge'?.64:.19,n.type==='edge'?.35:.42,c,[0,0,0],g);
    body.material.roughness=.38;body.material.metalness=.25;body.userData.id=n.id;this.picks.push(body);n.body=body;
    if(n.type==='vendor'){
      this.box(.34,.34,.10,'#d4dfda',[0,0,.18],g);
      this.box(.24,.19,.015,'#1f4949',[0,.035,.239],g);
      const optic=this.mesh(new THREE.CircleGeometry(.026,16),this.material('#152a32'),[.10,-.105,.245],g);optic.userData.id=n.id;this.picks.push(optic);
    }else if(n.type==='camera'||n.type==='spin'){
      this.box(.32,.035,.49,'#adb9b5',[0,.115,.035],g);
      const lens=this.mesh(new THREE.CylinderGeometry(.068,.068,.2,20),this.material('#1b252e'),[0,0,.28],g);lens.rotation.x=Math.PI/2;
      this.mesh(new THREE.TorusGeometry(.067,.008,8,20),this.material('#6d838b'),[0,0,.385],g);
      const glass=this.mesh(new THREE.CircleGeometry(.061,20),new THREE.MeshStandardMaterial({color:'#426b83',metalness:.8,roughness:.1}),[0,0,.385],g);glass.userData.id=n.id;this.picks.push(glass);
    }else if(['edge','fpga','sync'].includes(n.type)){
      for(let y=-.2;y<.25;y+=.08)this.box(.35,.02,.025,'#263b3e',[0,y,.19],g);
      this.box(.04,.04,.02,'#b8ffb4',[.12,.25,.19],g);
    }else if(n.type==='light'){
      this.box(.42,.25,.06,'#36474b',[0,0,.23],g);
      for(const x of [-.13,0,.13])for(const y of [-.07,.07]){
        const led=this.mesh(new THREE.CircleGeometry(.035,10),new THREE.MeshStandardMaterial({color:'#fff6d4',emissive:'#ffe5a4',emissiveIntensity:1}),[x,y,.267],g);led.castShadow=false;
      }
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
      for(const dx of [-.16,.16])for(const dy of [-.085,.085])this.mesh(new THREE.SphereGeometry(.014,6,6),this.material('#d2d5c8'),[ax+dx,ay+dy,az+.078]);
      this.rod(n.anchor,n.pos,.036,'#bac4c2');
      this.line([[ax,.08,az],[ax,ay,az]],'#7dc5b6',this.root,.35);
      const o=new THREE.Vector3(...n.pos),t=new THREE.Vector3(...n.target),d=t.clone().sub(o),len=d.length();
      if(n.type==='camera'||n.type==='spin'){
        const right=new THREE.Vector3().crossVectors(d.clone().normalize(),new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(right,d.clone().normalize()).normalize();
        const w=n.type==='spin'?(720*6.9e-6*len/(n.focalMm*.001))/2:Math.min(12,len*.24),h=w*.75,cs=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>t.clone().addScaledVector(right,w*a).addScaledVector(up,h*b));
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
    this.stage=stage;this.site=site;this.nodes=nodes;this.picks=[];this.clear(this.root);this.actors=[];this.clear(this.fovs);this.clear(this.clearanceGroup);this.labels.innerHTML='';
    this.drawField();nodes.forEach(n=>this.device(n));
    const boundary=activityBoundary(stage),points=[...boundary,boundary[0]].map(([x,z])=>[x,.12,z]);
    this.line(points,'#85ffce',this.clearanceGroup);
    for(const n of nodes){
      const ring=this.mesh(new THREE.RingGeometry(.65,.72,32),new THREE.MeshBasicMaterial({color:'#85ffce',side:THREE.DoubleSide,transparent:true,opacity:.85}),[n.pos[0],.12,n.pos[2]],this.clearanceGroup);ring.rotation.x=-Math.PI/2;
    }
    this.fovs.visible=this.showCoverage;this.select(this.selected);this.setView('angle');this.applyActorFilters();
  }
  select(id){this.selected=id;for(const n of this.nodes){n.body.material.emissive.set(n.id===id?colors[n.type]:'#000000');n.body.material.emissiveIntensity=.32;n.pin.classList.toggle('selected',n.id===id)}}
  setLight(night){this.night=night;const sky=night?'#182b40':'#c9d7d7';this.scene.background=new THREE.Color(sky);this.scene.fog=new THREE.Fog(sky,180,470);this.sky.material.uniforms.top.value.set(night?'#08172d':'#779eb8');this.sky.material.uniforms.bottom.value.set(sky);this.ambient.intensity=night?.65:1.7;this.sun.intensity=night?1.8:3.0;this.fill.intensity=night?.35:.55;this.sun.color.set(night?'#b5d9ff':'#fff0d6');this.renderer.toneMappingExposure=night?.95:1.05}
  setView(kind){
    const field=['pilot','full'].includes(this.stage);let target=[0,.5,field?-42:-9],pos=[field?82:24,field?88:21,field?88:23];
    if(kind==='top')pos=[0,field?153:35,target[2]+.02];
    if(kind==='side')pos=[field?85:28,field?32:8,target[2]+7];
    if(kind==='plate'){pos=[1.4,2.0,5.2];target=[0,.8,-1.7]}
    if(kind==='pitcher'){pos=[2,3,-21.5];target=[0,.8,-.2]}
    if(kind==='spin'){pos=[3.6,3.7,-12.3];target=[0,1.65,-16]}
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
    const trail=this.mesh(new THREE.TubeGeometry(curve,120,.015,6,false),new THREE.MeshBasicMaterial({color:pitch.profile.color,transparent:true,opacity:.90,depthWrite:false}),[0,0,0],this.fx);trail.castShadow=false;trail.renderOrder=4;
    const marker=this.mesh(new THREE.RingGeometry(BALL_RADIUS*.9,BALL_RADIUS*1.15,32),new THREE.MeshBasicMaterial({color:pitch.decision.call==='STRIKE'?'#70f4bc':pitch.decision.call==='BALL'?'#ff927a':'#ffdb87',side:THREE.DoubleSide}),pitch.target,this.fx);
    marker.position.z+=.008;this.ball.visible=true;this.moveBall(0);
  }
  moveBall(u){
    if(!this.pitch)return;
    this.ball.position.set(...positionAt(this.pitch,this.pitch.duration*u));
    const axis=new THREE.Vector3(...toScene(syntheticAxes[this.pitch.type]));
    this.ball.quaternion.setFromAxisAngle(axis,this.pitch.profile.rpm*2*Math.PI/60*this.pitch.duration*u);
    this.spinAxis.setDirection(axis);this.spinAxis.position.copy(this.ball.position);this.spinAxis.visible=this.showSpinAxis;
  }
  frame(){
    requestAnimationFrame(this.frame);this.controls.update();const w=this.host.clientWidth,h=this.host.clientHeight,placed=[];
    // Give the selected label priority, suppress overlaps in wide stadium views.
    for(const n of [...this.nodes].sort((a,b)=>(b.id===this.selected)-(a.id===this.selected))){
      const p=new THREE.Vector3(...n.pos).add(new THREE.Vector3(0,.45,0)).project(this.camera),x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h;
      const overlap=placed.some(q=>Math.abs(q.x-x)<118&&Math.abs(q.y-y)<25);
      const visible=this.showLabels&&p.z<1&&p.z>-1&&x>35&&x<w-35&&y>16&&y<h-65&&!overlap;
      n.pin.style.display=visible?'block':'none';if(visible){n.pin.style.left=`${x}px`;n.pin.style.top=`${y}px`;placed.push({x,y})}
    }
    this.sky.position.copy(this.camera.position);
    if(this.onFrame)this.onFrame(performance.now());this.renderer.render(this.scene,this.camera);
  }
}
