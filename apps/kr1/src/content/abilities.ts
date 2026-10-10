import type {Point,DamageKind,TowerKind,EnemyKind} from './types';
import type {CombatCue} from '../audio/combat-cues';

export interface AreaAttack {excludeStunned?:boolean;effectDuration?:number;groundEffect?:{frame:string;duration:number;fadeAfter:number};damageKind?:DamageKind;effectOnce?:boolean;effectOffset?:Point;hitTimes?:number[];radius:number;offset:number;count:number;damage:[number,number];windup:number;animation:string;duration:number;instakill?:boolean;sound?:CombatCue;effect?:string}
export interface RangedAttack {
 frog?:FrogEffect;
 dot?:AllyDot;
 radius?:number;arc?:boolean;hitSound?:CombatCue;animation?:string;hitEffect?:string;speed?:number;holdAdvance?:boolean;range:number;minRange:number;cooldown:number;windup:number;duration:number;offset:Point;
 damage:[number,number];damageKind:DamageKind;flight:number;texture:string;rotation:number;sound:CombatCue;
}
export interface UnitProfile {
 stats:{health:number;armor:number;damage:[number,number];speed:number;regen:number;range:number;cooldown:number;windup:number;respawn:number};
 attackDuration:number;hitArea:{pos:Point;size:Point};prefix:string;anchor:number;portrait:string;name:string;names:string[];healthOffset:number;meleeSlot:number;deathLifetime:number;
 area?:AreaAttack;
 meleePower?:{power:string;damageInc:number;animationSuffix:string;duration:number;meleeSlot:number};
 areaPower?:AreaAttack&{power:string;chance:number;chanceInc:number;damageInc:number};
 rangedPower?:RangedAttack&{power:string;rangeInc:number;damageInc:number};
 netPower?:{power:string;range:number;minRange:number;cooldown:number;windup:number;duration:number;speed:number;factors:number[];animation:string;effect:string;sound:CombatCue};
}
export interface TowerPower {price:[number,number];max:number;icon:string;disabledIcon:string;position:Point;name:string;descriptions:string[];sound:CombatCue}
export interface ArtilleryAbility {
 cooldown:number;windup:number;flight:number;offset:Point;texture:string;prediction:number;
 missile:{power:string;cooldown:number;flyingCooldown:number;windup:number;duration:number;range:number;rangeInc:number;damage:[number,number];damageInc:number;radius:number;offset:Point;launch:Point};
 cluster:{power:string;cooldown:number;prediction:number;flight:number;offset:number;count:number;countInc:number;nodeSpread:number;posSpread:number;damage:[number,number];radius:number;fragmentFlight:number;texture:string};
}
export interface TowerExtension {
 id:string;kind:TowerKind;icon:string;portrait:string;taunt:CombatCue;
 stats:{name:string;description:string;cost:number;range:number;cooldown:number;windup:number;damage:[number,number];damageKind:DamageKind;radius:number};
 chain?:ChainAbility;powers:Record<string,TowerPower>;spell?:SpellAbility;guardian?:GuardianAbility;unit?:UnitProfile;artillery?:ArtilleryAbility;
 presentation:{frame?:string;prefix?:string;door?:string;offset:number;shootDuration:number;shooter?:{prefix:string;offset:Point;polymorphEffect:string;effectOffset:Point}};
}
export interface MercenaryCamp {
 name:string;description:string;portrait:string;icon:string;unit:UnitProfile;price:number;capacity:number;rallyRange:number;spawn:Point;
 frozenDescription:string;frozenFrame:string;frame:string;offset:Point;unfreeze:{rect:{x:number;y:number;width:number;height:number};radius:number;animation:string;duration:number};
 ready:CombatCue;rally:CombatCue;achievement:string;
}

