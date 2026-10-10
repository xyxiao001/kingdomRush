import {Container,Graphics,Sprite,type Texture} from 'pixi.js';
import {GameView} from './ui-tree';
type GameMode='campaign'|'heroic'|'iron';
const outBack=(t:number,s=1.70158)=>1+(s+1)*(t-1)**3+s*(t-1)**2;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));

export class VictoryAnimation {
  private started=-Infinity;private stars=0;private sounded=0;private musicStarted=false;
  private particles=new Container();
  private sparks:{sprite:Sprite;vx:number;vy:number;life:number}[]=[];
  constructor(private view:GameView,private textures:Map<string,Texture>,private sound:()=>void,private music:()=>void){
    view.addChild(this.particles);
    for(const group of view.views.slice(0,2)){
      const mask=new Graphics().rect(0,0,group.data.size.x,group.data.size.y).fill(0xffffff);group.addChild(mask);group.mask=mask;
    }
  }
  show(now:number,stars:number,mode:GameMode='campaign'){
    this.view.views[2].setImage('victoryBadges_notxt_'+({campaign:'0002',heroic:'0003',iron:'0001'}[mode]));
    this.view.views[3].y=this.view.views[3].data.pos.y+(mode==='iron'?40:0);
    this.started=now;this.stars=stars;this.sounded=0;this.musicStarted=false;
    for(const p of this.sparks)p.sprite.destroy();this.sparks=[];
    for(let i=0;i<150;i++){
      const sprite=new Sprite(this.textures.get('victory_star')!);sprite.anchor.set(.5);sprite.scale.set(768/1080);sprite.blendMode='add';this.particles.addChild(sprite);
      const angle=-Math.PI/2+(Math.random()-.5)*2*Math.PI/3,speed=400+Math.random()*600;
      this.sparks.push({sprite,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:Math.random()*1.5});
    }
    this.update(now);
  }
  update(now:number){
    const age=now-this.started;
    this.view.scale.set(.6+.4*outBack(clamp(age/.6),1.5));
    const last=[0,19,38,54][this.stars],starAge=age-.65;
    const stars=this.view.views[3];stars.visible=starAge>=0;
    if(stars.visible)stars.setImage(`victoryStars_${String(Math.min(last,1+Math.floor(starAge*30))).padStart(4,'0')}`);
    while(this.sounded<this.stars&&starAge>=this.sounded*.7){this.sound();this.sounded++;}
    const chainStart=.65+last/30;
    for(const [index,delay] of [[1,0],[0,.5]]){
      const group=this.view.views[index],chain=group.views[0],t=clamp((age-chainStart-delay)/.5);
      chain.y=chain.data.anchor.y*outBack(t);group.eventMode=age>=chainStart+1?'auto':'none';
    }
    if(age>=chainStart+1&&!this.musicStarted){this.musicStarted=true;this.music();}
    const t=age-.15;
    for(const p of this.sparks){p.sprite.visible=t>=0&&t<p.life;if(p.sprite.visible){p.sprite.position.set(this.view.data.size.x/2+p.vx*t,this.view.data.size.y/3+p.vy*t+1000*t*t);p.sprite.alpha=1-t/p.life;p.sprite.scale.set(768/1080*(1+.4*t/p.life));}}
  }
  get state(){return {started:this.started,scale:this.view.scale.x,starsFrame:this.view.views[3].imageName,starsVisible:this.view.views[3].visible};}
}
