import { Container, Graphics, Rectangle, Sprite, type Texture } from 'pixi.js';
import type { Battle } from '../simulation/battle';
import type { GameView } from './ui-tree';
import { outQuad, progress } from './ui-motion';

// game_gui.lua WaveFlag / IncomingTooltip. Simulation time fills the arc;
// presentation time drives hover fades, pulse and the outgoing flag.
export class WavePresentation {
  route=0;
  private available = false;
  private wave = -1;
  private started = 0;
  private hidingAt = -Infinity;
  private hidingScale = 1;
  private hidingAlpha = 1;
  private tipTarget = false;
  private tipStarted = 0;
  private tipFrom = 0;
  private arc = new Graphics();
  private path = new Container();
  private arrows: Sprite[] = [];
  private pathFrom = 0;
  private pathAlpha = 0;
  private pathAt = 0;
  private pathTarget = false;
  private pathStarted = 0;
  private fill = 1;
  constructor(private flag: GameView, private tip: GameView, world: Container, private texture: Texture) {
    const circle = flag.views[1];circle.addChild(this.arc);circle.mask=this.arc;
    flag.hitArea = new Rectangle(flag.data.size.x*.25,flag.data.size.y*.25,flag.data.size.x*.5,flag.data.size.y*.5);
    this.path.eventMode='none';this.path.x=(768*16/9-1024)/2;world.addChild(this.path);
  }
  hover(inside: boolean, now: number) {
    this.setTip(inside && !this.flag.disabled, now);
  }
  private setTip(visible: boolean, now: number) {
    if(visible===this.tipTarget)return;
    this.tipFrom=this.tip.alpha;this.tipStarted=now;this.tipTarget=visible;
    if(visible){this.tip.alpha=0;this.tipFrom=0;this.tip.visible=true;}
  }
  reset() {
    this.available=false;this.wave=-1;this.flag.hovered=false;this.hidingAt=-Infinity;
    this.tipTarget=false;this.tip.visible=false;this.tip.alpha=0;this.flag.visible=false;
    this.pathTarget=false;this.path.visible=false;this.pathAlpha=0;
  }
  update(battle: Battle, now: number, idle: boolean) {
    const available = battle.paused ? this.available : battle.canSendWave&&battle.level.waves[battle.wave].spawns.some(s=>s.path===this.route);
    if (available && (!this.available || this.wave !== battle.wave)) {
      this.wave=battle.wave;this.started=now;this.hidingAt=-Infinity;
      this.flag.visible=true;this.flag.alpha=1;
    } else if(!available && this.available) {
      this.hidingAt=now;this.hidingScale=this.flag.scale.x;this.hidingAlpha=this.flag.alpha;
    }
    this.available=available;
    this.flag.disabled=!available || !idle || battle.paused;
    if(available){
      this.flag.scale.set(1+.075*Math.sin(2*Math.PI*(now-this.started)*1.25));
      this.flag.alpha=idle?1:.2;
      this.fill=battle.wave===0?1:1-battle.nextWaveIn/battle.level.waves[battle.wave].delay;
      const radius=this.flag.views[1].data.size.x/2;
      this.arc.clear();
      if(this.fill>0)this.arc.moveTo(radius,radius).arc(radius,radius,radius,-Math.PI/2,-Math.PI/2+this.fill*Math.PI*2).closePath().fill(0xffffff);
    } else if(this.flag.visible){
      const t=progress(now,this.hidingAt,.5),e=outQuad(t);
      this.flag.scale.set(this.hidingScale+(1.5-this.hidingScale)*e);this.flag.alpha=this.hidingAlpha*(1-e);
      if(t===1)this.flag.visible=false;
    }
    const reportVisible=this.flag.hovered&&!this.flag.disabled;
    this.flag.views[0].visible=reportVisible;
    this.setTip(reportVisible,now);
    const t=progress(now,this.tipStarted,.25);
    this.tip.alpha=this.tipFrom+((this.tipTarget?1:0)-this.tipFrom)*outQuad(t);
    if(!this.tipTarget&&t===1)this.tip.visible=false;
    if(this.tipTarget){
      const counts:Record<string,number>={};
      for(const spawn of battle.level.waves[battle.wave].spawns.filter(s=>s.path===this.route))counts[spawn.kind]=(counts[spawn.kind]??0)+1;
      const height=50+Object.keys(counts).length*28/1.40625;
      this.tip.background!.clear().rect(0,0,this.tip.data.size.x,height).fill(0x15110d);
      this.tip.views[2].setText(Object.entries(counts).map(([kind,count])=>`${battle.enemyStats[kind as keyof typeof battle.enemyStats].name} x ${count}`).join('\n'));
    }
    this.updatePath(battle,reportVisible,now);
  }
  private updatePath(battle:Battle,visible:boolean,now:number){
    if(visible!==this.pathTarget){
      this.pathTarget=visible;this.pathFrom=this.pathAlpha;this.pathAt=now;
      if(visible)this.pathStarted=battle.time;
    }
    this.pathAlpha=this.pathFrom+((visible?1:0)-this.pathFrom)*progress(now,this.pathAt,.25);
    this.path.visible=this.pathAlpha>0;if(!this.path.visible)return;
    this.path.alpha=this.pathAlpha;
    // Fusion path_marching_ants_controller: one arrow per four path nodes, speed 45.
    const track=battle.tracks[battle.content.routes[this.route][0]],spacing=track.length/(track.points.length-1)*4;
    const shift=((battle.time-this.pathStarted)*45)%spacing;
    let count=0,index=0;
    for(let d=shift;d<track.length;d+=spacing){
      while(index<track.points.length-2&&track.cumulative[index+1]<d)index++;
      const a=track.points[index],b=track.points[index+1],t=(d-track.cumulative[index])/(track.cumulative[index+1]-track.cumulative[index]);
      if(!this.arrows[count]){const s=new Sprite(this.texture);s.anchor.set(.5);s.scale.set(768/1080);this.path.addChild(s);this.arrows.push(s);}
      const sprite=this.arrows[count++];sprite.visible=true;sprite.position.set(a.x+(b.x-a.x)*t,768-a.y-(b.y-a.y)*t);sprite.rotation=-Math.atan2(b.y-a.y,b.x-a.x);
    }
    for(let i=count;i<this.arrows.length;i++)this.arrows[i].visible=false;
  }
  destroy(){this.path.destroy({children:true});}
  get state(){return {available:this.available,visible:this.flag.visible,disabled:this.flag.disabled,scale:this.flag.scale.x,alpha:this.flag.alpha,fill:this.fill,tipVisible:this.tip.visible,tipAlpha:this.tip.alpha,pathVisible:this.path.visible,pathAlpha:this.pathAlpha};}
}
