export interface TitleScreenConfig {
 shell:HTMLElement;skins:Record<string,{width:number;height:number}>;art:Map<string,string>;logo:{width:number;height:number}|null;
 title:string;edition:string;eyebrow:string;firstLevel:string;
 versions:()=>HTMLElement;note:(host:HTMLElement)=>()=>void;
 slot:(id:number)=>{exists:boolean;stars:number};choose:(id:number,exists:boolean)=>void;remove:(id:number)=>void;redraw:()=>void;
}
function element<K extends keyof HTMLElementTagNameMap>(tag:K,className:string,text?:string){const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;}
function button(label:string,click:()=>void,className:string){const b=element('button',className,label);b.onclick=click;return b;}
/** Shared mature three-slot title, including original skins, delete dialog and resize lifecycle. */
export function titleScreen(config:TitleScreenConfig){
 const {shell,skins,art}=config;
function sprite(name:string,x=0,y=0){const s=skins[name],img=element('img','title-sprite');img.src=art.get(name)!;img.alt='';Object.assign(img.style,{left:`${x}px`,top:`${y}px`,width:`${s.width}px`,height:`${s.height}px`});return img;}
shell.className='front-slots';shell.replaceChildren();const title=element('section','');title.id='title-screen';title.setAttribute('aria-label',config.title+' · 选择存档');const stage=element('div','title-stage'),panel=element('div','title-panel');if(config.logo){const logo=element('img','front-title-logo');logo.src=art.get('logo')!;logo.alt=config.title;logo.width=config.logo.width;logo.height=config.logo.height;logo.draggable=false;stage.append(logo);}stage.append(panel);title.append(stage,config.versions());shell.append(title);
 panel.append(sprite('main_menu_slots_bg'),sprite('main_menu_banner_bg'));
 const intro=element('div','title-intro');intro.innerHTML=`<span class="title-eyebrow">${config.eyebrow}</span><h1>选择存档</h1><span class="title-divider">◆</span><p class="title-hint">你的王国，等你归来</p><p class="title-detail">选择右侧存档，继续冒险</p>`;panel.append(intro);
 const note=element('div','title-version');panel.append(note);const unsubscribe=config.note(note);
 const confirm=element('dialog','title-delete-dialog');confirm.setAttribute('aria-label','删除存档');title.append(confirm);
 for(let id=1;id<=3;id++){
  const {exists,stars}=config.slot(id),row=element('div','title-slot-row');Object.assign(row.style,{left:`${427+(id-1)*4}px`,top:`${92+(id-1)*100}px`});row.style.setProperty('--slot-delay',`${id*60}ms`);
  const choose=button('',()=>config.choose(id,exists),'title-slot');choose.dataset.slot=String(id);choose.setAttribute('aria-label',exists?`存档 ${id}，${stars} 颗星，继续游戏`:`新游戏，存档 ${id}`);
  const normal=sprite('main_menu_slot_normal'),down=sprite('main_menu_slot_down');normal.classList.add('slot-normal');down.classList.add('slot-down');choose.append(normal,down);
  for(const state of ['normal','hover','down']){const label=sprite(`main_menu_t_${exists?'slot_'+id:'new_game'}_${state}_zh-Hans`,exists?16:24,exists?15:30);label.classList.add('slot-label',`label-${state}`);choose.append(label);}
  if(exists){const stats=element('span','slot-stats'),count=element('span','slot-stat',String(stars));count.append(sprite('main_menu_icon_star'));stats.append(count);choose.append(stats);const remove=button('',()=>{confirm.replaceChildren(element('h2','',`删除存档 ${id}？`),element('p','','这个存档的关卡进度和新手指导记录将被清除。'));const actions=element('div','title-delete-actions');actions.append(button('取消',()=>confirm.close(),'delete-cancel'),button('删除存档',()=>{config.remove(id);confirm.close();config.redraw();},'delete-confirm'));confirm.append(actions);confirm.showModal();},'title-slot-delete');remove.setAttribute('aria-label',`删除存档 ${id}`);for(const state of ['normal','hover','down']){const image=sprite(`main_menu_slot_close_${state}`);image.classList.add(`delete-${state}`);remove.append(image);}row.append(remove);}
  const hint=intro.querySelector('.title-hint')!,detail=intro.querySelector('.title-detail')!;
  choose.onpointerenter=choose.onfocus=()=>{hint.textContent=exists?`继续存档 ${id}`:'开启新的征程';detail.textContent=exists?`${stars} 颗星 · 继续${config.edition}战役`:`存档 ${id} · 从${config.firstLevel}出发`;};choose.onpointerleave=choose.onblur=()=>{hint.textContent='你的王国，等你归来';detail.textContent='选择右侧存档，继续冒险';};row.prepend(choose);panel.append(row);
 }
 const resize=()=>stage.style.transform=`translate(-50%,-50%) scale(${Math.min(innerWidth/1920,innerHeight/1080)})`;resize();const observer=new ResizeObserver(resize);observer.observe(stage.parentElement!);
 return ()=>{observer.disconnect();unsubscribe();};
}

export function gameVersionMenu(games:readonly {id:string;name:string;available:boolean;path:string}[],active:string,label:string){
 const view=element('div','title-game-switcher');view.innerHTML=`<button class="title-game-toggle" popovertarget="title-games" aria-expanded="false"><span>游戏版本</span><strong>${label}</strong><span class="title-game-chevron" aria-hidden="true">⌄</span></button><nav id="title-games" popover aria-label="切换游戏版本"><h2>选择冒险</h2><p>各版本的存档独立保存</p><div class="title-game-list"></div></nav>`;
 const menu=view.querySelector<HTMLElement>('#title-games')!,toggle=view.querySelector('button')!;menu.addEventListener('toggle',()=>toggle.setAttribute('aria-expanded',String(menu.matches(':popover-open'))));
 for(const g of games){const current=g.id===active,item=element(g.available&&!current?'a':'button','title-game-entry');item.dataset.game=g.id;item.innerHTML=`<span class="title-game-id">${({kr1:'Ⅰ',kr2:'Ⅱ',kr3:'Ⅲ'} as Record<string,string>)[g.id]}</span><span><strong>${g.name}</strong><small>${current?'正在游玩':g.available?'开始冒险':'尚未开放'}</small></span>`;if(item instanceof HTMLAnchorElement)item.href=g.path;else if(current){item.setAttribute('aria-current','page');item.onclick=()=>menu.hidePopover();}else item.disabled=true;menu.querySelector('.title-game-list')!.append(item);}return view;
}
