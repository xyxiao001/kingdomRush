import {Rectangle,type Texture} from 'pixi.js';
import {GameView,type ViewData} from './ui-tree';
import {settingsPanelData} from './settings-typography';
import {MapPopup} from './map-popup';
import {bindVolumeSliders} from './volume-sliders';
import type {Volumes} from '@kingdom-rush/game-types';
/** Source options layout and slider lifecycle shared by map and paused battle. */
export class OptionsMenu {
 readonly view:GameView;readonly popup:MapPopup;readonly actions=new Map<string,GameView>();
 private volumes:Volumes;private closing=false;
 constructor(options:ViewData,textures:Map<string,Texture>,private config:{
  clock:()=>number;title:string;detail:string;load:()=>Volumes;save:(v:Volumes)=>void;volume:(kind:keyof Volumes,value:number)=>void;
  buttons:{id:string;label:string;action:()=>void}[];closed:()=>void;
 }){
  const data=settingsPanelData(options),body=data.children[0],button=structuredClone(body.children.find(v=>v.class==='class GGOptionsButton')!);
  body.children=body.children.filter(v=>v.class!=='class GGOptionsButton');
  body.children[0].text=config.title;delete body.children[0].source_lines;
  const detail=body.children.find(v=>v.id==='100638')!;detail.text=config.detail;delete detail.source_lines;
  this.view=new GameView(data,textures,1);this.popup=new MapPopup(this.view,.5,.25);this.view.eventMode='static';this.view.on('pointertap',e=>e.stopPropagation());
  this.volumes=config.load();bindVolumeSliders(this.view.all().filter(v=>v.data.class==='class VolumeSlider'),this.volumes,config.volume);
  config.buttons.forEach((b,i)=>{const d=structuredClone(button);d.id=b.id;d.pos={x:config.buttons.length===3?238+i*220:220+(i%2)*280,y:config.buttons.length===3?460:410+Math.floor(i/2)*80};d.children[0].text=b.label;delete d.children[0].source_lines;const v=new GameView(d,textures,1);this.view.views[0].addChild(v);this.actions.set(b.id,v);v.button(()=>{config.save(this.volumes);b.action();});});
 }
 show(){this.closing=false;this.popup.show(this.config.clock());}
 close(){this.config.save(this.volumes);this.closing=true;this.popup.hide(this.config.clock());}
 update(){this.popup.update(this.config.clock());if(this.closing&&!this.view.visible){this.closing=false;this.config.closed();}}
 resize(viewport:{x:number;y:number;width:number;height:number}){const {x,y,width,height}=viewport,dx=(width-1920)/2,dy=(height-1080)/2;this.view.position.set(x+dx,y+dy);this.view.hitArea=new Rectangle(-dx,-dy,width,height);const c=this.view.data.colors.background!;this.view.background!.clear().rect(-dx,-dy,width,height).fill(c[0]*65536+c[1]*256+c[2]);}
}
