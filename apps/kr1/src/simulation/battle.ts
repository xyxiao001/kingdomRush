import {damageAfterResistance} from '@kingdom-rush/engine/damage';
import {Endless} from './endless';
import {EnemyAbilities} from './enemy-abilities';
import {DarkTower} from '../levels/scripts/dark-tower';
import type {TowerExtension,UnitProfile,MercenaryCamp,ArtilleryAbility,AreaAttack,ManualTower,FreezeAbility,CurseAbility,SpellAbility,ChainAbility,DeathBlast,EggAbility,TowerSeal} from '../content/abilities';
import type { DamageKind, EnemyKind, Level, Pad, Point, Power, TowerKind } from '../content/types';
import { ASPECT, ENEMIES, FIRE, LIGHTNING, REINFORCEMENT, SOLDIER, STEP, TOWERS, ELF, GUARD } from '../content/balance';
import { GERALD } from '../content/gerald';
import type {HeroContent} from '../content/heroes';
import {HeroController,type HeroSummon} from './heroes';
import type {LevelContent} from '../levels/index';
import {navigation} from './hero-navigation';
import {PointSpawner} from './point-spawner';
import { SceneProp } from './props';
import type { Difficulty } from '../storage/difficulty';
import {upgradedStats} from '../content/upgrades';
import {EMPTY_UPGRADES,type UpgradeLevels} from '../storage/upgrades';
import type {GameMode} from '../storage/challenges';
import type { CombatCue } from '../audio/combat-cues';

export type AdvancedPower='disintegrate'|'teleport'|'healing'|'shield'|'holystrike'|'sniper'|'shrapnel';
export type Outcome = 'preparing' | 'playing' | 'victory' | 'defeat';
export interface Enemy extends Point {
 corpseAuraAt?:number;deathCleared?:boolean;
 scaledStats?:{kind:EnemyKind;stats:import("../content/balance").EnemyStats};totemSpeed?:{factor:number;until:number;born:number};
 maxHp?:number;damageBoost?:{until:number;born:number;config:import('../content/abilities').AllyAura};
 portalVisualDone?:boolean;dormant?:boolean;raiseDuration?:number;
 clone?:{generation:number;left:number;next:number;at:number;hit:boolean};flight?:{phase:'ground'|'takeoff'|'flying'|'land';at:number;next:number};
 areaSkill?:{at:number;next:number;hit:boolean};spore?:{at:number;next:number;stage:number;count:number};
 restHeal?:{at:number;next:number;choice:number;hit:boolean};auraAt?:number;
 scriptAnimation?:{name:string;at:number;duration:number;loop?:boolean};transformAt?:number;areaHitIndex?:number;barrage?:{at:number;next:number;hit:boolean;targets:number[]};
  shield?:{hits:number;born:number;animation:string;sources:Set<string>};shieldCast?:{next:number;at:number;hit:boolean};
  summonCast?:{next:number;at:number;count:number};spawnGroup?:string;raiseAt?:number;spawnWaypoint?:Point;

  boostUntil?:number;boosted?:boolean;polymorph?:{health:number;speed:number;livesCost:number;clicks:number;stunAnimation:string};curse?:{config:CurseAbility;born:number;until:number;armorUntil:number;armorLoss:number;next:number};
  finisher?:{phase:'death'|'end'|'done';at:number};freezeCast?:{next:number;at:number;targets:string[];hit:boolean};summons?:{index:number;next:number}[];

  buffCast?:{readyAt:number;loop:number;started:number;hitAt:number|null};rage?:{speedFactor?:number;until:number;born:number;armor:number;speed:number;damage:[number,number];animation:string};
  net?:{until:number;factor:number;effect:string};heroStunUntil?:number;heroSlow?:{until:number;factor:number};
  id: number; kind: EnemyKind; hp: number; lane: number; distance: number;
  regenAt:number;rangedAt:number;rangedHitAt:number|null;rangedTarget:number|null;rangedStarted:number;missileAt:number;bombAt:number;bossShot:'missile'|'bomb'|null;teleportCount:number;
  bounty:number; healAt:number; healCastAt:number|null; healStarted:number;
  eggAt:number; eggCooldown:number; eggsLaid:number; born:number;
  poisonUntil:number; poisonAt:number; poisonDamage:number; thornAt:number; thornUntil:number; thornTick:number; thornCount:number;
  armorLoss: number; slowUntil: number; heading: Point; blockedBy: number | null; attackAt: number; hitAt: number | null;
  attackStarted: number; deadAt: number | null; escaped: boolean; dodgeAt: number | null;
}
export interface Soldier extends Point {
 stun?:{born:number;until:number;animation:string;offset:Point};
 consumed?:boolean;
  profile?:UnitProfile;areaActive?:boolean;netAt?:number;rangedMode?:'projectile'|'net';
  summon?:HeroSummon;
  role?:'elf'|'guard';holy:boolean;healAt:number;healHitAt:number|null;healStarted:number; rangedAt:number; rangedHitAt:number|null; rangedTarget:number|null; rangedStarted:number;
  born: number; center: Point; waypoints: Point[];
  tier:number; id: number; towerId: string | null; variant: number; nameIndex: number; home: Point; hp: number;
  target: number | null; attackAt: number; hitAt: number | null; attackStarted: number;
  deadAt: number | null; expiresAt: number; moving: boolean; flip: boolean; regenAt: number; courageUntil: number; courageLevel: number;
}
export interface Hero extends Point {
 stun?:{born:number;until:number;animation:string;offset:Point};
  id: number; hp: number; level: number; xp: number; queuedXp: number; home: Point; waypoints: Point[];
  target: number | null; attackAt: number; hitAt: number | null; deadAt: number | null;
  animation: string;
  animationAt: number; busyUntil: number; flip: boolean; lastHit: number; regenElapsed: number;
  courageAt: number; courageHitAt: number | null; counterDamage: [number,number]; levelUpAt: number;
}
export interface Tower {
 block?:{born:number;until:number;config:import("../content/abilities").TowerBlock};
 seal?:{config:TowerSeal;born:number;clicks:number;endAt:number|null;trapped:boolean};
  frozen?:{config:FreezeAbility['ice'];born:number;clicks:number;endAt:number|null};spellState?:{polymorphAt:number;mode:'bolt'|'polymorph'};
  manual?:ManualTower;manualState?:{rank:number;readyAt:number};

  extension?:TowerExtension;powerLevels?:Record<string,number>;camp?:MercenaryCamp;
  artillery?:{mode:'bomb'|'missile'|'cluster';missileAt:number;clusterAt:number;animationUntil:number;aim:Point;lane:number};
  heroBuffUntil?:number;
  disintegrate:number;teleport:number;healing:number;shield:number;holystrike:number;disintegrateAt:number;teleportAt:number;arcaneMode:'ray'|'disintegrate'|'teleport';
  special?:'elf'|'musketeer';sniper:number;shrapnel:number;sniperAt:number;shrapnelAt:number;musketMode:'shot'|'sniper'|'shrapnel';sniperKill:boolean; recruits:number; poison:number; thorn:number; thornAt:number; thornHitAt:number|null; thornStarted:number;
  door: 'closed' | 'opening' | 'open' | 'closing'; doorAt: number; rallyPoint: Point;
  tier:number;spent:number; pad: Pad; kind: TowerKind; createdAt: number; builtAt: number; announced: boolean; deployed: boolean; readyAt: number; shotAt: number;
  target: number | null; releaseAt: number | null; aimUp: boolean; shooter: number;
}
export interface Projectile {
 frog?:import('../content/abilities').FrogEffect;
 dot?:import('../content/abilities').AllyDot;
 arc?:boolean;hitSound?:CombatCue;
  id: number; kind: 'arrow' | 'bolt' | 'bomb' | 'fire' | 'enemyArrow' | 'bossBomb' | 'missile' | 'musket' | 'shrapnel' | 'cluster' | 'net'; instakill?:boolean;invalidTarget?:boolean;ignorePrecision?:boolean;poison?:number; start: Point; end: Point;
  spell?:SpellAbility;maxSpeed?:number;hitEffect?:string;
  damageRange?:[number,number];hitFlying?:boolean;texture?:string;animation?:string;rotation?:number;targetsEnemies?:boolean;cluster?:ArtilleryAbility['cluster']&{count:number;lane:number;node:number};slow?:{factor:number;duration:number;effect:string};
  position?: Point; speed?: number; velocity?:Point; launched?:boolean; turnDirection?:number;
  target: number | null; born: number; due: number; damage: number; damageKind: DamageKind; radius: number; tier?:number; released?: boolean;
}
export interface Effect extends Point {
 z?:number;
  ground?:{fadeAfter:number};
  id: number; kind: 'explosion' | 'magic' | 'gold' | 'build' | 'fire' | 'crater' | 'lightning' | 'sheepExplode' | 'sheepBomb' | 'heal' | 'holy' | 'teleport' | 'rifleSmoke' | 'shotHit' | 'shrapnel' | 'crosshair' | 'source'; animation?:string;anchor?:number;flip?:boolean;target?:number; born: number; life: number; text: string;
}
export type BattleEvent = { type: 'build' | 'wave' | 'leak' | 'victory' | 'defeat' | 'fire' | 'reinforcements' | 'lightning' | 'fireRelease' | 'fireHit' | 'bossIntro' | 'bossFinish' | 'heroIntro' | 'heroDeath' | 'heroCourage' | 'heroCounter' | 'heroMove' | 'doorOpen' | 'rally' | 'sheep' | 'sheepExplode' | 'sheepBomb' } | {type:'achievement';id:string;amount:number;maximum?:boolean;award?:boolean} | {type:'early';remaining:number;elapsed:number} | {type:'seen';enemy:EnemyKind} | {type:'sound';cue:CombatCue} | {type:'heroSound';cue:string}
interface Track { points: Point[]; cumulative: number[]; length: number }
import {distance} from '@kingdom-rush/engine/geometry';
export const inRange = (a: Point, b: Point, radius: number) => (a.x - b.x) ** 2 + ((a.y - b.y) / ASPECT) ** 2 <= radius ** 2;
export function damageAfterArmor(amount: number, armor: number, kind: DamageKind,magicArmor=0): number {
  // all/utils.lua U.predict_damage rounds the incoming value, then floors protection.
  return damageAfterResistance(Math.floor(amount + .5),kind === 'physical' ? armor : kind === 'shot' ? armor * 2 / 3 : kind === 'explosion'||kind==='electrical' ? armor / 2 : kind==='magic'?magicArmor:0);
}

/** Content injection only; movement, targeting, projectiles and damage stay in Battle. */
export interface BattleContentProfile {
  enemies: Record<`content:${string}`, import('../content/balance').EnemyStats>;
  baseTowers: Partial<typeof TOWERS>;
  heroEnabled: boolean;
}

