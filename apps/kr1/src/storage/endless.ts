import {saveStorage} from './slots';
import type {Difficulty} from './difficulty';
const KEY='endless';
type Records=Record<number,Partial<Record<Difficulty,{score:number;wave:number}>>>;
function read():Records {const value=saveStorage.getItem(KEY);return value===null?{}:JSON.parse(value);}
export function loadEndlessRecord(id:number,difficulty:Difficulty){return read()[id]?.[difficulty]??{score:0,wave:0};}
export function recordEndless(id:number,difficulty:Difficulty,score:number,wave:number){
 const records=read(),level=records[id]??(records[id]={}),previous=level[difficulty];
 if(!previous||score>previous.score){level[difficulty]={score,wave};saveStorage.setItem(KEY,JSON.stringify(records));}
}
