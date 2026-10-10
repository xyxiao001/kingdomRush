import {Container,Graphics,Rectangle,type Texture} from 'pixi.js';
import {GameView,type ViewData} from './ui-tree';
import {progress,outQuad} from './ui-motion';

interface Entry {icon:ViewData;view:ViewData;queue:{x:number;y:number}}
interface Badge {id:string;view:GameView;born:number;closing:number|null;fromScale:number;fromY:number;toY:number;moveAt:number}
const inBack=(t:number)=>t*t*((1.70158+1)*t-1.70158);
const outBack=(t:number)=>1+(1.70158+1)*(t-1)**3+1.70158*(t-1)**2;

// ORIGINAL: NotificationQueue / NotificationIcon / NotificationView (game_gui.lua).
// Badges mark seen at arrival. Opening a card pauses gameplay, closing resumes immediately.
export class Notifications {
  readonly queue=new Container();
  readonly overlay=new Container();
  private shade=new Graphics().rect(0,0,1365.3333333333,768).fill({color:0,alpha:120/255});
  private badges:Badge[]=[];
  private card:GameView|null=null;
  private active:string|null=null;
  private opening=false;
  private started=0;
  private fromScale=1;
  constructor(private data:Record<string,Entry>,private textures:Map<string,Texture>,private now:()=>number,private pause:(value:boolean)=>void,private sound:(key:string,gain?:number)=>void,private opened:(id:string)=>void){
    this.overlay.addChild(this.shade);this.overlay.visible=false;
    this.shade.eventMode='static';this.shade.on('pointerdown',e=>e.stopPropagation());
  }
  add(id:string){
    const entry=this.data[id],view=new GameView(entry.icon,this.textures,768/1080),now=this.now();
    const y=this.badges.length*(entry.icon.size.y+10);
    view.position.set(entry.queue.x,entry.queue.y+y);
    const badge:Badge={id,view,born:now,closing:null,fromScale:1,fromY:view.y,toY:view.y,moveAt:now};
    this.badges.push(badge);this.queue.addChild(view);
    view.button(()=>{
      if(this.active!==null)return;
      this.show(id,entry.view);badge.closing=this.now();badge.fromScale=view.scale.x;view.disabled=true;
      this.opened(id);
    });
    this.sound('notificationBadge',.8);this.update(now);
  }
  show(id:string,view:ViewData,pages?:{id:string;view:ViewData}[]){
    this.card?.destroy();this.card=new GameView(view,this.textures,768/1080);
    this.card.eventMode='static';this.card.hitArea=new Rectangle(0,0,this.card.data.size.x,this.card.data.size.y);
    this.card.on('pointerdown',e=>e.stopPropagation());
    for(const button of this.card.all().filter(v=>v.data.class==='class GGButton'))button.button(()=>{
      if(button.data.id==='tutorial-next'){
        const [next,...rest]=pages!;this.show(next.id,next.view,rest);
      }else this.close();
    });
    this.overlay.addChild(this.card);this.active=id;this.opening=true;this.started=this.now();
    this.overlay.visible=true;this.pause(true);this.sound('notificationOpen');this.update(this.started);
  }
  close(){
    if(!this.opening||!this.card)return;
    this.fromScale=this.card.scale.x;this.started=this.now();this.opening=false;
    this.card.interactiveChildren=false;this.pause(false);this.sound('notificationClose');
  }
  update(now:number){
    for(let i=this.badges.length-1;i>=0;i--){
      const b=this.badges[i];
      b.view.y=b.fromY+(b.toY-b.fromY)*outQuad(progress(now,b.moveAt,.3));
      if(b.closing!==null){
        const t=progress(now,b.closing,.4);b.view.alpha=1-t;b.view.scale.set(b.fromScale+(.4-b.fromScale)*inBack(t));
        if(t===1){
          this.badges.splice(i,1);b.view.destroy();
          for(let j=i;j<this.badges.length;j++){const next=this.badges[j];next.fromY=next.view.y;next.toY-=b.view.data.size.y+10;next.moveAt=now;}
        }
      }else{
        const age=now-b.born,phase=Math.floor(age/.3),t=(age% .3)/.3,e=(1-Math.cos(Math.PI*t))/2;
        const from=phase===0?.8:phase%2===1?1.015:.985,to=phase%2===0?1.015:.985;
        b.view.scale.set(from+(to-from)*e);
      }
    }
    if(!this.card)return;
    const t=progress(now,this.started,.4);
    this.card.alpha=this.opening?t:1-t;
    this.card.scale.set(this.opening?.5+.5*outBack(t):this.fromScale+(.5-this.fromScale)*inBack(t));
    this.shade.alpha=this.opening?progress(now,this.started,.25)**2:1-progress(now,this.started,.25)**2;
    if(!this.opening&&t===1){this.card.destroy();this.card=null;this.active=null;this.overlay.visible=false;}
  }
  reset(){for(const b of this.badges)b.view.destroy();this.badges=[];this.card?.destroy();this.card=null;this.active=null;this.opening=false;this.overlay.visible=false;}
  get visible(){return this.overlay.visible;}
  setViewport(width:number,height:number){
    const dx=(width-1365.3333333333)/2,dy=(height-768)/2;
    this.overlay.position.set(dx,dy);
    this.shade.clear().rect(-dx,-dy,width,height).fill({color:0,alpha:120/255});
  }
  get state(){return {active:this.active,opening:this.opening,alpha:this.card?.alpha,scale:this.card?.scale.x,badges:this.badges.map(b=>({id:b.id,y:b.view.y,alpha:b.view.alpha,closing:b.closing!==null}))};}
}
