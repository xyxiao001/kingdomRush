import { Rectangle, type Texture } from 'pixi.js';
import { GameView, type ViewData } from './ui-tree';
import { MapPopup } from './map-popup';

export interface CatalogData {
  base: ViewData; towerGrid: ViewData; enemyPages: ViewData[];
  towers: {name:string;view:ViewData}[]; enemies:{name:string;view:ViewData}[];
  difficultyStats:Record<string,{x:number;y:number;text:string|number}[]>[];
}
export class Encyclopedia {
  readonly view: GameView;
  readonly popup: MapPopup;
  private grid: GameView | null=null;
  private detail: GameView | null=null;
  private mode:'towers'|'enemies'='towers';
  private page=0;
  private entry=0;
  constructor(private save:{seen:(id:string)=>boolean},private data:CatalogData,private textures:Map<string,Texture>,private sound:(name:'button'|'paper')=>void,private time:()=>number,private bind:(name:string,view:GameView,action:()=>void,hover?:(inside:boolean)=>void)=>void){
    this.view=new GameView(data.base,textures,1);this.popup=new MapPopup(this.view);
    this.view.eventMode='static';this.view.hitArea=new Rectangle(0,0,1920,1080);this.view.on('pointertap',e=>e.stopPropagation());
    const back=this.view.views[0];
    bind('encyclopedia-towers',back.views[0],()=>{sound('button');this.load('towers',0);});
    bind('encyclopedia-enemies',back.views[2],()=>{sound('button');this.load('enemies',0);});
    const close=this.view.all().find(v=>v.data.image_name==='levelSelect_closeBtn_0001')!;
    bind('encyclopedia-close',close,()=>{sound('button');this.hide();});
    this.load('towers',0);
  }
  show(){this.load('towers',0);this.popup.show(this.time());}
  hide(){this.popup.hide(this.time());}
  private load(mode:'towers'|'enemies',page:number){
    this.mode=mode;this.page=page;
    this.grid?.destroy();this.detail?.destroy();this.detail=null;
    const back=this.view.views[0];
    back.views[0].visible=mode!=='towers';back.views[1].visible=mode==='towers';back.views[2].visible=mode!=='enemies';back.views[3].visible=mode==='enemies';
    this.grid=new GameView(mode==='towers'?this.data.towerGrid:this.data.enemyPages[page],this.textures,1);this.grid.visible=true;back.addChild(this.grid);
    const thumbs=this.grid.views.filter(v=>v.data.class==='class KButton');
    const over=this.grid.views.find(v=>v.data.image_name===(mode==='towers'?'encyclopedia_tower_thumbs_0022':'encyclopedia_creep_thumbs_over'))!;
    const selected=this.grid.views.find(v=>v.data.image_name===(mode==='towers'?'encyclopedia_tower_thumbs_0023':'encyclopedia_creep_thumbs_selected'))!;
    over.visible=false;
    thumbs.forEach((v,i)=>this.bind('encyclopedia-entry-'+i,v,()=>{this.sound('paper');selected.visible=true;selected.position.copyFrom(v.position);this.showDetail(page*36+i);},inside=>{over.visible=inside;if(inside)over.position.copyFrom(v.position);}));
    this.grid.views.filter(v=>v.data.class==='class EncyclopediaPageButton').forEach((v,i)=>{
      this.bind('encyclopedia-page-'+(i+1),v,()=>{this.sound('button');this.load('enemies',i);});v.disabled=i===page;
    });
    // The reference only auto-opens a seen enemy. An unseen page initially has no detail.
    if(mode==='towers'){selected.position.copyFrom(thumbs[0].position);this.showDetail(0);}
    else if(this.save.seen(this.data.enemies[page*36].name)){selected.visible=true;selected.position.copyFrom(thumbs[0].position);this.showDetail(page*36);}
    else selected.visible=false;
  }
  private showDetail(index:number){
    this.detail?.destroy();this.entry=index;
    this.detail=new GameView(this.data[this.mode][index].view,this.textures,1);this.view.views[0].addChild(this.detail);

  }
  get state(){return {visible:this.view.visible,mode:this.mode,page:this.page,entry:this.detail?this.data[this.mode][this.entry].name:null,stats:this.detail?.views.filter(v=>v.data.text!==undefined&&v.data.pos.y>=375&&v.data.pos.y<=435).map(v=>v.text)};}
}
