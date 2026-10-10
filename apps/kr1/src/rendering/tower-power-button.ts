import type {GameView, ViewData} from './ui-tree';

// Measured fusion KUI template: skill background, halo, icon, rank lights and price.
export function powerButtonData(template:ViewData,image:string,action:string,arg:string,ranks:number):ViewData {
  const data=structuredClone(template);
  const icon=data.children.find(v=>v.image_name===data.item!.image)!;
  icon.image_name=image;
  icon.children=icon.children.slice(0,ranks);
  data.item={...data.item!,image,action,action_arg:arg};
  return data;
}

const purchases=new WeakMap<GameView,{rank:number;started:number}>();
export function updatePowerButton(button:GameView,rank:number,max:number,cost:number,canBuy:boolean,disabledImage:string,now:number) {
  const image=button.data.item!.image,full=rank===max,disabled=!full&&!canBuy;
  button.clickDisabled=!canBuy;
  const icon=button.views.find(v=>v.data.image_name===image)!;
  icon.setImage(disabled?disabledImage:image);
  icon.views.forEach((light,i)=>light.setImage(i<rank?'power_rank_0001':'power_rank_0002'));
  const halo=button.views.find(v=>v.data.image_name==='glow_ico_special')!;
  halo.visible=button.hovered&&!full;
  const price=button.views.find(v=>v.data.image_name==='price_tag')!;
  price.visible=!full;price.setText(cost);
  price.setImage(disabled?'price_tag_disabled':'price_tag');
  price.setTextColor(disabled?[156,146,132]:[255,224,0]);
  const previous=purchases.get(button);
  if(!previous)purchases.set(button,{rank,started:-Infinity});
  else if(previous.rank!==rank){previous.rank=rank;previous.started=now;}
  const effect=button.views.find(v=>v.data.animation?.prefix==='effect_powerbuy')!;
  const elapsed=now-purchases.get(button)!.started;
  effect.visible=icon.views.length>0&&elapsed<effect.data.animation!.to/30;
  if(effect.visible)effect.animate(elapsed);
}
