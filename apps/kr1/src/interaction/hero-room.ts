import {Rectangle,type Texture} from 'pixi.js';
import heroUi from '../content/generated/heroes-ui.json';
import catalog from '../content/generated/heroes-catalog.json';
import type {HeroId,HeroSummary} from '../content/heroes';
import {GameView,atlasTextures,type ViewData} from '../rendering/ui-tree';
import {loadSelectedHero,saveSelectedHero} from '../storage/hero';

export const HEROES=catalog as HeroSummary[];
export class HeroRoom {
  readonly view:GameView;
  private loaded?:Promise<void>;
  private preview=loadSelectedHero();
  private textures=new Map<string,Texture>();
  private thumbs:GameView[]=[];
  private selected!:GameView;
  private hover!:GameView;
  constructor(private select:(id:HeroId)=>void,private close:()=>void,private click:()=>void){
    this.view=new GameView({...heroUi.room,children:[{...heroUi.room.children[0],children:[]}]} as unknown as ViewData,this.textures,1);
    this.view.visible=false;this.view.eventMode='static';this.view.hitArea=new Rectangle(0,0,1920,1080);this.view.on('pointertap',e=>e.stopPropagation());
  }
  load(){return this.loaded??=(async()=>{
    for(const [key,value] of await atlasTextures('/assets/kr1/heroes/shared/room.png',heroUi.roomFrames))this.textures.set(key,value);
    const source=structuredClone(heroUi.room) as unknown as ViewData;
    const children=source.children[0].children;
    const thumb=children.find(v=>v.image_name==='heroroom_portraits_0033')!;
    children.splice(children.indexOf(thumb),1,...HEROES.map((hero,index)=>({...structuredClone(thumb),id:'hero-'+hero.id,image_name:'heroroom_portraits_'+String(hero.portrait).padStart(4,'0'),pos:{x:119+106*(index%8),y:96+109*Math.floor(index/8)}})));
    const panel=this.view.views[0];panel.setImage(panel.data.image_name!);
    for(const child of children){const view=new GameView(child,this.textures,1);panel.views.push(view);panel.addChild(view);}
    this.hover=this.image('heroroom_portraitsDecos_0003');this.hover.visible=false;this.hover.eventMode='none';
    this.selected=this.image('heroroom_portraitsDecos_0002');this.selected.eventMode='none';
    this.thumbs=HEROES.map(hero=>this.view.all().find(v=>v.data.id==='hero-'+hero.id)!);
    for(const [index,thumb] of this.thumbs.entries())thumb.button(()=>{this.click();this.show(HEROES[index].id);},inside=>{this.hover.visible=inside;this.hover.position.copyFrom(thumb.position);});
    this.image('levelSelect_closeBtn_0001').button(()=>{this.click();this.close();});
    this.image('heroroom_btnDone_large_0001').button(()=>{this.click();this.close();});
    this.image('heroroom_btnSelect_0003').button(()=>{saveSelectedHero(this.preview);this.select(this.preview);this.show(this.preview);});
    this.show(this.preview);
  })();}
  private image(name:string){return this.view.all().find(v=>v.data.image_name===name)!;}
  private text(id:string,value:string){const view=this.view.all().find(v=>v.data.id===id)!;delete view.data.source_lines;view.setText(value);}
  show(id=loadSelectedHero()){
    this.preview=id;const hero=HEROES.find(h=>h.id===id)!,index=HEROES.indexOf(hero);
    this.selected.position.copyFrom(this.thumbs[index].position);
    this.image('portrait_notxt_0033').setImage('portrait_notxt_'+String(hero.portrait).padStart(4,'0'));
    this.text('99354',hero.description);this.text('99356',hero.skillsDescription);
    this.text('99357',String(hero.health));this.text('99358',`${Math.round(hero.armor*100)}%`);this.text('99359',hero.damage.join('-'));this.text('99367',hero.title);
    const parts=hero.name.replace(/[・·]/g,' ').split(' '),labels=['99379','99380'].map(id=>this.view.all().find(v=>v.data.id===id)!);
    const measure=document.createElement('canvas').getContext('2d')!,font=labels[0].data.font_metrics!.name;
    let size=parts.length>1?44:70;measure.font=`${size}px "${font}"`;
    const width=Math.max(...parts.map(part=>measure.measureText(part).width));size=Math.min(size,size*190/width);
    for(const [i,label] of labels.entries()){delete label.data.source_lines;label.data._fitted_font_size=size;label.visible=i<parts.length;label.setText(parts[i]??'');label.refreshText();}

    const button=this.image('heroroom_btnSelect_0003'),selected=id===loadSelectedHero();button.disabled=selected;button.data.default_image_name=selected?'heroroom_btnSelect_0003':'heroroom_btnSelect_0001';button.data.hover_image_name='heroroom_btnSelect_0002';button.setImage(button.data.default_image_name);delete button.views[0].data.source_lines;button.views[0].setText(id===loadSelectedHero()?'已选择':'选择');
  }
}
