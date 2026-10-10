import {saveStorage} from './slots';
import {LEVELS} from '../levels/index';
import type {Difficulty} from './difficulty';
import {loadLevelProgress} from './progress';
export type GameMode='campaign'|'heroic'|'iron';
export interface Challenges {heroic:number;iron:number}
const key=(id:number)=>`level:${id}:challenges`;
export function loadChallenges(id=1):Challenges {const value=saveStorage.getItem(key(id));return value===null?{heroic:0,iron:0}:JSON.parse(value);}
export function recordChallenge(mode:'heroic'|'iron',difficulty:Difficulty,id=1){const value=loadChallenges(id);value[mode]=Math.max(value[mode],difficulty);saveStorage.setItem(key(id),JSON.stringify(value));}
export function totalStars(){return Object.keys(LEVELS).map(Number).reduce((sum,id)=>{const c=loadChallenges(id);return sum+loadLevelProgress(id).stars+Number(c.heroic>0)+Number(c.iron>0);},0);}
