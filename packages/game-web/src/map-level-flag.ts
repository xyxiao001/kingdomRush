import {Sprite,type Texture} from 'pixi.js';
export interface FlagProgress {
 stars(id:number):number;
 challenges(id:number):{heroic:number;iron:number};
 unlocked(id:number):boolean;
}
type GameMode='campaign'|'heroic'|'iron';
import {GameView} from './ui-tree';
// ORIGINAL: shared idle, campaign-star and challenge-award sequences, per map flag.
export class MapLevelFlag {
 readonly stars:Sprite[];private wing:Sprite;
 private savedStars:number;private challenges;private animation;
 private started=0;private waitUntil=3+Math.random()*7;
 private starsStarted=-Infinity;private before:number;private sounded:number;
 private challengeStarted=-Infinity;private challengeSounded=true;private changed:GameMode='campaign';
 constructor(readonly id:number,readonly view:GameView,private textures:Map<string,Texture>,private sound:()=>void,private progress:FlagProgress){
  this.savedStars=progress.stars(id);this.before=this.sounded=this.savedStars;this.challenges=progress.challenges(id);
  this.animation=structuredClone(view.data.animation!);delete view.data.animation;
  this.wing=new Sprite(textures.get('map_flag_heroic_0015')!);this.wing.anchor.set(.5);this.wing.position.set(view.x-3,view.y);this.wing.eventMode='none';view.parent!.addChildAt(this.wing,view.parent!.getChildIndex(view));
  this.stars=Array.from({length:3},(_,i)=>{const star=new Sprite(textures.get('mapFlag_star_0017')!);star.position.set([12,28,43][i],12);star.eventMode='none';view.addChild(star);return star;});
 }
 hover(inside:boolean,now:number){if(inside)this.view.setImage(this.challenges.iron?'map_flag_0182':this.savedStars?'map_flag_0181':'map_flag_0180');else{this.started=now;this.waitUntil=now+3+Math.random()*7;}}
 refresh(now:number){
  const stars=this.progress.stars(this.id),c=this.progress.challenges(this.id);
  if(c.heroic&&!this.challenges.heroic||c.iron&&!this.challenges.iron){this.changed=c.iron&&!this.challenges.iron?'iron':'heroic';this.challengeStarted=now;this.challengeSounded=false;}
  this.challenges=c;this.animation.from=c.iron?160:stars?90:24;this.animation.to=c.iron?179:stars?134:64;this.started=now;
  if(stars>this.savedStars){this.starsStarted=now;this.before=this.sounded=this.savedStars;}this.savedStars=stars;
 }
 update(now:number){
  this.view.visible=this.progress.unlocked(this.id);this.wing.visible=this.view.visible&&this.challenges.heroic>0;
  if(!this.view.visible)return;
  if(!this.view.views[0].hovered){if(now>=this.waitUntil){this.started=now;this.waitUntil=now+3+Math.random()*7;}this.view.setImage(`map_flag_${String(Math.min(this.animation.to,this.animation.from!+Math.floor((now-this.started)*30))).padStart(4,'0')}`);}
  const age=now-this.starsStarted;
  this.view.views[0].disabled=age<1.5+(this.savedStars-this.before)*.5;
  if(this.view.views[0].disabled){
   if(age>=.5&&age<1.5)this.view.setImage(`map_flag_${String(Math.min(89,65+Math.floor((age-.5)*30))).padStart(4,'0')}`);
   for(let i=this.before;i<this.savedStars;i++){const t=age-1.5-(i-this.before)*.5;this.stars[i].visible=t>=0;if(t>=0){this.stars[i].texture=this.textures.get(`mapFlag_star_${String(Math.min(17,1+Math.floor(t*30))).padStart(4,'0')}`)!;if(this.sounded<=i){this.sound();this.sounded=i+1;}}}
  }else this.stars.forEach((v,i)=>{v.visible=i<this.savedStars;v.texture=this.textures.get('mapFlag_star_0017')!;});
  const challengeAge=now-this.challengeStarted;
  if(challengeAge<(this.changed==='iron'?4.5:2.5)){
   this.view.views[0].disabled=true;
   if(challengeAge>=.5&&!this.challengeSounded){this.sound();this.challengeSounded=true;}
   if(this.changed==='heroic'){this.wing.visible=challengeAge>=.5;if(this.wing.visible)this.wing.texture=this.textures.get(`map_flag_heroic_${String(Math.min(15,1+Math.floor((challengeAge-.5)*30))).padStart(4,'0')}`)!;}
   else if(challengeAge>=.5)this.view.setImage(`map_flag_${String(Math.min(150,135+Math.floor((challengeAge-.5)*30))).padStart(4,'0')}`);
  }
 }
}
