import {GameView} from './ui-tree';

/** Fusion StarsBanner:set_value places both numbers around a fixed slash. */
export function updateStarsBanner(banner:GameView,stars:number,total:number){
 const old=banner.views.filter(v=>v.data.image_name?.startsWith('mapStarsContainer_numbers_'));
 const template=structuredClone(old[0].data),center=banner.data.size.x/2-25;
 for(const view of old){banner.views.splice(banner.views.indexOf(view),1);view.destroy();}
 const add=(char:string,x:number)=>{
  const data={...structuredClone(template),image_name:`mapStarsContainer_numbers_${String(char==='/'?11:char==='0'?10:Number(char)).padStart(4,'0')}`,pos:{x,y:banner.data.size.y/2}};
  const view=new GameView(data,banner.textures,banner.imageScale);banner.views.push(view);banner.addChild(view);
 };
 [...String(stars)].reverse().forEach((digit,i)=>add(digit,center-25-i*20));
 add('/',center);
 [...String(total)].forEach((digit,i)=>add(digit,center+25+i*20));
}
