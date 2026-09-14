// Both drag input and keyboard gaze use the same independently inverted axes.
export function applyLook(yaw,pitch,horizontal,vertical,invertX=false,invertY=false){
 return {yaw:yaw-horizontal*(invertX?-1:1),pitch:Math.max(-1.4,Math.min(1.4,pitch+vertical*(invertY?-1:1)))};
}
