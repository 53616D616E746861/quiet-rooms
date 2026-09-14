import * as THREE from './three.module.js';
import {isWalkable, roomAt, entranceFor} from './navigation.js';
import {applyLook} from './look-controls.js';
import {isPanelFocused} from './secret-panel.js';
import {focusedBook} from './book-interaction.js';
import {createMoonBook} from './moon-book.js';
import {RoomMusic} from './room-music.js';
import {createWallMasks} from './wall-masks.js';
import {focusedWallMask} from './wall-mask-layout.js';
const $=id=>document.getElementById(id),canvas=$('world');
const bookReader=$('bookReader');
const music=new RoomMusic({toggle:$('musicToggle'),check:$('musicEnabled'),slider:$('musicVolume'),status:$('musicStatus')});
document.addEventListener('visibilitychange',()=>music.setHidden(document.hidden));
window.addEventListener('pagehide',()=>music.setHidden(true));
window.addEventListener('pageshow',()=>music.setHidden(document.hidden));
const settings=$('settings');let invertX=false,invertY=false;
try{const saved=JSON.parse(localStorage.getItem('quiet-rooms-look')||'{}');invertX=saved.invertX===true;invertY=saved.invertY===true;}catch{}
$('invertX').checked=invertX;$('invertY').checked=invertY;
function saveLook(){invertX=$('invertX').checked;invertY=$('invertY').checked;try{localStorage.setItem('quiet-rooms-look',JSON.stringify({invertX,invertY}));}catch{}}
$('invertX').onchange=saveLook;$('invertY').onchange=saveLook;

