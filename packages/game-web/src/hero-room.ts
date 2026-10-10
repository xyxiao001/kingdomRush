import {Graphics,Rectangle,type Texture} from 'pixi.js';
import {GameView,type ViewData} from './ui-tree';
import {MapPopup} from './map-popup';
type HeroId=string;
export interface HeroRoomStore {
 selectedHero():string;selectHero(id:string):void;resetSkills(id:string):void;buySkill(id:string,skill:string):boolean;
 hero(id:string):{xp:number;skills:Record<string,number>};heroLevel(id:string):number;skillPoints(id:string):number;
}
export interface HeroRoomData {
 room:ViewData;heroes:{id:string;portrait:number;name:string;skills:{id:string;title:string;description:string[];hr_cost:number[];hr_icon:number|string}[]}[];
 bindings:{room:Record<string,string>;skills:Record<string,string>;bars:Record<string,Record<string,string>>};
 nameColors:Record<string,number[]>;previews:Record<string,{view:ViewData}>;xpThresholds:number[];
}
export type Bind=(name:string,view:GameView,action:()=>void,hover?:(inside:boolean)=>void)=>void;
export interface HeroRoomPresentation {available:(id:string)=>boolean;statistics:(id:string,level:number,skills:Record<string,number>)=>{hp:number;attack:string;armor:string}}

