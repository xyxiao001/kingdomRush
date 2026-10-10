import {AudioRuntime} from '@kingdom-rush/audio';
import {resources} from '../loading/progress';
// KR1 owns its initial volumes, cue keys and per-track gain.
export class GameAudio extends AudioRuntime {
 constructor(){super(resources,()=>({sfx:1,music:.5}),import.meta.env.MODE==='test');}
 play(key:string,gain=1,group?:string,limit?:number){this.playSound(key,gain,group,limit);}
 startMusic(key:'music'|'prepare'|'mapMusic'|'bossMusic'){this.playMusic(key,{music:.7,prepare:.8,mapMusic:.6,bossMusic:.7}[key],true,[]);}
}
