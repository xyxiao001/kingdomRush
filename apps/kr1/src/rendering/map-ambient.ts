import data from '../content/generated/map-ambient.json';
import type {GameView} from './ui-tree';
interface Animation {prefix:string;from:number;to:number}
interface Entry {id:string;loop?:boolean;animation?:Animation;animations?:Record<string,Animation>;wait?:[number,number];move?:{from:{x:number;y:number};to:{x:number;y:number};time:number};sequence?:[string,number,number][];sail_time?:number;wait_in?:number;wait_out?:number;pos_in?:{x:number;y:number};pos_out?:{x:number;y:number}}
interface State {entry:Entry;view:GameView;start:number;next:number;sequence:number;phase:number}
const wait=(range:[number,number])=>range[0]+Math.floor(Math.random()*(range[1]-range[0]+1));
// ORIGINAL: MapView load_animations, map_decos_functions ani_seq1 / ma_big_boat.
// These source map props are ambient animations, not clickable easter-egg targets.
export class MapAmbient {
 private states:State[];private origin=0;
 constructor(root:GameView){
  this.states=(data.entries as unknown as Entry[]).map(entry=>{const view=root.all().find(v=>v.data.id===entry.id)!;for(const v of view.all())delete v.data.animation;return {entry,view,start:0,next:0,sequence:0,phase:0};});this.reset(0);
 }
 reset(now:number){this.origin=now;for(const s of this.states){s.sequence=0;s.start=0;s.next=s.entry.wait?wait(s.entry.wait):0;s.phase=Math.random();if(s.entry.sequence){const first=s.entry.sequence[0],a=s.entry.animations![first[0]];s.next=(a.to-a.from+1)/30+wait([first[1],first[2]]);}if(s.entry.move)s.start=-s.phase*s.entry.move.time;}}
 private frame(view:GameView,a:Animation,age:number,loop:boolean){const length=a.to-a.from+1,index=Math.max(0,Math.floor(age*30));view.setImage(`${a.prefix}_${String(a.from+(loop?index%length:Math.min(length-1,index))).padStart(4,'0')}`);}
 update(now:number){const time=now-this.origin;
  for(const s of this.states){const {entry:e,view:v}=s;
   if(e.id==='ma_big_boat'){
    const outbound=e.wait_out!,sail=e.sail_time!,idle=e.wait_in!,inStart=outbound,change=inStart+.8*sail+idle,outStart=change+idle,cycle=outStart+sail,t=time%cycle;
    const incoming=v.views[1],outgoing=v.views[0];v.visible=t>=inStart;
    if(t<outStart){const q=Math.min(1,Math.max(0,(t-inStart)/sail)),z=1-(1-q)**2;v.position.set(e.pos_out!.x+(e.pos_in!.x-e.pos_out!.x)*z,e.pos_out!.y+(e.pos_in!.y-e.pos_out!.y)*z);}
    else{const q=(t-outStart)/sail,z=q*q;v.position.set(e.pos_in!.x+(e.pos_out!.x-e.pos_in!.x)*z,e.pos_in!.y+(e.pos_out!.y-e.pos_in!.y)*z);}
    const fade=Math.min(1,Math.max(0,t-change));incoming.alpha=1-fade;outgoing.alpha=fade;
    this.frame(incoming,e.animations![t<inStart+.8*sail?'in_sail':'in_idle'],time,true);this.frame(outgoing,e.animations![t<outStart?'out_idle':'out_sail'],t-(t<outStart?change:outStart),true);continue;
   }
   if(e.sequence){if(time>=s.next){s.sequence=(s.sequence+1)%e.sequence.length;s.start=time;const item=e.sequence[s.sequence],a=e.animations![item[0]];s.next=time+(a.to-a.from+1)/30+wait([item[1],item[2]]);}this.frame(v,e.animations![e.sequence[s.sequence][0]],time-s.start,false);continue;}
   const a=e.animation!;
   if(e.move){const m=e.move,age=time-s.start;if(age>=m.time){v.visible=false;if(time>=s.next){s.start=time+wait(e.wait!);s.next=s.start+m.time;}}else if(age>=0){v.visible=true;const t=age/m.time;v.position.set(m.from.x+(m.to.x-m.from.x)*t,m.from.y+(m.to.y-m.from.y)*t);}this.frame(v,a,time,true);continue;}
   if(e.loop)this.frame(v,a,time+s.phase*(a.to-a.from+1)/30,true);
   else{if(time>=s.next){s.start=time;s.next=time+(a.to-a.from+1)/30+wait(e.wait!);}this.frame(v,a,s.start===0?Infinity:time-s.start,false);}
  }
 }
 get state(){return this.states.filter(s=>s.entry.id==='ma_big_boat'||s.entry.id==='ma_treant'||s.entry.move).map(s=>({id:s.entry.id,x:s.view.x,y:s.view.y,visible:s.view.visible,image:s.view.imageName}));}
}
