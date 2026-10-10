import {Graphics,type Container} from 'pixi.js';
import type {Bounds,Point} from './types';
import type {DisplayMode} from './types';
import {cameraFrame,REFERENCE_BOUNDS} from './display-layout';

/** Reference web_zoom.lua: anchor zoom to the gesture, clamp, leave HUD fixed. */
export class GameCamera {
  zoom=1;x=0;y=0;
  private shake:Point={x:0,y:0};
  setShake(offset:Point){this.shake=offset;this.target.position.set(this.x+offset.x,this.y+offset.y);}
  frameScale=1;
  viewport:Bounds={...REFERENCE_BOUNDS};
  private worldBounds:Bounds={...REFERENCE_BOUNDS};
  private safeBounds:Bounds|undefined;
  private clip=new Graphics();
  constructor(private target:Container,readonly maxZoom:number,private baseScale=1){}
  get scale(){return this.frameScale*this.zoom;}
  configure(viewport:Bounds,world:Bounds,mode:DisplayMode,safe?:Bounds){
    const center=this.unproject({x:this.viewport.x+this.viewport.width/2,y:this.viewport.y+this.viewport.height/2});
    const frame=cameraFrame(viewport,world,mode,safe);
    this.viewport=frame.viewport;this.frameScale=frame.scale;this.worldBounds=world;this.safeBounds=mode==='auto'?safe:undefined;
    this.x=this.viewport.x+this.viewport.width/2-center.x*this.scale;
    this.y=this.viewport.y+this.viewport.height/2-center.y*this.scale;
    this.clip.clear().rect(this.viewport.x,this.viewport.y,this.viewport.width,this.viewport.height).fill(0xffffff);
    this.clip.eventMode='none';
    if(this.target.parent){this.target.parent.addChild(this.clip);this.target.mask=this.clip;}
    this.apply();
  }
  zoomAt(factor:number,from:Point,to=from){
    const next=Math.max(1,Math.min(this.maxZoom,this.zoom*factor));
    this.x=to.x-this.shake.x-(from.x-this.x-this.shake.x)*next/this.zoom;this.y=to.y-this.shake.y-(from.y-this.y-this.shake.y)*next/this.zoom;this.zoom=next;this.apply();
  }
  pan(dx:number,dy:number){this.x+=dx;this.y+=dy;this.apply();}
  reset(){this.shake={x:0,y:0};this.zoom=1;this.x=this.viewport.x+this.viewport.width/2-(this.worldBounds.x+this.worldBounds.width/2)*this.scale;this.y=this.viewport.y+this.viewport.height/2-(this.worldBounds.y+this.worldBounds.height/2)*this.scale;this.apply();}
  project(p:Point):Point{return {x:p.x*this.scale+this.x+this.shake.x,y:p.y*this.scale+this.y+this.shake.y};}
  unproject(p:Point):Point{return {x:(p.x-this.x-this.shake.x)/this.scale,y:(p.y-this.y-this.shake.y)/this.scale};}
  contains(p:Point){const v=this.viewport;return p.x>=v.x&&p.y>=v.y&&p.x<=v.x+v.width&&p.y<=v.y+v.height;}
  get visibleBounds(){const p=this.unproject(this.viewport);return {...p,width:this.viewport.width/this.scale,height:this.viewport.height/this.scale};}
  private apply(){
    const v=this.viewport,w=this.worldBounds,s=this.scale;
    let minX=v.x+v.width-(w.x+w.width)*s,maxX=v.x-w.x*s;
    let minY=v.y+v.height-(w.y+w.height)*s,maxY=v.y-w.y*s;
    // Safe framing constrains the base view. Deliberate user zoom/pan explores inside world bounds.
    if(this.safeBounds&&this.zoom===1){const b=this.safeBounds;
      minX=Math.max(minX,v.x-b.x*s);maxX=Math.min(maxX,v.x+v.width-(b.x+b.width)*s);
      minY=Math.max(minY,v.y-b.y*s);maxY=Math.min(maxY,v.y+v.height-(b.y+b.height)*s);
    }
    this.x=Math.min(maxX,Math.max(minX,this.x));this.y=Math.min(maxY,Math.max(minY,this.y));
    this.target.scale.set(this.baseScale*s);this.target.position.set(this.x+this.shake.x,this.y+this.shake.y);
  }
}
