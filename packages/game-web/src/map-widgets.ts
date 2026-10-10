import type {Container} from 'pixi.js';
import type {GameView} from './ui-tree';

// Original KR1 map widgets, fed by the current game's content and save.
export function updateStarsBanner(banner:GameView,stars:number,total:number){
 const digits=`${stars}/${total}`;
 banner.views.filter(v=>v.data.image_name?.startsWith('mapStarsContainer_numbers_')).forEach((v,i)=>{
  v.visible=i<digits.length;if(i<digits.length){const char=digits[i];v.setImage(`mapStarsContainer_numbers_${String(char==='/'?11:char==='0'?10:Number(char)).padStart(4,'0')}`);}
 });
}
export function positionLevelTip(tip:GameView,flag:GameView,ui:Container,viewport:{width:number;height:number}){
 const p=ui.toLocal(flag.toGlobal({x:flag.data.size.x/2,y:0}));
 tip.position.set(Math.max(8,Math.min(viewport.width-tip.data.size.x-8,p.x-tip.data.size.x/2)),Math.max(8,p.y-tip.data.size.y-8));
}
export function updateCampaignBadges(book:GameView,stars:number){
 book.all().filter(v=>v.data.image_name==='levelSelect_badges_0001').forEach((v,i)=>v.setImage(i<stars?'levelSelect_badges_0001':'levelSelect_badges_0002'));
}