let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});}catch(e){$('intro').innerHTML='<h2>This room needs WebGL.</h2><p>Please open it in a browser with hardware graphics enabled.</p>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new THREE.Scene();scene.background=new THREE.Color('#27353b');scene.fog=new THREE.Fog('#202b2b',16,36);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.08,60);camera.rotation.order='YXZ';camera.position.set(0,1.65,7.7);let yaw=0,pitch=.03;
scene.add(new THREE.HemisphereLight(0xc3e6e4,0x653323,2.2));const sun=new THREE.DirectionalLight(0xffecd0,1.7);sun.position.set(-3,8,4);scene.add(sun);
function box(w,h,d,x,y,z,mat){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);scene.add(o);return o;}
function doorFrame(width,height,thickness,depth,x,z,mat,yaw=0){
 // One continuous frame avoids overlapping jamb and lintel faces.
 const h=width/2,t=thickness,outline=new THREE.Shape();
 outline.moveTo(-h-t,0);
 for(const [px,py]of [[-h,0],[-h,height],[h,height],[h,0],[h+t,0],[h+t,height+t],[-h-t,height+t]])outline.lineTo(px,py);
 outline.closePath();
 const geometry=new THREE.ExtrudeGeometry(outline,{depth,bevelEnabled:false,steps:1});geometry.translate(0,0,-depth/2);
 const frame=new THREE.Mesh(geometry,mat);frame.position.set(x,0,z);frame.rotation.y=yaw;scene.add(frame);return frame;
}
const wall=new THREE.MeshStandardMaterial({color:0x25302b,roughness:1});const wood=new THREE.MeshStandardMaterial({color:0x4a4936,roughness:1});const gold=new THREE.MeshStandardMaterial({color:0x8d7950,roughness:.8});
box(20,.18,20,0,-.1,0,new THREE.MeshStandardMaterial({color:0x8c4d42,roughness:1}));
const floor=new THREE.Mesh(new THREE.PlaneGeometry(18.9,18.9),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=.004;scene.add(floor);
new THREE.TextureLoader().load('carpet.png',t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.anisotropy=renderer.capabilities.getMaxAnisotropy();floor.material.map=t;floor.material.needsUpdate=true;},undefined,()=>{floor.material.color.set(0x9b5e4d);});
for(const axis of ['x','z'])for(const sign of [-1,1]){
 const x=axis==='x'?sign*10:0,z=axis==='z'?sign*10:0;
 const doorway=axis==='z'&&sign===1;
 if(doorway){for(const side of [-1,1])box(8.6,5.6,.25,side*5.7,2.8,10,wall);box(2.8,2.3,.25,0,4.45,10,wall);}
 else box(axis==='x'?.25:20,5.6,axis==='z'?.25:20,x,2.8,z,wall);
 for(const y of [.16,.4,3.75,3.93,5.45]){
  if(doorway&&y<3.3){for(const side of [-1,1])box(8.6,.09,.34,side*5.7,y,9.9,gold);}
  else box(axis==='x'?.34:20,.09,axis==='z'?.34:20,x-sign*(axis==='x'?.1:0),y,z-sign*(axis==='z'?.1:0),gold);
 }
 for(let a=-9;a<=9;a+=1.5){if(doorway&&Math.abs(a)<1.5)continue;box(axis==='x'?.15:.065,3.35,axis==='z'?.15:.065,axis==='x'?sign*9.8:a,1.95,axis==='z'?sign*9.8:a,wood);}
}
// An open threshold, not a teleport: the corridor continues behind the starting point.
// Keep a small reveal inside the opening and beyond both wall faces.
doorFrame(2.74,3.27,.16,.51,0,9.9,gold);
// A stationary painted sky, shaded directly on the room's ceiling and upper frieze.
const sky=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{},vertexShader:'varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 v;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}void main(){vec2 p=v*9.;float a=n(p)*.65+n(p*2.)*.25+n(p*4.)*.1;float c=smoothstep(.48,.72,a);vec3 col=mix(vec3(.17,.48,.58),vec3(.83,.84,.71),c);gl_FragColor=vec4(col,1.);}`});
const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(20,20),sky);ceiling.rotation.x=Math.PI/2;ceiling.position.y=5.6;scene.add(ceiling);
for(let i=0;i<4;i++){const s=new THREE.Mesh(new THREE.PlaneGeometry(20,1.45),sky);s.position.set(i===1?-9.82:i===3?9.82:0,4.7,i===0?-9.82:i===2?9.82:0);s.rotation.y=i*Math.PI/2;scene.add(s);}
// Original character-pattern artwork, retained as the finished cube inscriptions.
function inscription(seed){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle=seed<4?'#323d3b':seed<8?'#342a32':seed<12?'#24283d':'#29342b';g.fillRect(0,0,512,512);g.strokeStyle='#919079';g.lineWidth=3;g.strokeRect(18,18,476,476);g.strokeRect(27,27,458,458);g.font='12px monospace';g.textAlign='center';const chars=['.','·',':','+','*','o','O','#'];for(let row=0;row<34;row++)for(let col=0;col<48;col++){const x=(col-23.5)/24,y=(row-16.5)/17;let v=seed===0?Math.abs(Math.sin(Math.sqrt(x*x+y*y)*16)):seed===1?Math.abs(Math.sin(x*8+y*5)*Math.cos(y*7)):seed===2?Math.abs(Math.sin(Math.atan2(y,x)*5+Math.hypot(x,y)*8)):seed===3?Math.abs(Math.cos(y*13+x*x*7)):seed===4?Math.abs(Math.sin(Math.hypot(x,y)*21+Math.atan2(y,x)*3)):seed===5?Math.abs(Math.cos(x*15)*Math.sin(y*11+x*x*9)):seed===6?Math.abs(Math.cos(Math.atan2(y,x)*7)*Math.sin(Math.hypot(x,y)*12)):seed===7?Math.abs(Math.sin(y*20+Math.sin(x*9)*2)):seed===8?Math.abs(Math.cos(Math.hypot(x*1.6,y)*18)):seed===9?Math.abs(Math.sin((x+y)*13)*Math.cos((x-y)*13)):seed===10?Math.abs(Math.sin(Math.atan2(y,x)*9+Math.hypot(x,y)*5)):seed===11?Math.abs(Math.cos(x*15+y*y*12)):seed===12?Math.abs(Math.cos(Math.atan2(y,x)*6)*Math.sin(Math.hypot(x,y)*14)):Math.abs(Math.cos((Math.abs(x)-.28*Math.sin(y*7))*18)*Math.sin(y*10));if(x*x+y*y<.86&&v>.25){g.fillStyle=seed<4?(v>.8?'#d5c8a2':'#8c9d91'):seed<8?(v>.8?'#f2cc80':'#a87960'):seed<12?(v>.8?'#c3c4d0':'#7b7e9b'):(v>.8?'#d4c496':'#929370');g.fillText(chars[Math.floor(v*7)],42+col*9,66+row*12);}}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const cubes=[];for(const [i,[x,z]]of [[-6,-5],[6,-5],[-6,4],[6,4]].entries()){const mat=new THREE.MeshStandardMaterial({map:inscription(i),roughness:1});const cube=box(1.55,1.55,1.55,x,.83,z,mat);cube.rotation.y=(i%2?1:-1)*.08;cubes.push(cube);box(1.7,.13,1.7,x,.065,z,wood);box(1.66,.09,1.66,x,1.65,z,gold);}
const figure=new THREE.Group();figure.position.set(0,0,-3);scene.add(figure);
const glowMat=new THREE.MeshBasicMaterial({color:0xffe6af,transparent:true,opacity:.24,depthWrite:false});
for(let i=0;i<4;i++){const body=new THREE.Mesh(new THREE.ConeGeometry(.29+i*.045,1.5,7,1,true),glowMat.clone());body.position.y=.85;body.rotation.z=Math.PI;body.material.opacity=.12;figure.add(body);}
const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.32,1),new THREE.MeshBasicMaterial({color:0xffebc1,transparent:true,opacity:.65}));core.scale.set(.65,1.7,.55);core.position.y=1.05;figure.add(core);
const mask=new THREE.Group();mask.position.y=1.78;figure.add(mask);const petalmat=new THREE.MeshStandardMaterial({color:0xd87349,roughness:.9});
for(let i=0;i<11;i++){let a=i*Math.PI*2/11;const p=new THREE.Mesh(new THREE.SphereGeometry(1,5,3),petalmat);p.scale.set(.092,.32+(i%3)*.018,.045);p.position.set(Math.sin(a)*.38,Math.cos(a)*.38,0);p.rotation.z=-a;mask.add(p);}
const face=new THREE.Mesh(new THREE.SphereGeometry(.285,16,10),new THREE.MeshStandardMaterial({color:0xf4e8c9,roughness:.9}));face.scale.z=.26;mask.add(face);
function line(points){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,12,.013,4,false),new THREE.MeshBasicMaterial({color:0x443b31}));mask.add(m);}
for(const x of [-.09,.09])line([[x-.037,.015,.076],[x,.085,.077],[x+.037,.015,.076]]);line([[-.07,-.08,.074],[-.04,-.12,.075],[0,-.085,.077],[.04,-.12,.075],[.07,-.08,.074]]);
const light=new THREE.PointLight(0xffd08d,3,6,2);light.position.set(0,1.25,-3);scene.add(light);
// Fixed scattered light points preserve the room's stillness.
const points=[];for(let i=0;i<65;i++){const a=i*2.399,r=.17+.35*((i*17%61)/61);points.push(Math.cos(a)*r,.25+(i%29)/29*1.6,Math.sin(a)*r);}const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(points,3));figure.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0xffe5ab,size:.023,transparent:true,opacity:.7})));
// The bent hallway is low and dark, framing a warm glimpse of the next room.
const hallWall=new THREE.MeshBasicMaterial({color:0x171d20});
const hallFloor=new THREE.MeshBasicMaterial({color:0x33322d});
const hallTrim=new THREE.MeshBasicMaterial({color:0x776342});
// Adjacent floor and ceiling slabs meet at their edges instead of overlapping.
box(3,.18,4,0,-.1,12,hallFloor);box(16.5,.18,3,6.75,-.1,15.5,hallFloor);
box(3.3,.18,3.95,0,3.6,11.875,hallWall);box(16.7,.18,3.3,6.75,3.6,15.5,hallWall);
box(.3,3.6,6.875,-1.65,1.8,13.5625,hallWall);box(.3,3.6,3.875,1.65,1.8,12.0625,hallWall);
// The branch to the Moon Room stays open from the first visit.
box(9.5,3.6,.3,3.25,1.8,17.15,hallWall);box(3.875,3.6,.3,12.9375,1.8,17.15,hallWall);box(3,.35,.3,9.5,3.425,17.15,hallWall);
box(13.375,3.6,.3,8.1875,1.8,13.85,hallWall);
for(const y of [.15,3.3]){box(.08,.08,7,-1.48,y,13.5,hallTrim);box(.08,.08,4,1.48,y,12,hallTrim);if(y>.2)box(16.5,.08,.08,6.75,y,16.98,hallTrim);else{box(9.5,.08,.08,3.25,y,16.98,hallTrim);box(4,.08,.08,13,y,16.98,hallTrim);}box(13.5,.08,.08,8.25,y,14.02,hallTrim);}
for(const x of [4.5,12]){
 box(.16,3.5,.2,x,1.75,14.08,hallTrim);box(.16,3.5,.2,x,1.75,16.92,hallTrim);box(.16,.12,3,x,3.3,15.5,hallTrim);
 const lamp=new THREE.Mesh(new THREE.OctahedronGeometry(.12),new THREE.MeshBasicMaterial({color:0xe5b975}));lamp.position.set(x,2.5,16.8);scene.add(lamp);
}
// Room II: plum walls, bronze edges, and a field hung overhead.
const warmWall=new THREE.MeshStandardMaterial({color:0x382b35,roughness:1});
const bronze=new THREE.MeshStandardMaterial({color:0x937044,roughness:.88});
const warmWood=new THREE.MeshStandardMaterial({color:0x514033,roughness:1});
box(16,.18,14,23,-.1,16,warmWood);
const rug2=new THREE.Mesh(new THREE.PlaneGeometry(15.1,13.1),new THREE.MeshStandardMaterial({color:0xd4ae83,roughness:1}));rug2.rotation.x=-Math.PI/2;rug2.position.set(23,.004,16);scene.add(rug2);
new THREE.TextureLoader().load('carpet.png',t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2.5,2.2);t.anisotropy=renderer.capabilities.getMaxAnisotropy();rug2.material.map=t;rug2.material.needsUpdate=true;});
box(16,4.8,.25,23,2.4,9,warmWall);box(16,4.8,.25,23,2.4,23,warmWall);box(.25,4.8,14,31,2.4,16,warmWall);
box(.25,4.8,5,15,2.4,11.5,warmWall);box(.25,4.8,6,15,2.4,20,warmWall);box(.25,1.5,3,15,4.05,15.5,warmWall);
// A small reveal keeps the inner frame faces clear of the hallway wall faces.
doorFrame(2.94,3.32,.16,.42,15.1,15.5,bronze,Math.PI/2);
for(const y of [.15,.4,3.55,4.6]){
 for(const z of [9.15,22.85])box(16,.08,.12,23,y,z,bronze);
 box(.12,.08,14,30.85,y,16,bronze);
 if(y<3.3){box(.12,.08,5,15.15,y,11.5,bronze);box(.12,.08,6,15.15,y,20,bronze);}else box(.12,.08,14,15.15,y,16,bronze);
}
for(let x=16;x<31;x+=1.5)for(const z of [9.18,22.82])box(.055,3.1,.09,x,1.95,z,warmWood);
for(let z=10;z<23;z+=1.5){box(.09,3.1,.055,30.82,1.95,z,warmWood);if(z<13.5||z>17.5)box(.09,3.1,.055,15.18,1.95,z,warmWood);}
const fieldMaterial=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
new THREE.TextureLoader().load('sunflower-ceiling.png',t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();fieldMaterial.map=t;fieldMaterial.needsUpdate=true;});
const fieldCeiling=new THREE.Mesh(new THREE.PlaneGeometry(16,14),fieldMaterial);fieldCeiling.rotation.x=Math.PI/2;fieldCeiling.position.set(23,4.8,16);scene.add(fieldCeiling);
// A narrow amber cornice gives the ceiling a clear edge above the dark walls.
const amber=new THREE.MeshBasicMaterial({color:0xc3995d});
for(const z of [9.24,22.76])box(15.6,.04,.08,23,4.55,z,amber);
for(const x of [15.24,30.76])box(.08,.04,13.6,x,4.55,16,amber);
for(const [i,[x,z]]of [[18,11.8],[27.5,11.8],[19,20],[27,20.5]].entries()){
 const mat=new THREE.MeshStandardMaterial({map:inscription(i+4),roughness:1});const cube=box(1.55,1.55,1.55,x,.83,z,mat);cube.rotation.y=(i%2?1:-1)*.1;cubes.push(cube);box(1.7,.13,1.7,x,.065,z,warmWood);box(1.66,.09,1.66,x,1.65,z,bronze);
}
// A separate solemn figure: faceted light beneath an aged ceremonial sun mask.
const secondFigure=new THREE.Group();secondFigure.position.set(26,0,16);secondFigure.rotation.y=-Math.PI/2;scene.add(secondFigure);
const solemnMask=new THREE.Group();solemnMask.position.y=2.1;secondFigure.add(solemnMask);
const antique=new THREE.MeshStandardMaterial({color:0xc7b995,roughness:1,vertexColors:true});
const maskGeometry=new THREE.SphereGeometry(1,12,9);const vertexColors=[];for(let i=0;i<maskGeometry.attributes.position.count;i++){const shade=.72+.24*((i*37%101)/101);vertexColors.push(shade,shade,shade*.94);}maskGeometry.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));
const solemnFace=new THREE.Mesh(maskGeometry,antique);solemnFace.scale.set(.3,.55,.09);solemnMask.add(solemnFace);
const oldBronze=new THREE.MeshStandardMaterial({color:0x756340,roughness:1});
for(let i=0;i<13;i++){const a=i*Math.PI*2/13;const ray=new THREE.Mesh(new THREE.ConeGeometry(.055,.27+(i%3)*.025,3),oldBronze);ray.position.set(Math.sin(a)*.43,Math.cos(a)*.66,-.035);ray.rotation.z=-a;solemnMask.add(ray);}
const hollow=new THREE.MeshBasicMaterial({color:0x292b25});
for(const x of [-.115,.115]){const eye=new THREE.Mesh(new THREE.BoxGeometry(.115,.025,.016),hollow);eye.position.set(x,.105,.084);eye.rotation.z=x>0?.12:-.12;solemnMask.add(eye);}
const ridge=new THREE.Mesh(new THREE.ConeGeometry(.044,.25,3),oldBronze);ridge.rotation.z=Math.PI;ridge.position.set(0,-.035,.1);solemnMask.add(ridge);
const mouth=new THREE.Mesh(new THREE.BoxGeometry(.047,.105,.012),hollow);mouth.position.set(0,-.255,.081);solemnMask.add(mouth);
// Fine scored lines follow the mask's long cheeks.
for(const side of [-1,1])for(let i=0;i<3;i++){const mark=new THREE.Mesh(new THREE.BoxGeometry(.012,.13-i*.015,.01),oldBronze);mark.position.set(side*(.16+i*.024),-.09-i*.035,.058);mark.rotation.z=side*.15;solemnMask.add(mark);}
for(let i=0;i<4;i++){const veil=new THREE.Mesh(new THREE.ConeGeometry(.33+i*.055,1.75,5,1,true),new THREE.MeshBasicMaterial({color:0xd6c694,transparent:true,opacity:.075,depthWrite:false}));veil.rotation.z=Math.PI;veil.rotation.y=i*.38;veil.position.y=1.02;secondFigure.add(veil);}
const solemnCore=new THREE.Mesh(new THREE.OctahedronGeometry(.22),new THREE.MeshBasicMaterial({color:0xf0d8a4,transparent:true,opacity:.4}));solemnCore.scale.set(.6,3,.6);solemnCore.position.y=1.15;secondFigure.add(solemnCore);
// A small writing table holds an actual readable fragment.
const notePosition={x:22.75,z:9.65};
const noteWood=new THREE.MeshStandardMaterial({color:0x49372b,roughness:1});
const table=box(1,.1,.65,notePosition.x,.85,notePosition.z,noteWood);table.userData.collisionHalfX=.77;table.userData.collisionHalfZ=.595;cubes.push(table);
for(const dx of [-.39,.39])for(const dz of [-.23,.23])box(.075,.8,.075,notePosition.x+dx,.4,notePosition.z+dz,bronze);
const pageCanvas=document.createElement('canvas');pageCanvas.width=512;pageCanvas.height=640;const pageCtx=pageCanvas.getContext('2d');
function paintNote(text){pageCtx.fillStyle='#d8c79f';pageCtx.fillRect(0,0,512,640);pageCtx.strokeStyle='#baa77e';pageCtx.lineWidth=2;pageCtx.beginPath();pageCtx.moveTo(256,0);pageCtx.lineTo(256,640);pageCtx.stroke();pageCtx.fillStyle='#51442f';pageCtx.font='18px Georgia';let y=64,line='';for(const word of text.replace(/^## /gm,'').split(/\s+/)){if(pageCtx.measureText(line+word).width>408){pageCtx.fillText(line,46,y);y+=29;line='';}line+=word+' ';}pageCtx.fillText(line,46,y);}
paintNote('');const paperTexture=new THREE.CanvasTexture(pageCanvas);paperTexture.colorSpace=THREE.SRGBColorSpace;
const paper=new THREE.Mesh(new THREE.PlaneGeometry(.4,.49),new THREE.MeshStandardMaterial({map:paperTexture,roughness:1,side:THREE.DoubleSide}));paper.rotation.set(-Math.PI/2,0,-.13);paper.position.set(notePosition.x,.906,notePosition.z);scene.add(paper);

const secondLight=new THREE.PointLight(0xffc275,5,9,2);secondLight.position.set(26,1.6,16);scene.add(secondLight);
const roomGlow=new THREE.PointLight(0xffd391,12,16,2);roomGlow.position.set(23,4,16);scene.add(roomGlow);
// Faces kept on the walls hold their own passages, independent of the central figure.
const wallMasks=createWallMasks(scene),maskPassages=new Map();let nearMask=null,highlightedMask=null;
fetch('sunflower-masks.json').then(r=>{if(!r.ok)throw new Error('Mask passages unavailable');return r.json();}).then(d=>{for(const m of d.masks)maskPassages.set(m.id,m);}).catch(()=>{});
// Room III and its branch are always open for exploration.
const nightWall=new THREE.MeshStandardMaterial({color:0x171b30,roughness:1});
const nightWood=new THREE.MeshStandardMaterial({color:0x343246,roughness:1});
const silver=new THREE.MeshStandardMaterial({color:0x747684,roughness:.92});
const darkFloor=new THREE.MeshBasicMaterial({color:0x272a36});
box(3,.18,8,9.5,-.1,21,darkFloor);box(3.3,.18,7.725,9.5,3.6,21.0125,hallWall);
for(const x of [7.85,11.15])box(.3,3.6,7.875,x,1.8,20.9375,hallWall);
for(const x of [8.04,10.96])for(const y of [.15,3.3])box(.06,.07,7.9,x,y,20.95,silver);
for(const x of [8.03,10.97])box(.07,3.3,.1,x,1.65,17.3,silver);
const faintLamp=new THREE.Mesh(new THREE.OctahedronGeometry(.09),new THREE.MeshBasicMaterial({color:0x929cb7}));faintLamp.position.set(10.87,2.5,22);scene.add(faintLamp);
box(12,.18,18,9.5,-.1,34,nightWood);
const moonRug=new THREE.Mesh(new THREE.PlaneGeometry(11.15,17.15),new THREE.MeshStandardMaterial({color:0xb9b8c8,roughness:1}));moonRug.rotation.x=-Math.PI/2;moonRug.position.set(9.5,.004,34);scene.add(moonRug);
new THREE.TextureLoader().load('moon-carpet.png',t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,3);t.anisotropy=renderer.capabilities.getMaxAnisotropy();moonRug.material.map=t;moonRug.material.needsUpdate=true;});
for(const z of [28.75,39.25])box(.25,6.5,7.5,3.5,3.25,z,nightWall);box(.25,3.1,3,3.5,4.95,34,nightWall);box(.25,6.5,18,15.5,3.25,34,nightWall);box(12,6.5,.25,9.5,3.25,43,nightWall);
for(const x of [5.75,13.25])box(4.5,6.5,.25,x,3.25,25,nightWall);box(3,3.1,.25,9.5,4.95,25,nightWall);
doorFrame(2.94,3.32,.16,.4,9.5,25.12,silver);
for(const y of [.16,.4,5.95,6.25]){
 box(.1,.07,18,15.33,y,34,silver);if(y<3.4){for(const z of [28.75,39.25])box(.1,.07,7.5,3.67,y,z,silver);}else box(.1,.07,18,3.67,y,34,silver);
 box(12,.07,.1,9.5,y,42.83,silver);
 if(y<3.4){for(const x of [5.75,13.25])box(4.5,.07,.1,x,y,25.17,silver);}else box(12,.07,.1,9.5,y,25.17,silver);
}
for(let z=26.5;z<43;z+=2.5)for(const x of [3.68,15.32]){if(x<4&&z>32&&z<36)continue;box(.1,5.45,.045,x,3.15,z,nightWood);}
const moonMaterial=new THREE.MeshBasicMaterial({color:0xb2b8ce,side:THREE.DoubleSide});
new THREE.TextureLoader().load('moon-ceiling.png',t=>{t.colorSpace=THREE.SRGBColorSpace;t.repeat.set(1,1.5);t.offset.set(0,-.25);t.anisotropy=renderer.capabilities.getMaxAnisotropy();moonMaterial.map=t;moonMaterial.needsUpdate=true;});
const moonCeiling=new THREE.Mesh(new THREE.PlaneGeometry(12,18),moonMaterial);moonCeiling.rotation.x=Math.PI/2;moonCeiling.position.set(9.5,6.5,34);scene.add(moonCeiling);
for(const [i,[x,z]]of [[5.8,29],[13.2,29],[5.8,40],[13.2,40]].entries()){const cube=box(1.55,1.55,1.55,x,.83,z,new THREE.MeshStandardMaterial({map:inscription(i+8),roughness:1}));cube.rotation.y=(i%2?1:-1)*.08;cubes.push(cube);box(1.7,.13,1.7,x,.065,z,nightWood);box(1.66,.09,1.66,x,1.65,z,silver);}
const moonBook=createMoonBook(scene,cubes);
fetch('moon-book.json').then(r=>{if(!r.ok)throw new Error('Book unavailable');return r.json();}).then(d=>{moonBook.pages=d.pages;}).catch(()=>{});
// Anguish is held in the carved face; nothing moves or flashes.
const thirdFigure=new THREE.Group();thirdFigure.position.set(9.5,0,38);thirdFigure.rotation.y=Math.PI;scene.add(thirdFigure);
const anguishMask=new THREE.Group();anguishMask.position.y=2.4;thirdFigure.add(anguishMask);
const paleFace=new THREE.Mesh(maskGeometry,new THREE.MeshStandardMaterial({color:0xd0d0c7,roughness:1,vertexColors:true}));paleFace.scale.set(.31,.58,.1);anguishMask.add(paleFace);
const recess=new THREE.MeshBasicMaterial({color:0x222638});
for(const side of [-1,1]){
 const eye=new THREE.Mesh(new THREE.SphereGeometry(1,8,5),recess);eye.scale.set(.073,.105,.012);eye.position.set(side*.135,.105,.083);eye.rotation.z=side*.3;anguishMask.add(eye);
 const browPoints=[[side*.235,.15,.064],[side*.15,.245,.088],[side*.055,.28,.095]].map(p=>new THREE.Vector3(...p));const brow=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(browPoints),10,.017,4,false),silver);anguishMask.add(brow);
 const tear=new THREE.Mesh(new THREE.BoxGeometry(.013,.22,.012),new THREE.MeshBasicMaterial({color:0x666777}));tear.position.set(side*.12,-.09,.088);tear.rotation.z=-side*.07;anguishMask.add(tear);
}
const openMouth=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),recess);openMouth.scale.set(.07,.13,.012);openMouth.position.set(0,-.275,.09);anguishMask.add(openMouth);
for(const a of [.2,3.6]){const arc=new THREE.Mesh(new THREE.TorusGeometry(.53,.014,4,25,2.35),silver);arc.scale.y=1.38;arc.rotation.z=a;arc.position.z=-.05;anguishMask.add(arc);}
for(let i=0;i<4;i++){const veil=new THREE.Mesh(new THREE.ConeGeometry(.31+i*.045,2,6,1,true),new THREE.MeshBasicMaterial({color:0xa8b4d7,transparent:true,opacity:.07,depthWrite:false}));veil.position.y=1.12;veil.rotation.z=Math.PI;veil.rotation.y=i*.3;thirdFigure.add(veil);}
const moonCore=new THREE.Mesh(new THREE.OctahedronGeometry(.2),new THREE.MeshBasicMaterial({color:0xb6c4e6,transparent:true,opacity:.35}));moonCore.scale.set(.6,3.5,.6);moonCore.position.y=1.3;thirdFigure.add(moonCore);
const moonGlow=new THREE.PointLight(0xa4b5e4,5,9,2);moonGlow.position.set(9.5,2,38);scene.add(moonGlow);
const ceilingLight=new THREE.PointLight(0xb3c6ec,22,17,2);ceilingLight.position.set(9.5,5.7,34);scene.add(ceilingLight);
// Three equal wall panels: ornament, ornament, a record hidden in plain sight.
const panelCanvases=[],panelTextures=[];
const eyeRows=["      .-------.      ", "   .-:         :-.   ", " <       (o)       > ", "   `-:         :-'   ", "      `-------'      "];
function paintWall(index,log=''){
 const c=panelCanvases[index],g=c.getContext('2d');g.fillStyle='#23273b';g.fillRect(0,0,512,1024);g.strokeStyle='#57596c';g.lineWidth=2;g.strokeRect(20,20,472,984);g.strokeRect(27,27,458,970);
 g.fillStyle='#a8a9b7';g.font='16px monospace';g.textAlign='center';eyeRows.forEach((line,i)=>g.fillText(line,256,54+i*15));g.fillText('· '.repeat(index+1).trim(),256,140);
 g.textAlign='left';g.font='15px monospace';g.fillStyle='#9a9bad';
 if(index===2&&log){log.split('\n').forEach((line,i)=>g.fillText(line.trimEnd(),66,183+i*18));}
 else{const chars=' .:+=*#';for(let row=0;row<43;row++){let line='';for(let col=0;col<39;col++){const x=(col-19)/19,y=(row-21)/21;const v=index===0?Math.abs(Math.cos(Math.hypot(x,y*.8)*17)*Math.sin(y*9)):Math.abs(Math.sin(x*12+y*y*8)*Math.cos(y*13));line+=chars[Math.min(6,Math.floor(v*7))];}g.fillText(line,80,183+row*18);}}
}
for(let i=0;i<3;i++){const c=document.createElement('canvas');c.width=512;c.height=1024;panelCanvases.push(c);paintWall(i);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;panelTextures.push(t);const p=new THREE.Mesh(new THREE.PlaneGeometry(2.35,3.9),new THREE.MeshStandardMaterial({map:t,roughness:1}));p.rotation.y=-Math.PI/2;p.position.set(15.32,2.65,[29.5,34,38.5][i]);scene.add(p);}
// A quiet binary hint on the ceiling beside the right-hand wall; it never animates.
const clueCanvas=document.createElement('canvas');clueCanvas.width=1024;clueCanvas.height=256;const clueCtx=clueCanvas.getContext('2d');clueCtx.clearRect(0,0,1024,256);clueCtx.fillStyle='#a5a9ba';clueCtx.textAlign='center';clueCtx.font='48px monospace';clueCtx.fillText('00000011',512,108);clueCtx.font='30px monospace';clueCtx.fillText('--<o>--   --<o>--   --<o>--   >',512,186);const clueTex=new THREE.CanvasTexture(clueCanvas);clueTex.colorSpace=THREE.SRGBColorSpace;
const clue=new THREE.Mesh(new THREE.PlaneGeometry(3.5,.9),new THREE.MeshBasicMaterial({map:clueTex,transparent:true,depthWrite:false,side:THREE.DoubleSide}));clue.rotation.set(Math.PI/2,0,Math.PI/2);clue.position.set(13,6.47,30);scene.add(clue);
// Room IV: a quiet study reached through the moon room's west wall.
const studyWall=new THREE.MeshStandardMaterial({color:0x28352b,roughness:1});
const studyWood=new THREE.MeshStandardMaterial({color:0x493d2e,roughness:1});
const studyTrim=new THREE.MeshStandardMaterial({color:0x8f8260,roughness:.95});
const studyShadow=new THREE.MeshStandardMaterial({color:0x222920,roughness:1});
// The low connecting hall opens directly into both rooms.
box(6.5,.18,3,.25,-.1,34,hallFloor);box(6.25,.18,3.3,.25,3.6,34,hallWall);
for(const z of [32.35,35.65])box(6.25,3.6,.3,.25,1.8,z,hallWall);
for(const z of [32.54,35.46])for(const y of [.15,3.3])box(6.8,.07,.06,.25,y,z,studyTrim);
for(const x of [3.4,-2.9])doorFrame(2.94,3.32,.16,.4,x,34,studyTrim,Math.PI/2);
box(14,.18,14,-10,-.1,34,studyWood);
for(const z of [27,41])box(14,5.2,.25,-10,2.6,z,studyWall);
box(.25,5.2,14,-17,2.6,34,studyWall);
for(const z of [29.75,38.25])box(.25,5.2,5.5,-3,2.6,z,studyWall);
box(.25,1.8,3,-3,4.3,34,studyWall);
for(const y of [.16,.4,3.65,4.95]){
 for(const z of [27.17,40.83])box(13.7,.08,.1,-10,y,z,studyTrim);
 box(.1,.08,13.7,-16.83,y,34,studyTrim);
 if(y<3.4){for(const z of [29.75,38.25])box(.1,.08,5.5,-3.17,y,z,studyTrim);}
 else box(.1,.08,13.7,-3.17,y,34,studyTrim);
}
for(let x=-16;x<-3;x+=1.5)for(const z of [27.2,40.8])box(.065,3.1,.07,x,2,z,studyWood);
for(let z=28;z<41;z+=1.5){box(.07,3.1,.065,-16.8,2,z,studyWood);if(z<32||z>36)box(.07,3.1,.065,-3.2,2,z,studyWood);}
const studyRug=new THREE.Mesh(new THREE.PlaneGeometry(13.1,13.1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));studyRug.rotation.x=-Math.PI/2;studyRug.position.set(-10,.004,34);scene.add(studyRug);
new THREE.TextureLoader().load('study-carpet.png',t=>{t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2.5,2.5);t.anisotropy=renderer.capabilities.getMaxAnisotropy();studyRug.material.map=t;studyRug.material.needsUpdate=true;});
const duskMaterial=new THREE.MeshBasicMaterial({color:0xdbd6c7,side:THREE.DoubleSide});
new THREE.TextureLoader().load('study-ceiling.png',t=>{t.colorSpace=THREE.SRGBColorSpace;duskMaterial.map=t;duskMaterial.needsUpdate=true;});
const duskCeiling=new THREE.Mesh(new THREE.PlaneGeometry(14,14),duskMaterial);duskCeiling.rotation.x=Math.PI/2;duskCeiling.position.set(-10,5.2,34);scene.add(duskCeiling);
// Two substantial bookcases on opposite walls, ready for the collected texts.
const bookColors=[0x4b5740,0x6d5140,0x777052,0x34463e,0x51444a];
function bookcase(x,z,facing){
 const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=facing;scene.add(group);
 function part(w,h,d,px,py,pz,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(px,py,pz);group.add(mesh);return mesh;}
 part(5.1,3.05,.12,0,1.63,-.25,studyShadow);
 for(const side of [-1,1]){part(.16,3.25,.68,side*2.58,1.65,0,studyWood);part(.045,3.12,.06,side*2.58,1.66,.36,studyTrim);}
 for(const y of [.2,.94,1.68,2.42,3.2]){part(5.35,.13,.72,0,y,0,studyWood);part(5.4,.025,.045,0,y+.04,.38,studyTrim);}
 part(5.65,.14,.82,0,3.32,0,studyWood);
 part(.11,3,.62,0,1.7,0,studyWood);
 const collision={position:{x,z},userData:{collisionHalfX:3,collisionHalfZ:.65}};cubes.push(collision);return group;
}
const bookcases=[bookcase(-10,27.65,0),bookcase(-10,40.35,Math.PI)];
// Closed decorative volumes fill the shelves around the numbered, readable books.
// Batch their covers, page edges and spine bands to keep the scene light on phones.
function fillBookcase(group,caseIndex){
 const pieces=[],palette=[0x39473b,0x624b3d,0x676044,0x38443e,0x514047,0x787057,0x434d46];
 function piece(w,h,d,x,y,z,color){pieces.push({w,h,d,x,y,z,color});}
 for(let row=0;row<4;row++){
  const base=.265+row*.74;
  for(let i=0;i<24;i++){
   const x=-2.28+i*.19,seed=i+row*29+caseIndex*47;
   if(Math.abs(x)<.23||seed%11===0||(row===0&&x>1.02))continue;
   // Clear space around each readable spine on the two middle shelves.
   if((row===1||row===2)&&[-1.65,-.7,1.25].some(slot=>Math.abs(x-slot)<.29))continue;
   const width=.105+(seed%4)*.019,height=.39+(seed%7)*.032,depth=.32+(seed%5)*.014;
   const y=base+height/2,z=.018-(seed%3)*.011,color=palette[seed%palette.length];
   piece(width-.022,height-.032,depth-.026,x,y,z,0xb7ae91);
   for(const side of [-1,1])piece(.012,height,depth,x+side*(width/2-.006),y,z,color);
   piece(width,height,.024,x,y,z+depth/2-.012,color);
   if(seed%3!==0)for(const dy of [-height*.32,height*.32])piece(width*.76,.011,.004,x,y+dy,z+depth/2+.002,0x8e805b);
  }
  if(row===0){let stackBase=base;for(let j=0;j<3;j++){
   const width=.72-j*.05,height=.087+j*.008,depth=.37,x=1.67+(j%2)*.045,y=stackBase+height/2,z=.01,color=palette[(caseIndex+j+1)%palette.length];
   piece(width-.018,height-.024,depth-.02,x,y,z,0xb7ae91);
   for(const side of [-1,1])piece(width,.012,depth,x,y+side*(height/2-.006),z,color);
   piece(width,height,.022,x,y,z+depth/2-.011,color);stackBase+=height;
  }}
 }
 const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({roughness:1}),pieces.length);
 const transform=new THREE.Object3D(),color=new THREE.Color();
 pieces.forEach((p,i)=>{transform.position.set(p.x,p.y,p.z);transform.scale.set(p.w,p.h,p.d);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);mesh.setColorAt(i,color.setHex(p.color));});
 mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;group.add(mesh);
}
bookcases.forEach(fillBookcase);
const readableBooks=[];let nearBook=null,highlightedBook=null;
function shelveBooks(entries){
 entries.forEach((entry,index)=>{
  const shelfIndex=index<6?0:1,slot=index%6,row=Math.floor(slot/3),height=.50+(slot%3)*.02;
  const volume=new THREE.Group();volume.position.set([-1.65,-.7,1.25][slot%3],1.005+row*.74+height/2,.055);bookcases[shelfIndex].add(volume);
  const cover=new THREE.MeshStandardMaterial({color:bookColors[index%bookColors.length],roughness:1,emissive:0x000000});
  const body=new THREE.Mesh(new THREE.BoxGeometry(.18,height,.03),cover);body.position.z=.195;volume.add(body);
  for(const side of [-1,1]){const board=new THREE.Mesh(new THREE.BoxGeometry(.014,height,.42),cover);board.position.x=side*.083;volume.add(board);}
  const paperEdge=new THREE.Mesh(new THREE.BoxGeometry(.15,height-.026,.39),new THREE.MeshStandardMaterial({color:0xc9bd98,roughness:1}));paperEdge.position.z=-.015;volume.add(paperEdge);
  const c=document.createElement('canvas');c.width=128;c.height=256;const g=c.getContext('2d');
  g.clearRect(0,0,128,256);g.strokeStyle='#c8b47b';g.lineWidth=3;g.strokeRect(10,15,108,226);g.font='44px Georgia';g.fillStyle='#ecdfb5';g.textAlign='center';g.fillText(String(entry.entry).padStart(2,'0'),64,141);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const spine=new THREE.Mesh(new THREE.PlaneGeometry(.165,height-.03),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));spine.position.z=.212;volume.add(spine);
  bookcases[shelfIndex].updateMatrixWorld(true);const position=volume.localToWorld(new THREE.Vector3(0,0,.22));
  readableBooks.push({...entry,position,normal:{x:0,z:shelfIndex===0?1:-1},cover});
 });
}
fetch('evening-books.json').then(r=>{if(!r.ok)throw new Error('Books unavailable');return r.json();}).then(d=>shelveBooks(d.books)).catch(()=>{});
// Two finished inscriptions in the back corners: a folded rosette and a branching weave.
for(const [i,z]of [29.15,38.85].entries()){
 const cube=box(1.55,1.55,1.55,-14.8,.83,z,new THREE.MeshStandardMaterial({map:inscription(i+12),roughness:1}));
 cube.rotation.y=(i===0?1:-1)*.08;cubes.push(cube);
 box(1.7,.13,1.7,-14.8,.065,z,studyWood);box(1.66,.09,1.66,-14.8,1.65,z,studyTrim);
}

