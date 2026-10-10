import {progressionValue} from '@kingdom-rush/engine/progression';
import type {EndlessConfig,EndlessWave,ProgressionRule} from '../content/endless';
import type {EnemyKind,Wave} from '../content/types';
import type {EnemyStats} from '../content/balance';

// ORIGINAL: all/wave_db.lua get_endless_group / set_entity_progression.
export class EndlessWaves {
 private tier=0;private nextUses=0;private used=new Set<EndlessWave>();private first=new Map<EnemyKind,number>();
 constructor(readonly config:EndlessConfig,private random:()=>number){}
 private pick<T>(items:T[]){return items[Math.floor(this.random()*items.length)];}
 next(index:number):Wave {
  const c=this.config,paths=[...c.pathConfig];
  for(let i=paths.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[paths[i],paths[j]]=[paths[j],paths[i]];}
  const order=paths.map(p=>this.pick(p)),d=c.difficulties[this.tier],next=c.difficulties[Math.min(c.difficulties.length-1,this.tier+1)];
  let bosses=index%10===0?d.bossWaves.length:0,interval=0,duration=0,entrances=0;const spawns:Wave['spawns']=[];
  const multiple=index===1?0:(d.multiple_paths_chance+d.multiple_paths_chance_increment*index)/100;
  for(let path=0;path<d.max_paths;path++){
   if(path>0&&bosses===0&&multiple<this.random())continue;
   entrances++;let cycle=(index-1)%10+1,list:EndlessWave[];
   if(bosses>0){list=d.bossWaves;bosses--;}else{
    const chance=(c.chancesToUseNextDifficulty[cycle-10+c.chancesToUseNextDifficulty.length-1]??0)*.5**this.nextUses;
    if(chance>this.random()){this.nextUses++;list=next.waves;cycle=1;}else list=d.waves;
   }
   let candidates=list.filter(w=>!this.used.has(w));if(!candidates.length){candidates=list;this.used.clear();}
   const wave=this.pick(candidates);this.used.add(wave);interval=Math.max(interval,wave.next_wave_interval);let time=0;
   wave.spawns.forEach((s,j)=>{
    const count=Number(s.cant)+(s.cant_cicle===0?0:s.cant_increment*Math.floor(cycle/s.cant_cicle));
    for(let i=0;i<count;i++){time+=s.interval/30;spawns.push({time,kind:s.creep_aux&&s.max_same>0&&Math.floor(i/s.max_same)%2===1?s.creep_aux:s.creep,path:order[path%order.length],lane:s.use_fixed_path===1?s.path:null});}
    if(count===0)time+=s.interval/30;if(j<wave.spawns.length-1)time+=s.interval_next/30;
   });duration=Math.max(duration,time);
  }
  if(index%10===0){this.tier=Math.min(c.difficulties.length-1,this.tier+1);this.nextUses=0;this.used.clear();}
  return {entrances,delay:(interval===0?100:interval)/30,duration,spawns:spawns.sort((a,b)=>a.time-b.time)};
 }
 value(kind:EnemyKind,key:string,raw:number,wave:number){
  if(!this.first.has(kind))this.first.set(kind,wave);
  const rule:ProgressionRule={...this.config.enemyProgression.DEFAULT[key],...this.config.enemyProgression[kind]?.[key]};
  return progressionValue(rule,raw,wave,this.first.get(kind)!);
 }
 stats(kind:EnemyKind,base:EnemyStats,wave:number):EnemyStats {
  const v=(key:string,raw:number)=>this.value(kind,key,raw,wave),s={...base};
  s.health=Math.round(v('megaHealth',Math.round(v('health',base.health))));s.bounty=Math.max(0,Math.min(base.bounty,Math.round(v('gold',base.bounty))));
  s.armor=v('armor',base.armor);s.magicArmor=v('magicArmor',base.magicArmor);s.damage=base.damage.map(n=>Math.round(v('damage',n))) as [number,number];
  if(s.area)s.area={...s.area,damage:s.damage};
  const extra=this.config.factorMap[kind];
  if(extra?.includes('healPoints')&&s.heal)s.heal={...s.heal,amount:Math.round(v('healPoints',s.heal.amount))};
  if(extra?.includes('rangedDamage')&&s.ranged)s.ranged={...s.ranged,damage:s.ranged.damage.map(n=>Math.round(v('rangedDamage',n))) as [number,number]};
  return s;
 }
}