export class HeroRoom {
 readonly view:GameView;readonly popup:MapPopup;private preview:HeroId;private tip:GameView;
 private tipBackground=new Graphics();
 constructor(private data:HeroRoomData,private textures:Map<string,Texture>,private store:HeroRoomStore,private now:()=>number,private sound:(key:string)=>void,private select:(id:HeroId)=>void,bind:Bind,private presentation:HeroRoomPresentation){
  this.preview=store.selectedHero();this.view=new GameView(data.room,textures,1);this.popup=new MapPopup(this.view);this.view.eventMode='static';this.view.hitArea=new Rectangle(0,0,1920,1080);this.view.on('pointertap',e=>e.stopPropagation());
  this.tip=this.id(data.bindings.room.tip_panel);this.tip.visible=false;this.tip.eventMode='none';for(const view of this.tip.all())delete view.data.source_lines;
  this.tipBackground.eventMode='none';this.tip.addChildAt(this.tipBackground,0);
  for(const key of ['close_button','done_button'])bind('heroes-'+key,this.id(data.bindings.room[key]),()=>{sound('button');this.hide();});
  bind('heroes-select',this.id(data.bindings.room.select_but),()=>{store.selectHero(this.preview);select(this.preview);sound('button');this.refresh();});
  bind('heroes-reset',this.id(data.bindings.skills.reset_button),()=>{store.resetSkills(this.preview);sound('button');this.refresh();});
  const hover=this.view.all().find(v=>v.data.image_name==='heroroom_portraitsDecos_0003')!;hover.visible=false;hover.eventMode='none';
  data.heroes.forEach(hero=>{const v=this.id('hero-'+hero.id);bind('hero-'+hero.id,v,()=>{this.preview=hero.id;sound('button');this.refresh();},inside=>{hover.visible=inside;hover.position.copyFrom(v.position);});});
  for(let i=0;i<5;i++){
   const bar=data.bindings.bars[String(i)],buy=()=>{const skill=this.hero.skills[i];if(this.presentation.available(this.preview)&&store.buySkill(this.preview,skill.id)){sound('upgrade');this.tip.visible=false;this.refresh();}};
   const tooltip=(inside:boolean)=>{this.id(bar.icon_over).visible=inside;this.tip.visible=inside;if(inside)this.showTooltip(i,this.id(bar.icon));};
   bind('hero-skill-'+i,this.id(bar.icon),buy,tooltip);bind('hero-skill-plus-'+i,this.id(bar.plus),buy,tooltip);
  }
  this.refresh();
 }
 private get hero(){return this.data.heroes.find(h=>h.id===this.preview)!;}
 private tooltipText(view:GameView,text:string,width:number){
  const d=view.data,m=d.font_metrics!,scale=d._font_scale!,ctx=document.createElement('canvas').getContext('2d')!;
  ctx.font=`${Math.round(d.font_size!*scale*1.2)}px "${m.name}"`;
  const lines:string[]=[];
  // Match GameView's source CJK/Latin wrapping, and allocate every line before drawing.
  for(const paragraph of text.split('\n')){let line='';for(const part of paragraph.match(/[\u2e80-\uffff]|[^\u2e80-\uffff\s]+\s*|\s+/gu)??[]){if(line&&ctx.measureText(line+part).width>width*scale){lines.push(line.trimEnd());line=part.trimStart();}else line+=part;}lines.push(line.trimEnd());}
  const height=(m.height+(lines.length-1)*m.height*d.line_height!)/scale;
  d.text_size={x:width,y:height};d.source_lines=lines;if(view.text===text)view.refreshText();else view.setText(text);return height;
 }
 private showTooltip(index:number,icon:GameView){
  const skill=this.hero.skills[index],rank=this.store.hero(this.preview).skills[skill.id],next=Math.min(2,rank),[title,desc,coin,price]=this.tip.views;
  const width=300,padding=15,arrowHeight=23,arrowWidth=15;
  title.position.set(padding,14);const titleHeight=this.tooltipText(title,skill.title,rank===3?width-padding*2:234);
  desc.position.set(padding,title.y+titleHeight+8);const descHeight=this.tooltipText(desc,skill.description[next],width-padding*2),height=desc.y+descHeight+padding;
  coin.visible=price.visible=rank<3;coin.position.set(249,title.y+(titleHeight-coin.data.size.y)/2);price.position.set(269,title.y+(titleHeight-price.data.font_metrics!.height)/2);price.setText(rank===3?'':skill.hr_cost[next]);
  // ORIGINAL: HeroToolTip:_draw_self uses this dark brown fill and triangular pointer.
  // ADAPTATION: put the bubble above the skill so the footer never covers its description.
  this.tipBackground.clear().rect(0,0,width,height).poly([width/2-arrowWidth/2,height,width/2,height+arrowHeight,width/2+arrowWidth/2,height]).fill({color:0x14100d,alpha:224/255});
  this.tip.data.size={x:width,y:height+arrowHeight};
  const p=this.tip.parent!.toLocal(icon.toGlobal({x:icon.data.size.x/2,y:0}));
  this.tip.position.set(p.x,p.y-height-arrowHeight-8);
 }
 private id(id:string){return this.view.all().find(v=>v.data.id===id)!;}
 private text(id:string,value:string|number){const v=this.id(id);delete v.data.source_lines;v.setText(value);}
 show(){this.preview=this.store.selectedHero();this.refresh();this.popup.show(this.now());}
 hide(){this.tip.visible=false;this.popup.hide(this.now());}
 private refresh(){
  const h=this.hero,b=this.data.bindings,p=this.store.hero(h.id),level=this.store.heroLevel(h.id),points=this.store.skillPoints(h.id),preview=this.data.previews[h.id];
  this.id(b.room.portrait).setImage('portrait_notxt_'+String(h.portrait).padStart(4,'0'));
  const name=this.id(b.room.portrait_name).views[0];delete name.data.source_lines;name.data._fitted_font_size=Math.min(50,190/h.name.length);name.setText(h.name);name.setTextColor(this.data.nameColors[h.id]);
  const thumb=this.id('hero-'+h.id),selected=this.view.all().find(v=>v.data.image_name==='heroroom_portraitsDecos_0002')!;selected.position.copyFrom(thumb.position);selected.eventMode='none';
  const chosen=h.id===this.store.selectedHero();this.id(b.room.selected_spr).visible=chosen;this.id(b.room.select_but).visible=!chosen;this.id(b.room.select_but).clickDisabled=!this.presentation.available(h.id);
  const skillRoot=this.id(b.room.skills);for(const field of ['health','armor','attack','time','class_label']){const source=preview.view.children.flatMap(function flatten(v:ViewData):ViewData[]{return[v,...v.children.flatMap(flatten)];}).find((v:ViewData)=>v.id===b.skills[field])!;this.text(b.skills[field],source.text!);}
  const stats=this.presentation.statistics(h.id,level,p.skills);this.text(b.skills.health,stats.hp);this.text(b.skills.attack,stats.attack);this.text(b.skills.armor,stats.armor);
  this.id(b.skills.level_num).setImage('heroroom_heroBadge_numbers_'+String(level).padStart(4,'0'));this.text(b.skills.points,points);
  const thresholds=this.data.xpThresholds,from=level===1?0:thresholds[level-2],fraction=level===10?1:(p.xp-from)/(thresholds[level-1]-from);this.id(b.skills.hero_bar).scale.x=fraction;this.id(b.skills.hero_bar_init).visible=fraction>0;this.id(b.skills.hero_bar_end).visible=fraction===1;
  this.id(b.skills.reset_button).clickDisabled=!this.presentation.available(h.id)||!Object.values(p.skills).some(Boolean);
  h.skills.forEach((skill,i)=>{const bar=b.bars[String(i)],rank=p.skills[skill.id],canBuy=this.presentation.available(h.id)&&rank<3&&points>=skill.hr_cost[rank];this.id(bar.icon).setImage('heroroom_upgradeIcons0'+String(skill.hr_icon).padStart(3,'0')+(!canBuy&&rank<3?'_disabled':''));this.id(bar.cost_panel).setImage(canBuy?'heroroom_011':'heroroom_011_disabled');this.id(bar.cost_panel).visible=rank<3;if(rank<3)this.text(bar.cost,skill.hr_cost[rank]);
   const root=this.id(bar.id);root.views.filter(v=>v.data.image_name==='heroroom_010').forEach((v,n)=>v.visible=n<rank);this.id(bar.plus).visible=canBuy;this.id(bar.plus).y=69-28*rank;this.id(bar.over).visible=false;this.id(bar.icon_over).visible=false;
  });
  skillRoot.visible=true;
 }
 update(){this.popup.update(this.now());}
 get state(){return{visible:this.view.visible,preview:this.preview,selected:this.store.selectedHero(),level:this.store.heroLevel(this.preview),points:this.store.skillPoints(this.preview),skills:this.store.hero(this.preview).skills};}
}
