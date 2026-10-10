import {Rectangle,Sprite,type Texture} from 'pixi.js';
import content from '../content/generated/progression-ui.json';
import {GameView,type ViewData} from '../rendering/ui-tree';
import {MapPopup} from '../rendering/map-popup';
import {loadUpgrades,saveUpgrades,spentStars,canBuyUpgrade,EMPTY_UPGRADES,UPGRADE_CLASSES,type UpgradeLevels,type UpgradeClass} from '../storage/upgrades';
import {totalStars} from '../storage/challenges';
import {loadAchievements} from '../storage/achievements';
type Bind=(name:string,view:GameView,action:()=>void,hover?:(inside:boolean)=>void)=>void;
export class ProgressionMenus {
 readonly upgrades:GameView;readonly achievements:GameView;readonly upgradePopup:MapPopup;readonly achievementPopup:MapPopup;readonly banner:GameView;
 private levels=loadUpgrades();private original={...this.levels};private undo:GameView;private buttons=new Map<string,GameView>();private tip:GameView;
 private fx:{sprite:Sprite;time:number}[]=[];private page=0;private queue:string[]=[];private bannerAt=-Infinity;private bannerClosing:number|null=null;private bannerFrom=0;
 constructor(private textures:Map<string,Texture>,private now:()=>number,private sound:(name:string)=>void,bind:Bind){
  this.upgrades=new GameView(content.upgrades.view as unknown as ViewData,textures,1);this.upgradePopup=new MapPopup(this.upgrades);
  this.achievements=new GameView(content.achievements as unknown as ViewData,textures,1);this.achievementPopup=new MapPopup(this.achievements);
  for(const [name,view,popup] of [['upgrades',this.upgrades,this.upgradePopup],['achievements',this.achievements,this.achievementPopup]] as const){
   view.eventMode='static';view.hitArea=new Rectangle(0,0,1920,1080);view.on('pointertap',e=>e.stopPropagation());
   bind(name+'-close',view.all().find(v=>v.data.image_name==='levelSelect_closeBtn_0001')!,()=>{sound('button');popup.hide(now());this.tip.visible=false;});
  }
  const back=this.upgrades.views[0];this.tip=this.upgrades.views[1];this.tip.visible=false;this.tip.eventMode='none';
  // ENHANCEMENT: readable, viewport-contained descriptions, with all original prices/text.
  this.tip.pivot.set(0);this.tip.data.size={x:480,y:160};this.tip.background!.clear().rect(0,0,480,160).fill(0x15110d);this.tip.views[0].visible=false;
  const desc=this.tip.views[2];desc.data.size=desc.data.text_size={x:432,y:115};delete desc.data.source_lines;desc.data.font_size=17;
  this.tip.views[3].x=440;this.tip.views[4].x=415;
  const controls=back.views.filter(v=>v.data.class==='class GGUpgradesButton');this.undo=controls[1];
  bind('upgrades-reset',controls[0],()=>{this.levels={...EMPTY_UPGRADES};this.original={...this.levels};this.undo.clickDisabled=true;this.persist();});
  bind('upgrades-undo',controls[1],()=>{this.levels={...this.original};this.undo.clickDisabled=true;this.persist();});
  bind('upgrades-done',controls[2],()=>{sound('button');this.tip.visible=false;this.upgradePopup.hide(now());});
  for(const u of content.upgrades.list){const v=back.views.find(v=>v.data.class==='class UpgradeButtons'&&v.data.image_name===`Upgrades_Icons_${String(u.data.icon).padStart(4,'0')}`)!;this.buttons.set(u.id,v);
   bind('upgrade-'+u.id,v,()=>{if(!canBuyUpgrade(u.id,this.levels,totalStars()))return;this.levels[u.data.class as UpgradeClass]=u.data.level;this.undo.clickDisabled=false;saveUpgrades(this.levels);this.refresh();sound('upgrade');this.tip.visible=false;const fx=new Sprite(textures.get('Upgrades_Icons_buyFx_0001')!);fx.position.set(-17.5,-17.5);fx.eventMode='none';v.addChild(fx);this.fx.push({sprite:fx,time:now()});},inside=>{
    v.views[1].visible=inside&&canBuyUpgrade(u.id,this.levels,totalStars());this.tip.visible=inside;
    if(inside){this.tip.views[1].setText(u.title);this.tip.views[2].setText(u.description);this.tip.views[3].setText(u.data.price);const p=v.toGlobal({x:0,y:0});this.positionTip(p);}
   });v.on('pointermove',e=>this.positionTip(e.global));
  }
  const pages=this.achievements.views[0].views.filter(v=>v.data.class==='class AchievementsPageButton');
  pages.forEach((v,i)=>bind('achievements-page-'+(i+1),v,()=>{sound('button');this.showPage(i);}));
  this.achievements.views[0].views.filter(v=>v.data.image_name==='Achievements_Box_Large').forEach((v,i)=>bind('achievement-'+i,v.views[0],()=>{const a=content.achievementList[this.page*10+i];if(loadAchievements().earned.includes(a.id))this.notify(a.id);}));
  this.banner=new GameView(content.banner as unknown as ViewData,textures,768/1080);this.banner.x=960;this.banner.scale.set(1080/768);this.banner.visible=false;this.banner.button(()=>this.hideBanner());
  this.refresh();this.showPage(0);
 }
 private positionTip(p:{x:number;y:number}){const q=this.upgrades.toLocal(p);this.tip.position.set(Math.max(10,Math.min(1430,q.x)),Math.max(10,q.y-170));}
 private persist(){saveUpgrades(this.levels);this.sound('button');this.refresh();}
 private refresh(){
  const back=this.upgrades.views[0];back.views.find(v=>v.data.image_name==='Upgrades_StarContainer')!.visible=true;back.views.find(v=>v.data.class==='class KLabel')!.setText(totalStars()-spentStars(this.levels));
  back.views.filter(v=>v.data.image_name==='YellowBar').forEach((v,i)=>v.scale.y=.2*this.levels[UPGRADE_CLASSES[i]]);
  for(const u of content.upgrades.list){const v=this.buttons.get(u.id)!;const bought=this.levels[u.data.class as UpgradeClass]>=u.data.level,available=canBuyUpgrade(u.id,this.levels,totalStars());
   v.clickDisabled=!available;v.views[0].visible=!bought&&!available;v.views[1].visible=false;v.views[2].visible=bought;v.views[3].visible=available;v.views[4].visible=!bought&&!available;
  }this.undo.alpha=this.undo.clickDisabled?.5:1;
 }
 showUpgrades(){this.levels=loadUpgrades();this.original={...this.levels};this.undo.clickDisabled=true;this.refresh();this.upgradePopup.show(this.now());}
 showAchievements(){this.showPage(0);this.achievementPopup.show(this.now());}
 private showPage(page:number){this.page=page;const earned=loadAchievements().earned;
  this.achievements.views[0].views.filter(v=>v.data.image_name==='Achievements_Box_Large').forEach((box,i)=>{const a=content.achievementList[page*10+i];box.visible=!!a;if(!a)return;const active=earned.includes(a.id);box.views[0].setImage(`achievement_icons_${active?'':'disabled_'}${String(a.icon).padStart(4,'0')}`);box.views[1].setText(a.title);box.views[2].setText(a.description);box.views[1].setTextColor(active?[233,224,177]:[107,98,87]);box.views[2].setTextColor(active?[156,152,126]:[107,98,87]);});
  this.achievements.views[0].views.filter(v=>v.data.class==='class AchievementsPageButton').forEach((v,i)=>{v.disabled=i===page;v.data.default_image_name=i===page?'Achievements_page_0003':'Achievements_page_0001';v.setImage(v.data.default_image_name);});
 }
 notify(id:string){this.queue.push(id);if(!this.banner.visible)this.nextBanner();}
 private nextBanner(){const id=this.queue.shift();if(!id)return;const a=content.achievementList.find(a=>a.id===id)!;this.banner.views[1].setImage('achievement_icons_'+String(a.icon).padStart(4,'0'));this.banner.views[2].setText(a.title);this.banner.views[3].setText(a.description);this.banner.visible=true;this.bannerAt=this.now();this.bannerClosing=null;this.sound('achievement');}
 private hideBanner(){if(this.bannerClosing!==null)return;this.bannerClosing=this.now();this.bannerFrom=this.banner.y;}
 update(){const now=this.now();this.upgradePopup.update(now);this.achievementPopup.update(now);
  for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i],frame=1+Math.floor((now-f.time)*30);if(frame>18){f.sprite.destroy();this.fx.splice(i,1);}else f.sprite.texture=this.textures.get('Upgrades_Icons_buyFx_'+String(frame).padStart(4,'0'))!;}
  if(!this.banner.visible)return;const age=now-this.bannerAt;
  if(this.bannerClosing===null){const t=Math.min(1,age/.5),height=this.banner.data.size.y*this.banner.scale.y;this.banner.y=-1+(height+11)*(1+2.70158*(t-1)**3+1.70158*(t-1)**2);if(age>=4)this.hideBanner();}
  else{const t=Math.min(1,(now-this.bannerClosing)/.5);this.banner.y=this.bannerFrom+(-1-this.bannerFrom)*t*t*(2.70158*t-1.70158);if(t===1){this.banner.visible=false;this.nextBanner();}}
 }
 get state(){return {upgrades:this.upgradePopup.state,achievements:this.achievementPopup.state,levels:this.levels,remaining:totalStars()-spentStars(this.levels),page:this.page,banner:this.banner.visible};}
}