export class Battle {
 readonly abilities=new EnemyAbilities(this);
 readonly endless?:Endless;
  readonly story?:DarkTower;
  readonly pointSpawner=new PointSpawner(this);
  get waveCombatCleared(){return !this.pointSpawner.pending&&!this.abilities.deathSpawns.length&&!this.spawning&&!this.enemies.some(e=>e.hp>0)&&!this.tunnelPassengers.length&&!this.graveQueue.length&&!this.swampQueue.length&&!this.abilities.bursts.length&&!this.eggs.some(e=>e.spawned<e.config.count);}
  readonly level: Level;
  readonly stats:ReturnType<typeof upgradedStats>;
  readonly stats2:ReturnType<typeof upgradedStats>;
  private readonly tiers:ReturnType<typeof upgradedStats>[];
  readonly extensionStats=new Map<string,ReturnType<typeof upgradedStats>>();
  readonly musketeerStats:ReturnType<typeof upgradedStats>['towers']['archer'];
  readonly content:LevelContent;
  readonly heroController?:HeroController;
  readonly navigation:ReturnType<typeof navigation>;
  statsForTier(tier:number){return this.tiers[tier-1];}
  towerStats(tower:Tower){const stats=tower.manual?{...TOWERS.mage,name:tower.manual.name,damage:tower.manual.damage.map(d=>d+tower.manual!.damageInc*Math.max(1,tower.manualState!.rank)) as [number,number],range:2000,cooldown:tower.manual.cooldown+tower.manual.cooldownInc*Math.max(1,tower.manualState!.rank)}:tower.extension?this.extensionStats.get(tower.extension.id)!.towers[tower.kind]:tower.camp?{...TOWERS.barrack,name:tower.camp.name,range:tower.camp.rallyRange}:tower.special==='elf'?TOWERS.barrack:tower.special==='musketeer'?this.musketeerStats:this.statsForTier(tower.tier).towers[tower.kind];return tower.heroBuffUntil!==undefined&&this.time<tower.heroBuffUntil?{...stats,range:stats.range*1.2,cooldown:stats.cooldown*.8}:stats;}
  soldierStats(soldier:Soldier){if(soldier.profile)return this.towerSoldierStats(this.towers.find(t=>t.pad.id===soldier.towerId)!);if(soldier.summon)return soldier.summon.stats;if(soldier.role==='guard')return GUARD;if(soldier.role==='elf')return ELF;const stats=soldier.towerId===null?this.stats.reinforcement:this.statsForTier(soldier.tier).soldier;if(soldier.tier===4){const tower=this.towers.find(t=>t.pad.id===soldier.towerId)!;return {...stats,armor:stats.armor+.15*tower.shield};}return stats;}
  baseEnemyStats(enemy:Enemy){return enemy.scaledStats?.kind===enemy.kind?enemy.scaledStats.stats:this.enemyStats[enemy.kind];}
  effectiveEnemyStats(enemy:Enemy):Readonly<import('../content/balance').EnemyStats>{
    const base=this.baseEnemyStats(enemy),rage=enemy.rage;
    // Most reads have no active modifiers; share the immutable template in that case.
    if(!(enemy.totemSpeed&&this.time<enemy.totemSpeed.until)&&enemy.maxHp===undefined&&
      !(enemy.damageBoost&&this.time<enemy.damageBoost.until)&&!enemy.polymorph&&
      !(rage&&this.time<rage.until)&&!(enemy.curse&&this.time<enemy.curse.armorUntil)&&
      !(enemy.boostUntil&&this.time<enemy.boostUntil)&&!this.onMoveTerrain(enemy)&&
      !(this.enemyFlying(enemy)&&base.flight))return base;
    const stats={...base};
    if(enemy.totemSpeed&&this.time<enemy.totemSpeed.until)stats.speed*=enemy.totemSpeed.factor;
    if(enemy.maxHp!==undefined)stats.health=enemy.maxHp;
    if(enemy.damageBoost&&this.time<enemy.damageBoost.until)stats.damage=stats.damage.map(d=>d*enemy.damageBoost!.config.factor) as [number,number];
    if(enemy.polymorph)Object.assign(stats,{health:enemy.polymorph.health,speed:enemy.polymorph.speed,livesCost:enemy.polymorph.livesCost});
    if(rage&&this.time<rage.until){stats.armor+=rage.armor;stats.speed=rage.speedFactor?stats.speed*rage.speedFactor:stats.speed+rage.speed;stats.damage=stats.damage.map((d,i)=>d+rage.damage[i]) as [number,number];}
    if(enemy.curse&&this.time<enemy.curse.armorUntil)stats.armor-=enemy.curse.armorLoss;
    if(enemy.boostUntil&&this.time<enemy.boostUntil)stats.speed*=stats.speedOnHit!.factor;
    if(this.onMoveTerrain(enemy))stats.speed*=stats.terrainMove!.speedFactor;
    if(this.enemyFlying(enemy)&&stats.flight){const f=stats.flight;stats.flying=true;stats.prefix=f.prefix;stats.healthOffset+=f.healthOffset;stats.hitOffset+=f.hitOffset;stats.hitY=(stats.hitY??0)+f.clickOffset;stats.modOffset={x:stats.modOffset!.x,y:stats.modOffset!.y+f.modOffset};if(enemy.flight!.phase==='flying')stats.speed*=f.speedFactor;}
    return stats;}
  onMoveTerrain(enemy:Enemy){const c=this.baseEnemyStats(enemy).terrainMove;return !!c&&(this.navigation.terrainAt(enemy)&c.mask)!==0;}
  enemyFlying(enemy:Enemy){return !!this.baseEnemyStats(enemy).flying||!!enemy.flight&&enemy.flight.phase!=='ground';}
  controlImmune(enemy:Enemy){const c=this.baseEnemyStats(enemy);return !!c.boss||!!c.controlImmune;}
  enemyUnblockable(enemy:Enemy){return this.baseEnemyStats(enemy).unblockable||this.onMoveTerrain(enemy)&&this.baseEnemyStats(enemy).terrainMove!.unblockable;}
  enemyImmune(enemy:Enemy){return enemy.dormant||!!enemy.clone&&enemy.raiseAt!==undefined&&this.time-enemy.raiseAt<enemy.raiseDuration!||this.baseEnemyStats(enemy).boss?.immuneWhileUnblocked&&enemy.blockedBy===null;}
  upgradeUnlocked(tower:Tower){return !this.isTowerBlocked(tower)&&!tower.manual&&!tower.camp&&!tower.special&&(tower.tier<this.content.maxTowerLevel||(tower.tier===3&&this.content.advancedTowers.includes(tower.kind)&&(tower.kind!=='archer'||this.wave>=this.content.rangerWave![this.mode])));}
  upgradeStats(tower:Tower,branch?:string){const extension=this.content.extensions?.find(e=>e.id===branch);return extension?this.extensionStats.get(extension.id)!:this.statsForTier(tower.tier+1);}
  canUpgrade(tower:Tower,branch?:string){const extension=this.content.extensions?.find(e=>e.id===branch);return (extension?extension.kind===tower.kind&&tower.tier===3:!branch||(this.content.musketeer&&tower.kind==='archer'&&tower.tier===3))&&this.upgradeUnlocked(tower)&&this.gold>=this.upgradeStats(tower,branch).towers[tower.kind].cost&&!this.paused&&!this.finished;}
  campFor(pad:Pad){return pad.special?this.content.camps?.[pad.special]:undefined;}
  towerSoldierStats(tower:Tower){
    const profile=tower.extension?.unit??tower.extension?.guardian?.unit??tower.camp!.unit;
    const guardian=tower.extension?.guardian;
    const base=guardian?{...profile.stats}:tower.extension?this.extensionStats.get(tower.extension.id)!.soldier:profile.stats;
    if(guardian){const rank=tower.powerLevels![guardian.power];base.health+=rank*guardian.healthInc;base.armor+=rank*guardian.armorInc;base.damage=base.damage.map(d=>d+rank*guardian.damageInc) as [number,number];}
    const power=profile.meleePower,rank=power?tower.powerLevels![power.power]:0;
    return {...base,damage:base.damage.map(d=>d+(power?power.damageInc*rank:0)) as [number,number]};
  }
  extensionPowerCost(tower:Tower,power:string){return tower.extension!.powers[power].price[tower.powerLevels![power]===0?0:1];}
  canBuyExtensionPower(tower:Tower,power:string){return !this.isTowerBlocked(tower)&&tower.powerLevels![power]<tower.extension!.powers[power].max&&!this.paused&&!this.finished&&this.gold>=this.extensionPowerCost(tower,power);}
  buyExtensionPower(padId:string,power:string){
    const tower=this.towers.find(t=>t.pad.id===padId)!;if(!this.canBuyExtensionPower(tower,power))return false;
    const cost=this.extensionPowerCost(tower,power);this.gold-=cost;tower.spent+=cost;tower.powerLevels![power]++;
    const a=tower.extension!.artillery;if(a&&tower.powerLevels![power]===1){if(power===a.missile.power)tower.artillery!.missileAt=this.time+a.missile.cooldown;if(power===a.cluster.power)tower.artillery!.clusterAt=this.time+a.cluster.cooldown;}
    const spell=tower.extension!.spell;if(spell&&power===spell.polymorph.power&&tower.powerLevels![power]===1)tower.spellState!.polymorphAt=this.time+spell.polymorph.cooldown+spell.polymorph.cooldownInc;
    const guardian=tower.extension!.guardian;if(guardian&&power===guardian.power){const soldier=this.soldiers.find(s=>s.towerId===padId);if(soldier)soldier.hp=this.towerSoldierStats(tower).health;}
    this.events.push({type:'sound',cue:tower.extension!.powers[power].sound});return true;
  }
  isTowerBlocked(tower:Tower){if(tower.block&&this.time<tower.block.until)return true;if(this.story?.blocksTowers)return true;if(tower.seal&&this.time>=tower.seal.born+tower.seal.config.startDuration)return true;const f=tower.frozen;return !!f&&(f.endAt===null||this.time<f.endAt+f.config.releaseDelay);}
  clickFrozenTower(tower:Tower){
    const seal=tower.seal;if(seal){if(!this.paused&&!this.finished&&!seal.trapped&&seal.endAt===null&&this.time>=seal.born+seal.config.startDuration){seal.clicks++;this.events.push({type:'sound',cue:seal.config.clickSound});if(seal.clicks===seal.config.clicks){seal.endAt=this.time;this.events.push({type:'sound',cue:seal.config.releasedSound});}}return true;}
    const f=tower.frozen;if(!f||!this.isTowerBlocked(tower))return false;
    if(this.paused||this.finished||this.time-f.born<f.config.startDuration||f.endAt!==null)return true;
    f.clicks++;this.events.push({type:'sound',cue:f.config.clickSound});this.sourceEffect(tower.pad.position,f.config.clickEffect,10/30);
    if(f.clicks===f.config.clicks)f.endAt=this.time;return true;
  }
  clickEnemy(enemy:Enemy){
    const boss=this.baseEnemyStats(enemy).boss;
    if(enemy.finisher){if(!this.paused&&!this.finished&&enemy.finisher.phase==='death'&&this.time-enemy.finisher.at>=boss!.finisher!.deathDuration){enemy.finisher={phase:'end',at:this.time};this.events.push({type:'bossFinish'},{type:'sound',cue:boss!.finisher!.sound});}return true;}
    const clicks=this.baseEnemyStats(enemy).clicksToKill;
    if(clicks&&enemy.polymorph&&!this.paused&&!this.finished){if(++enemy.polymorph.clicks===clicks){this.damage(enemy,enemy.hp,'true');this.achievement('SHEEP_KILLER');}return true;}
    return false;
  }
  private updateBossAbility(enemy:Enemy){
    const boss=this.baseEnemyStats(enemy).boss;if(!boss)return false;
    if(enemy.finisher){if(enemy.finisher.phase==='end'&&this.time-enemy.finisher.at>=boss.finisher!.endDuration){enemy.finisher.phase='done';this.damage(enemy,enemy.hp,'true');}return true;}
    for(const spawn of enemy.summons??[])if(this.time>=spawn.next){const c=this.content.bossSpawns![spawn.index],lane=this.content.routes[c.route][c.lane],e=this.addEnemy(c.kind,lane),track=this.tracks[lane];Object.assign(e,track.points[c.node],{distance:track.cumulative[c.node]});spawn.next=this.time+c.cooldown;this.spawned++;}
    const config=boss.freeze;if(!config)return false;const state=enemy.freezeCast!,age=this.time-state.at;
    if(age<config.duration+config.rest){
      if(!state.hit&&age>=config.windup){state.hit=true;for(const id of state.targets){const tower=this.towers.find(t=>t.pad.id===id);if(tower&&!this.isTowerBlocked(tower))tower.frozen={config:config.ice,born:this.time,clicks:0,endAt:null};}this.sourceEffect({x:enemy.x+config.hitOffset.x*(enemy.heading.x<0?-1:1),y:enemy.y+config.hitOffset.y},config.hitEffect,12/30);}
      return true;
    }
    if(this.time<state.next)return false;
    const targets=this.towers.filter(t=>!t.manual&&!t.camp&&t.special!=='elf'&&this.time>=t.builtAt&&!this.isTowerBlocked(t)&&inRange(enemy,t.pad.position,config.range));
    if(!targets.length){state.next=this.time+.5;return false;}
    state.at=this.time;state.next=this.time+config.duration+config.cooldown;state.targets=targets.slice(0,config.count).map(t=>t.pad.id);state.hit=false;enemy.hitAt=null;
    this.delayedSounds.push({at:this.time+config.soundDelay,cue:config.sound},{at:this.time+config.duration+config.restSoundDelay,cue:config.restSound});return true;
  }
  private applyCurse(enemy:Enemy,config:CurseAbility){
    if(enemy.shield||this.enemyImmune(enemy))return;
    const active=enemy.curse&&this.time<enemy.curse.armorUntil;
    enemy.curse={config,born:this.time,until:this.time+config.duration,armorUntil:this.time+config.armorDuration,armorLoss:active?enemy.curse!.armorLoss:Math.max(0,this.effectiveEnemyStats(enemy).armor-enemy.armorLoss)*config.armorFactor,next:enemy.curse&&this.time<enemy.curse.until?enemy.curse.next:this.time};
  }
  private updateSpellTower(tower:Tower){
    const config=tower.extension!.spell!,state=tower.spellState!,stats=this.towerStats(tower),poly=config.polymorph,rank=tower.powerLevels![poly.power];
    const targets=()=>this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&inRange({x:tower.pad.position.x,y:tower.pad.position.y+12},e,stats.range)).sort((a,b)=>this.remainingDistance(a)-this.remainingDistance(b));
    if(tower.releaseAt!==null&&this.time>=tower.releaseAt){
      const target=targets().find(e=>e.id===tower.target)??(state.mode==='polymorph'?targets().find(e=>!this.controlImmune(e)&&!e.polymorph):undefined);
      if(target){const offset=state.mode==='polymorph'?poly.offset:config.offsets[tower.aimUp?0:1],start={x:tower.pad.position.x+offset.x,y:tower.pad.position.y+offset.y};
        if(state.mode==='polymorph')this.abilityRays.push({id:++this.id,from:start,target:target.id,born:this.time,hitAt:this.time+poly.hitTime,duration:poly.duration,animation:poly.animation,scale:1,damage:0,hitEffect:poly.effect,transform:poly,hit:false});
        else this.projectiles.push({id:++this.id,kind:'bolt',start,end:{x:target.x,y:target.y+this.effectiveEnemyStats(target).hitOffset},position:{...start},speed:30,maxSpeed:config.speed,target:target.id,born:this.time,due:Infinity,damage:this.roll(stats.damage),damageKind:'magic',radius:0,animation:config.animation,spell:config});
        this.events.push({type:'sound',cue:state.mode==='polymorph'?poly.sound:config.sound});
      }tower.releaseAt=null;
    }
    if(this.time<tower.readyAt||tower.releaseAt!==null)return;
    const all=targets();let target=rank>0&&this.time>=state.polymorphAt?all.find(e=>!this.controlImmune(e)&&!e.polymorph):undefined;
    state.mode=target?'polymorph':'bolt';if(target)state.polymorphAt=this.time+poly.cooldown+poly.cooldownInc*rank;
    else target=all[0]; // Source ab_mod is nil: final reference selects the foremost enemy.
    if(!target)return;tower.target=target.id;tower.shotAt=this.time;tower.aimUp=target.y>tower.pad.position.y+64;tower.releaseAt=this.time+(state.mode==='polymorph'?poly.windup:stats.windup);tower.readyAt=this.time+stats.cooldown;
  }
  private updateGuardian(tower:Tower){
    const config=tower.extension!.guardian!;if(tower.powerLevels![config.power]===0)return;
    const old=this.soldiers.find(s=>s.towerId===tower.pad.id);
    if(old&&(old.deadAt===null||this.time-old.deadAt<config.unit.deathLifetime))return;
    const pos=old?{x:old.x,y:old.y}:tower.rallyPoint;this.soldiers=this.soldiers.filter(s=>s.towerId!==tower.pad.id);
    this.addSoldier(pos,tower.rallyPoint,tower.rallyPoint,tower.pad.id,0);this.events.push({type:'sound',cue:config.sound});
  }
  canBuyManualPower(tower:Tower){return !this.paused&&!this.finished&&tower.manualState!.rank<tower.manual!.power.max&&this.gold>=tower.manual!.power.price[tower.manualState!.rank===0?0:1];}
  buyManualPower(tower:Tower){if(!this.canBuyManualPower(tower))return false;const s=tower.manualState!,config=tower.manual!;this.gold-=config.power.price[s.rank===0?0:1];s.rank++;s.readyAt=this.time+config.readyDuration;this.events.push({type:'sound',cue:config.power.sound});return true;}
  manualReady(tower:Tower){return !this.paused&&!this.finished&&tower.manualState!.rank>0&&this.time>=tower.manualState!.readyAt;}
  fireManual(tower:Tower,enemy:Enemy){
    if(!this.manualReady(tower)||enemy.hp<=0||enemy.escaped||!this.validTargetNode(enemy))return false;
    const c=tower.manual!,s=tower.manualState!;tower.target=enemy.id;tower.shotAt=this.time;tower.releaseAt=this.time+c.windup;s.readyAt=this.time+c.cooldown+c.cooldownInc*s.rank+c.readyDuration;return true;
  }
  private updateManualTower(tower:Tower){
    if(tower.releaseAt===null||this.time<tower.releaseAt)return;tower.releaseAt=null;
    const c=tower.manual!,s=tower.manualState!,target=this.enemies.find(e=>e.id===tower.target);
    if(target){this.abilityRays.push({id:++this.id,from:{x:tower.pad.position.x+c.offset.x,y:tower.pad.position.y+c.offset.y},target:target.id,born:this.time,hitAt:this.time+c.ray.hitTime,duration:c.ray.duration,animation:c.ray.animation,scale:c.ray.scales[s.rank-1],damage:this.roll(c.damage)+c.damageInc*s.rank,hitEffect:c.ray.hitEffect,hit:false});this.events.push({type:'sound',cue:c.ray.sound});}
    this.achievement(c.achievement);
  }
  private updateAbilityRays(){
    for(const ray of this.abilityRays){if(ray.hit||this.time<ray.hitAt)continue;ray.hit=true;const e=this.enemies.find(e=>e.id===ray.target&&e.hp>0&&!e.escaped);if(!e||!this.validTargetNode(e))continue;
      this.sourceEffect({x:e.x,y:e.y+this.effectiveEnemyStats(e).hitOffset},ray.hitEffect,22/30);
      if(ray.transform){const c=ray.transform,stats=this.effectiveEnemyStats(e),kind=(stats.flying?c.flying:c.ground) as EnemyKind;for(const unit of this.attackers(e))this.release(unit);
        e.maxHp=undefined;e.damageBoost=undefined;e.polymorph={health:Math.floor(stats.health*c.healthFactor),speed:this.baseEnemyStats(e).speed*c.speedFactor,livesCost:stats.livesCost,clicks:0,stunAnimation:c.stunAnimation};e.kind=kind;e.hp=Math.floor(e.hp*c.healthFactor);e.curse=undefined;e.rage=undefined;e.net=undefined;e.boostUntil=0;e.hitAt=null;e.rangedHitAt=null;e.rangedStarted=-100;e.healStarted=-100;e.healCastAt=null;e.buffCast=undefined;e.clone=undefined;e.flight=undefined;e.areaSkill=undefined;e.spore=undefined;e.raiseDuration=undefined;e.shield=undefined;e.shieldCast=undefined;e.summonCast=undefined;e.raiseAt=undefined;e.spawnWaypoint=undefined;e.thornUntil=0;e.poisonUntil=0;e.armorLoss=0;e.slowUntil=0;this.achievement('SHEPARD');this.events.push({type:'sound',cue:'Sheep'});
      }else this.damage(e,ray.damage,'true');
    }
    this.abilityRays=this.abilityRays.filter(r=>this.time-r.born<r.duration);
  }

  sourceEffect(point:Point,animation:string,life:number,anchor=.5,flip=false){const effect:Effect={id:++this.id,...point,kind:'source',animation,anchor,flip,born:this.time,life,text:''};this.effects.push(effect);return effect;}

  get heroEnabled(){return this.profile ? this.profile.heroEnabled : this.mode==='campaign'||!!this.content.heroModes?.[this.mode];}
  allowsTower(kind:TowerKind){return this.content.allowedTowers[this.mode].includes(kind);}
  private achievement(id:string,amount=1,maximum=false){this.events.push({type:'achievement',id,amount,maximum});}
  scorches:{x:number;y:number;born:number;tick:number;duration:number}[]=[];
  readonly tracks: Track[];
  readonly enemyStats: typeof ENEMIES;
  outcome: Outcome = 'preparing';
  paused = false;
  time = 0;
  gold: number;
  lives: number;
  wave = 0;
  kills = 0;
  spawned = 0;
  leaked = 0;
  towers: Tower[] = [];
  enemies: Enemy[] = [];
  soldiers: Soldier[] = [];
  readonly props: SceneProp[];
  hero: Hero;
  projectiles: Projectile[] = [];
  effects: Effect[] = [];
  tunnelPassengers:{enemy:Enemy;name:string;lane:number;node:number;releaseAt:number}[]=[];
  rays:{id:number;from:Point;target:number;born:number;next:number;ticks:number;damage:number;first:number;extra:number;disintegrate:boolean;source:string}[]=[];
  bombSpawners:{id:number;owner:number;position:Point;lane:number;node:number;born:number;spawned:number}[]=[];
  private bossDefeatedAt:number|null=null;
  private bossWinDelay=26/30;
  delayedSounds:{at:number;cue:CombatCue}[]=[];
  abilityRays:{id:number;from:Point;target:number;born:number;hitAt:number;duration:number;animation:string;scale:number;damage:number;hitEffect:string;transform?:SpellAbility['polymorph'];hit:boolean}[]=[];
  eggs:{id:number;x:number;y:number;lane:number;node:number;born:number;spawned:number;config:EggAbility}[]=[];
  events: BattleEvent[] = [];
  powers: Record<Power, number> = { reinforcements: 0, fire: 0, lightning:0 };
  private id = 0;
  private seed: number;
  private propSeed: number;
  private waveStarted = 0;
  private waveFinishedAt = 0;
  private nextSpawn = 0;
  private spawning = false;
  private seen = new Set<EnemyKind>();

  constructor(content:LevelContent, seed = 12345, readonly difficulty: Difficulty = 2,readonly mode:GameMode='campaign',upgrades:UpgradeLevels=EMPTY_UPGRADES,readonly heroContent?:HeroContent,readonly profile?:BattleContentProfile) {
    const level=content.level;this.content=content;if(content.script&&mode==='campaign')this.story=new DarkTower(content.script);this.navigation=navigation(content.navigation);
    this.tiers=[1,2,3,4].map(tier=>upgradedStats(upgrades,content.upgradeCap[mode],tier));
    if(profile)Object.assign(this.tiers[0].towers,structuredClone(profile.baseTowers));
    for(const extension of content.extensions??[])this.extensionStats.set(extension.id,upgradedStats(upgrades,content.upgradeCap[mode],4,false,extension));
    [this.stats,this.stats2]=this.tiers;this.musketeerStats=upgradedStats(upgrades,content.upgradeCap[mode],4,true).towers.archer;
    this.hero = {id: -1, ...this.content.heroSpawn, hp:400,level:1,xp:0,queuedXp:0,home:{...this.content.heroSpawn},waypoints:[],target:null,attackAt:0,hitAt:null,deadAt:null,animation:'levelup',animationAt:0,busyUntil:24/30,flip:false,lastHit:0,regenElapsed:0,courageAt:0,courageHitAt:null,counterDamage:[0,0],levelUpAt:-100};
    if(heroContent&&heroContent.id!=='gerald')this.heroController=new HeroController(this,heroContent);
    if(this.heroEnabled)this.events.push({type:'heroIntro'});
    else {this.hero.hp=0;this.hero.deadAt=0;}
    this.level = level; this.gold = level.cash; this.lives = level.lives; this.seed = seed;
    this.propSeed=seed^0x5f3759df;
    this.props = level.decorations.filter(d=>!d.mode||d.mode===({campaign:1,heroic:2,iron:3})[mode]).map(d => new SceneProp(d,()=>this.propRandom()));
    // Source game_settings.lua + all/difficulty.lua; measured in golden-map/difficulty-stats.json.
    const hpFactor = [0, .8, 1, 1.2, 1.5][difficulty], speedFactor = difficulty === 4 ? 1.1 : 1;
    this.enemyStats = Object.fromEntries(Object.entries(profile ? profile.enemies : ENEMIES).map(([kind, stats]) => [kind, {
      ...stats, health: Math.floor(stats.health * hpFactor + .5), speed: stats.speed * speedFactor,
    }])) as typeof ENEMIES;
    this.tracks = level.paths.map(points => {
      const cumulative = [0];
      for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]));
      return { points, cumulative, length: cumulative[cumulative.length - 1] };
    });
    for(const initial of content.initial[mode]){
      const tower=this.createTower(level.pads.find(p=>p.id===initial.pad)!,initial.kind,initial.tier);
      tower.builtAt=0;tower.announced=true;tower.spent=Array.from({length:tower.tier},(_,i)=>this.statsForTier(i+1).towers[tower.kind].cost).reduce((a,b)=>a+b,0);
      if(initial.special){tower.special=initial.special;tower.spent=initial.spent!;}
      if(initial.extension){const ext=content.extensions!.find(e=>e.id===initial.extension)!;tower.extension=ext;tower.powerLevels={...initial.powerLevels};tower.spent=initial.spent!;if(ext.spell){const a=ext.spell.polymorph;tower.spellState={mode:'bolt',polymorphAt:a.cooldown+a.cooldownInc*tower.powerLevels[a.power]};}}
      this.towers.push(tower);
    }
    for(const pad of level.pads){const manual=pad.special?content.manualTowers?.[pad.special]:undefined;if(manual){const tower=this.createTower(pad,'mage',1);Object.assign(tower,{manual,manualState:{rank:0,readyAt:Infinity},builtAt:0,announced:true});this.towers.push(tower);}}
    for(const pos of content.initialSoldiers[mode]){this.addSoldier(pos,pos,pos,null,0);const guard=this.soldiers[this.soldiers.length-1];Object.assign(guard,{role:'guard',hp:GUARD.health,expiresAt:Infinity,nameIndex:Math.floor(this.random()*20)});}
    if(content.endless){this.endless=new Endless(this,content.endless);this.level={...level,waves:[this.endless.waves.next(1)]};}
    this.abilities.initialize();
  }

  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  private propRandom(){this.propSeed=(Math.imul(this.propSeed,1664525)+1013904223)>>>0;return this.propSeed/4294967296;}
  roll([min, max]: [number, number]) { return min + Math.floor(this.random() * (max - min + 1)); }
  get finished() { return this.outcome === 'victory' || this.outcome === 'defeat'; }
  get canSendWave() { return !this.paused && !this.finished && !this.spawning && this.wave < this.level.waves.length; }
  get nextWaveIn() { return this.wave === 0 || this.wave === this.level.waves.length ? 0 : Math.max(0, this.level.waves[this.wave].delay - (this.time - this.waveFinishedAt)); }
  get earlyReward() { return this.wave > 0 && this.canSendWave ? Math.ceil(Math.round(this.nextWaveIn)*(this.content.endless?.nextWaveRewardMoneyMultiplier??1)) : 0; }
  get stars() { return this.outcome !== 'victory' ? 0 : this.lives >= 18 ? 3 : this.lives >= 6 ? 2 : 1; }

  build(padId: string, kind: TowerKind): boolean {
    if (this.paused || this.finished || !this.allowsTower(kind) || this.gold < this.stats.towers[kind].cost || this.towers.some(t => t.pad.id === padId)) return false;
    const pad = this.level.pads.find(p => p.id === padId)!;
    if(pad.special)return false;
    this.gold -= this.stats.towers[kind].cost;
    const tower=this.createTower(pad,kind,1);
    this.towers.push(tower);
    this.effect(pad.position, 'build', .6);
    this.events.push({ type: 'build' });
    return true;
  }

  private createTower(pad:Pad,kind:TowerKind,tier:number):Tower {
    return {sniper:0,shrapnel:0,sniperAt:0,shrapnelAt:0,musketMode:'shot',sniperKill:false,pad,kind,tier,spent:this.statsForTier(tier).towers[kind].cost,door:'closed',doorAt:this.time,rallyPoint:{...pad.rally},createdAt:this.time,builtAt:this.time+.8,announced:false,deployed:false,readyAt:this.time+.8+this.statsForTier(tier).towers[kind].cooldown,shotAt:-100,target:null,releaseAt:null,aimUp:false,shooter:0,disintegrate:0,teleport:0,healing:0,shield:0,holystrike:0,disintegrateAt:0,teleportAt:0,arcaneMode:'ray',recruits:0,poison:0,thorn:0,thornAt:0,thornHitAt:null,thornStarted:-100};
  }
  repairElf(padId:string){
    const pad=this.level.pads.find(p=>p.id===padId)!;
    if(this.paused||this.finished||pad.special!=='elf'||this.gold<100||this.towers.some(t=>t.pad.id===padId))return false;
    this.gold-=100;const tower=this.createTower(pad,'barrack',1);tower.special='elf';tower.spent=100;tower.builtAt=this.time;tower.announced=true;this.towers.push(tower);this.events.push({type:'build'});return true;
  }
  canHire(tower:Tower){return (!!tower.camp||tower.special==='elf')&&!this.paused&&!this.finished&&this.gold>=(tower.camp?tower.camp.price:100)&&this.soldiers.filter(s=>s.towerId===tower.pad.id&&s.deadAt===null).length+tower.recruits<(tower.camp?tower.camp.capacity:4);}
  hireElf(padId:string){
    const tower=this.towers.find(t=>t.pad.id===padId)!;if(!this.canHire(tower))return false;
    this.gold-=tower.camp?tower.camp.price:100;tower.recruits++;return true;
  }
  rangerPowerCost(tower:Tower,power:'poison'|'thorn'){return power==='poison'?250:tower.thorn===0?300:150;}
  canBuyRangerPower(tower:Tower,power:'poison'|'thorn'){return tower.kind==='archer'&&tower.special!=='musketeer'&&tower.tier===4&&tower[power]<3&&!this.paused&&!this.finished&&this.gold>=this.rangerPowerCost(tower,power);}
  buyRangerPower(padId:string,power:'poison'|'thorn'){
    const tower=this.towers.find(t=>t.pad.id===padId)!;if(!this.canBuyRangerPower(tower,power))return false;
    const price=this.rangerPowerCost(tower,power);this.gold-=price;tower.spent+=price;tower[power]++;if(power==='thorn'&&tower.thorn===1)tower.thornAt=this.time+8+34/30;
    this.events.push({type:'sound',cue:power==='poison'?'ArcherRangerPoisonTaunt':'ArcherRangerThornTaunt'});return true;
  }

  advancedPowerCost(tower:Tower,power:AdvancedPower){const prices={disintegrate:[350,200],teleport:[300,100],healing:[150,150],shield:[250,100],holystrike:[220,150],sniper:[250,250],shrapnel:[300,300]};return prices[power][tower[power]===0?0:1];}
  canBuyAdvancedPower(tower:Tower,power:AdvancedPower){return !this.isTowerBlocked(tower)&&tower.tier===4&&(['sniper','shrapnel'].includes(power)?tower.special==='musketeer':tower.kind===(['disintegrate','teleport'].includes(power)?'mage':'barrack'))&&tower[power]<(power==='shield'?1:3)&&!this.paused&&!this.finished&&this.gold>=this.advancedPowerCost(tower,power);}
  buyAdvancedPower(padId:string,power:AdvancedPower){
    const tower=this.towers.find(t=>t.pad.id===padId)!;if(!this.canBuyAdvancedPower(tower,power))return false;
    const cost=this.advancedPowerCost(tower,power);this.gold-=cost;tower.spent+=cost;tower[power]++;
    if(power==='disintegrate'&&tower[power]===1)tower.disintegrateAt=this.time+20;
    if(power==='teleport'&&tower[power]===1)tower.teleportAt=this.time+10;
    if(power==='sniper'&&tower.sniper===1)tower.sniperAt=this.time+14;
    if(power==='shrapnel'&&tower.shrapnel===1)tower.shrapnelAt=this.time+9;
    this.events.push({type:'sound',cue:({sniper:'ArcherMusketeerSniperTaunt',shrapnel:'ArcherMusketeerShrapnelTaunt',disintegrate:'MageArcaneDesintegrateTaunt',teleport:'MageArcaneTeleporthTaunt',healing:'BarrackPaladinHealingTaunt',shield:'BarrackPaladinShieldTaunt',holystrike:'BarrackPaladinHolyStrikeTaunt'} as const)[power]});return true;
  }

  upgrade(padId:string,branch?:string):boolean {
    const tower=this.towers.find(t=>t.pad.id===padId);
    if(!tower||!this.canUpgrade(tower,branch)||this.time<tower.builtAt)return false;
    const cost=this.upgradeStats(tower,branch).towers[tower.kind].cost;this.gold-=cost;tower.spent+=cost;tower.tier++;
    const extension=this.content.extensions?.find(e=>e.id===branch);
    if(extension){tower.extension=extension;tower.powerLevels=Object.fromEntries(Object.keys(extension.powers).map(p=>[p,0]));if(extension.spell)tower.spellState={polymorphAt:Infinity,mode:'bolt'};if(extension.artillery){const a=extension.artillery;tower.artillery={mode:'bomb',missileAt:Infinity,clusterAt:Infinity,animationUntil:0,aim:{...tower.pad.position},lane:0};tower.readyAt=this.time+a.cooldown;}}else if(branch)tower.special='musketeer';
    tower.releaseAt=null;tower.target=null;tower.shotAt=-100;
    if(tower.kind!=='artillery')tower.readyAt=this.time+(extension?.spell?extension.stats.cooldown:0);
    if(tower.kind==='barrack'){
      this.soldiers=this.soldiers.flatMap(s=>{
        if(s.towerId!==padId)return [s];
        if(s.deadAt!==null)return [];
        const id=++this.id;for(const e of this.enemies)if(e.blockedBy===s.id)e.blockedBy=id;
        return [{...s,id,nameIndex:tower.tier===4?s.nameIndex%20:s.nameIndex,tier:tower.tier,profile:extension?.unit,hp:extension?this.extensionStats.get(extension.id)!.soldier.health:this.statsForTier(tower.tier).soldier.health,courageUntil:0,courageLevel:0}];
      });
    }
    this.events.push({type:'sound',cue:'GUITowerUpgrade'},{type:'sound',cue:tower.extension?tower.extension.taunt:tower.special==='musketeer'?'ArcherMusketeerTaunt':tower.tier===4?({archer:'ArcherRangerTaunt',mage:'MageArcaneTaunt',barrack:'BarrackPaladinTaunt',artillery:'EngineerTaunt'} as const)[tower.kind]:({archer:'ArcherTaunt',mage:'MageTaunt',artillery:'EngineerTaunt',barrack:'BarrackTaunt'} as const)[tower.kind]});
    return true;
  }

  sellValue(tower: Tower) { return this.wave === 0 ? tower.spent : Math.round(tower.spent * (tower.kind==='archer'&&this.stats.levels.archers>=1?.9:.6)); }

  sell(padId: string): boolean {
    if (this.paused || this.finished) return false;
    const tower = this.towers.find(t => t.pad.id === padId);
    if (!tower||this.isTowerBlocked(tower)||tower.manual||tower.special==='elf'||tower.camp) return false;
    this.gold += this.sellValue(tower);
    for (const soldier of this.soldiers.filter(s => s.towerId === padId)) this.release(soldier);
    this.soldiers = this.soldiers.filter(s => s.towerId !== padId);
    this.towers = this.towers.filter(t => t !== tower);
    this.events.push({type:'sound',cue:'GUITowerSell'});this.achievement('REAL_STATE');this.achievement('INDECISIVE');
    return true;
  }

  rally(padId: string, point: Point): boolean {
    const tower = this.towers.find(t => t.pad.id === padId && (t.kind === 'barrack'||!!t.extension?.guardian));
    if (!tower || this.isTowerBlocked(tower) || this.paused || this.finished) return false;
    // PickView:rally_tower: keep the exact valid point, or project toward the tower.
    for (let i=0;i<200;i++) {
      const p={x:(tower.pad.position.x*i+point.x*(200-i))/200,y:(tower.pad.position.y*i+point.y*(200-i))/200};
      if (!inRange({x:tower.pad.position.x,y:tower.pad.position.y+12},p,(tower.extension?.guardian?tower.extension.guardian.rallyRange:tower.camp?tower.camp.rallyRange:tower.special==='elf'?145:this.stats.towers.barrack.range))||!this.navigation.rallyTarget(p)) continue;
      tower.rallyPoint=p;
      for(const s of this.soldiers.filter(s=>s.towerId===padId)){this.release(s);s.center={...p};s.home=tower.camp||tower.extension?.guardian?{...p}:this.formation(p,s.variant,tower.special==='elf'?4:3);}
      this.events.push(tower.extension?.guardian?{type:'sound',cue:tower.extension.guardian.rallySound}:tower.camp?{type:'sound',cue:tower.camp.rally}:tower.extension?{type:'sound',cue:tower.extension.taunt}:tower.special==='elf'?{type:'sound',cue:'ElfTaunt'}:{type:'rally'});this.achievement('TACTICIAN');return true;
    }
    return false;
  }

  private formation(center:Point,index:number,count=3):Point {
    const angle=index*2*Math.PI/count-Math.PI/2;
    return {x:center.x+25*Math.cos(angle),y:center.y+25*ASPECT*Math.sin(angle)};
  }

  clickProp(index:number) {
    if(this.paused||this.finished)return;
    const prop=this.props[index];if(prop.fish&&this.time-prop.playAt<prop.playDuration){this.achievement('CATCH_A_FISH');return;}const event=prop.click(this.time);
    if(prop.decoration.clickRelease&&!prop.decoration.clickRelease.achievementOnComplete&&prop.releaseAt===this.time)this.achievement(prop.decoration.clickRelease.achievement);
    const release=prop.decoration.clickRelease;if(release?.touchEffect&&(prop.releaseAt===null||prop.releaseAt===this.time)){this.sourceEffect(prop.decoration.position,release!.touchEffect!,release!.touchDuration!,.5);if(release!.touchSound)this.events.push({type:'sound',cue:release!.touchSound});}
    if(event){this.events.push({type:event});if(prop.removed)this.achievement('SHEEP_KILLER');if(prop.removed)this.effect(prop.decoration.position,event==='sheepBomb'?'sheepBomb':'sheepExplode',event==='sheepBomb'?20/30:11/30);}
  }

  sendWave(early = true): boolean {
    if (!this.canSendWave) return false;
    if (early && this.wave > 0) {
      const reward = this.earlyReward;this.events.push({type:'early',remaining:this.nextWaveIn,elapsed:this.time-this.waveFinishedAt});this.achievement('DARING');
      this.gold += reward;
      const seconds=this.endless?Math.round(this.nextWaveIn):reward;this.powers.fire -= seconds; this.powers.reinforcements -= seconds; this.powers.lightning -= seconds;
    }
    this.endless?.onWave(early,this.nextWaveIn);
    this.wave++; this.outcome = 'playing'; this.spawning = true; this.nextSpawn = 0; this.waveStarted = this.time;
    this.pointSpawner.start();
    this.events.push({ type: 'wave' });
    return true;
  }

  cast(power: Power, point: Point): boolean {
    if (this.paused || this.finished || this.wave === 0 || this.time < this.powers[power]) return false;
    if (power === 'reinforcements') {
      if (!this.navigation.rallyTarget(point)) return false;
      for (let i = 0; i < 2; i++) {
        const position = { x: point.x + (i === 0 ? 10 : -10), y: point.y + (i === 0 ? -10 : 10) };
        this.addSoldier(position, position, point, null, Math.floor(this.random()*3));
      }
      this.powers[power] = this.time + this.stats.reinforcement.cooldown;
    } else if(power==='lightning') {
      const enemy=this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&point.x>e.x-10&&point.x<e.x+10&&point.y>e.y+(this.baseEnemyStats(e).hitY??-5)&&point.y<e.y+(this.baseEnemyStats(e).hitY??-5)+this.baseEnemyStats(e).hitSize[1]).sort((a,b)=>a.y-b.y)[0];
      if(!enemy)return false;
      this.effect({x:enemy.x,y:enemy.y},'lightning',10/30);this.damage(enemy,this.roll(LIGHTNING.damage),'true');this.powers.lightning=this.time+LIGHTNING.cooldown;
    } else {
      if(!this.canFireTarget(point))return false;this.achievement('ARMAGGEDON');
      for (let i = 0; i < this.stats.fire.count; i++) {
        const end = { x: point.x + (this.random() * 2 - 1) * this.stats.fire.spread, y: point.y + (this.random() * 2 - 1) * this.stats.fire.spread };
        this.projectiles.push({ id: ++this.id, kind: 'fire', start: { x: end.x, y: 768 }, position: {x:end.x,y:768}, speed: 300, end, target: null, born: this.time + i * .33, due: Infinity, damage: this.roll(this.stats.fire.damage), damageKind: 'true', radius: this.stats.fire.radius });
      }
      this.powers[power] = this.time + this.stats.fire.cooldown;
    }
    this.events.push({ type: power });
    return true;
  }

  canFireTarget(point:Point){return this.navigation.fireTarget(point)||!!this.content.powerAreas?.some(r=>point.x>=r.x&&point.x<=r.x+r.width&&point.y>=r.y&&point.y<=r.y+r.height)||this.level.pads.some(p=>{const camp=this.campFor(p);if(!camp||this.towers.some(t=>t.pad.id===p.id))return false;const r=camp.unfreeze.rect;return point.x>=r.x&&point.x<=r.x+r.width&&point.y>=r.y&&point.y<=r.y+r.height;});}
  private unfreezeCamps(point:Point){for(const pad of this.level.pads){const camp=this.campFor(pad);if(!camp||this.towers.some(t=>t.pad.id===pad.id)||!inRange(pad.position,point,camp.unfreeze.radius))continue;const tower=this.createTower(pad,'barrack',1);Object.assign(tower,{camp,builtAt:this.time,announced:true,spent:0});this.towers.push(tower);this.sourceEffect({x:pad.position.x+camp.offset.x,y:pad.position.y+camp.offset.y},camp.unfreeze.animation,camp.unfreeze.duration);}}

  nearestRoad(point: Point): Point {
    let nearest = this.tracks[0].points[0], best = Infinity;
    for (const track of this.tracks) for (let i = 1; i < track.points.length; i++) {
      const a = track.points[i - 1], b = track.points[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
      const p = { x: a.x + t * dx, y: a.y + t * dy }, d = distance(p, point);
      if (d < best) { best = d; nearest = p; }
    }
    return { ...nearest };
  }

  get heroHealth() { return this.heroContent?this.heroContent.levels[this.hero.level-1].health:GERALD.health[this.hero.level-1]; }
  get heroArmor(){return this.heroContent?this.heroContent.levels[this.hero.level-1].armor:GERALD.armor[this.hero.level-1];}
  get heroXpRatio() { const h=this.hero;return h.level===10?1:(h.xp-GERALD.xp[h.level-1])/(GERALD.xp[h.level]-GERALD.xp[h.level-1]); }
  moveHero(point:Point):boolean {
    const h=this.hero;
    if(this.paused||this.finished||h.deadAt!==null)return false;
    const route=this.navigation.heroRally(h,point,h.home);if(!route)return false;
    this.release(h);h.home=route.point;h.waypoints=[...route.waypoints,route.point];
    h.courageHitAt=null;h.busyUntil=this.time;h.animation='running';h.animationAt=this.time;
    this.heroController?.move();this.events.push({type:'heroMove'});return true;
  }

  moveSoldier(id:number,point:Point):boolean {
    const soldier=this.soldiers.find(s=>s.id===id)!;
    if(this.paused||this.finished||soldier.deadAt!==null)return false;
    if(soldier.towerId!==null)return this.rally(soldier.towerId,point);
    const route=this.navigation.heroRally(soldier,point);if(!route)return false;
    this.release(soldier);
    soldier.home={x:route.point.x+soldier.home.x-soldier.center.x,y:route.point.y+soldier.home.y-soldier.center.y};
    soldier.center=route.point;soldier.waypoints=[...route.waypoints,soldier.home];return true;
  }

  addSoldier(position: Point, home: Point, center: Point, towerId: string | null, variant: number) {
    if(towerId!==null)this.achievement('GI_JOE');
    const tier=towerId===null?1:this.towers.find(t=>t.pad.id===towerId)!.tier;
    const sourceTower=towerId===null?undefined:this.towers.find(t=>t.pad.id===towerId)!,profile=sourceTower?.extension?.unit??sourceTower?.extension?.guardian?.unit??sourceTower?.camp?.unit;
    const role=towerId!==null&&this.towers.find(t=>t.pad.id===towerId)!.special==='elf'?'elf':undefined;
    this.soldiers.push({ profile,netAt:0,holy:false,healAt:this.time+10,healHitAt:null,healStarted:-100,tier,role,rangedAt:0,rangedHitAt:null,rangedTarget:null,rangedStarted:-100, id: ++this.id, born:this.time, center:{...center},waypoints:[],...position, home: { ...home }, towerId, variant, nameIndex: Math.floor(this.random()*(profile?Math.max(1,profile.names.length):role==='elf'?10:tier===4?20:40)),
      hp: profile?this.towerSoldierStats(sourceTower!).health:role==='elf'?ELF.health:towerId === null ? this.stats.reinforcement.health : this.statsForTier(tier).soldier.health, target: null, attackAt: 0,
      hitAt: null, attackStarted: -100, deadAt: null, expiresAt: towerId === null ? this.time + this.stats.reinforcement.duration : Infinity,
      moving: false, flip: false, regenAt: this.time + 1, courageUntil:0, courageLevel:0 });
  }
  release(soldier: Soldier | Hero) {
    const enemy = this.enemies.find(e => e.id === soldier.target);
    soldier.target = null; soldier.hitAt = null;
    if (enemy && enemy.blockedBy === soldier.id) {
      const next=this.attackers(enemy)[0];
      enemy.blockedBy=next ? next.id : null;enemy.hitAt=null;enemy.dodgeAt=null;
    }
  }
  private attackers(enemy:Enemy):(Soldier|Hero)[] {
    return [...this.soldiers,this.hero].filter(s=>s.target===enemy.id&&s.hp>0&&s.deadAt===null);
  }
  acquire(unit:Soldier|Hero,radius:number) {
    const targets=this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&!this.enemyFlying(e)&&!this.enemyUnblockable(e)&&inRange(unit.home,e,radius));
    targets.sort((a,b)=>Number(a.blockedBy!==null)-Number(b.blockedBy!==null)||distance(unit,a)-distance(unit,b));
    if(targets.length){const enemy=targets[0];unit.target=enemy.id;if(enemy.blockedBy===null)enemy.blockedBy=unit.id;}
  }
  meleePosition(unit:Soldier|Hero,enemy:Enemy):Point {
    const all=this.attackers(enemy).sort((a,b)=>Number(b.id===enemy.blockedBy)-Number(a.id===enemy.blockedBy)),rank=all.findIndex(s=>s.id===unit.id)%3;
    const profile='profile' in unit?unit.profile:undefined,meleePower=profile?.meleePower,powerRank=meleePower?this.towers.find(t=>t.pad.id===(unit as Soldier).towerId)!.powerLevels![meleePower.power]:0;
    const offset=this.baseEnemyStats(enemy).boss?.siege?45:(this.baseEnemyStats(enemy).meleeSlot??18)+(profile?(powerRank?meleePower!.meleeSlot:profile.meleeSlot):5); // source enemy melee_slot.x=18 + soldier melee_slot_offset.x=5
    return {x:enemy.x+(offset+(rank===0?0:-3))*(enemy.heading.x>=0?1:-1),y:enemy.y+(rank===1?-6:rank===2?6:0)};
  }
  effect(point: Point, kind: Effect['kind'], life: number, text = '') {
    this.effects.push({ id: ++this.id, ...point, kind, born: this.time, life, text });
  }

  meleeDamage(enemy:Enemy,amount:number,kind:DamageKind){
    const chance=this.baseEnemyStats(enemy).dodge;
    if(chance>0&&this.random()<chance)return false;
    this.damage(enemy,amount,kind);return true;
  }
  damage(enemy: Enemy, amount: number, kind: DamageKind, penetration=0,hit?:{bypass?:boolean;consume?:boolean;source?:string;noShieldHit?:boolean;achievement?:string}) {
    if (enemy.hp <= 0 || enemy.escaped || this.baseEnemyStats(enemy).raiseInvulnerable&&enemy.raiseAt!==undefined&&this.time-enemy.raiseAt<enemy.raiseDuration! || this.enemyImmune(enemy) || enemy.transformAt!==undefined || enemy.finisher&&enemy.finisher.phase!=='done') return;
    if(enemy.shield){
      if(hit?.bypass)enemy.shield=undefined;
      else {const shield=enemy.shield;if(!hit?.noShieldHit&&(!hit?.source||!shield.sources.has(hit.source))){if(hit?.source)shield.sources.add(hit.source);if(--shield.hits===0)enemy.shield=undefined;}return;}
    }
    if(kind==='electrical'&&this.random()<.1)amount*=2;
    const stats=this.effectiveEnemyStats(enemy);if(stats.immuneDamage?.includes(kind))return;
    const damage=damageAfterArmor(amount,Math.max(0,stats.armor-enemy.armorLoss-penetration),kind,stats.magicArmor);
    if(stats.damageTransform&&!hit?.consume&&!hit?.bypass&&this.time>=(enemy.heroStunUntil??0)&&this.time>=enemy.thornUntil&&enemy.hp-damage<=stats.health*stats.damageTransform.threshold){this.abilities.transform(enemy,damage);return;}
    if(stats.boss?.transform&&damage>=enemy.hp&&enemy.transformAt===undefined){enemy.transformAt=this.time;enemy.scriptAnimation=undefined;enemy.curse=undefined;enemy.poisonUntil=0;enemy.thornUntil=0;enemy.armorLoss=0;enemy.slowUntil=0;enemy.heroStunUntil=0;enemy.heroSlow=undefined;enemy.net=undefined;enemy.hitAt=null;enemy.rangedHitAt=null;for(const unit of this.attackers(enemy))this.release(unit);this.events.push({type:'sound',cue:stats.boss.transform.sound});return;}
    if(stats.boss?.finisher&&damage>=enemy.hp&&!enemy.finisher){enemy.finisher={phase:'death',at:this.time};enemy.hitAt=null;enemy.rangedHitAt=null;enemy.curse=undefined;enemy.poisonUntil=0;for(const unit of this.attackers(enemy))this.release(unit);this.events.push({type:'sound',cue:stats.deathSound});return;}
    if(stats.speedOnHit&&!enemy.boosted&&(!enemy.net||this.time>=enemy.net.until)&&(!enemy.heroStunUntil||this.time>=enemy.heroStunUntil)){enemy.boosted=true;enemy.boostUntil=this.time+stats.speedOnHit.duration;this.events.push({type:'sound',cue:stats.speedOnHit.sound});}
    enemy.hp = Math.max(0, enemy.hp-damage);
    if (enemy.hp === 0) {
      if(stats.boss?.silenceOnDeath)this.events.push({type:'bossFinish'});
      if(!enemy.finisher&&stats.deathSound)this.events.push({type:'sound',cue:stats.deathSound});
      if(!hit?.consume&&stats.deathSpawn&&!stats.deathSpawn.delay){const node=this.tracks[enemy.lane].cumulative.findIndex(d=>d>=enemy.distance);for(let i=0;i<stats.deathSpawn.count;i++)this.spawnAt(stats.deathSpawn.kind,enemy.lane,node,{x:enemy.x,y:enemy.y});}
      if(!hit?.consume)this.abilities.death(enemy);
      if(hit?.achievement)this.achievement(hit.achievement);
      if(!hit?.consume&&stats.deathBlast)this.deathBlasts.push({position:{x:enemy.x,y:enemy.y},config:stats.deathBlast,at:this.time+stats.deathBlast.delay});
      {const g=this.content.graveyard;if(g?.eligible.includes(enemy.kind))this.graveQueue.push({health:stats.health,at:this.time+g.delay});
      }
      this.endless?.onKill(enemy);
      enemy.deadAt = this.time;for(const id of ['FIRST_BLOOD','BLOODLUST','SLAYER','MULTIKILL'])this.achievement(id);this.kills++; this.gold += enemy.bounty;
      for(const soldier of this.attackers(enemy))this.release(soldier);
      this.effect({ x: enemy.x, y: enemy.y + 20 }, 'gold', .8, `+${enemy.bounty}`);
      if(stats.boss){if(stats.boss.stopSpawnsOnDeath){this.spawning=false;this.nextSpawn=this.level.waves[this.wave-1].spawns.length;}this.bossDefeatedAt=this.time;this.bossWinDelay=stats.boss.winDelay;this.events.push({type:"achievement",id:stats.boss.achievement,amount:1,award:true});if(stats.boss.clearOnDeath!==false){this.bombSpawners=[];this.eggs=[];this.projectiles=this.projectiles.filter(p=>p.kind!=='bossBomb'&&p.kind!=='missile');for(const other of this.enemies)if(other!==enemy&&other.hp>0){other.hp=0;other.deadAt=this.time;for(const unit of this.attackers(other))this.release(unit);}}}
    }
  }
  move(unit: Point, to: Point, amount: number) {
    const d = distance(unit, to);
    if (d <= amount) { unit.x = to.x; unit.y = to.y; return false; }
    unit.x += (to.x - unit.x) / d * amount; unit.y += (to.y - unit.y) / d * amount;
    return true;
  }

  step() {
    if (this.paused || this.finished) return;
    this.time += STEP;
    for(const prop of this.props){
      const wasComplete=prop.releaseComplete;prop.update(this.time,STEP,()=>this.propRandom());
      if(prop.pendingAchievement){this.achievement(prop.pendingAchievement);prop.pendingAchievement=null;}for(const cue of prop.pendingSounds.splice(0))this.events.push({type:'sound',cue});
      if(!wasComplete&&prop.releaseComplete&&prop.decoration.clickRelease?.achievementOnComplete)this.achievement(prop.decoration.clickRelease.achievement);
      const c=prop.decoration.presentation;
      if(c?.trigger&&prop.triggerAt===null&&this.enemies.some(e=>e.kind===c.trigger!.kind&&e.distance>=this.tracks[e.lane].cumulative[c.trigger!.node]))prop.triggerAt=this.time;
      if(c?.activeRoutes){const active=this.level.waves.slice(Math.max(0,this.wave-1),this.wave+1).some(w=>w.spawns.some(s=>c.activeRoutes!.includes(s.path)));prop.ambientAlpha=Math.max(0,Math.min(1,prop.ambientAlpha+(active?1:-1)*STEP/c.fade!));}
    }
    this.updateWaves();
    this.pointSpawner.update();
    this.updateTunnels();
    for(const sound of this.delayedSounds.filter(s=>this.time>=s.at))this.events.push({type:'sound',cue:sound.cue});this.delayedSounds=this.delayedSounds.filter(s=>this.time<s.at);
    for(const tower of this.towers){const s=tower.seal;if(!s)continue;const c=s.config,age=this.time-s.born;if(s.endAt===null&&age>=c.startDuration+c.clickTime){if(!s.trapped){s.trapped=true;this.events.push({type:'sound',cue:c.blockedSound});}if(age>=c.startDuration+c.clickTime+c.holdDuration){s.endAt=this.time;this.events.push({type:'sound',cue:c.releasedSound});}}if(s.endAt!==null&&this.time-s.endAt>=c.removeDuration)tower.seal=undefined;}
    this.abilities.update(this.waveStarted,this.spawning);
    this.endless?.update();
    this.updateTowers();
    this.updateSoldiers();
    if(this.heroEnabled){if(this.heroController)this.heroController.update();else if(this.hero.hp>0&&this.hero.stun&&this.time<this.hero.stun.until)this.hero.animation='idle';else this.updateHero();}
    this.updateEnemies();
    this.updateLevelSpawns();
    this.story?.update(this);
    this.updateChains();
    this.updateEggs();
    this.updateBossSpawners();
    this.updateRays();
    this.updateAbilityRays();
    this.updateProjectiles();
    for(const scorch of this.scorches)if(this.time>=scorch.tick){scorch.tick+=1;for(const e of this.enemies)if(inRange(scorch,e,65))this.damage(e,this.roll(this.stats.levels.thunder>=4?[20,30]:[10,20]),'physical');}
    this.scorches=this.scorches.filter(s=>this.time-s.born<s.duration);
    this.effects = this.effects.filter(e => this.time - e.born < e.life);
    this.enemies = this.enemies.filter(e => !e.escaped && (e.deadAt === null || this.time - e.deadAt < (this.baseEnemyStats(e).boss?.deathLifetime??1.2)));
    if (this.lives <= 0) { this.lives = 0; this.outcome = 'defeat'; this.events.push({ type: 'defeat' }); }
    else if (!this.endless && this.wave === this.level.waves.length && !this.spawning && !this.enemies.some(e => e.hp > 0)&&!this.pointSpawner.pending&&!this.abilities.deathSpawns.length&&(!this.story||!this.story.pending)&&!this.swampQueue.length&&!this.abilities.bursts.length&&this.tunnelPassengers.length===0&&!this.eggs.some(e=>e.spawned<e.config.count)&&!this.bombSpawners.some(e=>e.spawned<7)&&!this.graveQueue.length&&(this.bossDefeatedAt===null||this.time-this.bossDefeatedAt>=this.bossWinDelay)) {
      this.outcome = 'victory'; this.events.push({ type: 'victory' });
    }
  }

  private updateWaves() {
    if (this.spawning) {
      const wave = this.level.waves[this.wave - 1];
      while (this.nextSpawn < wave.spawns.length && this.time - this.waveStarted + 1e-8 >= wave.spawns[this.nextSpawn].time) {
        const spawn = wave.spawns[this.nextSpawn++];
        const route=this.content.routes[spawn.path];
        const lane=route[spawn.lane===null?Math.floor(this.random()*route.length):spawn.lane];
        this.addEnemy(spawn.kind,lane);
        if(!this.seen.has(spawn.kind)){this.seen.add(spawn.kind);this.events.push({type:'seen',enemy:spawn.kind});}
        this.spawned++;
      }
      if (this.nextSpawn === wave.spawns.length) { this.spawning = false; this.waveFinishedAt = this.time;if(this.endless)this.level.waves.push(this.endless.waves.next(this.wave+1)); }
    } else if (this.wave > 0 && this.wave < this.level.waves.length && this.nextWaveIn <= 0) this.sendWave(false);
  }

  private addEnemy(kind:EnemyKind,lane:number,announceBoss=true){
    const egg=this.enemyStats[kind].eggs,cooldown=egg?egg.cooldown[0]+this.random()*(egg.cooldown[1]-egg.cooldown[0]):0;
    const enemy:Enemy={buffCast:this.enemyStats[kind].buff?{readyAt:this.time+this.enemyStats[kind].buff!.cooldown,loop:0,started:-100,hitAt:null}:undefined,regenAt:this.time+(this.enemyStats[kind].regen?.interval??6/30),rangedAt:this.time,rangedHitAt:null,rangedTarget:null,rangedStarted:-100,missileAt:this.time+11,bombAt:this.time+4,bossShot:null,teleportCount:0,id:++this.id,kind,...this.tracks[lane].points[0],lane,distance:0,hp:this.enemyStats[kind].health,bounty:this.enemyStats[kind].bounty,born:this.time,
      armorLoss:0,slowUntil:0,heading:{x:0,y:-1},blockedBy:null,attackAt:0,hitAt:null,attackStarted:-100,deadAt:null,escaped:false,dodgeAt:null,
      healAt:this.time+8,healCastAt:null,healStarted:-100,eggAt:this.time+cooldown,eggCooldown:cooldown,eggsLaid:0,poisonUntil:0,poisonAt:0,poisonDamage:0,thornAt:-100,thornUntil:0,thornTick:0,thornCount:0};
    if(this.enemyStats[kind].barrage)enemy.barrage={at:-100,next:this.time+this.enemyStats[kind].barrage!.cooldown,hit:true,targets:[]};
    const rest=this.enemyStats[kind].restHeal;if(rest)enemy.restHeal={at:-100,next:this.time+rest.cooldown,choice:0,hit:true};
    if(this.enemyStats[kind].damageAura)enemy.auraAt=this.time;
    const shield=this.enemyStats[kind].shield;if(shield)enemy.shieldCast={next:this.time+shield.cooldown,at:-100,hit:true};
    const summon=this.enemyStats[kind].summon;if(summon)enemy.summonCast={next:this.time+summon.cooldown,at:-100,count:summon.offsets.length};
    const freeze=this.enemyStats[kind].boss?.freeze;if(freeze)enemy.freezeCast={next:this.time+freeze.cooldown,at:-100,targets:[],hit:false};
    enemy.summons=this.content.bossSpawns?.flatMap((c,index)=>c.owner===kind?[{index,next:this.time+c.cooldown+c.delay}]:[]);
    this.abilities.add(enemy);
    if(this.endless){const stats=this.endless.waves.stats(kind,this.enemyStats[kind],this.wave);enemy.scaledStats={kind,stats};enemy.hp=stats.health;enemy.bounty=stats.bounty;}
    this.enemies.push(enemy);if(announceBoss&&this.enemyStats[kind].boss)this.events.push({type:'bossIntro'});return enemy;
  }
  private updateEggs(){
    for(const egg of this.eggs){
      if(egg.spawned>=egg.config.count||this.time<egg.born+egg.config.hatch+egg.spawned*egg.config.interval)continue;
      const route=this.content.routes.find(r=>r.includes(egg.lane))!,lane=route[egg.spawned++],track=this.tracks[lane];
      const node=Math.min(egg.node+egg.config.nodeOffset,track.points.length-1),e=this.addEnemy(egg.config.kind,lane);
      e.distance=track.cumulative[node];e.x=egg.x;e.y=egg.y+1;e.bounty=0;this.spawned++;
    }
    this.eggs=this.eggs.filter(e=>this.time-e.born<e.config.hatch+e.config.interval*e.config.count+4);
  }
  private updateThorns(tower:Tower){
    const targets=()=>this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&!this.enemyFlying(e)&&!this.controlImmune(e)&&!this.baseEnemyStats(e).thornImmune&&e.thornCount<3&&this.time>=e.thornUntil&&inRange(tower.pad.position,e,200));
    if(tower.thornHitAt!==null&&this.time>=tower.thornHitAt){
      tower.thornHitAt=null;const enemies=targets();
      if(enemies.length>=2){this.events.push({type:'sound',cue:'ThornSound'});for(const e of enemies.slice(0,2+2*tower.thorn)){
        e.thornAt=this.time;e.thornUntil=this.time+18/30+tower.thorn+6/30;e.thornTick=this.time+18/30+1;e.thornCount++;e.hitAt=null;e.healCastAt=null;
      }}
    }
    if(this.time>=tower.thornAt&&tower.thornHitAt===null&&targets().length>=2){tower.thornStarted=this.time;tower.thornAt=this.time+8+34/30;tower.thornHitAt=this.time+17/30;}
  }
  damageAlly(unit:Soldier|Hero,amount:number,kind:DamageKind='physical'){
    if(unit.hp<=0||unit.deadAt!==null||unit===this.hero&&this.heroController?.invulnerable)return;
    const hero=unit===this.hero,s=unit as Soldier,armor=hero?this.heroArmor:this.soldierStats(s).armor+(this.time<s.courageUntil?.05*s.courageLevel:0);
    unit.hp=Math.max(0,unit.hp-damageAfterArmor(amount,armor,kind));if(hero)this.hero.lastHit=this.time;
    if(unit.hp===0){unit.deadAt=this.time;if(!hero&&this.content.swamp)this.swampQueue.push({health:this.soldierStats(s).health,at:this.time+this.content.swamp.delay});if(!hero&&s.profile){const guardian=this.towers.find(t=>t.pad.id===s.towerId)?.extension?.guardian;if(guardian)this.events.push({type:'sound',cue:guardian.sound});}this.achievement('CANNON_FODDER');this.release(unit);if(hero){const h=this.hero;h.animation='death';h.animationAt=this.time;h.waypoints=[];h.courageHitAt=null;this.events.push({type:'heroDeath'});}}
  }
  private updateEnemyRanged(enemy:Enemy){
    const stats=this.baseEnemyStats(enemy),boss=stats.boss?.siege,ranged=stats.ranged;
    if(!boss&&!ranged)return false;
    const units=()=>[this.hero,...this.soldiers].filter(s=>s.hp>0&&s.deadAt===null);
    if(enemy.rangedHitAt!==null&&this.time>=enemy.rangedHitAt){
      enemy.rangedHitAt=null;
      if(boss&&enemy.bossShot==='bomb'){
        // Source get_random_position(20, TERRAIN_LAND, NF_RANGE, 30): keep
        // the payload twenty nodes inside the visible route and before its exit.
        const bounds=this.level.worldBounds,inside=(p:Point)=>p.x>=bounds.x&&p.x<=bounds.x+bounds.width&&p.y>=bounds.y&&p.y<=bounds.y+bounds.height;
        const nodes=this.tracks.flatMap(track=>{
          const first=track.points.findIndex(inside),start=first+(first===0?0:track.points[0].y>768?2:1);
          const defend=track.points.reduce((best,p,i)=>distance(p,this.content.heroSpawn)<distance(track.points[best],this.content.heroSpawn)?i:best,0);
          return track.points.slice(start+20,defend-20+1);
        }).filter(p=>this.navigation.rallyTarget(p));const end=nodes[Math.floor(this.random()*nodes.length)];
        const start={x:enemy.x+(enemy.heading.x<0?30:-30),y:enemy.y+82},flight=45/30+distance(start,end)*.025/30;
        this.projectiles.push({id:++this.id,kind:'bossBomb',start,end:{...end},born:this.time,due:this.time+flight,target:enemy.id,damage:0,damageKind:'physical',radius:0});
      }else{
        const target=units().find(s=>s.id===enemy.rangedTarget);
        if(target){
          const start={x:enemy.x+(boss?(enemy.heading.x<0?30:-30):ranged!.offset.x),y:enemy.y+(boss?82:ranged!.offset.y)},end=boss?{x:start.x+12,y:start.y+170}:{x:target.x,y:target.y+12};
          this.projectiles.push({id:++this.id,kind:boss?'missile':'enemyArrow',start,end,position:boss||ranged?.speed?{...start}:undefined,speed:boss?300:ranged?.speed?30:undefined,velocity:boss?{x:300*12/Math.hypot(12,170),y:300*170/Math.hypot(12,170)}:undefined,launched:false,turnDirection:1,born:this.time,due:boss||ranged?.speed?Infinity:this.time+ranged!.flight,target:target.id,damage:boss?250:this.roll(ranged!.damage),damageKind:boss?'physical':ranged!.damageKind,radius:ranged?.radius??0,arc:ranged?.arc,hitSound:ranged?.hitSound,...(!boss?{frog:ranged!.frog,dot:ranged!.dot,texture:ranged!.texture,rotation:ranged!.rotation,animation:ranged!.animation,maxSpeed:ranged!.speed,hitEffect:ranged!.hitEffect}:{})});
          this.events.push({type:'sound',cue:boss?'RocketLaunchSound':ranged!.sound});
        }
      }
    }
    const duration=boss?48/30:ranged!.duration;
    if(this.time-enemy.rangedStarted<duration)return true;
    if(boss){
      const target=units().filter(s=>!inRange(enemy,s,100)).sort((a,b)=>distance(enemy,a)-distance(enemy,b))[0];
      if(this.time>=enemy.missileAt&&target){enemy.bossShot='missile';enemy.rangedTarget=target.id;enemy.missileAt=this.time+duration+11;}
      else if(this.time>=enemy.bombAt){enemy.bossShot='bomb';enemy.bombAt=this.time+duration+4;}
      else return false;
      enemy.rangedStarted=this.time;enemy.rangedHitAt=this.time+24/30;enemy.hitAt=null;return true;
    }
    if(enemy.blockedBy===null){
      const target=units().filter(s=>inRange(enemy,s,ranged!.range)&&!inRange(enemy,s,ranged!.minRange)).sort((a,b)=>distance(enemy,a)-distance(enemy,b))[0];
      if(target){if(this.time<enemy.rangedAt)return !!ranged!.holdAdvance;enemy.rangedTarget=target.id;enemy.rangedAt=this.time+ranged!.cooldown;enemy.rangedStarted=this.time;enemy.rangedHitAt=this.time+ranged!.windup;return true;}
    }
    return false;
  }
  private updateBossSpawners(){
    for(const spawner of this.bombSpawners){
      if(spawner.spawned>=7||this.time<spawner.born+spawner.spawned*6/30)continue;
      const route=this.content.routes.find(r=>r.includes(spawner.lane))!,lane=route[spawner.spawned%3],track=this.tracks[lane];spawner.spawned++;
      const node=Math.min(spawner.node+2,track.points.length-1),e=this.addEnemy('enemy_golem_head',lane);e.distance=track.cumulative[node];e.x=spawner.position.x;e.y=spawner.position.y;const previous=track.points[node-1],point=track.points[node];e.heading={x:point.x-previous.x,y:point.y-previous.y};this.spawned++;
    }
    this.bombSpawners=this.bombSpawners.filter(s=>this.time-s.born<7*6/30+4);
  }
  private updateArcane(tower:Tower){
    const stats=this.towerStats(tower),targets=()=>this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&inRange(tower.pad.position,e,stats.range)).sort((a,b)=>this.remainingDistance(a)-this.remainingDistance(b));
    const eligible=(e:Enemy)=>tower.arcaneMode==='ray'||!this.controlImmune(e)&&(tower.arcaneMode==='disintegrate'||e.teleportCount<3&&e.distance>=this.tracks[e.lane].cumulative[15]);
    if(tower.releaseAt!==null&&this.time>=tower.releaseAt){
      tower.releaseAt=null;const enemy=targets().find(eligible);
      if(enemy){
        if(tower.arcaneMode==='teleport'){
          this.events.push({type:'sound',cue:'TeleporthSound'});this.effect(enemy,'teleport',23/30);
          for(const e of targets().filter(e=>eligible(e)&&inRange(enemy,e,32.5)).slice(0,3+tower.teleport)){
            const track=this.tracks[e.lane],node=track.cumulative.findIndex(n=>n>=e.distance),offset=-26+Math.floor(this.random()*10)-5*(tower.teleport-1);
            for(const unit of this.attackers(e))this.release(unit);const to=Math.max(1,node+offset);e.distance=track.cumulative[to];e.x=track.points[to].x;e.y=track.points[to].y;e.teleportCount++;e.hitAt=null;this.effect(e,'teleport',7/30);
          }
        }else{
          const damage=this.roll(stats.damage),extra=Math.max(0,damage-enemy.hp),tick=Math.floor((damage-extra)/5);
          this.rays.push({id:++this.id,from:{x:tower.pad.position.x,y:tower.pad.position.y+76},target:enemy.id,born:this.time,next:this.time+2/30,ticks:0,damage:tick,first:damage-extra-tick*5,extra,disintegrate:tower.arcaneMode==='disintegrate',source:'tower:'+tower.pad.id});
          this.events.push({type:'sound',cue:tower.arcaneMode==='disintegrate'?'DesintegrateSound':'ArcaneRaySound'});
        }
      }
    }
    if(this.time<tower.readyAt||tower.releaseAt!==null)return;
    const all=targets();
    tower.arcaneMode=tower.disintegrate>0&&this.time>=tower.disintegrateAt&&all.some(e=>!this.controlImmune(e))?'disintegrate':tower.teleport>0&&this.time>=tower.teleportAt&&all.some(e=>!this.controlImmune(e)&&e.teleportCount<3&&e.distance>=this.tracks[e.lane].cumulative[15])?'teleport':'ray';
    const target=all.find(eligible);if(!target)return;
    tower.target=target.id;tower.shotAt=this.time;tower.readyAt=this.time+2;tower.aimUp=target.y>tower.pad.position.y;tower.releaseAt=this.time+(tower.arcaneMode==='teleport'?4/30+5/30:20/30);
    if(tower.arcaneMode==='disintegrate')tower.disintegrateAt=this.time+22-2*tower.disintegrate;
    if(tower.arcaneMode==='teleport')tower.teleportAt=this.time+10;
  }
  private updateRays(){
    for(const ray of this.rays){
      const enemy=this.enemies.find(e=>e.id===ray.target&&e.hp>0&&!e.escaped);if(!enemy)continue;
      if(ray.disintegrate){if(this.time-ray.born>=10/30)this.damage(enemy,enemy.hp,'true',0,{bypass:true,consume:true});continue;}
      if(this.time>=ray.next&&ray.ticks<5){this.damage(enemy,ray.damage+(ray.ticks===0?ray.first:0),'magic',0,{source:ray.source});ray.ticks++;ray.next+=2/30;if(ray.ticks===5)this.damage(enemy,ray.extra,'magic',0,{source:ray.source});}
    }
    this.rays=this.rays.filter(r=>this.time-r.born<=10/30);
  }

  validTargetNode(enemy:Enemy){
    if(enemy.dormant||(enemy.clone||this.baseEnemyStats(enemy).raiseInvulnerable)&&enemy.raiseAt!==undefined&&this.time-enemy.raiseAt<enemy.raiseDuration!||enemy.finisher||enemy.transformAt!==undefined)return false;
    return !this.content.invalidRanges.some(r=>this.content.routes[r.route].includes(enemy.lane)&&enemy.distance>=this.tracks[enemy.lane].cumulative[r.from]&&enemy.distance<=this.tracks[enemy.lane].cumulative[r.to]);
  }
  remainingDistance(enemy:Enemy){
    const tunnel=this.content.tunnels.find(t=>this.content.routes[t.from].includes(enemy.lane));
    if(!tunnel)return this.tracks[enemy.lane].length-enemy.distance;
    const exit=this.tracks[this.content.routes[tunnel.to][this.content.routes[tunnel.from].indexOf(enemy.lane)]];
    return this.tracks[enemy.lane].cumulative[tunnel.pickNode]-enemy.distance+exit.length-exit.cumulative[tunnel.placeNode];
  }
  private updateTunnels(){
    for(const passenger of this.tunnelPassengers){
      if(this.time<passenger.releaseAt)continue;
      const {enemy,lane,node}=passenger,track=this.tracks[lane],p=track.points[node],next=track.points[node+1];
      Object.assign(enemy,{lane,distance:track.cumulative[node],x:p.x,y:p.y,heading:{x:next.x-p.x,y:next.y-p.y},regenAt:this.time+(this.baseEnemyStats(enemy).regen?.interval??6/30),rangedAt:this.time,attackAt:this.time});
      this.enemies.push(enemy);
    }
    this.tunnelPassengers=this.tunnelPassengers.filter(p=>this.time<p.releaseAt);
  }
  private updateMusketeer(tower:Tower){
    const stats=this.towerStats(tower),base=tower.pad.position;
    if(tower.releaseAt!==null&&this.time>=tower.releaseAt){
      tower.releaseAt=null;
      const enemy=this.enemies.find(e=>e.id===tower.target&&e.hp>0&&!e.escaped);
      if(enemy){
        const start={x:base.x+(tower.shooter?8:-8)+(tower.aimUp?6:4)*(enemy.x>base.x?1:-1),y:base.y+56+(tower.aimUp?8:-5)};
        if(tower.musketMode==='shrapnel'){
          const speed=enemy.blockedBy===null?this.baseEnemyStats(enemy).speed:0,heading=Math.hypot(enemy.heading.x,enemy.heading.y);
          const predicted={x:enemy.x+enemy.heading.x/heading*speed*6/30,y:enemy.y+enemy.heading.y/heading*speed*6/30};
          this.effect(start,'rifleSmoke',12/30);
          for(let i=0;i<6;i++){
            const flight=(4+this.random()*4)/30,spread=12.5+this.random()*20,angle=i*Math.PI/3;
            const end={x:predicted.x+Math.cos(angle)*spread,y:predicted.y+Math.sin(angle)*spread*ASPECT};
            this.projectiles.push({id:++this.id,kind:'shrapnel',start,end,target:null,born:this.time,due:this.time+flight,damage:this.roll([10*tower.shrapnel,40*tower.shrapnel]),damageKind:'explosion',radius:48});
            this.events.push({type:'sound',cue:'ShrapnelSound'});
          }
        }else if(distance(base,enemy)<=(tower.musketMode==='sniper'?stats.range*1.5:stats.range)){
          const sniper=tower.musketMode==='sniper',end={x:enemy.x,y:enemy.y+this.effectiveEnemyStats(enemy).hitOffset};
          this.projectiles.push({id:++this.id,kind:'musket',start,position:{...start},end,target:enemy.id,born:this.time,due:Infinity,damage:this.roll(sniper?[35,65]:stats.damage)+(sniper?.2*tower.sniper*this.baseEnemyStats(enemy).health:0),damageKind:'shot',radius:0,instakill:sniper&&tower.sniperKill,ignorePrecision:sniper});
          this.effect(start,'rifleSmoke',12/30);this.events.push({type:'sound',cue:sniper?'SniperSound':'ShotgunSound'});
        }
      }
    }
    if(tower.releaseAt!==null||this.time<tower.readyAt)return;
    const targets=this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)).sort((a,b)=>this.remainingDistance(a)-this.remainingDistance(b));
    let target:Enemy|undefined;
    tower.musketMode='shot';
    if(tower.sniper>0&&this.time>=tower.sniperAt){target=targets.find(e=>!this.controlImmune(e)&&inRange(base,e,stats.range*1.5));if(target){tower.musketMode='sniper';tower.sniperAt=this.time+14;tower.sniperKill=this.random()<.2*tower.sniper;this.effects.push({id:++this.id,kind:'crosshair',target:target.id,x:target.x,y:target.y,born:this.time,life:1,text:''});}}
    if(!target&&tower.shrapnel>0&&this.time>=tower.shrapnelAt){target=targets.find(e=>!this.enemyFlying(e)&&inRange(base,e,stats.range*.5));if(target){tower.musketMode='shrapnel';tower.shrapnelAt=this.time+9;}}
    if(!target)target=targets.find(e=>inRange(base,e,stats.range));
    if(!target)return;
    tower.target=target.id;tower.shotAt=this.time;tower.shooter^=1;tower.aimUp=target.y>base.y+56;
    tower.releaseAt=this.time+({shot:6,sniper:22,shrapnel:16}[tower.musketMode])/30;
    tower.readyAt=this.time+stats.cooldown;
  }

  private predictEnemy(enemy:Enemy,seconds:number){
    const track=this.tracks[enemy.lane],travel=enemy.blockedBy===null?this.baseEnemyStats(enemy).speed*seconds:0,d=Math.min(track.length,enemy.distance+travel);
    let n=1;while(n<track.cumulative.length-1&&track.cumulative[n]<d)n++;
    const a=track.points[n-1],b=track.points[n],t=(d-track.cumulative[n-1])/(track.cumulative[n]-track.cumulative[n-1]);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  }
  private updateArtilleryAbility(tower:Tower){
    const config=tower.extension!.artillery!,state=tower.artillery!,stats=this.towerStats(tower),ranks=tower.powerLevels!,origin={x:tower.pad.position.x,y:tower.pad.position.y+12};
    const missileRank=ranks[config.missile.power],clusterRank=ranks[config.cluster.power];
    const targets=(range:number,air:boolean)=>this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&(air||!this.enemyFlying(e))&&inRange(origin,e,range)).sort((a,b)=>this.remainingDistance(a)-this.remainingDistance(b));
    if(tower.releaseAt!==null&&this.time>=tower.releaseAt){
      tower.releaseAt=null;
      const missile=state.mode==='missile',cluster=state.mode==='cluster',range=missile?config.missile.range*(1+config.missile.rangeInc*missileRank):stats.range;
      const target=targets(range,missile)[0],end=target?this.predictEnemy(target,cluster?config.cluster.prediction:config.prediction):state.aim;
      if(inRange(origin,end,range)){
        const offset=missile?config.missile.offset:config.offset,start={x:tower.pad.position.x+offset.x,y:tower.pad.position.y+offset.y};
        if(missile){
          const a=config.missile,v=a.launch,length=Math.hypot(v.x,v.y);
          this.projectiles.push({id:++this.id,kind:'missile',targetsEnemies:true,start,position:{...start},end:{x:start.x+v.x,y:start.y+v.y},speed:300,velocity:{x:300*v.x/length,y:300*v.y/length},launched:false,turnDirection:1,target:target?target.id:tower.target,born:this.time,due:Infinity,damage:a.damage[1]+a.damageInc*missileRank,damageRange:a.damage.map(d=>d+a.damageInc*missileRank) as [number,number],damageKind:'explosion',radius:a.radius});
          this.events.push({type:'sound',cue:'RocketLaunchSound'});this.achievement('ROCKETEER');
        }else if(cluster){
          const c=config.cluster,lane=target?target.lane:state.lane,route=this.content.routes.find(r=>r.includes(lane))!,centerLane=route[0],track=this.tracks[centerLane];
          const node=track.points.reduce((best,p,i)=>distance(p,end)<distance(track.points[best],end)?i:best,0),ground=track.points[node];
          this.projectiles.push({id:++this.id,kind:'cluster',start,end:{x:ground.x,y:ground.y+c.offset},target:null,born:this.time,due:this.time+c.flight,damage:0,damageKind:'explosion',radius:0,texture:config.texture,cluster:{...c,count:c.count+c.countInc*clusterRank,lane:centerLane,node}});this.events.push({type:'sound',cue:'BombShootSound'});
        }else{
          this.projectiles.push({id:++this.id,kind:'bomb',start,end,target:null,born:this.time,due:this.time+config.flight,damage:stats.damage[1],damageRange:stats.damage,hitFlying:true,damageKind:stats.damageKind,radius:stats.radius,texture:config.texture});this.events.push({type:'sound',cue:'BombShootSound'});
        }
      }
    }
    if(tower.releaseAt!==null||this.time<state.animationUntil)return;
    const ground=targets(stats.range,false),missiles=missileRank?targets(config.missile.range*(1+config.missile.rangeInc*missileRank),true):[];
    let target:Enemy|undefined;
    if(missileRank&&this.time>=state.missileAt&&missiles.length){state.mode='missile';target=missiles[0];state.missileAt=this.time+(ground.length?config.missile.cooldown:config.missile.flyingCooldown);}
    else if(this.time>=tower.readyAt&&ground.length){target=ground[0];state.mode=clusterRank&&this.time>=state.clusterAt?'cluster':'bomb';tower.readyAt=this.time+stats.cooldown;if(state.mode==='cluster')state.clusterAt=this.time+config.cluster.cooldown;}
    if(!target)return;
    state.aim=this.predictEnemy(target,state.mode==='cluster'?config.cluster.prediction:config.prediction);state.lane=target.lane;tower.target=target.id;tower.shotAt=this.time;
    tower.releaseAt=this.time+(state.mode==='missile'?config.missile.windup:config.windup);state.animationUntil=this.time+(state.mode==='missile'?config.missile.duration:tower.extension!.presentation.shootDuration);
  }
  private unitArea(soldier:Soldier):AreaAttack|undefined{
    const profile=soldier.profile;if(!profile)return;
    if(profile.area)return {...profile.area,damage:this.soldierStats(soldier).damage};
    if(profile.areaPower){const a=profile.areaPower,rank=this.towers.find(t=>t.pad.id===soldier.towerId)!.powerLevels![a.power];if(rank>0)return {...a,damage:a.damage.map(d=>d+a.damageInc*rank) as [number,number]};}
  }
  private unitAreaAttack(soldier:Soldier){
    const a=this.unitArea(soldier)!,point={x:soldier.x+(soldier.flip?-a.offset:a.offset),y:soldier.y};
    const targets=this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&!this.enemyFlying(e)&&inRange(point,e,a.radius));
    for(const e of a.count?targets.slice(0,a.count):targets)this.damage(e,this.abilities.outgoingDamage(soldier,this.roll(a.damage)),'physical');
    if(a.sound)this.events.push({type:'sound',cue:a.sound});if(a.effect)this.sourceEffect(point,a.effect,a.duration);
  }
  private rangedUnitTarget(accept:(enemy:Enemy)=>boolean){
    let target:Enemy|undefined,flightPriority=Infinity,remaining=Infinity;
    for(const enemy of this.enemies){
      if(enemy.hp<=0||enemy.escaped||!this.validTargetNode(enemy)||!accept(enemy))continue;
      const priority=Number(!this.enemyFlying(enemy)),distance=this.remainingDistance(enemy);
      if(priority<flightPriority||priority===flightPriority&&distance<remaining){target=enemy;flightPriority=priority;remaining=distance;}
    }
    return target;
  }
  private updateUnitRanged(soldier:Soldier){
    const profile=soldier.profile!,tower=this.towers.find(t=>t.pad.id===soldier.towerId)!,ranks=tower.powerLevels!,a=profile.rangedPower,n=profile.netPower;
    if(soldier.rangedHitAt!==null&&this.time>=soldier.rangedHitAt){
      soldier.rangedHitAt=null;const enemy=this.enemies.find(e=>e.id===soldier.rangedTarget&&e.hp>0&&!e.escaped);if(enemy){
        const end={x:enemy.x,y:enemy.y+this.effectiveEnemyStats(enemy).hitOffset},start={x:soldier.x,y:soldier.y+12};
        if(soldier.rangedMode==='net'){
          this.projectiles.push({id:++this.id,kind:'net',start,position:{...start},end,target:enemy.id,born:this.time,due:Infinity,speed:n!.speed,damage:0,damageKind:'physical',radius:0,animation:n!.animation,slow:{factor:n!.factors[ranks[n!.power]-1],duration:n!.duration,effect:n!.effect}});this.events.push({type:'sound',cue:n!.sound});
        }else{
          const predicted=this.predictEnemy(enemy,a!.flight);end.x=predicted.x;end.y=predicted.y+this.effectiveEnemyStats(enemy).hitOffset;
          this.projectiles.push({id:++this.id,kind:'arrow',start,end,target:enemy.id,born:this.time,due:this.time+a!.flight,damage:this.abilities.outgoingDamage(soldier,this.roll(a!.damage)+a!.damageInc*ranks[a!.power]),damageKind:a!.damageKind,radius:0,texture:a!.texture,rotation:a!.rotation,ignorePrecision:true});this.events.push({type:'sound',cue:a!.sound});
        }
      }
    }
    if(soldier.rangedHitAt!==null||this.time-soldier.rangedStarted<(a?.duration??12/30))return true;
    let target:Enemy|undefined;
    if(a&&ranks[a.power]>0&&this.time>=soldier.rangedAt){target=this.rangedUnitTarget(e=>inRange(soldier,e,a.range+a.rangeInc*ranks[a.power])&&!inRange(soldier,e,a.minRange));if(target){soldier.rangedMode='projectile';soldier.rangedAt=this.time+a.cooldown;soldier.rangedHitAt=this.time+a.windup;}}
    if(!target&&n&&ranks[n.power]>0&&this.time>=soldier.netAt!){target=this.rangedUnitTarget(e=>this.enemyFlying(e)&&(!e.net||this.time>=e.net.until)&&this.time>=e.slowUntil&&(!e.heroSlow||this.time>=e.heroSlow.until)&&inRange(soldier,e,n.range)&&!inRange(soldier,e,n.minRange));if(target){soldier.rangedMode='net';soldier.netAt=this.time+n.cooldown;soldier.rangedHitAt=this.time+n.windup;}}
    if(!target)return false;
    soldier.rangedTarget=target.id;soldier.rangedStarted=this.time;soldier.flip=target.x<soldier.x;soldier.hitAt=null;return true;
  }

  private updateTowers() {
    for (const tower of this.towers) {
      if(tower.frozen&&tower.frozen.endAt!==null&&this.time>=tower.frozen.endAt+tower.frozen.config.endDuration+2)tower.frozen=undefined;
      if (this.time < tower.builtAt||this.isTowerBlocked(tower)) continue;
      if(tower.manual){this.updateManualTower(tower);continue;}
      if(tower.extension?.guardian)this.updateGuardian(tower);
      if(!tower.announced){tower.announced=true;for(const id of ['EASY_TOWER_BUILDER','MEDIUM_TOWER_BUILDER','HARD_TOWER_BUILDER'])this.achievement(id);this.events.push({type:'sound',cue:tower.extension?tower.extension.taunt:tower.special==='musketeer'?'ArcherMusketeerTaunt':tower.tier===4?({archer:'ArcherRangerTaunt',mage:'MageArcaneTaunt',barrack:'BarrackPaladinTaunt',artillery:'EngineerTaunt'} as const)[tower.kind]:({archer:'ArcherTaunt',mage:'MageTaunt',artillery:'EngineerTaunt',barrack:'BarrackTaunt'} as const)[tower.kind]});}
      if (tower.kind === 'barrack') {
        if(tower.camp){
          while(tower.recruits>0){const camp=tower.camp;this.addSoldier({x:tower.pad.position.x+camp.spawn.x,y:tower.pad.position.y+camp.spawn.y},tower.rallyPoint,tower.rallyPoint,tower.pad.id,0);tower.recruits--;this.events.push({type:'sound',cue:camp.ready});this.achievement(camp.achievement);}continue;
        }
        if(tower.special==='elf'){
          if(tower.recruits&&tower.door==='closed'){tower.door='opening';tower.doorAt=this.time;}
          if(tower.door==='opening'&&this.time-tower.doorAt>=5/30){tower.door='open';tower.doorAt=this.time;while(tower.recruits>0){const used=this.soldiers.filter(s=>s.towerId===tower.pad.id&&s.deadAt===null).map(s=>s.variant);const i=[0,1,2,3].find(i=>!used.includes(i))!;this.addSoldier(tower.pad.position,this.formation(tower.rallyPoint,i,4),tower.rallyPoint,tower.pad.id,i);tower.recruits--;this.events.push({type:'sound',cue:'ElfTaunt'});}}
          if(tower.door==='open'&&this.time-tower.doorAt>.5){tower.door='closing';tower.doorAt=this.time;}
          if(tower.door==='closing'&&this.time-tower.doorAt>=4/30)tower.door='closed';
          continue;
        }
        if(tower.door==='closing') {
          if(this.time-tower.doorAt>=4/30)tower.door='closed';
          else continue;
        }
        const pending=[0,1,2].filter(i=>{
          const s=this.soldiers.find(s=>s.towerId===tower.pad.id&&s.variant===i);
          return !s||(s.deadAt!==null&&this.time-s.deadAt>=(tower.extension?this.extensionStats.get(tower.extension.id)!.soldier.respawn:this.statsForTier(tower.tier).soldier.respawn));
        });
        if(pending.length&&tower.door==='closed'){
          tower.door='opening';tower.doorAt=this.time;this.events.push({type:'doorOpen'});
        }
        if(tower.door==='opening'&&this.time-tower.doorAt>=5/30){tower.door='open';tower.doorAt=this.time;}
        if(tower.door==='open') {
          for(const i of pending){
            this.soldiers=this.soldiers.filter(s=>s.towerId!==tower.pad.id||s.variant!==i);
            this.addSoldier(tower.pad.position,this.formation(tower.rallyPoint,i),tower.rallyPoint,tower.pad.id,i);
          }
          tower.deployed=true;
          if(this.time-tower.doorAt>.5){tower.door='closing';tower.doorAt=this.time;}
        }
        continue;
      }
      if(tower.extension?.chain){this.updateChainTower(tower);continue;}
      if(tower.extension?.spell){this.updateSpellTower(tower);continue;}
      if(tower.extension?.artillery){this.updateArtilleryAbility(tower);continue;}
      if(tower.special==='musketeer'){this.updateMusketeer(tower);continue;}
      if(tower.tier===4&&tower.kind==='mage'){this.updateArcane(tower);continue;}
      if(tower.thorn>0)this.updateThorns(tower);
      const config = this.towerStats(tower);
      if (tower.releaseAt !== null && this.time >= tower.releaseAt) {
        const target = this.enemies.find(e => e.id === tower.target && e.hp > 0 && !e.escaped);
        if (target) {
          const start = { x: tower.pad.position.x + (tower.kind === 'archer' ? (tower.shooter % 2 ? 10 : -10) : 0), y: tower.pad.position.y + (tower.kind === 'mage' ? ([0,63,66,70][tower.tier]) : [0,50,53,57,65][tower.tier]) };
          const flight = tower.kind === 'artillery' ? 31 / 30 : 22 / 30;
          const end = { x: target.x, y: target.y + (this.effectiveEnemyStats(target).hitOffset) };
          if (tower.kind === 'archer' && target.blockedBy === null) {
            const length = Math.hypot(target.heading.x, target.heading.y), speed = this.baseEnemyStats(target).speed;
            end.x += target.heading.x / length * speed * flight + (target.heading.x === 0 ? 0 : this.random() * 10);
            end.y += target.heading.y / length * speed * flight - (target.heading.y === 0 ? 0 : this.random() * 10);
          }
          this.events.push({type:'sound',cue:tower.kind==='archer'?'ArrowSound':tower.kind==='mage'?'BoltSound':'BombShootSound'});
          const bolt = tower.kind === 'mage';
          this.projectiles.push({ id: ++this.id, kind: tower.kind === 'archer' ? 'arrow' : bolt ? 'bolt' : 'bomb', start,
            end, target: tower.kind === 'artillery' ? null : target.id,
            ...(bolt ? {position:{...start},speed:30} : {}),
            born: this.time, due: bolt ? Infinity : this.time + flight, damage: this.roll(config.damage), damageKind: config.damageKind, radius: config.radius, tier:tower.tier,poison:tower.poison });
        }
        tower.releaseAt = null;
      }
      if (this.time < tower.readyAt || tower.releaseAt !== null) continue;
      const targets = this.enemies.filter(e => e.hp > 0 && !e.escaped && this.validTargetNode(e) && (tower.kind!=='artillery'||!this.enemyFlying(e)) && inRange({x:tower.pad.position.x,y:tower.pad.position.y + 12}, e, config.range));
      targets.sort((a, b) => this.remainingDistance(a)-this.remainingDistance(b));
      if(tower.poison>0)targets.sort((a,b)=>Number(this.baseEnemyStats(a).poisonImmune||this.time<a.poisonUntil)-Number(this.baseEnemyStats(b).poisonImmune||this.time<b.poisonUntil));
      if (targets.length) {
        tower.target = targets[0].id; tower.shotAt = this.time; tower.releaseAt = this.time + config.windup;
        tower.readyAt = this.time + config.cooldown; tower.aimUp = targets[0].y > tower.pad.position.y; tower.shooter++;
      }
    }
  }

  private updateSoldiers() {
    for (const soldier of this.soldiers) {
      if(soldier.hp>0&&soldier.stun&&this.time<soldier.stun.until){soldier.moving=false;continue;}
      if(soldier.summon){this.heroController!.updateSummon(soldier);continue;}
      const reinforcement = soldier.towerId === null&&!soldier.role;
      const stats = this.soldierStats(soldier);
      const guardian=soldier.towerId?this.towers.find(t=>t.pad.id===soldier.towerId)?.extension?.guardian:undefined;if(guardian&&soldier.deadAt===null&&this.time-soldier.born<guardian.raiseDuration)continue;
      const melee=soldier.profile?this.towerSoldierStats(this.towers.find(t=>t.pad.id===soldier.towerId)!):soldier.role==='guard'?GUARD:soldier.role==='elf'?ELF:this.statsForTier(soldier.tier).soldier;
      if(this.time>=soldier.expiresAt&&soldier.deadAt===null){soldier.hp=0;soldier.deadAt=this.time;this.release(soldier);}
      if (soldier.deadAt !== null) {
        if(reinforcement){soldier.moving=true;soldier.x+=(soldier.flip?-1:1)*stats.speed*STEP;}
        continue;
      }
      if(reinforcement&&this.time-soldier.born<10/30)continue;
      if(soldier.waypoints.length){const p=soldier.waypoints[0];soldier.flip=p.x<soldier.x;soldier.moving=true;if(!this.move(soldier,p,stats.speed*STEP))soldier.waypoints.shift();continue;}
      soldier.moving = false;
      const paladin=!soldier.profile&&soldier.tier===4&&soldier.towerId!==null?this.towers.find(t=>t.pad.id===soldier.towerId)!:null;
      if(paladin&&paladin.healing>0){
        if(soldier.healHitAt!==null&&this.time>=soldier.healHitAt){soldier.healHitAt=null;soldier.hp=Math.min(stats.health,soldier.hp+this.roll([40*paladin.healing,60*paladin.healing]));this.effect(soldier,'heal',24/30);}
        if(this.time-soldier.healStarted<30/30)continue;
        if(this.time>=soldier.healAt&&soldier.hp<stats.health*.7){soldier.healAt=this.time+10;soldier.healStarted=this.time;soldier.healHitAt=this.time+17/30;soldier.hitAt=null;this.events.push({type:'sound',cue:'HealingSound'});continue;}
      }
      if(soldier.profile&&(soldier.profile.rangedPower||soldier.profile.netPower)&&this.updateUnitRanged(soldier))continue;
      if(soldier.role==='elf'&&soldier.target===null){
        if(soldier.rangedHitAt!==null){
          if(this.time>=soldier.rangedHitAt){const e=this.enemies.find(e=>e.id===soldier.rangedTarget&&e.hp>0&&!e.escaped);
            if(e){
              const flight=15/30,end={x:e.x,y:e.y+this.effectiveEnemyStats(e).hitOffset};
              if(e.blockedBy===null){const length=Math.hypot(e.heading.x,e.heading.y),speed=this.baseEnemyStats(e).speed;end.x+=e.heading.x/length*speed*flight+(e.heading.x===0?0:this.random()*10);end.y+=e.heading.y/length*speed*flight-(e.heading.y===0?0:this.random()*10);}
              this.events.push({type:'sound',cue:'ArrowSound'});this.projectiles.push({id:++this.id,kind:'arrow',start:{x:soldier.x+4,y:soldier.y+16},end,target:e.id,born:this.time,due:this.time+flight,damage:this.abilities.outgoingDamage(soldier,this.roll(ELF.damage)),damageKind:'physical',radius:0});
            }
            soldier.rangedHitAt=null;
          }else continue;
        }
        if(this.time-soldier.rangedStarted<12/30)continue;
        if(this.time>=soldier.rangedAt){const e=this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&inRange(soldier,e,205)&&!inRange(soldier,e,50)).sort((a,b)=>distance(a,soldier)-distance(b,soldier))[0];
          if(e){soldier.rangedTarget=e.id;soldier.rangedHitAt=this.time+7/30;soldier.rangedAt=this.time+1.5;soldier.rangedStarted=this.time;soldier.flip=e.x<soldier.x;continue;}
        }
      }
      if(soldier.target!==null&&this.enemies.find(e=>e.id===soldier.target)!.blockedBy!==soldier.id&&this.enemies.some(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&e.blockedBy===null&&inRange(soldier.home,e,melee.range)))this.release(soldier);
      if (soldier.target === null) this.acquire(soldier,melee.range);
      if (soldier.target !== null) {
        const enemy = this.enemies.find(e => e.id === soldier.target)!;
        const goal = this.meleePosition(soldier,enemy);
        soldier.flip = goal.x < soldier.x;
        if (distance(soldier, goal) > 3) { soldier.moving = this.move(soldier, goal, stats.speed * STEP); soldier.hitAt = null; }
        else {
          soldier.flip = enemy.x < soldier.x;
          if (soldier.hitAt !== null && this.time >= soldier.hitAt) {
            if(soldier.holy){const point={x:soldier.x+(soldier.flip?-22:22),y:soldier.y};for(const e of this.enemies)if(e.hp>0&&!this.enemyFlying(e)&&inRange(point,e,50))this.damage(e,this.abilities.outgoingDamage(soldier,this.roll([25*paladin!.holystrike,45*paladin!.holystrike])),'physical');this.effect(point,'holy',.6);}else if(soldier.areaActive){this.unitAreaAttack(soldier);}else this.meleeDamage(enemy,this.abilities.outgoingDamage(soldier,this.roll(stats.damage)+(this.time<soldier.courageUntil?2*soldier.courageLevel:0)),'physical');soldier.hitAt=null;
          }
          if (soldier.target !== null && this.time >= soldier.attackAt && soldier.hitAt === null) {
            const area=this.unitArea(soldier),areaPower=soldier.profile?.areaPower,tower=this.towers.find(t=>t.pad.id===soldier.towerId);soldier.areaActive=!!area&&(!areaPower||this.random()<areaPower.chance+areaPower.chanceInc*tower!.powerLevels![areaPower.power]);
            if(!soldier.areaActive)this.events.push({type:'sound',cue:'MeleeSword'});
            soldier.holy=!!paladin&&paladin.holystrike>0&&this.random()<.1;soldier.attackStarted=this.time;soldier.hitAt=this.time+(soldier.holy?15/30:soldier.areaActive?area!.windup:melee.windup); soldier.attackAt = this.time + melee.cooldown;
          }
        }
      } else {
        soldier.flip = soldier.home.x < soldier.x;
        soldier.moving = this.move(soldier, soldier.home, stats.speed * STEP);
        if (this.time >= soldier.regenAt) { const healed=Math.min(stats.health-soldier.hp,stats.regen);soldier.hp+=healed;if(healed>0)this.achievement('DIE_HARD',healed); soldier.regenAt = this.time + 1; }
      }
    }
    this.soldiers = this.soldiers.filter(s => s.profile&&this.towers.find(t=>t.pad.id===s.towerId)?.camp?(s.deadAt===null||this.time-s.deadAt<s.profile.deathLifetime):s.summon?(s.deadAt===null||this.time-s.deadAt<1):s.role?(s.deadAt===null||this.time-s.deadAt<(s.role==='guard'?3:8)):s.towerId!==null||s.deadAt===null||this.time-s.deadAt<50/this.stats.reinforcement.speed);
  }

  private updateHero() {
    const h=this.hero;
    if(h.deadAt!==null) {
      if(this.time-h.deadAt>=GERALD.respawn&&h.animation==='death') {
        h.animation='respawn';h.animationAt=this.time;h.busyUntil=this.time+19/30;this.events.push({type:'heroIntro'});
      }
      if(h.animation==='respawn'&&this.time>=h.busyUntil){h.deadAt=null;h.hp=this.heroHealth;h.lastHit=this.time;h.animation='idle';}
      return;
    }
    if(h.waypoints.length) {
      const goal=h.waypoints[0];h.flip=goal.x<h.x;
      if(!this.move(h,goal,GERALD.speed*STEP))h.waypoints.shift();
      h.animation=h.waypoints.length?'running':'idle';return;
    }
    if(h.hitAt!==null&&this.time>=h.hitAt) {
      const enemy=this.enemies.find(e=>e.id===h.target);
      if(enemy&&enemy.hp>0&&!enemy.escaped) {
        const counter=h.animation==='counter',amount=this.abilities.outgoingDamage(h,this.roll(counter?h.counterDamage:[GERALD.minDamage[h.level-1],GERALD.maxDamage[h.level-1]]));
        if(this.meleeDamage(enemy,amount,counter?'true':'physical')&&!counter)h.queuedXp+=damageAfterArmor(amount,this.baseEnemyStats(enemy).armor,'physical')*3;
      }
      h.hitAt=null;
    }
    if(h.courageHitAt!==null&&this.time>=h.courageHitAt) {
      const level=GERALD.courage[h.level-1];h.courageHitAt=null;
      const targets=this.soldiers.filter(s=>s.hp>0&&s.deadAt===null&&s.target!==null&&inRange(h,s,GERALD.courageRange));
      if(targets.length) {
        h.queuedXp+=50*level;
        for(const s of targets){s.courageLevel=level;s.courageUntil=this.time+GERALD.courageDuration;s.hp=Math.min(this.soldierStats(s).health,s.hp+.15*(this.soldierStats(s).health));}
      }
    }
    if(this.time<h.busyUntil)return;
    if(h.queuedXp>0) {
      h.xp+=Math.floor(h.queuedXp*[0,2,1.1,1,1][this.difficulty]+.5);h.queuedXp=0;
      if(h.level<10&&h.xp>=GERALD.xp[h.level]) {
        h.level++;h.hp=this.heroHealth;h.animation='levelup';h.animationAt=h.levelUpAt=this.time;h.busyUntil=this.time+24/30;
        this.events.push({type:'heroIntro'});this.achievement('HERO_MEDIUM',h.level,true);this.achievement('HERO_HARD',h.level,true);return;
      }
    }
    if(GERALD.courage[h.level-1]>0&&this.time-h.courageAt>GERALD.courageCooldown&&this.soldiers.filter(s=>s.hp>0&&s.target!==null&&inRange(h,s,GERALD.courageRange)).length>=2) {
      h.animation='courage';h.animationAt=h.courageAt=this.time;h.courageHitAt=this.time+GERALD.courageHit;h.busyUntil=this.time+53/30;
      this.events.push({type:'heroCourage'});return;
    }
    if(h.target!==null&&this.enemies.find(e=>e.id===h.target)!.blockedBy!==h.id&&this.enemies.some(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&e.blockedBy===null&&inRange(h.home,e,GERALD.range)))this.release(h);
    if(h.target===null)this.acquire(h,GERALD.range);
    if(h.target!==null) {
      const enemy=this.enemies.find(e=>e.id===h.target)!;
      const goal=this.meleePosition(h,enemy);
      h.flip=goal.x<h.x;
      if(distance(h,goal)>3){this.move(h,goal,GERALD.speed*STEP);if(h.animation!=='running')h.animationAt=this.time;h.animation='running';}
      else {
        h.flip=enemy.x<h.x;
        if(this.time>=h.attackAt){this.events.push({type:'sound',cue:'MeleeSword'});h.animation=this.random()<.5?'attack2':'attack';h.animationAt=this.time;h.hitAt=this.time+GERALD.hitTime;h.attackAt=this.time+GERALD.cooldown;h.busyUntil=this.time+11/30;}
        else h.animation='idle';
      }
    } else {
      h.flip=h.home.x<h.x;
      const moving=this.move(h,h.home,GERALD.speed*STEP);if(moving&&h.animation!=='running')h.animationAt=this.time;h.animation=moving?'running':'idle';
      if(!moving&&this.time-h.lastHit>GERALD.regenStandoff) {
        h.regenElapsed+=STEP;
        if(h.regenElapsed>GERALD.regenCooldown){const healed=Math.min(this.heroHealth-h.hp,GERALD.regen[h.level-1]);h.hp+=healed;if(healed>0)this.achievement('DIE_HARD',healed);h.regenElapsed=0;}
      }
    }
  }

  private updateShield(enemy:Enemy){
    const c=this.baseEnemyStats(enemy).shield;if(!c)return false;const state=enemy.shieldCast!;
    const targets=()=>this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&c.targets.includes(e.kind)&&inRange(enemy,e,c.range));
    if(this.time-state.at<c.duration){if(!state.hit&&this.time-state.at>=c.windup){state.hit=true;for(const e of targets().slice(0,c.count))if(!e.shield){e.curse=undefined;e.shield={hits:c.hits,born:this.time,animation:c.animation,sources:new Set()};}}return true;}
    if(this.time>=state.next&&targets().length){state.at=this.time;state.next=this.time+c.cooldown;state.hit=false;enemy.hitAt=null;this.events.push({type:'sound',cue:c.sound});return true;}return false;
  }
  private updateSummon(enemy:Enemy){
    const c=this.baseEnemyStats(enemy).summon;if(!c)return false;const state=enemy.summonCast!,age=this.time-state.at;
    if(age<c.duration){
      if(state.count<c.offsets.length&&age>=c.windup+c.interval*(state.count+1)){
        const offset=c.offsets[state.count++];if(this.enemies.filter(e=>e.spawnGroup===c.group&&e.hp>0&&!e.escaped).length<c.limit){
          const route=this.content.routes.find(r=>r.includes(enemy.lane))!,lane=route[offset.lane],track=this.tracks[lane],node=this.tracks[enemy.lane].cumulative.findIndex(d=>d>=enemy.distance)+this.roll(offset.nodes);
          const random=this.random(),kind=c.pool.find(p=>random<p.chance)!.kind;
          if(node>=0&&node<track.points.length){const e=this.spawnAt(kind,lane,node);e.bounty=0;e.spawnGroup=c.group;}
        }
      }return true;
    }
    if(enemy.blockedBy!==null){state.next=this.time+c.cooldown;return false;}
    if(this.time>=state.next&&this.enemies.filter(e=>e.spawnGroup===c.group&&e.hp>0&&!e.escaped).length<c.limit){state.at=this.time;state.next=this.time+c.duration+c.cooldown;state.count=0;enemy.hitAt=null;enemy.rangedHitAt=null;return true;}return false;
  }
  spawnAt(kind:EnemyKind,lane:number,node:number,position?:Point,announceBoss=true){
    const e=this.addEnemy(kind,lane,announceBoss),track=this.tracks[lane];e.distance=track.cumulative[node];Object.assign(e,position??track.points[node]);
    if(this.enemyStats[kind].raiseDuration)e.raiseAt=this.time;if(position)e.spawnWaypoint={...track.points[node]};this.spawned++;return e;
  }
  private swampQueue:{health:number;at:number}[]=[];private swampNext=0;private spawnWave=0;private spawnWaveNext=0;private spawnWaveRule:{'1':number;'2':number}|undefined;
  private graveQueue:{health:number;at:number}[]=[];private graveNext=0;
  private levelSpawnTimes:number[]=[];
  private deathBlasts:{position:Point;config:DeathBlast;at:number}[]=[];
  private updateLevelSpawns(){
    for(const blast of this.deathBlasts)if(this.time>=blast.at)for(const unit of [this.hero,...this.soldiers].filter(u=>u.hp>0&&u.deadAt===null&&inRange(blast.position,u,blast.config.radius)))if(unit!==this.hero||!blast.config.excludedHeroes.includes(this.heroController?.data.id??'gerald'))this.damageAlly(unit,this.roll(blast.config.damage),blast.config.damageKind);
    this.deathBlasts=this.deathBlasts.filter(b=>this.time<b.at);
    const swamp=this.content.swamp;if(swamp&&this.time>=this.swampNext){const next=this.swampQueue[0];if(next&&this.time>=next.at){this.swampQueue.shift();const kind=swamp.spawns.find(s=>next.health<=s.maxHealth)!.kind,pos=swamp.positions[Math.floor(this.random()*swamp.positions.length)],routes=swamp.route===undefined?this.content.routes:[this.content.routes[swamp.route]],nearest=routes.flatMap(route=>this.tracks[route[0]].points.map((p,node)=>({route,node,d:distance(pos,p)}))).sort((a,b)=>a.d-b.d)[0],{route,node}=nearest;this.spawnAt(kind,route[Math.floor(this.random()*3)],node,pos).bounty=0;this.swampNext=this.time+swamp.interval;}else this.swampNext=this.time+swamp.checkInterval;}
    const waveSpawn=this.content.waveSpawner;if(waveSpawn&&this.mode==='campaign'&&this.bossDefeatedAt===null){
      if(this.spawnWave!==this.wave){this.spawnWave=this.wave;const rule=waveSpawn.waves[this.wave];if(rule){this.spawnWaveRule=rule;this.spawnWaveNext=this.time+rule['1'];}}
      if(this.spawnWaveRule&&this.time>=this.spawnWaveNext){const nodes=this.content.routes.flatMap((r,route)=>this.tracks[r[0]].points.flatMap((_,node)=>node>=waveSpawn.margin[0]&&node<this.tracks[r[0]].points.length-waveSpawn.margin[1]&&!this.content.invalidRanges.some(x=>x.route===route&&node>=x.from&&node<=x.to)?[{route,node}]:[]));for(let i=0;i<this.spawnWaveRule['2'];i++){const p=nodes[Math.floor(this.random()*nodes.length)];this.spawnAt(waveSpawn.kind,this.content.routes[p.route][Math.floor(this.random()*3)],p.node).bounty=0;}this.spawnWaveNext=this.time+this.spawnWaveRule['1'];}
    }
    const g=this.content.graveyard;if(g&&this.time>=this.graveNext){
      const next=this.graveQueue[0];if(next&&this.time>=next.at){this.graveQueue.shift();const kind=g.spawns.find(s=>next.health<=s.maxHealth)!.kind,pos=g.positions[Math.floor(this.random()*g.positions.length)];
        const nearest=this.content.routes.flatMap((r,route)=>this.tracks[r[0]].points.map((p,node)=>({route,node,d:distance(pos,p)}))).sort((a,b)=>a.d-b.d)[0];
        this.spawnAt(kind,this.content.routes[nearest.route][Math.floor(this.random()*3)],nearest.node,pos);this.graveNext=this.time+g.interval;
      }else this.graveNext=this.time+g.checkInterval;
    }
    if(this.wave>0)for(const [i,c] of (this.content.spawners??[]).entries()){
      if(this.levelSpawnTimes[i]===undefined)this.levelSpawnTimes[i]=this.time+c.delay;
      if(this.time>=this.levelSpawnTimes[i]){this.spawnAt(c.kind,this.content.routes[c.route][c.lane],c.node,c.position);this.levelSpawnTimes[i]=this.time+c.cooldown;this.events.push({type:'sound',cue:c.sound});if(!this.seen.has(c.kind)){this.seen.add(c.kind);this.events.push({type:'seen',enemy:c.kind});}}
    }
  }
  chainRays:{id:number;from:Point;end:Point;target:number;born:number;config:ChainAbility;scale:number;factor:number;damage:[number,number];remaining:number;seen:number[];source:string;bounced:boolean;efficient:boolean}[]=[];
  private chainDots:{target:number;next:number;end:number;ticks:number;damage:number;first:number;last:number;source:string;config:ChainAbility}[]=[];
  chainParticles:{id:number;position:Point;born:number;life:number;angle:number;speed:number;scale:number;animation:string}[]=[];
  private overcharges:{position:Point;at:number;damage:[number,number];config:ChainAbility}[]=[];
  private chainHit(from:Point,target:Enemy,damage:[number,number],remaining:number,seen:number[],factor:number,source:string,c:ChainAbility,efficient:boolean){
    const amount=Math.floor(this.roll(damage)*factor),actual=Math.min(amount,target.hp),modDamage=Math.floor(actual/c.frames)*c.cycles,hits=Math.floor((c.hitDuration+1e-9)/c.interval),tick=Math.floor(modDamage/hits);
    this.chainDots.push({target:target.id,next:this.time,end:this.time+c.hitDuration,ticks:0,damage:tick,first:modDamage-tick*hits,last:amount-actual,source,config:c});
    this.chainRays.push({id:++this.id,from:{...from},end:{x:target.x,y:target.y+this.effectiveEnemyStats(target).hitOffset},target:target.id,born:this.time,config:c,scale:seen.length? .88:1,factor,damage,remaining,seen:[...seen,target.id],source,bounced:false,efficient});
    const size=this.baseEnemyStats(target).boss?'large':this.baseEnemyStats(target).healthOffset>40?'medium':'small';this.sourceEffect({x:target.x,y:target.y+this.effectiveEnemyStats(target).hitOffset/2},c.hitAnimation+'_'+size,c.hitDuration);
  }
  private updateChainTower(tower:Tower){
    const c=tower.extension!.chain!,stats=this.towerStats(tower),origin={x:tower.pad.position.x,y:tower.pad.position.y+12};
    const targets=(range:number)=>this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&inRange(origin,e,range)).sort((a,b)=>this.remainingDistance(a)-this.remainingDistance(b));
    if(tower.releaseAt!==null&&this.time>=tower.releaseAt){const list=targets(stats.range*c.rangeCheck),target=list.find(e=>e.id===tower.target)??list[0];if(target){
      this.chainHit({x:tower.pad.position.x+c.offset.x,y:tower.pad.position.y+c.offset.y},target,stats.damage,c.jumps+tower.powerLevels![c.jumpPower]-1,[],1,'tower:'+tower.pad.id,c,this.stats.levels.rocks>=5);this.events.push({type:'sound',cue:c.sound});
      const a=c.overcharge,rank=tower.powerLevels![a.power];if(rank){const position={x:tower.pad.position.x+a.offset.x,y:tower.pad.position.y+a.offset.y};this.overcharges.push({position,at:this.time+a.delay,damage:a.damage.map(d=>d+a.damageInc*rank) as [number,number],config:c});
        const p=a.particles;for(let i=0;i<p.count;i++)this.chainParticles.push({id:++this.id,position:{...position},born:this.time+i*p.emission/p.count,life:p.life[0]+this.propRandom()*(p.life[1]-p.life[0]),angle:this.propRandom()*Math.PI*2,speed:p.speed,scale:p.scale[0]+this.propRandom()*(p.scale[1]-p.scale[0]),animation:a.particle});
      }
    }tower.releaseAt=null;}
    if(this.time<tower.readyAt||tower.releaseAt!==null)return;const target=targets(stats.range)[0];if(target){tower.target=target.id;tower.shotAt=this.time;tower.releaseAt=this.time+stats.windup;tower.readyAt=this.time+stats.cooldown;}
  }
  private updateChains(){
    for(const ray of this.chainRays){const e=this.enemies.find(e=>e.id===ray.target);if(e){ray.end={x:e.x,y:e.y+this.effectiveEnemyStats(e).hitOffset};}
      if(!ray.bounced&&this.time-ray.born>=ray.config.delay){ray.bounced=true;if(ray.remaining>0&&e){const target=this.enemies.filter(t=>t.hp>0&&!t.escaped&&!ray.seen.includes(t.id)&&this.validTargetNode(t)&&inRange(e,t,ray.config.range+(this.enemyFlying(e)?ray.config.airRange:0))).sort((a,b)=>distance(a,e)-distance(b,e))[0];if(target)this.chainHit(ray.end,target,ray.damage,ray.remaining-1,ray.seen,ray.efficient?1:Math.max(ray.config.minimum,ray.factor-ray.config.falloff),'enemy:'+e.id,ray.config,ray.efficient);}}
    }
    for(const dot of this.chainDots){const e=this.enemies.find(e=>e.id===dot.target);if(!e||e.hp<=0)continue;const hits=Math.floor((dot.config.hitDuration+1e-9)/dot.config.interval);if(dot.ticks<hits&&this.time>=dot.next){this.damage(e,dot.damage+(dot.ticks===0?dot.first:0),'electrical',0,{source:dot.source,achievement:dot.config.achievement});dot.ticks++;dot.next+=dot.config.interval;}if(this.time>=dot.end)this.damage(e,dot.last,'electrical',0,{source:dot.source,achievement:dot.config.achievement});}
    for(const a of this.overcharges)if(this.time>=a.at)for(const e of this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&inRange(a.position,e,a.config.overcharge.radius))){this.damage(e,this.roll(a.damage),'electrical',0,{achievement:a.config.achievement});const size=this.baseEnemyStats(e).healthOffset>40?'medium':'small';this.sourceEffect({x:e.x,y:e.y+this.effectiveEnemyStats(e).hitOffset/2},a.config.overcharge.animation+'_'+size,a.config.overcharge.duration);}
    this.chainParticles=this.chainParticles.filter(p=>this.time-p.born<p.life);
    this.chainRays=this.chainRays.filter(r=>this.time-r.born<r.config.duration);this.chainDots=this.chainDots.filter(d=>this.time<d.end);this.overcharges=this.overcharges.filter(a=>this.time<a.at);
  }
  private updateBarrage(enemy:Enemy){
    const c=this.baseEnemyStats(enemy).barrage;if(!c)return false;const state=enemy.barrage!,age=this.time-state.at;
    if(age<c.duration){if(!state.hit&&age>=c.windup){state.hit=true;for(const id of state.targets){const unit=[this.hero,...this.soldiers].find(s=>s.id===id&&s.hp>0&&s.deadAt===null);if(!unit)continue;const start={x:enemy.x+c.offset.x,y:enemy.y+c.offset.y},end={x:unit.x,y:unit.y};this.projectiles.push({id:++this.id,kind:'enemyArrow',start,end,target:unit.id,born:this.time,due:this.time+c.flightBase+distance(start,end)*c.flightFactor,damage:this.roll(c.damage),damageKind:c.damageKind,radius:c.radius!,texture:c.texture,rotation:c.rotation,arc:true,hitEffect:c.hitEffect,hitSound:c.hitSound});this.events.push({type:'sound',cue:c.sound});}}return true;}
    if(this.time<state.next)return false;const targets=[...this.soldiers,...(this.heroEnabled?[this.hero]:[])].filter(s=>s.hp>0&&s.deadAt===null);
    if(!targets.length)return false;for(let i=targets.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[targets[i],targets[j]]=[targets[j],targets[i]];}
    state.targets=targets.slice(0,c.count).map(s=>s.id);state.at=this.time;state.next=this.time+c.duration+c.cooldown;state.hit=false;enemy.hitAt=null;return true;
  }
  private updateEnemyBuff(enemy:Enemy){
    const config=this.baseEnemyStats(enemy).buff;if(!config)return false;
    const cast=enemy.buffCast!;
    const targets=()=>this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&config.targets.includes(e.kind)&&(!e.rage||this.time>=e.rage.until)&&this.time>=e.slowUntil&&(!e.net||this.time>=e.net.until)&&(!e.heroSlow||this.time>=e.heroSlow.until)&&inRange(enemy,e,config.range));
    if(cast.loop){
      if(cast.hitAt!==null&&this.time>=cast.hitAt){
        cast.hitAt=null;this.events.push({type:'sound',cue:config.sound});
        for(const target of targets().slice(0,config.count)){const speedFactor=this.baseEnemyStats(target).terrainMove?(this.effectiveEnemyStats(target).speed+config.speed)/this.effectiveEnemyStats(target).speed:undefined;target.rage={speedFactor,until:this.time+config.duration,born:this.time,armor:config.armor,speed:config.speed,damage:config.damage,animation:config.animation};target.hp=Math.min(this.baseEnemyStats(target).health,target.hp+config.heal);this.effect(target,'heal',24/30);}
      }
      if(this.time-cast.started<config.animationDuration)return true;
      if(cast.loop<config.loops){cast.loop++;cast.started=this.time;cast.hitAt=this.time+config.windup;return true;}
      cast.loop=0;
    }
    if(enemy.blockedBy!==null){cast.readyAt=this.time+config.cooldown;return false;}
    if(this.time>=cast.readyAt){if(targets().length){cast.readyAt=this.time+config.cooldown;cast.loop=1;cast.started=this.time;cast.hitAt=this.time+config.windup;enemy.hitAt=null;return true;}cast.readyAt=this.time+.5;}
    return false;
  }

  enemyAreaHit(enemy:Enemy,a:AreaAttack){
    const direction=enemy.heading.x>=0?1:-1,point={x:enemy.x+direction*a.offset,y:enemy.y};
    const units=[this.hero,...this.soldiers].filter(u=>u.hp>0&&u.deadAt===null&&(!a.excludeStunned||!u.stun||this.time>=u.stun.until)&&inRange(point,u,a.radius));
    for(const unit of a.count?units.slice(0,a.count):units)this.damageAlly(unit,a.instakill?unit.hp:this.roll(a.damage),a.instakill?'true':a.damageKind??'physical');
    if(a.sound)this.events.push({type:'sound',cue:a.sound});
    if(a.groundEffect){const g=a.groundEffect,p=a.effectOffset?{x:enemy.x+direction*a.effectOffset.x,y:enemy.y+a.effectOffset.y}:point;this.effects.push({id:++this.id,...p,kind:'source',animation:g.frame,anchor:.5,flip:direction<0,born:this.time,life:g.duration,text:'',ground:{fadeAfter:g.fadeAfter}});}
    if(a.effect&&(!a.effectOnce||enemy.areaHitIndex===0))this.sourceEffect(a.effectOffset?{x:enemy.x+direction*a.effectOffset.x,y:enemy.y+a.effectOffset.y}:point,a.effect,a.effectDuration??a.duration,.5,direction<0);
  }

  private updateRestHeal(enemy:Enemy){
    const c=this.baseEnemyStats(enemy).restHeal;if(!c)return false;
    const state=enemy.restHeal!;
    if(this.time>=state.next){state.at=this.time;state.next=this.time+c.duration+c.cooldown;state.choice=Math.floor(this.random()*c.choices.length);state.hit=false;}
    const a=c.choices[state.choice];
    if(!state.hit&&this.time-state.at>=c.windup){state.hit=true;for(const e of this.enemies.filter(e=>e.hp>0&&!e.escaped&&e.hp<this.baseEnemyStats(e).health&&(a.target==='self'?e===enemy:e!==enemy&&inRange(enemy,e,a.range)))){e.hp=Math.min(this.baseEnemyStats(e).health,e.hp+a.amount);this.effect(e,'heal',24/30);}}
    return this.time-state.at<c.duration;
  }

  private updateEnemies() {
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      if(enemy.transformAt!==undefined){const c=this.baseEnemyStats(enemy).boss!.transform!;if(this.time-enemy.transformAt>=c.duration){enemy.kind=c.kind;enemy.hp=this.enemyStats[c.kind].health;enemy.transformAt=undefined;enemy.curse=undefined;enemy.poisonUntil=0;enemy.thornUntil=0;enemy.armorLoss=0;enemy.slowUntil=0;}continue;}
      if(enemy.scriptAnimation&&this.time-enemy.scriptAnimation.at<enemy.scriptAnimation.duration)continue;
      if(enemy.finisher){this.updateBossAbility(enemy);continue;}
      if(enemy.raiseAt!==undefined&&this.time-enemy.raiseAt<(enemy.raiseDuration??this.baseEnemyStats(enemy).raiseDuration!))continue;
      if(enemy.spawnWaypoint){if(!this.move(enemy,enemy.spawnWaypoint,this.baseEnemyStats(enemy).speed*STEP))enemy.spawnWaypoint=undefined;continue;}
      if(enemy.curse&&this.time<enemy.curse.until&&this.time>=enemy.curse.next){enemy.curse.next+=enemy.curse.config.interval;this.damage(enemy,enemy.curse.config.damage,'true');if(enemy.hp<=0||enemy.finisher)continue;}
      const stats = this.effectiveEnemyStats(enemy);
      if(this.enemyUnblockable(enemy))for(const unit of this.attackers(enemy))this.release(unit);
      if(stats.damageAura&&this.time>=enemy.auraAt!){const a=stats.damageAura;enemy.auraAt=this.time+a.interval;for(const unit of [this.hero,...this.soldiers].filter(u=>u.hp>0&&u.deadAt===null&&inRange(enemy,u,a.radius)))this.damageAlly(unit,this.roll(a.damage),a.damageKind);}
      if(enemy.heroStunUntil!==undefined&&this.time<enemy.heroStunUntil){if(enemy.buffCast){enemy.buffCast.loop=0;enemy.buffCast.hitAt=null;}if(enemy.shieldCast){enemy.shieldCast.at=-100;enemy.shieldCast.hit=true;}if(enemy.summonCast)enemy.summonCast.at=-100;continue;}
      if(stats.regen&&!this.enemyImmune(enemy)&&this.time>=enemy.regenAt){enemy.hp=Math.min(stats.health,enemy.hp+stats.regen.amount);enemy.regenAt+=stats.regen.interval;}
      if(this.time<=enemy.poisonUntil&&this.time>=enemy.poisonAt){enemy.poisonAt+=1;this.damage(enemy,enemy.poisonDamage,'true',0,{noShieldHit:true});if(enemy.hp<=0)continue;}
      if(this.time<enemy.thornUntil){if(this.time>=enemy.thornTick&&this.time<=enemy.thornUntil-6/30){enemy.thornTick+=1;this.damage(enemy,40,'physical');}continue;}
      if(this.abilities.updateEnemy(enemy))continue;
      if(this.updateRestHeal(enemy)||this.updateBossAbility(enemy)||this.updateBarrage(enemy))continue;
      if(this.updateEnemyBuff(enemy)||this.updateShield(enemy)||this.updateSummon(enemy))continue;
      if(stats.heal){const heal=stats.heal;
        const targets=()=>this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)&&e.hp<this.baseEnemyStats(e).health&&inRange(enemy,e,heal.range));
        if(enemy.healCastAt!==null&&this.time>=enemy.healCastAt){enemy.healCastAt=null;for(const e of targets().slice(0,heal.count)){e.hp=Math.min(this.baseEnemyStats(e).health,e.hp+heal.amount);this.effect(e,'heal',24/30);}}
        if(this.time-enemy.healStarted<heal.duration)continue;
        if(this.time>=enemy.healAt){if(targets().length){enemy.healAt=this.time+heal.cooldown;enemy.healStarted=this.time;enemy.healCastAt=this.time+heal.windup;enemy.hitAt=null;this.events.push({type:'sound',cue:heal.sound});continue;}else enemy.healAt=this.time+.5;}
      }
      if(stats.eggs&&enemy.eggsLaid<stats.eggs.limit&&enemy.blockedBy===null&&this.time>=enemy.eggAt){
        const track=this.tracks[enemy.lane],node=track.cumulative.findIndex(n=>n>=enemy.distance);
        this.eggs.push({id:++this.id,x:enemy.x,y:enemy.y,lane:enemy.lane,node,born:this.time,spawned:0,config:stats.eggs});enemy.eggAt=this.time+enemy.eggCooldown;enemy.eggsLaid++;
      }
      if(this.updateEnemyRanged(enemy))continue;
      if(stats.area?.hitTimes&&this.time-enemy.attackStarted<stats.area.duration){
        if(enemy.hitAt!==null&&this.time>=enemy.hitAt){this.enemyAreaHit(enemy,stats.area);enemy.areaHitIndex!++;enemy.hitAt=enemy.areaHitIndex!<stats.area.hitTimes.length?enemy.attackStarted+stats.area.hitTimes[enemy.areaHitIndex!]:null;}
        continue;
      }
      if (enemy.blockedBy !== null) {
        const soldier = enemy.blockedBy===this.hero.id?this.hero:this.soldiers.find(s => s.id === enemy.blockedBy)!;
        if (distance(this.meleePosition(soldier,enemy), soldier) <= 3) {
          if(enemy.dodgeAt!==null&&this.time>=enemy.dodgeAt) {
            enemy.dodgeAt=null;
            const h=this.hero,level=GERALD.counter[h.level-1];
            if(this.random()<.2*level) {
              enemy.hitAt=null;h.animation='counter';h.animationAt=this.time;h.busyUntil=this.time+21/30;
              h.hitAt=this.time+5/30;h.counterDamage=stats.damage.map(d=>Math.trunc(d*(.5+.5*level))) as [number,number];
              h.queuedXp+=100*level;this.events.push({type:'heroCounter'});
            }
          }
          if (enemy.hitAt !== null && this.time >= enemy.hitAt) {
            if(stats.boss?.siege){this.events.push({type:'sound',cue:'juggernaut_punch'});const point={x:enemy.x+(enemy.heading.x>=0?40:-40),y:enemy.y};for(const unit of [this.hero,...this.soldiers].filter(u=>u.hp>0&&u.deadAt===null&&inRange(point,u,45)).slice(0,10))this.damageAlly(unit,this.roll(stats.damage));}
            else if(stats.area)this.enemyAreaHit(enemy,stats.area);else {this.damageAlly(soldier,stats.meleeInstakill?soldier.hp:this.roll(stats.damage),stats.meleeInstakill?'true':stats.meleeDamageKind??'physical');if(stats.meleeDot)this.abilities.applyDot(soldier,stats.meleeDot);if(stats.infect)this.abilities.infect(enemy,soldier);}enemy.hitAt=null;
          }
          if (enemy.blockedBy !== null && this.time >= enemy.attackAt && enemy.hitAt === null) {
            if(stats.attackSound!=='MeleeSword'){if(stats.boss?.freeze)this.delayedSounds.push({at:this.time+.2,cue:stats.attackSound});else this.events.push({type:'sound',cue:stats.attackSound});}
            enemy.areaHitIndex=0;enemy.attackStarted = this.time; enemy.hitAt = this.time + stats.windup; enemy.attackAt = this.time + stats.cooldown;
            enemy.dodgeAt=soldier===this.hero&&!this.heroController&&GERALD.counter[this.hero.level-1]>0?enemy.hitAt-4/30:null;
          }
        }
        continue;
      }
      const track = this.tracks[enemy.lane];
      enemy.distance += stats.speed * Math.min(this.time<enemy.slowUntil?.5:1,enemy.heroSlow&&this.time<enemy.heroSlow.until?enemy.heroSlow.factor:1,enemy.net&&this.time<enemy.net.until?enemy.net.factor:1) * STEP;
      const tunnel=this.content.tunnels.find(t=>this.content.routes[t.from].includes(enemy.lane)&&enemy.distance>=track.cumulative[t.pickNode]);
      if(tunnel){
        const lane=this.content.routes[tunnel.to][this.content.routes[tunnel.from].indexOf(enemy.lane)],from=this.tracks[this.content.routes[tunnel.from][0]].points[tunnel.pickNode],to=this.tracks[this.content.routes[tunnel.to][0]].points[tunnel.placeNode];
        for(const unit of this.attackers(enemy))this.release(unit);
        Object.assign(enemy,{poisonUntil:0,thornUntil:0,slowUntil:0,armorLoss:0,hitAt:null,rangedHitAt:null,net:undefined,rage:undefined});
        this.tunnelPassengers.push({enemy,name:tunnel.name,lane,node:tunnel.placeNode,releaseAt:this.time+distance(from,to)/(tunnel.speedFactor*stats.speed)});continue;
      }
      if (enemy.distance >= track.length) { enemy.escaped = true; this.lives-=stats.livesCost; this.leaked++; this.gold += enemy.bounty; this.events.push({ type: 'leak' }); continue; }
      let segment = 1;
      while (track.cumulative[segment] < enemy.distance) segment++;
      const a = track.points[segment - 1], b = track.points[segment];
      const progress = (enemy.distance - track.cumulative[segment - 1]) / (track.cumulative[segment] - track.cumulative[segment - 1]);
      enemy.x = a.x + (b.x - a.x) * progress; enemy.y = a.y + (b.y - a.y) * progress;
      enemy.heading = { x: b.x - a.x, y: b.y - a.y };
    }
    if(this.tunnelPassengers.length)this.enemies=this.enemies.filter(e=>!this.tunnelPassengers.some(p=>p.enemy===e));
  }

  private radialDamage(projectile:Projectile,point:Point){if(!projectile.damageRange)return projectile.damage;const [min,max]=projectile.damageRange,factor=Math.hypot(point.x-projectile.end.x,(point.y-projectile.end.y)/ASPECT)/projectile.radius;return Math.floor(max-(max-min)*factor);}
  private updateProjectiles() {
    for (const projectile of this.projectiles) {
      if (this.time < projectile.born) continue;
      if(projectile.kind==='fire'&&!projectile.released){projectile.released=true;this.events.push({type:'fireRelease'});}
      if (projectile.kind === 'fire') {
        if (distance(projectile.position!, projectile.end) <= projectile.speed! * STEP) projectile.due = this.time;
        else { projectile.speed = Math.min(450, projectile.speed! + 30 * Math.ceil(projectile.speed! / 30 * .05)); this.move(projectile.position!, projectile.end, projectile.speed * STEP); }
      }
      if(projectile.kind==='enemyArrow'&&projectile.maxSpeed){
        const unit=[this.hero,...this.soldiers].find(u=>u.id===projectile.target&&u.hp>0);
        if(unit)projectile.end={x:unit.x,y:unit.y+12};
        if(distance(projectile.position!,projectile.end)<=projectile.speed!*STEP)projectile.due=this.time;
        else {projectile.speed=Math.min(projectile.maxSpeed,projectile.speed!+30*Math.ceil(projectile.speed!/30*.05));this.move(projectile.position!,projectile.end,projectile.speed*STEP);}
      }
      if (projectile.kind === 'bolt') {
        const enemy = this.enemies.find(e => e.id === projectile.target);
        if (enemy && enemy.hp > 0) projectile.end = { x: enemy.x, y: enemy.y + (this.effectiveEnemyStats(enemy).hitOffset) };
        const position = projectile.position!;
        if (distance(position, projectile.end) <= projectile.speed! * STEP) projectile.due = this.time;
        else {
          projectile.speed = Math.min(projectile.maxSpeed??300, projectile.speed! + 30 * Math.ceil(projectile.speed! / 30 * .05));
          this.move(position, projectile.end, projectile.speed * STEP);
        }
      }
      if(projectile.kind==='musket'){
        const target=this.enemies.find(e=>e.id===projectile.target&&e.hp>0);
        if(target&&!projectile.invalidTarget){const to={x:target.x,y:target.y+this.effectiveEnemyStats(target).hitOffset};if(Math.max(Math.abs(to.x-projectile.end.x),Math.abs(to.y-projectile.end.y))>128)projectile.invalidTarget=true;else projectile.end=to;}
        if(distance(projectile.position!,projectile.end)<2*600*STEP)projectile.due=this.time;else this.move(projectile.position!,projectile.end,600*STEP);
      }
      if(projectile.kind==='net'){const target=this.enemies.find(e=>e.id===projectile.target&&e.hp>0&&!e.escaped);if(target)projectile.end={x:target.x,y:target.y+this.effectiveEnemyStats(target).hitOffset};if(distance(projectile.position!,projectile.end)<=projectile.speed!*STEP)projectile.due=this.time;else this.move(projectile.position!,projectile.end,projectile.speed!*STEP);}
      if(projectile.kind==='missile'){
        const position=projectile.position!,velocity=projectile.velocity!;
        if(!projectile.launched){
          this.move(position,projectile.end,projectile.speed!*STEP);
          if(distance(position,projectile.end)<=projectile.speed!*STEP)projectile.launched=true;
          else continue;
        }
        const units=projectile.targetsEnemies?this.enemies.filter(e=>e.hp>0&&!e.escaped&&this.validTargetNode(e)):[this.hero,...this.soldiers].filter(s=>s.hp>0&&s.deadAt===null);
        let target=units.find(s=>s.id===projectile.target);
        if(!target&&units.length){target=units[Math.floor(this.random()*units.length)];projectile.target=target.id;}
        if(target){projectile.end={x:target.x,y:target.y+('kind' in target?this.effectiveEnemyStats(target).hitOffset:12)};projectile.turnDirection=target.x<position.x?-1:1;}
        if(distance(position,projectile.end)<=projectile.speed!*STEP)projectile.due=this.time;
        else{
          const angle=Math.atan2(velocity.y,velocity.x),targetAngle=Math.atan2(projectile.end.y-position.y,projectile.end.x-position.x);
          const delta=Math.atan2(Math.sin(targetAngle-angle),Math.cos(targetAngle-angle));
          if(Math.abs(delta)>.2){
            const rotation=projectile.targetsEnemies?Math.sign(delta)*Math.min(Math.abs(delta),10*Math.PI/180*30*STEP):10*Math.PI/180*30*STEP*projectile.turnDirection!*(angle>Math.PI/3&&angle<2*Math.PI/3?1.5:1),cos=Math.cos(rotation),sin=Math.sin(rotation);
            [velocity.x,velocity.y]=[velocity.x*cos-velocity.y*sin,velocity.x*sin+velocity.y*cos];
          }else{
            projectile.speed=Math.min(450,projectile.speed!+30*Math.ceil(projectile.speed!/30*.1));
            velocity.x=Math.cos(targetAngle)*projectile.speed;velocity.y=Math.sin(targetAngle)*projectile.speed;
          }
          position.x+=velocity.x*STEP;position.y+=velocity.y*STEP;
        }
      }
      if (this.time < projectile.due) continue;
      if(projectile.kind==='musket'){
        const target=this.enemies.find(e=>e.id===projectile.target&&e.hp>0);
        if(target&&!projectile.invalidTarget){let damage=projectile.damage;if(!projectile.ignorePrecision&&this.stats.levels.archers>=5&&this.random()<.1)damage*=2;this.damage(target,projectile.instakill?target.hp:damage,projectile.instakill?'true':'shot',this.stats.levels.archers>=3&&!projectile.ignorePrecision?.1:0,{bypass:projectile.instakill});}
        if(!target||projectile.invalidTarget)this.effect(projectile.end,'shotHit',8/30);continue;
      }
      if(projectile.kind==='net'){const target=this.enemies.find(e=>e.id===projectile.target&&e.hp>0&&!e.escaped);if(target){target.boostUntil=0;target.net={until:this.time+projectile.slow!.duration,factor:projectile.slow!.factor,effect:projectile.slow!.effect};}continue;}
      if(projectile.kind==='cluster'){
        const c=projectile.cluster!,track=this.tracks[c.lane];this.sourceEffect(projectile.end,'explosion_air',.6);this.events.push({type:'sound',cue:'BombExplosionSound'});
        for(let i=1;i<=c.count;i++){const node=Math.max(0,Math.min(track.points.length-1,c.node+c.nodeSpread*Math.floor(c.count/2)-i*c.nodeSpread)),p=track.points[node],end={x:p.x+(this.random()*2-1)*c.posSpread,y:p.y+(this.random()*2-1)*c.posSpread};
          this.projectiles.push({id:++this.id,kind:'bomb',start:{...projectile.end},end,target:null,born:this.time,due:this.time+c.fragmentFlight+i/30*(1+Math.floor(this.random()*2)),damage:c.damage[1],damageRange:c.damage,hitFlying:true,damageKind:'explosion',radius:c.radius,texture:c.texture});this.achievement('CLUSTERED');}
        continue;
      }
      if(projectile.kind==='missile'&&projectile.targetsEnemies){
        for(const e of this.enemies)if(e.hp>0&&!e.escaped&&inRange(projectile.end,{x:e.x,y:e.y+this.effectiveEnemyStats(e).hitOffset},projectile.radius))this.damage(e,this.radialDamage(projectile,{x:e.x,y:e.y+this.effectiveEnemyStats(e).hitOffset}),'explosion');
        this.sourceEffect(projectile.end,'explosion_air',.6);this.events.push({type:'sound',cue:'BombExplosionSound'});continue;
      }
      if(projectile.kind==='enemyArrow'||projectile.kind==='missile'){
        const targets=projectile.radius>0&&projectile.kind==='enemyArrow'?[this.hero,...this.soldiers].filter(s=>s.hp>0&&s.deadAt===null&&inRange(projectile.end,s,projectile.radius)):projectile.kind==='missile'?[this.hero,...this.soldiers].filter(s=>s.hp>0&&s.deadAt===null&&inRange(projectile.end,{x:s.x,y:s.y+12},41.25)):[this.hero,...this.soldiers].filter(s=>s.hp>0&&s.deadAt===null&&s.id===projectile.target&&distance(projectile.end,{x:s.x,y:s.y+12})<22);
        for(const unit of targets){const damage=projectile.kind==='missile'?Math.floor(250-100*Math.hypot(unit.x-projectile.end.x,(unit.y+12-projectile.end.y)/ASPECT)/41.25):projectile.damage;if(projectile.frog)this.abilities.frog(unit,projectile.frog,damage);else this.damageAlly(unit,damage,projectile.damageKind);if(projectile.dot)this.abilities.applyDot(unit,projectile.dot);}
      if(projectile.hitEffect)this.sourceEffect(projectile.end,projectile.hitEffect,8/30);if(projectile.hitSound)this.events.push({type:'sound',cue:projectile.hitSound});
      if(projectile.kind==='missile'){this.effect(projectile.end,'explosion',.6);this.events.push({type:'sound',cue:'BombExplosionSound'});}continue;
      }
      if(projectile.kind==='bossBomb'){
        const nodes=this.tracks.flatMap((track,lane)=>track.points.map((point,node)=>({point,lane,node}))).sort((a,b)=>distance(a.point,projectile.end)-distance(b.point,projectile.end));
        const nearest=nodes[0];this.bombSpawners.push({id:++this.id,owner:projectile.target!,position:projectile.end,lane:nearest.lane,node:nearest.node,born:this.time,spawned:0});this.events.push({type:'sound',cue:'BombExplosionSound'});continue;
      }
      if(projectile.kind==='fire'){this.events.push({type:'fireHit'});this.unfreezeCamps(projectile.end);}
      if(projectile.kind==='bomb')this.events.push({type:'sound',cue:'BombExplosionSound'});
      if (projectile.radius > 0) {
        for (const enemy of this.enemies) if ((projectile.hitFlying||!this.enemyFlying(enemy))&&inRange(projectile.end, enemy, projectile.radius)) {const alive=enemy.hp>0;this.damage(enemy, this.radialDamage(projectile,enemy), projectile.damageKind);if(alive&&enemy.hp===0&&projectile.kind==='fire')this.achievement('DEATH_FROM_ABOVE');}
        if(projectile.kind==='fire'&&this.stats.levels.thunder>=2)this.scorches.push({...projectile.end,born:this.time,tick:this.time,duration:this.stats.levels.thunder>=4?10:5});
        this.effect(projectile.end, projectile.kind === 'fire' ? 'fire' : projectile.kind==='shrapnel'?'shrapnel':'explosion', 18/30);
        if(projectile.kind!=='shrapnel')this.effect(projectile.end, 'crater', 2.5);
      } else {
        const enemy = this.enemies.find(e => e.id === projectile.target);
        const shielded=!!enemy?.shield;
        if (enemy && (projectile.kind !== 'arrow' || distance(projectile.end, {x:enemy.x,y:enemy.y+(this.effectiveEnemyStats(enemy).hitOffset)}) < 22)) {
          this.damage(enemy, projectile.damage, projectile.damageKind,projectile.kind==='arrow'&&!projectile.ignorePrecision&&this.stats.levels.archers>=3?.1:0);
          if(projectile.spell&&enemy.hp>0&&!shielded)this.applyCurse(enemy,projectile.spell.curse);
          if(projectile.poison&&enemy.hp>0&&!this.enemyImmune(enemy)&&!this.baseEnemyStats(enemy).poisonImmune){if(this.time>=enemy.poisonUntil)enemy.poisonAt=this.time+1;enemy.poisonUntil=this.time+3;enemy.poisonDamage=5*projectile.poison;}
        }
        if(enemy&&!this.enemyImmune(enemy)&&!shielded&&projectile.kind==='bolt'&&this.stats.levels.mages>=2)enemy.armorLoss+=.03;
        if(enemy&&!this.enemyImmune(enemy)&&projectile.kind==='bolt'&&this.stats.levels.mages>=5)enemy.slowUntil=this.time+1;
        if (projectile.kind === 'bolt'){if(projectile.spell)this.sourceEffect(projectile.end,projectile.spell.hitEffect,8/30);else this.effect(projectile.end, 'magic', 8/30);}
      }
    }
    this.projectiles = this.projectiles.filter(p => this.time < p.due);
  }
}
