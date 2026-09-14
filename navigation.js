// Room interiors plus overlapping thresholds form one continuous walkable floor.
const zones=[[-9.8,9.8,-9.8,9.8],[-1.4,1.4,9.6,10.3],[-1.5,1.5,10,17],[-1.5,15.3,14,17],[15.2,30.8,9.2,22.8]];
const moonZones=[[8,11,16.8,25.5],[3.7,15.3,25.2,42.8],[-3.3,3.8,32.5,35.5],[-16.8,-3.2,27.2,40.8]];
const walkZones=[...zones,...moonZones];
export function roomAt(x,z){if(x>=-17&&x<=-3&&z>=27&&z<=41)return 'The Evening Room';if(x>=3.5&&x<=15.5&&z>=25)return 'The Moon Room';if(x>=15&&z>=9&&z<=23)return 'The Sunflower Room';return z>10?'The Passage':'The Sky Room';}
function onFloor(x,z){return walkZones.some(([l,r,t,b])=>x>=l&&x<=r&&z>=t&&z<=b);}
export function isWalkable(x,z,cubes=[]){
 const r=.27;
 for(const [dx,dz]of [[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.707,r*.707],[-r*.707,r*.707],[r*.707,-r*.707],[-r*.707,-r*.707]])if(!onFloor(x+dx,z+dz))return false;
 for(const c of cubes)if(Math.abs(x-c.position.x)<(c.userData?.collisionHalfX??1.12)&&Math.abs(z-c.position.z)<(c.userData?.collisionHalfZ??1.12))return false;
 return Math.hypot(x,z+3)>.7&&Math.hypot(x-26,z-16)>.7&&Math.hypot(x-9.5,z-38)>.7&&Math.hypot(x+12,z-34)>.75;
}

const entrances={
 'The Sky Room':{x:0,z:7.7,yaw:0,pitch:.03},
 'The Sunflower Room':{x:16.6,z:15.5,yaw:-Math.PI/2,pitch:.03},
 'The Moon Room':{x:9.5,z:26.6,yaw:Math.PI,pitch:.03},
 'The Evening Room':{x:-4.5,z:34,yaw:Math.PI/2,pitch:.03}
};
// In a connecting hall, return to the last room visited, preserving dialogue progress.
export function entranceFor(x,z,lastRoom='The Sky Room'){
 const current=roomAt(x,z),room=current==='The Passage'?lastRoom:current;
 return {room,...entrances[room]};
}