// The resting mask is neither smiling nor pleading: a face at ease in worn brass.
const fourthFigure=new THREE.Group();fourthFigure.position.set(-12,0,34);fourthFigure.rotation.y=Math.PI/2;scene.add(fourthFigure);
const restingMask=new THREE.Group();restingMask.position.y=2.12;restingMask.rotation.x=-.07;fourthFigure.add(restingMask);
const restingFace=new THREE.Mesh(maskGeometry,new THREE.MeshStandardMaterial({color:0xc1af82,roughness:1,vertexColors:true}));restingFace.scale.set(.32,.47,.105);restingMask.add(restingFace);
const restingLine=new THREE.MeshBasicMaterial({color:0x514a39});
function maskStroke(points,r=.012,mat=restingLine){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,12,r,4,false),mat);restingMask.add(mesh);}
for(const side of [-1,1]){
 maskStroke([[side*.065,.075,.105],[side*.132,.045,.098],[side*.215,.075,.078]]);
 maskStroke([[side*.065,.175,.098],[side*.14,.19,.09],[side*.22,.16,.069]],.009,studyTrim);
}
maskStroke([[-.068,-.205,.094],[0,-.208,.105],[.068,-.205,.094]],.009);
const restingNose=new THREE.Mesh(new THREE.ConeGeometry(.028,.16,3),studyTrim);restingNose.rotation.z=Math.PI;restingNose.position.set(0,-.025,.117);restingMask.add(restingNose);
// A thin complete rim frames the face beneath its pressed petals.
const restingRim=new THREE.Mesh(new THREE.TorusGeometry(.39,.018,4,32),studyTrim);restingRim.scale.y=1.4;restingRim.position.z=-.03;restingMask.add(restingRim);
// Paper-thin, uneven petals sit behind the face, with fine dried veins.
const pressedOutline=new THREE.Shape();
pressedOutline.moveTo(0,0);
for(const [x,y]of [[-.27,.15],[-.45,.48],[-.39,.76],[-.12,.97],[.07,1],[.32,.83],[.44,.49],[.26,.18]])pressedOutline.lineTo(x,y);
pressedOutline.closePath();
const pressedGeometry=new THREE.ExtrudeGeometry(pressedOutline,{depth:.008,bevelEnabled:false,steps:1});
const fadedPetals=[0xa89162,0x9a8054,0xb2a079,0x85805b].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide,flatShading:true}));
const veinMaterial=new THREE.LineBasicMaterial({color:0x6b6048,transparent:true,opacity:.55});
for(let i=0;i<13;i++){
 const a=i*Math.PI*2/13,petal=new THREE.Group();
 petal.position.set(Math.sin(a)*.30,Math.cos(a)*.445,-.06-(i%3)*.003);
 petal.rotation.z=-a+(i%3-1)*.045;petal.scale.set(.18+(i%3)*.012,.26+(i*7%5)*.023,1);
 petal.add(new THREE.Mesh(pressedGeometry,fadedPetals[i%fadedPetals.length]));
 const veinPoints=[[0,.06,.009],[.015,.42,.009],[-.03,.87,.009]].map(p=>new THREE.Vector3(...p));
 petal.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(veinPoints),veinMaterial));
 for(const side of [-1,1])for(const y of [.3,.5]){
  const vein=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,y,.009),new THREE.Vector3(side*.28,y+.19,.009)]);
  petal.add(new THREE.Line(vein,veinMaterial));
 }
 restingMask.add(petal);
}

