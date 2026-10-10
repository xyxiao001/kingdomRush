import type {Point} from '@kingdom-rush/game-types';
export interface GridNavigation {grid:number[][];ox:number;oy:number;terrain:number}
// Same eight-neighbor A* costs and neighbor order as all/grid_a_star.lua.
export function gridWaypoints(data:GridNavigation,from:Point,to:Point,home?:Point):Point[]|null {
  const {grid,ox,oy,terrain}=data,cellSize=16;
  const coords=(p:Point)=>({x:Math.ceil((p.x-ox)/cellSize)-1,y:Math.ceil((p.y-oy)/cellSize)-1});
  const valid=(p:Point)=>p.x>=0&&p.x<grid.length&&p.y>=0&&p.y<grid[p.x].length&&(grid[p.x][p.y]&~terrain)===0;
  const key=(p:Point)=>p.x*grid[0].length+p.y;
  const clampCell=(p:Point)=>({x:Math.max(0,Math.min(grid.length-1,p.x)),y:Math.max(0,Math.min(grid[0].length-1,p.y))});
  let start=clampCell(coords(from));const goal=coords(to);
  // ORIGINAL grid_db:find_waypoints starts from the rally cell when combat
  // carries a hero off walkable terrain; it then searches at most five cells.
  if(!valid(start)&&home)start=clampCell(coords(home));
  if(!valid(start)){
    let entry:Point|null=null;
    for(let radius=0;radius<=5&&!entry;radius++)for(let dx=-radius;dx<=radius&&!entry;dx++)for(let dy=-radius;dy<=radius;dy++){
      const p={x:start.x+dx,y:start.y+dy};
      if(p.x>0&&p.x<grid.length-1&&p.y>0&&p.y<grid[0].length-1&&valid(p)){entry=p;break;}
    }
    if(!entry)return null;
    start=entry;
  }
  if(!valid(goal))return null;
  const open=[start],previous=new Map<number,Point>();
  const costs=new Map([[key(start),0]]),scores=new Map([[key(start),Math.hypot(goal.x-start.x,goal.y-start.y)]]);
  while(open.length) {
    let index=0;for(let i=1;i<open.length;i++)if(scores.get(key(open[i]))!<scores.get(key(open[index]))!)index=i;
    const current=open.splice(index,1)[0];
    if(key(current)===key(goal)) {
      const path:Point[]=[];let node=current;
      while(key(node)!==key(start)){path.unshift(node);node=previous.get(key(node))!;}
      // grid_db drops the first cell returned by A* and uses the exact final click.
      return path.slice(1).map((p,i,a)=>i===a.length-1?{...to}:{x:(p.x+.5)*cellSize+ox,y:(p.y+.5)*cellSize+oy});
    }
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++) {
      if(dx===0&&dy===0)continue;
      const next={x:current.x+dx,y:current.y+dy},n=key(next);
      if(next.x<=0||next.x>=grid.length-1||next.y<=0||next.y>=grid[next.x].length-1||!valid(next))continue;
      const cost=costs.get(key(current))!+(dx===0||dy===0?1:1.4142);
      if(costs.has(n)&&cost>=costs.get(n)!)continue;
      previous.set(n,current);costs.set(n,cost);scores.set(n,cost+Math.hypot(goal.x-next.x,goal.y-next.y));
      if(!open.some(p=>key(p)===n))open.push(next);
    }
  }
  return null;
}
