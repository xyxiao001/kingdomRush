import {saveStorage} from './slots';
export interface LevelProgress {stars:number;wins:number}
const key=(id:number)=>`level:${id}:progress`;
export function loadLevelProgress(id:number):LevelProgress {
  const value=saveStorage.getItem(key(id));
  return value===null?{stars:0,wins:0}:JSON.parse(value);
}
export function recordLevelVictory(id:number,stars:number){
  const value=loadLevelProgress(id);value.stars=Math.max(value.stars,stars);value.wins++;
  saveStorage.setItem(key(id),JSON.stringify(value));return value;
}

// Existing gameplay API; all persisted levels use the same schema.
export interface Progress {southport:LevelProgress}
export function loadProgress():Progress {return {southport:loadLevelProgress(1)};}
export function recordVictory(stars:number):Progress {return {southport:recordLevelVictory(1,stars)};}

const UNLOCK_KEY='level-unlock';
export function allLevelsUnlocked(){return saveStorage.getItem(UNLOCK_KEY)==='true';}
export function unlockAllLevels(){saveStorage.setItem(UNLOCK_KEY,'true');}
export function isLevelUnlocked(id:number){return allLevelsUnlocked()||id===1||loadLevelProgress(id-1).stars>0;}
