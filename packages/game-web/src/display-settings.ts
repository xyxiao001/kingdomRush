import {Rectangle,type Texture} from 'pixi.js';
import {GameView,type ViewData} from './ui-tree';
import {settingsPanelData} from './settings-typography';
import {MapPopup} from './map-popup';
import {RESOLUTIONS,RESOLUTION_LABELS,DISPLAY_MODES,DISPLAY_MODE_LABELS} from '@kingdom-rush/game-storage/settings';
export interface PerformanceSettings {loadPerformanceHud():boolean;savePerformanceHud(value:boolean):void}
import type {Display} from './display';
export type Bind=(name:string,view:GameView,action:()=>void,hover?:(inside:boolean)=>void)=>void;
/** Same layout, source button art and choices as migrated KR1 main.ts. */
export class DisplaySettings {
 readonly view:GameView;readonly popup:MapPopup;
 private resolutionButtons:GameView[]=[];private modeButtons:GameView[]=[];private performance:GameView;
 constructor(options:ViewData,textures:Map<string,Texture>,private display:Display,bind:Bind,private clock:()=>number,private sound:()=>void,private performanceChanged:()=>void,private settings:PerformanceSettings){
  const data=settingsPanelData(options),back=data.children[0],button=structuredClone(back.children.find(v=>v.class==='class GGOptionsButton')!);
  back.children=[back.children[0]];back.children[0].text='显示设置';delete back.children[0].source_lines;
  this.view=new GameView(data,textures,1);this.popup=new MapPopup(this.view);this.view.eventMode='static';this.view.on('pointertap',e=>e.stopPropagation());
  for(const [x,title]of [[200,'渲染分辨率'],[520,'显示模式']] as const){const d=structuredClone(back.children[0]);d.pos={x,y:87};d.size=d.text_size={x:280,y:32};d.anchor={x:140,y:0};d.text=title;d.font_size=22;d.colors.text=[214,189,131];delete d._fitted_font_size;this.view.views[0].addChild(new GameView(d,textures,1));}
  const make=(name:string,text:string,x:number,y:number,action:()=>void)=>{const d=structuredClone(button);d.pos={x,y};d.anchor.x=d.size.x/2;d.children[0].text=text;delete d.children[0].source_lines;const v=new GameView(d,textures,1);this.view.views[0].addChild(v);bind(name,v,()=>{action();this.refresh();sound();});return v;};
  RESOLUTIONS.forEach((v,i)=>this.resolutionButtons.push(make('resolution-'+v,RESOLUTION_LABELS[v],200,164+i*58,()=>display.setResolution(v))));
  DISPLAY_MODES.forEach((v,i)=>this.modeButtons.push(make('display-mode-'+v,DISPLAY_MODE_LABELS[v],520,164+i*58,()=>display.setDisplayMode(v))));
  make('display-close','返回',360,482,()=>this.close());
  this.performance=make('performance-toggle','',520,365,()=>{this.settings.savePerformanceHud(!this.settings.loadPerformanceHud());this.performanceChanged();});this.refresh();display.onLayout(()=>this.resize());
 }
 refresh(){this.resolutionButtons.forEach((v,i)=>v.views[0].setTextColor(RESOLUTIONS[i]===this.display.resolution?[255,223,0]:[255,255,204]));this.modeButtons.forEach((v,i)=>v.views[0].setTextColor(DISPLAY_MODES[i]===this.display.displayMode?[255,223,0]:[255,255,204]));this.performance.views[0].setText(`性能栏：${this.settings.loadPerformanceHud()?'开':'关'}`);}
 show(){this.refresh();this.resize();this.popup.show(this.clock());}
 close(){this.popup.hide(this.clock());}
 resize(){const {x,y,width,height}=this.display.layout.viewport,dx=(width-1920)/2,dy=(height-1080)/2;this.view.position.set(x+dx,y+dy);this.view.hitArea=new Rectangle(-dx,-dy,width,height);const c=this.view.data.colors.background!;this.view.background!.clear().rect(-dx,-dy,width,height).fill(c[0]*65536+c[1]*256+c[2]);}
 update(){this.popup.update(this.clock());}
 key(e:KeyboardEvent){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();this.settings.savePerformanceHud(!this.settings.loadPerformanceHud());this.performanceChanged();this.refresh();return true;}if(e.key==='Escape'&&this.view.visible){this.close();return true;}return this.view.visible;}
}
