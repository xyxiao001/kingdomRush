import titleData from '../content/generated/title.json';
import {assetUrl} from './asset-url';
import {resources} from '../loading/progress';
import {loadFont} from '../loading/fonts';
import {deleteSaveSlot,saveSlotSummary,selectSaveSlot,type SaveSlot} from '../storage/slots';
import {subscribeUpdates,updateAction,showPwa} from '../pwa/client';
import type {LoadingScreen} from './loading';

async function imageUrl(url:string){
  const blob=await (await resources.fetch(url)).blob(),objectUrl=URL.createObjectURL(blob);
  const image=new Image();image.src=objectUrl;await image.decode();resources.ready(url);return {url:objectUrl,image};
}
export async function chooseSaveSlot(loading:LoadingScreen){
  const atlasPath=assetUrl('/assets/kr1/title/atlas.png'),backgroundPath=assetUrl('/assets/kr1/title/background.png');
  loading.phase('加载标题与存档界面',[backgroundPath,atlasPath,'/assets/kr1/fonts/JIMOJW.woff2']);
  const [atlasImage,background]=await Promise.all([imageUrl(atlasPath),imageUrl(backgroundPath),loadFont('JIMOJW')]);
  const atlas=atlasImage.url;
  const view=document.createElement('section');view.id='title-screen';view.setAttribute('aria-label','王国保卫战 · 选择存档');
  view.style.backgroundImage=`url("${background.url}")`;
  // Reuse decoded atlas art in DOM top-layer surfaces, without additional requests.
  function skin(name:keyof typeof titleData.frames,crop?:[number,number,number,number]){
    const f=titleData.frames[name],rect=crop??[0,0,f.rect[2],f.rect[3]],canvas=document.createElement('canvas');
    canvas.width=rect[2];canvas.height=rect[3];canvas.getContext('2d')!.drawImage(atlasImage.image,f.rect[0]+rect[0],f.rect[1]+rect[1],rect[2],rect[3],0,0,rect[2],rect[3]);
    return `url("${canvas.toDataURL()}")`;
  }
  for(const [key,name] of Object.entries({frame:'homeMenu_confirm_menu_0001',stone:'main_menu_slot_normal','stone-down':'main_menu_slot_down',button:'main_menu_quit_normal','button-down':'main_menu_quit_down'}))view.style.setProperty(`--menu-${key}`,skin(name as keyof typeof titleData.frames));
  view.style.setProperty('--menu-banner',skin('main_options_bg_notxt',[172,0,333,112]));
  const stage=document.createElement('div');stage.className='title-stage';view.append(stage);
  for(const [i,[x,y]] of [[215,895],[660,780],[860,965],[355,720],[940,855]].entries()){
    const spark=document.createElement('span');spark.className='title-spark';spark.setAttribute('aria-hidden','true');
    Object.assign(spark.style,{left:x+'px',top:y+'px',animationDelay:`-${i*1.3}s`});stage.append(spark);
  }
  const panel=document.createElement('div');panel.className='title-panel';stage.append(panel);
  function sprite(name:keyof typeof titleData.frames,x=0,y=0){
    const f=titleData.frames[name],span=document.createElement('span');span.className='title-sprite';span.setAttribute('aria-hidden','true');
    Object.assign(span.style,{left:`${x+f.trim[0]}px`,top:`${y+f.trim[1]}px`,width:`${f.rect[2]}px`,height:`${f.rect[3]}px`,backgroundImage:`url("${atlas}")`,backgroundPosition:`-${f.rect[0]}px -${f.rect[1]}px`});return span;
  }
  panel.append(sprite('main_menu_slots_bg'),sprite('main_menu_banner_bg'));
  const intro=document.createElement('div');intro.className='title-intro';
  intro.innerHTML='<span class="title-eyebrow">KINGDOM RUSH</span><h1>选择存档</h1><span class="title-divider" aria-hidden="true">◆</span><p class="title-hint">你的王国，等你归来</p><p class="title-detail">选择右侧存档，继续冒险</p>';
  panel.append(intro);
  const hint=intro.querySelector('.title-hint')!,detail=intro.querySelector('.title-detail')!;
  const resetHint=()=>{hint.textContent='你的王国，等你归来';detail.textContent='选择右侧存档，继续冒险';};
  const version=document.createElement('div');version.className='title-version';
  version.innerHTML='<p class="title-update-state" role="status"></p><button class="title-update"></button><button class="title-install">安装与离线 <span aria-hidden="true">↗</span></button><p class="title-release"></p>';
  panel.append(version);
  const update=version.querySelector<HTMLButtonElement>('.title-update')!;
  update.onclick=updateAction;
  version.querySelector<HTMLButtonElement>('.title-install')!.onclick=showPwa;
  const unsubscribe=subscribeUpdates(state=>{
    version.dataset.phase=state.phase;
    version.querySelector('.title-release')!.textContent=state.release?`版本 ${state.release}`:'王国保卫战 · 网页版';
    version.querySelector('.title-update-state')!.textContent=state.message==='当前版本已就绪，可检查更新。'?'已准备就绪':state.message;
    update.textContent=state.phase==='ready'?'更新并启程':'检查更新';
    update.disabled=['checking','downloading','unavailable'].includes(state.phase);
  });
  // The supplied SlotView also asks before deleting a save.
  const confirm=document.createElement('dialog');confirm.className='title-delete-dialog';confirm.setAttribute('aria-labelledby','delete-slot-title');
  confirm.innerHTML='<h2 id="delete-slot-title"></h2><p>这个存档的关卡进度、英雄、科技和成就将被清除。</p><div class="title-delete-actions"><button class="delete-cancel" autofocus>取消</button><button class="delete-confirm">删除存档</button></div>';
  view.append(confirm);
  confirm.querySelector<HTMLButtonElement>('.delete-cancel')!.onclick=()=>confirm.close();
  const slots=document.createElement('div');panel.append(slots);
  const selected=new Promise<void>(resolve=>{
    function renderSlots(){
      slots.replaceChildren();
      for(const slot of [1,2,3] as SaveSlot[]){
        const summary=saveSlotSummary(slot),row=document.createElement('div');row.className='title-slot-row';
        row.style.left=`${427+(slot-1)*4}px`;row.style.top=`${92+(slot-1)*100}px`;row.style.setProperty('--slot-delay',`${slot*60}ms`);
        const button=document.createElement('button');button.className='title-slot';button.dataset.slot=String(slot);
        button.setAttribute('aria-label',summary.exists?`存档 ${slot}，${summary.stars} 颗星，继续游戏`:`新游戏，存档 ${slot}`);
        const normal=sprite('main_menu_slot_normal'),down=sprite('main_menu_slot_down');normal.classList.add('slot-normal');down.classList.add('slot-down');button.append(normal,down);
        const label=summary.exists?`slot_${slot}`:'new_game';
        for(const state of ['normal','hover','down'] as const){
          const image=sprite(`main_menu_t_${label}_${state}_zh-Hans` as keyof typeof titleData.frames,summary.exists?16:24,summary.exists?15:30);
          image.classList.add('slot-label',`label-${state}`);button.append(image);
        }
        if(summary.exists){
          const stats=document.createElement('span');stats.className='slot-stats';
          for(const [icon,value,label] of [['star',summary.stars,'星星'],['heroic',summary.heroic,'英雄挑战'],['iron',summary.iron,'钢铁挑战']] as const){
            const count=document.createElement('span');count.className='slot-stat';count.title=label;
            count.append(sprite(`main_menu_icon_${icon}`),document.createTextNode(String(value)));stats.append(count);
          }button.append(stats);
          const remove=document.createElement('button');remove.className='title-slot-delete';remove.dataset.deleteSlot=String(slot);remove.setAttribute('aria-label',`删除存档 ${slot}`);remove.title=`删除存档 ${slot}`;
          for(const state of ['normal','hover','down'] as const){const image=sprite(`main_menu_slot_close_${state}`);image.classList.add(`delete-${state}`);remove.append(image);}
          remove.onclick=()=>{
            confirm.querySelector('h2')!.textContent=`删除存档 ${slot}？`;
            confirm.querySelector<HTMLButtonElement>('.delete-confirm')!.onclick=()=>{deleteSaveSlot(slot);confirm.close();renderSlots();slots.querySelector<HTMLButtonElement>(`[data-slot="${slot}"]`)!.focus();};
            confirm.showModal();
          };row.append(remove);
        }
        const preview=()=>{hint.textContent=summary.exists?`继续存档 ${slot}`:'开启新的征程';detail.textContent=summary.exists?`${summary.stars} 颗星 · ${summary.heroic} 英雄 · ${summary.iron} 钢铁`:`存档 ${slot} · 从南港出发`;};
        button.onpointerenter=button.onfocus=preview;button.onpointerleave=button.onblur=resetHint;
        button.onclick=()=>{selectSaveSlot(slot);resolve();};row.prepend(button);slots.append(row);
      }
    }
    renderSlots();
  });
  document.body.append(view);
  const resize=()=>stage.style.transform=`translate(-50%,-50%) scale(${Math.min(innerWidth/1920,innerHeight/1080)})`;
  resize();window.addEventListener('resize',resize);loading.hide();
  await selected;
  view.inert=true;
  await view.animate([{opacity:1},{opacity:0}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:180,fill:'forwards'}).finished;
  window.removeEventListener('resize',resize);unsubscribe();view.remove();URL.revokeObjectURL(atlas);URL.revokeObjectURL(background.url);
}
