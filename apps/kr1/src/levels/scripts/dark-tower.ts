import type {EnemyKind,Point} from '../../content/types';
import type {CombatCue} from '../../audio/combat-cues';
import type {TowerSeal} from '../../content/abilities';
import type {Battle,Enemy} from '../../simulation/battle';
interface Spell {windup:number;duration:number;sound:CombatCue;waves:Record<string,Record<string,any>>}
export interface DarkTowerConfig {
 type:'dark-tower';boss:EnemyKind;demon:EnemyKind;position:Point;prefix:string;anchor:Point;descendDelay:number;walkAwayDuration:number;
 block:Spell;summon:Spell&{battle:{pa_cooldown:number;pa_max_count:number}};seal:TowerSeal;
 portals:{id:number;position:Point;route:number;node:number;groups:{chance:number;spawns:{min:number;max:number;kind:EnemyKind}[]}[]}[];
 startDuration:number;endDuration:number;spawnInterval:number;taunts:string[];tauntPosition:Point;
}
// The castle speech, descent and ending belong to this source level script.
// Targeting, damage, transformation and tower seals use the shared Battle abilities.
export class DarkTower {
 phase:'welcome'|'castle'|'descend'|'battle'|'death'|'done'='welcome';
 phaseAt=0;animation='idleDown';animationAt=0;
 taunt:{text:string;at:number}|null=null;
 portals:{config:DarkTowerConfig['portals'][number];phase:'idle'|'start'|'active'|'end';at:number;next:number;queue:EnemyKind[]}[];
 private wave=0;private blockAt=0;private portalAt=0;private portalCount=0;
 private cast:{kind:'block'|'summon';at:number;hit:boolean;targets:string[]}|null=null;
 private boss:Enemy|null=null;private welcomeIndex=0;private tauntAt=3;
 private souls:{x:number;y:number;angle:number;variation:number;inc:number;speed:number;born:number}[]=[];private soulNext=0;private soulCount=0;private soulClock=0;
 constructor(readonly config:DarkTowerConfig){this.portals=config.portals.map(config=>({config,phase:'idle',at:0,next:0,queue:[]}));}
 get pending(){return this.phase!=='done';}
 get blocksTowers(){return this.phase==='death';}
 get hidesHud(){return this.phase==='death'||this.phase==='done';}
 endingSprites(time:number){
  const sprites=this.souls.filter(s=>time-s.born<8).map((s,i)=>({key:'soul-'+i,animation:'decal_veznan_soul',x:s.x,y:s.y,age:time-s.born,loop:true,scale:1,rotation:-s.angle-s.variation,z:4450}));
  if(this.phase==='death'){
   const age=time-this.phaseAt-151/30-3;
   if(age>=0)sprites.push({key:'white-circle',animation:'decal_veznan_white_circle',x:this.boss!.x+6,y:this.boss!.y+12,age,loop:false,scale:age<65/30?1:1+19*Math.min(1,(age-65/30)/.5),rotation:0,z:5000});
  }
  return sprites;
 }
 private updateSouls(time:number){
  if(time-this.phaseAt>=110/30&&time>=this.soulNext&&this.soulCount<60){
   this.souls.push({x:this.boss!.x,y:this.boss!.y+14,angle:Math.PI/6+Math.random()*Math.PI*100/180,variation:0,inc:(Math.random()<.5?-1:1)*Math.PI/36,speed:180+Math.floor(Math.random()*271),born:time});
   this.soulCount++;this.soulNext=time+Math.max(1,10-this.soulCount)/30;
  }
  const dt=time-this.soulClock;this.soulClock=time;
  for(const s of this.souls){if(time-s.born>=8)continue;const angle=s.angle+s.variation;s.x+=Math.cos(angle)*s.speed*dt;s.y+=Math.sin(angle)*s.speed*dt;s.variation+=s.inc;if(s.variation>=70*Math.PI/180)s.inc=-Math.abs(s.inc);else if(s.variation<=-70*Math.PI/180)s.inc=Math.abs(s.inc);}
 }

