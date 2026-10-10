import {Container,Sprite,Graphics,Rectangle,type Texture} from 'pixi.js';
/** Shared source entrance flag geometry; games own timing, reporting and wave rules. */
export class WaveFlagView extends Container {
 readonly halo:Sprite;readonly fill=new Graphics();
 constructor(textures:Map<string,Texture>,sourceScale:number,rotation:number,flying=false){
  super();const sprite=(name:string)=>{const s=new Sprite(textures.get(name)!);s.scale.set(sourceScale);this.addChild(s);return s;};
  this.halo=sprite('nextwaveTimer_glow_0001');this.halo.anchor.set(.5);this.halo.visible=false;
  const background=sprite('nextwaveTimer_Full');background.anchor.set(.5);background.mask=this.fill;this.addChild(this.fill);
  for(const name of ['nextwaveTimer_0001',flying?'nextwaveTimer_0003':'nextwaveTimer_0002'])sprite(name).anchor.set(.5);
  const pointer=sprite('nextwaveTimer_0020');pointer.anchor.set(.5,1);pointer.rotation=rotation;
  this.eventMode='static';this.hitArea=new Rectangle(-this.halo.width/4,-this.halo.height/4,this.halo.width/2,this.halo.height/2);
 }
 progress(remaining:number){this.fill.clear().moveTo(0,0).arc(0,0,23,-Math.PI/2,Math.PI*1.5-remaining*2*Math.PI).closePath().fill(0xffffff);}
}
