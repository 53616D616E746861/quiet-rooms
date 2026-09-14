import * as THREE from './three.module.js';
import {WALL_MASK_LAYOUT} from './wall-mask-layout.js';

// Small, original low-poly sculptures share the room's worn ceramic and bronze materials.
export function createWallMasks(scene){
 const faceGeometry=new THREE.SphereGeometry(1,12,10);
 const colors=[];for(let i=0;i<faceGeometry.attributes.position.count;i++){const shade=.78+.2*((i*31%97)/97);colors.push(shade,shade,shade*.96);}faceGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const metal=new THREE.MeshStandardMaterial({color:0x897044,roughness:.95});
 const recess=new THREE.MeshBasicMaterial({color:0x2c2827});
 const linen=new THREE.MeshStandardMaterial({color:0x84765b,roughness:1});
 const material=(color,weathered=true)=>new THREE.MeshStandardMaterial({color,roughness:1,vertexColors:weathered,side:THREE.DoubleSide});
 function mesh(parent,geometry,mat,position=[0,0,0],scale=[1,1,1]){const o=new THREE.Mesh(geometry,mat);o.position.set(...position);o.scale.set(...scale);parent.add(o);return o;}
 function face(parent,mat,sx=.34,sy=.52,sz=.1,position=[0,0,0]){return mesh(parent,faceGeometry,mat,position,[sx,sy,sz]);}
 function stroke(parent,points,mat=recess,r=.012){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*4),r,4,false),mat);}
 function plate(parent,points,mat,depth=.055,z=0){const shape=new THREE.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();return mesh(parent,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),mat,[0,0,z]);}
 function eyes(parent,x=.13,y=.12,z=.108){for(const side of [-1,1])mesh(parent,new THREE.SphereGeometry(1,8,5),recess,[side*x,y,z],[.073,.031,.009]);}
 function features(parent,z=.11){eyes(parent,.13,.12,z);const nose=mesh(parent,new THREE.ConeGeometry(.035,.2,3),metal,[0,-.025,z+.025]);nose.rotation.z=Math.PI;stroke(parent,[[-.058,-.245,z],[0,-.249,z+.006],[.058,-.245,z]],recess,.009);}
 // Floral surrounds sit behind the faces, sharing the room figures' material language.
 const petalGeometry=new THREE.SphereGeometry(1,6,4);
 const rayGeometry=new THREE.ConeGeometry(1,1,3);
 const orangePetals=[0xd2754c,0xbf603e,0xdd9262].map(c=>material(c,false));
 const clayPetals=[0xb36d50,0xd18b64,0x9f664d].map(c=>material(c,false));
 const goldRays=[0x8f7444,0xb29959,0x71623d].map(c=>material(c,false));
 const pressedPetals=[0xb4a07b,0x998768,0xc7b891].map(c=>material(c,false));
 const leafColors=[0x65784d,0x84935a,0x506944].map(c=>material(c,false));
 const leafVein=material(0xa4a270,false);
 const leafShape=new THREE.Shape();leafShape.moveTo(0,0);
 for(const [x,y]of [[-.34,.18],[-.49,.46],[-.29,.71],[0,1],[.24,.74],[.46,.41],[.3,.16]])leafShape.lineTo(x,y);
 leafShape.closePath();
 const leafGeometry=new THREE.ExtrudeGeometry(leafShape,{depth:.007,bevelEnabled:false});
 function surround(parent,id){
  const settings={
   forgotten:{style:'petals',rx:.30,ry:.46,count:11,palette:orangePetals},
   layers:{style:'petals',rx:.45,ry:.55,count:12,palette:clayPetals},
   closed:{style:'rays',rx:.34,ry:.56,count:15,palette:goldRays},
   profiles:{style:'rays',rx:.50,ry:.52,count:14,palette:goldRays},
   repaired:{style:'rays',rx:.37,ry:.53,count:13,palette:goldRays},
   watching:{style:'leaves',rx:.43,ry:.54,count:13,palette:leafColors},
   fold:{style:'pressed',rx:.39,ry:.53,count:11,palette:pressedPetals}
  }[id];
  const {style,rx,ry,count,palette}=settings;
  for(let i=0;i<count;i++){
   const a=(i+.5)*Math.PI*2/count,mat=palette[i%palette.length];
   if(style==='leaves'){
    const leaf=new THREE.Group();leaf.position.set(Math.sin(a)*rx*.85,Math.cos(a)*ry*.86,-.075);leaf.rotation.z=-a+(i%2?.09:-.09);parent.add(leaf);
    const length=.32+(i%3)*.035,width=.20+(i%2)*.025;
    mesh(leaf,leafGeometry,mat,[0,0,0],[width,length,1]);
    stroke(leaf,[[0,.025,.010],[.009,length*.45,.012],[0,length*.92,.010]],leafVein,.003);
   }else if(style==='rays'){
    const length=.23+(i%3)*.025,width=id==='profiles'?.060:.044;
    const ray=mesh(parent,rayGeometry,mat,[Math.sin(a)*(rx+length/2-.055),Math.cos(a)*(ry+length/2-.055),-.063],[width,length,width*.48]);ray.rotation.z=-a;
   }else{
    const pressed=style==='pressed',halfLength=(pressed?.155:.19)+(i%3)*.012,width=pressed?.064:.087;
    const petal=mesh(parent,petalGeometry,mat,[Math.sin(a)*(rx+halfLength-.065),Math.cos(a)*(ry+halfLength-.065),-.060],[width,halfLength,pressed?.009:.021]);petal.rotation.z=-a+(i%3-1)*.045;
   }
  }
 }
 const masks=[];
 for(const item of WALL_MASK_LAYOUT){
  const mount=new THREE.Group();mount.position.set(item.x,item.y,item.z);mount.rotation.y=item.yaw;scene.add(mount);
  // A quiet patch in the plaster, a peg and a short loop of old cord.
  plate(mount,[[-.36,-.64],[-.51,-.21],[-.46,.46],[-.22,.66],[.21,.68],[.47,.37],[.50,-.22],[.31,-.64]],material(0x49383e,false),.006,-.14);
  const peg=mesh(mount,new THREE.CylinderGeometry(.027,.031,.15,6),metal,[0,.76,-.045]);peg.rotation.x=Math.PI/2;
  mesh(mount,new THREE.SphereGeometry(.036,6,4),metal,[0,.76,.03]);
  stroke(mount,[[-.12,.43,-.005],[0,.75,.02],[.12,.43,-.005]],linen,.008);
  const sculpture=new THREE.Group();sculpture.rotation.z=[-.055,.035,-.02,.045,-.04,.025,-.07][masks.length];mount.add(sculpture);
  surround(sculpture,item.id);
  const highlight=[];
  if(item.id==='forgotten'){
   const ivory=material(0xd0bf96);highlight.push(ivory);face(sculpture,ivory,.30,.46,.095);features(sculpture,.097);
   const paint=material(0x957354,false),green=material(0x768177,false);
   plate(sculpture,[[-.20,.20],[-.25,.10],[-.23,-.03],[-.17,.01],[-.14,.15]],paint,.004,.078);
   plate(sculpture,[[.05,.34],[.17,.28],[.15,.19],[.10,.22],[.03,.25]],green,.004,.087);
   for(const side of [-1,1])stroke(sculpture,[[side*.19,-.13,.078],[side*.16,-.21,.079],[side*.17,-.27,.066]],paint,.004);
  }else if(item.id==='layers'){
   for(let i=0;i<3;i++){
    const clay=material([0x96735c,0xa8a17b,0xc9ba96][i]);highlight.push(clay);
    const layer=new THREE.Group();layer.position.set((i-1)*.14,(i-1)*.04,i*.06);sculpture.add(layer);
    face(layer,clay,.32,.51,.06);eyes(layer,.12,.11,.063);
    stroke(layer,[[-.052,-.24,.056],[.035,-.24,.058]],recess,.007);
   }
  }else if(item.id==='closed'){
   const bronze=material(0x685b44);highlight.push(bronze);face(sculpture,bronze,.34,.56,.1);
   for(const side of [-1,1])stroke(sculpture,[[side*.063,.13,.102],[side*.14,.10,.098],[side*.23,.13,.08]],recess,.012);
   const nose=mesh(sculpture,new THREE.ConeGeometry(.044,.24,3),metal,[0,-.02,.128]);nose.rotation.z=Math.PI;
   for(let i=0;i<5;i++){
    const x=-.17+i*.082;stroke(sculpture,[[x,.34,.078],[x+.024,.23,.097]],metal,.004);
    stroke(sculpture,[[x,-.20,.089],[x-.025,-.33,.068]],metal,.004);
   }
   mesh(sculpture,new THREE.BoxGeometry(.11,.026,.014),metal,[0,-.27,.091]);
  }else if(item.id==='profiles'){
   const outline=[[0,.46],[.20,.51],[.34,.36],[.36,.15],[.51,.02],[.385,-.035],[.38,-.14],[.35,-.255],[.29,-.39],[.12,-.49],[0,-.38]];
   for(const side of [-1,1]){
    const clay=material(side<0?0xb3a58c:0x9a8872,false);highlight.push(clay);
    plate(sculpture,outline.map(([x,y])=>[side*x,y]),clay,.085);
    stroke(sculpture,[[side*.17,.19,.092],[side*.25,.17,.093],[side*.32,.19,.09]],recess,.013);
    stroke(sculpture,[[side*.285,-.135,.09],[side*.35,-.135,.09]],recess,.005);
   }
   mesh(sculpture,new THREE.BoxGeometry(.022,.88,.025),metal,[0,.03,.095]);
  }else if(item.id==='repaired'){
   const left=material(0xc4bba3,false),right=material(0xb3ae99,false);highlight.push(left,right);
   const seam=[[-.03,-.50],[.05,-.27],[-.06,-.10],[.025,.1],[-.07,.30],[-.01,.53]];
   plate(sculpture,[[-.03,.53],[-.25,.40],[-.37,.17],[-.33,-.23],[-.18,-.47],...seam.map(([x,y])=>[x-.015,y])],left,.075);
   plate(sculpture,[[.01,.53],[.26,.40],[.38,.14],[.34,-.23],[.17,-.48],...seam.map(([x,y])=>[x+.015,y])],right,.07);
   stroke(sculpture,seam.map(([x,y])=>[x,y,.083]),metal,.016);eyes(sculpture,.16,.15,.082);
   for(const [x,y]of [[-.05,.30],[.02,.1],[.04,-.27]])mesh(sculpture,new THREE.BoxGeometry(.10,.022,.025),metal,[x,y,.097]);
   stroke(sculpture,[[-.05,-.31,.084],[.055,-.31,.084]],recess,.009);
  }else if(item.id==='watching'){
   const olive=material(0x8f9073),white=material(0xcfc3a0,false);highlight.push(olive);face(sculpture,olive,.43,.54,.105);
   const positions=[[-.17,.29],[.17,.29],[-.26,.005],[0,.005],[.26,.005],[-.17,-.29],[.17,-.29]];
   positions.forEach(([x,y],i)=>{
    const z=.105*Math.sqrt(Math.max(.1,1-(x/.43)**2-(y/.54)**2))+.016;
    const eye=new THREE.Group();eye.position.set(x,y,z);eye.rotation.z=(i%3-1)*.14;sculpture.add(eye);
    mesh(eye,new THREE.SphereGeometry(1,10,6),white,[0,0,0],[.106,.058,.015]);
    mesh(eye,new THREE.SphereGeometry(.022,7,5),recess,[(i%3-1)*.027,i%2?-.008:.008,.018],[1,1,.4]);
    stroke(eye,[[-.104,0,.007],[-.052,.05,.012],[0,.058,.014],[.052,.05,.012],[.104,0,.007]],recess,.0055);
    for(const lashX of [-.075,-.025,.025,.075]){
     const lashY=.058*Math.sqrt(1-(lashX/.106)**2);
     stroke(eye,[[lashX,lashY,.012],[lashX*1.15,lashY+.027,.016],[lashX*1.27,lashY+.061,.012]],recess,.0045);
    }
    for(const side of [-1,1])stroke(eye,[[side*.065,-.043,.01],[side*.076,-.063,.014],[side*.083,-.082,.01]],recess,.0035);
   });
  }else{
   const ribbon=material(0xb4a785,false);highlight.push(ribbon);
   const path=[[-.27,-.43,.025],[-.40,-.08,.065],[-.28,.38,.035],[.12,.53,.055],[.36,.28,.14],[.18,.015,.19],[-.08,.10,.14],[-.18,-.16,.16],[.10,-.35,.06],[.29,-.13,.035]];
   const vertices=[],indices=[];
   path.forEach((p,i)=>{const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy),w=.075;for(const side of [-1,1])vertices.push(p[0]-side*dy/n*w,p[1]+side*dx/n*w,p[2]+side*(i%2?.018:-.018));if(i<path.length-1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}});
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);const folded=geo.toNonIndexed();folded.computeVertexNormals();ribbon.flatShading=true;mesh(sculpture,folded,ribbon);
   stroke(sculpture,[[.15,.20,.15],[.055,-.01,.205],[.145,-.085,.15]],metal,.013);
   mesh(sculpture,new THREE.CylinderGeometry(.008,.008,.16,5),metal,[-.075,.10,.19],[1,1,1]).rotation.x=Math.PI/2;
   mesh(sculpture,new THREE.SphereGeometry(.034,7,5),metal,[-.075,.10,.28]);
  }
  mount.updateMatrixWorld(true);
  masks.push({id:item.id,name:item.name,position:mount.localToWorld(new THREE.Vector3(0,0,.16)),normal:{x:Math.sin(item.yaw),z:Math.cos(item.yaw)},highlight});
 }
 return masks;
}
