import {Application,Rectangle,UPDATE_PRIORITY} from 'pixi.js';
import {screenLayout,renderQuality} from './display-layout';
import {setTextDensity} from './ui-tree';
import type {Resolution,DisplayMode} from '@kingdom-rush/game-types';
export interface DisplayStore {loadResolution():Resolution;saveResolution(value:Resolution):void;loadDisplayMode():DisplayMode;saveDisplayMode(value:DisplayMode):void}
/** Mature independent quality/framing and live DPR redraw; settings stay game-owned. */
export class Display {
 resolution:Resolution;displayMode:DisplayMode;
 layout=screenLayout(1920,1080,'auto');metrics=renderQuality(1920,1080,1,'native');
 private density=0;private configured=false;private listeners=new Set<()=>void>();
 onLayout(listener:()=>void){this.listeners.add(listener);listener();}
 private observer:ResizeObserver;
 constructor(private app:Application,private host:HTMLElement,private layoutChanged:()=>void,private settings:DisplayStore){
  this.resolution=settings.loadResolution();this.displayMode=settings.loadDisplayMode();this.layout=screenLayout(1920,1080,this.displayMode);this.metrics=renderQuality(1920,1080,1,this.resolution);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
  app.ticker.add(()=>{if(this.density!==devicePixelRatio)this.resize();},undefined,UPDATE_PRIORITY.HIGH);
 }
 resize(framingChanged=false){
  const box=this.host.getBoundingClientRect();this.density=devicePixelRatio;
  const next=screenLayout(box.width,box.height,this.displayMode),changed=!this.configured||framingChanged||JSON.stringify(next)!==JSON.stringify(this.layout);this.layout=next;this.configured=true;this.metrics=renderQuality(box.width,box.height,this.density,this.resolution);
  const density=Math.min(this.metrics.finalBacking.width/this.layout.width,this.metrics.finalBacking.height/this.layout.height);
  this.app.renderer.resize(this.layout.width,this.layout.height,density);setTextDensity(Math.max(1,density));
  this.app.stage.hitArea=new Rectangle(0,0,this.layout.width,this.layout.height);if(changed){this.layoutChanged();for(const listener of this.listeners)listener();}
 }
 setResolution(value:Resolution){this.resolution=value;this.settings.saveResolution(value);this.resize();}
 setDisplayMode(value:DisplayMode){const changed=value!==this.displayMode;this.displayMode=value;this.settings.saveDisplayMode(value);this.resize(changed);}
 destroy(){this.observer.disconnect();}
}
