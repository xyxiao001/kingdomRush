import {saveStorage} from './slots';
import content from '../content/generated/progression-ui.json';
export const UPGRADE_CLASSES = ['archers','barracks','mages','rocks','thunder','reinforcements'] as const;
export type UpgradeClass = typeof UPGRADE_CLASSES[number];
export type UpgradeLevels = Record<UpgradeClass,number>;
export const EMPTY_UPGRADES:UpgradeLevels={archers:0,barracks:0,mages:0,rocks:0,thunder:0,reinforcements:0};
const KEY='upgrades';
export function loadUpgrades():UpgradeLevels {const value=saveStorage.getItem(KEY);return value===null?{...EMPTY_UPGRADES}:JSON.parse(value);}
export function saveUpgrades(levels:UpgradeLevels){saveStorage.setItem(KEY,JSON.stringify(levels));}
export function spentStars(levels:UpgradeLevels){return content.upgrades.list.reduce((sum,u)=>sum+(u.data.level<=levels[u.data.class as UpgradeClass]?u.data.price:0),0);}
export function canBuyUpgrade(id:string,levels:UpgradeLevels,stars:number){const u=content.upgrades.list.find(u=>u.id===id)!.data;return u.level===levels[u.class as UpgradeClass]+1&&u.price<=stars-spentStars(levels);}
