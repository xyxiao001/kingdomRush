import type {Battle} from './battle';
import type {EnemyKind,Point} from '../content/types';
// ORIGINAL mega_spawner: a new wave replaces its unissued queue; raised units
// walk from their source position to the nearest node on the declared route.
export class PointSpawner {
 stop(){this.queue=[];}
 private queue:{at:number;kind:EnemyKind;point:number;lane:number}[]=[];
 get pending(){return this.queue.length>0;}
 constructor(private b:Battle){}
 start(){
  const b=this.b,c=b.content.pointSpawns;this.queue=[];if(!c)return;
  const random=(a:number,z:number)=>a+b.random()*(z-a);
  for(const w of c.waves[b.mode][b.wave]??[]){
   const points=c.groups[w.group];let at=b.time+w.delay;
   const add=(point:number,time:number)=>this.queue.push({at:time,point,kind:w.kind,lane:w.lane??Math.floor(b.random()*3)});
   if(w.sequence&&!w.all){at+=random(0,w.variance);for(let i=0;i<w.count;i++){add(points[Math.floor(b.random()*points.length)],at);at+=random(...w.interval);}}
   else {const counts=new Map<number,number>();if(w.all)for(const p of points)counts.set(p,w.count);else for(let i=0;i<w.count;i++){const p=points[Math.floor(b.random()*points.length)];counts.set(p,(counts.get(p)??0)+1);}for(const point of points){let elapsed=0;for(let i=0;i<(counts.get(point)??0);i++){elapsed+=random(...w.interval);add(point,at+random(0,w.variance)+elapsed);}}}
  }
  this.queue.sort((a,z)=>a.at-z.at);
 }
 update(){const b=this.b,c=b.content.pointSpawns;while(this.queue.length&&this.queue[0].at<=b.time){const s=this.queue.shift()!,p=c!.points[s.point],lane=b.content.routes[p.route][s.lane],track=b.tracks[lane];let node=0,best=Infinity;for(let i=0;i<track.points.length;i++){const q=track.points[i],d=(q.x-p.to.x)**2+(q.y-p.to.y)**2;if(d<best){best=d;node=i;}}const e=b.spawnAt(s.kind,lane,node,p.from);e.spawnWaypoint={...track.points[node]};e.raiseAt=b.time;e.raiseDuration=b.enemyStats[s.kind].raiseDuration;}}
}
