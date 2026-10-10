import type {Animation,AtlasFrame,DamageKind,Point} from './types';
import {resources} from '../loading/progress';

export type HeroId='gerald'|'alleria'|'malik'|'bolin'|'magnus'|'ignus'|'denas'|'elora'|'ingvar'|'hacksaw'|'oni'|'thor'|'10yr';
export interface HeroSummary {id:HeroId;name:string;description:string;skillsDescription:string;portrait:number;hudPortrait:string;infoPortrait:string;title:string;health:number;armor:number;damage:[number,number];speed:number}
export interface HeroSkill {level:number;xp:number;values:Record<string,number>}
export interface HeroAttack {
 animation:string;animations?:string[];loops?:number;trigger_range?:number;sound_start?:string;sounds_buffed?:string[];sounds_normal?:string[];type:string;cooldown:number;disabled?:boolean;chance:number;damage_min:number;damage_max:number;damage_type:number;
 hit_time?:number;hit_times?:number[];shoot_time?:number;shoot_times?:number[];cast_time?:number;spawn_time?:number;
 bullet?:string;bullets?:string[];entity?:string;mod?:string;aura?:string;xp_from_skill?:string;xp_gain_factor?:number;
 max_range?:number;min_range?:number;range?:number;damage_radius?:number;min_count?:number;hit_offset?:Point;
 hit_fx?:string;hit_decal?:string;hit_aura?:string;sound?:string;sound_hit?:string;sound_shoot?:string;sound_end?:string;
 count?:number;radius?:number;duration?:number;damage_delay?:number;transform_health_factor?:number;speed_factor?:number;heal_factor?:number;
 bullet_start_offset?:Point[]|Point;nodes_offset?:number|number[];step?:number;vis_bans:number;vis_flags:number;shared_cooldown?:boolean;
}
export interface HeroLevel {health:number;armor:number;regen:number;melee:HeroAttack[];ranged:HeroAttack[];timed:HeroAttack[];skills:Record<string,HeroSkill>;rangedDamage:[number,number]}
export interface HeroEntity {
 prefix:string;frame:string;animated:boolean;anchor:Point;portrait?:string;name?:string;events:Record<string,string>;config:Record<string,number>;health:number;armor:number;regen:number;speed:number;range:number;duration:number;
 melee:HeroAttack[];ranged:HeroAttack[];bullet:Record<string,number|string|boolean|string[]|number[]>;aura:Record<string,number|string|boolean|number[]>;modifier:Record<string,number|string|boolean>;
 values:Record<string,number|string|number[]|string[]>;
}
export interface HeroContent {
 id:HeroId;name:string;teleport?:{min_distance:number;sound:string;animations:string[]};transform:{speed?:number;range?:number;healthOffset?:number};prefix:string;anchor:Point;healthBar:{width:number;offset:number};hitArea:{pos:Point;size:Point};
 speed:number;range:number;respawn:number;tombstone:number;regenCooldown:number;regenStandoff:number;xp:number[];
 hudPortrait:string;infoPortrait:string;levels:HeroLevel[];entities:Record<string,HeroEntity>;
 frames:Record<string,AtlasFrame>;animations:Record<string,Animation>;url:string;
 sounds:Record<string,string>;cues:Record<string,{files:string[];gain?:number|number[];ignore?:number;mode?:string;source_group:string}>;events:Record<string,string>;
}
const loads=new Map<HeroId,Promise<HeroContent>>();
export const heroContentUrl=(id:HeroId)=>`/assets/kr1/heroes/${id}/content.json`;
export function loadHero(id:HeroId){
 if(!loads.has(id))loads.set(id,resources.json<HeroContent>(heroContentUrl(id)));
 return loads.get(id)!;
}
export function heroDamageKind(flags:number):DamageKind {
 if(flags&4)return 'magic';if(flags&8)return 'explosion';if(flags&128)return 'shot';if(flags&2)return 'physical';return 'true';
}
