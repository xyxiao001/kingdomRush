import catalog from '../content/generated/level-catalog.json';
import {resources} from '../loading/progress';
import type {Level,Point,TowerKind,Animation,AtlasFrame,EnemyKind} from '../content/types';
import type {GameMode} from '../storage/challenges';
import type {ViewData} from '../rendering/ui-tree';
import type {TowerExtension,MercenaryCamp,ManualTower,Graveyard,LevelSpawner} from '../content/abilities';
export interface NavigationData {ox:number;oy:number;grid:number[][];nodes:Point[];width:number}
export interface LevelDescriptor {id:number;sourceId:number;name:string;mapPosition:Point;history:string;thumbnail:string;upgradeCap:Record<GameMode,number>;ironRuleIcons:string[];heroModes?:Record<GameMode,boolean>}
export interface LevelContent {
 endless?:import("../content/endless").EndlessConfig;
 rallyInvalidRanges?:{route:number;from:number;to?:number}[];
 pointSpawns?:import('../content/abilities').PointSpawnConfig;ambientSounds?:{cues:import('../audio/combat-cues').CombatCue[];delay:[number,number]};
 portalEffects?:{routes:{route:number;node:number}[];offsets:Partial<Record<EnemyKind,Point>>;animation:string;duration:number}[];
 entrances?:import('../content/abilities').WaveEntrance[];burningFloor?:import('../content/abilities').BurningFloor;
 heroModes?:Record<GameMode,boolean>;
 script?:import('./scripts/dark-tower').DarkTowerConfig;
 swamp?:Omit<Graveyard,'eligible'>&{route?:number};
 waveSpawner?:{kind:EnemyKind;waves:Record<string,{'1':number;'2':number}>;margin:[number,number]};
 graveyard?:Graveyard;spawners?:LevelSpawner[];powerAreas?:{x:number;y:number;width:number;height:number}[];
 manualTowers?:Record<string,ManualTower>;bossSpawns?:{owner:EnemyKind;kind:EnemyKind;cooldown:number;delay:number;route:number;lane:number;node:number}[];
 extensions?:TowerExtension[];camps?:Record<string,MercenaryCamp>;
 level:Level;navigation:NavigationData;heroSpawn:Point;maxTowerLevel:number;
 upgradeCap:Record<GameMode,number>;allowedTowers:Record<GameMode,TowerKind[]>;
 modes:Record<'heroic'|'iron',Pick<Level,'cash'|'lives'|'waves'|'pads'>>;
 background:string;packages:{url:string;frames:Record<string,AtlasFrame>;animations:Record<string,Animation>}[];
 ui:{url:string;frames:Record<string,AtlasFrame>;views:Record<string,ViewData>;notifications:Record<string,{icon:ViewData;view:ViewData;queue:Point}>}[];
 routes:number[][];waveFlags:{path:number;position:Point;rotation:number}[];
 initial:Record<GameMode,{extension?:string;powerLevels?:Record<string,number>;special?:'elf';spent?:number;pad:string;kind:TowerKind;tier:number}[]>;
 musketeer:boolean;snow:boolean;tunnels:{name:string;from:number;to:number;pickNode:number;placeNode:number;speedFactor:number}[];invalidRanges:{route:number;from:number;to:number}[];
 sounds:Record<string,string>;bossMusic:string|null;advancedTowers:TowerKind[];initialSoldiers:Record<GameMode,Point[]>;paladinNames:string[];
 elfNames:string[];tutorials:{id:string;wave:number;view:ViewData;icon?:boolean;pages?:{id:string;view:ViewData}[]}[];
 rangerWave:Record<GameMode,number>|null;
}
// Only world-map metadata lives in the bootstrap module. Geometry/waves/grid/atlas
// descriptions are fetched on entry, not imported by the renderer or simulation.
export const LEVELS=catalog.levels as Record<number,LevelDescriptor>;
export const LEVEL_THUMBNAILS=catalog.thumbnails;
const loads=new Map<number,Promise<LevelContent>>();
export const levelContentUrl=(id:number)=>`/assets/kr1/levels/${String(id).padStart(2,'0')}/content.json`;
export function loadLevel(id:number):Promise<LevelContent>{
 if(!loads.has(id))loads.set(id,resources.json<LevelContent>(levelContentUrl(id)));
 return loads.get(id)!;
}
