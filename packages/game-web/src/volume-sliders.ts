import {Rectangle} from 'pixi.js';
import type {GameView} from './ui-tree';

import type {Volumes} from '@kingdom-rush/game-types';
export function bindVolumeSliders(sliders:GameView[],volumes:Volumes,changed:(kind:keyof Volumes,value:number)=>void){
 for(const slider of sliders){
  const kind=slider.data.id==='s_sfx'?'sfx':'music',fill=slider.views[0],knob=slider.views[1];let dragging=false;
  const set=(value:number)=>{volumes[kind]=value;fill.scale.x=value;knob.x=fill.x+fill.data.size.x*value;changed(kind,value);};set(volumes[kind]);
  const move=(p:{x:number;y:number})=>set(Math.max(0,Math.min(1,(slider.toLocal(p).x-fill.x)/fill.data.size.x)));
  slider.eventMode='static';slider.hitArea=new Rectangle(0,0,slider.data.size.x,slider.data.size.y);knob.button(()=>{});knob.on('pointerdown',e=>{dragging=true;move(e.global);});
  slider.on('pointerdown',e=>{dragging=true;move(e.global);});slider.on('globalpointermove',e=>{if(dragging)move(e.global);});slider.on('pointerup',()=>{dragging=false;});slider.on('pointerupoutside',()=>{dragging=false;});
 }
}
