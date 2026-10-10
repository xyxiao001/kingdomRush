// ADAPTATION: offline assets keep the existing per-feature/per-level load order.
import type {ResourceLoader} from '@kingdom-rush/asset-runtime/progress';
interface InstallPrompt extends Event {
  prompt():Promise<void>;
  userChoice:Promise<{outcome:'accepted'|'dismissed'}>;
}
export interface UpdateState {
  phase:'checking'|'downloading'|'ready'|'current'|'error'|'unavailable';
  message:string;release:string;
}
export function createPwaClient(game:{id:string;base:string},formatBytes:(bytes:number)=>string,production:boolean){
let installPrompt:InstallPrompt|undefined;
let registration:ServiceWorkerRegistration|undefined;
let pendingWorker:ServiceWorker|undefined;
let reloadRequested=false;
let state:UpdateState={phase:'checking',message:'正在检查游戏版本…',release:''};
const listeners=new Set<(state:UpdateState)=>void>();
function subscribeUpdates(listener:(state:UpdateState)=>void){listeners.add(listener);listener(state);return ()=>listeners.delete(listener);}
function publish(phase:UpdateState['phase'],message:string){state={...state,phase,message};for(const listener of listeners)listener(state);}
function updateAction(){
  if(state.phase==='ready'){
    reloadRequested=true;publish('downloading','正在启用新版，随后重新加载…');
    pendingWorker!.postMessage('APPLY_UPDATE');
  }else void checkForUpdates();
}
async function checkForUpdates(){
  publish('checking','正在检查游戏版本…');
  try{
    await registration!.update();
    if(registration!.waiting){pendingWorker=registration!.waiting;publish('ready','新版已下载完成，可以更新。');}
    else if(registration!.installing)publish('downloading','正在下载新版启动文件…');
    else publish('current','已是最新版本');
  }catch{publish('error','检查更新失败，请确认网络连接后再次检查。');}
}
function observe(worker:ServiceWorker){
  worker.postMessage('LOADING_STATUS');
  worker.addEventListener('statechange',()=>{
    if(worker.state==='installed'&&navigator.serviceWorker.controller){
      pendingWorker=worker;publish('ready','新版已下载完成，可以更新。');
    }else if(worker.state==='redundant')publish('error','新版下载未完成，可再次检查更新。');
  });
}
const dialog=document.createElement('dialog');
dialog.className='pwa-dialog';
dialog.setAttribute('aria-labelledby','pwa-title');
dialog.innerHTML=`<h2 id="pwa-title">安装与游戏更新</h2>
  <p>安装到桌面，以独立窗口继续冒险。</p>
  <button id="pwa-install" disabled>使用浏览器的安装菜单</button>
  <p>地图、关卡和英雄资源会在访问时缓存。离线前，请先联网进入要玩的关卡，并使用所选英雄。</p>
  <p id="pwa-cache" role="status">正在读取缓存…</p>
  <p id="pwa-update-status" role="status"></p>
  <div class="pwa-actions"><button id="pwa-update">检查更新</button><button id="pwa-close">返回</button></div>`;
document.body.append(dialog);
const install=dialog.querySelector<HTMLButtonElement>('#pwa-install')!;
const update=dialog.querySelector<HTMLButtonElement>('#pwa-update')!;
const cacheStatus=dialog.querySelector<HTMLElement>('#pwa-cache')!;
const updateStatus=dialog.querySelector<HTMLElement>('#pwa-update-status')!;
dialog.querySelector<HTMLButtonElement>('#pwa-close')!.onclick=()=>dialog.close();
dialog.addEventListener('keydown',event=>event.stopPropagation());
function installed(){install.disabled=true;install.textContent='已安装到桌面';}
if(matchMedia('(display-mode: standalone)').matches)installed();
window.addEventListener('appinstalled',()=>{installPrompt=undefined;installed();});
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();installPrompt=event as InstallPrompt;
  install.disabled=false;install.textContent='安装到桌面';
});
install.onclick=async()=>{
  await installPrompt!.prompt();await installPrompt!.userChoice;
  installPrompt=undefined;install.disabled=true;
};
subscribeUpdates(value=>{
  updateStatus.textContent=value.message;
  update.disabled=['checking','downloading','unavailable'].includes(value.phase);
  update.textContent=value.phase==='ready'?'更新并重新加载':'检查更新';
});
update.onclick=updateAction;

async function registerPwa(resources:ResourceLoader){
  if(!production){cacheStatus.textContent='开发模式不启用离线缓存。';publish('unavailable','开发版本');return;}
  if(!('serviceWorker' in navigator)){cacheStatus.textContent='当前浏览器不支持离线缓存。';publish('unavailable','当前浏览器不支持版本更新。');return;}
  let starting=true;
  resources.phase('正在准备离线缓存…');
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadRequested)location.reload();});
  navigator.serviceWorker.addEventListener('message',event=>{
    if(event.data?.type==='LOADING_PROGRESS'){
      const progress=event.data.progress;
      if(starting)resources.publish(progress);
      if(state.phase==='downloading'){
        const rows=progress.resources as {loaded:number;total:number;state:string}[];
        publish('downloading',`正在下载新版 ${formatBytes(rows.reduce((sum,row)=>sum+row.loaded,0))} / ${formatBytes(rows.reduce((sum,row)=>sum+row.total,0))} · ${rows.filter(row=>row.state==='ready').length}/${rows.length} 项`);
      }
    }
    if(event.data?.type==='PWA_STATUS'){
      state={...state,release:event.data.release};
      cacheStatus.textContent=`已缓存 ${event.data.files} 个文件 · 版本 ${state.release}`;
      for(const listener of listeners)listener(state);
    }
  });
  registration=await navigator.serviceWorker.register(game.base+'sw.js',{scope:game.base,updateViaCache:'none'});
  if(registration.installing)observe(registration.installing);
  registration.addEventListener('updatefound',()=>{
    publish('downloading','正在下载新版启动文件…');observe(registration!.installing!);
  });
  await navigator.serviceWorker.ready;
  // First-visit game requests must already be controlled, so they are cached too.
  const scriptUrl=new URL(game.base+'sw.js',location.origin).href;
  if(navigator.serviceWorker.controller?.scriptURL!==scriptUrl)await new Promise<void>(resolve=>{
    const controlled=()=>{if(navigator.serviceWorker.controller?.scriptURL===scriptUrl){navigator.serviceWorker.removeEventListener('controllerchange',controlled);resolve();}};
    navigator.serviceWorker.addEventListener('controllerchange',controlled);
  });
  starting=false;
  navigator.serviceWorker.controller!.postMessage('PWA_STATUS');
  if(registration.waiting){pendingWorker=registration.waiting;publish('ready','新版已下载完成，可以更新。');}
  else if(registration.installing)publish('downloading','正在下载新版启动文件…');
  else publish('current','当前版本已就绪，可检查更新。');
}
function showPwa(){
  dialog.showModal();
  navigator.serviceWorker?.controller?.postMessage('PWA_STATUS');
}

return {subscribeUpdates,updateAction,checkForUpdates,registerPwa,showPwa};
}
