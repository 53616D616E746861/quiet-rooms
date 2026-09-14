// Select a nearby volume by gaze, from the front of its shelf.
export function focusedBook(position,direction,books){
 let selected=null,best=Math.cos(Math.PI/15);
 for(const book of books){
  const dx=book.position.x-position.x,dy=book.position.y-position.y,dz=book.position.z-position.z;
  const distance=Math.hypot(dx,dy,dz);
  if(distance<.01||distance>2.5||(-dx*book.normal.x-dy*(book.normal.y||0)-dz*book.normal.z)<.1)continue;
  const alignment=(dx*direction.x+dy*direction.y+dz*direction.z)/distance;
  if(alignment>best){best=alignment;selected=book;}
 }
 return selected;
}