 private say(index:number,time:number){this.taunt={text:this.config.taunts[index-1],at:time};}
 update(b:Battle){
  const c=this.config,time=b.time;
  if(this.taunt&&time-this.taunt.at>=4)this.taunt=null;
  for(const p of this.portals){
   if(p.phase==='start'&&time-p.at>=c.startDuration){p.phase='active';p.at=time;p.next=time;}
   if(p.phase==='active'&&time>=p.next){if(p.queue.length){const kind=p.queue.shift()!,lane=b.content.routes[p.config.route][Math.floor(b.random()*3)];b.spawnAt(kind,lane,p.config.node,p.config.position);b.events.push({type:'sound',cue:'VeznanPortalIn'});p.next=time+c.spawnInterval;}else{p.phase='end';p.at=time;}}
   if(p.phase==='end'&&time-p.at>=c.endDuration){p.phase='idle';p.at=time;}
  }
  if(this.phase==='welcome'){
   if(b.wave){this.say(5,time);this.phase='castle';this.tauntAt=time+4;}
   else if(time>=this.tauntAt&&this.welcomeIndex<4){this.say(++this.welcomeIndex,time);this.tauntAt=time+[2,140/30,15,250/30][this.welcomeIndex-1];}
  }
  if(this.phase==='castle'&&b.wave===b.level.waves.length&&b.waveCombatCleared){this.phase='descend';this.phaseAt=time;this.cast=null;this.say(30,time+24/30);b.events.push({type:'bossIntro'});}
  if(this.phase==='descend'){
   if(time-this.phaseAt>=c.descendDelay){this.animation='walkAway';this.animationAt=this.phaseAt+c.descendDelay;}
   if(time-this.phaseAt>=c.descendDelay+c.walkAwayDuration){this.phase='battle';this.boss=b.spawnAt(c.boss,b.content.routes[0][0],0,undefined,false);this.portalAt=time+c.summon.battle.pa_cooldown;this.portalCount=0;this.blockAt=time+Number(c.block.waves[b.wave]['1']);}
   return;
  }
  if(this.phase==='battle'&&this.boss?.deadAt!==null&&this.boss?.kind===c.demon){this.phase='death';this.phaseAt=time;this.soulClock=time;this.cast=null;for(const p of this.portals){p.queue=[];p.phase='idle';}}
  if(this.phase==='death'){
   this.updateSouls(time);
   const age=time-this.phaseAt,death=151/30,loop=3;
   this.boss!.scriptAnimation=age<death?{name:'death',at:this.phaseAt,duration:death}:age<death+loop?{name:'deathLoop',at:this.phaseAt+death,duration:loop,loop:true}:{name:'deathEnd',at:this.phaseAt+death+loop,duration:65/30+2,loop:true};
   if(age>=b.enemyStats[c.demon].boss!.winDelay)this.phase='done';return;
  }
  if(this.phase!=='castle'&&this.phase!=='battle')return;
  if(this.boss?.transformAt!==undefined||this.boss?.kind===c.demon)return;
  if(this.wave!==b.wave){this.wave=b.wave;if(c.block.waves[this.wave])this.blockAt=time+Number(c.block.waves[this.wave]['1']);if(c.summon.waves[this.wave])this.portalAt=time+Number(c.summon.waves[this.wave]['1']);this.portalCount=0;}
  if(this.cast){const spell=c[this.cast.kind],age=time-this.cast.at;
   if(!this.cast.hit&&age>=spell.windup){this.cast.hit=true;b.events.push({type:'sound',cue:spell.sound});
    if(this.cast.kind==='block')for(const id of this.cast.targets){const tower=b.towers.find(t=>t.pad.id===id);if(tower&&!b.isTowerBlocked(tower))tower.seal={config:c.seal,born:time,clicks:0,endAt:null,trapped:false};}
    else{this.portalCount++;const flags=c.summon.waves[this.wave]['3'];for(const p of this.portals)if(flags[p.config.id]===1){const roll=b.random(),group=p.config.groups.find(g=>roll<=g.chance)!;p.queue=group.spawns.flatMap(s=>Array.from({length:s.min+Math.floor(b.random()*(s.max-s.min+1))},()=>s.kind));p.phase='start';p.at=time;}}
   }
   if(age<spell.duration)return;this.cast=null;this.animation='idleDown';
  }
  const block=c.block.waves[this.wave],summon=c.summon.waves[this.wave];
  if(block&&time>=this.blockAt){const towers=b.towers.filter(t=>time>=t.builtAt&&!b.isTowerBlocked(t)&&!t.seal&&!t.manual&&!t.camp);for(let i=towers.length-1;i>0;i--){const j=Math.floor(b.random()*(i+1));[towers[i],towers[j]]=[towers[j],towers[i]];}if(towers.length){this.cast={kind:'block',at:time,hit:false,targets:towers.slice(0,Number(block['2'])).map(t=>t.pad.id)};this.blockAt=time+c.block.duration+Number(block['1']);}}
  if(!this.cast&&summon&&time>=this.portalAt&&this.portalCount<(this.phase==='battle'?c.summon.battle.pa_max_count:Number(summon['2']))){this.cast={kind:'summon',at:time,hit:false,targets:[]};this.portalAt=time+c.summon.duration+(this.phase==='battle'?c.summon.battle.pa_cooldown:Number(summon['1']));}
  if(this.cast){this.animation=this.phase==='battle'?'spell':'spellDown';this.animationAt=time;if(this.boss)this.boss.scriptAnimation={name:'spell',at:time,duration:c[this.cast.kind].duration};}
  else if(time>=this.tauntAt){this.say(6+Math.floor(Math.random()*20),time);this.tauntAt=time+400/30+Math.random()*10;}
 }
}
