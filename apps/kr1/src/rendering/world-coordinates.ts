import type {Bounds,Point,Animation} from '../content/types';
import type {Projectile} from '../simulation/battle';
// Extracted unchanged from Scene for use by original-content presentation adapters.
export const HEIGHT=768,WIDTH=HEIGHT*16/9,OFFSET=(WIDTH-1024)/2;
export const WORLD_TO_REFERENCE=1080/HEIGHT;
export function displayBounds(b:Bounds):Bounds{return {x:(b.x+OFFSET)*WORLD_TO_REFERENCE,y:(HEIGHT-b.y-b.height)*WORLD_TO_REFERENCE,width:b.width*WORLD_TO_REFERENCE,height:b.height*WORLD_TO_REFERENCE};}
export function referencePoint(p:Point):Point{return {x:(p.x+OFFSET)*WORLD_TO_REFERENCE,y:(HEIGHT-p.y)*WORLD_TO_REFERENCE};}
export function simulationPoint(p:Point):Point{return {x:p.x/WORLD_TO_REFERENCE-OFFSET,y:HEIGHT-p.y/WORLD_TO_REFERENCE};}
export function animationFrame(a:Animation,age:number,loop=true){
 const count=a.sequence?a.sequence.length:a.to-a.from+1,tick=Math.max(0,Math.floor(age*30)),offset=loop?tick%count:Math.min(count-1,tick);
 const index=a.sequence?a.sequence[offset]:a.from+offset;return `${a.prefix}_${String(index).padStart(4,'0')}`;
}
export function projectileDisplay(p:Projectile,time:number){
 const t=Math.min(1,(time-p.born)/(p.due-p.born)),flight=p.due-p.born;
 const x=(p.kind==='bolt'||p.kind==='fire')?p.position!.x:p.start.x+(p.end.x-p.start.x)*t;
 let y=(p.kind==='bolt'||p.kind==='fire')?p.position!.y:p.start.y+(p.end.y-p.start.y)*t;
 if(p.kind==='bomb'||p.kind==='arrow'||p.kind==='enemyArrow'||p.kind==='bossBomb'||p.kind==='shrapnel'||p.kind==='cluster')y+=450*flight*flight*t*(1-t);
 const rotation=p.rotation?(time-p.born)*p.rotation:p.kind==='bomb'||p.kind==='bossBomb'||p.kind==='shrapnel'||p.kind==='cluster'?(time-p.born)*Math.PI*10/3:Math.atan2(-(p.end.y-p.start.y+450*flight*flight*(1-2*t)),p.end.x-p.start.x);
 return {x,y,rotation};
}