export interface FreezeAbility {
 cooldown:number;range:number;count:number;windup:number;duration:number;rest:number;sound:CombatCue;soundDelay:number;restSound:CombatCue;restSoundDelay:number;hitEffect:string;hitOffset:Point;
 ice:{prefix:string;startDuration:number;endDuration:number;releaseDelay:number;fade:number;offset:Point;tap:string;tapOffset:Point;clicks:number;hitArea:{pos:Point;size:Point};clickSound:CombatCue;clickEffect:string};
}
export interface BossAbility {
 deathEnd?:{animation:string;after:number};clearSpawnsAfterDeath?:number;stopSpawnsOnDeath?:boolean;clearOnDeath?:boolean;fade?:number;immuneWhileUnblocked?:boolean;achievement:string;deathLifetime:number;winDelay:number;silenceOnDeath?:boolean;transform?:{kind:EnemyKind;animation:string;duration:number;sound:CombatCue};siege?:boolean;freeze?:FreezeAbility;
 finisher?:{deathDuration:number;endDuration:number;tap:string;sound:CombatCue};
}
export interface CurseAbility {armorFactor:number;armorDuration:number;duration:number;interval:number;damage:number;animation:string}
export interface SpellAbility {
 speed:number;offsets:Point[];animation:string;hitEffect:string;sound:CombatCue;curse:CurseAbility;
 polymorph:{power:string;cooldown:number;cooldownInc:number;windup:number;offset:Point;hitTime:number;duration:number;animation:string;effect:string;sound:CombatCue;healthFactor:number;speedFactor:number;stunAnimation:string;ground:string;flying:string};
}
export interface GuardianAbility {power:string;unit:UnitProfile;healthInc:number;armorInc:number;damageInc:number;rallyRange:number;raiseDuration:number;raiseAnimation:string;sound:CombatCue;rallySound:CombatCue}
export interface ManualTower {
 name:string;description:string;portrait:string;power:TowerPower;hitArea:{pos:Point;size:Point};damage:[number,number];damageInc:number;cooldown:number;cooldownInc:number;windup:number;shootDuration:number;readyDuration:number;offset:Point;
 ray:{animation:string;hitEffect:string;hitTime:number;duration:number;scales:number[];sound:CombatCue};
 presentation:{base:string;hover:string;offset:Point;prefix:string;layers:number[];casters:{prefix:string;offset:Point}[]};achievement:string;
}

export interface ChainAbility {
 offset:Point;rangeCheck:number;jumps:number;jumpPower:string;range:number;airRange:number;delay:number;falloff:number;minimum:number;
 animation:string;duration:number;hitAnimation:string;hitOffset:number;hitDuration:number;interval:number;cycles:number;frames:number;sound:CombatCue;achievement:string;
 overcharge:{power:string;delay:number;offset:Point;radius:number;damage:[number,number];damageInc:number;animation:string;particle:string;duration:number;particles:{count:number;emission:number;speed:number;life:[number,number];scale:[number,number]}};
}
export interface ShieldAbility {targets:EnemyKind[];cooldown:number;windup:number;duration:number;range:number;count:number;hits:number;animation:string;sound:CombatCue}
export interface SummonAbility {cooldown:number;windup:number;interval:number;duration:number;group:string;limit:number;pool:{kind:EnemyKind;chance:number}[];offsets:{lane:number;nodes:[number,number]}[]}
export interface DeathBlast {damageKind?:DamageKind;delay:number;radius:number;damage:[number,number];excludedHeroes:string[]}
export interface Graveyard {eligible:EnemyKind[];delay:number;interval:number;checkInterval:number;positions:Point[];spawns:{kind:EnemyKind;maxHealth:number}[]}
export interface LevelSpawner {kind:EnemyKind;position:Point;route:number;lane:number;node:number;delay:number;cooldown:number;sound:CombatCue}

export interface HealAbility {range:number;count:number;amount:number;cooldown:number;windup:number;duration:number;sound:CombatCue}
export interface EggAbility {kind:EnemyKind;prefix:string;cooldown:[number,number];limit:number;hatch:number;interval:number;count:number;nodeOffset:number}
export interface BarrageAbility extends RangedAttack {count:number;flightBase:number;flightFactor:number}
export interface TowerSeal {prefix:string;startDuration:number;clickTime:number;holdDuration:number;removeDuration:number;clicks:number;tap:string;offset:Point;tapOffset:Point;hitArea:{pos:Point;size:Point};clickSound:CombatCue;blockedSound:CombatCue;releasedSound:CombatCue}
export interface RestHealAbility {cooldown:number;windup:number;duration:number;choices:{target:"self"|"others";range:number;amount:number;animation:string;animationDuration:number}[]}
export interface TerrainMoveAbility {mask:number;speedFactor:number;unblockable:boolean;walk:[string,string,string]}
export interface DamageAura {radius:number;interval:number;damage:[number,number];damageKind:DamageKind}
export interface AmbientAnimation {idleBetween?:boolean;motion?:[number,Point][];flipChance?:number;layers?:{idle:string;release?:string;afterRelease:string;anchor:Point}[];trigger?:{kind:EnemyKind;node:number;animation:string;duration:number};scale?:Point;prefix:string;anchor:Point;z:number;idle:string;play?:string;duration?:number;delay?:[number,number];activeRoutes?:number[];fade?:number}
export interface ClickRelease {keepAfterRelease?:boolean;achievementOnComplete?:boolean;touchEffect?:string;touchDuration?:number;touchSound?:CombatCue;clicks:number;hitArea:{pos:Point;size:Point};clicked:string;release:string;clickDuration:number;releaseDuration:number;achievement:string}

