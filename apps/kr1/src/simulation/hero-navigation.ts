import {gridWaypoints} from '@kingdom-rush/engine/pathfinding';
import type {Point} from '../content/types';
import type {NavigationData} from '../levels/index';
export function navigation(data:NavigationData) {
const {grid,ox,oy}=data, cellSize=16, terrain=2049;
const coords=(p:Point)=>({x:Math.ceil((p.x-ox)/cellSize)-1,y:Math.ceil((p.y-oy)/cellSize)-1});
const valid=(p:Point)=>p.x>=0&&p.x<grid.length&&p.y>=0&&p.y<grid[p.x].length&&(grid[p.x][p.y]&~terrain)===0;
const rallyTarget = (p:Point) => valid(coords(p)) && data.nodes.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<data.width);
function terrainAt(p:Point){
  // ORIGINAL grid_db:get_coords clamps coordinates to the source grid.
  const c=coords(p),x=Math.max(0,Math.min(grid.length-1,c.x)),y=Math.max(0,Math.min(grid[x].length-1,c.y));
  return grid[x][y];
}
function fireTarget(p:Point) {
  // Source NF_POWER_1/NF_RALLY nodes and terrain masks, supplied by each level.
  const cell=coords(p),x=Math.max(0,Math.min(grid.length-1,cell.x)),y=Math.max(0,Math.min(grid[x].length-1,cell.y));
  const t=grid[x][y];
  return (t&(4|1024))===0 && ((t&2)!==0 || data.nodes.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<data.width*1.4285714285714286));
}
const heroWaypoints=(from:Point,to:Point,home?:Point)=>gridWaypoints({...data,terrain},from,to,home);
function heroRally(from:Point,point:Point,home?:Point):{point:Point;waypoints:Point[]}|null {
  // Source PickView:rally_hero tries the click, then projects back toward the hero.
  for(let i=0;i<200;i++) {
    const p={x:(from.x*i+point.x*(200-i))/200,y:(from.y*i+point.y*(200-i))/200};
    if(!rallyTarget(p))continue;
    const waypoints=heroWaypoints(from,p,home);if(waypoints!==null)return {point:p,waypoints};
  }
  return null;
}

return {terrainAt,rallyTarget,fireTarget,heroWaypoints,heroRally};
}
