import {canBuyHeroSkill,remainingHeroPoints,type SkillCost} from './hero-progression';

export interface HeroProgress {xp:number;skills:Record<string,number>}
export interface AchievementProgress {earned:string[];counters:Record<string,number>}
export type AchievementEvent='increment'|'maximum'|'award'|'flags';

/** Shared hero-room actions. Games own definitions, initial profiles and slot storage. */
export class HeroProgression {
 constructor(private data:{
  skills:(id:string)=>readonly SkillCost[];
  points:readonly number[];
  level:(id:string,xp:number)=>number;
  read:(id:string)=>HeroProgress;
  write:(id:string,progress:HeroProgress)=>void;
 }){}
 level(id:string){return this.data.level(id,this.data.read(id).xp);}
 points(id:string){return remainingHeroPoints(this.level(id),this.data.points,this.data.skills(id),this.data.read(id).skills);}
 buy(id:string,skill:string){
  const p=this.data.read(id),s=this.data.skills(id).find(s=>s.id===skill)!;
  if(!canBuyHeroSkill(p.skills[skill],s.hr_cost,this.points(id)))return false;
  p.skills[skill]++;this.data.write(id,p);return true;
 }
 reset(id:string){const p=this.data.read(id);for(const key in p.skills)p.skills[key]=0;this.data.write(id,p);}
}

/** One event-to-progress path; games retain event mapping and completion rules. */
export class AchievementProgression {
 constructor(private data:{
  read:()=>AchievementProgress;
  write:(progress:AchievementProgress)=>void;
  reached:(id:string,count:number)=>boolean;
 }){}
 record(id:string,value:number,kind:AchievementEvent){
  const p=this.data.read();if(p.earned.includes(id))return false;
  const previous=p.counters[id]??0;
  p.counters[id]=kind==='flags'?previous|value:kind==='increment'?previous+value:kind==='maximum'?Math.max(previous,value):1;
  const earned=kind==='award'||this.data.reached(id,p.counters[id]);
  if(earned)p.earned.push(id);this.data.write(p);return earned;
 }
 reset(ids:readonly string[]){const p=this.data.read();for(const id of ids)delete p.counters[id];this.data.write(p);}
}
