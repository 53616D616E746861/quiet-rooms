export const WALL_MASK_LAYOUT=[
 {id:'forgotten',name:'The faded mask',x:20.35,y:2.36,z:9.38,yaw:0},
 {id:'layers',name:'The layered mask',x:25.05,y:2.58,z:9.38,yaw:0},
 {id:'closed',name:'The bronze mask',x:30.62,y:2.5,z:11.7,yaw:-Math.PI/2},
 {id:'profiles',name:'The joined profiles',x:30.62,y:2.30,z:16,yaw:-Math.PI/2},
 {id:'repaired',name:'The repaired mask',x:30.62,y:2.56,z:20.5,yaw:-Math.PI/2},
 {id:'watching',name:'The many-eyed mask',x:24.4,y:2.43,z:22.62,yaw:Math.PI},
 {id:'fold',name:'The folded mask',x:21.5,y:2.62,z:22.62,yaw:Math.PI}
];
// Only a mask in front of the player, seen from its room side, can be heard.
export function focusedWallMask(position,direction,masks){
 let chosen=null,best=Math.cos(Math.PI/8);
 for(const mask of masks){
  const dx=mask.position.x-position.x,dy=mask.position.y-position.y,dz=mask.position.z-position.z,distance=Math.hypot(dx,dy,dz);
  if(distance<.01||distance>2.9||-dx*mask.normal.x-dz*mask.normal.z<.15)continue;
  const alignment=(dx*direction.x+dy*direction.y+dz*direction.z)/distance;
  if(alignment>best){best=alignment;chosen=mask;}
 }
 return chosen;
}