export interface AllyDot {damageFactor?:number;id:string;duration:number;interval:number;damage:[number,number];lethal:boolean;animation:string}
export interface CloneAbility {generation:number;cooldown:number;cooldownAfter:number;windup:number;duration:number;raiseDuration:number;nodesLimit:number;offset:[number,number]}
export interface FlightAbility {shadow:{frame:string;offset:Point;anchor:Point};cooldown:number;duration:number;speedFactor:number;nodesStart:number;nodesEnd:number;healthOffset:number;hitOffset:number;modOffset:number;clickOffset:number;prefix:string;takeoff:[string,string,string];land:[string,string,string];takeoffDuration:number;landDuration:number}
export interface TowerBlock {duration:number;fade:number;animation:string;offset:Point}
export interface AllyStun {duration:number;heroDuration:number;unit:{animation:string;offset:Point};heroes:Record<string,{animation:string;offset:Point}>;profiles:Record<string,{animation:string;offset:Point}>}
export interface CorpseAura {interval:number;radius:number;kind:EnemyKind;limit:number;group:string;excludedProfiles:string[]}
export interface ScreenShake {duration:number;frequency:number;amplitude:number}
export interface AreaSkill extends AreaAttack {cooldown:number;cooldownAfter?:number;rest?:number;towerBlock?:TowerBlock&{range:number};stun?:AllyStun;shake?:ScreenShake;minTargets:number;soundDelay:number;effects:{animation:string;offset:Point;mirrorOffsetY?:boolean;duration:number;anchor?:number;z?:number;delay?:number}[]}
export interface SpawnBurst {kind:EnemyKind;nodeOffsets:[number,number];raiseDuration:number;sound:CombatCue;soundDelay:number}
export interface SporeAbility {cooldown:number;minNodes:number;radius:number;waits:[number,number,number];rest:number;counts:number[];animation:string;effect:string;effectDuration:number;offset:Point;sound:CombatCue;dot:AllyDot;spawn:SpawnBurst}
export interface WaveEntrance {kind:EnemyKind;position:Point;route:number;lane:number;node:number;wave:number;wait:number;idle:string;wake:string;duration:number;sound?:CombatCue;flip:boolean;notify:boolean}
export interface BurningFloor {positions:Point[];radius:number;interval:number;dot:AllyDot;fade:number;frames:string[];waves:Record<import('../storage/challenges').GameMode,Record<number,[number,number]>>}

export interface AllyAura {radius:number;interval:number;delay:number;targets:EnemyKind[];factor:number;duration:number;animation:string;frame:string;offset:Point;ground:string;groundAnimation:string;groundOffset:Point;groundAnchor:Point}
export interface FrogEffect {delay:number;jumpAt:number;jumpDuration:number;jumpOffset:Point;rest:number;puffDuration:number;prefix:string;anchor:Point;excludedProfiles:string[]}
export interface ClickPlay {hitArea:{pos:Point;size:Point};animation:string;duration:number;achievement?:string;afterPrefix?:string;afterDuration?:number;sound?:CombatCue;soundAgainAt?:number;leave?:{animation:string;duration:number;offset:Point};appear?:{positions:Point[];pause:[number,number];visible:[number,number];enter:string;enterDuration:number;idle:string}}
export interface PointSpawnConfig {points:{route:number;from:Point;to:Point}[];groups:number[][];waves:Record<import('../storage/challenges').GameMode,Record<number,{delay:number;variance:number;group:number;lane:number|null;count:number;all:boolean;sequence:boolean;interval:[number,number];kind:EnemyKind}[]>>}
