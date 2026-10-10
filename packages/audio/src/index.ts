import type {ResourceLoader} from '@kingdom-rush/asset-runtime/progress';
export class AudioRuntime {
  private context: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private files = new Map<string, Promise<AudioBuffer>>();
  private master: GainNode;
  private music: AudioBufferSourceNode | null = null;
  private musicGain: GainNode;
  private effects = new Set<AudioBufferSourceNode>();
  private grouped = new Map<AudioBufferSourceNode,{group:string;ends:number}>();
  private musicKey:string|null=null;
  readonly events:{key:string;time:number}[]=[];
  muted = false;

  constructor(private resources:Pick<ResourceLoader,'fetch'|'ready'>,volumes:()=>{sfx:number;music:number},private recordEvents:boolean) {
    this.context = new AudioContext();
    const initial=volumes();
    this.master = this.context.createGain(); this.master.gain.value = initial.sfx;
    this.master.connect(this.context.destination);
    this.musicGain = this.context.createGain(); this.musicGain.gain.value = initial.music; this.musicGain.connect(this.context.destination);
  }
  async load(sounds: Record<string, string>) {
    await Promise.all(Object.entries(sounds).map(async ([key, url]) => {
      if(!this.files.has(url))this.files.set(url,this.resources.fetch(url).then(r=>r.arrayBuffer()).then(data=>this.context.decodeAudioData(data)).then(buffer=>{this.resources.ready(url);return buffer;}));
      this.buffers.set(key, await this.files.get(url)!);
    }));
  }
  protected playSound(key: string, gain=1, group?:string, limit?:number) {
    if(group!==undefined){
      const active=[...this.grouped].filter(([,v])=>v.group===group);
      if(active.length===limit){const [source]=active.sort((a,b)=>a[1].ends-b[1].ends)[0];source.stop();this.grouped.delete(source);}
    }
    const source = this.context.createBufferSource();
    const volume=this.context.createGain();volume.gain.value=gain;
    source.buffer = this.buffers.get(key)!; source.connect(volume);volume.connect(this.master);this.effects.add(source);source.onended=()=>{this.effects.delete(source);this.grouped.delete(source);source.disconnect();volume.disconnect();};source.start();
    if(group!==undefined)this.grouped.set(source,{group,ends:this.context.currentTime+source.buffer.duration});
    if(this.recordEvents)this.events.push({key,time:this.context.currentTime});
    return source;
  }
  protected playMusic(key:string,volume:number,loop:boolean,start:[number?,number?]) {
    if (this.music) this.music.stop();
    this.music = this.context.createBufferSource(); this.music.buffer = this.buffers.get(key)!;
    const gain = this.context.createGain(); gain.gain.value = volume;
    this.music.connect(gain); gain.connect(this.musicGain); this.music.loop = loop; this.music.start(...start);
    this.musicKey=key;
    if(this.recordEvents)this.events.push({key,time:this.context.currentTime});
  }
  setVolume(kind: 'sfx' | 'music', value: number) { if (kind === 'sfx') this.master.gain.value = value; else this.musicGain.gain.value = value; }
  stopMusic() { this.music?.stop(); this.music = null;this.musicKey=null; }
  stopAll() { this.stopMusic();for(const source of this.effects)source.stop();this.effects.clear();this.grouped.clear(); }
  toggleMute() { this.muted = !this.muted; this.master.gain.value = this.muted ? 0 : .3; }
  async pause() { await this.context.suspend(); }
  async resume() { await this.context.resume(); }
  get state(){return {context:this.context.state,music:this.musicKey,sfx:this.master.gain.value,volume:this.musicGain.gain.value,events:this.events};}
  async destroy() { await this.context.close(); }
}
