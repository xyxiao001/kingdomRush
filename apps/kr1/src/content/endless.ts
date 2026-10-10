import type {ProgressionRule as ProgressionRule} from '@kingdom-rush/game-types';
import type {EnemyKind,Point} from './types';
import type {CombatCue} from '../audio/combat-cues';
export interface EndlessSpawn {creep:EnemyKind;creep_aux?:EnemyKind;max_same:number;cant:number;cant_cicle:number;cant_increment:number;interval:number;interval_next:number;path:number;use_fixed_path?:number}
export interface EndlessWave {name:string;next_wave_interval:number;spawns:EndlessSpawn[]}
export type {ProgressionRule as ProgressionRule} from '@kingdom-rush/game-types';
export interface EndlessDifficulty {max_paths:number;multiple_paths_chance:number;multiple_paths_chance_increment:number;waves:EndlessWave[];bossWaves:EndlessWave[];bossConfig:{powerChance:number;powerChanceIncrement:number;powerCooldownMin:number;powerCooldownMax:number;powerMultiChance:number;powerDistribution:number[]}}
export type TotemKind='healing'|'damage'|'speed';
export interface TotemConfig {duration:number;durationIncrement:number;range:number;healthPerTick?:number;healthPerTickIncrement?:number;damagePerTick?:number;damagePerTickIncrement?:number;speedModifier?:number;speedModifierIncrement?:number}
export interface TotemPresentation {prefix:string;fx:string;ground:string;ring:string;anchor:Point;sound:CombatCue;start:number;end:number;cycle:number}
export interface EndlessConfig {
 deathShowers:Partial<Record<EnemyKind,{animation:string;count:number;delay:number;duration:number;offset:Point;spread:[number,number];travel:[number,number];sound:CombatCue}>>;
 pathBounds:{start:number;finish:number}[];
 difficulties:EndlessDifficulty[];pathConfig:number[][];chancesToUseNextDifficulty:number[];
 nextWaveRewardMoneyMultiplier:number;score:{scorePerWave:number;scoreNextWaveMultiplier:number;scoreEnemyMultiplier:number};
 enemyProgression:Record<string,Record<string,ProgressionRule>>;
 factorMap:Partial<Record<EnemyKind,string[]>>;
 bossConfig:{powerConfig:Record<TotemKind,TotemConfig>&{powerProgressionWaveStart:number}};
 shaman:{position:Point;anchor:Point;prefix:string;castDuration:number;delay:[number,number];drummer:{position:Point;prefix:string;anchor:Point;duration:number};attacks:{kind:TotemKind;nodeOffset?:[number,number];margins?:[number,number]}[];totems:Record<TotemKind,TotemPresentation>;taunts:{welcome:string[];prebattle:string[];battle:string[];life_lost:string[];totem:string[]};tauntOffset:Point;tauntFrame:string};
}
