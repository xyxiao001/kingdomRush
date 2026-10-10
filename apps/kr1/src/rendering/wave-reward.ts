import {Container,Sprite,type Texture} from 'pixi.js';
import type {Point} from '../content/types';
export class WaveRewards {
  readonly view=new Container();
  private entries:{view:Container;coin:Sprite;born:number}[]=[];
  private timers:{view:Container;born:number;y:number;height:number}[]=[];
  constructor(private textures:Map<string,Texture>){this.view.eventMode='none';}
  show(value:number,point:Point,time:number){
    const view=new Container(),coin=new Sprite(this.textures.get('nextwave_coin_0001')!);coin.scale.set(768/1080);view.addChild(coin);
    let x=coin.width;
    for(const c of `+${value}`){const digit=new Sprite(this.textures.get(`waveReward_${String(c==='+'?11:Number(c)).padStart(4,'0')}`)!);digit.scale.set(768/1080);digit.x=x;x+=Math.round(digit.width*.7);view.addChild(digit);}
    view.pivot.x=x/2;view.position.set(point.x,point.y-coin.height);this.view.addChild(view);this.entries.push({view,coin,born:time});
  }
  showTime(value:number,point:Point,time:number){
    const view=new Container();let x=0,height=0;const text=`-${value}s`;
    for(const c of text){const index=c==='-'?11:c==='s'?12:Number(c),digit=new Sprite(this.textures.get(`waveRewardTimer_${String(index).padStart(4,'0')}`)!);digit.scale.set(768/1080);digit.x=x;x+=Math.round(digit.width*.7);height=digit.height;view.addChild(digit);}
    view.pivot.x=(x+x*.3/text.length)/2;view.position.set(point.x,point.y-height*2/3);this.view.addChild(view);this.timers.push({view,born:time,y:view.y,height});
  }
  update(time:number){
    for(const e of this.timers){const t=Math.min(1,time-e.born),ease=1-(1-t)**2;e.view.alpha=1-ease;e.view.y=e.y-e.height/3*ease;if(t>=1)e.view.destroy({children:true});}this.timers=this.timers.filter(e=>time-e.born<1);
for(const e of this.entries){const age=time-e.born;e.coin.texture=this.textures.get(`nextwave_coin_${String(1+Math.floor(age*30)%14).padStart(4,'0')}`)!;e.view.alpha=(1-Math.min(1,age/1.5))**2;if(age>=1.5)e.view.destroy({children:true});}this.entries=this.entries.filter(e=>time-e.born<1.5);}
  get count(){return this.entries.length;}
}