for(let i=0;i<4;i++){const veil=new THREE.Mesh(new THREE.ConeGeometry(.3+i*.045,1.8,6,1,true),new THREE.MeshBasicMaterial({color:0xe2d7aa,transparent:true,opacity:.065,depthWrite:false}));veil.position.y=1;veil.rotation.z=Math.PI;veil.rotation.y=i*.35;fourthFigure.add(veil);}
const eveningCore=new THREE.Mesh(new THREE.OctahedronGeometry(.21),new THREE.MeshBasicMaterial({color:0xe7d9b1,transparent:true,opacity:.3}));eveningCore.scale.set(.55,3,.55);eveningCore.position.y=1.08;fourthFigure.add(eveningCore);
const eveningGlow=new THREE.PointLight(0xe9d4a1,4,8,2);eveningGlow.position.set(-12,1.8,34);scene.add(eveningGlow);
const studyLight=new THREE.PointLight(0xffddaf,10,18,2);studyLight.position.set(-10,4.4,34);scene.add(studyLight);

const panelLook=new THREE.Vector3();
let currentLocation='The Sky Room',lastVisitedRoom='The Sky Room';let active=false,modal=false,keys={},drag=null,near=null;const clock=new THREE.Clock();
let encounterSets={sky:[],sunflower:[],moon:[],evening:[]},encounterIndices={sky:0,sunflower:0,moon:0,evening:0},activeEncounterRoom='sky',passage=null,pageIndex=-1,readingNote=false,readingMask=false,notePassage=null,panelPassage=null;
fetch('wall-panel.json').then(r=>{if(!r.ok)throw new Error('Inscription unavailable');return r.json();}).then(d=>{panelPassage=d;paintWall(2,d.pages.join('\n'));panelTextures[2].needsUpdate=true;}).catch(()=>{});
fetch('note.json').then(r=>{if(!r.ok)throw new Error('Note unavailable');return r.json();}).then(d=>{notePassage=d;paintNote(d.pages[0]);paperTexture.needsUpdate=true;}).catch(()=>{});
for(const [room,file]of [['sky','dialogue.json'],['sunflower','sunflower-dialogue.json'],['moon','moon-dialogue.json'],['evening','evening-dialogue.json']])fetch(file).then(r=>{if(!r.ok)throw new Error('Dialogue unavailable');return r.json();}).then(d=>{encounterSets[room]=d.encounters;}).catch(()=>{});
function reset(){const entry=entranceFor(camera.position.x,camera.position.z,lastVisitedRoom);camera.position.set(entry.x,1.65,entry.z);yaw=entry.yaw;pitch=entry.pitch;lastVisitedRoom=entry.room;drag=null;near=null;}
function dismiss(completed=false){if(bookReader.open)bookReader.close();if(completed&&pageIndex>=0&&!readingNote&&!readingMask)encounterIndices[activeEncounterRoom]=(encounterIndices[activeEncounterRoom]+1)%encounterSets[activeEncounterRoom].length;modal=false;pageIndex=-1;keys={};$('dialog').hidden=true;document.body.classList.remove('speaking','reading-note','reading-panel','listening-mask');readingNote=false;readingMask=false;$('close').textContent='Return to the room';}
function show(title,text,label='THE SKY ROOM'){pageIndex=-1;document.body.classList.remove('speaking','reading-note','reading-panel','listening-mask');readingNote=false;readingMask=false;$('close').textContent='Return to the room';modal=true;keys={};drag=null;$('label').textContent=label;$('dialogTitle').textContent=title;$('dialogText').textContent=text;$('dialog').hidden=false;focusDialogueStart();}
// Treat the collected markup as text; only emphasis, headings and rules are rendered.
function renderSource(element,text){
 element.replaceChildren();
 text.split(/(^## [^\n]+|^---[ \t]*$|\*\*[^*]+\*\*|_[^_\n]+_|\*[^*\n]+\*)/gm).forEach(part=>{
  if(part.startsWith('## ')){const strong=document.createElement('strong');strong.textContent=part.slice(3);element.append(strong);}
  else if(part.trim()==='---')element.append(document.createElement('hr'));
  else if(part.startsWith('**')&&part.endsWith('**')){const strong=document.createElement('strong');strong.textContent=part.slice(2,-2);element.append(strong);}
  else if((part.startsWith('_')&&part.endsWith('_'))||(part.startsWith('*')&&part.endsWith('*'))){const em=document.createElement('em');em.textContent=part.slice(1,-1);element.append(em);}
  else element.append(document.createTextNode(part));
 });
}
function focusDialogueStart(){
 // Focusing the footer button can scroll a freshly opened panel straight to its end.
 $('dialogText').focus({preventScroll:true});
 $('dialogText').scrollTop=0;$('dialog').scrollTop=0;
}
function renderPage(){
 renderSource($('dialogText'),passage.pages[pageIndex]);
 $('label').textContent=passage.speaker;$('dialogTitle').textContent='';
 $('close').textContent=pageIndex===passage.pages.length-1?'Leave':'Continue';
 focusDialogueStart();
}
let openVolume=null,bookPageIndex=0;
function renderBookPage(){
 const paged=Array.isArray(openVolume.pages),page=paged?openVolume.pages[bookPageIndex]:openVolume;
 $('bookTitle').textContent=page.title;
 $('bookRoom').textContent=(openVolume.room||'The Evening Room').toUpperCase()+' · CLAUDE';
 // The Moon book preserves the literal text, including every fragmented line and space.
 if(openVolume.literalLayout){
  const noteStart=page.source?.entry===4?page.text.indexOf('Please note:'):-1;
  if(noteStart>=0){
   const note=document.createElement('span');note.className='book-wrapped-note';note.textContent=page.text.slice(noteStart);
   $('bookText').replaceChildren(document.createTextNode(page.text.slice(0,noteStart)),note);
  }else $('bookText').textContent=page.text;
 }
 else renderSource($('bookText'),page.text);
 $('bookPages').hidden=!paged;
 $('bookPageCount').textContent=paged?`Page ${bookPageIndex+1} of ${openVolume.pages.length}`:'';
 $('bookPrevious').disabled=!paged||bookPageIndex===0;
 $('bookNext').disabled=!paged||bookPageIndex===openVolume.pages.length-1;
 $('bookText').focus({preventScroll:true});$('bookText').scrollTop=0;$('bookText').scrollLeft=0;
}
function openBook(book){
 if(book.id==='moon-book'&&!book.pages){show('A moment…','The text has not loaded yet. Please try again.','THE MOON ROOM');return;}
 modal=true;keys={};drag=null;pageIndex=-1;openVolume=book;bookPageIndex=0;
 bookReader.dataset.bookId=book.id;bookReader.classList.toggle('moon-book',book.literalLayout===true);
 document.body.classList.add('reading-book');bookReader.showModal();renderBookPage();
}
$('bookPrevious').onclick=()=>{if(openVolume?.pages&&bookPageIndex>0){bookPageIndex--;renderBookPage();}};
$('bookNext').onclick=()=>{if(openVolume?.pages&&bookPageIndex<openVolume.pages.length-1){bookPageIndex++;renderBookPage();}};
$('bookClose').onclick=()=>bookReader.close();
bookReader.addEventListener('close',()=>{modal=false;keys={};drag=null;openVolume=null;bookPageIndex=0;document.body.classList.remove('reading-book');delete bookReader.dataset.bookId;canvas.focus({preventScroll:true});});
function advance(){if(pageIndex>=0&&pageIndex<passage.pages.length-1){pageIndex++;renderPage();}else dismiss(pageIndex>=0);}
$('enter').onclick=()=>{active=true;$('intro').hidden=true;document.body.classList.add('playing');music.start();};$('close').onclick=advance;$('help').onclick=()=>{keys={};drag=null;settings.showModal();document.body.classList.add('settings-open');};$('settingsClose').onclick=()=>settings.close();settings.addEventListener('close',()=>{keys={};drag=null;document.body.classList.remove('settings-open');});$('reset').onclick=()=>{reset();dismiss();};
function interact(){
 if(!active||modal||near===null)return;
 if(near==='book'&&nearBook){openBook(nearBook);return;}
 readingNote=near==='note'||near==='wall';readingMask=near==='mask';
 activeEncounterRoom=({solemn:'sunflower',mask:'sunflower',anguish:'moon',resting:'evening'})[near]||'sky';
 const next=readingMask?maskPassages.get(nearMask.id):near==='wall'?panelPassage:readingNote?notePassage:encounterSets[activeEncounterRoom][encounterIndices[activeEncounterRoom]];
 if(!next){show('A moment…','The text has not loaded yet. Please try again.');return;}
 passage=next;modal=true;keys={};drag=null;pageIndex=0;
 if(!readingNote){const target=readingMask?nearMask.position:{sky:{x:0,y:1.78,z:-3},sunflower:{x:26,y:2.1,z:16},moon:{x:9.5,y:2.4,z:38},evening:{x:-12,y:2.12,z:34}}[activeEncounterRoom];yaw=Math.atan2(camera.position.x-target.x,camera.position.z-target.z);pitch=Math.atan2(target.y-camera.position.y,Math.hypot(camera.position.x-target.x,camera.position.z-target.z));if(readingMask)pitch-=.22;}
 document.body.classList.add('speaking');document.body.classList.toggle('reading-note',readingNote);document.body.classList.toggle('reading-panel',near==='wall');document.body.classList.toggle('listening-mask',readingMask);$('dialog').hidden=false;renderPage();
}
$('interact').onclick=interact;window.addEventListener('keydown',e=>{if(e.code==='KeyM'&&!e.repeat&&!['INPUT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();music.toggle();return;}if(settings.open||bookReader.open)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.code]=true;if((e.code==='KeyE'||e.code==='Space')&&!e.repeat){if(modal){e.preventDefault();advance();}else if(e.code==='KeyE')interact();}if(e.code==='Escape')dismiss(pageIndex>=0&&pageIndex===passage.pages.length-1);});window.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>{keys={};drag=null;});
canvas.addEventListener('pointerdown',e=>{if(active&&!modal&&!settings.open){drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});canvas.addEventListener('pointermove',e=>{if(!drag||modal||settings.open)return;({yaw,pitch}=applyLook(yaw,pitch,(e.clientX-drag.x)*.004,-(e.clientY-drag.y)*.004,invertX,invertY));drag={x:e.clientX,y:e.clientY};});for(const ev of ['pointerup','pointercancel'])canvas.addEventListener(ev,()=>drag=null);
for(const b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.key]=true;});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys[b.dataset.key]=false);}
function free(x,z){return isWalkable(x,z,cubes);}
const bookSight=new THREE.Raycaster();
function moonBookInSight(){
 const candidate=focusedBook(camera.position,panelLook,[moonBook]);
 if(!candidate)return null;
 const direction=candidate.position.clone().sub(camera.position),distance=direction.length();
 bookSight.set(camera.position,direction.normalize());bookSight.far=distance;
 // Looking toward the book through a stone block must not reveal its interaction.
 return bookSight.intersectObjects(cubes.filter(c=>c.isMesh),false).length?null:candidate;
}
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);if(active&&!modal&&!settings.open){const horizontal=((keys.KeyL?1:0)-(keys.KeyJ?1:0))*1.25*dt,vertical=((keys.KeyI?1:0)-(keys.KeyK?1:0))*1.25*dt;({yaw,pitch}=applyLook(yaw,pitch,horizontal,vertical,invertX,invertY));let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),r=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);const len=Math.hypot(f,r)||1,step=2.5*dt/len;const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*r)*step,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*r)*step;if(free(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(free(camera.position.x,camera.position.z+dz))camera.position.z+=dz;}
camera.rotation.set(pitch,yaw,0);const location=roomAt(camera.position.x,camera.position.z);music.setScene(location,modal||settings.open);if(location!=='The Passage')lastVisitedRoom=location;$('reset').textContent=location==='The Passage'?'Return to last room’s entrance':'Return to this room’s entrance';if(location!==currentLocation){currentLocation=location;document.querySelector('h1').textContent=location;$('roomNumber').textContent=location==='The Sky Room'?'01':location==='The Sunflower Room'?'02':location==='The Moon Room'?'03':location==='The Evening Room'?'04':'…';}camera.getWorldDirection(panelLook);near=null;let dist=Math.hypot(camera.position.x,camera.position.z+3);if(dist<2.6)near='figure';else if(Math.hypot(camera.position.x-26,camera.position.z-16)<2.6)near='solemn';else if(Math.hypot(camera.position.x-9.5,camera.position.z-38)<2.6)near='anguish';else if(Math.hypot(camera.position.x+12,camera.position.z-34)<2.6)near='resting';else if(Math.hypot(camera.position.x-notePosition.x,camera.position.z-notePosition.z)<1.35)near='note';else if(isPanelFocused(camera.position,panelLook))near='wall';nearMask=location==='The Sunflower Room'?focusedWallMask(camera.position,panelLook,wallMasks):null;if(nearMask)near='mask';if(highlightedMask!==nearMask){if(highlightedMask)for(const m of highlightedMask.highlight)m.emissive.setHex(0x000000);if(nearMask)for(const m of nearMask.highlight)m.emissive.setHex(0x211a10);highlightedMask=nearMask;}nearBook=location==='The Evening Room'?focusedBook(camera.position,panelLook,readableBooks):location==='The Moon Room'?moonBookInSight():null;if(nearBook)near='book';if(highlightedBook!==nearBook){if(highlightedBook)highlightedBook.cover.emissive.setHex(0x000000);if(nearBook)nearBook.cover.emissive.setHex(0x463b20);highlightedBook=nearBook;}$('prompt').textContent=active&&!modal&&near!==null?(near==='mask'?'E · Listen':near==='book'?(nearBook.id==='moon-book'?'E · Read the book':`E · Read entry ${nearBook.entry}`):near==='note'?'E · Read the note':near==='wall'?'E · Read the inscription':'E · Talk'):'';$('interact').style.opacity=near===null?'.35':'1';$('interact').textContent=near==='mask'?'Listen':near==='book'?(nearBook.id==='moon-book'?'Read the book':`Read entry ${nearBook.entry}`):near==='note'?'Read the note':near==='wall'?'Read inscription':'Talk';renderer.render(scene,camera);}loop();window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function roomKey(name){return {'The Sky Room':'sky','The Sunflower Room':'sunflower','The Moon Room':'moon','The Evening Room':'evening'}[name];}
if(document.modelContext?.registerTool){
const lifecycle=new AbortController();
for(const tool of [
{name:'read_room',description:'Read the current room, player position, and nearby encounter.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(){return {room:roomAt(camera.position.x,camera.position.z),position:{x:camera.position.x,z:camera.position.z},nearby:near,moonEntranceOpen:true,dialoguePlaced:(encounterSets[roomKey(currentLocation)]?.length||0)>0,encounter:roomKey(currentLocation)?encounterIndices[roomKey(currentLocation)]+1:null,readingBook:bookReader.open,bookPage:bookReader.open&&openVolume?.pages?bookPageIndex+1:null,nearbyBook:nearBook?{id:nearBook.id,title:nearBook.title}:null,nearbyMask:nearMask?{id:nearMask.id,name:nearMask.name}:null,listeningToMask:readingMask,dialoguePage:pageIndex>=0?pageIndex+1:null,readingNote};}},
{name:'return_to_entrance',description:'Move to the current room entrance, or the last visited room from a hall, preserving dialogue progress.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute(input){if(input&&Object.keys(input).length)throw new Error('No arguments expected');$('reset').click();return {position:{x:camera.position.x,z:camera.position.z}};}}
]){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
