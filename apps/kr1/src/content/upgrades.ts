import type {TowerExtension} from './abilities';
import {TOWERS,TOWERS_2,TOWERS_3,RANGER,MUSKETEER,ARCANE,PALADIN_TOWER,PALADIN,SOLDIER,SOLDIER_2,SOLDIER_3,REINFORCEMENT,FIRE} from './balance';
import {EMPTY_UPGRADES,type UpgradeLevels} from '../storage/upgrades';
// ORIGINAL: KR1 sections of upgrades.lua and game_templates-1.lua.
export function upgradedStats(saved:UpgradeLevels=EMPTY_UPGRADES,cap=5,tier=1,musketeer=false,extension?:TowerExtension){
 const levels=Object.fromEntries(Object.entries(saved).map(([k,v])=>[k,Math.min(v,cap)])) as UpgradeLevels;
 const towers=structuredClone(tier===1?TOWERS:tier===2?TOWERS_2:tier===3?TOWERS_3:{...TOWERS_3,archer:musketeer?MUSKETEER:RANGER,mage:ARCANE,barrack:PALADIN_TOWER}),soldier=tier===1?{...SOLDIER,armor:0}:{...(tier===2?SOLDIER_2:tier===3?SOLDIER_3:PALADIN)},reinforcement={...REINFORCEMENT,armor:0,level:levels.reinforcements},fire=structuredClone(FIRE);
 if(extension){towers[extension.kind]=structuredClone(extension.stats);if(extension.unit)Object.assign(soldier,extension.unit.stats);}
 const {archers:a,barracks:b,mages:m,rocks:r,thunder:f,reinforcements:re}=levels;
 if(a>=2)towers.archer.range*=1.1;if(a>=4)towers.archer.range*=1.1;
 if(b>=1)soldier.health=Math.round(soldier.health*1.1);if(b>=2)soldier.armor+=.1;if(b>=3){soldier.respawn=Math.floor(soldier.respawn*.8);towers.barrack.range*=1.2;}if(b>=4)soldier.health=Math.round(soldier.health*1.0909);
 if(m>=1)towers.mage.range*=1.1;if(m>=3)towers.mage.cost=Math.ceil(towers.mage.cost*.9);if(m>=4)towers.mage.damage=towers.mage.damage.map(v=>Math.ceil(v*1.15)) as [number,number];
 if(r>=1)towers.artillery.damage=towers.artillery.damage.map(v=>Math.ceil(v*1.1)) as [number,number];if(r>=2)towers.artillery.range*=1.1;if(r>=3)towers.artillery.cost=Math.ceil(towers.artillery.cost*.9);if(r>=4)towers.artillery.cost=Math.ceil(towers.artillery.cost*.75);
 if(f>=1){fire.count+=2;fire.damage=fire.damage.map(v=>v+20) as [number,number];}if(f>=3){fire.cooldown-=10;fire.radius*=1.25;fire.damage=fire.damage.map(v=>v+40) as [number,number];}if(f>=4)fire.cooldown-=10;if(f>=5)fire.damage=fire.damage.map(v=>v+60) as [number,number];
 reinforcement.health=[30,50,70,90,110,110][re];reinforcement.armor=[0,0,.1,.2,.3,.3][re];reinforcement.regen=[3,6,9,12,15,15][re];reinforcement.damage=([[1,2],[1,3],[2,4],[3,6],[6,10],[6,10]] as [number,number][])[re];
 return {levels,towers,soldier,reinforcement,fire};
}
