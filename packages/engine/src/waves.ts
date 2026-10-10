export interface WaveSpawn<D=unknown> {
 interval:number;interval_next:number;max:number;max_same:number;creep:string;creep_aux?:string;
 fixed_sub_path:number;path:number;spawn_data?:D;on_end_signal?:string;
}
export interface WaveGroup<D=unknown> {interval:number;waves:{delay:number;path_index:number;notification?:string;spawns:WaveSpawn<D>[]}[]}
export interface SpawnEvent<D=unknown> {time:number;kind:string;path:number;lane:number|null;data?:D}
/** Source systems.wave_spawn: each route owns a sequential spawner, with delays in frames. */
export function waveSchedule<D=unknown>(group:WaveGroup<D>){
  const signals:{time:number;name:string}[]=[],events:SpawnEvent<D>[]=[],notifications:{time:number;kind:string}[]=[];let duration=0;
  for(const wave of group.waves){
    let time=wave.delay/30;
    wave.spawns.forEach((s,index)=>{
      notifications.push({time,kind:s.creep});if(s.creep_aux)notifications.push({time,kind:s.creep_aux});
      let kind=s.creep,count=0;
      for(let i=0;i<s.max;i++){
        time+=s.interval/30;
        if(s.creep_aux&&s.max_same>0&&count>=s.max_same){kind=kind===s.creep?s.creep_aux:s.creep;count=0;}
        events.push({time,kind,path:wave.path_index-1,lane:s.fixed_sub_path===1?s.path-1:null,...(s.spawn_data?{data:s.spawn_data}:{})});count++;
      }
      if(s.max===0)time+=s.interval/30;
      if(s.on_end_signal)signals.push({time,name:s.on_end_signal});
      if(index<wave.spawns.length-1)time+=s.interval_next/30;
    });
    duration=Math.max(duration,time);
  }
  return {signals:signals.sort((a,b)=>a.time-b.time),events:events.sort((a,b)=>a.time-b.time),notifications:notifications.sort((a,b)=>a.time-b.time),duration};
}
