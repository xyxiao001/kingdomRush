import data from '../content/generated/combat-audio.json';

export type CombatCue = keyof typeof data.sounds;
type Cue = {files:string[];gain?:number|number[];ignore?:number;mode?:string;source_group:string};
// ORIGINAL: sound_db:play advances a sequence even when its ignore window suppresses playback.
export class CombatCues {
  private sequence = new Map<string,number>();
  private last = new Map<string,number>();
  constructor(private play:(key:string,gain:number,group:string,limit:number)=>void,private random= Math.random,private cues:Record<string,Cue>=data.sounds) {}
  request(id:string,time:number) {
    const cue: Cue=this.cues[id],index=cue.mode==='sequence'?(this.sequence.get(id)??0):cue.mode==='random'?Math.floor(this.random()*cue.files.length):0;
    if(cue.mode==='sequence')this.sequence.set(id,(index+1)%cue.files.length);
    if(cue.ignore!==undefined&&time-(this.last.get(id)??0)<cue.ignore)return;
    const gain=Array.isArray(cue.gain)?cue.gain[0]+(cue.gain[1]-cue.gain[0])*this.random():cue.gain??1;
    const group=cue.source_group as keyof typeof data.source_groups;
    this.play(cue.files[index],gain*data.group_gains[group as keyof typeof data.group_gains],group,data.source_groups[group].max_sources);
    this.last.set(id,time);
  }
}
