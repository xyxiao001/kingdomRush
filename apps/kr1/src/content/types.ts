import type {Point,Bounds,AtlasFrame} from '@kingdom-rush/game-types';
export type {Point,Bounds,AtlasFrame} from '@kingdom-rush/game-types';
export interface Pad { id: string; position: Point; rally: Point; special?: string; terrain?:number }
export interface Spawn { time: number; kind: EnemyKind; lane: number | null; path:number }
export interface Wave { entrances?:number; delay: number; duration: number; spawns: Spawn[] }
export interface Decoration {clickPlay?:import('./abilities').ClickPlay;scale?:Point;presentation?:import('./abilities').AmbientAnimation;clickRelease?:import('./abilities').ClickRelease; mode?:number; anchor?:Point; z?:number; tracks?:string[]; flip?:boolean; kind: string; position: Point; frame?:string; sortY?:number }
export interface Level {
  id: number; sourceId: number; name: string; cash: number; lives: number;
  paths: Point[][]; pads: Pad[]; waves: Wave[]; decorations: Decoration[];
  worldBounds: Bounds; safeGameplayBounds: Bounds;
}
export type TowerKind = 'archer' | 'barrack' | 'mage' | 'artillery';
export type EnemyKind = `content:${string}` | 'eb_blackburn'|'enemy_hobgoblin' | keyof typeof import('./generated/blackburn-enemies.json') | keyof typeof import('./generated/late-enemies.json') | 'enemy_demon' | 'enemy_demon_mage' | 'enemy_demon_wolf' | 'enemy_demon_imp' | 'enemy_necromancer' | 'enemy_skeleton' | 'enemy_skeleton_big' | 'enemy_lava_elemental' | 'enemy_goblin' | 'enemy_fat_orc' | 'enemy_wolf_small' | 'enemy_shaman' | 'enemy_ogre' | 'enemy_bandit' | 'enemy_brigand' | 'enemy_spider_small' | 'enemy_spider_big' | 'enemy_spider_tiny' | 'enemy_wolf' | 'enemy_marauder' | 'enemy_dark_knight' | 'enemy_shadow_archer' | 'enemy_gargoyle' | 'enemy_golem_head' | 'eb_juggernaut' | 'enemy_troll' | 'enemy_whitewolf' | 'enemy_troll_axe_thrower' | 'enemy_yeti' | 'enemy_troll_chieftain' | 'enemy_rocketeer' | 'enemy_slayer' | 'eb_jt' | 'enemy_sheep_ground' | 'enemy_sheep_fly';
export type DamageKind = 'physical' | 'magic' | 'explosion' | 'shot' | 'electrical' | 'true';
export type Power = 'reinforcements' | 'fire' | 'lightning';
export interface Animation { prefix: string; from: number; to: number; sequence?:number[] }
export interface AssetData {
  frames: Record<string, AtlasFrame>;
  animations: Record<string, Animation>;
  sounds: Record<string, string>;
}
