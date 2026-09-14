import * as THREE from './three.module.js';

// A closed volume lies on a low stone ledge, hidden behind the back-left cube.
export function createMoonBook(scene,cubes){
 const stone=new THREE.MeshStandardMaterial({color:0x353648,roughness:1});
 const cover=new THREE.MeshStandardMaterial({color:0x292b36,roughness:1,emissive:0x000000});
 const paper=new THREE.MeshStandardMaterial({color:0xa5a292,roughness:1});
 const wornEdge=new THREE.MeshStandardMaterial({color:0x737078,roughness:1});
 function part(parent,w,h,d,x,y,z,material){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 const ledge=part(scene,1.5,.11,.66,5.8,.62,42.55,stone);
 ledge.userData.collisionHalfX=1.02;ledge.userData.collisionHalfZ=.60;cubes.push(ledge);
 for(const x of [5.3,6.3])part(scene,.13,.22,.35,x,.465,42.69,stone);
 const volume=new THREE.Group();volume.position.set(5.8,.675,42.45);volume.rotation.y=-.13;scene.add(volume);
 for(const y of [.009,.081])part(volume,.48,.018,.56,0,y,0,cover);
 part(volume,.44,.054,.51,.006,.045,0,paper);
 part(volume,.025,.09,.56,-.229,.045,0,cover);
 for(const z of [-.19,.19])part(volume,.03,.005,.019,-.224,.093,z,wornEdge);
 // Fine, irregular page edges and a worn cover corner catch the ceiling light.
 for(const y of [.03,.047,.061])part(volume,.004,.002,.49,.228,y,0,wornEdge);
 part(volume,.065,.003,.013,.18,.092,.25,wornEdge);
 volume.updateMatrixWorld(true);
 return {id:'moon-book',title:'A small book',room:'The Moon Room',literalLayout:true,
  position:volume.localToWorld(new THREE.Vector3(0,.097,0)),normal:{x:0,y:1,z:0},cover,pages:null};
}
