// The third right-hand panel is readable only up close, from the room side, while looked at.
export function isPanelFocused(position,direction){
 if(position.x>=15.32||position.z<25)return false;
 const dx=15.32-position.x,dy=2.15-position.y,dz=38.5-position.z,distance=Math.hypot(dx,dy,dz);
 if(distance<.01||distance>2.4)return false;
 return (dx*direction.x+dy*direction.y+dz*direction.z)/distance>=Math.cos(Math.PI/9);
}
