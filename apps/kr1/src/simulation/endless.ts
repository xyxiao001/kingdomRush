import type {EndlessConfig,TotemKind} from '../content/endless';
import type {Point} from '../content/types';
import {EndlessWaves} from './endless-waves';
import {inRange,type Battle,type Enemy} from './battle';
export interface Totem extends Point {id:number;kind:TotemKind;born:number;activeAt:number;until:number;next:number;amount:number;radius:number}
// ORIGINAL: elder shaman is a level actor, never a killable victory Boss.
export class Endless {
 readonly waves:EndlessWaves;score=0;totems:Totem[]=[];castAt=-100;drumAt=-100;drumUntil=0;
 coins:{id:number;born:number;position:Point;dx:number;travel:number;flip:boolean;config:NonNullable<EndlessConfig['deathShowers'][Enemy['kind']]>;sound:boolean}[]=[];
 taunt:{text:string;until:number}|null=null;
 private welcome=0;private tauntNext=1.5;private cosmetic=0x8175;private lastWave=0;private nextCast=Infinity;private cooldown=0;private chainAt=Infinity;private id=0;
 private pending:{kind:TotemKind;position:Point;at:number;chain:boolean}|null=null;
 constructor(private b:Battle,readonly config:EndlessConfig){this.waves=new EndlessWaves(config,()=>b.random());}
 private visualRandom(){this.cosmetic=(Math.imul(this.cosmetic,1664525)+1013904223)>>>0;return this.cosmetic/4294967296;}
 onWave(early:boolean,remaining:number){
  const b=this.b,c=this.config.score;if(!b.wave)return;
  this.score+=b.wave*c.scorePerWave;
  if(early){const w=b.level.waves[b.wave],flags=w.entrances!;this.score+=Math.round(b.wave*c.scorePerWave*c.scoreNextWaveMultiplier*Math.max(0,Math.min(1,Math.round(remaining)/w.delay))*flags);}
 }
 onKill(enemy:Enemy){const s=this.b.effectiveEnemyStats(enemy);this.score+=Math.round((1+Math.max(s.armor,s.magicArmor))*s.health*this.config.score.scoreEnemyMultiplier*s.speed/30);const c=this.config.deathShowers[enemy.kind];if(c)for(let i=0;i<c.count;i++)this.coins.push({id:++this.id,born:this.b.time+i*c.delay,position:{x:enemy.x+c.offset.x,y:enemy.y+c.offset.y},dx:(c.spread[0]+this.visualRandom()*(c.spread[1]-c.spread[0]))*(this.visualRandom()<.5?-1:1),travel:c.travel[0]+this.visualRandom()*(c.travel[1]-c.travel[0]),flip:this.visualRandom()<.5,config:c,sound:false});}
 private difficulty(){return this.config.difficulties[Math.min(this.config.difficulties.length-1,Math.max(0,Math.ceil(this.b.wave/10)-1))].bossConfig;}
 private visibleEnemy(e:Enemy){return e.hp>0&&!e.escaped&&!this.b.controlImmune(e)&&this.b.validTargetNode(e);}
 private node(e:Enemy){return this.b.tracks[e.lane].cumulative.findIndex(n=>n>=e.distance);}
 private bounds(lane:number){return this.config.pathBounds[this.b.content.routes.findIndex(r=>r.includes(lane))];}
 private attempt(){
  const b=this.b,d=this.difficulty(),chance=d.powerChance+d.powerChanceIncrement*Math.ceil(b.wave/10);
  if(b.random()>=chance)return;
  let roll=b.random(),index=0;for(;index<d.powerDistribution.length-1;index++){roll-=d.powerDistribution[index];if(roll<0)break;}
  const a=this.config.shaman.attacks[index],enemies=b.enemies.filter(e=>this.visibleEnemy(e)&&!b.enemyFlying(e));let position:Point|undefined;
  if(a.kind==='damage'){
   if(enemies.length){const allies=[b.hero,...b.soldiers].filter(u=>u.hp>0&&u.deadAt===null);if(allies.length){const u=allies[Math.floor(b.random()*allies.length)];let best=Infinity;for(const route of b.content.routes)for(const p of b.tracks[route[0]].points){const d=(p.x-u.x)**2+(p.y-u.y)**2;if(d<best){best=d;position=p;}}}}
  }else{
   const targets=enemies.filter(e=>{const n=this.node(e),p=this.bounds(e.lane);return n>p.start+a.margins![0]&&n<p.finish-a.margins![1];});
   if(targets.length){const e=targets[Math.floor(b.random()*targets.length)],range=this.bounds(e.lane),node=Math.max(range.start+a.margins![0],Math.min(range.finish-a.margins![1],this.node(e)+b.roll(a.nodeOffset!))),route=b.content.routes.find(r=>r.includes(e.lane))!;position=b.tracks[route[0]].points[node];}
  }
  const chain=b.random()<d.powerMultiChance;
  if(position){this.castAt=b.time;this.drumAt=b.time;this.drumUntil=b.time+9*this.config.shaman.drummer.duration;this.pending={kind:a.kind,position,at:b.time+this.config.shaman.delay[0]+b.random()*(this.config.shaman.delay[1]-this.config.shaman.delay[0]),chain};}
  else if(chain)this.chainAt=b.time+1/60;
 }
 addTotem(kind:TotemKind,position:Point){
  const b=this.b,c=this.config.bossConfig.powerConfig,level=Math.max(0,b.wave-c.powerProgressionWaveStart),p=c[kind],art=this.config.shaman.totems[kind],activeAt=b.time+art.start;
  const amount=kind==='healing'?Math.floor(p.healthPerTick!+level*p.healthPerTickIncrement!):kind==='damage'?Math.floor(p.damagePerTick!+level*p.damagePerTickIncrement!):p.speedModifier!+level*p.speedModifierIncrement!;
  this.totems.push({id:++this.id,kind,...position,born:b.time,activeAt,until:activeAt+p.duration+level*p.durationIncrement,next:activeAt,amount,radius:p.range/2});b.events.push({type:'sound',cue:art.sound});
 }
 update(){
  const b=this.b,c=this.config.shaman;
  if(this.taunt&&b.time>=this.taunt.until)this.taunt=null;
  if(b.time>=this.tauntNext&&!this.pending&&b.time-this.castAt>=c.castDuration){const list=this.welcome<2?c.taunts.welcome:b.wave>0?c.taunts.battle:c.taunts.prebattle,text=list[this.welcome<2?this.welcome++:Math.floor(this.visualRandom()*list.length)];this.taunt={text,until:b.time+4};this.tauntNext=this.welcome===1?b.time+4:b.time+15+Math.floor(this.visualRandom()*6);}
  if(b.wave>0&&b.wave!==this.lastWave&&!this.taunt){const d=this.difficulty();this.lastWave=b.wave;this.cooldown=b.roll([d.powerCooldownMin,d.powerCooldownMax]);this.nextCast=b.time+this.cooldown;}
  if(this.pending&&b.time>=this.pending.at){const p=this.pending;this.pending=null;this.addTotem(p.kind,p.position);if(p.chain)this.chainAt=this.castAt+c.castDuration;}
  if(b.wave>0&&!this.pending&&!this.taunt&&b.time>=this.nextCast&&b.time-this.castAt>=c.castDuration){this.nextCast=b.time+this.cooldown;this.drumAt=b.time;this.drumUntil=b.time+3*c.drummer.duration;this.attempt();}
  if(!this.pending&&b.time>=this.chainAt){this.chainAt=Infinity;this.attempt();}
  for(const coin of this.coins)if(!coin.sound&&b.time>=coin.born){coin.sound=true;b.events.push({type:'sound',cue:coin.config.sound});}this.coins=this.coins.filter(coin=>b.time<coin.born+coin.config.duration);
  for(const t of this.totems){
   if(b.time<t.activeAt||b.time>=t.until||b.time<t.next)continue;t.next+=c.totems[t.kind].cycle;
   if(t.kind==='damage'){
    for(const u of [b.hero,...b.soldiers].filter(u=>u.hp>0&&u.deadAt===null&&inRange(t,u,t.radius)))b.abilities.applyDot(u,{id:'mod_elder_shaman_damage',duration:1,interval:.5,damage:[t.amount,t.amount],lethal:true,animation:'fire_small'});
   }else for(const e of b.enemies.filter(e=>this.visibleEnemy(e)&&inRange(t,e,t.radius))){
    if(t.kind==='healing'){e.hp=Math.min(b.effectiveEnemyStats(e).health,e.hp+t.amount);b.effect(e,'heal',.8);}
    else e.totemSpeed={factor:t.amount,until:b.time+3,born:b.time};
   }
  }
  this.totems=this.totems.filter(t=>b.time<t.until+c.totems[t.kind].end);
 }
}
