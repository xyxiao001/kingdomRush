import type {Point} from '@kingdom-rush/game-types';

/** Fusion game_gui:find_flag_position, in the HUD's 768-unit coordinate space. */
export function waveFlagPosition(point:Point,rotation:number,width:number,height:number,length?:number):Point {
  const dx=Math.cos(rotation),dy=-Math.sin(rotation);
  const intersections:{distance:number;offset:number;horizontal:boolean}[]=[];
  if(Math.abs(dy)>=1e-5)for(const y of [height-15,15]){
    const offset=(y-point.y)/dy;
    intersections.push({distance:Math.abs(offset),offset,horizontal:true});
  }
  if(Math.abs(dx)>=1e-5)for(const x of [width,0]){
    const offset=(x-point.x)/dx;
    intersections.push({distance:Math.abs(offset),offset,horizontal:false});
  }
  intersections.sort((a,b)=>a.distance-b.distance);
  const nearest=intersections[0];
  // Ship ramps and other entrances near the top/bottom stay at their source position.
  if(nearest.horizontal)return point;
  const offset=length!==undefined&&length<nearest.distance?length:nearest.offset-50;
  return {x:point.x+offset*dx,y:point.y+offset*dy};
}
