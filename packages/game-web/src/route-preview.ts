import {Container,Sprite,type Texture} from 'pixi.js';
import type {Point} from '@kingdom-rush/game-types';
/** Shared KR2 route presentation: original arrow art, distance spacing and fade. */
export class RoutePreview {
 readonly view=new Container();
 private arrows:{sprite:Sprite;distance:number}[]=[];
 private segments:{from:Point;to:Point;start:number;length:number}[]=[];
 private length=0;private started=0;private shownAt=0;private hiddenAt:number|null=null;
 constructor(private texture:Texture,private config:{spacing:number;speed:number;fade:number},private project:(point:Point)=>Point){}
 show(paths:Point[][],simulationTime:number,displayTime:number){
  this.clear();this.started=simulationTime;this.shownAt=displayTime;this.hiddenAt=null;
  for(const points of paths)for(let i=1;i<points.length;i++){const from=points[i-1],to=points[i],length=Math.hypot(to.x-from.x,to.y-from.y);this.segments.push({from,to,start:this.length,length});this.length+=length;}
  for(let distance=0;distance<this.length;distance+=this.config.spacing){const sprite=new Sprite(this.texture);sprite.anchor.set(.5);this.view.addChild(sprite);this.arrows.push({sprite,distance});}
 }
 hide(displayTime:number){this.hiddenAt=displayTime;}
 update(simulationTime:number,displayTime:number){
  for(const arrow of this.arrows){const distance=(arrow.distance+(simulationTime-this.started)*this.config.speed)%this.length,segment=this.segments.find(s=>distance<=s.start+s.length)!,t=(distance-segment.start)/segment.length;arrow.sprite.position.copyFrom(this.project({x:segment.from.x+(segment.to.x-segment.from.x)*t,y:segment.from.y+(segment.to.y-segment.from.y)*t}));arrow.sprite.rotation=-Math.atan2(segment.to.y-segment.from.y,segment.to.x-segment.from.x);}
  this.view.alpha=this.hiddenAt===null?Math.min(1,(displayTime-this.shownAt)/this.config.fade):Math.max(0,1-(displayTime-this.hiddenAt)/this.config.fade);
  if(this.hiddenAt!==null&&displayTime-this.hiddenAt>=this.config.fade)this.clear();
 }
 private clear(){this.view.removeChildren().forEach(v=>v.destroy());this.arrows=[];this.segments=[];this.length=0;}
 get count(){return this.arrows.length;}
}
